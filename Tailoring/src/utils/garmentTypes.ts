// utils/garmentTypes.ts
//
import { formatPHP } from './currency';
//
// THE SHARED GARMENT-TYPE REGISTRY — one list of garment types for the whole
// system. Before this existed the Admin catalog let a garment type be typed by
// hand while the Front Desk picked from the shop taxonomy and the Pricing
// Engine keyed its rules on the same string; a single typo ("Two Piece Suit"
// vs "Two-Piece Suit") silently broke pricing, measurement points and the
// production workflow on the job card.
//
// Three sources are merged, in priority order:
//   1. Front Desk taxonomy (garmentCatalogData.ORDER_CATEGORIES) — the exact
//      strings the intake's category › garment type chooser offers.
//   2. Server Pricing Engine rate card (/api/auth/pricing) — authoritative for
//      category, base price and production workflow. Wins on conflicts.
//   3. Live garment-catalog records — keeps older/legacy values selectable so
//      editing an existing record never rewrites its classification.
//
// Nothing here invents a price: an entry is "priced" only when the rate card
// carries a rule for it.
import { ORDER_CATEGORIES } from '../Pages_Frontdesk/garmentCatalogData';

export type GarmentTypeSource = 'front-desk' | 'rate-card' | 'catalog';

/** One garment type from the Admin Rate Card (GET /api/auth/pricing). */
export type RateCardRow = {
  garment_type: string;
  garment_category?: string;
  base_price?: number | string | null;
  production_workflow?: string;
};

/** The catalog fields the registry reads from a live garment record. */
export type CatalogRow = {
  garment_type?: string;
  garment_category?: string;
  base_price?: number | string | null;
  production_workflow?: string;
};

export type GarmentTypeEntry = {
  /** The canonical string — must match the rate card and intake exactly. */
  type: string;
  category: string;
  /** Rate-card base price, or null when the type has no pricing rule. */
  basePrice: number | null;
  /** Production workflow the pricing engine assigns to this type. */
  workflow: string;
  sources: GarmentTypeSource[];
};

const clean = (value?: string | null) => (value || '').trim();
const toPrice = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Merges the three sources into a single, de-duplicated, category-ordered list.
 * Matching is case-insensitive so "Barong tagalog" cannot slip in beside
 * "Barong Tagalog", but the canonical casing of the first (highest-priority)
 * source is what the admin sees and what gets saved.
 */
export function buildGarmentTypeRegistry({ rateCard = [], catalog = [] }: { rateCard?: RateCardRow[]; catalog?: CatalogRow[] }): GarmentTypeEntry[] {
  const byKey = new Map<string, GarmentTypeEntry>();

  const upsert = (
    type: string,
    source: GarmentTypeSource,
    fields: { category?: string; basePrice?: number | null; workflow?: string } = {},
    authoritative = false,
  ) => {
    const label = clean(type);
    if (!label) return;
    const key = label.toLowerCase();
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        type: label,
        category: clean(fields.category),
        basePrice: fields.basePrice ?? null,
        workflow: clean(fields.workflow),
        sources: [source],
      });
      return;
    }
    if (!existing.sources.includes(source)) existing.sources.push(source);
    // The rate card is authoritative; the other sources only fill blanks.
    if (authoritative) {
      if (clean(fields.category)) existing.category = clean(fields.category);
      if (fields.basePrice !== undefined && fields.basePrice !== null) existing.basePrice = fields.basePrice;
      if (clean(fields.workflow)) existing.workflow = clean(fields.workflow);
    } else {
      if (!existing.category && clean(fields.category)) existing.category = clean(fields.category);
      if (existing.basePrice === null && fields.basePrice !== undefined && fields.basePrice !== null) existing.basePrice = fields.basePrice;
      if (!existing.workflow && clean(fields.workflow)) existing.workflow = clean(fields.workflow);
    }
  };

  // 1. Front Desk taxonomy — defines the shop's category grouping and order.
  ORDER_CATEGORIES.forEach((category) => {
    category.garments.forEach((garment) => upsert(garment, 'front-desk', { category: category.name }));
  });

  // 2. Admin Rate Card — pricing authority (category, base price, workflow).
  rateCard.forEach((row) => upsert(row.garment_type, 'rate-card', {
    category: row.garment_category,
    basePrice: toPrice(row.base_price),
    workflow: row.production_workflow,
  }, true));

  // 3. Live catalog records — keeps legacy values selectable.
  catalog.forEach((row) => upsert(row.garment_type || '', 'catalog', {
    category: row.garment_category,
    basePrice: toPrice(row.base_price),
    workflow: row.production_workflow,
  }));

  return Array.from(byKey.values());
}


