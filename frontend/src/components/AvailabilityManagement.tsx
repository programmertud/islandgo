import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { availabilityApi, agencyPackagesApi } from '../lib/api';
import type { TourPackage, PaginatedResponse } from '../types';

interface Closure { id: number; start_date: string; end_date: string; reason: string; creator?: { id: number; name: string } | null }
const blank = { start_date: '', end_date: '', reason: 'Maintenance' };

export default function AvailabilityManagement() {
    const client = useQueryClient();
    const [packageId, setPackageId] = useState<number | ''>('');
    const [form, setForm] = useState(blank);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [otherReason, setOtherReason] = useState('');
    const [message, setMessage] = useState('');
    const packages = useQuery({ queryKey: ['agency-packages', 'availability'], queryFn: () => agencyPackagesApi.list(1).then(r => r.data as PaginatedResponse<TourPackage>) });
    const closures = useQuery({ queryKey: ['availability-closures', packageId], queryFn: () => availabilityApi.list(Number(packageId)).then(r => r.data as Closure[]), enabled: Boolean(packageId) });
    const save = useMutation({ mutationFn: () => {
        const payload = { ...form, reason: form.reason === 'Other' ? otherReason.trim() : form.reason };
        return editingId ? availabilityApi.update(Number(packageId), editingId, payload) : availabilityApi.create(Number(packageId), payload);
    }, onSuccess: () => { setMessage('Availability closure saved.'); setForm(blank); setOtherReason(''); setEditingId(null); client.invalidateQueries({ queryKey: ['availability-closures', packageId] }); } });
    const remove = useMutation({ mutationFn: (id: number) => availabilityApi.delete(Number(packageId), id), onSuccess: () => client.invalidateQueries({ queryKey: ['availability-closures', packageId] }) });
    const error = (save.error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } } | null)?.response?.data;
    return <div className="mx-auto max-w-5xl space-y-6">
        <header><h2 className="text-2xl font-bold text-slate-900">Manage Availability</h2><p className="mt-1 text-sm text-slate-500">Close a date range for renovation, maintenance, weather, or other agency operations.</p></header>
        <label className="block text-sm font-semibold text-slate-700">Tour package<select className="mt-1 block w-full rounded-xl border border-slate-200 p-3" value={packageId} onChange={e => { setPackageId(e.target.value ? Number(e.target.value) : ''); setForm(blank); setEditingId(null); }}><option value="">Select a package</option>{packages.data?.data.map(item => <option key={item.id} value={item.id}>{item.title} — {item.destination}</option>)}</select></label>
        {packageId && <>
            <form onSubmit={e => { e.preventDefault(); setMessage(''); save.mutate(); }} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700">Start date<input required type="date" min={new Date().toLocaleDateString('en-CA')} value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="mt-1 block w-full rounded-xl border border-slate-200 p-3" /></label>
                <label className="text-sm font-semibold text-slate-700">End date<input required type="date" min={form.start_date || new Date().toLocaleDateString('en-CA')} value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className="mt-1 block w-full rounded-xl border border-slate-200 p-3" /></label>
                <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Reason<select value={['Renovation', 'Maintenance', 'Weather conditions', 'Private event', 'Agency closure'].includes(form.reason) ? form.reason : 'Other'} onChange={e => { setForm({ ...form, reason: e.target.value }); setOtherReason(''); }} className="mt-1 block w-full rounded-xl border border-slate-200 p-3">{['Renovation', 'Maintenance', 'Weather conditions', 'Private event', 'Agency closure', 'Other'].map(reason => <option key={reason}>{reason}</option>)}</select></label>
                {!['Renovation', 'Maintenance', 'Weather conditions', 'Private event', 'Agency closure'].includes(form.reason) && <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Custom reason<input required maxLength={255} value={otherReason || (editingId ? form.reason : '')} onChange={e => setOtherReason(e.target.value)} placeholder="Enter reason" className="mt-1 block w-full rounded-xl border border-slate-200 p-3" /></label>}
                {(message || error?.message) && <p className={`sm:col-span-2 text-sm ${error ? 'text-red-700' : 'text-emerald-700'}`} role="status">{error?.message ?? message}{error?.errors && Object.values(error.errors).flat().join(' ')}</p>}
                <div className="flex gap-2 sm:col-span-2"><button disabled={save.isPending} className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white disabled:opacity-60">{save.isPending ? 'Saving…' : editingId ? 'Update closure' : 'Block dates'}</button>{editingId && <button type="button" onClick={() => { setEditingId(null); setForm(blank); }} className="rounded-xl border px-5 py-3">Cancel edit</button>}</div>
            </form>
            <section className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="mb-4 text-lg font-bold">Existing closures</h3>{closures.isLoading ? <p>Loading closures…</p> : closures.isError ? <p className="text-red-700">Could not load closures.</p> : !closures.data?.length ? <p className="text-slate-500">No date closures for this package.</p> : <ul className="divide-y divide-slate-100">{closures.data.map(closure => <li key={closure.id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"><div><p className="font-semibold text-slate-900">{closure.start_date} — {closure.end_date}</p><p className="text-sm text-slate-600">{closure.reason}{closure.creator ? ` · Added by ${closure.creator.name}` : ''}</p></div><div className="flex gap-2"><button onClick={() => { setForm({ start_date: closure.start_date, end_date: closure.end_date, reason: closure.reason }); setEditingId(closure.id); }} className="rounded-lg border px-3 py-2 text-sm">Edit</button><button onClick={() => { if (window.confirm('Delete this closure and restore availability for these dates?')) remove.mutate(closure.id); }} className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700">Delete</button></div></li>)}</ul>}</section>
        </>}
    </div>;
}
