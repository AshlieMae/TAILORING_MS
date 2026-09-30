// utils/printFinancials.ts
//
// Receipt reprints, customer ledgers and customer statements.
//
// Every document opens in its own print window, so printing never navigates
// away from the Customer Financial Center - the selected customer stays on
// screen behind the print dialog. One shared shell keeps the typography and the
// money formatting identical to the rest of the system (formatPHPExact), and
// the real U+20B1 peso sign prints correctly because each window declares
// <meta charset="utf-8">.
import { formatPHPExact } from './currency';
import type { CustomerFinancialCenter, FinancialOrder, FinancialPayment, PaymentReceiptData } from '../../services/frontDeskApi';

function safe(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function peso(amount: unknown): string {
  return formatPHPExact(Number(amount || 0));
}

/** Cash figures are NULL on historical rows - print an em dash, never a 0. */
function cash(value: number | null | undefined): string {
  return value == null ? '&mdash;' : peso(value);
}

function dateTime(value?: string | null): string {
  if (!value) return '&mdash;';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '&mdash;' : safe(d.toLocaleString());
}

function dateOnly(value?: string | null): string {
  if (!value) return '&mdash;';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '&mdash;' : safe(d.toLocaleDateString());
}

const SHELL_CSS = `
  * { box-sizing: border-box; }
  body { font-family: 'Inter', 'Segoe UI', Arial, sans-serif; color: #111827; margin: 0; padding: 32px; background: #F6F7F9; }
  .sheet { max-width: 900px; margin: 0 auto 24px; background: #fff; border: 1px solid #E5E7EB; border-radius: 12px; padding: 32px; }
  .eyebrow { font-family: 'IBM Plex Mono', monospace; letter-spacing: .18em; text-transform: uppercase; font-size: 10px; color: #8A5F22; }
  h1 { font-size: 24px; margin: 6px 0 2px; }
  h2 { font-size: 14px; margin: 28px 0 8px; text-transform: uppercase; letter-spacing: .08em; color: #374151; }
  .muted { color: #6B7280; font-size: 12px; }
  .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 24px; margin-top: 14px; font-size: 13px; }
  .grid div { display: flex; justify-content: space-between; gap: 12px; border-bottom: 1px dashed #E5E7EB; padding: 5px 0; }
  .grid span:first-child { color: #6B7280; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #6B7280; border-bottom: 1px solid #E5E7EB; padding: 8px 6px; }
  td { border-bottom: 1px solid #F3F4F6; padding: 8px 6px; vertical-align: top; }
  td.num, th.num { text-align: right; font-family: 'IBM Plex Mono', monospace; }
  .totals { margin-top: 18px; border: 1px solid #E5E7EB; border-radius: 10px; padding: 14px 16px; background: #FAFBFC; }
  .totals div { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; }
  .totals div.grand { border-top: 1px dashed #E5E7EB; margin-top: 6px; padding-top: 8px; font-weight: 700; }
  .void { color: #B3261E; font-weight: 600; }
  .foot { margin-top: 24px; font-size: 11px; color: #9CA3AF; }
  .sign { margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px; color: #6B7280; }
  .sign span { border-top: 1px solid #E5E7EB; padding-top: 6px; width: 42%; text-align: center; }
  @media print { body { background: #fff; padding: 0; } .sheet { border: 0; margin: 0; } }
`;

function openPrintWindow(title: string, bodyHtml: string): boolean {
  const win = window.open('', '_blank', 'width=980,height=900');
  if (!win) return false;
  win.document.write(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${safe(title)}</title>
<style>${SHELL_CSS}</style>
</head>
<body>
${bodyHtml}
<script>window.onload = function () { window.print(); };<\/script>
</body>
</html>`);
  win.document.close();
  return true;
}


/* ------------------------------------------------------------------
   PAYMENT RECEIPT
   Reprints the EXISTING receipt record (its receipt number is never
   regenerated) and now shows the cash figures, the balance snapshots, the
   staff member and the notes.
   ------------------------------------------------------------------ */
export function printPaymentReceipt(d: PaymentReceiptData): boolean {
  const body = `
  <div class="sheet">
    <div class="eyebrow">${safe(d.shopName || "Ashlie's Tailor")} &mdash; Bespoke Apparel</div>
    <h1>Payment Receipt</h1>
    <p class="muted">Receipt <strong>${safe(d.receiptNumber)}</strong> &middot; ${dateTime(d.date)}</p>

    <div class="grid">
      <div><span>Customer</span><span>${safe(d.customer)}${d.customerCode ? ` (${safe(d.customerCode)})` : ''}</span></div>
      <div><span>Job card</span><span>${safe(d.jobCardId)}</span></div>
      <div><span>Receipt no.</span><span>${safe(d.receiptNumber)}</span></div>
      <div><span>Date &amp; time</span><span>${dateTime(d.date)}</span></div>
      <div><span>Payment type</span><span>${safe(d.paymentType)}</span></div>
      <div><span>Payment method</span><span>${safe(d.paymentMethod || 'Cash')}</span></div>
      ${d.referenceNumber ? `<div><span>Reference</span><span>${safe(d.referenceNumber)}</span></div>` : ''}
      <div><span>Received by</span><span>${safe(d.staff || 'Front Desk')}</span></div>
    </div>

    <div class="totals">
      <div><span>Payment amount</span><span>${peso(d.amount)}</span></div>
      <div><span>Cash received</span><span>${cash(d.cashReceived)}</span></div>
      <div><span>Change given</span><span>${cash(d.changeGiven)}</span></div>
      <div><span>Previous balance</span><span>${peso(d.previousBalance)}</span></div>
      <div><span>Total order</span><span>${peso(d.totalOrderAmount)}</span></div>
      <div class="grand"><span>Remaining balance</span><span>${peso(d.remainingBalance)}</span></div>
    </div>

    ${d.notes ? `<p class="muted" style="margin-top:16px">Notes: ${safe(d.notes)}</p>` : ''}
    ${d.voidedAt ? `<p class="void" style="margin-top:12px">VOIDED on ${dateTime(d.voidedAt)}${d.voidedByName ? ` by ${safe(d.voidedByName)}` : ''}${d.voidReason ? ` &mdash; ${safe(d.voidReason)}` : ''}</p>` : ''}

    <p class="foot">Balance is payable on or before pickup. Present this receipt when collecting the garment.</p>
    <div class="sign"><span>Customer signature</span><span>Received by</span></div>
  </div>`;
  return openPrintWindow(`Receipt ${d.receiptNumber}`, body);
}


/* ------------------------------------------------------------------
   SHARED SECTION BUILDERS for the ledger and the statement
   ------------------------------------------------------------------ */
function orderTable(orders: FinancialOrder[]): string {
  if (!orders.length) return '<p class="muted">No job cards recorded.</p>';
  return `<table>
    <thead><tr><th>Order no.</th><th>Garment</th><th>Ordered</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Balance</th><th>Status</th></tr></thead>
    <tbody>
      ${orders.map((order) => `<tr>
        <td>${safe(order.job_card_number)}</td>
        <td>${safe(order.garment)}</td>
        <td>${dateOnly(order.created_at)}</td>
        <td class="num">${peso(order.total_amount)}</td>
        <td class="num">${peso(order.paid_amount)}</td>
        <td class="num">${peso(order.balance)}</td>
        <td>${safe(order.production_status)}</td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

function paymentTable(payments: FinancialPayment[], title: string): string {
  if (!payments.length) return '';
  return `<h2>${safe(title)}</h2>
  <table>
    <thead><tr><th>Date &amp; time</th><th>Receipt no.</th><th>Order no.</th><th>Checkout ref.</th><th>Type</th><th class="num">Amount</th><th class="num">Cash received</th><th class="num">Change</th><th>Staff</th></tr></thead>
    <tbody>
      ${payments.map((payment) => `<tr>
        <td>${dateTime(payment.paid_at)}${payment.is_voided ? ' <span class="void">(VOIDED)</span>' : ''}</td>
        <td>${safe(payment.receipt_number)}</td>
        <td>${safe(payment.job_card_number || '—')}</td>
        <td>${safe(payment.checkout_reference || '—')}</td>
        <td>${safe(payment.payment_type)}</td>
        <td class="num">${peso(payment.amount)}</td>
        <td class="num">${cash(payment.cash_received)}</td>
        <td class="num">${cash(payment.change_given)}</td>
        <td>${safe(payment.recorded_by_name)}</td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

function garmentList(orders: FinancialOrder[]): string {
  if (!orders.length) return '<p class="muted">No purchased garments yet.</p>';
  return `<table>
    <thead><tr><th>Job card</th><th>Garment</th><th class="num">Order total</th><th class="num">Paid</th><th class="num">Balance</th><th>Status</th></tr></thead>
    <tbody>
      ${orders.map((order) => `<tr>
        <td>${safe(order.job_card_number)}</td>
        <td>${safe(order.garment)}${order.quantity > 1 ? ` &times;${order.quantity}` : ''}</td>
        <td class="num">${peso(order.total_amount)}</td>
        <td class="num">${peso(order.paid_amount)}</td>
        <td class="num">${peso(order.balance)}</td>
        <td>${safe(order.stage)}</td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

function summaryBlock(center: CustomerFinancialCenter): string {
  const { summary } = center;
  return `<div class="totals">
    <div><span>Total orders</span><span>${summary.total_orders}</span></div>
    <div><span>Total amount ordered</span><span>${peso(summary.total_amount_ordered)}</span></div>
    <div><span>Total payments made</span><span>${peso(summary.total_payments_made)}</span></div>
    <div><span>Average order value</span><span>${peso(summary.average_order_value)}</span></div>
    <div class="grand"><span>Outstanding balance</span><span>${peso(summary.outstanding_balance)}</span></div>
    <div><span>Last payment date</span><span>${dateOnly(summary.last_payment_date)}</span></div>
  </div>`;
}

function profileBlock(center: CustomerFinancialCenter): string {
  const c = center.customer;
  return `<div class="grid">
    <div><span>Customer</span><span>${safe(c.full_name)}</span></div>
    <div><span>Customer code</span><span>${safe(c.customer_code)}</span></div>
    <div><span>Contact number</span><span>${safe(c.contact_number || '—')}</span></div>
    <div><span>Email</span><span>${safe(c.email || '—')}</span></div>
    <div><span>Registered</span><span>${dateOnly(c.registered_at)}</span></div>
    <div><span>Account status</span><span>${safe(c.status)}</span></div>
  </div>`;
}


/* ------------------------------------------------------------------
   CUSTOMER LEDGER - the running financial record: profile, summary, every job
   card (with its frozen total) and the full payment audit trail.
   ------------------------------------------------------------------ */
export function printCustomerLedger(center: CustomerFinancialCenter, generatedAt = new Date()): boolean {
  const active = center.payments.filter((payment) => !payment.is_voided);
  const voided = center.payments.filter((payment) => payment.is_voided);
  const body = `
  <div class="sheet">
    <div class="eyebrow">${"Ashlie's Tailor"} &mdash; Customer Ledger</div>
    <h1>${safe(center.customer.full_name)}</h1>
    <p class="muted">Generated ${safe(generatedAt.toLocaleString())} &middot; Statement date ${safe(generatedAt.toLocaleDateString())}</p>

    ${profileBlock(center)}
    ${summaryBlock(center)}

    <h2>Order ledger (${center.orders.length})</h2>
    ${orderTable(center.orders)}

    ${paymentTable(active, `Active payments (${active.length})`)}
    ${paymentTable(voided, `Voided payments (${voided.length})`)}

    <p class="foot">Historical totals are read from each job card's frozen quote snapshot and are never recalculated from the current Rate Card.</p>
    <div class="sign"><span>Prepared by</span><span>Customer signature</span></div>
  </div>`;
  return openPrintWindow(`Ledger ${center.customer.customer_code}`, body);
}

/* ------------------------------------------------------------------
   CUSTOMER STATEMENT - the full financial history handed to the customer:
   profile, all orders, purchased garments, outstanding orders, active and
   voided payments (with receipt numbers) and the totals.
   ------------------------------------------------------------------ */
export function printCustomerStatement(center: CustomerFinancialCenter, generatedAt = new Date()): boolean {
  const active = center.payments.filter((payment) => !payment.is_voided);
  const voided = center.payments.filter((payment) => payment.is_voided);
  const outstanding = center.orders.filter((order) => order.balance > 0);
  const body = `
  <div class="sheet">
    <div class="eyebrow">${"Ashlie's Tailor"} &mdash; Customer Statement</div>
    <h1>Statement of Account</h1>
    <p class="muted">Statement date ${safe(generatedAt.toLocaleDateString())} &middot; Generated ${safe(generatedAt.toLocaleString())}</p>

    ${profileBlock(center)}
    ${summaryBlock(center)}

    <h2>Purchased garments (${center.orders.length})</h2>
    ${garmentList(center.orders)}

    <h2>Outstanding orders (${outstanding.length})</h2>
    ${outstanding.length ? orderTable(outstanding) : '<p class="muted">Nothing outstanding - every job card is settled.</p>'}

    ${paymentTable(active, `Active payments (${active.length})`)}
    ${paymentTable(voided, `Voided payments (${voided.length})`)}

    <p class="foot">Payments are accepted in cash only. Voided payments are retained for audit and are excluded from the paid total above.</p>
    <div class="sign"><span>Prepared by</span><span>Customer signature</span></div>
  </div>`;
  return openPrintWindow(`Statement ${center.customer.customer_code}`, body);
}
