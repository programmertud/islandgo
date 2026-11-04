import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { customerApi } from '../lib/api';
import type { Booking, PaginatedResponse } from '../types';
import { Map, Calendar, Clock, Loader2, X, Upload, ArrowRight, Compass, PackageOpen, ShieldCheck, Headphones, Heart, MapPinned, Palmtree, Copy, Check, FileText, Trash2, MapPin, QrCode } from 'lucide-react';
import { Link } from 'react-router';
import StatusModal from '../components/StatusModal';
import { MapModal } from '../components/maps/BookingLocationMap';
import BookingsOverviewMap from '../components/maps/BookingsOverviewMap';

const bookingStatusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
    cancelled: 'bg-slate-100 text-slate-500',
    completed: 'bg-blue-100 text-blue-700',
};
const paymentStatusColors: Record<string, string> = {
    unpaid: 'bg-slate-100 text-slate-500',
    submitted: 'bg-amber-100 text-amber-700',
    verified: 'bg-emerald-100 text-emerald-700',
    paid: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
};

const formatPaymentStatus = (booking: Booking) => {
    if (booking.payment_status === 'verified') {
        return Number(booking.remaining_balance) === 0 ? 'Fully Paid' : 'Advance Paid';
    }
    return booking.payment_status.replace('_', ' ');
};

