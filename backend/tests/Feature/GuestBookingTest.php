<?php

namespace Tests\Feature;

use App\Models\Agency;
use App\Models\Booking;
use App\Models\TourPackage;
use App\Models\TourSchedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GuestBookingTest extends TestCase
{
    use RefreshDatabase;

    private function createTestPackageAndSchedule(int $capacity = 10, int $reserved = 0): array
    {
        $agency = Agency::create([
            'name' => 'Siargao Blue Tours',
            'slug' => 'siargao-blue-tours',
            'contact_email' => 'siargao@example.com',
            'contact_phone' => '09171234567',
            'gcash_number' => '09171234567',
            'gcash_account_name' => 'Siargao Blue Tours',
            'address' => 'General Luna, Siargao',
            'status' => 'active',
        ]);

        $package = TourPackage::create([
            'agency_id' => $agency->id,
            'title' => 'Naked Island & Guyam Hopping',
            'destination' => 'Siargao, Surigao del Norte',
            'destination_name' => 'Siargao Island Hopping',
            'destination_address' => 'General Luna Pier, Siargao',
            'latitude' => 9.7891,
            'longitude' => 126.1554,
            'category' => 'Island Hopping',
            'price_per_person' => 1500.00,
            'duration_days' => 1,
            'max_participants' => 15,
            'status' => 'published',
        ]);

        $schedule = TourSchedule::create([
            'tour_package_id' => $package->id,
            'departure_date' => now()->addDays(5)->toDateString(),
            'start_time' => '08:00:00',
            'capacity' => $capacity,
            'reserved_slots' => $reserved,
            'status' => 'open',
        ]);

        return [$agency, $package, $schedule];
    }

    public function test_guest_booking_validation_fails_with_missing_fields(): void
    {
        $response = $this->postJson('/api/v1/guest/bookings', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors([
                'tour_schedule_id',
                'participants_count',
                'guest_name',
                'guest_email',
                'guest_phone',
            ]);
    }

    public function test_guest_booking_fails_for_nonexistent_schedule(): void
    {
        $response = $this->postJson('/api/v1/guest/bookings', [
            'tour_schedule_id' => 99999,
            'participants_count' => 2,
            'guest_name' => 'Juan dela Cruz',
            'guest_email' => 'juan@example.com',
            'guest_phone' => '09181234567',
            'payment_method' => 'gcash',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['tour_schedule_id']);
    }

    public function test_guest_booking_succeeds_and_creates_booking_record(): void
    {
        [$agency, $package, $schedule] = $this->createTestPackageAndSchedule(10, 0);

        $response = $this->postJson('/api/v1/guest/bookings', [
            'tour_schedule_id' => $schedule->id,
            'participants_count' => 2,
            'guest_name' => 'Maria Clara',
            'guest_email' => 'maria@example.com',
            'guest_phone' => '09191234567',
            'payment_method' => 'gcash',
            'special_requests' => 'Vegetarian lunch please',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'booking_reference',
                'booking_status',
                'payment_status',
                'total_amount',
                'required_advance_amount',
                'participants_count',
            ]);

        $ref = $response->json('booking_reference');
        $this->assertNotEmpty($ref);

        // Verify booking in database with null customer_id
        $this->assertDatabaseHas('bookings', [
            'booking_reference' => $ref,
            'customer_id' => null,
            'guest_email' => 'maria@example.com',
            'participants_count' => 2,
            'total_amount' => 3000.00,
            'required_advance_amount' => 1500.00,
        ]);

        // Verify reserved_slots incremented on schedule
        $schedule->refresh();
        $this->assertEquals(2, $schedule->reserved_slots);
    }

    public function test_guest_booking_lookup_succeeds_with_valid_reference_and_email(): void
    {
        [$agency, $package, $schedule] = $this->createTestPackageAndSchedule(10, 0);

        // Create booking
        $booking = Booking::create([
            'booking_reference' => 'BK-TESTLOOKUP',
            'customer_id' => null,
            'agency_id' => $agency->id,
            'tour_schedule_id' => $schedule->id,
            'guest_name' => 'Pedro Penduko',
            'guest_email' => 'pedro@example.com',
            'guest_phone' => '09199876543',
            'participants_count' => 1,
            'total_amount' => 1500.00,
            'required_advance_amount' => 750.00,
            'advance_paid_amount' => 0.00,
            'booking_status' => 'pending',
            'payment_status' => 'pending_advance',
            'payment_method' => 'gcash',
        ]);

        $response = $this->getJson('/api/v1/guest/bookings/lookup?booking_reference=BK-TESTLOOKUP&email=pedro@example.com');

        $response->assertStatus(200)
            ->assertJson([
                'booking_reference' => 'BK-TESTLOOKUP',
                'booking_status' => 'pending',
                'payment_status' => 'pending_advance',
                'total_amount' => 1500.00,
                'required_advance_amount' => 750.00,
                'participants_count' => 1,
            ]);
    }

    public function test_guest_booking_lookup_fails_with_mismatched_email(): void
    {
        [$agency, $package, $schedule] = $this->createTestPackageAndSchedule(10, 0);

        Booking::create([
            'booking_reference' => 'BK-MISMATCH',
            'customer_id' => null,
            'agency_id' => $agency->id,
            'tour_schedule_id' => $schedule->id,
            'guest_name' => 'Maria Santos',
            'guest_email' => 'maria.santos@example.com',
            'guest_phone' => '09199876543',
            'participants_count' => 1,
            'total_amount' => 1500.00,
            'required_advance_amount' => 750.00,
            'advance_paid_amount' => 0.00,
            'booking_status' => 'pending',
            'payment_status' => 'pending_advance',
            'payment_method' => 'gcash',
        ]);

        $response = $this->getJson('/api/v1/guest/bookings/lookup?booking_reference=BK-MISMATCH&email=intruder@example.com');

        $response->assertStatus(404);
    }
}
