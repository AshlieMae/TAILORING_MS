// @ts-nocheck
import { useEffect, useState } from 'react';
import { formatPHPExact as formatPeso, formatPHPCompact } from '../utils/currency';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Shirt, Ruler, CalendarClock, Wallet, Settings, Bell, Search,
  ChevronRight, Menu, X, PackageCheck, Download, LogOut, Sparkles, TrendingUp,
  Check, UserRound, Save, ArrowUpRight, Mail, Phone, MapPin, ShieldCheck, Pencil, Camera,
  Lock, Eye, EyeOff,
} from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, BarChart, Bar,
} from 'recharts';
import NotificationBell from '../components/NotificationBell';
import { OrderGarmentImage } from '../components/OrderGarmentImage';
import { productionTimeFor } from '../Pages_Frontdesk/garmentCatalogData';
import { resolveCatalogImageUrl } from '../utils/CatalogImage';

/* ============================================================
   ASHLIE'S TAILOR — Private Client Portal
   Premium atelier direction: ink + warm paper + brass, serif
   display type, real data visualization, soft realistic
   elevation instead of flat/illustrative styling.
============================================================= */

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Space+Mono:wght@400;700&display=swap');

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
.input-field {
  width: 100%; border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px;
  font-size: 13px; color: var(--ink); background: #fff; outline: none; transition: border-color .15s;
}
.input-field:focus { border-color: var(--brass); }
`;

/* ---------------- Type helpers ---------------- */
function Eyebrow({ children, className = '', tone = 'var(--muted)' }) {
  return (
    <span className={`text-[10px] tracking-[0.18em] uppercase ${className}`} style={{ fontFamily: "'Space Mono', monospace", color: tone }}>
      {children}
    </span>
  );
}
function Display({ children, className = '', as: Tag = 'h2', style = {} }) {
  return <Tag className={className} style={{ fontFamily: "'Fraunces', serif", fontOpticalSizing: 'auto', ...style }}>{children}</Tag>;
}

function cleanSpecialInstructions(value) {
  let text = String(value || '');
  for (let pass = 0; pass < 3 && /[ÃÂâ]/.test(text); pass += 1) {
    try {
      const repaired = decodeURIComponent(escape(text));
      if (repaired === text) break;
      text = repaired;
    } catch { break; }
  }
  text = text.replace(/Â·/g, ' · ').replace(/[ÂÃ]/g, '').replace(/\s*·\s*/g, ' · ').replace(/\s{2,}/g, ' ').trim();
  if (/Priority:/i.test(text) && /Preferred colour:/i.test(text)) {
    const priority = text.match(/Priority:\s*([A-Za-z]+)/i)?.[1];
    const colour = text.match(/Preferred colour:\s*(#[0-9a-f]{3,8})/i)?.[1];
    const parts = [priority && `Priority: ${priority}`, colour && `Preferred colour: ${colour}`];
    if (/Monogram/i.test(text)) parts.push('Monogram');
    if (/deadline/i.test(text)) parts.push('deadline');
    return parts.filter(Boolean).join(' · ');
  }
  return text;
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

/* ---------------- Session-neutral fallbacks (no fictional demo data) ---------------- */
const CUSTOMER = { name: '', email: '', memberSince: '', tier: '' };
const STAGES = ['Measuring', 'Pattern Cutting', 'Assembly', 'First Fitting', 'Final Alterations', 'Completed', 'Pickup'];

const NOTIF_META = {
  fitting: { icon: CalendarClock, tone: 'var(--navy)' },
  pickup: { icon: PackageCheck, tone: 'var(--success)' },
  reminder: { icon: Bell, tone: 'var(--rust)' },
};

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'catalog', label: 'Garment Catalog', icon: PackageCheck },
  { key: 'orders', label: 'My Orders', icon: Shirt },
  { key: 'measurements', label: 'Measurements', icon: Ruler },
  { key: 'appointments', label: 'Appointments', icon: CalendarClock },
  { key: 'payments', label: 'Payments', icon: Wallet },
  { key: 'settings', label: 'Settings', icon: Settings },
];

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
function DashboardView({ payments = [], onViewPayments, customerName = '', orders = [], measurements = [], appointments = [] }) {
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
            {/* The order's real garment photo — the same resolver and the same
                catalog framing the customer sees in every other view. This
                replaces the old generated fabric swatch. */}
            <div className="w-16 h-16 overflow-hidden rounded-lg flex-shrink-0" style={{ background: 'var(--paper)' }}>
              <OrderGarmentImage order={order} className="h-full w-full" />
            </div>
            <div className="flex-1 min-w-0">
              <Eyebrow>Garment on file</Eyebrow>
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
          <p className="text-[13px] mt-1 max-w-xs" style={{ color: 'var(--muted)' }}>Orders created with the Front Desk will appear here with their live production stage.</p>
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
                <YAxis tickLine={false} axisLine={false} width={44} tick={{ fill: 'var(--muted)', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }} tickFormatter={(v) => formatPHPCompact(v as number)} />
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

      <PaymentLedger payments={payments.slice(0, 3)} orders={orders} title="Payment history" showViewAll onViewAll={onViewPayments} customerName={customerName} />
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

function PaymentLedger({ payments, orders = [], title, showViewAll, onViewAll, customerName = '' }) {
  const [receipt, setReceipt] = useState<any>(null);
  const [search, setSearch] = useState('');
  const rows = (payments || []).map((p) => ({
    id: p.id || p.receipt || '',
    job: p.job || p.jobCardNumber || '—',
    item: p.garment || p.item || p.garmentName || orders.find((order) => String(order.id) === String(p.job || p.jobCardNumber))?.garment || '—',
    label: p.label || p.description || p.payment_type || 'Payment',
    amount: Number(p.amount || 0),
    date: p.date || p.paid_at || '',
  }));
  const normalizedSearch = search.trim().toLowerCase();
  const filteredRows = normalizedSearch
    ? rows.filter((row) => [row.id, row.job, row.item, row.label].some((value) => String(value || '').toLowerCase().includes(normalizedSearch)))
    : rows;

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
      <div class="row"><span>Item</span><span>${row.item}</span></div>
      <div class="row"><span>Description</span><span>${row.label}</span></div>
      <div class="row"><span>Customer</span><span>${customerName || '—'}</span></div>
      <div class="row"><span>Date</span><span>${dateStr}</span></div>
      <div class="amt">${formatPHPExact(row.amount)}</div>
      <div class="foot">Thank you for your business!</div>
    </div>
    </body></html>`);
    win.document.close();
  };

  return (
    <div className="rise atelier-card overflow-hidden" style={{ animationDelay: '0.42s' }}>
      <div className="flex items-center justify-between gap-4 px-7 py-6" style={{ borderBottom: '1px solid var(--line)' }}>
        <div>
          <Eyebrow>Cash record</Eyebrow>
          <Display as="h2" className="text-lg mt-1" style={{ color: 'var(--ink)', fontWeight: 600 }}>{title}</Display>
        </div>
        <div className="flex items-center gap-3">
          <label className="relative hidden sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search payments" aria-label="Search payments" className="h-9 w-48 rounded-full border bg-white pl-9 pr-3 text-[12px] outline-none transition-colors focus:border-[#A9824F]" style={{ borderColor: 'var(--line)', color: 'var(--ink)', fontFamily: "'Inter', sans-serif" }} />
          </label>
          {showViewAll && (
            <button onClick={onViewAll} className="flex items-center gap-1 text-[11px] tracking-[0.1em] uppercase hover:gap-2 transition-all" style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--brass)' }}>
              View all <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <div className="hidden md:grid grid-cols-[1fr_1fr_1.15fr_1.2fr_0.9fr_0.9fr_0.7fr] gap-4 px-7 py-2.5" style={{ borderBottom: '1px solid var(--line)', background: 'var(--brass-wash)' }}>
        {['Receipt', 'Job card', 'Item', 'Description', 'Amount', 'Date', ''].map((h) => <Eyebrow key={h}>{h}</Eyebrow>)}
      </div>
      {filteredRows.length === 0 ? (
        <div className="px-7 py-10 text-center">
          <Wallet className="h-8 w-8 mx-auto" style={{ color: 'var(--muted)' }} />
          <p className="mt-3 text-[13px]" style={{ color: 'var(--muted)', fontFamily: "'Inter', sans-serif" }}>{normalizedSearch ? 'No payments match your search.' : 'No payments recorded yet. When you make a payment, your receipt will appear here.'}</p>
        </div>
      ) : (
        filteredRows.map((p, i) => (
          <div key={p.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1.15fr_1.2fr_0.9fr_0.9fr_0.7fr] gap-2 md:gap-4 px-7 py-4 items-center" style={{ borderBottom: i !== filteredRows.length - 1 ? '1px solid var(--line)' : 'none' }}>
            <span className="text-[12px]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--muted)' }}>{p.id}</span>
            <span className="text-[13px] font-medium" style={{ color: 'var(--ink)', fontFamily: "'Inter', sans-serif" }}>{p.job}</span>
            <span className="text-[13px] font-medium" style={{ color: 'var(--ink)', fontFamily: "'Inter', sans-serif" }}>{p.item}</span>
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
   ORDERS VIEW
============================================================= */
/* Maps a real order row from the backend into the card shape this view renders. */
function stageIndexForCustomer(stage) {
  const map = { Measuring: 0, 'Pattern Cutting': 1, 'Initial Assembly': 2, 'First Fitting': 3, 'Final Alterations': 4, 'Quality Review': 4, Completed: 5, 'Ready for Pickup': 6, Released: 6 };
  return map[stage] ?? 0;
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
    catalog_item_id: row.catalog_item_id,
    order_type: row.order_type,
    reference_image: row.reference_image,
    catalog_image: row.catalog_image,
    catalog_image_zoom: row.catalog_image_zoom,
    catalog_image_pos_x: row.catalog_image_pos_x,
    catalog_image_pos_y: row.catalog_image_pos_y,
    catalog_image_crop_mode: row.catalog_image_crop_mode,
    stageIndex: stageIndexForCustomer(row.stage),
    measuringVisit: row.measuringVisit ? new Date(`${String(row.measuringVisit).slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null,
    due: row.due ? new Date(row.due).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'To be scheduled',
    balance,
    total: paid + balance,
    status,
    notes: row.notes || 'No special instructions recorded for this order.',
    created_at: row.created_at || null,
    quantity: row.quantity || 1,
    collar_type: row.collar_type,
    sleeve_type: row.sleeve_type,
    embroidery: row.embroidery,
    lining: row.lining,
    pocket_style: row.pocket_style,
    buttons: row.buttons,
    monogram: row.monogram,
    rush_order: row.rush_order,
    assigned_tailor: row.assigned_tailor,
    total_amount: row.total_amount,
  };
}

function OrdersView({ orders = [], payments = [], appointments = [], measurements = [] }) {
  const [openId, setOpenId] = useState(null);
  const open = orders.find((o) => o.id === openId);

  // KPIs
  const totalOrders = orders.length;
  const totalSpend = orders.reduce((s, o) => s + o.total, 0);
  const totalPaid = orders.reduce((s, o) => s + o.total - o.balance, 0);
  const totalBalance = orders.reduce((s, o) => s + o.balance, 0);
  const outstandingOrders = orders.filter((o) => o.balance > 0);
  const readyOrders = orders.filter((o) => o.status === 'Ready for pickup');

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Order studio" title="My Orders" sub="Follow each garment from the first measurement to final pickup." icon={Shirt} />
      
      {orders.length === 0 ? (
        <div className="atelier-card p-10 text-center">
          <Shirt className="w-8 h-8 mx-auto" style={{ color: 'var(--brass)' }} />
          <Display as="h3" className="text-lg mt-3" style={{ color: 'var(--ink)', fontWeight: 600 }}>No orders yet</Display>
          <p className="text-[13px] mt-1" style={{ color: 'var(--muted)', fontFamily: "'Inter', sans-serif" }}>Orders created with the Front Desk will appear here so you can follow them from measurement to pickup.</p>
        </div>
      ) : (
        <>
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
            <div className="atelier-card p-4">
              <div className="text-[11px] uppercase tracking-[0.08em]" style={{ color: 'var(--muted)' }}>Total Orders</div>
              <div className="text-2xl mt-1 font-semibold" style={{ color: 'var(--ink)', fontFamily: "'IBM Plex Mono', monospace" }}>{totalOrders}</div>
            </div>
            <div className="atelier-card p-4">
              <div className="text-[11px] uppercase tracking-[0.08em]" style={{ color: 'var(--muted)' }}>Total Spend</div>
              <div className="text-2xl mt-1 font-semibold" style={{ color: 'var(--ink)', fontFamily: "'IBM Plex Mono', monospace" }}>{formatPeso(totalSpend)}</div>
            </div>
            <div className="atelier-card p-4">
              <div className="text-[11px] uppercase tracking-[0.08em]" style={{ color: 'var(--muted)' }}>Amount Paid</div>
              <div className="text-2xl mt-1 font-semibold" style={{ color: 'var(--success)', fontFamily: "'IBM Plex Mono', monospace" }}>{formatPeso(totalPaid)}</div>
            </div>
            <div className="atelier-card p-4" style={{ borderColor: totalBalance > 0 ? 'var(--warning-border, #f5d39c)' : 'var(--line)', background: totalBalance > 0 ? 'var(--warning-bg, #fffdf7)' : 'var(--paper)' }}>
              <div className="text-[11px] uppercase tracking-[0.08em]" style={{ color: 'var(--muted)' }}>Outstanding</div>
              <div className="text-2xl mt-1 font-semibold" style={{ color: totalBalance > 0 ? 'var(--warning, #b37300)' : 'var(--success)', fontFamily: "'IBM Plex Mono', monospace" }}>{formatPeso(totalBalance)}</div>
            </div>
          </div>

          {/* Outstanding Balance Alert */}
          {outstandingOrders.length > 0 && (
            <div className="flex items-start gap-3 border px-5 py-4 mb-6" style={{ borderColor: 'var(--warning-border, #f5d39c)', background: 'var(--warning-bg, #fffdf7)', borderRadius: 12 }}>
              <div className="mt-0.5"><Wallet className="w-5 h-5" style={{ color: 'var(--warning, #b37300)' }} /></div>
              <div>
                <p className="text-[13px] font-semibold" style={{ color: 'var(--warning, #b37300)' }}>Outstanding Balance</p>
                <p className="mt-0.5 text-[12px]" style={{ color: 'var(--warning, #b37300)' }}>
                  You have <span className="font-semibold">{outstandingOrders.length} order{outstandingOrders.length !== 1 ? 's' : ''}</span> with a remaining balance of <span className="font-semibold">{formatPeso(totalBalance)}</span>. Please settle at the front desk before pickup.
                </p>
              </div>
            </div>
          )}

          {/* Ready For Pickup Banner */}
          {readyOrders.length > 0 && (
            <div className="flex items-center gap-3 border px-5 py-4 mb-6" style={{ borderColor: 'var(--success-border, #c3e6cb)', background: 'var(--success-bg, #f2fbf4)', borderRadius: 12 }}>
              <Check className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--success, #155724)' }} />
              <p className="text-[13px] font-medium" style={{ color: 'var(--success, #155724)' }}>
                <span className="font-semibold">{readyOrders.length} garment{readyOrders.length !== 1 ? 's' : ''}</span> {readyOrders.length === 1 ? 'is' : 'are'} ready for pickup. Please visit the front desk.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {orders.map((o, i) => {
              const paid = o.total - o.balance;
              const pLabel = o.balance === 0 ? 'FULLY PAID' : (paid > 0 ? 'PARTIAL' : 'BALANCE DUE');
              const pColor = o.balance === 0 ? 'var(--success)' : (paid > 0 ? 'var(--brass)' : 'var(--warning, #b37300)');
              const pBg = o.balance === 0 ? 'var(--success-bg, #f2fbf4)' : (paid > 0 ? 'var(--brass-wash)' : 'var(--warning-bg, #fffdf7)');
              
              const stageLabel = (o.stage || 'In progress').toUpperCase();
              const stageColor = 'var(--ink)';
              const stageBg = 'var(--paper)';
              
              return (
              <button key={o.id} onClick={() => setOpenId(o.id)} className="rise atelier-card text-left transition-transform hover:-translate-y-0.5 flex flex-col w-full overflow-hidden p-0" style={{ animationDelay: `${i * 0.06}s`, borderRadius: '16px' }}>
                
                {/* Garment image at the top */}
                <div className="relative h-44 w-full overflow-hidden flex-shrink-0 border-b" style={{ background: 'var(--paper)', borderColor: 'var(--line)' }}>
                  <OrderGarmentImage order={o} className="h-full w-full object-cover" />
                </div>
                
                {/* Card body */}
                <div className="flex flex-1 flex-col gap-0 p-5 w-full bg-white">
                  {/* Identity */}
                  <div className="mb-4">
                    <div className="text-[10.5px] uppercase tracking-[0.14em]" style={{ color: 'var(--muted)', fontFamily: "'IBM Plex Mono', monospace" }}>{o.id}</div>
                    <div className="mt-1.5 text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>{o.garment}</div>
                    {o.created_at && <div className="mt-1 text-[11px]" style={{ color: 'var(--muted)' }}>Ordered {new Date(o.created_at).toLocaleDateString()}</div>}
                  </div>
                  
                  {/* Financial Overview */}
                  <div className="grid grid-cols-3 gap-2 w-full mb-4">
                    <div>
                      <div className="text-[10px]" style={{ color: 'var(--muted)' }}>Total</div>
                      <div className="text-[12.5px] mt-0.5 font-semibold" style={{ color: 'var(--ink)', fontFamily: "'IBM Plex Mono', monospace" }}>{formatPHPCompact ? formatPHPCompact(o.total) : formatPeso(o.total)}</div>
                    </div>
                    <div>
                      <div className="text-[10px]" style={{ color: 'var(--muted)' }}>Paid</div>
                      <div className="text-[12.5px] mt-0.5 font-semibold" style={{ color: 'var(--success)', fontFamily: "'IBM Plex Mono', monospace" }}>{formatPHPCompact ? formatPHPCompact(paid) : formatPeso(paid)}</div>
                    </div>
                    <div>
                      <div className="text-[10px]" style={{ color: 'var(--muted)' }}>Balance</div>
                      <div className="text-[12.5px] mt-0.5 font-semibold" style={{ color: o.balance > 0 ? 'var(--warning, #b37300)' : 'var(--success)', fontFamily: "'IBM Plex Mono', monospace" }}>{formatPHPCompact ? formatPHPCompact(o.balance) : formatPeso(o.balance)}</div>
                    </div>
                  </div>

                  {o.measuringVisit && o.stage === 'Measuring' && (
                    <div className="mb-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px]" style={{ background: 'var(--brass-wash)', color: 'var(--brass)', border: '1px solid rgba(169,130,79,0.28)' }}>
                      <CalendarClock className="w-3 h-3" /> Measuring visit: {o.measuringVisit}
                    </div>
                  )}
                  
                  {/* Footer Badges */}
                  <div className="mt-auto pt-2 flex items-center gap-2 w-full">
                    <div className="inline-flex items-center rounded-md px-2 py-1 text-[9.5px] font-semibold uppercase tracking-wider" style={{ background: stageBg, color: stageColor, border: '1px solid var(--line)' }}>
                      {stageLabel}
                    </div>
                    <div className="inline-flex items-center rounded-md px-2 py-1 text-[9.5px] font-semibold uppercase tracking-wider" style={{ background: pBg, color: pColor, border: `1px solid ${pColor}33` }}>
                      {pLabel}
                    </div>
                  </div>
                </div>
              </button>
              );
            })}

          </div>
        </>
      )}

      {open && (() => {
        const orderPayments = (payments || []).filter((p) => {
          const pJob = String(p.job || p.jobCardNumber || '').trim();
          const oId = String(open.id || '').trim();
          return pJob === oId || pJob.endsWith(oId) || oId.endsWith(pJob);
        }).map((p) => ({
          id: p.id || p.receipt || '',
          label: p.label || p.description || p.payment_type || 'Payment',
          amount: Number(p.amount || 0),
          date: p.date || p.paid_at || '',
        }));
        const displayPaid = orderPayments.reduce((s, p) => s + p.amount, 0);
        const displayBalance = open.total - displayPaid;
        const isFullyPaid = displayBalance <= 0;
        const printOrderReceipt = (p) => {
          const dateStr = p.date ? new Date(p.date).toLocaleString('en-PH', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
          const win = window.open('', '_blank', 'width=480,height=640');
          if (!win) return;
          win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${p.id}</title><style>
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
            <div class="row"><span>Receipt No.</span><span>${p.id || '—'}</span></div>
            <div class="row"><span>Job Card</span><span>${open.id}</span></div>
            <div class="row"><span>Garment</span><span>${open.garment}</span></div>
            <div class="row"><span>Description</span><span>${p.label}</span></div>
            <div class="row"><span>Date</span><span>${dateStr}</span></div>
            <div class="amt">${formatPeso(p.amount)}</div>
            <div class="foot">Thank you for your business!</div>
          </div>
          </body></html>`);
          win.document.close();
        };
        const printOrderSummary = () => {
          const txRows = orderPayments.map((p) => {
            const d = p.date ? new Date(p.date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
            return `<div class="row"><span>${p.label}</span><span>${d}</span><span>${formatPeso(p.amount)}</span></div>`;
          }).join('');
          const now = new Date().toLocaleString('en-PH', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
          const win = window.open('', '_blank', 'width=600,height=820');
          if (!win) return;
          win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Order Summary - ${open.id}</title><style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
            *{box-sizing:border-box;margin:0;padding:0;}
            body{font-family:'Inter',sans-serif;color:#14171F;background:#fff;padding:40px 32px;}
            .wrap{max-width:520px;margin:0 auto;}
            .logo{font-size:22px;font-weight:700;letter-spacing:-0.5px;margin-bottom:2px;}
            .sub-logo{font-size:11px;color:#736B5E;margin-bottom:24px;letter-spacing:.08em;text-transform:uppercase;}
            .divider{border:none;border-top:2px solid #14171F;margin:18px 0;}
            .divider-light{border:none;border-top:1px dashed #E7E1D3;margin:10px 0;}
            .section-title{font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:#736B5E;margin-bottom:8px;font-weight:600;}
            .row{display:flex;justify-content:space-between;align-items:baseline;font-size:12.5px;padding:5px 0;gap:12px;}
            .row span:last-child{font-weight:600;text-align:right;white-space:nowrap;}
            .tx-head{display:grid;grid-template-columns:1fr auto auto;gap:12px;font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#736B5E;padding:6px 0;border-bottom:1px solid #E7E1D3;}
            .tx-row{display:grid;grid-template-columns:1fr auto auto;gap:12px;font-size:12.5px;padding:6px 0;border-bottom:1px dashed #E7E1D3;}
            .total-row{display:flex;justify-content:space-between;font-size:14px;font-weight:700;padding:8px 0;}
            .balance{font-size:12.5px;display:flex;justify-content:space-between;padding:4px 0;}
            .badge{display:inline-block;font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:2px 8px;border-radius:4px;margin-left:8px;}
            .paid-badge{background:#f2fbf4;color:#4B7856;border:1px solid #c3e6cb;}
            .partial-badge{background:#F3ECE0;color:#A9824F;border:1px solid rgba(169,130,79,0.35);}
            .due-badge{background:#fffdf7;color:#b37300;border:1px solid #f5d39c;}
            .notes{background:#F3ECE0;border-radius:8px;padding:14px;font-size:12px;color:#14171F;line-height:1.6;margin-top:4px;}
            .footer{text-align:center;font-size:10px;color:#736B5E;margin-top:28px;}
            button{position:fixed;top:12px;right:12px;background:#14171F;color:#fff;border:0;padding:8px 16px;font-size:12px;cursor:pointer;border-radius:6px;font-family:inherit;}
            @media print{button{display:none;}}
          </style></head><body>
          <button onclick="window.print()">Print / Save PDF</button>
          <div class="wrap">
            <div class="logo">Ashlie's Tailor</div>
            <div class="sub-logo">Private Client Portal &mdash; Order Summary</div>
            <hr class="divider" />
            <div class="section-title">Order Information</div>
            <div class="row"><span>Job Card</span><span>${open.id}</span></div>
            <div class="row"><span>Garment</span><span>${open.garment}</span></div>
            ${open.fabric ? `<div class="row"><span>Fabric</span><span>${open.fabric}</span></div>` : ''}
            ${open.order_type ? `<div class="row"><span>Type</span><span>${open.order_type}</span></div>` : ''}
            <div class="row"><span>Production Stage</span><span>${open.stage || 'Measuring'}</span></div>
            <div class="row"><span>Estimated Ready</span><span>${open.due}</span></div>
            <hr class="divider-light" />
            <div class="section-title">Financial Summary</div>
            <div class="row"><span>Order Total</span><span>${formatPeso(open.total)}</span></div>
            <div class="row"><span>Total Paid</span><span style="color:#4B7856">${formatPeso(displayPaid)}</span></div>
            <div class="row"><span>Balance Due</span><span style="color:${displayBalance > 0 ? '#b37300' : '#4B7856'}">${formatPeso(displayBalance)}</span></div>
            <hr class="divider-light" />
            <div class="section-title">Payment Transactions</div>
            ${orderPayments.length === 0
              ? '<p style="font-size:12px;color:#736B5E;padding:8px 0">No transactions recorded yet.</p>'
              : `<div class="tx-head"><span>Description</span><span>Date</span><span>Amount</span></div>${txRows}`
            }
            <div class="divider-light" style="margin-top:8px"></div>
            <div class="total-row"><span>Total Paid</span><span style="color:#4B7856">${formatPeso(displayPaid)}</span></div>
            ${open.notes && open.notes !== 'No special instructions recorded for this order.' ? `
            <hr class="divider-light" />
            <div class="section-title">Atelier Notes</div>
            <div class="notes">${cleanSpecialInstructions(open.notes)}</div>` : ''}
            <div class="footer">Generated ${now} &bull; Ashlie's Tailor &mdash; Private Client Portal</div>
          </div>
          </body></html>`);
          win.document.close();
        };
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button onClick={() => setOpenId(null)} className="absolute inset-0" style={{ background: 'rgba(20,23,31,0.62)' }} aria-label="Close" />
            <section className="relative w-full max-w-2xl atelier-card max-h-[92vh] overflow-y-auto" style={{ borderRadius: 18 }}>

              {/* Modal header with garment image */}
              <div className="relative h-48 w-full overflow-hidden flex-shrink-0" style={{ background: 'var(--paper)', borderRadius: '18px 18px 0 0' }}>
                <OrderGarmentImage order={open} className="h-full w-full object-cover" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(20,23,31,0.55) 100%)' }} />
                <button onClick={() => setOpenId(null)} className="absolute right-4 top-4 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(20,23,31,0.55)', color: '#fff' }}>
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-4 left-6">
                  <Eyebrow tone="rgba(255,255,255,0.7)">Order details · {open.id}</Eyebrow>
                  <Display as="h2" className="text-2xl" style={{ color: '#fff', fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>{open.garment}</Display>
                </div>
              </div>

              <div className="p-7 space-y-7">

                {/* Garment meta row */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    {open.fabric && <p className="text-[13px]" style={{ color: 'var(--muted)', fontFamily: "'Inter', sans-serif" }}><span className="font-medium" style={{ color: 'var(--ink)' }}>Fabric:</span> {open.fabric}</p>}
                    {open.order_type && <p className="text-[12px] mt-0.5" style={{ color: 'var(--muted)', fontFamily: "'Inter', sans-serif" }}>Type: {open.order_type}</p>}
                    {open.quantity > 1 && <p className="text-[12px] mt-0.5" style={{ color: 'var(--muted)', fontFamily: "'Inter', sans-serif" }}>Quantity: {open.quantity}</p>}
                    {open.assigned_tailor && <p className="text-[12px] mt-0.5" style={{ color: 'var(--muted)', fontFamily: "'Inter', sans-serif" }}>Tailor: {open.assigned_tailor}</p>}
                    {open.created_at && <p className="text-[12px] mt-0.5" style={{ color: 'var(--muted)', fontFamily: "'Inter', sans-serif" }}>Ordered: {new Date(open.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider" style={{ background: 'var(--paper)', color: 'var(--ink)', border: '1px solid var(--line)', fontFamily: "'IBM Plex Mono', monospace" }}>
                      {(open.stage || 'In progress').toUpperCase()}
                    </span>
                    <span className="inline-flex items-center rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider" style={{
                      background: isFullyPaid ? 'var(--success-bg, #f2fbf4)' : displayPaid > 0 ? 'var(--brass-wash)' : 'var(--warning-bg, #fffdf7)',
                      color: isFullyPaid ? 'var(--success)' : displayPaid > 0 ? 'var(--brass)' : 'var(--warning, #b37300)',
                      border: `1px solid ${isFullyPaid ? 'var(--success)' : displayPaid > 0 ? 'var(--brass)' : 'var(--warning, #b37300)'}33`,
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}>
                      {isFullyPaid ? 'Fully Paid' : displayPaid > 0 ? 'Partial Payment' : 'Balance Due'}
                    </span>
                  </div>
                </div>

                {/* Customization Details */}
                {(open.collar_type || open.sleeve_type || open.embroidery || open.lining || open.pocket_style || open.buttons || open.monogram || open.rush_order === 1) && (
                  <div>
                    <Eyebrow>Garment Customization</Eyebrow>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                      {open.collar_type && (
                        <div className="p-3.5 rounded-xl" style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}>
                          <Eyebrow>Collar</Eyebrow>
                          <p className="text-[13px] font-medium mt-1" style={{ color: 'var(--ink)', fontFamily: "'Inter', sans-serif" }}>{open.collar_type}</p>
                        </div>
                      )}
                      {open.sleeve_type && (
                        <div className="p-3.5 rounded-xl" style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}>
                          <Eyebrow>Sleeves</Eyebrow>
                          <p className="text-[13px] font-medium mt-1" style={{ color: 'var(--ink)', fontFamily: "'Inter', sans-serif" }}>{open.sleeve_type}</p>
                        </div>
                      )}
                      {open.embroidery && (
                        <div className="p-3.5 rounded-xl" style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}>
                          <Eyebrow>Embroidery</Eyebrow>
                          <p className="text-[13px] font-medium mt-1" style={{ color: 'var(--ink)', fontFamily: "'Inter', sans-serif" }}>{open.embroidery}</p>
                        </div>
                      )}
                      {open.lining && (
                        <div className="p-3.5 rounded-xl" style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}>
                          <Eyebrow>Lining</Eyebrow>
                          <p className="text-[13px] font-medium mt-1" style={{ color: 'var(--ink)', fontFamily: "'Inter', sans-serif" }}>{open.lining}</p>
                        </div>
                      )}
                      {open.pocket_style && (
                        <div className="p-3.5 rounded-xl" style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}>
                          <Eyebrow>Pocket Style</Eyebrow>
                          <p className="text-[13px] font-medium mt-1" style={{ color: 'var(--ink)', fontFamily: "'Inter', sans-serif" }}>{open.pocket_style}</p>
                        </div>
                      )}
                      {open.buttons && (
                        <div className="p-3.5 rounded-xl" style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}>
                          <Eyebrow>Buttons</Eyebrow>
                          <p className="text-[13px] font-medium mt-1" style={{ color: 'var(--ink)', fontFamily: "'Inter', sans-serif" }}>{open.buttons}</p>
                        </div>
                      )}
                      {open.monogram && (
                        <div className="p-3.5 rounded-xl" style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}>
                          <Eyebrow>Monogram</Eyebrow>
                          <p className="text-[13px] font-medium mt-1" style={{ color: 'var(--ink)', fontFamily: "'Inter', sans-serif" }}>{open.monogram}</p>
                        </div>
                      )}
                      {open.rush_order === 1 && (
                        <div className="p-3.5 rounded-xl" style={{ background: 'var(--warning-bg, #fffdf7)', border: '1px solid var(--warning-border, #f5d39c)' }}>
                          <Eyebrow>Priority</Eyebrow>
                          <p className="text-[13px] font-medium mt-1" style={{ color: 'var(--warning, #b37300)', fontFamily: "'Inter', sans-serif" }}>Rush Order</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Measurements & Notes */}
                <div>
                  <div className="flex items-end justify-between gap-3 border-b pb-2.5" style={{ borderColor: 'var(--line)' }}>
                    <div>
                      <Eyebrow>Measurements & Notes</Eyebrow>
                      <Display as="h3" className="mt-1 text-[18px] font-medium" style={{ color: 'var(--ink)' }}>Order details</Display>
                    </div>
                    <span className="hidden text-[10px] uppercase tracking-[0.14em] sm:inline" style={{ color: 'var(--muted)', fontFamily: "'IBM Plex Mono', monospace" }}>Recorded at intake</span>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="atelier-card p-5">
                      <div className="mb-4 flex items-center justify-between">
                        <Eyebrow>Client measurements</Eyebrow>
                        <Ruler className="h-4 w-4" style={{ color: 'var(--brass)' }} />
                      </div>
                      {measurements.length > 0 ? (
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                          {measurements.map((m: any, i: number) => (
                            <div key={i} className="flex items-center justify-between border-b pb-1.5 text-[11px]" style={{ borderColor: 'var(--line)', fontFamily: "'IBM Plex Mono', monospace" }}>
                              <span style={{ color: 'var(--muted)' }}>{m.label}</span>
                              <span className="font-semibold" style={{ color: 'var(--ink)' }}>{m.value}&quot;</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[12px] italic" style={{ color: 'var(--muted)' }}>No measurements recorded yet.</p>
                      )}
                    </div>
                    
                    <div className="atelier-card flex flex-col gap-4 p-5">
                      <div>
                        <div className="mb-4 flex items-center justify-between">
                          <Eyebrow>Special instructions</Eyebrow>
                          <span className="h-2 w-2 rounded-full" style={{ background: 'var(--brass)' }} />
                        </div>
                        <p className="text-[13px] leading-6" style={{ color: 'var(--ink)', fontFamily: "'Inter', sans-serif" }}>{cleanSpecialInstructions(open.notes) || 'No special instructions recorded.'}</p>
                      </div>
                      
                      {open.reference_image && open.reference_image !== '[]' && (
                        <div className="mt-2">
                          <Eyebrow>Reference Images</Eyebrow>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {(() => {
                              try {
                                const images = JSON.parse(open.reference_image);
                                return Array.isArray(images) ? images.map((img: string, i: number) => (
                                  <a key={i} href={resolveCatalogImageUrl(img)} target="_blank" rel="noreferrer" className="block relative w-16 h-16 rounded overflow-hidden border" style={{ borderColor: 'var(--line)' }}>
                                    <img src={resolveCatalogImageUrl(img)} alt="Reference" className="w-full h-full object-cover" />
                                  </a>
                                )) : null;
                              } catch(e) {
                                return null;
                              }
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Production Stage Timeline */}
                <div>
                  <div className="flex items-end justify-between gap-3 border-b pb-2.5" style={{ borderColor: 'var(--line)' }}>
                    <div>
                      <Eyebrow>Production timeline</Eyebrow>
                      <Display as="h3" className="mt-1 text-[18px] font-medium" style={{ color: 'var(--ink)' }}>Progress overview</Display>
                    </div>
                    <span className="text-[11px] font-semibold" style={{ color: 'var(--brass)', fontFamily: "'IBM Plex Mono', monospace" }}>{Math.round((open.stageIndex / (STAGES.length - 1)) * 100)}%</span>
                  </div>
                  <div className="atelier-card mt-4 p-5">
                    <div className="relative">
                      <div className="h-[2px] rounded-full" style={{ background: 'var(--line)' }} />
                      <div className="h-[2px] rounded-full absolute top-0 left-0 transition-all duration-700" style={{ background: 'var(--brass)', width: `${(open.stageIndex / (STAGES.length - 1)) * 100}%` }} />
                      <div className="flex justify-between absolute -top-[5px] left-0 right-0">
                        {STAGES.map((s, i) => {
                          const done = i <= open.stageIndex;
                          return <span key={s} className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: done ? 'var(--brass)' : '#fff', border: `2px solid ${done ? 'var(--brass)' : 'var(--line)'}` }} />;
                        })}
                      </div>
                    </div>
                    <div className="flex justify-between mt-4">
                      {STAGES.map((s, i) => (
                        <span key={s} className="text-center px-0.5" style={{ width: `${100 / STAGES.length}%`, fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: i === open.stageIndex ? 'var(--ink)' : i < open.stageIndex ? 'var(--brass)' : '#B7AF9E', fontWeight: i === open.stageIndex ? 600 : 400 }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  {/* Current status pill */}
                  <div className="mt-3 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: 'var(--brass)' }} />
                    <span className="text-[12px]" style={{ color: 'var(--ink)', fontFamily: "'Inter', sans-serif" }}>
                      Currently at <span className="font-semibold">{open.stage || 'Measuring'}</span>
                    </span>
                  </div>
                </div>

                {/* Financial Summary */}
                <div>
                  <Eyebrow>Financial Summary</Eyebrow>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <div className="p-4 rounded-xl" style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}>
                      <Eyebrow>Order Total</Eyebrow>
                      <p className="text-[16px] font-semibold mt-1.5" style={{ color: 'var(--ink)', fontFamily: "'IBM Plex Mono', monospace" }}>{formatPeso(open.total)}</p>
                    </div>
                    <div className="p-4 rounded-xl" style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}>
                      <Eyebrow>Amount Paid</Eyebrow>
                      <p className="text-[16px] font-semibold mt-1.5" style={{ color: 'var(--success)', fontFamily: "'IBM Plex Mono', monospace" }}>{formatPeso(displayPaid)}</p>
                    </div>
                    <div className="p-4 rounded-xl" style={{ background: displayBalance > 0 ? 'var(--warning-bg, #fffdf7)' : 'var(--success-bg, #f2fbf4)', border: `1px solid ${displayBalance > 0 ? 'var(--warning-border, #f5d39c)' : 'var(--success-border, #c3e6cb)'}` }}>
                      <Eyebrow>Balance Due</Eyebrow>
                      <p className="text-[16px] font-semibold mt-1.5" style={{ color: displayBalance > 0 ? 'var(--warning, #b37300)' : 'var(--success)', fontFamily: "'IBM Plex Mono', monospace" }}>{formatPeso(displayBalance)}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl" style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}>
                      <Eyebrow>Order Status</Eyebrow>
                      <p className="text-[13px] font-medium mt-1" style={{ color: 'var(--ink)', fontFamily: "'Inter', sans-serif" }}>{open.status}</p>
                    </div>
                    <div className="p-3.5 rounded-xl" style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}>
                      <Eyebrow>Estimated Ready</Eyebrow>
                      <p className="text-[13px] font-medium mt-1" style={{ color: 'var(--ink)', fontFamily: "'Inter', sans-serif" }}>{open.due}</p>
                    </div>
                  </div>
                </div>

                {/* Payment Transactions */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Eyebrow>Payment Transactions</Eyebrow>
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--brass-wash)', color: 'var(--brass)', fontFamily: "'IBM Plex Mono', monospace" }}>
                      {orderPayments.length} record{orderPayments.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {orderPayments.length === 0 ? (
                    <div className="p-5 rounded-xl text-center" style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}>
                      <Wallet className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--muted)' }} />
                      <p className="text-[12px]" style={{ color: 'var(--muted)', fontFamily: "'Inter', sans-serif" }}>No payment transactions recorded for this order yet.</p>
                    </div>
                  ) : (
                    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
                      {/* Header */}
                      <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-4 py-2.5" style={{ background: 'var(--brass-wash)', borderBottom: '1px solid var(--line)' }}>
                        <Eyebrow>Description</Eyebrow>
                        <Eyebrow>Date</Eyebrow>
                        <Eyebrow>Amount</Eyebrow>
                        <Eyebrow></Eyebrow>
                      </div>
                      {orderPayments.map((p, i) => (
                        <div key={p.id || i} className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-4 py-3.5 items-center" style={{ borderBottom: i !== orderPayments.length - 1 ? '1px solid var(--line)' : 'none', background: '#fff' }}>
                          <div>
                            <span className="text-[13px] font-medium" style={{ color: 'var(--ink)', fontFamily: "'Inter', sans-serif" }}>{p.label}</span>
                            {p.id && <div className="text-[10px] mt-0.5" style={{ color: 'var(--muted)', fontFamily: "'IBM Plex Mono', monospace" }}>{p.id}</div>}
                          </div>
                          <span className="text-[12px]" style={{ color: 'var(--muted)', fontFamily: "'IBM Plex Mono', monospace" }}>
                            {p.date ? new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '—'}
                          </span>
                          <span className="text-[13px] font-semibold" style={{ color: 'var(--success)', fontFamily: "'IBM Plex Mono', monospace" }}>{formatPeso(p.amount)}</span>
                          <button
                            onClick={() => printOrderReceipt(p)}
                            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] hover:text-[var(--brass)] transition-colors whitespace-nowrap"
                            style={{ color: 'var(--muted)', fontFamily: "'IBM Plex Mono', monospace" }}
                          >
                            <Download className="w-3.5 h-3.5" strokeWidth={1.6} /> Receipt
                          </button>
                        </div>
                      ))}
                      {/* Totals row */}
                      <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-4 py-3 items-center" style={{ background: 'var(--brass-wash)', borderTop: '1px solid var(--line)' }}>
                        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ink)', fontFamily: "'IBM Plex Mono', monospace" }}>Total Paid</span>
                        <span />
                        <span className="text-[13px] font-bold" style={{ color: 'var(--success)', fontFamily: "'IBM Plex Mono', monospace" }}>{formatPeso(displayPaid)}</span>
                        <span />
                      </div>
                    </div>
                  )}
                </div>

                {/* Atelier Notes */}
                <div className="p-5 rounded-xl" style={{ background: 'var(--brass-wash)', border: '1px solid rgba(169,130,79,0.2)' }}>
                  <Eyebrow>Atelier Notes</Eyebrow>
                  <p className="text-[13px] mt-2 leading-relaxed" style={{ color: 'var(--ink)', fontFamily: "'Inter', sans-serif" }}>{cleanSpecialInstructions(open.notes)}</p>
                </div>

                {/* Print Order Receipt */}
                <button
                  onClick={printOrderSummary}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[12px] font-semibold uppercase tracking-widest transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ background: 'var(--ink)', color: '#fff', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.12em' }}
                >
                  <Download className="w-4 h-4" strokeWidth={1.8} />
                  Print Order Receipt
                </button>

              </div>
            </section>
          </div>
        );
      })()}
    </div>
  );
}

function Detail({ label, value, color }) {
  return (
    <div className="p-3 rounded-lg" style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}>
      <Eyebrow>{label}</Eyebrow>
      <p className="text-[13px] font-medium mt-1" style={{ color: color || 'var(--ink)' }}>{value}</p>
    </div>
  );
}

/* ============================================================
   MEASUREMENTS VIEW
============================================================= */
function MeasurementsView({ measurements = [] }) {
  const live = measurements || [];
  const verifiedAt = live.map((m) => m.updated_at).filter(Boolean).sort().pop();
  const verifiedLabel = verifiedAt && !Number.isNaN(new Date(verifiedAt).getTime())
    ? new Date(verifiedAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    : null;
  const radarData = live.map((m) => ({ subject: m.label, value: Math.max(5, Math.min(100, Math.round(((Number(m.value) || 0) / 130) * 100))), cm: Math.round((Number(m.value) || 0) * 10) / 10 }));

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
          <Display as="h2" className="text-lg mt-1" style={{ color: 'var(--ink)', fontWeight: 600 }}>Measurement history</Display>
          <p className="mt-3 text-[13px]" style={{ color: 'var(--muted)' }}>
            {live.length
              ? 'Your latest verified values are shown below. History is recorded at each fitting visit by your tailor and the Front Desk.'
              : 'No measurements on file yet. Measurements are taken in person at the Front Desk during your first visit, then kept on file for your tailor.'}
          </p>
        </div>
      </div>

      <div className="rise atelier-card p-7" style={{ animationDelay: '0.18s' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <Eyebrow>On file</Eyebrow>
            <Display as="h2" className="text-lg mt-1" style={{ color: 'var(--ink)', fontWeight: 600 }}>Primary profile</Display>
          </div>
          <Eyebrow>{verifiedLabel ? `Verified ${verifiedLabel}` : 'Awaiting verification'}</Eyebrow>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {live.map((m) => {
            const delta = 0;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);
  const [showContact, setShowContact] = useState(false);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/customer/my-appointments`, { headers: { Authorization: `Bearer ${authToken()}` } });
      const data = await res.json();
      if (!res.ok) { if (res.status === 401) { setError('Your session has expired. Please sign in again.'); return; } throw new Error(data.message || 'Unable to load appointments.'); }
      setAppointments(Array.isArray(data.appointments) ? data.appointments : []);
      setError('');
    } catch (e) {
      setAppointments([]);
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
      time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      day: d.getDate().toString().padStart(2, '0'),
      month: d.toLocaleDateString('en-PH', { month: 'short' }).toUpperCase(),
    };
  };

  // Walk-in policy: Front Desk owns every appointment decision, so the portal
  // is strictly view-only. Visits are suggested automatically when production
  // reaches a fitting or pickup milestone; the customer reads the confirmed
  // details (type, date, time, status, assigned tailor, notes) and contacts the
  // counter for any change. There is nothing to book, confirm or cancel here.
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Visit schedule"
        title="Appointments"
        sub="Front Desk confirms your fitting and pickup visits once the workshop reports your garment is ready. Your visits are view-only here — our counter staff handles every change."
        icon={CalendarClock}
      />
      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg text-[13px]" style={{ border: '1px solid rgba(160,82,45,0.25)', background: 'rgba(160,82,45,0.06)', color: 'var(--ink)' }}>
          <span>{error}</span>
          <button onClick={loadAppointments} className="px-4 py-2 rounded-md text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ border: '1px solid rgba(160,82,45,0.4)', color: 'var(--ink)' }}>Retry</button>
        </div>
      )}
      <div className="rise atelier-card p-6 flex flex-wrap items-center justify-between gap-3" style={{ animationDelay: '0.04s', borderColor: 'var(--line)' }}>
        <div>
          <Eyebrow tone="var(--brass)">Front Desk</Eyebrow>
          <Display as="div" className="text-[15px] mt-0.5" style={{ color: 'var(--ink)', fontWeight: 600 }}>Need a different date or time?</Display>
          <p className="text-[13px] mt-1" style={{ color: 'var(--muted)' }}>Only the Front Desk can move or cancel a visit. Call or visit the counter and our staff will re-book it for you.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowContact((v) => !v)} className="px-4 py-2 rounded-md text-[10px] font-semibold uppercase tracking-[0.12em] text-white" style={{ background: 'var(--ink)' }}>Contact Front Desk</button>
          <button onClick={loadAppointments} className="px-4 py-2 rounded-md text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--muted)', border: '1px solid var(--line)' }}>Refresh</button>
        </div>
      </div>

      {showContact && (
        <div className="p-4 rounded-lg text-[13px]" style={{ border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--muted)' }}>
          The Front Desk counter is open <strong style={{ color: 'var(--ink)' }}>Monday to Saturday, 9:00 AM – 6:00 PM</strong> (closed Sundays). Please call or visit the shop so we can adjust, cancel or re-book your visit.
        </div>
      )}

      <div className="rise atelier-card divide-y" style={{ animationDelay: '0.08s', borderColor: 'var(--line)' }}>
        {loading && <div className="p-6 text-[13px]" style={{ color: 'var(--muted)' }}>Loading…</div>}
        {!loading && appointments.length === 0 && (
          <div className="p-6 text-[13px]" style={{ color: 'var(--muted)' }}>
            {error ? 'Your appointments could not be loaded. Use Retry above.' : 'No fitting or pickup visit has been confirmed yet. Front Desk will notify you once your garment is ready — you may also visit or call the shop for an update.'}
          </div>
        )}
        {appointments.map((a, i) => {
          const when = fmt(a.appointment_at);
          const open = openId === a.id;
          return (
            <div key={a.id ?? i} className="flex flex-col gap-4 p-6" style={{ borderBottom: i !== appointments.length - 1 ? '1px solid var(--line)' : 'none' }}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex gap-5">
                  <div className="text-center pr-5" style={{ borderRight: '1px solid var(--line)' }}>
                    <Display as="span" className="block text-2xl" style={{ color: 'var(--ink)', fontWeight: 600 }}>{when.day}</Display><Eyebrow>{when.month}</Eyebrow>
                  </div>
                  <div>
                    <Eyebrow>{a.appointment_number || a.job_card_number}</Eyebrow>
                    <Display as="h2" className="text-lg mt-0.5" style={{ color: 'var(--ink)', fontWeight: 600 }}>{a.appointment_type}</Display>
                    <p className="text-[13px] mt-0.5" style={{ color: 'var(--muted)' }}>{when.date} · {when.time}{a.garment ? ` · ${a.garment}` : ''}</p>
                    <p className="text-[12px] mt-1 flex items-center gap-1" style={{ color: 'var(--muted)' }}><MapPin className="w-3.5 h-3.5" />Please visit the shop at your scheduled time.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusPill status={a.status} />
                  <button onClick={() => setOpenId(open ? null : a.id)} className="px-4 py-2 rounded-md text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--ink)', border: '1px solid var(--line)' }}>{open ? 'Hide details' : 'View appointment details'}</button>
                </div>
              </div>
              {open && (
                <dl className="grid gap-3 pt-4 sm:grid-cols-2" style={{ borderTop: '1px solid var(--line)' }}>
                  <div><dt><Eyebrow>Appointment type</Eyebrow></dt><dd className="text-[13px] mt-0.5" style={{ color: 'var(--ink)' }}>{a.appointment_type}</dd></div>
                  <div><dt><Eyebrow>Date and time</Eyebrow></dt><dd className="text-[13px] mt-0.5" style={{ color: 'var(--ink)' }}>{when.date} · {when.time}</dd></div>
                  <div><dt><Eyebrow>Status</Eyebrow></dt><dd className="text-[13px] mt-0.5" style={{ color: 'var(--ink)' }}>{a.status}</dd></div>
                  <div><dt><Eyebrow>Job card</Eyebrow></dt><dd className="text-[13px] mt-0.5" style={{ color: 'var(--ink)' }}>{a.job_card_number}</dd></div>
                  <div><dt><Eyebrow>Assigned tailor</Eyebrow></dt><dd className="text-[13px] mt-0.5" style={{ color: 'var(--ink)' }}>{a.assigned_tailor_name || 'Assigned by the shop'}</dd></div>
                  <div><dt><Eyebrow>Notes</Eyebrow></dt><dd className="text-[13px] mt-0.5" style={{ color: 'var(--ink)' }}>{a.notes || '—'}</dd></div>
                </dl>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-center" style={{ color: 'var(--muted)' }}>Front Desk schedules and confirms every visit after coordinating with the workshop. You will receive a notification once a visit is confirmed.</p>
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
              <YAxis tickLine={false} axisLine={false} width={44} tick={{ fill: 'var(--muted)', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }} tickFormatter={(v) => formatPHPCompact(v as number)} />
              <Tooltip content={<BarTooltip />} />
              <Bar dataKey="paid" fill="var(--brass)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <PaymentLedger payments={livePayments} orders={orders} title="Payment activity" customerName={customerName} />
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

function CustomerGarmentCatalog({ catalog = [], loading = false, error = '' }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [selectedDesign, setSelectedDesign] = useState(null);
  const categories = ['All', 'Formal Wear', "Women's Wear", 'Uniforms', 'Bespoke', ...Array.from(new Set(catalog.map((item) => item.garment_category || 'Other'))).filter((name) => !/uniform/i.test(name))].filter((name, index, list) => list.indexOf(name) === index).slice(0, 8);
  const refineOptions = Array.from(new Set(catalog.map((item) => item.name).filter(Boolean))).slice(0, 8);
  const filteredCatalog = catalog.filter((item) => {
    const itemCategory = item.garment_category || 'Other';
    const matchesCategory = category === 'All' || itemCategory === category || (category === 'Uniforms' && /uniform/i.test(itemCategory));
    const query = search.trim().toLowerCase();
    return matchesCategory && (!query || [item.name, item.garment_type, item.garment_category, ...(item.fabrics || [])].join(' ').toLowerCase().includes(query));
  });
  const uniqueTypes = new Set(catalog.map((item) => item.garment_type || item.name)).size;
  const styleCount = new Set(catalog.flatMap((item) => item.allowed_styles || [])).size;
  const fabricCount = new Set(catalog.flatMap((item) => item.fabrics || [])).size;
  const productionTimeForDesign = (design) => design.production_time || productionTimeFor(design.garment_type || design.name || '');
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[['Garments', catalog.length, 'Ready to show', Shirt], ['Uniform types', uniqueTypes, 'School & company', Ruler], ['Style options', styleCount, 'Classic to bespoke', Sparkles], ['Fabrics available', fabricCount, 'Live inventory', PackageCheck]].map(([label, value, sub, Icon]) => (
          <div key={label} className="rise atelier-card flex items-center gap-3 px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: 'var(--brass-wash)', color: 'var(--brass)' }}><Icon className="h-4 w-4" /></span>
            <div><div className="text-xl font-semibold" style={{ color: 'var(--ink)', fontFamily: "'Fraunces', serif" }}>{value}</div><Eyebrow>{label}</Eyebrow><div className="text-[9px]" style={{ color: 'var(--muted)' }}>{sub}</div></div>
          </div>
        ))}
      </div>
      {error && <div className="rounded-lg border px-4 py-3 text-[13px]" style={{ borderColor: '#E6C7BC', background: '#FFF8F5', color: 'var(--rust)' }}>{error}</div>}
      {loading ? (
        <div className="atelier-card p-10 text-center text-[13px]" style={{ color: 'var(--muted)' }}>Loading garments…</div>
      ) : catalog.length === 0 ? (
        <div className="atelier-card p-10 text-center text-[13px]" style={{ color: 'var(--muted)' }}>No garments are currently available.</div>
      ) : (
        <div className="grid min-w-0 gap-5 xl:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="atelier-card h-fit min-w-0 p-5">
            <div className="flex items-center justify-between"><strong className="text-[12px]" style={{ color: 'var(--ink)', fontFamily: "'Fraunces', serif" }}>Consultation filters</strong><span className="rounded-full px-2 py-1 text-[9px]" style={{ background: 'var(--brass-wash)', color: 'var(--brass)' }}>{catalog.length}</span></div>
            <div className="relative mt-4"><Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: 'var(--muted)' }} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search garments…" className="input-field h-11 !pl-9 !pr-3 text-[11px]" /></div>
            <Eyebrow className="mt-5 block">Category</Eyebrow>
            <div className="mt-2 space-y-1">{categories.map((name) => <button key={name} onClick={() => setCategory(name)} className="w-full rounded-md px-2.5 py-2 text-left text-[11px]" style={{ background: category === name ? 'var(--ink)' : 'transparent', color: category === name ? '#fff' : 'var(--muted)' }}>{name}</button>)}</div>
            {refineOptions.length > 0 && <><Eyebrow className="mt-5 block">Refine garment</Eyebrow><div className="mt-2 flex flex-wrap gap-1.5">{refineOptions.map((name) => <button key={name} onClick={() => { setSearch(name); setCategory('All'); }} className="rounded-full border px-2 py-1 text-[9px] transition-colors hover:border-[#A9824F]" style={{ borderColor: search === name ? 'var(--brass)' : 'var(--line)', color: 'var(--muted)' }}>{name}</button>)}</div></>}
          </aside>
          <section className="min-w-0">
            <div className="mb-3 flex items-center justify-between gap-3"><div><Eyebrow>Design catalog</Eyebrow><h1 className="mt-1 text-xl font-semibold" style={{ color: 'var(--ink)', fontFamily: "'DM Serif Display', serif" }}>{filteredCatalog.length} designs to show</h1></div><span className="rounded-md border px-3 py-2 text-[10px]" style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}>Uniforms · fabrics · pricing</span></div>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredCatalog.map((design) => (
            <article key={design.id || design.name} role="button" tabIndex={0} onClick={() => setSelectedDesign(design)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedDesign(design); }} className="rise atelier-card min-w-0 cursor-pointer overflow-hidden transition-transform hover:-translate-y-0.5">
              <div className="relative h-36 overflow-hidden" style={{ background: 'var(--brass-wash)' }}>
                {design.image ? <img src={resolveCatalogImageUrl(design.image)} alt={design.name} className="h-full w-full object-contain" loading="lazy" /> : <div className="flex h-full items-center justify-center text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--muted)', fontFamily: "'IBM Plex Mono', monospace" }}>Image unavailable</div>}
                <span className="absolute left-2 top-2 rounded-full bg-white px-2 py-1 text-[9px] uppercase tracking-[0.1em]" style={{ color: 'var(--muted)', fontFamily: "'IBM Plex Mono', monospace" }}>{design.garment_category || 'Garment'}</span>
                {design.price && <span className="absolute right-2 top-2 rounded-full px-2 py-1 text-[9px] font-semibold text-white" style={{ background: 'var(--ink)', fontFamily: "'IBM Plex Mono', monospace" }}>{design.price}</span>}
              </div>
              <div className="p-3">
                <h2 className="text-[15px] font-semibold" style={{ color: 'var(--ink)', fontFamily: "'DM Serif Display', serif" }}>{design.name}</h2><Eyebrow>{design.garment_category || 'Garment'} · {design.garment_type || 'Custom'}</Eyebrow>
                {design.description && <p className="mt-3 max-h-[54px] overflow-hidden text-[12px] leading-relaxed" style={{ color: 'var(--muted)', fontFamily: "'Inter', sans-serif" }}>{design.description}</p>}
                <Eyebrow className="mt-3 block">Available styles</Eyebrow><div className="mt-1 flex flex-wrap gap-1">{(design.allowed_styles || []).slice(0, 3).map((style) => <span key={style} className="rounded-full border px-2 py-1 text-[9px]" style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}>{style}</span>)}</div>
                <div className="mt-3 grid grid-cols-2 gap-3 rounded-lg border p-3" style={{ borderColor: 'var(--line)', background: '#FFFCF7' }}><div><Eyebrow>Styles</Eyebrow><p className="mt-1 text-[11px]" style={{ color: 'var(--ink)' }}>{(design.allowed_styles || []).length || 0} available</p></div><div><Eyebrow>Estimated production time</Eyebrow><p className="mt-1 text-[11px]" style={{ color: 'var(--ink)' }}>◷ {productionTimeForDesign(design)}</p></div></div>
                <div className="mt-3"><Eyebrow>Colours</Eyebrow><div className="mt-1 flex gap-1.5">{(design.colors || []).slice(0, 4).map((color) => <span key={color} title={color} className="h-4 w-4 rounded-full border" style={{ background: color, borderColor: 'var(--line)' }} />)}</div></div>
              </div>
            </article>
          ))}
            </div>
          </section>
        </div>
      )}
      {selectedDesign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedDesign(null)}>
          <section role="dialog" aria-modal="true" aria-label={`${selectedDesign.name} details`} className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--line)' }}><div><Eyebrow>Garment details</Eyebrow><h2 className="mt-1 text-xl font-semibold" style={{ color: 'var(--ink)', fontFamily: "'DM Serif Display', serif" }}>{selectedDesign.name}</h2></div><button onClick={() => setSelectedDesign(null)} className="rounded-full p-2" style={{ color: 'var(--muted)' }} aria-label="Close details"><X className="h-4 w-4" /></button></div>
            <div className="grid gap-7 p-6 md:grid-cols-[minmax(320px,1fr)_1fr] lg:p-7">
              <div><div className="h-80 overflow-hidden rounded-xl md:h-[420px]" style={{ background: 'var(--brass-wash)' }}>{selectedDesign.image ? <img src={resolveCatalogImageUrl(selectedDesign.image)} alt={selectedDesign.name} className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-[11px] uppercase tracking-[0.15em]" style={{ color: 'var(--muted)' }}>Image unavailable</div>}</div><p className="mt-2 text-[10px] leading-relaxed" style={{ color: 'var(--muted)' }}>Design reference shown for consultation. Final garment details and fabric availability are confirmed at the Front Desk.</p></div>
              <div><p className="text-[13px] leading-relaxed" style={{ color: 'var(--muted)' }}>{selectedDesign.description || 'Custom garment prepared to your measurements.'}</p><div className="mt-4 rounded-xl border p-4" style={{ borderColor: 'var(--line)', background: '#FFFCF7' }}><Eyebrow>Pricing reference</Eyebrow><div className="mt-3 space-y-2 text-[12px]" style={{ color: 'var(--muted)' }}><div className="flex justify-between gap-3"><span>Starting price</span><strong style={{ color: 'var(--ink)', fontFamily: "'IBM Plex Mono', monospace" }}>{selectedDesign.base_price ? formatPeso(selectedDesign.base_price) : (selectedDesign.price || 'Quotation')}</strong></div><div className="flex justify-between gap-3"><span>Labor estimate</span><span style={{ color: 'var(--muted)' }}>Included in quotation</span></div><div className="flex justify-between gap-3"><span>Material estimate</span><span style={{ color: 'var(--muted)' }}>Based on selected fabric</span></div><div className="flex justify-between gap-3 border-t pt-2" style={{ borderColor: 'var(--line)' }}><span>Suggested deposit</span><strong style={{ color: 'var(--brass)', fontFamily: "'IBM Plex Mono', monospace" }}>{selectedDesign.base_price ? formatPeso(Number(selectedDesign.base_price) * 0.5) : 'At quotation'}</strong></div></div><p className="mt-3 text-[10px] leading-relaxed" style={{ color: 'var(--muted)' }}>Indicative only. The final job-card price is calculated by the shop rate card after consultation.</p></div><div className="mt-5"><Eyebrow>Styles offered</Eyebrow><div className="mt-2 flex flex-wrap gap-2">{(selectedDesign.allowed_styles || []).map((style) => <span key={style} className="rounded-full border px-2.5 py-1 text-[10px]" style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}>{style}</span>)}</div></div><div className="mt-5"><Eyebrow>Estimated production</Eyebrow><p className="mt-2 text-[12px]" style={{ color: 'var(--ink)' }}>{productionTimeForDesign(selectedDesign)}</p></div><div className="mt-5"><Eyebrow>Fabric options</Eyebrow><div className="mt-2 space-y-2">{(selectedDesign.fabrics || []).map((fabric) => <div key={fabric} className="flex items-center justify-between rounded-lg border px-3 py-2 text-[11px]" style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}><span>{fabric}</span><span className="rounded-full px-2 py-1 text-[9px]" style={{ background: 'var(--brass-wash)', color: 'var(--brass)' }}>Suggest only</span></div>)}</div></div><div className="mt-5"><Eyebrow>Colour references</Eyebrow><div className="mt-2 flex flex-wrap gap-2">{(selectedDesign.colors || []).length ? selectedDesign.colors.map((color) => <span key={color} className="flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px]" style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}><span className="h-3 w-3 rounded-full border" style={{ background: color, borderColor: 'var(--line)' }} />{color}</span>) : <span className="text-[12px]" style={{ color: 'var(--muted)' }}>Custom colours</span>}</div></div><p className="mt-6 rounded-lg px-3 py-2.5 text-[11px] leading-relaxed" style={{ background: 'var(--brass-wash)', color: 'var(--muted)' }}>To order this garment, visit the Front Desk for measurements, final quotation, and payment.</p></div>
            </div>
          </section>
        </div>
      )}
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
  const [customerOrders, setCustomerOrders] = useState([]);
  const [customerPayments, setCustomerPayments] = useState<any[]>([]);
  const [customerMeasurements, setCustomerMeasurements] = useState<any[]>([]);
  const [customerAppointments, setCustomerAppointments] = useState<any[]>([]);
  const [customerCatalog, setCustomerCatalog] = useState<any[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState('');
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

  useEffect(() => {
    if (view !== 'catalog' || customerCatalog.length) return;
    setCatalogLoading(true);
    fetch(`${API_URL}/auth/catalog`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Unable to load garment catalog.');
        setCustomerCatalog(Array.isArray(data.catalog) ? data.catalog : []);
      })
      .catch((error) => setCatalogError(error.message || 'Unable to load garment catalog.'))
      .finally(() => setCatalogLoading(false));
  }, [view, customerCatalog.length]);

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
      case 'dashboard': return <DashboardView payments={customerPayments} orders={customerOrders} measurements={customerMeasurements} appointments={customerAppointments} onViewPayments={() => setView('payments')} customerName={customerName} />;
      case 'catalog': return <CustomerGarmentCatalog catalog={customerCatalog} loading={catalogLoading} error={catalogError} />;
      case 'orders': return <OrdersView orders={customerOrders} payments={customerPayments} measurements={customerMeasurements} />;
      case 'measurements': return <MeasurementsView measurements={customerMeasurements} />;
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
