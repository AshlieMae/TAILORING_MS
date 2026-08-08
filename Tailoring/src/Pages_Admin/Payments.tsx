import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Banknote, CalendarDays, ChevronRight, CreditCard, ReceiptText, Search, X } from 'lucide-react';

/* ---------------------------------------------------------------
   ADMIN — Payments
   "The Receipt Spool"
   Every payment reads like a register receipt torn from the spool:
   whiter paper than the rest of the shop, a perforated top edge,
   right-aligned typewriter figures, and status shown as a rotated
   ink stamp rather than a soft pill.
------------------------------------------------------------------ */

const INK = '#262433';
const PAPER = '#FAF7F0';
const PAGE = '#EFEAE0';
const LINE = '#DDD5C4';
const MUTED = '#7A7568';
const INDIGO = '#4A4E7A';
const INDIGO_SOFT = '#E7E7F0';
const STAMP_GREEN = '#3F6B4B';
const STAMP_BLUE = '#3A5A73';
const STAMP_RED = '#A6423B';

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

const STAMP_META: Record<PaymentStatus, { color: string; rotate: string }> = {
  Paid: { color: STAMP_GREEN, rotate: '-6deg' },
  Partial: { color: STAMP_BLUE, rotate: '-3deg' },
  'Balance due': { color: STAMP_RED, rotate: '4deg' },
};

