/**
 * GARMENT DESCRIPTION ASSISTANT
 * ---------------------------------------------------------------------------
 * Writes the storefront copy for a catalog garment from the business fields the
 * admin has already filled in: garment name, category, type, production
 * workflow, measurement profile, allowed styles, fabrics, and customizations.
 *
 * Why a local engine? The shop's Express + MySQL server ships no AI provider
 * (no SDK, no API key), so nothing here depends on a paid service or a network
 * round-trip — descriptions compose instantly, in a consistent house voice, and
 * the admin edits them freely before saving.
 *
 * If the shop later wires up an LLM, set VITE_AI_DESCRIPTION_ENDPOINT to an
 * endpoint that accepts this JSON context and returns { description } (or
 * { text }). It is used when reachable; the local writer is the fallback, so
 * the button never becomes a dead end.
 */

export type DescriptionContext = {
  name: string;
  garmentType: string;
  category: string;
  workflow: string;
  measurementProfile: string;
  styles: string[];
  fabrics: string[];
  customizations: string[];
};

export type DescriptionEngine = 'studio' | 'cloud';

export type DescriptionResult = {
  text: string;
  engine: DescriptionEngine;
  /** Which catalog fields shaped the copy — surfaced in the form for trust. */
  sources: string[];
  /** Fields that are still blank and would sharpen the next draft. */
  missing: string[];
};

export type DescriptionInput = {
  name?: string;
  garment_type?: string;
  garment_category?: string;
  production_workflow?: string;
  measurement_profile?: string;
  allowed_styles?: string[] | null;
  allowed_fabrics?: string[] | null;
  fabrics?: string[] | null;
  allowed_customizations?: string[] | null;
};

/* ------------------------------------------------------------------ helpers */

const clean = (value?: string | null) => (value || '').trim();
/** Categories and types read as common nouns in copy ("formal wear", "two-piece suit"). */
const lowerPhrase = (value: string) => clean(value).toLowerCase();

/** "A", "A and B", "A, B, and C" — with a cap so copy never runs long. */
function listOf(items: string[], limit = 3): string {
  const words = items.map(clean).filter(Boolean);
  if (!words.length) return '';
  const capped = words.slice(0, limit);
  const extra = words.length - capped.length;
  const body = capped.length === 1
    ? capped[0]
    : capped.length === 2
      ? `${capped[0]} and ${capped[1]}`
      : `${capped.slice(0, -1).join(', ')}, and ${capped[capped.length - 1]}`;
  return extra > 0 ? `${body} (plus ${extra} more)` : body;
}

/** Rotates so repeated drafts never produce the same wording back to back. */
let lastPick = -1;
function pick(options: string[]): string {
  const usable = options.filter(Boolean);
  if (usable.length <= 1) return usable[0] || '';
  let index = Math.floor(Math.random() * usable.length);
  if (index === lastPick) index = (index + 1) % usable.length;
  lastPick = index;
  return usable[index];
}

const sentence = (value: string) => {
  const text = value.replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const capitalised = text.charAt(0).toUpperCase() + text.slice(1);
  return /[.!?]$/.test(capitalised) ? capitalised : `${capitalised}.`;
};

/* --------------------------------------------------------- domain language */

/** Occasion language, inferred from the category (and type as a backstop). */
function occasionFor(...candidates: string[]): string {
  const key = candidates.join(' ').toLowerCase();
  if (/uniform|school|office/.test(key)) return 'daily campus and workplace wear';
  if (/women|filipiniana|dress|gown|debut/.test(key)) return 'debuts, receptions, and evening events';
  if (/bespoke|custom/.test(key)) return 'clients who want a silhouette that exists nowhere else';
  if (/coat|jacket|blazer|outer/.test(key)) return 'cooler months and layered formal looks';
  if (/traditional|heritage|barong|piña|pina/.test(key)) return 'heritage occasions and milestone celebrations';
  if (/formal|suit|tux|gala|wedding/.test(key)) return 'weddings, galas, and milestone celebrations';
  return 'occasions that call for a sharp, personal fit';
}

/** Construction language, keyed to the production workflow the shop assigns. */
const CRAFT: Record<string, string> = {
  formal_barong: 'hand-finished barong detailing and a crisp, formal line',
  suit: 'structured tailoring over a clean, canvassed front',
  coat: 'layered outerwear construction that holds its shape season after season',
  gown: 'floor-skimming gown construction with a considered, architectural drape',
  dress: 'fluid dress draping that moves with the wearer',
  uniform: 'uniform-grade construction built to survive the school run and the work week',
  bespoke: 'single-pattern drafting for a fit that exists for one person only',
  standard: 'time-tested construction and a tidy interior finish',
};

/** How the garment is drafted — ties the copy back to intake measurements. */
const FIT: Record<string, string> = {
  upper_body: 'an upper-body measurement set (chest, shoulders, sleeve, and neck)',
  lower_body: 'a lower-body measurement set (waist, hips, rise, and inseam)',
  full_body: 'a full-body measurement set taken in person',
  head: 'an accessory measurement set',
};

/* ------------------------------------------------------------ the AI writer */

/**
 * Composes a professional, storefront-ready description. A sentence is only
 * included when the matching detail exists, so a half-filled record still reads
 * cleanly instead of sounding like a form.
 */
