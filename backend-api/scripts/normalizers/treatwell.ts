import { Normalizer, NormalizedData } from './types';
import { normalizeAppointmentStatus, normalizePaymentStatus, normalizePaymentMethod } from './status-map';
import { parseDate, parseCurrency } from './date-utils';

/**
 * Treatwell CSV export normalizer.
 * Treatwell exports often include columns like:
 * Booking Reference, Date, Customer, Customer Email, Venue, Employee,
 * Treatment, Price, Status, Payment Method
 */
const treatwellHeaders = ['booking reference', 'venue', 'treatment'];

function pick(row: Record<string, string>, ...candidates: string[]): string {
    for (const c of candidates) {
        const key = Object.keys(row).find(k => k.toLowerCase().trim() === c.toLowerCase().trim());
        if (key !== undefined) return row[key]?.trim() ?? '';
    }
    return '';
}

const Treatwell: Normalizer = {
    detect(headers) {
        const lc = headers.map(h => h.toLowerCase().trim());
        return treatwellHeaders.some(s => lc.includes(s));
    },

    normalize(rows): NormalizedData {
        const staffMap = new Map<string, NormalizedData['staff'][0]>();
        const serviceMap = new Map<string, NormalizedData['services'][0]>();
        const customerMap = new Map<string, NormalizedData['customers'][0]>();
        const appointments: NormalizedData['appointments'] = [];
        const payments: NormalizedData['payments'] = [];
        const apptSeen = new Set<string>();

        for (const row of rows) {
            const apptId = pick(row, 'booking reference', 'booking ref', 'id', 'appointment id');
            const date = parseDate(
                pick(row, 'date', 'appointment date', 'booking date') + ' ' +
                pick(row, 'time', 'start time')
            );
            const status = pick(row, 'status', 'booking status');
            const customerName = pick(row, 'customer', 'customer name', 'client', 'client name');
            const customerEmail = pick(row, 'customer email', 'email');
            const customerPhone = pick(row, 'customer phone', 'phone');
            const staffName = pick(row, 'employee', 'staff', 'therapist');
            const serviceName = pick(row, 'treatment', 'service', 'service name');
            const price = parseCurrency(pick(row, 'price', 'service price', 'amount'));
            const paymentMethod = pick(row, 'payment method', 'payment type');

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
                    price: price ?? 0,
                    duration: 60,
                });
            }

            if (apptId && date && customerExtId && !apptSeen.has(apptId)) {
                apptSeen.add(apptId);
                appointments.push({
                    externalId: apptId,
                    date,
                    status: normalizeAppointmentStatus(status || 'completed'),
                    customerExternalId: customerExtId,
                    staffExternalId: staffName || undefined,
                    serviceExternalIds: serviceName ? [serviceExtId] : [],
                    priceAtBooking: price ?? 0,
                });
            }

            // Treatwell often doesn't export granular payment IDs — use booking ref as payment ID
            if (apptId && price !== null && status.toLowerCase().includes('complet')) {
                payments.push({
                    externalId: `pay-${apptId}`,
                    amount: price ?? 0,
                    status: 'COMPLETED',
                    method: normalizePaymentMethod(paymentMethod || 'card'),
                    paymentDate: date || new Date(),
                    customerExternalId: customerExtId,
                    appointmentExternalId: apptId,
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

export default Treatwell;
