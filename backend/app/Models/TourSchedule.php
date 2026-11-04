<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TourSchedule extends Model
{
    use HasFactory;

    protected $fillable = [
        'tour_package_id',
        'departure_date',
        'start_time',
        'capacity',
        'reserved_slots',
        'status'
    ];

    protected $casts = [
        'departure_date' => 'date',
    ];

    public function package()
    {
        return $this->belongsTo(TourPackage::class, 'tour_package_id');
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }
}