export function composeStudioDescription(ctx: DescriptionContext): string {
  const name = clean(ctx.name);
  const type = clean(ctx.garmentType) || name || 'garment';
  const category = clean(ctx.category);
  const descriptor = category ? `${lowerPhrase(category)} ` : '';
  const subject = name || type;
  const occasion = occasionFor(category, type, name);
  const craft = CRAFT[clean(ctx.workflow)] || '';
  const fit = FIT[clean(ctx.measurementProfile)] || 'a measurement set taken in person';

  const identity = pick([
    `${subject} is a ${descriptor}piece built for ${occasion}, finished to the standard the shop puts its name on.`,
    `${subject} sits in the ${descriptor}line — designed for ${occasion} and cut to be worn, not stored.`,
    `${subject} brings a ${descriptor}silhouette to ${occasion}, with the kind of detail that reads as effort rather than excess.`,
    `${subject} is our ${descriptor}offering for ${occasion}: quietly formal, exactly fitted, and made to last.`,
  ]);

  const construction = craft
    ? pick([`It leans on ${craft}.`, `The make is defined by ${craft}.`, `Construction follows ${craft}.`])
    : '';

  const styles = listOf(ctx.styles || []);
  const styleCount = (ctx.styles || []).filter((style) => clean(style)).length;
  const styling = !styles
    ? 'The silhouette is settled with you at the fitting, then drafted from scratch.'
    : styleCount === 1
      ? `Offered in ${styles}, cut to your measurements rather than a size chart.`
      : pick([
          `Available in ${styles}, so you choose the line that suits you best.`,
          `Choose between ${styles}; each version is patterned to your body, not a size chart.`,
        ]);

  const fabrics = listOf(ctx.fabrics || [], 3);
  const fabric = fabrics
    ? pick([
        `Worked in ${fabrics}, selected for how each cloth falls on the finished garment.`,
        `Fabric options include ${fabrics}, chosen with you at the fitting.`,
      ])
    : "Fabric is chosen with you from the shop's current stock, matched to the occasion and the season.";
  const fabricNote = pick([
    'Fabric weight and finish are confirmed before cutting so the drape behaves as intended.',
    'Cloth is cut with a generous seam allowance, leaving room for future refitting.',
    '',
  ]);

  const customizations = listOf(ctx.customizations || []);
  const customisation = customizations
    ? pick([
        `Personalise the finish with ${customizations}.`,
        `Make it yours with ${customizations}, adjusted at the fitting rather than after.`,
      ])
    : 'Details such as collar, closures, lining, and pockets are settled together at the fitting.';

  const closing = pick([
    `Every ${lowerPhrase(type)} starts from ${fit} and is hand-finished in our workroom, then refitted until the drape falls exactly right.`,
    `Each ${lowerPhrase(type)} is built from ${fit}, hand-finished in our workroom, and adjusted during fitting until it sits perfectly.`,
  ]);

  return [identity, construction, styling, fabric, fabricNote, customisation, closing]
    .filter(Boolean)
    .map(sentence)
    .join(' ');
}

/* ------------------------------------------------------------ form plumbing */

export function buildDescriptionContext(input: DescriptionInput): DescriptionContext {
  return {
    name: clean(input.name),
    garmentType: clean(input.garment_type),
    category: clean(input.garment_category),
    workflow: clean(input.production_workflow),
    measurementProfile: clean(input.measurement_profile),
    styles: (input.allowed_styles || []).map(clean).filter(Boolean),
    fabrics: (input.fabrics?.length ? input.fabrics : input.allowed_fabrics) || [],
    customizations: (input.allowed_customizations || []).map(clean).filter(Boolean),
  };
}

/** Human-readable recap of what the assistant actually read. */
export function describeSources(ctx: DescriptionContext): string[] {
  const sources: string[] = [];
  if (ctx.name) sources.push('garment name');
  if (ctx.category) sources.push(`${ctx.category} category`);
  if (ctx.garmentType && ctx.garmentType !== ctx.name) sources.push(`${ctx.garmentType} type`);
  if (ctx.workflow) sources.push('production workflow');
  if (ctx.measurementProfile) sources.push('measurement profile');
  if (ctx.styles.length) sources.push(`${ctx.styles.length} style${ctx.styles.length === 1 ? '' : 's'}`);
  if (ctx.fabrics.length) sources.push(`${ctx.fabrics.length} fabric${ctx.fabrics.length === 1 ? '' : 's'}`);
  if (ctx.customizations.length) sources.push(`${ctx.customizations.length} customization${ctx.customizations.length === 1 ? '' : 's'}`);
  return sources;
}

/** Blank fields that would sharpen the next draft. */
export function describeMissing(ctx: DescriptionContext): string[] {
  const missing: string[] = [];
  if (!ctx.name) missing.push('garment name');
  if (!ctx.category) missing.push('category');
  if (!ctx.styles.length) missing.push('allowed styles');
  if (!ctx.fabrics.length) missing.push('fabrics');
  if (!ctx.customizations.length) missing.push('customizations');
  return missing;
}

const CLOUD_ENDPOINT: string = (import.meta.env?.VITE_AI_DESCRIPTION_ENDPOINT as string | undefined) || '';

/**
 * Drafts the description. Uses the configured language-model endpoint when one
 * is available, otherwise the on-device writer — either way the admin receives
 * editable copy rather than a locked-in value.
 */
export async function generateGarmentDescription(ctx: DescriptionContext): Promise<DescriptionResult> {
  const sources = describeSources(ctx);
  const missing = describeMissing(ctx);

  if (CLOUD_ENDPOINT) {
    try {
      const response = await fetch(CLOUD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: 'garment-storefront-description', ...ctx }),
      });
      if (response.ok) {
        const data = await response.json();
        const text = clean(data.description || data.text);
        if (text) return { text: sentence(text), engine: 'cloud', sources, missing };
      }
    } catch {
      /* Unreachable endpoint: fall through to the on-device writer. */
    }
  }

  // A short, deliberate beat keeps the drafting state visible so the admin can
  // see the copy was composed from their inputs rather than pasted instantly.
  await new Promise((resolve) => setTimeout(resolve, 420));
  return { text: composeStudioDescription(ctx), engine: 'studio', sources, missing };
}

