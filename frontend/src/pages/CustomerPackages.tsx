import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Compass, Map, Users, Search, Package } from 'lucide-react';
import { Link } from 'react-router';
import { toursApi } from '../lib/api';
import type { TourPackage, PaginatedResponse } from '../types';

export default function CustomerPackages() {
    const [page, setPage] = useState(1);
    const [destination, setDestination] = useState('');
    const [searchParams, setSearchParams] = useState({ destination: '' });

    const { data, isLoading } = useQuery({
        queryKey: ['tours', page, searchParams.destination],
        queryFn: () => toursApi.list({ ...searchParams, page, per_page: 6 }).then(r => r.data as PaginatedResponse<TourPackage>),
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearchParams({ destination });
        setPage(1);
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
            {/* Header & Search */}
            <div className="relative overflow-hidden bg-white rounded-3xl border border-slate-200 p-8 md:p-10 shadow-sm flex flex-col xl:flex-row justify-between items-center gap-8">
                <div className="flex-1 text-center xl:text-left">
                    <h1 className="text-3xl font-extrabold text-slate-950 mb-2 flex items-center justify-center xl:justify-start gap-3">
                        <span className="p-2 rounded-xl bg-teal-100"><Compass className="w-6 h-6 text-teal-700" /></span>
                        Explore the World
                    </h1>
                    <p className="text-slate-700 text-sm md:text-base max-w-lg mx-auto xl:mx-0">
                        Find the perfect adventure curated by our verified agency partners.
                    </p>
                </div>
                <div className="w-full xl:w-auto bg-white/10 backdrop-blur-md p-5 rounded-xl border border-white/20">
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                        <input 
                            type="text" 
                            placeholder="Destination..." 
                            value={destination}
                            onChange={(e) => setDestination(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-slate-950 placeholder-slate-500 px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm"
                        />
                        <button type="submit" className="bg-teal-600 hover:bg-teal-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-teal-600/20">
                            <Search className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            </div>

            {/* Tour Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-80 bg-white border border-slate-200 rounded-2xl animate-pulse shadow-sm" />
                    ))}
                </div>
            ) : data?.data.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-16 text-center mt-6">
                    <Package className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                    <h2 className="text-xl font-bold text-slate-800 mb-2">No packages found</h2>
                    <p className="text-slate-500">We couldn't find any tours matching your search criteria.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                    {data?.data.map((tour) => (
                        <Link key={tour.id} to={`/customer/packages/${tour.id}`} className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col h-full transform hover:-translate-y-0.5">
                            <div className="relative h-36 bg-slate-100 overflow-hidden shrink-0">
                                {tour.cover_image ? (
                                    <img src={`http://localhost:8000/storage/${tour.cover_image}`} alt={tour.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-50">
                                        <Map className="w-10 h-10 text-slate-300" />
                                    </div>
                                )}
                                <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full text-[10px] font-bold text-emerald-700 shadow-sm uppercase tracking-wide">
                                    {tour.category}
                                </div>
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                                    <span className="bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                                        View Details & Book
                                    </span>
                                </div>
                            </div>
                            <div className="p-4 flex-1 flex flex-col justify-between">
                                <div>
                                    <h3 className="font-bold text-slate-900 leading-tight mb-1 line-clamp-1" title={tour.title}>{tour.title}</h3>
                                    <p className="text-slate-500 text-sm flex items-center gap-1.5 mb-2">
                                        <Map className="w-3.5 h-3.5 shrink-0" /> {tour.destination}
                                    </p>
                                    
                                    <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                                        <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                                        <span className="font-medium">Up to {tour.max_participants} guests</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider shrink-0">By</span>
                                        <span className="text-sm font-bold text-slate-600 truncate">{tour.agency?.name}</span>
                                    </div>
                                    <p className="text-lg font-black text-emerald-600 shrink-0">₱{Number(tour.price_per_person).toLocaleString()}</p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {data && data.last_page > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <span className="text-sm font-medium text-slate-500">
                        Page <strong className="text-slate-700">{data.current_page}</strong> of <strong className="text-slate-700">{data.last_page}</strong>
                    </span>
                    <div className="flex gap-2">
                        <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50 shadow-sm transition-colors">Previous</button>
                        {Array.from({ length: data.last_page }, (_, index) => index + 1).slice(Math.max(0, page - 3), page + 2).map(pageNumber => (
                            <button key={pageNumber} onClick={() => setPage(pageNumber)} aria-current={pageNumber === page ? 'page' : undefined} className={`min-w-10 px-3 py-2 rounded-xl border text-sm font-bold transition-colors ${pageNumber === page ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{pageNumber}</button>
                        ))}
                        <button onClick={() => setPage(p => p + 1)} disabled={page === data.last_page} className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-600 disabled:opacity-40 hover:bg-slate-50 shadow-sm transition-colors">Next</button>
                    </div>
                </div>
            )}
        </div>
    );
}
