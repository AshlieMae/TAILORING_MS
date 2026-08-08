import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronRight, ClipboardList, MapPin, PackageCheck, Search, Shirt, X } from 'lucide-react';

type Order = { id: string; customer: string; garment: string; fabric: string; stage: string; payment: 'Deposit paid' | 'Paid' | 'Balance due'; total: string; due: string; created: string; measurements: string; };

const ORDERS: Order[] = [
  { id: 'JC-3021', customer: 'Reyna Fuentes', garment: 'Barong Tagalog', fabric: 'Piña Jusi — Ivory', stage: 'First Fitting', payment: 'Deposit paid', total: '₱4,800', due: 'Aug 05', created: 'Jul 27, 2026', measurements: 'CUS-001 measurement profile' },
  { id: 'JC-3020', customer: 'Boyet Salcedo', garment: 'Two-piece Suit', fabric: 'Italian Wool — Charcoal', stage: 'Pattern Cutting', payment: 'Deposit paid', total: '₱12,500', due: 'Aug 09', created: 'Jul 26, 2026', measurements: 'CUS-002 measurement profile' },
  { id: 'JC-3019', customer: 'Consuelo Reyes', garment: "Women's Coat", fabric: 'Wool Blend — Camel', stage: 'Final Alterations', payment: 'Paid', total: '₱7,200', due: 'Aug 03', created: 'Jul 24, 2026', measurements: 'CUS-003 measurement profile' },
  { id: 'JC-3018', customer: 'Tomas Villareal', garment: 'School Uniform Set', fabric: 'Polyester — Navy', stage: 'Ready for Pickup', payment: 'Balance due', total: '₱2,150', due: 'Aug 02', created: 'Jul 23, 2026', measurements: 'CUS-004 measurement profile' },
  { id: 'JC-3017', customer: 'Marisol Chan', garment: 'Evening Gown', fabric: 'Silk Habotai — Wine', stage: 'Initial Assembly', payment: 'Deposit paid', total: '₱15,900', due: 'Aug 12', created: 'Jul 21, 2026', measurements: 'CUS-005 measurement profile' },
  { id: 'JC-3016', customer: 'Cesar de la Cruz', garment: 'Long-sleeve Polo', fabric: 'Cotton Poplin — White', stage: 'Completed', payment: 'Paid', total: '₱2,850', due: 'Jul 31', created: 'Jul 18, 2026', measurements: 'CUS-006 measurement profile' },
];

// Thread colors per production stage — each reads like a spool tag rather than a status pill.
const stageClasses: Record<string, string> = {
  'Pattern Cutting': 'bg-[#E7EAF2] text-[#3A4372] border-[#C2C9E0]',
  'Initial Assembly': 'bg-[#F5ECD8] text-[#8A6A1F] border-[#E3CFA0]',
  'First Fitting': 'bg-[#F7E6DE] text-[#9C4A2B] border-[#E8C3AE]',
  'Final Alterations': 'bg-[#F7E1DE] text-[#9B3A31] border-[#E8BEB8]',
  Completed: 'bg-[#E4EEE2] text-[#3F6B3F] border-[#BFD8BC]',
  'Ready for Pickup': 'bg-[#E1EEEC] text-[#2C6E68] border-[#B7D9D3]',
};

const INK = '#2A2620';
const PAPER = '#FBF7EA';
const LINE = '#D8CBA9';
const MUTED = '#7A6F58';
const THREAD = '#B33F35';

