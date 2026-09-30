// financialCenter/CustomerFinancialCenter.tsx
//
// THE CUSTOMER FINANCIAL CENTER (subtitle: Customer Ledger & Payment History).
//
// The main financial profile page for every customer, shared by the Front Desk
// and the Admin. It reads ONE set of records - customer_orders and
// customer_payments - through ONE aggregate endpoint, so both roles always see
// identical orders, payments, receipts, balances and audit trail.
//
//   Front Desk : full actions (new order, record cash payment, print, export)
//   Admin      : monitoring and audit only - view, reprint, print, export and
//                authorized voiding. Never a second payment-recording workflow.
//
// Nothing here is hardcoded, sampled or re-priced from the current Rate Card:
// each job card shows its own frozen order total.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, Banknote, Download, FileText, Loader2, Plus, Printer, RefreshCcw } from 'lucide-react';
import ExcelJS from 'exceljs';
import frontDeskApi, {
  type CustomerFinancialCenter as FinancialCenterPayload,
  type FinancialOrder,
  type FinancialPayment,
} from '../../services/frontDeskApi';
import { COLORS, FONT_IMPORT, BarChartPanel, DonutChart, shadowCard, shadowSm } from '../Pages_Admin/Theme';
import { OrderGarmentImage } from '../components/OrderGarmentImage';
import { formatPHP, formatPHPExact } from '../utils/currency';
import { printCustomerLedger, printCustomerStatement } from '../utils/printFinancials';
import { CustomerSelector } from './CustomerSelector';
import { OrderLedger, Pill, paymentTone, stageTone } from './OrderLedger';
import { PaymentLedger } from './PaymentLedger';
import { PaymentReceiptModal } from './PaymentReceiptModal';
import { RecordCashPaymentModal } from './CashPaymentForm';
import { PaymentAuditLedger } from './PaymentAuditLedger';

export interface CustomerFinancialCenterViewProps {
  /** 'front_desk' records cash payments; 'admin' monitors and audits. */
  mode: 'front_desk' | 'admin';
  /** The selected customer (CUS-00017). Null shows the customer selector. */
  initialCustomerId?: string | null;
  /** Leave the Financial Center (returns to the page that opened it). */
  onBack?: () => void;
  /** Front Desk: open the existing order intake flow for this customer. */
  onNewOrder?: (customerCode: string) => void;
  /** Open the existing order details for a job card. */
  onOpenOrder?: (order: FinancialOrder) => void;
}

function initialsOf(name: string): string {
  return name.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'CU';
}

function statusTone(status: string): 'success' | 'warning' | 'neutral' {
  if (status === 'approved' || status === 'Active') return 'success';
  if (status === 'pending' || status === 'Pending approval') return 'warning';
  return 'neutral';
}

/** One of the six KPI cards. */
function KpiCard({ label, value, hint, tone = 'neutral' }: { label: string; value: string; hint?: string; tone?: 'neutral' | 'good' | 'warn' | 'info' }) {
  const color = tone === 'good' ? COLORS.success : tone === 'warn' ? COLORS.warning : tone === 'info' ? COLORS.info : COLORS.ink;
  return (
    <div className="border bg-white p-4" style={{ borderColor: COLORS.border, borderRadius: 16, boxShadow: shadowSm }}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: COLORS.muted }}>{label}</div>
      <div className="mono mt-2 text-[19px] font-semibold" style={{ color }}>{value}</div>
      {hint && <div className="mt-1 text-[11px]" style={{ color: COLORS.faint }}>{hint}</div>}
    </div>
  );
}

