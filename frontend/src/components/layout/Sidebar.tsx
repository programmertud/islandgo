import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import {
    LayoutDashboard, BookOpen, Package, BarChart2,
    ClipboardList, Bell, ChevronLeft, ChevronRight,
    LogOut, Settings, X, Building2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { avatarUrl as getAvatarUrl } from '../../lib/api';
import ConfirmModal from '../ConfirmModal';

interface NavItem {
    label: string;
    to: string;
    icon: React.ElementType;
    roles: string[];
}

const NAV_ITEMS: NavItem[] = [
    { label: 'Dashboard',  to: '/dashboard',   icon: LayoutDashboard, roles: ['super_admin', 'agency_admin'] },
    { label: 'Bookings',   to: '/bookings',     icon: BookOpen,        roles: ['super_admin', 'agency_admin'] },
    { label: 'Packages',   to: '/packages',     icon: Package,         roles: ['super_admin', 'agency_admin'] },
    { label: 'Reports',    to: '/reports',      icon: BarChart2,       roles: ['super_admin', 'agency_admin'] },
    { label: 'Audit Logs', to: '/audit-logs',   icon: ClipboardList,   roles: ['super_admin', 'agency_admin'] },
    { label: 'Notifications', to: '/notifications', icon: Bell,        roles: ['super_admin', 'agency_admin'] },
];

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
    onClose: () => void;
    unreadCount: number;
}

export function Sidebar({ collapsed, onToggle, onClose, unreadCount }: SidebarProps) {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const avatarUrl = getAvatarUrl(user?.avatar);

    const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(user?.role ?? ''));

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <aside
            className={`
                flex flex-col h-full bg-gradient-to-b from-white via-sky-50/40 to-white border-r border-sky-100 shadow-[12px_0_32px_rgba(14,116,144,0.08)] transition-all duration-300
                ${collapsed ? 'w-[72px]' : 'w-64'}
            `}
        >
            {/* Logo & Collapse */}
            <div className="flex items-center justify-between h-20 px-4 border-b border-sky-100/80 shrink-0">
                {!collapsed && (
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-600 to-cyan-500 shadow-lg shadow-sky-500/25 flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-white" />
                        </div>
                        <div><span className="block font-extrabold text-slate-950 text-sm tracking-tight">IslandGo</span><span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-sky-700">Agency workspace</span></div>
                    </div>
                )}
                {collapsed && (
                    <div className="mx-auto w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-600 to-cyan-500 shadow-lg shadow-sky-500/25 flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-white" />
                    </div>
                )}
                <button
                    onClick={onToggle}
                    className="hidden lg:flex ml-auto p-2 rounded-xl text-slate-500 hover:text-slate-950 hover:bg-sky-100 transition-colors"
                >
                    {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
                <button
                    onClick={onClose}
                    className="lg:hidden ml-auto p-2 rounded-xl text-slate-500 hover:text-slate-950 hover:bg-sky-100 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1.5">
                {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const active = location.pathname.startsWith(item.to);
                    const isNotif = item.to === '/notifications';

                    return (
                        <Link
                            key={item.to}
                            to={item.to}
                            onClick={onClose}
                            title={collapsed ? item.label : undefined}
                            className={`
                                relative flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-semibold transition-all
                                ${active
                    ? 'bg-gradient-to-r from-sky-600 to-cyan-500 text-white shadow-lg shadow-sky-500/25'
                    : 'text-slate-700 hover:text-slate-950 hover:bg-white hover:shadow-sm'}
                                ${collapsed ? 'justify-center' : ''}
                            `}
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

            {/* User Footer */}
            <div className="shrink-0 border-t border-sky-100 p-4 space-y-1 bg-white/70">
                <Link
                    to="/settings"
                    title={collapsed ? 'Settings' : undefined}
                    className={`flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-semibold text-slate-700 hover:text-sky-700 hover:bg-sky-50 transition-all ${collapsed ? 'justify-center' : ''}`}
                >
                    <Settings className="w-5 h-5 shrink-0" />
                    {!collapsed && <span>Settings</span>}
                </Link>
                <button
                    onClick={() => setShowLogoutConfirm(true)}
                    title={collapsed ? 'Logout' : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-semibold text-slate-700 hover:text-red-600 hover:bg-red-50 transition-all ${collapsed ? 'justify-center' : ''}`}
                >
                    <LogOut className="w-5 h-5 shrink-0" />
                    {!collapsed && <span>Logout</span>}
                </button>
                {!collapsed && (
                    <div className="mt-4 p-3 rounded-2xl bg-gradient-to-br from-sky-50 to-cyan-50 border border-sky-100 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl overflow-hidden bg-gradient-to-br from-sky-600 to-cyan-500 shadow-sm shrink-0">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
                                    {user?.name?.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{user?.name}</p>
                            <p className="text-xs text-slate-600 truncate capitalize">{user?.role?.replace('_', ' ')}</p>
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
