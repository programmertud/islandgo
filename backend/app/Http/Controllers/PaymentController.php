<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Services\AuditLogService;
use App\Services\NotificationService;
use App\Services\Email\EmailNotificationService;
use App\Services\Sms\SmsNotificationService;
use App\Jobs\SendSmsNotification;

class PaymentController extends Controller
{
    // Customer: submit payment proof
    public function store(Request $request, Booking $booking)
    {
        if ($booking->customer_id !== $request->user()->id) {
            abort(403);
        }

        if (!$booking->agency?->gcash_number || !$booking->agency?->gcash_account_name) {
            return response()->json([
                'message' => 'The agency has not completed its GCash payment setup. Please contact the agency before paying.'
            ], 422);
        }

        if (in_array($booking->booking_status, ['rejected', 'cancelled', 'completed', 'expired']) || $booking->slots_released_at) {
            return response()->json([
                'message' => 'This booking is no longer eligible for payment.'
            ], 422);
        }

        $isAdvance = $booking->booking_status === 'pending';
        $isFinal = $booking->booking_status === 'confirmed' && $booking->remaining_balance > 0;

        if (!$isAdvance && !$isFinal) {
            return response()->json(['message' => 'No payment is currently required for this booking.'], 422);
        }

        if ($booking->payment_deadline && now()->greaterThan($booking->payment_deadline) && $isAdvance) {
            return response()->json(['message' => 'The payment deadline for this booking has expired.'], 422);
        }

        if ($booking->payments()->where('status', 'submitted')->exists()) {
            return response()->json(['message' => 'A payment for this booking is already awaiting verification.'], 422);
        }

        $validated = $request->validate([
            'payment_method'  => 'required|in:gcash',
            'gcash_reference' => 'required|string|max:100',
            'proof_of_payment' => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120',
        ]);

        $path = $request->file('proof_of_payment')->store('payment-proofs', 'public');
        $amount = $isAdvance ? $booking->required_advance_amount : $booking->remaining_balance;
        $paymentType = $isAdvance ? 'advance' : 'final';

        $payment = Payment::create([
            'booking_id'            => $booking->id,
            'payment_reference'     => 'PAY-' . strtoupper(Str::random(8)),
            'amount'                => $amount,
            'payment_type'          => $paymentType,
            'payment_method'        => $validated['payment_method'],
            'gcash_reference'       => $validated['gcash_reference'] ?? null,
            'proof_of_payment_path' => $path,
            'status'                => 'submitted',
        ]);

        if ($isAdvance) {
            $booking->update(['payment_status' => 'submitted', 'payment_method' => 'gcash']);
        }

        AuditLogService::log("payment.{$paymentType}_submitted", 'Payment', $payment->id,
            "Customer submitted {$paymentType} payment for {$booking->booking_reference}", null,
            ['booking_id' => $booking->id, 'amount' => $payment->amount, 'payment_method' => 'gcash']);
            
        NotificationService::send($booking->customer_id, 'payment_submitted', 'Payment Submitted', "Your {$paymentType} payment for #{$booking->booking_reference} is awaiting verification.", $booking->agency_id, 'Booking', $booking->id);

        $agencyAdmin = User::where('agency_id', $booking->agency_id)->where('role', 'agency_admin')->first();
        if ($agencyAdmin) {
            // In-app notification
            NotificationService::newPayment(
                $agencyAdmin->id, $booking->agency_id, $booking->id, 
                $booking->booking_reference, $request->user()->name, $paymentType
            );

            // Email notification dispatched non-blocking after response
            dispatch(function () use ($booking, $agencyAdmin, $request, $paymentType, $payment) {
                rescue(fn() => app(EmailNotificationService::class)->notifyAdminPaymentSubmitted(
                    $booking,
                    $agencyAdmin->email,
                    $agencyAdmin->name,
                    $request->user()->name,
                    $paymentType,
                    $payment->amount
                ));
            })->afterResponse();
        }

        return response()->json($payment, 201);
    }

