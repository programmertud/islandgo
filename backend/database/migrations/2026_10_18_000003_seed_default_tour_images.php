<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use App\Models\TourPackage;
use App\Models\TourImage;

return new class extends Migration
{
    public function up(): void
    {
        $defaultImages = [
            'Palawan' => [
                'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
            ],
            'Coron' => [
                'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1516690561799-46d8f74f9abf?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1682687220063-4742bd7fd538?auto=format&fit=crop&w=1200&q=80',
            ],
            'Default' => [
                'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
            ]
        ];

        $packages = TourPackage::all();
        foreach ($packages as $package) {
            if ($package->images()->count() === 0) {
                $images = $defaultImages['Default'];
                if (stripos($package->title . ' ' . $package->destination, 'Coron') !== false) {
                    $images = $defaultImages['Coron'];
                } elseif (stripos($package->title . ' ' . $package->destination, 'Palawan') !== false || stripos($package->title . ' ' . $package->destination, 'El Nido') !== false) {
                    $images = $defaultImages['Palawan'];
                }

                foreach ($images as $idx => $url) {
                    TourImage::create([
                        'tour_package_id' => $package->id,
                        'image_path'      => $url,
                        'alt_text'        => $package->title . ' Photo ' . ($idx + 2),
                        'sort_order'      => $idx + 1,
                        'is_cover'        => false,
                    ]);
                }
            }
        }
    }

    public function down(): void
    {
        // No rollback needed
    }
};
