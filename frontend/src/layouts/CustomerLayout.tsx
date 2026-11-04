import { useState, useEffect } from 'react';
import { Outlet, Navigate, Link, useLocation, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/axios';
import { avatarUrl as getAvatarUrl } from '../lib/api';
import {
    LayoutDashboard, BookOpen, Package, Bell, ChevronLeft, ChevronRight,
    LogOut, X, Menu, Search, Compass, Settings
} from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';

// --- Sidebar ---
interface NavItem {
    label: string;
    to: string;
    icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
    { label: 'Dashboard',  to: '/customer/dashboard',      icon: LayoutDashboard },
    { label: 'Packages',   to: '/customer/packages',       icon: Package },
    { label: 'Bookings',   to: '/customer/bookings',       icon: BookOpen },
    { label: 'Notifications', to: '/customer/notifications', icon: Bell },
];

function CustomerSidebar({ collapsed, onToggle, onClose, unreadCount }: any) {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const avatarUrl = getAvatarUrl(user?.avatar);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <aside className={`flex flex-col h-full bg-gradient-to-b from-white via-sky-50/40 to-white border-r border-sky-100 shadow-[12px_0_32px_rgba(14,116,144,0.08)] transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-64'}`}>
            <div className="flex items-center justify-between h-20 px-4 border-b border-sky-100/80 shrink-0">
                {!collapsed && (
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-600 to-cyan-500 shadow-lg shadow-sky-500/25 flex items-center justify-center">
                            <Compass className="w-4 h-4 text-white" />
                        </div>
                        <div><span className="block font-extrabold text-slate-950 text-sm tracking-tight">IslandGo</span><span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-sky-700">Island adventures</span></div>
                    </div>
                )}
                {collapsed && (
                    <div className="mx-auto w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-600 to-cyan-500 shadow-lg shadow-sky-500/25 flex items-center justify-center">
                        <Compass className="w-4 h-4 text-white" />
                    </div>
                )}
                <button onClick={onToggle} className="hidden lg:flex ml-auto p-1.5 rounded-lg text-slate-500 hover:text-slate-950 hover:bg-slate-100 transition-colors">
                    {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
                <button onClick={onClose} className="lg:hidden ml-auto p-1.5 rounded-lg text-slate-500 hover:text-slate-950 hover:bg-slate-100 transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1.5">
                {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    // Exact match for dashboard to avoid matching other routes, others can use startsWith
                    const active = item.to === '/customer/dashboard' ? location.pathname === item.to : location.pathname.startsWith(item.to);
                    const isNotif = item.to === '/customer/notifications';

                    return (
                        <Link
                            key={item.to}
                            to={item.to}
                            onClick={onClose}
                            title={collapsed ? item.label : undefined}
                            className={`relative flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-semibold transition-all ${active ? 'bg-gradient-to-r from-sky-600 to-cyan-500 text-white shadow-lg shadow-sky-500/25' : 'text-slate-800 hover:text-slate-950 hover:bg-white hover:shadow-sm'} ${collapsed ? 'justify-center' : ''}`}
                        >
                            <div className="relative shrink-0">
                                <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
                                {isNotif && unreadCount > 0 && collapsed && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </div>
                            {!collapsed && (
                                <>
                                    <span className="flex-1">{item.label}</span>
                                    {isNotif && unreadCount > 0 && (
                                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                            {unreadCount > 99 ? '99+' : unreadCount}
                                        </span>
                                    )}
                                </>
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="shrink-0 border-t border-sky-100 p-4 space-y-1 bg-white/70">
                <Link to="/customer/settings" onClick={onClose} title={collapsed ? 'Profile settings' : undefined} className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-semibold text-slate-800 hover:text-sky-700 hover:bg-sky-50 transition-all ${collapsed ? 'justify-center' : ''}`}>
                    <Settings className="w-5 h-5 shrink-0" /> {!collapsed && <span>Profile settings</span>}
                </Link>
                <button onClick={() => setShowLogoutConfirm(true)} title={collapsed ? 'Logout' : undefined} className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-semibold text-slate-800 hover:text-red-700 hover:bg-red-50 transition-all ${collapsed ? 'justify-center' : ''}`}>
                    <LogOut className="w-5 h-5 shrink-0" />
                    {!collapsed && <span>Logout</span>}
                </button>
                {!collapsed && (
                    <div className="mt-4 p-3 rounded-2xl bg-gradient-to-br from-sky-50 to-cyan-50 border border-sky-100 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl overflow-hidden bg-gradient-to-br from-sky-600 to-cyan-500 shadow-sm shrink-0 flex items-center justify-center">
                            {avatarUrl ? <img src={avatarUrl} alt={user?.name ?? 'Profile'} className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-white">{user?.name?.charAt(0).toUpperCase()}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-950 truncate">{user?.name}</p>
                            <p className="text-xs text-slate-700 truncate capitalize">Customer</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Logout Confirmation Modal */}
            <ConfirmModal 
                isOpen={showLogoutConfirm}
                title="Logout"
                message="Are you sure you want to log out?"
                confirmText="Logout"
                isDanger={true}
                onConfirm={handleLogout}
                onCancel={() => setShowLogoutConfirm(false)}
            />
        </aside>
    );
}

// --- Header ---
function CustomerHeader({ onMenuToggle, unreadCount }: any) {
    const { user } = useAuth();
    const avatarUrl = getAvatarUrl(user?.avatar);
    return (
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-4 md:px-8 shrink-0">
            <div className="flex items-center gap-4 flex-1">
                <button onClick={onMenuToggle} className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors shrink-0">
                    <Menu className="w-5 h-5" />
                </button>
                <div className="hidden md:flex items-center relative w-full max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-4" />
                    <input type="text" placeholder="Search tours..." className="w-full pl-11 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" />
                </div>
            </div>
            <div className="flex items-center gap-4 md:gap-6">
                <Link to="/customer/notifications" className="relative p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-emerald-600 transition-colors">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />}
                </Link>
                <Link to="/customer/settings" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0">
                        {avatarUrl ? <img src={avatarUrl} alt={user?.name ?? 'Profile'} className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-white">{user?.name?.charAt(0).toUpperCase()}</span>}
                    </div>
                    <div className="hidden md:flex flex-col items-start justify-center">
                        <p className="text-sm font-bold text-slate-800 leading-tight">{user?.name}</p>
                        <p className="text-xs text-slate-500 font-medium capitalize">Customer</p>
                    </div>
                </Link>
            </div>
        </header>
    );
}

// --- Layout ---
export default function CustomerLayout() {
    const { user, isLoading } = useAuth();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const { data: notifData } = useQuery({
        queryKey: ['unread-count'],
        queryFn: () => apiClient.get('/notifications/unread-count').then(r => r.data),
        refetchInterval: 30_000,
        enabled: !!user,
    });
    const unreadCount: number = notifData?.count ?? 0;

    useEffect(() => { setMobileOpen(false); }, [useLocation().pathname]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!user || user.role !== 'customer') {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50 customer-shell">
            {mobileOpen && <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />}
            <div className={`fixed inset-y-0 left-0 z-30 lg:relative lg:flex lg:shrink-0 transform transition-transform duration-300 ease-in-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <CustomerSidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} onClose={() => setMobileOpen(false)} unreadCount={unreadCount} />
            </div>
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                <CustomerHeader onMenuToggle={() => setMobileOpen(o => !o)} unreadCount={unreadCount} />
                <main className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
