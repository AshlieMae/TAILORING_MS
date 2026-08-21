// @ts-nocheck
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Shirt, Ruler, CalendarClock, Wallet, Settings, Bell, Search,
  ChevronRight, Menu, X, PackageCheck, Download, LogOut, Sparkles, TrendingUp,
  Check, UserRound, Save, ArrowUpRight, ShoppingBag, Mail, Phone, MapPin, ShieldCheck, Pencil, Camera,
  Lock, Eye, EyeOff,
} from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, Legend, BarChart, Bar,
} from 'recharts';

/* ============================================================
   ASHLIE'S TAILOR — Private Client Portal
   Premium atelier direction: ink + warm paper + brass, serif
   display type, real data visualization, soft realistic
   elevation instead of flat/illustrative styling.
============================================================= */

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

:root {
  --ink: #14171F;
  --paper: #FAF8F3;
  --card: #FFFFFF;
  --brass: #A9824F;
  --brass-soft: #C9A876;
  --brass-wash: #F3ECE0;
  --line: #E7E1D3;
  --muted: #736B5E;
  --navy: #1D2A44;
  --success: #4B7856;
  --rust: #A0522D;
}

@keyframes riseIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.rise { opacity: 0; animation: riseIn 0.5s cubic-bezier(0.22,1,0.36,1) forwards; }

.atelier-card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 14px;
  box-shadow: 0 1px 2px rgba(20,23,31,0.04), 0 8px 24px -12px rgba(20,23,31,0.10);
}
.swatch {
  background-image:
    repeating-linear-gradient(45deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.10) 1px, transparent 1px, transparent 6px),
    linear-gradient(135deg, var(--swatch-a), var(--swatch-b));
  box-shadow: inset 0 0 0 1px rgba(20,23,31,0.08), inset 0 -8px 14px rgba(20,23,31,0.12);
}
.input-field {
  width: 100%; border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px;
  font-size: 13px; color: var(--ink); background: #fff; outline: none; transition: border-color .15s;
}
.input-field:focus { border-color: var(--brass); }
`;

/* ---------------- Type helpers ---------------- */
function Eyebrow({ children, className = '', tone = 'var(--muted)' }) {
  return (
    <span className={`text-[10px] tracking-[0.18em] uppercase ${className}`} style={{ fontFamily: "'IBM Plex Mono', monospace", color: tone }}>
      {children}
    </span>
  );
}
function Display({ children, className = '', as: Tag = 'h2', style = {} }) {
  return <Tag className={className} style={{ fontFamily: "'Fraunces', serif", fontOpticalSizing: 'auto', ...style }}>{children}</Tag>;
}
function StatusPill({ status }) {
  const map = {
    Confirmed: { bg: 'rgba(75,120,86,0.12)', fg: 'var(--success)' },
    Scheduled: { bg: 'rgba(29,42,68,0.08)', fg: 'var(--navy)' },
    Completed: { bg: 'rgba(75,120,86,0.12)', fg: 'var(--success)' },
    'In progress': { bg: 'var(--brass-wash)', fg: 'var(--brass)' },
    'Ready for pickup': { bg: 'rgba(160,82,45,0.10)', fg: 'var(--rust)' },
  };
  const s = map[status] || { bg: 'var(--brass-wash)', fg: 'var(--brass)' };
  return (
    <span className="px-2.5 py-1 rounded-full text-[10px] tracking-[0.08em] uppercase" style={{ background: s.bg, color: s.fg, fontFamily: "'IBM Plex Mono', monospace" }}>
      {status}
    </span>
  );
}

/* ---------------- Sample data ---------------- */
const CUSTOMER = { name: 'Reyna Fuentes', email: 'reyna.fuentes@email.com', memberSince: '2024', tier: 'Private Client' };
const STAGES = ['Measuring', 'Pattern Cutting', 'Assembly', 'First Fitting', 'Final Alterations', 'Completed', 'Pickup'];

const ORDERS = [
  { id: 'JC-3021', garment: 'Barong Tagalog', fabric: 'Piña-Seye, Ivory', swatchA: '#F4EFE3', swatchB: '#E4DAC0', stageIndex: 3, due: 'Aug 12, 2026', balance: 2400, total: 9600, status: 'In progress', notes: 'Client requested slightly looser cuffs at second fitting.' },
  { id: 'JC-3022', garment: 'Evening Gown', fabric: 'Silk Habotai, Wine', swatchA: '#5C1F2B', swatchB: '#3A0F18', stageIndex: 1, due: 'Aug 22, 2026', balance: 7950, total: 15900, status: 'In progress', notes: 'Awaiting fabric delivery confirmation from supplier.' },
  { id: 'JC-3018', garment: 'School Uniform Set', fabric: 'Cotton Twill, Navy', swatchA: '#2A3B5C', swatchB: '#16213A', stageIndex: 6, due: 'Aug 03, 2026', balance: 0, total: 3300, status: 'Ready for pickup', notes: 'Complete. Awaiting pickup at the atelier.' },
];

const MEASUREMENTS = [
  { label: 'Chest', value: 96, prev: 95, max: 130 },
  { label: 'Waist', value: 78, prev: 80, max: 120 },
  { label: 'Hip', value: 99, prev: 98, max: 130 },
  { label: 'Shoulder', value: 41, prev: 41, max: 55 },
  { label: 'Sleeve', value: 58, prev: 58, max: 70 },
  { label: 'Inseam', value: 76, prev: 76, max: 90 },
  { label: 'Neck', value: 36, prev: 36, max: 50 },
];
const MEASUREMENTS_UPDATED = 'Jul 12, 2026';

const MEASUREMENT_HISTORY = [
  { date: 'Jan', chest: 95, waist: 80, hip: 98 },
  { date: 'Apr', chest: 95, waist: 79, hip: 98 },
  { date: 'Jul', chest: 96, waist: 78, hip: 99 },
];

const SPEND_TREND = [
  { month: 'Mar', amount: 0, projected: false },
  { month: 'Apr', amount: 3200, projected: false },
  { month: 'May', amount: 1650, projected: false },
  { month: 'Jun', amount: 4050, projected: false },
  { month: 'Jul', amount: 2400, projected: false },
  { month: 'Aug', amount: 7950, projected: true },
];

const NOTIFICATIONS = [
  { time: 'Today, 3:30 PM', label: 'Fitting today', detail: 'JC-3021 — Barong Tagalog, first fitting', kind: 'fitting' },
  { time: 'Aug 03', label: 'Ready for pickup', detail: 'JC-3018 — School Uniform Set', kind: 'pickup' },
  { time: 'Aug 12', label: 'Balance due on release', detail: 'JC-3021 — ₱2,400 remaining', kind: 'reminder' },
];
const NOTIF_META = {
  fitting: { icon: CalendarClock, tone: 'var(--navy)' },
  pickup: { icon: PackageCheck, tone: 'var(--success)' },
  reminder: { icon: Bell, tone: 'var(--rust)' },
};

const PAYMENTS = [
  { id: 'RCPT-0192', job: 'JC-3021', label: 'Deposit, 50%', amount: 2400, date: 'Jul 12, 2026' },
  { id: 'RCPT-0188', job: 'JC-3018', label: 'Final balance', amount: 1650, date: 'Jul 02, 2026' },
  { id: 'RCPT-0181', job: 'JC-3018', label: 'Deposit, 50%', amount: 1650, date: 'Jun 20, 2026' },
  { id: 'RCPT-0174', job: 'JC-3022', label: 'Initial payment', amount: 7950, date: 'Jun 04, 2026' },
];

const APPOINTMENTS = [
  { id: 'APT-106', day: '12', month: 'AUG', date: 'Aug 12, 2026', time: '3:30 PM', type: 'First Fitting', job: 'JC-3021', status: 'Confirmed' },
  { id: 'APT-112', day: '22', month: 'AUG', date: 'Aug 22, 2026', time: '10:00 AM', type: 'Final Fitting', job: 'JC-3022', status: 'Scheduled' },
  { id: 'APT-119', day: '02', month: 'SEP', date: 'Sep 02, 2026', time: '1:00 PM', type: 'Pickup', job: 'JC-3018', status: 'Scheduled' },
];

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'catalog', label: 'Browse Garments', icon: ShoppingBag },
  { key: 'orders', label: 'My Orders', icon: Shirt },
  { key: 'measurements', label: 'Measurements', icon: Ruler },
  { key: 'appointments', label: 'Appointments', icon: CalendarClock },
  { key: 'payments', label: 'Payments', icon: Wallet },
  { key: 'settings', label: 'Settings', icon: Settings },
];

const formatPeso = (n) => `₱${n.toLocaleString('en-PH')}`;
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function sessionUser() {
  const stored = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
  try { return stored ? JSON.parse(stored) : null; } catch { return null; }
}

function authToken() {
  return localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';
}

/* ---------------- Chart tooltips ---------------- */
function DarkTooltip({ eyebrow, value, sub }) {
  return (
    <div className="px-3 py-2 rounded-md shadow-lg" style={{ background: 'var(--ink)', fontFamily: "'IBM Plex Mono', monospace" }}>
      <div className="text-[9px] tracking-[0.16em] uppercase" style={{ color: 'var(--brass-soft)' }}>{eyebrow}</div>
      <div className="text-sm font-semibold text-white mt-0.5">{value}</div>
      {sub && <div className="text-[9px] mt-0.5" style={{ color: 'var(--brass-soft)' }}>{sub}</div>}
    </div>
  );
}
function MeasurementTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return <DarkTooltip eyebrow={p.subject} value={`${p.cm} cm`} />;
}
function SpendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return <DarkTooltip eyebrow={`${label} 2026`} value={formatPeso(p.amount)} sub={p.projected ? 'Balance due on release' : undefined} />;
}
function HistoryTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-md shadow-lg" style={{ background: 'var(--ink)', fontFamily: "'IBM Plex Mono', monospace" }}>
      <div className="text-[9px] tracking-[0.16em] uppercase mb-1" style={{ color: 'var(--brass-soft)' }}>{label} 2026</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="text-[12px] text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          {entry.dataKey}: {entry.value} cm
        </div>
      ))}
    </div>
  );
}
function BarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return <DarkTooltip eyebrow={label} value={formatPeso(payload[0].value)} />;
}

function Kpi({ icon: Icon, tone, label, value, sub, delay = '0s' }) {
  return (
    <div className="rise atelier-card p-6 flex items-start justify-between" style={{ animationDelay: delay }}>
      <div>
        <Eyebrow>{label}</Eyebrow>
        <Display as="div" className="text-[26px] mt-1.5" style={{ color: 'var(--ink)', fontWeight: 600 }}>{value}</Display>
        <p className="text-[12px] mt-1" style={{ color: 'var(--muted)', fontFamily: "'Inter', sans-serif" }}>{sub}</p>
      </div>
      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${tone}14`, color: tone }}>
        <Icon className="w-5 h-5" strokeWidth={1.6} />
      </div>
    </div>
  );
}

