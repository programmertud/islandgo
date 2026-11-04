<?php

namespace App\Services\Email;

use App\Mail\BookingNotificationMail;
use App\Mail\AdminBookingNotificationMail;
use App\Mail\AdminPaymentNotificationMail;
use App\Models\Booking;
use App\Models\EmailNotification;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class EmailNotificationService
{
    /**
     * The booking events that trigger an email.
     */
    protected array $enabledEvents = [
        'booking_submitted',
        'advance_payment_required',
        'booking_confirmed',
        'booking_rejected',
        'booking_cancelled',
        'booking_completed',
        'payment_verified',
        'payment_rejected',
        'booking_expired',
    ];

    /**
     * Send an email notification for a booking event and log it.
     */
    public function notifyBooking(Booking $booking, string $eventType): ?EmailNotification
    {
        if (!in_array($eventType, $this->enabledEvents)) {
            return null;
        }

        $booking->loadMissing(['customer', 'schedule.package', 'agency']);

        $recipientEmail = $booking->customer->email ?? $booking->guest_email ?? null;
        $recipientName  = $booking->customer->name  ?? $booking->guest_name  ?? 'Customer';

        if (!$recipientEmail) {
            Log::warning('[EmailNotification] No email address for customer', [
                'booking_id' => $booking->id,
                'event_type' => $eventType,
            ]);

            return EmailNotification::create([
                'agency_id'       => $booking->agency_id,
                'booking_id'      => $booking->id,
                'recipient_email' => 'unknown',
                'recipient_name'  => $recipientName,
                'event_type'      => $eventType,
                'subject'         => '',
                'status'          => 'failed',
                'error_message'   => 'No email address on file',
            ]);
        }

        $mailable = new BookingNotificationMail($booking, $eventType);

        try {
            Mail::to($recipientEmail, $recipientName)->send($mailable);

            $log = EmailNotification::create([
                'agency_id'       => $booking->agency_id,
                'booking_id'      => $booking->id,
                'recipient_email' => $recipientEmail,
                'recipient_name'  => $recipientName,
                'event_type'      => $eventType,
                'subject'         => $mailable->mailSubject,
                'status'          => 'sent',
            ]);

            Log::info('[EmailNotification] Email sent', [
                'to'         => $recipientEmail,
                'event_type' => $eventType,
                'booking'    => $booking->booking_reference,
            ]);

            return $log;
        } catch (Throwable $e) {
            Log::error('[EmailNotification] Failed to send email', [
                'to'         => $recipientEmail,
                'event_type' => $eventType,
                'error'      => $e->getMessage(),
            ]);

            return EmailNotification::create([
                'agency_id'       => $booking->agency_id,
                'booking_id'      => $booking->id,
                'recipient_email' => $recipientEmail,
                'recipient_name'  => $recipientName,
                'event_type'      => $eventType,
                'subject'         => $mailable->mailSubject,
                'status'          => 'failed',
                'error_message'   => $e->getMessage(),
            ]);
        }
    }

    /**
     * Resend a previously failed or any email notification (for a booking).
     */
    public function resend(EmailNotification $emailLog): EmailNotification
    {
        $booking = Booking::with(['customer', 'schedule.package', 'agency'])
            ->findOrFail($emailLog->booking_id);

        $mailable = new BookingNotificationMail($booking, $emailLog->event_type);

        try {
            Mail::to($emailLog->recipient_email, $emailLog->recipient_name)->send($mailable);

            $emailLog->update([
                'status'        => 'sent',
                'error_message' => null,
            ]);
        } catch (Throwable $e) {
            Log::error('[EmailNotification] Resend failed', [
                'to'    => $emailLog->recipient_email,
                'error' => $e->getMessage(),
            ]);

            $emailLog->update([
                'status'        => 'failed',
                'error_message' => $e->getMessage(),
            ]);
        }

        return $emailLog->fresh();
    }

    /**
     * Notify agency admin that a new booking has been submitted.
     */
    public function notifyAdminNewBooking(Booking $booking, string $adminEmail, string $adminName): void
    {
        $mailable = new AdminBookingNotificationMail($booking);
        
        try {
            Mail::to($adminEmail, $adminName)->send($mailable);
            
            EmailNotification::create([
                'agency_id'       => $booking->agency_id,
                'booking_id'      => $booking->id,
                'recipient_email' => $adminEmail,
                'recipient_name'  => $adminName,
                'event_type'      => 'admin_new_booking',
                'subject'         => $mailable->mailSubject,
                'status'          => 'sent',
            ]);
            
            Log::info('[EmailNotification] Admin email sent for new booking', [
                'to'      => $adminEmail,
                'booking' => $booking->booking_reference,
            ]);
        } catch (Throwable $e) {
            Log::error('[EmailNotification] Failed to send admin email', [
                'to'    => $adminEmail,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Notify agency admin that a payment has been submitted.
     */
    public function notifyAdminPaymentSubmitted(Booking $booking, string $adminEmail, string $adminName, string $customerName, string $paymentType, float $amount): void
    {
        $mailable = new AdminPaymentNotificationMail($booking, $customerName, $paymentType, $amount);
        
        try {
            Mail::to($adminEmail, $adminName)->send($mailable);
            
            EmailNotification::create([
                'agency_id'       => $booking->agency_id,
                'booking_id'      => $booking->id,
                'recipient_email' => $adminEmail,
                'recipient_name'  => $adminName,
                'event_type'      => 'admin_payment_submitted',
                'subject'         => $mailable->mailSubject,
                'status'          => 'sent',
            ]);
            
            Log::info('[EmailNotification] Admin email sent for payment submission', [
                'to'      => $adminEmail,
                'booking' => $booking->booking_reference,
            ]);
        } catch (Throwable $e) {
            Log::error('[EmailNotification] Failed to send admin payment email', [
                'to'    => $adminEmail,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
