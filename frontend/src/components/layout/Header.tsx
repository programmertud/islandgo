import { useEffect, useState } from 'react';
import { Menu, Bell, Search, Calendar } from 'lucide-react';
import { Link } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { avatarUrl as getAvatarUrl } from '../../lib/api';

interface HeaderProps { onMenuToggle: () => void; unreadCount: number; }

export function Header({ onMenuToggle, unreadCount }: HeaderProps) {
    const { user } = useAuth();
    const [now, setNow] = useState(() => new Date());
    useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 60_000); return () => window.clearInterval(timer); }, []);
    const updatedLabel = `Updated ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    const avatarUrl = getAvatarUrl(user?.avatar);

    return <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-4 md:px-8 shrink-0">
        <div className="flex items-center gap-4 flex-1"><button onClick={onMenuToggle} className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors shrink-0"><Menu className="w-5 h-5" /></button><div className="hidden md:flex items-center relative w-full max-w-md"><Search className="w-4 h-4 text-slate-400 absolute left-4" /><input type="text" placeholder="Search bookings, customers, packages..." className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all" /></div></div>
        <div className="flex items-center gap-4 md:gap-6"><div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-full shadow-sm"><Calendar className="w-4 h-4 text-emerald-500" /><span className="text-sm font-medium text-slate-700">{updatedLabel}</span></div><div className="w-px h-6 bg-slate-200 hidden md:block" /><Link to="/notifications" className="relative p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-emerald-600 transition-colors"><Bell className="w-5 h-5" />{unreadCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />}</Link><Link to="/settings" className="flex items-center gap-3 hover:opacity-80 transition-opacity"><div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shrink-0">{avatarUrl ? <img src={avatarUrl} alt={user?.name ?? 'Profile'} className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-white">{user?.name?.charAt(0).toUpperCase()}</span>}</div><div className="hidden md:flex flex-col items-start justify-center"><p className="text-sm font-bold text-slate-800 leading-tight">{user?.name}</p><p className="text-xs text-slate-500 font-medium capitalize">{user?.role?.replace('_', ' ')}</p></div></Link></div>
    </header>;
}