const peso = (value: number) => `₱${value.toLocaleString()}`;

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,600;1,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
@keyframes ticketIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
.ticket-in { opacity: 0; animation: ticketIn 0.45s cubic-bezier(0.22,1,0.36,1) forwards; }
`;

function MonoLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`text-[10px] tracking-[0.22em] uppercase ${className}`} style={{ fontFamily: "'IBM Plex Mono', monospace", color: MUTED }}>{children}</span>;
}

/* Signature element: a row of punched dots standing in for the
   perforation between a receipt and its spool. */
function Perforation() {
  return (
    <div className="flex gap-[7px] px-6 sm:px-8 py-0 -mb-px" aria-hidden="true">
      {Array.from({ length: 40 }).map((_, i) => (
        <span key={i} className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: PAGE }} />
      ))}
    </div>
  );
}

/* Rotated ink stamp, standing in for the soft status pill. */
function StatusStamp({ status }: { status: PaymentStatus }) {
  const meta = STAMP_META[status];
  return (
    <span
      className="inline-block border-2 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
      style={{ color: meta.color, borderColor: meta.color, transform: `rotate(${meta.rotate})` }}
    >
      {status}
    </span>
  );
}

export function AdminPaymentsView() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'All' | PaymentStatus>('All');
  const [selected, setSelected] = useState<Payment | null>(null);
  const payments = useMemo(() => PAYMENTS.filter((payment) => `${payment.receipt} ${payment.customer} ${payment.job} ${payment.garment}`.toLowerCase().includes(query.toLowerCase()) && (filter === 'All' || payment.status === filter)), [query, filter]);
  const collected = PAYMENTS.reduce((sum, payment) => sum + payment.amount, 0);
  const outstanding = PAYMENTS.reduce((sum, payment) => sum + payment.balance, 0);

  return (
    <div className="space-y-7" style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: INK }}>
      <style>{FONT_IMPORT}</style>

      <div className="ticket-in">
        <MonoLabel>Cash & transaction records</MonoLabel>
        <h1 className="mt-1 text-2xl sm:text-3xl italic" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: INK }}>Payments</h1>
        <p className="mt-2 text-sm" style={{ color: MUTED }}>Review deposits, final payments, balances, and receipt records.</p>
      </div>

      <div className="ticket-in grid gap-4 sm:grid-cols-3" style={{ animationDelay: '0.06s' }}>
        <Metric icon={<Banknote />} label="Collected this period" value={peso(collected)} />
        <Metric icon={<CreditCard />} label="Outstanding balance" value={peso(outstanding)} tone="danger" />
        <Metric icon={<ReceiptText />} label="Transactions" value={PAYMENTS.length} />
      </div>

      <section className="ticket-in border shadow-[0_1px_3px_rgba(38,36,51,0.06)]" style={{ animationDelay: '0.12s', borderColor: LINE, background: PAPER }}>
        <Perforation />
        <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: LINE }}>
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: MUTED }} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search receipt, job card, or customer" className="w-full border py-2.5 pl-10 pr-3 text-sm outline-none transition-colors" style={{ borderColor: LINE, background: PAGE, color: INK }} onFocus={(e) => { e.currentTarget.style.borderColor = INDIGO; }} onBlur={(e) => { e.currentTarget.style.borderColor = LINE; }} />
          </div>
          <div className="flex flex-wrap gap-2">
            {(['All', 'Paid', 'Partial', 'Balance due'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className="border px-3 py-2 text-[10px] font-medium uppercase tracking-[0.12em] transition-colors"
                style={filter === status ? { borderColor: INDIGO, background: INDIGO_SOFT, color: INDIGO } : { borderColor: LINE, color: MUTED }}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="hidden grid-cols-[0.85fr_1.2fr_1.1fr_1fr_0.8fr_0.9fr_24px] gap-4 border-b px-6 py-3 md:grid" style={{ borderColor: LINE, background: PAGE }}>
          {['Receipt', 'Customer', 'Job card', 'Payment type', 'Amount', 'Status', ''].map((label) => (
            <span key={label} className="text-[10px] uppercase tracking-[0.16em]" style={{ color: MUTED }}>{label}</span>
          ))}
        </div>

        {payments.map((payment) => (
          <button
            key={payment.receipt}
            onClick={() => setSelected(payment)}
            className="grid w-full grid-cols-1 gap-2 border-b px-6 py-4 text-left transition-colors md:grid-cols-[0.85fr_1.2fr_1.1fr_1fr_0.8fr_0.9fr_24px] md:items-center md:gap-4"
            style={{ borderColor: LINE }}
            onMouseEnter={(e) => { e.currentTarget.style.background = INDIGO_SOFT; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span className="text-[12px]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: INDIGO }}>{payment.receipt}</span>
            <div>
              <div className="font-medium" style={{ color: INK }}>{payment.customer}</div>
              <div className="mt-1 text-xs" style={{ color: MUTED }}>{payment.garment}</div>
            </div>
            <span className="text-sm" style={{ color: INK }}>{payment.job}</span>
            <span className="text-sm" style={{ color: INK }}>{payment.type}</span>
            <span className="text-sm text-right md:text-left" style={{ fontFamily: "'IBM Plex Mono', monospace", color: INK }}>{peso(payment.amount)}</span>
            <span><StatusStamp status={payment.status} /></span>
            <ChevronRight className="hidden h-4 w-4 md:block" style={{ color: INDIGO }} />
          </button>
        ))}

        {!payments.length && <div className="p-12 text-center text-sm" style={{ color: MUTED }}>No payment matches your search.</div>}
      </section>

      {selected && <PaymentDetails payment={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function Metric({ icon, label, value, tone = 'default' }: { icon: React.ReactNode; label: string; value: number | string; tone?: 'default' | 'danger' }) {
  return (
    <div className="border p-5" style={{ borderColor: LINE, background: PAPER }}>
      <div className="flex items-center justify-between">
        <div className="flex h-8 w-8 items-center justify-center [&>svg]:h-4 [&>svg]:w-4" style={tone === 'danger' ? { background: `${STAMP_RED}1A`, color: STAMP_RED } : { background: `${INDIGO}1A`, color: INDIGO }}>{icon}</div>
        <span className="text-2xl" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: INK }}>{value}</span>
      </div>
      <div className="mt-4 text-[10px] uppercase tracking-[0.16em]" style={{ color: MUTED }}>{label}</div>
    </div>
  );
}

function PaymentDetails({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button aria-label="Close receipt details" onClick={onClose} className="absolute inset-0 bg-[#171626]/50 backdrop-blur-sm" />
      <section className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto border shadow-2xl" style={{ borderColor: LINE, background: PAPER }}>
        <Perforation />
        <header className="flex items-start justify-between border-b px-6 py-6 sm:px-8" style={{ borderColor: LINE }}>
          <div>
            <MonoLabel>Payment receipt</MonoLabel>
            <h2 className="mt-1 text-3xl italic" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: INK }}>{payment.receipt}</h2>
            <p className="mt-1 text-sm" style={{ color: MUTED }}>{payment.date}</p>
          </div>
          <button onClick={onClose} className="p-2 transition-colors" style={{ color: MUTED }} onMouseEnter={(e) => { e.currentTarget.style.background = INDIGO_SOFT; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="space-y-7 p-6 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            {[['Customer', payment.customer], ['Job card', payment.job], ['Garment', payment.garment], ['Payment method', payment.method], ['Payment type', payment.type], ['Payment received', peso(payment.amount)], ['Remaining balance', peso(payment.balance)], ['Status', payment.status]].map(([label, value]) => (
              <div key={label} className="border p-4" style={{ borderColor: LINE, background: PAGE }}>
                <div className="text-[10px] uppercase tracking-[0.14em]" style={{ color: MUTED }}>{label}</div>
                <div className="mt-1 text-sm" style={{ color: INK }}>{value}</div>
              </div>
            ))}
          </div>
          <div className="border p-5" style={{ borderColor: LINE, background: INDIGO_SOFT }}>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" style={{ color: INDIGO }} />
              <span className="text-[10px] uppercase tracking-[0.15em]" style={{ color: MUTED }}>Transaction record</span>
            </div>
            <p className="mt-2 text-sm" style={{ color: INK }}>Payment was recorded on {payment.date} through {payment.method}.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AdminPaymentsView;