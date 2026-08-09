import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronRight, ClipboardList, MapPin, PackageCheck, Shirt } from 'lucide-react';
import {
  COLORS, FONT_IMPORT, PageHeader, StatCard, SearchField, Card, TableHeadRow, EmptyState,
  ModalShell, EyebrowLabel, Badge, shadowSm,
} from './Theme';

type Order = { id: string; customer: string; garment: string; fabric: string; stage: string; payment: 'Deposit paid' | 'Paid' | 'Balance due'; total: string; due: string; created: string; measurements: string; };

const ORDERS: Order[] = [
  { id: 'JC-3021', customer: 'Reyna Fuentes', garment: 'Barong Tagalog', fabric: 'Piña Jusi — Ivory', stage: 'First Fitting', payment: 'Deposit paid', total: '₱4,800', due: 'Aug 05', created: 'Jul 27, 2026', measurements: 'CUS-001 measurement profile' },
  { id: 'JC-3020', customer: 'Boyet Salcedo', garment: 'Two-piece Suit', fabric: 'Italian Wool — Charcoal', stage: 'Pattern Cutting', payment: 'Deposit paid', total: '₱12,500', due: 'Aug 09', created: 'Jul 26, 2026', measurements: 'CUS-002 measurement profile' },
  { id: 'JC-3019', customer: 'Consuelo Reyes', garment: "Women's Coat", fabric: 'Wool Blend — Camel', stage: 'Final Alterations', payment: 'Paid', total: '₱7,200', due: 'Aug 03', created: 'Jul 24, 2026', measurements: 'CUS-003 measurement profile' },
  { id: 'JC-3018', customer: 'Tomas Villareal', garment: 'School Uniform Set', fabric: 'Polyester — Navy', stage: 'Ready for Pickup', payment: 'Balance due', total: '₱2,150', due: 'Aug 02', created: 'Jul 23, 2026', measurements: 'CUS-004 measurement profile' },
  { id: 'JC-3017', customer: 'Marisol Chan', garment: 'Evening Gown', fabric: 'Silk Habotai — Wine', stage: 'Initial Assembly', payment: 'Deposit paid', total: '₱15,900', due: 'Aug 12', created: 'Jul 21, 2026', measurements: 'CUS-005 measurement profile' },
  { id: 'JC-3016', customer: 'Cesar de la Cruz', garment: 'Long-sleeve Polo', fabric: 'Cotton Poplin — White', stage: 'Completed', payment: 'Paid', total: '₱2,850', due: 'Jul 31', created: 'Jul 18, 2026', measurements: 'CUS-006 measurement profile' },
];

const STAGE_TONE: Record<string, 'info' | 'warning' | 'danger' | 'success' | 'neutral'> = {
  'Pattern Cutting': 'info',
  'Initial Assembly': 'warning',
  'First Fitting': 'warning',
  'Final Alterations': 'danger',
  Completed: 'success',
  'Ready for Pickup': 'neutral',
};