const BookingCard = ({ booking, onPay, onDelete, deleting, onViewMap }: { booking: Booking, onPay: (b: Booking) => void, onDelete?: (b: Booking) => void, deleting: boolean, onViewMap: (b: Booking) => void }) => {
    const tour = booking.schedule?.package;
    const canPay = ((booking.payment_status === 'unpaid' && booking.booking_status === 'pending') || (booking.booking_status === 'confirmed' && Number(booking.remaining_balance) > 0)) && booking.payment_method !== 'cash';
    const departure = booking.schedule?.departure_date
        ? new Date(booking.schedule.departure_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : '—';

    const openPayment = () => {
        if (canPay) onPay(booking);
    };

    return (
        <article
            className={`group flex min-h-[410px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all md:aspect-square md:min-h-0 ${canPay ? 'cursor-pointer hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-emerald-200' : ''}`}
            role={canPay ? 'button' : undefined}
            tabIndex={canPay ? 0 : undefined}
            onClick={openPayment}
            onKeyDown={(event) => {
                if (canPay && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    openPayment();
                }
            }}
            aria-label={canPay ? `Pay for ${tour?.title ?? 'this booking'}` : undefined}
        >
            {/* Image Section */}
            <div className="relative h-44 shrink-0 overflow-hidden bg-slate-100 sm:h-52">
                {tour?.cover_image ? (
                    <img src={`http://localhost:8000/storage/${tour.cover_image}`} alt={tour.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Map className="w-8 h-8" />
                    </div>
                )}
                <div className="absolute top-3 left-3 flex gap-2">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide shadow-sm ${bookingStatusColors[booking.booking_status]}`}>
                        {booking.booking_status}
                    </span>
                </div>
                {onDelete && <button type="button" disabled={deleting} onClick={event => { event.stopPropagation(); onDelete(booking); }} className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-2 text-xs font-bold text-red-700 shadow-md hover:bg-white disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />{deleting ? 'Deleting…' : 'Delete'}</button>}
                {canPay && <span className="absolute right-3 top-3 rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-amber-950 shadow-sm">Payment due</span>}
            </div>
            
            {/* Content Section */}
            <div className="flex flex-1 flex-col p-5">
                <div>
                    <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h3 className="truncate text-lg font-bold leading-tight text-slate-900">{tour?.title ?? 'Tour Package'}</h3>
                            <p className="text-slate-500 text-sm mt-0.5 flex items-center gap-1.5">
                                <Map className="w-3.5 h-3.5" /> {tour?.destination}
                            </p>
                        </div>
                        <span className="shrink-0 rounded-md border border-slate-100 bg-slate-50 px-2 py-1 font-mono text-[10px] text-slate-400">
                            {booking.booking_reference}
                        </span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                            <Calendar className="w-4 h-4 text-emerald-600" />
                            <span className="font-medium">{departure}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                            <span className="font-bold text-emerald-600">{booking.participants_count}</span>
                            <span className="font-medium">pax</span>
                        </div>
                        {tour?.latitude && tour?.longitude && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onViewMap(booking);
                                }}
                                className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg border border-emerald-200 transition-colors shadow-xs ml-auto"
                                title="View Location on Map"
                            >
                                <MapPin className="w-3.5 h-3.5" />
                                <span>Map</span>
                            </button>
                        )}
                    </div>
                </div>

            <div className="mt-auto flex items-end justify-between gap-4 border-t border-slate-100 pt-4">
                    <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Amount</span>
                        <p className="text-xl font-black text-slate-800 leading-none mt-1">₱{Number(booking.total_amount).toLocaleString()}</p>
                    </div>
                    <div className="flex min-w-0 flex-col items-end gap-1.5">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Payment:</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${paymentStatusColors[Number(booking.remaining_balance) === 0 && booking.payment_status === 'verified' ? 'paid' : booking.payment_status]}`}>
                                {formatPaymentStatus(booking)}
                            </span>
                        </div>
                        {canPay && (
                            <div className="flex flex-col items-end gap-1">
                                <span className="text-[10px] font-extrabold uppercase tracking-wide text-amber-700">Payment required</span>
                                <span className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-bold text-white shadow-sm">Pay now</span>
                            </div>
                        )}
                        {booking.payment_status === 'unpaid' && booking.booking_status === 'pending' && <span className="max-w-[170px] text-right text-xs font-semibold leading-snug text-amber-700">{booking.payment_method === 'cash' ? 'Awaiting cash payment at the agency' : `50% advance: ₱${Number(booking.required_advance_amount).toLocaleString()}`}</span>}
                        {booking.booking_status === 'confirmed' && Number(booking.remaining_balance) > 0 && <span className="max-w-[170px] text-right text-xs font-semibold leading-snug text-blue-700">Final payment: ₱{Number(booking.remaining_balance).toLocaleString()}</span>}
                    </div>
                </div>
            </div>
        </article>
    );
};

export default function CustomerBookings() {
    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
    const [viewMapBooking, setViewMapBooking] = useState<Booking | null>(null);
    const [payingBooking, setPayingBooking] = useState<Booking | null>(null);
    const [deletingBooking, setDeletingBooking] = useState<Booking | null>(null);
    const [statusModal, setStatusModal] = useState<{ title: string; message: string; type: 'success' | 'error' } | null>(null);
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['my-bookings', page],
        queryFn: () => customerApi.myBookings(page).then(r => r.data as PaginatedResponse<Booking>),
    });

    const deleteBooking = useMutation({
        mutationFn: (booking: Booking) => customerApi.deleteBooking(booking.id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-bookings'] }),
    });

    const removePastBooking = (booking: Booking) => {
        setDeletingBooking(booking);
    };

    const confirmDeleteBooking = () => {
        if (!deletingBooking || deleteBooking.isPending) return;
        deleteBooking.mutate(deletingBooking, {
            onSuccess: () => setDeletingBooking(null),
        });
    };

    const filteredBookings = data?.data.filter(b => {
        const departure = b.schedule?.departure_date ? new Date(`${b.schedule.departure_date}T00:00:00`) : null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (filter === 'upcoming') {
            return ['pending', 'confirmed'].includes(b.booking_status) && (!departure || departure >= today);
        }
        if (filter === 'past') {
            return b.booking_status === 'completed' || Boolean(departure && departure < today);
        }
        return true;
    }) ?? [];

    const emptyState = filter === 'upcoming'
        ? { title: 'No upcoming bookings', description: 'You have no tours scheduled from today onward.' }
        : filter === 'past'
            ? { title: 'No past bookings', description: 'Your completed and past tours will appear here.' }
            : { title: 'No bookings yet', description: "You haven't booked any tours. Explore our destinations to start your adventure!" };

    return (
        <div className="mx-auto max-w-[1450px] space-y-4 p-4 md:p-5">
            <section className="relative min-h-[190px] overflow-hidden rounded-3xl bg-slate-950 shadow-xl shadow-sky-950/15">
                <video className="absolute inset-0 h-full w-full object-cover opacity-80" autoPlay muted loop playsInline><source src="/videos/bg.mp4" type="video/mp4" /></video>
                <div className="absolute inset-0 bg-gradient-to-r from-[#06264b]/95 via-[#06396a]/75 to-[#0b2a4a]/10" />
                <Palmtree className="absolute left-5 top-7 h-16 w-16 text-teal-200/30" />
                <div className="relative flex min-h-[190px] items-center p-6 text-white md:p-8"><div><p className="text-sm font-medium text-sky-100">My Bookings</p><h1 className="mt-1 max-w-md text-3xl font-extrabold leading-tight md:text-4xl">Your Travel Journey<br />Starts Here</h1><p className="mt-3 text-sm text-sky-50">Manage your upcoming and past travel itineraries.</p></div></div>
            </section>

            {/* Filter toolbar & View Mode Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1 rounded-2xl border border-sky-100 bg-white p-1.5 shadow-sm w-fit">
                    {(['all', 'upcoming', 'past'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => { setFilter(f); setPage(1); }}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl capitalize transition-all ${
                                filter === f
                                    ? 'bg-gradient-to-r from-sky-600 to-cyan-500 text-white shadow-sm'
                                    : 'text-slate-700 hover:bg-sky-50'
                            }`}
                        >
                            {f === 'all' ? <PackageOpen className="h-4 w-4" /> : f === 'upcoming' ? <Calendar className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                            {f}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
                    <button
                        type="button"
                        onClick={() => setViewMode('grid')}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                            viewMode === 'grid'
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        <PackageOpen className="w-3.5 h-3.5" />
                        Grid View
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('map')}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all ${
                            viewMode === 'map'
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        <MapPinned className="w-3.5 h-3.5" />
                        Trip Map
                    </button>
                </div>
            </div>

            {/* Content: Map View or Grid View */}
            {viewMode === 'map' ? (
                <div className="space-y-4">
                    <BookingsOverviewMap
                        bookings={filteredBookings}
                        onSelectBooking={(b) => setViewMapBooking(b)}
                        height="580px"
                    />
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {isLoading ? (
                        [...Array(4)].map((_, i) => (
                            <div key={i} className="min-h-[410px] animate-pulse rounded-3xl border border-slate-200 bg-white shadow-sm md:aspect-square md:min-h-0" />
                        ))
                    ) : filteredBookings.length === 0 ? (
                        <div className="relative overflow-hidden rounded-3xl border border-sky-100 bg-white p-6 shadow-sm md:col-span-2 md:p-8 xl:col-span-4">
                            <div className="absolute bottom-0 right-0 h-24 w-72 rounded-tl-full bg-sky-100/70" />
                            <div className="relative grid items-center gap-7 md:grid-cols-[1fr_1fr]"><div className="mx-auto flex aspect-[1.35] w-full max-w-sm items-center justify-center rounded-[2rem] bg-gradient-to-br from-sky-100 via-cyan-50 to-teal-100"><div className="text-center"><Palmtree className="mx-auto h-20 w-20 text-teal-600" /><MapPinned className="mx-auto -mt-5 h-12 w-12 text-sky-600" /></div></div><div><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100"><PackageOpen className="h-7 w-7 text-sky-700" /></span><h2 className="mt-4 text-3xl font-extrabold text-[#0B2A4A]">{emptyState.title}</h2><p className="mt-2 max-w-md leading-relaxed text-slate-700">{emptyState.description}</p><div className="mt-5 flex flex-wrap gap-3"><Link to="/customer/packages" className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 font-bold text-white shadow-lg shadow-sky-500/20 hover:bg-sky-700"><Compass className="h-4 w-4" /> Browse Packages <ArrowRight className="h-4 w-4" /></Link><Link to="/customer/packages" className="inline-flex items-center gap-2 rounded-xl border border-sky-300 bg-white px-5 py-3 font-bold text-slate-950 hover:bg-sky-50"><Map className="h-4 w-4" /> View Destinations <ArrowRight className="h-4 w-4" /></Link></div></div></div>
                        </div>
                    ) : (
                        filteredBookings.map(b => (
                            <BookingCard
                                key={b.id}
                                booking={b}
                                onPay={setPayingBooking}
                                onDelete={filter === 'past' ? removePastBooking : undefined}
                                deleting={deleteBooking.isPending && deleteBooking.variables?.id === b.id}
                                onViewMap={setViewMapBooking}
                            />
                        ))
                    )}
                </div>
            )}

            {filteredBookings.length === 0 && !isLoading && <section className="grid grid-cols-2 gap-3 border-t border-sky-100 pt-4 md:grid-cols-4">{[[ShieldCheck, 'Secure Booking', 'Your data is safe with us'], [Headphones, '24/7 Support', 'We are here to help'], [Compass, 'Best Local Guides', 'Authentic island experiences'], [Heart, 'Unforgettable Memories', 'More than just a trip']].map(([Icon, title, description]) => { const BenefitIcon = Icon as typeof Compass; return <div key={title as string} className="flex items-center gap-3"><span className="rounded-2xl bg-sky-100 p-3"><BenefitIcon className="h-5 w-5 text-sky-700" /></span><span><strong className="block text-xs text-slate-950">{title as string}</strong><small className="text-[11px] text-slate-600">{description as string}</small></span></div>})}</section>}

            {/* Pagination */}
            {data && data.last_page > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <span className="text-sm font-medium text-slate-500">
                        Page <strong className="text-slate-700">{data.current_page}</strong> of <strong className="text-slate-700">{data.last_page}</strong>
                    </span>
                    <div className="flex gap-2">
                        <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50 shadow-sm transition-colors">Previous</button>
                        <button onClick={() => setPage(p => p + 1)} disabled={page === data.last_page} className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50 shadow-sm transition-colors">Next</button>
                    </div>
                </div>
            )}
            
            {/* Quick Map Modal */}
            <MapModal
                booking={viewMapBooking}
                onClose={() => setViewMapBooking(null)}
            />

            {payingBooking && (
                <PaymentModal booking={payingBooking} onClose={() => setPayingBooking(null)} onStatus={setStatusModal} />
            )}
            {deletingBooking && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" onMouseDown={event => { if (event.target === event.currentTarget && !deleteBooking.isPending) setDeletingBooking(null); }}>
                <section role="dialog" aria-modal="true" aria-labelledby="delete-booking-title" className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                    <div className="flex items-start gap-4">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600"><Trash2 className="h-6 w-6" /></span>
                        <div><h2 id="delete-booking-title" className="text-lg font-extrabold text-slate-900">Delete past booking?</h2><p className="mt-2 text-sm leading-relaxed text-slate-600">Delete booking <strong className="text-slate-800">{deletingBooking.booking_reference}</strong>? It will be removed from your booking history.</p></div>
                        <button type="button" aria-label="Close" disabled={deleteBooking.isPending} onClick={() => setDeletingBooking(null)} className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"><X className="h-5 w-5" /></button>
                    </div>
                    {deleteBooking.isError && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">Could not delete the booking. Please try again.</p>}
                    <div className="mt-6 flex justify-end gap-3">
                        <button type="button" disabled={deleteBooking.isPending} onClick={() => setDeletingBooking(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Keep booking</button>
                        <button type="button" disabled={deleteBooking.isPending} onClick={confirmDeleteBooking} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60">{deleteBooking.isPending ? <><Loader2 className="h-4 w-4 animate-spin" />Deleting…</> : <><Trash2 className="h-4 w-4" />Delete booking</>}</button>
                    </div>
                </section>
            </div>}
            <StatusModal isOpen={!!statusModal} title={statusModal?.title ?? ''} message={statusModal?.message ?? ''} type={statusModal?.type} onClose={() => { const wasSuccess = statusModal?.type === 'success'; setStatusModal(null); if (wasSuccess) window.location.reload(); }} />
        </div>
    );
}

// ─── Payment Modal ─────────────────────────────────────────────────────────────

function PaymentModal({ booking, onClose, onStatus }: { booking: Booking; onClose: () => void; onStatus: (status: { title: string; message: string; type: 'success' | 'error' }) => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [gcashReference, setGcashReference] = useState('');
    const [fileError, setFileError] = useState('');
    const [copied, setCopied] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);

    const tour = booking.schedule?.package;
    const agency = tour?.agency;
    const departure = booking.schedule?.departure_date ? new Date(booking.schedule.departure_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'To be scheduled';
    
    const gcashName = agency?.gcash_account_name;
    const gcashNumber = agency?.gcash_number;
    const amountDueNow = booking.booking_status === 'confirmed' ? Number(booking.remaining_balance) : Number(booking.required_advance_amount);
    const hasPaymentDetails = Boolean(gcashName && gcashNumber);

    const handleCopy = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!gcashNumber) return;
        navigator.clipboard.writeText(gcashNumber).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };
    
    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };
    
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            selectFile(e.dataTransfer.files[0]);
        }
    };

    const selectFile = (nextFile: File | null) => {
        if (!nextFile) return;
        const supported = ['image/jpeg', 'image/png', 'application/pdf'];
        if (!supported.includes(nextFile.type)) {
            setFileError('Invalid file format. Please use JPG, PNG, or PDF.');
            setFile(null);
            return;
        }
        if (nextFile.size > 5 * 1024 * 1024) {
            setFileError('File size exceeds the 5MB limit.');
            setFile(null);
            return;
        }
        setFileError('');
        setFile(nextFile);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            setFileError('Please upload your payment proof before submitting.');
            return;
        }
        if (!gcashReference.trim()) {
            setFileError('Enter the GCash reference number to continue.');
            return;
        }

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('payment_method', 'gcash');
            formData.append('amount', amountDueNow.toString());
            formData.append('proof_of_payment', file);
            if (gcashReference.trim()) formData.append('gcash_reference', gcashReference.trim());

            await customerApi.uploadPayment(booking.id, formData);
            onClose();
            onStatus({ title: 'Payment submitted!', message: 'Your payment proof was uploaded successfully and is waiting for verification.', type: 'success' });
        } catch (error: any) {
            onStatus({ title: 'Payment not submitted', message: error.response?.data?.message || 'Failed to submit payment.', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const isFormValid = file !== null && gcashReference.trim().length > 0;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#172033]/60 backdrop-blur-sm sm:p-6" aria-modal="true" role="dialog">
            <div className="bg-[#F8FAFC] rounded-2xl sm:rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="px-6 py-5 bg-white border-b border-[#DCE6F0] flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-[#172033]">Submit Payment</h2>
                        <p className="text-[13px] text-[#64748B] mt-0.5">Ref: <span className="font-mono font-medium">{booking.booking_reference}</span></p>
                    </div>
                    <button onClick={onClose} className="p-2 text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#172033] rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#007DFE]">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                {/* Body */}
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
                        
                        {/* 1. Payment Details */}
                        <section>
                            <div className="flex items-center gap-3 mb-4">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#007DFE] text-white text-xs font-bold shadow-sm shadow-[#007DFE]/20">1</span>
                                <h3 className="text-sm font-bold text-[#172033] uppercase tracking-wide">Payment Details</h3>
                            </div>
                            <div className="bg-white rounded-2xl border border-[#DCE6F0] shadow-sm overflow-hidden">
                                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <p className="font-bold text-[#172033] text-lg">{tour?.title ?? 'Tour package'}</p>
                                        <p className="text-sm text-[#64748B] mt-1">{tour?.destination ?? 'Destination'} • {departure}</p>
                                        <p className="text-sm text-[#64748B] mt-0.5">{booking.participants_count} traveler{booking.participants_count === 1 ? '' : 's'}</p>
                                    </div>
                                    <div className="sm:text-right bg-[#F8FAFC] sm:bg-transparent p-4 sm:p-0 rounded-xl">
                                        <p className="text-xs font-bold uppercase tracking-wider text-[#64748B]">{booking.booking_status === 'confirmed' ? 'Final balance due' : 'Advance due now (50%)'}</p>
                                        <p className="text-3xl font-black text-[#007DFE] mt-1">₱{amountDueNow.toLocaleString()}</p>
                                        <div className="flex sm:justify-end justify-between items-center mt-2 gap-2 text-xs">
                                            <span className="text-[#64748B]">Total fare: ₱{Number(booking.total_amount).toLocaleString()}</span>
                                            <span className="text-[#64748B]">Balance after payment: ₱{Math.max(0, Number(booking.remaining_balance) - amountDueNow).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 2. Pay with GCash */}
                        <section>
                            <div className="flex items-center gap-3 mb-4">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#007DFE] text-white text-xs font-bold shadow-sm shadow-[#007DFE]/20">2</span>
                                <h3 className="text-sm font-bold text-[#172033] uppercase tracking-wide">Pay with GCash</h3>
                            </div>
                            
                            <div className="bg-white rounded-2xl border border-[#DCE6F0] shadow-sm p-5 space-y-5">
                                {/* If agency provided a QR code, display it prominently for quick scanning */}
                                {agency?.payment_qr_code_url && (
                                    <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-sky-50/70 border border-sky-200">
                                        <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-2xs shrink-0">
                                            <img
                                                src={agency.payment_qr_code_url}
                                                alt="Agency Payment QR Code"
                                                className="w-32 h-32 object-contain rounded-lg"
                                            />
                                        </div>
                                        <div className="space-y-1 text-center sm:text-left">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-600 text-white shadow-2xs">
                                                <QrCode className="w-3.5 h-3.5" /> Scan to Pay
                                            </span>
                                            <h4 className="text-sm font-bold text-slate-900 mt-1">
                                                {gcashName || 'Official Payment QR'}
                                            </h4>
                                            <p className="text-xs text-slate-600 leading-relaxed max-w-sm">
                                                Scan directly using GCash or any mobile banking app to pay <strong>₱{amountDueNow.toLocaleString()}</strong>.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
                                    <div className="w-20 h-20 bg-[#F8FAFC] border border-[#DCE6F0] rounded-xl flex items-center justify-center shrink-0" aria-hidden="true">
                                        <span className="text-xl font-black tracking-tight text-[#007DFE]">GCash</span>
                                    </div>
                                    
                                    <div className="flex-1 space-y-3 w-full">
                                        <div>
                                            <p className="text-xs font-bold text-[#64748B] uppercase">GCash Account Name</p>
                                            <p className="font-semibold text-[#172033] text-lg">{gcashName || 'Not configured'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-[#64748B] uppercase mb-1">Official GCash number</p>
                                            {gcashNumber ? <div className="flex flex-wrap items-center gap-2">
                                                <div className="bg-[#F8FAFC] px-3 py-1.5 rounded-lg border border-[#DCE6F0] font-mono font-medium text-[#172033] text-lg">
                                                    {gcashNumber}
                                                </div>
                                                <button 
                                                    type="button" 
                                                    onClick={handleCopy}
                                                    className="flex items-center justify-center w-9 h-9 bg-[#EAF5FF] text-[#007DFE] hover:bg-[#007DFE] hover:text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#007DFE]"
                                                    title="Copy GCash Number"
                                                >
                                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                </button>
                                                {copied && <span role="status" className="text-xs font-medium text-emerald-700">Copied</span>}
                                            </div> : <p className="text-sm text-amber-700">Ask the agency for its verified GCash number before sending payment.</p>}
                                        </div>
                                    </div>
                                </div>
                                <p className="rounded-lg border border-sky-100 bg-sky-50 p-3 text-xs leading-relaxed text-sky-900">Send exactly the amount due and keep your GCash receipt. Confirm the account name and number with the agency before paying.</p>
                                
                                <div className="pt-4 border-t border-[#DCE6F0]">
                                    <label htmlFor="gcash-ref" className="block text-sm font-bold text-[#172033] mb-1.5">GCash reference number <span className="text-red-500">*</span></label>
                                    <p className="mb-2 text-xs text-[#64748B]">Enter the reference number shown on your completed GCash transaction receipt.</p>
                                    <input 
                                        id="gcash-ref"
                                        type="text"
                                        required
                                        value={gcashReference} 
                                        onChange={e => { setGcashReference(e.target.value); setFileError(''); }} 
                                        placeholder="e.g. 1029384756123" 
                                        className="w-full px-4 py-3 bg-[#F8FAFC] border border-[#DCE6F0] rounded-xl text-[#172033] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#007DFE]/50 focus:border-[#007DFE] transition-all font-mono" 
                                    />
                                </div>
                            </div>
                        </section>

                        {/* 3. Upload Proof */}
                        <section>
                            <div className="flex items-center gap-3 mb-4">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#007DFE] text-white text-xs font-bold shadow-sm shadow-[#007DFE]/20">3</span>
                                <h3 className="text-sm font-bold text-[#172033] uppercase tracking-wide">Upload Proof</h3>
                            </div>
                            
                            <div 
                                className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-colors
                                    ${isDragOver ? 'border-[#007DFE] bg-[#EAF5FF]' : 'border-[#DCE6F0] bg-white hover:border-[#007DFE]/50 hover:bg-[#F8FAFC]'}
                                `}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,application/pdf"
                                    required
                                    onChange={(e) => selectFile(e.target.files?.[0] || null)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    aria-label="Upload payment proof"
                                />
                                
                                {file ? (
                                    <div className="flex flex-col items-center justify-center gap-3 relative z-10">
                                        {file.type.startsWith('image/') ? (
                                            <div className="relative">
                                                <img src={URL.createObjectURL(file)} alt="Receipt preview" className="h-24 w-auto rounded-lg border border-[#DCE6F0] object-cover shadow-sm" />
                                                <div className="absolute -top-2 -right-2 bg-[#16A34A] text-white rounded-full p-1 shadow-sm">
                                                    <Check className="w-3 h-3" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="h-16 w-16 bg-[#EAF5FF] text-[#007DFE] rounded-xl flex items-center justify-center border border-[#007DFE]/20">
                                                <FileText className="w-8 h-8" />
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-medium text-[#172033] truncate max-w-[200px] sm:max-w-xs">{file.name}</p>
                                            <p className="text-xs text-[#64748B] mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={(event) => { event.preventDefault(); event.stopPropagation(); setFile(null); }} 
                                            className="text-sm font-medium text-red-500 hover:text-red-600 focus:outline-none"
                                        >
                                            Remove file
                                        </button>
                                    </div>
                                ) : (
                                    <div className="pointer-events-none">
                                        <div className="w-12 h-12 bg-[#EAF5FF] text-[#007DFE] rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Upload className="w-6 h-6" />
                                        </div>
                                        <p className="text-sm font-bold text-[#172033]">Click to browse or drag file here</p>
                                        <p className="text-xs text-[#64748B] mt-1">Supports JPG, PNG, PDF (Max 5MB)</p>
                                    </div>
                                )}
                            </div>
                            {fileError && (
                                <p role="alert" className="text-sm font-medium text-red-500 mt-2 flex items-center gap-1">
                                    <X className="w-4 h-4" /> {fileError}
                                </p>
                            )}
                        </section>
                    </div>

                    {/* Sticky Footer */}
                    <div className="bg-white border-t border-[#DCE6F0] p-4 sm:p-6 shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.03)] flex flex-col gap-3 shrink-0">
                        <div className="flex items-start gap-2 text-xs text-[#64748B] bg-[#F8FAFC] p-3 rounded-lg border border-[#DCE6F0]">
                            <ShieldCheck className="w-4 h-4 text-[#007DFE] shrink-0 mt-0.5" />
                                            <p>After submission, your payment status will be <strong>Under review</strong>. The agency will verify your reference and receipt before confirming your booking.</p>
                        </div>
                        <button
                            type="submit"
                            disabled={isSubmitting || !isFormValid || !hasPaymentDetails}
                            className={`
                                w-full py-3.5 px-6 rounded-xl font-bold text-white transition-all shadow-sm flex items-center justify-center gap-2
                                ${isSubmitting || !isFormValid || !hasPaymentDetails
                                    ? 'bg-[#64748B]/30 text-[#172033]/40 cursor-not-allowed shadow-none' 
                                    : 'bg-[#007DFE] hover:bg-[#006CDE] active:scale-[0.98]'
                                }
                            `}
                        >
                            {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Submitting proof...</> : 'Submit payment proof'}
                        </button>
                        {!hasPaymentDetails && <p className="text-center text-xs text-amber-700">Payment submission is unavailable until the agency completes its GCash payment details.</p>}
                    </div>
                </form>
            </div>
        </div>
    );
}
