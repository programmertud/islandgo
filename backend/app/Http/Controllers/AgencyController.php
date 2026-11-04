<?php

namespace App\Http\Controllers;

use App\Models\Agency;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AgencyController extends Controller
{
    // Agency Admin: retrieve the settings that govern this agency's bookings.
    public function getProfile(Request $request)
    {
        $agency = $request->user()->agency;
        abort_unless($agency, 403, 'No agency is associated with this account.');

        return response()->json($agency);
    }

    // Super Admin: list all agencies
    public function index(Request $request)
    {
        $query = Agency::query();

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        return response()->json($query->latest()->paginate(15));
    }

    // Super Admin: view a single agency
    public function show(Agency $agency)
    {
        return response()->json($agency->load('users'));
    }

    // Super Admin: approve / suspend an agency
    public function updateStatus(Request $request, Agency $agency)
    {
        $validated = $request->validate([
            'status' => 'required|in:active,suspended,pending',
        ]);

        $agency->update(['status' => $validated['status']]);

        return response()->json(['message' => "Agency status updated to {$validated['status']}.", 'agency' => $agency]);
    }

    // Agency Admin: update own agency profile
    public function updateProfile(Request $request)
    {
        $agency = $request->user()->agency;
        abort_unless($agency, 403, 'No agency is associated with this account.');

        $validated = $request->validate([
            'name'          => 'sometimes|string|max:191',
            'contact_email' => 'sometimes|email|max:191',
            'contact_phone' => 'sometimes|string|max:20',
            'gcash_number'  => 'sometimes|nullable|string|max:20',
            'gcash_account_name' => 'sometimes|nullable|string|max:191',
            'address'       => 'sometimes|string',
            'advance_payment_deadline_hours' => 'nullable|integer|in:12,24,48,72',
            'payment_qr_code' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:4096',
            'remove_payment_qr_code' => 'nullable|boolean',
        ]);

        if ($request->boolean('remove_payment_qr_code')) {
            if ($agency->payment_qr_code_path) {
                Storage::disk('public')->delete($agency->payment_qr_code_path);
            }
            $agency->payment_qr_code_path = null;
        } elseif ($request->hasFile('payment_qr_code')) {
            if ($agency->payment_qr_code_path) {
                Storage::disk('public')->delete($agency->payment_qr_code_path);
            }
            $agency->payment_qr_code_path = $request->file('payment_qr_code')->store('agency_qrcodes', 'public');
        }

        $agency->fill(collect($validated)->except(['payment_qr_code', 'remove_payment_qr_code'])->toArray());
        $agency->save();

        return response()->json(['message' => 'Profile updated.', 'agency' => $agency->fresh()]);
    }
}
