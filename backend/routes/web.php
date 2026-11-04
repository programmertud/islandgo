<?php

use Illuminate\Support\Facades\Route;

// Serve the React SPA — catches ALL web routes and returns the built index.html
// In development, you still use `npm run dev` at localhost:5173
// In production (php artisan serve), this serves the built React app at 127.0.0.1:8000
Route::get('/{any?}', function () {
    $indexPath = public_path('app/index.html');

    if (file_exists($indexPath)) {
        return response()->file($indexPath);
    }

    // Fallback if the frontend hasn't been built yet
    return response()->json([
        'message'       => 'SaaS Tour Agency API is running.',
        'frontend'      => 'Run "npm run build" inside the /frontend folder first, then refresh this page.',
        'dev_frontend'  => 'http://localhost:5173',
        'api_docs'      => 'http://127.0.0.1:8000/api/v1/health',
    ]);
})->where('any', '^(?!api).*');
