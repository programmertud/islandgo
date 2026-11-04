<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Payment;
use App\Models\TourPackage;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    private function agencyScope(Request $request, $query, string $column = 'agency_id')
    {
        $user = $request->user();
        if ($user->role !== 'super_admin') {
            $query->where($column, $user->agency_id);
        }
        return $query;
    }

    /** GET /reports/bookings */
    public function bookings(Request $request)
    {
        $base = $this->agencyScope($request, Booking::query(), 'bookings.agency_id');

        $this->applyDateFilter($base, $request);

        $byStatus = (clone $base)
            ->select('booking_status', DB::raw('count(*) as count'))
            ->groupBy('booking_status')
            ->get();

        $byMonth = (clone $base)
            ->select(
                DB::raw('DATE_FORMAT(created_at, "%Y-%m") as month'),
                DB::raw('count(*) as count')
            )
            ->where('created_at', '>=', now()->subMonths(11)->startOfMonth())
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        $total = (clone $base)->count();

        return response()->json([
            'total'     => $total,
            'by_status' => $byStatus,
            'by_month'  => $byMonth,
        ]);
    }

    /** GET /reports/revenue */
    public function revenue(Request $request)
    {
        $base = $this->agencyScope($request, Booking::query()->where('payment_status', 'verified'), 'bookings.agency_id');

        $this->applyDateFilter($base, $request);

        $totalRevenue = (clone $base)->sum('total_amount');

        $byMonth = (clone $base)
            ->select(
                DB::raw('DATE_FORMAT(created_at, "%Y-%m") as month'),
                DB::raw('SUM(total_amount) as revenue')
            )
            ->where('created_at', '>=', now()->subMonths(11)->startOfMonth())
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        $byPackage = (clone $base)
            ->join('tour_schedules', 'bookings.tour_schedule_id', '=', 'tour_schedules.id')
            ->join('tour_packages', 'tour_schedules.tour_package_id', '=', 'tour_packages.id')
            ->select('tour_packages.title', DB::raw('SUM(bookings.total_amount) as revenue'))
            ->groupBy('tour_packages.id', 'tour_packages.title')
            ->orderByDesc('revenue')
            ->limit(10)
            ->get();

        $unpaid = $this->agencyScope($request, Booking::query(), 'bookings.agency_id')
            ->whereIn('payment_status', ['unpaid', 'submitted'])
            ->sum('total_amount');

        return response()->json([
            'total_revenue' => $totalRevenue,
            'unpaid_amount' => $unpaid,
            'by_month'      => $byMonth,
            'by_package'    => $byPackage,
        ]);
    }

    /** GET /reports/packages */
    public function packages(Request $request)
    {
        $user = $request->user();

        $query = TourPackage::withCount(['schedules'])
            ->withSum(['bookings' => fn($q) => $q->whereNotIn('booking_status', ['rejected','cancelled'])], 'participants_count')
            ->when($user->role !== 'super_admin', fn($q) => $q->where('agency_id', $user->agency_id))
            ->orderByDesc('bookings_sum_participants_count')
            ->paginate(20);

        return response()->json($query);
    }

    /** GET /reports/payments */
    public function payments(Request $request)
    {
        $base = $this->agencyScope($request, Payment::query()->join('bookings', 'payments.booking_id', '=', 'bookings.id'), 'bookings.agency_id');

        $this->applyDateFilter($base, $request, 'payments.created_at');

        $byMethod = (clone $base)
            ->select('payments.payment_method', DB::raw('count(*) as count'), DB::raw('SUM(payments.amount) as total'))
            ->groupBy('payments.payment_method')
            ->get();

        $byStatus = (clone $base)
            ->select('payments.status', DB::raw('count(*) as count'), DB::raw('SUM(payments.amount) as total'))
            ->groupBy('payments.status')
            ->get();

        return response()->json([
            'by_method' => $byMethod,
            'by_status' => $byStatus,
            'advance_payments' => (clone $base)->where('payments.payment_type', 'advance')->sum('payments.amount'),
            'outstanding_balances' => $this->agencyScope($request, Booking::query(), 'bookings.agency_id')->where('advance_paid_amount', '>', 0)->sum('remaining_balance'),
        ]);
    }

    /** GET /reports/customers */
    public function customers(Request $request)
    {
        $user = $request->user();

        $baseBookings = Booking::query()
            ->when($user->role !== 'super_admin', fn($q) => $q->where('bookings.agency_id', $user->agency_id));

        $totalCustomers = (clone $baseBookings)->distinct('customer_id')->count('customer_id');

        $topCustomers = (clone $baseBookings)
            ->join('users', 'bookings.customer_id', '=', 'users.id')
            ->select('users.id', 'users.name', 'users.email', DB::raw('count(bookings.id) as booking_count'))
            ->groupBy('users.id', 'users.name', 'users.email')
            ->orderByDesc('booking_count')
            ->limit(10)
            ->get();

        $newByMonth = User::where('role', 'customer')
            ->where('created_at', '>=', now()->subMonths(5)->startOfMonth())
            ->select(
                DB::raw('DATE_FORMAT(created_at, "%b %Y") as month'),
                DB::raw('count(*) as count')
            )
            ->groupBy('month')
            ->orderBy(DB::raw('MIN(created_at)'))
            ->get();

        return response()->json([
            'total_customers' => $totalCustomers,
            'top_customers'   => $topCustomers,
            'new_by_month'    => $newByMonth,
        ]);
    }

    /** GET /reports/transactions — paginated booking rows for the report table */
    public function transactions(Request $request)
    {
        $base = $this->agencyScope($request, Booking::query(), 'bookings.agency_id')
            ->leftJoin('users as customers', 'bookings.customer_id', '=', 'customers.id')
            ->join('tour_schedules', 'bookings.tour_schedule_id', '=', 'tour_schedules.id')
            ->join('tour_packages', 'tour_schedules.tour_package_id', '=', 'tour_packages.id')
            ->select(
                'bookings.id',
                'bookings.created_at',
                'bookings.booking_reference',
                'tour_packages.title as tour_package',
                \Illuminate\Support\Facades\DB::raw('COALESCE(customers.name, bookings.guest_name, "Guest") as customer_name'),
                'bookings.total_amount',
                'bookings.advance_paid_amount',
                'bookings.remaining_balance',
                'bookings.booking_status',
                'bookings.payment_status',
                'bookings.participants_count',
            );

        $this->applyDateFilter($base, $request);

        $transactions = $base->orderByDesc('bookings.created_at')->paginate(20);

        return response()->json($transactions);
    }

    private function applyDateFilter($query, Request $request, string $column = 'bookings.created_at'): void
    {
        if ($request->date_from) {
            $query->whereDate($column, '>=', $request->date_from);
        }
        if ($request->date_to) {
            $query->whereDate($column, '<=', $request->date_to);
        }
    }
}
