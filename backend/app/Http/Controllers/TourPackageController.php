<?php

namespace App\Http\Controllers;

use App\Models\TourPackage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class TourPackageController extends Controller
{
    // Public: list published tours
    public function index(Request $request)
    {
        $query = TourPackage::with(['agency:id,name,slug', 'images'])
            ->where('status', 'published');

        if ($request->filled('destination')) {
            $query->where('destination', 'like', '%' . $request->destination . '%');
        }
        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        // Customer catalogues request six results per page; keep a bounded value
        // so public callers cannot accidentally request an unbounded list.
        $perPage = min(max((int) $request->input('per_page', 12), 1), 24);

        return response()->json($query->latest()->paginate($perPage));
    }

    // Public: list distinct destinations/islands from active published packages
    public function destinations()
    {
        $destinations = TourPackage::where('status', 'published')
            ->whereNotNull('destination')
            ->where('destination', '!=', '')
            ->select('destination', 'destination_name')
            ->get()
            ->map(function ($pkg) {
                $val = trim($pkg->destination);
                $label = trim($pkg->destination_name ?: $pkg->destination);
                return [
                    'label' => $label,
                    'value' => $val,
                ];
            })
            ->unique('value')
            ->values();

        return response()->json($destinations);
    }

    // Public: show a single tour
    public function show(TourPackage $tourPackage)
    {
        return response()->json(
            $tourPackage->load(['agency:id,name,slug,contact_phone,gcash_number,gcash_account_name', 'images', 'schedules' => function ($q) {
                $q->where('status', 'open')->where('departure_date', '>=', today());
            }])
        );
    }

    // Agency Admin: list own packages
    public function agencyIndex(Request $request)
    {
        $agencyId = $request->user()->agency_id;
        if (!$agencyId && $request->user()->role === 'super_admin') {
            $agencyId = \App\Models\Agency::first()->id ?? null;
        }

        $query = TourPackage::where('agency_id', $agencyId)->with('images')->latest();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('destination', 'like', "%{$search}%");
            });
        }

        $packages = $query->paginate(15);

        return response()->json($packages);
    }

    // Agency Admin: create a package
    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
            'title'                => 'required|string|max:191',
            'destination'          => 'required|string|max:191',
            'destination_name'     => 'nullable|string|max:191',
            'destination_address'  => 'nullable|string|max:500',
            'latitude'             => 'nullable|numeric|between:-90,90',
            'longitude'            => 'nullable|numeric|between:-180,180',
            'location_description' => 'nullable|string|max:1000',
            'category'             => 'required|string|max:100',
            'price_per_person'     => 'required|numeric|min:0',
            'duration_days'        => 'required|integer|min:1',
            'min_participants'     => 'nullable|integer|min:1',
            'max_participants'     => 'required|integer|min:1',
            'inclusions'           => 'nullable|array',
            'exclusions'           => 'nullable|array',
            'meeting_point'        => 'nullable|string|max:191',
            'description'          => 'nullable|string',
            'itinerary'            => 'nullable|string',
            'status'               => 'nullable|in:draft,published,archived',
            'cover_image'          => 'nullable|image|max:5120',
            'gallery_images'       => 'nullable|array|max:10',
            'gallery_images.*'     => 'image|max:5120',
        ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::error('Validation failed: ' . json_encode($e->errors()));
            \Log::error('Incoming data: ' . json_encode($request->all()));
            return response()->json(['message' => 'Validation Error', 'errors' => $e->errors()], 422);
        }

        if ($request->hasFile('cover_image')) {
            $validated['cover_image'] = $request->file('cover_image')->store('tour-images', 'public');
        }

        $agencyId = $request->user()->agency_id;
        if (!$agencyId && $request->user()->role === 'super_admin') {
            // Fallback for Super Admin testing
            $agencyId = \App\Models\Agency::first()->id ?? 1;
        }

        $validated['agency_id'] = $agencyId;
        $package = TourPackage::create($validated);

        if ($request->hasFile('gallery_images')) {
            foreach ($request->file('gallery_images') as $idx => $file) {
                $path = $file->store('tour-images', 'public');
                $package->images()->create([
                    'image_path' => $path,
                    'sort_order' => $idx + 1,
                    'is_cover'   => false,
                ]);
            }
        }

        return response()->json($package->load('images'), 201);
    }

    // Agency Admin: update a package
    public function update(Request $request, TourPackage $tourPackage)
    {
        $this->authorizeAgency($request, $tourPackage->agency_id);

        $validated = $request->validate([
            'title'                => 'sometimes|string|max:191',
            'destination'          => 'sometimes|string|max:191',
            'destination_name'     => 'nullable|string|max:191',
            'destination_address'  => 'nullable|string|max:500',
            'latitude'             => 'nullable|numeric|between:-90,90',
            'longitude'            => 'nullable|numeric|between:-180,180',
            'location_description' => 'nullable|string|max:1000',
            'category'             => 'sometimes|string|max:100',
            'price_per_person'     => 'sometimes|numeric|min:0',
            'duration_days'        => 'sometimes|integer|min:1',
            'min_participants'     => 'sometimes|integer|min:1',
            'max_participants'     => 'sometimes|integer|min:1',
            'inclusions'           => 'nullable|array',
            'exclusions'           => 'nullable|array',
            'meeting_point'        => 'nullable|string|max:191',
            'description'          => 'nullable|string',
            'itinerary'            => 'nullable|string',
            'status'               => 'sometimes|in:draft,published,archived',
            'cover_image'          => 'nullable|image|max:5120',
            'gallery_images'       => 'nullable|array|max:10',
            'gallery_images.*'     => 'image|max:5120',
            'deleted_image_ids'    => 'nullable|array',
            'deleted_image_ids.*'  => 'integer',
        ]);

        if ($request->hasFile('cover_image')) {
            if ($tourPackage->cover_image) {
                Storage::disk('public')->delete($tourPackage->cover_image);
            }
            $validated['cover_image'] = $request->file('cover_image')->store('tour-images', 'public');
        } else {
            // Remove cover_image from validated data if no new file is provided
            // so we don't accidentally overwrite the existing image with null
            unset($validated['cover_image']);
        }

        // Delete requested gallery images
        if ($request->filled('deleted_image_ids')) {
            $deletedIds = (array) $request->input('deleted_image_ids');
            $imagesToDelete = $tourPackage->images()->whereIn('id', $deletedIds)->get();
            foreach ($imagesToDelete as $img) {
                if ($img->image_path && !str_starts_with($img->image_path, 'http')) {
                    Storage::disk('public')->delete($img->image_path);
                }
                $img->delete();
            }
        }

        // Add newly uploaded gallery images
        if ($request->hasFile('gallery_images')) {
            $maxSort = (int) ($tourPackage->images()->max('sort_order') ?? 0);
            foreach ($request->file('gallery_images') as $idx => $file) {
                $path = $file->store('tour-images', 'public');
                $tourPackage->images()->create([
                    'image_path' => $path,
                    'sort_order' => $maxSort + $idx + 1,
                    'is_cover'   => false,
                ]);
            }
        }

        $tourPackage->update($validated);

        return response()->json($tourPackage->load('images'));
    }

    // Agency Admin: delete a single gallery image
    public function deleteImage(Request $request, TourPackage $tourPackage, \App\Models\TourImage $tourImage)
    {
        $this->authorizeAgency($request, $tourPackage->agency_id);

        if ($tourImage->tour_package_id !== $tourPackage->id) {
            abort(404, 'Image does not belong to this package.');
        }

        if ($tourImage->image_path && !str_starts_with($tourImage->image_path, 'http')) {
            Storage::disk('public')->delete($tourImage->image_path);
        }
        $tourImage->delete();

        return response()->json(['message' => 'Gallery image deleted.']);
    }

    // Agency Admin: delete a package
    public function destroy(Request $request, TourPackage $tourPackage)
    {
        $this->authorizeAgency($request, $tourPackage->agency_id);

        if ($tourPackage->cover_image) {
            Storage::disk('public')->delete($tourPackage->cover_image);
        }

        foreach ($tourPackage->images as $img) {
            if ($img->image_path && !str_starts_with($img->image_path, 'http')) {
                Storage::disk('public')->delete($img->image_path);
            }
        }

        $tourPackage->delete();
        return response()->json(['message' => 'Package deleted.']);
    }

    // Agency Admin: show a single package (includes schedules & images)
    public function showAgency(Request $request, TourPackage $tourPackage)
    {
        $this->authorizeAgency($request, $tourPackage->agency_id);
        return response()->json(
            $tourPackage->load(['agency:id,name,slug', 'schedules', 'images'])
        );
    }

    private function authorizeAgency(Request $request, int $agencyId): void
    {
        if ($request->user()->agency_id !== $agencyId && $request->user()->role !== 'super_admin') {
            abort(403, 'Unauthorized.');
        }
    }
}

