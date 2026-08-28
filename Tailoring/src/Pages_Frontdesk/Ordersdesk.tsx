// Pages_Frontdesk/Ordersdesk.tsx
import { useMemo, useState, useEffect, useCallback } from 'react';
import { Check, ChevronRight, Search, TrendingUp, X, Loader2 } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import frontDeskApi, { type Order } from '../../services/frontDeskApi';
import { Scissors } from 'lucide-react';

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] uppercase tracking-[0.2em] text-[#8C7E74]" style={{ fontFamily: "'Space Mono', monospace" }}>{children}</span>;
}

function Metric({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'good' | 'warn' }) {
  const toneClasses = tone === 'good' ? 'text-[#4E7357]' : tone === 'warn' ? 'text-[#9E5B4B]' : 'text-[#2A211D]';
  return <div className="dash-card rounded-xl p-5"><div className={`text-2xl ${toneClasses}`} style={{ fontFamily: "'DM Serif Display', serif" }}>{value}</div><Label>{label}</Label></div>;
}

const stageStyle: Record<string, string> = {
  Measuring: 'border-[#D9C8B7] bg-[#F8F3EB] text-[#766A62]',
  'Pattern Cutting': 'border-[#C7DDD3] bg-[#EDF5F0] text-[#4E7357]',
  'Initial Assembly': 'border-[#C7DDD3] bg-[#EDF5F0] text-[#4E7357]',
  'Ready for First Fitting': 'border-[#ECD8A7] bg-[#FFF7E3] text-[#8A6618]',
  'Final Alterations': 'border-[#E6C8C2] bg-[#FDF0ED] text-[#9E5B4B]',
  Completed: 'border-[#B9DDD0] bg-[#E7F4EE] text-[#277257]',
  'Ready for Pickup': 'border-[#B9DDD0] bg-[#E7F4EE] text-[#277257]',
  Released: 'border-[#B9DDD0] bg-[#E7F4EE] text-[#277257]',
};

const STAGE_ORDER = ['Measuring', 'Pattern Cutting', 'Initial Assembly', 'Ready for First Fitting', 'Final Alterations', 'Completed', 'Ready for Pickup', 'Released'];
const STAGE_CHART_COLORS: Record<string, string> = {
  Measuring: '#C9BBA6',
  'Pattern Cutting': '#8FAF9E',
  'Initial Assembly': '#8FAF9E',
  'Ready for First Fitting': '#C9A15C',
  'Final Alterations': '#A8644A',
  Completed: '#6E8F72',
  'Ready for Pickup': '#6E8F72',
  Released: '#6E8F72',
};

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#E2D7C7] bg-[#FFFCF8] px-3 py-2 shadow-lg">
      <div className="text-[10px] uppercase tracking-[0.14em] text-[#8C7E74]" style={{ fontFamily: "'Space Mono', monospace" }}>{label}</div>
      <div className="text-[13px] font-semibold text-[#2A211D] mt-0.5">{payload[0].value} job card{payload[0].value === 1 ? '' : 's'}</div>
    </div>
  );
}

const peso = (amount: number) => `₱${Number(amount || 0).toLocaleString()}`;

