<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Agency extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'logo_url',
        'contact_email',
        'contact_phone',
        'gcash_number',
        'gcash_account_name',
        'payment_qr_code_path',
        'address',
        'status',
        'sms_settings',
        'advance_payment_deadline_hours',
    ];

    protected $casts = [
        'sms_settings' => 'array',
    ];

    protected $appends = [
        'payment_qr_code_url',
    ];

    public function getPaymentQrCodeUrlAttribute(): ?string
    {
        if (!$this->payment_qr_code_path) {
            return null;
        }

        if (str_starts_with($this->payment_qr_code_path, 'http://') || str_starts_with($this->payment_qr_code_path, 'https://')) {
            return $this->payment_qr_code_path;
        }

        return asset('storage/' . $this->payment_qr_code_path);
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function tourPackages()
    {
        return $this->hasMany(TourPackage::class);
    }

    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }
}
