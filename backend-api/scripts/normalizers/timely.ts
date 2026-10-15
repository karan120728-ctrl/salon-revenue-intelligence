import { Normalizer, NormalizedData } from './types';
import { normalizeAppointmentStatus, normalizePaymentStatus, normalizePaymentMethod } from './status-map';
import { parseDate, parseCurrency } from './date-utils';

/**
 * Timely CSV export normalizer.
 * Timely exports often include columns like:
 * ID, Start, End, Client, Client Email, Client Phone,
 * Staff, Service, Price, Payment, Payment Method, Status
 */
const timelyHeaders = ['start', 'end', 'client'];

function pick(row: Record<string, string>, ...candidates: string[]): string {
    for (const c of candidates) {
        const key = Object.keys(row).find(k => k.toLowerCase().trim() === c.toLowerCase().trim());
        if (key !== undefined) return row[key]?.trim() ?? '';
    }
    return '';
}

const Timely: Normalizer = {
    detect(headers) {
        const lc = headers.map(h => h.toLowerCase().trim());
        return timelyHeaders.every(s => lc.includes(s));
    },

    normalize(rows): NormalizedData {
        const staffMap = new Map<string, NormalizedData['staff'][0]>();
        const serviceMap = new Map<string, NormalizedData['services'][0]>();
        const customerMap = new Map<string, NormalizedData['customers'][0]>();
        const appointments: NormalizedData['appointments'] = [];
        const payments: NormalizedData['payments'] = [];
        const apptSeen = new Set<string>();

        for (const row of rows) {
            const apptId = pick(row, 'id', 'appointment id', 'booking id');
            const start = parseDate(pick(row, 'start', 'start date', 'start time'));
            const status = pick(row, 'status', 'appointment status');
            const clientName = pick(row, 'client', 'client name', 'customer', 'customer name');
            const clientEmail = pick(row, 'client email', 'email');
            const clientPhone = pick(row, 'client phone', 'phone', 'mobile');
            const staffName = pick(row, 'staff', 'staff member', 'employee', 'provider');
            const serviceName = pick(row, 'service', 'service name', 'treatment');
            const price = parseCurrency(pick(row, 'price', 'service price', 'amount'));
            const paymentId = pick(row, 'payment id', 'transaction id');
            const paymentAmount = parseCurrency(pick(row, 'payment', 'amount paid', 'paid'));
            const paymentMethod = pick(row, 'payment method', 'payment type');
            const paymentStatus = pick(row, 'payment status');

            const customerExtId = clientEmail || clientName;
            const staffExtId = staffName;
            const serviceExtId = serviceName;

            if (customerExtId && !customerMap.has(customerExtId)) {
                customerMap.set(customerExtId, {
                    externalId: customerExtId,
                    name: clientName,
                    email: clientEmail || undefined,
                    phone: clientPhone || undefined,
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

            if (apptId && start && customerExtId && !apptSeen.has(apptId)) {
                apptSeen.add(apptId);
                appointments.push({
                    externalId: apptId,
                    date: start,
                    status: normalizeAppointmentStatus(status || 'completed'),
                    customerExternalId: customerExtId,
                    staffExternalId: staffName || undefined,
                    serviceExternalIds: serviceName ? [serviceExtId] : [],
                    priceAtBooking: price ?? 0,
                });
            }

            if (paymentId && paymentAmount !== null) {
                payments.push({
                    externalId: paymentId,
                    amount: paymentAmount,
                    status: normalizePaymentStatus(paymentStatus || 'completed'),
                    method: normalizePaymentMethod(paymentMethod || 'card'),
                    paymentDate: start || new Date(),
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

export default Timely;
