import { CheckCircle2, XCircle } from 'lucide-react';
import { createPortal } from 'react-dom';

interface StatusModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error';
    onClose: () => void;
}

export default function StatusModal({ isOpen, title, message, type = 'success', onClose }: StatusModalProps) {
    if (!isOpen) return null;
    const success = type === 'success';
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="status-modal-title">
            <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-950/30">
                <div className={`h-1.5 ${success ? 'bg-gradient-to-r from-teal-500 to-sky-500' : 'bg-gradient-to-r from-red-500 to-orange-500'}`} />
                <div className="p-7 text-center">
                    <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${success ? 'bg-teal-50 text-teal-600' : 'bg-red-50 text-red-600'}`}>
                        {success ? <CheckCircle2 className="h-9 w-9" /> : <XCircle className="h-9 w-9" />}
                    </div>
                    <h2 id="status-modal-title" className="mt-5 text-2xl font-extrabold text-slate-950">{title}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">{message}</p>
                    <button onClick={onClose} className={`mt-6 w-full rounded-xl px-5 py-3 font-bold transition ${success ? 'bg-sky-600 text-white hover:bg-sky-700' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>Continue</button>
                </div>
            </div>
        </div>, document.body);
}
