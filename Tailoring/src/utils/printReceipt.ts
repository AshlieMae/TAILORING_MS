// utils/printReceipt.ts
//
// Front Desk receipt printing. Opens a print-ready window with the job card
// summary collected at intake, so the counter can hand the customer a receipt
// reference straight away (no new dependency, no server round-trip).
import { formatPHPExact } from './currency';

export interface IntakeReceipt {
  jobCardId: string;
  customerName: string;
  customerContact?: string;
  garmentType: string;
  orderCategory?: string;
  styleDesign?: string;
  fabric?: string;
  quantity?: number;
  totalAmount: number;
  depositPaid: number;
  remainingBalance: number;
  paymentMethod?: string;
  referenceNumber?: string;
  targetCompletionDate?: string;
  assignedTailor?: string;
  notes?: string;
}

function safe(value?: string | number | null): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function peso(amount: number): string {
  // The receipt window declares <meta charset="utf-8">, so the real U+20B1
  // peso sign from the shared formatter prints correctly everywhere.
  return formatPHPExact(Number(amount || 0));
}

/** Open the browser print dialog for a job-card receipt. */
export function printIntakeReceipt(receipt: IntakeReceipt): boolean {
  const win = window.open('', '_blank', 'width=820,height=900');
  if (!win) return false;

  const rows: [string, string][] = [
    ['Customer', safe(receipt.customerName)],
    ['Contact', safe(receipt.customerContact) || '—'],
    ['Garment', safe(receipt.garmentType)],
    ['Category', safe(receipt.orderCategory) || '—'],
    ['Style', safe(receipt.styleDesign) || '—'],
    ['Fabric', safe(receipt.fabric) || '—'],
    ['Quantity', String(receipt.quantity || 1)],
    ['Completion date', safe(receipt.targetCompletionDate) || 'To be advised'],
    ['Assigned tailor', safe(receipt.assignedTailor) || 'Assigned at production handoff'],
  ];

  win.document.write(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Receipt ${safe(receipt.jobCardId)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Inter', 'Segoe UI', Arial, sans-serif; color: #2A211D; margin: 0; padding: 40px; background: #FAF7F2; }
  .sheet { max-width: 720px; margin: 0 auto; background: #fff; border: 1px solid #E8DFD3; border-radius: 12px; padding: 36px; }
  .eyebrow { font-family: 'Courier New', monospace; letter-spacing: .22em; text-transform: uppercase; font-size: 10px; color: #8C7E74; }
  h1 { font-family: Georgia, 'Times New Roman', serif; font-size: 28px; margin: 6px 0 2px; }
  .muted { color: #766A62; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin-top: 22px; font-size: 13px; }
  td { padding: 8px 0; border-bottom: 1px dashed #E2D7C7; vertical-align: top; }
  td.k { color: #766A62; width: 42%; }
  .totals { margin-top: 22px; border: 1px solid #E8DFD3; border-radius: 10px; padding: 16px; background: #FCFAF7; }
  .totals div { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; }
  .totals div.grand { border-top: 1px dashed #E2D7C7; margin-top: 8px; padding-top: 10px; font-weight: 700; font-size: 15px; }
  .foot { margin-top: 26px; font-size: 11px; color: #A3958B; }
  .sign { margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px; color: #766A62; }
  .sign span { border-top: 1px solid #E2D7C7; padding-top: 6px; width: 45%; text-align: center; }
  @media print { body { background: #fff; padding: 0; } .sheet { border: 0; } }
</style>
</head>
<body>
  <div class="sheet">
    <div class="eyebrow">Ashlie's Tailor &mdash; Bespoke Apparel</div>
    <h1>Job Card Receipt</h1>
    <p class="muted">Job card <strong>${safe(receipt.jobCardId)}</strong> &middot; ${new Date().toLocaleString()}</p>

    <table>
      ${rows.map(([k, v]) => `<tr><td class="k">${k}</td><td>${v}</td></tr>`).join('')}
    </table>

    <div class="totals">
      <div><span>Total price</span><span>${peso(receipt.totalAmount)}</span></div>
      <div><span>Deposit paid${receipt.paymentMethod ? ` (${safe(receipt.paymentMethod)})` : ''}</span><span>${peso(receipt.depositPaid)}</span></div>
      <div><span>Receipt reference</span><span>${safe(receipt.referenceNumber) || '—'}</span></div>
      <div class="grand"><span>Remaining balance</span><span>${peso(receipt.remainingBalance)}</span></div>
    </div>

    ${receipt.notes ? `<p class="muted" style="margin-top:18px">Notes: ${safe(receipt.notes)}</p>` : ''}

    <p class="foot">Balance is payable on or before pickup. Present this receipt when collecting the garment.</p>
    <div class="sign"><span>Customer signature</span><span>Front desk staff</span></div>
  </div>
  <script>window.onload = function () { window.print(); };</script>
</body>
</html>`);
  win.document.close();
  return true;
}

export default printIntakeReceipt;
