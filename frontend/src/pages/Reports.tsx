import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    BarChart, Bar,
} from 'recharts';
import { Filter, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiClient } from '../lib/axios';
import { useAuth } from '../context/AuthContext';
import { useDateRange, DATE_PRESETS, formatDateLabel } from '../context/DateRangeContext';

const STATUS_COLORS: Record<string, string> = {
    confirmed:  '#4F46E5',
    pending:    '#F59E0B',
    cancelled:  '#EF4444',
    rejected:   '#9CA3AF',
    completed:  '#10B981',
};

const PIE_COLORS = ['#4F46E5', '#F59E0B', '#EF4444', '#9CA3AF', '#10B981'];

const PAYMENT_STATUS_LABEL: Record<string, string> = {
    verified:   'Paid',
    submitted:  'Submitted',
    unpaid:     'Unpaid',
};

function badge(status: string) {
    const map: Record<string, string> = {
        // booking
        confirmed:  'bg-indigo-100 text-indigo-700',
        pending:    'bg-amber-100 text-amber-700',
        cancelled:  'bg-red-100 text-red-700',
        rejected:   'bg-gray-100 text-gray-600',
        completed:  'bg-green-100 text-green-700',
        // payment
        verified:   'bg-green-100 text-green-700',
        submitted:  'bg-blue-100 text-blue-700',
        unpaid:     'bg-red-100 text-red-700',
    };
    return map[status] ?? 'bg-gray-100 text-gray-600';
}

