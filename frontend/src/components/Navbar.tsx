import { Link, useLocation } from 'react-router';
import { MapPin, Menu, X, TicketCheck } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const Navbar = () => {
    const { isAuthenticated, user } = useAuth();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);

    const navLinks = [
        { label: 'Tours', to: '/tours' },
        { label: 'Track Booking', to: '/track' },
        { label: 'About', to: '/about' },
    ];

    const isActive = (to: string) =>
        to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

    const getDashboardLink = () => {
        if (user?.role === 'super_admin') return '/dashboard';
        if (user?.role === 'agency_admin' || user?.role === 'agency_staff') return '/dashboard';
        return '/customer/dashboard';
    };

    const closeMobile = () => setMobileOpen(false);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 shadow-xs transition-all">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
                {/* Brand */}
                <Link
                    to="/"
                    className="flex items-center gap-2.5 group transition-transform hover:scale-[1.02] shrink-0"
                    aria-label="IslandGo home"
                >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 via-cyan-500 to-teal-400 flex items-center justify-center shadow-md shadow-sky-500/20 text-white font-black text-base">
                        <MapPin className="w-5 h-5 drop-shadow-xs" aria-hidden="true" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-base font-black tracking-tight text-slate-900 group-hover:text-sky-700 transition-colors">IslandGo</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 -mt-1">Island Expeditions</span>
                    </div>
                </Link>

                {/* Desktop center nav */}
                <div className="hidden md:flex items-center gap-1.5 flex-1 justify-center">
                    {navLinks.map(link => (
                        <Link
                            key={link.to}
                            to={link.to}
                            className={`px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200 ${
                                isActive(link.to)
                                    ? 'text-sky-700 bg-sky-50 font-bold shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                            }`}
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>

                {/* Desktop right actions */}
                <div className="hidden md:flex items-center gap-3 shrink-0">
                    {!isAuthenticated ? (
                        <>
                            <Link
                                to="/login"
                                className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-950 rounded-full hover:bg-slate-100 transition-colors"
                            >
                                Log In
                            </Link>
                            <Link
                                to="/tours"
                                className="px-5 py-2 text-sm font-bold rounded-full bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-700 hover:to-teal-700 text-white shadow-md shadow-sky-600/25 transition-all duration-200 hover:shadow-lg hover:shadow-sky-600/30 hover:-translate-y-0.5"
                            >
                                Book Now
                            </Link>
                        </>
                    ) : (
                        <Link
                            to={getDashboardLink()}
                            className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-100/80 hover:bg-slate-200/80 text-slate-800 text-sm font-semibold transition-colors border border-slate-200/50"
                        >
                            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-sky-600 to-teal-500 flex items-center justify-center text-xs font-bold text-white shadow-xs">
                                {user?.name?.charAt(0).toUpperCase()}
                            </div>
                            <span className="max-w-[120px] truncate">{user?.name}</span>
                        </Link>
                    )}
                </div>

                {/* Mobile hamburger */}
                <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                    aria-expanded={mobileOpen}
                    aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                >
                    {mobileOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
                </button>
            </div>

            {/* Mobile dropdown */}
            {mobileOpen && (
                <div className="md:hidden bg-white border-t border-slate-100 px-6 py-5 flex flex-col gap-1 shadow-xl">
                    {navLinks.map(link => (
                        <Link
                            key={link.to}
                            to={link.to}
                            onClick={closeMobile}
                            className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                                isActive(link.to)
                                    ? 'text-sky-700 bg-sky-50'
                                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                        >
                            {link.label}
                        </Link>
                    ))}

                    <div className="border-t border-slate-100 mt-3 pt-4 flex flex-col gap-2">
                        {!isAuthenticated ? (
                            <>
                                <Link
                                    to="/login"
                                    onClick={closeMobile}
                                    className="px-4 py-2.5 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                                >
                                    Log In
                                </Link>
                                <Link
                                    to="/tours"
                                    onClick={closeMobile}
                                    className="px-4 py-2.5 text-center text-sm font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-colors"
                                >
                                    Book Now
                                </Link>
                            </>
                        ) : (
                            <Link
                                to={getDashboardLink()}
                                onClick={closeMobile}
                                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-800 text-sm font-semibold"
                            >
                                <div className="w-6 h-6 rounded-full bg-sky-600 flex items-center justify-center text-xs font-bold text-white">
                                    {user?.name?.charAt(0).toUpperCase()}
                                </div>
                                <span className="truncate">{user?.name}</span>
                            </Link>
                        )}
                    </div>

                    {/* Quick track link in mobile */}
                    <Link
                        to="/track"
                        onClick={closeMobile}
                        className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-sky-700 hover:bg-sky-50 rounded-lg transition-colors mt-1"
                    >
                        <TicketCheck className="w-3.5 h-3.5" aria-hidden="true" />
                        Track my booking
                    </Link>
                </div>
            )}
        </nav>
    );
};
