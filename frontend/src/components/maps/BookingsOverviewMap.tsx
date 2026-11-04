import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Eye, Navigation } from 'lucide-react';
import type { Booking } from '../../types';

// Fix default Leaflet icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function createCustomPin(color: string, label?: string) {
    return L.divIcon({
        className: 'custom-status-marker',
        html: `
            <div style="position: relative; display: flex; align-items: center; justify-content: center;">
                <div style="width: 32px; height: 32px; border-radius: 50%; background: ${color}; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2.5px solid white;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                        <circle cx="12" cy="10" r="3"/>
                    </svg>
                </div>
                ${label ? `<span style="position: absolute; top: -6px; right: -6px; background: white; color: #1e293b; font-weight: 800; font-size: 10px; border-radius: 9999px; padding: 1px 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.2); border: 1px solid #e2e8f0;">${label}</span>` : ''}
            </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -30],
    });
}

const statusColors: Record<string, string> = {
    confirmed: '#059669', // emerald-600
    pending: '#d97706',   // amber-600
    completed: '#2563eb', // blue-600
    rejected: '#dc2626',  // red-600
    cancelled: '#64748b', // slate-500
    expired: '#94a3b8',   // slate-400
};

// Component to adjust bounds when pins change
function MapAutoFitter({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
    const map = useMap();
    useEffect(() => {
        if (!bounds) return;
        try {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        } catch {
            // Ignore if invalid bounds
        }
    }, [map, bounds]);
    return null;
}

interface BookingsOverviewMapProps {
    bookings: Booking[];
    onSelectBooking?: (booking: Booking) => void;
    height?: string;
    className?: string;
}

export default function BookingsOverviewMap({
    bookings,
    onSelectBooking,
    height = '560px',
    className = '',
}: BookingsOverviewMapProps) {
    const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

    // Filter bookings that have valid coordinates
    const mappedItems = useMemo(() => {
        return bookings.filter(b => {
            const pkg = b.schedule?.package;
            const hasCoords = typeof pkg?.latitude === 'number' && typeof pkg?.longitude === 'number' && (pkg.latitude !== 0 || pkg.longitude !== 0);
            if (!hasCoords) return false;
            if (selectedStatusFilter !== 'all' && b.booking_status !== selectedStatusFilter) return false;
            return true;
        });
    }, [bookings, selectedStatusFilter]);

    // Group bookings by exact coordinates to avoid overlapping markers
    const groupedPins = useMemo(() => {
        const groups: Record<string, { lat: number; lng: number; bookings: Booking[] }> = {};
        mappedItems.forEach(b => {
            const pkg = b.schedule!.package!;
            const key = `${pkg.latitude!.toFixed(5)},${pkg.longitude!.toFixed(5)}`;
            if (!groups[key]) {
                groups[key] = {
                    lat: pkg.latitude!,
                    lng: pkg.longitude!,
                    bookings: [],
                };
            }
            groups[key].bookings.push(b);
        });
        return Object.values(groups);
    }, [mappedItems]);

    // Calculate map bounds
    const bounds = useMemo(() => {
        if (groupedPins.length === 0) return null;
        const latLngs = groupedPins.map(g => [g.lat, g.lng] as [number, number]);
        return L.latLngBounds(latLngs);
    }, [groupedPins]);

    // Default center: first pin or center of Philippines
    const defaultCenter: [number, number] = groupedPins.length > 0
        ? [groupedPins[0].lat, groupedPins[0].lng]
        : [12.8797, 121.7740];

    return (
        <div className={`relative rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-sm flex flex-col ${className}`}>
            {/* Header Toolbar */}
            <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 text-sm">Interactive Bookings Map</h3>
                        <p className="text-xs text-slate-500">
                            Showing {mappedItems.length} booking{mappedItems.length === 1 ? '' : 's'} across {groupedPins.length} location{groupedPins.length === 1 ? '' : 's'}
                        </p>
                    </div>
                </div>

                {/* Status Filter Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    {['all', 'confirmed', 'pending', 'completed'].map(status => {
                        const count = status === 'all'
                            ? bookings.filter(b => b.schedule?.package?.latitude && b.schedule?.package?.longitude).length
                            : bookings.filter(b => b.booking_status === status && b.schedule?.package?.latitude && b.schedule?.package?.longitude).length;
                        const isSelected = selectedStatusFilter === status;
                        return (
                            <button
                                key={status}
                                type="button"
                                onClick={() => setSelectedStatusFilter(status)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all capitalize flex items-center gap-1.5 ${
                                    isSelected
                                        ? 'bg-slate-900 text-white shadow-sm'
                                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: status === 'all' ? '#10b981' : (statusColors[status] || '#94a3b8') }} />
                                {status}
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Map Area */}
            <div className="relative flex-1 w-full" style={{ minHeight: height }}>
                {groupedPins.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 p-6 text-center z-10">
                        <MapPin className="w-12 h-12 text-slate-300 mb-3" />
                        <h4 className="font-bold text-slate-700">No Location Coordinates Available</h4>
                        <p className="text-xs text-slate-500 max-w-md mt-1 mb-4">
                            None of the currently filtered bookings have package coordinates configured. You can set destination coordinates in Package Management.
                        </p>
                    </div>
                ) : null}

                <MapContainer
                    center={defaultCenter}
                    zoom={9}
                    style={{ height: '100%', width: '100%', minHeight: height }}
                    scrollWheelZoom={false}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {groupedPins.map(group => {
                        const firstBooking = group.bookings[0];
                        const pkg = firstBooking.schedule?.package;
                        const primaryStatus = group.bookings.some(b => b.booking_status === 'confirmed')
                            ? 'confirmed'
                            : group.bookings[0].booking_status;
                        const pinColor = statusColors[primaryStatus] || '#059669';
                        const pinIcon = createCustomPin(pinColor, group.bookings.length > 1 ? String(group.bookings.length) : undefined);

                        return (
                            <Marker
                                key={`${group.lat}-${group.lng}`}
                                position={[group.lat, group.lng]}
                                icon={pinIcon}
                            >
                                <Popup maxWidth={340} className="custom-leaflet-popup">
                                    <div className="p-2 space-y-3 font-sans">
                                        {/* Package Header */}
                                        <div className="border-b border-slate-100 pb-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                                    {pkg?.category || 'Tour Package'}
                                                </span>
                                                {group.bookings.length > 1 && (
                                                    <span className="text-[10px] font-extrabold bg-slate-900 text-white px-2 py-0.5 rounded-full">
                                                        {group.bookings.length} Bookings Here
                                                    </span>
                                                )}
                                            </div>
                                            <h4 className="font-bold text-slate-800 text-sm mt-1 leading-snug">
                                                {pkg?.title}
                                            </h4>
                                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                <span>{pkg?.destination_name || pkg?.destination}</span>
                                            </p>
                                            {pkg?.meeting_point && (
                                                <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-2 py-1 mt-1.5 font-medium">
                                                    📍 Meeting: {pkg.meeting_point}
                                                </p>
                                            )}
                                        </div>

                                        {/* Bookings List */}
                                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                            {group.bookings.map(b => (
                                                <div
                                                    key={b.id}
                                                    className="p-2 rounded-xl bg-slate-50 border border-slate-100 hover:border-emerald-200 transition-colors flex items-center justify-between gap-2"
                                                >
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-mono text-[10px] font-bold text-slate-700">
                                                                {b.booking_reference}
                                                            </span>
                                                            <span
                                                                className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full text-white"
                                                                style={{ backgroundColor: statusColors[b.booking_status] || '#94a3b8' }}
                                                            >
                                                                {b.booking_status}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs font-semibold text-slate-800 truncate mt-0.5">
                                                            {b.customer?.name || b.guest_name || 'Guest'}
                                                        </p>
                                                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                                            <span>{b.schedule?.departure_date ? new Date(b.schedule.departure_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date'}</span>
                                                            <span>•</span>
                                                            <span>{b.participants_count} pax</span>
                                                            <span>•</span>
                                                            <span className="font-bold text-slate-700">₱{Number(b.total_amount).toLocaleString()}</span>
                                                        </div>
                                                    </div>

                                                    {onSelectBooking && (
                                                        <button
                                                            type="button"
                                                            onClick={() => onSelectBooking(b)}
                                                            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-colors shadow-sm shrink-0"
                                                            title="View Booking Details"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {/* External Navigation Link */}
                                        <div className="pt-1 flex items-center justify-between border-t border-slate-100">
                                            <a
                                                href={`https://www.google.com/maps/search/?api=1&query=${group.lat},${group.lng}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700"
                                            >
                                                <Navigation className="w-3 h-3" />
                                                Open in Google Maps
                                            </a>
                                            <span className="text-[10px] text-slate-400 font-mono">
                                                {group.lat.toFixed(4)}, {group.lng.toFixed(4)}
                                            </span>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}

                    <MapAutoFitter bounds={bounds} />
                </MapContainer>

                {/* Map Floating Legend */}
                <div className="absolute bottom-4 left-4 z-[999] bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl px-3.5 py-2.5 shadow-lg flex items-center gap-3 text-xs font-semibold text-slate-700">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Legend:</span>
                    <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Confirmed
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Pending
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Completed
                    </span>
                </div>
            </div>
        </div>
    );
}
