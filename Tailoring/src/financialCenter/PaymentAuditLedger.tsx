// financialCenter/PaymentAuditLedger.tsx
//
// ADMIN PAYMENT AUDIT.
//
// The Admin's cross-customer payment ledger. It reads the SHARED payment API
// (GET /api/payments) - the same records the Front Desk writes - so the Admin
// audits exactly the payments that exist and never sees a duplicated or
// invented row. There is no Admin payment form: monitoring, reprinting,
// filtering, exporting and authorized voiding only.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ban, Download, Loader2, Printer, RefreshCcw, Search } from 'lucide-react';
import ExcelJS from 'exceljs';
import frontDeskApi, { type Payment } from '../../services/frontDeskApi';
import { COLORS, shadowSm } from '../Pages_Admin/Theme';
import { formatPHP, formatPHPExact } from '../utils/currency';
import { cashFigure } from './cash';
import { Pill } from './OrderLedger';
import { CustomerLink } from './FinancialCenterContext';

const PAGE_SIZE = 10;
const TYPE_FILTERS = ['All', 'Deposit', 'Partial Payment', 'Final Payment'] as const;

export function PaymentAuditLedger({
  onOpenReceipt, onOpenCustomer,
}: {
  onOpenReceipt: (paymentId: string) => void;
  onOpenCustomer: (customerId: string) => void;
}) {
  const [rows, setRows] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [state, setState] = useState<'All' | 'Active' | 'Voided'>('All');
  const [type, setType] = useState<string>('All');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [voiding, setVoiding] = useState<Payment | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidError, setVoidError] = useState('');
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRows(await frontDeskApi.getAllPayments());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load the payment ledger.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((payment) => {
      const haystack = `${payment.receipt_number} ${payment.customer_name} ${payment.customer_code || ''} ${payment.job_card_id} ${payment.recorded_by_name} ${payment.payment_type}`.toLowerCase();
      const matchesQuery = !q || haystack.includes(q);
      const isVoided = Boolean(payment.voided_at);
      const matchesState = state === 'All' || (state === 'Voided' ? isVoided : !isVoided);
      const matchesType = type === 'All' || payment.payment_type === type;
      const day = new Date(payment.payment_date).getTime();
      const matchesFrom = !from || day >= new Date(`${from}T00:00:00`).getTime();
      const matchesTo = !to || day <= new Date(`${to}T23:59:59`).getTime();
      return matchesQuery && matchesState && matchesType && matchesFrom && matchesTo;
    });
  }, [rows, query, state, type, from, to]);

  const totals = useMemo(() => ({
    active: filtered.filter((payment) => !payment.voided_at).reduce((sum, payment) => sum + Number(payment.amount), 0),
    voided: filtered.filter((payment) => payment.voided_at).reduce((sum, payment) => sum + Number(payment.amount), 0),
  }), [filtered]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  async function submitVoid() {
    if (!voiding) return;
    if (!voidReason.trim()) { setVoidError('A void reason is required.'); return; }
    try {
      await frontDeskApi.voidPayment(String(voiding.payment_id), voidReason.trim());
      setVoiding(null);
      setVoidReason('');
      setVoidError('');
      await load();
    } catch (err) {
      setVoidError(err instanceof Error ? err.message : 'Unable to void this payment.');
    }
  }

  async function exportAudit() {
    setExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Payment audit');
      sheet.addRow(['Date & time', 'Receipt No.', 'Customer', 'Customer code', 'Order No.', 'Payment type', 'Amount', 'Cash received', 'Change given', 'Staff', 'Status', 'Void reason']);
      filtered.forEach((payment) => sheet.addRow([
        new Date(payment.payment_date).toLocaleString(), payment.receipt_number, payment.customer_name,
        payment.customer_code || '', payment.job_card_id, payment.payment_type, Number(payment.amount),
        payment.cash_received == null ? '—' : Number(payment.cash_received),
        payment.change_given == null ? '—' : Number(payment.change_given),
        payment.recorded_by_name, payment.voided_at ? 'Voided' : 'Active', payment.void_reason || '',
      ]));
      sheet.getRow(1).font = { bold: true };
      const buffer = await workbook.xlsx.writeBuffer();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      link.download = 'payment-audit.xlsx';
      link.click();
      URL.revokeObjectURL(link.href);
    } finally {
      setExporting(false);
    }
  }


  return (
    <section className="border bg-white" style={{ borderColor: COLORS.border, borderRadius: 16, boxShadow: shadowSm }}>
      <header className="border-b p-5" style={{ borderColor: COLORS.border }}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-[15px] font-semibold" style={{ color: COLORS.ink }}>Payment audit trail</h2>
            <p className="mt-1 text-[11.5px]" style={{ color: COLORS.muted }}>
              Every payment the Front Desk recorded, across all customers. Admin is read-only for recording; voiding is authorized and never deletes a row.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={exportAudit} disabled={exporting} className="inline-flex items-center gap-2 border px-3 py-2 text-[11.5px] font-semibold disabled:opacity-50" style={{ borderColor: COLORS.border, color: COLORS.inkSoft, borderRadius: 8, background: COLORS.surface }}>
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export
            </button>
            <button type="button" onClick={load} className="inline-flex items-center gap-2 border px-3 py-2 text-[11.5px] font-semibold" style={{ borderColor: COLORS.border, color: COLORS.muted, borderRadius: 8, background: COLORS.surface }} aria-label="Refresh the payment audit">
              <RefreshCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: COLORS.faint }} />
            <input
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(1); }}
              placeholder="Search receipt no., customer, job card, staff or type"
              className="w-full border bg-white py-2.5 pl-9 pr-3 text-[12.5px] outline-none"
              style={{ borderColor: COLORS.border, borderRadius: 8, color: COLORS.ink }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-[11px]" style={{ color: COLORS.muted }}>
              From
              <input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} className="border px-2 py-1.5 text-[11.5px]" style={{ borderColor: COLORS.border, borderRadius: 6, color: COLORS.ink }} />
            </label>
            <label className="flex items-center gap-2 text-[11px]" style={{ color: COLORS.muted }}>
              To
              <input type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} className="border px-2 py-1.5 text-[11.5px]" style={{ borderColor: COLORS.border, borderRadius: 6, color: COLORS.ink }} />
            </label>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
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
          {TYPE_FILTERS.map((option) => (
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

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ['Rows', String(filtered.length)],
            ['Active value', formatPHP(totals.active)],
            ['Voided value', formatPHP(totals.voided)],
            ['Voided rows', String(filtered.filter((payment) => payment.voided_at).length)],
          ].map(([label, value]) => (
            <div key={label} className="border px-3 py-2" style={{ borderColor: COLORS.border, background: COLORS.surfaceAlt, borderRadius: 10 }}>
              <div className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: COLORS.muted }}>{label}</div>
              <div className="mono mt-0.5 text-[14px] font-semibold" style={{ color: COLORS.ink }}>{value}</div>
            </div>
          ))}
        </div>
      </header>

      {error && <p className="border-b px-5 py-3 text-[12px]" style={{ borderColor: COLORS.dangerBorder, background: COLORS.dangerBg, color: COLORS.danger }}>{error}</p>}
      {loading && <p className="flex items-center gap-2 px-5 py-4 text-[12px]" style={{ color: COLORS.muted }}><Loader2 className="h-4 w-4 animate-spin" /> Loading the audit trail…</p>}


      <div className="hidden overflow-x-auto xl:block">
        <div className="grid min-w-[1080px] grid-cols-[1.1fr_1fr_1.4fr_1.1fr_1.1fr_0.85fr_0.85fr_0.85fr_1fr_1.5fr] gap-3 border-b px-5 py-3" style={{ borderColor: COLORS.border }}>
          {['Date & time', 'Receipt no.', 'Customer', 'Order no.', 'Type', 'Amount', 'Cash in', 'Change', 'Status', 'Actions'].map((label) => (
            <span key={label} className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: COLORS.faint }}>{label}</span>
          ))}
        </div>
        {pageRows.map((payment) => (
          <div
            key={String(payment.payment_id)}
            className="grid min-w-[1080px] grid-cols-[1.1fr_1fr_1.4fr_1.1fr_1.1fr_0.85fr_0.85fr_0.85fr_1fr_1.5fr] items-center gap-3 border-b px-5 py-3"
            style={{ borderColor: COLORS.border, opacity: payment.voided_at ? 0.75 : 1 }}
          >
            <span className="text-[11.5px]" style={{ color: COLORS.muted }}>{new Date(payment.payment_date).toLocaleString()}</span>
            <span className="mono text-[12px]" style={{ color: COLORS.ink }}>{payment.receipt_number}</span>
            <span className="min-w-0">
              <CustomerLink customerId={payment.customer_code || payment.customer_id} className="block truncate text-[12.5px] font-medium" title="Open this customer's Financial Center">
                {payment.customer_name}
              </CustomerLink>
              {payment.customer_code ? <span className="mono block text-[10.5px]" style={{ color: COLORS.faint }}>{payment.customer_code}</span> : null}
            </span>
            <span className="mono text-[11.5px]" style={{ color: COLORS.inkSoft }}>{payment.job_card_id || '—'}</span>
            <span className="text-[12px]" style={{ color: COLORS.ink }}>{payment.payment_type}</span>
            <span className="mono text-[12.5px]" style={{ color: payment.voided_at ? COLORS.muted : COLORS.ink, textDecoration: payment.voided_at ? 'line-through' : 'none' }}>{formatPHPExact(payment.amount)}</span>
            <span className="mono text-[12px]" style={{ color: COLORS.muted }}>{cashFigure(payment.cash_received ?? null)}</span>
            <span className="mono text-[12px]" style={{ color: COLORS.muted }}>{cashFigure(payment.change_given ?? null)}</span>
            <span>{payment.voided_at ? <Pill tone="neutral">Voided</Pill> : <Pill tone="success">Active</Pill>}</span>
            <span className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => onOpenReceipt(String(payment.payment_id))} className="inline-flex items-center gap-1 border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.06em]" style={{ borderColor: COLORS.border, color: COLORS.inkSoft, borderRadius: 6 }}>
                <Printer className="h-3 w-3" /> Receipt
              </button>
              {!payment.voided_at && (
                <button type="button" onClick={() => { setVoiding(payment); setVoidError(''); }} className="inline-flex items-center gap-1 border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.06em]" style={{ borderColor: COLORS.dangerBorder, color: COLORS.danger, borderRadius: 6 }}>
                  <Ban className="h-3 w-3" /> Void
                </button>
              )}
            </span>
          </div>
        ))}
      </div>


      {/* Mobile / tablet cards */}
      <div className="xl:hidden">
        {pageRows.map((payment) => (
          <div key={String(payment.payment_id)} className="border-b p-4" style={{ borderColor: COLORS.border, opacity: payment.voided_at ? 0.75 : 1 }}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mono text-[11.5px]" style={{ color: COLORS.ink }}>{payment.receipt_number}</div>
                <CustomerLink customerId={payment.customer_code || payment.customer_id} className="mt-0.5 block truncate text-[12.5px] font-medium">
                  {payment.customer_name}
                </CustomerLink>
                <div className="mono mt-0.5 text-[11px]" style={{ color: COLORS.muted }}>{payment.job_card_id || '—'} · {new Date(payment.payment_date).toLocaleString()}</div>
              </div>
              {payment.voided_at ? <Pill tone="neutral">Voided</Pill> : <Pill tone="success">Active</Pill>}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-[11.5px]">
              <div><span style={{ color: COLORS.muted }}>Amount</span><div className="mono" style={{ color: COLORS.ink }}>{formatPHP(payment.amount)}</div></div>
              <div><span style={{ color: COLORS.muted }}>Cash in</span><div className="mono" style={{ color: COLORS.muted }}>{cashFigure(payment.cash_received ?? null)}</div></div>
              <div><span style={{ color: COLORS.muted }}>Change</span><div className="mono" style={{ color: COLORS.muted }}>{cashFigure(payment.change_given ?? null)}</div></div>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="text-[11px]" style={{ color: COLORS.muted }}>{payment.payment_type} · {payment.recorded_by_name}</span>
              <button type="button" onClick={() => onOpenReceipt(String(payment.payment_id))} className="inline-flex items-center gap-1 border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.06em]" style={{ borderColor: COLORS.border, color: COLORS.inkSoft, borderRadius: 6 }}>
                <Printer className="h-3 w-3" /> Receipt
              </button>
              <button type="button" onClick={() => onOpenCustomer(payment.customer_code || String(payment.customer_id))} className="border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.06em]" style={{ borderColor: COLORS.border, color: COLORS.inkSoft, borderRadius: 6 }}>
                Financial center
              </button>
              {!payment.voided_at && (
                <button type="button" onClick={() => { setVoiding(payment); setVoidError(''); }} className="inline-flex items-center gap-1 border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.06em]" style={{ borderColor: COLORS.dangerBorder, color: COLORS.danger, borderRadius: 6 }}>
                  <Ban className="h-3 w-3" /> Void
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {!loading && !pageRows.length && <p className="p-10 text-center text-[13px]" style={{ color: COLORS.muted }}>No payment matches these filters.</p>}

      {pageCount > 1 && (
        <footer className="flex items-center justify-between gap-3 px-5 py-3" style={{ borderTop: `1px solid ${COLORS.border}` }}>
          <span className="text-[11px]" style={{ color: COLORS.muted }}>Page {safePage} of {pageCount}</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1} className="border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-40" style={{ borderColor: COLORS.border, color: COLORS.inkSoft, borderRadius: 6 }}>Previous</button>
            <button type="button" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={safePage >= pageCount} className="border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-40" style={{ borderColor: COLORS.border, color: COLORS.inkSoft, borderRadius: 6 }}>Next</button>
          </div>
        </footer>
      )}


      {/* Authorized voiding - never a delete, always audited */}
      {voiding && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button aria-label="Close" onClick={() => setVoiding(null)} className="absolute inset-0" style={{ background: 'rgba(17,24,39,0.55)' }} />
          <div className="relative w-full max-w-md border bg-white p-6" style={{ borderColor: COLORS.border, borderRadius: 16 }}>
            <h3 className="text-[15px] font-semibold" style={{ color: COLORS.ink }}>Void payment {voiding.receipt_number}</h3>
            <p className="mt-2 text-[12px]" style={{ color: COLORS.muted }}>
              {voiding.customer_name} · the balance on {voiding.job_card_id || 'the job card'} is restored by the original payment amount of {formatPHPExact(voiding.amount)}.
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

export default PaymentAuditLedger;
