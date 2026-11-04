import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation } from 'lucide-react';

// Fix default marker icon paths broken by Vite/webpack bundling
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom emerald marker icon
const emeraldIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

interface DestinationMapProps {
    latitude: number;
    longitude: number;
    destinationName?: string | null;
    destinationAddress?: string | null;
    locationDescription?: string | null;
    height?: string;
    showDirectionsButton?: boolean;
    className?: string;
}

// Inner component to handle map refresh (needed when inside modals/tabs)
function MapRefresher() {
    const map = useMap();
    useEffect(() => {
        setTimeout(() => map.invalidateSize(), 100);
    }, [map]);
    return null;
}

export default function DestinationMap({
    latitude,
    longitude,
    destinationName,
    destinationAddress,
    locationDescription,
    height = '320px',
    showDirectionsButton = true,
    className = '',
}: DestinationMapProps) {
    const position: [number, number] = [latitude, longitude];

    const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

    return (
        <div className={`relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm ${className}`} style={{ height }}>
            <MapContainer
                center={position}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
                zoomControl={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={position} icon={emeraldIcon}>
                    <Popup maxWidth={280}>
                        <div className="py-1">
                            {destinationName && (
                                <p className="font-bold text-slate-800 text-sm mb-1">{destinationName}</p>
                            )}
                            {destinationAddress && (
                                <p className="text-xs text-slate-500 mb-2">{destinationAddress}</p>
                            )}
                            {locationDescription && (
                                <p className="text-xs text-slate-600 mb-2">{locationDescription}</p>
                            )}
                            <p className="text-[10px] text-slate-400 font-mono">
                                {latitude.toFixed(6)}, {longitude.toFixed(6)}
                            </p>
                        </div>
                    </Popup>
                </Marker>
                <MapRefresher />
            </MapContainer>

            {/* Get Directions Overlay Button */}
            {showDirectionsButton && (
                <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-3 right-3 z-[999] flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl shadow-lg hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all"
                    onClick={e => e.stopPropagation()}
                >
                    <Navigation className="w-3.5 h-3.5" />
                    Get Directions
                </a>
            )}
        </div>
    );
}

// ── No location placeholder ────────────────────────────────────────────────────

export function NoLocationPlaceholder({ height = '200px', message = 'No location set for this destination.' }: { height?: string; message?: string }) {
    return (
        <div
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-slate-400"
            style={{ height }}
        >
            <MapPin className="w-10 h-10 mb-3 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">{message}</p>
            <p className="text-xs text-slate-400 mt-1">Admin hasn't set coordinates yet.</p>
        </div>
    );
}
