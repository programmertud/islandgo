import { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
    Search, ArrowRight, MapPin, Users, Shield,
    Map, TicketCheck, CheckCircle, Star, Waves,
    ChevronDown, Camera, Compass, Anchor, Package,
} from 'lucide-react';
import { toursApi, storageUrl, FALLBACK_ISLAND_IMAGES } from '../lib/api';
import Reveal from '../components/Reveal';
import { useCountUp } from '../hooks/useCountUp';
import type { FormEvent } from 'react';
import type { TourPackage, PaginatedResponse } from '../types';

// ─── Why Book section (always static/truthful) ───────────────────────────────
const WHY_ITEMS = [
    {
        icon: Shield,
        title: 'Verified Agencies',
        desc: 'Every agency is reviewed and approved before listing packages on the platform.',
        color: 'sky',
    },
    {
        icon: TicketCheck,
        title: 'Instant Confirmation',
        desc: 'Receive your booking reference immediately. No waiting, no uncertainty.',
        color: 'emerald',
    },
    {
        icon: Star,
        title: 'Upfront Pricing',
        desc: 'What you see is what you pay — per-person rates displayed on every card.',
        color: 'amber',
    },
    {
        icon: Anchor,
        title: 'Local Expertise',
        desc: 'Tours crafted by verified local operators who know every hidden cove, sandbar, and dive reef.',
        color: 'violet',
    },
];

const WHY_COLOR: Record<string, { bg: string; icon: string; border: string }> = {
    sky:    { bg: 'bg-sky-50',    icon: 'text-sky-600',    border: 'border-sky-100' },
    emerald:{ bg: 'bg-emerald-50',icon: 'text-emerald-600',border: 'border-emerald-100' },
    amber:  { bg: 'bg-amber-50',  icon: 'text-amber-500',  border: 'border-amber-100' },
    violet: { bg: 'bg-violet-50', icon: 'text-violet-600', border: 'border-violet-100' },
};

// ─── Animated stat counter ───────────────────────────────────────────────────
function StatCounter({ end, suffix, label, enabled }: {
    end: number; suffix: string; label: string; enabled: boolean;
}) {
    const count = useCountUp({ end, enabled, duration: 1600 });
    return (
        <div className="text-center">
            <p className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                {count}<span className="text-sky-300">{suffix}</span>
            </p>
            <p className="text-sm font-semibold text-sky-100/80 mt-1">{label}</p>
        </div>
    );
}

