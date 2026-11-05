<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'brevo' => [
        'api_key' => env('BREVO_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Semaphore SMS (Philippines)
    |--------------------------------------------------------------------------
    | Set SMS_PROVIDER=semaphore in .env to use real SMS delivery.
    | Leave SMS_PROVIDER=mock (or unset) to only log to Laravel log files.
    */
    'semaphore' => [
        'provider'    => env('SMS_PROVIDER', 'textbee'),
        'api_key'     => env('SEMAPHORE_API_KEY', '7876e79a69f8d1bb215e216820b44aa2'),
        'sender_name' => env('SEMAPHORE_SENDER_NAME', 'snsu'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Textbee SMS (Android Gateway)
    |--------------------------------------------------------------------------
    */
    'textbee' => [
        'api_key'   => env('TEXTBEE_API_KEY', 'txb_QzeYQK12vvdfGxSpt1D7Pq7f6iUxT4Pm'),
        'device_id' => env('TEXTBEE_DEVICE_ID', '6ac4db172597187c9c0c7f0b'),
    ],

    /*
    |--------------------------------------------------------------------------
    | HTTP SMS (Android Gateway)
    |--------------------------------------------------------------------------
    */
    'httpsms' => [
        'api_key'     => env('HTTPSMS_API_KEY', ''),
        'from_number' => env('HTTPSMS_FROM_NUMBER', ''),
    ],

];
