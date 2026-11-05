<?php

namespace App\Mail\Transport;

use Symfony\Component\Mailer\Transport\AbstractTransport;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mime\MessageConverter;
use Illuminate\Support\Facades\Http;
use Exception;

class BrevoTransport extends AbstractTransport
{
    public function __construct(
        protected string $apiKey
    ) {
        parent::__construct();
    }

    protected function doSend(SentMessage $message): void
    {
        $email = MessageConverter::toEmail($message->getOriginalMessage());

        $to = [];
        foreach ($email->getTo() as $address) {
            $to[] = array_filter([
                'email' => $address->getAddress(),
                'name'  => $address->getName() ?: null,
            ]);
        }

        $fromAddress = $email->getFrom()[0] ?? null;
        $sender = [
            'email' => $fromAddress ? $fromAddress->getAddress() : config('mail.from.address'),
            'name'  => $fromAddress && $fromAddress->getName() ? $fromAddress->getName() : config('mail.from.name', 'IslandGo'),
        ];

        $payload = [
            'sender'      => $sender,
            'to'          => $to,
            'subject'     => $email->getSubject(),
            'htmlContent' => $email->getHtmlBody() ?: nl2br((string) $email->getTextBody()),
        ];

        if ($email->getTextBody()) {
            $payload['textContent'] = $email->getTextBody();
        }

        $key = trim(trim($this->apiKey), "\"' \t\n\r\0\x0B");

        $response = Http::withHeaders([
            'api-key'      => $key,
            'Content-Type' => 'application/json',
            'Accept'       => 'application/json',
        ])->timeout(15)->post('https://api.brevo.com/v3/smtp/email', $payload);

        if (!$response->successful()) {
            throw new Exception('Brevo API Error: ' . $response->body());
        }
    }

    public function __toString(): string
    {
        return 'brevo';
    }
}
