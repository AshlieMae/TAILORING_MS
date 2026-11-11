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

export function productionDayRange(value?: string | null): { min: number; max: number } | null {
  const match = String(value || '').match(/(\d+)\s*[\u2013\u2014-]\s*(\d+)/);
  if (match) return { min: Number(match[1]), max: Number(match[2]) };
  const single = String(value || '').match(/(\d+)/);
  return single ? { min: Number(single[1]), max: Number(single[1]) } : null;
}

/** Add shop business days. Sundays and configured dates are excluded. */
export function addBusinessDays(startDate: string | Date, days: number, excludedDates: string[] = []): string {
  const date = new Date(`${typeof startDate === 'string' ? startDate : startDate.toISOString().slice(0, 10)}T12:00:00`);
  const excluded = new Set(excludedDates);
  let added = 0;
  while (added < Math.max(0, days)) {
    date.setDate(date.getDate() + 1);
    const iso = date.toISOString().slice(0, 10);
    if (date.getDay() !== 0 && !excluded.has(iso)) added += 1;
  }
  return date.toISOString().slice(0, 10);
}

export function configuredNonWorkingDays(): string[] {
  try {
    const raw = localStorage.getItem('tailoring.nonWorkingDays');
    const values = raw ? JSON.parse(raw) : [];
    return Array.isArray(values) ? values.filter((value): value is string => /^\d{4}-\d{2}-\d{2}$/.test(value)) : [];
  } catch {
    return [];
  }
}
