<?php

namespace App\Services\Sms;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class TextbeeSmsProvider implements SmsServiceInterface
{
    protected string $apiKey;
    protected ?string $deviceId;
    protected string $apiUrl = 'https://api.textbee.dev/api/v1/gateway/send-sms';

    public function __construct()
    {
        $this->apiKey = config('services.textbee.api_key', '');
        $this->deviceId = config('services.textbee.device_id', null);
    }

    public function send(string $to, string $message): array
    {
        $phone = $this->normalizePhone($to);

        try {
            $payload = [
                'receivers' => [$phone],
                'smsBody' => $message,
            ];

            if ($this->deviceId) {
                $payload['deviceId'] = $this->deviceId;
            }

            $response = Http::withHeaders([
                'x-api-key' => $this->apiKey,
            ])->timeout(8)->connectTimeout(5)->post($this->apiUrl, $payload);

            $body = $response->json();

            if ($response->successful()) {
                // Textbee doesn't consistently return a reliable message ID, we can mock a reference
                $messageId = $body['messageId'] ?? Str::uuid()->toString();

                Log::info('[TextbeeSMS] SMS sent successfully', [
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

            Log::error('[TextbeeSMS] API error', [
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
            Log::error('[TextbeeSMS] Exception while sending SMS', [
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
