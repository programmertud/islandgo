<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class TourPackage extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'agency_id',
        'title',
        'destination',
        'destination_name',
        'destination_address',
        'latitude',
        'longitude',
        'location_description',
        'description',
        'itinerary',
        'category',
        'price_per_person',
        'duration_days',
        'min_participants',
        'max_participants',
        'inclusions',
        'exclusions',
        'meeting_point',
        'cover_image',
        'status',
    ];

    protected $casts = [
        'inclusions'      => 'array',
        'exclusions'      => 'array',
        'price_per_person' => 'decimal:2',
        'latitude'        => 'float',
        'longitude'       => 'float',
    ];

    public function agency()
    {
        return $this->belongsTo(Agency::class);
    }

    public function schedules()
    {
        return $this->hasMany(TourSchedule::class);
    }

    public function availabilityClosures()
    {
        return $this->hasMany(TourAvailabilityClosure::class, 'tour_package_id');
    }

    public function images()
    {
        return $this->hasMany(TourImage::class)->orderBy('sort_order');
    }

    public function bookings()
    {
        return $this->hasManyThrough(Booking::class, TourSchedule::class, 'tour_package_id', 'tour_schedule_id');
    }

    // Total reserved slots across all open schedules
    public function totalReservedSlots(): int
    {
        return $this->schedules()->sum('reserved_slots');
    }
}
