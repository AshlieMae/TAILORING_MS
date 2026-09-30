// utils/printCheckoutSummary.ts
//
// THE CHECKOUT SUMMARY PRINT — the ONE receipt a customer walks away with when
// they pay for several garments in a single cash tender at the Front Desk.
//
// It is deliberately NOT a merge of the job cards: every row below is one
// independent job card with its OWN receipt number, its own balance and its own
// tailor, grouped only by the checkout reference (CHK-2026-000007) that ties
// them to the single amount of cash handed over.
//
// The document declares <meta charset="utf-8"> so the real U+20B1 peso sign
// (₱), the em dash and the middle dot all print correctly.
import type { CheckoutResult, CheckoutSummary } from '../../services/frontDeskApi';
import { formatPHPExact } from './currency';

function safe(value?: string | number | null): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function peso(amount?: number | null): string {
  return amount == null ? '—' : formatPHPExact(Number(amount));
}

function day(value?: string | null): string {
  if (!value) return 'To be advised';
  const parsed = new Date(String(value).slice(0, 10));
  return Number.isNaN(parsed.getTime()) ? String(value).slice(0, 10) : parsed.toLocaleDateString();
}

export interface CheckoutSummaryPrintData {
  checkoutReference: string;
  customerName: string;
  customerCode?: string;
  checkedOutAt?: string | null;
  recordedBy?: string;
  totalCollected: number;
  cashReceived: number | null;
  changeGiven: number | null;
  paymentMethod?: string;
  referenceNumber?: string | null;
  notes?: string;
  orders: CheckoutResult['orders'];
}

/** Build the printable payload from a checkout response. */
export function checkoutPrintDataFromResult(
  result: CheckoutResult,
  customerName = '',
  customerCode = '',
  recordedBy = '',
): CheckoutSummaryPrintData {
  return {
    checkoutReference: result.checkout_reference,
    customerName,
    customerCode,
    checkedOutAt: result.checked_out_at,
    recordedBy,
    totalCollected: result.total_collected,
    cashReceived: result.cash_received,
    changeGiven: result.change_given,
    paymentMethod: result.payment_method,
    referenceNumber: result.reference_number,
    notes: result.notes,
    orders: result.orders,
  };
}

/**
 * The same printable payload, rebuilt from the ledger's CHECKOUT SUMMARY
 * (GET /api/payments/checkout/:reference) — that is how a checkout is reprinted
 * months later, straight from the payment records, never from a stored
 * document.
 */
export function checkoutPrintDataFromSummary(summary: CheckoutSummary): CheckoutSummaryPrintData {
  const active = summary.payments.filter((payment) => !payment.is_voided);
  const orders = (active.length ? active : summary.payments).map((payment) => ({
    order_id: 0,
    job_card_number: payment.job_card_number,
    receipt_number: payment.receipt_number,
    payment_id: payment.payment_id,
    is_primary_payment: payment.cash_received != null,
    payment_type: payment.payment_type,
    payment_method: payment.payment_method,
    amount: payment.amount,
    cash_received: payment.cash_received,
    change_given: payment.change_given,
    previous_balance: payment.previous_balance ?? 0,
    remaining_balance_after: payment.remaining_balance_after ?? payment.order_balance ?? 0,
    final_price: payment.final_price ?? payment.previous_balance ?? 0,
    deposit_required: 0,
    garment: payment.garment,
    style_design: payment.style_design || '',
    quantity: payment.quantity,
    order_type: '',
    stage: payment.stage,
    pickup_status: '',
    due_date: payment.due_date ?? null,
    assigned_tailor_name: payment.assigned_tailor_name,
  }));
  return {
    checkoutReference: summary.checkout_reference || '',
    customerName: summary.customer_name,
    customerCode: summary.customer_code,
    checkedOutAt: summary.checked_out_at,
    recordedBy: summary.recorded_by_name,
    totalCollected: summary.total_collected,
    cashReceived: summary.cash_received,
    changeGiven: summary.change_given,
    paymentMethod: summary.payment_method,
    referenceNumber: summary.reference_number,
    notes: summary.notes,
    orders,
  };
}

