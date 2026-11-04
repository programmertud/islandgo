<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Schema;
use App\Services\Sms\SmsServiceInterface;
use App\Services\Sms\MockSmsProvider;
use App\Services\Sms\SemaphoreSmsProvider;
use App\Services\Sms\TextbeeSmsProvider;
use App\Services\Sms\HttpSmsProvider;
use App\Services\Sms\SmsNotificationService;
use App\Services\Email\EmailNotificationService;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Resolve SMS driver from SMS_PROVIDER env variable.
        // Use 'semaphore', 'textbee', or 'httpsms' for production; defaults to mock for local/testing.
        $this->app->singleton(SmsServiceInterface::class, function () {
            return match (strtolower(config('services.semaphore.provider', 'mock'))) {
                'semaphore' => new SemaphoreSmsProvider(),
                'textbee'   => new TextbeeSmsProvider(),
                'httpsms'   => new HttpSmsProvider(),
                default     => new MockSmsProvider(),
            };
        });

        $this->app->singleton(SmsNotificationService::class);
        $this->app->singleton(EmailNotificationService::class);
    }

    public function boot(): void
    {
        Schema::defaultStringLength(191);
    }
}


