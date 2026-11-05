<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\TourSchedule;
use App\Models\TourPackage;
use App\Models\User;
use App\Models\Payment;
use App\Services\AuditLogService;
use App\Services\NotificationService;
use App\Services\Email\EmailNotificationService;
use App\Jobs\SendSmsNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class GuestBookingController extends Controller
{
    // ── POST /api/v1/guest/bookings ───────────────────────────────
    public function store(Request $request)
    {
        // Rate limit: 10 attempts per minute per IP
        $key = 'guest-book:' . $request->ip();
        if (RateLimiter::tooManyAttempts($key, 10)) {
            return response()->json([
                'message' => 'Too many booking attempts. Please wait a moment before trying again.',
            ], 429);
        }
        RateLimiter::hit($key, 60);

        $validated = $request->validate([
            'tour_schedule_id'   => 'nullable|exists:tour_schedules,id',
            'tour_package_id'    => 'nullable|exists:tour_packages,id',
            'package_id'         => 'nullable|exists:tour_packages,id',
            'booking_date'       => 'nullable|date_format:Y-m-d|after_or_equal:today',
            'participants_count' => 'required|integer|min:1',
            'guest_name'         => 'required|string|max:255',
            'guest_email'        => 'required|email|max:255',
            'guest_phone'        => 'required|string|max:20',
            'special_requests'   => 'nullable|string|max:1000',
            'payment_method'     => 'nullable|in:cash,gcash',
            'payment_option'     => 'nullable|in:advance,full',
        ]);

        if (empty($validated['tour_schedule_id']) && empty($validated['booking_date'])) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'tour_schedule_id' => 'Please select a vacation date.'
            ]);
        }

        // Normalize email to lowercase before storing.
        $validated['guest_email'] = strtolower(trim($validated['guest_email']));
        // Basic phone normalization: strip extraneous whitespace.
        $validated['guest_phone'] = trim($validated['guest_phone']);

        return DB::transaction(function () use ($validated) {
            if (!empty($validated['tour_schedule_id'])) {
                /** @var TourSchedule $schedule */
                $schedule = TourSchedule::findOrFail($validated['tour_schedule_id']);
                TourPackage::whereKey($schedule->tour_package_id)->lockForUpdate()->firstOrFail();
                $schedule = TourSchedule::lockForUpdate()->findOrFail($schedule->id);
                $package = $schedule->package;
            } else {
                $pkgId = $validated['tour_package_id'] ?? $validated['package_id'];
                $package = TourPackage::whereKey($pkgId)->lockForUpdate()->firstOrFail();
                $schedule = TourSchedule::lockForUpdate()->firstOrCreate(
                    [
                        'tour_package_id' => $package->id,
                        'departure_date'  => $validated['booking_date'],
                    ],
                    [
                        'capacity'       => $package->max_participants ?: 20,
                        'reserved_slots' => 0,
                        'status'         => 'open',
                    ]
                );
            }

            // Validate schedule is bookable.
            if ($schedule->status !== 'open') {
                return response()->json(['message' => 'This schedule is not available for booking.'], 422);
            }

            if (!$package || $package->status !== 'published') {
                return response()->json(['message' => 'This tour package is not currently available.'], 422);
            }

            TourAvailabilityController::assertDateAvailable($package, $schedule->departure_date->format('Y-m-d'));

            // Authoritative seat calculation from the database row we just locked.
            $available = $schedule->capacity - $schedule->reserved_slots;
            if ($validated['participants_count'] > $available) {
                return response()->json([
                    'message' => "Not enough available seats. Only {$available} seat(s) remaining.",
                ], 422);
            }

            // Pricing from server only — never trust client-supplied amounts.
            $isFullPayment   = ($validated['payment_option'] ?? 'advance') === 'full';
            $total           = round((float) $package->price_per_person * $validated['participants_count'], 2);
            $requiredAdvance = $isFullPayment ? $total : round($total * 0.50, 2);
            $deadlineHours   = $package->agency?->advance_payment_deadline_hours;

            // Generate a collision-safe booking reference.
            $ref = $this->generateUniqueReference();

            $booking = Booking::create([
                'booking_reference'       => $ref,
                'agency_id'               => $package->agency_id,
                'customer_id'             => null,          // guest — no account required
                'guest_name'              => $validated['guest_name'],
                'guest_email'             => $validated['guest_email'],
                'guest_phone'             => $validated['guest_phone'],
                'guest_token'             => Str::uuid()->toString(),
                'tour_schedule_id'        => $schedule->id,
                'participants_count'      => $validated['participants_count'],
                'total_amount'            => $total,
                'required_advance_amount' => $requiredAdvance,
                'advance_paid_amount'     => 0,
                'remaining_balance'       => $total,
                'booking_status'          => 'pending',
                'payment_status'          => 'unpaid',
                'payment_method'          => $validated['payment_method'] ?? null,
                'payment_deadline'        => $deadlineHours ? now()->addHours($deadlineHours) : null,
                'special_requests'        => $validated['special_requests'] ?? null,
            ]);

            // Reserve slots exactly once inside the locked transaction.
            $schedule->increment('reserved_slots', $validated['participants_count']);

            AuditLogService::log(
                'booking.created', 'Booking', $booking->id,
                "Guest created booking {$booking->booking_reference}",
                null,
                ['booking_reference' => $booking->booking_reference, 'total_amount' => $total, 'guest' => true]
            );

            // In-app notification for agency admin
            $agencyAdmin = User::where('agency_id', $package->agency_id)
                ->where('role', 'agency_admin')->first();
            if ($agencyAdmin) {
                \App\Services\NotificationService::newBooking(
                    $agencyAdmin->id, $package->agency_id,
                    $booking->id, $booking->booking_reference,
                    $validated['guest_name']
                );
            }

            // Dispatch SMS and email outside the main flow after response to avoid blocking/timeouts
            dispatch(function () use ($booking, $agencyAdmin) {
                if ($agencyAdmin) {
                    rescue(fn() => app(EmailNotificationService::class)->notifyAdminNewBooking(
                        $booking,
                        $agencyAdmin->email,
                        $agencyAdmin->name
                    ));
                }

                rescue(fn() => SendSmsNotification::dispatchSync($booking, 'advance_payment_required'));
                rescue(fn() => app(EmailNotificationService::class)->notifyBooking($booking, 'booking_submitted'));
                rescue(fn() => app(EmailNotificationService::class)->notifyBooking($booking, 'advance_payment_required'));
            })->afterResponse();

            $booking->load(['schedule.package.agency']);

            return response()->json([
                'booking_reference'       => $booking->booking_reference,
                'booking_status'          => $booking->booking_status,
                'payment_status'          => $booking->payment_status,
                'payment_method'          => $booking->payment_method,
                'payment_deadline'        => $booking->payment_deadline?->toIso8601String(),
                'total_amount'            => (float) $booking->total_amount,
                'required_advance_amount' => (float) $booking->required_advance_amount,
                'participants_count'      => $booking->participants_count,
                'special_requests'        => $booking->special_requests,
                'tour'  => [
                    'title'       => $booking->schedule->package->title,
                    'destination' => $booking->schedule->package->destination,
                    'destination_name'    => $booking->schedule->package->destination_name,
                    'destination_address' => $booking->schedule->package->destination_address,
                    'latitude'    => $booking->schedule->package->latitude,
                    'longitude'   => $booking->schedule->package->longitude,
                    'agency_name' => $booking->schedule->package->agency?->name,
                    'gcash_number'       => $booking->schedule->package->agency?->gcash_number,
                    'gcash_account_name' => $booking->schedule->package->agency?->gcash_account_name,
                    'payment_qr_code_url' => $booking->schedule->package->agency?->payment_qr_code_url,
                ],
                'schedule' => [
                    'id'             => $booking->schedule->id,
                    'departure_date' => $booking->schedule->departure_date,
                    'start_time'     => $booking->schedule->start_time,
                ],
                'next_steps' => $this->nextSteps($booking),
            ], 201);
        });
    }

    // ── GET /api/v1/guest/bookings/lookup ─────────────────────────
    public function lookup(Request $request)
    {
        // Rate limit: 20 attempts per minute per IP to slow enumeration.
        $key = 'guest-lookup:' . $request->ip();
        if (RateLimiter::tooManyAttempts($key, 20)) {
            return response()->json(['message' => 'Too many lookup attempts. Please try again later.'], 429);
        }
        RateLimiter::hit($key, 60);

        if ($request->has('email') && !$request->has('guest_email')) {
            $request->merge(['guest_email' => $request->input('email')]);
        }

        $validated = $request->validate([
            'booking_reference' => 'required|string|max:30',
            'guest_email'       => 'required|email|max:255',
        ]);

        $email = strtolower(trim($validated['guest_email']));

        // Generic 404 for both not-found and email-mismatch to prevent enumeration.
        $booking = Booking::where('booking_reference', $validated['booking_reference'])
            ->whereNotNull('guest_email')
            ->first();

        if (!$booking || strtolower($booking->guest_email) !== $email) {
            return response()->json([
                'message' => 'No booking found with the provided reference and email address.',
            ], 404);
        }

        $booking->load(['schedule.package.agency']);

        return response()->json([
            'booking_reference'       => $booking->booking_reference,
            'booking_status'          => $booking->booking_status,
            'payment_status'          => $booking->payment_status,
            'payment_method'          => $booking->payment_method,
            'payment_deadline'        => $booking->payment_deadline?->toIso8601String(),
            'total_amount'            => (float) $booking->total_amount,
            'required_advance_amount' => (float) $booking->required_advance_amount,
            'advance_paid_amount'     => (float) $booking->advance_paid_amount,
            'remaining_balance'       => (float) $booking->remaining_balance,
            'participants_count'      => $booking->participants_count,
            'special_requests'        => $booking->special_requests,
            'created_at'              => $booking->created_at->toIso8601String(),
            'tour' => [
                'title'              => $booking->schedule->package->title ?? null,
                'destination'        => $booking->schedule->package->destination ?? null,
                'destination_name'   => $booking->schedule->package->destination_name ?? null,
                'destination_address'=> $booking->schedule->package->destination_address ?? null,
                'latitude'           => $booking->schedule->package->latitude ?? null,
                'longitude'          => $booking->schedule->package->longitude ?? null,
                'agency_name'        => $booking->schedule->package->agency?->name,
                'gcash_number'       => $booking->schedule->package->agency?->gcash_number,
                'gcash_account_name' => $booking->schedule->package->agency?->gcash_account_name,
                'payment_qr_code_url' => $booking->schedule->package->agency?->payment_qr_code_url,
            ],
            'schedule' => [
                'id'             => $booking->schedule->id ?? null,
                'departure_date' => $booking->schedule->departure_date ?? null,
                'start_time'     => $booking->schedule->start_time ?? null,
            ],
            'next_steps' => $this->nextSteps($booking),
        ]);
    }

    // ── POST /api/v1/guest/bookings/payment ───────────────────────
    public function submitPayment(Request $request)
    {
        $key = 'guest-pay:' . $request->ip();
        if (RateLimiter::tooManyAttempts($key, 10)) {
            return response()->json(['message' => 'Too many attempts. Please try again later.'], 429);
        }
        RateLimiter::hit($key, 60);

        if ($request->has('email') && !$request->has('guest_email')) {
            $request->merge(['guest_email' => $request->input('email')]);
        }

        $validated = $request->validate([
            'booking_reference' => 'required|string|max:30',
            'guest_email'       => 'required|email|max:255',
            'payment_method'    => 'required|in:gcash',
            'gcash_reference'   => 'required|string|max:100',
            'proof_of_payment'  => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120',
            'payment_option'    => 'nullable|in:advance,full',
        ]);

        $email = strtolower(trim($validated['guest_email']));
        $booking = Booking::where('booking_reference', $validated['booking_reference'])
            ->whereNotNull('guest_email')
            ->first();

        if (!$booking || strtolower($booking->guest_email) !== $email) {
            return response()->json(['message' => 'Booking not found with provided reference and email.'], 404);
        }

        if (in_array($booking->booking_status, ['rejected', 'cancelled', 'completed', 'expired']) || $booking->slots_released_at) {
            return response()->json(['message' => 'This booking is no longer eligible for payment.'], 422);
        }

        $isAdvance = $booking->booking_status === 'pending';
        $isFinal   = $booking->booking_status === 'confirmed' && (float) $booking->remaining_balance > 0;

        if (!$isAdvance && !$isFinal) {
            return response()->json(['message' => 'This booking is already fully paid or not eligible for payment.'], 422);
        }

        if ($booking->payments()->where('status', 'submitted')->exists()) {
            return response()->json(['message' => 'A payment proof for this booking has already been submitted and is awaiting verification.'], 422);
        }

        $path = $request->file('proof_of_payment')->store('payment-proofs', 'public');
        $paymentType = $isAdvance ? 'advance' : 'final';
        if ($isAdvance) {
            $isFull = ($validated['payment_option'] ?? null) === 'full';
            if ($isFull) {
                $amount = (float) $booking->total_amount;
                $booking->update(['required_advance_amount' => $amount]);
            } else {
                $amount = (float) $booking->required_advance_amount > 0 ? (float) $booking->required_advance_amount : round((float) $booking->total_amount * 0.50, 2);
            }
        } else {
            $amount = (float) $booking->remaining_balance;
        }

        $payment = Payment::create([
            'booking_id'            => $booking->id,
            'payment_reference'     => 'PAY-' . strtoupper(Str::random(8)),
            'amount'                => $amount,
            'payment_type'          => $paymentType,
            'payment_method'        => 'gcash',
            'gcash_reference'       => $validated['gcash_reference'],
            'proof_of_payment_path' => $path,
            'status'                => 'submitted',
        ]);

        $booking->update([
            'payment_status' => 'submitted',
            'payment_method' => 'gcash',
        ]);

        AuditLogService::log(
            "payment.{$paymentType}_submitted", 'Payment', $payment->id,
            "Guest {$booking->guest_name} submitted {$paymentType} payment for {$booking->booking_reference}",
            null,
            ['booking_reference' => $booking->booking_reference, 'amount' => $amount, 'guest' => true]
        );

        // Notify agency admin
        $agencyAdmin = User::where('agency_id', $booking->agency_id)
            ->where('role', 'agency_admin')->first();
        if ($agencyAdmin) {
            NotificationService::send(
                $agencyAdmin->id,
                'payment_submitted',
                'New Payment Submitted',
                "Guest {$booking->guest_name} submitted payment receipt for booking #{$booking->booking_reference}.",
                $booking->agency_id,
                'Booking',
                $booking->id
            );

            dispatch(function () use ($booking, $agencyAdmin, $amount) {
                rescue(fn() => app(EmailNotificationService::class)->notifyAdminPaymentSubmitted(
                    $booking,
                    $agencyAdmin->email,
                    $agencyAdmin->name,
                    $booking->guest_name ?? 'Guest',
                    'advance',
                    (float) $amount
                ));
            })->afterResponse();
        }

        return response()->json([
            'message' => 'Payment proof submitted successfully! The agency will review and verify your payment shortly.',
            'payment_status' => 'submitted',
        ]);
    }

    // ── Helpers ───────────────────────────────────────────────────

    /**
     * Generate a unique booking reference with collision protection.
     * Format: BK-XXXXXXXX (8 random uppercase chars).
     */
    private function generateUniqueReference(): string
    {
        $attempts = 0;
        do {
            $ref = 'BK-' . strtoupper(Str::random(8));
            $attempts++;
            if ($attempts > 20) {
                // Highly unlikely — but fall back to a longer suffix.
                $ref = 'BK-' . strtoupper(Str::random(12));
            }
        } while (Booking::withTrashed()->where('booking_reference', $ref)->exists());

        return $ref;
    }

    /**
     * Human-readable next-steps string based on current booking and payment state.
     */
    private function nextSteps(Booking $booking): string
    {
        $method = $booking->payment_method;
        $advance = '₱' . number_format((float) $booking->required_advance_amount, 2);
        $deadline = $booking->payment_deadline
            ? $booking->payment_deadline->format('M j, Y g:i A')
            : null;

        if ($method === 'gcash') {
            $agency = $booking->schedule?->package?->agency;
            $gcash = $agency?->gcash_number ? "GCash number {$agency->gcash_number}" : 'the agency\'s GCash number';
            $deadlineNote = $deadline ? " before {$deadline}" : '';
            return "Send {$advance} to {$gcash}{$deadlineNote}. Keep your booking reference ({$booking->booking_reference}) and use it when following up with the agency.";
        }

        if ($method === 'cash') {
            $deadlineNote = $deadline ? " before {$deadline}" : '';
            return "Visit the agency office and pay {$advance} in cash{$deadlineNote}. Your reservation will be held pending payment. Bring your booking reference ({$booking->booking_reference}).";
        }

        return "Contact the agency to arrange your {$advance} advance payment. Quote your booking reference {$booking->booking_reference} when you do.";
    }
}
