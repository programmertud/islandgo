<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SmsNotification extends Model
{
    use HasFactory;

    protected $fillable = [
        'agency_id',
        'booking_id',
        'recipient_phone',
        'message',
        'event_type',
        'status',
        'provider_reference'
    ];

    public function agency()
    {
        return $this->belongsTo(Agency::class);
    }

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }
}