export default function Reports() {
    const { user } = useAuth();
    const { dateRange, setDateRange } = useDateRange();
    const isSuperAdmin = user?.role === 'super_admin';
    const basePath = isSuperAdmin ? '/admin/reports' : '/agency/reports';
    const [showFilter, setShowFilter] = useState(false);
    const [txPage, setTxPage] = useState(1);

    const qs = (() => {
        const p = new URLSearchParams();
        if (dateRange.from) p.append('date_from', dateRange.from);
        if (dateRange.to) p.append('date_to', dateRange.to);
        return p.toString() ? `?${p.toString()}` : '';
    })();

    const { data: revenue } = useQuery({
        queryKey: ['rpt-revenue', qs],
        queryFn: () => apiClient.get(`${basePath}/revenue${qs}`).then(r => r.data),
    });

    const { data: bookings } = useQuery({
        queryKey: ['rpt-bookings', qs],
        queryFn: () => apiClient.get(`${basePath}/bookings${qs}`).then(r => r.data),
    });

    const { data: payments } = useQuery({
        queryKey: ['rpt-payments', qs],
        queryFn: () => apiClient.get(`${basePath}/payments${qs}`).then(r => r.data),
    });

    const txQs = `${qs ? qs + '&' : '?'}page=${txPage}`;
    const { data: txData, isLoading: txLoading } = useQuery({
        queryKey: ['rpt-tx', qs, txPage],
        queryFn: () => apiClient.get(`${basePath}/transactions${txQs}`).then(r => r.data),
    });

    const totalRevenue  = Number(revenue?.total_revenue  || 0);
    const unpaidAmount  = Number(revenue?.unpaid_amount  || 0);
    const totalBookings = bookings?.total || 0;
    const advancePaid   = Number(payments?.advance_payments || 0);

    const pieData = (bookings?.by_status || []).map((s: any) => ({
        name: s.booking_status,
        value: s.count,
    }));

    const financialData = (revenue?.by_month || []).map((m: any) => ({
        date: m.month,
        revenue: Number(m.revenue),
    }));

    const packageData = (revenue?.by_package || []).slice(0, 5).map((p: any) => ({
        name: p.title.length > 18 ? p.title.slice(0, 16) + '…' : p.title,
        revenue: Number(p.revenue),
    }));

    const transactions = txData?.data || [];
    const lastPage = txData?.last_page || 1;

    return (
        <div className="p-4 md:p-6 w-full space-y-5 bg-gray-50 min-h-full">

            {/* ── Header ── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h1 className="text-2xl font-extrabold text-gray-800 tracking-tight">REPORTS</h1>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowFilter(v => !v)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-md transition-colors shadow"
                    >
                        <Filter className="w-3.5 h-3.5" /> FILTER
                    </button>
                    <button className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-md transition-colors shadow">
                        <Download className="w-3.5 h-3.5" /> EXPORT REPORT
                    </button>
                </div>
            </div>

            {/* ── Filter panel ── */}
            {showFilter && (
                <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-wrap items-end gap-4 shadow-sm">
                    <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-gray-500 uppercase">Date Range</label>
                        <select
                            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            onChange={(e) => {
                                const preset = DATE_PRESETS.find(p => p.label === e.target.value);
                                if (preset) { setDateRange(preset.getRange()); setTxPage(1); }
                            }}
                            defaultValue="This Month"
                        >
                            {DATE_PRESETS.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-gray-500 uppercase">From</label>
                        <input
                            type="date" value={dateRange.from}
                            onChange={e => { setDateRange({ ...dateRange, from: e.target.value }); setTxPage(1); }}
                            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-gray-500 uppercase">To</label>
                        <input
                            type="date" value={dateRange.to}
                            onChange={e => { setDateRange({ ...dateRange, to: e.target.value }); setTxPage(1); }}
                            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <p className="text-xs text-gray-500 font-medium self-end pb-1.5">
                        Showing: <span className="font-bold text-indigo-600">{formatDateLabel(dateRange.from)} – {formatDateLabel(dateRange.to)}</span>
                    </p>
                </div>
            )}

            {/* ── Overview + Charts ── */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

                {/* Overview */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
                    <h2 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b pb-2">Overview</h2>
                    <div className="space-y-3">
                        <div>
                            <p className="text-[10px] text-gray-400 font-semibold uppercase">Total Bookings</p>
                            <p className="text-2xl font-black text-gray-800">{totalBookings}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 font-semibold uppercase">Total Revenue</p>
                            <p className="text-2xl font-black text-indigo-600">₱{totalRevenue.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 font-semibold uppercase">Advance Payments</p>
                            <p className="text-xl font-black text-emerald-600">₱{advancePaid.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 font-semibold uppercase">Unpaid / Pending</p>
                            <p className="text-xl font-black text-amber-600">₱{unpaidAmount.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                {/* Bookings Pie */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                    <h2 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b pb-2 mb-3">Bookings by Status</h2>
                    <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" nameKey="name" stroke="none">
                                {pieData.map((entry: any, i: number) => (
                                    <Cell key={i} fill={STATUS_COLORS[entry.name] ?? PIE_COLORS[i % PIE_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(v: any, n: any) => [v, n]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                        {pieData.map((d: any, i: number) => (
                            <div key={i} className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: STATUS_COLORS[d.name] ?? PIE_COLORS[i % PIE_COLORS.length] }} />
                                <span className="text-[10px] font-semibold text-gray-600 capitalize">{d.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Financial Line Chart */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                    <h2 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b pb-2 mb-3">Financial Trend</h2>
                    <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={financialData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="date" tick={{ fontSize: 8 }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fontSize: 8 }} tickLine={false} axisLine={false} tickFormatter={v => `₱${(v/1000).toFixed(0)}K`} width={36} />
                            <Tooltip formatter={(v: any) => [`₱${Number(v).toLocaleString()}`, 'Revenue']} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                            <Line type="monotone" dataKey="revenue" stroke="#4F46E5" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Top Packages Bar */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                    <h2 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b pb-2 mb-3">Top Packages</h2>
                    <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={packageData} layout="vertical" barCategoryGap="20%">
                            <XAxis type="number" tick={{ fontSize: 8 }} tickLine={false} axisLine={false} tickFormatter={v => `₱${(v/1000).toFixed(0)}K`} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 8 }} tickLine={false} axisLine={false} width={60} />
                            <Tooltip formatter={(v: any) => [`₱${Number(v).toLocaleString()}`, 'Revenue']} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                            <Bar dataKey="revenue" radius={[0, 4, 4, 0]} maxBarSize={18}>
                                {packageData.map((_: any, i: number) => (
                                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ── Report Data Table ── */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                    <h2 className="text-sm font-bold text-gray-700">Report Data</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-4 py-3 font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Date</th>
                                <th className="text-left px-4 py-3 font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Tour Package</th>
                                <th className="text-left px-4 py-3 font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Customer</th>
                                <th className="text-left px-4 py-3 font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Pax</th>
                                <th className="text-right px-4 py-3 font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Amount</th>
                                <th className="text-right px-4 py-3 font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Advance Paid</th>
                                <th className="text-left px-4 py-3 font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Booking Status</th>
                                <th className="text-left px-4 py-3 font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Payment Status</th>
                                <th className="text-left px-4 py-3 font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">Reference</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {txLoading && (
                                <tr><td colSpan={9} className="text-center py-10 text-gray-400 font-medium">Loading…</td></tr>
                            )}
                            {!txLoading && transactions.length === 0 && (
                                <tr><td colSpan={9} className="text-center py-10 text-gray-400 font-medium">No bookings found for this date range.</td></tr>
                            )}
                            {transactions.map((tx: any) => (
                                <tr key={tx.id} className="hover:bg-indigo-50/40 transition-colors">
                                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                                        {new Date(tx.created_at).toLocaleDateString('en-PH', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-gray-800 max-w-[200px] truncate">{tx.tour_package}</td>
                                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{tx.customer_name}</td>
                                    <td className="px-4 py-3 text-gray-600 text-center">{tx.participants_count}</td>
                                    <td className="px-4 py-3 text-right font-bold text-gray-800 whitespace-nowrap">₱{Number(tx.total_amount).toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right text-emerald-700 font-semibold whitespace-nowrap">
                                        {Number(tx.advance_paid_amount) > 0 ? `₱${Number(tx.advance_paid_amount).toLocaleString()}` : '—'}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${badge(tx.booking_status)}`}>
                                            {tx.booking_status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badge(tx.payment_status)}`}>
                                            {PAYMENT_STATUS_LABEL[tx.payment_status] ?? tx.payment_status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-400 font-mono text-[10px] whitespace-nowrap">{tx.booking_reference ?? `#${tx.id}`}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {lastPage > 1 && (
                    <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                        <p className="text-[11px] text-gray-500 font-medium">
                            Page <span className="font-bold text-gray-700">{txPage}</span> of <span className="font-bold text-gray-700">{lastPage}</span>
                        </p>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setTxPage(p => Math.max(1, p - 1))}
                                disabled={txPage === 1}
                                className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setTxPage(p => Math.min(lastPage, p + 1))}
                                disabled={txPage === lastPage}
                                className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
