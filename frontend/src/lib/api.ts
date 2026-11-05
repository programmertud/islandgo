import { apiClient } from '../lib/axios';
import type { TourPackage, Booking, PaginatedResponse, GuestBookingRequest, GuestBookingResponse, GuestBookingLookupResponse } from '../types';

// ─── Auth ─────────────────────────────────────────────────────
export const authApi = {
    login: (email: string, password: string) =>
        apiClient.post<{ access_token: string; user: import('../types').User }>('/auth/login', { email, password }),
    register: (data: { name: string; email: string; password: string; password_confirmation: string; phone?: string; role: string }) =>
        apiClient.post<{ access_token: string; user: import('../types').User }>('/auth/register', data),
    logout: () => apiClient.post('/auth/logout'),
    getUser: () => apiClient.get<import('../types').User>('/auth/user'),
    updateProfile: (data: FormData) => apiClient.post<{ message: string; user: import('../types').User }>('/auth/profile', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

// ─── Public Tours ─────────────────────────────────────────────
export const toursApi = {
    list: (params?: { destination?: string; category?: string; page?: number; per_page?: number }) =>
        apiClient.get<PaginatedResponse<TourPackage>>('/tours', { params }),
    show: (id: number) => apiClient.get<TourPackage>(`/tours/${id}`),
    availability: (id: number, month: string) => apiClient.get(`/tours/${id}/availability`, { params: { month } }),
    destinations: () => apiClient.get<Array<{ label: string; value: string }>>('/destinations'),
};

export const availabilityApi = {
    list: (packageId: number) => apiClient.get(`/agency/packages/${packageId}/unavailable-dates`),
    create: (packageId: number, data: { start_date: string; end_date: string; reason: string }) => apiClient.post(`/agency/packages/${packageId}/unavailable-dates`, data),
    update: (packageId: number, closureId: number, data: { start_date: string; end_date: string; reason: string }) => apiClient.put(`/agency/packages/${packageId}/unavailable-dates/${closureId}`, data),
    delete: (packageId: number, closureId: number) => apiClient.delete(`/agency/packages/${packageId}/unavailable-dates/${closureId}`),
};

// ─── Guest Booking ────────────────────────────────────────────
export const guestApi = {
    book: (data: GuestBookingRequest) =>
        apiClient.post<GuestBookingResponse>('/guest/bookings', data),
    lookup: (bookingReference: string, guestEmail: string) =>
        apiClient.get<GuestBookingLookupResponse>('/guest/bookings/lookup', {
            params: { booking_reference: bookingReference, guest_email: guestEmail },
        }),
    uploadPayment: (data: FormData) =>
        apiClient.post<{ message: string; payment_status: string }>('/guest/bookings/payment', data, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
};

// ─── Agency Packages ──────────────────────────────────────────
export const agencyPackagesApi = {
    list: (page = 1) => apiClient.get<PaginatedResponse<TourPackage>>('/agency/packages', { params: { page } }),
    create: (data: FormData) => apiClient.post<TourPackage>('/agency/packages', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
    update: (id: number, data: FormData) => apiClient.post<TourPackage>(`/agency/packages/${id}?_method=PUT`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
    delete: (id: number) => apiClient.delete(`/agency/packages/${id}`),
    deleteImage: (packageId: number, imageId: number) => apiClient.delete(`/agency/packages/${packageId}/images/${imageId}`),
};

// ─── Agency Schedules ─────────────────────────────────────────
export const schedulesApi = {
    list: (packageId: number) => apiClient.get(`/agency/packages/${packageId}/schedules`),
    create: (packageId: number, data: object) => apiClient.post(`/agency/packages/${packageId}/schedules`, data),
    update: (packageId: number, scheduleId: number, data: object) => apiClient.put(`/agency/packages/${packageId}/schedules/${scheduleId}`, data),
    delete: (_packageId: number, scheduleId: number) => apiClient.delete(`/agency/packages/${scheduleId}`),
};

// ─── Agency Bookings ──────────────────────────────────────────
export const agencyBookingsApi = {
    list: (params?: { booking_status?: string; payment_status?: string; page?: number }) =>
        apiClient.get<PaginatedResponse<Booking>>('/agency/bookings', { params }),
    updateStatus: (bookingId: number, data: { booking_status: string; rejection_reason?: string }) =>
        apiClient.put(`/agency/bookings/${bookingId}/status`, data),
    verifyPayment: (paymentId: number, data: { status: 'verified' | 'rejected'; admin_notes?: string }) =>
        apiClient.put(`/agency/payments/${paymentId}/verify`, data),
    recordCashAdvance: (bookingId: number, data: { amount: number; reference_number?: string; notes?: string }) =>
        apiClient.post(`/agency/bookings/${bookingId}/cash-advance`, data),
    delete: (bookingId: number) => apiClient.delete(`/agency/bookings/${bookingId}`),
};

// ─── SMS Logs ─────────────────────────────────────────────────
export const smsApi = {
    list: (params?: { event_type?: string; status?: string; page?: number }) =>
        apiClient.get('/agency/sms-logs', { params }),
};

// ─── Agency Analytics ───────────────────────────────────────
export const agencyAnalyticsApi = {
    getDashboard: () => apiClient.get('/agency/analytics'),
};

// ─── Customer Bookings ────────────────────────────────────────
export const customerApi = {
    myBookings: (page = 1) => apiClient.get<PaginatedResponse<Booking>>('/my-bookings', { params: { page } }),
    deleteBooking: (bookingId: number) => apiClient.delete(`/my-bookings/${bookingId}`),
    book: (data: { tour_schedule_id?: number; tour_package_id?: number; booking_date?: string; participants_count: number; special_requests?: string; payment_method?: 'gcash' | 'cash'; payment_option?: 'advance' | 'full' }) =>
        apiClient.post<Booking>('/bookings', data),
    getBooking: (id: number) => apiClient.get<Booking>(`/bookings/${id}`),
    uploadPayment: (bookingId: number, data: FormData) =>
        apiClient.post(`/bookings/${bookingId}/payments`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

// ─── Super Admin ──────────────────────────────────────────────
export const adminApi = {
    listAgencies: (params?: { status?: string; page?: number }) =>
        apiClient.get('/admin/agencies', { params }),
    getAgency: (id: number) => apiClient.get(`/admin/agencies/${id}`),
    updateAgencyStatus: (id: number, status: string) =>
        apiClient.put(`/admin/agencies/${id}/status`, { status }),
    getDashboard: () => apiClient.get('/admin/analytics'),
};

// ─── Storage URL helper & Island Fallbacks ────────────────────
export const FALLBACK_ISLAND_IMAGES = [
    'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=1200&q=80', // Sugba Lagoon / Emerald waters
    'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1200&q=80', // Tropical Island Cove / Turquoise Bay
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80', // Pristine White Sand Sandbar & Palms
    'https://images.unsplash.com/photo-1516690561799-46d8f74f9abf?auto=format&fit=crop&w=1200&q=80', // Palawan Coron Kayangan Lake Lagoon
    'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80', // Coral Reef & Snorkeling Island Waters
];

const backendBase = import.meta.env.VITE_BACKEND_URL || '';
const supabaseStorageBase = import.meta.env.VITE_SUPABASE_STORAGE_URL || 'https://dozhtzetsefxmyytwzmw.supabase.co/storage/v1/object/public/islandgo';

export function storageUrl(path: string | null | undefined, fallbackIndex = 0): string {
    if (!path || typeof path !== 'string' || path.trim() === '') {
        return FALLBACK_ISLAND_IMAGES[Math.abs(fallbackIndex) % FALLBACK_ISLAND_IMAGES.length];
    }
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }
    const clean = path.replace(/^\/+/, '').replace(/^storage\//, '');
    if (backendBase) {
        return `${supabaseStorageBase.replace(/\/+$/, '')}/${clean}`;
    }
    return `/storage/${clean}`;
}

export function avatarUrl(avatar: string | null | undefined): string {
    if (!avatar || typeof avatar !== 'string' || avatar.trim() === '') return '';
    if (avatar.startsWith('http://') || avatar.startsWith('https://')) return avatar;
    const clean = avatar.replace(/^\/+/, '').replace(/^storage\//, '');
    if (backendBase) {
        return `${supabaseStorageBase.replace(/\/+$/, '')}/${clean}`;
    }
    return `/${clean}`;
}
