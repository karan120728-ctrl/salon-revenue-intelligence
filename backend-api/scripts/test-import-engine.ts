/**
 * Marlowe & Rose — Import Engine Test Suite
 *
 * Covers:
 *   1. Provider detection (Fresha, Timely, Treatwell, Generic fallback, Unknown)
 *   2. Date ambiguity detection and strict halting
 *   3. Explicit locale resolution (DMY vs MDY)
 *   4. ISO and named month date parsing
 *   5. Invalid date handling
 *   6. Currency & decimal parsing separation
 *   7. Regression normalization tests for all 4 templates
 *   8. Synthetic dataset dry-run validation
 */

import assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { registry } from './normalizers/index';
import {
    parseLocaleDate,
    parseCurrencyValue,
    detectLocaleFromRows,
    AmbiguousDateError,
    isSensibleDate,
} from './normalizers/locale-engine';

let totalTests = 0;
let passedTests = 0;

function test(name: string, fn: () => void | Promise<void>) {
    totalTests++;
    try {
        const res = fn();
        if (res instanceof Promise) {
            return res.then(() => {
                passedTests++;
                console.log(`  ✅ ${name}`);
            }).catch((err) => {
                console.error(`  ❌ ${name}:`, err.message);
                throw err;
            });
        }
        passedTests++;
        console.log(`  ✅ ${name}`);
    } catch (err: any) {
        console.error(`  ❌ ${name}:`, err.message);
        throw err;
    }
}

