/**
 * Attempts to parse a date string from various common booking-system formats.
 * Returns null if the string cannot be parsed.
 *
 * Handles:
 *  - ISO 8601: 2025-01-15T14:30:00Z
 *  - UK date:  15/01/2025 or 15-01-2025
 *  - US date:  01/15/2025
 *  - Readable: January 15, 2025 or 15 Jan 2025
 *  - With/without time
 */
export function parseDate(raw: string | undefined | null): Date | null {
    if (!raw || raw.trim() === '' || raw.toLowerCase() === 'n/a' || raw.toLowerCase() === 'null') {
        return null;
    }

    const str = raw.trim();

    // 1. Try native JS first (handles ISO 8601 and many other formats)
    const native = new Date(str);
    if (!isNaN(native.getTime())) return native;

    // 2. UK format: DD/MM/YYYY or DD-MM-YYYY (with optional time HH:mm)
    const ukMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
    if (ukMatch) {
        const [, d, m, y, h = '0', min = '0'] = ukMatch;
        const candidate = new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min));
        if (!isNaN(candidate.getTime())) return candidate;
    }

    // 3. US format: MM/DD/YYYY (with optional time)
    const usMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
    if (usMatch) {
        const [, m, d, y, h = '0', min = '0'] = usMatch;
        const candidate = new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min));
        if (!isNaN(candidate.getTime())) return candidate;
    }

    return null;
}

/** Returns true if the date is a valid, non-future date (sanity check for imports) */
export function isSensibleDate(d: Date | null): d is Date {
    if (!d) return false;
    const EARLIEST = new Date('2010-01-01');
    const LATEST = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year in future allowed
    return d >= EARLIEST && d <= LATEST;
}

/** Normalizes a currency string like "£185.00" or "185,00" to a float */
export function parseCurrency(raw: string | undefined | null): number | null {
    if (!raw || raw.trim() === '') return null;
    const cleaned = raw.replace(/[£$€,\s]/g, '').trim();
    const val = parseFloat(cleaned);
    return isNaN(val) ? null : val;
}
