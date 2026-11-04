<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AgencyController;
use App\Http\Controllers\TourPackageController;
use App\Http\Controllers\TourScheduleController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\SmsNotificationController;
use App\Http\Controllers\EmailNotificationController;
use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\GuestBookingController;
use App\Http\Controllers\TourAvailabilityController;

Route::prefix('v1')->group(function () {

    // ─── Health Check ─────────────────────────────────────────────
    Route::get('/health', fn () => response()->json(['status' => 'ok', 'timestamp' => now()]));

    // ─── Public Auth ──────────────────────────────────────────────
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login',    [AuthController::class, 'login']);

    // ─── Public: Tour Catalog ─────────────────────────────────────
    Route::get('/destinations',           [TourPackageController::class, 'destinations']);
    Route::get('/tours',                  [TourPackageController::class, 'index']);
    Route::get('/tours/{tourPackage}',    [TourPackageController::class, 'show']);
    Route::get('/tours/{tourPackage}/availability', [TourAvailabilityController::class, 'publicMonth']);

    // ─── Public: Guest Booking ────────────────────────────────────
    Route::post('/guest/bookings',         [GuestBookingController::class, 'store']);
    Route::get('/guest/bookings/lookup',   [GuestBookingController::class, 'lookup']);
    Route::post('/guest/bookings/payment',  [GuestBookingController::class, 'submitPayment']);

    // ─── Authenticated Routes ─────────────────────────────────────
    Route::middleware('auth:sanctum')->group(function () {

        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/auth/user',    [AuthController::class, 'user']);
        Route::post('/auth/profile', [AuthController::class, 'updateProfile']);

        // ── Notifications (all authenticated users) ───────────────
        Route::get('/notifications',                       [NotificationController::class, 'index']);
        Route::get('/notifications/unread-count',            [NotificationController::class, 'unreadCount']);
        Route::patch('/notifications/read-all',              [NotificationController::class, 'markAllRead']);
        Route::delete('/notifications',                      [NotificationController::class, 'destroyAll']);
        Route::patch('/notifications/{notification}/read',   [NotificationController::class, 'markRead']);
        Route::delete('/notifications/{notification}',       [NotificationController::class, 'destroy']);

        // ── Customer ──────────────────────────────────────────────
        Route::get('/my-bookings',                     [BookingController::class, 'myBookings']);
        Route::delete('/my-bookings/{booking}',         [BookingController::class, 'destroyOwn']);
        Route::post('/bookings',                       [BookingController::class, 'store']);
        Route::get('/bookings/{booking}',              [BookingController::class, 'show']);
        Route::post('/bookings/{booking}/payments',    [PaymentController::class, 'store']);
        Route::get('/payments/{payment}/proof',        [PaymentController::class, 'proof']);

        // ── Agency ────────────────────────────────────────────────
        Route::prefix('agency')->group(function () {
            Route::get('/profile', [AgencyController::class, 'getProfile']);
            Route::put('/profile', [AgencyController::class, 'updateProfile']);
            Route::post('/profile', [AgencyController::class, 'updateProfile']);

            // Tour Packages
            Route::get('/packages',                  [TourPackageController::class, 'agencyIndex']);
            Route::post('/packages',                 [TourPackageController::class, 'store']);
            Route::get('/packages/{tourPackage}',    [TourPackageController::class, 'showAgency']);
            Route::put('/packages/{tourPackage}',    [TourPackageController::class, 'update']);
            Route::delete('/packages/{tourPackage}', [TourPackageController::class, 'destroy']);
            Route::delete('/packages/{tourPackage}/images/{tourImage}', [TourPackageController::class, 'deleteImage']);

            // Schedules nested under packages
            Route::get('/packages/{tourPackage}/unavailable-dates', [TourAvailabilityController::class, 'index']);
            Route::post('/packages/{tourPackage}/unavailable-dates', [TourAvailabilityController::class, 'store']);
            Route::put('/packages/{tourPackage}/unavailable-dates/{closure}', [TourAvailabilityController::class, 'update']);
            Route::delete('/packages/{tourPackage}/unavailable-dates/{closure}', [TourAvailabilityController::class, 'destroy']);
            Route::get('/packages/{tourPackage}/schedules',                   [TourScheduleController::class, 'index']);
            Route::post('/packages/{tourPackage}/schedules',                  [TourScheduleController::class, 'store']);
            Route::put('/packages/{tourPackage}/schedules/{tourSchedule}',    [TourScheduleController::class, 'update']);
            Route::delete('/packages/{tourPackage}/schedules/{tourSchedule}', [TourScheduleController::class, 'destroy']);

            // Bookings
            Route::get('/bookings',                  [BookingController::class, 'agencyBookings']);
            Route::get('/bookings/{booking}',        [BookingController::class, 'agencyShow']);
            Route::patch('/bookings/{booking}/status', [BookingController::class, 'updateStatus']);
            Route::delete('/bookings/{booking}',     [BookingController::class, 'destroy']);
            Route::patch('/payments/{payment}/verify', [PaymentController::class, 'verify']);
            Route::post('/bookings/{booking}/cash-advance', [PaymentController::class, 'recordCashAdvance']);

            // Documents
            Route::post('/bookings/{booking}/documents', [BookingController::class, 'uploadDocument']);
            Route::get('/bookings/{booking}/documents',  [BookingController::class, 'listDocuments']);

            // SMS Logs & Manual Send
            Route::get('/sms-logs',                              [SmsNotificationController::class, 'index']);
            Route::post('/sms-logs/send',                        [SmsNotificationController::class, 'send']);
            Route::post('/sms-logs/{smsNotification}/resend',    [SmsNotificationController::class, 'resend']);

            // Email Logs & Manual Send
            Route::get('/email-logs',                                [EmailNotificationController::class, 'index']);
            Route::post('/email-logs/send',                          [EmailNotificationController::class, 'send']);
            Route::post('/email-logs/{emailNotification}/resend',    [EmailNotificationController::class, 'resend']);

            // Analytics (Dashboard)
            Route::get('/analytics', [AnalyticsController::class, 'agencyDashboard']);

            // Reports
            Route::prefix('reports')->group(function () {
                Route::get('/bookings',      [ReportController::class, 'bookings']);
                Route::get('/revenue',       [ReportController::class, 'revenue']);
                Route::get('/packages',      [ReportController::class, 'packages']);
                Route::get('/payments',      [ReportController::class, 'payments']);
                Route::get('/customers',     [ReportController::class, 'customers']);
                Route::get('/transactions',  [ReportController::class, 'transactions']);
            });

            // Audit Logs
            Route::get('/audit-logs',         [AuditLogController::class, 'index']);
            Route::get('/audit-logs/{auditLog}', [AuditLogController::class, 'show']);
        });

        // ── Super Admin ───────────────────────────────────────────
        Route::prefix('admin')->group(function () {
            Route::get('/agencies',                 [AgencyController::class, 'index']);
            Route::get('/agencies/{agency}',        [AgencyController::class, 'show']);
            Route::put('/agencies/{agency}/status', [AgencyController::class, 'updateStatus']);

            // Bookings (all agencies)
            Route::get('/bookings',             [BookingController::class, 'adminBookings']);
            Route::get('/bookings/{booking}',   [BookingController::class, 'agencyShow']);

            // Analytics (Dashboard)
            Route::get('/analytics', [AnalyticsController::class, 'adminDashboard']);

            // Reports (platform-wide)
            Route::prefix('reports')->group(function () {
                Route::get('/bookings',      [ReportController::class, 'bookings']);
                Route::get('/revenue',       [ReportController::class, 'revenue']);
                Route::get('/packages',      [ReportController::class, 'packages']);
                Route::get('/payments',      [ReportController::class, 'payments']);
                Route::get('/customers',     [ReportController::class, 'customers']);
                Route::get('/transactions',  [ReportController::class, 'transactions']);
            });

            // Audit Logs (platform-wide)
            Route::get('/audit-logs',            [AuditLogController::class, 'index']);
            Route::get('/audit-logs/{auditLog}', [AuditLogController::class, 'show']);

            // User Management
            Route::get('/users', fn(\Illuminate\Http\Request $r) =>
                response()->json(\App\Models\User::paginate(25))
            );
        });
    });
});
