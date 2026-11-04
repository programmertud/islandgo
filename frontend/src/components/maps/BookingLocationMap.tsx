import { MapPin, Navigation, Map, Calendar, Users, Compass } from 'lucide-react';
import DestinationMap, { NoLocationPlaceholder } from './DestinationMap';
import type { TourPackage, Booking } from '../../types';

interface BookingLocationMapProps {
    tourPackage?: TourPackage | null;
    booking?: Booking | null;
    compact?: boolean;
}

export default function BookingLocationMap({ tourPackage, booking, compact = false }: BookingLocationMapProps) {
    const pkg = tourPackage || booking?.schedule?.package;
    if (!pkg) return null;

    const hasLocation = Boolean(pkg.latitude && pkg.longitude);
    const lat = pkg.latitude!;
    const lng = pkg.longitude!;

    const googleMapsUrl = hasLocation
        ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
        : null;

    const departureDate = booking?.schedule?.departure_date
        ? new Date(booking.schedule.departure_date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
          })
        : null;

    return (
        <div className={`rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm ${compact ? '' : 'mt-4'}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 text-sm">Tour Location & Destination</h4>
                        {booking && (
                            <p className="text-[11px] text-slate-400 font-mono">Ref: {booking.booking_reference}</p>
                        )}
                    </div>
                </div>
                {hasLocation && googleMapsUrl && (
                    <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition-colors shadow-xs"
                    >
                        <Navigation className="w-3.5 h-3.5" />
                        Directions
                    </a>
                )}
            </div>

            {/* Booking & Schedule Context Banner if available */}
            {booking && (
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                    {departureDate && (
                        <span className="flex items-center gap-1.5 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                            {departureDate}
                            {booking.schedule?.start_time && ` at ${booking.schedule.start_time.substring(0, 5)}`}
                        </span>
                    )}
                    <span className="flex items-center gap-1.5 font-medium">
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                        {booking.participants_count} traveler{booking.participants_count === 1 ? '' : 's'}
                    </span>
                    <span className="flex items-center gap-1.5 font-bold text-slate-700">
                        Total: ₱{Number(booking.total_amount).toLocaleString()}
                    </span>
                </div>
            )}

            {/* Destination & Meeting Point details */}
            <div className="px-5 py-3.5 bg-white border-b border-slate-100 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div>
                        <p className="font-bold text-slate-900 text-sm">
                            {pkg.destination_name || pkg.destination}
                        </p>
                        {pkg.destination_address && (
                            <p className="text-xs text-slate-500 mt-0.5">{pkg.destination_address}</p>
                        )}
                    </div>
                    {pkg.category && (
                        <span className="self-start text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            {pkg.category}
                        </span>
                    )}
                </div>

                {pkg.meeting_point && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200/60 text-xs text-amber-900">
                        <Compass className="w-4 h-4 text-amber-600 shrink-0" />
                        <div>
                            <span className="font-bold">Meeting Point: </span>
                            <span>{pkg.meeting_point}</span>
                        </div>
                    </div>
                )}

                {pkg.location_description && (
                    <p className="text-xs text-slate-600 pt-1 leading-relaxed">{pkg.location_description}</p>
                )}
            </div>

            {/* Interactive Map */}
            {hasLocation ? (
                <DestinationMap
                    latitude={lat}
                    longitude={lng}
                    destinationName={pkg.destination_name || pkg.destination}
                    destinationAddress={pkg.destination_address}
                    locationDescription={pkg.location_description}
                    height={compact ? '220px' : '300px'}
                    showDirectionsButton={false}
                    className="rounded-none border-0 shadow-none"
                />
            ) : (
                <div className="p-4 bg-slate-50">
                    <NoLocationPlaceholder
                        height="160px"
                        message={`No map location coordinates set for ${pkg.destination}`}
                    />
                </div>
            )}
        </div>
    );
}

// ── Compact "View on Map" card button ────────────────────────────────────────

interface ViewOnMapButtonProps {
    tourPackage?: TourPackage | null;
    booking?: Booking | null;
    onOpen: () => void;
    label?: string;
    className?: string;
}

export function ViewOnMapButton({ tourPackage, booking, onOpen, label = 'View Map', className = '' }: ViewOnMapButtonProps) {
    const pkg = tourPackage || booking?.schedule?.package;
    const hasLocation = Boolean(pkg?.latitude && pkg?.longitude);
    if (!hasLocation) return null;

    return (
        <button
            type="button"
            onClick={onOpen}
            className={`inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors ${className}`}
        >
            <Map className="w-3.5 h-3.5" />
            {label}
        </button>
    );
}

// ── Map modal for quick view from cards or tables ──────────────────────────────

interface MapModalProps {
    tourPackage?: TourPackage | null;
    booking?: Booking | null;
    onClose: () => void;
}

export function MapModal({ tourPackage, booking, onClose }: MapModalProps) {
    const pkg = tourPackage || booking?.schedule?.package;
    if (!pkg) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900 text-base">{pkg.title}</h3>
                            {booking && (
                                <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
                                    {booking.booking_reference}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                            {pkg.destination_name || pkg.destination}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                        aria-label="Close map"
                    >
                        ✕
                    </button>
                </div>
                <div className="p-4 sm:p-6 bg-slate-50/50">
                    <BookingLocationMap tourPackage={pkg} booking={booking} />
                </div>
            </div>
        </div>
    );
}
