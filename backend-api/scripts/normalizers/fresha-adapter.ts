/**
 * Fresha adapter — implements BaseAdapter with locale-aware parsing.
 * The old fresha.ts is kept untouched as a fallback; this replaces it
 * in the registry once import-data.ts is updated to use the registry.
 */
import { BaseAdapter, AdapterMeta } from './adapter-registry';
import { LocaleHint, parseLocaleDate, parseCurrencyValue, isSensibleDate } from './locale-engine';
import { normalizeAppointmentStatus, normalizePaymentStatus, normalizePaymentMethod } from './status-map';
import { NormalizedData } from './types';

function pick(row: Record<string, string>, ...candidates: string[]): string {
    for (const c of candidates) {
        const key = Object.keys(row).find(
            k => k.toLowerCase().trim() === c.toLowerCase().trim()
        );
        if (key !== undefined) return row[key]?.trim() ?? '';
    }
    return '';
}

export class FreshaAdapter implements BaseAdapter {
    readonly meta: AdapterMeta = {
        id: 'fresha',
        displayName: 'Fresha',
        description: 'Fresha / Treatwell-lite appointment export CSV',
    };

    detect(headers: string[]): boolean {
        const lc = headers.map(h => h.toLowerCase().trim());
        return ['appointment id', 'appointment ref', 'booking id'].some(s => lc.includes(s));
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
                const apptId        = pick(row, 'appointment id', 'appointment ref', 'booking id', 'id');
                const dateRaw       = pick(row, 'date', 'appointment date', 'booking date');
                const timeRaw       = pick(row, 'time', 'start time', 'appointment time');
                const apptStatus    = pick(row, 'appointment status', 'status', 'booking status');
                const customerName  = pick(row, 'customer name', 'client name', 'name');
                const customerEmail = pick(row, 'customer email', 'client email', 'email');
                const customerPhone = pick(row, 'customer phone', 'client phone', 'phone', 'mobile');
                const staffName     = pick(row, 'staff', 'staff name', 'therapist', 'stylist', 'employee');
                const serviceName   = pick(row, 'service', 'service name', 'treatment', 'treatment name');
                const servicePrice  = parseCurrencyValue(pick(row, 'service price', 'price', 'service amount'), locale);
                const paymentId     = pick(row, 'payment id', 'transaction id', 'payment ref');
                const paymentAmt    = parseCurrencyValue(pick(row, 'payment amount', 'amount paid', 'total', 'amount'), locale);
                const paymentMethod = pick(row, 'payment type', 'payment method', 'method');
                const paymentStatus = pick(row, 'payment status', 'transaction status');
                const paymentDateRaw = pick(row, 'payment date', 'transaction date');

                const parsed     = parseLocaleDate(dateRaw, locale, timeRaw);
                const payParsed  = parseLocaleDate(paymentDateRaw, locale);
                const date       = parsed?.date ?? null;
                const payDate    = payParsed?.date ?? null;

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
                        price: servicePrice ?? 0,
                        duration: 60,
                    });
                }

                if (apptId && !apptSeen.has(apptId)) {
                    apptSeen.add(apptId);
                    appointments.push({
                        externalId: apptId,
                        date,
                        status: normalizeAppointmentStatus(apptStatus || 'completed'),
                        customerExternalId: customerExtId,
                        staffExternalId: staffName || undefined,
                        serviceExternalIds: serviceName ? [serviceName] : [],
                        priceAtBooking: servicePrice ?? 0,
                    });
                }

                if (paymentId && paymentAmt !== null) {
                    payments.push({
                        externalId: paymentId,
                        amount: paymentAmt,
                        status: normalizePaymentStatus(paymentStatus || 'completed'),
                        method: normalizePaymentMethod(paymentMethod || 'card'),
                        paymentDate: payDate || date,
                        customerExternalId: customerExtId,
                        appointmentExternalId: apptId || undefined,
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
