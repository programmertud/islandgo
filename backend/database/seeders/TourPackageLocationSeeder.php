<?php

namespace Database\Seeders;

use App\Models\TourPackage;
use Illuminate\Database\Seeder;

class TourPackageLocationSeeder extends Seeder
{
    public function run(): void
    {
        $locations = [
            'Puerto Princesa' => [
                'destination_name'    => 'Puerto Princesa & Honda Bay',
                'destination_address' => 'Puerto Princesa City, Palawan, Philippines',
                'latitude'            => 9.7392000,
                'longitude'           => 118.7353000,
                'location_description'=> 'World-renowned coastal sanctuary famous for the Underground River and pristine limestone karst islands.',
                'meeting_point'       => 'Port Barton Pier / Honda Bay Wharf',
            ],
            'Coron' => [
                'destination_name'    => 'Coron Bay & Kayangan Lake',
                'destination_address' => 'Coron, Palawan, Philippines',
                'latitude'            => 11.9986000,
                'longitude'           => 120.2045000,
                'location_description'=> 'Premier wreck diving and limestone bay destination in northern Palawan.',
                'meeting_point'       => 'Coron Town Harbor Pier',
            ],
            'El Nido' => [
                'destination_name'    => 'Bacuit Bay, El Nido',
                'destination_address' => 'El Nido, Palawan, Philippines',
                'latitude'            => 11.1949000,
                'longitude'           => 119.4013000,
                'location_description'=> 'World famous archipelago of towering limestone cliffs, hidden lagoons, and white sand sandbars.',
                'meeting_point'       => 'El Nido Municipal Beach Front',
            ],
            'Batangas' => [
                'destination_name'    => 'Anilao Marine Sanctuary, Batangas',
                'destination_address' => 'Mabini, Batangas, Philippines',
                'latitude'            => 13.7565000,
                'longitude'           => 120.8931000,
                'location_description'=> 'Lush coral reef sanctuary and underwater macro photography capital.',
                'meeting_point'       => 'Anilao Port Marina',
            ],
            'Boracay' => [
                'destination_name'    => 'White Beach, Boracay Island',
                'destination_address' => 'Malay, Aklan, Philippines',
                'latitude'            => 11.9674000,
                'longitude'           => 121.9248000,
                'location_description'=> 'World-renowned powder-soft white sand beach and crystal-clear turquoise waters.',
                'meeting_point'       => 'Station 1 Beachfront Activity Center',
            ],
            'Cebu' => [
                'destination_name'    => 'Mactan & Moalboal, Cebu',
                'destination_address' => 'Cebu, Philippines',
                'latitude'            => 10.3157000,
                'longitude'           => 123.8854000,
                'location_description'=> 'Historic coastal hub offering sardine runs, whale shark encounters, and scenic island hopping.',
                'meeting_point'       => 'Cebu Yacht Club / Mactan Marina',
            ],
            'Bohol' => [
                'destination_name'    => 'Panglao & Chocolate Hills, Bohol',
                'destination_address' => 'Bohol, Philippines',
                'latitude'            => 9.6729000,
                'longitude'           => 123.8730000,
                'location_description'=> 'Charming province famous for Chocolate Hills, Philippine tarsiers, and coral sand beaches.',
                'meeting_point'       => 'Alona Beach Activity Desk',
            ],
            'Siargao' => [
                'destination_name'    => 'Cloud 9 & General Luna, Siargao',
                'destination_address' => 'General Luna, Surigao del Norte, Philippines',
                'latitude'            => 9.8000000,
                'longitude'           => 126.1500000,
                'location_description'=> 'The surfing capital of the Philippines surrounded by coconut palms, tidal rock pools, and lagoons.',
                'meeting_point'       => 'Cloud 9 Boardwalk Entrance',
            ],
        ];

        $packages = TourPackage::all();
        foreach ($packages as $pkg) {
            // Find matched location
            $matched = null;
            foreach ($locations as $key => $loc) {
                if (stripos($pkg->destination, $key) !== false || stripos($pkg->title, $key) !== false) {
                    $matched = $loc;
                    break;
                }
            }

            if (!$matched) {
                // Default fallback to Palawan
                $matched = $locations['Puerto Princesa'];
            }

            // Update if coordinates not set
            if (!$pkg->latitude || !$pkg->longitude) {
                $pkg->update([
                    'destination_name'     => $pkg->destination_name ?: $matched['destination_name'],
                    'destination_address'  => $pkg->destination_address ?: $matched['destination_address'],
                    'latitude'             => $matched['latitude'],
                    'longitude'            => $matched['longitude'],
                    'location_description' => $pkg->location_description ?: $matched['location_description'],
                    'meeting_point'        => $pkg->meeting_point ?: $matched['meeting_point'],
                ]);
            }
        }
    }
}
