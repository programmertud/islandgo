<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Booking extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'booking_reference',
        'agency_id',
        'customer_id',
        'guest_name',
        'guest_email',
        'guest_phone',
        'guest_token',
        'tour_schedule_id',
        'participants_count',
        'total_amount',
        'required_advance_amount',
        'advance_paid_amount',
        'remaining_balance',
        'booking_status',
        'payment_status',
        'payment_method',
        'payment_reference',
        'payment_deadline',
        'slots_released_at',
        'advance_reminder_sent_at',
        'special_requests',
        'rejection_reason',
    ];

    // Never expose the internal guest token in API responses.
    protected $hidden = ['guest_token'];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'required_advance_amount' => 'decimal:2',
        'advance_paid_amount' => 'decimal:2',
        'remaining_balance' => 'decimal:2',
        'payment_deadline' => 'datetime',
        'slots_released_at' => 'datetime',
        'advance_reminder_sent_at' => 'datetime',
    ];

    // Valid booking status transitions
    public const STATUS_TRANSITIONS = [
        'pending'   => ['confirmed', 'rejected', 'cancelled', 'expired'],
        'confirmed' => ['completed', 'cancelled'],
        'rejected'  => [],
        'cancelled' => [],
        'completed' => [],
        'expired'   => [],
    ];

    public function hasVerifiedAdvance(): bool
    {
        return $this->advance_paid_amount >= $this->required_advance_amount;
    }

    public function canTransitionTo(string $newStatus): bool
    {
        return in_array($newStatus, self::STATUS_TRANSITIONS[$this->booking_status] ?? []);
    }

    public function agency()
    {
        return $this->belongsTo(Agency::class);
    }

    public function customer()
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function schedule()
    {
        return $this->belongsTo(TourSchedule::class, 'tour_schedule_id')
                    ->with('package');
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function documents()
    {
        return $this->hasMany(BookingDocument::class);
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class, 'entity_id')
                    ->where('entity_type', 'Booking');
    }

    public function smsNotifications()
    {
        return $this->hasMany(SmsNotification::class);
    }
}
