<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\SmsNotification;
use App\Services\Sms\SmsNotificationService;
use Illuminate\Http\Request;

class SmsNotificationController extends Controller
{
    public function __construct(protected SmsNotificationService $smsService) {}

    /**
     * List SMS logs for the current agency (with optional filters).
     */
    public function index(Request $request)
    {
        $query = SmsNotification::with('booking:id,booking_reference')
            ->where('agency_id', $request->user()->agency_id);

        if ($request->filled('event_type')) {
            $query->where('event_type', $request->event_type);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('search')) {
            $query->where('recipient_phone', 'like', '%' . $request->search . '%');
        }

        return response()->json($query->latest()->paginate(20));
    }

    /**
     * Manually send an SMS notification for a booking event.
     * Useful for re-triggering a specific event (e.g., resend booking_confirmed).
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

        $smsLog = $this->smsService->notifyBooking($booking, $validated['event_type']);

        return response()->json([
            'message' => $smsLog->status === 'sent'
                ? 'SMS sent successfully.'
                : 'SMS failed to send. Check logs for details.',
            'sms' => $smsLog,
        ], 201);
    }

    /**
     * Resend a specific SMS log entry (retry a failed SMS).
     */
    public function resend(Request $request, SmsNotification $smsNotification)
    {
        // Ensure the SMS log belongs to the current agency
        if ($smsNotification->agency_id !== $request->user()->agency_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $smsLog = $this->smsService->resend($smsNotification);

        return response()->json([
            'message' => $smsLog->status === 'sent'
                ? 'SMS resent successfully.'
                : 'SMS resend failed. Check your Semaphore API key and the recipient number.',
            'sms' => $smsLog,
        ]);
    }
}
