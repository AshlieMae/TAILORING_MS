import { useEffect, useMemo, useState } from 'react';
import { Banknote, CalendarDays, ChevronRight, CreditCard, ReceiptText } from 'lucide-react';
import {
  COLORS, FONT_IMPORT, PageHeader, StatCard, SearchField, FilterPill, Card, TableHeadRow, EmptyState,
  ModalShell, EyebrowLabel, Badge,
} from './Theme';

type PaymentStatus = 'Paid' | 'Partial' | 'Balance due';
type Payment = { receipt: string; customer: string; job: string; garment: string; method: string; type: string; amount: number; balance: number; date: string; status: PaymentStatus; };

const PAYMENTS: Payment[] = [
  { receipt: 'RCT-1089', customer: 'Consuelo Reyes', job: 'JC-3019', garment: "Women's Coat", method: 'Cash', type: 'Final payment', amount: 3600, balance: 0, date: 'Aug 02, 2026', status: 'Paid' },
  { receipt: 'RCT-1088', customer: 'Reyna Fuentes', job: 'JC-3021', garment: 'Barong Tagalog', method: 'GCash', type: '50% deposit', amount: 2400, balance: 2400, date: 'Aug 01, 2026', status: 'Partial' },
  { receipt: 'RCT-1087', customer: 'Boyet Salcedo', job: 'JC-3020', garment: 'Two-piece Suit', method: 'Bank transfer', type: '50% deposit', amount: 6250, balance: 6250, date: 'Jul 30, 2026', status: 'Partial' },
  { receipt: 'RCT-1086', customer: 'Tomas Villareal', job: 'JC-3018', garment: 'School Uniform Set', method: 'Cash', type: '50% deposit', amount: 1075, balance: 1075, date: 'Jul 28, 2026', status: 'Balance due' },
  { receipt: 'RCT-1085', customer: 'Marisol Chan', job: 'JC-3017', garment: 'Evening Gown', method: 'Credit card', type: '50% deposit', amount: 7950, balance: 7950, date: 'Jul 27, 2026', status: 'Partial' },
  { receipt: 'RCT-1084', customer: 'Cesar de la Cruz', job: 'JC-3016', garment: 'Long-sleeve Polo', method: 'Cash', type: 'Final payment', amount: 1425, balance: 0, date: 'Jul 26, 2026', status: 'Paid' },
];

const STATUS_TONE: Record<PaymentStatus, 'success' | 'info' | 'danger'> = { Paid: 'success', Partial: 'info', 'Balance due': 'danger' };
const peso = (value: number) => `₱${value.toLocaleString()}`;

