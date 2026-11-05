import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
    Compass, MapPin, Clock, Users, ArrowLeft, CheckCircle,
    XCircle, Waves, Sparkles, ShieldCheck,
    Camera, X, ChevronLeft, ChevronRight, Navigation, ExternalLink,
    Check, Share2, HelpCircle, ArrowRight
} from 'lucide-react';
import { toursApi, storageUrl, FALLBACK_ISLAND_IMAGES } from '../lib/api';
import BookingLocationMap from '../components/maps/BookingLocationMap';
import GuestBookingModal from '../components/GuestBookingModal';
import BookingCalendar from '../components/BookingCalendar';
import type { TourPackage, TourSchedule } from '../types';

export default function TourDetails() {
    const { id } = useParams<{ id: string }>();
    const [selectedSchedule, setSelectedSchedule] = useState<TourSchedule | null>(null);
    const [participantsCount, setParticipantsCount] = useState<number>(1);
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [activePhotoIndex, setActivePhotoIndex] = useState(0);
    const [copiedShare, setCopiedShare] = useState(false);

    // Fetch primary tour data
    const { data: tour, isLoading, isError } = useQuery({
        queryKey: ['tour', id],
        queryFn: () => toursApi.show(Number(id)).then(r => r.data),
    });

    // Fetch related tours (same category)
    const { data: relatedData } = useQuery({
        queryKey: ['related-tours', id],
        queryFn: () => toursApi.list({ per_page: 4 }).then(r => r.data),
        enabled: !!tour,
    });

    const relatedTours: TourPackage[] = (relatedData?.data || [])
        .filter((t: TourPackage) => t.id !== Number(id))
        .slice(0, 3);

    useEffect(() => { setSelectedSchedule(null); }, [id]);

    // Handle Lightbox Keyboard navigation
    useEffect(() => {
        if (!isLightboxOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsLightboxOpen(false);
            if (e.key === 'ArrowRight') nextPhoto();
            if (e.key === 'ArrowLeft') prevPhoto();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    });

    if (isLoading) {
        return (
            <div className="bg-[#FAFBFD] min-h-screen pt-24 pb-16">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 animate-pulse space-y-6">
                    <div className="h-6 bg-slate-200 rounded w-48" />
                    <div className="h-10 bg-slate-200 rounded w-3/4" />
                    <div className="h-96 bg-slate-200 rounded-3xl" />
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-4">
                            <div className="h-40 bg-slate-200 rounded-2xl" />
                            <div className="h-40 bg-slate-200 rounded-2xl" />
                        </div>
                        <div className="h-80 bg-slate-200 rounded-3xl" />
                    </div>
                </div>
            </div>
        );
    }

    if (isError || !tour) {
        return (
            <div className="min-h-screen bg-[#FAFBFD] flex items-center justify-center px-4 py-24">
                <div className="text-center max-w-md bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                    <Compass className="w-16 h-16 mx-auto mb-4 text-slate-300" aria-hidden="true" />
                    <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Tour Not Found</h1>
                    <p className="text-sm text-slate-500 mb-6">
                        The requested island hopping tour package could not be found or is currently unavailable.
                    </p>
                    <Link
                        to="/tours"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> Browse Available Tours
                    </Link>
                </div>
            </div>
        );
    }

    const mainImageUrl = storageUrl(tour.cover_image, tour.id);
    const schedules: TourSchedule[] = (tour.schedules as TourSchedule[] | undefined) ?? [];

    // Compile gallery photos
    const galleryPhotos: { url: string; alt: string }[] = [
        { url: mainImageUrl, alt: `${tour.title} Main Cover` },
    ];
    if (tour.images && tour.images.length > 0) {
        tour.images.forEach((img, idx) => {
            const url = storageUrl(img.image_path, tour.id + idx + 1);
            if (url !== mainImageUrl) {
                galleryPhotos.push({ url, alt: img.alt_text || `${tour.title} Photo ${idx + 2}` });
            }
        });
    }
    // If only 1 image exists, provide scenic island perspective snapshots from verified set for attraction feel
    if (galleryPhotos.length === 1) {
        const fallbacks = [
            FALLBACK_ISLAND_IMAGES[(tour.id + 1) % FALLBACK_ISLAND_IMAGES.length],
            FALLBACK_ISLAND_IMAGES[(tour.id + 2) % FALLBACK_ISLAND_IMAGES.length],
            FALLBACK_ISLAND_IMAGES[(tour.id + 3) % FALLBACK_ISLAND_IMAGES.length],
        ];
        fallbacks.forEach((fbUrl, idx) => {
            galleryPhotos.push({ url: fbUrl, alt: `${tour.destination || 'Island'} Scenic Snapshot ${idx + 1}` });
        });
    }

    const nextPhoto = () => {
        setActivePhotoIndex((prev) => (prev + 1) % galleryPhotos.length);
    };

    const prevPhoto = () => {
        setActivePhotoIndex((prev) => (prev - 1 + galleryPhotos.length) % galleryPhotos.length);
    };

    const price = Number(tour.price_per_person) || 0;
    const availableSeats = selectedSchedule ? (selectedSchedule.capacity - selectedSchedule.reserved_slots) : (tour.max_participants || 20);
    const canBookSelected = Boolean(selectedSchedule && availableSeats > 0 && selectedSchedule.status === 'open');

    const totalPrice = price * participantsCount;
    const advanceDeposit = totalPrice * 0.5;
    const balanceDue = totalPrice - advanceDeposit;

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2500);
    };

    const directionsUrl = tour.latitude && tour.longitude
        ? `https://www.google.com/maps/search/?api=1&query=${tour.latitude},${tour.longitude}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tour.destination_address || tour.destination_name || tour.destination)}`;

    return (
        <div className="bg-[#FAFBFD] min-h-screen pt-20 pb-24">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">

                {/* ── Breadcrumb & Action bar ──────────────────────────────── */}
                <div className="flex flex-wrap items-center justify-between gap-4 py-4 mb-2 text-xs">
                    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-slate-500 font-medium">
                        <Link to="/" className="hover:text-slate-900 transition-colors">Home</Link>
                        <span>/</span>
                        <Link to="/tours" className="hover:text-slate-900 transition-colors">Island Tours</Link>
                        <span>/</span>
                        <span className="text-slate-900 font-bold truncate max-w-[200px] sm:max-w-xs">{tour.title}</span>
                    </nav>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleShare}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold transition-colors"
                            title="Copy link to clipboard"
                        >
                            {copiedShare ? (
                                <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="text-emerald-700">Link Copied!</span>
                                </>
                            ) : (
                                <>
                                    <Share2 className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Share</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* ── Attraction Header ───────────────────────────────────── */}
                <div className="mb-6">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-bold">
                            <Waves className="w-3.5 h-3.5 text-emerald-600" />
                            Island Hopping
                        </span>
                        {tour.agency && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-sky-50 border border-sky-200/80 text-sky-800 text-xs font-semibold">
                                <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                                Verified Agency: {tour.agency.name}
                            </span>
                        )}
                    </div>

                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-3">
                        {tour.title}
                    </h1>

                    <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-sm text-slate-600">
                        <span className="flex items-center gap-1.5 font-medium">
                            <MapPin className="w-4 h-4 text-sky-600 shrink-0" aria-hidden="true" />
                            {tour.destination_name || tour.destination}
                            {tour.destination_address && <span className="text-slate-400">({tour.destination_address})</span>}
                        </span>
                        <span className="text-slate-300 hidden sm:inline">·</span>
                        <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                            <Sparkles className="w-4 h-4 text-emerald-500" />
                            Direct Agency Rates · 0% Guest Booking Fee
                        </span>
                    </div>
                </div>

                {/* ── Photo Gallery (Tripadvisor Attraction Layout) ───────── */}
                <div className="relative mb-10 rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm bg-slate-900">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 h-[340px] sm:h-[420px] md:h-[460px]">
                        {/* Main primary photo */}
                        <div
                            onClick={() => { setActivePhotoIndex(0); setIsLightboxOpen(true); }}
                            className={`${galleryPhotos.length > 1 ? 'md:col-span-3' : 'md:col-span-4'} relative h-full cursor-pointer group overflow-hidden`}
                        >
                            <img
                                src={galleryPhotos[0].url}
                                alt={galleryPhotos[0].alt}
                                onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = FALLBACK_ISLAND_IMAGES[0];
                                }}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                            <div className="absolute bottom-4 left-4 text-white">
                                <p className="text-xs uppercase tracking-widest font-extrabold text-sky-300">Featured Attraction</p>
                                <p className="text-base sm:text-lg font-bold drop-shadow-sm">{tour.title}</p>
                            </div>
                        </div>

                        {/* Side thumbnails (desktop) */}
                        {galleryPhotos.length > 1 && (
                            <div className="hidden md:flex flex-col gap-2 h-full">
                                {galleryPhotos.slice(1, 4).map((photo, idx) => {
                                    const isLastThumb = idx === 2;
                                    const hasMore = galleryPhotos.length > 4;
                                    const extraPhotosCount = galleryPhotos.length - 4;
                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => { setActivePhotoIndex(idx + 1); setIsLightboxOpen(true); }}
                                            className="relative flex-1 cursor-pointer group overflow-hidden"
                                        >
                                            <img
                                                src={photo.url}
                                                alt={photo.alt}
                                                onError={(e) => {
                                                    e.currentTarget.onerror = null;
                                                    e.currentTarget.src = FALLBACK_ISLAND_IMAGES[(idx + 1) % FALLBACK_ISLAND_IMAGES.length];
                                                }}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                                            {isLastThumb && hasMore && (
                                                <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-[2px] flex items-center justify-center text-white font-extrabold text-xs">
                                                    +{extraPhotosCount} more
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* View all photos action pill */}
                    <button
                        onClick={() => { setActivePhotoIndex(0); setIsLightboxOpen(true); }}
                        className="absolute bottom-4 right-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950/85 hover:bg-slate-950 text-white text-xs font-bold shadow-lg backdrop-blur-md transition-all active:scale-95"
                    >
                        <Camera className="w-4 h-4 text-sky-400" />
                        <span>View All Photos ({galleryPhotos.length})</span>
                    </button>
                </div>

                {/* ── Main 2-Column Content Layout ────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* ── Left 2 Columns: Tour Details ───────────────────── */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Quick highlights badge grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
                                <Clock className="w-5 h-5 text-sky-600 mb-1" />
                                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Duration</p>
                                <p className="font-extrabold text-slate-900 text-sm">
                                    {tour.duration_days} Day{tour.duration_days > 1 ? 's' : ''}
                                </p>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
                                <Users className="w-5 h-5 text-sky-600 mb-1" />
                                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Group Size</p>
                                <p className="font-extrabold text-slate-900 text-sm">
                                    {tour.min_participants ?? 1}–{tour.max_participants} Guests
                                </p>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
                                <Waves className="w-5 h-5 text-emerald-600 mb-1" />
                                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Type</p>
                                <p className="font-extrabold text-slate-900 text-sm">Island Hopping</p>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
                                <ShieldCheck className="w-5 h-5 text-sky-600 mb-1" />
                                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Ticket</p>
                                <p className="font-extrabold text-slate-900 text-sm">Instant Mobile</p>
                            </div>
                        </div>

                        {/* About this tour */}
                        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-2xs">
                            <h2 className="text-xl font-extrabold text-slate-900 mb-4 flex items-center gap-2">
                                <span>About This Experience</span>
                            </h2>
                            <p className="text-slate-600 text-base leading-relaxed whitespace-pre-line">
                                {tour.description || 'Explore the breathtaking turquoise lagoons, white-sand sandbars, and vibrant coral reefs with licensed local captains and guides.'}
                            </p>
                            {tour.location_description && (
                                <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm text-slate-600">
                                    <span className="font-bold text-slate-800">Location Highlights: </span>
                                    {tour.location_description}
                                </div>
                            )}
                        </div>

                        {/* Itinerary timeline if available */}
                        {tour.itinerary && (
                            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-2xs">
                                <h2 className="text-xl font-extrabold text-slate-900 mb-4">Tour Itinerary</h2>
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 text-sm leading-relaxed whitespace-pre-line">
                                    {tour.itinerary}
                                </div>
                            </div>
                        )}

                        {/* Inclusions & Exclusions */}
                        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-2xs">
                            <h2 className="text-xl font-extrabold text-slate-900 mb-6">What's Included & Excluded</h2>
                            <div className="grid sm:grid-cols-2 gap-6">
                                <div>
                                    <p className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2 text-emerald-700">
                                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                                        Package Inclusions
                                    </p>
                                    {tour.inclusions && tour.inclusions.length > 0 ? (
                                        <ul className="space-y-2.5">
                                            {tour.inclusions.map((item, i) => (
                                                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                                                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <ul className="space-y-2 text-sm text-slate-500">
                                            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Island hopping boat transfer</li>
                                            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Standard safety life vests</li>
                                            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Licensed local boat captain</li>
                                            <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Environmental and docking fees</li>
                                        </ul>
                                    )}
                                </div>

                                <div>
                                    <p className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2 text-slate-700">
                                        <XCircle className="w-4 h-4 text-rose-400" />
                                        Package Exclusions
                                    </p>
                                    {tour.exclusions && tour.exclusions.length > 0 ? (
                                        <ul className="space-y-2.5">
                                            {tour.exclusions.map((item, i) => (
                                                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                                                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <ul className="space-y-2 text-sm text-slate-500">
                                            <li className="flex items-center gap-2"><XCircle className="w-4 h-4 text-rose-400" /> Personal travel insurance</li>
                                            <li className="flex items-center gap-2"><XCircle className="w-4 h-4 text-rose-400" /> Optional tips and gratuities</li>
                                            <li className="flex items-center gap-2"><XCircle className="w-4 h-4 text-rose-400" /> Personal snorkeling gear / aqua shoes</li>
                                        </ul>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Meeting Point & Departure Notice */}
                        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-2xs">
                            <h2 className="text-xl font-extrabold text-slate-900 mb-4 flex items-center gap-2">
                                <Navigation className="w-5 h-5 text-sky-600" />
                                Meeting Point & Departure
                            </h2>
                            <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-100 flex items-start gap-3 mb-4">
                                <MapPin className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-bold uppercase text-sky-700">Assembly Location</p>
                                    <p className="text-sm font-semibold text-slate-900">
                                        {tour.meeting_point || tour.destination_address || 'Designated Island Hopping Pier / Port Authority'}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Please arrive at least 30 minutes before your scheduled departure time for passenger manifest registration.
                                    </p>
                                </div>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4 text-xs text-slate-500">
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                    <span className="font-bold text-slate-700 block mb-1">What to Bring</span>
                                    <span>Reef-safe sunscreen, swimwear, dry bag, towel, sunglasses, and personal identification for the port manifest.</span>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                    <span className="font-bold text-slate-700 block mb-1">50% Advance Policy</span>
                                    <span>50% deposit confirms your reserved boat seat. The remaining balance is payable upon pier arrival.</span>
                                </div>
                            </div>
                        </div>

                        {/* Destination Map */}
                        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-2xs">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                                <div>
                                    <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                                        <MapPin className="w-5 h-5 text-sky-600" />
                                        Attraction Destination Map
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Interactive map coordinates for {tour.destination_name || tour.destination}
                                    </p>
                                </div>

                                <a
                                    href={directionsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors shrink-0"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>Get Directions</span>
                                </a>
                            </div>

                            <div className="rounded-2xl overflow-hidden border border-slate-200">
                                <BookingLocationMap tourPackage={tour} />
                            </div>
                        </div>

                        {/* Customer Reviews & Feedback */}
                        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-2xs">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-xl font-extrabold text-slate-900">Guest Reviews & Ratings</h2>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Authentic verified traveler ratings collected post-tour
                                    </p>
                                </div>
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                                    Verified Feedback
                                </span>
                            </div>

                            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/70 text-center">
                                <HelpCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                <p className="text-sm font-semibold text-slate-700">Reviews are not available yet for this island package.</p>
                                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                                    IslandGo maintains genuine feedback standards. Only travelers who have completed their scheduled tour are invited to submit verified reviews.
                                </p>
                            </div>
                        </div>

                        {/* Related Tours */}
                        {relatedTours.length > 0 && (
                            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-2xs">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-extrabold text-slate-900">Other Island Hopping Tours</h2>
                                    <Link to="/tours" className="text-xs font-bold text-sky-600 hover:underline flex items-center gap-1">
                                        View all <ArrowRight className="w-3.5 h-3.5" />
                                    </Link>
                                </div>
                                <div className="grid sm:grid-cols-3 gap-4">
                                    {relatedTours.map((rel) => {
                                        const relImg = storageUrl(rel.cover_image, rel.id);
                                        return (
                                            <Link
                                                key={rel.id}
                                                to={`/tours/${rel.id}`}
                                                className="group block rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-all"
                                            >
                                                <div className="h-28 bg-slate-100 overflow-hidden relative">
                                                    <img
                                                        src={relImg}
                                                        alt={rel.title}
                                                        onError={(e) => {
                                                            e.currentTarget.onerror = null;
                                                            e.currentTarget.src = FALLBACK_ISLAND_IMAGES[rel.id % FALLBACK_ISLAND_IMAGES.length];
                                                        }}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                    />
                                                </div>
                                                <div className="p-3">
                                                    <p className="text-xs font-bold text-slate-900 line-clamp-1 group-hover:text-sky-600 transition-colors">
                                                        {rel.title}
                                                    </p>
                                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                                        ₱{Number(rel.price_per_person).toLocaleString()} / person
                                                    </p>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                    </div>

                    {/* ── Right Column: Sticky Booking Widget ─────────────── */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24 space-y-4">
                            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-900/5 p-6 md:p-7">
                                
                                {/* Pricing header */}
                                <div className="mb-6 pb-5 border-b border-slate-100">
                                    <p className="text-xs uppercase font-extrabold text-slate-400 tracking-wider mb-1">
                                        Direct Agency Rate
                                    </p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl sm:text-4xl font-black text-slate-900">
                                            ₱{price.toLocaleString()}
                                        </span>
                                        <span className="text-xs text-slate-500 font-semibold">/ person</span>
                                    </div>
                                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold">
                                        <Check className="w-3.5 h-3.5" />
                                        <span>50% deposit: ₱{(price * 0.5).toLocaleString()}</span>
                                    </div>
                                </div>

                                <div id="booking-calendar-widget" className="mb-5 scroll-mt-24">
                                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">Select Travel Date</label>
                                    <BookingCalendar packageId={tour.id} schedules={schedules} selectedId={selectedSchedule?.id} selectedDate={selectedSchedule?.departure_date} onSelect={schedule => {
                                        setSelectedSchedule(schedule);
                                        const seats = schedule.capacity - schedule.reserved_slots;
                                        if (participantsCount > seats) setParticipantsCount(Math.max(1, seats));
                                    }} />
                                    {selectedSchedule && <p className="mt-2 text-sm font-semibold text-sky-800">Selected: {new Date(`${selectedSchedule.departure_date}T00:00:00`).toLocaleDateString('en-US', { dateStyle: 'long' })}</p>}
                                </div>

                                {/* Participants counter */}
                                <div className="mb-6">
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                        Number of Guests
                                    </label>
                                    <div className="flex items-center justify-between border border-slate-200 rounded-2xl p-2 bg-slate-50">
                                        <button
                                            type="button"
                                            onClick={() => setParticipantsCount((prev) => Math.max(1, prev - 1))}
                                            disabled={participantsCount <= 1}
                                            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-black text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                                        >
                                            −
                                        </button>
                                        <div className="text-center">
                                            <span className="text-base font-extrabold text-slate-900">
                                                {participantsCount}
                                            </span>
                                            <span className="text-xs text-slate-400 block font-medium">
                                                Guest{participantsCount > 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const maxAllowed = selectedSchedule ? (selectedSchedule.capacity - selectedSchedule.reserved_slots) : tour.max_participants;
                                                setParticipantsCount((prev) => Math.min(maxAllowed, prev + 1));
                                            }}
                                            disabled={selectedSchedule ? participantsCount >= availableSeats : participantsCount >= tour.max_participants}
                                            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-black text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                                        >
                                            +
                                        </button>
                                    </div>
                                    {selectedSchedule && availableSeats > 0 && (
                                        <p className="text-[11px] text-slate-400 mt-1.5 text-center">
                                            Maximum {availableSeats} guest{availableSeats > 1 ? 's' : ''} on selected date
                                        </p>
                                    )}
                                </div>

                                {/* Pricing Breakdown */}
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 mb-6 text-xs">
                                    <div className="flex justify-between text-slate-600">
                                        <span>Total ({participantsCount} × ₱{price.toLocaleString()})</span>
                                        <span className="font-bold text-slate-900">₱{totalPrice.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-emerald-700 font-bold border-t border-slate-200/60 pt-2">
                                        <span>50% Required Advance</span>
                                        <span>₱{advanceDeposit.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-500">
                                        <span>Remaining balance on departure</span>
                                        <span>₱{balanceDue.toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* Book Now CTA */}
                                <button
                                    type="button"
                                    disabled={!canBookSelected}
                                    onClick={() => {
                                        if (selectedSchedule && canBookSelected) {
                                            setIsBookingModalOpen(true);
                                        }
                                    }}
                                    className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-black text-sm rounded-2xl shadow-md transition-all active:scale-[0.98]"
                                >
                                    {!selectedSchedule
                                        ? 'Select a Schedule'
                                        : availableSeats <= 0
                                        ? 'Schedule Fully Booked'
                                        : 'Book Now'}
                                </button>

                                {/* Trust assurances */}
                                <div className="mt-5 pt-4 border-t border-slate-100 space-y-2 text-[11px] text-slate-500">
                                    <p className="flex items-center gap-2">
                                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                        <span>Instant booking reference code issued</span>
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                        <span>Track reservation status at /track anytime</span>
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                        <span>Instant SMS & Email booking notifications</span>
                                    </p>
                                </div>

                            </div>
                        </div>
                    </div>

                </div>

            </div>

            {/* ── Mobile Sticky Booking Bar ──────────────────────────────── */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-4 py-3 flex items-center justify-between shadow-lg">
                <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">From</span>
                    <span className="text-base font-black text-slate-900">₱{price.toLocaleString()}</span>
                    <span className="text-[10px] text-slate-500 font-medium"> / person</span>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        if (selectedSchedule && canBookSelected) {
                            setIsBookingModalOpen(true);
                        } else {
                            document.getElementById('booking-calendar-widget')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }}
                    className={`px-5 py-2.5 font-bold text-xs rounded-xl shadow-sm transition-all ${
                        canBookSelected
                            ? 'bg-sky-600 hover:bg-sky-700 active:scale-95 text-white shadow-sky-600/20'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                >
                    {canBookSelected ? 'Book Now' : 'Select Date & Book'}
                </button>
            </div>

            {/* ── Accessible Photo Lightbox ─────────────────────────────────── */}
            {isLightboxOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Photo Gallery"
                >
                    <button
                        onClick={() => setIsLightboxOpen(false)}
                        className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                        aria-label="Close photo gallery"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <button
                        onClick={prevPhoto}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                        aria-label="Previous photo"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>

                    <div className="max-w-4xl max-h-[85vh] flex flex-col items-center">
                        <img
                            src={galleryPhotos[activePhotoIndex].url}
                            alt={galleryPhotos[activePhotoIndex].alt}
                            onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = FALLBACK_ISLAND_IMAGES[activePhotoIndex % FALLBACK_ISLAND_IMAGES.length];
                            }}
                            className="max-h-[75vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
                        />
                        <div className="mt-4 text-center text-white">
                            <p className="text-sm font-semibold">{galleryPhotos[activePhotoIndex].alt}</p>
                            <p className="text-xs text-slate-400 mt-1">
                                {activePhotoIndex + 1} of {galleryPhotos.length}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={nextPhoto}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                        aria-label="Next photo"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>
            )}

            {/* ── Booking Modal (Guest + Authenticated supported) ────────────── */}
            {isBookingModalOpen && selectedSchedule && (
                <GuestBookingModal
                    tour={tour}
                    schedule={selectedSchedule}
                    initialParticipants={participantsCount}
                    onClose={() => setIsBookingModalOpen(false)}
                />
            )}
        </div>
    );
}
