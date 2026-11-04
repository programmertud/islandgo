<?php

namespace Tests\Feature;

use App\Models\Agency;
use App\Models\Booking;
use App\Models\TourAvailabilityClosure;
use App\Models\TourPackage;
use App\Models\TourSchedule;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TourAvailabilityTest extends TestCase
{
    use RefreshDatabase;

    private function package(): array
    {
        $agency = Agency::create(['name' => 'Test Tours', 'slug' => 'test-tours', 'status' => 'active']);
        $package = TourPackage::create(['agency_id' => $agency->id, 'title' => 'Island Tour', 'destination' => 'Siargao', 'category' => 'Island Hopping', 'price_per_person' => 1000, 'duration_days' => 1, 'max_participants' => 10, 'status' => 'published']);
        $schedule = TourSchedule::create(['tour_package_id' => $package->id, 'departure_date' => now()->addDays(10)->toDateString(), 'capacity' => 10, 'reserved_slots' => 0, 'status' => 'open']);
        return [$agency, $package, $schedule];
    }

    public function test_public_month_returns_schedule_capacity_and_closures(): void
    {
        [, $package, $schedule] = $this->package();
        TourAvailabilityClosure::create(['tour_package_id' => $package->id, 'start_date' => now()->addDays(12)->toDateString(), 'end_date' => now()->addDays(13)->toDateString(), 'reason' => 'Maintenance']);
        $month = now()->addDays(10)->format('Y-m');

        $this->getJson("/api/v1/tours/{$package->id}/availability?month={$month}")
            ->assertOk()->assertJsonPath('package_id', $package->id)
            ->assertJsonPath('schedules.0.id', $schedule->id)
            ->assertJsonCount(1, 'blocked_ranges');
    }

    public function test_authorized_agency_can_create_closure_and_booking_conflicts_are_rejected(): void
    {
        [$agency, $package, $schedule] = $this->package();
        $user = User::factory()->create(['agency_id' => $agency->id, 'role' => 'agency_admin']);
        $this->actingAs($user)->postJson("/api/v1/agency/packages/{$package->id}/unavailable-dates", [
            'start_date' => now()->addDays(10)->toDateString(), 'end_date' => now()->addDays(11)->toDateString(), 'reason' => 'Renovation',
        ])->assertCreated();

        $this->assertDatabaseHas('tour_availability_closures', ['tour_package_id' => $package->id, 'reason' => 'Renovation']);

        Booking::create(['booking_reference' => 'BK-CONFLICT1', 'agency_id' => $agency->id, 'tour_schedule_id' => $schedule->id, 'participants_count' => 1, 'total_amount' => 1000, 'booking_status' => 'pending', 'payment_status' => 'unpaid']);
        $this->actingAs($user)->postJson("/api/v1/agency/packages/{$package->id}/unavailable-dates", [
            'start_date' => $schedule->departure_date->format('Y-m-d'), 'end_date' => $schedule->departure_date->format('Y-m-d'), 'reason' => 'Private event',
        ])->assertUnprocessable();
    }

    public function test_other_agency_cannot_manage_package_closures(): void
    {
        [, $package] = $this->package();
        $otherAgency = Agency::create(['name' => 'Other Tours', 'slug' => 'other-tours', 'status' => 'active']);
        $user = User::factory()->create(['agency_id' => $otherAgency->id, 'role' => 'agency_staff']);
        $this->actingAs($user)->getJson("/api/v1/agency/packages/{$package->id}/unavailable-dates")->assertForbidden();
    }

    public function test_destinations_endpoint_only_returns_active_registered_destinations_and_excludes_deleted(): void
    {
        [$agency, $package] = $this->package(); // destination: 'Siargao'
        $pkg2 = TourPackage::create([
            'agency_id' => $agency->id, 'title' => 'Coron Tour', 'destination' => 'Coron Island',
            'category' => 'Island Hopping', 'price_per_person' => 1500, 'duration_days' => 1,
            'max_participants' => 10, 'status' => 'published'
        ]);

        $res = $this->getJson('/api/v1/destinations')->assertOk();
        $values = collect($res->json())->pluck('value')->all();
        $this->assertContains('Siargao', $values);
        $this->assertContains('Coron Island', $values);

        // Soft delete $pkg2
        $pkg2->delete();

        $resAfterDelete = $this->getJson('/api/v1/destinations')->assertOk();
        $valuesAfterDelete = collect($resAfterDelete->json())->pluck('value')->all();
        $this->assertContains('Siargao', $valuesAfterDelete);
        $this->assertNotContains('Coron Island', $valuesAfterDelete);
    }
}
