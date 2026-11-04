<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Services\AuditLogService;
use App\Services\NotificationService;
use App\Services\Sms\SmsNotificationService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ExpireAdvancePaymentBookings extends Command
{
    protected $signature = 'bookings:expire-unpaid-advances';
    protected $description = 'Release booking holds whose advance deadline has passed';
    public function handle(SmsNotificationService $sms): int
    {
        Booking::where('booking_status', 'pending')->where('payment_status', 'unpaid')
            ->whereNotNull('payment_deadline')->whereBetween('payment_deadline', [now(), now()->addHour()])
            ->whereNull('advance_reminder_sent_at')->chunkById(100, function ($items) use ($sms) {
                foreach ($items as $booking) {
                    $booking->update(['advance_reminder_sent_at' => now()]);
                    if ($booking->customer_id) {
                        NotificationService::send($booking->customer_id, 'payment_reminder', 'Advance payment reminder', "Your 50% advance for #{$booking->booking_reference} is still pending. Please pay before {$booking->payment_deadline->format('M j, g:i A')}.", $booking->agency_id, 'Booking', $booking->id);
                    }
                    $sms->notifyBooking($booking, 'payment_reminder');
                    AuditLogService::log('payment.advance_reminder_sent', 'Booking', $booking->id, "Advance payment reminder sent for {$booking->booking_reference}");
                }
            });

        Booking::where('booking_status', 'pending')->where('payment_status', 'unpaid')->whereNotNull('payment_deadline')->where('payment_deadline', '<', now())->whereNull('slots_released_at')->chunkById(100, function ($items) use ($sms) {
            foreach ($items as $item) DB::transaction(function () use ($item, $sms) {
                $booking = Booking::lockForUpdate()->find($item->id);
                if (!$booking || $booking->slots_released_at || $booking->payment_status !== 'unpaid' || now()->lessThanOrEqualTo($booking->payment_deadline)) return;
                $booking->schedule()->lockForUpdate()->first()?->decrement('reserved_slots', $booking->participants_count);
                $booking->update(['booking_status' => 'expired', 'slots_released_at' => now()]);
                AuditLogService::log('booking.advance_expired', 'Booking', $booking->id, "Booking {$booking->booking_reference} expired and slots were released", null, ['slots_released' => $booking->participants_count]);
                if ($booking->customer_id) {
                    NotificationService::send($booking->customer_id, 'booking_expired', 'Booking Expired', "Booking #{$booking->booking_reference} expired because the 50% advance was not received by the deadline. Your slots were released.", $booking->agency_id, 'Booking', $booking->id);
                }
                $sms->notifyBooking($booking, 'booking_expired');
            });
        });
        return self::SUCCESS;
    }
}
