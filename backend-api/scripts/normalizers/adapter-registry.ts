/**
 * Marlowe & Rose — Adapter Registry
 *
 * A plug-in system for booking-system CSV adapters.
 *
 * To add a new source (e.g. "vagaro", "mindbody"):
 *   1. Create backend-api/scripts/normalizers/vagaro.ts implementing BaseAdapter
 *   2. Import it here and add one line: registry.register(new VagaroAdapter())
 *   3. Done — the import pipeline picks it up automatically
 *
 * Detection order: adapters are tried in registration order.
 * The last registered adapter that returns detect()=true wins.
 * Generic is always the final fallback and is registered last.
 */

import { LocaleHint } from './locale-engine';
import { NormalizedData } from './types';

// ─── BaseAdapter interface ────────────────────────────────────────────────────

export interface AdapterMeta {
    /** Internal identifier, e.g. "fresha", "timely" */
    id: string;
    /** Human-readable name for logs / UI */
    displayName: string;
    /** Brief description of what this adapter handles */
    description: string;
    /** Whether this adapter is the generic catch-all fallback */
    isGenericFallback?: boolean;
}

export interface BaseAdapter {
    readonly meta: AdapterMeta;

    /**
     * Return true if this adapter recognises the CSV header set.
     * Called on EVERY registered adapter before normalize().
     * Must be fast — no I/O, no DB.
     */
    detect(headers: string[]): boolean;

    /**
     * Convert raw CSV rows into NormalizedData.
     * Receives the locale hint the user/pipeline chose.
     * Must NOT throw on individual bad rows — skip them, push to warnings[].
     */
    normalize(
        rows: Record<string, string>[],
        locale: LocaleHint,
    ): NormalizedData & { warnings: string[] };
}

// ─── Registry ─────────────────────────────────────────────────────────────────

class AdapterRegistry {
    private readonly adapters: BaseAdapter[] = [];

    /** Register an adapter. Call this once per adapter at startup. */
    register(adapter: BaseAdapter): this {
        this.adapters.push(adapter);
        return this;
    }

    /**
     * Detect which adapter handles these headers.
     * Non-fallback adapters are checked first; generic fallback last.
     * Returns undefined if nothing matches (should not happen if generic is registered).
     */
    detect(headers: string[]): BaseAdapter | undefined {
        const nonFallbacks = this.adapters.filter(a => !a.meta.isGenericFallback);
        const fallbacks    = this.adapters.filter(a =>  a.meta.isGenericFallback);

        for (const adapter of nonFallbacks) {
            if (adapter.detect(headers)) return adapter;
        }
        for (const adapter of fallbacks) {
            if (adapter.detect(headers)) return adapter;
        }
        return undefined;
    }

    /** List all registered adapters (for --list-sources CLI flag). */
    list(): AdapterMeta[] {
        return this.adapters.map(a => a.meta);
    }

    /** Get a specific adapter by ID. */
    get(id: string): BaseAdapter | undefined {
        return this.adapters.find(a => a.meta.id === id);
    }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const registry = new AdapterRegistry();
