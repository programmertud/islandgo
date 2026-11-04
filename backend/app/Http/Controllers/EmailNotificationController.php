<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\EmailNotification;
use App\Services\Email\EmailNotificationService;
use Illuminate\Http\Request;

class EmailNotificationController extends Controller
{
    public function __construct(protected EmailNotificationService $emailService) {}

    /**
     * List email notification logs for the current agency (with optional filters).
     */
    public function index(Request $request)
    {
        $query = EmailNotification::with('booking:id,booking_reference')
            ->where('agency_id', $request->user()->agency_id);

        if ($request->filled('event_type')) {
            $query->where('event_type', $request->event_type);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('search')) {
            $query->where('recipient_email', 'like', '%' . $request->search . '%');
        }

        return response()->json($query->latest()->paginate(20));
    }

    /**
     * Manually trigger an email notification for a booking event.
     */
    public function send(Request $request)
    {
        $validated = $request->validate([
            'booking_id' => 'required|exists:bookings,id',
            'event_type' => 'required|in:booking_submitted,booking_confirmed,booking_rejected,booking_cancelled,booking_completed,payment_verified,payment_rejected,advance_payment_required,booking_expired',
        ]);

        $booking = Booking::with(['customer', 'schedule.package', 'agency'])
            ->where('agency_id', $request->user()->agency_id)
            ->findOrFail($validated['booking_id']);

        $emailLog = $this->emailService->notifyBooking($booking, $validated['event_type']);

        return response()->json([
            'message' => $emailLog->status === 'sent'
                ? 'Email sent successfully.'
                : 'Email failed to send. Check logs for details.',
            'email' => $emailLog,
        ], 201);
    }

    /**
     * Resend a specific email log entry (retry a failed email).
     */
    public function resend(Request $request, EmailNotification $emailNotification)
    {
        if ($emailNotification->agency_id !== $request->user()->agency_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $emailLog = $this->emailService->resend($emailNotification);

        return response()->json([
            'message' => $emailLog->status === 'sent'
                ? 'Email resent successfully.'
                : 'Email resend failed. Check your mail configuration.',
            'email' => $emailLog,
        ]);
    }
}