/** Open the browser print dialog for one multi-garment checkout. */
export function printCheckoutSummary(data: CheckoutSummaryPrintData): boolean {
  const win = window.open('', '_blank', 'width=980,height=900');
  if (!win) return false;

  const rows = data.orders.map((order) => `
    <tr>
      <td><strong>${safe(order.job_card_number)}</strong><div class="sub">${safe(order.receipt_number)}</div></td>
      <td>${safe(order.garment)}${order.quantity > 1 ? ` <span class="sub">× ${order.quantity}</span>` : ''}
        <div class="sub">${safe(order.style_design) || 'Standard'} · ${safe(order.fabric) || 'Fabric to be confirmed'}</div></td>
      <td>${safe(order.assigned_tailor_name) || 'Assigned at handoff'}</td>
      <td>${day(order.due_date)}</td>
      <td class="num">${peso(order.final_price)}</td>
      <td class="num">${peso(order.amount)}<div class="sub">${safe(order.payment_type)}</div></td>
      <td class="num">${peso(order.remaining_balance_after)}</td>
    </tr>`).join('');

  const balanceRemaining = data.orders.reduce((sum, order) => sum + Number(order.remaining_balance_after || 0), 0);

  win.document.write(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Checkout ${safe(data.checkoutReference)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Inter', 'Segoe UI', Arial, sans-serif; color: #2A211D; margin: 0; padding: 40px; background: #FAF7F2; }
  .sheet { max-width: 900px; margin: 0 auto; background: #fff; border: 1px solid #E8DFD3; border-radius: 12px; padding: 36px; }
  .eyebrow { font-family: 'Courier New', monospace; letter-spacing: .22em; text-transform: uppercase; font-size: 10px; color: #8C7E74; }
  h1 { font-family: Georgia, 'Times New Roman', serif; font-size: 28px; margin: 6px 0 2px; }
  .muted { color: #766A62; font-size: 12px; }
  .sub { color: #8C7E74; font-size: 10.5px; margin-top: 2px; }
  .meta { margin-top: 18px; display: flex; flex-wrap: wrap; gap: 10px 34px; font-size: 12px; }
  .meta div span { display: block; color: #8C7E74; font-size: 10px; text-transform: uppercase; letter-spacing: .16em; }
  table { width: 100%; border-collapse: collapse; margin-top: 22px; font-size: 12.5px; }
  th { text-align: left; padding: 8px 6px; border-bottom: 1px solid #E2D7C7; font-size: 10px; text-transform: uppercase; letter-spacing: .12em; color: #8C7E74; }
  td { padding: 10px 6px; border-bottom: 1px dashed #E2D7C7; vertical-align: top; }
  td.num, th.num { text-align: right; white-space: nowrap; }
  .totals { margin-top: 22px; border: 1px solid #E8DFD3; border-radius: 10px; padding: 16px; background: #FCFAF7; }
  .totals div { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; }
  .totals div.grand { border-top: 1px dashed #E2D7C7; margin-top: 8px; padding-top: 10px; font-weight: 700; font-size: 15px; }
  .foot { margin-top: 26px; font-size: 11px; color: #A3958B; line-height: 1.6; }
  .sign { margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px; color: #766A62; }
  .sign span { border-top: 1px solid #E2D7C7; padding-top: 6px; width: 45%; text-align: center; }
  @media print { body { background: #fff; padding: 0; } .sheet { border: 0; } }
</style>
</head>
<body>
  <div class="sheet">
    <div class="eyebrow">Ashlie's Tailor &mdash; Bespoke Apparel</div>
    <h1>Checkout Summary</h1>
    <p class="muted">One cash payment &middot; <strong>${data.orders.length}</strong> job card${data.orders.length === 1 ? '' : 's'} &middot; ${new Date(data.checkedOutAt || Date.now()).toLocaleString()}</p>

    <div class="meta">
      <div><span>Checkout reference</span>${safe(data.checkoutReference)}</div>
      <div><span>Customer</span>${safe(data.customerName) || 'Walk-in customer'}${data.customerCode ? ` (${safe(data.customerCode)})` : ''}</div>
      <div><span>Payment method</span>${safe(data.paymentMethod) || 'Cash'}</div>
      ${data.referenceNumber ? `<div><span>Counter reference</span>${safe(data.referenceNumber)}</div>` : ''}
      ${data.recordedBy ? `<div><span>Recorded by</span>${safe(data.recordedBy)}</div>` : ''}
    </div>

    <table>
      <thead>
        <tr>
          <th>Job card</th><th>Garment</th><th>Tailor</th><th>Due</th>
          <th class="num">Price</th><th class="num">Paid now</th><th class="num">Balance</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="totals">
      <div><span>Total collected</span><span>${peso(data.totalCollected)}</span></div>
      <div><span>Cash received</span><span>${peso(data.cashReceived)}</span></div>
      <div><span>Change given</span><span>${peso(data.changeGiven)}</span></div>
      <div class="grand"><span>Remaining balance across all job cards</span><span>${peso(balanceRemaining)}</span></div>
    </div>

    ${data.notes ? `<p class="muted" style="margin-top:16px">Notes: ${safe(data.notes)}</p>` : ''}

    <p class="foot">
      Each job card above is a separate order with its own receipt number and its own balance &mdash; the cash received and
      change given are recorded once, on the first allocation of this checkout. Remaining balances are payable on or before pickup.
      Present this summary or any job card receipt when collecting a garment.
    </p>
    <div class="sign"><span>Customer signature</span><span>Front desk staff</span></div>
  </div>
  <script>window.onload = function () { window.print(); };</script>
</body>
</html>`);
  win.document.close();
  return true;
}

export default printCheckoutSummary;

