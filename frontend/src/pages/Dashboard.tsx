import { useQuery } from '@tanstack/react-query';
import { 
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import { 
    Wallet, CalendarCheck, Clock, CheckCircle2, AlertCircle, Building2, 
    MoreVertical, Plus, Calendar, FileText, ArrowUpRight
} from 'lucide-react';
import { Link } from 'react-router';
import { apiClient } from '../lib/axios';
import { storageUrl } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useDateRange } from '../context/DateRangeContext';
import type { Booking } from '../types';

const PIE_COLORS = ['#F59E0B', '#10B981', '#EF4444', '#64748b']; // Pending, Approved, Rejected, Cancelled

export default function Dashboard() {
    const { user } = useAuth();
    const { dateRange } = useDateRange();
    const isSuperAdmin = user?.role === 'super_admin';

    const qs = new URLSearchParams({
        date_from: dateRange.from,
        date_to: dateRange.to,
    }).toString();

    const { data, isLoading, error } = useQuery({
        queryKey: ['dashboard', isSuperAdmin ? 'admin' : 'agency', dateRange.from, dateRange.to],
        queryFn: () => apiClient.get(`${isSuperAdmin ? '/admin/analytics' : '/agency/analytics'}?${qs}`).then(r => r.data),
    });

    if (isLoading) {
        return (
            <div className="p-6 md:p-8 space-y-6 animate-pulse">
                <div className="h-10 bg-slate-200 rounded w-1/4"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-slate-200 rounded-2xl"></div>)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 h-96 bg-slate-200 rounded-2xl"></div>
                    <div className="h-96 bg-slate-200 rounded-2xl"></div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 h-72 bg-slate-200 rounded-2xl"></div>
                    <div className="h-72 bg-slate-200 rounded-2xl"></div>
                </div>
                <div className="h-96 bg-slate-200 rounded-2xl"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 md:p-8">
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Unable to load dashboard data</h3>
                    <p className="text-slate-500 max-w-sm mx-auto">Something went wrong while retrieving your dashboard information. Please try again later.</p>
                </div>
            </div>
        );
    }

    const { kpis, charts } = data;
    
    const formattedPieData = (charts.booking_statuses || []).map((s: any) => ({
        name: s.booking_status,
        value: s.count,
        percent: ((s.count / (kpis.bookings || 1)) * 100).toFixed(1)
    }));
    
    // Sort pie data to put pending first, then approved (confirmed/completed)
    const pieDataOrder = ['pending', 'confirmed', 'completed', 'rejected', 'cancelled'];
    formattedPieData.sort((a: any, b: any) => pieDataOrder.indexOf(a.name) - pieDataOrder.indexOf(b.name));

    // Build a full 6-month timeline so all months show even with no data
    const buildFullRevenueTrend = (rawTrend: any[]) => {
        const months: { month: string; revenue: number; target: number }[] = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
            const match = rawTrend.find((r) => r.month === label);
            const revenue = match ? Number(match.revenue) : 0;
            months.push({ month: label, revenue, target: revenue });
        }
        return months;
    };

    const fullRevenueTrend = buildFullRevenueTrend(charts.revenue_trend || []);


    return (
        <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8">
            {/* Header section */}
            <div>
                <p className="text-slate-500 text-sm font-medium mb-1">Welcome back, {user?.name.split(' ')[0]}!</p>
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Dashboard</h1>
                <p className="text-slate-500 mt-1">Here's what's happening {isSuperAdmin ? 'across your platform' : 'with your tour agency'} today.</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard 
                    title="Total Bookings" 
                    value={kpis.bookings || 0} 
                    icon={CalendarCheck} 
                    trend="+12%" 
                    color="text-emerald-600"
                    bg="bg-emerald-50"
                />
                <KpiCard 
                    title="Pending Bookings" 
                    value={kpis.pending_bookings || 0} 
                    icon={Clock} 
                    trend="+5%"
                    color="text-amber-600"
                    bg="bg-amber-50"
                />
                <KpiCard 
                    title="Approved Bookings" 
                    value={kpis.approved_bookings || 0} 
                    icon={CheckCircle2} 
                    trend="+18%"
                    color="text-emerald-600"
                    bg="bg-emerald-50"
                />
                <KpiCard 
                    title="Total Revenue" 
                    value={`₱${Number(kpis.revenue || 0).toLocaleString()}`} 
                    icon={Wallet} 
                    trend="+22%" 
                    color="text-blue-600"
                    bg="bg-blue-50"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue Trend */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Revenue Overview</h2>
                            <p className="text-sm text-slate-500">Monthly revenue for the selected period</p>
                        </div>
                        <select className="bg-slate-50 border border-slate-200 text-sm font-medium text-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-500 cursor-pointer">
                            <option>Last 6 Months</option>
                            <option>Last 12 Months</option>
                        </select>
                    </div>
                    <div className="flex-1 min-h-[300px]">
                        {fullRevenueTrend.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart
                                    data={fullRevenueTrend}
                                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                                    barCategoryGap="30%"
                                >
                                    <defs>
                                        <linearGradient id="barGreen" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
                                            <stop offset="100%" stopColor="#34D399" stopOpacity={0.85} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="month"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
                                        tickFormatter={(val: string) => val.split(' ')[0]}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                                        tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
                                        width={45}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(0,0,0,0.04)', radius: 6 }}
                                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        formatter={(value: any, name?: string | number) => {
                                            if (name === 'target') return null as any;
                                            return [`₱${Number(value).toLocaleString()}`, 'Revenue'];
                                        }}
                                    />
                                    <Bar
                                        dataKey="revenue"
                                        fill="url(#barGreen)"
                                        radius={[6, 6, 0, 0]}
                                        maxBarSize={52}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="target"
                                        stroke="#6366F1"
                                        strokeWidth={2.5}
                                        strokeDasharray="6 4"
                                        dot={{ fill: '#6366F1', r: 4, strokeWidth: 0 }}
                                        activeDot={{ r: 6, fill: '#6366F1', stroke: '#fff', strokeWidth: 2 }}
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                                <Wallet className="w-12 h-12 mb-3 opacity-20" />
                                <p>No revenue data available</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Booking Status Donut */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                    <h2 className="text-lg font-bold text-slate-800 mb-6">Booking Status</h2>
                    <div className="flex-1 flex flex-col items-center justify-center">
                        {formattedPieData.length > 0 ? (
                            <>
                                <div className="h-[220px] w-full relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={formattedPieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={65}
                                                outerRadius={90}
                                                paddingAngle={3}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {formattedPieData.map((_entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip 
                                                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                                                itemStyle={{ textTransform: 'capitalize' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-3xl font-bold text-slate-800 leading-none">{kpis.bookings || 0}</span>
                                        <span className="text-xs font-medium text-slate-500 mt-1">Total Bookings</span>
                                    </div>
                                </div>
                                <div className="w-full mt-6 space-y-3">
                                    {formattedPieData.map((entry: any, index: number) => (
                                        <div key={index} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}></div>
                                                <span className="text-slate-600 font-medium capitalize">{entry.name}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="font-bold text-slate-800">{entry.value}</span>
                                                <span className="text-slate-400 w-10 text-right">{entry.percent}%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-slate-400 h-full">
                                <PieChart className="w-12 h-12 mb-3 opacity-20" />
                                <p>No booking data available</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Third Row: Popular Packages & Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Popular Packages / Top Agencies */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-800">
                            {isSuperAdmin ? 'Top Agencies by Revenue' : 'Popular Packages'}
                        </h2>
                        <Link to={isSuperAdmin ? '/agencies' : '/packages'} className="text-sm font-semibold text-emerald-600 hover:text-emerald-700">View All</Link>
                    </div>
                    <div className="p-6 flex-1 flex flex-col justify-center">
                        {isSuperAdmin ? (
                            <div className="space-y-6">
                                {charts.top_agencies?.map((agency: any, index: number) => (
                                    <div key={index} className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                                            <Building2 className="w-5 h-5 text-slate-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-end mb-1">
                                                <h4 className="text-sm font-bold text-slate-800 truncate pr-4">{agency.name}</h4>
                                                <span className="text-sm font-bold text-emerald-600 shrink-0">₱{Number(agency.revenue).toLocaleString()}</span>
                                            </div>
                                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-emerald-500 rounded-full" 
                                                    style={{ width: `${(Number(agency.revenue) / Number(charts.top_agencies[0].revenue)) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {charts.top_packages?.length > 0 ? charts.top_packages.map((pkg: any, index: number) => (
                                    <div key={index} className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-200 shrink-0 border border-slate-200 overflow-hidden relative shadow-sm">
                                            <CalendarCheck className="absolute inset-0 m-auto w-5 h-5 text-emerald-700/70" />
                                            {pkg.cover_image && (
                                                <img
                                                    src={storageUrl(pkg.cover_image)}
                                                    alt={pkg.title}
                                                    className="absolute inset-0 h-full w-full object-cover"
                                                    onError={(event) => { event.currentTarget.style.display = 'none'; }}
                                                />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-end mb-2">
                                                <h4 className="text-sm font-bold text-slate-800 truncate pr-4">{pkg.title}</h4>
                                                <span className="text-sm font-bold text-slate-700 shrink-0">{pkg.total_bookings} <span className="text-slate-400 font-medium">bookings</span></span>
                                            </div>
                                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-teal-500 rounded-full" 
                                                    style={{ width: `${(pkg.total_bookings / charts.top_packages[0].total_bookings) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-center text-slate-500 py-4">No packages available</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions & Promo */}
                <div className="flex flex-col gap-6">
                    {/* Quick Actions */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h2 className="text-lg font-bold text-slate-800 mb-5">Quick Actions</h2>
                        <div className="space-y-3">
                            {!isSuperAdmin && (
                                <Link to="/packages?action=add" className="relative flex items-center gap-4 p-3 rounded-xl border border-slate-100 hover:border-emerald-500 hover:shadow-md transition-all group">
                                    <span className="absolute -top-2 right-3 px-2 py-0.5 rounded-full bg-emerald-500 text-[9px] font-extrabold tracking-wider text-white shadow-sm rotate-3">NEW</span>
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 ring-4 ring-emerald-50/60 flex items-center justify-center shrink-0 group-hover:rotate-6 group-hover:scale-110 transition-transform">
                                        <Plus className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">Add Package</h4>
                                        <p className="text-xs text-slate-500">Create a new tour package</p>
                                    </div>
                                    <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                                </Link>
                            )}
                            <Link to="/bookings" className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 hover:border-blue-500 hover:shadow-md transition-all group">
                                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                    <Calendar className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">Review Bookings</h4>
                                    <p className="text-xs text-slate-500">Check pending bookings</p>
                                </div>
                                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                            </Link>
                            <Link to="/reports" className="flex items-center gap-4 p-3 rounded-xl border border-slate-100 hover:border-purple-500 hover:shadow-md transition-all group">
                                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                                    <FileText className="w-5 h-5 text-purple-600" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-slate-800 group-hover:text-purple-600 transition-colors">View Reports</h4>
                                    <p className="text-xs text-slate-500">See detailed analytics</p>
                                </div>
                                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-purple-500 transition-colors" />
                            </Link>
                        </div>
                    </div>

                    {/* Promo Card */}
                    <div className="relative rounded-2xl overflow-hidden shadow-sm flex-1 min-h-[160px] bg-emerald-900 group">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-teal-900 opacity-90 mix-blend-multiply transition-opacity group-hover:opacity-80"></div>
                        <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0ibm9uZSI+PC9yZWN0Pgo8Y2lyY2xlIGN4PSIyIiBjeT0iMiIgcj0iMiIgZmlsbD0iI2ZmZiI+PC9jaXJjbGU+Cjwvc3ZnPg==')] bg-repeat"></div>
                        <div className="relative p-6 h-full flex flex-col justify-between">
                            <div>
                                <span className="text-xs font-bold text-emerald-100 uppercase tracking-wider mb-2 block">Explore the Philippines</span>
                                <h3 className="text-lg font-bold text-white leading-tight mb-2">Create Unforgettable Travel Experiences.</h3>
                            </div>
                            <p className="text-sm text-emerald-100/90 leading-relaxed font-medium">Manage bookings, packages and customers all in one place.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Bookings Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Recent Bookings</h2>
                        <p className="text-sm text-slate-500 mt-1">Latest bookings across your {isSuperAdmin ? 'platform' : 'agency'}</p>
                    </div>
                    <Link to="/bookings" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 hidden sm:block">View All</Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-400 uppercase bg-slate-50/50">
                            <tr>
                                <th className="px-6 py-4 font-semibold tracking-wider">Booking Ref</th>
                                <th className="px-6 py-4 font-semibold tracking-wider">Customer</th>
                                <th className="px-6 py-4 font-semibold tracking-wider">Package / Destination</th>
                                <th className="px-6 py-4 font-semibold tracking-wider">Date</th>
                                <th className="px-6 py-4 font-semibold tracking-wider">Status</th>
                                <th className="px-6 py-4 font-semibold tracking-wider">Payment</th>
                                <th className="px-6 py-4 font-semibold tracking-wider text-right">Amount</th>
                                <th className="px-6 py-4 font-semibold tracking-wider text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {(charts.recent_bookings || []).map((booking: Booking) => {
                                const customerName = booking.customer?.name || booking.guest_name || 'Guest Customer';
                                const isGuest = !booking.customer && !!booking.guest_name;

                                return (
                                <tr key={booking.id} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="px-6 py-4 font-bold text-slate-700">{booking.booking_reference}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${isGuest ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                                {customerName.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-semibold text-slate-800">{customerName}</span>
                                                {isGuest && (
                                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                        Guest
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-semibold text-slate-800 truncate max-w-[200px]">{booking.schedule?.package?.title || 'Unknown Package'}</p>
                                        <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[200px]">{booking.schedule?.package?.location || 'Unknown Location'}</p>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-600 whitespace-nowrap">
                                        {new Date(booking.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={booking.booking_status} type="booking" />
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={booking.payment_status} type="payment" />
                                    </td>
                                    <td className="px-6 py-4 font-bold text-slate-800 text-right whitespace-nowrap">
                                        ₱{Number(booking.total_amount).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors opacity-0 group-hover:opacity-100">
                                            <MoreVertical className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            );})}
                            {(!charts.recent_bookings || charts.recent_bookings.length === 0) && (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-400">
                                            <CalendarCheck className="w-10 h-10 mb-3 opacity-20" />
                                            <p className="font-medium text-slate-600 mb-1">No bookings yet</p>
                                            <p className="text-sm">Your recent bookings will appear here.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// Sub-components

function KpiCard({ title, value, icon: Icon, trend, color, bg }: any) {
    const isPositive = trend.startsWith('+');
    return (
        <div className="min-h-[128px] bg-white p-4 rounded-2xl border border-slate-200 shadow-[0_2px_8px_rgba(15,23,42,0.05)] hover:border-slate-300 hover:shadow-[0_16px_30px_rgba(15,23,42,0.12)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
            <div className={`absolute inset-x-0 top-0 h-1 ${bg}`} />
            <div className="flex items-start justify-between relative z-10">
                <div className={`w-10 h-10 p-2 rounded-xl flex items-center justify-center ${bg} shrink-0 ring-1 ring-white shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`w-5 h-5 ${color}`} strokeWidth={2.5} />
                </div>
                {trend && (
                    <div className="flex flex-col items-end gap-1">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold flex items-center gap-0.5 ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                            <ArrowUpRight className="w-3.5 h-3.5" /> {trend}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">vs. last month</span>
                    </div>
                )}
            </div>
            <div className="mt-3 relative z-10">
                <p className="text-slate-500 text-xs font-bold mb-1">{title}</p>
                <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight tabular-nums">{value}</h3>
            </div>
            <div className={`absolute -right-8 -bottom-8 w-28 h-28 rounded-full ${bg} opacity-60 group-hover:scale-150 transition-transform duration-500 ease-out`} />
            <div className={`absolute right-10 bottom-5 w-2 h-2 rounded-full ${bg} opacity-80`} />
        </div>
    );
}

function StatusBadge({ status, type }: { status: string, type: 'booking' | 'payment' }) {
    let styles = '';
    let label = status;

    if (type === 'booking') {
        switch(status) {
            case 'confirmed':
            case 'completed':
                styles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                label = 'Approved';
                break;
            case 'pending':
                styles = 'bg-amber-50 text-amber-700 border-amber-200';
                break;
            case 'rejected':
            case 'cancelled':
                styles = 'bg-red-50 text-red-700 border-red-200';
                break;
            default:
                styles = 'bg-slate-50 text-slate-700 border-slate-200';
        }
    } else {
        switch(status) {
            case 'verified':
                styles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                label = 'Paid';
                break;
            case 'pending':
                styles = 'bg-amber-50 text-amber-700 border-amber-200';
                break;
            case 'refunded':
            case 'failed':
                styles = 'bg-red-50 text-red-700 border-red-200';
                break;
            default:
                styles = 'bg-slate-50 text-slate-700 border-slate-200';
        }
    }

    return (
        <span className={`px-2.5 py-1 text-xs font-bold rounded-md capitalize border ${styles} flex items-center justify-center w-fit`}>
            {label}
        </span>
    );
}