/** Categories in taxonomy order, followed by any rate-card-only categories. */
export function registryCategories(registry: GarmentTypeEntry[]): string[] {
  const ordered: string[] = [];
  ORDER_CATEGORIES.forEach((category) => {
    if (registry.some((entry) => entry.category === category.name)) ordered.push(category.name);
  });
  registry.forEach((entry) => {
    if (entry.category && !ordered.includes(entry.category)) ordered.push(entry.category);
  });
  if (registry.some((entry) => !entry.category)) ordered.push('');
  return ordered;
}

/** Entries grouped for an optgroup'd selector — the selected category first. */
export function groupGarmentTypes(registry: GarmentTypeEntry[], preferredCategory?: string): { label: string; entries: GarmentTypeEntry[] }[] {
  const groups = registryCategories(registry)
    .map((category) => ({
      label: category || 'Uncategorised',
      entries: registry.filter((entry) => entry.category === category),
    }))
    .filter((group) => group.entries.length > 0);

  const preferred = clean(preferredCategory);
  if (!preferred) return groups;
  const match = groups.filter((group) => group.label === preferred);
  const rest = groups.filter((group) => group.label !== preferred);
  return match.length ? [...match, ...rest] : groups;
}

export function findGarmentType(registry: GarmentTypeEntry[], type: string): GarmentTypeEntry | undefined {
  const needle = clean(type).toLowerCase();
  if (!needle) return undefined;
  return registry.find((entry) => entry.type.toLowerCase() === needle);
}

/** True when the Pricing Engine holds a rule for this exact garment type. */
export function isPricedOnRateCard(registry: GarmentTypeEntry[], type: string): boolean {
  const entry = findGarmentType(registry, type);
  return Boolean(entry && entry.sources.includes('rate-card') && entry.basePrice !== null);
}

/**
 * True when the registry actually carries rate-card rules. When the server is
 * unreachable this is false, so the Admin UI hides "not on the rate card"
 * warnings instead of flagging every record as unpriced.
 */
export function hasRateCardRules(registry: GarmentTypeEntry[]): boolean {
  return registry.some((entry) => entry.sources.includes('rate-card') && entry.basePrice !== null);
}

/**
 * Difference between a record's own base price and the rate card's, or null
 * when the two agree (or the type isn't priced). Used to flag price drift.
 */
export function priceDrift(recordBasePrice: string | number | null | undefined, entry?: GarmentTypeEntry): number | null {
  const own = toPrice(recordBasePrice);
  if (!entry || entry.basePrice === null || own === null) return null;
  const difference = own - entry.basePrice;
  return difference === 0 ? null : difference;
}

/** The one-line status shown beside the garment type in the Admin form. */
export function rateCardStatus(registry: GarmentTypeEntry[], type: string, recordBasePrice?: string | number | null): {
  state: 'priced' | 'unpriced' | 'drifted' | 'empty';
  entry?: GarmentTypeEntry;
  drift: number | null;
  message: string;
} {
  if (!clean(type)) {
    return { state: 'empty', drift: null, message: 'Choose the garment type — it drives pricing, measurement points and the production workflow.' };
  }
  const entry = findGarmentType(registry, type);
  const drift = priceDrift(recordBasePrice, entry);
  if (entry && entry.sources.includes('rate-card') && entry.basePrice !== null) {
    if (drift !== null) {
      return {
        state: 'drifted',
        entry,
        drift,
        message: `Base price differs from the rate card by ${formatPHP(Math.abs(drift))} — the Front Desk always quotes the rate-card price.`,
      };
    }
    return { state: 'priced', entry, drift: null, message: `Priced on the rate card — ${formatPHP(entry.basePrice)} base, ${entry.workflow || 'standard'} workflow.` };
  }
  return {
    state: 'unpriced',
    entry,
    drift: null,
    message: 'Not on the rate card — the Front Desk cannot quote this garment until a pricing rule exists for this exact type.',
  };
}
