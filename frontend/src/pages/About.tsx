import { Link } from 'react-router';
import { ArrowRight, Bell, CalendarDays, CheckCircle, Compass, Globe2, ShieldCheck, Users } from 'lucide-react';

const FEATURES = [
    { icon: Compass, tone: 'bg-teal-50 text-teal-600', title: 'Curated tour packages', desc: 'Explore hand-picked island escapes, city tours, mountain treks, and more from trusted local agencies.' },
    { icon: ShieldCheck, tone: 'bg-amber-50 text-amber-600', title: 'Secure, simple booking', desc: 'Reserve your trip in minutes, submit payment proof, and follow every update in one place.' },
    { icon: Bell, tone: 'bg-sky-50 text-sky-600', title: 'Real-time SMS updates', desc: 'Stay informed with notifications for confirmations, payment status, and trip reminders.' },
    { icon: Globe2, tone: 'bg-violet-50 text-violet-600', title: 'A growing agency network', desc: 'Discover quality travel experiences offered by local operators across the Philippines.' },
];

const STEPS = [
    ['01', 'Browse tours', 'Find a package that matches your destination, style, and budget.'],
    ['02', 'Create an account', 'Sign up free to save bookings and keep your travel details together.'],
    ['03', 'Book & pay', 'Choose a schedule, reserve your slot, and upload payment proof.'],
    ['04', 'Go & enjoy', 'Receive confirmation updates and get ready for your adventure.'],
];

export default function About() {
    return (
        <main className="bg-slate-50 pt-16 overflow-hidden">
            <section className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 text-white py-20 md:py-28">
                <div className="absolute -top-32 -left-24 h-80 w-80 rounded-full bg-teal-400/20 blur-3xl" />
                <div className="absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-sky-400/15 blur-3xl" />
                <div className="relative container mx-auto max-w-5xl px-6 text-center">
                    <span className="inline-flex items-center gap-2 rounded-full border border-teal-300/30 bg-teal-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-teal-200"><Compass className="h-3.5 w-3.5" /> About IslandGo</span>
                    <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold tracking-tight md:text-6xl">Travel better. <span className="text-teal-300">Together.</span></h1>
                    <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">IslandGo connects travelers with trusted local tour agencies, making it easy to discover, book, and manage memorable Philippine adventures.</p>
                    <div className="mt-9 flex justify-center gap-3 text-sm text-slate-300"><span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-teal-300" /> Verified agencies</span><span className="h-5 w-px bg-white/20" /><span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-teal-300" /> SMS notifications</span></div>
                </div>
            </section>

            <section className="container mx-auto max-w-6xl px-6 py-16 md:py-24">
                <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-teal-600">Why IslandGo</p><h2 className="mt-2 text-3xl font-extrabold text-slate-900 md:text-4xl">Everything for a smoother journey</h2></div><p className="max-w-md text-slate-500">A simple platform designed around the needs of travelers and local agencies.</p></div>
                <div className="grid gap-5 md:grid-cols-2">{FEATURES.map(({ icon: Icon, tone, title, desc }) => <article key={title} className="group rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-teal-200 hover:shadow-xl hover:shadow-teal-900/5"><div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${tone} transition-transform group-hover:scale-110`}><Icon className="h-6 w-6" /></div><h3 className="text-lg font-bold text-slate-900">{title}</h3><p className="mt-2 leading-relaxed text-slate-500">{desc}</p></article>)}</div>
            </section>

            <section className="border-y border-slate-200 bg-white py-16 md:py-24"><div className="container mx-auto max-w-6xl px-6"><div className="text-center"><p className="text-sm font-bold uppercase tracking-[0.18em] text-teal-600">How it works</p><h2 className="mt-2 text-3xl font-extrabold text-slate-900 md:text-4xl">Your trip in four easy steps</h2></div><div className="relative mt-12 grid gap-5 md:grid-cols-4">{STEPS.map(([number, title, desc]) => <article key={number} className="relative rounded-2xl border border-slate-200 bg-slate-50 p-6"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-sky-600 text-sm font-extrabold text-white shadow-lg shadow-teal-500/25">{number}</span><h3 className="mt-5 font-bold text-slate-900">{title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-500">{desc}</p></article>)}</div></div></section>

            <section className="container mx-auto max-w-6xl px-6 py-16 md:py-24"><div className="overflow-hidden rounded-[2rem] bg-slate-950 p-8 text-white shadow-2xl md:p-14"><div className="grid items-center gap-10 md:grid-cols-[1.3fr_0.7fr]"><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-teal-300">For tour agencies</p><h2 className="mt-3 text-3xl font-extrabold md:text-4xl">Manage your agency with confidence.</h2><p className="mt-4 max-w-xl leading-relaxed text-slate-300">Publish packages, manage schedules, track bookings, and keep travelers informed from one streamlined dashboard.</p><Link to="/register" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-teal-500 px-5 py-3 font-bold text-white transition hover:bg-teal-400">Register your agency <ArrowRight className="h-4 w-4" /></Link></div><div className="space-y-3">{[[CalendarDays, 'Schedule management'], [Users, 'Customer tracking'], [Bell, 'Automatic SMS alerts']].map(([Icon, label]) => { const FeatureIcon = Icon as typeof Bell; return <div key={label as string} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"><FeatureIcon className="h-5 w-5 text-teal-300" /><span className="font-semibold">{label as string}</span></div>; })}</div></div></div></section>
        </main>
    );
}
