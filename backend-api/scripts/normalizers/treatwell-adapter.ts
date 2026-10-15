/**
 * Treatwell adapter — implements BaseAdapter with locale-aware parsing.
 * Note: Treatwell does not export granular payment IDs.
 * We only create a payment record for COMPLETED appointments.
 * Booked-but-not-collected value is tracked via priceAtBooking on the appointment.
 */
import { BaseAdapter, AdapterMeta } from './adapter-registry';
import { LocaleHint, parseLocaleDate, parseCurrencyValue, isSensibleDate } from './locale-engine';
import { normalizeAppointmentStatus, normalizePaymentMethod } from './status-map';
import { NormalizedData } from './types';

function pick(row: Record<string, string>, ...candidates: string[]): string {
    for (const c of candidates) {
        const key = Object.keys(row).find(k => k.toLowerCase().trim() === c.toLowerCase().trim());
        if (key !== undefined) return row[key]?.trim() ?? '';
    }
    return '';
}

export class TreatwellAdapter implements BaseAdapter {
    readonly meta: AdapterMeta = {
        id: 'treatwell',
        displayName: 'Treatwell',
        description: 'Treatwell booking platform export CSV',
    };

    detect(headers: string[]): boolean {
        const lc = headers.map(h => h.toLowerCase().trim());
        return ['booking reference', 'venue', 'treatment'].some(s => lc.includes(s));
    }

    normalize(
        rows: Record<string, string>[],
        locale: LocaleHint,
    ): NormalizedData & { warnings: string[] } {
        const staffMap    = new Map<string, NormalizedData['staff'][0]>();
        const serviceMap  = new Map<string, NormalizedData['services'][0]>();
        const customerMap = new Map<string, NormalizedData['customers'][0]>();
        const appointments: NormalizedData['appointments'] = [];
        const payments: NormalizedData['payments'] = [];
        const warnings: string[] = [];
        const apptSeen = new Set<string>();

        for (const row of rows) {
            try {
                const apptId        = pick(row, 'booking reference', 'booking ref', 'id', 'appointment id');
                const dateRaw       = pick(row, 'date', 'appointment date', 'booking date');
                const timeRaw       = pick(row, 'time', 'start time');
                const status        = pick(row, 'status', 'booking status');
                const customerName  = pick(row, 'customer', 'customer name', 'client', 'client name');
                const customerEmail = pick(row, 'customer email', 'email');
                const customerPhone = pick(row, 'customer phone', 'phone');
                const staffName     = pick(row, 'employee', 'staff', 'therapist');
                const serviceName   = pick(row, 'treatment', 'service', 'service name');
                const price         = parseCurrencyValue(pick(row, 'price', 'service price', 'amount'), locale);
                const paymentMethod = pick(row, 'payment method', 'payment type');

                const parsed = parseLocaleDate(dateRaw, locale, timeRaw);
                const date   = parsed?.date ?? null;

                if (!date || !isSensibleDate(date)) {
                    if (apptId) warnings.push(`Row ${apptId}: skipped — unparseable date "${dateRaw}"`);
                    continue;
                }

                const customerExtId = customerEmail || customerName;
                if (!customerExtId) { warnings.push(`Row ${apptId}: skipped — no customer identifier`); continue; }

                if (!customerMap.has(customerExtId)) {
                    customerMap.set(customerExtId, {
                        externalId: customerExtId,
                        name: customerName,
                        email: customerEmail || undefined,
                        phone: customerPhone || undefined,
                    });
                }

                if (staffName && !staffMap.has(staffName)) {
                    staffMap.set(staffName, { externalId: staffName, name: staffName, role: 'Stylist' });
                }

                if (serviceName && !serviceMap.has(serviceName)) {
                    serviceMap.set(serviceName, {
                        externalId: serviceName,
                        name: serviceName,
                        price: price ?? 0,
                        duration: 60,
                    });
                }

                const normalizedStatus = normalizeAppointmentStatus(status || 'completed');

                if (apptId && !apptSeen.has(apptId)) {
                    apptSeen.add(apptId);
                    appointments.push({
                        externalId: apptId,
                        date,
                        status: normalizedStatus,
                        customerExternalId: customerExtId,
                        staffExternalId: staffName || undefined,
                        serviceExternalIds: serviceName ? [serviceName] : [],
                        priceAtBooking: price ?? 0,
                    });
                }

                // Treatwell has no payment ID column — only synthesise for completed appointments
                if (apptId && price !== null && normalizedStatus === 'COMPLETED') {
                    payments.push({
                        externalId: `pay-${apptId}`,
                        amount: price,
                        status: 'COMPLETED',
                        method: normalizePaymentMethod(paymentMethod || 'card'),
                        paymentDate: date,
                        customerExternalId: customerExtId,
                        appointmentExternalId: apptId,
                    });
                }
            } catch (err: any) {
                warnings.push(`Row skipped — ${err?.message ?? String(err)}`);
            }
        }

        return {
            staff: Array.from(staffMap.values()),
            services: Array.from(serviceMap.values()),
            customers: Array.from(customerMap.values()),
            appointments,
            payments,
            warnings,
        };
    }
}
