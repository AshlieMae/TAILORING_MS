// financialCenter/CashPaymentForm.tsx
//
// THE ONE CASH PAYMENT FORM.
//
// Every payment entry path in the system renders these same fields and runs the
// same validation: the initial deposit during order creation, the existing-order
// payment modal, quick-pay actions on a job card, and "Record Cash Payment" on
// the Customer Financial Center. There is no second payment form anywhere.
//
//   Amount to Pay (₱)        - required, > 0 and <= Remaining Balance
//   Payment Method: Cash     - READ ONLY (the shop accepts cash only)
//   Cash Received (₱)        - required, > 0 and >= Amount to Pay
//   Change Given (₱)         - read-only, recomputed on every keystroke
//   Notes                    - optional
//
// The server re-validates every figure against the locked live balance and
// rejects invalid requests, so the UI disabling is a courtesy, not the guard.
import { useMemo, useState } from 'react';
import { Banknote, Loader2, X } from 'lucide-react';
import frontDeskApi, { type Payment } from '../../services/frontDeskApi';
import { COLORS, shadowModal } from '../Pages_Admin/Theme';
import { formatPHP, formatPHPExact } from '../utils/currency';
import { CASH_METHOD, cashChange, cashValidationMessage, paymentTypeForAmount, toAmount } from './cash';

const INPUT = 'w-full border bg-white px-3 py-2.5 text-sm outline-none transition-colors disabled:cursor-not-allowed disabled:bg-[#F3F4F6] disabled:text-[#6B7280]';

export function FieldShell({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: COLORS.muted }}>{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="mt-1.5 block text-[11px] leading-relaxed" style={{ color: COLORS.faint }}>{hint}</span>}
    </label>
  );
}

export interface CashPaymentFieldsProps {
  /** Remaining balance of the job card being paid. */
  balance: number;
  amount: string;
  onAmountChange: (value: string) => void;
  cashReceived: string;
  onCashReceivedChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  /** Live validation message shown under the fields (null = may submit). */
  error?: string | null;
  showNotes?: boolean;
}

/**
 * The shared cash field set. Used verbatim by the intake deposit, the payment
 * modal and the Financial Center, so the counter sees one form everywhere.
 */
export function CashPaymentFields({
  balance, amount, onAmountChange, cashReceived, onCashReceivedChange, notes, onNotesChange, error, showNotes = true,
}: CashPaymentFieldsProps) {
  const change = cashChange(amount, cashReceived);
  const inputStyle: React.CSSProperties = { borderColor: COLORS.border, borderRadius: 8, color: COLORS.ink };
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldShell label="Amount to Pay (₱)" hint={`Remaining balance ${formatPHPExact(balance)}`}>
          <input
            type="number" min={0} step="0.01" inputMode="decimal"
            value={amount}
            onChange={(event) => onAmountChange(event.target.value)}
            className={`${INPUT} mono`} style={inputStyle}
            placeholder="0"
          />
        </FieldShell>
        <FieldShell label="Payment Method">
          {/* Cash only - read-only by design, never a selector. */}
          <input readOnly value={CASH_METHOD} className={`${INPUT} mono`} style={{ ...inputStyle, background: COLORS.surfaceAlt }} aria-readonly="true" />
        </FieldShell>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldShell label="Cash Received (₱)" hint="Money handed over at the counter.">
          <input
            type="number" min={0} step="0.01" inputMode="decimal"
            value={cashReceived}
            onChange={(event) => onCashReceivedChange(event.target.value)}
            className={`${INPUT} mono`} style={inputStyle}
            placeholder="0"
          />
        </FieldShell>
        <FieldShell label="Change Given (₱)" hint="Cash Received − Amount to Pay">
          <input
            readOnly value={formatPHPExact(change)}
            className={`${INPUT} mono`}
            style={{ ...inputStyle, background: COLORS.surfaceAlt }}
            aria-readonly="true"
          />
        </FieldShell>
      </div>

      {showNotes && (
        <FieldShell label="Notes (optional)">
          <input
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
            className={INPUT} style={inputStyle}
            placeholder="Optional note for this cash payment"
          />
        </FieldShell>
      )}

      {error && (
        <p className="border px-3 py-2 text-[12px]" style={{ borderColor: COLORS.dangerBorder, background: COLORS.dangerBg, color: COLORS.danger, borderRadius: 8 }}>{error}</p>
      )}
    </div>
  );
}

export interface PayableOrder {
  order_id: string | number;
  job_card_id: string;
  garment_type: string;
  /** Live remaining balance from the job card (the server re-checks it). */
  remaining_balance: number;
  /** Total already recorded against this job card (drives Deposit vs Partial). */
  deposit_paid?: number;
}

export interface RecordCashPaymentModalProps {
  /** Job cards the payment may be applied to (already filtered to this customer
   *  when opened from the Financial Center). */
  orders: PayableOrder[];
  /** Pre-selected job card (order_id or job_card_id) when opened from a row. */
  initialOrderRef?: string;
  customerName?: string;
  onClose: () => void;
  /** Called after the server accepted the payment (shared receipt record). */
  onRecorded?: (payment: Payment) => void;
}

/**
 * Record Cash Payment - the single modal behind "Record Cash Payment", the
 * existing-order payment modal and quick-pay actions.
 */
