import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toursApi } from '../lib/api';
import type { TourSchedule } from '../types';

interface AvailabilityResponse {
    package_id?: number;
    month?: string;
    default_capacity?: number;
    schedules: Array<{ id: number; date: string; available_slots: number; status: string }>;
    blocked_ranges: Array<{ id: number; start_date: string; end_date: string; reason: string }>;
}

export default function BookingCalendar({ packageId, schedules, selectedId, selectedDate, onSelect }: {
    packageId: number;
    schedules: TourSchedule[];
    selectedId?: number;
    selectedDate?: string;
    onSelect: (schedule: TourSchedule) => void;
}) {
    const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
    const { data, isLoading, isError } = useQuery({
        queryKey: ['tour-availability', packageId, monthKey],
        queryFn: () => toursApi.availability(packageId, monthKey).then(r => r.data as AvailabilityResponse),
        staleTime: 30_000,
    });
    const days = useMemo(() => {
        const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
        const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
        return [...Array(firstDay).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
    }, [month]);
    const scheduleByDate = new Map((data?.schedules ?? []).map(item => [item.date, item]));
    const scheduleById = new Map(schedules.map(item => [item.id, item]));
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dateString = (day: number) => `${monthKey}-${String(day).padStart(2, '0')}`;

    return <section className="rounded-2xl border border-slate-200 bg-white p-4" aria-label="Select travel date">
        <div className="mb-3 flex items-center justify-between">
            <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Previous month"><ChevronLeft size={18} /></button>
            <h3 className="font-bold text-slate-900">{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
            <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Next month"><ChevronRight size={18} /></button>
        </div>
        {isLoading ? <p className="py-5 text-center text-sm text-slate-500" role="status">Loading availability…</p> : isError ? <p className="py-5 text-center text-sm text-red-700" role="alert">Availability could not be loaded. Please try again.</p> : <>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <span key={day} className="py-2">{day}</span>)}
                {days.map((day, index) => {
                    if (!day) return <span key={`blank-${index}`} />;
                    const value = dateString(day);
                    const date = new Date(`${value}T00:00:00`);
                    const info = scheduleByDate.get(value);
                    const schedule = info ? scheduleById.get(info.id) : undefined;
                    const closure = data?.blocked_ranges.find(range => range.start_date <= value && range.end_date >= value);
                    const isPast = date < today;
                    const isClosed = Boolean(closure);
                    const isFullyBooked = !isClosed && !isPast && Boolean(info) && info?.available_slots === 0;
                    
                    // All dates are available by default unless in the past, closed by admin, or fully booked!
                    const blocked = isClosed || isPast || isFullyBooked;
                    const isSelected = selectedDate === value || (Boolean(selectedId) && schedule?.id === selectedId);
                    const availableCount = info ? info.available_slots : (data?.default_capacity ?? 20);

                    const label = isClosed
                        ? `${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}, blocked: ${closure?.reason}`
                        : isPast
                        ? `${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}, past date`
                        : isFullyBooked
                        ? `${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}, fully booked`
                        : `${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}, ${availableCount} seats available`;
                    
                    const cellStyle = isSelected
                        ? 'bg-sky-600 text-white shadow-sm ring-2 ring-sky-500 ring-offset-1 font-bold'
                        : isClosed
                        ? 'cursor-not-allowed bg-rose-50 text-rose-300 line-through'
                        : isPast
                        ? 'cursor-not-allowed bg-slate-50 text-slate-300'
                        : isFullyBooked
                        ? 'cursor-not-allowed bg-amber-50 text-amber-300 line-through'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-semibold cursor-pointer';

                    return (
                        <button
                            key={value}
                            type="button"
                            disabled={blocked}
                            title={closure ? `Unavailable: ${closure.reason}` : isFullyBooked ? 'Fully booked' : isPast ? 'Past date' : 'Available for booking'}
                            aria-label={label}
                            aria-pressed={isSelected}
                            onClick={() => {
                                const targetSchedule: TourSchedule = schedule || {
                                    id: 0,
                                    tour_package_id: packageId,
                                    departure_date: value,
                                    capacity: data?.default_capacity || 20,
                                    reserved_slots: 0,
                                    status: 'open',
                                };
                                onSelect(targetSchedule);
                            }}
                            className={`aspect-square rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors ${cellStyle}`}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300 inline-block" /> Available (Select any date)
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-sky-600 inline-block" /> Selected
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-rose-100 border border-rose-300 inline-block" /> Blocked / Closure
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-slate-100 inline-block" /> Past Date
                </span>
            </div>
        </>}
    </section>;
}
