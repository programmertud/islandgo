<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\BookingDocument;
use App\Models\TourSchedule;
use App\Models\User;
use App\Services\AuditLogService;
use App\Services\NotificationService;
use App\Services\Email\EmailNotificationService;
use App\Services\Sms\SmsNotificationService;
use App\Jobs\SendSmsNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BookingController extends Controller
{
    // ── Customer: create booking ──────────────────────────────────
    public function store(Request $request)
    {
        $validated = $request->validate([
            'tour_schedule_id'   => 'nullable|exists:tour_schedules,id',
            'tour_package_id'    => 'nullable|exists:tour_packages,id',
            'package_id'         => 'nullable|exists:tour_packages,id',
            'booking_date'       => 'nullable|date_format:Y-m-d|after_or_equal:today',
            'participants_count' => 'required|integer|min:1',
            'special_requests'   => 'nullable|string|max:1000',
            'payment_method'     => 'nullable|in:cash,gcash',
            'payment_option'     => 'nullable|in:advance,full',
        ]);

        if (empty($validated['tour_schedule_id']) && empty($validated['booking_date'])) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'tour_schedule_id' => 'Please select a vacation date.'
            ]);
        }

        return DB::transaction(function () use ($validated, $request) {
            if (!empty($validated['tour_schedule_id'])) {
                $schedule = TourSchedule::findOrFail($validated['tour_schedule_id']);
                \App\Models\TourPackage::whereKey($schedule->tour_package_id)->lockForUpdate()->firstOrFail();
                $schedule = TourSchedule::lockForUpdate()->findOrFail($schedule->id);
                $package = $schedule->package;
            } else {
                $pkgId = $validated['tour_package_id'] ?? $validated['package_id'];
                $package = \App\Models\TourPackage::whereKey($pkgId)->lockForUpdate()->firstOrFail();
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

            if (!$package || $schedule->status !== 'open' || $package->status !== 'published') {
                return response()->json(['message' => 'This vacation date is not available for booking.'], 422);
            }
            TourAvailabilityController::assertDateAvailable($package, $schedule->departure_date->format('Y-m-d'));

            $available = $schedule->capacity - $schedule->reserved_slots;
            if ($validated['participants_count'] > $available) {
                return response()->json(['message' => 'Not enough available slots.'], 422);
            }

            // Calculate money only from the trusted package price and guest count.
            $isFullPayment   = ($validated['payment_option'] ?? 'advance') === 'full';
            $total           = round((float) $package->price_per_person * $validated['participants_count'], 2);
            $requiredAdvance = $isFullPayment ? $total : round($total * 0.50, 2);
            $deadlineHours   = $package->agency?->advance_payment_deadline_hours;

            $booking = Booking::create([
                'booking_reference'  => 'BK-' . strtoupper(Str::random(8)),
                'agency_id'          => $package->agency_id,
                'customer_id'        => $request->user()->id,
                'tour_schedule_id'   => $schedule->id,
                'participants_count' => $validated['participants_count'],
                'total_amount'       => $total,
                'required_advance_amount' => $requiredAdvance,
                'advance_paid_amount' => 0,
                'remaining_balance' => $total,
                'booking_status'     => 'pending',
                'payment_status'     => 'unpaid',
                'payment_method'     => $validated['payment_method'] ?? null,
                'payment_deadline'   => $deadlineHours ? now()->addHours($deadlineHours) : null,
                'special_requests'   => $validated['special_requests'] ?? null,
            ]);

            $schedule->increment('reserved_slots', $validated['participants_count']);

            AuditLogService::log(
                'booking.created', 'Booking', $booking->id,
                "Customer created booking {$booking->booking_reference}",
                null,
                ['booking_reference' => $booking->booking_reference, 'total_amount' => $total]
            );

            // Notify agency admin
            $agencyAdmin = User::where('agency_id', $package->agency_id)
                ->where('role', 'agency_admin')->first();
            if ($agencyAdmin) {
                NotificationService::newBooking(
                    $agencyAdmin->id, $package->agency_id,
                    $booking->id, $booking->booking_reference,
                    $request->user()->name
                );
            }

            NotificationService::send(
                $request->user()->id,
                'advance_payment_required',
                '50% Advance Payment Required',
                "Booking #{$booking->booking_reference} needs an advance payment of ₱" . number_format($requiredAdvance, 2) . ($booking->payment_deadline ? " before {$booking->payment_deadline->format('M j, Y g:i A')}" : '') . ' to secure your reservation.',
                $booking->agency_id,
                'Booking',
                $booking->id,
            );

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

            return response()->json($booking->load('schedule.package'), 201);
        });
    }

    // ── Customer: view own bookings ───────────────────────────────
    public function myBookings(Request $request)
    {
        $bookings = Booking::where('customer_id', $request->user()->id)
            ->with(['schedule.package.agency', 'payments'])
            ->latest()
            ->paginate(15);

        return response()->json($bookings);
    }

    // ── Customer / Agency: single booking ────────────────────────
    public function show(Request $request, Booking $booking)
    {
        if ($booking->customer_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        return response()->json($booking->load(['schedule.package.agency', 'payments', 'documents']));
    }

    // ── Agency: list bookings ─────────────────────────────────────
    public function agencyBookings(Request $request)
    {
        $user = $request->user();

        if (!$user->agency_id) {
            return response()->json(['message' => 'Unauthorized. No agency associated with this account.'], 403);
        }

        $query = Booking::with(['customer', 'schedule.package', 'payments'])
            ->where('agency_id', $user->agency_id)
            ->when($request->booking_status,  fn($q, $s) => $q->where('booking_status', $s))
            ->when($request->payment_status,  fn($q, $s) => $q->where('payment_status', $s))
            ->when($request->payment_method,  fn($q, $m) => $q->where('payment_method', $m))
            ->when($request->search, fn($q, $s) => $q->where(function ($q) use ($s) {
                $q->where('booking_reference', 'like', "%{$s}%")
                  ->orWhere('guest_name', 'like', "%{$s}%")
                  ->orWhere('guest_email', 'like', "%{$s}%")
                  ->orWhereHas('customer', fn($q) => $q->where('name', 'like', "%{$s}%"));
            }))
            ->when($request->date_from, fn($q, $d) => $q->whereDate('created_at', '>=', $d))
            ->when($request->date_to,   fn($q, $d) => $q->whereDate('created_at', '<=', $d))
            ->latest()
            ->paginate($request->per_page ?? 20);

        return response()->json($query);
    }

    // ── Agency: view single booking ───────────────────────────────
    public function agencyShow(Request $request, Booking $booking)
    {
        $user = $request->user();
        if ($user->role !== 'super_admin' && $booking->agency_id !== $user->agency_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        return response()->json($booking->load(['customer', 'schedule.package', 'payments', 'documents.uploader']));
    }

    // ── Admin: all bookings ───────────────────────────────────────
    public function adminBookings(Request $request)
    {
        if ($request->user()?->role !== 'super_admin') {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $query = Booking::with(['customer', 'schedule.package', 'payments', 'agency'])
            ->when($request->agency_id,       fn($q, $a) => $q->where('agency_id', $a))
            ->when($request->booking_status,  fn($q, $s) => $q->where('booking_status', $s))
            ->when($request->payment_status,  fn($q, $s) => $q->where('payment_status', $s))
            ->when($request->search, fn($q, $s) => $q->where(function ($q) use ($s) {
                $q->where('booking_reference', 'like', "%{$s}%")
                  ->orWhere('guest_name', 'like', "%{$s}%")
                  ->orWhere('guest_email', 'like', "%{$s}%")
                  ->orWhereHas('customer', fn($q) => $q->where('name', 'like', "%{$s}%"));
            }))
            ->latest()
            ->paginate($request->per_page ?? 20);

        return response()->json($query);
    }

    // ── Agency: update booking status ─────────────────────────────
    public function updateStatus(Request $request, Booking $booking)
    {
        $user = $request->user();
        if ($booking->agency_id !== $user->agency_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'booking_status'   => 'required|in:confirmed,rejected,cancelled,completed',
            'rejection_reason' => 'nullable|string|max:500',
        ]);

        $newStatus = $request->booking_status;

        if ($newStatus === 'confirmed' && !$booking->hasVerifiedAdvance()) {
            return response()->json([
                'message' => 'The booking cannot be confirmed because the required 50% advance payment has not been verified.'
            ], 422);
        }

        if (!$booking->canTransitionTo($newStatus)) {
            return response()->json([
                'message' => "Cannot transition from '{$booking->booking_status}' to '{$newStatus}'."
            ], 422);
        }

        $oldStatus = $booking->booking_status;
        $old = ['booking_status' => $oldStatus];

        DB::transaction(function () use ($booking, $request, $newStatus, $oldStatus, $user) {
            $updates = [
                'booking_status'   => $newStatus,
                'rejection_reason' => in_array($newStatus, ['rejected', 'cancelled'])
                    ? $request->rejection_reason : null,
            ];

            if ($newStatus === 'completed') {
                $updates['payment_status'] = 'verified';
                $updates['advance_paid_amount'] = $booking->total_amount;
                $updates['remaining_balance'] = 0;
            }

            $booking->update($updates);

            // Release slots if rejected or cancelled
            if (in_array($newStatus, ['rejected', 'cancelled']) && !$booking->slots_released_at) {
                $booking->schedule()->decrement('reserved_slots', $booking->participants_count);
                $booking->update(['slots_released_at' => now()]);
            }

            AuditLogService::log(
                "booking.{$newStatus}", 'Booking', $booking->id,
                "Booking {$booking->booking_reference} status changed to {$newStatus}",
                ['booking_status' => $oldStatus],
                ['booking_status' => $newStatus, 'rejection_reason' => $request->rejection_reason]
            );

            // Send in-app notification to customer (only if this is an authenticated booking)
            if ($booking->customer_id) {
                match ($newStatus) {
                    'confirmed' => NotificationService::bookingApproved(
                        $booking->customer_id, $booking->agency_id, $booking->id, $booking->booking_reference
                    ),
                    'rejected' => NotificationService::bookingRejected(
                        $booking->customer_id, $booking->agency_id, $booking->id,
                        $booking->booking_reference, $request->rejection_reason
                    ),
                    default => null,
                };
            }

            // Send SMS notification to customer's mobile number
            $smsEventMap = [
                'confirmed' => 'booking_confirmed',
                'rejected'  => 'booking_rejected',
                'cancelled' => 'booking_cancelled',
                'completed' => 'booking_completed',
            ];
            if (isset($smsEventMap[$newStatus])) {
                SendSmsNotification::dispatch($booking, $smsEventMap[$newStatus]);
                app(EmailNotificationService::class)->notifyBooking($booking, $smsEventMap[$newStatus]);
            }
        });

        return response()->json($booking->fresh()->load(['customer', 'schedule.package', 'payments']));
    }

    // Agency Admin: remove a booking that belongs to the current agency.
    // This is a soft delete, so related records and the audit trail remain intact.
    public function destroyOwn(Request $request, Booking $booking)
    {
        if ($booking->customer_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $departureDate = $booking->schedule?->departure_date;
        if (!$departureDate || !$departureDate->isPast() && !$departureDate->isToday()) {
            return response()->json(['message' => 'Only past bookings can be deleted.'], 422);
        }

        DB::transaction(function () use ($booking) {
            $snapshot = [
                'booking_reference' => $booking->booking_reference,
                'customer_id' => $booking->customer_id,
                'package' => $booking->schedule?->package?->title,
                'booking_status' => $booking->booking_status,
                'total_amount' => $booking->total_amount,
            ];

            if (!in_array($booking->booking_status, ['rejected', 'cancelled', 'expired']) && !$booking->slots_released_at) {
                $booking->schedule()->decrement('reserved_slots', $booking->participants_count);
            }

            AuditLogService::log(
                'booking.deleted',
                'Booking',
                $booking->id,
                "Customer deleted past booking {$booking->booking_reference}",
                $snapshot,
                ['deleted_at' => now()->toDateTimeString()]
            );

            $booking->delete();
        });

        return response()->json(['message' => 'Booking deleted successfully.']);
    }

    public function destroy(Request $request, Booking $booking)
    {
        $user = $request->user();

        if ($user->role !== 'agency_admin' || $booking->agency_id !== $user->agency_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        DB::transaction(function () use ($booking) {
            $snapshot = [
                'booking_reference' => $booking->booking_reference,
                'customer_id' => $booking->customer_id,
                'package' => $booking->schedule?->package?->title,
                'booking_status' => $booking->booking_status,
                'total_amount' => $booking->total_amount,
            ];

            // Pending and confirmed reservations still occupy seats. Rejected and
            // cancelled bookings already released their allocation when updated.
            if (!in_array($booking->booking_status, ['rejected', 'cancelled', 'expired']) && !$booking->slots_released_at) {
                $booking->schedule()->decrement('reserved_slots', $booking->participants_count);
            }

            AuditLogService::log(
                'booking.deleted',
                'Booking',
                $booking->id,
                "Agency admin deleted booking {$booking->booking_reference}",
                $snapshot,
                ['deleted_at' => now()->toDateTimeString()]
            );

            $booking->delete();
        });

        return response()->json(['message' => 'Booking deleted successfully.']);
    }

    // ── Agency: upload document ───────────────────────────────────
    public function uploadDocument(Request $request, Booking $booking)
    {
        $user = $request->user();
        if ($booking->agency_id !== $user->agency_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'document'      => 'required|file|max:10240|mimes:jpg,jpeg,png,pdf,doc,docx',
            'document_type' => 'nullable|in:proof_of_payment,id,general',
            'notes'         => 'nullable|string|max:500',
        ]);

        $file = $request->file('document');
        $safeName = Str::uuid() . '.' . $file->getClientOriginalExtension();
        $path = $file->storeAs("booking-documents/{$booking->id}", $safeName, 'local');

        $doc = BookingDocument::create([
            'booking_id'    => $booking->id,
            'uploaded_by'   => $user->id,
            'document_type' => $request->document_type ?? 'general',
            'file_name'     => $file->getClientOriginalName(),
            'file_path'     => $path,
            'mime_type'     => $file->getMimeType(),
            'file_size'     => $file->getSize(),
            'notes'         => $request->notes,
        ]);

        AuditLogService::log('document.uploaded', 'BookingDocument', $doc->id,
            "Document uploaded for booking {$booking->booking_reference}");

        return response()->json($doc, 201);
    }

    // ── Agency: list documents ────────────────────────────────────
    public function listDocuments(Request $request, Booking $booking)
    {
        $user = $request->user();
        if ($booking->agency_id !== $user->agency_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($booking->documents()->with('uploader')->get());
    }
}
