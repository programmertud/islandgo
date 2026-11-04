import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router';
import {
    TicketCheck, Search, Loader2, ArrowRight, MapPin,
    Calendar, Users, AlertCircle, CheckCircle, Clock,
    RefreshCw, Smartphone, Copy, Check, Upload, ChevronDown,
    ChevronUp, QrCode,
} from 'lucide-react';
import { guestApi } from '../lib/api';
import type { FormEvent } from 'react';
import type { GuestBookingLookupResponse } from '../types';
import DestinationMap from '../components/maps/DestinationMap';

// Status display helpers
const BOOKING_STATUS_LABELS: Record<string, { label: string; color: string }> = {
    pending:   { label: 'Pending Review', color: 'bg-amber-100 text-amber-800' },
    confirmed: { label: 'Confirmed',      color: 'bg-green-100 text-green-800' },
    rejected:  { label: 'Not Approved',   color: 'bg-red-100 text-red-800' },
    cancelled: { label: 'Cancelled',      color: 'bg-slate-100 text-slate-600' },
    completed: { label: 'Completed',      color: 'bg-blue-100 text-blue-800' },
    expired:   { label: 'Expired',        color: 'bg-slate-100 text-slate-500' },
};

const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
    unpaid:       { label: 'Unpaid',            color: 'bg-red-100 text-red-700' },
    submitted:    { label: 'Payment Submitted', color: 'bg-blue-100 text-blue-700' },
    under_review: { label: 'Under Review',      color: 'bg-purple-100 text-purple-700' },
    verified:     { label: 'Payment Verified',  color: 'bg-green-100 text-green-700' },
    rejected:     { label: 'Payment Rejected',  color: 'bg-red-100 text-red-700' },
};

function maskEmail(val: string): string {
    if (!val || !val.includes('@')) return val;
    const [local, domain] = val.trim().split('@');
    if (!local || !domain) return val;
    if (local.length <= 2) {
        return `${local[0]}***@${domain}`;
    }
    return `${local[0]}${'*'.repeat(Math.min(local.length - 2, 4))}${local[local.length - 1]}@${domain}`;
}

