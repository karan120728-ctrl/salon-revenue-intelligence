/**
 * Timely adapter — implements BaseAdapter with locale-aware parsing.
 */
import { BaseAdapter, AdapterMeta } from './adapter-registry';
import { LocaleHint, parseLocaleDate, parseCurrencyValue, isSensibleDate } from './locale-engine';
import { normalizeAppointmentStatus, normalizePaymentStatus, normalizePaymentMethod } from './status-map';
import { NormalizedData } from './types';

function pick(row: Record<string, string>, ...candidates: string[]): string {
    for (const c of candidates) {
        const key = Object.keys(row).find(k => k.toLowerCase().trim() === c.toLowerCase().trim());
        if (key !== undefined) return row[key]?.trim() ?? '';
    }
    return '';
}

export class TimelyAdapter implements BaseAdapter {
    readonly meta: AdapterMeta = {
        id: 'timely',
        displayName: 'Timely',
        description: 'Timely appointment management export CSV',
    };

    detect(headers: string[]): boolean {
        const lc = headers.map(h => h.toLowerCase().trim());
        // Timely signature: has "start", "end", and "client" columns together
        return ['start', 'end', 'client'].every(s => lc.includes(s));
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
                const apptId        = pick(row, 'id', 'appointment id', 'booking id');
                const startRaw      = pick(row, 'start', 'start date', 'start time');
                const status        = pick(row, 'status', 'appointment status');
                const clientName    = pick(row, 'client', 'client name', 'customer', 'customer name');
                const clientEmail   = pick(row, 'client email', 'email');
                const clientPhone   = pick(row, 'client phone', 'phone', 'mobile');
                const staffName     = pick(row, 'staff', 'staff member', 'employee', 'provider');
                const serviceName   = pick(row, 'service', 'service name', 'treatment');
                const price         = parseCurrencyValue(pick(row, 'price', 'service price', 'amount'), locale);
                const paymentId     = pick(row, 'payment id', 'transaction id');
                const paymentAmt    = parseCurrencyValue(pick(row, 'payment', 'amount paid', 'paid'), locale);
                const paymentMethod = pick(row, 'payment method', 'payment type');
                const paymentStatus = pick(row, 'payment status');

                const parsed = parseLocaleDate(startRaw, locale);
                const date   = parsed?.date ?? null;

                if (!date || !isSensibleDate(date)) {
                    if (apptId) warnings.push(`Row ${apptId}: skipped — unparseable start "${startRaw}"`);
                    continue;
                }

                const customerExtId = clientEmail || clientName;
                if (!customerExtId) { warnings.push(`Row ${apptId}: skipped — no client identifier`); continue; }

                if (!customerMap.has(customerExtId)) {
                    customerMap.set(customerExtId, {
                        externalId: customerExtId,
                        name: clientName,
                        email: clientEmail || undefined,
                        phone: clientPhone || undefined,
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

                if (apptId && !apptSeen.has(apptId)) {
                    apptSeen.add(apptId);
                    appointments.push({
                        externalId: apptId,
                        date,
                        status: normalizeAppointmentStatus(status || 'completed'),
                        customerExternalId: customerExtId,
                        staffExternalId: staffName || undefined,
                        serviceExternalIds: serviceName ? [serviceName] : [],
                        priceAtBooking: price ?? 0,
                    });
                }

                if (paymentId && paymentAmt !== null) {
                    payments.push({
                        externalId: paymentId,
                        amount: paymentAmt,
                        status: normalizePaymentStatus(paymentStatus || 'completed'),
                        method: normalizePaymentMethod(paymentMethod || 'card'),
                        paymentDate: date,
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