export function AdminPaymentsView() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'All' | PaymentStatus>('All');
  const [selected, setSelected] = useState<Payment | null>(null);
  const [rows, setRows] = useState<Payment[]>(PAYMENTS);
  const [loadError, setLoadError] = useState('');
  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const authToken = () => localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';
    fetch(`${API_URL}/admin/payments`, { headers: { Authorization: `Bearer ${authToken()}` } })
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.message || 'Unable to load payments.'); return d; })
      .then((d) => {
        const mapped: Payment[] = (d.payments || []).map((p: any) => ({
          receipt: p.receipt, customer: p.customer, job: p.job, garment: p.garment,
          method: p.method, type: p.type, amount: p.amount, balance: p.balance,
          date: p.date, status: p.status === 'Paid' ? 'Paid' : (p.status === 'Balance due' ? 'Balance due' : 'Partial'),
        }));
        setRows(mapped);
      })
      .catch((e) => setLoadError(e.message));
  }, []);
  const payments = useMemo(() => rows.filter((payment) => `${payment.receipt} ${payment.customer} ${payment.job} ${payment.garment}`.toLowerCase().includes(query.toLowerCase()) && (filter === 'All' || payment.status === filter)), [query, filter, rows]);
  const collected = rows.reduce((sum, payment) => sum + payment.amount, 0);
  const outstanding = rows.reduce((sum, payment) => sum + payment.balance, 0);

  return (
    <div className="space-y-7" style={{ color: COLORS.ink }}>
      <style>{FONT_IMPORT}</style>

      <PageHeader eyebrow="Cash & transaction records" title="Payments" description="Review deposits, final payments, balances, and receipt records." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard delay={0.05} icon={<Banknote />} label="Collected this period" value={peso(collected)} tone="success" sparkline={[8, 12, 9, 14, 11, 16, 13]} trend="+9.2% vs last period" />
        <StatCard delay={0.09} icon={<CreditCard />} label="Outstanding balance" value={peso(outstanding)} tone="danger" trend="6 open balances" trendTone="danger" />
        <StatCard delay={0.13} icon={<ReceiptText />} label="Transactions" value={rows.length} tone="neutral" />
        {loadError && <p className="text-sm sm:col-span-3" style={{ color: COLORS.danger }}>{loadError}</p>}
      </div>

      <Card delay={0.18}>
        <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: COLORS.border }}>
          <SearchField value={query} onChange={setQuery} placeholder="Search receipt, job card, or customer" />
          <div className="flex flex-wrap gap-2">
            {(['All', 'Paid', 'Partial', 'Balance due'] as const).map((status) => (
              <FilterPill key={status} active={filter === status} onClick={() => setFilter(status)}>{status}</FilterPill>
            ))}
          </div>
        </div>

        <TableHeadRow gridCols="grid-cols-[0.85fr_1.2fr_1.1fr_1fr_0.8fr_0.9fr_24px]" columns={['Receipt', 'Customer', 'Job card', 'Payment type', 'Amount', 'Status', '']} />

        {payments.map((payment) => (
          <button
            key={payment.receipt}
            onClick={() => setSelected(payment)}
            className="grid w-full grid-cols-1 gap-2 border-b px-6 py-4 text-left transition-colors md:grid-cols-[0.85fr_1.2fr_1.1fr_1fr_0.8fr_0.9fr_24px] md:items-center md:gap-4"
            style={{ borderColor: COLORS.border }}
            onMouseEnter={(e) => { e.currentTarget.style.background = COLORS.surfaceAlt; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span className="mono text-[12px]" style={{ color: COLORS.navy }}>{payment.receipt}</span>
            <div>
              <div className="font-medium" style={{ color: COLORS.ink }}>{payment.customer}</div>
              <div className="mt-1 text-xs" style={{ color: COLORS.muted }}>{payment.garment}</div>
            </div>
            <span className="text-sm" style={{ color: COLORS.ink }}>{payment.job}</span>
            <span className="text-sm" style={{ color: COLORS.ink }}>{payment.type}</span>
            <span className="mono text-sm" style={{ color: COLORS.ink }}>{peso(payment.amount)}</span>
            <span><Badge tone={STATUS_TONE[payment.status]}>{payment.status}</Badge></span>
            <ChevronRight className="hidden h-4 w-4 md:block" style={{ color: COLORS.faint }} />
          </button>
        ))}

        {!payments.length && <EmptyState message="No payment matches your search." />}
      </Card>

      {selected && <PaymentDetails payment={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function PaymentDetails({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  return (
    <ModalShell onClose={onClose}>
      <header className="flex items-start justify-between border-b px-7 py-6 sm:px-8" style={{ borderColor: COLORS.border }}>
        <div>
          <EyebrowLabel>Payment receipt</EyebrowLabel>
          <h2 className="mt-1.5 text-2xl font-semibold" style={{ color: COLORS.ink }}>{payment.receipt}</h2>
          <p className="mt-1 text-sm" style={{ color: COLORS.muted }}>{payment.date}</p>
        </div>
        <button onClick={onClose} className="p-2" style={{ color: COLORS.muted, borderRadius: 8 }}><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
      </header>
      <div className="space-y-7 p-7 sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          {[['Customer', payment.customer], ['Job card', payment.job], ['Garment', payment.garment], ['Payment method', payment.method], ['Payment type', payment.type], ['Payment received', peso(payment.amount)], ['Remaining balance', peso(payment.balance)], ['Status', payment.status]].map(([label, value]) => (
            <div key={label} className="border p-4" style={{ borderColor: COLORS.border, background: COLORS.surfaceAlt, borderRadius: 8 }}>
              <div className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: COLORS.muted }}>{label}</div>
              <div className="mt-1 text-sm" style={{ color: COLORS.ink }}>{value}</div>
            </div>
          ))}
        </div>
        <div className="border p-5" style={{ borderColor: COLORS.navySoftBorder, background: COLORS.navySoft, borderRadius: 10 }}>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" style={{ color: COLORS.navy }} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: COLORS.muted }}>Transaction record</span>
          </div>
          <p className="mt-2 text-sm" style={{ color: COLORS.ink }}>Payment was recorded on {payment.date} through {payment.method}.</p>
        </div>
      </div>
    </ModalShell>
  );
}

export default AdminPaymentsView;