function OrderDetails({ order, onClose, onHandoff }: { order: Order; onClose: () => void; onHandoff?: () => void }) {
  const [barsIn, setBarsIn] = useState(false);
  const [handoffLoading, setHandoffLoading] = useState(false);
  const [handoffError, setHandoffError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setBarsIn(true), 200);
    return () => clearTimeout(t);
  }, [order.order_id]);

  const total = Number(order.total_amount) || 0;
  const paid = Number(order.deposit_paid) || 0;
  const balance = Number(order.remaining_balance) || 0;
  const paidPct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  const stageIdx = STAGE_ORDER.indexOf(order.production_status);

  const donutData = [
    { name: 'Paid', value: paid || 0.0001, color: '#4E7357' },
    { name: 'Balance', value: balance || 0.0001, color: '#ECD8A7' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <style>{`@keyframes jdFade{from{opacity:0}to{opacity:1}}@keyframes jdPop{from{opacity:0;transform:translateY(16px) scale(.96)}to{opacity:1;transform:none}}.jd-fade{animation:jdFade .22s ease-out both}.jd-pop{animation:jdPop .42s cubic-bezier(.22,1,.36,1) both}`}</style>
      <button onClick={onClose} className="jd-fade absolute inset-0 bg-[#1F1916]/45 backdrop-blur-sm" />
      <section className="jd-pop relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-xl border border-[#E2D7C7] bg-[#FFFCF8] shadow-2xl">
        {/* Header */}
        <header className="flex items-start justify-between gap-3 border-b border-[#E8DFD3] p-6">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#A46B48] to-[#8C6F3E] text-lg font-semibold text-white shadow-md">
              {order.customer_name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
            </span>
            <div>
              <Label>Job card details</Label>
              <h2 className="mt-1 text-3xl text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>{order.job_card_id}</h2>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#8C7E74]">
                <span>{order.customer_name} · {order.garment_type}</span>
                <span className={`inline-block rounded-md border px-2 py-0.5 text-[9px] uppercase tracking-[0.08em] ${stageStyle[order.production_status] || 'border-[#D9C8B7] bg-[#F8F3EB] text-[#766A62]'}`}>{order.production_status}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#766A62]"><X className="h-5 w-5" /></button>
        </header>

        <div className="p-6">
          {/* Reference photo preference */}
          {order.reference_image && (
            <div className="mb-5">
              <Label>Reference photo</Label>
              <img src={order.reference_image} alt="Garment style reference" className="mt-2 max-h-56 w-full rounded-xl border border-[#E2D7C7] object-cover" />
            </div>
          )}

          {/* Production journey stepper */}
          <Label>Production journey</Label>
          <div className="relative mt-4 flex items-start justify-between">
            <div className="absolute left-3 right-3 top-[11px] h-[2px] bg-[#EFE7DB]" />
            <div
              className="absolute left-3 top-[11px] h-[2px] bg-[#8C6F3E] transition-all duration-700"
              style={{ width: `calc((100% - 24px) * ${Math.max(0, stageIdx) / (STAGE_ORDER.length - 1)})` }}
            />
            {STAGE_ORDER.map((stage, i) => {
              const done = i < stageIdx;
              const current = i === stageIdx;
              return (
                <div key={stage} className="relative z-10 flex w-[58px] flex-col items-center">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full border-2 shadow-sm ${done ? 'border-[#8C6F3E] bg-[#8C6F3E] text-white' : current ? 'border-[#8C6F3E] bg-white' : 'border-[#E2D7C7] bg-white'}`}>
                    {done ? <Check className="h-3 w-3" /> : current ? <span className="h-2 w-2 animate-pulse rounded-full bg-[#8C6F3E]" /> : <span className="h-1.5 w-1.5 rounded-full bg-[#D9CFC2]" />}
                  </span>
                  <span className={`mt-1.5 text-center text-[8.5px] leading-tight ${current ? 'font-semibold text-[#2A211D]' : done ? 'text-[#5E5048]' : 'text-[#A3958B]'}`}>{stage.replace('Ready for ', '')}</span>
                </div>
              );
            })}
          </div>

          {/* Payment progress donut + bar */}
          <div className="mt-6 grid items-center gap-4 rounded-xl border border-[#E2D7C7] bg-white p-4 sm:grid-cols-[auto_1fr]">
            <div className="relative mx-auto h-28 w-28 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={34} outerRadius={52} paddingAngle={3} stroke="none" animationDuration={900}>
                    {donutData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>{paidPct}%</span>
                <span className="text-[8.5px] uppercase tracking-[0.12em] text-[#A3958B]">Paid</span>
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between text-[11px]">
                <span className="font-medium uppercase tracking-[0.08em] text-[#5E5048]">Payment progress</span>
                <span className="text-[#2A211D]" style={{ fontFamily: "'Space Mono', monospace" }}>{peso(paid)} / {peso(total)}</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#EFE7DB]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#C9A15C] to-[#4E7357] transition-all duration-700 ease-out"
                  style={{ width: barsIn ? `${paidPct}%` : '0%' }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[11px]">
                <span className="font-medium text-[#4E7357]">Paid {peso(paid)}</span>
                <span className={`font-medium ${balance > 0 ? 'text-[#9E5B4B]' : 'text-[#4E7357]'}`}>{balance > 0 ? `Balance ${peso(balance)}` : 'Fully paid'}</span>
              </div>
            </div>
          </div>

          {/* Detail cards */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            {([
              ['Fabric', order.fabric || 'Not set'],
              ['Quantity', `${order.quantity} pcs`],
              ['Target completion', new Date(order.target_completion_date).toLocaleDateString()],
              ['Payment status', order.payment_status],
            ] as [string, string][]).map(([label, value], i) => (
              <div key={label} className="jd-pop rounded-lg border border-[#E2D7C7] bg-white p-3" style={{ animationDelay: `${120 + i * 60}ms` }}>
                <Label>{label}</Label>
                <div className="mt-1 text-sm text-[#2A211D]">{value}</div>
              </div>
                                    ))}
          </div>

          {/* Front Desk → Master Tailor handoff (single source of truth: the shared
              job card). The backend validates completeness + the deposit rule and
              notifies the assigned tailor; both roles then read the same record. */}
          {order.production_status !== 'Released' && order.production_status !== 'Ready for Pickup' && (
            <div className="mt-6 border-t border-[#E2D7C7] pt-5">
              {handoffError && (
                <div className="mb-3 rounded-lg border border-[#C86A58]/30 bg-[#FDF4F2] px-3 py-2.5 text-xs text-[#9A3B2A]">{handoffError}</div>
              )}
              <button
                type="button"
                disabled={handoffLoading}
                onClick={async () => {
                  setHandoffLoading(true);
                  setHandoffError(null);
                  try {
                    await frontDeskApi.sendToProduction(order.order_id, order.assigned_tailor_id || undefined);
                    onHandoff?.();
                    onClose();
                  } catch (err) {
                    setHandoffError(
                      err instanceof Error
                        ? err.message
                        : 'Unable to send this job card to production.'
                    );
                  } finally {
                    setHandoffLoading(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2D7C7] bg-[#2A211D] px-4 py-2.5 text-[10px] font-semibold tracking-[0.1em] uppercase text-white hover:bg-[#3D312B] transition-colors disabled:opacity-60"
              >
                <Scissors className="w-3.5 h-3.5" />
                {handoffLoading ? 'Sending…' : 'Send to Production'}
              </button>
                                                        <p className="mt-1.5 text-[11px] text-[#8C7E74]">Hand the job card to your Master Tailor. The system validates that the customer, measurements, garment, fabric, deadline, tailor, and deposit are all complete before moving the job into production.</p>
                        </div>
          )}
      </div>
      </section>
    </div>
  );
}

export function FrontDeskOrdersView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Order | null>(null);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    try {
      const data = await frontDeskApi.getAllOrders();
      setOrders(data);
    } catch (err) {
      console.error('Failed to load orders:', err);
      setNotice('Failed to load orders.');
      setTimeout(() => setNotice(''), 4000);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filtered = useMemo(() => {
    if (!query.trim()) return orders;
    const q = query.toLowerCase();
    return orders.filter((order) =>
      order.job_card_id.toLowerCase().includes(q) ||
      order.customer_name.toLowerCase().includes(q) ||
      order.garment_type.toLowerCase().includes(q) ||
      order.production_status.toLowerCase().includes(q)
    );
  }, [orders, query]);

  const stageChart = useMemo(() => 
    STAGE_ORDER.map((stage) => ({
      stage: stage.replace('Ready for ', ''),
      count: orders.filter((o) => o.production_status === stage).length,
    })),
    [orders]
  );

  const readyForPickup = orders.filter((o) => o.production_status === 'Ready for Pickup').length;
  const balanceDue = orders.filter((o) => o.remaining_balance > 0).length;
  const inProduction = orders.filter((o) => o.production_status !== 'Ready for Pickup' && o.production_status !== 'Released').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-[#8C6F3E]" />
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div className="dash-in flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Label>Custom orders</Label>
          <h1 className="mt-1 text-2xl sm:text-3xl text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>Orders</h1>
          <p className="mt-2 text-sm text-[#766A62]">Monitor job cards and production stages.</p>
        </div>
      </div>

      {notice && (
        <div className="dash-in rounded-lg border border-[#8B9E87]/40 bg-[#F1F5F0] px-4 py-3 text-sm text-[#4E7357] shadow-sm">
          {notice}
        </div>
      )}

      <div className="dash-in grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric label="Total job cards" value={orders.length} />
        <Metric label="Ready for pickup" value={readyForPickup} tone={readyForPickup ? 'good' : 'default'} />
        <Metric label="Balances due" value={balanceDue} tone={balanceDue ? 'warn' : 'default'} />
        <Metric label="In production" value={inProduction} />
      </div>

      <section className="dash-in dash-card rounded-xl p-6 sm:p-7">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div><Label>Workshop floor</Label><h2 className="text-xl font-normal mt-0.5 text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>Production pipeline</h2></div>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F0] border border-[#C7DDD3] px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] uppercase text-[#4E7357] flex-shrink-0">
            <TrendingUp className="w-3 h-3" /> {orders.length} active
          </span>
        </div>
        <p className="text-[12.5px] text-[#8C7E74] mb-5">Job cards grouped by their current production stage</p>
        <div className="h-44 -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stageChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#ECE3D8" strokeDasharray="3 4" />
              <XAxis dataKey="stage" tickLine={false} axisLine={false} tick={{ fill: '#A3958B', fontSize: 10, fontFamily: 'Space Mono, monospace' }} interval={0} />
              <YAxis hide allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F8F3EB' }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={44}>
                {stageChart.map((entry) => <Cell key={entry.stage} fill={STAGE_CHART_COLORS[entry.stage] || '#C9BBA6'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="dash-card overflow-hidden rounded-xl">
        <div className="flex flex-col gap-4 border-b border-[#E8DFD3] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A3958B]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search job card, customer, garment, or stage" className="w-full rounded-lg border border-[#E2D7C7] bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#A46B48]" />
          </div>
          <span className="text-xs text-[#8C7E74]">{filtered.length} order{filtered.length === 1 ? '' : 's'}</span>
        </div>

        <div className="hidden grid-cols-[0.75fr_1.1fr_1.1fr_1.15fr_0.85fr_0.75fr_24px] gap-4 border-b border-[#E8DFD3] bg-[#FCFAF7] px-6 py-3 md:grid">
          {['Job card', 'Customer', 'Garment', 'Production', 'Payment', 'Due', ''].map((label) => <Label key={label}>{label}</Label>)}
        </div>

        {filtered.map((order) => (
          <button key={order.order_id} onClick={() => setSelected(order)} className="grid w-full grid-cols-1 gap-2 border-b border-[#F0EAE2] px-6 py-4 text-left hover:bg-[#FCFAF7] md:grid-cols-[0.75fr_1.1fr_1.1fr_1.15fr_0.85fr_0.75fr_24px] md:items-center md:gap-4">
            <span className="text-[12px] text-[#8C6F3E]" style={{ fontFamily: "'Space Mono', monospace" }}>{order.job_card_id}</span>
            <span className="font-medium text-[#2A211D]">{order.customer_name}</span>
            <span className="text-sm text-[#5E5048]">{order.garment_type}</span>
            <span><span className={`inline-block rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.08em] ${stageStyle[order.production_status] || 'border-[#D9C8B7] bg-[#F8F3EB] text-[#766A62]'}`}>{order.production_status}</span></span>
            <span className={`text-sm ${order.remaining_balance > 0 ? 'text-[#9E5B4B]' : 'text-[#4E7357]'}`}>
              {order.remaining_balance > 0 ? `Balance: ₱${order.remaining_balance}` : 'Paid'}
            </span>
            <span className="text-sm text-[#5E5048]">{new Date(order.target_completion_date).toLocaleDateString()}</span>
            <ChevronRight className="hidden h-4 w-4 text-[#A46B48] md:block" />
          </button>
        ))}
        {!filtered.length && <p className="p-12 text-center text-sm text-[#766A62]">No order matches your search.</p>}
      </section>

            {selected && <OrderDetails order={selected} onClose={() => setSelected(null)} onHandoff={loadOrders} />}
    </div>
  );
}

export default FrontDeskOrdersView;