// financialCenter/OrderLedger.tsx
//
// THE ORDER LEDGER - every job card a customer has ever placed, including
// drafts, active production, ready-for-pickup, released and historical orders.
// Search, status filters, sorting, pagination, a desktop table and a mobile card
// layout; clicking a row opens the existing order details.
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import type { FinancialOrder } from '../../services/frontDeskApi';
import { COLORS } from '../Pages_Admin/Theme';
import { formatPHP, formatPHPExact } from '../utils/currency';

/** Every state a job card can be in - nothing is hidden from the ledger. */
export const ORDER_STATES = [
  'Draft', 'Measuring', 'Pattern Cutting', 'Initial Assembly', 'First Fitting',
  'Final Alterations', 'Quality Review', 'Completed', 'Ready for Pickup', 'Released',
] as const;

/** Green = complete, amber = collectable, blue = active, gray = released/draft. */
export function stageTone(stage: string | null | undefined): 'success' | 'warning' | 'info' | 'neutral' {
  if (!stage) return 'neutral';
  if (stage === 'Completed') return 'success';
  if (stage === 'Ready for Pickup') return 'warning';
  if (stage === 'Released') return 'neutral';
  if (stage === 'Draft') return 'neutral';
  return 'info';
}

/** Green = fully paid, amber = partial, red = nothing paid yet. */
export function paymentTone(status: string | null | undefined): 'success' | 'warning' | 'danger' | 'neutral' {
  if (!status) return 'neutral';
  if (status === 'Fully Paid') return 'success';
  if (status === 'Partial') return 'warning';
  if (status === 'No Payment') return 'danger';
  return 'neutral';
}

const TONE_STYLE: Record<string, { bg: string; border: string; text: string }> = {
  success: { bg: COLORS.successBg, border: COLORS.successBorder, text: COLORS.success },
  warning: { bg: COLORS.warningBg, border: COLORS.warningBorder, text: COLORS.warning },
  danger: { bg: COLORS.dangerBg, border: COLORS.dangerBorder, text: COLORS.danger },
  info: { bg: COLORS.infoBg, border: COLORS.infoBorder, text: COLORS.info },
  neutral: { bg: COLORS.surfaceAlt, border: COLORS.border, text: COLORS.muted },
};

export function Pill({ tone, children }: { tone: keyof typeof TONE_STYLE; children: React.ReactNode }) {
  const t = TONE_STYLE[tone] ?? TONE_STYLE.neutral;
  return (
    <span className="inline-block border px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.06em] whitespace-nowrap" style={{ background: t.bg, borderColor: t.border, color: t.text, borderRadius: 6 }}>
      {children}
    </span>
  );
}

type SortKey = 'created_at' | 'total_amount' | 'paid_amount' | 'balance' | 'job_card_number';

const PAGE_SIZE = 8;

