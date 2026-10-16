/**
 * Generic adapter — universal fallback for any unrecognised CSV format.
 * Also used with the standard generic_template.csv we send to salons
 * that don't use a supported booking system.
 *
 * isGenericFallback = true → always tried last, always returns detect()=true
 */
import { BaseAdapter, AdapterMeta } from './adapter-registry';
import { LocaleHint, parseLocaleDate, parseCurrencyValue, isSensibleDate } from './locale-engine';
import { normalizeAppointmentStatus, normalizePaymentStatus, normalizePaymentMethod } from './status-map';
import { NormalizedData } from './types';

function pick(row: Record<string, string>, ...candidates: string[]): string {
    for (const c of candidates) {
        const key = Object.keys(row).find(
            k => k.toLowerCase().trim().replace(/[_\-\s]/g, '') ===
                 c.toLowerCase().replace(/[_\-\s]/g, '')
        );
        if (key !== undefined) return row[key]?.trim() ?? '';
    }
    return '';
}

export class GenericAdapter implements BaseAdapter {
    readonly meta: AdapterMeta = {
        id: 'generic',
        displayName: 'Generic / Custom CSV',
        description: 'Universal fallback — accepts any CSV with date and customer columns',
        isGenericFallback: true,
    };

    detect(headers: string[]): boolean {
        const lc = headers.map(h => h.toLowerCase().trim().replace(/[_\-\s]/g, ''));
        const hasDate = lc.some(h => h.includes('date') || h.includes('time') || h.includes('start'));
        const hasCustomer = lc.some(h => h.includes('customer') || h.includes('client') || h.includes('name'));
        return hasDate && hasCustomer;
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
                const apptId        = pick(row, 'appointment reference', 'appointment_reference', 'booking reference', 'booking_reference', 'appointment_id', 'appointment id', 'booking_ref', 'booking ref', 'id', 'booking_id', 'booking id', 'reference', 'ref');
                const dateRaw       = pick(row, 'date', 'appointment_date', 'appointment date', 'booking_date');
                const timeRaw       = pick(row, 'time', 'start_time', 'start time', 'appointment_time');
                const status        = pick(row, 'status', 'booking_state', 'booking state', 'appointment_status', 'appointment status', 'state');
                const customerName  = pick(row, 'customer_name', 'customer name', 'client_full_name', 'client full name', 'client_name', 'client name', 'customer', 'client', 'name');
                const customerEmail = pick(row, 'customer_email', 'customer email', 'client_email_address', 'client email address', 'client_email', 'client email', 'email');
                const customerPhone = pick(row, 'customer_phone', 'customer phone', 'mobile_number', 'mobile number', 'mobile', 'phone', 'telephone', 'client_phone');
                const staffName     = pick(row, 'staff_name', 'staff name', 'team_member', 'team member', 'team', 'staff', 'stylist', 'therapist', 'employee');
                const serviceName   = pick(row, 'service_name', 'service name', 'treatment_description', 'treatment description', 'treatment', 'service', 'service_description', 'item');
                const price         = parseCurrencyValue(pick(row, 'price', 'appointment_price_gbp', 'appointment price gbp', 'price_gbp', 'service_price', 'service price', 'amount', 'cost', 'total'), locale);
                const paymentId     = pick(row, 'payment_id', 'payment id', 'transaction_reference', 'transaction reference', 'transaction_ref', 'transaction_id', 'transaction id', 'payment_ref');
                const paymentAmt    = parseCurrencyValue(pick(row, 'payment_amount', 'payment amount', 'amount_paid_gbp', 'amount paid gbp', 'amount_paid', 'amount paid', 'paid_amount', 'amount'), locale);
                const refundAmt     = parseCurrencyValue(pick(row, 'refund_amount_gbp', 'refund amount gbp', 'refund_amount', 'refund amount', 'refund', 'refund_gbp'), locale);
                const paymentMethod = pick(row, 'payment_method', 'payment method', 'method');
                const paymentStatus = pick(row, 'payment_status', 'payment status', 'payment_state', 'payment state');
                const payDateRaw    = pick(row, 'payment_date', 'payment date', 'transaction_date', 'transaction date');

                const parsed  = parseLocaleDate(dateRaw, locale, timeRaw);
                const payParsed = parseLocaleDate(payDateRaw, locale);
                const date    = parsed?.date ?? null;
                const payDate = payParsed?.date ?? null;

                if (!date || !isSensibleDate(date)) {
                    if (apptId) warnings.push(`Row ${apptId}: skipped — unparseable date "${dateRaw}"`);
                    continue;
                }

                // Customer identification: match by phone if email missing, or name+phone
                let customerExtId = customerEmail;
                if (!customerExtId && customerPhone && customerName) {
                    customerExtId = `${customerName.toLowerCase().replace(/\s+/g, '_')}_${customerPhone.replace(/\D/g, '')}`;
                } else if (!customerExtId) {
                    customerExtId = customerPhone || customerName;
                }

                if (!customerExtId) { warnings.push(`Row ${apptId}: skipped — no customer identifier`); continue; }

                // Dedup Grace Holloway if first seen by phone then later email becomes available
                let existingCustKey = customerMap.has(customerExtId) ? customerExtId : null;
                if (!existingCustKey && customerPhone) {
                    for (const [k, v] of customerMap.entries()) {
                        if (v.phone && v.phone.replace(/\D/g, '') === customerPhone.replace(/\D/g, '') && v.name.toLowerCase() === customerName.toLowerCase()) {
                            existingCustKey = k;
                            if (customerEmail && !v.email) v.email = customerEmail;
                            break;
                        }
                    }
                }

                if (existingCustKey) {
                    customerExtId = existingCustKey;
                } else {
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

                // Payment record
                const effectivePayId = paymentId || (paymentAmt !== null && paymentAmt > 0 && apptId ? `PAY-${apptId}` : '');
                if (effectivePayId && paymentAmt !== null && paymentAmt > 0) {
                    payments.push({
                        externalId: effectivePayId,
                        amount: paymentAmt,
                        status: normalizePaymentStatus(paymentStatus || 'completed'),
                        method: normalizePaymentMethod(paymentMethod || 'card'),
                        paymentDate: payDate || date,
                        customerExternalId: customerExtId,
                        appointmentExternalId: apptId || undefined,
                    });
                }

                // Refund record if present
                if (refundAmt !== null && refundAmt > 0) {
                    payments.push({
                        externalId: `REF-${effectivePayId || apptId}`,
                        amount: -Math.abs(refundAmt),
                        status: 'REFUNDED',
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
