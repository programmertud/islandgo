<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ $mailSubject }}</title>
</head>
<body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
    <div style="max-w-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">{{ $mailSubject }}</h2>
        <p>{{ $eventMessage }}</p>

        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Customer:</strong> {{ $customerName }}</p>
            <p style="margin: 5px 0;"><strong>Tour Package:</strong> {{ $tourName }}</p>
            <p style="margin: 5px 0;"><strong>Payment Type:</strong> {{ $paymentTypeLabel }}</p>
            <p style="margin: 5px 0;"><strong>Amount Submitted:</strong> {{ $paymentAmount }}</p>
        </div>

        <p>Please log in to your Agency Admin dashboard to review the GCash receipt and Verify/Approve the payment.</p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="font-size: 12px; color: #64748b;">This is an automated notification from Tour Agency SaaS.</p>
    </div>
</body>
</html>