function PageHeader({ eyebrow, title, sub, icon: Icon }) {
  return (
    <div className="rise atelier-card p-7 flex items-start justify-between gap-4 flex-wrap">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <Display as="h1" className="text-[28px] mt-1" style={{ color: 'var(--ink)', fontWeight: 600 }}>{title}</Display>
        {sub && <p className="text-[13px] mt-2" style={{ color: 'var(--muted)', fontFamily: "'Inter', sans-serif" }}>{sub}</p>}
      </div>
      {Icon && (
        <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--brass-wash)', color: 'var(--brass)' }}>
          <Icon className="w-6 h-6" strokeWidth={1.5} />
        </div>
      )}
    </div>
  );
}

/* ============================================================
   DASHBOARD VIEW
============================================================= */
function DashboardView({ onBrowseGarments, catalog }) {
  const [selected, setSelected] = useState(ORDERS[0].id);
  const activeOrders = ORDERS.filter((o) => o.status === 'In progress');
  const order = ORDERS.find((o) => o.id === selected) ?? ORDERS[0];
  const radarData = MEASUREMENTS.map((m) => ({ subject: m.label, value: Math.round((m.value / m.max) * 100), cm: m.value }));
  const lifetime = PAYMENTS.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-7">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Kpi icon={Shirt} tone="var(--navy)" label="Active orders" value={String(activeOrders.length)} sub="Currently in production" delay="0s" />
        <Kpi icon={TrendingUp} tone="var(--brass)" label="Lifetime investment" value={formatPeso(lifetime)} sub="Since 2024" delay="0.06s" />
        <Kpi icon={CalendarClock} tone="var(--success)" label="Next appointment" value="Aug 12" sub="First fitting · 3:30 PM" delay="0.12s" />
      </div>

      <section className="rise atelier-card overflow-hidden" style={{ animationDelay: '0.15s' }}>
        <div className="flex items-start justify-between gap-4 p-6 sm:p-7">
          <div>
            <Eyebrow>Atelier collection</Eyebrow>
            <Display as="h2" className="mt-1 text-[24px]" style={{ color: 'var(--ink)', fontWeight: 600 }}>Available garments</Display>
            <p className="mt-1 text-[13px]" style={{ color: 'var(--muted)' }}>Start a custom order with a style that fits your occasion.</p>
          </div>
          <button onClick={onBrowseGarments} className="inline-flex shrink-0 items-center gap-2 rounded-md px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white" style={{ background: 'var(--navy)' }}><ShoppingBag className="h-4 w-4" /> Browse all</button>
        </div>
        <div className="grid grid-cols-2 border-t sm:grid-cols-4" style={{ borderColor: 'var(--line)' }}>
          {catalog.map((garment) => <button key={garment.name} onClick={onBrowseGarments} className="p-4 text-left transition-colors hover:bg-[#FCFAF6]" style={{ borderRight: '1px solid var(--line)' }}><img src={garment.image} alt={garment.name} className="h-28 w-full rounded-md object-cover" loading="lazy" /><div className="mt-3 text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{garment.name}</div><div className="mt-1 text-[11px]" style={{ color: 'var(--brass)' }}>{garment.price}</div></button>)}
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_1fr] gap-6">
        <div className="rise atelier-card p-7" style={{ animationDelay: '0.18s' }}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <Eyebrow>Order in progress</Eyebrow>
              <Display as="h2" className="text-[26px] mt-1" style={{ color: 'var(--ink)', fontWeight: 600 }}>{order.garment}</Display>
              <p className="text-[13px] mt-1" style={{ color: 'var(--muted)', fontFamily: "'Inter', sans-serif" }}>{order.fabric}</p>
            </div>
            {activeOrders.length > 1 && (
              <div className="flex items-center gap-1.5">
                {activeOrders.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setSelected(o.id)}
                    className="px-3 py-1.5 text-[10px] tracking-[0.12em] uppercase rounded-full transition-colors"
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      background: o.id === selected ? 'var(--ink)' : 'transparent',
                      color: o.id === selected ? '#fff' : 'var(--muted)',
                      border: `1px solid ${o.id === selected ? 'var(--ink)' : 'var(--line)'}`,
                    }}
                  >
                    {o.id}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 mt-6">
            <div className="swatch w-16 h-16 rounded-lg flex-shrink-0" style={{ '--swatch-a': order.swatchA, '--swatch-b': order.swatchB }} />
            <div className="flex-1 min-w-0">
              <Eyebrow>Fabric swatch on file</Eyebrow>
              <div className="text-[13px] mt-1" style={{ color: 'var(--ink)', fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>{order.fabric}</div>
            </div>
          </div>

          <div className="mt-8">
            <div className="flex justify-between items-center mb-3">
              <Eyebrow>Production stage</Eyebrow>
              <Eyebrow tone="var(--navy)">{STAGES[order.stageIndex]}</Eyebrow>
            </div>
            <Stepper stageIndex={order.stageIndex} />
          </div>

          <div className="mt-7 pt-6 flex flex-wrap gap-8" style={{ borderTop: '1px solid var(--line)' }}>
            <div>
              <Eyebrow>Estimated ready</Eyebrow>
              <Display as="div" className="text-lg mt-1" style={{ color: 'var(--ink)', fontWeight: 600 }}>{order.due}</Display>
            </div>
            <div>
              <Eyebrow>Balance on release</Eyebrow>
              <div className="text-lg mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--rust)', fontWeight: 600 }}>{formatPeso(order.balance)}</div>
            </div>
            <div>
              <Eyebrow>Order total</Eyebrow>
              <div className="text-lg mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--ink)', fontWeight: 600 }}>{formatPeso(order.total)}</div>
            </div>
          </div>
        </div>

        <div className="rise atelier-card p-7" style={{ animationDelay: '0.24s' }}>
          <div className="flex items-center justify-between mb-1">
            <Eyebrow>Fit profile</Eyebrow>
            <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--brass)' }} strokeWidth={1.6} />
          </div>
          <Display as="h2" className="text-lg" style={{ color: 'var(--ink)', fontWeight: 600 }}>Measurement chart</Display>
          <div className="h-[240px] mt-2 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="70%">
                <PolarGrid stroke="var(--line)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--muted)', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="value" stroke="var(--brass)" fill="var(--brass)" fillOpacity={0.22} strokeWidth={2} />
                <Tooltip content={<MeasurementTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] mt-1" style={{ color: 'var(--muted)', fontFamily: "'IBM Plex Mono', monospace" }}>LAST VERIFIED {MEASUREMENTS_UPDATED.toUpperCase()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_1fr] gap-6">
        <div className="rise atelier-card p-7" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between mb-1">
            <div>
              <Eyebrow>Account activity</Eyebrow>
              <Display as="h2" className="text-lg mt-1" style={{ color: 'var(--ink)', fontWeight: 600 }}>Investment over time</Display>
            </div>
            <div className="text-right">
              <Eyebrow>This year</Eyebrow>
              <div className="text-lg mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--ink)', fontWeight: 600 }}>{formatPeso(19250)}</div>
            </div>
          </div>
          <div className="h-[200px] mt-3 -ml-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={SPEND_TREND} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="brassFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brass)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--brass)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--line)" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }} />
                <YAxis tickLine={false} axisLine={false} width={44} tick={{ fill: 'var(--muted)', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }} tickFormatter={(v) => `₱${v / 1000}k`} />
                <Tooltip content={<SpendTooltip />} />
                <Area type="monotone" dataKey="amount" stroke="var(--brass)" strokeWidth={2} fill="url(#brassFill)" dot={{ r: 3, fill: 'var(--ink)', strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rise atelier-card p-7" style={{ animationDelay: '0.36s' }}>
          <Eyebrow>Stay ahead</Eyebrow>
          <Display as="h2" className="text-lg mt-1" style={{ color: 'var(--ink)', fontWeight: 600 }}>Notifications</Display>
          <div className="mt-5 space-y-4">
            {NOTIFICATIONS.map((n, i) => {
              const meta = NOTIF_META[n.kind];
              const Icon = meta.icon;
              return (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${meta.tone}14`, color: meta.tone }}>
                    <Icon className="w-4 h-4" strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[13px] font-medium" style={{ color: 'var(--ink)', fontFamily: "'Inter', sans-serif" }}>{n.label}</span>
                      <span className="text-[10px] flex-shrink-0" style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--muted)' }}>{n.time}</span>
                    </div>
                    <p className="text-[12.5px] mt-0.5" style={{ color: 'var(--muted)', fontFamily: "'Inter', sans-serif" }}>{n.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <PaymentLedger payments={PAYMENTS.slice(0, 3)} title="Payment history" showViewAll />
    </div>
  );
}

function Stepper({ stageIndex }) {
  return (
    <div>
      <div className="relative">
        <div className="h-[2px] rounded-full" style={{ background: 'var(--line)' }} />
        <div className="h-[2px] rounded-full absolute top-0 left-0 transition-all duration-700" style={{ background: 'var(--brass)', width: `${(stageIndex / (STAGES.length - 1)) * 100}%` }} />
        <div className="flex justify-between absolute -top-[5px] left-0 right-0">
          {STAGES.map((s, i) => {
            const done = i <= stageIndex;
            return <span key={s} className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: done ? 'var(--brass)' : '#fff', border: `2px solid ${done ? 'var(--brass)' : 'var(--line)'}` }} />;
          })}
        </div>
      </div>
      <div className="flex justify-between mt-4">
        {STAGES.map((s, i) => (
          <span key={s} className="text-center px-0.5" style={{ width: `${100 / STAGES.length}%`, fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: i === stageIndex ? 'var(--ink)' : i < stageIndex ? 'var(--brass)' : '#B7AF9E', fontWeight: i === stageIndex ? 600 : 400 }}>
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

function PaymentLedger({ payments, title, showViewAll }) {
  return (
    <div className="rise atelier-card overflow-hidden" style={{ animationDelay: '0.42s' }}>
      <div className="flex items-center justify-between px-7 py-6" style={{ borderBottom: '1px solid var(--line)' }}>
        <div>
          <Eyebrow>Cash record</Eyebrow>
          <Display as="h2" className="text-lg mt-1" style={{ color: 'var(--ink)', fontWeight: 600 }}>{title}</Display>
        </div>
        {showViewAll && (
          <span className="flex items-center gap-1 text-[11px] tracking-[0.1em] uppercase" style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--brass)' }}>
            View all <ChevronRight className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
      <div className="hidden md:grid grid-cols-[1fr_1fr_1.4fr_0.9fr_0.9fr_0.7fr] gap-4 px-7 py-2.5" style={{ borderBottom: '1px solid var(--line)', background: 'var(--brass-wash)' }}>
        {['Receipt', 'Job card', 'Description', 'Amount', 'Date', ''].map((h) => <Eyebrow key={h}>{h}</Eyebrow>)}
      </div>
      {payments.map((p, i) => (
        <div key={p.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1.4fr_0.9fr_0.9fr_0.7fr] gap-2 md:gap-4 px-7 py-4 items-center" style={{ borderBottom: i !== payments.length - 1 ? '1px solid var(--line)' : 'none' }}>
          <span className="text-[12px]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--muted)' }}>{p.id}</span>
          <span className="text-[13px] font-medium" style={{ color: 'var(--ink)', fontFamily: "'Inter', sans-serif" }}>{p.job}</span>
          <span className="text-[13px]" style={{ color: 'var(--muted)', fontFamily: "'Inter', sans-serif" }}>{p.label}</span>
          <span className="text-[13px] font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--ink)' }}>{formatPeso(p.amount)}</span>
          <span className="text-[12px]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--muted)' }}>{p.date}</span>
          <button className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em]" style={{ color: 'var(--muted)' }}>
            <Download className="w-3.5 h-3.5" strokeWidth={1.6} /> Receipt
          </button>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   GARMENT CATALOG VIEW
============================================================= */
const DEFAULT_CATALOG = [
  { name: 'Barong Tagalog', price: 'From ₱6,500', description: 'Hand-finished formal wear for weddings, ceremonies, and special occasions.', fabrics: ['Piña Jusi — Ivory', 'Cocoon Silk — Natural'], colors: ['#F5EEDF', '#D8C9A7'], image: 'https://ibarrafilipino.com/cdn/shop/files/Barong_Tagalog_JV402_02.png?v=1769481827&width=1200' },
  { name: 'Two-piece Suit', price: 'From ₱12,000', description: 'A tailored jacket and trousers, cut to your measurements.', fabrics: ['Italian Wool — Charcoal', 'Wool Blend — Navy'], colors: ['#393B42', '#1D2A44'], image: 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=1200' },
  { name: 'Filipiniana Dress', price: 'From ₱9,500', description: 'Custom occasion dress with a silhouette made for you.', fabrics: ['Silk Habotai — Wine', 'Satin — Blush'], colors: ['#6A2737', '#D9A6A6'], image: 'https://www.kulturafilipino.com/cdn/shop/files/Copyof_IMG8614_1800x1800.jpg?v=1722242874' },
  { name: 'School Uniform Set', price: 'From ₱2,800', description: 'Durable, comfortable uniforms tailored for everyday wear.', fabrics: ['Cotton Twill — Navy', 'Cotton Poplin — White'], colors: ['#233553', '#ECE9E0'], image: 'https://images.pexels.com/photos/5212345/pexels-photo-5212345.jpeg?auto=compress&cs=tinysrgb&w=1200' },
];

function getCatalog() {
  try { const saved = localStorage.getItem('garmentCatalog'); return saved ? JSON.parse(saved) : DEFAULT_CATALOG; } catch { return DEFAULT_CATALOG; }
}

function CatalogView({ catalog }) {
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState('');
  const item = catalog.find((garment) => garment.name === selected);

  const submitRequest = (event) => {
    event.preventDefault();
    setSelected(null);
    setNotice(`Your ${event.currentTarget.garment.value} request was sent for Front Desk review.`);
    window.setTimeout(() => setNotice(''), 4500);
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Atelier collection" title="Browse Garments" sub="Choose a style, share your preferences, and let our team prepare your custom order." icon={ShoppingBag} />
      {notice && <div className="rise flex items-center gap-2 rounded-lg px-5 py-4 text-sm" style={{ color: 'var(--success)', background: '#EEF6EF', border: '1px solid #CDE2D1' }}><Check className="h-4 w-4" />{notice}</div>}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {catalog.map((garment, index) => (
          <article key={garment.name} className="rise atelier-card overflow-hidden" style={{ animationDelay: `${index * 0.07}s` }}>
            <div className="relative h-52 overflow-hidden" style={{ background: `linear-gradient(135deg, ${garment.colors[0]}, ${garment.colors[1]})` }}>
              <img src={garment.image} alt={garment.name} className="h-full w-full object-cover" loading="lazy" />
              <span className="absolute left-5 top-5 inline-block rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'white', background: 'rgba(20,23,31,0.58)' }}>Custom made</span>
            </div>
            <div className="p-6">
              <div className="flex items-start justify-between gap-3"><h2 className="text-xl font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>{garment.name}</h2><span className="text-sm font-semibold whitespace-nowrap" style={{ color: 'var(--brass)' }}>{garment.price}</span></div>
              <p className="mt-3 text-[13px] leading-relaxed" style={{ color: 'var(--muted)' }}>{garment.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">{garment.fabrics.map((fabric) => <span key={fabric} className="rounded-full px-2.5 py-1 text-[10px]" style={{ color: 'var(--muted)', background: 'var(--paper)', border: '1px solid var(--line)' }}>{fabric}</span>)}</div>
              <button onClick={() => setSelected(garment.name)} className="mt-6 inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-white" style={{ background: 'var(--navy)' }}><ShoppingBag className="h-4 w-4" /> Request custom order</button>
            </div>
          </article>
        ))}
      </div>
      {item && <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><button onClick={() => setSelected(null)} aria-label="Close order request" className="absolute inset-0 bg-black/45 backdrop-blur-sm" /><form onSubmit={submitRequest} className="relative w-full max-w-lg rounded-xl p-7 shadow-2xl" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}><button type="button" onClick={() => setSelected(null)} className="absolute right-5 top-5" style={{ color: 'var(--muted)' }}><X className="h-5 w-5" /></button><Eyebrow>Custom order request</Eyebrow><h2 className="mt-1 text-2xl font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>{item.name}</h2><p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>Your request will be reviewed by Front Desk before a job card is created.</p><input type="hidden" name="garment" value={item.name} /><label className="mt-6 block text-xs font-semibold" style={{ color: 'var(--ink)' }}>Preferred fabric<select name="fabric" className="mt-2 w-full rounded-md bg-white px-3 py-2.5 text-sm outline-none" style={{ border: '1px solid var(--line)' }}>{item.fabrics.map((fabric) => <option key={fabric}>{fabric}</option>)}</select></label><label className="mt-4 block text-xs font-semibold" style={{ color: 'var(--ink)' }}>Preferred completion date<input required name="dueDate" type="date" className="mt-2 w-full rounded-md bg-white px-3 py-2.5 text-sm outline-none" style={{ border: '1px solid var(--line)' }} /></label><label className="mt-4 block text-xs font-semibold" style={{ color: 'var(--ink)' }}>Notes for the tailor<textarea name="notes" rows={3} placeholder="Fit, event date, preferred details..." className="mt-2 w-full resize-none rounded-md bg-white px-3 py-2.5 text-sm outline-none" style={{ border: '1px solid var(--line)' }} /></label><div className="mt-6 flex gap-3"><button className="inline-flex items-center gap-2 rounded-md px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-white" style={{ background: 'var(--navy)' }}><Check className="h-4 w-4" /> Send request</button><button type="button" onClick={() => setSelected(null)} className="rounded-md px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.13em]" style={{ border: '1px solid var(--line)', color: 'var(--muted)' }}>Cancel</button></div></form></div>}
    </div>
  );
}

/* ============================================================
   ORDERS VIEW
============================================================= */
function OrdersView() {
  const [openId, setOpenId] = useState(null);
  const open = ORDERS.find((o) => o.id === openId);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Order studio" title="My Orders" sub="Follow each garment from the first measurement to final pickup." icon={Shirt} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {ORDERS.map((o, i) => (
          <button key={o.id} onClick={() => setOpenId(o.id)} className="rise atelier-card p-6 text-left transition-transform hover:-translate-y-0.5" style={{ animationDelay: `${i * 0.06}s` }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-4">
                <div className="swatch w-12 h-12 rounded-lg flex-shrink-0" style={{ '--swatch-a': o.swatchA, '--swatch-b': o.swatchB }} />
                <div>
                  <Eyebrow>{o.id}</Eyebrow>
                  <Display as="div" className="text-xl mt-0.5" style={{ color: 'var(--ink)', fontWeight: 600 }}>{o.garment}</Display>
                </div>
              </div>
              <StatusPill status={o.status} />
            </div>
            <p className="text-[13px] mt-3" style={{ color: 'var(--muted)', fontFamily: "'Inter', sans-serif" }}>{o.fabric}</p>
            <div className="mt-5 pt-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--line)' }}>
              <div>
                <Eyebrow>Stage</Eyebrow>
                <p className="text-[13px] font-medium mt-0.5" style={{ color: 'var(--ink)' }}>{STAGES[o.stageIndex]}</p>
              </div>
              <ChevronRight className="w-5 h-5" style={{ color: 'var(--brass)' }} />
            </div>
          </button>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button onClick={() => setOpenId(null)} className="absolute inset-0" style={{ background: 'rgba(20,23,31,0.6)' }} aria-label="Close" />
          <section className="relative w-full max-w-xl atelier-card p-8 max-h-[85vh] overflow-y-auto">
            <button onClick={() => setOpenId(null)} className="absolute right-6 top-6" style={{ color: 'var(--muted)' }}><X className="w-5 h-5" /></button>
            <Eyebrow>Order details · {open.id}</Eyebrow>
            <Display as="h2" className="text-2xl mt-1" style={{ color: 'var(--ink)', fontWeight: 600 }}>{open.garment}</Display>
            <div className="flex items-center gap-4 mt-5">
              <div className="swatch w-14 h-14 rounded-lg flex-shrink-0" style={{ '--swatch-a': open.swatchA, '--swatch-b': open.swatchB }} />
              <p className="text-[13px]" style={{ color: 'var(--muted)', fontFamily: "'Inter', sans-serif" }}>{open.fabric}</p>
            </div>
            <div className="mt-7">
              <Eyebrow>Production stage</Eyebrow>
              <div className="mt-3"><Stepper stageIndex={open.stageIndex} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-7">
              <Detail label="Estimated ready" value={open.due} />
              <Detail label="Order total" value={formatPeso(open.total)} />
              <Detail label="Balance on release" value={formatPeso(open.balance)} />
              <Detail label="Status" value={open.status} />
            </div>
            <div className="mt-6 p-4 rounded-lg" style={{ background: 'var(--brass-wash)' }}>
              <Eyebrow>Atelier notes</Eyebrow>
              <p className="text-[13px] mt-1.5" style={{ color: 'var(--ink)', fontFamily: "'Inter', sans-serif" }}>{open.notes}</p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
function Detail({ label, value }) {
  return (
    <div className="p-3 rounded-lg" style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}>
      <Eyebrow>{label}</Eyebrow>
      <p className="text-[13px] font-medium mt-1" style={{ color: 'var(--ink)' }}>{value}</p>
    </div>
  );
}

/* ============================================================
   MEASUREMENTS VIEW
============================================================= */
function MeasurementsView() {
  const radarData = MEASUREMENTS.map((m) => ({ subject: m.label, value: Math.round((m.value / m.max) * 100), cm: m.value }));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Your fitting profile" title="Measurements" sub="These values are used by your tailor to create a precise fit, verified at every session." icon={Ruler} />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.1fr] gap-6">
        <div className="rise atelier-card p-7" style={{ animationDelay: '0.06s' }}>
          <div className="flex items-center justify-between mb-1">
            <Eyebrow>Fit profile</Eyebrow>
            <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--brass)' }} strokeWidth={1.6} />
          </div>
          <Display as="h2" className="text-lg" style={{ color: 'var(--ink)', fontWeight: 600 }}>Measurement chart</Display>
          <div className="h-[280px] mt-2 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="72%">
                <PolarGrid stroke="var(--line)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--muted)', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="value" stroke="var(--brass)" fill="var(--brass)" fillOpacity={0.22} strokeWidth={2} />
                <Tooltip content={<MeasurementTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rise atelier-card p-7" style={{ animationDelay: '0.12s' }}>
          <Eyebrow>Trend</Eyebrow>
          <Display as="h2" className="text-lg mt-1" style={{ color: 'var(--ink)', fontWeight: 600 }}>Key measurements over time</Display>
          <div className="h-[220px] mt-3 -ml-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MEASUREMENT_HISTORY} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--line)" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }} />
                <YAxis tickLine={false} axisLine={false} width={32} tick={{ fill: 'var(--muted)', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }} />
                <Tooltip content={<HistoryTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }} />
                <Line type="monotone" dataKey="chest" stroke="var(--brass)" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="waist" stroke="var(--navy)" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="hip" stroke="var(--rust)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rise atelier-card p-7" style={{ animationDelay: '0.18s' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <Eyebrow>On file</Eyebrow>
            <Display as="h2" className="text-lg mt-1" style={{ color: 'var(--ink)', fontWeight: 600 }}>Primary profile</Display>
          </div>
          <Eyebrow>Verified {MEASUREMENTS_UPDATED}</Eyebrow>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {MEASUREMENTS.map((m) => {
            const delta = m.value - m.prev;
            return (
              <div key={m.label} className="p-4 rounded-lg" style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}>
                <Eyebrow>{m.label}</Eyebrow>
                <div className="flex items-baseline gap-2 mt-2">
                  <Display as="p" className="text-xl" style={{ color: 'var(--ink)', fontWeight: 600 }}>{m.value} <span className="text-[11px]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--muted)' }}>cm</span></Display>
                </div>
                {delta !== 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace", color: delta > 0 ? 'var(--rust)' : 'var(--success)' }}>
                    <ArrowUpRight className="w-3 h-3" style={{ transform: delta < 0 ? 'rotate(90deg)' : 'none' }} />
                    {Math.abs(delta)} cm since last
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   APPOINTMENTS VIEW
============================================================= */
function AppointmentsView() {
  const [appointments, setAppointments] = useState(APPOINTMENTS);
  const confirm = (id) => setAppointments((cur) => cur.map((a) => (a.id === id ? { ...a, status: 'Confirmed' } : a)));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Fitting calendar" title="Appointments" sub="Your upcoming tailoring appointments at the atelier." icon={CalendarClock} />
      <div className="rise atelier-card divide-y" style={{ animationDelay: '0.06s', borderColor: 'var(--line)' }}>
        {appointments.map((a, i) => (
          <div key={a.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6" style={{ borderBottom: i !== appointments.length - 1 ? '1px solid var(--line)' : 'none' }}>
            <div className="flex gap-5">
              <div className="text-center pr-5" style={{ borderRight: '1px solid var(--line)' }}>
                <Display as="span" className="block text-2xl" style={{ color: 'var(--ink)', fontWeight: 600 }}>{a.day}</Display>
                <Eyebrow>{a.month}</Eyebrow>
              </div>
              <div>
                <Eyebrow>{a.job}</Eyebrow>
                <Display as="h2" className="text-lg mt-0.5" style={{ color: 'var(--ink)', fontWeight: 600 }}>{a.type}</Display>
                <p className="text-[13px] mt-0.5" style={{ color: 'var(--muted)', fontFamily: "'Inter', sans-serif" }}>{a.date} · {a.time}</p>
              </div>
            </div>
            {a.status === 'Confirmed' ? (
              <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: 'var(--success)' }}><Check className="w-4 h-4" /> Confirmed</span>
            ) : (
              <button onClick={() => confirm(a.id)} className="px-4 py-2.5 rounded-md text-[10px] font-semibold uppercase tracking-[0.12em] text-white" style={{ background: 'var(--ink)', fontFamily: "'IBM Plex Mono', monospace" }}>
                Confirm attendance
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   PAYMENTS VIEW
============================================================= */
function PaymentsView() {
  const paid = PAYMENTS.reduce((sum, p) => sum + p.amount, 0);
  const outstanding = ORDERS.reduce((sum, o) => sum + o.balance, 0);
  const byJob = ORDERS.map((o) => ({ job: o.id, paid: o.total - o.balance })).filter((j) => j.paid > 0);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Billing history" title="Payments" sub="A clear record of every payment received for your garments." icon={Wallet} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Kpi icon={TrendingUp} tone="var(--success)" label="Paid to date" value={formatPeso(paid)} sub="Across all orders" delay="0s" />
        <Kpi icon={Wallet} tone="var(--rust)" label="Outstanding balance" value={formatPeso(outstanding)} sub="Due on release" delay="0.06s" />
        <Kpi icon={PackageCheck} tone="var(--navy)" label="Receipts" value={String(PAYMENTS.length)} sub="On file" delay="0.12s" />
      </div>

      <div className="rise atelier-card p-7" style={{ animationDelay: '0.16s' }}>
        <Eyebrow>By job card</Eyebrow>
        <Display as="h2" className="text-lg mt-1" style={{ color: 'var(--ink)', fontWeight: 600 }}>Amount paid per order</Display>
        <div className="h-[200px] mt-3 -ml-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byJob} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--line)" />
              <XAxis dataKey="job" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }} />
              <YAxis tickLine={false} axisLine={false} width={44} tick={{ fill: 'var(--muted)', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }} tickFormatter={(v) => `₱${v / 1000}k`} />
              <Tooltip content={<BarTooltip />} />
              <Bar dataKey="paid" fill="var(--brass)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <PaymentLedger payments={PAYMENTS} title="Payment activity" />
    </div>
  );
}

/* ============================================================
   SETTINGS VIEW
============================================================= */
function SettingsView({ profile, onProfileSaved, onUnauthorized }) {
  const [profileForm, setProfileForm] = useState(() => ({ name: profile?.full_name || profile?.name || '', email: profile?.email || '', phone: profile?.contact_number || '' }));
  const [profileDraft, setProfileDraft] = useState(profileForm);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState('');
  const [profileError, setProfileError] = useState('');

  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [prefs, setPrefs] = useState({ reminders: true, updates: true });

  useEffect(() => {
    const current = { name: profile?.full_name || profile?.name || '', email: profile?.email || '', phone: profile?.contact_number || '' };
    setProfileForm(current); setProfileDraft(current);
  }, [profile]);
  useEffect(() => {
    fetch(`${API_URL}/auth/preferences`, { headers: { Authorization: `Bearer ${authToken()}` } })
      .then(async (response) => { const data = await response.json(); if (!response.ok) { if (response.status === 401) onUnauthorized(); throw new Error(data.message || 'Unable to load preferences.'); } return data; })
      .then((data) => setPrefs({ reminders: !!data.preferences.reminder_notifications, updates: !!data.preferences.update_notifications }))
      .catch(() => {});
  }, []);
  const startEditProfile = () => { setProfileDraft(profileForm); setProfileNotice(''); setProfileError(''); setIsEditingProfile(true); };
  const cancelEditProfile = () => { setProfileDraft(profileForm); setIsEditingProfile(false); };
  const saveProfile = async (event) => {
    event.preventDefault();
    setProfileError('');
    try {
      const response = await fetch(`${API_URL}/auth/profile`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` }, body: JSON.stringify({ fullName: profileDraft.name, email: profileDraft.email, contactNumber: profileDraft.phone }) });
      const data = await response.json();
      if (!response.ok) { if (response.status === 401) onUnauthorized(); throw new Error(data.message || 'Unable to save profile.'); }
      const saved = { ...data.user, name: data.user.full_name };
      setProfileForm({ name: saved.full_name || '', email: saved.email || '', phone: saved.contact_number || '' });
      onProfileSaved(saved); setIsEditingProfile(false); setProfileNotice('Profile details saved.');
    } catch (error) { setProfileError(error instanceof Error ? error.message : 'Unable to save profile.'); }
  };

  const startEditPassword = () => { setPasswordForm({ current: '', next: '', confirm: '' }); setPasswordError(''); setPasswordNotice(''); setShowPassword(false); setIsEditingPassword(true); };
  const cancelEditPassword = () => { setPasswordForm({ current: '', next: '', confirm: '' }); setPasswordError(''); setIsEditingPassword(false); };
  const savePassword = async (event) => {
    event.preventDefault();
    if (!passwordForm.current || !passwordForm.next || !passwordForm.confirm) { setPasswordError('Fill in all three fields.'); return; }
    if (passwordForm.next.length < 8) { setPasswordError('New password must be at least 8 characters.'); return; }
    if (passwordForm.next !== passwordForm.confirm) { setPasswordError('New password and confirmation do not match.'); return; }
    setPasswordError('');
    try {
      const response = await fetch(`${API_URL}/auth/change-password`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` }, body: JSON.stringify({ currentPassword: passwordForm.current, newPassword: passwordForm.next }) });
      const data = await response.json();
      if (!response.ok) { if (response.status === 401) onUnauthorized(); throw new Error(data.message || 'Unable to update password.'); }
      setPasswordForm({ current: '', next: '', confirm: '' }); setIsEditingPassword(false); setPasswordNotice(data.message || 'Password updated.');
    } catch (error) { setPasswordError(error instanceof Error ? error.message : 'Unable to update password.'); }
  };

  const savePreferences = async (next) => {
    const previous = prefs; setPrefs(next);
    try {
      const response = await fetch(`${API_URL}/auth/preferences`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` }, body: JSON.stringify(next) });
      const data = await response.json();
      if (!response.ok) { if (response.status === 401) onUnauthorized(); throw new Error(data.message || 'Unable to save preferences.'); }
    } catch (error) { setPrefs(previous); setProfileError(error instanceof Error ? error.message : 'Unable to save preferences.'); }
  };

  return (
    <div className="w-full space-y-6">
      <PageHeader eyebrow="Account controls" title="Settings" icon={Settings} />

      {/* Profile */}
      <div className="rise atelier-card p-7" style={{ animationDelay: '0.06s' }}>
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--brass-wash)', color: 'var(--brass)' }}><UserRound className="w-5 h-5" strokeWidth={1.6} /></div>
            <Display as="h2" className="text-xl" style={{ color: 'var(--ink)', fontWeight: 600 }}>Profile</Display>
          </div>
          {!isEditingProfile ? (
            <button type="button" onClick={startEditProfile} className="inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ background: 'var(--brass-wash)', color: 'var(--brass)', fontFamily: "'IBM Plex Mono', monospace" }}>
              <Pencil className="w-3.5 h-3.5" strokeWidth={2} /> Edit
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ border: '1px solid var(--line)', color: 'var(--brass)', fontFamily: "'IBM Plex Mono', monospace" }}>
              <Pencil className="w-3.5 h-3.5" strokeWidth={2} /> Editing
            </span>
          )}
        </div>

        {profileNotice && (
          <div className="rise mb-5 flex items-center gap-2 rounded-lg px-4 py-3 text-[13px]" style={{ color: 'var(--success)', background: '#EEF6EF', border: '1px solid #CDE2D1' }}>
            <Check className="h-4 w-4 flex-shrink-0" />{profileNotice}
          </div>
        )}
        {profileError && <div className="rise mb-5 flex items-center gap-2 rounded-lg px-4 py-3 text-[13px]" style={{ color: 'var(--rust)', background: 'rgba(160,82,45,0.08)', border: '1px solid rgba(160,82,45,0.25)' }}><X className="h-4 w-4 flex-shrink-0" />{profileError}</div>}

        <form onSubmit={saveProfile}>
          <div className="grid gap-4 sm:grid-cols-2">
            <ProfileField icon={UserRound} label="Full name" value={profileDraft.name} onChange={(v) => setProfileDraft({ ...profileDraft, name: v })} disabled={!isEditingProfile} />
            <ProfileField icon={Mail} label="Email address" type="email" value={profileDraft.email} onChange={(v) => setProfileDraft({ ...profileDraft, email: v })} disabled={!isEditingProfile} />
            <ProfileField icon={Phone} label="Phone number" value={profileDraft.phone} onChange={(v) => setProfileDraft({ ...profileDraft, phone: v })} disabled={!isEditingProfile} />
          </div>
          {isEditingProfile && (
            <div className="mt-6 flex gap-3">
              <button type="submit" className="inline-flex items-center gap-2 rounded-md px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white" style={{ background: 'var(--ink)', fontFamily: "'IBM Plex Mono', monospace" }}>
                <Save className="w-3.5 h-3.5" /> Save profile
              </button>
              <button type="button" onClick={cancelEditProfile} className="rounded-md px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ border: '1px solid var(--line)', color: 'var(--muted)', fontFamily: "'IBM Plex Mono', monospace" }}>
                Cancel
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Password & Security */}
      <div className="rise atelier-card p-7" style={{ animationDelay: '0.1s' }}>
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--brass-wash)', color: 'var(--brass)' }}><Lock className="w-5 h-5" strokeWidth={1.6} /></div>
            <div>
              <Display as="h2" className="text-xl" style={{ color: 'var(--ink)', fontWeight: 600 }}>Password &amp; Security</Display>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--muted)', fontFamily: "'Inter', sans-serif" }}>Change the password used to sign in to your account.</p>
            </div>
          </div>
          {!isEditingPassword ? (
            <button type="button" onClick={startEditPassword} className="inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ background: 'var(--brass-wash)', color: 'var(--brass)', fontFamily: "'IBM Plex Mono', monospace" }}>
              <Pencil className="w-3.5 h-3.5" strokeWidth={2} /> Change password
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ border: '1px solid var(--line)', color: 'var(--brass)', fontFamily: "'IBM Plex Mono', monospace" }}>
              <Pencil className="w-3.5 h-3.5" strokeWidth={2} /> Editing
            </span>
          )}
        </div>

        {passwordNotice && (
          <div className="rise mb-5 flex items-center gap-2 rounded-lg px-4 py-3 text-[13px]" style={{ color: 'var(--success)', background: '#EEF6EF', border: '1px solid #CDE2D1' }}>
            <Check className="h-4 w-4 flex-shrink-0" />{passwordNotice}
          </div>
        )}
        {passwordError && (
          <div className="rise mb-5 flex items-center gap-2 rounded-lg px-4 py-3 text-[13px]" style={{ color: 'var(--rust)', background: 'rgba(160,82,45,0.08)', border: '1px solid rgba(160,82,45,0.25)' }}>
            <X className="h-4 w-4 flex-shrink-0" />{passwordError}
          </div>
        )}

        {isEditingPassword ? (
          <form onSubmit={savePassword}>
            <div className="grid gap-4 sm:grid-cols-2">
              <PasswordField label="Current password" value={passwordForm.current} onChange={(v) => setPasswordForm({ ...passwordForm, current: v })} show={showPassword} onToggleShow={() => setShowPassword((s) => !s)} />
              <div className="hidden sm:block" />
              <PasswordField label="New password" value={passwordForm.next} onChange={(v) => setPasswordForm({ ...passwordForm, next: v })} show={showPassword} onToggleShow={() => setShowPassword((s) => !s)} />
              <PasswordField label="Confirm new password" value={passwordForm.confirm} onChange={(v) => setPasswordForm({ ...passwordForm, confirm: v })} show={showPassword} onToggleShow={() => setShowPassword((s) => !s)} />
            </div>
            <p className="mt-3 text-[11px]" style={{ color: 'var(--muted)', fontFamily: "'IBM Plex Mono', monospace" }}>USE AT LEAST 8 CHARACTERS</p>
            <div className="mt-5 flex gap-3">
              <button type="submit" className="inline-flex items-center gap-2 rounded-md px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white" style={{ background: 'var(--ink)', fontFamily: "'IBM Plex Mono', monospace" }}>
                <Save className="w-3.5 h-3.5" /> Update password
              </button>
              <button type="button" onClick={cancelEditPassword} className="rounded-md px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ border: '1px solid var(--line)', color: 'var(--muted)', fontFamily: "'IBM Plex Mono', monospace" }}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-center gap-2.5 p-3 rounded-lg" style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}>
            <Lock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--muted)' }} strokeWidth={1.8} />
            <span className="text-[12px]" style={{ color: 'var(--muted)', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.08em' }}>••••••••••••</span>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="rise atelier-card p-7" style={{ animationDelay: '0.16s' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--brass-wash)', color: 'var(--brass)' }}><Bell className="w-5 h-5" strokeWidth={1.6} /></div>
          <Display as="h2" className="text-xl" style={{ color: 'var(--ink)', fontWeight: 600 }}>Notifications</Display>
        </div>
        <Toggle label="Fitting reminders" checked={prefs.reminders} onClick={() => savePreferences({ ...prefs, reminders: !prefs.reminders })} />
        <Toggle label="Order updates" checked={prefs.updates} onClick={() => savePreferences({ ...prefs, updates: !prefs.updates })} last />
        <p className="mt-4 text-[11px]" style={{ color: 'var(--muted)', fontFamily: "'IBM Plex Mono', monospace" }}>CHANGES APPLY IMMEDIATELY</p>
      </div>
    </div>
  );
}
function PasswordField({ label, value, onChange, show, onToggleShow, disabled = false }) {
  return (
    <label className="block text-[12px] font-medium" style={{ color: 'var(--muted)', fontFamily: "'Inter', sans-serif" }}>
      {label}
      <div className="relative mt-2">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: disabled ? 'var(--muted)' : 'var(--brass)' }} strokeWidth={1.8} />
        <input
          required
          type={show ? 'text' : 'password'}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="input-field"
          style={{ paddingLeft: 34, paddingRight: 34, background: disabled ? 'var(--brass-wash)' : '#fff', color: disabled ? 'var(--muted)' : 'var(--ink)' }}
        />
        <button type="button" onClick={onToggleShow} tabIndex={-1} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} aria-label={show ? 'Hide password' : 'Show password'}>
          {show ? <EyeOff className="w-3.5 h-3.5" strokeWidth={1.8} /> : <Eye className="w-3.5 h-3.5" strokeWidth={1.8} />}
        </button>
      </div>
    </label>
  );
}
function Toggle({ label, checked, onClick, last }) {
  return (
    <div className="flex items-center justify-between py-4" style={{ borderBottom: last ? 'none' : '1px solid var(--line)' }}>
      <span className="text-[13px] font-medium" style={{ color: 'var(--ink)', fontFamily: "'Inter', sans-serif" }}>{label}</span>
      <button onClick={onClick} className="h-6 w-11 rounded-full p-1 transition-colors" style={{ background: checked ? 'var(--brass)' : '#D8D2C4' }}>
        <span className="block h-4 w-4 rounded-full bg-white transition-transform" style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }} />
      </button>
    </div>
  );
}