const dotPaper: React.CSSProperties = {
  backgroundImage: 'radial-gradient(#D8CBA9 0.7px, transparent 0.7px)',
  backgroundSize: '14px 14px',
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
    <div className="space-y-7 p-1" style={{ ...dotPaper, color: INK }}>
      <div className="dash-in flex flex-col gap-4 border-b border-dashed pb-6 sm:flex-row sm:items-end sm:justify-between" style={{ borderColor: LINE }}>
        <div>
          <span className="text-[10px] uppercase tracking-[0.28em]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: MUTED }}>Job card register</span>
          <h1 className="mt-1 text-3xl sm:text-4xl italic" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: INK }}>Order Ledger</h1>
          <p className="mt-2 text-sm" style={{ color: MUTED }}>Every ticket on the workroom board — cut, stitched, fitted, and settled.</p>
        </div>
        <div className="border px-4 py-3" style={{ borderColor: LINE, background: PAPER }}>
          <span className="text-xl" style={{ fontFamily: "'IBM Plex Mono', monospace", color: INK }}>₱{total.toLocaleString()}</span>
          <span className="ml-2 text-[10px] uppercase tracking-[0.15em]" style={{ color: MUTED }}>on the books</span>
        </div>
      </div>

      <div className="dash-in grid grid-cols-2 gap-4 lg:grid-cols-4" style={{ animationDelay: '0.08s' }}>
        <Swatch icon={<ClipboardList />} label="Open orders" value={5} />
        <Swatch icon={<CalendarDays />} label="Due this week" value={3} />
        <Swatch icon={<PackageCheck />} label="Ready for pickup" value={1} />
        <Swatch icon={<Shirt />} label="Completed this month" value={12} />
      </div>

      <section className="dash-in border shadow-[0_1px_3px_rgba(42,38,32,0.08)]" style={{ animationDelay: '0.14s', borderColor: LINE, background: PAPER }}>
        <div className="flex flex-col gap-4 border-b border-dashed p-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: LINE }}>
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: MUTED }} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search ticket no., customer, or garment"
              className="w-full border bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#B33F35]"
              style={{ borderColor: LINE, fontFamily: "'IBM Plex Mono', monospace" }}
            />
          </div>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="border bg-white px-3 py-2.5 text-sm outline-none focus:border-[#B33F35]"
            style={{ borderColor: LINE, color: '#3D4F55' }}
          >
            {stages.map((stage) => <option key={stage}>{stage}</option>)}
          </select>
        </div>

        <div className="hidden grid-cols-[0.8fr_1.2fr_1.2fr_1.15fr_0.9fr_0.75fr_24px] gap-4 border-b border-dashed px-6 py-3 md:grid" style={{ borderColor: LINE }}>
          {['Ticket #', 'Customer', 'Garment', 'Stage', 'Payment', 'Due', ''].map((label) => (
            <span key={label} className="text-[10px] uppercase tracking-[0.18em]" style={{ color: MUTED }}>{label}</span>
          ))}
        </div>

        {orders.map((order) => (
          <button
            key={order.id}
            onClick={() => setSelected(order)}
            className="grid w-full grid-cols-1 items-center gap-2 border-b border-dashed px-6 py-4 text-left transition-colors hover:bg-[#F3EDDC] md:grid-cols-[0.8fr_1.2fr_1.2fr_1.15fr_0.9fr_0.75fr_24px] md:gap-4"
            style={{ borderColor: LINE }}
          >
            <span className="flex items-center gap-2 text-[12px]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#3A4372' }}>
              <span className="h-1.5 w-1.5 rounded-full border" style={{ borderColor: MUTED }} />
              {order.id}
            </span>
            <span className="font-medium" style={{ color: INK }}>{order.customer}</span>
            <span className="text-sm" style={{ color: '#3D4F55' }}>{order.garment}</span>
            <span><StageTag stage={order.stage} /></span>
            <span className="text-sm" style={{ color: order.payment === 'Balance due' ? '#9B3A31' : '#3F6B3F' }}>{order.payment}</span>
            <span className="text-sm" style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#3D4F55' }}>{order.due}</span>
            <ChevronRight className="hidden h-4 w-4 md:block" style={{ color: THREAD }} />
          </button>
        ))}
        {!orders.length && <div className="p-12 text-center text-sm" style={{ color: MUTED }}>No ticket matches your search.</div>}
      </section>

      {selected && <OrderDetails order={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function StageTag({ stage }: { stage: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 border px-2 py-1 text-[10px] uppercase tracking-[0.08em] ${stageClasses[stage]}`}>
      <span className="h-1.5 w-1.5 rounded-full border border-current" />
      {stage}
    </span>
  );
}

function Swatch({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="border p-5" style={{ borderColor: LINE, background: PAPER }}>
      <div className="flex items-center justify-between" style={{ color: '#3A4372' }}>
        <div className="flex h-8 w-8 items-center justify-center border" style={{ borderColor: LINE, background: '#F3EDDC' }}>
          <div className="[&>svg]:h-4 [&>svg]:w-4">{icon}</div>
        </div>
        <span className="text-2xl" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: INK }}>{value}</span>
      </div>
      <div className="mt-4 text-[10px] uppercase tracking-[0.18em]" style={{ color: MUTED }}>{label}</div>
    </div>
  );
}

function OrderDetails({ order, onClose }: { order: Order; onClose: () => void }) {
  const steps = ['Measuring', 'Pattern Cutting', 'Initial Assembly', 'First Fitting', 'Final Alterations', 'Completed', 'Ready for Pickup'];
  const active = steps.indexOf(order.stage);
  const progressPct = (active / (steps.length - 1)) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button aria-label="Close order details" onClick={onClose} className="absolute inset-0 bg-[#2A2620]/55 backdrop-blur-sm" />
      <section className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto border shadow-2xl" style={{ borderColor: LINE, background: PAPER }}>

        {/* punch hole + thread loop, like a garment swing tag */}
        <div className="absolute left-6 top-6 h-4 w-4 rounded-full border-2" style={{ borderColor: MUTED, background: '#F3EDDC' }} />

        <header className="flex items-start justify-between border-b border-dashed px-6 py-6 pl-14 sm:px-8 sm:pl-16" style={{ borderColor: LINE }}>
          <div>
            <span className="text-[10px] uppercase tracking-[0.28em]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: MUTED }}>Swing tag</span>
            <h2 className="mt-1 text-3xl italic" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: INK }}>{order.id}</h2>
            <p className="mt-1 text-sm" style={{ color: MUTED }}>{order.customer} · {order.garment}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#F3EDDC]" style={{ color: MUTED }}>
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-9 p-6 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            {[['Customer', order.customer], ['Garment', order.garment], ['Fabric', order.fabric], ['Measurement profile', order.measurements], ['Created', order.created], ['Due date', order.due], ['Total', order.total], ['Payment', order.payment]].map(([label, value]) => (
              <div key={label} className="border border-dashed bg-white p-4" style={{ borderColor: LINE }}>
                <div className="text-[10px] uppercase tracking-[0.16em]" style={{ color: MUTED }}>{label}</div>
                <div className="mt-1 text-sm" style={{ color: INK }}>{value}</div>
              </div>
            ))}
          </div>

          <div>
            <h3 className="text-lg italic" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: INK }}>Measured in progress</h3>

            {/* signature: production stage read like a tape measure, pin marking where the work stands */}
            <div className="relative mt-9 px-1 pb-8">
              <MapPin
                className="absolute -top-4 h-4 w-4 -translate-x-1/2"
                style={{ left: `${progressPct}%`, color: THREAD, fill: THREAD }}
              />
              <div className="absolute left-0 right-0 top-3 h-[2px]" style={{ background: LINE }} />
              <div className="absolute left-0 top-3 h-[2px] transition-all" style={{ width: `${progressPct}%`, background: THREAD }} />
              <div className="relative flex justify-between">
                {steps.map((step, index) => (
                  <div key={step} className="flex flex-col items-center text-center" style={{ width: `${100 / steps.length}%` }}>
                    <div className="h-3 w-[2px]" style={{ background: index <= active ? THREAD : LINE }} />
                    <span className="mt-2 text-[9px]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: MUTED }}>{String(index + 1).padStart(2, '0')}″</span>
                    <span className="mt-1 text-[10px] leading-tight" style={{ color: index <= active ? INK : MUTED }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AdminOrdersView;