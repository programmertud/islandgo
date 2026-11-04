<?php

namespace App\Http\Controllers;

use App\Models\TourSchedule;
use App\Models\TourPackage;
use Illuminate\Http\Request;

class TourScheduleController extends Controller
{
    // Agency Admin: list schedules for a package
    public function index(Request $request, TourPackage $tourPackage)
    {
        $this->authorizeAgency($request, $tourPackage->agency_id);
        return response()->json($tourPackage->schedules()->latest('departure_date')->get());
    }

    // Agency Admin: create a schedule
    public function store(Request $request, TourPackage $tourPackage)
    {
        $this->authorizeAgency($request, $tourPackage->agency_id);

        $validated = $request->validate([
            'departure_date' => 'required|date|after_or_equal:today',
            'start_time'     => 'nullable|date_format:H:i',
            'capacity'       => 'required|integer|min:1',
        ]);

        $schedule = $tourPackage->schedules()->create([
            ...$validated,
            'reserved_slots' => 0,
            'status'         => 'open',
        ]);

        return response()->json($schedule, 201);
    }

    // Agency Admin: update a schedule
    public function update(Request $request, TourPackage $tourPackage, TourSchedule $tourSchedule)
    {
        $this->authorizeAgency($request, $tourPackage->agency_id);

        $validated = $request->validate([
            'departure_date' => 'sometimes|date|after_or_equal:today',
            'start_time'     => 'nullable|date_format:H:i',
            'capacity'       => 'sometimes|integer|min:1',
            'status'         => 'sometimes|in:open,full,cancelled,completed',
        ]);

        $tourSchedule->update($validated);

        return response()->json($tourSchedule);
    }

    // Agency Admin: delete a schedule
    public function destroy(Request $request, TourPackage $tourPackage, TourSchedule $tourSchedule)
    {
        $this->authorizeAgency($request, $tourPackage->agency_id);
        $tourSchedule->delete();
        return response()->json(['message' => 'Schedule deleted.']);
    }

    private function authorizeAgency(Request $request, int $agencyId): void
    {
        if ($request->user()->agency_id !== $agencyId && $request->user()->role !== 'super_admin') {
            abort(403, 'Unauthorized.');
        }
    }
}
