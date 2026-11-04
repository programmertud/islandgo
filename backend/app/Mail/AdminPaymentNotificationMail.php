<?php

namespace App\Mail;

use App\Models\Booking;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AdminPaymentNotificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $mailSubject;
    public string $customerName;
    public string $bookingReference;
    public string $tourName;
    public string $paymentAmount;
    public string $paymentTypeLabel;
    public string $eventMessage;

    public function __construct(Booking $booking, string $customerName, string $paymentType, float $amount)
    {
        $booking->loadMissing(['schedule.package']);

        $this->customerName     = $customerName;
        $this->bookingReference = $booking->booking_reference;
        $this->tourName         = $booking->schedule->package->title ?? 'Tour';
        $this->paymentAmount    = '₱' . number_format($amount, 2);
        
        $this->paymentTypeLabel = $paymentType === 'advance' ? '50% Advance' : 'Final Balance';
        $this->eventMessage     = "{$this->customerName} has uploaded a GCash receipt for a {$this->paymentTypeLabel} payment.";

        $this->mailSubject = "Payment Submitted: #{$this->bookingReference}";
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->mailSubject);
    }

    public function content(): Content
    {
        return new Content(view: 'emails.admin-payment-notification');
    }

    public function attachments(): array
    {
        return [];
    }
}
