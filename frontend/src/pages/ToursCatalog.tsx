import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Compass, Users, Search, ArrowRight, MapPin,
    SlidersHorizontal, Sparkles, Waves, ShieldCheck, X, Anchor
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { toursApi, storageUrl, FALLBACK_ISLAND_IMAGES } from '../lib/api';
import type { TourPackage, PaginatedResponse } from '../types';

export default function ToursCatalog() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState(searchParams.get('destination') ?? '');
    const [selectedDestination, setSelectedDestination] = useState(searchParams.get('destination') ?? '');
    const [durationFilter, setDurationFilter] = useState<'all' | '1day' | 'multiday'>('all');
    const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');

    // Fetch registered island destinations from published packages
    const { data: destinationsData } = useQuery({
        queryKey: ['destinations'],
        queryFn: async () => {
            const res = await toursApi.destinations();
            return res.data;
        },
    });

    const destinationOptions = useMemo(() => {
        const options = [{ label: 'All Islands', value: '' }];
        if (destinationsData && destinationsData.length > 0) {
            options.push(...destinationsData);
        }
        return options;
    }, [destinationsData]);

    // Sync from URL params
    useEffect(() => {
        const d = searchParams.get('destination') ?? '';
        setSearchInput(d);
        setSelectedDestination(d);
    }, [searchParams]);

    // Fetch published tours with category locked to 'Island Hopping'
    const { data, isLoading, isError } = useQuery({
        queryKey: ['tours', page, selectedDestination],
        queryFn: () =>
            toursApi
                .list({
                    destination: selectedDestination || undefined,
                    category: 'Island Hopping',
                    page,
                    per_page: 12,
                })
                .then(r => r.data as PaginatedResponse<TourPackage>),
    });

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSelectedDestination(searchInput.trim());
        setPage(1);
        if (searchInput.trim()) {
            setSearchParams({ destination: searchInput.trim() });
        } else {
            setSearchParams({});
        }
    };

    const handleDestinationSelect = (destValue: string) => {
        setSearchInput(destValue);
        setSelectedDestination(destValue);
        setPage(1);
        if (destValue) {
            setSearchParams({ destination: destValue });
        } else {
            setSearchParams({});
        }
    };

    const clearAllFilters = () => {
        setSearchInput('');
        setSelectedDestination('');
        setDurationFilter('all');
        setSortBy('featured');
        setPage(1);
        setSearchParams({});
    };

    // Client-side filtering and sorting on current page data
    const filteredTours = useMemo(() => {
        if (!data?.data) return [];
        let list = [...data.data];

        // Ensure category safety
        list = list.map(t => ({
            ...t,
            category: t.category || 'Island Hopping',
        }));

        if (durationFilter === '1day') {
            list = list.filter(t => t.duration_days === 1);
        } else if (durationFilter === 'multiday') {
            list = list.filter(t => t.duration_days > 1);
        }

        if (sortBy === 'price-asc') {
            list.sort((a, b) => Number(a.price_per_person) - Number(b.price_per_person));
        } else if (sortBy === 'price-desc') {
            list.sort((a, b) => Number(b.price_per_person) - Number(a.price_per_person));
        }

        return list;
    }, [data?.data, durationFilter, sortBy]);

    const hasActiveFilters = Boolean(selectedDestination || durationFilter !== 'all' || sortBy !== 'featured');

    return (
        <div className="bg-[#FAFBFD] min-h-screen pt-16 text-slate-800">
            {/* ── Modern Hero Section ───────────────────────────────────── */}
            <header className="relative bg-gradient-to-b from-slate-950 via-sky-950 to-slate-900 text-white overflow-hidden pb-20 pt-12 md:pt-16">
                {/* Decorative glowing gradient orbs */}
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-10 left-1/3 w-80 h-80 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-bold tracking-wide uppercase mb-4 backdrop-blur-md">
                        <Waves className="w-3.5 h-3.5 text-emerald-400" />
                        <span>100% Curated Island Hopping Expeditions</span>
                    </div>

                    <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white mb-4 max-w-3xl leading-[1.1]">
                        Explore Surigao’s <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-teal-300 to-emerald-200">Untouched Islands</span>
                    </h1>
                    <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed font-normal mb-8">
                        Pristine turquoise lagoons, white sandbars, and emerald coves. Book your boat trip in minutes with direct licensed island captains.
                    </p>

                    {/* Quick Trust Highlights */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl pt-2 border-t border-white/10">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                            <Anchor className="w-4 h-4 text-teal-400 shrink-0" />
                            <span>Licensed Boat Captains</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>Instant Confirmation</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>Instant Booking Pass</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                            <Compass className="w-4 h-4 text-sky-400 shrink-0" />
                            <span>Verified Island Schedules</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* ── Floating Search & Destination Bar ──────────────────────── */}
            <div className="-mt-10 relative z-30 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-xl shadow-slate-900/5">
                    <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input
                                id="catalog-search"
                                type="text"
                                placeholder="Search by island or cove (e.g. Siargao, Sohoton, Britania)..."
                                value={searchInput}
                                onChange={e => setSearchInput(e.target.value)}
                                className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all"
                            />
                            {searchInput && (
                                <button
                                    type="button"
                                    onClick={() => { setSearchInput(''); setSelectedDestination(''); }}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Duration filter */}
                        <div className="relative sm:w-44">
                            <select
                                id="catalog-duration"
                                value={durationFilter}
                                onChange={e => setDurationFilter(e.target.value as any)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/30 appearance-none cursor-pointer"
                            >
                                <option value="all">All Durations</option>
                                <option value="1day">1 Day Island Trip</option>
                                <option value="multiday">Multi-day Expedition</option>
                            </select>
                            <SlidersHorizontal className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        </div>

                        {/* Sort Selector */}
                        <div className="relative sm:w-44">
                            <select
                                id="catalog-sort"
                                value={sortBy}
                                onChange={e => setSortBy(e.target.value as any)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/30 appearance-none cursor-pointer"
                            >
                                <option value="featured">Featured Tours</option>
                                <option value="price-asc">Price: Low to High</option>
                                <option value="price-desc">Price: High to Low</option>
                            </select>
                            <SlidersHorizontal className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        </div>

                        <button
                            type="submit"
                            className="px-7 py-3 bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-700 hover:to-teal-700 text-white text-sm font-bold rounded-2xl shadow-md shadow-sky-600/20 transition-all duration-200 hover:shadow-lg hover:shadow-sky-600/30 hover:-translate-y-0.5 whitespace-nowrap cursor-pointer"
                        >
                            Search Islands
                        </button>
                    </form>

                    {/* Quick Destination Tags */}
                    {destinationOptions.length > 1 && (
                        <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
                            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] shrink-0 mr-1">Islands:</span>
                            {destinationOptions.map(dest => {
                                const isSelected = selectedDestination === dest.value || (!selectedDestination && dest.value === '');
                                return (
                                    <button
                                        key={dest.value || 'all'}
                                        type="button"
                                        onClick={() => handleDestinationSelect(dest.value)}
                                        className={`px-3 py-1.5 rounded-full font-bold transition-all shrink-0 cursor-pointer ${
                                            isSelected
                                                ? 'bg-gradient-to-r from-sky-600 to-teal-600 text-white shadow-xs'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                                        }`}
                                    >
                                        {dest.label}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Main Tour Catalog ─────────────────────────────────────── */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
                {/* Meta summary header */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                                {selectedDestination ? `Island Tours in "${selectedDestination}"` : 'All Island Hopping Packages'}
                            </h2>
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold">
                                🏝️ Island Hopping Only
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                            Showing {filteredTours.length} {filteredTours.length === 1 ? 'package' : 'packages'} ready for instant booking
                        </p>
                    </div>

                    {hasActiveFilters && (
                        <button
                            onClick={clearAllFilters}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                        >
                            <X className="w-3.5 h-3.5" />
                            Reset Filters
                        </button>
                    )}
                </div>

                {/* Grid */}
                {isLoading ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs animate-pulse">
                                <div className="h-64 bg-slate-200" />
                                <div className="p-6 space-y-3">
                                    <div className="h-4 bg-slate-200 rounded-full w-1/3" />
                                    <div className="h-6 bg-slate-200 rounded-xl w-3/4" />
                                    <div className="h-4 bg-slate-100 rounded-full w-1/2" />
                                    <div className="h-10 bg-slate-100 rounded-2xl w-full mt-4" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : isError ? (
                    <div className="text-center py-24 bg-white rounded-3xl border border-slate-200 shadow-xs max-w-xl mx-auto px-6">
                        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4">
                            <Waves className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-black text-slate-900">Failed to load island tours</h3>
                        <p className="text-sm text-slate-500 mt-1 mb-6">We could not connect to the booking server. Please check your network.</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
                        >
                            Retry Connection
                        </button>
                    </div>
                ) : filteredTours.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-xs max-w-xl mx-auto px-6">
                        <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-4">
                            <Compass className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-black text-slate-900">No island tours match your search</h3>
                        <p className="text-sm text-slate-500 mt-1 mb-6">
                            We couldn't find any tours for "{selectedDestination}". Try clearing filters or exploring all Surigao islands.
                        </p>
                        <button
                            onClick={clearAllFilters}
                            className="px-6 py-2.5 bg-gradient-to-r from-sky-600 to-teal-600 text-white rounded-xl text-xs font-bold hover:from-sky-700 hover:to-teal-700 shadow-sm transition-all"
                        >
                            View All Island Packages
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                            {filteredTours.map(tour => (
                                <ModernTourCard key={tour.id} tour={tour} />
                            ))}
                        </div>

                        {/* Pagination */}
                        {data && data.last_page > 1 && (
                            <div className="flex items-center justify-center gap-3 mt-14">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-5 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-colors shadow-xs"
                                >
                                    ← Previous
                                </button>
                                <span className="text-xs font-bold text-slate-500 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-xs">
                                    Page {data.current_page} of {data.last_page}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(data.last_page, p + 1))}
                                    disabled={page === data.last_page}
                                    className="px-5 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-colors shadow-xs"
                                >
                                    Next →
                                </button>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}

// ── Ultra-Modern Tour Card with Robust Picture Display ───────────────────────
function ModernTourCard({ tour }: { tour: TourPackage }) {
    // Generate image with fallback logic
    const imageSource = storageUrl(tour.cover_image, tour.id);

    return (
        <article className="group bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-sky-950/10 hover:-translate-y-1.5 transition-all duration-300 flex flex-col h-full">
            {/* Visual Frame */}
            <div className="relative h-64 overflow-hidden bg-slate-900 shrink-0">
                <img
                    src={imageSource}
                    alt={tour.title}
                    onError={(e) => {
                        // Resilient fallback to high-res tropical island photo if image path fails
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = FALLBACK_ISLAND_IMAGES[tour.id % FALLBACK_ISLAND_IMAGES.length];
                    }}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-108"
                    loading="lazy"
                />

                {/* Dark vignette gradients */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-black/20 to-black/30 pointer-events-none" />

                {/* Top Badges */}
                <div className="absolute top-4 left-4 flex items-center gap-2">
                    {/* Category pill */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/90 text-white backdrop-blur-md shadow-md text-xs font-extrabold tracking-wide">
                        <Waves className="w-3.5 h-3.5" />
                        <span>Island Hopping</span>
                    </div>
                </div>

                {/* Destination Badge over Image */}
                <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 text-slate-900 backdrop-blur-md text-xs font-bold shadow-md">
                        <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        <span className="truncate max-w-[180px]">{tour.destination_name || tour.destination}</span>
                    </div>

                    {tour.agency && (
                        <span className="text-[11px] font-bold text-white/90 bg-slate-950/60 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                            {tour.agency.name}
                        </span>
                    )}
                </div>
            </div>

            {/* Card Body */}
            <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                    <h3 className="text-lg font-black text-slate-900 group-hover:text-sky-700 transition-colors leading-snug line-clamp-1 mb-2">
                        {tour.title}
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
                        {tour.location_description || tour.description || 'Experience the beauty of Surigao’s coastal wonders, secret lagoons, and tropical islands.'}
                    </p>

                    {/* Features / Details row */}
                    <div className="flex items-center gap-3 py-3 border-t border-b border-slate-100 text-xs font-semibold text-slate-600">
                        <span className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            Up to {tour.max_participants} guests
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-1.5 text-emerald-700">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            Instant Pass
                        </span>
                    </div>
                </div>

                {/* Price and CTA */}
                <div className="mt-5 pt-1 flex items-center justify-between gap-3">
                    <div>
                        <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Starting from</p>
                        <p className="text-2xl font-black text-slate-900 tracking-tight">
                            ₱{Number(tour.price_per_person).toLocaleString()}
                            <span className="text-xs font-semibold text-slate-500 ml-1">/person</span>
                        </p>
                    </div>

                    <Link
                        to={`/tours/${tour.id}`}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-sky-600/20 hover:shadow-lg hover:shadow-sky-600/30 transition-all duration-200 hover:-translate-y-0.5 shrink-0"
                    >
                        <span>View &amp; Book</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                </div>
            </div>
        </article>
    );
}
