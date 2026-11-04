<?php

namespace App\Http\Controllers;

use App\Models\TourPackage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TourAvailabilityController extends Controller
{
    public function publicMonth(Request $request, TourPackage $tourPackage)
    {
        $validated = $request->validate(['month' => 'required|date_format:Y-m']);
        [$year, $month] = explode('-', $validated['month']);
        $start = "$year-$month-01";
        $end = date('Y-m-t', strtotime($start));

        return response()->json([
            'package_id' => $tourPackage->id,
            'month' => $validated['month'],
            'default_capacity' => $tourPackage->max_participants ?: 20,
            'schedules' => $tourPackage->schedules()
                ->whereBetween('departure_date', [$start, $end])
                ->get(['id', 'departure_date', 'capacity', 'reserved_slots', 'status'])
                ->map(fn ($schedule) => [
                    'id' => $schedule->id,
                    'date' => $schedule->departure_date->format('Y-m-d'),
                    'capacity' => $schedule->capacity,
                    'reserved_slots' => $schedule->reserved_slots,
                    'available_slots' => max(0, $schedule->capacity - $schedule->reserved_slots),
                    'status' => $schedule->status,
                ]),
            'blocked_ranges' => $tourPackage->availabilityClosures()
                ->whereDate('start_date', '<=', $end)->whereDate('end_date', '>=', $start)
                ->get(['id', 'start_date', 'end_date', 'reason']),
        ]);
    }

    public function index(Request $request, TourPackage $tourPackage)
    {
        $this->authorizePackage($request, $tourPackage);
        return response()->json($tourPackage->availabilityClosures()->with('creator:id,name')->orderBy('start_date')->get());
    }

    public function store(Request $request, TourPackage $tourPackage)
    {
        $this->authorizePackage($request, $tourPackage);
        $validated = $request->validate([
            'start_date' => 'required|date_format:Y-m-d|after_or_equal:today',
            'end_date' => 'required|date_format:Y-m-d|after_or_equal:start_date',
            'reason' => 'required|string|max:255',
        ]);

        return DB::transaction(function () use ($tourPackage, $validated, $request) {
            TourPackage::whereKey($tourPackage->id)->lockForUpdate()->firstOrFail();
            $this->rejectBookingConflicts($tourPackage, $validated['start_date'], $validated['end_date']);
            $closure = $tourPackage->availabilityClosures()->create([...$validated, 'created_by' => $request->user()->id]);
            return response()->json($closure->load('creator:id,name'), 201);
        });
    }

    public function update(Request $request, TourPackage $tourPackage, TourAvailabilityClosure $closure)
    {
        $this->authorizePackage($request, $tourPackage);
        abort_unless($closure->tour_package_id === $tourPackage->id, 404);
        $validated = $request->validate([
            'start_date' => 'required|date_format:Y-m-d|after_or_equal:today',
            'end_date' => 'required|date_format:Y-m-d|after_or_equal:start_date',
            'reason' => 'required|string|max:255',
        ]);

        return DB::transaction(function () use ($tourPackage, $closure, $validated) {
            TourPackage::whereKey($tourPackage->id)->lockForUpdate()->firstOrFail();
            $this->rejectBookingConflicts($tourPackage, $validated['start_date'], $validated['end_date'], $closure->id);
            $closure->update($validated);
            return response()->json($closure->fresh()->load('creator:id,name'));
        });
    }

    public function destroy(Request $request, TourPackage $tourPackage, TourAvailabilityClosure $closure)
    {
        $this->authorizePackage($request, $tourPackage);
        abort_unless($closure->tour_package_id === $tourPackage->id, 404);
        $closure->delete();
        return response()->json(['message' => 'Availability closure deleted.']);
    }

    public static function assertDateAvailable(TourPackage $package, string $date): void
    {
        if ($package->availabilityClosures()->whereDate('start_date', '<=', $date)->whereDate('end_date', '>=', $date)->exists()) {
            throw ValidationException::withMessages(['tour_schedule_id' => 'This departure date is blocked and is no longer available.']);
        }
    }

    private function rejectBookingConflicts(TourPackage $package, string $start, string $end, ?int $ignoreId = null): void
    {
        $conflicts = $package->schedules()->whereBetween('departure_date', [$start, $end])
            ->whereHas('bookings', fn ($query) => $query->whereIn('booking_status', ['pending', 'confirmed']))
            ->with(['bookings' => fn ($query) => $query->whereIn('booking_status', ['pending', 'confirmed'])->select('id', 'tour_schedule_id', 'booking_reference', 'booking_status')])
            ->get();

        if ($conflicts->isNotEmpty()) {
            $details = $conflicts->flatMap(fn ($schedule) => $schedule->bookings->map(fn ($booking) => [
                'date' => $schedule->departure_date->format('Y-m-d'),
                'booking_reference' => $booking->booking_reference,
                'booking_status' => $booking->booking_status,
            ]))->values()->all();
            throw ValidationException::withMessages(['start_date' => 'Existing pending or confirmed bookings overlap these dates. Resolve them before saving.', 'conflicts' => json_encode($details)]);
        }

        $overlap = $package->availabilityClosures()
            ->whereDate('start_date', '<=', $end)->whereDate('end_date', '>=', $start)
            ->when($ignoreId, fn ($query) => $query->where('id', '<>', $ignoreId))->exists();
        if ($overlap) {
            throw ValidationException::withMessages(['start_date' => 'This range overlaps another closure.']);
        }
    }

    private function authorizePackage(Request $request, TourPackage $package): void
    {
        $user = $request->user();
        abort_unless(in_array($user->role, ['super_admin', 'agency_admin', 'agency_staff'], true), 403, 'You are not authorized to manage availability.');
        abort_unless($user->role === 'super_admin' || $user->agency_id === $package->agency_id, 403, 'This package belongs to another agency.');
    }
}
