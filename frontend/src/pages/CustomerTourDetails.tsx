import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Compass, Map, Clock, Users, ArrowLeft, CheckCircle, Calendar, CalendarDays, Loader2, X, MapPin, Camera } from 'lucide-react';
import { toursApi, customerApi, storageUrl } from '../lib/api';
import StatusModal from '../components/StatusModal';
import BookingLocationMap from '../components/maps/BookingLocationMap';
import PaymentMethodPicker from '../components/PaymentMethodPicker';
import BookingCalendar from '../components/BookingCalendar';

export default function CustomerTourDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    const [bookingModal, setBookingModal] = useState<{ isOpen: boolean; scheduleId: number | null; date?: string; availableSeats?: number }>({ isOpen: false, scheduleId: null });
    const [participantsCount, setParticipantsCount] = useState(1);
    const [specialRequests, setSpecialRequests] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'gcash' | 'cash'>('gcash');
    const [paymentOption, setPaymentOption] = useState<'advance' | 'full'>('advance');
    const [bookingError, setBookingError] = useState('');
    const [statusModal, setStatusModal] = useState<{ title: string; message: string; type: 'success' | 'error' } | null>(null);

    const modalRef = useRef<HTMLDivElement>(null);
    const closeBtnRef = useRef<HTMLButtonElement>(null);
    const triggerElementRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!bookingModal.isOpen) return;

        triggerElementRef.current = document.activeElement as HTMLElement | null;
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const timer = setTimeout(() => {
            closeBtnRef.current?.focus();
        }, 50);

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setBookingModal({ isOpen: false, scheduleId: null });
                return;
            }
            if (e.key === 'Tab' && modalRef.current) {
                const focusable = modalRef.current.querySelectorAll<HTMLElement>(
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

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = originalOverflow;
            triggerElementRef.current?.focus?.();
        };
    }, [bookingModal.isOpen]);

    const { data: tour, isLoading } = useQuery({
        queryKey: ['tour', id],
        queryFn: () => toursApi.show(Number(id)).then(r => r.data),
    });

    const bookMutation = useMutation({
        mutationFn: (data: { tour_schedule_id?: number; tour_package_id?: number; booking_date?: string; participants_count: number; special_requests?: string; payment_method?: 'gcash' | 'cash'; payment_option?: 'advance' | 'full' }) =>
            customerApi.book(data),
        onSuccess: () => {
            setBookingModal({ isOpen: false, scheduleId: null });
            setStatusModal({ title: 'Booking successful!', message: 'Your booking has been created. You can view its status in My Bookings.', type: 'success' });
        },
        onError: (error: any) => {
            setStatusModal({ title: 'Booking not completed', message: error.response?.data?.message || 'Failed to book the tour.', type: 'error' });
        }
    });

    const handleBook = (e: React.FormEvent) => {
        e.preventDefault();
        if (!tour || (!bookingModal.scheduleId && !bookingModal.date)) return;
        const availableSeats = bookingModal.availableSeats ?? (tour?.max_participants || 20);
        if (!Number.isInteger(participantsCount) || participantsCount < 1 || participantsCount > availableSeats) {
            setBookingError(`Please select between 1 and ${availableSeats} available traveler${availableSeats === 1 ? '' : 's'}.`);
            return;
        }
        setBookingError('');
        const payload = bookingModal.scheduleId && bookingModal.scheduleId > 0
            ? {
                tour_schedule_id: bookingModal.scheduleId,
                participants_count: participantsCount,
                special_requests: specialRequests,
                payment_method: paymentMethod,
                payment_option: paymentOption,
            }
            : {
                tour_package_id: tour.id,
                booking_date: bookingModal.date,
                participants_count: participantsCount,
                special_requests: specialRequests,
                payment_method: paymentMethod,
                payment_option: paymentOption,
            };
        bookMutation.mutate(payload);
    };

    if (isLoading) {
        return <div className="flex justify-center items-center min-h-[60vh] text-slate-400">Loading tour details...</div>;
    }

    if (!tour) {
        return <div className="text-center py-20 text-slate-400">Tour not found.</div>;
    }

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto">
            <Link to="/customer/packages" className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Packages
            </Link>

            <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200">
                {/* Hero Image */}
                <div className="h-64 md:h-96 bg-slate-200 relative">
                    {tour.cover_image ? (
                        <img src={storageUrl(tour.cover_image) ?? ''} alt={tour.title} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-emerald-900">
                            <Compass className="w-20 h-20 text-emerald-700 opacity-50" />
                        </div>
                    )}
                    <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-bold text-emerald-700 shadow-sm">
                        {tour.category}
                    </div>
                </div>

                <div className="p-8 md:p-12">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6 mb-10">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">{tour.title}</h1>
                            <p className="text-lg text-slate-500 flex items-center gap-2">
                                <Map className="w-5 h-5 text-emerald-500" /> {tour.destination}
                            </p>
                            <p className="text-sm text-slate-400 mt-2">
                                Offered by <span className="font-semibold text-slate-700">{tour.agency?.name}</span>
                            </p>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center min-w-[200px]">
                            <p className="text-sm text-slate-500 font-medium uppercase tracking-wide mb-1">Price per person</p>
                            <p className="text-4xl font-bold text-emerald-600">₱{Number(tour.price_per_person).toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                        <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-4">
                            <Clock className="w-8 h-8 text-emerald-500" />
                            <div>
                                <p className="text-xs text-slate-500 font-medium">Duration</p>
                                <p className="font-bold text-slate-900">{tour.duration_days} Days</p>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl flex items-center gap-4">
                            <Users className="w-8 h-8 text-blue-500" />
                            <div>
                                <p className="text-xs text-slate-500 font-medium">Group Size</p>
                                <p className="font-bold text-slate-900">{tour.min_participants} - {tour.max_participants}</p>
                            </div>
                        </div>
                    </div>

                    {/* Gallery Photos (3-4 photos showcase) */}
                    {tour.images && tour.images.length > 0 && (
                        <div className="mb-10 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                            <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                                <Camera className="w-4 h-4 text-emerald-600" />
                                <span>Tour Attraction Gallery ({1 + tour.images.length} Photos)</span>
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {tour.cover_image && (
                                    <div className="relative rounded-xl overflow-hidden aspect-video border border-slate-200 bg-white group shadow-2xs">
                                        <img
                                            src={storageUrl(tour.cover_image)}
                                            alt={tour.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                        />
                                        <span className="absolute bottom-1.5 left-1.5 bg-black/60 text-[10px] text-white px-1.5 py-0.5 rounded font-semibold">
                                            Cover Photo
                                        </span>
                                    </div>
                                )}
                                {tour.images.map((img: any, idx: number) => (
                                    <div key={img.id || idx} className="relative rounded-xl overflow-hidden aspect-video border border-slate-200 bg-white group shadow-2xs">
                                        <img
                                            src={storageUrl(img.image_path)}
                                            alt={img.alt_text || `${tour.title} photo ${idx + 2}`}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                        />
                                        <span className="absolute bottom-1.5 left-1.5 bg-black/60 text-[10px] text-white px-1.5 py-0.5 rounded font-semibold">
                                            Photo {idx + 2}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-12">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-emerald-500" /> Inclusions & Details
                            </h3>
                            {tour.inclusions && tour.inclusions.length > 0 ? (
                                <ul className="space-y-3">
                                    {tour.inclusions.map((item, i) => (
                                        <li key={i} className="flex items-start gap-3 text-slate-600">
                                            <div className="mt-1"><CheckCircle className="w-4 h-4 text-emerald-500" /></div>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-slate-500">Contact agency for full itinerary details.</p>
                            )}
                            
                            {tour.meeting_point && (
                                <div className="mt-8 bg-amber-50 p-5 rounded-2xl border border-amber-100">
                                    <h4 className="font-bold text-amber-800 mb-2">Meeting Point</h4>
                                    <p className="text-amber-700">{tour.meeting_point}</p>
                                </div>
                            )}
                        </div>

                        <div>
                            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <CalendarDays className="w-5 h-5 text-blue-500" /> Availability & Departure Dates
                            </h3>
                            
                            <div className="mb-6">
                                <BookingCalendar
                                    packageId={tour.id}
                                    schedules={tour.schedules || []}
                                    selectedId={bookingModal.scheduleId ?? undefined}
                                    selectedDate={bookingModal.date}
                                    onSelect={(schedule) => {
                                        const seats = schedule.capacity - schedule.reserved_slots;
                                        setParticipantsCount(1);
                                        setSpecialRequests('');
                                        setPaymentMethod('gcash');
                                        setBookingError('');
                                        setBookingModal({
                                            isOpen: true,
                                            scheduleId: schedule.id > 0 ? schedule.id : null,
                                            date: schedule.departure_date,
                                            availableSeats: seats
                                        });
                                    }}
                                />
                            </div>
                            
                            {/* @ts-ignore */}
                            {tour.schedules && tour.schedules.length > 0 ? (
                                <div className="space-y-4">
                                    {/* @ts-ignore */}
                                    {tour.schedules.map((schedule: any) => {
                                        const availableSeats = schedule.capacity - schedule.reserved_slots;
                                        return (
                                            <div key={schedule.id} className="border border-slate-200 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-emerald-200 hover:bg-emerald-50/30 transition-colors">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Calendar className="w-4 h-4 text-slate-400" />
                                                        <p className="font-bold text-slate-900">
                                                            {new Date(schedule.departure_date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-sm text-slate-500">
                                                        {schedule.start_time && <span>Time: {schedule.start_time.substring(0, 5)}</span>}
                                                        <span className={availableSeats < 5 ? "text-amber-600 font-bold" : ""}>
                                                            {availableSeats} seats left
                                                        </span>
                                                    </div>
                                                </div>
                                                <button 
                                                    disabled={availableSeats <= 0}
                                                    onClick={() => { setParticipantsCount(1); setSpecialRequests(''); setPaymentMethod('gcash'); setBookingError(''); setBookingModal({ isOpen: true, scheduleId: schedule.id }); }}
                                                    className="bg-slate-900 hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
                                                >
                                                    {availableSeats <= 0 ? 'Fully Booked' : 'Book Now'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center p-8 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p className="text-slate-500">No upcoming schedules available.</p>
                                    <p className="text-sm text-slate-400 mt-2">Check back later or contact the agency.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Interactive Destination & Location Map */}
                    <div className="mt-12 pt-8 border-t border-slate-100">
                        <div className="mb-4">
                            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-emerald-600" /> Destination & Location Map
                            </h3>
                            <p className="text-sm text-slate-500 mt-0.5">
                                Interactive location coordinates, directions, and meeting point details.
                            </p>
                        </div>
                        <BookingLocationMap tourPackage={tour} />
                    </div>
                </div>
            </div>

            {/* Booking Modal */}
            {bookingModal.isOpen && (() => {
                const schedule = (tour.schedules ?? []).find((item: any) => item.id === bookingModal.scheduleId) as any;
                const availableSeats = schedule ? schedule.capacity - schedule.reserved_slots : 0;
                const totalAmount = Number(tour.price_per_person) * participantsCount;
                const advanceAmount = totalAmount * 0.5;
                const dueAmount = paymentOption === 'full' ? totalAmount : advanceAmount;
                return (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="customer-booking-title"
                    onClick={() => setBookingModal({ isOpen: false, scheduleId: null })}
                >
                    <div
                        ref={modalRef}
                        className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[92vh] flex flex-col animate-modal-in"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 id="customer-booking-title" className="text-xl font-bold text-slate-900">Book Tour</h3>
                                <p className="text-sm text-slate-500 mt-0.5">Review your trip before confirming.</p>
                            </div>
                            <button
                                ref={closeBtnRef}
                                onClick={() => setBookingModal({ isOpen: false, scheduleId: null })}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                                aria-label="Close booking modal"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleBook} className="p-6 space-y-4 overflow-y-auto">
                            <section className="rounded-2xl bg-sky-50 border border-sky-100 p-4">
                                <p className="text-xs font-bold uppercase tracking-wider text-sky-700">Selected package</p>
                                <div className="mt-2 flex items-start justify-between gap-4">
                                    <div>
                                        <p className="font-bold text-slate-900">{tour.title}</p>
                                        <p className="text-sm text-slate-600">{tour.destination} · {schedule ? new Date(schedule.departure_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Schedule unavailable'}</p>
                                    </div>
                                    <p className="font-black text-sky-700 whitespace-nowrap">₱{Number(tour.price_per_person).toLocaleString()}<span className="text-xs font-medium"> / person</span></p>
                                </div>
                            </section>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="rounded-xl border border-slate-200 p-3"><p className="text-slate-500">Available slots</p><p className="font-bold text-slate-900">{availableSeats} seats</p></div>
                                <div className="rounded-xl border border-slate-200 p-3"><p className="text-slate-500">Travel date</p><p className="font-bold text-slate-900 truncate">{schedule ? new Date(schedule.departure_date).toLocaleDateString() : '—'}</p></div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Number of Participants</label>
                                <input
                                    type="number"
                                    min="1"
                                    max={availableSeats}
                                    value={participantsCount}
                                    onChange={(e) => setParticipantsCount(Number(e.target.value))}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
                                    required
                                />
                            </div>

                            {/* Payment Option: 50% Advance vs Full Payment */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Payment Option</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentOption('advance')}
                                        className={`p-3 rounded-2xl border text-left transition-all ${
                                            paymentOption === 'advance'
                                                ? 'border-sky-500 bg-sky-50/70 ring-2 ring-sky-500/20'
                                                : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold text-xs text-slate-900">50% Advance</span>
                                            <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                                                paymentOption === 'advance' ? 'border-sky-600 bg-sky-600' : 'border-slate-300'
                                            }`}>
                                                {paymentOption === 'advance' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                            </span>
                                        </div>
                                        <p className="text-xs font-black text-sky-700">₱{advanceAmount.toLocaleString()} now</p>
                                        <p className="text-[11px] text-slate-500 mt-0.5">Pay remaining 50% before tour</p>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setPaymentOption('full')}
                                        className={`p-3 rounded-2xl border text-left transition-all ${
                                            paymentOption === 'full'
                                                ? 'border-sky-500 bg-sky-50/70 ring-2 ring-sky-500/20'
                                                : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold text-xs text-slate-900">Full Payment</span>
                                            <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                                                paymentOption === 'full' ? 'border-sky-600 bg-sky-600' : 'border-slate-300'
                                            }`}>
                                                {paymentOption === 'full' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                            </span>
                                        </div>
                                        <p className="text-xs font-black text-sky-700">₱{totalAmount.toLocaleString()} now</p>
                                        <p className="text-[11px] text-slate-500 mt-0.5">100% fully paid upfront</p>
                                    </button>
                                </div>
                            </div>

                            {/* Payment Method Picker */}
                            <PaymentMethodPicker
                                value={paymentMethod}
                                onChange={setPaymentMethod}
                                dueAmount={dueAmount}
                                gcashNumber={tour.agency?.gcash_number}
                                gcashAccountName={tour.agency?.gcash_account_name}
                                paymentQrCodeUrl={tour.agency?.payment_qr_code_url}
                            />

                            {bookingError && <p role="alert" className="text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{bookingError}</p>}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Special Requests (Optional)</label>
                                <textarea
                                    rows={3}
                                    value={specialRequests}
                                    onChange={(e) => setSpecialRequests(e.target.value)}
                                    placeholder="Dietary requirements, allergies, etc."
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
                                />
                            </div>
                            
                            <div className="pt-4 border-t border-slate-100">
                                <div className="mb-4 rounded-xl border border-sky-100 bg-sky-50 p-3 text-sm text-sky-900">
                                    <p className="font-bold">
                                        {paymentOption === 'full' ? 'Full Payment (100%)' : '50% Advance Payment Required'}
                                    </p>
                                    <p className="mt-1">
                                        Amount due now: <strong>₱{dueAmount.toLocaleString()}</strong>.
                                        {paymentOption === 'full'
                                            ? ' Your booking is confirmed immediately after the agency verifies your full payment.'
                                            : ` Remaining balance of ₱${advanceAmount.toLocaleString()} to be settled before your tour.`}
                                    </p>
                                </div>
                                <div className="flex justify-between items-center mb-4 text-slate-700">
                                    <span className="font-medium">Total Price:</span>
                                    <span className="text-2xl font-bold text-slate-900">
                                        ₱{totalAmount.toLocaleString()}
                                    </span>
                                </div>
                                <button
                                    type="submit"
                                    disabled={bookMutation.isPending || availableSeats < 1}
                                    className="w-full bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                                >
                                    {bookMutation.isPending ? (
                                        <><Loader2 className="w-5 h-5 animate-spin" /> Creating booking...</>
                                    ) : paymentMethod === 'gcash' ? (
                                        `Pay ₱${dueAmount.toLocaleString()} via GCash`
                                    ) : (
                                        'Reserve — pay cash at agency'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
                );
            })()}
            <StatusModal isOpen={!!statusModal} title={statusModal?.title ?? ''} message={statusModal?.message ?? ''} type={statusModal?.type} onClose={() => { const wasSuccess = statusModal?.type === 'success'; setStatusModal(null); if (wasSuccess) navigate('/customer/bookings'); }} />
        </div>
    );
}
