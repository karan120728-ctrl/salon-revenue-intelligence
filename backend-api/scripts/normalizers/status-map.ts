import { AppointmentStatus, PaymentStatus, PaymentMethod } from './types';

// ── Appointment status normalization ──────────────────────────────────────────
const APPOINTMENT_STATUS_MAP: Record<string, AppointmentStatus> = {
    // Generic / common
    completed: 'COMPLETED',
    complete: 'COMPLETED',
    done: 'COMPLETED',
    finished: 'COMPLETED',
    attended: 'COMPLETED',
    'checked out': 'COMPLETED',
    'checked-out': 'COMPLETED',

    cancelled: 'CANCELLED',
    canceled: 'CANCELLED',
    cancel: 'CANCELLED',
    'late cancellation': 'CANCELLED',
    'late cancel': 'CANCELLED',
    'client cancelled': 'CANCELLED',
    'salon cancelled': 'CANCELLED',

    'no show': 'NO_SHOW',
    'no-show': 'NO_SHOW',
    noshow: 'NO_SHOW',
    'did not attend': 'NO_SHOW',
    "didn't attend": 'NO_SHOW',
    'did not turn up': 'NO_SHOW',
    dna: 'NO_SHOW',

    rescheduled: 'RESCHEDULED',
    reschedule: 'RESCHEDULED',
    moved: 'RESCHEDULED',

    pending: 'PENDING',
    unconfirmed: 'PENDING',
    tentative: 'PENDING',
    'awaiting confirmation': 'PENDING',

    scheduled: 'SCHEDULED',
    confirmed: 'SCHEDULED',
    booked: 'SCHEDULED',
    upcoming: 'SCHEDULED',
};

export function normalizeAppointmentStatus(raw: string): AppointmentStatus {
    const key = raw.toLowerCase().trim();
    return APPOINTMENT_STATUS_MAP[key] ?? 'SCHEDULED';
}

// ── Payment status normalization ──────────────────────────────────────────────
const PAYMENT_STATUS_MAP: Record<string, PaymentStatus> = {
    completed: 'COMPLETED',
    complete: 'COMPLETED',
    paid: 'COMPLETED',
    settled: 'COMPLETED',

    pending: 'PENDING',
    processing: 'PENDING',

    refunded: 'REFUNDED',
    refund: 'REFUNDED',

    reversed: 'REVERSED',
    chargeback: 'REVERSED',
    disputed: 'REVERSED',

    failed: 'FAILED',
    declined: 'FAILED',
    failed_payment: 'FAILED',
};

export function normalizePaymentStatus(raw: string): PaymentStatus {
    const key = raw.toLowerCase().trim();
    return PAYMENT_STATUS_MAP[key] ?? 'COMPLETED';
}

// ── Payment method normalization ──────────────────────────────────────────────
const PAYMENT_METHOD_MAP: Record<string, PaymentMethod> = {
    card: 'CARD',
    credit: 'CARD',
    debit: 'CARD',
    'credit card': 'CARD',
    'debit card': 'CARD',
    visa: 'CARD',
    mastercard: 'CARD',
    amex: 'CARD',
    stripe: 'ONLINE',
    online: 'ONLINE',
    paypal: 'ONLINE',
    sumup: 'ONLINE',
    square: 'ONLINE',
    cash: 'CASH',
};

export function normalizePaymentMethod(raw: string): PaymentMethod {
    const key = raw.toLowerCase().trim();
    return PAYMENT_METHOD_MAP[key] ?? 'CARD';
}
