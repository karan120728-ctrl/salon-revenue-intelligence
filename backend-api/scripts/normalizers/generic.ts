import { Normalizer, NormalizedData } from './types';
import { normalizeAppointmentStatus, normalizePaymentStatus, normalizePaymentMethod } from './status-map';
import { parseDate, parseCurrency } from './date-utils';

/**
 * Generic / universal CSV normalizer — the fallback for any unrecognized format.
 *
 * This is also used when you send a manual template to a salon that doesn't use
 * a supported booking system. See scripts/templates/generic_template.csv for the
 * exact column spec you send to the client.
 *
 * Required columns (case-insensitive, trimmed):
 *   appointment_id, date, customer_name, staff_name, service_name, price, status
 *
 * Optional:
 *   customer_email, customer_phone, payment_id, payment_amount,
 *   payment_method, payment_status, payment_date
 */
const Generic: Normalizer = {
    detect(_headers) {
        // Always a fallback — never auto-detected, but always available
        return false;
    },

    normalize(rows): NormalizedData {
        const staffMap = new Map<string, NormalizedData['staff'][0]>();
        const serviceMap = new Map<string, NormalizedData['services'][0]>();
        const customerMap = new Map<string, NormalizedData['customers'][0]>();
        const appointments: NormalizedData['appointments'] = [];
        const payments: NormalizedData['payments'] = [];
        const apptSeen = new Set<string>();

        function pick(row: Record<string, string>, ...candidates: string[]): string {
            for (const c of candidates) {
                const key = Object.keys(row).find(
                    k => k.toLowerCase().trim().replace(/[_\-\s]/g, '') === c.toLowerCase().replace(/[_\-\s]/g, '')
                );
                if (key !== undefined) return row[key]?.trim() ?? '';
            }
            return '';
        }

        for (const row of rows) {
            const apptId = pick(row, 'appointment_id', 'appointment id', 'id', 'booking_id', 'booking id');
            const date = parseDate(
                pick(row, 'date', 'appointment_date', 'appointment date') + ' ' +
                pick(row, 'time', 'start_time', 'start time')
            );
            const status = pick(row, 'status', 'appointment_status', 'appointment status');
            const customerName = pick(row, 'customer_name', 'customer name', 'client_name', 'client name');
            const customerEmail = pick(row, 'customer_email', 'customer email', 'email');
            const customerPhone = pick(row, 'customer_phone', 'customer phone', 'phone', 'mobile');
            const staffName = pick(row, 'staff_name', 'staff name', 'staff', 'stylist', 'employee');
            const serviceName = pick(row, 'service_name', 'service name', 'service', 'treatment');
            const price = parseCurrency(pick(row, 'price', 'service_price', 'service price', 'amount'));
            const paymentId = pick(row, 'payment_id', 'payment id', 'transaction_id', 'transaction id');
            const paymentAmount = parseCurrency(pick(row, 'payment_amount', 'payment amount', 'amount_paid', 'amount paid'));
            const paymentMethod = pick(row, 'payment_method', 'payment method', 'method');
            const paymentStatus = pick(row, 'payment_status', 'payment status');
            const paymentDate = parseDate(pick(row, 'payment_date', 'payment date'));

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

export default Generic;