export function OrderLedger({ orders, onOpenOrder }: { orders: FinancialOrder[]; onOpenOrder?: (order: FinancialOrder) => void }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<string>('All');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = orders.filter((order) => {
      const matchesQuery = !q || `${order.job_card_number} ${order.garment} ${order.stage} ${order.fabric}`.toLowerCase().includes(q);
      const matchesStatus = status === 'All' || order.stage === status;
      return matchesQuery && matchesStatus;
    });
    return [...rows].sort((a, b) => {
      if (sortKey === 'job_card_number') return sortAsc ? a.job_card_number.localeCompare(b.job_card_number) : b.job_card_number.localeCompare(a.job_card_number);
      if (sortKey === 'created_at') {
        const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        return sortAsc ? diff : -diff;
      }
      const diff = Number(a[sortKey]) - Number(b[sortKey]);
      return sortAsc ? diff : -diff;
    });
  }, [orders, query, status, sortKey, sortAsc]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortAsc((asc) => !asc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const SortHeader = ({ label, column, align = 'left' }: { label: string; column: SortKey; align?: 'left' | 'right' }) => (
    <button
      type="button"
      onClick={() => toggleSort(column)}
      className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${align === 'right' ? 'justify-end' : ''}`}
      style={{ color: COLORS.faint }}
    >
      {label}
      {sortKey === column ? (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : null}
    </button>
  );


  return (
    <section className="border bg-white" style={{ borderColor: COLORS.border, borderRadius: 16 }}>
      <header className="flex flex-col gap-3 border-b p-5 lg:flex-row lg:items-center lg:justify-between" style={{ borderColor: COLORS.border }}>
        <div>
          <h2 className="text-[15px] font-semibold" style={{ color: COLORS.ink }}>Order ledger</h2>
          <p className="mt-1 text-[11.5px]" style={{ color: COLORS.muted }}>Every job card for this customer, active and historical. {filtered.length} shown.</p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: COLORS.faint }} />
          <input
            value={query}
            onChange={(event) => { setQuery(event.target.value); setPage(1); }}
            placeholder="Search order no. or garment"
            className="w-full border bg-white py-2.5 pl-9 pr-3 text-[12.5px] outline-none lg:w-64"
            style={{ borderColor: COLORS.border, borderRadius: 8, color: COLORS.ink }}
          />
        </div>
      </header>

      <div className="flex flex-wrap gap-2 border-b px-5 py-3" style={{ borderColor: COLORS.border, background: COLORS.surfaceAlt }}>
        {['All', ...ORDER_STATES].map((state) => (
          <button
            key={state}
            type="button"
            onClick={() => { setStatus(state); setPage(1); }}
            className="border px-2.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] transition-colors"
            style={status === state
              ? { borderColor: COLORS.navy, background: COLORS.navy, color: '#fff', borderRadius: 6 }
              : { borderColor: COLORS.border, background: COLORS.surface, color: COLORS.muted, borderRadius: 6 }}
          >
            {state}
          </button>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <div className="grid grid-cols-[1.1fr_1.3fr_0.9fr_0.85fr_0.85fr_0.85fr_1fr_1fr] gap-3 border-b px-5 py-3" style={{ borderColor: COLORS.border }}>
          <SortHeader label="Order no." column="job_card_number" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: COLORS.faint }}>Garment</span>
          <SortHeader label="Ordered" column="created_at" />
          <SortHeader label="Total" column="total_amount" align="right" />
          <SortHeader label="Paid" column="paid_amount" align="right" />
          <SortHeader label="Balance" column="balance" align="right" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: COLORS.faint }}>Status</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: COLORS.faint }}>Payment</span>
        </div>
        {pageRows.map((order) => (
          <button
            key={String(order.order_id)}
            type="button"
            onClick={() => onOpenOrder?.(order)}
            className="grid w-full grid-cols-[1.1fr_1.3fr_0.9fr_0.85fr_0.85fr_0.85fr_1fr_1fr] items-center gap-3 border-b px-5 py-3 text-left transition-colors"
            style={{ borderColor: COLORS.border, background: 'transparent', cursor: onOpenOrder ? 'pointer' : 'default' }}
            onMouseEnter={(event) => { event.currentTarget.style.background = COLORS.surfaceAlt; }}
            onMouseLeave={(event) => { event.currentTarget.style.background = 'transparent'; }}
          >
            <span className="mono text-[12px]" style={{ color: COLORS.ink }}>{order.job_card_number}</span>
            <span className="text-[12.5px]" style={{ color: COLORS.ink }}>{order.garment}{order.quantity > 1 ? ` ×${order.quantity}` : ''}</span>
            <span className="text-[12px]" style={{ color: COLORS.muted }}>{new Date(order.created_at).toLocaleDateString()}</span>
            <span className="mono text-right text-[12.5px]" style={{ color: COLORS.ink }}>{formatPHPExact(order.total_amount)}</span>
            <span className="mono text-right text-[12.5px]" style={{ color: COLORS.success }}>{formatPHPExact(order.paid_amount)}</span>
            <span className="mono text-right text-[12.5px]" style={{ color: order.balance > 0 ? COLORS.warning : COLORS.success }}>{formatPHPExact(order.balance)}</span>
            <span><Pill tone={stageTone(order.stage)}>{order.stage}</Pill></span>
            <span><Pill tone={paymentTone(order.payment_status)}>{order.payment_status}</Pill></span>
          </button>
        ))}
      </div>


      {/* Mobile cards */}
      <div className="md:hidden">
        {pageRows.map((order) => (
          <button key={String(order.order_id)} type="button" onClick={() => onOpenOrder?.(order)} className="block w-full border-b p-4 text-left" style={{ borderColor: COLORS.border }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="mono text-[11px]" style={{ color: COLORS.faint }}>{order.job_card_number}</div>
                <div className="mt-0.5 text-[13px] font-medium" style={{ color: COLORS.ink }}>{order.garment}</div>
              </div>
              <Pill tone={paymentTone(order.payment_status)}>{order.payment_status}</Pill>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-[11.5px]">
              <div><span style={{ color: COLORS.muted }}>Total</span><div className="mono" style={{ color: COLORS.ink }}>{formatPHP(order.total_amount)}</div></div>
              <div><span style={{ color: COLORS.muted }}>Paid</span><div className="mono" style={{ color: COLORS.success }}>{formatPHP(order.paid_amount)}</div></div>
              <div><span style={{ color: COLORS.muted }}>Balance</span><div className="mono" style={{ color: order.balance > 0 ? COLORS.warning : COLORS.success }}>{formatPHP(order.balance)}</div></div>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <Pill tone={stageTone(order.stage)}>{order.stage}</Pill>
              <span className="text-[11px]" style={{ color: COLORS.muted }}>Ordered {new Date(order.created_at).toLocaleDateString()}</span>
            </div>
          </button>
        ))}
      </div>

      {!pageRows.length && <p className="p-10 text-center text-[13px]" style={{ color: COLORS.muted }}>No job card matches this search.</p>}

      {pageCount > 1 && (
        <footer className="flex items-center justify-between gap-3 px-5 py-3" style={{ borderTop: `1px solid ${COLORS.border}` }}>
          <span className="text-[11px]" style={{ color: COLORS.muted }}>Page {safePage} of {pageCount}</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1} className="border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-40" style={{ borderColor: COLORS.border, color: COLORS.inkSoft, borderRadius: 6 }}>Previous</button>
            <button type="button" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={safePage >= pageCount} className="border px-3 py-1.5 text-[11px] font-semibold disabled:opacity-40" style={{ borderColor: COLORS.border, color: COLORS.inkSoft, borderRadius: 6 }}>Next</button>
          </div>
        </footer>
      )}
    </section>
  );
}

export default OrderLedger;