/* ============================================================
   ROOT
============================================================= */
export default function CustomerDashboard() {
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);
  const [view, setView] = useState('dashboard');
  const [now, setNow] = useState(() => new Date());
  const [profile, setProfile] = useState(() => sessionUser());
  const [profileOpen, setProfileOpen] = useState(false);
  const [catalog, setCatalog] = useState(() => getCatalog());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    const user = sessionUser();
    if (!user || user.role !== 'customer') {
      navigate('/login', { replace: true });
      return;
    }
    setProfile(user);
    fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${authToken()}` } })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) { if (response.status === 401) signOut(); throw new Error(data.message || 'Unable to load account profile.'); }
        if (data.user) setProfile((current) => ({ ...current, ...data.user }));
      })
      .catch(() => {})
    fetch(`${API_URL}/customer/dashboard`, { headers: { Authorization: `Bearer ${authToken()}` } })
      .then(async (response) => {
        if (!response.ok) { if (response.status === 401) signOut(); throw new Error('Unable to load account profile.'); }
        return response.json();
      })
      .then((data) => { if (data.user) setProfile((current) => ({ ...current, ...data.user })); })
      .catch(() => { /* Use the profile saved by login if the dashboard endpoint is unavailable. */ });
    fetch(`${API_URL}/auth/catalog`, { headers: { Authorization: `Bearer ${authToken()}` } })
      .then(async (response) => { if (!response.ok) throw new Error('Unable to load catalog.'); return response.json(); })
      .then((data) => { if (Array.isArray(data.catalog)) setCatalog(data.catalog); })
      .catch(() => { /* Keep the bundled catalog if the server is unavailable. */ });
  }, [navigate]);

  const customerName = profile?.full_name || profile?.name || CUSTOMER.name;
  const customerEmail = profile?.email || CUSTOMER.email;
  const memberSince = profile?.created_at ? new Date(profile.created_at).getFullYear().toString() : CUSTOMER.memberSince;
  const signOut = () => {
    localStorage.removeItem('authToken'); localStorage.removeItem('currentUser');
    sessionStorage.removeItem('authToken'); sessionStorage.removeItem('currentUser');
    navigate('/login', { replace: true });
  };

  const currentLabel = NAV.find((n) => n.key === view)?.label ?? 'Dashboard';

  function renderView() {
    switch (view) {
      case 'dashboard': return <DashboardView catalog={catalog} onBrowseGarments={() => setView('catalog')} />;
      case 'catalog': return <CatalogView catalog={catalog} />;
      case 'orders': return <OrdersView />;
      case 'measurements': return <MeasurementsView />;
      case 'appointments': return <AppointmentsView />;
      case 'payments': return <PaymentsView />;
      case 'settings': return <SettingsView profile={profile} onProfileSaved={(updated) => { setProfile(updated); const storage = localStorage.getItem('authToken') ? localStorage : sessionStorage; storage.setItem('currentUser', JSON.stringify(updated)); }} onUnauthorized={() => signOut()} />;
      default: return <DashboardView />;
    }
  }

  return (
    <div className="min-h-screen antialiased flex" style={{ background: 'var(--paper)', color: 'var(--ink)', fontFamily: "'Inter', sans-serif" }}>
      <style>{FONT_IMPORT}</style>

      <aside
        className={`${navOpen ? 'fixed inset-y-0 left-0 translate-x-0' : 'fixed inset-y-0 left-0 -translate-x-full'} z-40 lg:relative lg:inset-auto lg:translate-x-0 lg:z-0 w-72 flex-shrink-0 h-screen lg:h-auto lg:min-h-screen flex flex-col justify-between transition-transform duration-300`}
        style={{ background: 'var(--ink)' }}
      >
        <div>
          <div className="flex items-center justify-between px-7 py-8" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ border: '1px solid var(--brass-soft)' }}>
                <span className="text-[11px]" style={{ fontFamily: "'Fraunces', serif", color: 'var(--brass-soft)' }}>A&T</span>
              </div>
              <div className="leading-tight">
                <Display as="div" className="text-[15px] text-white" style={{ fontWeight: 500 }}>Ashlie's Tailor</Display>
                <Eyebrow tone="rgba(255,255,255,0.45)">Private client portal</Eyebrow>
              </div>
            </div>
            <button className="lg:hidden text-white/70" onClick={() => setNavOpen(false)} aria-label="Close menu"><X className="w-5 h-5" /></button>
          </div>

          <nav className="px-4 py-7 space-y-1">
            {NAV.map((item) => {
              const active = item.key === view;
              return (
                <button
                  key={item.key}
                  onClick={() => { setView(item.key); setNavOpen(false); }}
                  className="relative w-full flex items-center gap-3.5 px-4 py-3 text-[14px] rounded-md transition-colors"
                  style={{ color: active ? '#fff' : 'rgba(255,255,255,0.55)', background: active ? 'rgba(169,130,79,0.14)' : 'transparent' }}
                >
                  {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full" style={{ background: 'var(--brass)' }} />}
                  <item.icon className="w-4 h-4" strokeWidth={1.6} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="px-7 py-6 space-y-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={() => setProfileOpen(true)} className="flex w-full items-center gap-3 rounded-md p-1 text-left transition-colors hover:bg-white/5">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--brass)' }}>
              {profile?.profile_picture ? <img src={profile.profile_picture} alt="Customer profile" className="h-full w-full rounded-full object-cover" /> : <span className="text-white text-xs font-bold">{customerName.split(' ').map((n) => n[0]).join('').slice(0, 2)}</span>}
            </div>
            <div className="leading-tight min-w-0">
              <div className="text-[13px] text-white truncate">{customerName}</div>
              <Eyebrow tone="var(--brass-soft)">{profile?.tier || CUSTOMER.tier} · {memberSince}</Eyebrow>
            </div>
          </button>
          <button onClick={signOut} className="group flex w-full items-center justify-between px-3 py-2.5 rounded-md text-[10px] tracking-[0.14em] uppercase transition-colors" style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.12)' }}>
            Sign out <LogOut className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </aside>

      {navOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setNavOpen(false)} />}

      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-20 backdrop-blur-md px-6 sm:px-10 py-5 flex items-center justify-between gap-4" style={{ background: 'rgba(250,248,243,0.9)', borderBottom: '1px solid var(--line)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <button className="lg:hidden flex-shrink-0" onClick={() => setNavOpen(true)} aria-label="Open menu"><Menu className="w-5 h-5" /></button>
            <div className="min-w-0">
              <Eyebrow>{view === 'dashboard' ? 'Good afternoon' : `My account / ${currentLabel}`}</Eyebrow>
              <Display as="div" className="text-[19px] truncate" style={{ color: 'var(--ink)', fontWeight: 600 }}>{view === 'dashboard' ? customerName.split(' ')[0] : currentLabel}</Display>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-5 flex-shrink-0">
            <div className="relative hidden md:flex items-center px-3 py-2 rounded-full" style={{ background: '#fff', border: '1px solid var(--line)' }}>
              <Search className="w-3.5 h-3.5" style={{ color: 'var(--muted)' }} strokeWidth={1.5} />
              <input type="text" aria-label="Signed-in customer email" value={customerEmail} readOnly className="w-44 bg-transparent text-[12px] pl-2 focus:outline-none" style={{ color: 'var(--ink)' }} />
            </div>
            <button className="relative" style={{ color: 'var(--muted)' }} aria-label="Notifications">
              <Bell className="w-5 h-5" strokeWidth={1.5} />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ background: 'var(--rust)', boxShadow: '0 0 0 2px var(--paper)' }} />
            </button>
            <div className="h-6 w-px hidden sm:block" style={{ background: 'var(--line)' }} />
            <Eyebrow className="hidden sm:inline">{now.toLocaleString(undefined, { weekday: 'short', month: 'short', day: '2-digit', hour: 'numeric', minute: '2-digit' })}</Eyebrow>
          </div>
        </header>

        <main className="w-full px-6 sm:px-10 xl:px-12 py-10">
          {renderView()}
        </main>
      </div>
      {profileOpen && <CustomerProfileModal profile={profile} fallbackName={customerName} onClose={() => setProfileOpen(false)} onSave={(updated) => { setProfile(updated); const storage = localStorage.getItem('authToken') ? localStorage : sessionStorage; storage.setItem('currentUser', JSON.stringify(updated)); }} onUnauthorized={signOut} />}
    </div>
  );
}

function CustomerProfileModal({ profile, fallbackName, onClose, onSave, onUnauthorized }) {
  const initialName = profile?.full_name || profile?.name || fallbackName;
  const initialForm = { name: initialName, email: profile?.email || '', contact: profile?.contact_number || profile?.contact || '', address: profile?.address || '', photo: profile?.profile_picture || '' };
  const [form, setForm] = useState(initialForm);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const memberSince = profile?.created_at ? new Date(profile.created_at).getFullYear().toString() : CUSTOMER.memberSince;
  const initials = (form.name || fallbackName).split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  const startEditing = () => { setNotice(''); setError(''); setIsEditing(true); };
  const cancelEditing = () => { setForm(initialForm); setNotice(''); setError(''); setIsEditing(false); };

  const pickPhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update('photo', reader.result);
    reader.readAsDataURL(file);
  };

  const save = async (event) => {
    event.preventDefault();
    if (!isEditing) return;
    setSaving(true); setNotice(''); setError('');
    try {
      const response = await fetch(`${API_URL}/auth/profile`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` }, body: JSON.stringify({ fullName: form.name, email: form.email, contactNumber: form.contact, address: form.address, profilePicture: form.photo }) });
      const data = await response.json();
      if (!response.ok) { if (response.status === 401) onUnauthorized(); throw new Error(data.message || 'Unable to save profile.'); }
      onSave({ ...data.user, name: data.user.full_name }); setNotice('Profile saved to your account.'); setIsEditing(false);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to save profile.'); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button onClick={onClose} className="absolute inset-0" style={{ background: 'rgba(20,23,31,0.62)', backdropFilter: 'blur(3px)' }} aria-label="Close profile" />
      <form onSubmit={save} className="rise atelier-card relative w-full max-w-xl max-h-[90vh] overflow-y-auto" style={{ animationDuration: '0.35s' }}>
        <button type="button" onClick={onClose} className="absolute right-5 top-5 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-black/5" style={{ color: 'var(--muted)' }} aria-label="Close">
          <X className="h-4 w-4" />
        </button>

        {/* Header band */}
        <div className="px-8 pt-8 pb-7" style={{ background: 'var(--ink)', borderTopLeftRadius: 14, borderTopRightRadius: 14 }}>
          <Eyebrow tone="var(--brass-soft)">Private client account</Eyebrow>
          <Display as="h2" className="mt-1.5 text-[26px] text-white" style={{ fontWeight: 600 }}>My Profile</Display>
          <div className="mt-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <label className="relative flex-shrink-0" style={{ cursor: isEditing ? 'pointer' : 'default' }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden" style={{ background: 'var(--brass)', border: '2px solid rgba(255,255,255,0.18)' }}>
                  {form.photo
                    ? <img src={form.photo} alt="Profile" className="h-full w-full object-cover" />
                    : <span className="text-white text-lg font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>{initials}</span>}
                </div>
                {isEditing && (
                  <>
                    <span className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--brass)', border: '2px solid var(--ink)' }}>
                      <Camera className="w-3 h-3" style={{ color: 'var(--ink)' }} strokeWidth={2.2} />
                    </span>
                    <input type="file" accept="image/*" onChange={pickPhoto} className="sr-only" />
                  </>
                )}
              </label>
              <div className="min-w-0">
                <div className="text-[16px] text-white font-medium truncate" style={{ fontFamily: "'Inter', sans-serif" }}>{form.name || fallbackName}</div>
                <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: 'rgba(169,130,79,0.16)' }}>
                  <ShieldCheck className="w-3 h-3" style={{ color: 'var(--brass-soft)' }} strokeWidth={2} />
                  <Eyebrow tone="var(--brass-soft)">{profile?.tier || CUSTOMER.tier} · Member since {memberSince}</Eyebrow>
                </div>
                {isEditing && <p className="mt-1.5 text-[11px]" style={{ color: 'rgba(255,255,255,0.45)', fontFamily: "'Inter', sans-serif" }}>Tap your photo to change it</p>}
              </div>
            </div>
            {!isEditing ? (
              <button type="button" onClick={startEditing} className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-md px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors" style={{ background: 'var(--brass)', color: 'var(--ink)', fontFamily: "'IBM Plex Mono', monospace" }}>
                <Pencil className="w-3.5 h-3.5" strokeWidth={2} /> Edit
              </button>
            ) : (
              <span className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-md px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ border: '1px solid rgba(201,168,118,0.4)', color: 'var(--brass-soft)', fontFamily: "'IBM Plex Mono', monospace" }}>
                <Pencil className="w-3.5 h-3.5" strokeWidth={2} /> Editing
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-7">
          <p className="text-[13px]" style={{ color: 'var(--muted)', fontFamily: "'Inter', sans-serif" }}>
            Keep your contact details current so we can reach you for fittings, pickups, and order updates.
          </p>

          {notice && (
            <div className="mt-5 rise flex items-center gap-2 rounded-lg px-4 py-3 text-[13px]" style={{ color: 'var(--success)', background: '#EEF6EF', border: '1px solid #CDE2D1' }}>
              <Check className="h-4 w-4 flex-shrink-0" />{notice}
            </div>
          )}
          {error && <div role="alert" className="mt-5 rise flex items-center gap-2 rounded-lg px-4 py-3 text-[13px]" style={{ color: 'var(--rust)', background: 'rgba(160,82,45,0.08)', border: '1px solid rgba(160,82,45,0.25)' }}><X className="h-4 w-4 flex-shrink-0" />{error}</div>}

          <div className="mt-6 pt-5" style={{ borderTop: '1px solid var(--line)' }}>
            <Eyebrow>Contact information</Eyebrow>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <ProfileField icon={UserRound} label="Full name" value={form.name} onChange={(value) => update('name', value)} disabled={!isEditing} />
            <ProfileField icon={Mail} label="Email address" type="email" value={form.email} onChange={(value) => update('email', value)} disabled={!isEditing} />
            <ProfileField icon={Phone} label="Contact number" value={form.contact} onChange={(value) => update('contact', value)} disabled={!isEditing} />
          </div>

          <div className="mt-6 pt-5" style={{ borderTop: '1px solid var(--line)' }}>
            <Eyebrow>Mailing address</Eyebrow>
            <div className="mt-4">
              <ProfileField icon={MapPin} label="Address" value={form.address} onChange={(value) => update('address', value)} disabled={!isEditing} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 flex items-center gap-3" style={{ borderTop: '1px solid var(--line)', background: 'var(--paper)', borderBottomLeftRadius: 14, borderBottomRightRadius: 14 }}>
          {isEditing ? (
            <>
              <button disabled={saving} className="inline-flex items-center gap-2 rounded-md px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white transition-opacity disabled:opacity-60" style={{ background: 'var(--ink)', fontFamily: "'IBM Plex Mono', monospace" }}>
                <Save className="h-3.5 w-3.5" />{saving ? 'Saving…' : 'Save profile'}
              </button>
              <button type="button" disabled={saving} onClick={cancelEditing} className="rounded-md px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors disabled:opacity-60" style={{ border: '1px solid var(--line)', color: 'var(--muted)', fontFamily: "'IBM Plex Mono', monospace" }}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={startEditing} className="inline-flex items-center gap-2 rounded-md px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white" style={{ background: 'var(--ink)', fontFamily: "'IBM Plex Mono', monospace" }}>
                <Pencil className="h-3.5 w-3.5" /> Edit profile
              </button>
              <button type="button" onClick={onClose} className="rounded-md px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors" style={{ border: '1px solid var(--line)', color: 'var(--muted)', fontFamily: "'IBM Plex Mono', monospace" }}>
                Close
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}

function ProfileField({ icon: Icon, label, value, onChange, type = 'text', disabled = false }) {
  return (
    <label className="block text-[12px] font-medium" style={{ color: 'var(--muted)', fontFamily: "'Inter', sans-serif" }}>
      {label}
      <div className="relative mt-2">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: disabled ? 'var(--muted)' : 'var(--brass)' }} strokeWidth={1.8} />}
        <input
          required
          type={type}
          value={value}
          disabled={disabled}
          readOnly={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="input-field"
          style={{
            paddingLeft: Icon ? 34 : undefined,
            background: disabled ? 'var(--brass-wash)' : '#fff',
            color: disabled ? 'var(--muted)' : 'var(--ink)',
            cursor: disabled ? 'default' : 'text',
            borderColor: disabled ? 'var(--line)' : undefined,
          }}
        />
      </div>
    </label>
  );
}
