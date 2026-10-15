#!/usr/bin/env tsx
/**
 * Marlowe & Rose — Salon Onboarding CSV Importer  (v2 — locale-aware)
 *
 * 8-stage pipeline (unchanged stages noted):
 *   1. Detect source    — via adapter registry (plug-in, not hardcoded list)
 *   2. Locale sniff     — NEW: detect / confirm date order + decimal sep
 *   3. Schema validate  — (unchanged) required columns, row count
 *   4. Normalize        — via locale-aware adapter (uses new locale engine)
 *   5. Relationship validate — (unchanged) cross-reference IDs + bad dates
 *   6. Dry run          — (unchanged) zero DB writes, preview counts
 *   7. Idempotent import — (unchanged) upsert via salonId+sourceSystem+externalId
 *   8. Recalculate metrics  — (unchanged)
 *   9. Import report + audit log — (unchanged)
 *
 * NEW flags:
 *   --locale=DMY        Force DD/MM/YYYY date order (UK / AU / India / most of EU)
 *   --locale=MDY        Force MM/DD/YYYY date order (US)
 *   --decimal=comma     Force European comma-decimal (1.234,56)
 *   --decimal=period    Force UK/US period-decimal (1,234.56)  [default]
 *   --list-sources      Print all registered adapters and exit
 *
 * EXISTING flags (unchanged):
 *   --file=<path>
 *   --salon-id=<uuid>  or  --salon-name=<name> + --owner-email=<email>
 *   --dry-run
 *
 * SAFETY:
 *   - If any date is ambiguous (both DD and MM ≤ 12) and no --locale is
 *     supplied, the import STOPS with a clear error listing the ambiguous
 *     values and how to resolve them.  It never silently guesses.
 *   - Payment records are only created when the source CSV contains an
 *     explicit payment identifier OR (Treatwell-style) a confirmed COMPLETED
 *     status.  priceAtBooking on the appointment tracks booked-but-unverified
 *     revenue separately from actual collected payments.
 *   - No frontend, schema, or demo changes.
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// New engine + registry
import { registry } from './normalizers/index';
import {
    AmbiguousDateError,
    detectLocaleFromRows,
    isSensibleDate,
} from './normalizers/locale-engine';
import type { LocaleHint, DateOrder, DecimalSep } from './normalizers/locale-engine';

// Keep old types for the relationship validator (unchanged)
import { NormalizedData } from './normalizers/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const prisma = new PrismaClient();

function parseArgs(): Record<string, string> {
    const args: Record<string, string> = {};
    for (const arg of process.argv.slice(2)) {
        const [k, ...v] = arg.replace(/^--/, '').split('=');
        args[k] = v.join('=');
    }
    return args;
}

function parseCSV(content: string): Record<string, string>[] {
    const lines = content.split(/\r?\n/).filter(l => l.trim() !== '');
    if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row.');

    function parseLine(line: string): string[] {
        const result: string[] = [];
        let inQuote = false;
        let field = '';
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                inQuote = !inQuote;
            } else if (ch === ',' && !inQuote) {
                result.push(field);
                field = '';
            } else {
                field += ch;
            }
        }
        result.push(field);
        return result;
    }

    const headers = parseLine(lines[0]).map(h => h.trim());
    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
        const vals = parseLine(lines[i]);
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = vals[idx]?.trim() ?? ''; });
        rows.push(row);
    }
    return rows;
}

// ── Stages ────────────────────────────────────────────────────────────────────

// Stage 2 (new): Schema validation — unchanged logic, same rules
interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

function validateSchema(headers: string[], rows: Record<string, string>[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const lc = headers.map(h => h.toLowerCase().trim());

    const hasDate = lc.some(h => h.includes('date') || h.includes('start'));
    const hasCustomer = lc.some(h => h.includes('customer') || h.includes('client'));
    const hasId = lc.some(h => h.includes('id') || h.includes('ref') || h.includes('reference'));

    if (!hasDate) errors.push('No date column found. Need a column containing "date" or "start".');
    if (!hasCustomer) errors.push('No customer column found. Need a column containing "customer" or "client".');
    if (!hasId) warnings.push('No appointment ID column found. Idempotency requires a stable ID.');

    if (rows.length === 0) errors.push('File has no data rows.');
    if (rows.length > 100_000) warnings.push(`Large import: ${rows.length} rows. Consider splitting into chunks of 10,000.`);

    return { valid: errors.length === 0, errors, warnings };
}

// Stage 3: Locale resolution — NEW
interface LocaleResolution {
    hint: LocaleHint;
    sniffWarnings: string[];
    ambiguousRows: string[];
}

function resolveLocale(
    rows: Record<string, string>[],
    headers: string[],
    argLocale: string | undefined,
    argDecimal: string | undefined,
): LocaleResolution {
    const sniffWarnings: string[] = [];

    // Build LocaleHint from explicit args first
    let dateOrder: DateOrder | undefined;
    let decimalSep: DecimalSep | undefined;

    if (argLocale) {
        const up = argLocale.toUpperCase();
        if (up === 'DMY' || up === 'MDY') {
            dateOrder = up as DateOrder;
        } else {
            console.error(`❌ Unknown --locale="${argLocale}". Valid values: DMY, MDY`);
            process.exit(1);
        }
    }

    if (argDecimal) {
        const lo = argDecimal.toLowerCase();
        if (lo === 'comma' || lo === 'period') {
            decimalSep = lo as DecimalSep;
        } else {
            console.error(`❌ Unknown --decimal="${argDecimal}". Valid values: comma, period`);
            process.exit(1);
        }
    }

    // Sniff locale from CSV sample to fill any gaps
    const lc = headers.map(h => h.toLowerCase().trim());
    const dateCol = headers.find(h => lc[headers.indexOf(h)] && (h.toLowerCase().includes('date') || h.toLowerCase().includes('start'))) ?? '';
    const priceCol = headers.find(h => h.toLowerCase().includes('price') || h.toLowerCase().includes('amount')) ?? '';

    const sniff = detectLocaleFromRows(rows, dateCol, priceCol);

    if (!dateOrder) {
        dateOrder = sniff.dateOrder;
        if (sniff.confidence < 0.6) {
            sniffWarnings.push(`Date order uncertain (confidence ${Math.round(sniff.confidence * 100)}%). Defaulting to ${dateOrder}. Use --locale=DMY or --locale=MDY to override.`);
        } else {
            sniffWarnings.push(`Auto-detected date order: ${dateOrder} (confidence ${Math.round(sniff.confidence * 100)}%)`);
        }
        sniff.reasoning.forEach(r => sniffWarnings.push(`  Reasoning: ${r}`));
    }

    if (!decimalSep) {
        decimalSep = sniff.decimalSep;
    }

    const hint: LocaleHint = { dateOrder, decimalSep };

    // Pre-scan for genuinely ambiguous dates that the sniffed locale still cannot resolve
    // (rows where both components ≤ 12 AND we had to rely on a low-confidence sniff)
    const ambiguousRows: string[] = [];
    if (!argLocale && sniff.confidence < 0.6) {
        const sample = rows.slice(0, 10);
        for (const row of sample) {
            const dateRaw = row[dateCol]?.trim();
            if (!dateRaw) continue;
            const m = dateRaw.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
            if (m && +m[1] <= 12 && +m[2] <= 12) {
                ambiguousRows.push(dateRaw);
            }
        }
    }

    return { hint, sniffWarnings, ambiguousRows };
}

// Stage 5: Validate relationships — unchanged
interface RelationshipReport {
    unresolvedStaff: string[];
    unresolvedCustomers: string[];
    unresolvedAppointments: string[];
    badDates: number;
}

function validateRelationships(data: NormalizedData): RelationshipReport {
    const customerIds = new Set(data.customers.map(c => c.externalId));
    const staffIds = new Set(data.staff.map(s => s.externalId));
    const apptIds = new Set(data.appointments.map(a => a.externalId));

    const unresolvedStaff: string[] = [];
    const unresolvedCustomers: string[] = [];
    const badDates: number[] = [];

    for (const appt of data.appointments) {
        if (!customerIds.has(appt.customerExternalId)) {
            unresolvedCustomers.push(`Appt ${appt.externalId}: customer "${appt.customerExternalId}" not in CSV`);
        }
        if (appt.staffExternalId && !staffIds.has(appt.staffExternalId)) {
            unresolvedStaff.push(`Appt ${appt.externalId}: staff "${appt.staffExternalId}" not in CSV`);
        }
        if (!isSensibleDate(appt.date as any)) {
            badDates.push((appt.date as any)?.getFullYear() ?? 0);
        }
    }

    const unresolvedAppointments: string[] = [];
    for (const pay of data.payments) {
        if (pay.appointmentExternalId && !apptIds.has(pay.appointmentExternalId)) {
            unresolvedAppointments.push(`Payment ${pay.externalId}: appointment "${pay.appointmentExternalId}" not in CSV`);
        }
    }

    return { unresolvedStaff, unresolvedCustomers, unresolvedAppointments, badDates: badDates.length };
}

// Stage 8: Recalculate metrics (Supports optional asOfDate for historical audit)
async function recalculateMetrics(salonId: string, asOfDate?: Date): Promise<void> {
    const customers = await prisma.customer.findMany({
        where: { salonId },
        include: {
            payments: true,
            appointments: { orderBy: { date: 'desc' } },
        },
    });

    const now = asOfDate || new Date();

    for (const customer of customers) {
        // Safely compute LTV:
        // Completed payments add if positive; if a completed payment is negative, it reduces.
        // Refunds and reversals are always deducted via Math.abs to prevent double negative addition.
        const ltv = customer.payments.reduce((sum, p) => {
            if (p.status === 'COMPLETED') {
                return p.amount > 0 ? sum + p.amount : sum - Math.abs(p.amount);
            }
            if (p.status === 'REFUNDED' || p.status === 'REVERSED') {
                return sum - Math.abs(p.amount);
            }
            return sum;
        }, 0);

        const lastAppt = customer.appointments.find(a => a.status === 'COMPLETED');
        const lastVisit = lastAppt?.date ?? null;

        const completedAppts = customer.appointments
            .filter(a => a.status === 'COMPLETED')
            .sort((a, b) => a.date.getTime() - b.date.getTime());

        let avgFrequencyDays = 42;
        if (completedAppts.length >= 2) {
            const gaps = completedAppts.slice(1).map((a, i) =>
                (a.date.getTime() - completedAppts[i].date.getTime()) / (1000 * 60 * 60 * 24)
            );
            avgFrequencyDays = Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length);
        }

        const expectedVisit = lastVisit
            ? new Date(lastVisit.getTime() + avgFrequencyDays * 24 * 60 * 60 * 1000)
            : null;

        let risk = 0;
        if (expectedVisit && expectedVisit < now) {
            const daysOverdue = Math.floor((now.getTime() - expectedVisit.getTime()) / (1000 * 60 * 60 * 24));
            risk = Math.min(100, Math.round((daysOverdue / avgFrequencyDays) * 100));
        }

        await prisma.customer.update({
            where: { id: customer.id },
            data: {
                ltv: Math.max(0, ltv),
                risk,
                lastVisit: lastVisit ?? undefined,
                expectedVisit: expectedVisit ?? undefined,
            },
        });
    }

    const staffList = await prisma.staff.findMany({
        where: { salonId },
        include: { appointments: { where: { status: 'COMPLETED' } } },
    });

    for (const s of staffList) {
        const completedIds = s.appointments.map(a => a.customerId);
        if (completedIds.length <= 1) {
            await prisma.staff.update({ where: { id: s.id }, data: { rebookRate: 0 } });
            continue;
        }
        const uniqueCustomers = new Set(completedIds);
        const rebookers = completedIds.length - uniqueCustomers.size;
        const rebookRate = Math.round((rebookers / (completedIds.length - 1)) * 100);
        await prisma.staff.update({ where: { id: s.id }, data: { rebookRate: Math.min(100, rebookRate) } });
    }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    const args = parseArgs();
    const isDryRun = 'dry-run' in args;

    // --list-sources: print registered adapters and exit
    if ('list-sources' in args) {
        console.log('\nRegistered adapters:');
        registry.list().forEach(m => {
            console.log(`  ${m.id.padEnd(12)} — ${m.displayName}${m.isGenericFallback ? ' [fallback]' : ''}`);
            console.log(`               ${m.description}`);
        });
        process.exit(0);
    }

    const argAsOf = args['as-of'];
    let asOfDate: Date | undefined;
    if (argAsOf) {
        asOfDate = new Date(argAsOf);
        if (isNaN(asOfDate.getTime())) {
            console.error(`❌ Error: Invalid --as-of date "${argAsOf}". Expected format: YYYY-MM-DD`);
            process.exit(1);
        }
    }

    // --recalculate-only: run metric recalculation without importing CSV
    if ('recalculate-only' in args) {
        const sId = args['salon-id'];
        if (!sId) {
            console.error('❌ Error: --salon-id=<uuid> is required with --recalculate-only');
            process.exit(1);
        }
        const existing = await prisma.salon.findUnique({ where: { id: sId } });
        if (!existing) {
            console.error(`❌ Error: Salon "${sId}" not found.`);
            process.exit(1);
        }
        console.log(`\n🔄 Running metric recalculation for salon "${existing.name}" (${sId})...`);
        if (asOfDate) console.log(`   Evaluation reference date: ${asOfDate.toISOString().slice(0, 10)}`);
        await recalculateMetrics(sId, asOfDate);
        console.log('✅ Metric recalculation completed successfully.\n');
        await prisma.$disconnect();
        return;
    }

    const filePath   = args['file'];
    const salonId    = args['salon-id'];
    const salonName  = args['salon-name'];
    const ownerEmail = args['owner-email'];
    const importedBy = ownerEmail ?? 'operator';
    const argLocale  = args['locale'];
    const argDecimal = args['decimal'];

    console.log('\n══════════════════════════════════════════════════════');
    console.log('    Marlowe & Rose — CSV Onboarding Importer  v2');
    console.log(`    Mode: ${isDryRun ? '🔍 DRY RUN (zero DB writes)' : '🚀 LIVE IMPORT'}`);
    if (argLocale) console.log(`    Locale: --locale=${argLocale}`);
    console.log('══════════════════════════════════════════════════════\n');

    // ── Arg validation ────────────────────────────────────────────────────────
    if (!filePath) {
        console.error('❌ Error: --file=<path> is required.');
        process.exit(1);
    }
    if (!salonId && !salonName) {
        console.error('❌ Error: either --salon-id=<uuid> or --salon-name=<name> is required.');
        process.exit(1);
    }
    if (!salonId && !ownerEmail) {
        console.error('❌ Error: --owner-email=<email> is required when creating a new salon.');
        process.exit(1);
    }
    if (args['owner-password']) {
        console.error('❌ Error: --owner-password is NOT supported. A secure password is generated.');
        process.exit(1);
    }

    const resolvedPath = path.resolve(filePath);
    if (!fs.existsSync(resolvedPath)) {
        console.error(`❌ Error: File not found: ${resolvedPath}`);
        process.exit(1);
    }

    const fileName = path.basename(resolvedPath);
    const content  = fs.readFileSync(resolvedPath, 'utf-8');

    // ── Stage 1: Parse CSV + detect adapter ──────────────────────────────────
    let rows: Record<string, string>[] = [];
    try {
        rows = parseCSV(content);
    } catch (e: any) {
        console.error('❌ CSV Parse Error:', e.message);
        process.exit(1);
    }

    const headers = Object.keys(rows[0] ?? {});
    const adapter = registry.detect(headers);
    if (!adapter) {
        console.error('❌ No adapter matched these CSV headers. Use --list-sources to see available adapters.');
        process.exit(1);
        return;
    }
    const sourceName = adapter.meta.id;
    console.log(`✅ Stage 1 — Source Detected: ${adapter.meta.displayName} (${sourceName})`);

    // ── Stage 2: Locale resolution ────────────────────────────────────────────
    const { hint, sniffWarnings, ambiguousRows } = resolveLocale(rows, headers, argLocale, argDecimal);

    console.log(`✅ Stage 2 — Locale: dateOrder=${hint.dateOrder}, decimalSep=${hint.decimalSep}`);
    sniffWarnings.forEach(w => console.warn(`   ⚠  ${w}`));

    // If ambiguous dates exist and no explicit locale was supplied — STOP.
    if (ambiguousRows.length > 0 && !argLocale) {
        console.error('\n❌ IMPORT HALTED — Ambiguous dates detected.\n');
        console.error('   The following date values could be DD/MM/YYYY OR MM/DD/YYYY:');
        [...new Set(ambiguousRows)].slice(0, 5).forEach(d => console.error(`   • ${d}`));
        console.error('\n   Resolution:');
        console.error('   • For UK / India / Australia (e.g. 01/06/2026 = 1 June):  add --locale=DMY');
        console.error('   • For United States  (e.g. 01/06/2026 = 6 January):       add --locale=MDY');
        console.error('\n   Example:');
        console.error(`   npm run import-data -- --file=${filePath} --locale=DMY --dry-run`);
        await prisma.$disconnect();
        process.exit(1);
    }

    // ── Stage 3: Schema validation ────────────────────────────────────────────
    const { valid, errors, warnings: schemaWarnings } = validateSchema(headers, rows);
    if (!valid) {
        console.error('\n❌ Stage 3 — Schema Validation FAILED:');
        errors.forEach(e => console.error(`   • ${e}`));
        process.exit(1);
    }
    console.log('✅ Stage 3 — Schema Valid');
    schemaWarnings.forEach(w => console.warn(`   ⚠  ${w}`));

    // ── Stage 4: Normalize ────────────────────────────────────────────────────
    let data!: NormalizedData;
    let normWarnings: string[] = [];
    try {
        const result = adapter.normalize(rows, hint);
        data = result;
        normWarnings = result.warnings ?? [];
    } catch (e: any) {
        if (e instanceof AmbiguousDateError) {
            console.error('\n❌ Stage 4 — Ambiguous date encountered during normalization.');
            console.error(`   Raw value: "${e.raw}"`);
            console.error(`   Interpretation A: ${e.interpretationA}`);
            console.error(`   Interpretation B: ${e.interpretationB}`);
            console.error(`\n   Add --locale=DMY (UK) or --locale=MDY (US) to resolve.`);
        } else {
            console.error('❌ Stage 4 — Normalization Error:', e.message);
        }
        await prisma.$disconnect();
        process.exit(1);
        return;
    }
    console.log('✅ Stage 4 — Normalization Complete');
    if (normWarnings.length > 0) {
        normWarnings.slice(0, 10).forEach(w => console.warn(`   ⚠  ${w}`));
        if (normWarnings.length > 10) console.warn(`   ⚠  ... and ${normWarnings.length - 10} more normalization warnings`);
    }

    // ── Stage 5: Validate relationships ──────────────────────────────────────
    const relReport = validateRelationships(data);
    const allWarnings: string[] = [...schemaWarnings, ...normWarnings];

    if (relReport.unresolvedStaff.length > 0) {
        allWarnings.push(...relReport.unresolvedStaff.slice(0, 5));
        if (relReport.unresolvedStaff.length > 5)
            allWarnings.push(`...and ${relReport.unresolvedStaff.length - 5} more unresolved staff refs`);
    }
    if (relReport.unresolvedCustomers.length > 0) {
        allWarnings.push(...relReport.unresolvedCustomers.slice(0, 5));
    }
    if (relReport.unresolvedAppointments.length > 0) {
        allWarnings.push(...relReport.unresolvedAppointments.slice(0, 5));
        if (relReport.unresolvedAppointments.length > 5)
            allWarnings.push(`...and ${relReport.unresolvedAppointments.length - 5} more unresolved payment↔appt refs`);
    }
    if (relReport.badDates > 0) {
        allWarnings.push(`${relReport.badDates} appointment(s) have invalid or out-of-range dates (will be skipped)`);
    }
    console.log('✅ Stage 5 — Relationship Validation Complete');

    // ── Revenue + date range preview ──────────────────────────────────────────
    const completedPayments = data.payments.filter(p => p.status === 'COMPLETED');
    const refunds = data.payments.filter(p => p.status === 'REFUNDED' || p.status === 'REVERSED');

    // Safe revenue calculation preventing double negative subtraction:
    const grossCompleted = completedPayments
        .filter(p => p.amount > 0)
        .reduce((s, p) => s + p.amount, 0);
    const refundTotal = refunds.reduce((s, p) => s + Math.abs(p.amount), 0)
        + completedPayments.filter(p => p.amount < 0).reduce((s, p) => s + Math.abs(p.amount), 0);
    const revenueTotal = Math.max(0, grossCompleted - refundTotal);

    const bookedTotal = data.appointments
        .filter(a => a.status !== 'CANCELLED' && a.status !== 'NO_SHOW')
        .reduce((s, a) => s + (a.priceAtBooking ?? 0), 0);

    const isTreatwell = adapter.meta.id === 'treatwell';
    const isTimely = adapter.meta.id === 'timely' || data.payments.length === 0;

    const allDates = data.appointments
        .map(a => a.date)
        .filter(d => isSensibleDate(d));
    const dateRangeStart = allDates.length ? new Date(Math.min(...allDates.map(d => d!.getTime()))) : null;
    const dateRangeEnd   = allDates.length ? new Date(Math.max(...allDates.map(d => d!.getTime()))) : null;

    // ── Stage 6: Dry run report ───────────────────────────────────────────────
    console.log('\n──────────────────────────────────────────────────────');
    console.log(`  📦  ${isDryRun ? 'DRY RUN PREVIEW' : 'IMPORT PREVIEW'}`);
    console.log('──────────────────────────────────────────────────────');
    console.log(`  Adapter:            ${adapter.meta.displayName}`);
    console.log(`  Locale:             dateOrder=${hint.dateOrder}, decimal=${hint.decimalSep}`);
    console.log(`  Staff:              ${data.staff.length}`);
    console.log(`  Services:           ${data.services.length}`);
    console.log(`  Customers:          ${data.customers.length}`);
    console.log(`  Appointments:       ${data.appointments.length}`);
    console.log(`  Payments (records): ${data.payments.length}`);
    if (allWarnings.length > 0) {
        console.log('');
        allWarnings.slice(0, 10).forEach(w => console.warn(`  ⚠   ${w}`));
    }
    console.log('');
    if (isTimely) {
        console.log('  💰 Verified Net Revenue: N/A (no payment transaction data in Timely export)');
        console.log(`  📋 Booked Value (price at booking): £${bookedTotal.toFixed(2)}`);
        console.log('  ⚠  Note: Timely exports omit payment/transaction ledger data.');
    } else if (isTreatwell) {
        console.log(`  💰 Gross Completed Value: £${grossCompleted.toFixed(2)} (${completedPayments.length} completed visits)`);
        console.log(`  📋 Booked Value (price at booking): £${bookedTotal.toFixed(2)}`);
        console.log('  ⚠  Notice: Treatwell exports do not include separate payment ledger or refund records.');
        console.log('     This figure reflects gross completed bookings, not verified net cash after refunds.');
    } else {
        console.log(`  💰 Verified Net Revenue: £${revenueTotal.toFixed(2)} (Gross: £${grossCompleted.toFixed(2)}, Refunds: £${refundTotal.toFixed(2)})`);
        console.log(`  📋 Booked Value (price at booking): £${bookedTotal.toFixed(2)}`);
    }
    if (dateRangeStart && dateRangeEnd) {
        console.log(`  Date Range:         ${dateRangeStart.toDateString()} – ${dateRangeEnd.toDateString()}`);
    }

    if (isDryRun) {
        console.log('\n  ✅ Dry run complete. No database changes made.');
        console.log('  Run without --dry-run to perform the actual import.\n');
        await prisma.$disconnect();
        return;
    }

    // ── Stage 7: Pre-validate & Classify rows BEFORE transaction ─────────────
    console.log('\n──────────────────────────────────────────────────────');
    console.log('  📥  VALIDATING DATA & PREPARING ATOMIC IMPORT...');
    console.log('──────────────────────────────────────────────────────');

    const customerExtIds = new Set(data.customers.map(c => c.externalId));

    const validAppointments: typeof data.appointments = [];
    const skippedAppointments: { appt: typeof data.appointments[0]; reason: string }[] = [];

    for (const appt of data.appointments) {
        if (!isSensibleDate(appt.date)) {
            const rawDate = appt.date as unknown;
            const dateStr = rawDate instanceof Date && !isNaN(rawDate.getTime()) ? rawDate.toISOString() : String(rawDate);
            skippedAppointments.push({ appt, reason: `Unsensible or invalid date: ${dateStr}` });
            continue;
        }
        if (!appt.customerExternalId || !customerExtIds.has(appt.customerExternalId)) {
            skippedAppointments.push({ appt, reason: `Unresolvable customer reference: "${appt.customerExternalId}"` });
            continue;
        }
        if (!appt.externalId) {
            skippedAppointments.push({ appt, reason: 'Missing appointment external ID' });
            continue;
        }
        validAppointments.push(appt);
    }

    const apptExtIds = new Set(validAppointments.map(a => a.externalId));
    const validPayments: typeof data.payments = [];
    const skippedPayments: { pay: typeof data.payments[0]; reason: string }[] = [];

    for (const pay of data.payments) {
        if (!pay.externalId) {
            skippedPayments.push({ pay, reason: 'Missing payment external ID' });
            continue;
        }
        if (!pay.customerExternalId || !customerExtIds.has(pay.customerExternalId)) {
            skippedPayments.push({ pay, reason: `Unresolvable customer reference: "${pay.customerExternalId}"` });
            continue;
        }
        validPayments.push(pay);
    }

    const totalPreSkipped = skippedAppointments.length + skippedPayments.length;
    if (totalPreSkipped > 0) {
        console.warn(`  ⚠ Pre-classified ${totalPreSkipped} invalid record(s) to be safely skipped prior to transaction.`);
    }

    let staffImported = 0, staffUpdated = 0;
    let serviceImported = 0, serviceUpdated = 0;
    let customerImported = 0, customerUpdated = 0;
    let apptImported = 0, apptUpdated = 0;
    let payImported = 0, payUpdated = 0;

    let salon!: { id: string; name?: string };
    let tempPassword: string | null = null;

    // Check existing salon or pre-validate owner user before opening the atomic transaction
    if (salonId) {
        const existing = await prisma.salon.findUnique({ where: { id: salonId } });
        if (!existing) {
            console.error(`❌ Salon with ID "${salonId}" not found.`);
            process.exit(1);
            return;
        }
        salon = existing;
        console.log(`  ℹ  Using existing salon: "${salon.id}"`);
    } else {
        const existingUser = await prisma.user.findUnique({ where: { email: ownerEmail! } });
        if (existingUser) {
            console.error(`❌ Email "${ownerEmail}" is already registered. Use --salon-id instead.`);
            process.exit(1);
            return;
        }
        tempPassword = crypto.randomBytes(10).toString('base64url');
    }

    const staffIdMap    = new Map<string, string>();
    const serviceIdMap  = new Map<string, string>();
    const customerIdMap = new Map<string, string>();
    const apptIdMap     = new Map<string, string>();

    // Atomic transaction: Salon/User creation AND entity data import are fully atomic
    await prisma.$transaction(async (tx) => {
        // 7a. Salon & Owner creation if new
        if (!salonId) {
            const hashedPassword = await bcrypt.hash(tempPassword!, 12);
            salon = await tx.salon.create({ data: { name: salonName! } });
            await tx.user.create({
                data: {
                    email: ownerEmail!,
                    password: hashedPassword,
                    name: salonName!,
                    role: 'OWNER',
                    salonId: salon.id,
                },
            });
        }

        // 7b. Staff (upsert)
        for (const s of data.staff) {
            const result = await tx.staff.upsert({
                where: { salonId_sourceSystem_externalId: { salonId: salon.id, sourceSystem: sourceName, externalId: s.externalId } },
                create: { name: s.name, role: s.role, salonId: salon.id, sourceSystem: sourceName, externalId: s.externalId },
                update: { name: s.name, role: s.role },
            });
            staffIdMap.set(s.externalId, result.id);
            if (result.createdAt.getTime() === result.updatedAt.getTime()) staffImported++;
            else staffUpdated++;
        }

        // 7c. Services (name-based dedup per salon)
        for (const svc of data.services) {
            let existing = await tx.service.findFirst({ where: { salonId: salon.id, name: svc.name } });
            if (existing) {
                await tx.service.update({ where: { id: existing.id }, data: { price: svc.price, duration: svc.duration } });
                serviceIdMap.set(svc.externalId, existing.id);
                serviceUpdated++;
            } else {
                const created = await tx.service.create({
                    data: { name: svc.name, price: svc.price, duration: svc.duration, salonId: salon.id },
                });
                serviceIdMap.set(svc.externalId, created.id);
                serviceImported++;
            }
        }

        // 7d. Customers (Robust identity matching across exports)
        const existingCustomers = await tx.customer.findMany({ where: { salonId: salon.id } });

        for (const c of data.customers) {
            const cEmail = c.email ? c.email.toLowerCase().trim() : null;
            const cPhone = c.phone ? c.phone.replace(/[^\d+]/g, '') : null;
            const cName  = c.name.toLowerCase().trim();

            // 1) Match on externalId from same source
            let match = existingCustomers.find(e => e.sourceSystem === sourceName && e.externalId === c.externalId);

            // 2) Reliable match on verified email across exports
            if (!match && cEmail) {
                match = existingCustomers.find(e => e.email?.toLowerCase().trim() === cEmail);
            }

            // 3) Reliable match on phone + name across exports (e.g. export missing email)
            if (!match && cPhone) {
                match = existingCustomers.find(e => {
                    const ePhone = e.phone?.replace(/[^\d+]/g, '');
                    const eName  = e.name.toLowerCase().trim();
                    return ePhone === cPhone && (eName === cName || eName.includes(cName) || cName.includes(eName));
                });
            }

            // 4) Check for ambiguous name match (shared name but no phone/email verification)
            if (!match) {
                const nameMatch = existingCustomers.find(e => e.name.toLowerCase().trim() === cName);
                if (nameMatch) {
                    const eEmail = nameMatch.email ? nameMatch.email.toLowerCase().trim() : null;
                    const ePhone = nameMatch.phone ? nameMatch.phone.replace(/[^\d+]/g, '') : null;

                    const hasConflictingEmail = cEmail && eEmail && cEmail !== eEmail;
                    const hasConflictingPhone = cPhone && ePhone && cPhone !== ePhone;

                    if (!hasConflictingEmail && !hasConflictingPhone) {
                        allWarnings.push(`Ambiguous customer identity: "${c.name}" matches an existing client name but lacks email/phone verification. Kept as separate customer for safety.`);
                    }
                }
            }

            if (match) {
                // Update missing contact info if newly provided
                const updated = await tx.customer.update({
                    where: { id: match.id },
                    data: {
                        name: match.name || c.name,
                        email: match.email || c.email || undefined,
                        phone: match.phone || c.phone || undefined,
                    },
                });
                customerIdMap.set(c.externalId, updated.id);
                customerUpdated++;
            } else {
                const created = await tx.customer.create({
                    data: {
                        name: c.name,
                        email: c.email || null,
                        phone: c.phone || null,
                        salonId: salon.id,
                        sourceSystem: sourceName,
                        externalId: c.externalId,
                    },
                });
                customerIdMap.set(c.externalId, created.id);
                existingCustomers.push(created);
                customerImported++;
            }
        }

        // 7e. Appointments (batched concurrent upserts in chunks of 15 for fast cloud DB execution)
        const APPT_CHUNK_SIZE = 15;
        for (let i = 0; i < validAppointments.length; i += APPT_CHUNK_SIZE) {
            const chunk = validAppointments.slice(i, i + APPT_CHUNK_SIZE);
            await Promise.all(chunk.map(async (appt) => {
                const customerId = customerIdMap.get(appt.customerExternalId)!;
                const staffId = appt.staffExternalId ? staffIdMap.get(appt.staffExternalId) : null;

                const result = await tx.appointment.upsert({
                    where: { salonId_sourceSystem_externalId: { salonId: salon.id, sourceSystem: sourceName, externalId: appt.externalId } },
                    create: {
                        date: appt.date,
                        status: appt.status,
                        salonId: salon.id,
                        customerId,
                        staffId: staffId ?? null,
                        sourceSystem: sourceName,
                        externalId: appt.externalId,
                    },
                    update: {
                        date: appt.date,
                        status: appt.status,
                        staffId: staffId ?? null,
                    },
                });

                for (const svcExtId of appt.serviceExternalIds) {
                    const serviceId = serviceIdMap.get(svcExtId);
                    if (!serviceId) continue;
                    const existingLink = await tx.appointmentService.findFirst({
                        where: { appointmentId: result.id, serviceId },
                    });
                    if (!existingLink) {
                        await tx.appointmentService.create({
                            data: { appointmentId: result.id, serviceId, priceAtBooking: appt.priceAtBooking },
                        });
                    }
                }

                apptIdMap.set(appt.externalId, result.id);
                if (result.createdAt.getTime() === result.updatedAt.getTime()) apptImported++;
                else apptUpdated++;
            }));
        }

        // 7f. Payments (batched concurrent upserts in chunks of 20)
        const PAY_CHUNK_SIZE = 20;
        for (let i = 0; i < validPayments.length; i += PAY_CHUNK_SIZE) {
            const chunk = validPayments.slice(i, i + PAY_CHUNK_SIZE);
            await Promise.all(chunk.map(async (pay) => {
                const customerId = customerIdMap.get(pay.customerExternalId)!;
                const appointmentId = pay.appointmentExternalId
                    ? apptIdMap.get(pay.appointmentExternalId)
                    : undefined;

                const result = await tx.payment.upsert({
                    where: { salonId_sourceSystem_externalId: { salonId: salon.id, sourceSystem: sourceName, externalId: pay.externalId } },
                    create: {
                        amount: pay.amount,
                        status: pay.status,
                        method: pay.method,
                        paymentDate: pay.paymentDate,
                        salonId: salon.id,
                        customerId,
                        appointmentId: appointmentId ?? null,
                        sourceSystem: sourceName,
                        externalId: pay.externalId,
                    },
                    update: {
                        amount: pay.amount,
                        status: pay.status,
                        method: pay.method,
                    },
                });
                if (result.createdAt.getTime() === result.updatedAt.getTime()) payImported++;
                else payUpdated++;
            }));
        }
    }, { timeout: 600_000, maxWait: 30_000 });

    console.log('  ✅ Atomic import transaction committed.');
    if (!salonId && tempPassword) {
        console.log(`  ✅ Salon created: "${salonName}" (ID: ${salon.id})`);
        console.log(`\n  ┌─────────────────────────────────────────────┐`);
        console.log(`  │  🔐 TEMPORARY LOGIN CREDENTIALS              │`);
        console.log(`  │  Email:    ${ownerEmail!.padEnd(35, ' ')}│`);
        console.log(`  │  Password: ${tempPassword.padEnd(35, ' ')}│`);
        console.log(`  │                                             │`);
        console.log(`  │  ⚠ This password will NOT be shown again.   │`);
        console.log(`  │  The owner MUST change it on first login.   │`);
        console.log(`  └─────────────────────────────────────────────┘\n`);
    }

    // ── Stage 8: Recalculate metrics (Monitored & Safely Retryable) ───────────
    let metricsSucceeded = false;
    try {
        console.log('  🔄  Recalculating LTV, churn risk, rebook rates...');
        await recalculateMetrics(salon.id, asOfDate);
        console.log('  ✅ Metrics recalculated successfully.');
        metricsSucceeded = true;
    } catch (err: any) {
        console.error('  ⚠  Metrics recalculation encountered an error:', err.message);
        console.error(`  ℹ  Data was successfully committed to salon "${salon.id}".`);
        console.error(`  ℹ  To retry metric recalculation on demand without re-importing:`);
        console.error(`     npm run import-data -- --recalculate-only --salon-id=${salon.id}${asOfDate ? ` --as-of=${asOfDate.toISOString().slice(0, 10)}` : ''}`);
        allWarnings.push(`Metric recalculation deferred. Retry via: --recalculate-only --salon-id=${salon.id}`);
    }

    // ── Stage 9: Import report + audit log ────────────────────────────────────
    const totalSkipped = skippedAppointments.length + skippedPayments.length;

    await prisma.importLog.create({
        data: {
            salonId: salon.id,
            sourceSystem: sourceName,
            fileName,
            status: metricsSucceeded ? 'COMPLETED' : 'METRICS_PENDING',
            staffCount: staffImported + staffUpdated,
            serviceCount: serviceImported + serviceUpdated,
            customerCount: customerImported + customerUpdated,
            appointmentCount: apptImported + apptUpdated,
            paymentCount: payImported + payUpdated,
            skippedCount: totalSkipped,
            warnings: allWarnings.length > 0 ? allWarnings.join('\n') : null,
            revenueTotal,
            dateRangeStart,
            dateRangeEnd,
            importedBy,
        },
    });

    console.log('\n══════════════════════════════════════════════════════');
    console.log('  📊  IMPORT REPORT');
    console.log('══════════════════════════════════════════════════════');
    console.log(`  Source:             ${adapter.meta.displayName}`);
    console.log(`  File:               ${fileName}`);
    console.log(`  Locale:             dateOrder=${hint.dateOrder}, decimal=${hint.decimalSep}`);
    console.log('');
    console.log(`  ✅ Staff:           ${staffImported} new, ${staffUpdated} updated`);
    console.log(`  ✅ Services:        ${serviceImported} new, ${serviceUpdated} updated`);
    console.log(`  ✅ Customers:       ${customerImported} new, ${customerUpdated} updated`);
    console.log(`  ✅ Appointments:    ${apptImported} new, ${apptUpdated} updated`);
    console.log(`  ✅ Payments:        ${payImported} new, ${payUpdated} updated`);
    if (totalSkipped > 0) {
        console.log(`  ⚠  Pre-skipped:     ${totalSkipped} invalid records (bad dates or unresolvable references)`);
    }
    console.log('');
    if (allWarnings.length > 0) {
        allWarnings.slice(0, 5).forEach(w => console.warn(`  ⚠  ${w}`));
        console.log('');
    }
    if (isTimely) {
        console.log('  💰 Verified Net Revenue: N/A (no payment transaction data in export)');
        console.log(`  📋 Booked Value (price at booking): £${bookedTotal.toFixed(2)}`);
        console.log('  ⚠  Note: Timely exports omit payment/transaction ledger data.');
    } else if (isTreatwell) {
        console.log(`  💰 Gross Completed Value: £${grossCompleted.toFixed(2)} (${completedPayments.length} completed visits)`);
        console.log(`  📋 Booked Value (price at booking): £${bookedTotal.toFixed(2)}`);
        console.log('  ⚠  Notice: Treatwell exports do not include separate payment ledger or refund records.');
        console.log('     This figure reflects gross completed bookings, not verified net cash after refunds.');
    } else {
        console.log(`  💰 Verified Net Revenue: £${revenueTotal.toFixed(2)} (Gross: £${grossCompleted.toFixed(2)}, Refunds: £${refundTotal.toFixed(2)})`);
        console.log(`  📋 Booked Value (price at booking): £${bookedTotal.toFixed(2)}`);
    }
    if (dateRangeStart && dateRangeEnd) {
        console.log(`  📅 Date Range:      ${dateRangeStart.toDateString()} – ${dateRangeEnd.toDateString()}`);
    }
    console.log('');
    console.log(`  ${metricsSucceeded ? '✅ Import completed successfully. Dashboard is live.' : '⚠ Data imported. Metrics pending recalculation.'}`);
    console.log('══════════════════════════════════════════════════════\n');

    await prisma.$disconnect();
}

main().catch(async (e) => {
    console.error('\n❌ Fatal error during import:', e?.message ?? e);
    await prisma.$disconnect();
    process.exit(1);
});