export function AdminOrdersView({ externalQuery = '' }: { externalQuery?: string }) {
  const [query, setQuery] = useState(externalQuery);
  const [filter, setFilter] = useState('All stages');
  const [selected, setSelected] = useState<Order | null>(null);
  useEffect(() => setQuery(externalQuery), [externalQuery]);
  const stages = ['All stages', ...Array.from(new Set(ORDERS.map((order) => order.stage)))];
  const orders = useMemo(() => ORDERS.filter((order) => `${order.id} ${order.customer} ${order.garment}`.toLowerCase().includes(query.toLowerCase()) && (filter === 'All stages' || order.stage === filter)), [query, filter]);
  const total = ORDERS.reduce((sum, order) => sum + Number(order.total.replace(/[^0-9]/g, '')), 0);

  return (
    <div className="space-y-7" style={{ color: COLORS.ink }}>
      <style>{FONT_IMPORT}</style>

      <PageHeader
        eyebrow="Job card register"
        title="Order Ledger"
        description="Every ticket on the workroom board — cut, stitched, fitted, and settled."
        action={
          <div className="border px-4 py-3" style={{ borderColor: COLORS.border, background: COLORS.surface, borderRadius: 10, boxShadow: shadowSm }}>
            <span className="mono text-xl font-semibold" style={{ color: COLORS.ink }}>₱{total.toLocaleString()}</span>
            <span className="ml-2 text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: COLORS.muted }}>on the books</span>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard delay={0.05} icon={<ClipboardList />} label="Open orders" value={5} tone="neutral" />
        <StatCard delay={0.09} icon={<CalendarDays />} label="Due this week" value={3} tone="warning" />
        <StatCard delay={0.13} icon={<PackageCheck />} label="Ready for pickup" value={1} tone="success" />
        <StatCard delay={0.17} icon={<Shirt />} label="Completed this month" value={12} tone="brass" />
      </div>

      <Card delay={0.2}>
        <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: COLORS.border }}>
          <SearchField value={query} onChange={setQuery} placeholder="Search ticket no., customer, or garment" />
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="border bg-white px-3 py-2.5 text-sm outline-none"
            style={{ borderColor: COLORS.border, color: COLORS.inkSoft, borderRadius: 8 }}
          >
            {stages.map((stage) => <option key={stage}>{stage}</option>)}
          </select>
        </div>

        <TableHeadRow gridCols="grid-cols-[0.8fr_1.2fr_1.2fr_1.15fr_0.9fr_0.75fr_24px]" columns={['Ticket #', 'Customer', 'Garment', 'Stage', 'Payment', 'Due', '']} />

        {orders.map((order) => (
          <button
            key={order.id}
            onClick={() => setSelected(order)}
            className="grid w-full grid-cols-1 items-center gap-2 border-b px-6 py-4 text-left transition-colors md:grid-cols-[0.8fr_1.2fr_1.2fr_1.15fr_0.9fr_0.75fr_24px] md:gap-4"
            style={{ borderColor: COLORS.border }}
            onMouseEnter={(e) => { e.currentTarget.style.background = COLORS.surfaceAlt; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span className="mono text-[12px]" style={{ color: COLORS.navy }}>{order.id}</span>
            <span className="font-medium" style={{ color: COLORS.ink }}>{order.customer}</span>
            <span className="text-sm" style={{ color: COLORS.inkSoft }}>{order.garment}</span>
            <span><Badge tone={STAGE_TONE[order.stage] ?? 'neutral'}>{order.stage}</Badge></span>
            <span className="text-sm font-medium" style={{ color: order.payment === 'Balance due' ? COLORS.danger : COLORS.success }}>{order.payment}</span>
            <span className="mono text-sm" style={{ color: COLORS.inkSoft }}>{order.due}</span>
            <ChevronRight className="hidden h-4 w-4 md:block" style={{ color: COLORS.faint }} />
          </button>
        ))}
        {!orders.length && <EmptyState message="No ticket matches your search." />}
      </Card>

      {selected && <OrderDetails order={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function OrderDetails({ order, onClose }: { order: Order; onClose: () => void }) {
  const steps = ['Measuring', 'Pattern Cutting', 'Initial Assembly', 'First Fitting', 'Final Alterations', 'Completed', 'Ready for Pickup'];
  const active = steps.indexOf(order.stage);
  const progressPct = (active / (steps.length - 1)) * 100;

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-3xl">
      <header className="flex items-start justify-between border-b px-7 py-6 sm:px-8" style={{ borderColor: COLORS.border }}>
        <div>
          <EyebrowLabel>Job card</EyebrowLabel>
          <h2 className="mt-1.5 text-2xl font-semibold" style={{ color: COLORS.ink }}>{order.id}</h2>
          <p className="mt-1 text-sm" style={{ color: COLORS.muted }}>{order.customer} · {order.garment}</p>
        </div>
        <button onClick={onClose} className="p-2" style={{ color: COLORS.muted, borderRadius: 8 }}><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
      </header>

      <div className="space-y-9 p-7 sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          {[['Customer', order.customer], ['Garment', order.garment], ['Fabric', order.fabric], ['Measurement profile', order.measurements], ['Created', order.created], ['Due date', order.due], ['Total', order.total], ['Payment', order.payment]].map(([label, value]) => (
            <div key={label} className="border p-4" style={{ borderColor: COLORS.border, background: COLORS.surfaceAlt, borderRadius: 8 }}>
              <div className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: COLORS.muted }}>{label}</div>
              <div className="mt-1 text-sm" style={{ color: COLORS.ink }}>{value}</div>
            </div>
          ))}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" style={{ color: COLORS.brassDeep }} />
            <h3 className="text-[15px] font-semibold" style={{ color: COLORS.ink }}>Production progress</h3>
          </div>

          <div className="relative mt-9 px-1 pb-6">
            <MapPin className="absolute -top-4 h-4 w-4 -translate-x-1/2" style={{ left: `${progressPct}%`, color: COLORS.brass, fill: COLORS.brass }} />
            <div className="absolute left-0 right-0 top-3 h-[3px]" style={{ background: COLORS.border, borderRadius: 4 }} />
            <div className="absolute left-0 top-3 h-[3px] transition-all" style={{ width: `${progressPct}%`, background: COLORS.navy, borderRadius: 4 }} />
            <div className="relative flex justify-between">
              {steps.map((step, index) => (
                <div key={step} className="flex flex-col items-center text-center" style={{ width: `${100 / steps.length}%` }}>
                  <div className="h-3 w-[2px]" style={{ background: index <= active ? COLORS.navy : COLORS.border }} />
                  <span className="mt-2 text-[10px]" style={{ color: index <= active ? COLORS.ink : COLORS.faint }}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

export default AdminOrdersView;
