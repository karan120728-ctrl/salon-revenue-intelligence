// ─── Internal normalized types used throughout the import pipeline ──────────────

export type AppointmentStatus =
    | 'COMPLETED'
    | 'CANCELLED'
    | 'NO_SHOW'
    | 'PENDING'
    | 'RESCHEDULED'
    | 'SCHEDULED';

export type PaymentStatus = 'COMPLETED' | 'PENDING' | 'REFUNDED' | 'REVERSED' | 'FAILED';
export type PaymentMethod = 'CARD' | 'CASH' | 'ONLINE';

export interface NormalizedStaff {
    externalId: string;
    name: string;
    role: string;
}

export interface NormalizedService {
    externalId: string;
    name: string;
    price: number;
    duration: number; // minutes
}

export interface NormalizedCustomer {
    externalId: string;
    name: string;
    email?: string;
    phone?: string;
}

export interface NormalizedAppointment {
    externalId: string;
    date: Date;
    status: AppointmentStatus;
    customerExternalId: string;
    staffExternalId?: string; // optional — may be unresolved
    serviceExternalIds: string[];
    priceAtBooking: number;
}

export interface NormalizedPayment {
    externalId: string;
    amount: number;
    status: PaymentStatus;
    method: PaymentMethod;
    paymentDate: Date;
    customerExternalId: string;
    appointmentExternalId?: string; // optional — may be unresolved
}

export interface NormalizedData {
    staff: NormalizedStaff[];
    services: NormalizedService[];
    customers: NormalizedCustomer[];
    appointments: NormalizedAppointment[];
    payments: NormalizedPayment[];
}

export type SourceSystem = 'fresha' | 'timely' | 'treatwell' | 'generic';

export interface Normalizer {
    /** Return true if this normalizer handles these CSV headers */
    detect(headers: string[]): boolean;
    /** Parse raw CSV rows into normalized data */
    normalize(rows: Record<string, string>[]): NormalizedData;
}
