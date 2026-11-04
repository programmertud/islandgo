<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'booking_id',
        'payment_reference',
        'amount',
        'payment_type',
        'payment_method',
        'gcash_reference',
        'payment_date',
        'proof_of_payment_path',
        'status',
        'admin_notes',
        'verified_at',
        'verified_by',
        'received_by_name',
    ];

    protected $casts = [
        'amount'       => 'decimal:2',
        'verified_at'  => 'datetime',
        'payment_date' => 'datetime',
    ];

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    public function verifier()
    {
        return $this->belongsTo(User::class, 'verified_by');
    }
}
