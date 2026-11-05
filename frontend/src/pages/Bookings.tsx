import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Search, ChevronLeft, ChevronRight,
    User as UserIcon, Package as PackageIcon, X,
    CalendarCheck, Clock, CheckCircle2, XCircle, Loader2, Trash2,
    Map as MapIcon, LayoutList, ImageOff, Calendar, Copy,
    Check, ExternalLink, Eye, AlertCircle, Phone, Mail,
    CreditCard, CheckSquare
} from 'lucide-react';
import { apiClient } from '../lib/axios';
import { storageUrl } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { Booking, PaginatedResponse } from '../types';
import ConfirmModal from '../components/ConfirmModal';
import BookingLocationMap from '../components/maps/BookingLocationMap';
import BookingsOverviewMap from '../components/maps/BookingsOverviewMap';

const STATUS_CONFIG: Record<string, { label: string; classes: string; dot: string }> = {
    pending: { label: 'Pending Review', classes: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
    confirmed: { label: 'Confirmed', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-400' },
    completed: { label: 'Completed', classes: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-400' },
    rejected: { label: 'Rejected', classes: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-400' },
    cancelled: { label: 'Cancelled', classes: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
    expired: { label: 'Expired', classes: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
};

const PAYMENT_CONFIG: Record<string, { label: string; classes: string; dot?: string }> = {
    pending: { label: 'Pending', classes: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
    verified: { label: 'Advance Paid', classes: 'bg-teal-50 text-teal-700 border-teal-200', dot: 'bg-teal-400' },
    paid: { label: 'Fully Paid', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-400' },
    refunded: { label: 'Refunded', classes: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-400' },
    failed: { label: 'Failed', classes: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-400' },
    unpaid: { label: 'Unpaid', classes: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
    submitted: { label: 'Receipt Under Review', classes: 'bg-amber-50 text-amber-800 border-amber-300 font-bold', dot: 'bg-amber-500 animate-pulse' },
    rejected: { label: 'Receipt Rejected', classes: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-400' },
};

function StatusBadge({ status, type = 'booking' }: { status: string; type?: 'booking' | 'payment' }) {
    const config = type === 'booking'
        ? STATUS_CONFIG[status] ?? { label: status, classes: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-400' }
        : PAYMENT_CONFIG[status] ?? { label: status, classes: 'bg-slate-50 text-slate-600 border-slate-200' };

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md border capitalize ${config.classes}`}>
            {'dot' in config && config.dot && <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />}
            {config.label}
        </span>
    );
}

const PesoIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M7 21V4h6.5a4.5 4.5 0 0 1 0 9H7" />
        <path d="M4.5 8h11" />
        <path d="M4.5 11.5h11" />
    </svg>
);

function formatTourDate(dateStr?: string | null, includeWeekday = false): string {
    if (!dateStr) return 'Date not set';
    try {
        const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
            const [, year, month, day] = match;
            const d = new Date(Number(year), Number(month) - 1, Number(day));
            if (!isNaN(d.getTime())) {
                return d.toLocaleDateString('en-US', includeWeekday ? {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                } : {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });
            }
        }
        const fallback = new Date(dateStr);
        if (!isNaN(fallback.getTime())) {
            return fallback.toLocaleDateString('en-US', includeWeekday ? {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            } : {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        }
    } catch {
        // ignore
    }
    return 'Date not set';
}

export default function Bookings() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const isSuperAdmin = user?.role === 'super_admin';

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [viewMode, setViewMode] = useState<'table' | 'map'>('table');
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [paymentViewBooking, setPaymentViewBooking] = useState<Booking | null>(null);
    const [cashAmount, setCashAmount] = useState('');
    const [cashReference, setCashReference] = useState('');
    const [copiedRef, setCopiedRef] = useState<string | null>(null);
    const [verifyingPaymentId, setVerifyingPaymentId] = useState<number | null>(null);

    // Confirmation Modal State
    const [confirmAction, setConfirmAction] = useState<{ isOpen: boolean; title: string; message: string; isDanger: boolean; onConfirm: () => void } | null>(null);

    const closeConfirm = () => setConfirmAction(null);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedRef(text);
        setTimeout(() => setCopiedRef(null), 2000);
    };

    const applyPaymentStatus = (paymentId: number, status: 'verified' | 'rejected') => {
        setSelectedBooking(current => current ? {
            ...current,
            payment_status: status,
            booking_status: status === 'verified' ? 'confirmed' : current.booking_status,
            payments: current.payments?.map(payment => payment.id === paymentId ? { ...payment, status } : payment),
        } : current);
        queryClient.invalidateQueries({ queryKey: ['bookings'] });
        queryClient.refetchQueries({ queryKey: ['bookings'] });
    };

    const handleVerifyPayment = (paymentId: number, action: 'verified' | 'rejected') => {
        setVerifyingPaymentId(paymentId);
        closeConfirm();
        apiClient.patch(`/agency/payments/${paymentId}/verify`, { status: action })
            .then(() => {
                applyPaymentStatus(paymentId, action);
            })
            .catch(err => {
                const msg = err.response?.data?.message || `Failed to ${action === 'verified' ? 'verify' : 'reject'} payment.`;
                queryClient.invalidateQueries({ queryKey: ['bookings'] });
                queryClient.refetchQueries({ queryKey: ['bookings'] });
                alert(msg);
            })
            .finally(() => setVerifyingPaymentId(null));
    };

    const { data, isLoading } = useQuery<PaginatedResponse<Booking>>({
        queryKey: ['bookings', page, search, statusFilter],
        queryFn: async () => {
            const endpoint = isSuperAdmin ? '/admin/bookings' : '/agency/bookings';
            const params = new URLSearchParams({ page: page.toString() });
            if (search) params.append('search', search);
            if (statusFilter) params.append('booking_status', statusFilter);
            const res = await apiClient.get(`${endpoint}?${params.toString()}`);
            return res.data;
        }
    });

    const deleteBooking = useMutation({
        mutationFn: (id: number) => apiClient.delete(`/agency/bookings/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            setSelectedBooking(null);
            closeConfirm();
        },
        onError: (err: any) => {
            closeConfirm();
            alert(err.response?.data?.message || 'Unable to delete this booking. Please try again.');
        },
    });

    const recordCashAdvance = useMutation({
        mutationFn: (booking: Booking) => apiClient.post(`/agency/bookings/${booking.id}/cash-advance`, { amount: Number(cashAmount), reference_number: cashReference || undefined }),
        onSuccess: (response) => {
            setSelectedBooking(response.data.booking);
            setCashAmount('');
            setCashReference('');
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        },
        onError: (err: any) => alert(err.response?.data?.message || 'Unable to record the cash advance.'),
    });

    const requestDelete = (booking: Booking) => {
        setConfirmAction({
            isOpen: true,
            title: 'Delete booking?',
            message: `This cannot be undone. Booking: ${booking.booking_reference} • Customer: ${booking.customer?.name || booking.guest_name || 'Guest Customer'} • Package: ${booking.schedule?.package?.title ?? 'Unknown'}`,
            isDanger: true,
            onConfirm: () => deleteBooking.mutate(booking.id),
        });
    };

    return (
        <div className="p-6 md:p-8 max-w-[1650px] mx-auto space-y-6">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <p className="text-slate-500 text-sm font-medium mb-1">Management</p>
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Bookings Management</h1>
                    <p className="text-slate-500 mt-1">
                        Review customer reservations, verify payment receipts, check tour schedules, and confirm bookings.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {/* View Switcher */}
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                        <button
                            type="button"
                            onClick={() => setViewMode('table')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${viewMode === 'table'
                                    ? 'bg-slate-900 text-white shadow-xs'
                                    : 'text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <LayoutList className="w-3.5 h-3.5" />
                            Table View
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('map')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${viewMode === 'map'
                                    ? 'bg-slate-900 text-white shadow-xs'
                                    : 'text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <MapIcon className="w-3.5 h-3.5" />
                            Map View
                        </button>
                    </div>

                    <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search ref, customer, email..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                            className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 w-64 shadow-sm"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                        className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 shadow-sm font-medium text-slate-700"
                    >
                        <option value="">All Statuses</option>
                        <option value="pending">Pending Review</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>
            </div>

            {/* Stats Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Total bookings', value: data?.total ?? 0, icon: CalendarCheck, color: 'text-slate-600', bg: 'bg-slate-100', accent: 'bg-slate-400', note: 'All booking records' },
                    { label: 'Pending review', value: data?.data?.filter(b => b.booking_status === 'pending').length ?? 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', accent: 'bg-amber-400', note: 'Needs check / approval' },
                    { label: 'Confirmed', value: data?.data?.filter(b => b.booking_status === 'confirmed').length ?? 0, icon: CheckCircle2, color: 'text-sky-700', bg: 'bg-sky-100', accent: 'bg-sky-500', note: 'Ready to travel' },
                    { label: 'Rejected', value: data?.data?.filter(b => b.booking_status === 'rejected').length ?? 0, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50', accent: 'bg-rose-400', note: 'Not approved' },
                ].map(stat => (
                    <div key={stat.label} className="relative overflow-hidden bg-white border border-slate-200 rounded-2xl px-5 py-5 flex items-center gap-4 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
                        <div className={`absolute inset-x-0 top-0 h-1 ${stat.accent}`} />
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${stat.bg} shrink-0`}>
                            <stat.icon className={`w-5 h-5 ${stat.color}`} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.12em] truncate">{stat.label}</p>
                            <div className="flex items-baseline gap-2 mt-1">
                                <p className="text-3xl font-black text-slate-900 leading-none">{stat.value}</p>
                                <span className="hidden lg:inline text-xs text-slate-400 truncate">{stat.note}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Content: Map View or Table View */}
            {viewMode === 'map' ? (
                <BookingsOverviewMap
                    bookings={data?.data || []}
                    onSelectBooking={(b) => setSelectedBooking(b)}
                    height="640px"
                />
            ) : (
                /* Table with Dedicated Tour Date (Actual booking date) & Submission Date */
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50/90 border-b border-slate-200">
                                <tr>
                                    <th className="px-5 py-4 font-bold tracking-wider">Booking Ref</th>
                                    <th className="px-5 py-4 font-bold tracking-wider text-sky-900">
                                        <span className="flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5 text-sky-600" />
                                            Tour Date
                                        </span>
                                    </th>
                                    <th className="px-5 py-4 font-bold tracking-wider">Booked On</th>
                                    <th className="px-5 py-4 font-bold tracking-wider">Customer</th>
                                    <th className="px-5 py-4 font-bold tracking-wider">Package</th>
                                    <th className="px-3 py-4 font-bold tracking-wider text-center">Pax</th>
                                    <th className="px-4 py-4 font-bold tracking-wider">Amount</th>
                                    <th className="px-4 py-4 font-bold tracking-wider">Payment</th>
                                    <th className="px-4 py-4 font-bold tracking-wider">Status</th>
                                    <th className="px-5 py-4 font-bold tracking-wider text-center">Checking & Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            {[...Array(10)].map((_, j) => (
                                                <td key={j} className="px-5 py-4">
                                                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : !data?.data || data.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="px-6 py-16 text-center">
                                            <CalendarCheck className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                            <p className="font-semibold text-slate-500">No bookings found</p>
                                            <p className="text-sm text-slate-400 mt-1">Try adjusting your search or filter.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    data?.data?.map(b => {
                                        const customerName = b.customer?.name || b.guest_name || 'Guest Customer';
                                        const customerEmail = b.customer?.email || b.guest_email || b.guest_phone || '';
                                        const isGuest = !b.customer && !!b.guest_name;
                                        const isFullyPaid = Number(b.remaining_balance) === 0 && (b.payment_status === 'verified' || (b.payment_status as string) === 'paid');
                                        const hasPendingPayment = b.payments?.some(p => p.status === 'submitted');
                                        const isPendingBooking = b.booking_status === 'pending';

                                        // Format Actual Tour Date (Schedule Departure Date)
                                        const tourDateFormatted = formatTourDate(b.schedule?.departure_date);

                                        // Format Creation Date (Booked on timestamp)
                                        const bookedOnDate = b.created_at
                                            ? new Date(b.created_at).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })
                                            : '—';

                                        return (
                                            <tr
                                                key={b.id}
                                                onClick={() => setSelectedBooking(b)}
                                                className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                                            >
                                                {/* 1. Booking Reference */}
                                                <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-mono font-bold text-xs text-slate-800 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                                                            {b.booking_reference}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => copyToClipboard(b.booking_reference)}
                                                            className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                                                            title="Copy Reference"
                                                        >
                                                            {copiedRef === b.booking_reference ? (
                                                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                                            ) : (
                                                                <Copy className="w-3.5 h-3.5" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </td>

                                                {/* 2. Actual Tour Date (Travel Date - Not Today's Date) */}
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0 border border-sky-100">
                                                            <Calendar className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-900 text-xs sm:text-sm">
                                                                {tourDateFormatted || 'Date not set'}
                                                            </p>
                                                            {b.schedule?.start_time && (
                                                                <p className="text-[11px] text-slate-500 font-medium">
                                                                    {b.schedule.start_time.substring(0, 5)}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* 3. Booked On (Date reservation was made) */}
                                                <td className="px-5 py-4">
                                                    <div>
                                                        <p className="text-xs text-slate-700 font-medium">{bookedOnDate}</p>
                                                        <p className="text-[10px] text-slate-400">
                                                            {b.created_at ? new Date(b.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''}
                                                        </p>
                                                    </div>
                                                </td>

                                                {/* 4. Customer */}
                                                <td className="px-5 py-4 max-w-[200px]">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${isGuest ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-600'}`}>
                                                            {customerName.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-1.5 truncate">
                                                                <p className="font-bold text-slate-800 text-xs truncate">{customerName}</p>
                                                                {isGuest && (
                                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                                                                        Guest
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-[11px] text-slate-400 truncate">{customerEmail}</p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* 5. Package */}
                                                <td className="px-5 py-4 max-w-[190px]">
                                                    <p className="font-bold text-slate-800 text-xs truncate">{b.schedule?.package?.title}</p>
                                                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{b.schedule?.package?.location || b.schedule?.package?.destination}</p>
                                                </td>

                                                {/* 6. Pax */}
                                                <td className="px-3 py-4 text-center">
                                                    <span className="font-bold text-slate-800 text-xs bg-slate-100 px-2 py-1 rounded-md">
                                                        {b.participants_count} pax
                                                    </span>
                                                </td>

                                                {/* 7. Amount */}
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <p className="font-extrabold text-slate-900 text-xs sm:text-sm">₱{Number(b.total_amount).toLocaleString()}</p>
                                                    {Number(b.remaining_balance) > 0 ? (
                                                        <p className="text-[10px] font-bold text-rose-500 mt-0.5">Bal: ₱{Number(b.remaining_balance).toLocaleString()}</p>
                                                    ) : (
                                                        <p className="text-[10px] font-semibold text-emerald-600 mt-0.5">Paid in full</p>
                                                    )}
                                                </td>

                                                {/* 8. Payment Status */}
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col gap-1 items-start">
                                                        <StatusBadge status={isFullyPaid ? 'paid' : b.payment_status} type="payment" />
                                                        {hasPendingPayment && (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-700 bg-amber-100/70 border border-amber-200 px-1.5 py-0.5 rounded">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                                                                Verify Receipt
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* 9. Booking Status */}
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <StatusBadge status={b.booking_status} />
                                                </td>

                                                {/* 10. Checking & Professional Action Column */}
                                                <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-center gap-2">
                                                        {/* Primary Check & Review Button */}
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedBooking(b)}
                                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border shadow-2xs transition-all ${
                                                                isPendingBooking
                                                                    ? 'bg-sky-600 text-white border-sky-600 hover:bg-sky-700 hover:shadow-xs'
                                                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                                                            }`}
                                                            title="Inspect booking, check details, and approve/reject"
                                                        >
                                                            {isPendingBooking ? (
                                                                <>
                                                                    <CheckSquare className="w-3.5 h-3.5" /> Check & Review
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Eye className="w-3.5 h-3.5 text-slate-500" /> View Details
                                                                </>
                                                            )}
                                                        </button>

                                                        {/* Quick Receipt Viewer if submitted */}
                                                        {b.payments && b.payments.length > 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setPaymentViewBooking(b)}
                                                                title="View payment receipts"
                                                                className="inline-flex items-center justify-center p-1.5 text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                                                            >
                                                                <PesoIcon className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}

                                                        {/* Quick Delete for Agency Admin */}
                                                        {!isSuperAdmin && user?.role === 'agency_admin' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => requestDelete(b)}
                                                                title="Delete booking"
                                                                className="inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition-colors"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {data && data.last_page > 1 && (
                        <div className="border-t border-slate-100 px-6 py-4 flex items-center justify-between bg-slate-50/50">
                            <span className="text-sm text-slate-500">
                                Page <strong className="text-slate-700">{data.current_page}</strong> of <strong className="text-slate-700">{data.last_page}</strong>
                                <span className="ml-2 text-slate-400">({data.total} total)</span>
                            </span>
                            <div className="flex gap-2">
                                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                                    className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white disabled:opacity-40 text-slate-600 hover:bg-slate-50 transition-colors font-medium">
                                    <ChevronLeft className="w-4 h-4" /> Prev
                                </button>
                                <button disabled={page === data.last_page} onClick={() => setPage(p => p + 1)}
                                    className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white disabled:opacity-40 text-slate-600 hover:bg-slate-50 transition-colors font-medium">
                                    Next <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                PROFESSIONAL BOOKING REVIEW & APPROVAL INSPECTOR MODAL
            ═══════════════════════════════════════════════════════════════ */}
            {selectedBooking && (() => {
                const b = selectedBooking;
                const customerName = b.customer?.name || b.guest_name || 'Guest Customer';
                const customerEmail = b.customer?.email || b.guest_email || '';
                const customerPhone = b.guest_phone || b.customer?.phone || '';
                const isGuest = !b.customer && !!b.guest_name;
                const isFullyPaid = Number(b.remaining_balance) === 0 && (b.payment_status === 'verified' || (b.payment_status as string) === 'paid');
                const hasAdvancePaid = Number(b.advance_paid_amount) >= Number(b.required_advance_amount);
                const hasPendingReceipt = b.payments?.some(p => p.status === 'submitted');

                const actualTourDate = formatTourDate(b.schedule?.departure_date, true);

                const bookedOnTime = b.created_at
                    ? new Date(b.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                    })
                    : '—';

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in duration-150">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
                            {/* Modal Header */}
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-sky-50/40">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-sky-600 text-white flex items-center justify-center font-bold shadow-xs">
                                        <CheckSquare className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-lg font-black text-slate-900">Review Booking</h2>
                                            <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                                                {b.booking_reference}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Submitted on {bookedOnTime}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <StatusBadge status={b.booking_status} />
                                    <button
                                        onClick={() => setSelectedBooking(null)}
                                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Body */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* 1. Tour Schedule Highlight (The Actual Booking Date) */}
                                <div className="p-4 rounded-2xl border-2 border-sky-100 bg-gradient-to-r from-sky-50/70 to-blue-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                                    <div className="flex items-start gap-3.5">
                                        <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                                            <Calendar className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <span className="text-[11px] font-extrabold uppercase tracking-wider text-sky-800 bg-sky-100 px-2 py-0.5 rounded-full">
                                                Actual Tour / Travel Date
                                            </span>
                                            <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1">
                                                {actualTourDate}
                                            </h3>
                                            <p className="text-xs text-slate-600 mt-0.5">
                                                {b.schedule?.package?.title} • {b.schedule?.start_time ? `Departure: ${b.schedule.start_time.substring(0, 5)}` : 'Standard Departure'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-white px-4 py-2.5 rounded-xl border border-sky-200/80 text-center sm:text-right shrink-0 shadow-2xs">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Participants</span>
                                        <span className="text-lg font-black text-slate-900">{b.participants_count} Persons</span>
                                    </div>
                                </div>

                                {/* 2. Customer & Package Details */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Customer Card */}
                                    <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                                <UserIcon className="w-3.5 h-3.5 text-slate-400" /> Customer Information
                                            </h4>
                                            {isGuest ? (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                                    Guest Booking
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                    Registered User
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-2xl font-bold flex items-center justify-center shrink-0 ${isGuest ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-700'}`}>
                                                {customerName.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-900 text-sm truncate">{customerName}</p>
                                                {customerEmail && (
                                                    <a href={`mailto:${customerEmail}`} className="text-xs text-sky-700 hover:underline flex items-center gap-1 truncate mt-0.5">
                                                        <Mail className="w-3 h-3" /> {customerEmail}
                                                    </a>
                                                )}
                                                {customerPhone && (
                                                    <a href={`tel:${customerPhone}`} className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 mt-0.5 font-medium">
                                                        <Phone className="w-3 h-3" /> {customerPhone}
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Package Destination Card */}
                                    <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 space-y-2">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                            <PackageIcon className="w-3.5 h-3.5 text-slate-400" /> Tour Destination
                                        </h4>
                                        <p className="font-bold text-slate-900 text-sm leading-snug">{b.schedule?.package?.title}</p>
                                        <p className="text-xs text-slate-500">
                                            {b.schedule?.package?.location || b.schedule?.package?.destination || 'Siargao Island, Surigao del Norte'}
                                        </p>
                                        {b.special_requests && (
                                            <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-slate-600">
                                                <strong className="text-slate-800">Special Requests: </strong>
                                                <span>{b.special_requests}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 3. Payment Status & Financial Breakdown */}
                                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                                    <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <CreditCard className="w-4 h-4 text-sky-600" />
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Financial & Payment Status</h4>
                                        </div>
                                        <StatusBadge status={isFullyPaid ? 'paid' : b.payment_status} type="payment" />
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 bg-white">
                                        <div className="p-4 text-center">
                                            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Total Amount</p>
                                            <p className="text-lg font-black text-slate-900 mt-1">₱{Number(b.total_amount).toLocaleString()}</p>
                                        </div>
                                        <div className="p-4 text-center">
                                            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Required 50% Advance</p>
                                            <p className="text-lg font-black text-sky-700 mt-1">₱{Number(b.required_advance_amount).toLocaleString()}</p>
                                        </div>
                                        <div className="p-4 text-center">
                                            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Amount Paid</p>
                                            <p className="text-lg font-black text-emerald-600 mt-1">₱{Number(b.advance_paid_amount).toLocaleString()}</p>
                                        </div>
                                        <div className="p-4 text-center">
                                            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Remaining Balance</p>
                                            <p className={`text-lg font-black mt-1 ${Number(b.remaining_balance) > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                                                ₱{Number(b.remaining_balance).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* 4. Submitted Payment Receipts & Verification */}
                                {b.payments && b.payments.length > 0 && (
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                            <PesoIcon className="w-4 h-4 text-indigo-600" /> Submitted Payment Receipts ({b.payments.length})
                                        </h4>
                                        <div className="space-y-3">
                                            {b.payments.map((p, idx) => (
                                                <div key={p.id} className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
                                                    <div className="px-4 py-3 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                                                        <div>
                                                            <span className="font-bold text-xs text-slate-800">
                                                                Payment #{idx + 1} • ₱{Number(p.amount).toLocaleString()}
                                                            </span>
                                                            {p.payment_reference && (
                                                                <span className="ml-2 font-mono text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                                                    Ref: {p.payment_reference}
                                                                </span>
                                                            )}
                                                            <span className="ml-2 text-[11px] text-slate-400">
                                                                {p.created_at ? new Date(p.created_at).toLocaleDateString() : ''}
                                                            </span>
                                                        </div>
                                                        <StatusBadge status={p.status} type="payment" />
                                                    </div>

                                                    <div className="p-4 flex flex-col sm:flex-row items-center gap-4">
                                                        {p.proof_of_payment_path ? (
                                                            <a
                                                                href={storageUrl(p.proof_of_payment_path)}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="relative group block rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0"
                                                            >
                                                                <img
                                                                    src={storageUrl(p.proof_of_payment_path)}
                                                                    alt="Payment proof"
                                                                    className="w-40 h-28 object-contain"
                                                                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                                />
                                                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-1">
                                                                    <ExternalLink className="w-3.5 h-3.5" /> Full Image
                                                                </div>
                                                            </a>
                                                        ) : (
                                                            <div className="w-40 h-24 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-xs shrink-0">
                                                                No image uploaded
                                                            </div>
                                                        )}

                                                        <div className="flex-1 space-y-2 text-center sm:text-left">
                                                            <p className="text-xs text-slate-600">
                                                                {p.status === 'submitted'
                                                                    ? 'This receipt was submitted by the customer and needs your review. Confirm the amount in your GCash / bank account before verifying.'
                                                                    : `Receipt status: ${p.status}.`}
                                                            </p>

                                                            {/* Verification Actions inside Receipt */}
                                                            {p.status === 'submitted' && (
                                                                <div className="flex flex-wrap items-center gap-2 pt-1 justify-center sm:justify-start">
                                                                    <button
                                                                        type="button"
                                                                        disabled={verifyingPaymentId === p.id}
                                                                        onClick={() => {
                                                                            setConfirmAction({
                                                                                isOpen: true,
                                                                                title: 'Verify Payment Receipt',
                                                                                message: `Verify ₱${Number(p.amount).toLocaleString()} from ${customerName}? This will confirm the booking.`,
                                                                                isDanger: false,
                                                                                onConfirm: () => handleVerifyPayment(p.id, 'verified')
                                                                            });
                                                                        }}
                                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors disabled:opacity-50"
                                                                    >
                                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                                        {verifyingPaymentId === p.id ? 'Verifying...' : 'Verify Receipt'}
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        disabled={verifyingPaymentId === p.id}
                                                                        onClick={() => {
                                                                            setConfirmAction({
                                                                                isOpen: true,
                                                                                title: 'Reject Payment Receipt',
                                                                                message: 'Are you sure you want to reject this payment receipt? The customer will be notified to resubmit.',
                                                                                isDanger: true,
                                                                                onConfirm: () => handleVerifyPayment(p.id, 'rejected')
                                                                            });
                                                                        }}
                                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg transition-colors disabled:opacity-50"
                                                                    >
                                                                        <XCircle className="w-3.5 h-3.5" />
                                                                        {verifyingPaymentId === p.id ? 'Rejecting...' : 'Reject Receipt'}
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Cash Advance Recording (if cash booking and unpaid) */}
                                {!isSuperAdmin && b.booking_status === 'pending' && b.payment_status === 'unpaid' && b.payment_method === 'cash' && (
                                    <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <span className="p-1 rounded-lg bg-emerald-100 text-emerald-800">
                                                <CreditCard className="w-4 h-4" />
                                            </span>
                                            <div>
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-950">Record In-Office Cash Payment</h4>
                                                <p className="text-xs text-emerald-800">Only record cash after receiving money at your office counter.</p>
                                            </div>
                                        </div>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={cashAmount}
                                                onChange={e => setCashAmount(e.target.value)}
                                                placeholder={`Amount (₱${Number(b.required_advance_amount).toLocaleString()})`}
                                                className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                            />
                                            <input
                                                value={cashReference}
                                                onChange={e => setCashReference(e.target.value)}
                                                placeholder="Counter receipt # (optional)"
                                                className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => recordCashAdvance.mutate(b)}
                                            disabled={recordCashAdvance.isPending || !cashAmount}
                                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors shadow-2xs"
                                        >
                                            {recordCashAdvance.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                            Record & Verify Cash Advance
                                        </button>
                                    </section>
                                )}

                                {/* Destination Location Map */}
                                <BookingLocationMap booking={b} compact={true} />
                            </div>

                            {/* Modal Footer / Professional Decision Bar */}
                            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
                                {/* Left Action / Info */}
                                <div className="text-xs text-slate-500 text-center sm:text-left">
                                    {b.booking_status === 'pending' ? (
                                        hasAdvancePaid ? (
                                            <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                Advance payment verified! Booking is ready to approve.
                                            </span>
                                        ) : hasPendingReceipt ? (
                                            <span className="text-amber-800 font-bold flex items-center gap-1.5">
                                                <AlertCircle className="w-4 h-4 text-amber-600" />
                                                Please review and verify the submitted payment receipt above.
                                            </span>
                                        ) : (
                                            <span className="text-slate-600">
                                                Awaiting 50% advance payment from customer before confirmation.
                                            </span>
                                        )
                                    ) : b.booking_status === 'confirmed' ? (
                                        <span className="text-sky-700 font-bold flex items-center gap-1.5">
                                            <CheckCircle2 className="w-4 h-4 text-sky-600" />
                                            Booking is confirmed for {actualTourDate}.
                                        </span>
                                    ) : (
                                        <span>Status: {b.booking_status}</span>
                                    )}
                                </div>

                                {/* Right Decision Buttons */}
                                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedBooking(null)}
                                        className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Payment / Receipt Quick Modal */}
            {paymentViewBooking && (() => {
                const pvb = paymentViewBooking;
                const isFullyPaid = Number(pvb.remaining_balance) === 0 && (pvb.payment_status === 'verified' || (pvb.payment_status as string) === 'paid');
                const payments = pvb.payments ?? [];
                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                            {/* Header */}
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                                        <PesoIcon className="w-4.5 h-4.5 text-indigo-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-bold text-slate-800">Payment Receipt</h2>
                                        <p className="text-xs font-mono text-slate-400 mt-0.5">{pvb.booking_reference}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <StatusBadge status={isFullyPaid ? 'paid' : pvb.payment_status} type="payment" />
                                    <button
                                        onClick={() => setPaymentViewBooking(null)}
                                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Summary bar */}
                            <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50">
                                <div className="px-4 py-3 text-center">
                                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Total</p>
                                    <p className="text-sm font-black text-slate-800 mt-0.5">₱{Number(pvb.total_amount).toLocaleString()}</p>
                                </div>
                                <div className="px-4 py-3 text-center">
                                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Paid</p>
                                    <p className="text-sm font-black text-emerald-600 mt-0.5">₱{Number(pvb.advance_paid_amount).toLocaleString()}</p>
                                </div>
                                <div className="px-4 py-3 text-center">
                                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Balance</p>
                                    <p className={`text-sm font-black mt-0.5 ${Number(pvb.remaining_balance) > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                                        ₱{Number(pvb.remaining_balance).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            {/* Payment records */}
                            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                {payments.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <ImageOff className="w-10 h-10 text-slate-200 mb-3" />
                                        <p className="text-sm font-semibold text-slate-400">No payment submitted yet</p>
                                        <p className="text-xs text-slate-300 mt-1">The customer has not uploaded a receipt.</p>
                                    </div>
                                ) : (
                                    payments.map((p, idx) => (
                                        <div key={p.id} className="border border-slate-200 rounded-xl overflow-hidden">
                                            {/* Payment meta */}
                                            <div className="px-4 py-3 bg-slate-50 flex items-center justify-between gap-2 border-b border-slate-100">
                                                <div>
                                                    <p className="text-xs font-bold text-slate-700">
                                                        Payment #{idx + 1}
                                                        {p.payment_type && (
                                                            <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 capitalize">
                                                                {p.payment_type === 'advance' ? '50% Advance' : p.payment_type === 'balance' ? 'Balance' : p.payment_type}
                                                            </span>
                                                        )}
                                                    </p>
                                                    {p.payment_reference && (
                                                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">Ref: {p.payment_reference}</p>
                                                    )}
                                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                                        {p.created_at ? new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col items-end gap-1.5">
                                                    <p className="text-base font-black text-slate-800">₱{Number(p.amount).toLocaleString()}</p>
                                                    <StatusBadge status={p.status} type="payment" />
                                                </div>
                                            </div>
                                            {/* Receipt image / link */}
                                            {p.proof_of_payment_path ? (
                                                <a
                                                    href={storageUrl(p.proof_of_payment_path)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block group relative"
                                                >
                                                    <img
                                                        src={storageUrl(p.proof_of_payment_path)}
                                                        alt="Payment receipt"
                                                        className="w-full max-h-64 object-contain bg-slate-100"
                                                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                    />
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                        <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-full shadow">
                                                            Open full image ↗
                                                        </span>
                                                    </div>
                                                </a>
                                            ) : (
                                                <div className="flex items-center justify-center py-8 bg-slate-50">
                                                    <div className="text-center">
                                                        <ImageOff className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                                        <p className="text-xs text-slate-400 font-medium">No receipt image uploaded</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                                <button
                                    onClick={() => setPaymentViewBooking(null)}
                                    className="px-5 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Custom Confirm Modal */}
            {confirmAction && (
                <ConfirmModal
                    isOpen={confirmAction.isOpen}
                    title={confirmAction.title}
                    message={confirmAction.message}
                    isDanger={confirmAction.isDanger}
                    isLoading={deleteBooking.isPending}
                    confirmText={confirmAction.isDanger ? 'Delete booking' : 'Confirm'}
                    onConfirm={confirmAction.onConfirm}
                    onCancel={closeConfirm}
                />
            )}
        </div>
    );
}