/** One purchased-garment card - always the shared <OrderGarmentImage />. */
function GarmentCard({ order, onOpenOrder }: { order: FinancialOrder; onOpenOrder?: (order: FinancialOrder) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpenOrder?.(order)}
      className="flex flex-col overflow-hidden border bg-white text-left transition-shadow"
      style={{ borderColor: COLORS.border, borderRadius: 16, boxShadow: shadowSm }}
    >
      <div className="h-36 w-full overflow-hidden bg-[#F4F1E6]">
        <OrderGarmentImage order={order} alt={`${order.garment} — ${order.job_card_number}`} className="h-full w-full" />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          <div className="mono text-[10.5px]" style={{ color: COLORS.faint }}>{order.job_card_number}</div>
          <div className="mt-0.5 text-[13px] font-medium" style={{ color: COLORS.ink }}>{order.garment}{order.quantity > 1 ? ` ×${order.quantity}` : ''}</div>
          <div className="mt-0.5 text-[11px]" style={{ color: COLORS.muted }}>Ordered {new Date(order.created_at).toLocaleDateString()}</div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-[11px]">
          <div><span style={{ color: COLORS.muted }}>Total</span><div className="mono" style={{ color: COLORS.ink }}>{formatPHP(order.total_amount)}</div></div>
          <div><span style={{ color: COLORS.muted }}>Paid</span><div className="mono" style={{ color: COLORS.success }}>{formatPHP(order.paid_amount)}</div></div>
          <div><span style={{ color: COLORS.muted }}>Balance</span><div className="mono" style={{ color: order.balance > 0 ? COLORS.warning : COLORS.success }}>{formatPHP(order.balance)}</div></div>
        </div>
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          <Pill tone={stageTone(order.stage)}>{order.stage}</Pill>
          <Pill tone={paymentTone(order.payment_status)}>{order.payment_status}</Pill>
        </div>
      </div>
    </button>
  );
}


