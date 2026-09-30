// Pages_Frontdesk/CheckoutReviewPanel.tsx
//
// THE CHECKOUT REVIEW — the Front Desk's last look before the cart becomes real.
//
// This is the ONLY place a draft cart is written. One confirm here calls
// POST /api/orders/checkout, which (on the server, in ONE transaction) creates
// a separate order, job card, tailor assignment and receipt-bearing payment row
// for each garment, stamps them all with one checkout reference and records the
// single cash tender on the primary allocation.
//
// If the server rejects anything the whole cart is rolled back and nothing
// exists: no orphan job card, no receipt number, no partial payment.
import { useMemo, useState } from 'react';
import {
  BadgeCheck, CircleDollarSign, Printer, ReceiptText, ShieldCheck, TriangleAlert, UserRound,
} from 'lucide-react';
import frontDeskApi, { type CheckoutResult } from '../../services/frontDeskApi';
import { formatPHP, formatPHPExact } from '../utils/currency';
import { printIntakeReceipt } from '../utils/printReceipt';
import { checkoutPrintDataFromResult, printCheckoutSummary } from '../utils/printCheckoutSummary';
import { useDraftOrderCart } from './DraftOrderCartContext';

const CARD = 'rounded-xl border border-[#ECE2D3] bg-white shadow-[0_1px_1px_rgba(42,33,29,0.03)]';
const INPUT = 'w-full rounded-lg border border-[#E2D7C7] bg-white px-3 py-2.5 text-[13.5px] text-[#2A211D] outline-none transition-colors placeholder-[#C2B5A8] focus:border-[#A46B48]';

