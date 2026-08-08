import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function LiveDateTime() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return <MonoLabel className="hidden sm:inline">{now.toLocaleString(undefined, { weekday: 'short', month: 'short', day: '2-digit', hour: 'numeric', minute: '2-digit' })}</MonoLabel>;
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
  Check,
} from 'lucide-react';

/* ---------------------------------------------------------------
   CUSTOMER — Dashboard
   "The Job Docket", light + sidebar
   Workshop-docket language — pinned paper tickets, brass rivets,
   typewriter type, a checklist instead of a progress bar — set on
   a light kraft-paper canvas with navigation in a left sidebar.
------------------------------------------------------------------ */

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Special+Elite&family=Courier+Prime:wght@400;700&display=swap');

@keyframes riseIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes pulseRivet {
  0%, 100% { box-shadow: 0 0 0 0 rgba(193,68,59,0.35); }
  50% { box-shadow: 0 0 0 6px rgba(193,68,59,0); }
}
.dash-in { opacity: 0; animation: riseIn 0.5s cubic-bezier(0.22,1,0.36,1) forwards; }
`;

const CUSTOMER_THEME = `
.customer-theme { background: #EDE6D3; color: #241F16; }
.customer-theme aside { background: #201B17; }
.customer-theme header { background: rgba(237, 230, 211, .95); border-color: #D9CFAE; }
.customer-theme .docket { background: #F8F4E6; border-color: #D9CFAE; box-shadow: 0 1px 3px rgba(36,31,22,0.08); }
`;

function MonoLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`text-[10px] tracking-[0.22em] uppercase text-[#8A7F63] ${className}`}
      style={{ fontFamily: "'Courier Prime', monospace" }}
    >
      {children}
    </span>
  );
}

function Rivet({ className = '' }: { className?: string }) {
  return <span className={`absolute w-2.5 h-2.5 rounded-full bg-[#C89B4A] ring-2 ring-[#B4863C] shadow-[0_1px_2px_rgba(0,0,0,.25)] ${className}`} aria-hidden="true" />;
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
  fitting: { icon: CalendarClock, tone: '#4C6B8A' },
  pickup: { icon: PackageCheck, tone: '#3F6B4A' },
  reminder: { icon: Bell, tone: '#C1443B' },
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

function DashboardView({ customer, orders, measurements, notifications, payments }: { customer: typeof CUSTOMER; orders: typeof ACTIVE_ORDERS; measurements: typeof MEASUREMENTS; notifications: typeof NOTIFICATIONS; payments: typeof PAYMENT_HISTORY }) {
  const [selectedOrder, setSelectedOrder] = useState(orders[0]?.id || '');
  const order = orders.find((o) => o.id === selectedOrder) ?? orders[0];

  return (
    <div className="space-y-10">
      <div className="dash-in">
        <MonoLabel>Welcome back</MonoLabel>
        <h1 className="text-2xl sm:text-3xl leading-tight mt-2 text-[#241F16]" style={{ fontFamily: "'Special Elite', cursive" }}>
          {customer.name.split(' ')[0] || 'Welcome'}, here's where your garments stand.
        </h1>
      </div>

      {/* ---------------- THE JOB DOCKET (signature element) ---------------- */}
      <div className="dash-in docket relative border rounded-sm" style={{ transform: 'rotate(-0.4deg)' }}>
        <Rivet className="-top-1.5 left-8" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 sm:px-8 pt-7">
          <div>
            <MonoLabel>Job docket</MonoLabel>
            <h2 className="text-lg mt-1 text-[#241F16]" style={{ fontFamily: "'Special Elite', cursive" }}>Order in progress</h2>
          </div>
          {orders.length > 1 && (
            <div className="flex items-center gap-2">
              {orders.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setSelectedOrder(o.id)}
                  className={`px-3 py-1.5 text-[10px] tracking-[0.14em] uppercase border transition-colors ${
                    o.id === selectedOrder
                      ? 'bg-[#241F16] text-[#F8F4E6] border-[#241F16]'
                      : 'border-[#D9CFAE] text-[#8A7F63] hover:border-[#B7A97F]'
                  }`}
                  style={{ fontFamily: "'Courier Prime', monospace" }}
                >
                  {o.id}
                </button>
              ))}
            </div>
          )}
        </div>

        {order ? (
          <div className="flex flex-col sm:flex-row">
            {/* main stub */}
            <div className="flex-1 px-6 sm:px-8 pt-6 pb-8">
              <span className="text-[11px] text-[#B7A97F]" style={{ fontFamily: "'Courier Prime', monospace" }}>№ {order.id}</span>
              <h3 className="text-3xl mt-1 text-[#241F16]" style={{ fontFamily: "'Special Elite', cursive" }}>{order.garment}</h3>
              <p className="text-[13px] text-[#8A7F63] mt-1">{order.fabric}</p>

              {/* checklist — line items instead of a horizontal rail */}
              <div className="mt-7 space-y-3">
                {STAGES.map((s, i) => {
                  const done = i < order.stageIndex;
                  const current = i === order.stageIndex;
                  return (
                    <div key={s} className="flex items-center gap-3">
                      <span
                        className={`relative w-4 h-4 flex-shrink-0 rounded-full border flex items-center justify-center ${
                          done ? 'bg-[#241F16] border-[#241F16]' : current ? 'bg-[#F8F4E6] border-[#C1443B]' : 'bg-[#F8F4E6] border-[#D9CFAE]'
                        }`}
                        style={current ? { animation: 'pulseRivet 1.8s ease-in-out infinite' } : undefined}
                      >
                        {done && <Check className="w-2.5 h-2.5 text-[#F8F4E6]" strokeWidth={3} />}
                        {current && <span className="w-1.5 h-1.5 rounded-full bg-[#C1443B]" />}
                      </span>
                      <span className="flex-1 border-b border-dotted border-[#D9CFAE]" />
                      <span className={`text-[12.5px] ${current ? 'text-[#241F16] font-bold' : done ? 'text-[#8A7F63]' : 'text-[#B7A97F]'}`} style={{ fontFamily: "'Courier Prime', monospace" }}>
                        {s}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* tear-off stub */}
            <div className="sm:w-56 flex-shrink-0 px-6 sm:px-6 pb-8 sm:pt-7 border-t sm:border-t-0 sm:border-l border-dashed border-[#D9CFAE] flex sm:flex-col justify-between sm:justify-start gap-4">
              <div>
                <MonoLabel>Est. ready</MonoLabel>
                <div className="text-lg mt-1 text-[#241F16]" style={{ fontFamily: "'Special Elite', cursive" }}>{order.due}</div>
              </div>
              <div className="sm:mt-6">
                <MonoLabel>Balance</MonoLabel>
                <div className="text-[12px] mt-1 text-[#C1443B]" style={{ fontFamily: "'Courier Prime', monospace" }}>{order.balance}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-6 sm:px-8 py-12 text-center text-sm text-[#8A7F63]">You have no active orders yet.</div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-8">
        {/* ---------------- MEASUREMENT PROFILE — swatch tags ---------------- */}
        <div className="dash-in docket relative border rounded-sm p-6 sm:p-8" style={{ animationDelay: '0.1s', transform: 'rotate(0.3deg)' }}>
          <Rivet className="-top-1.5 left-8" />
          <div className="flex items-center justify-between mb-6">
            <div>
              <MonoLabel>On file</MonoLabel>
              <h2 className="text-lg mt-1 text-[#241F16]" style={{ fontFamily: "'Special Elite', cursive" }}>Measurement profile</h2>
            </div>
            <Ruler className="w-4 h-4 text-[#B7A97F]" strokeWidth={1.6} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {measurements.map((m, i) => (
              <div
                key={m.label}
                className="relative bg-[#EFE8D4] border border-[#D9CFAE] px-3 py-3 text-center"
                style={{ transform: `rotate(${i % 2 === 0 ? '-0.6deg' : '0.6deg'})` }}
              >
                <span className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#241F16]/10" aria-hidden="true" />
                <MonoLabel>{m.label}</MonoLabel>
                <div className="text-lg mt-1 text-[#241F16]" style={{ fontFamily: "'Courier Prime', monospace", fontWeight: 700 }}>{m.value}</div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-[#B7A97F] mt-6">{measurements.length ? `Last updated ${MEASUREMENTS_UPDATED}. Ask your tailor at your next fitting to update these.` : 'No measurements are on file yet.'}</p>
        </div>

        {/* ---------------- NOTIFICATIONS — index cards ---------------- */}
        <div className="dash-in docket relative border rounded-sm p-6 sm:p-8" style={{ animationDelay: '0.18s', transform: 'rotate(-0.25deg)' }}>
          <Rivet className="-top-1.5 left-8" />
          <div className="flex items-center justify-between mb-6">
            <div>
              <MonoLabel>Stay ahead</MonoLabel>
              <h2 className="text-lg mt-1 text-[#241F16]" style={{ fontFamily: "'Special Elite', cursive" }}>Notifications</h2>
            </div>
            <Bell className="w-4 h-4 text-[#B7A97F]" strokeWidth={1.6} />
          </div>
          <div className="space-y-4">
            {notifications.map((n, i) => {
              const meta = NOTIF_META[n.kind];
              const Icon = meta.icon;
              return (
                <div key={i} className="flex items-start gap-3 border-l-2 pl-3" style={{ borderColor: meta.tone }}>
                  <div className="w-7 h-7 flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: `${meta.tone}1A`, color: meta.tone }}>
                    <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[13px] text-[#241F16] font-bold">{n.label}</span>
                      <span className="text-[11px] text-[#B7A97F] flex-shrink-0" style={{ fontFamily: "'Courier Prime', monospace" }}>{n.time}</span>
                    </div>
                    <p className="text-[12.5px] text-[#8A7F63] mt-0.5">{n.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ---------------- PAYMENT HISTORY / RECEIPTS — carbon-copy ledger ---------------- */}
      <div className="dash-in docket relative border rounded-sm overflow-hidden" style={{ animationDelay: '0.26s', transform: 'rotate(0.15deg)' }}>
        <Rivet className="-top-1.5 left-8" />
        <div className="flex items-center justify-between px-6 sm:px-8 py-6">
          <div>
            <MonoLabel>Cash record</MonoLabel>
            <h2 className="text-lg mt-1 text-[#241F16]" style={{ fontFamily: "'Special Elite', cursive" }}>Payment history</h2>
          </div>
          <button className="flex items-center gap-1 text-[11px] tracking-[0.14em] uppercase text-[#C1443B]">
            View all <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="hidden md:grid grid-cols-[1fr_1fr_1.4fr_0.9fr_0.9fr_0.7fr] gap-4 px-8 py-2.5 border-t border-b border-dashed border-[#D9CFAE] bg-[#EFE8D4]">
          {['Receipt', 'Job card', 'Description', 'Amount', 'Date', ''].map((h) => (
            <MonoLabel key={h}>{h}</MonoLabel>
          ))}
        </div>
        {payments.map((p, i) => (
          <div
            key={p.id}
            className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1.4fr_0.9fr_0.9fr_0.7fr] gap-2 md:gap-4 px-6 sm:px-8 py-4 border-t border-dashed border-[#E1D9BC] first:border-t-0 items-center"
            style={{ backgroundColor: i % 2 === 1 ? 'rgba(36,31,22,0.03)' : 'transparent' }}
          >
            <span className="text-[12px] text-[#B7A97F]" style={{ fontFamily: "'Courier Prime', monospace" }}>{p.id}</span>
            <span className="text-[13px] text-[#241F16] font-bold">{p.job}</span>
            <span className="text-[13px] text-[#5F5740]">{p.label}</span>
            <span className="text-[13px] text-[#241F16]" style={{ fontFamily: "'Courier Prime', monospace", fontWeight: 700 }}>{p.amount}</span>
            <span className="text-[12px] text-[#8A7F63]">{p.date}</span>
            <button className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.1em] uppercase text-[#8A7F63] hover:text-[#241F16] transition-colors">
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
    <div className="dash-in docket relative border rounded-sm p-16 text-center">
      <Rivet className="-top-1.5 left-1/2 -translate-x-1/2" />
      <MonoLabel>{label}</MonoLabel>
      <h2 className="text-2xl mt-2 text-[#241F16]" style={{ fontFamily: "'Special Elite', cursive" }}>
        This page isn't built yet
      </h2>
      <p className="text-[13px] text-[#8A7F63] mt-2">Ask to have the {label} page created next.</p>
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
    <div className="customer-theme min-h-screen bg-[#EDE6D3] text-[#241F16] antialiased flex" style={{ fontFamily: "'Courier Prime', monospace" }}>
      <style>{FONT_IMPORT + CUSTOMER_THEME}</style>

      {/* faint paper grain */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage: 'radial-gradient(#241F16 0.6px, transparent 0.6px)',
          backgroundSize: '14px 14px',
        }}
      />

      {/* ---------------- SIDEBAR ---------------- */}
      <aside
        className={`${navOpen ? 'fixed inset-y-0 left-0 translate-x-0' : 'fixed inset-y-0 left-0 -translate-x-full'} z-40 lg:relative lg:inset-auto lg:translate-x-0 lg:z-0 w-72 flex-shrink-0 h-screen lg:h-auto lg:min-h-screen bg-[#201B17] text-[#F3EEDA] flex flex-col justify-between transition-transform duration-300`}
      >
        <div>
          <div className="flex items-center justify-between px-8 py-8 border-b border-[#3A332C]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 border border-[#C89B4A]/60 bg-[#C89B4A]/5 flex items-center justify-center rotate-3">
                <span className="text-[#C89B4A] text-[10px]" style={{ fontFamily: "'Courier Prime', monospace" }}>A&T</span>
              </div>
              <div className="leading-tight">
                <div className="text-sm tracking-[0.06em] text-[#F3EEDA]" style={{ fontFamily: "'Special Elite', cursive" }}>Ashlie's Tailor</div>
                <MonoLabel className="text-[#8A7F63]">My account</MonoLabel>
              </div>
            </div>
            <button className="lg:hidden text-[#B7A97F]" onClick={() => setNavOpen(false)} aria-label="Close menu">
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
                  className={`relative w-full flex items-center gap-3.5 px-4 py-3 text-[14px] transition-all border-l-2 ${
                    active
                      ? 'bg-[#28221D] border-[#C89B4A] text-[#F3EEDA]'
                      : 'border-transparent text-[#B7A97F] hover:text-[#F3EEDA] hover:bg-[#28221D]/70'
                  }`}
                >
                  {active && <Rivet className="w-1.5 h-1.5 top-1/2 -translate-y-1/2 -left-[3px]" />}
                  <item.icon className="w-4 h-4" strokeWidth={1.6} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="px-8 py-6 border-t border-[#3A332C] space-y-4">
          <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#C89B4A]/20 border border-[#C89B4A]/50 flex items-center justify-center">
            <span className="text-[#C89B4A] text-xs font-bold">
              {customer.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </span>
          </div>
          <div className="leading-tight">
            <div className="text-[13px] text-[#F3EEDA]">{customer.name}</div>
            <MonoLabel className="text-[#8A7F63]">Customer since {customer.memberSince}</MonoLabel>
          </div>
          </div>
          <button onClick={signOut} className="group flex w-full items-center justify-between border border-[#3A332C] px-3 py-2.5 text-[10px] tracking-[0.16em] uppercase text-[#B7A97F] transition-colors hover:border-[#C89B4A] hover:bg-[#C89B4A]/10 hover:text-[#F3EEDA]">
            Sign out <LogOut className="h-3.5 w-3.5 text-[#C89B4A] transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </aside>

      {navOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setNavOpen(false)} />}

      {/* ---------------- MAIN ---------------- */}
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-20 bg-[#EDE6D3]/95 backdrop-blur-md border-b border-[#D9CFAE] px-6 sm:px-10 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button className="lg:hidden text-[#241F16] flex-shrink-0" onClick={() => setNavOpen(true)} aria-label="Open menu">
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <MonoLabel className="block">My account / {currentNavLabel}</MonoLabel>
              <div className="text-[15px] text-[#241F16] truncate" style={{ fontFamily: "'Special Elite', cursive" }}>
                {currentNavLabel}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-5 flex-shrink-0">
            <div className="relative hidden md:flex items-center bg-[#F8F4E6] border border-[#D9CFAE] px-3 py-2 focus-within:border-[#B7A97F] transition-colors">
              <Search className="w-3.5 h-3.5 text-[#B7A97F]" strokeWidth={1.5} />
              <input
                type="text"
                placeholder="Search my orders"
                className="w-44 bg-transparent placeholder-[#B7A97F] text-[12px] pl-2 focus:outline-none"
              />
            </div>
            <button className="relative text-[#5F5740] hover:text-[#241F16] transition-colors" aria-label="Notifications">
              <Bell className="w-5 h-5" strokeWidth={1.5} />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#C1443B] ring-2 ring-[#EDE6D3]" />
            </button>
            <div className="h-6 w-px bg-[#D9CFAE] hidden sm:block" />
            <LiveDateTime />
          </div>
        </header>

        <main className="w-full px-6 sm:px-10 xl:px-12 py-10">
          {loading ? <div className="py-16 text-center text-sm text-[#8A7F63]">Loading your dashboard…</div> : error ? <div className="border border-[#C1443B]/30 bg-[#C1443B]/10 px-4 py-3 text-sm text-[#8B3235]">{error}</div> : renderView()}
        </main>
      </div>
    </div>
  );
}