import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { X, Loader2, CheckCircle, TicketCheck, MapPin, Calendar, Users, Copy, ExternalLink } from 'lucide-react';
import { Link } from 'react-router';
import { guestApi, customerApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { TourPackage, TourSchedule, GuestBookingResponse } from '../types';

// ── Zod schema ────────────────────────────────────────────────────────────────
const schema = z.object({
    guest_name:         z.string().min(2, 'Full name is required').max(255),
    guest_email:        z.string().email('Enter a valid email address').max(255),
    guest_phone:        z.string().min(7, 'Enter a valid phone number').max(20),
    participants_count: z.number().int().min(1, 'At least 1 participant is required'),
    special_requests:   z.string().max(1000).optional(),
});
type FormData = z.infer<typeof schema>;

interface GuestBookingModalProps {
    tour: TourPackage;
    schedule: TourSchedule;
    initialParticipants?: number;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function GuestBookingModal({ tour, schedule, initialParticipants = 1, onClose, onSuccess }: GuestBookingModalProps) {
    const { isAuthenticated } = useAuth();
    const [step, setStep] = useState<'form' | 'success'>('form');
    const [result, setResult] = useState<GuestBookingResponse | null>(null);
    const [serverError, setServerError] = useState('');
    const [copied, setCopied] = useState(false);

    const panelRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    const availableSeats = schedule.capacity - schedule.reserved_slots;

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        setError,
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            participants_count: initialParticipants > 0 ? initialParticipants : 1,
        },
    });


    // ── Body scroll lock, initial focus, and focus restoration ───────────────
    useEffect(() => {
        const previousActiveElement = document.activeElement as HTMLElement | null;
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const timer = setTimeout(() => {
            closeButtonRef.current?.focus();
        }, 50);

        return () => {
            clearTimeout(timer);
            document.body.style.overflow = originalOverflow;
            previousActiveElement?.focus?.();
        };
    }, []);

    // ── Keyboard handling (Escape & Tab focus trap) ──────────────────────────
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.stopPropagation();
            onClose();
            return;
        }

        if (e.key === 'Tab' && panelRef.current) {
            const focusable = panelRef.current.querySelectorAll<HTMLElement>(
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        }
    };

    const onSubmit = async (data: FormData) => {
        setServerError('');

        if (isAuthenticated) {
            // Authenticated path — use existing customer booking API.
            try {
                const payload = schedule.id && schedule.id > 0
                    ? {
                        tour_schedule_id: schedule.id,
                        participants_count: data.participants_count,
                        special_requests: data.special_requests,
                        payment_option: 'advance' as const,
                    }
                    : {
                        tour_package_id: tour.id,
                        booking_date: schedule.departure_date,
                        participants_count: data.participants_count,
                        special_requests: data.special_requests,
                        payment_option: 'advance' as const,
                    };

                await customerApi.book(payload);
                onSuccess?.();
                onClose();
            } catch (err: unknown) {
                const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Booking failed. Please try again.';
                setServerError(msg);
            }
            return;
        }

        // Guest path
        try {
            const payload = schedule.id && schedule.id > 0
                ? {
                    tour_schedule_id: schedule.id,
                    participants_count: data.participants_count,
                    guest_name: data.guest_name,
                    guest_email: data.guest_email,
                    guest_phone: data.guest_phone,
                    special_requests: data.special_requests,
                    payment_option: 'advance' as const,
                }
                : {
                    tour_package_id: tour.id,
                    booking_date: schedule.departure_date,
                    participants_count: data.participants_count,
                    guest_name: data.guest_name,
                    guest_email: data.guest_email,
                    guest_phone: data.guest_phone,
                    special_requests: data.special_requests,
                    payment_option: 'advance' as const,
                };

            const res = await guestApi.book(payload);
            setResult(res.data);
            setStep('success');
            onSuccess?.();
        } catch (err: unknown) {
            const errData = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
            if (errData?.errors) {
                // Map Laravel validation errors to form fields
                Object.entries(errData.errors).forEach(([field, messages]) => {
                    const key = field as keyof FormData;
                    setError(key, { message: (messages as string[])[0] });
                });
            } else {
                setServerError(errData?.message ?? 'Booking failed. Please try again.');
            }
        }
    };

    const copyRef = () => {
        if (result?.booking_reference) {
            navigator.clipboard.writeText(result.booking_reference).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
        }
    };

    const dateLabel = new Date(schedule.departure_date).toLocaleDateString('en-US', {
        weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
    });

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="guest-booking-title"
            onClick={onClose}
        >
            <div
                ref={panelRef}
                onKeyDown={handleKeyDown}
                className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-lg shadow-2xl max-h-[95vh] sm:max-h-[92vh] flex flex-col overflow-hidden animate-modal-in"
                onClick={e => e.stopPropagation()}
            >
                {/* ── Header ───────────────────────────────────────────── */}
                <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-slate-100 flex items-start justify-between gap-4 shrink-0">
                    <div>
                        <h2 id="guest-booking-title" className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                            {step === 'success' ? 'Booking Confirmed!' : 'Book This Tour'}
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{tour.title}</p>
                    </div>
                    <button
                        ref={closeButtonRef}
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
                        aria-label="Close booking modal"
                    >
                        <X className="w-5 h-5" aria-hidden="true" />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1">
                    {step === 'form' ? (
                        /* ── Step 1: Form ──────────────────────────────── */
                        <form onSubmit={handleSubmit(onSubmit)} noValidate className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                            {/* Schedule summary */}
                            <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 space-y-2">
                                <p className="text-xs font-bold uppercase tracking-wider text-sky-700 mb-2">Selected Schedule</p>
                                <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                                    <Calendar className="w-4 h-4 text-sky-600 shrink-0" aria-hidden="true" />
                                    {dateLabel}
                                    {schedule.start_time && <span className="text-slate-500">· {schedule.start_time.substring(0, 5)}</span>}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Users className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                                    <span className={availableSeats < 5 ? 'text-amber-700 font-bold' : ''}>
                                        {availableSeats} seat{availableSeats !== 1 ? 's' : ''} available
                                    </span>
                                </div>
                                {tour.destination && (
                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                        <MapPin className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                                        {tour.destination_name || tour.destination}
                                    </div>
                                )}
                            </div>

                            {/* Guest fields (hidden for authenticated users) */}
                            {!isAuthenticated && (
                                <>
                                    <div>
                                        <label htmlFor="guest_name" className="block text-sm font-semibold text-slate-700 mb-1">
                                            Full Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            id="guest_name"
                                            type="text"
                                            autoComplete="name"
                                            {...register('guest_name')}
                                            className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 ${errors.guest_name ? 'border-red-400' : 'border-slate-200'}`}
                                            placeholder="Juan dela Cruz"
                                        />
                                        {errors.guest_name && (
                                            <p className="mt-1 text-xs text-red-600" role="alert">{errors.guest_name.message}</p>
                                        )}
                                    </div>

                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="guest_email" className="block text-sm font-semibold text-slate-700 mb-1">
                                                Email <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                id="guest_email"
                                                type="email"
                                                autoComplete="email"
                                                {...register('guest_email')}
                                                className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 ${errors.guest_email ? 'border-red-400' : 'border-slate-200'}`}
                                                placeholder="juan@email.com"
                                            />
                                            {errors.guest_email && (
                                                <p className="mt-1 text-xs text-red-600" role="alert">{errors.guest_email.message}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label htmlFor="guest_phone" className="block text-sm font-semibold text-slate-700 mb-1">
                                                Mobile Number <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                id="guest_phone"
                                                type="tel"
                                                autoComplete="tel"
                                                {...register('guest_phone')}
                                                className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 ${errors.guest_phone ? 'border-red-400' : 'border-slate-200'}`}
                                                placeholder="09XXXXXXXXX"
                                            />
                                            {errors.guest_phone && (
                                                <p className="mt-1 text-xs text-red-600" role="alert">{errors.guest_phone.message}</p>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Participants */}
                            <div>
                                <label htmlFor="participants_count" className="block text-sm font-semibold text-slate-700 mb-1">
                                    Number of Participants <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="participants_count"
                                    type="number"
                                    min={1}
                                    max={availableSeats}
                                    {...register('participants_count', { valueAsNumber: true })}
                                    className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 ${errors.participants_count ? 'border-red-400' : 'border-slate-200'}`}
                                />
                                {errors.participants_count && (
                                    <p className="mt-1 text-xs text-red-600" role="alert">{errors.participants_count.message}</p>
                                )}
                            </div>

                            {/* Special requests */}
                            <div>
                                <label htmlFor="special_requests" className="block text-sm font-semibold text-slate-700 mb-1">
                                    Special Requests <span className="text-slate-400 font-normal">(optional)</span>
                                </label>
                                <textarea
                                    id="special_requests"
                                    rows={2}
                                    {...register('special_requests')}
                                    placeholder="Dietary requirements, allergies, accessibility needs…"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                                />
                            </div>

                            {serverError && (
                                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3" role="alert">
                                    {serverError}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmitting || availableSeats < 1}
                                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Creating booking…</>
                                ) : (
                                    'Book Now'
                                )}
                            </button>

                            {!isAuthenticated && (
                                <p className="text-center text-xs text-slate-400">
                                    Already have an account?{' '}
                                    <Link to="/login" className="text-sky-600 font-semibold hover:underline" onClick={onClose}>
                                        Log in
                                    </Link>
                                </p>
                            )}
                        </form>
                    ) : (
                        /* ── Step 2: Success ───────────────────────────── */
                        result && (
                            <div className="p-6 space-y-5">
                                {/* Confirmation banner */}
                                <div className="flex flex-col items-center text-center py-4">
                                    <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-4">
                                        <CheckCircle className="w-8 h-8 text-green-600" aria-hidden="true" />
                                    </div>
                                    <h3 className="text-xl font-extrabold text-slate-900 mb-1">Booking Submitted!</h3>
                                    <p className="text-sm text-slate-500 max-w-xs">
                                        Save your booking reference — you'll need it to track your reservation.
                                    </p>
                                </div>

                                {/* Booking reference */}
                                <div className="bg-slate-900 rounded-2xl p-5 text-white text-center">
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Booking Reference</p>
                                    <p className="font-mono text-2xl font-extrabold tracking-widest mb-3">{result.booking_reference}</p>
                                    <button
                                        onClick={copyRef}
                                        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                                        aria-label="Copy booking reference"
                                    >
                                        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                                        {copied ? 'Copied!' : 'Copy reference'}
                                    </button>
                                </div>

                                {/* Summary */}
                                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-sm">
                                    <div className="flex justify-between text-slate-700">
                                        <span className="font-medium">Tour</span>
                                        <span className="text-right font-semibold">{result.tour.title}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-700">
                                        <span className="font-medium">Date</span>
                                        <span className="font-semibold">
                                            {new Date(result.schedule.departure_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-slate-700">
                                        <span className="font-medium">Participants</span>
                                        <span className="font-semibold">{result.participants_count}</span>
                                    </div>
                                    <div className="border-t border-slate-200 pt-2 flex justify-between text-slate-900">
                                        <span className="font-bold">Total</span>
                                        <span className="font-extrabold">₱{result.total_amount.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-semibold text-sky-700">Advance due</span>
                                        <span className="font-extrabold text-sky-700">₱{result.required_advance_amount.toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* Next steps */}
                                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-900">
                                    <p className="font-bold mb-1 flex items-center gap-2">
                                        <TicketCheck className="w-4 h-4" aria-hidden="true" />
                                        Next Steps
                                    </p>
                                    <p className="leading-relaxed">{result.next_steps}</p>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-3">
                                    <Link
                                        to={`/track?ref=${encodeURIComponent(result.booking_reference)}`}
                                        onClick={onClose}
                                        className="w-full py-3 text-center bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                                    >
                                        <ExternalLink className="w-4 h-4" aria-hidden="true" />
                                        View Booking Status
                                    </Link>
                                    <button
                                        onClick={onClose}
                                        className="w-full py-3 text-center bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors"
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
