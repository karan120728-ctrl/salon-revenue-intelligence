/**
 * Marlowe & Rose — Import Engine entry point
 *
 * Registers all adapters in priority order and exports the ready registry.
 * To add a new source: import its adapter here and call registry.register().
 */
import { registry } from './adapter-registry';
import { FreshaAdapter }    from './fresha-adapter';
import { TimelyAdapter }    from './timely-adapter';
import { TreatwellAdapter } from './treatwell-adapter';
import { GenericAdapter }   from './generic-adapter';

// Order matters: non-fallbacks first, generic last
registry
    .register(new FreshaAdapter())
    .register(new TimelyAdapter())
    .register(new TreatwellAdapter())
    .register(new GenericAdapter());   // always last — isGenericFallback = true

export { registry };
export { AmbiguousDateError, parseLocaleDate, parseCurrencyValue, detectLocaleFromRows, isSensibleDate } from './locale-engine';
export type { LocaleHint, ParsedDate, LocaleSniffResult, DateOrder, DecimalSep } from './locale-engine';
export type { BaseAdapter, AdapterMeta } from './adapter-registry';
