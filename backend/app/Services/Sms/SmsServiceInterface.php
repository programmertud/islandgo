<?php

namespace App\Services\Sms;

interface SmsServiceInterface
{
    /**
     * Send an SMS message.
     *
     * @param  string  $to      Recipient phone number
     * @param  string  $message  Message content
     * @return array{success: bool, reference: string|null, error: string|null}
     */
    public function send(string $to, string $message): array;
}