export function RecordCashPaymentModal({ orders, initialOrderRef, customerName, onClose, onRecorded }: RecordCashPaymentModalProps) {
  const payable = useMemo(() => orders.filter((order) => Number(order.remaining_balance) > 0), [orders]);
  const [orderRef, setOrderRef] = useState(() => {
    const match = payable.find((order) => String(order.order_id) === String(initialOrderRef) || order.job_card_id === initialOrderRef);
    return match ? String(match.order_id) : '';
  });
  const [amount, setAmount] = useState('');
  const [cashReceived, setCashReceived] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const selected = payable.find((order) => String(order.order_id) === orderRef) || null;
  const balance = selected ? Number(selected.remaining_balance) || 0 : 0;
  const alreadyPaid = selected ? Number(selected.deposit_paid) || 0 : 0;
  const change = cashChange(amount, cashReceived);
  const newBalance = Math.max(0, Math.round((balance - toAmount(amount)) * 100) / 100);
  const fieldError = selected
    ? cashValidationMessage({ amountToPay: amount, balance, cashReceived })
    : 'Select the job card this payment belongs to.';

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) { setError('Select the job card this payment belongs to.'); return; }
    const invalid = cashValidationMessage({ amountToPay: amount, balance: Number(selected.remaining_balance), cashReceived });
    if (invalid) { setError(invalid); return; }
    setSaving(true);
    setError('');
    try {
      const payment = await frontDeskApi.recordPayment({
        orderId: String(selected.order_id),
        amount: toAmount(amount),
        cashReceived: toAmount(cashReceived),
        paymentType: paymentTypeForAmount(amount, selected.remaining_balance, alreadyPaid <= 0),
        paymentMethod: CASH_METHOD,
        notes,
      });
      onRecorded?.(payment);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record the payment.');
    } finally {
      setSaving(false);
    }
  }



  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0" style={{ background: 'rgba(17,24,39,0.55)', backdropFilter: 'blur(2px)' }} />
      <form
        onSubmit={handleSubmit}
        className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto border bg-white"
        style={{ borderColor: COLORS.border, borderRadius: 16, boxShadow: shadowModal }}
      >
        <header className="flex items-start justify-between gap-4 p-6 pb-4">
          <div>
            <span className="mono text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: COLORS.brassDeep }}>Cash payment</span>
            <h2 className="mt-1 text-xl font-semibold" style={{ color: COLORS.ink }}>Record Cash Payment</h2>
            <p className="mt-1 text-[12px]" style={{ color: COLORS.muted }}>
              {customerName ? `${customerName} · ` : ''}Cash only. Change is computed automatically.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5" style={{ color: COLORS.muted, borderRadius: 8 }} aria-label="Close payment form">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-5 px-6 pb-6">
          <FieldShell label="Job card">
            <select
              value={orderRef}
              onChange={(event) => { setOrderRef(event.target.value); setError(''); }}
              className={INPUT}
              style={{ borderColor: COLORS.border, borderRadius: 8, color: COLORS.ink }}
            >
              <option value="">Select the job card…</option>
              {payable.map((order) => (
                <option key={String(order.order_id)} value={String(order.order_id)}>
                  {order.job_card_id} — {order.garment_type} — balance {formatPHP(order.remaining_balance)}
                </option>
              ))}
            </select>
          </FieldShell>

          {!payable.length && (
            <p className="border px-3 py-2 text-[12px]" style={{ borderColor: COLORS.border, background: COLORS.surfaceAlt, color: COLORS.muted, borderRadius: 8 }}>
              Every job card for this customer is fully paid.
            </p>
          )}

          <CashPaymentFields
            balance={balance}
            amount={amount}
            onAmountChange={(value) => { setAmount(value); setError(''); }}
            cashReceived={cashReceived}
            onCashReceivedChange={(value) => { setCashReceived(value); setError(''); }}
            notes={notes}
            onNotesChange={setNotes}
            error={error || (selected && amount ? fieldError : null)}
          />

          {selected && (
            <div className="grid grid-cols-2 gap-3 border p-4 text-[12px]" style={{ borderColor: COLORS.border, background: COLORS.surfaceAlt, borderRadius: 12 }}>
              <div><span style={{ color: COLORS.muted }}>Previous balance</span><div className="mono mt-0.5" style={{ color: COLORS.ink }}>{formatPHPExact(balance)}</div></div>
              <div><span style={{ color: COLORS.muted }}>New balance</span><div className="mono mt-0.5" style={{ color: newBalance > 0 ? COLORS.warning : COLORS.success }}>{formatPHPExact(newBalance)}</div></div>
              <div><span style={{ color: COLORS.muted }}>Amount to pay</span><div className="mono mt-0.5" style={{ color: COLORS.ink }}>{formatPHPExact(toAmount(amount))}</div></div>
              <div><span style={{ color: COLORS.muted }}>Change given</span><div className="mono mt-0.5" style={{ color: COLORS.ink }}>{formatPHPExact(change)}</div></div>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-[12px] font-semibold" style={{ border: `1px solid ${COLORS.border}`, color: COLORS.inkSoft, borderRadius: 8, background: COLORS.surface }}>Cancel</button>
            <button
              type="submit"
              disabled={saving || !selected || Boolean(fieldError)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: COLORS.navy, borderRadius: 8 }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
              {saving ? 'Recording…' : 'Record cash payment'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