export default function TrackBooking() {
    const [searchParams] = useSearchParams();
    const [reference, setReference] = useState(searchParams.get('ref') ?? '');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [booking, setBooking] = useState<GuestBookingLookupResponse | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [serverError, setServerError] = useState('');
    const [hasSearched, setHasSearched] = useState(false);
    const [isFormCollapsed, setIsFormCollapsed] = useState(false);
    const [copiedGcash, setCopiedGcash] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [gcashRefNumber, setGcashRefNumber] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadSuccessMessage, setUploadSuccessMessage] = useState('');
    const [uploadErrorMessage, setUploadErrorMessage] = useState('');
    const [trackPaymentOption, setTrackPaymentOption] = useState<'advance' | 'full'>('advance');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setUploadFile(e.target.files[0]);
            setUploadErrorMessage('');
        }
    };

    const handleUploadPayment = async () => {
        if (!uploadFile) {
            setUploadErrorMessage('Please select a receipt screenshot.');
            return;
        }
        if (!gcashRefNumber.trim()) {
            setUploadErrorMessage('Please enter the GCash reference number.');
            return;
        }
        if (!booking) return;

        setUploading(true);
        setUploadErrorMessage('');
        setUploadSuccessMessage('');

        try {
            const formData = new FormData();
            formData.append('booking_reference', booking.booking_reference);
            formData.append('guest_email', email.trim());
            formData.append('payment_method', 'gcash');
            formData.append('gcash_reference', gcashRefNumber.trim());
            formData.append('proof_of_payment', uploadFile);
            formData.append('payment_option', trackPaymentOption);

            const res = await guestApi.uploadPayment(formData);
            setUploadSuccessMessage(res.data.message || 'Payment submitted successfully!');
            setBooking(prev => prev ? { ...prev, payment_status: 'submitted' } : null);
            setUploadFile(null);
            setGcashRefNumber('');
        } catch (err: any) {
            setUploadErrorMessage(err.response?.data?.message || 'Failed to submit payment. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const copyGcash = (num: string) => {
        navigator.clipboard.writeText(num.replace(/\s+/g, '')).then(() => {
            setCopiedGcash(true);
            setTimeout(() => setCopiedGcash(false), 2000);
        });
    };

    // If ref is pre-filled from URL, update state
    const refFromUrl = searchParams.get('ref');
    useEffect(() => {
        if (refFromUrl) {
            setReference(refFromUrl);
        }
    }, [refFromUrl]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const ref = reference.trim().toUpperCase();
        const em = email.trim();
        if (!ref || !em) return;

        setLoading(true);
        setNotFound(false);
        setServerError('');
        setHasSearched(true);

        try {
            const res = await guestApi.lookup(ref, em);
            setBooking(res.data);
            setIsFormCollapsed(true);
            if (res.data.required_advance_amount >= res.data.total_amount) {
                setTrackPaymentOption('full');
            } else {
                setTrackPaymentOption('advance');
            }
        } catch (err: unknown) {
            const status = (err as { response?: { status?: number } })?.response?.status;
            if (status === 404) {
                setNotFound(true);
            } else if (status === 429) {
                setServerError('Too many lookup attempts. Please wait a moment before trying again.');
            } else {
                setServerError('Something went wrong. Please check your connection and try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const resetSearch = () => {
        setBooking(null);
        setNotFound(false);
        setServerError('');
        setHasSearched(false);
        setIsFormCollapsed(false);
        setReference('');
        setEmail('');
        setUploadFile(null);
        setGcashRefNumber('');
        setUploadSuccessMessage('');
        setUploadErrorMessage('');
    };

    const bookingStatus = booking ? BOOKING_STATUS_LABELS[booking.booking_status] ?? { label: booking.booking_status, color: 'bg-slate-100 text-slate-600' } : null;
    const paymentStatus = booking ? PAYMENT_STATUS_LABELS[booking.payment_status] ?? { label: booking.payment_status, color: 'bg-slate-100 text-slate-600' } : null;

    const remainingBalance = booking ? (booking.remaining_balance ?? Math.max(0, booking.total_amount - booking.advance_paid_amount)) : 0;
    const isFullyPaid = booking ? (remainingBalance <= 0 || booking.booking_status === 'completed') : false;
    const unpaidDueAmount = booking ? (trackPaymentOption === 'full' ? booking.total_amount : (booking.required_advance_amount > 0 && booking.required_advance_amount < booking.total_amount ? booking.required_advance_amount : Math.round(booking.total_amount * 0.5))) : 0;
    const currentDueAmount = booking ? (booking.booking_status === 'confirmed' ? remainingBalance : unpaidDueAmount) : 0;
    const showGcashPanel = booking ? (((booking.payment_status === 'unpaid' && booking.payment_method !== 'cash') || (booking.booking_status === 'confirmed' && remainingBalance > 0))) : false;

    const departureDate = booking?.schedule?.departure_date
        ? new Date(booking.schedule.departure_date).toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
          })
        : null;

    const paymentDeadline = booking?.payment_deadline
        ? new Date(booking.payment_deadline).toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
          })
        : null;

    const googleMapsUrl = booking?.tour?.latitude && booking?.tour?.longitude
        ? `https://www.google.com/maps/search/?api=1&query=${booking.tour.latitude},${booking.tour.longitude}`
        : booking?.tour?.destination_address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.tour.destination_address)}`
        : null;

    const hasCoordinates = Boolean(booking?.tour?.latitude && booking?.tour?.longitude);

    return (
        <div className="relative min-h-screen bg-[#FAFAF9] pt-16 overflow-x-hidden">
            {/* Subtle sky-blue gradient wash behind the upper portion */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-sky-100/50 via-sky-50/20 to-transparent"
            />

            <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6">
                {/* Section 3: Compact Page Header */}
                <div className="mb-5 flex items-center justify-between gap-4 pb-4 border-b border-slate-200/60">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <TicketCheck className="w-5 h-5 text-sky-400" aria-hidden="true" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                                Track Your Booking
                            </h1>
                            <p className="text-xs sm:text-sm text-slate-500">
                                Check your booking and payment status, view schedule, and submit receipts.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main 2-Column Responsive Dashboard Shell */}
                <div className="lg:grid lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)] lg:items-start lg:gap-6">
                    {/* Section 4: Booking Lookup Sidebar */}
                    <aside className="w-full lg:sticky lg:top-20 lg:self-start mb-6 lg:mb-0">
                        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
                            {/* Collapsed state after successful lookup */}
                            {isFormCollapsed && booking ? (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                            Active Lookup
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setIsFormCollapsed(false)}
                                            className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-lg border border-sky-200/80 transition-colors"
                                        >
                                            Change
                                            <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                                        </button>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/60 space-y-1.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Ref</span>
                                            <span className="font-mono text-xs font-extrabold text-slate-900 truncate">
                                                {booking.booking_reference}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Email</span>
                                            <span className="text-xs text-slate-600 truncate max-w-[170px]" title={email}>
                                                {maskEmail(email)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* Expanded lookup form */
                                <form
                                    onSubmit={handleSubmit}
                                    className="space-y-3"
                                    aria-label="Booking lookup"
                                >
                                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                            Find Booking
                                        </span>
                                        {booking && (
                                            <button
                                                type="button"
                                                onClick={() => setIsFormCollapsed(true)}
                                                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800"
                                            >
                                                Keep Current
                                                <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                                            </button>
                                        )}
                                    </div>

                                    <div>
                                        <label htmlFor="booking-reference" className="block text-xs font-bold text-slate-700 mb-1">
                                            Booking Reference
                                        </label>
                                        <input
                                            id="booking-reference"
                                            type="text"
                                            value={reference}
                                            onChange={e => setReference(e.target.value.toUpperCase())}
                                            placeholder="BK-XXXXXXXX"
                                            autoComplete="off"
                                            spellCheck={false}
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 uppercase transition-colors"
                                            required
                                            aria-describedby="reference-hint"
                                        />
                                        <p id="reference-hint" className="mt-1 text-[11px] text-slate-400">
                                            Format: BK-XXXXXXXX (from confirmation)
                                        </p>
                                    </div>

                                    <div>
                                        <label htmlFor="booking-email" className="block text-xs font-bold text-slate-700 mb-1">
                                            Email Address
                                        </label>
                                        <input
                                            id="booking-email"
                                            type="email"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            placeholder="you@email.com"
                                            autoComplete="email"
                                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-colors"
                                            required
                                        />
                                    </div>

                                    {/* Sidebar error messages */}
                                    {hasSearched && notFound && (
                                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs space-y-1">
                                            <div className="flex items-center gap-1.5 font-bold">
                                                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                                <span>Booking Not Found</span>
                                            </div>
                                            <p className="text-[11px] text-amber-700 leading-relaxed">
                                                No booking matched reference <strong className="font-mono">{reference}</strong> with that email. Please double-check both and try again.
                                            </p>
                                        </div>
                                    )}

                                    {serverError && (
                                        <div className="p-3 rounded-xl bg-red-50 border border-red-200/80 text-red-900 text-xs space-y-1">
                                            <div className="flex items-center gap-1.5 font-bold">
                                                <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                                                <span>Lookup Notice</span>
                                            </div>
                                            <p className="text-[11px] text-red-700 leading-relaxed">{serverError}</p>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm shadow-xs"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                                                Looking up booking…
                                            </>
                                        ) : (
                                            <>
                                                <Search className="w-4 h-4" aria-hidden="true" />
                                                Track Booking
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}

                            {/* Help and empty state inside sidebar (when no booking) */}
                            {!booking && (
                                <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-2">
                                    <div className="flex items-start gap-2">
                                        <TicketCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
                                        <p className="leading-snug">
                                            Reference format: <span className="font-mono font-bold text-slate-700">BK-XXXXXXXX</span>
                                        </p>
                                    </div>
                                    <p className="text-slate-400 pl-6 text-[11px] leading-snug">
                                        Shown on your confirmation screen and sent to your email.
                                    </p>
                                    <div className="pt-1 pl-6 text-xs">
                                        <span className="text-slate-400">Haven't booked yet? </span>
                                        <Link to="/tours" className="text-sky-600 font-semibold hover:underline">
                                            Browse tours
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    </aside>

                    {/* Main Content Area */}
                    <main className="w-full min-w-0">
                        {/* Section 6: Skeleton Loading State */}
                        {loading ? (
                            <div className="space-y-4" aria-busy="true" aria-label="Looking up booking details">
                                <div className="grid grid-cols-1 md:grid-cols-2 items-start gap-4">
                                    {/* Skeleton 1: Booking Details */}
                                    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm space-y-4">
                                        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                                            <div className="space-y-1.5">
                                                <div className="skeleton h-3 w-24 rounded" />
                                                <div className="skeleton h-6 w-36 rounded" />
                                            </div>
                                            <div className="skeleton h-6 w-24 rounded-full" />
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="skeleton h-7 w-7 rounded-lg shrink-0" />
                                                <div className="space-y-1.5 flex-1">
                                                    <div className="skeleton h-4 w-3/4 rounded" />
                                                    <div className="skeleton h-3 w-1/3 rounded" />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2.5">
                                                <div className="skeleton h-7 w-7 rounded-lg shrink-0" />
                                                <div className="skeleton h-4 w-1/2 rounded" />
                                            </div>
                                            <div className="flex items-center gap-2.5">
                                                <div className="skeleton h-7 w-7 rounded-lg shrink-0" />
                                                <div className="skeleton h-4 w-2/3 rounded" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Skeleton 2: Payment Summary */}
                                    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm space-y-3">
                                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                            <div className="skeleton h-3 w-32 rounded" />
                                            <div className="skeleton h-6 w-24 rounded-full" />
                                        </div>
                                        <div className="space-y-3 pt-1">
                                            <div className="flex justify-between">
                                                <div className="skeleton h-4 w-24 rounded" />
                                                <div className="skeleton h-4 w-20 rounded" />
                                            </div>
                                            <div className="flex justify-between">
                                                <div className="skeleton h-4 w-28 rounded" />
                                                <div className="skeleton h-4 w-20 rounded" />
                                            </div>
                                            <div className="flex justify-between">
                                                <div className="skeleton h-4 w-24 rounded" />
                                                <div className="skeleton h-4 w-20 rounded" />
                                            </div>
                                            <div className="flex justify-between">
                                                <div className="skeleton h-4 w-28 rounded" />
                                                <div className="skeleton h-4 w-20 rounded" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Skeleton 3: Action / Map Placeholder */}
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm space-y-3">
                                        <div className="skeleton h-5 w-40 rounded" />
                                        <div className="skeleton h-52 w-full rounded-xl" />
                                    </div>
                                    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm space-y-3">
                                        <div className="skeleton h-5 w-40 rounded" />
                                        <div className="skeleton h-52 w-full rounded-xl" />
                                    </div>
                                </div>
                            </div>
                        ) : booking && bookingStatus && paymentStatus ? (
                            /* Section 5: Professional Dashboard Layout */
                            <div className="space-y-4">
                                {/* Row 1: High-level Booking & Financial Overview (Side-by-side) */}
                                <div className="grid grid-cols-1 md:grid-cols-2 items-start gap-4">
                                    {/* Card 1 — Booking Details */}
                                    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm space-y-4">
                                        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                                            <div>
                                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-0.5">
                                                    Booking Details
                                                </p>
                                                <p className="font-mono text-lg sm:text-xl font-extrabold text-slate-900 tracking-wide truncate">
                                                    {booking.booking_reference}
                                                </p>
                                            </div>
                                            {/* Status chip with leading indicator dot */}
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${bookingStatus.color}`}>
                                                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden="true" />
                                                <span>{bookingStatus.label}</span>
                                            </span>
                                        </div>

                                        <div className="space-y-3 text-sm">
                                            <div className="flex items-start gap-2.5 text-slate-700">
                                                <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 mt-0.5">
                                                    <TicketCheck className="w-4 h-4" aria-hidden="true" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-slate-900 truncate">{booking.tour.title}</p>
                                                    {booking.tour.agency_name && (
                                                        <p className="text-slate-400 text-xs">Organized by {booking.tour.agency_name}</p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2.5 text-slate-600">
                                                <div className="w-7 h-7 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center shrink-0">
                                                    <MapPin className="w-4 h-4 text-slate-400" aria-hidden="true" />
                                                </div>
                                                <span className="truncate">{booking.tour.destination_name || booking.tour.destination}</span>
                                            </div>

                                            {departureDate && (
                                                <div className="flex items-center gap-2.5 text-slate-600">
                                                    <div className="w-7 h-7 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center shrink-0">
                                                        <Calendar className="w-4 h-4 text-slate-400" aria-hidden="true" />
                                                    </div>
                                                    <span>
                                                        {departureDate}
                                                        {booking.schedule.start_time && ` · ${booking.schedule.start_time.substring(0, 5)}`}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-2.5 text-slate-600">
                                                <div className="w-7 h-7 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center shrink-0">
                                                    <Users className="w-4 h-4 text-slate-400" aria-hidden="true" />
                                                </div>
                                                <span>{booking.participants_count} participant{booking.participants_count !== 1 ? 's' : ''}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card 2 — Payment Summary */}
                                    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm space-y-3">
                                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                                Payment Summary
                                            </h2>
                                            {/* Status chip with leading indicator dot */}
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${paymentStatus.color}`}>
                                                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden="true" />
                                                <span>{paymentStatus.label}</span>
                                            </span>
                                        </div>

                                        <div className="space-y-2.5 text-sm">
                                            <div className="flex justify-between text-slate-600">
                                                <span>Total Amount</span>
                                                <span className="font-bold text-slate-900">₱{booking.total_amount.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-slate-600">
                                                <span>Required Advance (50%)</span>
                                                <span className="font-bold text-sky-700">₱{booking.required_advance_amount.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-slate-600">
                                                <span>Amount Paid</span>
                                                <span className={`font-bold ${booking.advance_paid_amount >= booking.required_advance_amount ? 'text-green-600' : 'text-slate-700'}`}>
                                                    ₱{booking.advance_paid_amount.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-slate-600">
                                                <span>Remaining Balance</span>
                                                <span className={`font-bold ${remainingBalance === 0 ? 'text-green-600' : 'text-amber-700'}`}>
                                                    ₱{remainingBalance.toLocaleString()}
                                                </span>
                                            </div>

                                            {paymentDeadline && booking.payment_status === 'unpaid' && (
                                                <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200/80 rounded-xl p-3 text-amber-900 text-xs">
                                                    <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" aria-hidden="true" />
                                                    <span>Payment deadline: <strong>{paymentDeadline}</strong></span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Next steps section if available */}
                                {booking.next_steps && (
                                    <div className="rounded-2xl border border-amber-200/80 bg-amber-50 p-4 space-y-1.5 shadow-2xs">
                                        <p className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                                            <CheckCircle className="w-4 h-4 text-amber-600" aria-hidden="true" />
                                            Next Steps
                                        </p>
                                        <p className="text-xs sm:text-sm text-amber-800 leading-relaxed font-medium">
                                            {booking.next_steps}
                                        </p>
                                    </div>
                                )}

                                {/* Row 2: GCash Payment Panel (Left) + Destination Location Map (Right) */}
                                <div className={`grid grid-cols-1 ${showGcashPanel ? 'xl:grid-cols-2' : ''} items-start gap-4`}>
                                    {/* Card 3 — GCash Payment Panel (when payment is applicable) */}
                                    {showGcashPanel && (
                                        <div className="rounded-2xl border border-sky-200/80 bg-white p-5 shadow-sm space-y-4">
                                            <div className="flex items-center justify-between pb-3 border-b border-sky-100">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs shrink-0">
                                                        <Smartphone className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-900 text-sm">
                                                            {booking.booking_status === 'confirmed' ? 'Pay Remaining Balance via GCash' : 'Pay via GCash'}
                                                        </h3>
                                                        <p className="text-[11px] text-slate-500">Official agency payment information</p>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-black text-sky-800 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-full shadow-2xs">
                                                    ₱{currentDueAmount.toLocaleString()} Due Now
                                                </span>
                                            </div>

                                            {/* Advance option selector (when unpaid) */}
                                            {booking.payment_status === 'unpaid' && (
                                                <div className="bg-slate-50/70 rounded-xl border border-slate-200/80 p-3.5 space-y-2">
                                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                                        Select Payment Option
                                                    </p>
                                                    <div className="grid grid-cols-2 gap-2.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => setTrackPaymentOption('advance')}
                                                            className={`p-2.5 rounded-xl border text-left transition-all ${
                                                                trackPaymentOption === 'advance'
                                                                    ? 'border-sky-500 bg-sky-50/70 ring-2 ring-sky-500/20'
                                                                    : 'border-slate-200 bg-white hover:bg-slate-50'
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="font-bold text-xs text-slate-900">50% Advance</span>
                                                                <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                                                                    trackPaymentOption === 'advance' ? 'border-sky-600 bg-sky-600' : 'border-slate-300'
                                                                }`}>
                                                                    {trackPaymentOption === 'advance' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs font-black text-sky-700">₱{(booking.required_advance_amount > 0 && booking.required_advance_amount < booking.total_amount ? booking.required_advance_amount : Math.round(booking.total_amount * 0.5)).toLocaleString()} now</p>
                                                            <p className="text-[10px] text-slate-500 mt-0.5">Pay balance later</p>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => setTrackPaymentOption('full')}
                                                            className={`p-2.5 rounded-xl border text-left transition-all ${
                                                                trackPaymentOption === 'full'
                                                                    ? 'border-sky-500 bg-sky-50/70 ring-2 ring-sky-500/20'
                                                                    : 'border-slate-200 bg-white hover:bg-slate-50'
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="font-bold text-xs text-slate-900">Full Payment</span>
                                                                <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                                                                    trackPaymentOption === 'full' ? 'border-sky-600 bg-sky-600' : 'border-slate-300'
                                                                }`}>
                                                                    {trackPaymentOption === 'full' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs font-black text-sky-700">₱{booking.total_amount.toLocaleString()} now</p>
                                                            <p className="text-[10px] text-slate-500 mt-0.5">100% settled upfront</p>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Agency Payment QR Code (if uploaded by agency) */}
                                            {booking.tour.payment_qr_code_url && (
                                                <div className="flex flex-col sm:flex-row items-center gap-3.5 p-3.5 rounded-xl bg-sky-50/70 border border-sky-200">
                                                    <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-2xs shrink-0">
                                                        <img
                                                            src={booking.tour.payment_qr_code_url}
                                                            alt="Agency Payment QR Code"
                                                            className="w-28 h-28 object-contain rounded-lg"
                                                        />
                                                    </div>
                                                    <div className="space-y-1 text-center sm:text-left">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-600 text-white">
                                                            <QrCode className="w-3 h-3" /> Scan QR to Pay
                                                        </span>
                                                        <p className="text-xs font-bold text-slate-900 mt-0.5">
                                                            {booking.tour.gcash_account_name || 'Official Payment QR'}
                                                        </p>
                                                        <p className="text-[11px] text-slate-500 leading-normal">
                                                            Scan this QR code with GCash or your banking app, then enter Reference: <strong className="font-mono text-slate-800">{booking.booking_reference}</strong>.
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Agency GCash Account Box */}
                                            <div className="bg-slate-50/70 rounded-xl border border-slate-200/80 p-3.5 space-y-2">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                    <div>
                                                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">GCash Account Name</p>
                                                        <p className="font-bold text-slate-900 text-sm">{booking.tour.gcash_account_name || booking.tour.agency_name || 'Tour Agency'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Official GCash Number</p>
                                                        {booking.tour.gcash_number ? (
                                                            <div className="inline-flex items-center gap-2 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                                                                <span className="font-mono font-extrabold text-slate-900 text-xs sm:text-sm">{booking.tour.gcash_number}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => copyGcash(booking.tour.gcash_number!)}
                                                                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded transition-colors ${
                                                                        copiedGcash
                                                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                                                            : 'bg-sky-100 hover:bg-sky-200 text-sky-800'
                                                                    }`}
                                                                    aria-label="Copy GCash number"
                                                                >
                                                                    {copiedGcash ? <><Check className="w-3 h-3 text-emerald-600" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-1.5 rounded-lg">
                                                                Ask agency for GCash number
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 3 Steps to Pay */}
                                            <div className="space-y-1.5 text-xs text-slate-700">
                                                <div className="flex items-start gap-2">
                                                    <span className="w-4 h-4 rounded-full bg-sky-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                                                    <p>Send <strong>₱{currentDueAmount.toLocaleString()}</strong> via GCash to the account above.</p>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <span className="w-4 h-4 rounded-full bg-sky-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                                                    <p>In GCash message note, type: <strong className="font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{booking.booking_reference}</strong>.</p>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <span className="w-4 h-4 rounded-full bg-sky-600 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                                                    <p>Upload your receipt screenshot below for prompt verification.</p>
                                                </div>
                                            </div>

                                            {/* Receipt Verification States & Upload Controls */}
                                            {booking.payment_status === 'submitted' ? (
                                                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 space-y-1">
                                                    <div className="flex items-center gap-1.5 font-bold text-xs">
                                                        <Clock className="w-4 h-4 text-blue-600" />
                                                        <span>Receipt Under Review</span>
                                                    </div>
                                                    <p className="text-[11px] text-blue-700 leading-relaxed">
                                                        Your receipt screenshot has been submitted and is currently awaiting verification from {booking.tour?.agency_name || 'the agency'}. You will receive a notification once verified!
                                                    </p>
                                                </div>
                                            ) : isFullyPaid ? (
                                                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-1">
                                                    <div className="flex items-center gap-1.5 font-bold text-xs">
                                                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                                                        <span>Payment Fully Verified!</span>
                                                    </div>
                                                    <p className="text-[11px] text-emerald-700 leading-relaxed">
                                                        Your payment has been successfully confirmed. We look forward to seeing you on your tour!
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="pt-3 border-t border-slate-100 space-y-3">
                                                    {booking.booking_status === 'confirmed' && booking.advance_paid_amount > 0 && (
                                                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-0.5">
                                                            <div className="flex items-center gap-1.5 font-bold">
                                                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                                                <span>Advance Payment of ₱{booking.advance_paid_amount.toLocaleString()} Verified</span>
                                                            </div>
                                                            <p className="text-[11px] text-emerald-700">
                                                                Reservation confirmed! Please settle remaining balance of <strong>₱{remainingBalance.toLocaleString()}</strong> via GCash below.
                                                            </p>
                                                        </div>
                                                    )}

                                                    <p className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                                        <Upload className="w-3.5 h-3.5 text-sky-600" />
                                                        {booking.booking_status === 'confirmed' ? 'Upload Balance Payment Receipt' : 'Upload Receipt Screenshot'}
                                                    </p>

                                                    {uploadErrorMessage && (
                                                        <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                                                            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                                                            <span>{uploadErrorMessage}</span>
                                                        </div>
                                                    )}

                                                    {uploadSuccessMessage && (
                                                        <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2">
                                                            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                                                            <span>{uploadSuccessMessage}</span>
                                                        </div>
                                                    )}

                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                            GCash Reference Number <span className="text-red-500">*</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. 100912345678"
                                                            value={gcashRefNumber}
                                                            onChange={(e) => setGcashRefNumber(e.target.value)}
                                                            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-mono shadow-2xs"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                                            Receipt Screenshot (JPG, PNG, PDF) <span className="text-red-500">*</span>
                                                        </label>
                                                        <div className="relative border-2 border-dashed border-sky-200 hover:border-sky-400 bg-slate-50/50 hover:bg-sky-50/30 rounded-xl p-3.5 text-center cursor-pointer transition-colors">
                                                            <input
                                                                type="file"
                                                                accept="image/png,image/jpeg,image/jpg,application/pdf"
                                                                onChange={handleFileChange}
                                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                            />
                                                            {uploadFile ? (
                                                                <div className="flex items-center justify-center gap-2 text-xs text-slate-700 font-medium">
                                                                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                                                                    <span className="truncate max-w-[200px]">{uploadFile.name}</span>
                                                                    <span className="text-slate-400 text-[10px]">({(uploadFile.size / 1024).toFixed(0)} KB)</span>
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-1">
                                                                    <Upload className="w-5 h-5 text-sky-500 mx-auto" />
                                                                    <p className="text-xs text-slate-600 font-medium">Click or drag receipt here</p>
                                                                    <p className="text-[10px] text-slate-400">Max size: 5MB</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        disabled={uploading || !uploadFile || !gcashRefNumber.trim()}
                                                        onClick={handleUploadPayment}
                                                        className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
                                                    >
                                                        {uploading ? (
                                                            <>
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                Submitting Payment Proof...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Upload className="w-3.5 h-3.5" />
                                                                Submit Payment Receipt
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Card 4 — Destination Location & Interactive Map */}
                                    <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm space-y-3.5 overflow-hidden">
                                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                                                    <MapPin className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-900 text-sm">Tour Destination Location</h3>
                                                    <p className="text-[11px] text-slate-500">Interactive location map & navigation</p>
                                                </div>
                                            </div>
                                            {googleMapsUrl && (
                                                <a
                                                    href={googleMapsUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200/80 px-3 py-1.5 rounded-xl transition-colors shadow-2xs"
                                                >
                                                    <ArrowRight className="w-3 h-3" aria-hidden="true" />
                                                    Get Directions
                                                </a>
                                            )}
                                        </div>

                                        {/* Destination Address Info */}
                                        <div className="bg-slate-50/70 rounded-xl border border-slate-100 p-3 space-y-0.5">
                                            <p className="font-extrabold text-slate-900 text-sm">
                                                {booking.tour.destination_name || booking.tour.destination}
                                            </p>
                                            {booking.tour.destination_address && (
                                                <p className="text-xs text-slate-500 leading-relaxed">
                                                    {booking.tour.destination_address}
                                                </p>
                                            )}
                                        </div>

                                        {/* Map Canvas */}
                                        {hasCoordinates ? (
                                            <div className="h-72 w-full rounded-xl overflow-hidden border border-slate-200 relative shadow-2xs">
                                                <DestinationMap
                                                    latitude={booking.tour.latitude!}
                                                    longitude={booking.tour.longitude!}
                                                    destinationName={booking.tour.destination_name || booking.tour.destination}
                                                    destinationAddress={booking.tour.destination_address}
                                                    height="100%"
                                                    showDirectionsButton={false}
                                                    className="w-full h-full"
                                                />
                                            </div>
                                        ) : (
                                            <div className="h-56 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center p-4 text-center">
                                                <MapPin className="w-8 h-8 text-slate-300 mb-2" aria-hidden="true" />
                                                <p className="text-xs font-bold text-slate-600">Location Map Unavailable</p>
                                                <p className="text-[11px] text-slate-400 mt-0.5">
                                                    Specific GPS coordinates are not registered for this tour destination.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Full-width Action Row */}
                                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={resetSearch}
                                        className="w-full sm:w-auto px-5 py-2.5 text-center text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
                                    >
                                        Look up another booking
                                    </button>
                                    <Link
                                        to="/tours"
                                        className="w-full sm:w-auto px-5 py-2.5 text-center text-xs sm:text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-2xs inline-flex items-center justify-center gap-2"
                                    >
                                        Browse More Tours
                                        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            /* Empty state in main content area when no booking loaded */
                            <div className="rounded-2xl border border-slate-200/70 bg-white p-8 sm:p-12 text-center shadow-sm">
                                {hasSearched && notFound ? (
                                    <>
                                        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center mx-auto mb-4">
                                            <AlertCircle className="w-7 h-7" aria-hidden="true" />
                                        </div>
                                        <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight mb-2">
                                            Booking Not Found
                                        </h2>
                                        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-6 leading-relaxed">
                                            We couldn't locate any booking matching reference <strong className="font-mono text-slate-700">{reference}</strong> with email <strong className="text-slate-700">{email}</strong>.
                                        </p>
                                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 max-w-md mx-auto text-left text-xs text-slate-600 space-y-2 mb-6">
                                            <p className="font-bold text-slate-800">Please verify:</p>
                                            <ul className="list-disc list-inside space-y-1 text-slate-500 text-[11px]">
                                                <li>The reference starts with <code>BK-</code> (e.g. <code>BK-XXXXXXXX</code>).</li>
                                                <li>You entered the same email provided during checkout.</li>
                                                <li>Check your confirmation email for the exact reference.</li>
                                            </ul>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={resetSearch}
                                            className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-xl transition-colors inline-flex items-center gap-1.5"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5" />
                                            Try Another Search
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center mx-auto mb-4 shadow-2xs">
                                            <TicketCheck className="w-7 h-7" aria-hidden="true" />
                                        </div>
                                        <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight mb-2">
                                            Track Your Tour Reservation
                                        </h2>
                                        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-8 leading-relaxed">
                                            Enter your booking reference and email in the sidebar to review live reservation status, payment schedules, and upload GCash payment proof.
                                        </p>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left max-w-xl mx-auto pt-6 border-t border-slate-100">
                                            <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-100">
                                                <p className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                                                    <CheckCircle className="w-3.5 h-3.5 text-sky-600" />
                                                    Live Status
                                                </p>
                                                <p className="text-[11px] text-slate-500 leading-normal">
                                                    Real-time approval, confirmation, and payment tracking.
                                                </p>
                                            </div>
                                            <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-100">
                                                <p className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                                                    <Smartphone className="w-3.5 h-3.5 text-sky-600" />
                                                    GCash Payment
                                                </p>
                                                <p className="text-[11px] text-slate-500 leading-normal">
                                                    Official agency account details and receipt upload.
                                                </p>
                                            </div>
                                            <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-100">
                                                <p className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                                                    <MapPin className="w-3.5 h-3.5 text-sky-600" />
                                                    Interactive Map
                                                </p>
                                                <p className="text-[11px] text-slate-500 leading-normal">
                                                    Destination location preview and turn-by-turn directions.
                                                </p>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}
