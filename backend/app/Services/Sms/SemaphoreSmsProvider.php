<?php

namespace App\Services\Sms;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SemaphoreSmsProvider implements SmsServiceInterface
{
    protected string $apiKey;
    protected string $senderName;
    protected string $apiUrl = 'https://api.semaphore.co/api/v4/messages';

    public function __construct()
    {
        $this->apiKey     = config('services.semaphore.api_key', '');
        $this->senderName = config('services.semaphore.sender_name', 'SEMAPHORE');
    }

    public function send(string $to, string $message): array
    {
        // Normalize PH numbers: strip leading 0 and add +63 if needed
        $phone = $this->normalizePhone($to);

        try {
            $response = Http::timeout(15)->post($this->apiUrl, [
                'apikey'      => $this->apiKey,
                'number'      => $phone,
                'message'     => $message,
                'sendername'  => $this->senderName,
            ]);

            $body = $response->json();

            if ($response->successful() && !empty($body)) {
                $first     = is_array($body) ? $body[0] : $body;
                $messageId = $first['message_id'] ?? null;
                $status    = strtolower($first['status'] ?? '');

                // Semaphore returns status "Pending" on success (queued for delivery)
                if (in_array($status, ['pending', 'sent', 'queued'])) {
                    Log::info('[SemaphoreSMS] SMS queued successfully', [
                        'to'         => $phone,
                        'message_id' => $messageId,
                        'status'     => $status,
                    ]);

                    return [
                        'success'   => true,
                        'reference' => (string) $messageId,
                        'error'     => null,
                    ];
                }

                Log::warning('[SemaphoreSMS] Unexpected response status', [
                    'to'       => $phone,
                    'response' => $body,
                ]);

                return [
                    'success'   => false,
                    'reference' => null,
                    'error'     => "Unexpected status: {$status}",
                ];
            }

            $errorMsg = $body['message'] ?? $response->body();

            Log::error('[SemaphoreSMS] API error', [
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
            Log::error('[SemaphoreSMS] Exception while sending SMS', [
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

    /**
     * Normalize a Philippine mobile number to international format (e.g. 09171234567 → +639171234567).
     */
    protected function normalizePhone(string $phone): string
    {
        // Remove spaces, dashes, parentheses
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

        // Already a local number without leading 0 (e.g. 9171234567)
        return '+63' . $phone;
    }
}