    // Agency Admin or Super Admin: verify or reject a payment
    public function verify(Request $request, Payment $payment)
    {
        $booking = $payment->booking;
        if ($request->user()->role !== 'super_admin' && $request->user()->agency_id !== $booking->agency_id) {
            abort(403);
        }

        $validated = $request->validate([
            'status'      => 'required|in:verified,rejected',
            'admin_notes' => 'nullable|string',
        ]);

        if ($payment->status !== 'submitted') {
            return response()->json(['message' => 'Only submitted payments can be verified or rejected.'], 422);
        }

        if ($validated['status'] === 'verified' && $payment->payment_type === 'advance' && $payment->amount < $booking->required_advance_amount) {
            return response()->json(['message' => 'Payment amount is insufficient for the required 50% advance.'], 422);
        }

        $payment->update([
            'status'      => $validated['status'],
            'admin_notes' => $validated['admin_notes'] ?? null,
            'verified_at' => $validated['status'] === 'verified' ? now() : null,
            'verified_by' => $request->user()->id,
            'received_by_name' => $request->user()->name,
        ]);

        // Cascade payment status to booking
        if ($validated['status'] === 'verified') {
            if ($payment->payment_type === 'advance') {
                $booking->update([
                    'payment_status' => 'verified',
                    'booking_status' => 'confirmed',
                    'advance_paid_amount' => $payment->amount,
                    'remaining_balance' => max(0, (float) $booking->total_amount - $payment->amount),
                ]);
            } else {
                $booking->update([
                    'payment_status' => 'verified',
                    'booking_status' => 'completed',
                    'advance_paid_amount' => $booking->total_amount,
                    'remaining_balance' => 0,
                ]);
            }
        } else {
            if ($payment->payment_type === 'advance') {
                $booking->update(['payment_status' => 'rejected']);
            }
        }

        AuditLogService::log("payment.{$payment->payment_type}_{$validated['status']}", 'Payment', $payment->id,
            "{$payment->payment_type} payment for {$booking->booking_reference} {$validated['status']}", ['payment_status' => 'submitted'], ['payment_status' => $booking->payment_status, 'amount' => $payment->amount]);
            
        if ($validated['status'] === 'verified') {
            if ($booking->customer_id) {
                NotificationService::paymentVerified($booking->customer_id, $booking->agency_id, $booking->id, $booking->booking_reference);
            }
            if ($payment->payment_type === 'advance') {
                if ($booking->customer_id) {
                    NotificationService::bookingApproved($booking->customer_id, $booking->agency_id, $booking->id, $booking->booking_reference);
                }
                dispatch(function () use ($booking) {
                    rescue(fn() => SendSmsNotification::dispatchSync($booking, 'payment_verified'));
                    rescue(fn() => app(EmailNotificationService::class)->notifyBooking($booking, 'payment_verified'));
                    rescue(fn() => SendSmsNotification::dispatchSync($booking, 'booking_confirmed'));
                    rescue(fn() => app(EmailNotificationService::class)->notifyBooking($booking, 'booking_confirmed'));
                })->afterResponse();
            } else {
                dispatch(function () use ($booking) {
                    rescue(fn() => SendSmsNotification::dispatchSync($booking, 'booking_completed'));
                    rescue(fn() => app(EmailNotificationService::class)->notifyBooking($booking, 'booking_completed'));
                })->afterResponse();
            }
        } else {
            if ($booking->customer_id) {
                NotificationService::paymentRejected($booking->customer_id, $booking->agency_id, $booking->id, $booking->booking_reference, $validated['admin_notes'] ?? null);
            }
            dispatch(function () use ($booking) {
                rescue(fn() => SendSmsNotification::dispatchSync($booking, 'payment_rejected'));
                rescue(fn() => app(EmailNotificationService::class)->notifyBooking($booking, 'payment_rejected'));
            })->afterResponse();
        }

        return response()->json(['message' => 'Payment ' . $validated['status'] . '.', 'payment' => $payment]);
    }

    // Agency staff records cash only after it has actually been received.
    public function recordCashAdvance(Request $request, Booking $booking)
    {
        $user = $request->user();
        if (!in_array($user->role, ['agency_admin', 'agency_staff']) || $user->agency_id !== $booking->agency_id) {
            abort(403);
        }

        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'reference_number' => 'nullable|string|max:100',
            'notes' => 'nullable|string|max:1000',
        ]);

        return DB::transaction(function () use ($booking, $validated, $user) {
            $booking = Booking::lockForUpdate()->findOrFail($booking->id);
            if ($booking->booking_status !== 'pending' || $booking->payment_status === 'verified' || $booking->slots_released_at) {
                return response()->json(['message' => 'This booking is not eligible for a cash advance payment.'], 422);
            }
            if ($booking->payment_deadline && now()->greaterThan($booking->payment_deadline)) {
                return response()->json(['message' => 'The payment deadline for this booking has expired.'], 422);
            }
            if (round((float) $validated['amount'], 2) !== round((float) $booking->required_advance_amount, 2)) {
                return response()->json(['message' => 'Cash advance must exactly match the required 50% advance amount of ₱' . number_format($booking->required_advance_amount, 2) . '.'], 422);
            }

            $payment = Payment::create([
                'booking_id' => $booking->id,
                'payment_reference' => $validated['reference_number'] ?: 'CASH-' . strtoupper(Str::random(8)),
                'amount' => $booking->required_advance_amount,
                'payment_type' => 'advance',
                'payment_method' => 'cash',
                'payment_date' => now(),
                'admin_notes' => $validated['notes'] ?? null,
                'status' => 'verified',
                'verified_by' => $user->id,
                'verified_at' => now(),
                'received_by_name' => $user->name,
            ]);
            $booking->update([
                'payment_method' => 'cash',
                'payment_status' => 'verified',
                'booking_status' => 'confirmed',
                'advance_paid_amount' => $payment->amount,
                'remaining_balance' => max(0, (float) $booking->total_amount - (float) $payment->amount),
            ]);
            AuditLogService::log('payment.cash_advance_recorded', 'Payment', $payment->id,
                "Agency recorded cash advance for {$booking->booking_reference}", null,
                ['booking_id' => $booking->id, 'amount' => $payment->amount, 'received_by' => $user->id]);
            if ($booking->customer_id) {
                NotificationService::paymentVerified($booking->customer_id, $booking->agency_id, $booking->id, $booking->booking_reference);
                NotificationService::bookingApproved($booking->customer_id, $booking->agency_id, $booking->id, $booking->booking_reference);
            }
            dispatch(function () use ($booking) {
                rescue(fn() => SendSmsNotification::dispatchSync($booking, 'payment_verified'));
                rescue(fn() => app(EmailNotificationService::class)->notifyBooking($booking, 'payment_verified'));
            })->afterResponse();

            return response()->json(['message' => 'Cash advance recorded and booking confirmed.', 'payment' => $payment, 'booking' => $booking->fresh()]);
        });
    }

    public function proof(Request $request, Payment $payment)
    {
        $booking = $payment->booking;
        $user = $request->user();
        if ($user->id !== $booking->customer_id && $user->role !== 'super_admin' && $user->agency_id !== $booking->agency_id) {
            abort(403);
        }
        $disk = Storage::disk('public')->exists($payment->proof_of_payment_path) ? 'public' : 'local';
        abort_unless($payment->proof_of_payment_path && Storage::disk($disk)->exists($payment->proof_of_payment_path), 404);
        return Storage::disk($disk)->response($payment->proof_of_payment_path);
    }
}
