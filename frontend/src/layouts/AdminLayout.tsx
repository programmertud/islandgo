import { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../lib/axios';
import { DateRangeProvider } from '../context/DateRangeContext';

export default function AdminLayout() {
    const { user, isLoading } = useAuth();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    // Poll unread notification count
    const { data: notifData } = useQuery({
        queryKey: ['unread-count'],
        queryFn: () => apiClient.get('/notifications/unread-count').then(r => r.data),
        refetchInterval: 30_000, // every 30s
        enabled: !!user,
    });

    const unreadCount: number = notifData?.count ?? 0;

    // Close mobile sidebar on route change
    useEffect(() => {
        setMobileOpen(false);
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!user || !['super_admin', 'agency_admin'].includes(user.role)) {
        return <Navigate to="/login" replace />;
    }

    return (
        <DateRangeProvider>
        <div className="flex h-screen overflow-hidden bg-slate-50">
            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black/50 lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar — always visible on desktop, drawer on mobile */}
            <div className={`
                fixed inset-y-0 left-0 z-30 lg:relative lg:flex lg:shrink-0
                transform transition-transform duration-300 ease-in-out
                ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <Sidebar
                    collapsed={collapsed}
                    onToggle={() => setCollapsed(c => !c)}
                    onClose={() => setMobileOpen(false)}
                    unreadCount={unreadCount}
                />
            </div>

            {/* Main content */}
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                <Header
                    onMenuToggle={() => setMobileOpen(o => !o)}
                    unreadCount={unreadCount}
                />
                <main className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
        </DateRangeProvider>
    );
}
