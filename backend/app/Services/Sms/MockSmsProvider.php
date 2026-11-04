<?php

namespace App\Services\Sms;

use Illuminate\Support\Facades\Log;

class MockSmsProvider implements SmsServiceInterface
{
    public function send(string $to, string $message): array
    {
        $reference = 'MOCK-' . strtoupper(substr(md5(uniqid()), 0, 8));

        Log::channel('single')->info('[MockSMS] Sending SMS', [
            'to'        => $to,
            'message'   => $message,
            'reference' => $reference,
        ]);

        return [
            'success'   => true,
            'reference' => $reference,
            'error'     => null,
        ];
    }
}
