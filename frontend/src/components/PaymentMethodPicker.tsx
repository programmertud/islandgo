import { useState } from 'react';
import { Smartphone, Banknote, CheckCircle2, Copy, Check, Info, QrCode, Maximize2, X } from 'lucide-react';

export type PaymentMethod = 'gcash' | 'cash';

export interface PaymentMethodPickerProps {
    value: PaymentMethod;
    onChange: (value: PaymentMethod) => void;
    dueAmount: number;
    gcashNumber?: string | null;
    gcashAccountName?: string | null;
    paymentQrCodeUrl?: string | null;
}

const currencyFormatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
});

export default function PaymentMethodPicker({
    value,
    onChange,
    dueAmount,
    gcashNumber,
    gcashAccountName,
    paymentQrCodeUrl,
}: PaymentMethodPickerProps) {
    const [copied, setCopied] = useState(false);
    const [copyFailed, setCopyFailed] = useState(false);
    const [showQrModal, setShowQrModal] = useState(false);

    const formattedAmount = currencyFormatter.format(dueAmount);
    const hasValidGcashNumber = Boolean(gcashNumber && gcashNumber.trim().length > 0);

    const handleCopyGcash = async () => {
        if (!gcashNumber) return;
        try {
            await navigator.clipboard.writeText(gcashNumber.trim());
            setCopied(true);
            setCopyFailed(false);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopyFailed(true);
            setTimeout(() => setCopyFailed(false), 2500);
        }
    };

    return (
        <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700">
                Advance Payment Method
            </label>

            {/* ── Selection Cards (Radio Group) ─────────────────────────── */}
            <div
                role="radiogroup"
                aria-label="Advance payment method"
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
                {/* GCash Card */}
                <label
                    className={`relative flex items-start gap-3.5 p-4 rounded-2xl border cursor-pointer select-none transition-all duration-200 ${
                        value === 'gcash'
                            ? 'border-sky-500 ring-2 ring-sky-500/30 bg-sky-50/80 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-sky-300 hover:-translate-y-0.5 shadow-xs'
                    } focus-within:ring-2 focus-within:ring-sky-500 focus-within:ring-offset-1`}
                >
                    <input
                        type="radio"
                        name="payment_method_choice"
                        value="gcash"
                        checked={value === 'gcash'}
                        onChange={() => onChange('gcash')}
                        className="sr-only"
                        aria-label="GCash — Pay 50% advance now"
                    />
                    <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            value === 'gcash'
                                ? 'bg-sky-500 text-white shadow-xs'
                                : 'bg-sky-50 text-sky-600'
                        }`}
                        aria-hidden="true"
                    >
                        <Smartphone className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0 pr-6">
                        <span className="block font-bold text-sm text-slate-900 leading-snug">
                            GCash
                        </span>
                        <span className="block text-xs text-slate-500 mt-0.5 leading-normal">
                            Pay 50% advance now
                        </span>
                    </div>
                    {value === 'gcash' && (
                        <div
                            className="absolute top-3.5 right-3.5 animate-pop-in text-sky-600"
                            aria-hidden="true"
                        >
                            <CheckCircle2 className="w-5 h-5 fill-sky-100" />
                        </div>
                    )}
                </label>

                {/* Cash Card */}
                <label
                    className={`relative flex items-start gap-3.5 p-4 rounded-2xl border cursor-pointer select-none transition-all duration-200 ${
                        value === 'cash'
                            ? 'border-sky-500 ring-2 ring-sky-500/30 bg-sky-50/80 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-sky-300 hover:-translate-y-0.5 shadow-xs'
                    } focus-within:ring-2 focus-within:ring-sky-500 focus-within:ring-offset-1`}
                >
                    <input
                        type="radio"
                        name="payment_method_choice"
                        value="cash"
                        checked={value === 'cash'}
                        onChange={() => onChange('cash')}
                        className="sr-only"
                        aria-label="Cash — Pay at the agency office"
                    />
                    <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            value === 'cash'
                                ? 'bg-sky-500 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600'
                        }`}
                        aria-hidden="true"
                    >
                        <Banknote className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0 pr-6">
                        <span className="block font-bold text-sm text-slate-900 leading-snug">
                            Cash
                        </span>
                        <span className="block text-xs text-slate-500 mt-0.5 leading-normal">
                            Pay at the agency office
                        </span>
                    </div>
                    {value === 'cash' && (
                        <div
                            className="absolute top-3.5 right-3.5 animate-pop-in text-sky-600"
                            aria-hidden="true"
                        >
                            <CheckCircle2 className="w-5 h-5 fill-sky-100" />
                        </div>
                    )}
                </label>
            </div>

            {/* ── Contextual Instruction Panels ─────────────────────────── */}
            <div className="min-h-[140px] transition-all duration-200">
                {value === 'gcash' ? (
                    <div
                        key="gcash-panel"
                        className="animate-reveal-up rounded-2xl border border-sky-100 bg-sky-50/70 p-4 space-y-3"
                    >
                        <div className="flex items-center justify-between pb-2 border-b border-sky-200/60">
                            <span className="text-xs font-bold uppercase tracking-wider text-sky-800">
                                GCash Advance Instructions
                            </span>
                            <span className="text-xs font-extrabold text-sky-700 bg-white/80 border border-sky-200 px-2 py-0.5 rounded-full">
                                {formattedAmount} due
                            </span>
                        </div>

                        {/* Step 1 */}
                        <div
                            className="animate-reveal-up flex items-start gap-3"
                            style={{ animationDelay: '50ms' }}
                        >
                            <span className="w-5 h-5 rounded-full bg-sky-600 text-white text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                                1
                            </span>
                            <div className="flex-1 min-w-0 text-xs text-slate-700 leading-relaxed">
                                <span className="font-bold text-slate-900">Send the advance payment.</span>{' '}
                                Send {formattedAmount} via GCash.

                                {/* QR Code Display (if configured by agency) */}
                                {paymentQrCodeUrl && (
                                    <div className="mt-3 p-3 bg-white rounded-2xl border border-sky-200 shadow-2xs flex flex-col sm:flex-row items-center gap-3">
                                        <div
                                            onClick={() => setShowQrModal(true)}
                                            className="relative group cursor-pointer shrink-0 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 p-1.5 hover:border-sky-400 transition-colors"
                                            title="Click to enlarge QR code"
                                        >
                                            <img
                                                src={paymentQrCodeUrl}
                                                alt="Agency Payment QR Code"
                                                className="w-24 h-24 sm:w-28 sm:h-28 object-contain"
                                            />
                                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
                                                <Maximize2 className="w-4 h-4 text-white" />
                                            </div>
                                        </div>
                                        <div className="space-y-1 text-center sm:text-left">
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                                                <QrCode className="w-3 h-3" /> Scan to Pay
                                            </span>
                                            <p className="text-xs font-bold text-slate-900">
                                                {gcashAccountName || 'Official Agency QR'}
                                            </p>
                                            <p className="text-[11px] text-slate-500">
                                                Scan using GCash or any QR-Ph enabled banking app, or copy number below.
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => setShowQrModal(true)}
                                                className="text-[11px] font-bold text-sky-600 hover:text-sky-700 underline"
                                            >
                                                Tap to view full QR code
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {hasValidGcashNumber ? (
                                    <div className="mt-2 inline-flex flex-wrap items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-sky-200/80 shadow-2xs">
                                        <span className="text-[11px] font-semibold text-slate-500">
                                            {gcashAccountName ? `${gcashAccountName} (${gcashNumber})` : `Agency GCash: ${gcashNumber}`}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleCopyGcash}
                                            aria-label="Copy agency GCash number"
                                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg transition-colors ${
                                                copied
                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                    : 'bg-slate-100 hover:bg-sky-100 text-slate-700 hover:text-sky-800'
                                            }`}
                                        >
                                            {copied ? (
                                                <>
                                                    <Check className="w-3 h-3 text-emerald-600" />
                                                    <span>Copied!</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="w-3 h-3 text-slate-500" />
                                                    <span>Copy</span>
                                                </>
                                            )}
                                        </button>
                                        <div aria-live="polite" className="sr-only">
                                            {copied ? 'GCash number copied to clipboard' : ''}
                                            {copyFailed ? 'Failed to copy to clipboard' : ''}
                                        </div>
                                    </div>
                                ) : !paymentQrCodeUrl ? (
                                    <p className="mt-1.5 text-[11px] text-amber-800 font-medium bg-amber-50/80 border border-amber-200/70 rounded-lg p-2">
                                        Please ask the agency for its verified GCash number before sending payment.
                                    </p>
                                ) : null}
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div
                            className="animate-reveal-up flex items-start gap-3"
                            style={{ animationDelay: '100ms' }}
                        >
                            <span className="w-5 h-5 rounded-full bg-sky-600 text-white text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                                2
                            </span>
                            <div className="flex-1 min-w-0 text-xs text-slate-700 leading-relaxed">
                                <span className="font-bold text-slate-900">Upload your payment receipt.</span>{' '}
                                Take a screenshot of the GCash transaction receipt and upload it in the booking tracker to submit your proof of payment.
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div
                            className="animate-reveal-up flex items-start gap-3"
                            style={{ animationDelay: '150ms' }}
                        >
                            <span className="w-5 h-5 rounded-full bg-sky-600 text-white text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                                3
                            </span>
                            <div className="flex-1 min-w-0 text-xs text-slate-700 leading-relaxed">
                                <span className="font-bold text-slate-900">Wait for verification.</span>{' '}
                                The agency will review and verify your receipt. Your booking status updates to paid once approved.
                            </div>
                        </div>
                    </div>
                ) : (
                    <div
                        key="cash-panel"
                        className="animate-reveal-up rounded-2xl border border-amber-200 bg-amber-50/80 p-4 flex items-start gap-3"
                    >
                        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                        <div className="text-xs text-amber-900 leading-relaxed">
                            <p className="font-bold text-amber-950 mb-0.5">Agency Cash Payment</p>
                            <p>
                                Your seat is held; payment is due at the agency office before the trip.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Enlarged QR Modal */}
            {showQrModal && paymentQrCodeUrl && (
                <div
                    className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                    onClick={() => setShowQrModal(false)}
                >
                    <div
                        className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl relative animate-in fade-in zoom-in-95"
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => setShowQrModal(false)}
                            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <h3 className="font-bold text-slate-900 text-lg">Scan QR Code to Pay</h3>
                        {gcashAccountName && <p className="text-xs text-slate-500 mt-0.5">{gcashAccountName}</p>}
                        <div className="my-4 p-3 bg-slate-50 rounded-2xl border border-slate-200 inline-block">
                            <img
                                src={paymentQrCodeUrl}
                                alt="Full QR Code"
                                className="w-64 h-64 object-contain mx-auto"
                            />
                        </div>
                        <p className="text-xs text-slate-600">
                            Scan using GCash, Maya, or any bank app. Amount due: <strong>{formattedAmount}</strong>
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
