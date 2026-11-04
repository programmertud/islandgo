<?php

namespace App\Jobs;

use App\Models\Booking;
use App\Services\Sms\SmsNotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendSmsNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Number of times the job may be attempted.
     */
    public int $tries = 3;

    /**
     * Number of seconds to wait before retrying the job.
     */
    public int $backoff = 30;

    /**
     * The number of seconds the job can run before timing out.
     */
    public int $timeout = 30;

    public function __construct(
        public readonly Booking $booking,
        public readonly string $eventType,
    ) {}

    public function handle(SmsNotificationService $smsService): void
    {
        try {
            $smsService->notifyBooking($this->booking, $this->eventType);
        } catch (\Throwable $e) {
            Log::error('[SendSmsNotification] Job failed', [
                'booking_id' => $this->booking->id,
                'event_type' => $this->eventType,
                'error'      => $e->getMessage(),
            ]);

            // Re-throw so the job is marked as failed and retried
            throw $e;
        }
    }
}
