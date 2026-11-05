import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, Save, UserRound, QrCode, UploadCloud, Trash2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi, storageUrl, avatarUrl as getAvatarUrl } from '../lib/api';
import { apiClient } from '../lib/axios';

export default function ProfileSettings() {
    const { user, updateUser } = useAuth();
    const inputRef = useRef<HTMLInputElement>(null);
    const qrInputRef = useRef<HTMLInputElement>(null);
    const [name, setName] = useState(user?.name ?? '');
    const [phone, setPhone] = useState(user?.phone ?? '');
    const [avatar, setAvatar] = useState<File | null>(null);
    const [preview, setPreview] = useState(getAvatarUrl(user?.avatar));
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [deadlineHours, setDeadlineHours] = useState<string>('');
    const [savingDeadline, setSavingDeadline] = useState(false);
    const [gcashNumber, setGcashNumber] = useState('');
    const [gcashAccountName, setGcashAccountName] = useState('');
    const [savingGcash, setSavingGcash] = useState(false);
    const [qrCodeFile, setQrCodeFile] = useState<File | null>(null);
    const [qrCodePreview, setQrCodePreview] = useState<string>('');
    const [removeQrCode, setRemoveQrCode] = useState(false);

    const canManageAgency = user?.role === 'agency_admin' || user?.role === 'super_admin';

    useEffect(() => {
        if (canManageAgency) apiClient.get('/agency/profile').then(response => {
            setDeadlineHours(response.data.advance_payment_deadline_hours?.toString() ?? '');
            setGcashNumber(response.data.gcash_number ?? '');
            setGcashAccountName(response.data.gcash_account_name ?? '');
            if (response.data.payment_qr_code_url) {
                setQrCodePreview(response.data.payment_qr_code_url);
            } else if (response.data.payment_qr_code_path) {
                setQrCodePreview(storageUrl(response.data.payment_qr_code_path));
            }
        }).catch(() => undefined);
    }, [user?.role, canManageAgency]);

    const chooseAvatar = (file?: File) => {
        if (!file) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
            setError('Choose a JPG, PNG, or WebP image no larger than 2 MB.');
            return;
        }
        setError('');
        setAvatar(file);
        setPreview(URL.createObjectURL(file));
    };

    const chooseQrCode = (file?: File) => {
        if (!file) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 4 * 1024 * 1024) {
            setError('Choose a JPG, PNG, or WebP image no larger than 4 MB for your QR code.');
            return;
        }
        setError('');
        setRemoveQrCode(false);
        setQrCodeFile(file);
        setQrCodePreview(URL.createObjectURL(file));
    };

    const handleRemoveQrCode = () => {
        setQrCodeFile(null);
        setQrCodePreview('');
        setRemoveQrCode(true);
    };

    const saveDeadline = async (event: React.FormEvent) => {
        event.preventDefault(); setSavingDeadline(true); setError(''); setMessage('');
        try {
            await apiClient.put('/agency/profile', { advance_payment_deadline_hours: deadlineHours ? Number(deadlineHours) : null });
            setMessage(deadlineHours ? `Advance-payment deadline saved: ${deadlineHours} hours.` : 'Advance-payment deadline disabled.');
        } catch (err: any) { setError(err.response?.data?.message || 'Unable to save payment deadline.'); }
        finally { setSavingDeadline(false); }
    };

    const saveGcash = async (event: React.FormEvent) => {
        event.preventDefault(); setSavingGcash(true); setError(''); setMessage('');
        try {
            const formData = new FormData();
            formData.append('gcash_number', gcashNumber.trim());
            formData.append('gcash_account_name', gcashAccountName.trim());
            if (qrCodeFile) {
                formData.append('payment_qr_code', qrCodeFile);
            } else if (removeQrCode) {
                formData.append('remove_payment_qr_code', '1');
            }

            const res = await apiClient.post('/agency/profile', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data?.agency?.payment_qr_code_url) {
                setQrCodePreview(res.data.agency.payment_qr_code_url);
            } else if (!qrCodeFile && removeQrCode) {
                setQrCodePreview('');
            }
            setQrCodeFile(null);
            setRemoveQrCode(false);
            setMessage('Payment details and QR code updated successfully.');
        } catch (err: any) { setError(err.response?.data?.message || 'Unable to save payment details.'); }
        finally { setSavingGcash(false); }
    };

    const saveProfile = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!name.trim()) { setError('Your name is required.'); return; }
        setSaving(true); setMessage(''); setError('');
        try {
            const data = new FormData();
            data.append('name', name.trim());
            data.append('phone', phone.trim());
            if (avatar) data.append('avatar', avatar);
            const response = await authApi.updateProfile(data);
            updateUser(response.data.user);
            setAvatar(null);
            setPreview(getAvatarUrl(response.data.user.avatar));
            setMessage('Profile updated successfully.');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Unable to update your profile.');
        } finally { setSaving(false); }
    };

    return <div className="max-w-2xl mx-auto p-6 md:p-8">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 md:p-8 bg-gradient-to-r from-sky-700 to-cyan-600 text-white">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-100">Account settings</p>
                <h1 className="mt-2 text-2xl font-extrabold">Your profile</h1>
                <p className="mt-1 text-sky-100">Update how your name and profile photo appear in IslandGo.</p>
            </div>
            <form onSubmit={saveProfile} className="p-6 md:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                    <button type="button" onClick={() => inputRef.current?.click()} className="relative h-24 w-24 rounded-3xl overflow-hidden bg-sky-100 border-4 border-white shadow-md flex items-center justify-center shrink-0 group">
                        {preview ? <img src={preview} alt="Profile preview" className="w-full h-full object-cover" /> : <UserRound className="w-10 h-10 text-sky-600" />}
                        <span className="absolute inset-0 bg-slate-900/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Camera className="w-6 h-6 text-white" /></span>
                    </button>
                    <div><p className="font-bold text-slate-900">Profile picture</p><p className="text-sm text-slate-500 mt-1">JPG, PNG, or WebP. Maximum 2 MB.</p><button type="button" onClick={() => inputRef.current?.click()} className="mt-3 text-sm font-bold text-sky-700 hover:text-sky-800">Upload a new photo</button></div>
                    <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => chooseAvatar(e.target.files?.[0])} />
                </div>
                <div><label className="block text-sm font-bold text-slate-700 mb-2">Full name</label><input value={name} onChange={e => setName(e.target.value)} maxLength={255} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500" /></div>
                <div><label className="block text-sm font-bold text-slate-700 mb-2">Mobile number (for SMS notifications)</label><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} maxLength={20} placeholder="09123456789" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500" /></div>
                <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3"><p className="text-xs uppercase tracking-wider font-bold text-slate-400">Email address</p><p className="mt-1 text-sm font-semibold text-slate-700">{user?.email}</p></div>
                {error && <p role="alert" className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
                {message && <p role="status" className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm font-medium text-emerald-700">{message}</p>}
                <button disabled={saving} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-bold shadow-sm"><>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}</> {saving ? 'Saving...' : 'Save profile'}</button>
            </form>
        </div>
        {canManageAgency && (
            <form onSubmit={saveGcash} className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8 space-y-6">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-sky-100 text-sky-700">
                            <QrCode className="w-4 h-4" />
                        </span>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Payment Setup & QR Code</p>
                    </div>
                    <h2 className="mt-2 text-xl font-extrabold text-slate-900">Official Payment & QR Code</h2>
                    <p className="mt-1 text-sm text-slate-600">
                        Provide your official GCash number and upload your payment QR code (GCash, Maya, or Bank QR). Customers will be able to scan your QR code or copy your number to pay their 50% advance or remaining balance.
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">
                            GCash Account Name
                        </label>
                        <input
                            type="text"
                            value={gcashAccountName}
                            onChange={e => setGcashAccountName(e.target.value)}
                            maxLength={191}
                            placeholder="e.g. Maria Santos / Island Adventures"
                            className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">Exact name as shown in your GCash / Bank account.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">
                            Official GCash Mobile Number
                        </label>
                        <input
                            type="tel"
                            value={gcashNumber}
                            onChange={e => setGcashNumber(e.target.value)}
                            maxLength={20}
                            placeholder="0917 123 4567"
                            className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">Used for manual copy-paste transfers.</p>
                    </div>
                </div>

                {/* QR Code Upload / Preview Block */}
                <div className="pt-2 border-t border-slate-100">
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                        Official Payment QR Code
                    </label>

                    <input
                        ref={qrInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={e => chooseQrCode(e.target.files?.[0])}
                    />

                    {qrCodePreview ? (
                        <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl border border-sky-200/80 bg-sky-50/50">
                            <div className="relative group p-2 bg-white rounded-xl border border-slate-200 shadow-sm shrink-0">
                                <img
                                    src={qrCodePreview}
                                    alt="Payment QR Code preview"
                                    className="w-36 h-36 object-contain rounded-lg"
                                />
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity flex items-center justify-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => qrInputRef.current?.click()}
                                        className="p-2 bg-white text-slate-800 rounded-lg shadow text-xs font-bold hover:bg-slate-50"
                                        title="Change QR image"
                                    >
                                        Change
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 space-y-2 text-center sm:text-left">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Active QR Code ready</span>
                                </div>
                                <h3 className="text-sm font-bold text-slate-800">
                                    {qrCodeFile ? qrCodeFile.name : 'Saved Payment QR Code'}
                                </h3>
                                <p className="text-xs text-slate-500 leading-relaxed max-w-md">
                                    Customers will see this QR code during booking checkout and on the tracking page to scan and pay instantly with GCash or any QR-compatible banking app.
                                </p>
                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => qrInputRef.current?.click()}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition-colors"
                                    >
                                        <Camera className="w-3.5 h-3.5 text-sky-600" /> Change QR Image
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleRemoveQrCode}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-xs font-bold text-red-700 shadow-2xs transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5 text-red-600" /> Remove QR Code
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div
                            onClick={() => qrInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-300 hover:border-sky-400 bg-slate-50/70 hover:bg-sky-50/30 rounded-2xl p-6 text-center cursor-pointer transition-colors group"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mx-auto text-sky-600 group-hover:scale-105 transition-transform">
                                <QrCode className="w-6 h-6" />
                            </div>
                            <p className="mt-3 text-sm font-bold text-slate-800">
                                Click to upload your GCash or Bank QR Code
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                PNG, JPG, or WebP up to 4 MB. Generates a clear scan target for your customers.
                            </p>
                            <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-2xs">
                                <UploadCloud className="w-3.5 h-3.5" /> Select QR Code Image
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        type="submit"
                        disabled={savingGcash}
                        className="inline-flex items-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-700 px-5 py-3 font-bold text-white shadow-sm disabled:opacity-60 transition-colors"
                    >
                        {savingGcash ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {savingGcash ? 'Saving payment setup...' : 'Save Payment Setup'}
                    </button>
                </div>
            </form>
        )}
        {canManageAgency && <form onSubmit={saveDeadline} className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Booking policy</p>
            <h2 className="mt-2 text-xl font-extrabold text-slate-900">Advance payment deadline</h2>
            <p className="mt-1 text-sm text-slate-600">A temporary tour-slot hold is released when an unpaid 50% advance reaches this deadline. Choose disabled to keep the existing manual follow-up process.</p>
            <div className="mt-4 flex flex-wrap items-end gap-3"><label className="block text-sm font-bold text-slate-700">Deadline<select value={deadlineHours} onChange={e => setDeadlineHours(e.target.value)} className="mt-2 block rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-sky-500 focus:outline-none"><option value="">Disabled</option><option value="12">12 hours</option><option value="24">24 hours</option><option value="48">48 hours</option><option value="72">72 hours</option></select></label><button disabled={savingDeadline} className="rounded-xl bg-sky-600 px-5 py-3 font-bold text-white disabled:opacity-60">{savingDeadline ? 'Saving...' : 'Save deadline'}</button></div>
        </form>}
    </div>;
}
