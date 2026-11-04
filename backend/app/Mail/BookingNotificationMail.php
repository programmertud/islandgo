<?php

namespace App\Mail;

use App\Models\Booking;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BookingNotificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $mailSubject;
    public string $eventType;
    public string $customerName;
    public string $bookingReference;
    public string $tourName;
    public string $agencyName;
    public string $bookingStatus;
    public string $totalAmount;
    public string $advanceAmount;
    public string $remainingBalance;
    public ?string $rejectionReason;
    public ?string $paymentDeadline;
    public int $participantsCount;

    public function __construct(Booking $booking, string $eventType)
    {
        $booking->loadMissing(['customer', 'schedule.package', 'agency']);

        $this->eventType        = $eventType;
        $this->customerName     = $booking->customer->name ?? $booking->guest_name ?? 'Customer';
        $this->bookingReference = $booking->booking_reference;
        $this->tourName         = $booking->schedule->package->title ?? 'Tour';
        $this->agencyName       = $booking->agency->name ?? 'Agency';
        $this->bookingStatus    = $booking->booking_status;
        $this->totalAmount      = '₱' . number_format((float) $booking->total_amount, 2);
        $this->advanceAmount    = '₱' . number_format((float) $booking->required_advance_amount, 2);
        $this->remainingBalance = '₱' . number_format((float) $booking->remaining_balance, 2);
        $this->rejectionReason  = $booking->rejection_reason;
        $this->participantsCount = $booking->participants_count;
        $this->paymentDeadline  = $booking->payment_deadline
            ? $booking->payment_deadline->format('M j, Y g:i A')
            : null;

        $this->mailSubject = $this->resolveSubject($eventType);
    }

    private function resolveSubject(string $eventType): string
    {
        return match ($eventType) {
            'booking_submitted'        => "Booking #{$this->bookingReference} Received – {$this->agencyName}",
            'advance_payment_required' => "Action Required: Payment for #{$this->bookingReference}",
            'booking_confirmed'        => "Booking #{$this->bookingReference} Confirmed!",
            'booking_rejected'         => "Booking #{$this->bookingReference} Rejected",
            'booking_cancelled'        => "Booking #{$this->bookingReference} Cancelled",
            'booking_completed'        => "Full Payment Received & Tour Completed – #{$this->bookingReference}",
            'payment_verified'         => "Payment Verified – Booking #{$this->bookingReference}",
            'payment_rejected'         => "Payment Not Verified – Booking #{$this->bookingReference}",
            'booking_expired'          => "Booking #{$this->bookingReference} Expired",
            default                    => "Booking Update – #{$this->bookingReference}",
        };
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->mailSubject);
    }

    public function content(): Content
    {
        return new Content(view: 'emails.booking-notification');
    }

    public function attachments(): array
    {
        return [];
    }
}
