// utils/currency.ts
//
// THE CENTRAL CURRENCY FORMATTER — every peso amount in the system is
// rendered through this module so the Philippine Peso sign (₱), thousands
// separators and decimal places are identical on every surface:
// quotations, orders, invoices, deposits, catalogs, dashboards and reports.
//
//   formatPHP(1800)       -> "₱1,800"      (whole pesos, counter-facing)
//   formatPHPExact(1800)  -> "₱1,800.00"   (receipts, invoices, statements)
//
// Intl.NumberFormat('en-PH', { currency: 'PHP' }) always emits the real U+20B1
// peso sign (U+20B1), so the broken double-encoded sequence can never reappear.

const wholePesos = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const exactPesos = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const smartPesos = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Counter-facing money: whole pesos, e.g. ₱1,800. */
export function formatPHP(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0);
  return wholePesos.format(Number.isFinite(n) ? n : 0);
}

/** Ledger-facing money: always two decimals, e.g. ₱1,800.00. */
export function formatPHPExact(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0);
  return exactPesos.format(Number.isFinite(n) ? n : 0);
}

/**
 * Quotation-facing money: up to two decimals but no trailing zeros,
 * e.g. ₱1,080.50 renders as ₱1,080.5 while ₱1,800 stays ₱1,800.
 */
export function formatPHPSmart(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0);
  return smartPesos.format(Number.isFinite(n) ? n : 0);
}

/**
 * Compact chart-axis money, e.g. ₱12k / ₱1.2m — used on dashboards and
 * report charts where the full amount would not fit.
 */
export function formatPHPCompact(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0);
  if (!Number.isFinite(n) || n === 0) return '₱0';
  if (Math.abs(n) >= 1_000_000) return `₱${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}m`;
  if (Math.abs(n) >= 1_000) return `₱${Math.round(n / 1_000)}k`;
  return formatPHP(n);
}

/** Shorthand alias used across the desks (kept for readability at call sites). */
export const peso = formatPHP;

export default formatPHP;
