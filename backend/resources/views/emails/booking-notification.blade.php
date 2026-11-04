<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{ $mailSubject }}</title>
    <style>
        /* ── Reset ── */
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f4f8; color: #1a202c; }

        /* ── Wrapper ── */
        .wrapper { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,.10); }

        /* ── Header ── */
        .header { padding: 36px 40px 28px; text-align: center; }
        .header .logo-text { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
        .header h1 { margin-top: 20px; font-size: 24px; font-weight: 700; line-height: 1.3; }
        .header p.subtitle { margin-top: 6px; font-size: 14px; opacity: .85; }

        /* ── Status colours ── */
        .status-confirmed  { background: linear-gradient(135deg, #059669, #10b981); color: #fff; }
        .status-rejected   { background: linear-gradient(135deg, #dc2626, #ef4444); color: #fff; }
        .status-cancelled  { background: linear-gradient(135deg, #d97706, #f59e0b); color: #fff; }
        .status-completed  { background: linear-gradient(135deg, #7c3aed, #8b5cf6); color: #fff; }
        .status-payment    { background: linear-gradient(135deg, #2563eb, #3b82f6); color: #fff; }
        .status-warning    { background: linear-gradient(135deg, #d97706, #f59e0b); color: #fff; }
        .status-info       { background: linear-gradient(135deg, #0891b2, #06b6d4); color: #fff; }
        .status-expired    { background: linear-gradient(135deg, #6b7280, #9ca3af); color: #fff; }

        /* ── Body ── */
        .body { padding: 32px 40px; }
        .greeting { font-size: 16px; margin-bottom: 16px; }
        .message  { font-size: 15px; line-height: 1.7; color: #374151; margin-bottom: 24px; }

        /* ── Detail card ── */
        .detail-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px; }
        .detail-card table { width: 100%; border-collapse: collapse; }
        .detail-card td { padding: 8px 0; font-size: 14px; vertical-align: top; }
        .detail-card td:first-child { color: #64748b; width: 44%; font-weight: 500; }
        .detail-card td:last-child  { color: #1e293b; font-weight: 600; }

        /* ── Alert box ── */
        .alert { border-radius: 10px; padding: 14px 18px; font-size: 14px; margin-bottom: 24px; }
        .alert-warning { background: #fef3c7; border-left: 4px solid #f59e0b; color: #92400e; }
        .alert-danger  { background: #fee2e2; border-left: 4px solid #ef4444; color: #991b1b; }
        .alert-success { background: #d1fae5; border-left: 4px solid #10b981; color: #065f46; }
        .alert-info    { background: #dbeafe; border-left: 4px solid #3b82f6; color: #1e40af; }

        /* ── CTA Button ── */
        .cta-wrap { text-align: center; margin: 28px 0; }
        .cta-btn  { display: inline-block; padding: 14px 36px; border-radius: 50px; font-size: 15px; font-weight: 700; text-decoration: none; letter-spacing: .3px; }

        /* ── Footer ── */
        .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 40px; text-align: center; font-size: 12px; color: #94a3b8; }
        .footer strong { color: #475569; }
    </style>
</head>
<body>
<div class="wrapper">

    {{-- ── Header ── --}}
    @php
        $headerClass = match($eventType) {
            'booking_confirmed'        => 'status-confirmed',
            'payment_verified'         => 'status-payment',
            'booking_rejected'         => 'status-rejected',
            'payment_rejected'         => 'status-rejected',
            'booking_cancelled'        => 'status-cancelled',
            'booking_completed'        => 'status-completed',
            'advance_payment_required' => 'status-warning',
            'booking_submitted'        => 'status-info',
            'booking_expired'          => 'status-expired',
            default                    => 'status-info',
        };

        $emoji = match($eventType) {
            'booking_confirmed'        => '✅',
            'payment_verified'         => '💳',
            'booking_rejected'         => '❌',
            'payment_rejected'         => '⚠️',
            'booking_cancelled'        => '🚫',
            'booking_completed'        => '🎉',
            'advance_payment_required' => '⏳',
            'booking_submitted'        => '📋',
            'booking_expired'          => '🕐',
            default                    => '📧',
        };

        $headline = match($eventType) {
            'booking_confirmed'        => 'Booking Confirmed!',
            'payment_verified'         => 'Payment Verified!',
            'booking_rejected'         => 'Booking Rejected',
            'payment_rejected'         => 'Payment Not Verified',
            'booking_cancelled'        => 'Booking Cancelled',
            'booking_completed'        => 'Full Payment Received & Tour Completed!',
            'advance_payment_required' => 'Advance Payment Required',
            'booking_submitted'        => 'Booking Received',
            'booking_expired'          => 'Booking Expired',
            default                    => 'Booking Update',
        };
    @endphp

    <div class="header {{ $headerClass }}">
        <div class="logo-text">{{ $agencyName }}</div>
        <h1>{{ $emoji }} {{ $headline }}</h1>
        <p class="subtitle">Booking Reference: <strong>#{{ $bookingReference }}</strong></p>
    </div>

    {{-- ── Body ── --}}
    <div class="body">

        <p class="greeting">Hi <strong>{{ $customerName }}</strong>,</p>

        {{-- Per-event message --}}
        <p class="message">
            @switch($eventType)
                @case('booking_submitted')
                    Thank you for choosing <strong>{{ $agencyName }}</strong>! We've received your booking for
                    <strong>{{ $tourName }}</strong>. Our team will review it and get back to you shortly.
                @break

                @case('advance_payment_required')
                    Your booking for <strong>{{ $tourName }}</strong> has been created successfully. To secure your reservation,
                    a payment of <strong>{{ $advanceAmount }}</strong> is required.
                    @if($paymentDeadline)
                        Please complete your payment before <strong>{{ $paymentDeadline }}</strong> to avoid cancellation.
                    @endif
                @break

                @case('booking_confirmed')
                    Great news! Your booking for <strong>{{ $tourName }}</strong> has been
                    <strong>confirmed</strong>. We look forward to giving you an amazing experience. See you on your adventure!
                @break

                @case('booking_rejected')
                    We're sorry, but your booking for <strong>{{ $tourName }}</strong> has been
                    <strong>rejected</strong>.
                    @if($rejectionReason)
                        <br><br><em>Reason: {{ $rejectionReason }}</em>
                    @endif
                    <br><br>Please contact <strong>{{ $agencyName }}</strong> for further assistance or to rebook.
                @break

                @case('booking_cancelled')
                    Your booking for <strong>{{ $tourName }}</strong> has been <strong>cancelled</strong>.
                    If you have any concerns, please reach out to <strong>{{ $agencyName }}</strong> directly.
                @break

                @case('booking_completed')
                    Great news! We have received your <strong>full payment</strong> for <strong>{{ $tourName }}</strong>.
                    Your booking is now fully settled and marked as <strong>completed</strong>.
                    Thank you for booking with us — we hope you have/had a wonderful experience!
                @break

                @case('payment_verified')
                    Your advance payment for booking <strong>#{{ $bookingReference }}</strong> has been
                    <strong>verified</strong>. Your remaining balance is <strong>{{ $remainingBalance }}</strong>.
                    Everything is set — your spot is confirmed!
                @break

                @case('payment_rejected')
                    Unfortunately, your advance payment for booking <strong>#{{ $bookingReference }}</strong>
                    could not be verified. Please submit a valid proof of payment or contact
                    <strong>{{ $agencyName }}</strong> for assistance.
                @break

                @case('booking_expired')
                    Your booking for <strong>{{ $tourName }}</strong> has <strong>expired</strong> because
                    the required advance payment was not received in time. Your reserved slots have been released.
                    You're welcome to create a new booking if slots are still available.
                @break

                @default
                    There has been an update to your booking <strong>#{{ $bookingReference }}</strong> for
                    <strong>{{ $tourName }}</strong>. Please log in to your account for more details.
            @endswitch
        </p>

        {{-- ── Booking detail card ── --}}
        <div class="detail-card">
            <table>
                <tr>
                    <td>Booking Reference</td>
                    <td>#{{ $bookingReference }}</td>
                </tr>
                <tr>
                    <td>Tour</td>
                    <td>{{ $tourName }}</td>
                </tr>
                <tr>
                    <td>Participants</td>
                    <td>{{ $participantsCount }} person(s)</td>
                </tr>
                <tr>
                    <td>Total Amount</td>
                    <td>{{ $totalAmount }}</td>
                </tr>
                @if(in_array($eventType, ['advance_payment_required', 'payment_verified', 'payment_rejected']))
                <tr>
                    <td>Advance Payment (50%)</td>
                    <td>{{ $advanceAmount }}</td>
                </tr>
                @endif
                @if(in_array($eventType, ['payment_verified', 'booking_confirmed']))
                <tr>
                    <td>Remaining Balance</td>
                    <td>{{ $remainingBalance }}</td>
                </tr>
                @endif
                @if($paymentDeadline && $eventType === 'advance_payment_required')
                <tr>
                    <td>Payment Deadline</td>
                    <td><strong style="color:#d97706;">{{ $paymentDeadline }}</strong></td>
                </tr>
                @endif
                <tr>
                    <td>Agency</td>
                    <td>{{ $agencyName }}</td>
                </tr>
            </table>
        </div>

        {{-- ── Contextual alert boxes ── --}}
        @if($eventType === 'advance_payment_required')
        <div class="alert alert-warning">
            ⏳ <strong>Action Required:</strong> Please pay <strong>{{ $advanceAmount }}</strong> to secure your slot.
            @if($paymentDeadline) Deadline: <strong>{{ $paymentDeadline }}</strong>. @endif
        </div>
        @elseif($eventType === 'booking_rejected' && $rejectionReason)
        <div class="alert alert-danger">
            ❌ <strong>Rejection Reason:</strong> {{ $rejectionReason }}
        </div>
        @elseif($eventType === 'payment_verified')
        <div class="alert alert-success">
            ✅ <strong>Payment confirmed!</strong> Your booking is now fully confirmed.
        </div>
        @elseif($eventType === 'booking_expired')
        <div class="alert alert-info">
            ℹ️ You may create a new booking if slots are still available.
        </div>
        @endif

    </div>

    {{-- ── Footer ── --}}
    <div class="footer">
        <p>This is an automated notification from <strong>{{ $agencyName }}</strong>.</p>
        <p style="margin-top:6px;">Please do not reply to this email. Contact your agency directly for support.</p>
        <p style="margin-top:12px; color: #cbd5e1;">© {{ date('Y') }} {{ $agencyName }}. All rights reserved.</p>
    </div>

</div>
</body>
</html>
