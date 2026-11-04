<?php

namespace App\Mail;

use App\Models\Booking;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AdminBookingNotificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $mailSubject;
    public string $customerName;
    public string $bookingReference;
    public string $tourName;
    public string $totalAmount;
    public int $participantsCount;
    public string $eventMessage;

    public function __construct(Booking $booking)
    {
        $booking->loadMissing(['customer', 'schedule.package', 'agency']);

        $this->customerName     = $booking->customer->name ?? $booking->guest_name ?? 'Customer';
        $this->bookingReference = $booking->booking_reference;
        $this->tourName         = $booking->schedule->package->title ?? 'Tour';
        $this->totalAmount      = '₱' . number_format((float) $booking->total_amount, 2);
        $this->participantsCount = $booking->participants_count;
        $this->eventMessage     = "A new booking has been submitted by {$this->customerName}.";

        $this->mailSubject = "New Booking Received: #{$this->bookingReference}";
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->mailSubject);
    }

    public function content(): Content
    {
        return new Content(view: 'emails.admin-booking-notification');
    }

    public function attachments(): array
    {
        return [];
    }
}
