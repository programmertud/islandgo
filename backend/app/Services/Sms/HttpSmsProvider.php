<?php

namespace App\Services\Sms;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class HttpSmsProvider implements SmsServiceInterface
{
    protected string $apiKey;
    protected string $fromNumber;
    protected string $apiUrl = 'https://api.httpsms.com/v1/messages/send';

    public function __construct()
    {
        $this->apiKey = config('services.httpsms.api_key', '');
        $this->fromNumber = config('services.httpsms.from_number', '');
    }

    public function send(string $to, string $message): array
    {
        $phone = $this->normalizePhone($to);

        try {
            $payload = [
                'content' => $message,
                'from'    => $this->fromNumber,
                'to'      => $phone,
            ];

            $response = Http::withHeaders([
                'x-api-key' => $this->apiKey,
                'Accept'    => 'application/json',
            ])->timeout(15)->post($this->apiUrl, $payload);

            $body = $response->json();

            if ($response->successful()) {
                $messageId = $body['data']['id'] ?? null;

                Log::info('[HttpSMS] SMS queued successfully', [
                    'to'         => $phone,
                    'message_id' => $messageId,
                ]);

                return [
                    'success'   => true,
                    'reference' => (string) $messageId,
                    'error'     => null,
                ];
            }

            $errorMsg = $body['message'] ?? $response->body();

            Log::error('[HttpSMS] API error', [
                'to'          => $phone,
                'http_status' => $response->status(),
                'response'    => $body,
            ]);

            return [
                'success'   => false,
                'reference' => null,
                'error'     => $errorMsg,
            ];
        } catch (\Throwable $e) {
            Log::error('[HttpSMS] Exception while sending SMS', [
                'to'      => $phone,
                'error'   => $e->getMessage(),
            ]);

            return [
                'success'   => false,
                'reference' => null,
                'error'     => $e->getMessage(),
            ];
        }
    }

    protected function normalizePhone(string $phone): string
    {
        $phone = preg_replace('/[\s\-\(\)]/', '', $phone);

        if (str_starts_with($phone, '+63')) {
            return $phone;
        }

        if (str_starts_with($phone, '63')) {
            return '+' . $phone;
        }

        if (str_starts_with($phone, '0')) {
            return '+63' . substr($phone, 1);
        }

        return '+63' . $phone;
    }
}
