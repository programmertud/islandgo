<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => array_values(array_filter([
        'http://localhost:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
        'http://localhost:8000',
        'http://127.0.0.1:8000',
        'https://islandgo-murex.vercel.app',
        'https://*.vercel.app',
        env('FRONTEND_URL'),
    ])),
    'allowed_origins_patterns' => [
        '#^https://.*\.vercel\.app\z#u',
        '#^https://.*-rtudtud-4331s-projects\.vercel\.app\z#u',
    ],
    'allowed_headers' => ['*'],
    'exposed_headers' => ['*'],
    'max_age' => 86400,
    'supports_credentials' => true,
];
