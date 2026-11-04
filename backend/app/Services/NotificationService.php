<?php

namespace App\Services;

use App\Models\Notification;

class NotificationService
{
    /**
     * Send an in-app notification to a specific user.
     */
    public static function send(
        int $userId,
        string $type,
        string $title,
        string $message,
        ?int $agencyId = null,
        ?string $entityType = null,
        ?int $entityId = null,
    ): Notification {
        return Notification::create([
            'user_id'     => $userId,
            'agency_id'   => $agencyId,
            'type'        => $type,
            'title'       => $title,
            'message'     => $message,
            'entity_type' => $entityType,
            'entity_id'   => $entityId,
            'is_read'     => false,
        ]);
    }

    /**
     * Notify a user that their booking was approved.
     */
    public static function bookingApproved(int $userId, int $agencyId, int $bookingId, string $bookingRef): void
    {
        self::send(
            userId: $userId,
            type: 'booking_approved',
            title: 'Booking Confirmed!',
            message: "Your booking #{$bookingRef} has been approved. We look forward to seeing you!",
            agencyId: $agencyId,
            entityType: 'Booking',
            entityId: $bookingId,
        );
    }

    /**
     * Notify a user that their booking was rejected.
     */
    public static function bookingRejected(int $userId, int $agencyId, int $bookingId, string $bookingRef, ?string $reason = null): void
    {
        $message = "Your booking #{$bookingRef} was not approved.";
        if ($reason) {
            $message .= " Reason: {$reason}";
        }

        self::send(
            userId: $userId,
            type: 'booking_rejected',
            title: 'Booking Not Approved',
            message: $message,
            agencyId: $agencyId,
            entityType: 'Booking',
            entityId: $bookingId,
        );
    }

    /**
     * Notify a user that their payment was verified.
     */
    public static function paymentVerified(int $userId, int $agencyId, int $bookingId, string $bookingRef): void
    {
        self::send(
            userId: $userId,
            type: 'payment_verified',
            title: 'Payment Confirmed',
            message: "Your payment for booking #{$bookingRef} has been verified successfully.",
            agencyId: $agencyId,
            entityType: 'Booking',
            entityId: $bookingId,
        );
    }

    /**
     * Notify a user that their payment was rejected.
     */
    public static function paymentRejected(int $userId, int $agencyId, int $bookingId, string $bookingRef, ?string $reason = null): void
    {
        $message = "Your payment for booking #{$bookingRef} was rejected.";
        if ($reason) {
            $message .= " Notes: {$reason}";
        }

        self::send(
            userId: $userId,
            type: 'payment_rejected',
            title: 'Payment Rejected',
            message: $message,
            agencyId: $agencyId,
            entityType: 'Booking',
            entityId: $bookingId,
        );
    }

    /**
     * Notify agency admin of a new booking.
     */
    public static function newBooking(int $agencyAdminId, int $agencyId, int $bookingId, string $bookingRef, string $customerName): void
    {
        self::send(
            userId: $agencyAdminId,
            type: 'new_booking',
            title: 'New Booking Received',
            message: "A new booking #{$bookingRef} from {$customerName} is awaiting your review.",
            agencyId: $agencyId,
            entityType: 'Booking',
            entityId: $bookingId,
        );
    }

    public static function newPayment(int $agencyAdminId, int $agencyId, int $bookingId, string $bookingRef, string $customerName, string $paymentType): void
    {
        $amountType = $paymentType === 'advance' ? '50% advance' : 'final balance';
        self::send(
            userId: $agencyAdminId,
            type: 'new_payment',
            title: 'Payment Submitted',
            message: "{$customerName} has submitted a {$amountType} payment for booking #{$bookingRef}. Please verify it.",
            agencyId: $agencyId,
            entityType: 'Booking',
            entityId: $bookingId,
        );
    }
}
