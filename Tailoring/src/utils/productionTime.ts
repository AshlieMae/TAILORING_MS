// utils/productionTime.ts
//
// THE CENTRAL PRODUCTION-TIME FORMATTER — every turnaround the shop quotes
// ("7–10 Business Days") is built here so the en dash (–, U+2013), the unit
// and the wording are identical on the catalog, the consultation drawer, the
// intake form, job cards and customer-facing pages. Legacy values such as
// "7–10 days" are normalised automatically.

export const BUSINESS_DAY_UNIT = 'Business Days';

/** Label used above a production-time value. */
export const ESTIMATED_PRODUCTION_TIME_LABEL = 'Estimated Production Time';

/** "7, 10" -> "7–10 Business Days" (with a real en dash). */
export function businessDayRange(min: number, max: number): string {
  return `${min}\u2013${max} ${BUSINESS_DAY_UNIT}`;
}

/** The shop's default turnaround when a garment type is unlisted. */
export const PRODUCTION_TIME_FALLBACK = businessDayRange(7, 10);

/**
 * Normalise any stored/free-form turnaround into the standard wording.
 * "7–10 days" -> "7–10 Business Days", "5 - 7 days" -> "5–7 Business Days".
 */
export function formatProductionTime(value?: string | null): string {
  const raw = (value || '').trim();
  if (!raw) return PRODUCTION_TIME_FALLBACK;
  const match = raw.match(/(\d+)\s*[\u2013\u2014-]\s*(\d+)/);
  if (match) return businessDayRange(Number(match[1]), Number(match[2]));
  // Single-day value such as "3 days" or "3".
  const single = raw.match(/(\d+)/);
  if (single) return `${single[1]} ${BUSINESS_DAY_UNIT}`;
  return raw.endsWith(BUSINESS_DAY_UNIT) ? raw : `${raw} ${BUSINESS_DAY_UNIT}`;
}
