import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function LiveDateTime() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return <Eyebrow className="hidden sm:inline">{now.toLocaleString(undefined, { weekday: 'short', month: 'short', day: '2-digit', hour: 'numeric', minute: '2-digit' })}</Eyebrow>;
}

import type { ReactNode } from 'react';
import {
  LayoutDashboard,
  Shirt,
  Ruler,
  CalendarClock,
  Wallet,
  Settings,
  Bell,
  Search,
  ChevronRight,
  Menu,
  X,
  PackageCheck,
  Download,
  LogOut,
  ArrowUpDown,
} from 'lucide-react';

/* ---------------------------------------------------------------
   CUSTOMER — Dashboard
   "The Pattern Sheet" — a cutting-table / drafting-room theme,
   recolored to a navy-and-white palette. White tissue panels with
   navy dashed cutting lines, a navy sidebar, and navy notch marks
   standing in for bullets and checkmarks. Same data contract,
   routing, and API wiring as the original.
------------------------------------------------------------------ */

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;700;900&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500&display=swap');

@keyframes riseIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes pinGlow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(31,59,107,0.35); }
  50% { box-shadow: 0 0 0 7px rgba(31,59,107,0); }
}
.dash-in { opacity: 0; animation: riseIn 0.5s cubic-bezier(0.22,1,0.36,1) forwards; }
`;

const CUSTOMER_THEME = `
.customer-theme { background: #FFFFFF; color: #0F1F3D; }
.customer-theme aside { background: #0B1B36; }
.customer-theme header { background: rgba(255,255,255,.92); border-color: #D7DEE9; }
.pattern-sheet {
  background: #FFFFFF;
  border: 1px dashed #4C6E93;
  position: relative;
}
.pattern-sheet::before {
  content: '';
  position: absolute;
  inset: 7px;
  border: 1px solid rgba(15,31,61,0.08);
  pointer-events: none;
}
`;

function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`text-[10px] tracking-[0.24em] uppercase text-[#4C6E93] ${className}`}
      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
    >
      {children}
    </span>
  );
}

/* A sewing notch — the little triangular sync-mark cut into a pattern
   edge — reused everywhere a bullet, active-state, or checkmark would
   normally go. */
function Notch({ tone = '#1F3B6B', className = '' }: { tone?: string; className?: string }) {
  return (
    <span
      className={`inline-block flex-shrink-0 ${className}`}
      style={{ width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: `7px solid ${tone}` }}
      aria-hidden="true"
    />
  );
}

/* The printed corner block every real pattern piece carries: piece
   name, size, how many to cut. Doubles here as a panel's ID tag. */
function PatternTag({ code, cut = 1 }: { code: string; cut?: number }) {
  return (
    <div
      className="absolute top-3 right-3 sm:top-4 sm:right-4 border border-[#4C6E93] px-2.5 py-1.5 text-right leading-tight"
      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
    >
      <div className="text-[9px] tracking-[0.18em] text-[#4C6E93]">NO.</div>
      <div className="text-[11px] text-[#0F1F3D] font-medium">{code}</div>
      <div className="text-[9px] tracking-[0.14em] text-[#1F3B6B] mt-0.5">CUT {cut}</div>
    </div>
  );
}

function GrainlineArrow({ label = 'GRAINLINE' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      <ArrowUpDown className="w-3 h-3 text-[#1F3B6B]" strokeWidth={2} />
      <span className="text-[9px] tracking-[0.2em] text-[#1F3B6B]">{label}</span>
    </div>
  );
}

/* ---------------- Sample data (wire to real API) ---------------- */

const CUSTOMER = { name: 'Reyna Fuentes', memberSince: '2024' };

const STAGES = ['Measuring', 'Pattern Cutting', 'Initial Assembly', 'First Fitting', 'Final Alterations', 'Completed', 'Ready for Pickup'];

const ACTIVE_ORDERS = [
  {
    id: 'JC-3021',
    garment: 'Barong Tagalog',
    fabric: 'Piña-Seye — Ivory',
    stageIndex: 3,
    due: 'Aug 05',
    balance: '₱2,400 due on release',
  },
  {
    id: 'JC-3022',
    garment: 'Evening Gown',
    fabric: 'Silk Habotai — Wine',
    stageIndex: 1,
    due: 'Aug 14',
    balance: '₱7,950 due on release',
  },
];

const MEASUREMENTS = [
  { label: 'Chest', value: '96 cm' },
  { label: 'Waist', value: '78 cm' },
  { label: 'Hip', value: '99 cm' },
  { label: 'Shoulder', value: '41 cm' },
  { label: 'Sleeve', value: '58 cm' },
  { label: 'Inseam', value: '76 cm' },
  { label: 'Neck', value: '36 cm' },
];
const MEASUREMENTS_UPDATED = 'Jul 12, 2026';

const NOTIFICATIONS: { time: string; label: string; detail: string; kind: 'fitting' | 'pickup' | 'reminder' }[] = [
  { time: 'Today, 3:30 PM', label: 'Fitting today', detail: 'JC-3021 — Barong Tagalog, first fitting', kind: 'fitting' },
  { time: 'Aug 03', label: 'Ready for pickup', detail: 'JC-3018 — School Uniform Set', kind: 'pickup' },
  { time: 'Aug 05', label: 'Balance due on release', detail: 'JC-3021 — ₱2,400 remaining', kind: 'reminder' },
];

const NOTIF_META: Record<string, { icon: typeof CalendarClock; tone: string }> = {
  fitting: { icon: CalendarClock, tone: '#1F3B6B' },
  pickup: { icon: PackageCheck, tone: '#4C6E93' },
  reminder: { icon: Bell, tone: '#0F1F3D' },
};

const PAYMENT_HISTORY = [
  { id: 'RCPT-0192', job: 'JC-3021', label: 'Deposit — 50%', amount: '₱2,400', date: 'Jul 12, 2026' },
  { id: 'RCPT-0188', job: 'JC-3018', label: 'Final balance', amount: '₱1,650', date: 'Jul 02, 2026' },
  { id: 'RCPT-0181', job: 'JC-3018', label: 'Deposit — 50%', amount: '₱1,650', date: 'Jun 20, 2026' },
];

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const authToken = () => localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) : 'To be confirmed';
const formatMoney = (value: number | string) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value));

