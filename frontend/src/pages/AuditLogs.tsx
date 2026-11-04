import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Search, ChevronLeft, ChevronRight, Clock, Shield,
    User, ChevronDown, ChevronUp, Terminal
} from 'lucide-react';
import { apiClient } from '../lib/axios';
import { useAuth } from '../context/AuthContext';

interface AuditLog {
    id: number;
    user_id?: number;
    user?: { name: string; email: string };
    action: string;
    model_type?: string;
    model_id?: number;
    description: string;
    old_data?: Record<string, any>;
    new_data?: Record<string, any>;
    ip_address?: string;
    created_at: string;
}

const ACTION_CONFIG: Record<string, { color: string; bg: string; dot: string }> = {
    'booking.created':   { color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200',    dot: 'bg-blue-400' },
    'booking.confirmed': { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-400' },
    'booking.rejected':  { color: 'text-red-700',     bg: 'bg-red-50 border-red-200',      dot: 'bg-red-400' },
    'booking.cancelled': { color: 'text-orange-700',  bg: 'bg-orange-50 border-orange-200', dot: 'bg-orange-400' },
    'booking.completed': { color: 'text-slate-700',   bg: 'bg-slate-50 border-slate-200',  dot: 'bg-slate-400' },
    'document.uploaded': { color: 'text-purple-700',  bg: 'bg-purple-50 border-purple-200', dot: 'bg-purple-400' },
};

export default function AuditLogs() {
    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'super_admin';
    const basePath = isSuperAdmin ? '/admin/audit-logs' : '/agency/audit-logs';

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const { data, isLoading } = useQuery<{ data: AuditLog[]; current_page: number; last_page: number; total: number }>({
        queryKey: ['audit-logs', page, search],
        queryFn: async () => {
            const params = new URLSearchParams({ page: page.toString() });
            if (search) params.append('search', search);
            const res = await apiClient.get(`${basePath}?${params.toString()}`);
            return res.data;
        }
    });

    const toggleExpand = (id: number) => setExpandedId(prev => prev === id ? null : id);

    return (
        <div className="p-3 md:p-4 w-full space-y-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                <div>
                    <p className="text-slate-500 text-[10px] font-bold uppercase mb-0 tracking-wide">System</p>
                    <h1 className="text-xl font-extrabold text-slate-800 tracking-tight leading-none mt-0.5">Audit Logs</h1>
                    <p className="text-slate-500 mt-1 text-xs font-medium">A complete trail of all system activities.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search logs..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                            className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 w-56 shadow-sm transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="flex items-center gap-3 px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <Shield className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total Logs</p>
                    <p className="text-sm font-black text-slate-800 leading-none">{data?.total ?? 0}</p>
                </div>
                <div className="ml-auto text-[10px] text-slate-400 font-bold uppercase">
                    Page {data?.current_page ?? 1} / {data?.last_page ?? 1}
                </div>
            </div>

            {/* Log Timeline */}
            <div className="space-y-2.5">
                {isLoading ? (
                    [...Array(5)].map((_, i) => (
                        <div key={i} className="h-16 bg-white border border-slate-200 rounded-xl animate-pulse shadow-sm" />
                    ))
                ) : data?.data.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200">
                        <Shield className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-500">No audit log entries found.</p>
                        <p className="text-[10px] text-slate-400 mt-1">Try adjusting your search query.</p>
                    </div>
                ) : (
                    data?.data.map(log => {
                        const isExpanded = expandedId === log.id;
                        const cfg = ACTION_CONFIG[log.action] ?? { color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200', dot: 'bg-slate-400' };
                        const hasChanges = log.old_data || log.new_data;

                        return (
                            <div key={log.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-start gap-3 p-3">
                                    {/* Left dot / icon */}
                                    <div className="relative flex flex-col items-center">
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${cfg.bg} border shrink-0`}>
                                            <Terminal className={`w-3.5 h-3.5 ${cfg.color}`} />
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${cfg.bg} ${cfg.color}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                                {log.action}
                                            </span>
                                            {log.model_type && (
                                                <span className="text-[10px] text-slate-400 font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                                    {log.model_type.split('\\').pop()}#{log.model_id}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs font-bold text-slate-800">{log.description}</p>
                                        <div className="flex flex-wrap items-center gap-3 mt-1 text-[10px] font-medium text-slate-400">
                                            {log.user && (
                                                <span className="flex items-center gap-1">
                                                    <User className="w-3 h-3" />
                                                    <span className="text-slate-600">{log.user.name}</span>
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {log.ip_address && (
                                                <span className="font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{log.ip_address}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expand Toggle */}
                                    {hasChanges && (
                                        <button
                                            onClick={() => toggleExpand(log.id)}
                                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors shrink-0 flex items-center gap-1 text-[10px] font-bold"
                                        >
                                            {isExpanded ? (
                                                <><ChevronUp className="w-3 h-3" /> Hide</>
                                            ) : (
                                                <><ChevronDown className="w-3 h-3" /> Diff</>
                                            )}
                                        </button>
                                    )}
                                </div>

                                {/* Expandable Diff */}
                                {isExpanded && hasChanges && (
                                    <div className="border-t border-slate-100 bg-slate-50 p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {log.old_data && (
                                            <div>
                                                <h4 className="text-[10px] font-bold uppercase tracking-wider text-red-500 mb-1.5 flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" /> Before
                                                </h4>
                                                <pre className="text-[10px] bg-red-50 border border-red-100 rounded-lg p-2.5 overflow-x-auto text-red-800 font-mono leading-relaxed max-h-48">
                                                    {JSON.stringify(log.old_data, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                        {log.new_data && (
                                            <div>
                                                <h4 className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-1.5 flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> After
                                                </h4>
                                                <pre className="text-[10px] bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 overflow-x-auto text-emerald-800 font-mono leading-relaxed max-h-48">
                                                    {JSON.stringify(log.new_data, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                )}
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
