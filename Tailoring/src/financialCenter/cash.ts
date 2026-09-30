// financialCenter/cash.ts
//
// THE CASH RULE - one implementation for every payment entry path.
//
// The tailoring shop accepts Cash only for new payments:
//
//   Change Given = Cash Received - Amount to Pay
//   New Balance  = Previous Balance - Amount to Pay      (never Cash Received)
//
// These helpers are used by the order-intake deposit, the existing-order
// payment modal, quick-pay actions and the Customer Financial Center, so the
// counter sees identical fields, identical messages and identical arithmetic
// everywhere. The server re-validates every figure independently; these checks
// only disable submission early so the user never gets a rejected request.
import { formatPHPExact } from '../utils/currency';

/** The only payment method accepted for new payments. Rendered read-only. */
export const CASH_METHOD = 'Cash';

/** Parses a money input ("4250.50") into a number; NaN-safe. */
export function toAmount(value: string | number | null | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** Rounds to centavos so no floating-point drift reaches the ledger. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Change Given = Cash Received - Amount to Pay (never negative). */
export function cashChange(amountToPay: number | string, cashReceived: number | string): number {
  const change = round2(toAmount(cashReceived) - toAmount(amountToPay));
  return change > 0 ? change : 0;
}

export interface CashValidationInput {
  /** Amount to Pay in pesos. */
  amountToPay: number | string;
  /** Remaining balance of the job card, when one is selected. */
  balance?: number | string | null;
  /** Cash handed over in pesos. */
  cashReceived: number | string;
}

/**
 * Mirrors the server's validation exactly:
 *   - Amount to Pay > 0
 *   - Amount to Pay <= Remaining Balance
 *   - Cash Received > 0
 *   - Cash Received >= Amount to Pay
 * Returns the message to show, or null when the payment may be submitted.
 */
export function cashValidationMessage({ amountToPay, balance, cashReceived }: CashValidationInput): string | null {
  const amount = toAmount(amountToPay);
  const cash = toAmount(cashReceived);
  const hasAmount = String(amountToPay).trim() !== '';
  const hasCash = String(cashReceived).trim() !== '';
  if (!hasAmount || amount <= 0) return 'Payment amount must be greater than zero.';
  const limit = balance == null ? null : round2(toAmount(balance));
  if (limit != null && amount > limit) return `Payment cannot exceed the remaining balance of ${formatPHPExact(limit)}.`;
  if (!hasCash || cash <= 0) return 'Cash received must be greater than zero.';
  if (cash < amount) return 'Cash received cannot be less than the payment amount.';
  return null;
}

/**
 * The payment type a cash amount represents against the remaining balance:
 * a full settlement is a Final Payment, anything less is a Partial Payment
 * (the first payment on a brand-new order is its Deposit).
 */
export function paymentTypeForAmount(
  amountToPay: number | string,
  balance: number | string,
  isFirstPayment = false,
): 'Deposit' | 'Partial Payment' | 'Final Payment' {
  const amount = round2(toAmount(amountToPay));
  const remaining = round2(toAmount(balance));
  if (isFirstPayment && amount < remaining) return 'Deposit';
  if (remaining > 0 && amount >= remaining) return 'Final Payment';
  return 'Partial Payment';
}

/**
 * Nullable money for the payment ledger and receipts: historical rows recorded
 * before the cash columns existed have no cash figures and must show an em dash
 * rather than an invented 0.
 */
export function cashFigure(value: number | null | undefined): string {
  return value == null ? '—' : formatPHPExact(value);
}
