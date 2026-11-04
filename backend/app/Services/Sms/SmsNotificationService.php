<?php

namespace App\Services\Sms;

use App\Models\Booking;
use App\Models\SmsNotification;

class SmsNotificationService
{
    protected array $templates = [
        'booking_submitted'        => 'Hi {customer_name}, your booking #{booking_reference} for {tour_name} with {agency_name} has been received. We will confirm it shortly.',
        'booking_confirmed'        => 'Hi {customer_name}! Great news! Your booking #{booking_reference} for {tour_name} is CONFIRMED. We look forward to seeing you on your adventure! - {agency_name}',
        'booking_rejected'         => 'Hi {customer_name}, unfortunately your booking #{booking_reference} for {tour_name} has been rejected. Reason: {rejection_reason}. Please contact {agency_name} for assistance.',
        'booking_cancelled'        => 'Hi {customer_name}, your booking #{booking_reference} for {tour_name} has been cancelled. Contact {agency_name} for assistance.',
        'booking_completed'        => 'Hi {customer_name}! Your full payment for {tour_name} (Booking #{booking_reference}) has been received and your booking is now marked as COMPLETED. Thank you for booking with {agency_name}!',
        'payment_verified'         => 'Hi {customer_name}! Your payment for booking #{booking_reference} ({tour_name}) has been verified. Remaining balance: {remaining_balance}. You are all set! - {agency_name}',
        'payment_rejected'         => 'Hi {customer_name}, your advance payment for booking #{booking_reference} could not be verified. Please submit valid proof or contact {agency_name}.',
        'advance_payment_required' => 'Hi {customer_name}! Booking #{booking_reference} created for {tour_name}. A payment of {advance_amount} is required to secure your reservation. - {agency_name}',
        'booking_expired'          => 'Hi {customer_name}, your booking #{booking_reference} for {tour_name} has expired because the required advance payment was not received. Your slots have been released. - {agency_name}',
    ];

    public function __construct(protected SmsServiceInterface $sms) {}

    /**
     * Send an SMS notification for a booking event and log it.
     */
    public function notifyBooking(Booking $booking, string $eventType): ?SmsNotification
    {
        if (!isset($this->templates[$eventType])) {
            return null;
        }

        $booking->loadMissing(['customer', 'schedule.package', 'agency']);

        $customerName = $booking->customer->name ?? $booking->guest_name ?? 'Customer';

        $message = strtr($this->templates[$eventType], [
            '{customer_name}'     => $customerName,
            '{booking_reference}' => $booking->booking_reference,
            '{tour_name}'         => $booking->schedule->package->title ?? 'Tour',
            '{agency_name}'       => $booking->agency->name ?? 'Agency',
            '{advance_amount}'    => '₱' . number_format((float) $booking->required_advance_amount, 2),
            '{remaining_balance}' => '₱' . number_format((float) $booking->remaining_balance, 2),
            '{rejection_reason}'  => $booking->rejection_reason ?? 'No reason provided',
        ]);

        $phone  = $booking->customer->phone ?? $booking->guest_phone ?? null;
        $result = $phone ? $this->sms->send($phone, $message) : ['success' => false, 'reference' => null, 'error' => 'No phone number on file'];

        return SmsNotification::create([
            'agency_id'          => $booking->agency_id,
            'booking_id'         => $booking->id,
            'recipient_phone'    => $phone ?? 'unknown',
            'message'            => $message,
            'event_type'         => $eventType,
            'status'             => $result['success'] ? 'sent' : 'failed',
            'provider_reference' => $result['reference'] ?? null,
        ]);
    }

    /**
     * Resend a previously failed or any SMS notification.
     */
    public function resend(SmsNotification $smsLog): SmsNotification
    {
        $result = $this->sms->send($smsLog->recipient_phone, $smsLog->message);

        $smsLog->update([
            'status'             => $result['success'] ? 'sent' : 'failed',
            'provider_reference' => $result['reference'] ?? $smsLog->provider_reference,
        ]);

        return $smsLog->fresh();
    }
}
