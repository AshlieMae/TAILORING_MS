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
import NotificationBell from '../components/NotificationBell';

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
    Released: { bg: 'rgba(75,120,86,0.12)', fg: 'var(--success)' },
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
function dateForInput(value) {
  if (!value) return '';
  const raw = String(value);
  // MySQL DATE values can reach the browser as an ISO timestamp at UTC midnight.
  // Use the local calendar parts so a saved 10/10 does not display as 09/10.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

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
function DashboardView({ onBrowseGarments, catalog, payments = [], onViewPayments, customerName = '', orders = [], measurements = [], appointments = [] }) {
  const realOrders = orders || [];
  const [selected, setSelected] = useState(null);
  const activeOrders = realOrders.filter((o) => ((o.pickup_status || o.status || '') !== 'Released'));
  const order = realOrders.find((o) => o.id === selected) ?? activeOrders[0] ?? realOrders[0] ?? null;
  const lifetime = (payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  // Real notifications for "Stay ahead" — reads the shared notifications table.
  const [notifs, setNotifs] = useState([]);
  useEffect(() => {
    fetch(`${API_URL}/auth/customer/notifications`, { headers: { Authorization: `Bearer ${authToken()}` } })
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.message || 'Unable to load notifications.'); return d; })
      .then((d) => setNotifs((d.notifications || []).slice(0, 4)))
      .catch(() => {});
  }, []);

  // Spotlight order helpers (works with both raw server rows and mapped rows)
  const stageName = order ? (order.stage || '') : '';
  const CANON_STAGES = ['Measuring', 'Pattern Cutting', 'Initial Assembly', 'First Fitting', 'Final Alterations', 'Quality Review', 'Completed', 'Ready for Pickup'];
  const stepIdx = (() => {
    if (typeof order?.stageIndex === 'number' && order.stageIndex >= 0) return Math.min(order.stageIndex, STAGES.length - 1);
    const i = CANON_STAGES.indexOf(stageName);
    if (i < 0) return 0;
    return [0, 1, 2, 3, 4, 5, 6, 6][i];
  })();
  const stageLabel = stageName || STAGES[Math.min(stepIdx, STAGES.length - 1)] || 'Measuring';
  const swatch = (() => {
    const s = String(order?.fabric || order?.garment || 'atelier');
    const h = [...s].reduce((a, c) => a + c.charCodeAt(0), 0);
    return [`hsl(${h % 360} 34% 40%)`, `hsl(${(h * 7 + 40) % 360} 46% 64%)`];
  })();
  const swatchA = order?.swatchA || swatch[0];
  const swatchB = order?.swatchB || swatch[1];
  const readyLabel = order?.due ? (/^[A-Za-z]{3}/.test(String(order.due)) ? order.due : (Number.isNaN(new Date(order.due).getTime()) ? 'Not scheduled' : new Date(order.due).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }))) : 'Not scheduled';
  const orderBalance = order ? Number(order.balance) || 0 : 0;
  const orderTotal = order ? Number(order.total ?? ((Number(order.paid) || 0) + orderBalance)) || 0 : 0;

  // Real measurements radar (from customer_measurements via the server)
  const realMeasurements = measurements || [];
  const radarData = realMeasurements.map((m) => ({ subject: m.label, value: Math.max(5, Math.min(100, Math.round(((Number(m.value) || 0) / 120) * 100))), cm: Math.round((Number(m.value) || 0) * 10) / 10 }));
  const verifiedAt = realMeasurements.map((m) => m.updated_at).filter(Boolean).sort().pop();
  const verifiedLabel = verifiedAt && !Number.isNaN(new Date(verifiedAt).getTime()) ? new Date(verifiedAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase() : null;

  // Real spend trend computed from the customer's payments (last 6 months)
  const spendNow = new Date();
  const spendTrend = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(spendNow.getFullYear(), spendNow.getMonth() - i, 1);
    spendTrend.push({ month: d.toLocaleString('en-US', { month: 'short' }), amount: 0 });
  }
  (payments || []).forEach((p) => {
    const d = new Date(p.paid_at || p.date);
    if (Number.isNaN(d.getTime())) return;
    const bucket = spendTrend.find((x) => x.month === d.toLocaleString('en-US', { month: 'short' }));
    if (bucket) bucket.amount += Number(p.amount) || 0;
  });
  const thisYearTotal = (payments || []).filter((p) => { const d = new Date(p.paid_at || p.date); return !Number.isNaN(d.getTime()) && d.getFullYear() === spendNow.getFullYear(); }).reduce((s, p) => s + (Number(p.amount) || 0), 0);

  const nextAppt = (appointments || [])[0] || null;
  const nextApptDate = nextAppt ? new Date(nextAppt.appointment_at) : null;
  const nextApptValid = nextApptDate && !Number.isNaN(nextApptDate.getTime());

  return (
    <div className="space-y-7">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Kpi icon={Shirt} tone="var(--navy)" label="Active orders" value={String(activeOrders.length)} sub={activeOrders.length ? 'Currently in production' : 'No orders yet'} delay="0s" />
        <Kpi icon={TrendingUp} tone="var(--brass)" label="Lifetime investment" value={formatPeso(lifetime)} sub={`${(payments || []).length} receipt${(payments || []).length === 1 ? '' : 's'} on file`} delay="0.06s" />
        <Kpi icon={CalendarClock} tone="var(--success)" label="Next appointment" value={nextApptValid ? nextApptDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) : '—'} sub={nextAppt ? `${nextAppt.appointment_type || 'Appointment'}${nextApptValid ? ` · ${nextApptDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : ''}` : 'No appointments yet'} delay="0.12s" />
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
        {order ? (
        <div className="rise atelier-card p-7" style={{ animationDelay: '0.18s' }}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <Eyebrow>Order in progress</Eyebrow>
              <Display as="h2" className="text-[26px] mt-1" style={{ color: 'var(--ink)', fontWeight: 600 }}>{order.garment}</Display>
              <p className="text-[13px] mt-1" style={{ color: 'var(--muted)', fontFamily: "'Inter', sans-serif" }}>{order.fabric || 'Fabric not specified'}</p>
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
                      background: o.id === order.id ? 'var(--ink)' : 'transparent',
                      color: o.id === order.id ? '#fff' : 'var(--muted)',
                      border: `1px solid ${o.id === order.id ? 'var(--ink)' : 'var(--line)'}`,
                    }}
                  >
                    {o.id}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 mt-6">
            <div className="swatch w-16 h-16 rounded-lg flex-shrink-0" style={{ '--swatch-a': swatchA, '--swatch-b': swatchB }} />
            <div className="flex-1 min-w-0">
              <Eyebrow>Fabric swatch on file</Eyebrow>
              <div className="text-[13px] mt-1" style={{ color: 'var(--ink)', fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>{order.fabric || 'Fabric not specified'}</div>
            </div>
          </div>

          <div className="mt-8">
            <div className="flex justify-between items-center mb-3">
              <Eyebrow>Production stage</Eyebrow>
              <Eyebrow tone="var(--navy)">{stageLabel}</Eyebrow>
            </div>
            <Stepper stageIndex={stepIdx} />
          </div>

          <div className="mt-7 pt-6 flex flex-wrap gap-8" style={{ borderTop: '1px solid var(--line)' }}>
            <div>
              <Eyebrow>Estimated ready</Eyebrow>
              <Display as="div" className="text-lg mt-1" style={{ color: 'var(--ink)', fontWeight: 600 }}>{readyLabel}</Display>
            </div>
            <div>
              <Eyebrow>Balance on release</Eyebrow>
              <div className="text-lg mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace", color: orderBalance > 0 ? 'var(--rust)' : 'var(--success)', fontWeight: 600 }}>{formatPeso(orderBalance)}</div>
            </div>
            <div>
              <Eyebrow>Order total</Eyebrow>
              <div className="text-lg mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--ink)', fontWeight: 600 }}>{formatPeso(orderTotal)}</div>
            </div>
          </div>
        </div>
        ) : (
        <div className="rise atelier-card p-7 flex flex-col items-center justify-center text-center py-14" style={{ animationDelay: '0.18s' }}>
          <Shirt className="w-8 h-8" style={{ color: 'var(--muted)' }} strokeWidth={1.4} />
          <Display as="h2" className="text-xl mt-3" style={{ color: 'var(--ink)', fontWeight: 600 }}>No orders in progress</Display>
          <p className="text-[13px] mt-1 max-w-xs" style={{ color: 'var(--muted)' }}>When you request a garment, it will appear here with its live production stage.</p>
          <button onClick={onBrowseGarments} className="mt-5 inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white" style={{ background: 'var(--navy)' }}><ShoppingBag className="h-4 w-4" /> Browse garments</button>
        </div>
        )}

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
          {realMeasurements.length === 0 ? (
            <p className="text-[11px] mt-1" style={{ color: 'var(--muted)', fontFamily: "'IBM Plex Mono', monospace" }}>NO MEASUREMENTS ON FILE — VISIT THE FRONT DESK TO BE MEASURED</p>
          ) : (
            <p className="text-[11px] mt-1" style={{ color: 'var(--muted)', fontFamily: "'IBM Plex Mono', monospace" }}>LAST VERIFIED {verifiedLabel || '—'}</p>
          )}
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
              <div className="text-lg mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--ink)', fontWeight: 600 }}>{formatPeso(thisYearTotal)}</div>
            </div>
          </div>
          <div className="h-[200px] mt-3 -ml-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spendTrend} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
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
            {notifs.length === 0 ? (
              <p className="text-[12.5px]" style={{ color: 'var(--muted)', fontFamily: "'Inter', sans-serif" }}>You're all caught up — no new updates yet.</p>
            ) : notifs.map((n) => {
              const kind = n.type === 'payment' ? 'reminder' : n.type === 'appointment' ? 'fitting' : 'pickup';
              const meta = NOTIF_META[kind];
              const Icon = meta.icon;
              const nd = new Date(n.created_at);
              const when = Number.isNaN(nd.getTime()) ? '' : nd.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
              return (
                <div key={n.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${meta.tone}14`, color: meta.tone }}>
                    <Icon className="w-4 h-4" strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[13px] font-medium" style={{ color: 'var(--ink)', fontFamily: "'Inter', sans-serif" }}>{n.title}</span>
                      <span className="text-[10px] flex-shrink-0" style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--muted)' }}>{when}</span>
                    </div>
                    <p className="text-[12.5px] mt-0.5" style={{ color: 'var(--muted)', fontFamily: "'Inter', sans-serif" }}>{n.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <PaymentLedger payments={payments.slice(0, 3)} title="Payment history" showViewAll onViewAll={onViewPayments} customerName={customerName} />
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

function PaymentLedger({ payments, title, showViewAll, onViewAll, customerName = '' }) {
  const [receipt, setReceipt] = useState<any>(null);
  const rows = (payments || []).map((p) => ({
    id: p.id || p.receipt || '',
    job: p.job || p.jobCardNumber || '—',
    label: p.label || p.description || p.payment_type || 'Payment',
    amount: Number(p.amount || 0),
    date: p.date || p.paid_at || '',
  }));

  const printReceipt = (row) => {
    const dateStr = row.date ? new Date(row.date).toLocaleString('en-PH', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
    const win = window.open('', '_blank', 'width=480,height=640');
    if (!win) return;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${row.id}</title><style>
      body{font-family:'Courier New',monospace;color:#111;background:#fff;margin:0;padding:32px;}
      .r{max-width:380px;margin:0 auto;border:2px solid #111;padding:24px;}
      h1{font-size:20px;text-align:center;margin:0 0 2px;}
      .sub{text-align:center;font-size:11px;margin-bottom:18px;}
      .row{display:flex;justify-content:space-between;font-size:13px;padding:4px 0;border-bottom:1px dashed #ccc;}
      .amt{font-size:18px;font-weight:bold;text-align:center;margin:14px 0;}
      .foot{text-align:center;font-size:11px;margin-top:18px;}
      button{position:fixed;top:12px;right:12px;background:#111;color:#fff;border:0;padding:8px 14px;font-size:12px;cursor:pointer;}
    </style></head><body><button onclick="window.print()">Print</button>
    <div class="r">
      <h1>ASHLIE'S TAILOR</h1>
      <div class="sub">Official Receipt</div>
      <div class="row"><span>Receipt No.</span><span>${row.id}</span></div>
      <div class="row"><span>Job Card</span><span>${row.job}</span></div>
      <div class="row"><span>Description</span><span>${row.label}</span></div>
      <div class="row"><span>Customer</span><span>${customerName || '—'}</span></div>
      <div class="row"><span>Date</span><span>${dateStr}</span></div>
      <div class="amt">₱${row.amount.toLocaleString('en-PH')}</div>
      <div class="foot">Thank you for your business!</div>
    </div>
    </body></html>`);
    win.document.close();
  };

  return (
    <div className="rise atelier-card overflow-hidden" style={{ animationDelay: '0.42s' }}>
      <div className="flex items-center justify-between px-7 py-6" style={{ borderBottom: '1px solid var(--line)' }}>
        <div>
          <Eyebrow>Cash record</Eyebrow>
          <Display as="h2" className="text-lg mt-1" style={{ color: 'var(--ink)', fontWeight: 600 }}>{title}</Display>
        </div>
        {showViewAll && (
          <button onClick={onViewAll} className="flex items-center gap-1 text-[11px] tracking-[0.1em] uppercase hover:gap-2 transition-all" style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--brass)' }}>
            View all <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="hidden md:grid grid-cols-[1fr_1fr_1.4fr_0.9fr_0.9fr_0.7fr] gap-4 px-7 py-2.5" style={{ borderBottom: '1px solid var(--line)', background: 'var(--brass-wash)' }}>
        {['Receipt', 'Job card', 'Description', 'Amount', 'Date', ''].map((h) => <Eyebrow key={h}>{h}</Eyebrow>)}
      </div>
      {rows.length === 0 ? (
        <div className="px-7 py-10 text-center">
          <Wallet className="h-8 w-8 mx-auto" style={{ color: 'var(--muted)' }} />
          <p className="mt-3 text-[13px]" style={{ color: 'var(--muted)', fontFamily: "'Inter', sans-serif" }}>No payments recorded yet. When you make a payment, your receipt will appear here.</p>
        </div>
      ) : (
        rows.map((p, i) => (
          <div key={p.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1.4fr_0.9fr_0.9fr_0.7fr] gap-2 md:gap-4 px-7 py-4 items-center" style={{ borderBottom: i !== rows.length - 1 ? '1px solid var(--line)' : 'none' }}>
            <span className="text-[12px]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--muted)' }}>{p.id}</span>
            <span className="text-[13px] font-medium" style={{ color: 'var(--ink)', fontFamily: "'Inter', sans-serif" }}>{p.job}</span>
            <span className="text-[13px]" style={{ color: 'var(--muted)', fontFamily: "'Inter', sans-serif" }}>{p.label}</span>
            <span className="text-[13px] font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--ink)' }}>{formatPeso(p.amount)}</span>
            <span className="text-[12px]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--muted)' }}>{p.date ? (typeof p.date === 'string' && /^[A-Za-z]{3}/.test(p.date) ? p.date : new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })) : '—'}</span>
            <button onClick={() => printReceipt(p)} className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] hover:text-[#A9824F] transition-colors" style={{ color: 'var(--muted)' }}>
              <Download className="w-3.5 h-3.5" strokeWidth={1.6} /> Receipt
            </button>
          </div>
        ))
      )}
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

const UNIFORM_CATEGORIES = ['Regular University Uniform', 'Departmental Uniform', 'PE Uniform', 'Sports / Intramural Jersey', 'Custom/Bespoke Apparel', 'Not Applicable'];
const STYLE_DESIGNS = ['Classic', 'Modern', 'Embroidered', 'Minimalist', 'Traditional', 'Ruffled', 'Fitted', 'Loose fit'];
const GARMENT_BASE_PRICE = {
  'Barong Tagalog': 2500,
  'Two-piece Suit': 4800,
  "Women's Coat": 3500,
  'Evening Gown': 5000,
  'School Uniform Set': 1800,
  'Filipiniana Dress': 4000,
  'Custom garment': 3000,
};

function FormLabel({ children }) {
  return <label className="block mb-1.5"><Eyebrow>{children}</Eyebrow></label>;
}

function CatalogView({ catalog, onOrderPlaced }) {
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [fabrics, setFabrics] = useState([]);
  const [requestForm, setRequestForm] = useState({
    garmentType: '',
    uniformCategory: UNIFORM_CATEGORIES[0],
    styleDesign: '',
    fabric: '',
    fabricQuantity: '',
    quantity: 1,
    specialInstructions: '',
    targetCompletionDate: '',
    measuringVisitDate: '',
  });
  const item = catalog.find((garment) => garment.name === selected);

  // Load the fabric catalogue (from the shared inventory) so the customer picks
  // a fabric that actually exists on the shelf.
  useEffect(() => {
    fetch(`${API_URL}/auth/catalog/fabrics`, { headers: { Authorization: `Bearer ${authToken()}` } })
      .then(async (response) => (response.ok ? response.json() : { fabrics: [] }))
      .then((data) => setFabrics(Array.isArray(data.fabrics) ? data.fabrics : []))
      .catch(() => setFabrics([]));
  }, []);

  // Fabric chips on every card come from the real shelf inventory
  // (fabric_inventory), so the card matches what the customer can actually
  // order. Falls back to the stored catalog fabrics if inventory is unavailable.
  const shelfChips = fabrics.map((f) => `${f.fabricName}${f.tone ? ` — ${f.tone}` : ''}`);
  const chipLimit = 3;

  const openRequest = (garment) => {
    setSubmitError('');
    setSubmitted(null);
    setRequestForm((current) => ({
      ...current,
      garmentType: garment.name,
      fabric: current.fabric || (garment.fabrics && garment.fabrics.length ? garment.fabrics[0] : (fabrics.length ? fabrics[0].fabricName : '')),
    }));
    setSelected(garment.name);
  };

  const setForm = (patch) => setRequestForm((current) => ({ ...current, ...patch }));

  const basePrice = GARMENT_BASE_PRICE[requestForm.garmentType] || 3000;
  const qty = Math.max(1, requestForm.quantity || 1);
  const totalAmount = basePrice * qty;
  const depositRequired = totalAmount * 0.5;
  const remainingBalance = totalAmount * 0.5;

  // Place the order LIVE through the server (Browse Garments → Front Desk →
  // Master Tailor). A customer with a remaining balance may still order.
  const submitRequest = async (event) => {
    event.preventDefault();
    if (!requestForm.garmentType) { setSubmitError('Please select a garment type.'); return; }
    if (!requestForm.targetCompletionDate) { setSubmitError('Please set a target completion date.'); return; }
    if (!requestForm.measuringVisitDate) { setSubmitError('Please choose the date you will visit the shop for measuring.'); return; }
    const payload = {
      garmentType: requestForm.garmentType,
      uniformCategory: requestForm.uniformCategory,
      styleDesign: requestForm.styleDesign,
      fabric: requestForm.fabric,
      fabricQuantity: parseFloat(requestForm.fabricQuantity) || 0,
      quantity: qty,
      specialInstructions: requestForm.specialInstructions,
      targetCompletionDate: requestForm.targetCompletionDate,
      measuringVisitDate: requestForm.measuringVisitDate,
    };
    setSubmitError('');
    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/auth/customer/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setSubmitError(data.message || 'Unable to place your order. Please try again.');
        return;
      }
      const jobLabel = data.job_card_id || payload.garmentType;
      const visitLabel = requestForm.measuringVisitDate ? new Date(`${requestForm.measuringVisitDate}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : null;
      setSubmitted({ job: jobLabel, deposit: Number(data.deposit_required ?? depositRequired) || depositRequired, visitLabel });
      setNotice(`Order ${jobLabel} submitted — a tailor has been assigned and a deposit of ${formatPeso(data.deposit_required ?? depositRequired)} (50%) is due. Please visit our shop so the Front Desk can record your measurements and collect the deposit before production begins.`);
      window.setTimeout(() => setNotice(''), 8000);
      // Refresh the customer's live data so My Orders / Dashboard show the new job card immediately.
      if (onOrderPlaced) onOrderPlaced();
    } catch (e) {
      setSubmitError('Unable to reach the server. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
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
              <div className="mt-4 flex flex-wrap gap-2">
                {(garment.fabrics && garment.fabrics.length ? garment.fabrics : shelfChips).slice(0, chipLimit).map((fabric) => <span key={fabric} className="rounded-full px-2.5 py-1 text-[10px]" style={{ color: 'var(--muted)', background: 'var(--paper)', border: '1px solid var(--line)' }}>{fabric}</span>)}
                {(garment.fabrics && garment.fabrics.length ? garment.fabrics : shelfChips).length > chipLimit && <span className="rounded-full px-2.5 py-1 text-[10px]" style={{ color: 'var(--brass)', background: 'var(--paper)', border: '1px solid var(--line)' }}>+{(garment.fabrics && garment.fabrics.length ? garment.fabrics : shelfChips).length - chipLimit} more available</span>}
              </div>
              <button onClick={() => openRequest(garment)} className="mt-6 inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-white" style={{ background: 'var(--navy)' }}><ShoppingBag className="h-4 w-4" /> Request custom order</button>
            </div>
          </article>
        ))}
      </div>
      {item && <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <button onClick={() => setSelected(null)} aria-label="Close order request" className="absolute inset-0 bg-black/45 backdrop-blur-sm" />
        <form onSubmit={submitRequest} className="relative w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
          <div className="flex items-center justify-between px-7 sm:px-9 pt-7 pb-2">
            <Eyebrow>Custom order request</Eyebrow>
            <button type="button" onClick={() => setSelected(null)} className="p-1 rounded-full" style={{ color: 'var(--muted)' }}><X className="h-5 w-5" /></button>
          </div>
          <div className="px-7 sm:px-9 pb-9 pt-2">
            {submitted ? (
              <div className="text-center py-6">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full" style={{ background: 'rgba(75,120,86,0.12)', color: 'var(--success)' }}>
                  <Check className="h-7 w-7" strokeWidth={2} />
                </div>
                <h3 className="mt-4 text-2xl" style={{ fontFamily: "'Fraunces', serif", color: 'var(--ink)' }}>Order submitted</h3>
                <p className="mt-1 text-[13px]" style={{ color: 'var(--muted)' }}>
                  Job card <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--ink)' }}>{submitted.job}</span> has been created and a tailor has been assigned.
                </p>
                <div className="mt-6 flex items-start gap-3 rounded-xl px-4 py-3.5 text-left" style={{ background: 'var(--brass-wash)', border: '1px solid rgba(169,130,79,0.28)' }}>
                  <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--brass)', color: '#fff' }}>
                    <Ruler className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>Please visit the shop{submitted.visitLabel ? ` on ${submitted.visitLabel}` : ''} so we can measure you</p>
                    <p className="mt-1 text-[12.5px] leading-relaxed" style={{ color: 'var(--muted)' }}>
                      Your measurements must be recorded at the Front Desk before a tailor can begin. When you drop by on your chosen date, we'll take your measurements and collect the <strong style={{ color: 'var(--ink)' }}>50% deposit ({formatPeso(submitted.deposit)})</strong> to start production.
                    </p>
                  </div>
                </div>
                <button type="button" onClick={() => { setSubmitted(null); setSelected(null); }} className="mt-7 inline-flex items-center gap-2 rounded-md px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-white" style={{ background: 'var(--navy)' }}>Done</button>
              </div>
            ) : (
            <>
            <h2 className="text-3xl leading-tight mb-2" style={{ fontFamily: "'Fraunces', serif", color: 'var(--ink)' }}>Create Custom Order</h2>
            <p className="text-[14px] font-light mb-4 leading-relaxed" style={{ color: 'var(--muted)' }}>
              Your request becomes a job card that Front Desk reviews, a tailor is assigned, and a 50% deposit is collected at the Front Desk.
            </p>

            {submitError && (
              <div className="border px-4 py-3 rounded-lg text-sm mb-6" style={{ borderColor: '#C86A5822', background: '#FDF4F2', color: '#9A3B2A' }}>{submitError}</div>
            )}

            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                <div>
                  <FormLabel>Garment type</FormLabel>
                  <select value={requestForm.garmentType} onChange={(e) => setForm({ garmentType: e.target.value })} className="input-field">
                    {catalog.map((g) => <option key={g.name} value={g.name}>{g.name}</option>)}
                  </select>
                </div>
                <div>
                  <FormLabel>Uniform category</FormLabel>
                  <select value={requestForm.uniformCategory} onChange={(e) => setForm({ uniformCategory: e.target.value })} className="input-field">
                    {UNIFORM_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                <div>
                  <FormLabel>Style / design</FormLabel>
                  <select value={requestForm.styleDesign} onChange={(e) => setForm({ styleDesign: e.target.value })} className="input-field">
                    <option value="">Select a style</option>
                    {STYLE_DESIGNS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <FormLabel>Fabric</FormLabel>
                  <select value={requestForm.fabric} onChange={(e) => setForm({ fabric: e.target.value })} className="input-field">
                    <option value="">Select a fabric</option>
                    {fabrics.length > 0
                      ? fabrics.map((f) => <option key={f.id} value={f.fabricName}>{f.fabricName}{f.tone ? ` — ${f.tone}` : ''} ({f.unit})</option>)
                      : (item.fabrics || []).map((fabric) => <option key={fabric} value={fabric}>{fabric}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                <div>
                  <FormLabel>Fabric quantity</FormLabel>
                  <input type="number" min="0" step="0.5" value={requestForm.fabricQuantity} onChange={(e) => setForm({ fabricQuantity: e.target.value })} placeholder="2.5" className="input-field" />
                </div>
                <div>
                  <FormLabel>Quantity</FormLabel>
                  <input type="number" min="1" value={requestForm.quantity} onChange={(e) => setForm({ quantity: parseInt(e.target.value) || 1 })} className="input-field" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                <div>
                  <FormLabel>When will you visit for measuring?</FormLabel>
                  <input type="date" min={new Date().toISOString().slice(0, 10)} value={requestForm.measuringVisitDate} onChange={(e) => setForm({ measuringVisitDate: e.target.value })} className="input-field" />
                </div>
                <div>
                  <FormLabel>Preferred completion date</FormLabel>
                  <input required type="date" value={requestForm.targetCompletionDate} onChange={(e) => setForm({ targetCompletionDate: e.target.value })} className="input-field" />
                </div>
                <div>
                  <FormLabel>Garment preview</FormLabel>
                  <div className="flex items-center gap-3 rounded-xl px-4 py-3 border" style={{ borderColor: 'var(--line)', background: 'var(--paper)' }}>
                    <img src={item.image} alt={requestForm.garmentType} className="h-16 w-14 rounded-md object-cover" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold" style={{ fontFamily: "'Fraunces', serif", color: 'var(--ink)' }}>{requestForm.garmentType}</p>
                      <p className="mt-0.5 text-[11px] uppercase tracking-[0.08em]" style={{ color: 'var(--muted)' }}>{requestForm.uniformCategory}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <FormLabel>Special instructions</FormLabel>
                <textarea value={requestForm.specialInstructions} onChange={(e) => setForm({ specialInstructions: e.target.value })} rows={2} placeholder="Fit, event date, preferred details..." className="input-field resize-none" />
              </div>

              <div className="rounded-lg p-4 space-y-2" style={{ border: '1px solid var(--line)', background: 'var(--paper)' }}>
                <div className="flex justify-between text-sm"><span style={{ color: 'var(--muted)' }}>Estimated total</span><span className="font-semibold" style={{ color: 'var(--ink)' }}>{formatPeso(totalAmount)}</span></div>
                <div className="flex justify-between text-sm"><span style={{ color: 'var(--muted)' }}>Deposit due (50%)</span><span className="font-semibold" style={{ color: 'var(--brass)' }}>{formatPeso(depositRequired)}</span></div>
                <div className="flex justify-between text-sm"><span style={{ color: 'var(--muted)' }}>Balance after deposit</span><span className="font-semibold" style={{ color: 'var(--ink)' }}>{formatPeso(remainingBalance)}</span></div>
              </div>

              <div className="mt-6 flex gap-3 justify-end pt-3" style={{ borderTop: '1px solid var(--line)' }}>
                <button type="button" onClick={() => setSelected(null)} className="rounded-md px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.13em]" style={{ color: 'var(--muted)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-md px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-white disabled:opacity-60" style={{ background: 'var(--navy)' }}>
                  {submitting ? 'Submitting…' : 'Submit order'}
                </button>
              </div>
            </div>
            </>
            )}
          </div>
        </form>
      </div>}
    </div>
  );
}

/* ============================================================
   ORDERS VIEW
============================================================= */
/* Maps a real order row from the backend into the card shape this view renders. */
function stageIndexForCustomer(stage) {
  const map = { Measuring: 0, 'Pattern Cutting': 1, 'Initial Assembly': 2, 'First Fitting': 3, 'Final Alterations': 4, 'Quality Review': 4, Completed: 5, 'Ready for Pickup': 6, Released: 6 };
  return map[stage] ?? 0;
}
function swatchForFabric(fabric) {
  const name = String(fabric || '').trim();
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) % 360;
  const hue = name ? hash : 42;
  return { swatchA: `hsl(${hue}, 32%, 74%)`, swatchB: `hsl(${hue}, 42%, 42%)` };
}
function customerOrderFromRow(row) {
  const paid = Number(row.paid || 0);
  const balance = Number(row.balance || 0);
  const status = row.status === 'Released' ? 'Released' : row.status === 'Ready for Pickup' ? 'Ready for pickup' : 'In progress';
  return {
    id: row.id,
    garment: row.garment || 'Custom garment',
    fabric: row.fabric || 'Fabric to be selected',
    stage: row.stage || '',
    ...swatchForFabric(row.fabric),
    stageIndex: stageIndexForCustomer(row.stage),
    measuringVisit: row.measuringVisit ? new Date(`${String(row.measuringVisit).slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null,
    due: row.due ? new Date(row.due).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'To be scheduled',
    balance,
    total: paid + balance,
    status,
    notes: row.notes || 'No special instructions recorded for this order.',
  };
}

function OrdersView({ orders = [], onBrowseGarments }) {
  const [openId, setOpenId] = useState(null);
  const open = orders.find((o) => o.id === openId);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Order studio" title="My Orders" sub="Follow each garment from the first measurement to final pickup." icon={Shirt} />
      {orders.length === 0 ? (
        <div className="atelier-card p-10 text-center">
          <Shirt className="w-8 h-8 mx-auto" style={{ color: 'var(--brass)' }} />
          <Display as="h3" className="text-lg mt-3" style={{ color: 'var(--ink)', fontWeight: 600 }}>No orders yet</Display>
          <p className="text-[13px] mt-1" style={{ color: 'var(--muted)', fontFamily: "'Inter', sans-serif" }}>When you request a garment it will appear here so you can follow it from measurement to pickup.</p>
          {onBrowseGarments && (
            <button onClick={onBrowseGarments} className="mt-5 px-5 py-2.5 rounded-full text-[12px] tracking-[0.08em] uppercase" style={{ background: 'var(--brass)', color: '#fff', fontFamily: "'IBM Plex Mono', monospace" }}>Browse garments</button>
          )}
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {orders.map((o, i) => (
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
            {o.measuringVisit && o.stage === 'Measuring' && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px]" style={{ background: 'var(--brass-wash)', color: 'var(--brass)', border: '1px solid rgba(169,130,79,0.28)' }}>
                <CalendarClock className="w-3 h-3" /> Measuring visit: {o.measuringVisit}
              </div>
            )}
            <div className="mt-5 pt-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--line)' }}>
              <div>
                <Eyebrow>Stage</Eyebrow>
                <p className="text-[13px] font-medium mt-0.5" style={{ color: 'var(--ink)' }}>{o.stage || STAGES[o.stageIndex]}</p>
              </div>
              <ChevronRight className="w-5 h-5" style={{ color: 'var(--brass)' }} />
            </div>
          </button>
        ))}
      </div>
      )}

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
  const [appointments, setAppointments] = useState([]);
  const [schedulable, setSchedulable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [schedJob, setSchedJob] = useState(null);
  const [form, setForm] = useState({ date: '', time: '', type: 'First Fitting' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const loadAppointments = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/customer/my-appointments`, { headers: { Authorization: `Bearer ${authToken()}` } });
      const data = await res.json();
      if (!res.ok) { if (res.status === 401) { setError('Your session has expired. Please sign in again.'); return; } throw new Error(data.message || 'Unable to load appointments.'); }
      setAppointments(data.appointments || []);
      setSchedulable(data.schedulable || []);
      setError('');
    } catch (e) {
      setError(e.message || 'Unable to load appointments.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadAppointments(); }, []);

  const fmt = (iso) => {
    if (!iso) return { date: '—', time: '—', day: '', month: '' };
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return { date: '—', time: '—', day: '', month: '' };
    return {
      date: d.toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' }),
      time: d.toLocaleTime(['en-US'], { hour: '2-digit', minute: '2-digit' }),
      day: d.getDate().toString().padStart(2, '0'),
      month: d.toLocaleDateString('en-PH', { month: 'short' }).toUpperCase(),
    };
  };

  const openSchedule = (job) => { setSchedJob(job); setForm({ date: '', time: '', type: job.stage === 'Final Alterations' ? 'Final Fitting' : 'First Fitting' }); setFormError(''); setActionMsg(''); };
  const closeSchedule = () => { setSchedJob(null); setSubmitting(false); setFormError(''); };

  const submitSchedule = async (e) => {
    e.preventDefault();
    if (!form.date || !form.time) { setFormError('Pick a date and time for the fitting.'); return; }
    setSubmitting(true);
    setFormError('');
    try {
      const res = await fetch(`${API_URL}/auth/customer/my-appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
        body: JSON.stringify({ jobCardNumber: schedJob.id, appointmentDate: form.date, appointmentTime: form.time, appointmentType: form.type }),
      });
      const data = await res.json();
      if (!res.ok) { if (res.status === 401) { setFormError('Your session expired. Please sign in again.'); return; } throw new Error(data.message || 'Unable to schedule the fitting.'); }
      setActionMsg(data.message || 'Fitting scheduled. You can confirm it below when you arrive.');
      closeSchedule();
      await loadAppointments();
    } catch (err) {
      setFormError(err.message || 'Unable to schedule the fitting.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmAttendance = async (id) => {
    try {
      const res = await fetch(`${API_URL}/auth/customer/my-appointments/${id}/confirm`, { method: 'POST', headers: { Authorization: `Bearer ${authToken()}` } });
      const data = await res.json();
      if (!res.ok) { if (res.status === 401) { setError('Your session expired. Please sign in again.'); return; } throw new Error(data.message || 'Unable to confirm.'); }
      await loadAppointments();
    } catch (err) {
      setActionMsg(err.message || 'Unable to confirm attendance.');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Fitting calendar" title="Appointments" sub="Schedule and confirm your fitting appointments so the tailor knows when you will be in." icon={CalendarClock} />
      {error && <div className="px-4 py-3 rounded-lg text-[13px]" style={{ background: 'rgba(160,82,45,0.08)', color: 'var(--rust)', border: '1px solid rgba(160,82,45,0.25)' }}>{error}</div>}
      {schedulable.length > 0 && (
        <div className="rise atelier-card p-6" style={{ animationDelay: '0.04s', borderColor: 'var(--line)' }}>
          <Eyebrow tone="var(--brass)">Ready for a fitting</Eyebrow>
          <Display as="h2" className="text-lg mt-1" style={{ color: 'var(--ink)', fontWeight: 600 }}>Schedule a fitting</Display>
          <div className="space-y-3 mt-3">
            {schedulable.map((job) => (
              <div key={job.id} className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg" style={{ border: '1px solid var(--line)', background: 'var(--paper)' }}>
                <div>
                  <div className="flex items-center gap-2"><Eyebrow>{job.id}</Eyebrow><StatusPill status={job.stage} /></div>
                  <Display as="div" className="text-[15px] mt-0.5" style={{ color: 'var(--ink)', fontWeight: 600 }}>{job.garment}</Display>
                  <p className="text-[12px]" style={{ color: 'var(--muted)' }}>{job.fabric}</p>
                </div>
                <button onClick={() => openSchedule(job)} className="px-4 py-2 rounded-md text-[10px] font-semibold uppercase tracking-[0.12em] text-white" style={{ background: 'var(--ink)' }}>Schedule fitting</button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="rise atelier-card divide-y" style={{ animationDelay: '0.08s', borderColor: 'var(--line)' }}>
        {loading && <div className="p-6 text-[13px]" style={{ color: 'var(--muted)' }}>Loading…</div>}
        {!loading && appointments.length === 0 && <div className="p-6 text-[13px]" style={{ color: 'var(--muted)' }}>No appointments yet. Schedule one above once a garment is ready.</div>}
        {appointments.map((a, i) => {
          const fd = fmt(a.appointment_at);
          const canConfirm = a.status === 'Scheduled' || a.status === 'Rescheduled';
          return (
            <div key={a.id ?? i} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6" style={{ borderBottom: i !== appointments.length - 1 ? '1px solid var(--line)' : 'none' }}>
              <div className="flex gap-5">
                <div className="text-center pr-5" style={{ borderRight: '1px solid var(--line)' }}>
                  <Display as="span" className="block text-2xl" style={{ color: 'var(--ink)', fontWeight: 600 }}>{fd.day}</Display><Eyebrow>{fd.month}</Eyebrow>
                </div>
                <div>
                  <Eyebrow>{a.job_card_number}</Eyebrow>
                  <Display as="h2" className="text-lg mt-0.5" style={{ color: 'var(--ink)', fontWeight: 600 }}>{a.appointment_type}</Display>
                  <p className="text-[13px] mt-0.5" style={{ color: 'var(--muted)' }}>{fd.date} · {fd.time}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <StatusPill status={a.status} />
                {canConfirm ? (
                  <button onClick={() => confirmAttendance(a.id)} className="px-4 py-2 rounded-md text-[10px] font-semibold uppercase tracking-[0.12em] text-white" style={{ background: 'var(--ink)' }}>Confirm</button>
                ) : a.status === 'Confirmed' ? (
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: 'var(--success)' }}><Check className="w-4 h-4" /> Confirmed</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      {schedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(20,23,31,0.5)' }} onClick={closeSchedule}>
          <div className="w-full max-w-md atelier-card p-6" style={{ background: 'var(--card)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <Eyebrow tone="var(--brass)">Fitting for {schedJob.id}</Eyebrow>
                <Display as="h2" className="text-lg mt-1" style={{ color: 'var(--ink)', fontWeight: 600 }}>{schedJob.garment}</Display>
                <p className="text-[12.5px]" style={{ color: 'var(--muted)' }}>{schedJob.fabric} · {schedJob.stage}</p>
              </div>
              <button onClick={closeSchedule} aria-label="Close" style={{ color: 'var(--muted)' }}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={submitSchedule} className="mt-5 space-y-4">
              <label className="block">
                <Eyebrow>Appointment type</Eyebrow>
                <select className="input-field mt-1.5" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                  <option value="First Fitting">First Fitting</option>
                  <option value="Final Fitting">Final Fitting</option>
                </select>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="block"><Eyebrow>Date</Eyebrow><input type="date" className="input-field mt-1.5" value={form.date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></label>
                <label className="block"><Eyebrow>Time</Eyebrow><input type="time" className="input-field mt-1.5" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} /></label>
              </div>
              {formError && <div className="px-3 py-2.5 rounded-md text-[12.5px]" style={{ background: 'rgba(160,82,45,0.08)', color: 'var(--rust)', border: '1px solid rgba(160,82,45,0.25)' }}>{formError}</div>}
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={closeSchedule} className="px-4 py-2 rounded-md text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--muted)', border: '1px solid var(--line)' }}>Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 rounded-md text-[10px] font-semibold uppercase tracking-[0.12em] text-white disabled:opacity-60" style={{ background: 'var(--ink)' }}>{submitting ? 'Scheduling…' : 'Schedule fitting'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   PAYMENTS VIEW
============================================================= */
function PaymentsView({ payments = [], orders = [], customerName = '' }) {
  // Real server data only — no demo fallback. If the customer has no payments,
  // the ledger renders its "No payments recorded yet" empty state.
  const livePayments = payments;
  const liveOrders = orders;
  const paid = livePayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const outstanding = liveOrders.reduce((sum, o) => sum + (Number(o.balance) || 0), 0);
  const byJob = liveOrders.map((o) => {
    const total = Number(o.total ?? ((Number(o.paid) || 0) + (Number(o.balance) || 0))) || 0;
    return { job: o.id, paid: Math.max(0, total - (Number(o.balance) || 0)) };
  }).filter((j) => j.paid > 0);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Billing history" title="Payments" sub="A clear record of every payment received for your garments." icon={Wallet} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Kpi icon={TrendingUp} tone="var(--success)" label="Paid to date" value={formatPeso(paid)} sub="Across all orders" delay="0s" />
        <Kpi icon={Wallet} tone="var(--rust)" label="Outstanding balance" value={formatPeso(outstanding)} sub="Due on release" delay="0.06s" />
        <Kpi icon={PackageCheck} tone="var(--navy)" label="Receipts" value={String(livePayments.length)} sub="On file" delay="0.12s" />
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

      <PaymentLedger payments={livePayments} title="Payment activity" customerName={customerName} />
    </div>
  );
}

/* ============================================================
   SETTINGS VIEW
============================================================= */
function SettingsView({ profile, onProfileSaved, onUnauthorized }) {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileForm, setProfileForm] = useState(() => ({
    name: profile?.full_name || profile?.name || '',
    email: profile?.email || '',
    phone: profile?.contact_number || '',
    dateOfBirth: dateForInput(profile?.date_of_birth),
    gender: profile?.gender || '',
    civilStatus: profile?.civil_status || '',
    occupation: profile?.occupation || '',
  }));
  const [profileDraft, setProfileDraft] = useState(profileForm);
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [prefs, setPrefs] = useState({ reminders: true, updates: true });

  useEffect(() => {
    const current = {
      name: profile?.full_name || profile?.name || '',
      email: profile?.email || '',
      phone: profile?.contact_number || '',
      dateOfBirth: dateForInput(profile?.date_of_birth),
      gender: profile?.gender || '',
      civilStatus: profile?.civil_status || '',
      occupation: profile?.occupation || '',
    };
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
      const response = await fetch(`${API_URL}/auth/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
        body: JSON.stringify({
          fullName: profileDraft.name,
          email: profileDraft.email,
          contactNumber: profileDraft.phone,
          dateOfBirth: profileDraft.dateOfBirth,
          gender: profileDraft.gender,
          civilStatus: profileDraft.civilStatus,
          occupation: profileDraft.occupation,
        }),
      });
      const data = await response.json();
      if (!response.ok) { if (response.status === 401) onUnauthorized(); throw new Error(data.message || 'Unable to save profile.'); }
      const saved = { ...data.user, name: data.user.full_name };
      setProfileForm({
        name: saved.full_name || '',
        email: saved.email || '',
        phone: saved.contact_number || '',
        dateOfBirth: dateForInput(saved.date_of_birth),
        gender: saved.gender || '',
        civilStatus: saved.civil_status || '',
        occupation: saved.occupation || '',
      });
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

          <div className="mt-6 pt-5" style={{ borderTop: '1px solid var(--line)' }}>
            <Eyebrow>Basic information</Eyebrow>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <BirthDateField value={profileDraft.dateOfBirth} onChange={(v) => setProfileDraft({ ...profileDraft, dateOfBirth: v })} disabled={!isEditingProfile} />
            <ProfileSelect label="Gender" value={profileDraft.gender} onChange={(v) => setProfileDraft({ ...profileDraft, gender: v })} disabled={!isEditingProfile} options={['Female', 'Male', 'Non-binary', 'Prefer not to say']} />
            <ProfileSelect label="Civil status" value={profileDraft.civilStatus} onChange={(v) => setProfileDraft({ ...profileDraft, civilStatus: v })} disabled={!isEditingProfile} options={['Single', 'Married', 'Widowed', 'Separated']} />
            <ProfileField label="Occupation" value={profileDraft.occupation} onChange={(v) => setProfileDraft({ ...profileDraft, occupation: v })} disabled={!isEditingProfile} />
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
  const [profileLoadError, setProfileLoadError] = useState('');
  const [catalog, setCatalog] = useState(() => getCatalog());
  const [customerOrders, setCustomerOrders] = useState([]);
  const [customerPayments, setCustomerPayments] = useState<any[]>([]);
  const [customerMeasurements, setCustomerMeasurements] = useState<any[]>([]);
  const [customerAppointments, setCustomerAppointments] = useState<any[]>([]);
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
        if (data.user) {
          setProfile((current) => ({ ...current, ...data.user }));
          setProfileLoadError('');
        }
      })
      .catch(() => setProfileLoadError('Unable to load your saved profile details. Please refresh after the server is running.'));
    loadCustomerData();
    fetch(`${API_URL}/auth/catalog`, { headers: { Authorization: `Bearer ${authToken()}` } })
      .then(async (response) => { if (!response.ok) throw new Error('Unable to load catalog.'); return response.json(); })
      .then((data) => { if (Array.isArray(data.catalog)) setCatalog(data.catalog); })
      .catch(() => { /* Keep the bundled catalog if the server is unavailable. */ });
  }, [navigate]);

  // Re-fetch the customer's live data (orders, payments, measurements,
  // appointments) from the server — after an order is placed and whenever
  // they open a data view, so a fresh online order appears immediately.
  const loadCustomerData = () => {
    fetch(`${API_URL}/auth/customer/dashboard`, { headers: { Authorization: `Bearer ${authToken()}` } })
      .then(async (response) => {
        if (!response.ok) { if (response.status === 401) signOut(); throw new Error('Unable to load account profile.'); }
        return response.json();
      })
      .then((data) => {
        if (data.user) {
          setProfile((current) => ({ ...current, ...data.user }));
          setProfileLoadError('');
        }
        if (Array.isArray(data.orders)) setCustomerOrders(data.orders.map(customerOrderFromRow));
        if (Array.isArray(data.payments)) setCustomerPayments(data.payments);
        if (Array.isArray(data.measurements)) setCustomerMeasurements(data.measurements);
        if (Array.isArray(data.appointments)) setCustomerAppointments(data.appointments);
      })
      .catch(() => setProfileLoadError('Unable to load your saved profile details. Please refresh after the server is running.'));
  };

  useEffect(() => {
    if (view === 'orders' || view === 'dashboard' || view === 'payments') loadCustomerData();
  }, [view]);

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
      case 'dashboard': return <DashboardView catalog={catalog} onBrowseGarments={() => setView('catalog')} payments={customerPayments} orders={customerOrders} measurements={customerMeasurements} appointments={customerAppointments} onViewPayments={() => setView('payments')} customerName={customerName} />;
      case 'catalog': return <CatalogView catalog={catalog} onOrderPlaced={loadCustomerData} />;
      case 'orders': return <OrdersView orders={customerOrders} onBrowseGarments={() => setView('catalog')} />;
      case 'measurements': return <MeasurementsView />;
      case 'appointments': return <AppointmentsView />;
      case 'payments': return <PaymentsView payments={customerPayments} orders={customerOrders} customerName={customerName} />;
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
            <NotificationBell endpoint="/auth/customer/notifications" />
            <div className="h-6 w-px hidden sm:block" style={{ background: 'var(--line)' }} />
            <Eyebrow className="hidden sm:inline">{now.toLocaleString(undefined, { weekday: 'short', month: 'short', day: '2-digit', hour: 'numeric', minute: '2-digit' })}</Eyebrow>
          </div>
        </header>

        <main className="w-full px-6 sm:px-10 xl:px-12 py-10">
          {profileLoadError && (
            <div role="alert" className="mb-5 rounded-lg px-4 py-3 text-[13px]" style={{ color: 'var(--rust)', background: 'rgba(160,82,45,0.08)', border: '1px solid rgba(160,82,45,0.25)' }}>
              {profileLoadError}
            </div>
          )}
          {renderView()}
        </main>
      </div>
      {profileOpen && <CustomerProfileModal profile={profile} fallbackName={customerName} onClose={() => setProfileOpen(false)} onSave={(updated) => {
        setProfile((current) => ({ ...current, ...updated }));
        const storage = localStorage.getItem('authToken') ? localStorage : sessionStorage;
        storage.setItem('currentUser', JSON.stringify({ ...(sessionUser() || {}), ...updated }));
      }} onUnauthorized={signOut} />}
    </div>
  );
}

function CustomerProfileModal({ profile, fallbackName, onClose, onSave, onUnauthorized }) {
  const initialName = profile?.full_name || profile?.name || fallbackName;
  const initialForm = { name: initialName, email: profile?.email || '', contact: profile?.contact_number || profile?.contact || '', address: profile?.address || '', photo: profile?.profile_picture || '', dateOfBirth: dateForInput(profile?.date_of_birth), gender: profile?.gender || '', civilStatus: profile?.civil_status || '', occupation: profile?.occupation || '' };
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
      const response = await fetch(`${API_URL}/auth/profile`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` }, body: JSON.stringify({ fullName: form.name, email: form.email, contactNumber: form.contact, address: form.address, profilePicture: form.photo, dateOfBirth: form.dateOfBirth, gender: form.gender, civilStatus: form.civilStatus, occupation: form.occupation }) });
      const data = await response.json();
      if (!response.ok) { if (response.status === 401) onUnauthorized(); throw new Error(data.message || 'Unable to save profile.'); }
      const savedProfile = { ...data.user, name: data.user.full_name };
      setForm({ name: savedProfile.full_name || '', email: savedProfile.email || '', contact: savedProfile.contact_number || '', address: savedProfile.address || '', photo: savedProfile.profile_picture || '', dateOfBirth: dateForInput(savedProfile.date_of_birth), gender: savedProfile.gender || '', civilStatus: savedProfile.civil_status || '', occupation: savedProfile.occupation || '' });
      onSave(savedProfile); setNotice('Profile saved to your account.'); setIsEditing(false);
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

          <div className="mt-6 pt-5" style={{ borderTop: '1px solid var(--line)' }}>
            <Eyebrow>Basic information</Eyebrow>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <BirthDateField value={form.dateOfBirth} onChange={(value) => update('dateOfBirth', value)} disabled={!isEditing} />
              <ProfileSelect label="Gender" value={form.gender} onChange={(value) => update('gender', value)} disabled={!isEditing} options={['Female', 'Male', 'Non-binary', 'Prefer not to say']} />
              <ProfileSelect label="Civil status" value={form.civilStatus} onChange={(value) => update('civilStatus', value)} disabled={!isEditing} options={['Single', 'Married', 'Widowed', 'Separated']} />
              <ProfileField label="Occupation" value={form.occupation} onChange={(value) => update('occupation', value)} disabled={!isEditing} />
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

function BirthDateField({ value, onChange, disabled = false }) {
  return (
    <label className="block text-[12px] font-medium" style={{ color: 'var(--muted)', fontFamily: "'Inter', sans-serif" }}>
      Birth date
      <input
        required
        type="date"
        value={dateForInput(value)}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onClick={(event) => {
          if (!disabled && typeof event.currentTarget.showPicker === 'function') {
            try { event.currentTarget.showPicker(); } catch { /* Native picker is unavailable in some browsers. */ }
          }
        }}
        className="input-field mt-2"
        style={{ background: disabled ? 'var(--brass-wash)' : '#fff', color: disabled ? 'var(--muted)' : 'var(--ink)', cursor: disabled ? 'default' : 'pointer', borderColor: disabled ? 'var(--line)' : undefined }}
      />
      {!disabled && <span className="mt-1 block text-[10px]" style={{ color: 'var(--muted)' }}>Choose a new date from the calendar.</span>}
    </label>
  );
}

function ProfileSelect({ label, value, onChange, options, disabled = false }) {
  return <label className="block text-[12px] font-medium" style={{ color: 'var(--muted)', fontFamily: "'Inter', sans-serif" }}>{label}<select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="input-field mt-2" style={{ background: disabled ? 'var(--brass-wash)' : '#fff', color: disabled ? 'var(--muted)' : 'var(--ink)', cursor: disabled ? 'default' : 'pointer' }}><option value="">Not recorded</option>{options.map((option) => <option key={option}>{option}</option>)}</select></label>;
}
