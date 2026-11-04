<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\TourPackage;
use App\Models\Agency;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    // For Agency Admins
    public function agencyDashboard(Request $request)
    {
        $agencyId = $request->user()->agency_id;

        // KPI totals
        $totalRevenue = Booking::where('agency_id', $agencyId)
            ->where('payment_status', 'verified')
            ->sum('total_amount');
            
        $totalBookings = Booking::where('agency_id', $agencyId)->count();
        $totalCustomers = Booking::where('agency_id', $agencyId)->distinct('customer_id')->count('customer_id');
        $pendingBookings = Booking::where('agency_id', $agencyId)->where('booking_status', 'pending')->count();
        $approvedBookings = Booking::where('agency_id', $agencyId)->whereIn('booking_status', ['confirmed', 'completed'])->count();
        $pendingAdvancePayments = Booking::where('agency_id', $agencyId)->whereIn('payment_status', ['unpaid', 'submitted'])->count();
        $advanceCollected = Booking::where('agency_id', $agencyId)->sum('advance_paid_amount');
        $outstandingBalances = Booking::where('agency_id', $agencyId)->whereIn('payment_status', ['verified'])->sum('remaining_balance');

        // Revenue over the last 6 months
        $revenueTrend = Booking::where('agency_id', $agencyId)
            ->where('payment_status', 'verified')
            ->where('created_at', '>=', now()->subMonths(5)->startOfMonth())
            ->select(
                DB::raw('DATE_FORMAT(created_at, "%b %Y") as month'),
                DB::raw('SUM(total_amount) as revenue')
            )
            ->groupBy('month')
            ->orderBy(DB::raw('MIN(created_at)'))
            ->get();

        // Booking status distribution
        $bookingStatuses = Booking::where('agency_id', $agencyId)
            ->select('booking_status', DB::raw('count(*) as count'))
            ->groupBy('booking_status')
            ->get();

        // Top 5 Packages by booking count
        $topPackages = Booking::where('bookings.agency_id', $agencyId)
            ->join('tour_schedules', 'bookings.tour_schedule_id', '=', 'tour_schedules.id')
            ->join('tour_packages', 'tour_schedules.tour_package_id', '=', 'tour_packages.id')
            ->select('tour_packages.title', 'tour_packages.cover_image', DB::raw('count(bookings.id) as total_bookings'))
            ->groupBy('tour_packages.id', 'tour_packages.title', 'tour_packages.cover_image')
            ->orderByDesc('total_bookings')
            ->limit(5)
            ->get();

        // Recent 5 bookings
        $recentBookings = Booking::where('agency_id', $agencyId)
            ->with(['customer', 'schedule.package'])
            ->latest()
            ->limit(5)
            ->get();

        return response()->json([
            'kpis' => [
                'revenue' => $totalRevenue,
                'bookings' => $totalBookings,
                'customers' => $totalCustomers,
                'pending_bookings' => $pendingBookings,
                'approved_bookings' => $approvedBookings,
                'pending_advance_payments' => $pendingAdvancePayments,
                'advance_payments_collected' => $advanceCollected,
                'outstanding_balances' => $outstandingBalances,
            ],
            'charts' => [
                'revenue_trend' => $revenueTrend,
                'booking_statuses' => $bookingStatuses,
                'top_packages' => $topPackages,
                'recent_bookings' => $recentBookings
            ]
        ]);
    }

    // For Super Admins
    public function adminDashboard(Request $request)
    {
        // KPI totals
        $totalRevenue = Booking::where('payment_status', 'verified')->sum('total_amount');
        $totalAgencies = Agency::where('status', 'active')->count();
        $totalUsers = \App\Models\User::count();
        
        $totalBookings = Booking::count();
        $pendingBookings = Booking::where('booking_status', 'pending')->count();
        $approvedBookings = Booking::whereIn('booking_status', ['confirmed', 'completed'])->count();
        $pendingAdvancePayments = Booking::whereIn('payment_status', ['unpaid', 'submitted'])->count();
        $advanceCollected = Booking::sum('advance_paid_amount');
        $outstandingBalances = Booking::where('payment_status', 'verified')->sum('remaining_balance');

        // Revenue over the last 6 months (Platform wide)
        $revenueTrend = Booking::where('payment_status', 'verified')
            ->where('created_at', '>=', now()->subMonths(5)->startOfMonth())
            ->select(
                DB::raw('DATE_FORMAT(created_at, "%b %Y") as month'),
                DB::raw('SUM(total_amount) as revenue')
            )
            ->groupBy('month')
            ->orderBy(DB::raw('MIN(created_at)'))
            ->get();

        // Top 5 Agencies by revenue
        $topAgencies = Booking::where('payment_status', 'verified')
            ->join('agencies', 'bookings.agency_id', '=', 'agencies.id')
            ->select('agencies.name', DB::raw('SUM(bookings.total_amount) as revenue'))
            ->groupBy('agencies.id', 'agencies.name')
            ->orderByDesc('revenue')
            ->limit(5)
            ->get();

        // Booking status distribution
        $bookingStatuses = Booking::select('booking_status', DB::raw('count(*) as count'))
            ->groupBy('booking_status')
            ->get();

        // Recent 5 bookings
        $recentBookings = Booking::with(['customer', 'schedule.package', 'agency'])
            ->latest()
            ->limit(5)
            ->get();

        return response()->json([
            'kpis' => [
                'revenue' => $totalRevenue,
                'agencies' => $totalAgencies,
                'users' => $totalUsers,
                'bookings' => $totalBookings,
                'pending_bookings' => $pendingBookings,
                'approved_bookings' => $approvedBookings,
                'pending_advance_payments' => $pendingAdvancePayments,
                'advance_payments_collected' => $advanceCollected,
                'outstanding_balances' => $outstandingBalances,
            ],
            'charts' => [
                'revenue_trend' => $revenueTrend,
                'top_agencies' => $topAgencies,
                'booking_statuses' => $bookingStatuses,
                'recent_bookings' => $recentBookings
            ]
        ]);
    }
}
