import { Normalizer, NormalizedData } from './types';
import { normalizeAppointmentStatus, normalizePaymentStatus, normalizePaymentMethod } from './status-map';
import { parseDate, parseCurrency } from './date-utils';

/**
 * Fresha CSV export normalizer.
 *
 * Fresha typically exports a single "appointments" CSV with columns roughly like:
 * Appointment ID, Date, Time, Customer Name, Customer Email, Customer Phone,
 * Staff Name, Service Name, Service Price, Payment Amount, Payment Method,
 * Payment Status, Appointment Status
 *
 * Because Fresha field names can vary slightly between account exports,
 * we use case-insensitive, flexible header matching via the `pick()` helper.
 */
const freshaHeaders = [
    'appointment id', 'appointment ref', 'booking id', // strong signals
];

function pick(row: Record<string, string>, ...candidates: string[]): string {
    for (const c of candidates) {
        const key = Object.keys(row).find(k => k.toLowerCase().trim() === c.toLowerCase().trim());
        if (key !== undefined) return row[key]?.trim() ?? '';
    }
    return '';
}

const Fresha: Normalizer = {
    detect(headers) {
        const lc = headers.map(h => h.toLowerCase().trim());
        return freshaHeaders.some(s => lc.includes(s));
    },

    normalize(rows): NormalizedData {
        const staffMap = new Map<string, { externalId: string; name: string; role: string }>();
        const serviceMap = new Map<string, { externalId: string; name: string; price: number; duration: number }>();
        const customerMap = new Map<string, { externalId: string; name: string; email?: string; phone?: string }>();
        const appointments: NormalizedData['appointments'] = [];
        const payments: NormalizedData['payments'] = [];

        // Use row index + appointment ID as stable deduplication key
        const apptSeen = new Set<string>();

        for (const row of rows) {
            const apptId = pick(row, 'appointment id', 'appointment ref', 'booking id', 'id');
            const date = parseDate(
                pick(row, 'date', 'appointment date', 'booking date') + ' ' +
                pick(row, 'time', 'start time', 'appointment time')
            );
            const apptStatus = pick(row, 'appointment status', 'status', 'booking status');
            const customerName = pick(row, 'customer name', 'client name', 'name');
            const customerEmail = pick(row, 'customer email', 'client email', 'email');
            const customerPhone = pick(row, 'customer phone', 'client phone', 'phone', 'mobile');
            const staffName = pick(row, 'staff', 'staff name', 'therapist', 'stylist', 'employee');
            const serviceName = pick(row, 'service', 'service name', 'treatment', 'treatment name');
            const servicePrice = parseCurrency(pick(row, 'service price', 'price', 'service amount'));
            const paymentId = pick(row, 'payment id', 'transaction id', 'payment ref');
            const paymentAmount = parseCurrency(pick(row, 'payment amount', 'amount paid', 'total', 'amount'));
            const paymentMethod = pick(row, 'payment type', 'payment method', 'method');
            const paymentStatus = pick(row, 'payment status', 'transaction status');
            const paymentDate = parseDate(pick(row, 'payment date', 'transaction date', 'date'));

            // Build stable external IDs
            const customerExtId = customerEmail || customerName;
            const staffExtId = staffName;
            const serviceExtId = serviceName;

            if (customerExtId && !customerMap.has(customerExtId)) {
                customerMap.set(customerExtId, {
                    externalId: customerExtId,
                    name: customerName,
                    email: customerEmail || undefined,
                    phone: customerPhone || undefined,
                });
            }

            if (staffName && !staffMap.has(staffExtId)) {
                staffMap.set(staffExtId, { externalId: staffExtId, name: staffName, role: 'Stylist' });
            }

            if (serviceName && !serviceMap.has(serviceExtId)) {
                serviceMap.set(serviceExtId, {
                    externalId: serviceExtId,
                    name: serviceName,
                    price: servicePrice ?? 0,
                    duration: 60,
                });
            }

            if (apptId && date && customerExtId && !apptSeen.has(apptId)) {
                apptSeen.add(apptId);
                appointments.push({
                    externalId: apptId,
                    date,
                    status: normalizeAppointmentStatus(apptStatus || 'completed'),
                    customerExternalId: customerExtId,
                    staffExternalId: staffName || undefined,
                    serviceExternalIds: serviceName ? [serviceExtId] : [],
                    priceAtBooking: servicePrice ?? 0,
                });
            }

            if (paymentId && paymentAmount !== null) {
                payments.push({
                    externalId: paymentId,
                    amount: paymentAmount,
                    status: normalizePaymentStatus(paymentStatus || 'completed'),
                    method: normalizePaymentMethod(paymentMethod || 'card'),
                    paymentDate: paymentDate || date || new Date(),
                    customerExternalId: customerExtId,
                    appointmentExternalId: apptId || undefined,
                });
            }
        }

        return {
            staff: Array.from(staffMap.values()),
            services: Array.from(serviceMap.values()),
            customers: Array.from(customerMap.values()),
            appointments,
            payments,
        };
    },
};

export default Fresha;