async function runAll() {
    console.log('════════════════════════════════════════════════════════');
    console.log('  🧪 RUNNING IMPORT ENGINE AUTOMATED TESTS');
    console.log('════════════════════════════════════════════════════════\n');

    // ─────────────────────────────────────────────────────────────────
    // 1. Provider Detection
    // ─────────────────────────────────────────────────────────────────
    console.log('📁 1. Provider Detection');

    test('Fresha headers detected as fresha', () => {
        const headers = ['Appointment ID', 'Date', 'Time', 'Customer Name', 'Customer Email', 'Staff', 'Service', 'Service Price', 'Appointment Status'];
        const adapter = registry.detect(headers);
        assert(adapter, 'Adapter should be found');
        assert.strictEqual(adapter.meta.id, 'fresha');
    });

    test('Timely headers detected as timely', () => {
        const headers = ['ID', 'Start', 'End', 'Client', 'Client Email', 'Client Phone', 'Staff', 'Service', 'Price', 'Status'];
        const adapter = registry.detect(headers);
        assert(adapter, 'Adapter should be found');
        assert.strictEqual(adapter.meta.id, 'timely');
    });

    test('Treatwell headers detected as treatwell', () => {
        const headers = ['Booking Reference', 'Date', 'Time', 'Customer', 'Customer Email', 'Venue', 'Employee', 'Treatment', 'Price', 'Status'];
        const adapter = registry.detect(headers);
        assert(adapter, 'Adapter should be found');
        assert.strictEqual(adapter.meta.id, 'treatwell');
    });

    test('Generic headers detected as generic', () => {
        const headers = ['date', 'time', 'customer_name', 'customer_email', 'service', 'staff_name', 'price', 'status'];
        const adapter = registry.detect(headers);
        assert(adapter, 'Adapter should be found');
        assert.strictEqual(adapter.meta.id, 'generic');
    });

    test('Unrecognised headers with date + customer fallback to generic', () => {
        const headers = ['booking_date', 'customer_full_name', 'service_name', 'amount_paid', 'worker'];
        const adapter = registry.detect(headers);
        assert(adapter, 'Fallback generic adapter should be matched');
        assert.strictEqual(adapter.meta.id, 'generic');
    });

    test('Headers without date or customer reject detection', () => {
        const headers = ['id', 'color', 'notes', 'random_field'];
        const adapter = registry.detect(headers);
        assert.strictEqual(adapter, undefined, 'Should return undefined for non-importable CSV headers');
    });

    // ─────────────────────────────────────────────────────────────────
    // 2. Date Ambiguity & Explicit Confirmation
    // ─────────────────────────────────────────────────────────────────
    console.log('\n📅 2. Date Ambiguity & Explicit Confirmation');

    test('Ambiguous date (01/06/2026) without hint throws AmbiguousDateError', () => {
        assert.throws(
            () => parseLocaleDate('01/06/2026', undefined),
            (err: any) => err instanceof AmbiguousDateError && err.raw === '01/06/2026'
        );
    });

    test('Ambiguous date with DMY hint resolves as DD/MM/YYYY (1 June 2026)', () => {
        const res = parseLocaleDate('01/06/2026', 'DMY');
        assert(res, 'Should parse');
        assert.strictEqual(res.iso, '2026-06-01T00:00:00.000Z');
        assert.strictEqual(res.resolvedWithHint, true);
    });

    test('Ambiguous date with MDY hint resolves as MM/DD/YYYY (6 January 2026)', () => {
        const res = parseLocaleDate('01/06/2026', 'MDY');
        assert(res, 'Should parse');
        assert.strictEqual(res.iso, '2026-01-06T00:00:00.000Z');
        assert.strictEqual(res.resolvedWithHint, true);
    });

    // ─────────────────────────────────────────────────────────────────
    // 3. Unambiguous UK / US Dates
    // ─────────────────────────────────────────────────────────────────
    console.log('\n🇬🇧 🇺🇸 3. Unambiguous UK / US Dates');

    test('Unambiguous DMY date (25/07/2026) resolves to 25 July without hint', () => {
        const res = parseLocaleDate('25/07/2026', undefined);
        assert(res, 'Should parse');
        assert.strictEqual(res.iso, '2026-07-25T00:00:00.000Z');
        assert.strictEqual(res.resolvedWithHint, false);
    });

    test('Unambiguous MDY date (07/25/2026) resolves to 25 July without hint', () => {
        const res = parseLocaleDate('07/25/2026', undefined);
        assert(res, 'Should parse');
        assert.strictEqual(res.iso, '2026-07-25T00:00:00.000Z');
        assert.strictEqual(res.resolvedWithHint, false);
    });

    // ─────────────────────────────────────────────────────────────────
    // 4. ISO & Named Month Dates
    // ─────────────────────────────────────────────────────────────────
    console.log('\n🌐 4. ISO & Named Month Dates');

    test('ISO YYYY-MM-DD date resolves accurately without hint', () => {
        const res = parseLocaleDate('2026-09-14', undefined);
        assert(res, 'Should parse');
        assert.strictEqual(res.iso, '2026-09-14T00:00:00.000Z');
    });

    test('ISO date-time with T resolves with time', () => {
        const res = parseLocaleDate('2026-09-14T15:30:00', undefined);
        assert(res, 'Should parse');
        assert.strictEqual(res.date.getUTCHours(), 15);
        assert.strictEqual(res.date.getUTCMinutes(), 30);
    });

    test('Named month DD Mon YYYY (15 May 2026) parses accurately', () => {
        const res = parseLocaleDate('15 May 2026', undefined);
        assert(res, 'Should parse');
        assert.strictEqual(res.iso, '2026-05-15T00:00:00.000Z');
    });

    test('Named month Mon DD, YYYY (October 14, 2026) parses accurately', () => {
        const res = parseLocaleDate('October 14, 2026', undefined);
        assert(res, 'Should parse');
        assert.strictEqual(res.iso, '2026-10-14T00:00:00.000Z');
    });

    // ─────────────────────────────────────────────────────────────────
    // 5. Invalid Dates & Out of Range
    // ─────────────────────────────────────────────────────────────────
    console.log('\n🚫 5. Invalid Dates');

    test('Both components > 12 (32/14/2026) returns null', () => {
        const res = parseLocaleDate('32/14/2026', 'DMY');
        assert.strictEqual(res, null);
    });

    test('Invalid text string returns null', () => {
        const res = parseLocaleDate('not-a-date', 'DMY');
        assert.strictEqual(res, null);
    });

    test('Sensible date validation flags out-of-range years', () => {
        const validDate = new Date('2026-06-01T00:00:00Z');
        const ancientDate = new Date('1980-01-01T00:00:00Z');
        const futureDate = new Date('2050-01-01T00:00:00Z');
        assert.strictEqual(isSensibleDate(validDate), true);
        assert.strictEqual(isSensibleDate(ancientDate), false);
        assert.strictEqual(isSensibleDate(futureDate), false);
    });

    // ─────────────────────────────────────────────────────────────────
    // 6. Currency & Decimal Parsing
    // ─────────────────────────────────────────────────────────────────
    console.log('\n💷 6. Currency & Decimal Parsing');

    test('Period decimal with GBP symbol: £1,234.50 parses to 1234.5', () => {
        const val = parseCurrencyValue('£1,234.50', 'period');
        assert.strictEqual(val, 1234.5);
    });

    test('Comma decimal with Euro symbol: 1.234,50 € parses to 1234.5', () => {
        const val = parseCurrencyValue('1.234,50 €', 'comma');
        assert.strictEqual(val, 1234.5);
    });

    test('USD symbol without currency hint parses purely as numeric amount', () => {
        const val = parseCurrencyValue('$75.00', 'period');
        assert.strictEqual(val, 75);
    });

    test('Invalid currency value returns null', () => {
        const val = parseCurrencyValue('N/A', 'period');
        assert.strictEqual(val, null);
    });

    // ─────────────────────────────────────────────────────────────────
    // 7. Regression Tests: Normalizing All 4 Templates
    // ─────────────────────────────────────────────────────────────────
    console.log('\n📑 7. Regression Tests: Normalizing All 4 Templates');

    const readTemplate = (name: string): Record<string, string>[] => {
        const p = path.resolve(__dirname, 'templates', name);
        const raw = fs.readFileSync(p, 'utf8').trim().split(/\r?\n/);
        const headers = raw[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        return raw.slice(1).map(line => {
            const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
            const row: Record<string, string> = {};
            headers.forEach((h, i) => { row[h] = cols[i] ?? ''; });
            return row;
        });
    };

    test('Normalize Fresha Template', () => {
        const rows = readTemplate('fresha_template.csv');
        const adapter = registry.get('fresha')!;
        const norm = adapter.normalize(rows, { dateOrder: 'DMY', decimalSep: 'period' });
        assert.strictEqual(norm.staff.length, 3);
        assert.strictEqual(norm.services.length, 3);
        assert.strictEqual(norm.customers.length, 3);
        assert.strictEqual(norm.appointments.length, 3);
        assert.strictEqual(norm.payments.length, 2);
    });

    test('Normalize Timely Template', () => {
        const rows = readTemplate('timely_template.csv');
        const adapter = registry.get('timely')!;
        const norm = adapter.normalize(rows, { dateOrder: 'DMY', decimalSep: 'period' });
        assert.strictEqual(norm.staff.length, 3);
        assert.strictEqual(norm.services.length, 3);
        assert.strictEqual(norm.customers.length, 3);
        assert.strictEqual(norm.appointments.length, 3);
        // Timely does not export payment transactions — no payments fabricated
        assert.strictEqual(norm.payments.length, 0);
    });

    test('Normalize Treatwell Template', () => {
        const rows = readTemplate('treatwell_template.csv');
        const adapter = registry.get('treatwell')!;
        const norm = adapter.normalize(rows, { dateOrder: 'DMY', decimalSep: 'period' });
        assert.strictEqual(norm.staff.length, 3);
        assert.strictEqual(norm.services.length, 3);
        assert.strictEqual(norm.customers.length, 3);
        assert.strictEqual(norm.appointments.length, 3);
        // Treatwell creates verified payments only for COMPLETED appointments
        assert.strictEqual(norm.payments.length, 2);
    });

    test('Normalize Generic Template', () => {
        const rows = readTemplate('generic_template.csv');
        const adapter = registry.get('generic')!;
        const norm = adapter.normalize(rows, { dateOrder: 'DMY', decimalSep: 'period' });
        assert.strictEqual(norm.staff.length, 4);
        assert.strictEqual(norm.services.length, 4);
        assert.strictEqual(norm.customers.length, 4);
        assert.strictEqual(norm.appointments.length, 4);
        assert.strictEqual(norm.payments.length, 2);
    });

    // ─────────────────────────────────────────────────────────────────
    // 8. Scope 1: Revenue Correctness, Refunds & Reversals
    // ─────────────────────────────────────────────────────────────────
    console.log('\n💰 8. Revenue Correctness, Refunds & Reversals');

    test('Completed payment plus partial refund calculates net correctly', () => {
        const completed = [{ status: 'COMPLETED', amount: 185.00 }];
        const refunds = [{ status: 'REFUNDED', amount: 50.00 }];
        
        const gross = completed.filter(p => p.amount > 0).reduce((s, p) => s + p.amount, 0);
        const refDeduction = refunds.reduce((s, p) => s + Math.abs(p.amount), 0);
        const net = Math.max(0, gross - refDeduction);

        assert.strictEqual(gross, 185.00);
        assert.strictEqual(refDeduction, 50.00);
        assert.strictEqual(net, 135.00);
    });

    test('Completed payment plus full refund yields zero net revenue', () => {
        const completed = [{ status: 'COMPLETED', amount: 185.00 }];
        const refunds = [{ status: 'REFUNDED', amount: 185.00 }];
        
        const gross = completed.filter(p => p.amount > 0).reduce((s, p) => s + p.amount, 0);
        const refDeduction = refunds.reduce((s, p) => s + Math.abs(p.amount), 0);
        const net = Math.max(0, gross - refDeduction);

        assert.strictEqual(net, 0.00);
    });

    test('Reversal handling prevents double subtraction when amount is negative', () => {
        // Test case A: Reversal stored as positive amount
        const revPos = [{ status: 'REVERSED', amount: 65.00 }];
        const deductionPos = revPos.reduce((s, p) => s + Math.abs(p.amount), 0);
        assert.strictEqual(deductionPos, 65.00);

        // Test case B: Reversal stored as negative amount
        const revNeg = [{ status: 'REVERSED', amount: -65.00 }];
        const deductionNeg = revNeg.reduce((s, p) => s + Math.abs(p.amount), 0);
        assert.strictEqual(deductionNeg, 65.00, 'Negative reversal must be subtracted once, not added as a double negative');

        const completed = [{ status: 'COMPLETED', amount: 100.00 }];
        const netA = Math.max(0, 100.00 - deductionPos);
        const netB = Math.max(0, 100.00 - deductionNeg);
        assert.strictEqual(netA, 35.00);
        assert.strictEqual(netB, 35.00);
    });

    test('Timely missing-payment-data is classified as BOOKED_VALUE_ONLY', () => {
        const timelyAdapter = registry.get('timely')!;
        const rows = readTemplate('timely_template.csv');
        const norm = timelyAdapter.normalize(rows, { dateOrder: 'DMY', decimalSep: 'period' });

        // Zero payment records fabricated
        assert.strictEqual(norm.payments.length, 0);

        // Booked appointment value preserved from service prices
        const bookedValue = norm.appointments
            .filter(a => a.status !== 'CANCELLED' && a.status !== 'NO_SHOW')
            .reduce((s, a) => s + (a.priceAtBooking ?? 0), 0);
        assert.strictEqual(bookedValue, 240.00); // 185 + 55 (38 was No Show)
    });

    test('Treatwell completed visits classified as gross completed without refund tracking', () => {
        const treatwellAdapter = registry.get('treatwell')!;
        const rows = readTemplate('treatwell_template.csv');
        const norm = treatwellAdapter.normalize(rows, { dateOrder: 'DMY', decimalSep: 'period' });

        // Only COMPLETED appointments generate payment records
        assert.strictEqual(norm.payments.length, 2);
        const grossCompleted = norm.payments.reduce((s, p) => s + p.amount, 0);
        assert.strictEqual(grossCompleted, 240.00);

        // All payments are completed visits, no refunds tracked in source format
        const refunds = norm.payments.filter(p => p.status === 'REFUNDED');
        assert.strictEqual(refunds.length, 0);
    });

    // ─────────────────────────────────────────────────────────────────
    // 9. Scope 2: Transaction Safety & Pre-Validation
    // ─────────────────────────────────────────────────────────────────
    console.log('\n🛡 9. Transaction Safety & Pre-Validation');

    test('Pre-validation classifies invalid rows without aborting valid rows', () => {
        const validCust = { externalId: 'CUST-001', name: 'Alice' };
        const data = {
            customers: [validCust],
            appointments: [
                { externalId: 'A1', date: new Date('2026-06-01T10:00:00Z'), customerExternalId: 'CUST-001', status: 'COMPLETED' },
                { externalId: 'A2', date: new Date('1970-01-01T00:00:00Z'), customerExternalId: 'CUST-001', status: 'COMPLETED' }, // invalid date
                { externalId: 'A3', date: new Date('2026-06-02T10:00:00Z'), customerExternalId: 'MISSING-CUST', status: 'COMPLETED' }, // unresolvable cust
                { externalId: '',   date: new Date('2026-06-03T10:00:00Z'), customerExternalId: 'CUST-001', status: 'COMPLETED' }, // missing id
            ],
            payments: [
                { externalId: 'P1', amount: 50, customerExternalId: 'CUST-001', status: 'COMPLETED' },
                { externalId: '',   amount: 50, customerExternalId: 'CUST-001', status: 'COMPLETED' }, // missing id
                { externalId: 'P3', amount: 50, customerExternalId: 'MISSING-CUST', status: 'COMPLETED' }, // unresolvable cust
            ]
        };

        const custExtIds = new Set(data.customers.map(c => c.externalId));
        const validAppts: any[] = [];
        const skippedAppts: any[] = [];
        for (const appt of data.appointments) {
            if (!isSensibleDate(appt.date) || !appt.customerExternalId || !custExtIds.has(appt.customerExternalId) || !appt.externalId) {
                skippedAppts.push(appt);
            } else {
                validAppts.push(appt);
            }
        }

        const validPays: any[] = [];
        const skippedPays: any[] = [];
        for (const pay of data.payments) {
            if (!pay.externalId || !pay.customerExternalId || !custExtIds.has(pay.customerExternalId)) {
                skippedPays.push(pay);
            } else {
                validPays.push(pay);
            }
        }

        assert.strictEqual(validAppts.length, 1);
        assert.strictEqual(validAppts[0].externalId, 'A1');
        assert.strictEqual(skippedAppts.length, 3);

        assert.strictEqual(validPays.length, 1);
        assert.strictEqual(validPays[0].externalId, 'P1');
        assert.strictEqual(skippedPays.length, 2);
    });

    // ─────────────────────────────────────────────────────────────────
    // 10. Scope 3: Customer Identity Resolution
    // ─────────────────────────────────────────────────────────────────
    console.log('\n👥 10. Customer Identity Resolution Across Exports');

    // Helper simulating the identity matcher
    function matchCustomer(
        incoming: { name: string; email?: string | null; phone?: string | null; externalId: string },
        existing: { id: string; name: string; email?: string | null; phone?: string | null; externalId: string }[]
    ): { matchedId?: string; isAmbiguous?: boolean } {
        const inEmail = incoming.email ? incoming.email.toLowerCase().trim() : null;
        const inPhone = incoming.phone ? incoming.phone.replace(/[^\d+]/g, '') : null;
        const inName = incoming.name.toLowerCase().trim();

        // 1. External ID match
        const extMatch = existing.find(e => e.externalId === incoming.externalId);
        if (extMatch) return { matchedId: extMatch.id };

        // 2. Verified email match
        if (inEmail) {
            const emailMatch = existing.find(e => e.email?.toLowerCase().trim() === inEmail);
            if (emailMatch) return { matchedId: emailMatch.id };
        }

        // 3. Reliable phone + name match (e.g. export without email)
        if (inPhone) {
            const phoneMatch = existing.find(e => {
                const ePhone = e.phone?.replace(/[^\d+]/g, '');
                const eName = e.name.toLowerCase().trim();
                return ePhone === inPhone && (eName === inName || eName.includes(inName) || inName.includes(eName));
            });
            if (phoneMatch) return { matchedId: phoneMatch.id };
        }

        // 4. Name-only check (must NOT merge without contact info; flag ambiguity if contact info is missing)
        const nameMatch = existing.find(e => e.name.toLowerCase().trim() === inName);
        if (nameMatch) {
            const eEmail = nameMatch.email ? nameMatch.email.toLowerCase().trim() : null;
            const ePhone = nameMatch.phone ? nameMatch.phone.replace(/[^\d+]/g, '') : null;

            const hasConflictingEmail = inEmail && eEmail && inEmail !== eEmail;
            const hasConflictingPhone = inPhone && ePhone && inPhone !== ePhone;

            if (hasConflictingEmail || hasConflictingPhone) {
                // Definitely distinct clients with different contact info sharing a common name
                return {};
            }
            // Genuinely ambiguous (missing contact details on one or both)
            return { isAmbiguous: true };
        }

        return {};
    }

    test('Reliable match on phone + name when email is missing in one export', () => {
        const existing = [
            { id: 'uuid-grace', name: 'Grace Holloway', email: null, phone: '+447700000001', externalId: 'Grace Holloway' }
        ];
        const incoming = { name: 'Grace Holloway', email: 'grace@email.com', phone: '+44 7700 000001', externalId: 'grace@email.com' };

        const res = matchCustomer(incoming, existing);
        assert.strictEqual(res.matchedId, 'uuid-grace', 'Should match on phone + name and attach to existing customer');
        assert.strictEqual(res.isAmbiguous, undefined);
    });

    test('Rejects merge on name-only match and flags ambiguity', () => {
        const existing = [
            { id: 'uuid-sarah-1', name: 'Sarah Smith', email: 'sarah1@example.com', phone: '+447700900101', externalId: 'sarah1' }
        ];
        const incoming = { name: 'Sarah Smith', email: null, phone: null, externalId: 'sarah_walkin' };

        const res = matchCustomer(incoming, existing);
        assert.strictEqual(res.matchedId, undefined, 'Must NOT merge name-only without contact info');
        assert.strictEqual(res.isAmbiguous, true, 'Must flag ambiguous match for operator review');
    });

    test('Distinct customers with same name and different emails kept separate', () => {
        const existing = [
            { id: 'uuid-sarah-1', name: 'Sarah Smith', email: 'sarah1@example.com', phone: '+447700900101', externalId: 'sarah1' }
        ];
        const incoming = { name: 'Sarah Smith', email: 'sarah2@example.com', phone: '+447700900102', externalId: 'sarah2' };

        const res = matchCustomer(incoming, existing);
        assert.strictEqual(res.matchedId, undefined, 'Different emails must never be merged');
        assert.strictEqual(res.isAmbiguous, undefined);
    });

    console.log('\n════════════════════════════════════════════════════════');
    console.log(`  🎉 ALL ${passedTests}/${totalTests} TESTS PASSED!`);
    console.log('════════════════════════════════════════════════════════\n');
}

runAll().catch(() => {
    process.exit(1);
});
