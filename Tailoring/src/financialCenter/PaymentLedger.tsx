// financialCenter/PaymentLedger.tsx
//
// THE PAYMENT LEDGER - the customer's complete payment audit trail read from
// customer_payments (the single payment source of truth shared with the Admin).
//
//   * active AND voided payments are always visible
//   * voided rows carry a clear Voided badge and never count toward totals
//   * historical rows recorded before the cash columns existed show an em dash
//     for Cash Received and Change Given (never an invented 0)
//   * "View receipt" and "Reprint receipt" read the EXISTING receipt record and
//     never create a new receipt number
//   * only an authorized Admin may void, and voiding never deletes the row
import { useMemo, useState } from 'react';
import { Ban, Printer, Search, ReceiptText, ShoppingBag } from 'lucide-react';
import type { FinancialPayment } from '../../services/frontDeskApi';
import frontDeskApi from '../../services/frontDeskApi';
import { COLORS } from '../Pages_Admin/Theme';
import { formatPHP, formatPHPExact } from '../utils/currency';
import { cashFigure } from './cash';
import { Pill } from './OrderLedger';
import { checkoutPrintDataFromSummary, printCheckoutSummary } from '../utils/printCheckoutSummary';

const PAGE_SIZE = 8;

export function PaymentLedger({
  payments, onViewReceipt, onVoid, canVoid = false,
}: {
  payments: FinancialPayment[];
  onViewReceipt: (payment: FinancialPayment) => void;
  /** Admin-only authorized voiding. Never a delete. */
  onVoid?: (payment: FinancialPayment, reason: string) => Promise<void>;
  canVoid?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<'All' | 'Active' | 'Voided'>('All');
  const [type, setType] = useState('All');
  const [page, setPage] = useState(1);
  const [voiding, setVoiding] = useState<FinancialPayment | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidError, setVoidError] = useState('');
  const [printingCheckout, setPrintingCheckout] = useState<string | null>(null);

  /**
   * Reprint the ONE checkout summary a payment belongs to. The document is
   * rebuilt from the payment records that share the checkout reference (there
   * is no stored summary document), so a voided allocation shows as voided.
   */
  async function printCheckout(payment: FinancialPayment) {
    const reference = payment.checkout_reference;
    if (!reference) return;
    try {
      setPrintingCheckout(reference);
      const summary = await frontDeskApi.getCheckoutSummary(reference);
      printCheckoutSummary(checkoutPrintDataFromSummary(summary));
    } catch (err) {
      setVoidError(err instanceof Error ? err.message : 'The checkout summary could not be loaded.');
    } finally {
      setPrintingCheckout(null);
    }
  }

  const types = useMemo(() => {
    const seen = new Set<string>();
    payments.forEach((payment) => { if (payment.payment_type) seen.add(payment.payment_type); });
    return ['All', ...Array.from(seen)];
  }, [payments]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return payments.filter((payment) => {
      const matchesQuery = !q || `${payment.receipt_number} ${payment.job_card_number || ''} ${payment.recorded_by_name} ${payment.payment_type}`.toLowerCase().includes(q);
      const matchesState = state === 'All' || (state === 'Voided' ? payment.is_voided : !payment.is_voided);
      const matchesType = type === 'All' || payment.payment_type === type;
      return matchesQuery && matchesState && matchesType;
    });
  }, [payments, query, state, type]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  async function submitVoid() {
    if (!voiding || !onVoid) return;
    if (!voidReason.trim()) { setVoidError('A void reason is required.'); return; }
    try {
      await onVoid(voiding, voidReason.trim());
      setVoiding(null);
      setVoidReason('');
      setVoidError('');
    } catch (err) {
      setVoidError(err instanceof Error ? err.message : 'Unable to void this payment.');
    }
  }

  return (
    <section className="border bg-white" style={{ borderColor: COLORS.border, borderRadius: 16 }}>
      <header className="flex flex-col gap-3 border-b p-5 lg:flex-row lg:items-center lg:justify-between" style={{ borderColor: COLORS.border }}>
        <div>
          <h2 className="text-[15px] font-semibold" style={{ color: COLORS.ink }}>Payment ledger</h2>
          <p className="mt-1 text-[11.5px]" style={{ color: COLORS.muted }}>
            {filtered.length} payment record{filtered.length === 1 ? '' : 's'} · voided rows stay visible for audit.
          </p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: COLORS.faint }} />
          <input
            value={query}
            onChange={(event) => { setQuery(event.target.value); setPage(1); }}
            placeholder="Search receipt no., order no., staff"
            className="w-full border bg-white py-2.5 pl-9 pr-3 text-[12.5px] outline-none lg:w-72"
            style={{ borderColor: COLORS.border, borderRadius: 8, color: COLORS.ink }}
          />
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 border-b px-5 py-3" style={{ borderColor: COLORS.border, background: COLORS.surfaceAlt }}>
        {(['All', 'Active', 'Voided'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => { setState(option); setPage(1); }}
            className="border px-2.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em]"
            style={state === option
              ? { borderColor: COLORS.navy, background: COLORS.navy, color: '#fff', borderRadius: 6 }
              : { borderColor: COLORS.border, background: COLORS.surface, color: COLORS.muted, borderRadius: 6 }}
          >
            {option}
          </button>
        ))}
        <span className="mx-1 hidden h-5 w-px sm:block" style={{ background: COLORS.border }} />
        {types.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => { setType(option); setPage(1); }}
            className="border px-2.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em]"
            style={type === option
              ? { borderColor: COLORS.brass, background: COLORS.brassSoft, color: COLORS.brassDeep, borderRadius: 6 }
              : { borderColor: COLORS.border, background: COLORS.surface, color: COLORS.muted, borderRadius: 6 }}
          >
            {option}
          </button>
        ))}
      </div>


      {/* Desktop table */}
      <div className="hidden overflow-x-auto lg:block">
        <div className="grid min-w-[1050px] grid-cols-[1.2fr_1fr_1.1fr_1.1fr_0.9fr_0.9fr_0.9fr_1fr_0.8fr_1.6fr] gap-3 border-b px-5 py-3" style={{ borderColor: COLORS.border }}>
          {['Date & time', 'Receipt no.', 'Order no.', 'Payment type', 'Amount', 'Cash received', 'Change given', 'Staff', 'Status', 'Actions'].map((label) => (
            <span key={label} className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: COLORS.faint }}>{label}</span>
          ))}
        </div>
        {pageRows.map((payment) => (
          <div
            key={String(payment.payment_id)}
            className="grid min-w-[1050px] grid-cols-[1.2fr_1fr_1.1fr_1.1fr_0.9fr_0.9fr_0.9fr_1fr_0.8fr_1.6fr] items-center gap-3 border-b px-5 py-3"
            style={{ borderColor: COLORS.border, opacity: payment.is_voided ? 0.75 : 1 }}
          >
            <span className="text-[11.5px]" style={{ color: COLORS.muted }}>
              {new Date(payment.paid_at).toLocaleDateString()}<br />
              <span className="mono text-[10.5px]">{payment.payment_time || new Date(payment.paid_at).toLocaleTimeString().slice(0, 5)}</span>
            </span>
            <span className="mono text-[12px]" style={{ color: COLORS.ink }}>{payment.receipt_number}</span>
            <span className="mono text-[11.5px]" style={{ color: COLORS.inkSoft }}>
              {payment.job_card_number || '—'}
              {payment.checkout_reference && (
                <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: COLORS.brassDeep }}>
                  {payment.checkout_reference}
                </span>
              )}
            </span>
            <span className="text-[12px]" style={{ color: COLORS.ink }}>{payment.payment_type}</span>
            <span className="mono text-[12.5px] font-medium" style={{ color: payment.is_voided ? COLORS.muted : COLORS.ink, textDecoration: payment.is_voided ? 'line-through' : 'none' }}>{formatPHPExact(payment.amount)}</span>
            <span className="mono text-[12px]" style={{ color: COLORS.muted }}>{cashFigure(payment.cash_received)}</span>
            <span className="mono text-[12px]" style={{ color: COLORS.muted }}>{cashFigure(payment.change_given)}</span>
            <span className="text-[12px]" style={{ color: COLORS.inkSoft }}>{payment.recorded_by_name}</span>
            <span>{payment.is_voided ? <Pill tone="neutral">Voided</Pill> : <Pill tone="success">Active</Pill>}</span>
            <span className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => onViewReceipt(payment)} className="inline-flex items-center gap-1 border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.06em]" style={{ borderColor: COLORS.border, color: COLORS.inkSoft, borderRadius: 6 }}>
                <ReceiptText className="h-3 w-3" /> View receipt
              </button>
              <button type="button" onClick={() => onViewReceipt(payment)} className="inline-flex items-center gap-1 border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.06em]" style={{ borderColor: COLORS.border, color: COLORS.inkSoft, borderRadius: 6 }}>
                <Printer className="h-3 w-3" /> Reprint
              </button>
              {payment.checkout_reference && (
                <button
                  type="button"
                  onClick={() => printCheckout(payment)}
                  disabled={printingCheckout === payment.checkout_reference}
                  className="inline-flex items-center gap-1 border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] disabled:opacity-50"
                  style={{ borderColor: COLORS.brassSoftBorder, color: COLORS.brassDeep, borderRadius: 6 }}
                  title={`Print the checkout summary for ${payment.checkout_reference}`}
                >
                  <ShoppingBag className="h-3 w-3" />
                  {printingCheckout === payment.checkout_reference ? 'Loading…' : 'Checkout'}
                </button>
              )}
              {canVoid && !payment.is_voided && onVoid && (
                <button type="button" onClick={() => { setVoiding(payment); setVoidError(''); }} className="inline-flex items-center gap-1 border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.06em]" style={{ borderColor: COLORS.dangerBorder, color: COLORS.danger, borderRadius: 6 }}>
                  <Ban className="h-3 w-3" /> Void
                </button>
              )}
            </span>
          </div>
        ))}
      </div>


      {/* Mobile / tablet cards */}
      <div className="lg:hidden">
        {pageRows.map((payment) => (
          <div key={String(payment.payment_id)} className="border-b p-4" style={{ borderColor: COLORS.border, opacity: payment.is_voided ? 0.75 : 1 }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="mono text-[11.5px]" style={{ color: COLORS.ink }}>{payment.receipt_number}</div>
                <div className="mt-0.5 text-[11.5px]" style={{ color: COLORS.muted }}>
                  {new Date(payment.paid_at).toLocaleString()} · {payment.job_card_number || '—'}
                </div>
              </div>
              {payment.is_voided ? <Pill tone="neutral">Voided</Pill> : <Pill tone="success">Active</Pill>}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-[11.5px]">
              <div><span style={{ color: COLORS.muted }}>Amount</span><div className="mono" style={{ color: COLORS.ink }}>{formatPHP(payment.amount)}</div></div>
              <div><span style={{ color: COLORS.muted }}>Cash in</span><div className="mono" style={{ color: COLORS.muted }}>{cashFigure(payment.cash_received)}</div></div>
              <div><span style={{ color: COLORS.muted }}>Change</span><div className="mono" style={{ color: COLORS.muted }}>{cashFigure(payment.change_given)}</div></div>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="text-[11px]" style={{ color: COLORS.muted }}>{payment.payment_type} · {payment.recorded_by_name}</span>
              {payment.checkout_reference && (
                <span className="mono text-[10.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: COLORS.brassDeep }}>
                  {payment.checkout_reference}
                </span>
              )}
              <button type="button" onClick={() => onViewReceipt(payment)} className="inline-flex items-center gap-1 border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.06em]" style={{ borderColor: COLORS.border, color: COLORS.inkSoft, borderRadius: 6 }}>
                <ReceiptText className="h-3 w-3" /> View receipt
              </button>
              {payment.checkout_reference && (
                <button
                  type="button"
                  onClick={() => printCheckout(payment)}
                  disabled={printingCheckout === payment.checkout_reference}
                  className="inline-flex items-center gap-1 border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] disabled:opacity-50"
                  style={{ borderColor: COLORS.brassSoftBorder, color: COLORS.brassDeep, borderRadius: 6 }}
                >
                  <ShoppingBag className="h-3 w-3" /> Checkout summary
                </button>
              )}
              {canVoid && !payment.is_voided && onVoid && (
                <button type="button" onClick={() => { setVoiding(payment); setVoidError(''); }} className="inline-flex items-center gap-1 border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.06em]" style={{ borderColor: COLORS.dangerBorder, color: COLORS.danger, borderRadius: 6 }}>
                  <Ban className="h-3 w-3" /> Void
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {!pageRows.length && <p className="p-10 text-center text-[13px]" style={{ color: COLORS.muted }}>No payment matches this filter.</p>}

      {pageCount > 1 && (
        <footer className="flex items-center justify-between gap-3 px-5 py-3" style={{ borderTop: `1px solid ${COLORS.border}` }}>
          <span className="text-[11px]" style={{ color: COLORS.muted }}>Page {safePage} of {pageCount}</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1} className="border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-40" style={{ borderColor: COLORS.border, color: COLORS.inkSoft, borderRadius: 6 }}>Previous</button>
            <button type="button" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={safePage >= pageCount} className="border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-40" style={{ borderColor: COLORS.border, color: COLORS.inkSoft, borderRadius: 6 }}>Next</button>
          </div>
        </footer>
      )}

      {/* Authorized voiding - the payment row is never deleted */}
      {voiding && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button aria-label="Close" onClick={() => setVoiding(null)} className="absolute inset-0" style={{ background: 'rgba(17,24,39,0.55)' }} />
          <div className="relative w-full max-w-md border bg-white p-6" style={{ borderColor: COLORS.border, borderRadius: 16 }}>
            <h3 className="text-[15px] font-semibold" style={{ color: COLORS.ink }}>Void payment {voiding.receipt_number}</h3>
            <p className="mt-2 text-[12px]" style={{ color: COLORS.muted }}>
              The payment row stays in the ledger with a Voided badge and the order balance is restored by the original payment amount of {formatPHPExact(voiding.amount)}.
            </p>
            <label className="mt-4 block">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: COLORS.muted }}>Void reason</span>
              <textarea
                value={voidReason}
                onChange={(event) => setVoidReason(event.target.value)}
                rows={3}
                className="mt-1.5 w-full border px-3 py-2 text-[12.5px] outline-none"
                style={{ borderColor: COLORS.border, borderRadius: 8, color: COLORS.ink }}
                placeholder="Why is this payment being voided?"
              />
            </label>
            {voidError && <p className="mt-2 text-[12px]" style={{ color: COLORS.danger }}>{voidError}</p>}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setVoiding(null)} className="px-4 py-2.5 text-[12px] font-semibold" style={{ border: `1px solid ${COLORS.border}`, color: COLORS.inkSoft, borderRadius: 8 }}>Cancel</button>
              <button type="button" onClick={submitVoid} className="px-4 py-2.5 text-[12px] font-semibold text-white" style={{ background: COLORS.danger, borderRadius: 8 }}>Void payment</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default PaymentLedger;