type ViewKey = 'dashboard' | 'orders' | 'measurements' | 'appointments' | 'payments' | 'settings';

const NAV: { label: string; icon: typeof LayoutDashboard; view: ViewKey }[] = [
  { label: 'Dashboard', icon: LayoutDashboard, view: 'dashboard' },
  { label: 'My Orders', icon: Shirt, view: 'orders' },
  { label: 'Measurements', icon: Ruler, view: 'measurements' },
  { label: 'Appointments', icon: CalendarClock, view: 'appointments' },
  { label: 'Payments', icon: Wallet, view: 'payments' },
  { label: 'Settings', icon: Settings, view: 'settings' },
];

/* ==================================================================
   DASHBOARD VIEW
================================================================== */

function DashboardView({ orders, measurements, notifications, payments }: { customer: typeof CUSTOMER; orders: typeof ACTIVE_ORDERS; measurements: typeof MEASUREMENTS; notifications: typeof NOTIFICATIONS; payments: typeof PAYMENT_HISTORY }) {
  const [selectedOrder, setSelectedOrder] = useState(orders[0]?.id || '');
  const order = orders.find((o) => o.id === selectedOrder) ?? orders[0];

  return (
    <div className="space-y-10">
      <div className="dash-in">
        <Eyebrow>Cutting table / today</Eyebrow>
        <h1 className="text-2xl sm:text-3xl leading-tight mt-2 text-[#0F1F3D]" style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 700 }}>
          Here's where every garment stands on the sheet.
        </h1>
      </div>

      {/* ---------------- THE PATTERN SHEET (signature element) ---------------- */}
      <div className="dash-in pattern-sheet rounded-sm">
        <PatternTag code={order?.id || '—'} cut={1} />
        <div className="px-6 sm:px-8 pt-7 flex items-center justify-between gap-4 pr-28 sm:pr-32">
          <div>
            <Eyebrow>Pattern sheet</Eyebrow>
            <h2 className="text-lg mt-1 text-[#0F1F3D]" style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 700 }}>Order in progress</h2>
          </div>
          {orders.length > 1 && (
            <div className="flex items-center gap-2">
              {orders.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setSelectedOrder(o.id)}
                  className={`px-3 py-1.5 text-[10px] tracking-[0.14em] uppercase border transition-colors ${
                    o.id === selectedOrder
                      ? 'bg-[#0F1F3D] text-[#FFFFFF] border-[#0F1F3D]'
                      : 'border-[#4C6E93] text-[#4C6E93] hover:border-[#1F3B6B]'
                  }`}
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  {o.id}
                </button>
              ))}
            </div>
          )}
        </div>

        {order ? (
          <div className="px-6 sm:px-8 pt-6 pb-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-3xl text-[#0F1F3D]" style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 900 }}>{order.garment}</h3>
                <p className="text-[13px] text-[#4C6E93] mt-1" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>{order.fabric}</p>
              </div>
              <GrainlineArrow />
            </div>

            {/* tape-measure progress — ticks like a dressmaker's tape */}
            <div className="mt-9">
              <div className="flex justify-between mb-2">
                <Eyebrow>Stage progress</Eyebrow>
                <Eyebrow className="text-[#1F3B6B]">{STAGES[order.stageIndex]}</Eyebrow>
              </div>
              <div className="relative pt-1">
                <div className="h-px bg-[#D7DEE9]" />
                <div className="flex justify-between -mt-px">
                  {STAGES.map((s, i) => {
                    const done = i < order.stageIndex;
                    const current = i === order.stageIndex;
                    return (
                      <div key={s} className="flex flex-col items-center" style={{ width: `${100 / STAGES.length}%` }}>
                        <div
                          className={`w-px ${done || current ? 'h-4' : 'h-2.5'}`}
                          style={{ backgroundColor: done ? '#1F3B6B' : current ? '#0F1F3D' : '#D7DEE9' }}
                        />
                        <span
                          className="w-2.5 h-2.5 rounded-full -mt-0.5 flex-shrink-0"
                          style={{
                            backgroundColor: done ? '#1F3B6B' : current ? '#0F1F3D' : '#FFFFFF',
                            border: done || current ? 'none' : '1px solid #4C6E93',
                            animation: current ? 'pinGlow 1.8s ease-in-out infinite' : undefined,
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2.5">
                  {STAGES.map((s, i) => (
                    <span
                      key={s}
                      className="text-center px-0.5"
                      style={{
                        width: `${100 / STAGES.length}%`,
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '9.5px',
                        letterSpacing: '0.02em',
                        color: i === order.stageIndex ? '#0F1F3D' : i < order.stageIndex ? '#4C6E93' : '#A9B6CC',
                        fontWeight: i === order.stageIndex ? 600 : 400,
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-dashed border-[#4C6E93] flex flex-wrap gap-8">
              <div>
                <Eyebrow>Est. ready</Eyebrow>
                <div className="text-lg mt-1 text-[#0F1F3D]" style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 700 }}>{order.due}</div>
              </div>
              <div>
                <Eyebrow>Balance</Eyebrow>
                <div className="text-[12.5px] mt-1.5 text-[#0F1F3D]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{order.balance}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-6 sm:px-8 py-12 text-center text-sm text-[#4C6E93]">You have no active orders yet.</div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-8">
        {/* ---------------- MEASUREMENT PROFILE ---------------- */}
        <div className="dash-in pattern-sheet rounded-sm p-6 sm:p-8" style={{ animationDelay: '0.1s' }}>
          <PatternTag code="MEAS-01" cut={measurements.length || 1} />
          <div className="flex items-center justify-between mb-6 pr-24">
            <div>
              <Eyebrow>On file</Eyebrow>
              <h2 className="text-lg mt-1 text-[#0F1F3D]" style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 700 }}>Measurement profile</h2>
            </div>
          </div>
          <div className="space-y-0">
            {measurements.map((m, i) => {
              const [value, unit] = m.value.split(' ');
              return (
                <div
                  key={m.label}
                  className={`flex items-center gap-3 py-2.5 ${i !== measurements.length - 1 ? 'border-b border-dashed border-[#D7DEE9]' : ''}`}
                >
                  <Notch tone="#1F3B6B" />
                  <span className="text-[12.5px] text-[#4C6E93] flex-1" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>{m.label}</span>
                  <span className="text-[15px] text-[#0F1F3D]" style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>
                    {value}<span className="text-[10px] text-[#4C6E93] ml-0.5">{unit}</span>
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-[#4C6E93] mt-5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            {measurements.length ? `LAST TAKEN ${MEASUREMENTS_UPDATED.toUpperCase()} — CONFIRM AT NEXT FITTING` : 'NO MEASUREMENTS ON FILE YET'}
          </p>
        </div>

        {/* ---------------- NOTIFICATIONS ---------------- */}
        <div className="dash-in pattern-sheet rounded-sm p-6 sm:p-8" style={{ animationDelay: '0.18s' }}>
          <PatternTag code="NOTE-01" cut={notifications.length || 1} />
          <div className="flex items-center justify-between mb-6 pr-24">
            <div>
              <Eyebrow>Stay ahead</Eyebrow>
              <h2 className="text-lg mt-1 text-[#0F1F3D]" style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 700 }}>Notifications</h2>
            </div>
          </div>
          <div className="space-y-4">
            {notifications.map((n, i) => {
              const meta = NOTIF_META[n.kind];
              const Icon = meta.icon;
              return (
                <div key={i} className="flex items-start gap-3">
                  <Notch tone={meta.tone} className="mt-2" />
                  <div className="w-7 h-7 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${meta.tone}14`, color: meta.tone }}>
                    <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[13px] text-[#0F1F3D] font-medium">{n.label}</span>
                      <span className="text-[10.5px] text-[#4C6E93] flex-shrink-0" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{n.time}</span>
                    </div>
                    <p className="text-[12.5px] text-[#4C6E93] mt-0.5" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>{n.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ---------------- PAYMENT HISTORY / RECEIPTS — ledger ---------------- */}
      <div className="dash-in pattern-sheet rounded-sm overflow-hidden" style={{ animationDelay: '0.26s' }}>
        <PatternTag code="LEDG-01" cut={payments.length || 1} />
        <div className="flex items-center justify-between px-6 sm:px-8 py-6 pr-28 sm:pr-32">
          <div>
            <Eyebrow>Cash record</Eyebrow>
            <h2 className="text-lg mt-1 text-[#0F1F3D]" style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 700 }}>Payment history</h2>
          </div>
          <button className="flex items-center gap-1 text-[11px] tracking-[0.14em] uppercase text-[#1F3B6B]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            View all <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="hidden md:grid grid-cols-[1fr_1fr_1.4fr_0.9fr_0.9fr_0.7fr] gap-4 px-8 py-2.5 border-t border-b border-dashed border-[#D7DEE9]">
          {['Receipt', 'Job card', 'Description', 'Amount', 'Date', ''].map((h) => (
            <Eyebrow key={h}>{h}</Eyebrow>
          ))}
        </div>
        {payments.map((p, i) => (
          <div
            key={p.id}
            className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1.4fr_0.9fr_0.9fr_0.7fr] gap-2 md:gap-4 px-6 sm:px-8 py-4 border-t border-dashed border-[#D7DEE9] first:border-t-0 items-center"
            style={{ backgroundColor: i % 2 === 1 ? 'rgba(15,31,61,0.02)' : 'transparent' }}
          >
            <span className="flex items-center gap-2 text-[12px] text-[#4C6E93]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              <Notch tone="#4C6E93" />{p.id}
            </span>
            <span className="text-[13px] text-[#0F1F3D] font-medium">{p.job}</span>
            <span className="text-[13px] text-[#4C6E93]" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>{p.label}</span>
            <span className="text-[13px] text-[#0F1F3D]" style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>{p.amount}</span>
            <span className="text-[12px] text-[#4C6E93]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{p.date}</span>
            <button className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.1em] uppercase text-[#4C6E93] hover:text-[#0F1F3D] transition-colors">
              <Download className="w-3.5 h-3.5" strokeWidth={1.6} />
              Receipt
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* placeholder for pages not built yet, so nav links never dead-end silently */
function ComingSoonView({ label }: { label: string }) {
  return (
    <div className="dash-in pattern-sheet rounded-sm p-16 text-center">
      <Eyebrow>{label}</Eyebrow>
      <h2 className="text-2xl mt-2 text-[#0F1F3D]" style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 700 }}>
        This piece hasn't been cut yet
      </h2>
      <p className="text-[13px] text-[#4C6E93] mt-2" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>Ask to have the {label} page created next.</p>
    </div>
  );
}

/* ==================================================================
   ROOT — sidebar drives which view renders
================================================================== */

export default function CustomerDashboard({ initialView = 'dashboard' }: { initialView?: ViewKey }) {
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);
  const [view, setView] = useState<ViewKey>(initialView);
  const [customer, setCustomer] = useState(CUSTOMER);
  const [orders, setOrders] = useState(ACTIVE_ORDERS);
  const [measurements, setMeasurements] = useState(MEASUREMENTS);
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const [payments, setPayments] = useState(PAYMENT_HISTORY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const signOut = () => {
    localStorage.removeItem('authToken'); localStorage.removeItem('currentUser');
    sessionStorage.removeItem('authToken'); sessionStorage.removeItem('currentUser');
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    fetch(`${API_URL}/auth/customer/dashboard`, { headers: { Authorization: `Bearer ${authToken()}` } })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Unable to load your dashboard.');
        setCustomer({ name: data.user.full_name || data.user.email, memberSince: new Date(data.user.created_at).getFullYear().toString() });
        setOrders(data.orders.map((order: { id: string; garment: string; fabric: string | null; stage: string; estimated_ready: string | null; balance: number | string }) => ({ id: order.id, garment: order.garment, fabric: order.fabric || 'Fabric details to be confirmed', stageIndex: Math.max(0, STAGES.indexOf(order.stage)), due: formatDate(order.estimated_ready), balance: `${formatMoney(order.balance)} due on release` })));
        setMeasurements(data.measurements.map((measurement: { label: string; value: string }) => ({ label: measurement.label, value: measurement.value })));
        setNotifications(data.appointments.map((appointment: { appointment_at: string; appointment_type: string; job_card_number: string | null }) => ({ time: formatDate(appointment.appointment_at), label: appointment.appointment_type, detail: `${appointment.job_card_number || 'Your order'} — scheduled appointment`, kind: 'fitting' as const })));
        setPayments(data.payments.map((payment: { id: string; job: string | null; label: string; amount: number | string; paid_at: string }) => ({ id: payment.id, job: payment.job || '—', label: payment.label, amount: formatMoney(payment.amount), date: formatDate(payment.paid_at) })));
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'Unable to load your dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  const currentNavLabel = NAV.find((n) => n.view === view)?.label ?? 'Dashboard';

  function renderView() {
    switch (view) {
      case 'dashboard':
        return <DashboardView customer={customer} orders={orders} measurements={measurements} notifications={notifications} payments={payments} />;
      default:
        return <ComingSoonView label={currentNavLabel} />;
    }
  }

  return (
    <div className="customer-theme min-h-screen bg-[#FFFFFF] text-[#0F1F3D] antialiased flex" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <style>{FONT_IMPORT + CUSTOMER_THEME}</style>

      {/* faint blueprint grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: 'linear-gradient(#1F3B6B 0.5px, transparent 0.5px), linear-gradient(90deg, #1F3B6B 0.5px, transparent 0.5px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* ---------------- SIDEBAR ---------------- */}
      <aside
        className={`${navOpen ? 'fixed inset-y-0 left-0 translate-x-0' : 'fixed inset-y-0 left-0 -translate-x-full'} z-40 lg:relative lg:inset-auto lg:translate-x-0 lg:z-0 w-72 flex-shrink-0 h-screen lg:h-auto lg:min-h-screen text-[#FFFFFF] flex flex-col justify-between transition-transform duration-300 border-r border-[#1B2E52]`}
      >
        <div>
          <div className="flex items-center justify-between px-8 py-8 border-b border-[#1B2E52]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 border border-[#FFFFFF]/40 flex items-center justify-center">
                <span className="text-[#FFFFFF] text-[10px]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>A&T</span>
              </div>
              <div className="leading-tight">
                <div className="text-sm tracking-[0.04em] text-[#FFFFFF]" style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 700 }}>Ashlie's Tailor</div>
                <Eyebrow className="text-[#7C8FB8]">My account</Eyebrow>
              </div>
            </div>
            <button className="lg:hidden text-[#B7C2DB]" onClick={() => setNavOpen(false)} aria-label="Close menu">
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="px-4 py-8 space-y-1.5">
            {NAV.map((item) => {
              const active = view === item.view;
              return (
                <button
                  key={item.label}
                  onClick={() => { setView(item.view); setNavOpen(false); }}
                  className={`relative w-full flex items-center gap-3.5 px-4 py-3 text-[14px] transition-all ${
                    active ? 'bg-[#12224A] text-[#FFFFFF]' : 'text-[#8FA0C7] hover:text-[#FFFFFF] hover:bg-[#12224A]/60'
                  }`}
                >
                  {active ? <Notch tone="#FFFFFF" /> : <span className="w-[7px] flex-shrink-0" />}
                  <item.icon className="w-4 h-4" strokeWidth={1.6} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="px-8 py-6 border-t border-[#1B2E52] space-y-4">
          <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#FFFFFF]/10 border border-[#FFFFFF]/40 flex items-center justify-center">
            <span className="text-[#FFFFFF] text-xs font-bold">
              {customer.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </span>
          </div>
          <div className="leading-tight">
            <div className="text-[13px] text-[#FFFFFF]">{customer.name}</div>
            <Eyebrow className="text-[#7C8FB8]">Customer since {customer.memberSince}</Eyebrow>
          </div>
          </div>
          <button onClick={signOut} className="group flex w-full items-center justify-between border border-[#1B2E52] px-3 py-2.5 text-[10px] tracking-[0.16em] uppercase text-[#8FA0C7] transition-colors hover:border-[#FFFFFF]/60 hover:text-[#FFFFFF]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            Sign out <LogOut className="h-3.5 w-3.5 text-[#FFFFFF] transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </aside>

      {navOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setNavOpen(false)} />}

      {/* ---------------- MAIN ---------------- */}
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-20 backdrop-blur-md border-b px-6 sm:px-10 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button className="lg:hidden text-[#0F1F3D] flex-shrink-0" onClick={() => setNavOpen(true)} aria-label="Open menu">
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <Eyebrow className="block">My account / {currentNavLabel}</Eyebrow>
              <div className="text-[15px] text-[#0F1F3D] truncate" style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 700 }}>
                {currentNavLabel}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-5 flex-shrink-0">
            <div className="relative hidden md:flex items-center bg-[#F4F6FA] border border-[#D7DEE9] px-3 py-2 focus-within:border-[#1F3B6B] transition-colors">
              <Search className="w-3.5 h-3.5 text-[#4C6E93]" strokeWidth={1.5} />
              <input
                type="text"
                placeholder="Search my orders"
                className="w-44 bg-transparent placeholder-[#4C6E93] text-[12px] pl-2 focus:outline-none text-[#0F1F3D]"
              />
            </div>
            <button className="relative text-[#4C6E93] hover:text-[#0F1F3D] transition-colors" aria-label="Notifications">
              <Bell className="w-5 h-5" strokeWidth={1.5} />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#0F1F3D] ring-2 ring-[#FFFFFF]" />
            </button>
            <div className="h-6 w-px bg-[#D7DEE9] hidden sm:block" />
            <LiveDateTime />
          </div>
        </header>

        <main className="w-full px-6 sm:px-10 xl:px-12 py-10">
          {loading ? <div className="py-16 text-center text-sm text-[#4C6E93]">Loading your dashboard…</div> : error ? <div className="border border-[#0F1F3D]/20 bg-[#0F1F3D]/5 px-4 py-3 text-sm text-[#0F1F3D]">{error}</div> : renderView()}
        </main>
      </div>
    </div>
  );
}