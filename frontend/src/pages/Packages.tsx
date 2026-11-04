import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Plus, Edit2, Trash2, Search, Image as ImageIcon,
    MapPin, Users, CalendarDays, X, Loader2, Package, Map as MapIcon,
    Camera, UploadCloud, ChevronLeft, ChevronRight, Ban, Calendar, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { apiClient } from '../lib/axios';
import { storageUrl, availabilityApi } from '../lib/api';
import type { TourPackage, PaginatedResponse } from '../types';
import { useForm } from 'react-hook-form';
import ConfirmModal from '../components/ConfirmModal';
import { MapModal } from '../components/maps/BookingLocationMap';
import type { LocationPickerValue } from '../components/maps/LocationPicker';

const STATUS_STYLES: Record<string, string> = {
    published: 'bg-emerald-500 text-white',
    draft:     'bg-slate-200 text-slate-700',
    archived:  'bg-amber-100 text-amber-700',
};

const INPUT = 'w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white';
const LABEL = 'block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5';

export default function Packages() {
    const queryClient = useQueryClient();
    const [page] = useState(1);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPackage, setEditingPackage] = useState<TourPackage | null>(null);
    const [managingSchedulesFor, setManagingSchedulesFor] = useState<TourPackage | null>(null);

    // Confirmation Modal State
    const [confirmAction, setConfirmAction] = useState<{ isOpen: boolean; title: string; message: string; isDanger: boolean; onConfirm: () => void } | null>(null);
    const closeConfirm = () => setConfirmAction(null);

    const { data, isLoading } = useQuery<PaginatedResponse<TourPackage>>({
        queryKey: ['packages', page, search],
        queryFn: async () => {
            const params = new URLSearchParams({ page: page.toString() });
            if (search) params.append('search', search);
            const res = await apiClient.get(`/agency/packages?${params.toString()}`);
            return res.data;
        }
    });

    const [viewMapPackage, setViewMapPackage] = useState<TourPackage | null>(null);

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => { await apiClient.delete(`/agency/packages/${id}`); },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['packages'] });
            queryClient.invalidateQueries({ queryKey: ['destinations'] });
            queryClient.invalidateQueries({ queryKey: ['tours'] });
        },
        onError: (err: any) => alert(err.response?.data?.message || 'Failed to delete package.')
    });

    const handleDelete = (pkg: TourPackage) => {
        setConfirmAction({
            isOpen: true,
            title: 'Delete Package',
            message: `Are you sure you want to delete "${pkg.title}"? This action cannot be undone.`,
            isDanger: true,
            onConfirm: () => {
                deleteMutation.mutate(pkg.id);
                closeConfirm();
            }
        });
    };

    return (
        <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <p className="text-slate-500 text-sm font-medium mb-1">Agency</p>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Tour Packages</h1>
                    <p className="text-slate-500 mt-1">Manage your agency's tour offerings and itineraries.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search packages..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 w-60 shadow-sm"
                        />
                    </div>
                    <button
                        onClick={() => { setEditingPackage(null); setIsModalOpen(true); }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> Create Package
                    </button>
                </div>
            </div>

            {/* Summary */}
            {data && (
                <p className="text-sm text-slate-500">
                    Showing <strong className="text-slate-700">{data.data.length}</strong> of <strong className="text-slate-700">{data.total}</strong> packages
                </p>
            )}

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {isLoading ? (
                    [...Array(6)].map((_, i) => (
                        <div key={i} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm animate-pulse">
                            <div className="h-48 bg-slate-100" />
                            <div className="p-5 space-y-3">
                                <div className="h-5 bg-slate-100 rounded w-3/4" />
                                <div className="h-4 bg-slate-100 rounded w-1/2" />
                                <div className="h-4 bg-slate-100 rounded w-2/3" />
                            </div>
                        </div>
                    ))
                ) : data?.data.length === 0 ? (
                    <div className="col-span-full bg-white border border-dashed border-slate-200 rounded-2xl p-16 text-center">
                        <Package className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                        <p className="font-bold text-slate-500 text-lg">No tour packages yet</p>
                        <p className="text-sm text-slate-400 mt-2 mb-6">Create your first tour package to get started.</p>
                        <button
                            onClick={() => { setEditingPackage(null); setIsModalOpen(true); }}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors"
                        >
                            <Plus className="w-4 h-4" /> Create Package
                        </button>
                    </div>
                ) : (
                    data?.data.map(pkg => (
                        <div key={pkg.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                            {/* Image */}
                            <div className="h-48 bg-slate-100 relative flex-shrink-0 overflow-hidden">
                                {pkg.cover_image ? (
                                    <img
                                        src={storageUrl(pkg.cover_image)}
                                        alt={pkg.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 bg-gradient-to-br from-slate-50 to-slate-100">
                                        <ImageIcon className="w-10 h-10 mb-2" />
                                        <span className="text-sm font-medium">No Image</span>
                                    </div>
                                )}
                                {/* Overlays */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                                <span className={`absolute top-3 left-3 px-2.5 py-1 text-xs font-bold rounded-full capitalize shadow-sm ${STATUS_STYLES[pkg.status] ?? 'bg-white text-slate-600'}`}>
                                    {pkg.status}
                                </span>
                                <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white/95 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                                    <Camera className="w-3.5 h-3.5 text-sky-300" />
                                    <span>{(pkg.cover_image ? 1 : 0) + (pkg.images?.length || 0)} Photos</span>
                                </div>
                                <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-lg font-bold text-sm shadow-sm">
                                    ₱{Number(pkg.price_per_person).toLocaleString()}
                                    <span className="text-xs font-normal text-white/70 ml-1">/ pax</span>
                                </div>
                                {/* Action Buttons - show on hover */}
                                <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => setManagingSchedulesFor(pkg)}
                                        className="p-2 bg-white/90 backdrop-blur-sm text-slate-700 rounded-lg hover:bg-white hover:text-blue-600 transition-colors shadow-sm"
                                        title="Manage Schedules"
                                    >
                                        <CalendarDays className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => { setEditingPackage(pkg); setIsModalOpen(true); }}
                                        className="p-2 bg-white/90 backdrop-blur-sm text-slate-700 rounded-lg hover:bg-white hover:text-emerald-600 transition-colors shadow-sm"
                                        title="Edit Package"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(pkg)}
                                        className="p-2 bg-white/90 backdrop-blur-sm text-slate-700 rounded-lg hover:bg-white hover:text-red-600 transition-colors shadow-sm"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-5 flex-1 flex flex-col">
                                <h3 className="font-bold text-lg text-slate-800 line-clamp-1 mb-3">{pkg.title}</h3>
                                <div className="space-y-1.5 flex-1">
                                    <p className="text-sm text-slate-500 flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                                        <span className="truncate">{pkg.destination}</span>
                                    </p>
                                    <p className="text-sm text-slate-500 flex items-center gap-2">
                                        <Users className="w-4 h-4 text-slate-400 shrink-0" />
                                        {pkg.min_participants}–{pkg.max_participants} participants
                                    </p>
                                </div>
                                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{pkg.category}</span>
                                    <div className="flex items-center gap-3">
                                        {pkg.latitude && pkg.longitude && (
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setViewMapPackage(pkg); }}
                                                className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                                            >
                                                <MapIcon className="w-3.5 h-3.5" /> View Location
                                            </button>
                                        )}
                                        <button
                                            onClick={() => { setEditingPackage(pkg); setIsModalOpen(true); }}
                                            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                                        >
                                            Edit Package →
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modals */}
            {isModalOpen && (
                <PackageModal
                    onClose={() => setIsModalOpen(false)}
                    pkg={editingPackage}
                />
            )}
            
            {managingSchedulesFor && (
                <ScheduleModal
                    onClose={() => setManagingSchedulesFor(null)}
                    pkg={managingSchedulesFor}
                />
            )}
            
            {/* Custom Confirm Modal */}
            {confirmAction && (
                <ConfirmModal 
                    isOpen={confirmAction.isOpen}
                    title={confirmAction.title}
                    message={confirmAction.message}
                    isDanger={confirmAction.isDanger}
                    onConfirm={confirmAction.onConfirm}
                    onCancel={closeConfirm}
                />
            )}

            {/* Map Quick View Modal */}
            <MapModal
                tourPackage={viewMapPackage}
                onClose={() => setViewMapPackage(null)}
            />
        </div>
    );
}

// ─── Package Form Modal ────────────────────────────────────────────────────────

const LocationPickerLazy = React.lazy(() => import('../components/maps/LocationPicker'));

function PackageModal({ onClose, pkg }: { onClose: () => void; pkg: TourPackage | null }) {
    const queryClient = useQueryClient();
    const isEdit = !!pkg;

    const { register, handleSubmit, formState: { isSubmitting } } = useForm({
        defaultValues: isEdit ? {
            ...pkg,
            inclusions: pkg.inclusions?.join('\n') || '',
            exclusions: pkg.exclusions?.join('\n') || '',
        } : {
            title: '', destination: '', category: 'Island Hopping',
            price_per_person: 0, duration_days: 1, min_participants: 1, max_participants: 10,
            status: 'draft', meeting_point: '', description: '', itinerary: '',
            inclusions: '', exclusions: ''
        }
    });

    // Photos & Gallery State
    const [existingImages, setExistingImages] = React.useState<Array<{ id: number; image_path: string; alt_text?: string | null }>>(
        pkg?.images ? [...pkg.images] : []
    );
    const [deletedImageIds, setDeletedImageIds] = React.useState<number[]>([]);
    const [newGalleryFiles, setNewGalleryFiles] = React.useState<File[]>([]);
    const [coverFile, setCoverFile] = React.useState<File | null>(null);
    const [coverPreview, setCoverPreview] = React.useState<string | null>(
        pkg?.cover_image ? storageUrl(pkg.cover_image) : null
    );

    // Location state (controlled outside react-hook-form since LocationPicker is custom)
    const [locationData, setLocationData] = React.useState<LocationPickerValue>({
        latitude: pkg?.latitude ?? 0,
        longitude: pkg?.longitude ?? 0,
        destinationName: pkg?.destination_name ?? '',
        destinationAddress: pkg?.destination_address ?? '',
        locationDescription: pkg?.location_description ?? '',
    });

    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setCoverFile(file);
            setCoverPreview(URL.createObjectURL(file));
        }
    };

    const handleGalleryFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const filesArray = Array.from(e.target.files);
        setNewGalleryFiles(prev => [...prev, ...filesArray]);
        e.target.value = '';
    };

    const removeNewGalleryFile = (index: number) => {
        setNewGalleryFiles(prev => prev.filter((_, idx) => idx !== index));
    };

    const removeExistingImage = (imageId: number) => {
        setExistingImages(prev => prev.filter(img => img.id !== imageId));
        setDeletedImageIds(prev => [...prev, imageId]);
    };

    const totalPhotos = (coverPreview ? 1 : 0) + existingImages.length + newGalleryFiles.length;

    const mutation = useMutation({
        mutationFn: async (formData: FormData) => {
            if (isEdit) {
                formData.append('_method', 'PUT');
                await apiClient.post(`/agency/packages/${pkg.id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await apiClient.post('/agency/packages', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['packages'] });
            queryClient.invalidateQueries({ queryKey: ['destinations'] });
            queryClient.invalidateQueries({ queryKey: ['tours'] });
            onClose();
        },
        onError: (err: any) => {
            const msg = err.response?.data?.errors
                ? Object.values(err.response.data.errors).flat().join('\n')
                : (err.response?.data?.message || 'Error saving package');
            alert(msg);
        }
    });

    const onSubmit = (data: any) => {
        const formData = new FormData();
        ['title', 'destination', 'category', 'price_per_person', 'duration_days',
            'min_participants', 'max_participants', 'status', 'meeting_point', 'description', 'itinerary']
            .forEach(key => { if (data[key] != null) formData.append(key, data[key]); });

        // Location fields
        if (locationData.latitude) formData.append('latitude', String(locationData.latitude));
        if (locationData.longitude) formData.append('longitude', String(locationData.longitude));
        if (locationData.destinationName) formData.append('destination_name', locationData.destinationName);
        if (locationData.destinationAddress) formData.append('destination_address', locationData.destinationAddress);
        if (locationData.locationDescription) formData.append('location_description', locationData.locationDescription);

        data.inclusions.split('\n').map((s: string) => s.trim()).filter(Boolean)
            .forEach((v: string, i: number) => formData.append(`inclusions[${i}]`, v));
        data.exclusions.split('\n').map((s: string) => s.trim()).filter(Boolean)
            .forEach((v: string, i: number) => formData.append(`exclusions[${i}]`, v));

        if (coverFile) {
            formData.append('cover_image', coverFile);
        }

        newGalleryFiles.forEach((file) => {
            formData.append('gallery_images[]', file);
        });

        deletedImageIds.forEach((id) => {
            formData.append('deleted_image_ids[]', String(id));
        });

        mutation.mutate(formData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="px-7 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">{isEdit ? 'Edit Package' : 'Create New Package'}</h2>
                        <p className="text-sm text-slate-500 mt-0.5">{isEdit ? `Editing: ${pkg?.title}` : 'Fill in the details for your new tour package.'}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Body */}
                <div className="flex-1 overflow-y-auto p-7">
                    <form id="packageForm" onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                        {/* Section 1: Basic + Logistics */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-5">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pb-2 border-b border-slate-100">Basic Information</h3>
                                <div>
                                    <label className={LABEL}>Title</label>
                                    <input {...register('title', { required: true })} placeholder="e.g. Palawan Island Hopping" className={INPUT} />
                                </div>
                                <div>
                                    <label className={LABEL}>Destination</label>
                                    <input {...register('destination', { required: true })} placeholder="e.g. El Nido, Palawan" className={INPUT} />
                                </div>
                                <div>
                                    <div>
                                        <label className={LABEL}>Status</label>
                                        <select {...register('status')} className={INPUT}>
                                            <option value="draft">Draft</option>
                                            <option value="published">Published</option>
                                            <option value="archived">Archived</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className={LABEL}>Meeting Point</label>
                                    <input {...register('meeting_point')} placeholder="e.g. Port Barton Pier" className={INPUT} />
                                </div>
                            </div>

                            <div className="space-y-5">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pb-2 border-b border-slate-100">Logistics &amp; Pricing</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={LABEL}>Price / Pax (₱)</label>
                                        <input type="number" step="0.01" {...register('price_per_person', { required: true, min: 0 })} className={INPUT} />
                                    </div>
                                    <div>
                                        <label className={LABEL}>Duration (Days)</label>
                                        <input type="number" {...register('duration_days', { required: true, min: 1 })} className={INPUT} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={LABEL}>Min Participants</label>
                                        <input type="number" {...register('min_participants', { min: 1 })} className={INPUT} />
                                    </div>
                                    <div>
                                        <label className={LABEL}>Max Participants</label>
                                        <input type="number" {...register('max_participants', { required: true, min: 1 })} className={INPUT} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section: Package Photos & Attraction Gallery (3-4 Photos) */}
                        <div className="space-y-5 bg-slate-50/70 p-5 sm:p-6 rounded-2xl border border-slate-200/90">
                            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                        <Camera className="w-4 h-4 text-emerald-600" />
                                        <span>Package Photos &amp; Attraction Gallery</span>
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Upload 3 to 4 accurate photos (Cover photo + Gallery photos) so customers view the realistic tour experience.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${totalPhotos >= 3 && totalPhotos <= 4 ? 'bg-emerald-100 text-emerald-800' : totalPhotos > 4 ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-800'}`}>
                                        <Camera className="w-3.5 h-3.5" />
                                        <span>{totalPhotos} Photo{totalPhotos === 1 ? '' : 's'} Total</span>
                                        {totalPhotos >= 3 && totalPhotos <= 4 ? ' · Optimal (3–4 Photos)' : totalPhotos < 3 ? ' · (3–4 Recommended)' : ''}
                                    </span>
                                </div>
                            </div>

                            {/* 1. Primary Cover Photo */}
                            <div>
                                <label className={LABEL}>1. Primary Cover Photo (Featured Card &amp; Main Attraction Banner)</label>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3.5 bg-white rounded-xl border border-slate-200">
                                    {coverPreview ? (
                                        <div className="relative group w-32 h-20 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                                            <img
                                                src={coverPreview}
                                                alt="Cover preview"
                                                className="w-full h-full object-cover"
                                            />
                                            <span className="absolute bottom-1 left-1 bg-black/60 text-[10px] text-white px-1.5 py-0.5 rounded font-semibold">
                                                Cover Photo
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="w-32 h-20 rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 shrink-0 bg-slate-50">
                                            <ImageIcon className="w-6 h-6 mb-1 text-slate-300" />
                                            <span className="text-[10px] font-semibold">No Cover</span>
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <p className="text-xs font-semibold text-slate-700 mb-1">
                                            {coverPreview ? 'Change Cover Photo' : 'Select Featured Cover Photo'}
                                        </p>
                                        <p className="text-[11px] text-slate-400 mb-2">
                                            This is the first big photo customers see on the tour card and detail banner.
                                        </p>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleCoverChange}
                                            className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 2. Additional Gallery Photos */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className={LABEL}>2. Gallery Photos (2 to 3 photos for side attraction thumbnails &amp; photo viewer)</label>
                                    <span className="text-xs font-semibold text-slate-500">
                                        {existingImages.length + newGalleryFiles.length} Gallery Photo{(existingImages.length + newGalleryFiles.length) === 1 ? '' : 's'}
                                    </span>
                                </div>

                                {/* Thumbnails Grid */}
                                {(existingImages.length > 0 || newGalleryFiles.length > 0) && (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                                        {/* Existing saved images */}
                                        {existingImages.map((img, idx) => (
                                            <div key={`exist-${img.id}`} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-white shadow-2xs aspect-video">
                                                <img
                                                    src={storageUrl(img.image_path)}
                                                    alt={`Gallery photo ${idx + 1}`}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                />
                                                <span className="absolute bottom-1.5 left-1.5 bg-black/60 text-[10px] text-white px-1.5 py-0.5 rounded font-semibold">
                                                    Photo {idx + 2}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeExistingImage(img.id)}
                                                    className="absolute top-1.5 right-1.5 p-1 bg-red-600/90 hover:bg-red-600 text-white rounded-lg shadow-sm transition-transform active:scale-90"
                                                    title="Delete this photo"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}

                                        {/* Newly added files */}
                                        {newGalleryFiles.map((file, idx) => {
                                            const objectUrl = URL.createObjectURL(file);
                                            return (
                                                <div key={`new-${idx}`} className="relative group rounded-xl overflow-hidden border-2 border-emerald-400 bg-white shadow-2xs aspect-video">
                                                    <img
                                                        src={objectUrl}
                                                        alt={file.name}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                    />
                                                    <span className="absolute bottom-1.5 left-1.5 bg-emerald-700/85 text-[10px] text-white px-1.5 py-0.5 rounded font-semibold">
                                                        New Photo
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeNewGalleryFile(idx)}
                                                        className="absolute top-1.5 right-1.5 p-1 bg-red-600/90 hover:bg-red-600 text-white rounded-lg shadow-sm transition-transform active:scale-90"
                                                        title="Remove from upload"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Add More Gallery Photos Input */}
                                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl bg-white hover:bg-emerald-50/30 cursor-pointer transition-colors group">
                                    <UploadCloud className="w-6 h-6 text-slate-400 group-hover:text-emerald-600 mb-1 transition-colors" />
                                    <span className="text-xs font-bold text-slate-700 group-hover:text-emerald-700">
                                        Click to upload gallery photos (select 1 or multiple files)
                                    </span>
                                    <span className="text-[11px] text-slate-400 mt-0.5">
                                        Upload lagoon, island beach, boat, or snorkeling snapshots (PNG, JPG, WEBP up to 5MB each)
                                    </span>
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        onChange={handleGalleryFilesChange}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        </div>

                        {/* Section 2: Description & Itinerary */}
                        <div className="space-y-5">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pb-2 border-b border-slate-100">Description &amp; Content</h3>
                            <div>
                                <label className={LABEL}>Description</label>
                                <textarea {...register('description')} rows={3} placeholder="A compelling overview of the tour experience..." className={INPUT} />
                            </div>
                            <div>
                                <label className={LABEL}>Itinerary</label>
                                <textarea {...register('itinerary')} rows={5} placeholder={"Day 1: Arrival at hotel...\nDay 2: Island tour..."} className={INPUT} />
                            </div>
                        </div>

                        {/* Section 3: Inclusions & Exclusions */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pb-2 border-b border-slate-100 mb-4">Inclusions</h3>
                                <label className={LABEL}>One item per line</label>
                                <textarea {...register('inclusions')} rows={5} placeholder={"Hotel transfer\nLunch\nGuide\nSnorkeling gear"} className={INPUT} />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pb-2 border-b border-slate-100 mb-4">Exclusions</h3>
                                <label className={LABEL}>One item per line</label>
                                <textarea {...register('exclusions')} rows={5} placeholder={"Flights\nDinner\nPersonal expenses"} className={INPUT} />
                            </div>
                        </div>

                        {/* Section 4: Location */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pb-2 border-b border-slate-100 mb-5">
                                📍 Destination Location (Optional)
                            </h3>
                            <p className="text-xs text-slate-500 mb-4">
                                Search for a destination, click on the map, or drag the marker to set exact coordinates. Customers will see this map when viewing or booking this package.
                            </p>
                            <React.Suspense fallback={
                                <div className="flex items-center gap-2 text-slate-400 text-sm py-8 justify-center">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Loading map picker...
                                </div>
                            }>
                                <LocationPickerLazy value={locationData} onChange={setLocationData} />
                            </React.Suspense>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="px-7 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
                    <button type="button" onClick={onClose}
                        className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors">
                        Cancel
                    </button>
                    <button type="submit" form="packageForm" disabled={isSubmitting || mutation.isPending}
                        className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-60">
                        {(isSubmitting || mutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isEdit ? 'Save Changes' : 'Create Package'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Schedule Management Modal ──────────────────────────────────────────────────

function ScheduleModal({ onClose, pkg }: { onClose: () => void; pkg: TourPackage }) {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'calendar' | 'schedules' | 'closures'>('calendar');
    
    // Calendar month state
    const [calendarMonth, setCalendarMonth] = useState(() => new Date());
    const monthKey = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}`;

    // Schedules query
    const { data: schedules, isLoading: isLoadingSchedules } = useQuery({
        queryKey: ['schedules', pkg.id],
        queryFn: async () => {
            const res = await apiClient.get(`/agency/packages/${pkg.id}/schedules`);
            return res.data;
        }
    });

    // Closures query
    const { data: closures, isLoading: isLoadingClosures } = useQuery({
        queryKey: ['availability-closures', pkg.id],
        queryFn: async () => {
            const res = await availabilityApi.list(pkg.id);
            return res.data as Array<{ id: number; start_date: string; end_date: string; reason: string; creator?: { id: number; name: string } | null }>;
        }
    });

    // Add schedule state
    const [newSchedule, setNewSchedule] = useState({
        departure_date: '',
        start_time: '',
        capacity: pkg.max_participants || 10,
        status: 'open'
    });

    // Add closure state
    const [closureForm, setClosureForm] = useState({
        start_date: '',
        end_date: '',
        reason: 'Maintenance'
    });
    const [customReason, setCustomReason] = useState('');
    const [closureNotice, setClosureNotice] = useState<{ text: string; isError: boolean } | null>(null);

    const [confirmAction, setConfirmAction] = useState<{ isOpen: boolean; title: string; message: string; isDanger: boolean; onConfirm: () => void } | null>(null);
    const closeConfirm = () => setConfirmAction(null);

    // Schedule Mutations
    const createScheduleMutation = useMutation({
        mutationFn: async (data: typeof newSchedule) => {
            await apiClient.post(`/agency/packages/${pkg.id}/schedules`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedules', pkg.id] });
            queryClient.invalidateQueries({ queryKey: ['tour-availability', pkg.id] });
            setNewSchedule({ departure_date: '', start_time: '', capacity: pkg.max_participants || 10, status: 'open' });
        },
        onError: (err: any) => alert(err.response?.data?.message || 'Error creating schedule')
    });

    const deleteScheduleMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiClient.delete(`/agency/packages/${pkg.id}/schedules/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedules', pkg.id] });
            queryClient.invalidateQueries({ queryKey: ['tour-availability', pkg.id] });
        },
        onError: (err: any) => alert(err.response?.data?.message || 'Error deleting schedule')
    });

    // Closure Mutations
    const createClosureMutation = useMutation({
        mutationFn: async () => {
            const payload = {
                start_date: closureForm.start_date,
                end_date: closureForm.end_date,
                reason: closureForm.reason === 'Other' ? customReason.trim() : closureForm.reason
            };
            return availabilityApi.create(pkg.id, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['availability-closures', pkg.id] });
            queryClient.invalidateQueries({ queryKey: ['tour-availability', pkg.id] });
            setClosureForm({ start_date: '', end_date: '', reason: 'Maintenance' });
            setCustomReason('');
            setClosureNotice({ text: 'Closure saved. Dates are now blocked on the customer calendar.', isError: false });
        },
        onError: (err: any) => {
            setClosureNotice({ text: err.response?.data?.message || 'Error blocking dates', isError: true });
        }
    });

    const deleteClosureMutation = useMutation({
        mutationFn: async (id: number) => {
            return availabilityApi.delete(pkg.id, id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['availability-closures', pkg.id] });
            queryClient.invalidateQueries({ queryKey: ['tour-availability', pkg.id] });
            setClosureNotice({ text: 'Closure removed. Availability restored.', isError: false });
        },
        onError: (err: any) => alert(err.response?.data?.message || 'Error deleting closure')
    });

    // Calendar computation
    const daysInMonth = useMemo(() => {
        const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay();
        const count = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
        return [...Array(firstDay).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
    }, [calendarMonth]);

    const scheduleByDate = useMemo(() => {
        const map = new Map<string, any[]>();
        (schedules || []).forEach((s: any) => {
            const list = map.get(s.departure_date) || [];
            list.push(s);
            map.set(s.departure_date, list);
        });
        return map;
    }, [schedules]);

    const findClosure = (dateStr: string) => {
        return (closures || []).find(c => c.start_date <= dateStr && c.end_date >= dateStr);
    };

    const handleCreateSchedule = (e: React.FormEvent) => {
        e.preventDefault();
        createScheduleMutation.mutate(newSchedule);
    };

    const handleCreateClosure = (e: React.FormEvent) => {
        e.preventDefault();
        setClosureNotice(null);
        createClosureMutation.mutate();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h2 className="text-xl font-bold text-slate-800">Booking Calendar &amp; Schedules</h2>
                            <span className={`px-2 py-0.5 text-xs font-bold rounded-full capitalize shadow-xs ${STATUS_STYLES[pkg.status] ?? 'bg-slate-100 text-slate-600'}`}>
                                {pkg.status}
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5">{pkg.title} &bull; {pkg.destination}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation Tabs */}
                <div className="flex border-b border-slate-200 px-6 gap-2 bg-slate-50/50">
                    <button
                        type="button"
                        onClick={() => setActiveTab('calendar')}
                        className={`py-3.5 px-4 text-sm font-semibold border-b-2 -mb-px flex items-center gap-2 transition-colors ${
                            activeTab === 'calendar'
                                ? 'border-sky-600 text-sky-700 bg-white'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Calendar className="w-4 h-4" /> Monthly Calendar Overview
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('schedules')}
                        className={`py-3.5 px-4 text-sm font-semibold border-b-2 -mb-px flex items-center gap-2 transition-colors ${
                            activeTab === 'schedules'
                                ? 'border-emerald-600 text-emerald-700 bg-white'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <CalendarDays className="w-4 h-4" /> Departure Schedules ({schedules?.length || 0})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('closures')}
                        className={`py-3.5 px-4 text-sm font-semibold border-b-2 -mb-px flex items-center gap-2 transition-colors ${
                            activeTab === 'closures'
                                ? 'border-rose-600 text-rose-700 bg-white'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Ban className="w-4 h-4" /> Block Dates / Closures ({closures?.length || 0})
                    </button>
                </div>

                {/* Tab Content Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* TAB 1: VISUAL MONTHLY CALENDAR */}
                    {activeTab === 'calendar' && (
                        <div className="space-y-4">
                            {/* Availability by default banner */}
                            <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-950">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 font-bold text-sm">
                                        ✓
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-emerald-900">All dates are available by default</h4>
                                        <p className="text-xs text-emerald-700/90 mt-0.5">
                                            Customers can book any future date. Click on any date below or use the button to block dates (e.g. for maintenance, weather, or private events).
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const today = new Date().toLocaleDateString('en-CA');
                                        setClosureForm({ start_date: today, end_date: today, reason: 'Maintenance' });
                                        setActiveTab('closures');
                                    }}
                                    className="shrink-0 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                                >
                                    <Ban className="w-4 h-4" /> Block Date / Range
                                </button>
                            </div>

                            {/* Month switcher */}
                            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                                    className="p-2 rounded-lg hover:bg-white text-slate-700 border border-transparent hover:border-slate-200 transition-colors shadow-2xs cursor-pointer"
                                    title="Previous Month"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <div className="text-center">
                                    <h3 className="font-extrabold text-slate-800 text-base md:text-lg">
                                        {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                    </h3>
                                    <span className="text-[11px] font-medium text-slate-400">Click any open date to block it</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                                    className="p-2 rounded-lg hover:bg-white text-slate-700 border border-transparent hover:border-slate-200 transition-colors shadow-2xs cursor-pointer"
                                    title="Next Month"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Calendar Grid */}
                            <div className="border border-slate-200 rounded-2xl p-4 bg-white shadow-2xs">
                                <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                        <div key={d} className="py-1">{d}</div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 gap-2">
                                    {daysInMonth.map((day, idx) => {
                                        if (!day) return <div key={`empty-${idx}`} className="h-24 rounded-xl bg-slate-50/40 border border-transparent" />;
                                        const dateStr = `${monthKey}-${String(day).padStart(2, '0')}`;
                                        const todayStr = new Date().toLocaleDateString('en-CA');
                                        const isPast = dateStr < todayStr;
                                        const isToday = dateStr === todayStr;
                                        const daySchedules = scheduleByDate.get(dateStr) || [];
                                        const closure = findClosure(dateStr);
                                        const isClosed = Boolean(closure);
                                        const hasSchedule = daySchedules.length > 0;

                                        // Past dates
                                        if (isPast) {
                                            return (
                                                <div
                                                    key={dateStr}
                                                    className="h-24 p-2 rounded-xl border border-slate-200/60 bg-slate-50/60 flex flex-col justify-between opacity-60 select-none cursor-not-allowed"
                                                >
                                                    <span className="text-xs font-semibold text-slate-400">{day}</span>
                                                    <span className="text-[10px] text-slate-400 font-medium italic">Past</span>
                                                </div>
                                            );
                                        }

                                        // Blocked / Closed dates
                                        if (isClosed) {
                                            return (
                                                <div
                                                    key={dateStr}
                                                    className="h-24 p-2 rounded-xl border border-rose-300 bg-rose-50/90 text-rose-950 flex flex-col justify-between transition-all shadow-2xs relative group"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold text-rose-800 line-through">{day}</span>
                                                        <span className="text-[10px] font-bold text-rose-700 bg-rose-200/80 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                            <Ban className="w-2.5 h-2.5" /> Blocked
                                                        </span>
                                                    </div>

                                                    <div className="my-auto">
                                                        <div className="bg-rose-100 text-rose-900 text-[11px] font-semibold px-1.5 py-0.5 rounded truncate border border-rose-200/60" title={closure?.reason}>
                                                            {closure?.reason}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between pt-1 border-t border-rose-200/60">
                                                        <span className="text-[10px] text-rose-600 font-medium">Closed</span>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (closure) {
                                                                    setConfirmAction({
                                                                        isOpen: true,
                                                                        title: 'Unblock Date',
                                                                        message: `Unblock ${dateStr} (${closure.reason}) and restore booking availability?`,
                                                                        isDanger: false,
                                                                        onConfirm: () => {
                                                                            deleteClosureMutation.mutate(closure.id);
                                                                            closeConfirm();
                                                                        }
                                                                    });
                                                                }
                                                            }}
                                                            className="text-[10px] font-bold text-rose-700 hover:text-rose-900 underline hover:bg-rose-200/60 px-1 py-0.5 rounded transition-colors cursor-pointer"
                                                        >
                                                            Unblock
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // Available dates (Future & Unblocked)
                                        return (
                                            <div
                                                key={dateStr}
                                                onClick={() => {
                                                    setClosureForm({ start_date: dateStr, end_date: dateStr, reason: 'Maintenance' });
                                                    setActiveTab('closures');
                                                }}
                                                className={`h-24 p-2 rounded-xl border flex flex-col justify-between transition-all cursor-pointer group hover:shadow-md ${
                                                    isToday
                                                        ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-500/20'
                                                        : 'bg-white border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30'
                                                }`}
                                                title={`Click to block ${dateStr}`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className={`text-xs font-bold ${isToday ? 'text-emerald-800' : 'text-slate-800'}`}>
                                                        {day} {isToday && <span className="text-[9px] font-semibold text-emerald-600 ml-0.5">(Today)</span>}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-md">
                                                        Available
                                                    </span>
                                                </div>

                                                <div className="space-y-1 overflow-hidden my-auto">
                                                    {hasSchedule ? (
                                                        daySchedules.map((s: any) => {
                                                            const seats = s.capacity - s.reserved_slots;
                                                            return (
                                                                <div
                                                                    key={s.id}
                                                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded truncate ${
                                                                        seats <= 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-900'
                                                                    }`}
                                                                    title={`Departure: ${s.start_time || 'Full day'} | ${seats} seats left`}
                                                                >
                                                                    {s.start_time ? s.start_time.substring(0, 5) : 'Tour'}: {seats} seats
                                                                </div>
                                                            );
                                                        })
                                                    ) : (
                                                        <div className="text-[10px] text-slate-400 group-hover:text-emerald-700 font-medium">
                                                            {pkg.max_participants || 20} slots open
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between pt-1 border-t border-slate-100 group-hover:border-emerald-200">
                                                    <span className="text-[10px] text-slate-400 group-hover:text-slate-600 font-medium">
                                                        Bookable
                                                    </span>
                                                    <span className="text-[10px] font-bold text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                                        <Ban className="w-2.5 h-2.5" /> Block
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="flex flex-wrap items-center gap-5 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                                <span className="font-bold text-slate-700">Legend:</span>
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded-md bg-emerald-100 border border-emerald-400 inline-block" />
                                    <span className="font-medium text-slate-700">Available (Bookable by customers)</span>
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded-md bg-rose-100 border border-rose-400 inline-block" />
                                    <span className="font-medium text-slate-700">Blocked (Closed by agency)</span>
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded-md bg-slate-100 border border-slate-300 inline-block" />
                                    <span className="font-medium text-slate-500">Past dates</span>
                                </span>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: MANAGE SCHEDULES */}
                    {activeTab === 'schedules' && (
                        <div className="space-y-6">
                            {/* Add New Schedule Form */}
                            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                                    <Plus className="w-4 h-4 text-emerald-600" /> Add Departure Schedule
                                </h3>
                                <form onSubmit={handleCreateSchedule} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Departure Date</label>
                                        <input
                                            required
                                            type="date"
                                            value={newSchedule.departure_date}
                                            onChange={e => setNewSchedule({ ...newSchedule, departure_date: e.target.value })}
                                            className={INPUT}
                                        />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Time (Optional)</label>
                                        <input
                                            type="time"
                                            value={newSchedule.start_time}
                                            onChange={e => setNewSchedule({ ...newSchedule, start_time: e.target.value })}
                                            className={INPUT}
                                        />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Seats / Capacity</label>
                                        <input
                                            required
                                            type="number"
                                            min="1"
                                            value={newSchedule.capacity}
                                            onChange={e => setNewSchedule({ ...newSchedule, capacity: Number(e.target.value) })}
                                            className={INPUT}
                                        />
                                    </div>
                                    <div className="col-span-2 md:col-span-1 flex items-end">
                                        <button
                                            type="submit"
                                            disabled={createScheduleMutation.isPending}
                                            className="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-60 shadow-2xs"
                                        >
                                            {createScheduleMutation.isPending ? 'Adding…' : 'Add Schedule'}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Existing Schedules */}
                            <div>
                                <h3 className="font-bold text-slate-700 mb-3 flex items-center justify-between">
                                    <span>Upcoming Schedules</span>
                                    <span className="text-xs font-semibold text-slate-500">{schedules?.length || 0} scheduled</span>
                                </h3>
                                {isLoadingSchedules ? (
                                    <p className="text-slate-400 py-4 text-center">Loading schedules…</p>
                                ) : !schedules || schedules.length === 0 ? (
                                    <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                        <p className="text-slate-500">No schedules configured for this package yet.</p>
                                        <p className="text-xs text-slate-400 mt-1">Use the form above to add your first departure date.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2.5">
                                        {schedules.map((sched: any) => {
                                            const closure = findClosure(sched.departure_date);
                                            return (
                                                <div key={sched.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
                                                    <div className="flex flex-wrap gap-x-6 gap-y-2 items-center">
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Date</p>
                                                            <p className="font-bold text-slate-800">
                                                                {new Date(`${sched.departure_date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                                            </p>
                                                        </div>
                                                        {sched.start_time && (
                                                            <div>
                                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Time</p>
                                                                <p className="font-bold text-slate-800">{sched.start_time.substring(0, 5)}</p>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Availability</p>
                                                            <p className="font-bold text-slate-800">{sched.capacity - sched.reserved_slots} / {sched.capacity} seats left</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Status</p>
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${sched.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                                    {sched.status}
                                                                </span>
                                                                {closure && (
                                                                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700" title={`Blocked by closure: ${closure.reason}`}>
                                                                        🚫 {closure.reason}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => { 
                                                            setConfirmAction({
                                                                isOpen: true,
                                                                title: 'Delete Schedule',
                                                                message: `Are you sure you want to delete the schedule on ${sched.departure_date}?`,
                                                                isDanger: true,
                                                                onConfirm: () => {
                                                                    deleteScheduleMutation.mutate(sched.id);
                                                                    closeConfirm();
                                                                }
                                                            });
                                                        }}
                                                        className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
                                                        title="Delete schedule"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 3: BLOCK DATES / CLOSURES */}
                    {activeTab === 'closures' && (
                        <div className="space-y-6">
                            {/* Block Dates Form */}
                            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                                <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                                    <Ban className="w-4 h-4 text-rose-600" /> Block Date or Date Range
                                </h3>
                                <p className="text-xs text-slate-500 mb-4">
                                    Blocked dates will immediately be disabled on the customer booking calendar with your closure reason.
                                </p>

                                <form onSubmit={handleCreateClosure} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Date</label>
                                        <input
                                            required
                                            type="date"
                                            min={new Date().toLocaleDateString('en-CA')}
                                            value={closureForm.start_date}
                                            onChange={e => setClosureForm({ ...closureForm, start_date: e.target.value })}
                                            className={INPUT}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">End Date</label>
                                        <input
                                            required
                                            type="date"
                                            min={closureForm.start_date || new Date().toLocaleDateString('en-CA')}
                                            value={closureForm.end_date}
                                            onChange={e => setClosureForm({ ...closureForm, end_date: e.target.value })}
                                            className={INPUT}
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reason for Closure</label>
                                        <select
                                            value={closureForm.reason}
                                            onChange={e => {
                                                setClosureForm({ ...closureForm, reason: e.target.value });
                                                setCustomReason('');
                                            }}
                                            className={INPUT}
                                        >
                                            {['Renovation', 'Maintenance', 'Weather conditions', 'Private event', 'Agency closure', 'Other'].map(r => (
                                                <option key={r} value={r}>{r}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {closureForm.reason === 'Other' && (
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Custom Reason</label>
                                            <input
                                                required
                                                maxLength={255}
                                                value={customReason}
                                                onChange={e => setCustomReason(e.target.value)}
                                                placeholder="e.g. Typhoon warning / Boat repairs"
                                                className={INPUT}
                                            />
                                        </div>
                                    )}

                                    {closureNotice && (
                                        <div className={`md:col-span-2 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                                            closureNotice.isError ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        }`}>
                                            {closureNotice.isError ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                            <span>{closureNotice.text}</span>
                                        </div>
                                    )}

                                    <div className="md:col-span-2 flex items-center justify-between pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('calendar')}
                                            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                                        >
                                            &larr; Back to Calendar Overview
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={createClosureMutation.isPending}
                                            className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 px-6 rounded-xl transition-colors disabled:opacity-60 shadow-2xs cursor-pointer"
                                        >
                                            {createClosureMutation.isPending ? 'Blocking…' : 'Block Selected Dates'}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Existing Closures List */}
                            <div>
                                <h3 className="font-bold text-slate-700 mb-3 flex items-center justify-between">
                                    <span>Active Closures</span>
                                    <span className="text-xs font-semibold text-slate-500">{closures?.length || 0} active</span>
                                </h3>
                                {isLoadingClosures ? (
                                    <p className="text-slate-400 py-4 text-center">Loading closures…</p>
                                ) : !closures || closures.length === 0 ? (
                                    <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                        <p className="text-slate-500">No active date closures for this package.</p>
                                        <p className="text-xs text-slate-400 mt-1">All dates with departure schedules remain bookable.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2.5">
                                        {closures.map(closure => (
                                            <div key={closure.id} className="flex items-center justify-between p-4 bg-white border border-rose-100 rounded-xl shadow-2xs">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-rose-100 text-rose-800">
                                                            {closure.reason}
                                                        </span>
                                                        <span className="font-bold text-slate-800 text-sm">
                                                            {closure.start_date === closure.end_date
                                                                ? closure.start_date
                                                                : `${closure.start_date} → ${closure.end_date}`}
                                                        </span>
                                                    </div>
                                                    {closure.creator && (
                                                        <p className="text-xs text-slate-400 mt-1">Added by {closure.creator.name}</p>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setConfirmAction({
                                                            isOpen: true,
                                                            title: 'Remove Closure',
                                                            message: `Restore availability for ${closure.start_date} to ${closure.end_date}?`,
                                                            isDanger: false,
                                                            onConfirm: () => {
                                                                deleteClosureMutation.mutate(closure.id);
                                                                closeConfirm();
                                                            }
                                                        });
                                                    }}
                                                    className="text-xs font-bold text-rose-600 hover:text-rose-700 border border-rose-200 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors"
                                                >
                                                    Remove / Unblock
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Custom Confirm Modal */}
            {confirmAction && (
                <ConfirmModal 
                    isOpen={confirmAction.isOpen}
                    title={confirmAction.title}
                    message={confirmAction.message}
                    isDanger={confirmAction.isDanger}
                    onConfirm={confirmAction.onConfirm}
                    onCancel={closeConfirm}
                />
            )}
        </div>
    );
}
