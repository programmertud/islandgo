import { useState, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Loader2, X } from 'lucide-react';

// Fix default marker icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const redIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

export interface LocationPickerValue {
    latitude: number;
    longitude: number;
    destinationName: string;
    destinationAddress: string;
    locationDescription: string;
}

interface LocationPickerProps {
    value: LocationPickerValue;
    onChange: (value: LocationPickerValue) => void;
}

// Moves map center when marker moves
function MapCenterer({ lat, lng }: { lat: number; lng: number }) {
    const map = useMap();
    useEffect(() => {
        map.setView([lat, lng], map.getZoom());
    }, [lat, lng, map]);
    useEffect(() => {
        setTimeout(() => map.invalidateSize(), 100);
    }, [map]);
    return null;
}

// Handles click on the map to place marker
function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            onMapClick(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

export default function LocationPicker({ value, onChange }: LocationPickerProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState('');

    const lat = value.latitude || 12.8797;
    const lng = value.longitude || 121.7740;
    const hasLocation = Boolean(value.latitude && value.longitude);

    // Map click handler with reverse geocoding
    const handleMapClickWithReverseGeocode = useCallback(async (newLat: number, newLng: number) => {
        // First update coordinates
        onChange({ ...value, latitude: newLat, longitude: newLng });
        // Then try to get address
        try {
            const resp = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${newLat}&lon=${newLng}&format=json`,
                { headers: { 'Accept-Language': 'en' } }
            );
            if (resp.ok) {
                const data = await resp.json();
                if (data.display_name) {
                    onChange({
                        ...value,
                        latitude: newLat,
                        longitude: newLng,
                        destinationAddress: data.display_name,
                        destinationName: value.destinationName || (data.name || data.address?.city || data.address?.town || value.destinationName),
                    });
                }
            }
        } catch (_) {
            // silently ignore geocoding failures
        }
    }, [value, onChange]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        setSearchError('');
        try {
            const resp = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`,
                { headers: { 'Accept-Language': 'en' } }
            );
            if (!resp.ok) throw new Error('Search failed');
            const results = await resp.json();
            if (results.length === 0) {
                setSearchError('No location found. Try a different search term.');
                return;
            }
            const result = results[0];
            onChange({
                ...value,
                latitude: parseFloat(result.lat),
                longitude: parseFloat(result.lon),
                destinationAddress: result.display_name,
                destinationName: value.destinationName || result.display_name.split(',')[0],
            });
        } catch (_) {
            setSearchError('Search failed. Check your connection and try again.');
        } finally {
            setIsSearching(false);
        }
    };

    const clearLocation = () => {
        onChange({ ...value, latitude: 0, longitude: 0, destinationAddress: '', destinationName: '' });
    };

    return (
        <div className="space-y-4">
            {/* Search Bar */}
            <div>
                <form onSubmit={handleSearch} className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search for a destination (e.g. El Nido, Palawan)"
                            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isSearching}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-60"
                    >
                        {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        Search
                    </button>
                </form>
                {searchError && (
                    <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                        <X className="w-3 h-3" /> {searchError}
                    </p>
                )}
            </div>

            {/* Interactive Map */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm" style={{ height: '300px' }}>
                <MapContainer
                    center={[lat, lng]}
                    zoom={hasLocation ? 13 : 6}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={true}
                    zoomControl={true}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <ClickHandler onMapClick={handleMapClickWithReverseGeocode} />
                    {hasLocation && (
                        <>
                            <Marker
                                position={[lat, lng]}
                                icon={redIcon}
                                draggable={true}
                                eventHandlers={{
                                    dragend(e) {
                                        const marker = e.target;
                                        const pos = marker.getLatLng();
                                        handleMapClickWithReverseGeocode(pos.lat, pos.lng);
                                    }
                                }}
                            />
                            <MapCenterer lat={lat} lng={lng} />
                        </>
                    )}
                </MapContainer>
                <div className="absolute top-2 left-2 z-[999] bg-white/95 backdrop-blur-sm text-xs text-slate-600 px-3 py-1.5 rounded-lg shadow-sm border border-slate-200 font-medium">
                    {hasLocation ? '📍 Click or drag marker to adjust' : '🖱️ Click on the map to place a pin'}
                </div>
            </div>

            {/* Coordinate Inputs */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Latitude</label>
                    <input
                        type="number"
                        step="0.0000001"
                        value={value.latitude || ''}
                        onChange={e => onChange({ ...value, latitude: parseFloat(e.target.value) || 0 })}
                        placeholder="e.g. 11.2067"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white font-mono"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Longitude</label>
                    <input
                        type="number"
                        step="0.0000001"
                        value={value.longitude || ''}
                        onChange={e => onChange({ ...value, longitude: parseFloat(e.target.value) || 0 })}
                        placeholder="e.g. 119.3936"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white font-mono"
                    />
                </div>
            </div>

            {/* Text Fields */}
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    <MapPin className="w-3 h-3 inline mr-1" />Destination Name
                </label>
                <input
                    type="text"
                    value={value.destinationName}
                    onChange={e => onChange({ ...value, destinationName: e.target.value })}
                    placeholder="e.g. El Nido Beach"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Complete Address</label>
                <input
                    type="text"
                    value={value.destinationAddress}
                    onChange={e => onChange({ ...value, destinationAddress: e.target.value })}
                    placeholder="Full address (auto-filled when you search or click the map)"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Location Description (Optional)</label>
                <textarea
                    rows={2}
                    value={value.locationDescription}
                    onChange={e => onChange({ ...value, locationDescription: e.target.value })}
                    placeholder="Brief description of the location (e.g. A beautiful white sand beach…)"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white resize-none"
                />
            </div>

            {hasLocation && (
                <button
                    type="button"
                    onClick={clearLocation}
                    className="text-xs text-red-500 hover:text-red-700 transition-colors font-medium"
                >
                    × Clear location
                </button>
            )}
        </div>
    );
}
