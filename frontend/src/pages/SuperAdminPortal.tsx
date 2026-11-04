import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, CheckCircle, XCircle, Clock, Eye, RefreshCw } from 'lucide-react';
import { adminApi } from '../lib/api';
import type { Agency, PaginatedResponse } from '../types';

const statusColors: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    pending: 'bg-amber-100 text-amber-700',
    suspended: 'bg-red-100 text-red-700',
};

const StatusBadge = ({ status }: { status: string }) => (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[status] ?? 'bg-slate-100 text-slate-600'}`}>
        {status === 'active' && <CheckCircle className="w-3 h-3" />}
        {status === 'pending' && <Clock className="w-3 h-3" />}
        {status === 'suspended' && <XCircle className="w-3 h-3" />}
        {status}
    </span>
);

export default function SuperAdminPortal() {
    const qc = useQueryClient();
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['admin-agencies', page, statusFilter],
        queryFn: () => adminApi.listAgencies({ status: statusFilter || undefined, page }).then(r => r.data as PaginatedResponse<Agency>),
    });

    const updateStatus = useMutation({
        mutationFn: ({ id, status }: { id: number; status: string }) =>
            adminApi.updateAgencyStatus(id, status),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-agencies'] }),
    });

    const totalActive = data?.data.filter(a => a.status === 'active').length ?? 0;
    const totalPending = data?.data.filter(a => a.status === 'pending').length ?? 0;
    const totalSuspended = data?.data.filter(a => a.status === 'suspended').length ?? 0;

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Header */}
            <div className="mb-8 pb-6 border-b border-slate-200">
                <h1 className="text-3xl font-bold text-slate-900">Platform Administration</h1>
                <p className="text-slate-500 mt-1">Manage agencies and platform-wide settings.</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {[
                    { label: 'Active Agencies', value: totalActive, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
                    { label: 'Pending Approval', value: totalPending, color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
                    { label: 'Suspended', value: totalSuspended, color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
                ].map((s, i) => {
                    const Icon = s.icon;
                    return (
                        <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${s.bg}`}><Icon className={`w-6 h-6 ${s.color}`} /></div>
                            <div>
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{s.label}</p>
                                <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{s.value}</h3>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Agencies Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-slate-400" /> Registered Agencies
                    </h2>
                    <div className="flex items-center gap-3">
                        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                            className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                            <option value="">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="pending">Pending</option>
                            <option value="suspended">Suspended</option>
                        </select>
                        <button onClick={() => refetch()} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                            <RefreshCw className="w-4 h-4 text-slate-500" />
                        </button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center h-48 text-slate-400">Loading agencies…</div>
                ) : data?.data.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                        <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
                        <p>No agencies found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-left text-slate-500 bg-slate-50/50">
                                    <th className="px-6 py-3 font-medium">Agency</th>
                                    <th className="px-6 py-3 font-medium">Contact</th>
                                    <th className="px-6 py-3 font-medium">Status</th>
                                    <th className="px-6 py-3 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {data?.data.map(agency => (
                                    <tr key={agency.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-slate-900">{agency.name}</div>
                                            <div className="text-slate-400 text-xs">{agency.slug}</div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">{agency.contact_email ?? '—'}</td>
                                        <td className="px-6 py-4"><StatusBadge status={agency.status} /></td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="View">
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                {agency.status !== 'active' && (
                                                    <button onClick={() => updateStatus.mutate({ id: agency.id, status: 'active' })}
                                                        className="px-3 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">
                                                        Approve
                                                    </button>
                                                )}
                                                {agency.status !== 'suspended' && (
                                                    <button onClick={() => updateStatus.mutate({ id: agency.id, status: 'suspended' })}
                                                        className="px-3 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors">
                                                        Suspend
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