export function CustomerFinancialCenterView({
  mode, initialCustomerId = null, onBack, onNewOrder, onOpenOrder,
}: CustomerFinancialCenterViewProps) {
  const [customerId, setCustomerId] = useState<string | null>(initialCustomerId);
  const [payload, setPayload] = useState<FinancialCenterPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [receiptFor, setReceiptFor] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [payPrefill, setPayPrefill] = useState<string | undefined>(undefined);
  const [notice, setNotice] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => { setCustomerId(initialCustomerId); }, [initialCustomerId]);

  const load = useCallback(async (id: string, quiet = false) => {
    if (!quiet) setLoading(true);
    setError('');
    try {
      setPayload(await frontDeskApi.getCustomerFinancialCenter(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load this customer.');
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!customerId) { setPayload(null); return; }
    load(customerId);
  }, [customerId, load]);

  // ---------------------------------------------------------------
  // Real analytics, derived from the loaded records only.
  // ---------------------------------------------------------------
  const analytics = useMemo(() => {
    const payments = (payload?.payments || []).filter((payment) => !payment.is_voided);
    const monthly = new Map<string, number>();
    payments.forEach((payment) => {
      const key = new Date(payment.paid_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      monthly.set(key, (monthly.get(key) || 0) + payment.amount);
    });
    const garments = new Map<string, number>();
    (payload?.orders || []).forEach((order) => {
      const key = order.garment || 'Garment';
      garments.set(key, (garments.get(key) || 0) + 1);
    });
    const outstanding = (payload?.orders || [])
      .filter((order) => order.balance > 0)
      .map((order) => ({ label: order.job_card_number.replace(/^JOB-/, ''), value: order.balance }));
    return {
      monthly: Array.from(monthly.entries()).map(([label, value]) => ({ label, value })).slice(-8),
      garments: Array.from(garments.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6),
      outstanding,
    };
  }, [payload]);

  const handleVoid = useCallback(async (payment: FinancialPayment, reason: string) => {
    await frontDeskApi.voidPayment(String(payment.payment_id), reason);
    setNotice(`Payment ${payment.receipt_number} was voided. The order balance was restored by ${formatPHPExact(payment.amount)}.`);
    if (customerId) await load(customerId, true);
  }, [customerId, load]);

  const flash = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 5000); };

  // ---------------------------------------------------------------
  // Export the customer's financial history (same workbook library the Admin
  // Reports view already uses).
  // ---------------------------------------------------------------
  const exportHistory = useCallback(async () => {
    if (!payload) return;
    setExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Ashlie's Tailor";
      const summarySheet = workbook.addWorksheet('Summary');
      summarySheet.addRow(['Customer', payload.customer.full_name]);
      summarySheet.addRow(['Customer code', payload.customer.customer_code]);
      summarySheet.addRow(['Contact', payload.customer.contact_number]);
      summarySheet.addRow(['Email', payload.customer.email]);
      summarySheet.addRow(['Registered', new Date(payload.customer.registered_at).toLocaleDateString()]);
      summarySheet.addRow([]);
      summarySheet.addRow(['Total orders', payload.summary.total_orders]);
      summarySheet.addRow(['Total amount ordered', payload.summary.total_amount_ordered]);
      summarySheet.addRow(['Total payments made', payload.summary.total_payments_made]);
      summarySheet.addRow(['Outstanding balance', payload.summary.outstanding_balance]);
      summarySheet.addRow(['Average order value', payload.summary.average_order_value]);
      summarySheet.addRow(['Last payment', payload.summary.last_payment_date ? new Date(payload.summary.last_payment_date).toLocaleString() : '—']);
      summarySheet.getColumn(1).width = 26;
      summarySheet.getColumn(2).width = 34;

      const orderSheet = workbook.addWorksheet('Orders');
      orderSheet.addRow(['Order No.', 'Garment', 'Ordered', 'Total', 'Paid', 'Balance', 'Production status', 'Payment status']);
      payload.orders.forEach((order) => orderSheet.addRow([
        order.job_card_number, order.garment, new Date(order.created_at).toLocaleDateString(),
        order.total_amount, order.paid_amount, order.balance, order.stage, order.payment_status,
      ]));
      orderSheet.getRow(1).font = { bold: true };

      const paymentSheet = workbook.addWorksheet('Payments');
      paymentSheet.addRow(['Date & time', 'Receipt No.', 'Order No.', 'Checkout ref.', 'Payment type', 'Amount', 'Cash received', 'Change given', 'Staff', 'Status', 'Void reason']);
      payload.payments.forEach((payment) => paymentSheet.addRow([
        new Date(payment.paid_at).toLocaleString(), payment.receipt_number, payment.job_card_number || '—',
        payment.checkout_reference || '—',
        payment.payment_type, payment.amount,
        payment.cash_received == null ? '—' : payment.cash_received,
        payment.change_given == null ? '—' : payment.change_given,
        payment.recorded_by_name, payment.is_voided ? 'Voided' : 'Active', payment.void_reason || '',
      ]));
      paymentSheet.getRow(1).font = { bold: true };

      const buffer = await workbook.xlsx.writeBuffer();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      link.download = `financial-history-${payload.customer.customer_code}.xlsx`;
      link.click();
      URL.revokeObjectURL(link.href);
    } finally {
      setExporting(false);
    }
  }, [payload]);

  // No customer selected yet - show the selection flow (plus the Admin's
  // cross-customer payment audit ledger).
  if (!customerId) {
    return (
      <div className="space-y-6" style={{ color: COLORS.ink }}>
        <CustomerSelector onSelect={(id) => setCustomerId(id)} />
        {mode === 'admin' && <PaymentAuditLedger onOpenReceipt={(paymentId) => setReceiptFor(paymentId)} onOpenCustomer={(id) => setCustomerId(id)} />}
      </div>
    );
  }




  if (loading && !payload) {
    return (
      <div className="flex items-center gap-2 p-10 text-[13px]" style={{ color: COLORS.muted }}>
        <Loader2 className="h-4 w-4 animate-spin" /> Loading the financial profile…
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="space-y-4">
        {onBack && (
          <button type="button" onClick={onBack} className="inline-flex items-center gap-2 border px-3 py-2 text-[11.5px] font-semibold" style={{ borderColor: COLORS.border, color: COLORS.inkSoft, borderRadius: 8, background: COLORS.surface }}>
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        )}
        <p className="border px-4 py-3 text-[12.5px]" style={{ borderColor: COLORS.dangerBorder, background: COLORS.dangerBg, color: COLORS.danger, borderRadius: 12 }}>
          {error || 'This customer could not be loaded.'}
        </p>
      </div>
    );
  }

  const { customer, summary, orders, payments } = payload;
  const outstandingOrders = orders.filter((order) => order.balance > 0);

  return (
    <div className="space-y-6" style={{ color: COLORS.ink }}>
      <style>{FONT_IMPORT}</style>

      {notice && (
        <p className="border px-4 py-3 text-[12.5px]" style={{ borderColor: COLORS.successBorder, background: COLORS.successBg, color: COLORS.success, borderRadius: 12 }}>{notice}</p>
      )}

      {/* ---------------- CUSTOMER HEADER ---------------- */}
      <header className="border bg-white p-6" style={{ borderColor: COLORS.border, borderRadius: 16, boxShadow: shadowCard }}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            {onBack && (
              <button type="button" onClick={onBack} className="mt-1 border p-2" style={{ borderColor: COLORS.border, color: COLORS.inkSoft, borderRadius: 8 }} aria-label="Back to the customer selector">
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center text-[16px] font-semibold text-white" style={{ background: COLORS.navy, borderRadius: 999 }}>
              {initialsOf(customer.full_name)}
            </span>
            <div>
              <span className="mono text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: COLORS.brassDeep }}>
                Customer Financial Center
              </span>
              <h1 className="mt-1 text-[24px] font-semibold tracking-[-0.01em]" style={{ color: COLORS.ink }}>{customer.full_name}</h1>
              <p className="mt-1 text-[11.5px]" style={{ color: COLORS.muted }}>
                Customer Ledger &amp; Payment History · <span className="mono">{customer.customer_code}</span>
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px]" style={{ color: COLORS.inkSoft }}>
                <span>{customer.contact_number || 'No contact number'}</span>
                <span>{customer.email || 'No email on file'}</span>
                <span>Registered {new Date(customer.registered_at).toLocaleDateString()}</span>
                <span><Pill tone={statusTone(customer.status)}>{customer.status}</Pill></span>
              </div>
            </div>
          </div>


          {/* ---------------- QUICK ACTIONS ---------------- */}
          <div className="flex flex-wrap items-center gap-2">
            {mode === 'front_desk' && onNewOrder && (
              <button type="button" onClick={() => onNewOrder(customer.customer_code)} className="inline-flex items-center gap-2 border px-3.5 py-2.5 text-[11.5px] font-semibold" style={{ borderColor: COLORS.border, color: COLORS.inkSoft, borderRadius: 8, background: COLORS.surface }}>
                <Plus className="h-4 w-4" /> New order
              </button>
            )}
            {mode === 'front_desk' && (
              <button
                type="button"
                onClick={() => { setPayPrefill(undefined); setPayOpen(true); }}
                disabled={!outstandingOrders.length}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 text-[11.5px] font-semibold text-white disabled:opacity-50"
                style={{ background: COLORS.navy, borderRadius: 8 }}
              >
                <Banknote className="h-4 w-4" /> Record cash payment
              </button>
            )}
            <button type="button" onClick={() => printCustomerLedger(payload)} className="inline-flex items-center gap-2 border px-3.5 py-2.5 text-[11.5px] font-semibold" style={{ borderColor: COLORS.border, color: COLORS.inkSoft, borderRadius: 8, background: COLORS.surface }}>
              <Printer className="h-4 w-4" /> Print ledger
            </button>
            <button type="button" onClick={() => printCustomerStatement(payload)} className="inline-flex items-center gap-2 border px-3.5 py-2.5 text-[11.5px] font-semibold" style={{ borderColor: COLORS.border, color: COLORS.inkSoft, borderRadius: 8, background: COLORS.surface }}>
              <FileText className="h-4 w-4" /> Print customer statement
            </button>
            <button type="button" onClick={exportHistory} disabled={exporting} className="inline-flex items-center gap-2 border px-3.5 py-2.5 text-[11.5px] font-semibold disabled:opacity-50" style={{ borderColor: COLORS.border, color: COLORS.inkSoft, borderRadius: 8, background: COLORS.surface }}>
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export
            </button>
            <button type="button" onClick={() => load(customer.customer_code, true)} className="inline-flex items-center gap-2 border px-3 py-2.5 text-[11.5px] font-semibold" style={{ borderColor: COLORS.border, color: COLORS.muted, borderRadius: 8, background: COLORS.surface }} aria-label="Refresh this customer">
              <RefreshCcw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ---------------- SIX SUMMARY CARDS ---------------- */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Total orders" value={String(summary.total_orders)} hint="Active, completed, released and historical" />
        <KpiCard label="Total amount ordered" value={formatPHP(summary.total_amount_ordered)} hint="Frozen job card totals" />
        <KpiCard label="Total payments made" value={formatPHP(summary.total_payments_made)} tone="good" hint="Voided payments excluded" />
        <KpiCard label="Outstanding balance" value={formatPHP(summary.outstanding_balance)} tone={summary.outstanding_balance > 0 ? 'warn' : 'good'} hint={`${outstandingOrders.length} job card${outstandingOrders.length === 1 ? '' : 's'}`} />
        <KpiCard label="Average order value" value={formatPHP(summary.average_order_value)} />
        <KpiCard label="Last payment date" value={summary.last_payment_date ? new Date(summary.last_payment_date).toLocaleDateString() : '—'} tone="info" hint={summary.last_payment_date ? new Date(summary.last_payment_date).toLocaleTimeString() : 'No payment yet'} />
      </div>

      {/* ---------------- PURCHASED GARMENTS ---------------- */}
      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-[15px] font-semibold" style={{ color: COLORS.ink }}>Purchased garments</h2>
            <p className="mt-1 text-[11.5px]" style={{ color: COLORS.muted }}>Each garment uses the shared order garment image resolved from its own job card.</p>
          </div>
          <span className="mono text-[11.5px]" style={{ color: COLORS.faint }}>{orders.length} garment{orders.length === 1 ? '' : 's'}</span>
        </div>
        {orders.length ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {orders.map((order) => <GarmentCard key={String(order.order_id)} order={order} onOpenOrder={onOpenOrder} />)}
          </div>
        ) : (
          <p className="border bg-white p-8 text-center text-[13px]" style={{ borderColor: COLORS.border, color: COLORS.muted, borderRadius: 16 }}>No garments purchased yet.</p>
        )}
      </section>


      {/* ---------------- OUTSTANDING ORDERS ---------------- */}
      <section className="border bg-white" style={{ borderColor: outstandingOrders.length ? COLORS.warningBorder : COLORS.border, borderRadius: 16, boxShadow: shadowSm }}>
        <header className="flex items-center justify-between gap-4 border-b p-5" style={{ borderColor: COLORS.border, background: outstandingOrders.length ? COLORS.warningBg : COLORS.surface }}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" style={{ color: outstandingOrders.length ? COLORS.warning : COLORS.muted }} />
            <div>
              <h2 className="text-[15px] font-semibold" style={{ color: COLORS.ink }}>Outstanding orders</h2>
              <p className="mt-0.5 text-[11.5px]" style={{ color: COLORS.muted }}>
                Live job cards where the balance is still positive. Released orders with money owed stay visible.
              </p>
            </div>
          </div>
          <span className="mono text-[15px] font-semibold" style={{ color: outstandingOrders.length ? COLORS.warning : COLORS.success }}>
            {formatPHP(summary.outstanding_balance)}
          </span>
        </header>
        {outstandingOrders.length ? (
          <div className="divide-y" style={{ borderColor: COLORS.border }}>
            {outstandingOrders.map((order) => (
              <button
                key={String(order.order_id)}
                type="button"
                onClick={() => {
                  if (mode === 'front_desk') { setPayPrefill(String(order.order_id)); setPayOpen(true); }
                  else onOpenOrder?.(order);
                }}
                className="flex w-full flex-col gap-3 p-4 text-left transition-colors sm:flex-row sm:items-center sm:justify-between"
                onMouseEnter={(event) => { event.currentTarget.style.background = COLORS.surfaceAlt; }}
                onMouseLeave={(event) => { event.currentTarget.style.background = 'transparent'; }}
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 flex-shrink-0 overflow-hidden bg-[#F4F1E6]" style={{ borderRadius: 10 }}>
                    <OrderGarmentImage order={order} className="h-full w-full" />
                  </div>
                  <div>
                    <div className="mono text-[11px]" style={{ color: COLORS.faint }}>{order.job_card_number}</div>
                    <div className="text-[13px] font-medium" style={{ color: COLORS.ink }}>{order.garment}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Pill tone={stageTone(order.stage)}>{order.production_status}</Pill>
                      <Pill tone={paymentTone(order.payment_status)}>{order.payment_status}</Pill>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-[0.1em]" style={{ color: COLORS.muted }}>Due date</div>
                    <div className="text-[12px]" style={{ color: COLORS.inkSoft }}>{order.due_date ? new Date(order.due_date).toLocaleDateString() : 'TBA'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-[0.1em]" style={{ color: COLORS.muted }}>Outstanding</div>
                    <div className="mono text-[13.5px] font-semibold" style={{ color: COLORS.warning }}>{formatPHPExact(order.balance)}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="p-8 text-center text-[13px]" style={{ color: COLORS.success }}>Nothing outstanding - every job card is settled.</p>
        )}
      </section>


      {/* ---------------- ANALYTICS (real data only) ---------------- */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="border bg-white p-5" style={{ borderColor: COLORS.border, borderRadius: 16, boxShadow: shadowSm }}>
          <h2 className="text-[14px] font-semibold" style={{ color: COLORS.ink }}>Monthly spending</h2>
          <p className="mt-1 text-[11px]" style={{ color: COLORS.muted }}>Cash received per month (voided payments excluded).</p>
          <div className="mt-4">
            {analytics.monthly.length
              ? <BarChartPanel data={analytics.monthly} height={170} />
              : <p className="py-10 text-center text-[12px]" style={{ color: COLORS.muted }}>No payments recorded yet.</p>}
          </div>
        </div>

        <div className="border bg-white p-5" style={{ borderColor: COLORS.border, borderRadius: 16, boxShadow: shadowSm }}>
          <h2 className="text-[14px] font-semibold" style={{ color: COLORS.ink }}>Order distribution by garment</h2>
          <p className="mt-1 text-[11px]" style={{ color: COLORS.muted }}>Every job card counted once, by garment type.</p>
          {analytics.garments.length ? (
            <div className="mt-4 flex items-center gap-5">
              <DonutChart
                size={132}
                segments={analytics.garments.map((garment, index) => ({
                  value: garment.value,
                  color: [COLORS.navy, COLORS.brass, COLORS.info, COLORS.success, COLORS.warning, COLORS.faint][index % 6],
                }))}
              />
              <ul className="flex-1 space-y-1.5">
                {analytics.garments.map((garment, index) => (
                  <li key={garment.name} className="flex items-center justify-between gap-3 text-[11.5px]">
                    <span className="flex items-center gap-2" style={{ color: COLORS.inkSoft }}>
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: [COLORS.navy, COLORS.brass, COLORS.info, COLORS.success, COLORS.warning, COLORS.faint][index % 6] }} />
                      {garment.name}
                    </span>
                    <span className="mono" style={{ color: COLORS.ink }}>{garment.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : <p className="py-10 text-center text-[12px]" style={{ color: COLORS.muted }}>No orders yet.</p>}
        </div>

        <div className="border bg-white p-5" style={{ borderColor: COLORS.border, borderRadius: 16, boxShadow: shadowSm }}>
          <h2 className="text-[14px] font-semibold" style={{ color: COLORS.ink }}>Outstanding balances by order</h2>
          <p className="mt-1 text-[11px]" style={{ color: COLORS.muted }}>What is still collectable, job card by job card.</p>
          <div className="mt-4">
            {analytics.outstanding.length
              ? <BarChartPanel data={analytics.outstanding} height={170} />
              : <p className="py-10 text-center text-[12px]" style={{ color: COLORS.success }}>Every balance is settled.</p>}
          </div>
        </div>
      </section>

      <OrderLedger orders={orders} onOpenOrder={onOpenOrder} />

      <PaymentLedger
        payments={payments}
        onViewReceipt={(payment) => setReceiptFor(String(payment.payment_id))}
        onVoid={mode === 'admin' ? handleVoid : undefined}
        canVoid={mode === 'admin'}
      />

      {receiptFor && <PaymentReceiptModal paymentId={receiptFor} onClose={() => setReceiptFor(null)} />}

      {/* The ONLY payment entry form - Front Desk only, never a second flow. */}
      {payOpen && mode === 'front_desk' && (
        <RecordCashPaymentModal
          orders={orders.map((order) => ({
            order_id: String(order.order_id),
            job_card_id: order.job_card_number,
            garment_type: order.garment,
            remaining_balance: order.balance,
            deposit_paid: order.paid_amount,
          }))}
          initialOrderRef={payPrefill}
          customerName={customer.full_name}
          onClose={() => setPayOpen(false)}
          onRecorded={(payment) => {
            flash(`Payment ${payment.receipt_number} recorded. Order balance updated.`);
            load(customer.customer_code, true);
          }}
        />
      )}
    </div>
  );
}

export default CustomerFinancialCenterView;
