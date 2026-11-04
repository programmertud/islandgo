import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, Users, CalendarDays, MessageSquare, CreditCard, Plus, Edit, Trash2, CheckCircle, XCircle, RefreshCw, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { agencyPackagesApi, agencyBookingsApi, smsApi, agencyAnalyticsApi } from '../lib/api';
import type { TourPackage, Booking, SmsNotification, PaginatedResponse } from '../types';
import AvailabilityManagement from '../components/AvailabilityManagement';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// ── Status Badge ─────────────────────────────────────────────────────────────
const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    cancelled: 'bg-slate-100 text-slate-600',
    completed: 'bg-blue-100 text-blue-700',
    unpaid: 'bg-slate-100 text-slate-600',
    submitted: 'bg-amber-100 text-amber-700',
    under_review: 'bg-blue-100 text-blue-700',
    verified: 'bg-emerald-100 text-emerald-700',
    mock_sent: 'bg-purple-100 text-purple-700',
    sent: 'bg-emerald-100 text-emerald-700',
    failed: 'bg-red-100 text-red-700',
    draft: 'bg-slate-100 text-slate-600',
    published: 'bg-emerald-100 text-emerald-700',
    archived: 'bg-red-100 text-red-700',
};

const Badge = ({ status }: { status: string }) => (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[status] ?? 'bg-slate-100 text-slate-600'}`}>
        {status.replace('_', ' ')}
    </span>
);

// ── Dashboard Tab ──────────────────────────────────────────────────────────────
const COLORS = ['#059669', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

function DashboardTab() {
    const { data, isLoading } = useQuery({
        queryKey: ['agency-analytics'],
        queryFn: () => agencyAnalyticsApi.getDashboard().then(r => r.data),
    });

    if (isLoading) return <div className="flex items-center justify-center h-48 text-slate-400">Loading analytics…</div>;
    if (!data) return null;

    const { charts } = data;

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Revenue Trend (Last 6 Months)</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={charts.revenue_trend}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(value) => `₱${value/1000}k`} />
                                <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                <Bar dataKey="revenue" fill="#059669" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Booking Status Distribution</h3>
                    <div className="flex-1 min-h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={charts.booking_statuses} dataKey="count" nameKey="booking_status" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                                    {charts.booking_statuses.map((_: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap justify-center gap-4 mt-2">
                        {charts.booking_statuses.map((entry: any, index: number) => (
                            <div key={entry.booking_status} className="flex items-center gap-2 text-sm text-slate-600 capitalize">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                {entry.booking_status.replace('_', ' ')} ({entry.count})
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Top Tour Packages</h3>
                <div className="space-y-3">
                    {charts.top_packages.map((pkg: any, index: number) => (
                        <div key={pkg.title} className="flex justify-between items-center p-3 rounded-xl bg-slate-50">
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-slate-400 w-4">{index + 1}.</span>
                                <span className="font-medium text-slate-800">{pkg.title}</span>
                            </div>
                            <span className="text-emerald-600 font-bold bg-emerald-100 px-3 py-1 rounded-full text-sm">
                                {pkg.total_bookings} bookings
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── Packages Tab ─────────────────────────────────────────────────────────────
function PackagesTab() {
    const [page, setPage] = useState(1);
    const qc = useQueryClient();
    const { data, isLoading } = useQuery({
        queryKey: ['agency-packages', page],
        queryFn: () => agencyPackagesApi.list(page).then(r => r.data as PaginatedResponse<TourPackage>),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => agencyPackagesApi.delete(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['agency-packages'] }),
    });

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800">Tour Packages</h2>
                <button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    <Plus className="w-4 h-4" /> Add Package
                </button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-48 text-slate-400">Loading packages…</div>
            ) : data?.data.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p>No packages yet. Create your first tour package.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 text-left text-slate-500">
                                <th className="pb-3 font-medium">Title</th>
                                <th className="pb-3 font-medium">Destination</th>
                                <th className="pb-3 font-medium">Price</th>
                                <th className="pb-3 font-medium">Status</th>
                                <th className="pb-3 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {data?.data.map((pkg) => (
                                <tr key={pkg.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-4 font-medium text-slate-900">{pkg.title}</td>
                                    <td className="py-4 text-slate-600">{pkg.destination}</td>
                                    <td className="py-4 text-emerald-600 font-medium">₱{Number(pkg.price_per_person).toLocaleString()}</td>
                                    <td className="py-4"><Badge status={pkg.status} /></td>
                                    <td className="py-4">
                                        <div className="flex gap-2">
                                            <button className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => deleteMutation.mutate(pkg.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    {data && data.last_page > 1 && (
                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
                            <span className="text-sm text-slate-500">Page {data.current_page} of {data.last_page}</span>
                            <div className="flex gap-2">
                                <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors">
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button onClick={() => setPage(p => p + 1)} disabled={page === data.last_page} className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Bookings Tab ─────────────────────────────────────────────────────────────
function BookingsTab() {
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState('');
    const qc = useQueryClient();

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['agency-bookings', page, statusFilter],
        queryFn: () => agencyBookingsApi.list({ booking_status: statusFilter || undefined, page }).then(r => r.data as PaginatedResponse<Booking>),
    });

    const updateStatus = useMutation({
        mutationFn: ({ id, status }: { id: number; status: string }) =>
            agencyBookingsApi.updateStatus(id, { booking_status: status }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['agency-bookings'] }),
    });

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800">Bookings</h2>
                <div className="flex items-center gap-3">
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white">
                        <option value="">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="rejected">Rejected</option>
                        <option value="completed">Completed</option>
                    </select>
                    <button onClick={() => refetch()} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                        <RefreshCw className="w-4 h-4 text-slate-500" />
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-48 text-slate-400">Loading bookings…</div>
            ) : data?.data.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p>No bookings found.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 text-left text-slate-500">
                                <th className="pb-3 font-medium">Reference</th>
                                <th className="pb-3 font-medium">Customer</th>
                                <th className="pb-3 font-medium">Pax</th>
                                <th className="pb-3 font-medium">Amount</th>
                                <th className="pb-3 font-medium">Booking</th>
                                <th className="pb-3 font-medium">Payment</th>
                                <th className="pb-3 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {data?.data.map((b) => (
                                <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-4 font-mono text-xs text-slate-700">{b.booking_reference}</td>
                                    <td className="py-4">
                                        <div className="font-medium text-slate-900">{b.customer?.name || b.guest_name || 'Guest'}</div>
                                        <div className="text-slate-400 text-xs">{b.customer?.email || b.guest_email || b.guest_phone || ''}</div>
                                    </td>
                                    <td className="py-4 text-slate-600">{b.participants_count}</td>
                                    <td className="py-4 font-medium text-slate-900">₱{Number(b.total_amount).toLocaleString()}</td>
                                    <td className="py-4"><Badge status={b.booking_status} /></td>
                                    <td className="py-4"><Badge status={b.payment_status} /></td>
                                    <td className="py-4">
                                        <div className="flex gap-1.5">
                                            {b.booking_status === 'pending' && (
                                                <>
                                                    <button onClick={() => updateStatus.mutate({ id: b.id, status: 'confirmed' })}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Confirm">
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => updateStatus.mutate({ id: b.id, status: 'rejected' })}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Reject">
                                                        <XCircle className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {data && data.last_page > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
                    <span className="text-sm text-slate-500">Page {data.current_page} of {data.last_page}</span>
                    <div className="flex gap-2">
                        <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button onClick={() => setPage(p => p + 1)} disabled={page === data.last_page} className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── SMS Logs Tab ──────────────────────────────────────────────────────────────
function SmsLogsTab() {
    const { data, isLoading } = useQuery({
        queryKey: ['agency-sms-logs'],
        queryFn: () => smsApi.list().then(r => r.data as PaginatedResponse<SmsNotification>),
    });

    return (
        <div>
            <h2 className="text-xl font-bold text-slate-800 mb-6">SMS Notification Logs</h2>
            {isLoading ? (
                <div className="flex items-center justify-center h-48 text-slate-400">Loading SMS logs…</div>
            ) : data?.data.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p>No SMS notifications have been sent yet.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {data?.data.map(sms => (
                        <div key={sms.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white transition-colors">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge status={sms.status} />
                                        <span className="text-xs text-slate-400 font-mono">{sms.event_type.replace('_', ' ')}</span>
                                    </div>
                                    <p className="text-sm text-slate-700">{sms.message}</p>
                                    <p className="text-xs text-slate-400 mt-1">To: {sms.recipient_phone} • Ref: {sms.provider_reference}</p>
                                </div>
                                <span className="text-xs text-slate-400 shrink-0">{new Date(sms.created_at).toLocaleString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function AgencyPortal() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('packages');

    const { data: bookingsData } = useQuery({
        queryKey: ['agency-bookings', 1, ''],
        queryFn: () => agencyBookingsApi.list().then(r => r.data as PaginatedResponse<Booking>),
    });
    const { data: packagesData } = useQuery({
        queryKey: ['agency-packages', 1],
        queryFn: () => agencyPackagesApi.list(1).then(r => r.data as PaginatedResponse<TourPackage>),
    });

    const stats = [
        { label: 'Active Packages', value: packagesData?.total ?? '…', icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Total Bookings', value: bookingsData?.total ?? '…', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Pending Bookings', value: bookingsData?.data.filter(b => b.booking_status === 'pending').length ?? '…', icon: CalendarDays, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Pending Payments', value: bookingsData?.data.filter(b => b.payment_status === 'submitted').length ?? '…', icon: CreditCard, color: 'text-rose-600', bg: 'bg-rose-50' },
    ];

    const tabs = [
        { id: 'dashboard', label: 'Dashboard', icon: Activity },
        { id: 'packages', label: 'Packages', icon: Package },
        { id: 'bookings', label: 'Bookings', icon: Users },
        { id: 'schedules', label: 'Schedules', icon: CalendarDays },
        { id: 'availability', label: 'Availability', icon: CalendarDays },
        { id: 'sms', label: 'SMS Logs', icon: MessageSquare },
    ];

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 pb-6 border-b border-slate-200">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Agency Dashboard</h1>
                    <p className="text-slate-500 mt-1">Welcome back, <span className="font-semibold text-slate-700">{user?.name}</span></p>
                </div>
                <button className="mt-4 md:mt-0 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-sm hover:shadow-emerald-500/20 transform hover:-translate-y-0.5">
                    <Plus className="w-5 h-5" /> New Tour Package
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {stats.map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                            <div className={`p-3 rounded-xl ${stat.bg}`}>
                                <Icon className={`w-6 h-6 ${stat.color}`} />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{stat.label}</p>
                                <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{stat.value}</h3>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Tab Panel */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <nav className="flex border-b border-slate-200 px-6 gap-1">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 py-4 px-4 text-sm font-medium border-b-2 -mb-px transition-all whitespace-nowrap ${
                                    activeTab === tab.id
                                        ? 'border-emerald-500 text-emerald-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
                <div className="p-6">
                    {activeTab === 'dashboard' && <DashboardTab />}
                    {activeTab === 'packages' && <PackagesTab />}
                    {activeTab === 'bookings' && <BookingsTab />}
                    {activeTab === 'schedules' && (
                        <div className="text-center py-16 text-slate-400">
                            <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-40" />
                            <p>Select a package to manage its departure schedules.</p>
                        </div>
                    )}
                    {activeTab === 'availability' && <AvailabilityManagement />}
                    {activeTab === 'sms' && <SmsLogsTab />}
                </div>
            </div>
        </div>
    );
}
