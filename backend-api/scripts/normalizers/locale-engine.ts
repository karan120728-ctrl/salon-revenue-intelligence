/**
 * Marlowe & Rose — Locale-Aware Date & Currency Engine
 *
 * Rules:
 *  1. NEVER silently guess an ambiguous date — throw AmbiguousDateError
 *  2. ISO 8601 (YYYY-MM-DD) = always unambiguous
 *  3. Named-month ("15 Jan 2026") = always unambiguous
 *  4. Numeric n/n/yyyy: unambiguous only when day > 12; else require locale hint
 *  5. Currency: supports period-decimal (UK/US) and comma-decimal (EU)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type DateOrder = 'DMY' | 'MDY' | 'YMD';
export type DecimalSep = 'period' | 'comma';

export interface LocaleHint {
    dateOrder?: DateOrder;
    decimalSep?: DecimalSep;
    timezone?: string;
    currencySymbol?: string;
}

export interface ParsedDate {
    date: Date;
    resolvedWithHint: boolean;
    iso: string;
}

export class AmbiguousDateError extends Error {
    constructor(
        public readonly raw: string,
        public readonly interpretationA: string,
        public readonly interpretationB: string,
        message?: string,
    ) {
        super(
            message ??
            `Ambiguous date "${raw}": could be ${interpretationA} or ${interpretationB}. ` +
            `Pass --locale=DMY (UK) or --locale=MDY (US) to resolve.`,
        );
        this.name = 'AmbiguousDateError';
    }
}

// ─── Month name table ─────────────────────────────────────────────────────────

const MONTH_NAMES: Record<string, number> = {
    january: 1, jan: 1,
    february: 2, feb: 2,
    march: 3, mar: 3,
    april: 4, apr: 4,
    may: 5,
    june: 6, jun: 6,
    july: 7, jul: 7,
    august: 8, aug: 8,
    september: 9, sep: 9, sept: 9,
    october: 10, oct: 10,
    november: 11, nov: 11,
    december: 12, dec: 12,
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

function buildDate(y: number, m: number, d: number, h = 0, min = 0, s = 0): Date | null {
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    const dt = new Date(Date.UTC(y, m - 1, d, h, min, s));
    if (dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
    return dt;
}

function toISO(d: Date): string {
    return d.toISOString();
}

function parseTime(raw: string): [number, number, number] | null {
    const m = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!m) return null;
    return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3] ?? '0', 10)];
}

// ─── Main date parser ─────────────────────────────────────────────────────────

export function parseLocaleDate(
    raw: string | undefined | null,
    locale: LocaleHint | DateOrder = {},
    timeRaw?: string | null,
): ParsedDate | null {
    if (!raw) return null;
    const str = raw.trim();
    if (str === '' || str.toLowerCase() === 'n/a' || str.toLowerCase() === 'null') return null;

    const hint = typeof locale === 'string' ? locale : (locale.dateOrder ?? null);
    let time: [number, number, number] = [0, 0, 0];
    let timeFromSeparate = false;
    if (timeRaw) {
        const parsed = parseTime(timeRaw.trim());
        if (parsed) { time = parsed; timeFromSeparate = true; }
    }

    // 1. ISO 8601: YYYY-MM-DD[THH:mm:ss[Z]]
    const isoFull = str.match(
        /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:Z|[+-]\d{2}:?\d{2})?)?/
    );
    if (isoFull) {
        const [, y, m, d, h = '0', mi = '0', s = '0'] = isoFull;
        const dt = buildDate(+y, +m, +d, +h, +mi, +s);
        if (dt) {
            if (timeFromSeparate) dt.setUTCHours(time[0], time[1], time[2]);
            return { date: dt, resolvedWithHint: false, iso: toISO(dt) };
        }
    }

    // 2. Named month — DD Mon YYYY  e.g. "15 Jan 2026"
    const namedA = str.match(
        /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
    );
    if (namedA) {
        const month = MONTH_NAMES[namedA[2].toLowerCase()];
        if (month) {
            const h = namedA[4] ? +namedA[4] : time[0];
            const mi = namedA[5] ? +namedA[5] : time[1];
            const s = namedA[6] ? +namedA[6] : time[2];
            const dt = buildDate(+namedA[3], month, +namedA[1], h, mi, s);
            if (dt) return { date: dt, resolvedWithHint: false, iso: toISO(dt) };
        }
    }

    // 3. Named month — Mon DD, YYYY  e.g. "January 15, 2026"
    const namedB = str.match(
        /^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
    );
    if (namedB) {
        const month = MONTH_NAMES[namedB[1].toLowerCase()];
        if (month) {
            const h = namedB[4] ? +namedB[4] : time[0];
            const mi = namedB[5] ? +namedB[5] : time[1];
            const s = namedB[6] ? +namedB[6] : time[2];
            const dt = buildDate(+namedB[3], month, +namedB[2], h, mi, s);
            if (dt) return { date: dt, resolvedWithHint: false, iso: toISO(dt) };
        }
    }

    // 4. Numeric: n/n/yyyy or n-n-yyyy or n.n.yyyy
    const numeric = str.match(
        /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})(?:[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
    );
    if (numeric) {
        const a = +numeric[1];
        const b = +numeric[2];
        const y = +numeric[3];
        const h = numeric[4] ? +numeric[4] : time[0];
        const mi = numeric[5] ? +numeric[5] : time[1];
        const s = numeric[6] ? +numeric[6] : time[2];

        if (a > 12 && b > 12) return null;  // invalid
        if (a > 12) {
            // a must be day → DMY
            const dt = buildDate(y, b, a, h, mi, s);
            if (dt) return { date: dt, resolvedWithHint: false, iso: toISO(dt) };
            return null;
        }
        if (b > 12) {
            // b must be day → MDY
            const dt = buildDate(y, a, b, h, mi, s);
            if (dt) return { date: dt, resolvedWithHint: false, iso: toISO(dt) };
            return null;
        }

        // Both ≤ 12 — ambiguous
        if (hint === 'DMY') {
            const dt = buildDate(y, b, a, h, mi, s);
            if (dt) return { date: dt, resolvedWithHint: true, iso: toISO(dt) };
        } else if (hint === 'MDY') {
            const dt = buildDate(y, a, b, h, mi, s);
            if (dt) return { date: dt, resolvedWithHint: true, iso: toISO(dt) };
        } else {
            const dmyDate = buildDate(y, b, a);
            const mdyDate = buildDate(y, a, b);
            const dmyStr = dmyDate ? `${y}-${String(b).padStart(2,'0')}-${String(a).padStart(2,'0')} (DD/MM)` : 'invalid';
            const mdyStr = mdyDate ? `${y}-${String(a).padStart(2,'0')}-${String(b).padStart(2,'0')} (MM/DD)` : 'invalid';
            throw new AmbiguousDateError(str, dmyStr, mdyStr);
        }
    }

    // 5. Native JS fallback (RFC 2822, "Mon Oct 14 2026", etc.)
    const fallback = new Date(str);
    if (!isNaN(fallback.getTime())) {
        return { date: fallback, resolvedWithHint: false, iso: toISO(fallback) };
    }

    return null;
}

// ─── Ambiguity pre-check ──────────────────────────────────────────────────────

export function isDateAmbiguous(raw: string | undefined | null): boolean {
    if (!raw) return false;
    try {
        parseLocaleDate(raw, {});
        return false;
    } catch (e) {
        return e instanceof AmbiguousDateError;
    }
}

// ─── Currency parser ──────────────────────────────────────────────────────────

export function parseCurrencyValue(
    raw: string | undefined | null,
    locale: LocaleHint | DecimalSep = {},
): number | null {
    if (!raw || raw.trim() === '') return null;
    const sep = typeof locale === 'string' ? locale : (locale.decimalSep ?? 'period');
    const symbol = typeof locale === 'string' ? '£$€' : (locale.currencySymbol ?? '£$€');

    let s = raw.trim();
    s = s.replace(/\b(GBP|USD|EUR|CAD|AUD|NZD|CHF|SEK|NOK|DKK|INR)\b/gi, '');
    s = s.replace(new RegExp(`[${symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`, 'g'), '');
    if (sep === 'comma') {
        s = s.replace(/\./g, '').replace(',', '.');
    } else {
        // If no period exists and string ends with comma + 1 or 2 digits, it's a decimal comma (e.g. "120,00" -> 120.00)
        if (!s.includes('.') && /,\d{1,2}$/.test(s)) {
            s = s.replace(',', '.');
        } else {
            s = s.replace(/,/g, '');
        }
    }

    const val = parseFloat(s);
    return isNaN(val) ? null : Math.round(val * 100) / 100;
}

// ─── Locale sniffer ──────────────────────────────────────────────────────────

export interface LocaleSniffResult {
    dateOrder: DateOrder;
    decimalSep: DecimalSep;
    confidence: number;   // 0–1; < 0.6 = ask user to confirm
    reasoning: string[];
}

export function detectLocaleFromRows(
    rows: Record<string, string>[],
    dateCol: string,
    priceCol?: string,
): LocaleSniffResult {
    const reasoning: string[] = [];
    let dmyVotes = 0, mdyVotes = 0;
    let commaVotes = 0, periodVotes = 0;
    const sample = rows.slice(0, 50);

    for (const row of sample) {
        const dateRaw = row[dateCol]?.trim();
        if (dateRaw) {
            const m = dateRaw.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
            if (m) {
                const a = +m[1], b = +m[2];
                if (a > 12) dmyVotes++;
                else if (b > 12) mdyVotes++;
            }
        }
        if (priceCol) {
            const p = row[priceCol]?.trim();
            if (p) {
                if (/\d,\d{2}$/.test(p)) commaVotes++;
                else if (/\d\.\d{2}$/.test(p)) periodVotes++;
            }
        }
    }

    let dateOrder: DateOrder = 'DMY';
    let dateConf = 0.5;
    const dateTotal = dmyVotes + mdyVotes;
    if (dateTotal > 0) {
        if (dmyVotes >= mdyVotes) {
            dateOrder = 'DMY'; dateConf = dmyVotes / dateTotal;
            reasoning.push(`${dmyVotes}/${dateTotal} date samples suggest DMY (DD/MM/YYYY)`);
        } else {
            dateOrder = 'MDY'; dateConf = mdyVotes / dateTotal;
            reasoning.push(`${mdyVotes}/${dateTotal} date samples suggest MDY (MM/DD/YYYY)`);
        }
    } else {
        reasoning.push('No numeric date samples — defaulting to DMY');
    }

    let decimalSep: DecimalSep = 'period';
    let decConf = 0.5;
    const decTotal = commaVotes + periodVotes;
    if (decTotal > 0) {
        if (commaVotes > periodVotes) {
            decimalSep = 'comma'; decConf = commaVotes / decTotal;
            reasoning.push(`${commaVotes}/${decTotal} prices use comma-decimal (European)`);
        } else {
            decimalSep = 'period'; decConf = periodVotes / decTotal;
            reasoning.push(`${periodVotes}/${decTotal} prices use period-decimal (UK/US)`);
        }
    } else {
        reasoning.push('No price samples — defaulting to period decimal');
    }

    return { dateOrder, decimalSep, confidence: Math.min(dateConf, decConf), reasoning };
}

// ─── Date sanity check ────────────────────────────────────────────────────────

export function isSensibleDate(d: Date | null | undefined): d is Date {
    if (!d || isNaN(d.getTime())) return false;
    const EARLIEST = new Date('2000-01-01T00:00:00Z');
    const LATEST   = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000);
    return d >= EARLIEST && d <= LATEST;
}