function round(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function dueLabel(value?: string | null): string {
  if (!value) return 'No deadline';
  const parsed = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleDateString();
}

export function CheckoutReviewPanel({
  onClose,
  onBackToCart,
  customerName = '',
  customerCode = '',
  onCompleted,
}: {
  onClose: () => void;
  /** Return to the cart to change garments or allocations. */
  onBackToCart: () => void;
  customerName?: string;
  customerCode?: string;
  /** Refresh the dashboard once the transaction has committed. */
  onCompleted?: (result: CheckoutResult) => void;
}) {
  const cart = useDraftOrderCart();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CheckoutResult | null>(null);

  const cash = round(Number(cart.cashReceived) || 0);
  const changeDue = round(cash - cart.totals.allocated);

  // The same rules the server enforces, shown before the counter commits so a
  // rejected checkout is never a surprise. The server is still authoritative.
  const problems = useMemo(() => {
    const list: string[] = [];
    if (!cart.items.length) list.push('The draft cart is empty.');
    cart.items.forEach((item, index) => {
      const label = `Garment ${index + 1} (${item.garmentType})`;
      if (item.amount + 0.005 < item.depositRequired) {
        list.push(`${label}: at least its deposit of ${formatPHPExact(item.depositRequired)} must be recorded to send it to production.`);
      }
      if (item.amount > item.finalPrice + 0.005) {
        list.push(`${label}: the allocation is more than the job card total of ${formatPHPExact(item.finalPrice)}.`);
      }
    });
    if (cash <= 0) list.push('Enter the cash received from the customer.');
    else if (cash + 0.005 < cart.totals.allocated) {
      list.push(`Cash received must be at least ${formatPHPExact(cart.totals.allocated)} — the amount being applied across the job cards.`);
    }
    return list;
  }, [cart.items, cart.totals.allocated, cash]);

  const confirmCheckout = async () => {
    if (problems.length) { setError(problems[0]); return; }
    setSaving(true);
    setError('');
    try {
      const checkout = await frontDeskApi.checkoutCart(cart.buildRequest());
      setResult(checkout);
      // The cart is counter state only: once the server has the records, the
      // cart is emptied so the next walk-in starts clean.
      cart.clearCart();
      onCompleted?.(checkout);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The checkout could not be completed. Nothing was saved.');
    } finally {
      setSaving(false);
    }
  };

  const printSummary = (checkout: CheckoutResult) => {
    printCheckoutSummary(checkoutPrintDataFromResult(checkout, customerName, customerCode, 'Front desk staff'));
  };

  const printOneReceipt = (checkout: CheckoutResult, jobCardNumber: string) => {
    const order = checkout.orders.find((row) => row.job_card_number === jobCardNumber);
    if (!order) return;
    printIntakeReceipt({
      jobCardId: order.job_card_number,
      customerName: customerName || 'Walk-in customer',
      garmentType: order.garment,
      orderCategory: order.uniform_category || '',
      styleDesign: order.style_design || '',
      fabric: order.fabric || '',
      quantity: order.quantity,
      totalAmount: order.final_price,
      depositPaid: order.amount,
      cashReceived: order.cash_received ?? undefined,
      changeGiven: order.change_given ?? undefined,
      remainingBalance: order.remaining_balance_after,
      paymentMethod: order.payment_method,
      referenceNumber: order.receipt_number,
      targetCompletionDate: order.due_date || undefined,
      assignedTailor: order.assigned_tailor_name || undefined,
      notes: `Checkout ${checkout.checkout_reference} · ${order.payment_type}`,
    });
  };

  /* --------------------------------------------------------- SUCCESS VIEW */

  if (result) {
    const balanceAcrossCards = result.orders.reduce((sum, order) => sum + Number(order.remaining_balance_after || 0), 0);
    return (
      <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
        <div className="absolute inset-0 bg-[#1F1916]/50 backdrop-blur-sm" />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Checkout completed"
          className="relative flex h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-[#E8DFD3] bg-[#FAF7F2] shadow-2xl sm:h-auto sm:max-h-[92vh] sm:rounded-2xl"
        >
          <header className="flex-shrink-0 border-b border-[#DCE9DD] bg-[#F5FAF5] px-5 pb-5 pt-5 sm:px-8">
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-[#4E7357]" style={{ fontFamily: "'Space Mono', monospace" }}>
              <BadgeCheck className="h-3.5 w-3.5" /> Transaction committed
            </span>
            <h2 className="mt-1.5 text-2xl leading-tight text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>
              {result.job_card_count} job card{result.job_card_count === 1 ? '' : 's'} created
            </h2>
            <p className="mt-1 text-[12.5px] text-[#4E5F51]">
              Checkout reference <strong className="text-[#2A211D]" style={{ fontFamily: "'Space Mono', monospace" }}>{result.checkout_reference}</strong>
              {' · '}{customerName || 'Walk-in customer'}
              {' · '}{new Date(result.checked_out_at).toLocaleString()}
            </p>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8">
            <div className={`${CARD} overflow-x-auto`}>
              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-[0.12em] text-[#8C7E74]">
                    <th className="px-4 py-2.5">Job card</th>
                    <th className="px-4 py-2.5">Garment</th>
                    <th className="px-4 py-2.5">Tailor</th>
                    <th className="px-4 py-2.5">Due</th>
                    <th className="px-4 py-2.5 text-right">Paid now</th>
                    <th className="px-4 py-2.5 text-right">Balance</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {result.orders.map((order) => (
                    <tr key={order.job_card_number} className="border-t border-[#F1E9DD]">
                      <td className="px-4 py-3">
                        <span className="block font-semibold text-[#2A211D]" style={{ fontFamily: "'Space Mono', monospace" }}>{order.job_card_number}</span>
                        <span className="mt-0.5 block text-[10.5px] text-[#8C7E74]" style={{ fontFamily: "'Space Mono', monospace" }}>{order.receipt_number}</span>
                      </td>
                      <td className="px-4 py-3 text-[#2A211D]">
                        {order.garment}{order.quantity > 1 ? ` × ${order.quantity}` : ''}
                        <span className="mt-0.5 block text-[10.5px] text-[#8C7E74]">{order.style_design || 'Standard'} · {order.fabric || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-[#2A211D]">{order.assigned_tailor_name || 'Unassigned'}</td>
                      <td className="px-4 py-3 text-[#2A211D]">{dueLabel(order.due_date)}</td>
                      <td className="px-4 py-3 text-right" style={{ fontFamily: "'Space Mono', monospace" }}>
                        {formatPHPExact(order.amount)}
                        <span className="mt-0.5 block text-[10.5px] text-[#8C7E74]">{order.payment_type}</span>
                      </td>
                      <td className="px-4 py-3 text-right" style={{ fontFamily: "'Space Mono', monospace" }}>{formatPHPExact(order.remaining_balance_after)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => printOneReceipt(result, order.job_card_number)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#E2D7C7] bg-white px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5E5048] hover:bg-[#F2ECE1]"
                        >
                          <ReceiptText className="h-3 w-3" /> Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>


            <div className={`${CARD} mt-4 grid grid-cols-2 gap-4 p-4 sm:grid-cols-4`}>
              <div>
                <span className="block text-[10px] uppercase tracking-[0.14em] text-[#A3958B]">Total collected</span>
                <span className="text-[15px] font-semibold text-[#2A211D]" style={{ fontFamily: "'Space Mono', monospace" }}>{formatPHP(result.total_collected)}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-[0.14em] text-[#A3958B]">Cash received</span>
                <span className="text-[15px] font-semibold text-[#4E7357]" style={{ fontFamily: "'Space Mono', monospace" }}>{formatPHP(result.cash_received)}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-[0.14em] text-[#A3958B]">Change given</span>
                <span className="text-[15px] font-semibold text-[#8C6F3E]" style={{ fontFamily: "'Space Mono', monospace" }}>{formatPHP(result.change_given)}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-[0.14em] text-[#A3958B]">Balance across cards</span>
                <span className="text-[15px] font-semibold text-[#9E5B4B]" style={{ fontFamily: "'Space Mono', monospace" }}>{formatPHP(balanceAcrossCards)}</span>
              </div>
            </div>

            <p className="mt-4 flex items-start gap-2 text-[11.5px] leading-relaxed text-[#766A62]">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#4E7357]" />
              Every garment is now its own order in the tailor queues, with its own job card, receipt number and balance.
              The cash received and change given were recorded once, on the first allocation of this checkout.
            </p>
          </div>

          <footer className="flex-shrink-0 border-t border-[#E8DFD3] bg-[#FFFCF8] px-5 py-4 sm:px-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => printSummary(result)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#C9A15C]/60 bg-white px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8C6F3E] transition-colors hover:bg-[#F9F4EB]"
              >
                <Printer className="h-3.5 w-3.5" /> Print checkout summary
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#2A211D] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#FAF7F2] shadow-md transition-colors hover:bg-[#3D312B]"
              >
                Done — back to the counter
              </button>
            </div>
          </footer>
        </div>
      </div>
    );
  }


  /* ---------------------------------------------------------- REVIEW VIEW */

  const cashShort = round(cart.totals.allocated - cash);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-[#1F1916]/50 backdrop-blur-sm" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Checkout review"
        className="relative flex h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border border-[#E8DFD3] bg-[#FAF7F2] shadow-2xl sm:h-auto sm:max-h-[92vh] sm:rounded-2xl"
      >
        <header className="flex-shrink-0 border-b border-[#ECE2D3] bg-[#FFFCF8] px-5 pb-4 pt-5 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#8C7E74]" style={{ fontFamily: "'Space Mono', monospace" }}>
                Step 2 of 2 · one cash payment, {cart.items.length} job card{cart.items.length === 1 ? '' : 's'}
              </span>
              <h2 className="mt-1 flex items-center gap-2 text-2xl leading-tight text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>
                <CircleDollarSign className="h-5 w-5 text-[#8C6F3E]" strokeWidth={1.7} /> Review &amp; confirm checkout
              </h2>
              <p className="mt-1 text-[12px] text-[#766A62]">
                {customerName || cart.customerName || 'Walk-in customer'}
                {customerCode ? ` (${customerCode})` : ''} · nothing is saved until you confirm the cash payment.
              </p>
            </div>
            <button
              type="button"
              onClick={onBackToCart}
              className="rounded-lg border border-[#E2D7C7] bg-white px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#766A62] transition-colors hover:bg-[#F2ECE1]"
            >
              Back to cart
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8">
          {/* ONE JOB CARD PER GARMENT — its own allocation, tailor and balance */}
          <div className={`${CARD} overflow-x-auto`}>
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.12em] text-[#8C7E74]">
                  <th className="px-4 py-2.5">Garment</th>
                  <th className="px-4 py-2.5">Tailor</th>
                  <th className="px-4 py-2.5">Due</th>
                  <th className="px-4 py-2.5 text-right">Price</th>
                  <th className="px-4 py-2.5 text-right">Amount due</th>
                  <th className="px-4 py-2.5 text-right">Balance after</th>
                </tr>
              </thead>
              <tbody>
                {cart.items.map((item) => (
                  <tr key={item.lineId} className="border-t border-[#F1E9DD]">
                    <td className="px-4 py-3 text-[#2A211D]">
                      <span className="font-medium">{item.garmentType}</span>{item.quantity > 1 ? ` × ${item.quantity}` : ''}
                      <span className="mt-0.5 block text-[10.5px] text-[#8C7E74]">{item.styleDesign || 'Standard'} · {item.fabric || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-[#2A211D]">
                      <span className="inline-flex items-center gap-1">
                        <UserRound className="h-3 w-3 text-[#A3958B]" />
                        {item.assignedTailorName || 'Auto-assign'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#2A211D]">{dueLabel(item.targetCompletionDate)}</td>
                    <td className="px-4 py-3 text-right" style={{ fontFamily: "'Space Mono', monospace" }}>{formatPHPExact(item.finalPrice)}</td>
                    <td className="px-4 py-3 text-right" style={{ fontFamily: "'Space Mono', monospace" }}>
                      {formatPHPExact(item.amount)}
                      <span className="mt-0.5 block text-[10.5px] text-[#8C7E74]">
                        {item.amount >= item.finalPrice - 0.005 ? 'Final Payment' : 'Deposit'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right" style={{ fontFamily: "'Space Mono', monospace" }}>
                      {formatPHPExact(round(item.finalPrice - item.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>


          {/* THE ONE CASH TENDER */}
          <div className={`${CARD} mt-4 p-4`}>
            <h3 className="text-[13.5px] font-semibold text-[#2A211D]">Cash payment</h3>
            <p className="mt-0.5 text-[11.5px] text-[#766A62]">
              The customer pays once. The tender is recorded on this checkout and allocated across the job cards above.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-[#8C7E74]">Payment method</span>
                <input value="Cash" readOnly disabled className={`${INPUT} bg-[#F7F2EA] text-[#5E5048]`} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-[#8C7E74]">Cash received</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={cart.cashReceived}
                  onChange={(event) => cart.setCashReceived(event.target.value)}
                  placeholder={formatPHPExact(cart.totals.allocated)}
                  className={INPUT}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-[#8C7E74]">Change to give</span>
                <input
                  value={cash > 0 ? formatPHPExact(Math.max(0, changeDue)) : '—'}
                  readOnly
                  disabled
                  className={`${INPUT} bg-[#F7F2EA] font-semibold text-[#8C6F3E]`}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-[#8C7E74]">Counter reference (optional)</span>
                <input
                  value={cart.referenceNumber}
                  onChange={(event) => cart.setReferenceNumber(event.target.value)}
                  placeholder="OR number, bank reference, note"
                  className={INPUT}
                />
              </label>
              <label className="block sm:col-span-3">
                <span className="mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-[#8C7E74]">Notes (optional)</span>
                <textarea
                  rows={2}
                  value={cart.notes}
                  onChange={(event) => cart.setNotes(event.target.value)}
                  placeholder="Anything the tailor or the ledger should know about this payment"
                  className={`${INPUT} resize-none`}
                />
              </label>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 rounded-lg border border-[#ECE2D3] bg-[#FCFAF7] p-3 text-[12px]">
              <div>
                <span className="block text-[10px] uppercase tracking-[0.14em] text-[#A3958B]">Total amount due</span>
                <span className="font-semibold text-[#2A211D]" style={{ fontFamily: "'Space Mono', monospace" }}>{formatPHPExact(cart.totals.allocated)}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-[0.14em] text-[#A3958B]">Cash received</span>
                <span className="font-semibold text-[#4E7357]" style={{ fontFamily: "'Space Mono', monospace" }}>{cash > 0 ? formatPHPExact(cash) : '—'}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-[0.14em] text-[#A3958B]">Change given</span>
                <span className="font-semibold text-[#8C6F3E]" style={{ fontFamily: "'Space Mono', monospace" }}>{cash > 0 ? formatPHPExact(Math.max(0, changeDue)) : '—'}</span>
              </div>
            </div>
          </div>

          {(error || problems.length > 0) && (
            <div className="mt-4 rounded-lg border border-[#F0C9B8] bg-[#FDF4F0] px-4 py-3 text-[12px] text-[#9A3B2A]">
              <p className="flex items-center gap-1.5 font-semibold">
                <TriangleAlert className="h-3.5 w-3.5" /> {error || 'This checkout is not ready yet'}
              </p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5">
                {(error ? [error] : problems).slice(0, 4).map((problem) => <li key={problem}>{problem}</li>)}
              </ul>
              {cashShort > 0 && <p className="mt-1.5 font-semibold">Still to collect: {formatPHPExact(cashShort)}</p>}
            </div>
          )}
        </div>


        <footer className="flex-shrink-0 border-t border-[#E8DFD3] bg-[#FFFCF8] px-5 py-4 sm:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] leading-relaxed text-[#8C7E74]">
              Confirming creates one order, one job card, one receipt and one payment record per garment — in a single transaction.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={onBackToCart}
                disabled={saving}
                className="inline-flex items-center justify-center rounded-lg border border-[#E2D7C7] bg-white px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5E5048] transition-colors hover:bg-[#F2ECE1] disabled:opacity-40"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={confirmCheckout}
                disabled={saving || problems.length > 0}
                title={problems.length ? problems[0] : undefined}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#2A211D] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#FAF7F2] shadow-md transition-colors hover:bg-[#3D312B] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                {saving ? 'Recording the checkout…' : 'Confirm cash payment'}
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default CheckoutReviewPanel;