export default function Home() {
    const navigate = useNavigate();
    const [searchInput, setSearchInput] = useState('');
    const [heroIndex, setHeroIndex] = useState(0);
    const [statsVisible, setStatsVisible] = useState(false);
    const statsRef = useRef<HTMLDivElement | null>(null);

    // ── Fetch ALL published packages (up to 24 for homepage use) ─────────────
    const { data, isLoading } = useQuery({
        queryKey: ['home-tours'],
        queryFn: () =>
            toursApi.list({ per_page: 24 }).then(r => r.data as PaginatedResponse<TourPackage>),
    });

    const allTours: TourPackage[] = data?.data ?? [];
    const totalPackages = data?.total ?? 0;

    // ── Derive data from real packages ────────────────────────────────────────

    // Hero slides: use real cover images and gallery photos from packages in this project
    const heroSlides = useMemo(() => {
        const slides: Array<{ url: string; caption: string; dest: string; id: number }> = [];
        for (const t of allTours) {
            const dest = t.destination_name || t.destination || 'Island Destination';
            if (t.cover_image) {
                slides.push({
                    url: storageUrl(t.cover_image),
                    caption: t.title,
                    dest,
                    id: t.id,
                });
            }
            if (t.images && t.images.length > 0) {
                for (const img of t.images) {
                    slides.push({
                        url: storageUrl(img.image_path),
                        caption: t.title,
                        dest,
                        id: t.id,
                    });
                }
            }
        }
        // Fallback only if database is completely empty
        if (slides.length === 0) {
            FALLBACK_ISLAND_IMAGES.forEach((url, idx) => {
                slides.push({
                    url,
                    caption: 'Island Expedition',
                    dest: 'Palawan & Philippine Islands',
                    id: idx,
                });
            });
        }
        return slides.slice(0, 5);
    }, [allTours]);

    // Scenic strip: 4 real photos from packages (covers and gallery)
    const scenicPackages = useMemo(() => {
        const picks: Array<{ url: string; label: string; id: number }> = [];
        for (const t of allTours) {
            const label = t.destination_name || t.destination;
            if (t.cover_image) {
                picks.push({ url: storageUrl(t.cover_image), label, id: t.id });
            }
            if (t.images && t.images.length > 0) {
                for (const img of t.images) {
                    picks.push({ url: storageUrl(img.image_path), label, id: t.id });
                }
            }
        }
        // If database has fewer than 4 total images, pad with fallbacks
        while (picks.length < 4) {
            const idx = picks.length;
            picks.push({
                url: FALLBACK_ISLAND_IMAGES[idx % FALLBACK_ISLAND_IMAGES.length],
                label: 'Island Paradise',
                id: -idx,
            });
        }
        return picks.slice(0, 4);
    }, [allTours]);

    // Featured cards: show first 6 packages
    const featuredTours = allTours.slice(0, 6);

    // Real stats derived from data
    const uniqueAgencies = useMemo(() => {
        const ids = new Set(allTours.map(t => t.agency_id));
        return ids.size;
    }, [allTours]);

    const stats = [
        { end: totalPackages,   suffix: '',  label: totalPackages === 1 ? 'Published Package' : 'Published Packages' },
        { end: uniqueAgencies,  suffix: '',  label: uniqueAgencies === 1 ? 'Verified Agency' : 'Verified Agencies' },
        { end: 50,              suffix: '%', label: 'Advance to Book' },
        { end: 0,               suffix: '%', label: 'Booking Fees' },
    ];

    // ── Hero slideshow ────────────────────────────────────────────────────────
    const slideCount = heroSlides.length;
    useEffect(() => {
        if (slideCount < 2) return;
        const timer = setInterval(() => {
            setHeroIndex(prev => (prev + 1) % slideCount);
        }, 5000);
        return () => clearInterval(timer);
    }, [slideCount]);

    // ── Stats scroll trigger ──────────────────────────────────────────────────
    useEffect(() => {
        const el = statsRef.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setStatsVisible(true); obs.disconnect(); } },
            { threshold: 0.3 }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    const handleSearch = (e: FormEvent) => {
        e.preventDefault();
        navigate(`/tours${searchInput.trim() ? `?destination=${encodeURIComponent(searchInput.trim())}` : ''}`);
    };

    return (
        <div className="bg-[#FAFAF9] text-slate-900 pt-16 overflow-x-hidden">

            {/* ── Hero ──────────────────────────────────────────────────────── */}
            <section className="relative min-h-[92vh] flex flex-col items-center justify-center overflow-hidden">

                {/* Real package images as slideshow */}
                {heroSlides.map((slide, i) => (
                    <div
                        key={i}
                        aria-hidden="true"
                        className="absolute inset-0 transition-opacity duration-1000"
                        style={{ opacity: i === heroIndex ? 1 : 0 }}
                    >
                        <img
                            src={slide.url}
                            alt={slide.caption}
                            className="w-full h-full object-cover"
                            loading={i === 0 ? 'eager' : 'lazy'}
                            onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = FALLBACK_ISLAND_IMAGES[i % FALLBACK_ISLAND_IMAGES.length];
                            }}
                        />
                    </div>
                ))}

                {/* Dark overlay */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    aria-hidden="true"
                    style={{
                        background: 'linear-gradient(to bottom, rgba(10,20,40,0.62) 0%, rgba(10,20,40,0.38) 50%, rgba(10,20,40,0.75) 100%)',
                    }}
                />

                {/* Slide dots + active caption */}
                {heroSlides.length > 1 && (
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10">
                        {/* Active caption */}
                        <p className="text-white/60 text-xs font-semibold tracking-wide">
                            {heroSlides[heroIndex]?.dest}
                        </p>
                        <div className="flex items-center gap-2">
                            {heroSlides.map((s, i) => (
                                <button
                                    key={i}
                                    onClick={() => setHeroIndex(i)}
                                    aria-label={s.caption}
                                    className={`rounded-full transition-all duration-300 ${
                                        i === heroIndex ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/40 hover:bg-white/70'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Hero content */}
                <div className="relative z-10 max-w-5xl mx-auto px-6 text-center py-20">
                    <Reveal variant="fade-up" delay={100}>
                        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 text-white/95 text-xs font-bold px-4 py-2 rounded-full mb-7 uppercase tracking-widest">
                            <Compass className="w-3.5 h-3.5 text-sky-300" aria-hidden="true" />
                            Island Expeditions &amp; Adventures
                        </div>
                    </Reveal>

                    <Reveal variant="fade-up" delay={200}>
                        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.0] mb-6 text-white drop-shadow-xl">
                            Discover
                            <span
                                className="block"
                                style={{
                                    background: 'linear-gradient(90deg, #38bdf8, #34d399)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                }}
                            >
                                Paradise
                            </span>
                            Your Way
                        </h1>
                    </Reveal>

                    <Reveal variant="fade-up" delay={300}>
                        <p className="text-white/75 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
                            Authentic tour packages from verified local agencies.
                            Book your island adventure in minutes.
                        </p>
                    </Reveal>

                    <Reveal variant="fade-up" delay={400}>
                        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto mb-6">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" aria-hidden="true" />
                                <input
                                    id="hero-search"
                                    type="text"
                                    placeholder="Search a destination (e.g. Puerto Princesa, Coron, El Nido)…"
                                    value={searchInput}
                                    onChange={e => setSearchInput(e.target.value)}
                                    className="w-full pl-11 pr-4 py-4 bg-white/95 backdrop-blur-md border border-white/30 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 shadow-2xl text-sm"
                                    aria-label="Search destination"
                                />
                            </div>
                            <button
                                type="submit"
                                className="px-7 py-4 bg-sky-500 hover:bg-sky-400 text-white text-sm font-black rounded-2xl transition-all duration-200 shadow-2xl whitespace-nowrap hover:-translate-y-0.5 active:translate-y-0"
                            >
                                Search
                            </button>
                        </form>
                    </Reveal>

                    <Reveal variant="fade-up" delay={500}>
                        <div className="flex items-center justify-center gap-5">
                            <Link
                                to="/tours"
                                className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white font-semibold transition-colors"
                            >
                                Browse all tours <ArrowRight className="w-4 h-4" aria-hidden="true" />
                            </Link>
                            <span className="text-white/30">·</span>
                            <Link
                                to="/track"
                                className="inline-flex items-center gap-1.5 text-sm text-sky-300 hover:text-sky-200 font-semibold transition-colors"
                            >
                                <TicketCheck className="w-4 h-4" aria-hidden="true" />
                                Track a booking
                            </Link>
                        </div>
                    </Reveal>
                </div>

                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 animate-bounce hidden sm:flex flex-col items-center">
                    <ChevronDown className="w-5 h-5 text-white/40" />
                </div>
            </section>

            {/* ── Stats Band (real data) ─────────────────────────────────────── */}
            <section
                ref={statsRef}
                className="py-12 md:py-16"
                style={{ background: 'linear-gradient(135deg, #0c1f3f 0%, #0e4174 50%, #0c1f3f 100%)' }}
            >
                <div className="max-w-5xl mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {stats.map(s => (
                            <StatCounter key={s.label} {...s} enabled={statsVisible} />
                        ))}
                    </div>
                </div>
            </section>

            {/* ── How it works ──────────────────────────────────────────────── */}
            <section className="max-w-6xl mx-auto px-6 py-20 md:py-28">
                <Reveal variant="fade-up">
                    <div className="text-center mb-14">
                        <p className="text-xs font-black uppercase tracking-widest text-sky-600 mb-3">Simple Process</p>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900">Book a tour in 3 steps</h2>
                        <p className="text-slate-500 mt-3 max-w-lg mx-auto">No registration, no complexity. Just find, book, and explore.</p>
                    </div>
                </Reveal>

                <div className="grid md:grid-cols-3 gap-6 relative">
                    <div className="hidden md:block absolute top-10 left-[calc(16.66%+1rem)] right-[calc(16.66%+1rem)] h-px bg-gradient-to-r from-sky-200 via-sky-300 to-sky-200 pointer-events-none" aria-hidden="true" />
                    {[
                        { icon: Search, num: '01', title: 'Search for a Tour', desc: 'Browse packages from verified local agencies. Filter by destination, category, or price.' },
                        { icon: Map,    num: '02', title: 'Book as a Guest',   desc: 'Fill in your details and select a schedule — booking takes under 2 minutes.' },
                        { icon: TicketCheck, num: '03', title: 'Receive Updates', desc: 'Get your booking reference and track your reservation status anytime using your email.' },
                    ].map(({ icon: Icon, num, title, desc }, i) => (
                        <Reveal key={title} variant="fade-up" delay={i * 120}>
                            <div className="bg-white rounded-3xl border border-slate-200/90 p-8 shadow-sm hover:shadow-xl hover:shadow-sky-900/5 hover:-translate-y-1 transition-all duration-300 flex flex-col items-start h-full">
                                <div className="relative mb-6">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-600 to-teal-500 flex items-center justify-center shadow-lg shadow-sky-500/25">
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>
                                    <span className="absolute -top-2 -right-2 text-[10px] font-black text-sky-400 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded-full">{num}</span>
                                </div>
                                <h3 className="font-black text-slate-900 mb-2 text-lg">{title}</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </section>

            {/* ── Featured tours (real packages, all categories) ────────────── */}
            <section className="border-t border-slate-200 bg-white py-20 md:py-28">
                <div className="max-w-6xl mx-auto px-6">
                    <Reveal variant="fade-up">
                        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest text-sky-600 mb-3">Featured Packages</p>
                                <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900">Popular Tours</h2>
                                <p className="text-slate-500 mt-2 max-w-md">
                                    Hand-picked experiences from local agencies.
                                    {totalPackages > 6 && (
                                        <span className="text-sky-600 font-semibold"> {totalPackages} packages available.</span>
                                    )}
                                </p>
                            </div>
                            <Link
                                to="/tours"
                                className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors shrink-0 group"
                            >
                                View all tours
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                            </Link>
                        </div>
                    </Reveal>

                    {isLoading ? (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="rounded-3xl border border-slate-100 overflow-hidden bg-slate-50 animate-pulse">
                                    <div className="h-56 bg-slate-200" />
                                    <div className="p-5 space-y-3">
                                        <div className="h-4 bg-slate-200 rounded w-3/4" />
                                        <div className="h-3 bg-slate-100 rounded w-1/2" />
                                        <div className="h-8 bg-slate-100 rounded mt-4" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : featuredTours.length === 0 ? (
                        <div className="text-center py-20 text-slate-400">
                            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" aria-hidden="true" />
                            <p className="font-semibold">No tours published yet.</p>
                            <p className="text-sm mt-1">Check back soon — agencies are adding packages!</p>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {featuredTours.map((tour, i) => (
                                <Reveal key={tour.id} variant="fade-up" delay={i * 60}>
                                    <HomeTourCard tour={tour} />
                                </Reveal>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* ── Scenic strip — real package images ────────────────────────── */}
            {!isLoading && scenicPackages.some(p => p.id > 0) && (
                <section className="py-16 md:py-20 max-w-6xl mx-auto px-6">
                    <Reveal variant="fade-up">
                        <div className="text-center mb-10">
                            <p className="text-xs font-black uppercase tracking-widest text-sky-600 mb-3">Destinations</p>
                            <h2 className="text-3xl font-extrabold text-slate-900">Where You'll Explore</h2>
                            <p className="text-slate-500 mt-2">Real destinations from our tour packages.</p>
                        </div>
                    </Reveal>

                    <Reveal variant="fade-in" delay={150}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {scenicPackages.map((dest) => (
                                <Link
                                    key={dest.id}
                                    to={dest.id > 0 ? `/tours/${dest.id}` : '/tours'}
                                    className="group relative rounded-2xl overflow-hidden aspect-[4/5] shadow-sm hover:shadow-xl hover:shadow-slate-900/20 hover:-translate-y-1 transition-all duration-300"
                                >
                                    <img
                                        src={dest.url}
                                        alt={dest.label}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                                        loading="lazy"
                                        onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.src = FALLBACK_ISLAND_IMAGES[0];
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent" />
                                    <div className="absolute bottom-3 left-3 right-3">
                                        <p className="text-white font-bold text-sm drop-shadow line-clamp-1">{dest.label}</p>
                                        <p className="text-white/60 text-xs flex items-center gap-1 mt-0.5">
                                            <Camera className="w-3 h-3" /> View package →
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </Reveal>
                </section>
            )}

            {/* ── Why book with us ──────────────────────────────────────────── */}
            <section className="border-t border-slate-100 bg-slate-50 py-20 md:py-28">
                <div className="max-w-6xl mx-auto px-6">
                    <Reveal variant="fade-up">
                        <div className="text-center mb-14">
                            <p className="text-xs font-black uppercase tracking-widest text-sky-600 mb-3">Why IslandGo</p>
                            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900">Your trust, our priority</h2>
                            <p className="text-slate-500 mt-3 max-w-lg mx-auto">
                                We connect you directly with licensed local agencies — no middlemen, no hidden charges.
                            </p>
                        </div>
                    </Reveal>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {WHY_ITEMS.map(({ icon: Icon, title, desc, color }, i) => {
                            const c = WHY_COLOR[color];
                            return (
                                <Reveal key={title} variant="fade-up" delay={i * 100}>
                                    <div className={`rounded-3xl border ${c.border} ${c.bg} p-7 flex flex-col h-full hover:-translate-y-1 hover:shadow-lg transition-all duration-300`}>
                                        <div className={`w-11 h-11 rounded-2xl bg-white border ${c.border} flex items-center justify-center mb-5 shadow-sm`}>
                                            <Icon className={`w-5 h-5 ${c.icon}`} />
                                        </div>
                                        <h3 className="font-black text-slate-900 mb-2">{title}</h3>
                                        <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                                    </div>
                                </Reveal>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ── Pricing CTA ───────────────────────────────────────────────── */}
            <section className="max-w-6xl mx-auto px-6 py-20 md:py-24">
                <Reveal variant="fade-up">
                    <div
                        className="rounded-3xl p-8 md:p-14 text-white relative overflow-hidden"
                        style={{ background: 'linear-gradient(135deg, #0c1f3f 0%, #0e4174 60%, #0a3560 100%)' }}
                    >
                        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full blur-3xl opacity-30" style={{ background: 'radial-gradient(#38bdf8, transparent)' }} aria-hidden="true" />
                        <div className="absolute -bottom-16 -left-12 w-60 h-60 rounded-full blur-3xl opacity-20" style={{ background: 'radial-gradient(#34d399, transparent)' }} aria-hidden="true" />

                        <div className="relative grid md:grid-cols-2 gap-10 items-center">
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest text-sky-400 mb-4">Why Book With Us</p>
                                <h2 className="text-3xl md:text-4xl font-extrabold mb-5 leading-tight">
                                    Transparent pricing.<br />No hidden fees.
                                </h2>
                                <p className="text-slate-300 leading-relaxed mb-8">
                                    Every price you see is what you pay. Our verified agencies set clear rates, and you
                                    only need to pay a 50% advance to secure your reservation.
                                </p>
                                <div className="flex flex-wrap gap-3">
                                    <Link
                                        to="/tours"
                                        className="inline-flex items-center gap-2 px-5 py-3 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-2xl transition-all text-sm hover:-translate-y-0.5 shadow-lg shadow-sky-900/30"
                                    >
                                        <Compass className="w-4 h-4" />
                                        Browse Tours
                                    </Link>
                                    <Link
                                        to="/track"
                                        className="inline-flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-2xl transition-all text-sm hover:-translate-y-0.5"
                                    >
                                        <TicketCheck className="w-4 h-4" />
                                        Track My Booking
                                    </Link>
                                </div>
                            </div>
                            <div className="space-y-4">
                                {[
                                    [CheckCircle, 'Verified local agencies', 'Every agency is reviewed before listing packages.'],
                                    [Shield,       'Secure reference tracking', 'Track your booking status with just your reference and email.'],
                                    [Star,         'Upfront pricing', 'Price per person displayed on every card — no surprise fees.'],
                                ].map(([Icon, title, desc]) => {
                                    const I = Icon as typeof CheckCircle;
                                    return (
                                        <div key={title as string} className="flex items-start gap-4 bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/8 transition-colors">
                                            <I className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" aria-hidden="true" />
                                            <div>
                                                <p className="font-bold text-sm">{title as string}</p>
                                                <p className="text-slate-400 text-xs mt-0.5">{desc as string}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </Reveal>
            </section>
        </div>
    );
}

// ─── HomeTourCard ────────────────────────────────────────────────────────────
function HomeTourCard({ tour }: { tour: TourPackage }) {
    const imageUrl = storageUrl(tour.cover_image, tour.id);
    const galleryCount = (tour.images?.length ?? 0) + (tour.cover_image ? 1 : 0);

    return (
        <article className="group bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-sky-950/10 hover:-translate-y-1.5 transition-all duration-300 flex flex-col h-full">
            {/* Image */}
            <div className="relative h-56 bg-slate-900 overflow-hidden shrink-0">
                <img
                    src={imageUrl}
                    alt={tour.title}
                    onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = FALLBACK_ISLAND_IMAGES[tour.id % FALLBACK_ISLAND_IMAGES.length];
                    }}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20 pointer-events-none" />

                {/* Category badge */}
                <div className="absolute top-3.5 left-3.5 flex items-center gap-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/90 text-white backdrop-blur-md shadow-md text-xs font-extrabold tracking-wide">
                        <Waves className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[140px]">{tour.category}</span>
                    </div>
                </div>

                {/* Destination badge */}
                <div className="absolute bottom-3 left-3.5">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/90 text-slate-900 backdrop-blur-md text-xs font-bold shadow-md">
                        <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        <span className="truncate max-w-[150px]">{tour.destination_name || tour.destination}</span>
                    </div>
                </div>

                {/* Photo count */}
                {galleryCount > 1 && (
                    <div className="absolute bottom-3 right-3.5">
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 text-white backdrop-blur-md text-[10px] font-bold">
                            <Camera className="w-3 h-3 text-sky-300" />
                            <span>{galleryCount} Photos</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Body */}
            <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                    <h3 className="text-base font-black text-slate-900 group-hover:text-sky-700 transition-colors leading-snug line-clamp-1 mb-1">
                        {tour.title}
                    </h3>

                    {tour.agency && (
                        <p className="text-[11px] font-semibold text-slate-400 mb-3">
                            By <span className="text-slate-700 font-bold">{tour.agency.name}</span>
                        </p>
                    )}

                    <div className="flex items-center gap-3 py-2.5 border-t border-b border-slate-100 text-xs font-semibold text-slate-500 mb-4">
                        <span className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            Up to {tour.max_participants} guests
                        </span>
                    </div>
                </div>

                <div className="mt-auto flex items-center justify-between gap-3 pt-1">
                    <div>
                        <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">from</p>
                        <p className="text-xl font-black text-slate-900">
                            ₱{Number(tour.price_per_person).toLocaleString()}
                            <span className="text-xs font-medium text-slate-500 ml-1">/guest</span>
                        </p>
                    </div>
                    <Link
                        to={`/tours/${tour.id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-sky-600/20 hover:shadow-lg hover:shadow-sky-600/30 transition-all duration-200 hover:-translate-y-0.5 shrink-0"
                    >
                        <span>View &amp; Book</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
            </div>
        </article>
    );
}
