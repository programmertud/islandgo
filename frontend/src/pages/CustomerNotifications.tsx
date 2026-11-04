import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, Calendar, AlertCircle, Info, ChevronLeft, ChevronRight, Wallet, Clock, Trash2, X } from 'lucide-react';
import { apiClient } from '../lib/axios';

interface Notification {
    id: number;
    type: string;
    title: string;
    message: string;
    is_read: boolean;
    data?: Record<string, any>;
    created_at: string;
    read_at?: string;
}

const NOTIF_ICONS: Record<string, { icon: React.ElementType; color: string; bg: string; border: string }> = {
    'new_booking':      { icon: Calendar,    color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-100' },
    'booking_approved': { icon: Calendar,    color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    'booking_rejected': { icon: AlertCircle, color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-100' },
    'payment_received': { icon: Wallet,      color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-100' },
    'payment_verified': { icon: Check,       color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
};
const DEFAULT_ICON = { icon: Info, color: 'text-slate-500', bg: 'bg-slate-100', border: 'border-slate-100' };

function timeAgo(dateStr: string) {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function CustomerNotifications() {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
    const [notificationToDelete, setNotificationToDelete] = useState<number | null>(null);

    const { data, isLoading } = useQuery<{
        data: Notification[]; current_page: number; last_page: number; total: number;
    }>({
        queryKey: ['notifications', page, filter],
        queryFn: async () => {
            const params = new URLSearchParams({ page: page.toString() });
            if (filter === 'unread') params.append('unread', 'true');
            const res = await apiClient.get(`/notifications?${params.toString()}`);
            return res.data;
        }
    });

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    };

    const markReadMutation = useMutation({
        mutationFn: (id: number) => apiClient.patch(`/notifications/${id}/read`),
        onSuccess: invalidate,
    });

    const markAllReadMutation = useMutation({
        mutationFn: () => apiClient.patch('/notifications/read-all'),
        onSuccess: invalidate,
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiClient.delete(`/notifications/${id}`),
        onSuccess: invalidate,
    });

    const deleteAllMutation = useMutation({
        mutationFn: () => apiClient.delete('/notifications'),
        onSuccess: () => { invalidate(); setConfirmDeleteAll(false); },
    });

    const unreadCount = data?.data.filter(n => !n.is_read).length ?? 0;

    return (
        <div className="p-3 md:p-4 w-full space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-sky-500 rounded-lg flex items-center justify-center shrink-0 shadow shadow-sky-200">
                        <Bell className="w-5 h-5 text-white fill-white" />
                    </div>
                    <div>
                        <p className="text-sky-500 text-[10px] font-bold mb-0 tracking-wide uppercase">Inbox</p>
                        <h1 className="text-xl font-extrabold text-[#1e1b4b] tracking-tight leading-none mt-0.5">Notifications</h1>
                        <p className="text-slate-500 mt-1 text-xs font-medium">
                            {unreadCount > 0
                                ? <span><strong className="text-sky-500 font-bold">{unreadCount}</strong> unread</span>
                                : 'Caught up! 🎉'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => markAllReadMutation.mutate()}
                        disabled={markAllReadMutation.isPending || unreadCount === 0}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white border border-sky-200 rounded-lg text-[11px] font-bold text-sky-500 hover:bg-sky-50 disabled:opacity-40 transition-all shadow-sm"
                    >
                        <Check className="w-3 h-3" /> Mark All Read
                    </button>
                    <button
                        onClick={() => setConfirmDeleteAll(true)}
                        disabled={(data?.total ?? 0) === 0}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white border border-red-200 rounded-lg text-[11px] font-bold text-red-500 hover:bg-red-50 disabled:opacity-40 transition-all shadow-sm"
                    >
                        <Trash2 className="w-3 h-3" /> Clear All
                    </button>
                </div>
            </div>

            {/* Confirm Delete All Modal */}
            {confirmDeleteAll && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-5 text-center">
                            <div className="w-12 h-12 rounded-full bg-red-100 mx-auto flex items-center justify-center mb-4">
                                <Trash2 className="w-6 h-6 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-1">Delete all notifications?</h3>
                            <p className="text-sm text-slate-500">This action cannot be undone. All your notifications will be permanently removed.</p>
                        </div>
                        <div className="p-3 bg-slate-50 flex gap-2 justify-end border-t border-slate-100">
                            <button
                                onClick={() => setConfirmDeleteAll(false)}
                                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => deleteAllMutation.mutate()}
                                disabled={deleteAllMutation.isPending}
                                className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-60 transition-colors flex items-center gap-2"
                            >
                                {deleteAllMutation.isPending ? 'Deleting...' : 'Yes, Delete All'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Delete Single Modal */}
            {notificationToDelete !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-5 text-center">
                            <div className="w-12 h-12 rounded-full bg-red-100 mx-auto flex items-center justify-center mb-4">
                                <Trash2 className="w-6 h-6 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-1">Delete notification?</h3>
                            <p className="text-sm text-slate-500">Are you sure you want to delete this notification?</p>
                        </div>
                        <div className="p-3 bg-slate-50 flex gap-2 justify-end border-t border-slate-100">
                            <button
                                onClick={() => setNotificationToDelete(null)}
                                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    deleteMutation.mutate(notificationToDelete);
                                    setNotificationToDelete(null);
                                }}
                                disabled={deleteMutation.isPending}
                                className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-60 transition-colors flex items-center gap-2"
                            >
                                {deleteMutation.isPending ? 'Deleting...' : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Filter Tabs */}
            <div className="flex space-x-1 bg-slate-50/80 p-1 rounded-lg w-fit border border-slate-100">
                {(['all', 'unread'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => { setFilter(f); setPage(1); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-md capitalize transition-all ${
                            filter === f
                                ? 'bg-sky-500 text-white shadow-sm shadow-sky-200'
                                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                        }`}
                    >
                        {f}
                        <span className={`text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full ${
                            filter === f ? 'bg-white text-sky-500' : 'bg-white text-slate-500 shadow-sm'
                        }`}>
                            {f === 'all' ? data?.total ?? 0 : unreadCount}
                        </span>
                    </button>
                ))}
            </div>

            {/* Notification List */}
            <div className="space-y-2.5">
                {isLoading ? (
                    [...Array(5)].map((_, i) => (
                        <div key={i} className="h-20 bg-white border border-slate-200 rounded-2xl animate-pulse shadow-sm" />
                    ))
                ) : data?.data.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300 shadow-sm">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50"><Bell className="w-8 h-8 text-teal-600" /></div>
                        <p className="font-bold text-slate-950 text-lg">No notifications</p>
                        <p className="text-sm text-slate-700 mt-1">
                            {filter === 'unread' ? 'All notifications are marked as read.' : 'You will see booking and payment updates here.'}
                        </p>
                    </div>
                ) : (
                    data?.data.map(notif => {
                        const cfg = NOTIF_ICONS[notif.type] ?? DEFAULT_ICON;
                        const Icon = cfg.icon;
                        return (
                            <div
                                key={notif.id}
                                className={`group relative flex items-center gap-3 p-3 rounded-xl transition-all ${
                                    notif.is_read
                                        ? 'bg-white hover:bg-slate-50/70 shadow-sm border border-slate-100'
                                        : 'bg-sky-50/30 border border-slate-100 shadow-sm hover:shadow-md'
                                }`}
                            >
                                {/* Icon */}
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                                    notif.is_read ? cfg.bg + ' ' + cfg.border : 'bg-sky-500 border-sky-500 shadow-sm shadow-sky-200'
                                }`}>
                                    <Icon className={`w-4 h-4 ${notif.is_read ? cfg.color : 'text-white'}`} />
                                </div>

                                {/* Content — clicking marks as read */}
                                <div
                                    className="flex-1 min-w-0 pr-2 cursor-pointer"
                                    onClick={() => !notif.is_read && markReadMutation.mutate(notif.id)}
                                >
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-bold truncate text-[#1e1b4b]">{notif.title}</p>
                                        <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 whitespace-nowrap shrink-0 ml-2">
                                            <Clock className="w-3 h-3" /> {timeAgo(notif.created_at)}
                                        </p>
                                    </div>
                                    <p className={`text-[11px] mt-0.5 leading-relaxed truncate ${notif.is_read ? 'text-slate-500' : 'text-slate-600'}`}>
                                        {notif.message}
                                    </p>
                                </div>

                                {/* Right Section */}
                                <div className="flex items-center gap-2 shrink-0">
                                    {!notif.is_read && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                                    )}
                                    {/* Delete button — visible on hover */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setNotificationToDelete(notif.id); }}
                                        disabled={deleteMutation.isPending}
                                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-40"
                                        title="Delete notification"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Pagination */}
            {data && data.last_page > 1 && (
                <div className="flex items-center justify-between pt-2">
                    <span className="text-sm text-slate-500">
                        Page <strong className="text-slate-700">{data.current_page}</strong> of <strong className="text-slate-700">{data.last_page}</strong>
                    </span>
                    <div className="flex gap-2">
                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white disabled:opacity-40 text-slate-600 hover:bg-slate-50 transition-colors font-medium">
                            <ChevronLeft className="w-4 h-4" /> Prev
                        </button>
                        <button disabled={page === data.last_page} onClick={() => setPage(p => p + 1)}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white disabled:opacity-40 text-slate-600 hover:bg-slate-50 transition-colors font-medium">
                            Next <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
