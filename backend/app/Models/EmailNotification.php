<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmailNotification extends Model
{
    protected $fillable = [
        'agency_id',
        'booking_id',
        'recipient_email',
        'recipient_name',
        'event_type',
        'subject',
        'status',          // sent | failed
        'error_message',
    ];

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    public function agency()
    {
        return $this->belongsTo(Agency::class);
    }
}
