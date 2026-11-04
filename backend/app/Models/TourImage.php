<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TourImage extends Model
{
    protected $fillable = [
        'tour_package_id', 'image_path', 'alt_text', 'is_cover', 'sort_order',
    ];

    protected $casts = [
        'is_cover' => 'boolean',
    ];

    public function package()
    {
        return $this->belongsTo(TourPackage::class, 'tour_package_id');
    }
}
