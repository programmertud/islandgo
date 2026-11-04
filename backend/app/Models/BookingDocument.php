<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class BookingDocument extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'booking_id', 'uploaded_by', 'document_type',
        'file_name', 'file_path', 'mime_type', 'file_size', 'notes',
    ];

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
