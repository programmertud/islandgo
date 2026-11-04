export interface User {
    id: number;
    agency_id?: number | null;
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
    role: 'super_admin' | 'agency_admin' | 'agency_staff' | 'customer';
}

export interface Agency {
    id: number;
    name: string;
    slug: string;
    logo_url?: string;
    contact_email?: string;
    contact_phone?: string;
    gcash_number?: string | null;
    gcash_account_name?: string | null;
    payment_qr_code_path?: string | null;
    payment_qr_code_url?: string | null;
    address?: string;
    status: 'pending' | 'active' | 'suspended';
    sms_settings?: Record<string, unknown>;
}

export interface TourPackage {
    id: number;
    agency_id: number;
    agency?: Agency;
    title: string;
    destination: string;
    destination_name?: string | null;
    destination_address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    location_description?: string | null;
    location?: string;
    category: string;
    price_per_person: number;
    duration_days: number;
    min_participants?: number;
    max_participants: number;
    inclusions?: string[];
    exclusions?: string[];
    meeting_point?: string;
    cover_image?: string;
    description?: string;
    itinerary?: string;
    schedules?: TourSchedule[];
    images?: Array<{
        id: number;
        tour_package_id: number;
        image_path: string;
        alt_text?: string | null;
        is_cover: boolean;
        sort_order?: number;
    }>;
    status: 'draft' | 'published' | 'archived';
}

export interface TourSchedule {
    id: number;
    tour_package_id: number;
    package?: TourPackage;
    departure_date: string;
    start_time?: string;
    capacity: number;
    reserved_slots: number;
    status: 'open' | 'full' | 'cancelled' | 'completed';
}

export interface Booking {
    id: number;
    booking_reference: string;
    agency_id: number;
    customer_id: number | null;
    customer?: User | null;
    guest_name?: string | null;
    guest_email?: string | null;
    guest_phone?: string | null;
    tour_schedule_id: number;
    schedule?: TourSchedule;
    participants_count: number;
    total_amount: number;
    required_advance_amount: number;
    advance_paid_amount: number;
    remaining_balance: number;
    payment_deadline?: string | null;
    payment_method?: 'gcash' | 'cash' | null;
    booking_status: 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed' | 'expired';
    payment_status: 'unpaid' | 'submitted' | 'under_review' | 'verified' | 'rejected';
    special_requests?: string;
    rejection_reason?: string;
    payments?: Payment[];
    documents?: BookingDocument[];
    created_at: string;
}

export interface BookingDocument {
    id: number;
    booking_id: number;
    document_type: string;
    file_name: string;
    file_path: string;
    notes?: string;
    created_at: string;
    uploader?: User;
}

export interface Payment {
    id: number;
    booking_id: number;
    payment_reference?: string;
    gcash_reference?: string;
    amount: number;
    payment_method?: string;
    payment_type?: 'advance' | 'balance' | 'full';
    proof_of_payment_path?: string;
    status: 'submitted' | 'verified' | 'rejected';
    admin_notes?: string;
    verified_at?: string;
    created_at?: string;
}

export interface SmsNotification {
    id: number;
    agency_id: number;
    booking_id: number;
    booking?: { id: number; booking_reference: string };
    recipient_phone: string;
    message: string;
    event_type: string;
    status: 'queued' | 'sent' | 'failed' | 'mock_sent';
    provider_reference?: string;
    created_at: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

// ── Guest Booking ─────────────────────────────────────────────────────────────

export interface GuestBookingRequest {
    tour_schedule_id?: number;
    tour_package_id?: number;
    booking_date?: string;
    participants_count: number;
    guest_name: string;
    guest_email: string;
    guest_phone: string;
    special_requests?: string;
    payment_method?: 'gcash' | 'cash';
    payment_option?: 'advance' | 'full';
}

export interface GuestTourSummary {
    title: string;
    destination: string;
    destination_name: string | null;
    destination_address: string | null;
    latitude: number | null;
    longitude: number | null;
    agency_name: string | null;
    gcash_number: string | null;
    gcash_account_name: string | null;
    payment_qr_code_url?: string | null;
}

export interface GuestScheduleSummary {
    id: number;
    departure_date: string;
    start_time: string | null;
}

export interface GuestBookingResponse {
    booking_reference: string;
    booking_status: string;
    payment_status: string;
    payment_method: 'gcash' | 'cash' | null;
    payment_deadline: string | null;
    total_amount: number;
    required_advance_amount: number;
    participants_count: number;
    special_requests: string | null;
    tour: GuestTourSummary;
    schedule: GuestScheduleSummary;
    next_steps: string;
}

export interface GuestBookingLookupResponse extends GuestBookingResponse {
    advance_paid_amount: number;
    remaining_balance?: number;
    created_at: string;
}
