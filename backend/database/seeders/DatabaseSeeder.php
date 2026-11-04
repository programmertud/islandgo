<?php

namespace Database\Seeders;

use App\Models\Agency;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\TourPackage;
use App\Models\TourSchedule;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ── Super Admin ───────────────────────────────────────────
        User::create([
            'name'     => 'Super Admin',
            'email'    => 'admin@test.com',
            'password' => Hash::make('password'),
            'role'     => 'super_admin',
        ]);

        // ── Agency 1 ──────────────────────────────────────────────
        $agency1 = Agency::create([
            'name'          => 'Islands Express Tours',
            'slug'          => 'islands-express-tours',
            'contact_email' => 'contact@islandsexpress.com',
            'contact_phone' => '+63 912 000 1111',
            'address'       => 'Puerto Princesa, Palawan',
            'status'        => 'active',
        ]);

        $agencyAdmin1 = User::create([
            'agency_id' => $agency1->id,
            'name'      => 'Agency Admin',
            'email'     => 'agency@test.com',
            'password'  => Hash::make('password'),
            'role'      => 'agency_admin',
        ]);

        // ── Agency 2 ──────────────────────────────────────────────
        $agency2 = Agency::create([
            'name'          => 'Batangas Boat Tours',
            'slug'          => 'batangas-boat-tours',
            'contact_email' => 'info@batangasboattours.ph',
            'contact_phone' => '+63 912 000 2222',
            'status'        => 'active',
        ]);

        User::create([
            'agency_id' => $agency2->id,
            'name'      => 'Batangas Admin',
            'email'     => 'batangas@test.com',
            'password'  => Hash::make('password'),
            'role'      => 'agency_admin',
        ]);

        // ── Customer ──────────────────────────────────────────────
        $customer = User::create([
            'name'     => 'Juan dela Cruz',
            'email'    => 'customer@test.com',
            'password' => Hash::make('password'),
            'role'     => 'customer',
        ]);

        $customer2 = User::create([
            'name'     => 'Maria Santos',
            'email'    => 'customer2@test.com',
            'password' => Hash::make('password'),
            'role'     => 'customer',
        ]);

        // ── Tour Packages (Agency 1) ───────────────────────────────
        $pkg1 = TourPackage::create([
            'agency_id'        => $agency1->id,
            'title'            => 'Palawan Island Hopping',
            'destination'      => 'Puerto Princesa, Palawan',
            'category'         => 'Island Hopping',
            'description'      => 'Experience the breathtaking beauty of Palawan\'s islands and lagoons.',
            'itinerary'        => "Day 1: Island Hopping - Small Lagoon, Big Lagoon\nDay 2: Snorkeling at Coral Garden\nDay 3: Return transfer",
            'price_per_person' => 3500.00,
            'duration_days'    => 3,
            'min_participants' => 2,
            'max_participants' => 20,
            'inclusions'       => ['Island hopping boat', 'Environmental fee', 'Life jacket', 'Lunch on Day 1'],
            'exclusions'       => ['Airfare', 'Hotel accommodation', 'Personal expenses'],
            'meeting_point'    => 'Port Barton, Palawan',
            'cover_image'      => 'tour-images/ear5t7eQMuEVGZC42JxdgNTIWPmTwl6S8XKr3lGJ.jpg',
            'status'           => 'published',
        ]);

        $pkg2 = TourPackage::create([
            'agency_id'        => $agency1->id,
            'title'            => 'Coron Wreck Diving',
            'destination'      => 'Coron, Palawan',
            'category'         => 'Island Hopping',
            'description'      => 'Explore WWII Japanese shipwrecks in Coron Bay.',
            'itinerary'        => "Day 1: Arrival & Briefing\nDay 2: Wreck Dive - Okikawa Maru\nDay 3: Wreck Dive - Irako Wreck\nDay 4: Open Water Dive\nDay 5: Departure",
            'price_per_person' => 8500.00,
            'duration_days'    => 5,
            'min_participants' => 2,
            'max_participants' => 10,
            'inclusions'       => ['Dive equipment', 'Dive instructor', 'Boat transfer', 'Meals'],
            'cover_image'      => 'tour-images/EHYzjqcUf9Jz3OjyOpgUKdwY1IVSCNyLgFbkkc7T.png',
            'status'           => 'published',
        ]);

        $pkg3 = TourPackage::create([
            'agency_id'        => $agency1->id,
            'title'            => 'El Nido Sunset Cruise',
            'destination'      => 'El Nido, Palawan',
            'category'         => 'Island Hopping',
            'description'      => 'Romantic sunset cruise around El Nido\'s limestone karsts.',
            'price_per_person' => 1500.00,
            'duration_days'    => 1,
            'min_participants' => 2,
            'max_participants' => 15,
            'cover_image'      => 'tour-images/CGp3xBFTaHiuZdR7xrH5OdzO6eqSlEX554b83vgs.jpg',
            'status'           => 'published',
        ]);

        // ── Tour Images (Gallery Photos for each package) ─────────
        \App\Models\TourImage::create([
            'tour_package_id' => $pkg1->id,
            'image_path'      => 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=1200&q=80',
            'alt_text'        => 'Palawan Emerald Lagoon',
            'sort_order'      => 1,
            'is_cover'        => false,
        ]);
        \App\Models\TourImage::create([
            'tour_package_id' => $pkg1->id,
            'image_path'      => 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1200&q=80',
            'alt_text'        => 'Secret Limestone Cove',
            'sort_order'      => 2,
            'is_cover'        => false,
        ]);
        \App\Models\TourImage::create([
            'tour_package_id' => $pkg1->id,
            'image_path'      => 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
            'alt_text'        => 'Palawan White Sand Beach',
            'sort_order'      => 3,
            'is_cover'        => false,
        ]);

        \App\Models\TourImage::create([
            'tour_package_id' => $pkg2->id,
            'image_path'      => 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80',
            'alt_text'        => 'Coron Coral Reef Diving',
            'sort_order'      => 1,
            'is_cover'        => false,
        ]);
        \App\Models\TourImage::create([
            'tour_package_id' => $pkg2->id,
            'image_path'      => 'https://images.unsplash.com/photo-1516690561799-46d8f74f9abf?auto=format&fit=crop&w=1200&q=80',
            'alt_text'        => 'Coron Kayangan Lake',
            'sort_order'      => 2,
            'is_cover'        => false,
        ]);
        \App\Models\TourImage::create([
            'tour_package_id' => $pkg2->id,
            'image_path'      => 'https://images.unsplash.com/photo-1682687220063-4742bd7fd538?auto=format&fit=crop&w=1200&q=80',
            'alt_text'        => 'Deep Water Shipwreck Exploration',
            'sort_order'      => 3,
            'is_cover'        => false,
        ]);

        \App\Models\TourImage::create([
            'tour_package_id' => $pkg3->id,
            'image_path'      => 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
            'alt_text'        => 'El Nido Sunset Over Sea',
            'sort_order'      => 1,
            'is_cover'        => false,
        ]);
        \App\Models\TourImage::create([
            'tour_package_id' => $pkg3->id,
            'image_path'      => 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=1200&q=80',
            'alt_text'        => 'Bacuit Archipelago Golden Hour',
            'sort_order'      => 2,
            'is_cover'        => false,
        ]);
        \App\Models\TourImage::create([
            'tour_package_id' => $pkg3->id,
            'image_path'      => 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1200&q=80',
            'alt_text'        => 'Evening Island Cruise',
            'sort_order'      => 3,
            'is_cover'        => false,
        ]);

        // ── Tour Schedules (Zero bookings / pristine start) ───────
        TourSchedule::create([
            'tour_package_id' => $pkg1->id,
            'departure_date'  => now()->addDays(7)->toDateString(),
            'start_time'      => '07:00:00',
            'capacity'        => 20,
            'reserved_slots'  => 0,
            'status'          => 'open',
        ]);

        TourSchedule::create([
            'tour_package_id' => $pkg1->id,
            'departure_date'  => now()->addDays(14)->toDateString(),
            'start_time'      => '07:00:00',
            'capacity'        => 20,
            'reserved_slots'  => 0,
            'status'          => 'open',
        ]);

        TourSchedule::create([
            'tour_package_id' => $pkg2->id,
            'departure_date'  => now()->addDays(10)->toDateString(),
            'start_time'      => '06:00:00',
            'capacity'        => 10,
            'reserved_slots'  => 0,
            'status'          => 'open',
        ]);
    }
}
