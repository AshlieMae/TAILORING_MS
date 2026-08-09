import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FrontDeskCustomersExactView } from '../Pages_Frontdesk/CustomersdeskExact';
import { FrontDeskOrdersView } from '../Pages_Frontdesk/Ordersdesk';
import { FrontDeskMeasurementsView } from '../Pages_Frontdesk/Measurementsdesk';
import { FrontDeskAppointmentsView } from '../Pages_Frontdesk/Appointmentsdesk';
import { FrontDeskPaymentsView } from '../Pages_Frontdesk/Paymentsdesk';
import { FrontDeskSettingsView } from '../Pages_Frontdesk/Settingsdesk';

// NOTE: this file adds data visualizations using "recharts".
// If it isn't already in package.json, install it once with:
//   npm install recharts
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

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
  Users,
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
  UserPlus,
  FilePlus2,
  Banknote,
  CalendarPlus,
  Package,
  PackageCheck,
  Printer,
  Clock,
  CheckCircle2,
  Check,
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  LogOut,
  TrendingUp,
  ArrowUpRight,
} from 'lucide-react';

/* ---------------------------------------------------------------
   FRONT DESK — Dashboard
   Premium Creamy Beige & Espresso "counter ledger" theme, with
   real production/revenue charts. Functionality is unchanged —
   only presentation, plus additive chart components.
------------------------------------------------------------------ */

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Space+Mono:wght@400;700&display=swap');

@keyframes riseIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes drawLedgerLine {
  from { opacity: 0; transform: scaleX(0); }
  to { opacity: 1; transform: scaleX(1); }
}
@keyframes stampIn {
  from { opacity: 0; transform: scale(0.85) rotate(-4deg); }
  to { opacity: 1; transform: scale(1) rotate(-4deg); }
}
.dash-in { opacity: 0; animation: riseIn 0.55s cubic-bezier(0.22,1,0.36,1) forwards; }
`;

const FRONT_DESK_THEME = `
.frontdesk-theme { background: #FAF7F2; color: #2A211D; }
.frontdesk-theme aside { background: #EFE7DC; border-right: 1px solid #E2D7C7; box-shadow: 1px 0 0 rgba(255,255,255,0.5) inset; }
.frontdesk-theme header { background: rgba(250, 247, 242, 0.92); border-color: #E8DFD3; box-shadow: 0 1px 0 rgba(232,223,211,0.9), 0 10px 24px -18px rgba(42,33,29,0.35); }
.frontdesk-theme .dash-card {
  background: #FFFFFF;
  border: 1px solid #ECE2D3;
  box-shadow: 0 1px 1px rgba(42,33,29,0.03), 0 12px 28px -16px rgba(42,33,29,0.14), inset 0 1px 0 rgba(255,255,255,0.7);
  position: relative;
}
.frontdesk-theme .dash-card::before {
  content: '';
  position: absolute; inset: 0 0 auto 0; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(184,146,85,0.35), transparent);
  border-radius: inherit;
}
.ticket-edge { background-image: linear-gradient(135deg, #FAF7F2 25%, transparent 25%), linear-gradient(225deg, #FAF7F2 25%, transparent 25%); background-size: 14px 14px; background-position: 0 0; background-color: #FFFFFF; }
.frontdesk-theme .module-customers > :first-child > :first-child { padding: 1.5rem; border: 1px solid #E8DFD3; border-radius: 1rem; background: linear-gradient(115deg, #FFFDF9 0%, #F3E8D9 100%); }
.frontdesk-theme .module-orders > :first-child > :first-child { padding: 1.5rem; border-radius: 1rem; color: #FFF9F1; background: linear-gradient(118deg, #392A23, #76523B); }
.frontdesk-theme .module-orders > :first-child > :first-child h1, .frontdesk-theme .module-orders > :first-child > :first-child p, .frontdesk-theme .module-orders > :first-child > :first-child span { color: inherit; }
.frontdesk-theme .module-measurements > :first-child > :first-child { padding: 1.5rem; border: 1px solid #D8E4DE; border-radius: 1rem; background: linear-gradient(115deg, #F9FCF9, #E5F0EA); }
.frontdesk-theme .module-appointments > :first-child > :first-child { padding: 1.5rem; border: 1px solid #DCD5E8; border-radius: 1rem; background: linear-gradient(115deg, #FCFAFF, #ECE6F6); }
.frontdesk-theme .module-payments > :first-child > :first-child { padding: 1.5rem; border: 1px solid #E9DDB7; border-radius: 1rem; background: linear-gradient(115deg, #FFFCF2, #F6EACB); }
.frontdesk-theme .module-settings > :first-child > :first-child { padding: 1.5rem; border: 1px solid #D7D5D2; border-radius: 1rem; background: linear-gradient(115deg, #FFFFFF, #F1EFEB); }
.frontdesk-theme .module-settings > :first-child { width: 100%; max-width: none; }
`;

function MonoLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`text-[10px] tracking-[0.22em] uppercase text-[#8C7E74] font-medium ${className}`}
      style={{ fontFamily: "'Space Mono', monospace" }}
    >
      {children}
    </span>
  );
}

const GARMENT_TYPES = ['Barong Tagalog', 'Two-piece Suit', "Women's Coat", 'Evening Gown', 'School Uniform Set', 'Custom garment'];
const FITTING_STAGES = ['Measuring', 'Pattern Cutting', 'Initial Assembly', 'First Fitting', 'Final Alterations', 'Ready for Pickup'];
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const authToken = () => localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

function currentUser() {
  const stored = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
  try { return stored ? JSON.parse(stored) : null; } catch { return null; }
}

/* ---------------------------------------------------------------
   Register customer modal
------------------------------------------------------------------ */
export interface NewCustomerForm {
  lastName: string;
  middleName: string;
  firstName: string;
  suffix: string;
  contact: string;
  email: string;
  password: string;
  address: string;
}

export function RegisterCustomerModal({
  onClose,
  onRegister,
}: {
  onClose: () => void;
  onRegister: (form: NewCustomerForm) => Promise<void>;
}) {
  const [form, setForm] = useState<NewCustomerForm>({ lastName: '', middleName: '', firstName: '', suffix: '', contact: '', email: '', password: '', address: '' });
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.lastName.trim() || !form.firstName.trim() || !form.contact.trim() || !form.email.trim() || !form.password) {
      setError('Last name, first name, contact number, email, and temporary password are required.');
      return;
    }
    if (form.password.length < 8) {
      setError('Temporary password must be at least 8 characters.');
      return;
    }
    try { await onRegister(form); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to register customer.'); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#1F1916]/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-[#FFFFFF] border border-[#E8DFD3] rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-7 sm:px-10 pt-8 pb-2">
          <MonoLabel>New customer</MonoLabel>
          <button onClick={onClose} aria-label="Close" className="text-[#A3958B] hover:text-[#2A211D] transition-colors p-1 rounded-full hover:bg-[#F2ECE1]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-7 sm:px-10 pb-9 pt-2">
          <h2 className="text-3xl leading-tight mb-2 text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Register customer
          </h2>
          <p className="text-[14px] text-[#766A62] font-light mb-8 leading-relaxed">
            Create a customer account at the counter. It will remain pending until an Admin approves it.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div role="alert" className="border border-[#C86A58]/30 bg-[#FDF4F2] px-4 py-3 rounded-lg text-sm text-[#9A3B2A]">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
              <div>
                <label htmlFor="custLastName" className="block mb-1.5"><MonoLabel>Last name</MonoLabel></label>
                <div className="relative flex items-center border-b border-[#E2D7C7] focus-within:border-[#2A211D] transition-colors">
                  <User className="w-4 h-4 text-[#A3958B]" strokeWidth={1.5} />
                  <input id="custLastName" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} placeholder="Dela Cruz" className="w-full bg-transparent placeholder-[#C2B5A8] text-[14px] pl-3 py-2.5 focus:outline-none text-[#2A211D]" />
                </div>
              </div>
              <div>
                <label htmlFor="custMiddleName" className="block mb-1.5"><MonoLabel>Middle name</MonoLabel></label>
                <div className="border-b border-[#E2D7C7] focus-within:border-[#2A211D] transition-colors">
                  <input id="custMiddleName" value={form.middleName} onChange={(e) => setForm((f) => ({ ...f, middleName: e.target.value }))} placeholder="Santos" className="w-full bg-transparent placeholder-[#C2B5A8] text-[14px] py-2.5 focus:outline-none text-[#2A211D]" />
                </div>
              </div>
              <div>
                <label htmlFor="custFirstName" className="block mb-1.5"><MonoLabel>First name</MonoLabel></label>
                <div className="border-b border-[#E2D7C7] focus-within:border-[#2A211D] transition-colors">
                  <input id="custFirstName" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} placeholder="Juana" className="w-full bg-transparent placeholder-[#C2B5A8] text-[14px] py-2.5 focus:outline-none text-[#2A211D]" />
                </div>
              </div>
              <div>
                <label htmlFor="custSuffix" className="block mb-1.5"><MonoLabel>Suffix (optional)</MonoLabel></label>
                <div className="border-b border-[#E2D7C7] focus-within:border-[#2A211D] transition-colors">
                  <input id="custSuffix" value={form.suffix} onChange={(e) => setForm((f) => ({ ...f, suffix: e.target.value }))} placeholder="Jr., Sr., III" className="w-full bg-transparent placeholder-[#C2B5A8] text-[14px] py-2.5 focus:outline-none text-[#2A211D]" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
              <div>
                <label htmlFor="custContact" className="block mb-1.5"><MonoLabel>Contact number</MonoLabel></label>
                <div className="relative flex items-center border-b border-[#E2D7C7] focus-within:border-[#2A211D] transition-colors">
                  <Phone className="w-4 h-4 text-[#A3958B]" strokeWidth={1.5} />
                  <input id="custContact" value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} placeholder="0917 000 0000" className="w-full bg-transparent placeholder-[#C2B5A8] text-[14px] pl-3 py-2.5 focus:outline-none text-[#2A211D]" />
                </div>
              </div>
              <div>
                <label htmlFor="custEmail" className="block mb-1.5"><MonoLabel>Email address</MonoLabel></label>
                <div className="relative flex items-center border-b border-[#E2D7C7] focus-within:border-[#2A211D] transition-colors">
                  <Mail className="w-4 h-4 text-[#A3958B]" strokeWidth={1.5} />
                  <input id="custEmail" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="you@example.com" required className="w-full bg-transparent placeholder-[#C2B5A8] text-[14px] pl-3 py-2.5 focus:outline-none text-[#2A211D]" />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="custPassword" className="block mb-1.5"><MonoLabel>Temporary password</MonoLabel></label>
              <div className="relative flex items-center border-b border-[#E2D7C7] focus-within:border-[#2A211D] transition-colors">
                <Lock className="w-4 h-4 text-[#A3958B]" strokeWidth={1.5} />
                <input id="custPassword" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="At least 8 characters" required className="w-full bg-transparent placeholder-[#C2B5A8] text-[14px] pl-3 py-2.5 focus:outline-none text-[#2A211D]" />
              </div>
            </div>

            <div>
              <label htmlFor="custAddress" className="block mb-1.5"><MonoLabel>Address (optional)</MonoLabel></label>
              <div className="relative flex items-center border-b border-[#E2D7C7] focus-within:border-[#2A211D] transition-colors">
                <MapPin className="w-4 h-4 text-[#A3958B]" strokeWidth={1.5} />
                <input id="custAddress" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Street, Barangay, City" className="w-full bg-transparent placeholder-[#C2B5A8] text-[14px] pl-3 py-2.5 focus:outline-none text-[#2A211D]" />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-lg border border-[#E2D7C7] text-[#766A62] text-[11px] font-semibold tracking-[0.14em] uppercase hover:bg-[#F2ECE1] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-3 rounded-lg bg-[#2A211D] text-[#FAF7F2] text-[11px] font-semibold tracking-[0.14em] uppercase hover:bg-[#3D312B] transition-colors shadow-md"
              >
                Register customer
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   Create order modal
------------------------------------------------------------------ */
export interface NewOrderForm {
  customer: string;
  garment: string;
  fabric: string;
  dueDate: string;
}

export function CreateOrderModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (form: NewOrderForm) => void;
}) {
  const [form, setForm] = useState<NewOrderForm>({ customer: '', garment: GARMENT_TYPES[0], fabric: '', dueDate: '' });
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customer.trim()) {
      setError('Customer name is required.');
      return;
    }
    onCreate(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#1F1916]/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-[#FFFFFF] border border-[#E8DFD3] rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-7 sm:px-10 pt-8 pb-2">
          <MonoLabel>New job card</MonoLabel>
          <button onClick={onClose} aria-label="Close" className="text-[#A3958B] hover:text-[#2A211D] transition-colors p-1 rounded-full hover:bg-[#F2ECE1]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-7 sm:px-10 pb-9 pt-2">
          <h2 className="text-3xl leading-tight mb-2 text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Create order
          </h2>
          <p className="text-[14px] text-[#766A62] font-light mb-8 leading-relaxed">
            Opens a new job card at the Measuring stage. Fabric quantity and measurements follow.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div role="alert" className="border border-[#C86A58]/30 bg-[#FDF4F2] px-4 py-3 rounded-lg text-sm text-[#9A3B2A]">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="orderCustomer" className="block mb-1.5"><MonoLabel>Customer</MonoLabel></label>
              <div className="relative flex items-center border-b border-[#E2D7C7] focus-within:border-[#2A211D] transition-colors">
                <User className="w-4 h-4 text-[#A3958B]" strokeWidth={1.5} />
                <input id="orderCustomer" value={form.customer} onChange={(e) => setForm((f) => ({ ...f, customer: e.target.value }))} placeholder="Customer full name" className="w-full bg-transparent placeholder-[#C2B5A8] text-[14px] pl-3 py-2.5 focus:outline-none text-[#2A211D]" />
              </div>
            </div>

            <div>
              <label htmlFor="orderGarment" className="block mb-1.5"><MonoLabel>Garment type</MonoLabel></label>
              <select
                id="orderGarment"
                value={form.garment}
                onChange={(e) => setForm((f) => ({ ...f, garment: e.target.value }))}
                className="w-full bg-transparent border-b border-[#E2D7C7] focus:border-[#2A211D] text-[14px] py-2.5 focus:outline-none text-[#2A211D]"
              >
                {GARMENT_TYPES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
              <div>
                <label htmlFor="orderFabric" className="block mb-1.5"><MonoLabel>Fabric (optional)</MonoLabel></label>
                <div className="border-b border-[#E2D7C7] focus-within:border-[#2A211D] transition-colors">
                  <input id="orderFabric" value={form.fabric} onChange={(e) => setForm((f) => ({ ...f, fabric: e.target.value }))} placeholder="Italian Wool — Charcoal" className="w-full bg-transparent placeholder-[#C2B5A8] text-[14px] py-2.5 focus:outline-none text-[#2A211D]" />
                </div>
              </div>
              <div>
                <label htmlFor="orderDue" className="block mb-1.5"><MonoLabel>Due date (optional)</MonoLabel></label>
                <div className="border-b border-[#E2D7C7] focus-within:border-[#2A211D] transition-colors">
                  <input id="orderDue" type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} className="w-full bg-transparent text-[14px] py-2.5 focus:outline-none text-[#2A211D]" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-lg border border-[#E2D7C7] text-[#766A62] text-[11px] font-semibold tracking-[0.14em] uppercase hover:bg-[#F2ECE1] transition-colors">
                Cancel
              </button>
              <button type="submit" className="flex-1 px-4 py-3 rounded-lg bg-[#2A211D] text-[#FAF7F2] text-[11px] font-semibold tracking-[0.14em] uppercase hover:bg-[#3D312B] transition-colors shadow-md">
                Create order
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   Record payment modal
------------------------------------------------------------------ */
interface NewPaymentForm {
  jobCardId: string;
  paymentType: 'deposit' | 'final';
  amount: string;
}

function RecordPaymentModal({
  onClose,
  onRecord,
}: {
  onClose: () => void;
  onRecord: (form: NewPaymentForm) => void;
}) {
  const [form, setForm] = useState<NewPaymentForm>({ jobCardId: '', paymentType: 'deposit', amount: '' });
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amountNum = Number(form.amount);
    if (!form.jobCardId.trim()) {
      setError('Job card ID is required.');
      return;
    }
    if (!form.amount.trim() || Number.isNaN(amountNum) || amountNum <= 0) {
      setError('Enter a valid payment amount.');
      return;
    }
    onRecord(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#1F1916]/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-[#FFFFFF] border border-[#E8DFD3] rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-7 sm:px-10 pt-8 pb-2">
          <MonoLabel>Cash transaction</MonoLabel>
          <button onClick={onClose} aria-label="Close" className="text-[#A3958B] hover:text-[#2A211D] transition-colors p-1 rounded-full hover:bg-[#F2ECE1]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-7 sm:px-10 pb-9 pt-2">
          <h2 className="text-3xl leading-tight mb-2 text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Record payment
          </h2>
          <p className="text-[14px] text-[#766A62] font-light mb-8 leading-relaxed">
            Logs a cash payment against a job card and prints a receipt.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div role="alert" className="border border-[#C86A58]/30 bg-[#FDF4F2] px-4 py-3 rounded-lg text-sm text-[#9A3B2A]">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="payJobCard" className="block mb-1.5"><MonoLabel>Job card ID</MonoLabel></label>
              <div className="border-b border-[#E2D7C7] focus-within:border-[#2A211D] transition-colors">
                <input id="payJobCard" value={form.jobCardId} onChange={(e) => setForm((f) => ({ ...f, jobCardId: e.target.value }))} placeholder="JC-3021" className="w-full bg-transparent placeholder-[#C2B5A8] text-[14px] py-2.5 focus:outline-none text-[#2A211D]" />
              </div>
            </div>

            <div>
              <label className="block mb-2"><MonoLabel>Payment type</MonoLabel></label>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { key: 'deposit', label: 'Deposit (50%)' },
                  { key: 'final', label: 'Final balance' },
                ] as const).map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, paymentType: t.key }))}
                    className={`px-3 py-3 rounded-lg border text-[11px] font-semibold tracking-[0.08em] uppercase transition-all ${
                      form.paymentType === t.key
                        ? 'bg-[#2A211D] border-[#2A211D] text-[#FAF7F2] shadow-sm'
                        : 'border-[#E2D7C7] text-[#766A62] hover:border-[#A3958B] hover:bg-[#FAF7F2]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="payAmount" className="block mb-1.5"><MonoLabel>Amount (₱)</MonoLabel></label>
              <div className="relative flex items-center border-b border-[#E2D7C7] focus-within:border-[#2A211D] transition-colors">
                <Banknote className="w-4 h-4 text-[#A3958B]" strokeWidth={1.5} />
                <input id="payAmount" type="number" min="0" step="1" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="2,400" className="w-full bg-transparent placeholder-[#C2B5A8] text-[14px] pl-3 py-2.5 focus:outline-none text-[#2A211D]" />
              </div>
              <p className="text-[11px] text-[#A3958B] mt-2">Cash only. A receipt is printed automatically once recorded.</p>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-lg border border-[#E2D7C7] text-[#766A62] text-[11px] font-semibold tracking-[0.14em] uppercase hover:bg-[#F2ECE1] transition-colors">
                Cancel
              </button>
              <button type="submit" className="flex-1 px-4 py-3 rounded-lg bg-[#2A211D] text-[#FAF7F2] text-[11px] font-semibold tracking-[0.14em] uppercase hover:bg-[#3D312B] transition-colors shadow-md">
                Record payment
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   Schedule fitting modal
------------------------------------------------------------------ */
interface NewFittingForm {
  customer: string;
  garment: string;
  time: string;
  stage: string;
}

function ScheduleFittingModal({
  onClose,
  onSchedule,
}: {
  onClose: () => void;
  onSchedule: (form: NewFittingForm) => void;
}) {
  const [form, setForm] = useState<NewFittingForm>({ customer: '', garment: '', time: '', stage: FITTING_STAGES[3] });
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customer.trim() || !form.garment.trim() || !form.time.trim()) {
      setError('Customer, garment, and time are required.');
      return;
    }
    onSchedule(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#1F1916]/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-[#FFFFFF] border border-[#E8DFD3] rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-7 sm:px-10 pt-8 pb-2">
          <MonoLabel>Fitting scheduler</MonoLabel>
          <button onClick={onClose} aria-label="Close" className="text-[#A3958B] hover:text-[#2A211D] transition-colors p-1 rounded-full hover:bg-[#F2ECE1]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-7 sm:px-10 pb-9 pt-2">
          <h2 className="text-3xl leading-tight mb-2 text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Schedule fitting
          </h2>
          <p className="text-[14px] text-[#766A62] font-light mb-8 leading-relaxed">
            Books an appointment slot on today's fitting scheduler.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div role="alert" className="border border-[#C86A58]/30 bg-[#FDF4F2] px-4 py-3 rounded-lg text-sm text-[#9A3B2A]">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="fitCustomer" className="block mb-1.5"><MonoLabel>Customer</MonoLabel></label>
              <div className="relative flex items-center border-b border-[#E2D7C7] focus-within:border-[#2A211D] transition-colors">
                <User className="w-4 h-4 text-[#A3958B]" strokeWidth={1.5} />
                <input id="fitCustomer" value={form.customer} onChange={(e) => setForm((f) => ({ ...f, customer: e.target.value }))} placeholder="Customer full name" className="w-full bg-transparent placeholder-[#C2B5A8] text-[14px] pl-3 py-2.5 focus:outline-none text-[#2A211D]" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
              <div>
                <label htmlFor="fitGarment" className="block mb-1.5"><MonoLabel>Garment</MonoLabel></label>
                <div className="border-b border-[#E2D7C7] focus-within:border-[#2A211D] transition-colors">
                  <input id="fitGarment" value={form.garment} onChange={(e) => setForm((f) => ({ ...f, garment: e.target.value }))} placeholder="Barong Tagalog" className="w-full bg-transparent placeholder-[#C2B5A8] text-[14px] py-2.5 focus:outline-none text-[#2A211D]" />
                </div>
              </div>
              <div>
                <label htmlFor="fitTime" className="block mb-1.5"><MonoLabel>Time</MonoLabel></label>
                <div className="relative flex items-center border-b border-[#E2D7C7] focus-within:border-[#2A211D] transition-colors">
                  <Clock className="w-4 h-4 text-[#A3958B]" strokeWidth={1.5} />
                  <input id="fitTime" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} placeholder="4:30 PM" className="w-full bg-transparent placeholder-[#C2B5A8] text-[14px] pl-3 py-2.5 focus:outline-none text-[#2A211D]" />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="fitStage" className="block mb-1.5"><MonoLabel>Stage</MonoLabel></label>
              <select
                id="fitStage"
                value={form.stage}
                onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))}
                className="w-full bg-transparent border-b border-[#E2D7C7] focus:border-[#2A211D] text-[14px] py-2.5 focus:outline-none text-[#2A211D]"
              >
                {FITTING_STAGES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-lg border border-[#E2D7C7] text-[#766A62] text-[11px] font-semibold tracking-[0.14em] uppercase hover:bg-[#F2ECE1] transition-colors">
                Cancel
              </button>
              <button type="submit" className="flex-1 px-4 py-3 rounded-lg bg-[#2A211D] text-[#FAF7F2] text-[11px] font-semibold tracking-[0.14em] uppercase hover:bg-[#3D312B] transition-colors shadow-md">
                Schedule fitting
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Sample data ---------------- */

const TODAY_STATS_INIT = {
  collected: 18650,
  walkIns: 11,
  fittings: 5,
  pickups: 4,
};

const DAY_BOOK: { time: string; label: string; detail: string; kind: 'customer' | 'order' | 'payment' | 'pickup' | 'appointment' }[] = [
  { time: '9:04 AM', label: 'New customer', detail: 'Reyna Fuentes registered', kind: 'customer' },
  { time: '9:20 AM', label: 'Order created', detail: 'JC-3021 — Barong Tagalog for Reyna Fuentes', kind: 'order' },
  { time: '9:22 AM', label: 'Deposit received', detail: '₱2,400 — JC-3021, cash', kind: 'payment' },
  { time: '10:15 AM', label: 'Garment released', detail: 'JC-3010 — Tomas Villareal, balance settled', kind: 'pickup' },
  { time: '11:02 AM', label: 'Order created', detail: 'JC-3022 — Two-piece Suit for Boyet Salcedo', kind: 'order' },
  { time: '11:40 AM', label: 'Final payment', detail: '₱6,250 — JC-3005, cash', kind: 'payment' },
  { time: '1:18 PM', label: 'New customer', detail: 'Marisol Chan registered', kind: 'customer' },
];

const DAY_BOOK_META: Record<string, { icon: typeof UserPlus; tone: string; bg: string }> = {
  customer: { icon: UserPlus, tone: '#8C6F3E', bg: '#F9F4EB' },
  order: { icon: FilePlus2, tone: '#4A6B82', bg: '#F0F5F8' },
  payment: { icon: Banknote, tone: '#4E7357', bg: '#F1F6F2' },
  pickup: { icon: PackageCheck, tone: '#9E5B4B', bg: '#FAF2F0' },
  appointment: { icon: CalendarPlus, tone: '#715A80', bg: '#F5F2F7' },
};

const FITTINGS_TODAY_INIT = [
  { time: '2:00 PM', customer: 'Consuelo Reyes', garment: "Women's Coat", stage: 'Final Alterations' },
  { time: '2:45 PM', customer: 'Delfin Ortega', garment: 'Two-piece Suit', stage: 'First Fitting' },
  { time: '3:30 PM', customer: 'Reyna Fuentes', garment: 'Barong Tagalog', stage: 'First Fitting' },
  { time: '4:15 PM', customer: 'Marisol Chan', garment: 'Evening Gown', stage: 'Initial Assembly' },
];

const PICKUP_QUEUE = [
  { id: 'JC-3018', customer: 'Tomas Villareal', garment: 'School Uniform Set', balance: '₱0 — paid in full' },
  { id: 'JC-3007', customer: 'Boyet Salcedo', garment: 'Barong Tagalog', balance: '₱1,200 due on release' },
  { id: 'JC-3012', customer: 'Consuelo Reyes', garment: "Women's Coat", balance: '₱0 — paid in full' },
];

/* Illustrative chart data — purely presentational, doesn't touch app state or logic. */
const WEEKLY_REVENUE = [
  { day: 'Mon', amount: 12400 },
  { day: 'Tue', amount: 15800 },
  { day: 'Wed', amount: 9200 },
  { day: 'Thu', amount: 17650 },
  { day: 'Fri', amount: 21300 },
  { day: 'Sat', amount: 26800 },
  { day: 'Sun', amount: 18650 },
];

const PRODUCTION_MIX = [
  { stage: 'Measuring', count: 4, color: '#C9BBA6' },
  { stage: 'Pattern cutting', count: 6, color: '#8FAF9E' },
  { stage: 'Assembly', count: 8, color: '#C9A15C' },
  { stage: 'Fitting', count: 5, color: '#A8644A' },
  { stage: 'Ready for pickup', count: 3, color: '#6E8F72' },
];

const COLLECTED_SPARK = [9, 12, 8, 15, 11, 17, 18.65];

type ViewKey = 'dashboard' | 'customers' | 'orders' | 'measurements' | 'appointments' | 'payments' | 'settings';

const NAV: { label: string; icon: typeof LayoutDashboard; view: ViewKey }[] = [
  { label: 'Dashboard', icon: LayoutDashboard, view: 'dashboard' },
  { label: 'Customers', icon: Users, view: 'customers' },
  { label: 'Orders', icon: Shirt, view: 'orders' },
  { label: 'Measurements', icon: Ruler, view: 'measurements' },
  { label: 'Appointments', icon: CalendarClock, view: 'appointments' },
  { label: 'Payments', icon: Wallet, view: 'payments' },
  { label: 'Settings', icon: Settings, view: 'settings' },
];

/* ==================================================================
   CHART COMPONENTS — additive, presentational only
================================================================== */

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#E2D7C7] bg-[#FFFCF8] px-3 py-2 shadow-lg">
      <div className="text-[10px] uppercase tracking-[0.14em] text-[#8C7E74]" style={{ fontFamily: "'Space Mono', monospace" }}>{label}</div>
      <div className="text-[13px] font-semibold text-[#2A211D] mt-0.5">₱{Number(payload[0].value).toLocaleString()}</div>
    </div>
  );
}

function RevenueTrendCard() {
  return (
    <div className="dash-in dash-card rounded-xl p-6 sm:p-7" style={{ animationDelay: '0.42s' }}>
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <MonoLabel>Weekly ledger</MonoLabel>
          <h2 className="text-xl font-normal mt-0.5 text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>Revenue trend</h2>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F0] border border-[#C7DDD3] px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] uppercase text-[#4E7357] flex-shrink-0">
          <TrendingUp className="w-3 h-3" strokeWidth={2} /> +14.6%
        </span>
      </div>
      <p className="text-[12.5px] text-[#8C7E74] mb-5">Cash collected at the counter, last 7 days</p>
      <div className="h-48 -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={WEEKLY_REVENUE} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#B89255" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#B89255" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#ECE3D8" strokeDasharray="3 4" />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: '#A3958B', fontSize: 11, fontFamily: 'Space Mono, monospace' }} />
            <YAxis hide domain={['dataMin - 3000', 'dataMax + 3000']} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#D9C8B7', strokeWidth: 1 }} />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#8C6F3E"
              strokeWidth={2.25}
              fill="url(#revenueFill)"
              dot={{ r: 3, stroke: '#8C6F3E', strokeWidth: 2, fill: '#FFFFFF' }}
              activeDot={{ r: 5, fill: '#8C6F3E' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ProductionMixCard() {
  const total = PRODUCTION_MIX.reduce((sum, s) => sum + s.count, 0);
  return (
    <div className="dash-in dash-card rounded-xl p-6 sm:p-7" style={{ animationDelay: '0.46s' }}>
      <MonoLabel>Workshop floor</MonoLabel>
      <h2 className="text-xl font-normal mt-0.5 mb-1 text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>Production mix</h2>
      <p className="text-[12.5px] text-[#8C7E74] mb-5">{total} garments currently in progress, by stage</p>
      <div className="flex items-center gap-6">
        <div className="relative h-32 w-32 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={PRODUCTION_MIX} dataKey="count" nameKey="stage" innerRadius={38} outerRadius={58} paddingAngle={3} stroke="none">
                {PRODUCTION_MIX.map((entry) => (
                  <Cell key={entry.stage} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>{total}</span>
            <span className="text-[9px] uppercase tracking-[0.14em] text-[#A3958B]">Active</span>
          </div>
        </div>
        <ul className="flex-1 space-y-2.5 min-w-0">
          {PRODUCTION_MIX.map((s) => (
            <li key={s.stage} className="flex items-center justify-between gap-3 text-[12.5px]">
              <span className="flex items-center gap-2 min-w-0 text-[#5E5048]">
                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="truncate">{s.stage}</span>
              </span>
              <span className="text-[#2A211D] font-medium flex-shrink-0" style={{ fontFamily: "'Space Mono', monospace" }}>{s.count}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const points = data.map((value, index) => ({ index, value }));
  return (
    <div className="h-9 w-20 flex-shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} barCategoryGap="20%">
          <Bar dataKey="value" radius={[2, 2, 0, 0]}>
            {points.map((_, i) => (
              <Cell key={i} fill={color} fillOpacity={i === points.length - 1 ? 1 : 0.35} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ==================================================================
   DASHBOARD VIEW
================================================================== */

function DashboardView() {
  const [dayBook, setDayBook] = useState(DAY_BOOK);
  const [fittings, setFittings] = useState(FITTINGS_TODAY_INIT);
  const [stats, setStats] = useState(TODAY_STATS_INIT);
  const [activeModal, setActiveModal] = useState<null | 'customer' | 'order' | 'payment' | 'fitting'>(null);
  const [banner, setBanner] = useState('');

  function nowTime() {
    return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  function announce(message: string) {
    setBanner(message);
    setTimeout(() => setBanner(''), 4000);
  }

  async function handleRegisterCustomer(form: NewCustomerForm) {
    const response = await fetch(`${API_URL}/auth/customers`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` }, body: JSON.stringify(form) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to register customer.');
    const fullName =
      [form.firstName, form.middleName, form.lastName].map((n) => n.trim()).filter(Boolean).join(' ') +
      (form.suffix.trim() ? `, ${form.suffix.trim()}` : '');
    setDayBook((prev) => [{ time: nowTime(), label: 'New customer', detail: `${fullName} registered`, kind: 'customer' }, ...prev]);
    setStats((s) => ({ ...s, walkIns: s.walkIns + 1 }));
    setActiveModal(null);
    announce(`${fullName}'s account was submitted for admin approval.`);
  }

  function handleCreateOrder(form: NewOrderForm) {
    const jobCardId = `JC-${Math.floor(3000 + Math.random() * 900)}`;
    setDayBook((prev) => [{ time: nowTime(), label: 'Order created', detail: `${jobCardId} — ${form.garment} for ${form.customer}`, kind: 'order' }, ...prev]);
    setActiveModal(null);
    announce(`${jobCardId} was opened for ${form.customer}.`);
  }

  function handleRecordPayment(form: NewPaymentForm) {
    const amountNum = Number(form.amount) || 0;
    const label = form.paymentType === 'deposit' ? 'Deposit received' : 'Final payment';
    setDayBook((prev) => [{ time: nowTime(), label, detail: `₱${amountNum.toLocaleString()} — ${form.jobCardId}, cash`, kind: 'payment' }, ...prev]);
    setStats((s) => ({ ...s, collected: s.collected + amountNum }));
    setActiveModal(null);
    announce(`₱${amountNum.toLocaleString()} recorded for ${form.jobCardId}.`);
  }

  function handleScheduleFitting(form: NewFittingForm) {
    setFittings((prev) => [...prev, { time: form.time, customer: form.customer, garment: form.garment, stage: form.stage }]);
    setDayBook((prev) => [{ time: nowTime(), label: 'Fitting scheduled', detail: `${form.customer} — ${form.time}, ${form.stage}`, kind: 'appointment' }, ...prev]);
    setStats((s) => ({ ...s, fittings: s.fittings + 1 }));
    setActiveModal(null);
    announce(`Fitting booked for ${form.customer} at ${form.time}.`);
  }

  return (
    <div className="space-y-8">
      <div className="dash-in">
        <MonoLabel>Front desk</MonoLabel>
        <h1 className="text-2xl sm:text-3xl font-normal leading-tight mt-1 text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>
          Good afternoon — here's the counter today.
        </h1>
      </div>

      {banner && (
        <div className="dash-in flex items-center gap-2 border border-[#8B9E87]/40 bg-[#F1F5F0] px-4 py-3 text-sm text-[#4E7357] rounded-lg shadow-sm">
          <Check className="w-4 h-4" />
          <span className="font-medium">{banner}</span>
        </div>
      )}

      {/* ---------------- QUICK ACTIONS ---------------- */}
      <div className="dash-in grid grid-cols-2 lg:grid-cols-4 gap-4" style={{ animationDelay: '0.04s' }}>
        <QuickAction icon={<UserPlus className="w-5 h-5" strokeWidth={1.6} />} label="Register customer" hint="New profile" onClick={() => setActiveModal('customer')} />
        <QuickAction icon={<FilePlus2 className="w-5 h-5" strokeWidth={1.6} />} label="Create order" hint="New job card" onClick={() => setActiveModal('order')} />
        <QuickAction icon={<Banknote className="w-5 h-5" strokeWidth={1.6} />} label="Record payment" hint="Deposit or balance" onClick={() => setActiveModal('payment')} />
        <QuickAction icon={<CalendarPlus className="w-5 h-5" strokeWidth={1.6} />} label="Schedule fitting" hint="Book appointment" onClick={() => setActiveModal('fitting')} />
      </div>

      {/* ---------------- STATS ---------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard delay={0.1} label="Collected today" value={`₱${stats.collected.toLocaleString()}`} icon={<Wallet className="w-4 h-4" strokeWidth={1.6} />} spark={COLLECTED_SPARK} sparkColor="#8C6F3E" trendLabel="+8.2% vs yesterday" />
        <StatCard delay={0.14} label="Walk-ins today" value={`${stats.walkIns}`} icon={<Users className="w-4 h-4" strokeWidth={1.6} />} />
        <StatCard delay={0.18} label="Fittings today" value={`${stats.fittings}`} icon={<CalendarClock className="w-4 h-4" strokeWidth={1.6} />} />
        <StatCard delay={0.22} label="Ready for pickup" value={`${stats.pickups}`} icon={<Package className="w-4 h-4" strokeWidth={1.6} />} tone="warn" />
      </div>

      {/* ---------------- CHARTS ---------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
        <RevenueTrendCard />
        <ProductionMixCard />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6">
        {/* ---------------- THE COUNTER CHIT ---------------- */}
        <div className="dash-in dash-card rounded-xl overflow-hidden" style={{ animationDelay: '0.28s' }}>
          <div className="ticket-edge h-3 w-full" aria-hidden="true" />
          <div className="p-6 sm:p-8 pt-5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <MonoLabel>Today's chit</MonoLabel>
                <h2 className="text-xl font-normal mt-0.5 text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>The counter roll</h2>
              </div>
              <button className="hidden sm:flex items-center gap-1 text-[11px] font-semibold tracking-[0.14em] uppercase text-[#A8644A] hover:text-[#2A211D] transition-colors">
                Full history <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="border-b border-dashed border-[#E2D7C7] my-5" />

            <div className="space-y-0">
              {dayBook.map((entry, i) => {
                const meta = DAY_BOOK_META[entry.kind];
                const Icon = meta.icon;
                return (
                  <div key={i} className="dash-in flex items-center gap-3.5 py-3 border-b border-dashed border-[#ECE3D8] last:border-b-0" style={{ animationDelay: `${0.34 + i * 0.05}s` }}>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: meta.bg, color: meta.tone }}
                    >
                      <Icon className="w-4 h-4" strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[13.5px] text-[#2A211D] font-medium">{entry.label}</span>
                        <span className="text-[11px] text-[#A3958B] flex-shrink-0" style={{ fontFamily: "'Space Mono', monospace" }}>
                          {entry.time}
                        </span>
                      </div>
                      <p className="text-[12.5px] text-[#766A62] mt-0.5 truncate">{entry.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t-2 border-dashed border-[#E2D7C7] mt-3 pt-4 flex items-center justify-between">
              <MonoLabel>Collected today</MonoLabel>
              <span className="text-[16px] text-[#2A211D]" style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>₱{stats.collected.toLocaleString()}</span>
            </div>
          </div>
          <div className="ticket-edge h-3 w-full rotate-180" aria-hidden="true" />
        </div>

        {/* ---------------- RIGHT COLUMN ---------------- */}
        <div className="space-y-6">
          {/* Fittings today */}
          <div className="dash-in dash-card rounded-xl p-6 sm:p-7" style={{ animationDelay: '0.32s' }}>
            <MonoLabel>Fitting scheduler</MonoLabel>
            <h2 className="text-xl font-normal mt-0.5 mb-5 text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>Today's fittings</h2>
            <div className="space-y-4">
              {fittings.map((f) => (
                <div key={`${f.time}-${f.customer}`} className="flex items-center gap-3.5">
                  <div className="flex flex-col items-center flex-shrink-0 w-14">
                    <Clock className="w-3.5 h-3.5 text-[#B89255] mb-0.5" strokeWidth={1.8} />
                    <span className="text-[11px] text-[#8C7E74] font-medium" style={{ fontFamily: "'Space Mono', monospace" }}>{f.time}</span>
                  </div>
                  <div className="min-w-0 flex-1 border-l border-[#ECE3D8] pl-3.5">
                    <div className="text-[13.5px] text-[#2A211D] font-medium truncate">{f.customer}</div>
                    <div className="text-[12px] text-[#766A62] truncate">{f.garment} · {f.stage}</div>
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-6 w-full text-center text-[11px] font-semibold tracking-[0.14em] uppercase text-[#766A62] border border-[#E2D7C7] rounded-lg py-2.5 hover:border-[#A3958B] hover:bg-[#FAF7F2] transition-colors">
              Open full schedule
            </button>
          </div>

          {/* Ready for pickup / release queue */}
          <div className="dash-in dash-card rounded-xl p-6 sm:p-7" style={{ animationDelay: '0.38s' }}>
            <MonoLabel>Release queue</MonoLabel>
            <h2 className="text-xl font-normal mt-0.5 mb-5 text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>Ready for pickup</h2>
            <div className="space-y-4">
              {PICKUP_QUEUE.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 border-t border-[#ECE3D8] pt-4 first:border-t-0 first:pt-0">
                  <div className="min-w-0">
                    <div className="text-[13.5px] text-[#2A211D] font-medium truncate">{p.customer}</div>
                    <div className="text-[12px] text-[#766A62] truncate">{p.garment}</div>
                    <div className="text-[11px] mt-0.5 font-medium" style={{ color: p.balance.startsWith('₱0') ? '#4E7357' : '#9E5B4B', fontFamily: "'Space Mono', monospace" }}>
                      {p.balance}
                    </div>
                  </div>
                  <button
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#2A211D] text-[#FAF7F2] text-[10px] font-semibold tracking-[0.1em] uppercase hover:bg-[#3D312B] transition-colors shadow-sm"
                    aria-label={`Release ${p.id}`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Release
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {activeModal === 'customer' && (
        <RegisterCustomerModal onClose={() => setActiveModal(null)} onRegister={handleRegisterCustomer} />
      )}
      {activeModal === 'order' && (
        <CreateOrderModal onClose={() => setActiveModal(null)} onCreate={handleCreateOrder} />
      )}
      {activeModal === 'payment' && (
        <RecordPaymentModal onClose={() => setActiveModal(null)} onRecord={handleRecordPayment} />
      )}
      {activeModal === 'fitting' && (
        <ScheduleFittingModal onClose={() => setActiveModal(null)} onSchedule={handleScheduleFitting} />
      )}
    </div>
  );
}

/* placeholder page */
function ComingSoonView({ label }: { label: string }) {
  return (
    <div className="dash-in dash-card rounded-xl p-16 text-center">
      <MonoLabel>{label}</MonoLabel>
      <h2 className="text-2xl font-normal mt-2 text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>
        This page isn't built yet
      </h2>
      <p className="text-[13px] text-[#766A62] mt-2">Ask to have the {label} page created next.</p>
    </div>
  );
}

/* ---------------- Quick action button ---------------- */
function QuickAction({ icon, label, hint, onClick }: { icon: ReactNode; label: string; hint: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group text-left bg-[#2A211D] rounded-xl p-5 shadow-[0_10px_28px_-14px_rgba(42,33,29,0.55)] hover:bg-[#3D312B] hover:-translate-y-0.5 hover:shadow-[0_16px_34px_-14px_rgba(42,33,29,0.6)] transition-all border border-[#3D312B]"
    >
      <div className="w-9 h-9 rounded-lg bg-[#FAF7F2]/10 text-[#E5C396] flex items-center justify-center mb-4 group-hover:bg-[#FAF7F2]/20 transition-colors ring-1 ring-[#E5C396]/20">
        {icon}
      </div>
      <div className="flex items-center gap-1 text-[13.5px] text-[#FAF7F2] font-medium leading-snug">
        {label}
        <ArrowUpRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-70 group-hover:translate-x-0 transition-all" />
      </div>
      <MonoLabel className="text-[#C2B5A8] block mt-1">{hint}</MonoLabel>
    </button>
  );
}

/* ---------------- Stat card ---------------- */
function StatCard({
  label,
  value,
  icon,
  delay = 0,
  tone = 'default',
  spark,
  sparkColor = '#8C6F3E',
  trendLabel,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  delay?: number;
  tone?: 'default' | 'warn';
  spark?: number[];
  sparkColor?: string;
  trendLabel?: string;
}) {
  return (
    <div className="dash-in dash-card rounded-xl p-5 sm:p-6 transition-shadow hover:shadow-md" style={{ animationDelay: `${delay}s` }}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tone === 'warn' ? 'bg-[#FAF2F0] text-[#9E5B4B]' : 'bg-[#F9F4EB] text-[#8C6F3E]'}`}>{icon}</div>
        {spark && <MiniSparkline data={spark} color={sparkColor} />}
      </div>
      <div className="text-2xl font-normal mb-1 text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>{value}</div>
      <div className="flex items-center justify-between gap-2">
        <MonoLabel className="block">{label}</MonoLabel>
        {trendLabel && <span className="text-[10px] font-semibold text-[#4E7357] flex-shrink-0">{trendLabel}</span>}
      </div>
    </div>
  );
}

/* ==================================================================
   ROOT — sidebar drives which view renders
================================================================== */

export default function FrontDeskDashboard({ initialView = 'dashboard' }: { initialView?: ViewKey }) {
  const navigate = useNavigate();
  const profile = currentUser();
  const [navOpen, setNavOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [view, setView] = useState<ViewKey>(initialView);
  const signOut = () => {
    localStorage.removeItem('authToken'); localStorage.removeItem('currentUser');
    sessionStorage.removeItem('authToken'); sessionStorage.removeItem('currentUser');
    navigate('/login', { replace: true });
  };

  const currentNavLabel = NAV.find((n) => n.view === view)?.label ?? 'Dashboard';

  function renderView() {
    switch (view) {
      case 'dashboard':
        return <DashboardView />;
      case 'customers':
        return <div className="module-customers"><FrontDeskCustomersExactView /></div>;
      case 'orders':
        return <div className="module-orders"><FrontDeskOrdersView /></div>;
      case 'measurements':
        return <div className="module-measurements"><FrontDeskMeasurementsView /></div>;
      case 'appointments':
        return <div className="module-appointments"><FrontDeskAppointmentsView /></div>;
      case 'payments':
        return <div className="module-payments"><FrontDeskPaymentsView /></div>;
      case 'settings':
        return <div className="module-settings"><FrontDeskSettingsView /></div>;
      default:
        return <ComingSoonView label={currentNavLabel} />;
    }
  }

  return (
    <div className="frontdesk-theme min-h-screen bg-[#FAF7F2] text-[#2A211D] antialiased flex" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{FONT_IMPORT + FRONT_DESK_THEME}</style>

      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(#2A211D 0.7px, transparent 0.7px)',
          backgroundSize: '16px 16px',
        }}
      />

      {/* ---------------- SIDEBAR ---------------- */}
      <aside
        className={`${navOpen ? 'fixed inset-y-0 left-0 translate-x-0' : 'fixed inset-y-0 left-0 -translate-x-full'} z-40 lg:relative lg:inset-auto lg:translate-x-0 lg:z-0 w-72 flex-shrink-0 h-screen lg:h-auto lg:min-h-screen bg-[#EFE7DC] text-[#2A211D] flex flex-col justify-between transition-transform duration-300 border-r border-[#E2D7C7]`}
      >
        <div>
          <div className="flex items-center justify-between px-8 py-7 border-b border-[#E2D7C7]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg border border-[#B89255]/40 bg-[#FAF7F2] flex items-center justify-center rotate-3 shadow-sm">
                <span className="text-[#8C6F3E] text-[10px] font-bold" style={{ fontFamily: "'Space Mono', monospace" }}>A&T</span>
              </div>
              <div className="leading-tight" style={{ fontFamily: "'DM Serif Display', serif" }}>
                <div className="text-base font-normal tracking-[0.04em] text-[#2A211D]">Ashlie's Tailor</div>
                <MonoLabel className="text-[#8C7E74]">Front desk</MonoLabel>
              </div>
            </div>
            <button className="lg:hidden text-[#766A62]" onClick={() => setNavOpen(false)} aria-label="Close menu">
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="px-4 py-6 space-y-1">
            {NAV.map((item) => {
              const active = view === item.view;
              return (
                <button
                  key={item.label}
                  onClick={() => { setView(item.view); setNavOpen(false); }}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-lg text-[14px] font-medium transition-all ${
                    active
                      ? 'bg-[#FAF7F2] text-[#2A211D] shadow-sm border border-[#E2D7C7]'
                      : 'text-[#766A62] hover:text-[#2A211D] hover:bg-[#FAF7F2]/60'
                  }`}
                >
                  <item.icon className={`w-4 h-4 ${active ? 'text-[#8C6F3E]' : 'text-[#A3958B]'}`} strokeWidth={active ? 2 : 1.6} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="px-8 py-6 border-t border-[#E2D7C7] space-y-4 bg-[#E8DFD3]/40">
          <button type="button" onClick={() => setShowProfile(true)} className="flex w-full items-center gap-3 rounded-lg p-1 text-left transition-colors hover:bg-[#FAF7F2]/70">
            <div className="w-9 h-9 overflow-hidden rounded-full bg-[#FAF7F2] border border-[#E2D7C7] flex items-center justify-center shadow-sm">
              {profile?.profile_picture ? (
                <img src={profile.profile_picture} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <span className="text-[#8C6F3E] text-xs font-semibold">{profile?.full_name?.split(' ').map((name: string) => name[0]).join('').slice(0, 2) || 'FD'}</span>
              )}
            </div>
            <div className="leading-tight">
              <div className="text-[13.5px] font-medium text-[#2A211D] truncate max-w-[150px]">{profile?.full_name || 'Front Desk Staff'}</div>
              <MonoLabel className="text-[#8C7E74]">{profile?.position || 'Front desk'}</MonoLabel>
            </div>
          </button>
          <button onClick={signOut} className="group flex w-full items-center justify-between border border-[#E2D7C7] bg-[#FAF7F2] px-3.5 py-2.5 rounded-lg text-[10px] font-semibold tracking-[0.16em] uppercase text-[#766A62] transition-all hover:border-[#2A211D] hover:text-[#2A211D] shadow-sm">
            Sign out <LogOut className="h-3.5 w-3.5 text-[#8C7E74] transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </aside>

      {showProfile && <FrontDeskProfileModal profile={profile} onClose={() => setShowProfile(false)} onEdit={() => navigate('/complete-profile')} />}

      {navOpen && <div className="fixed inset-0 bg-[#1F1916]/30 z-30 lg:hidden backdrop-blur-xs" onClick={() => setNavOpen(false)} />}

      {/* ---------------- MAIN ---------------- */}
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-20 bg-[#FAF7F2]/90 backdrop-blur-md border-b border-[#E8DFD3] px-6 sm:px-10 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button className="lg:hidden text-[#2A211D] flex-shrink-0" onClick={() => setNavOpen(true)} aria-label="Open menu">
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <MonoLabel className="block">Front desk / {currentNavLabel}</MonoLabel>
              <div className="text-[16px] font-normal text-[#2A211D] truncate" style={{ fontFamily: "'DM Serif Display', serif" }}>
                {currentNavLabel}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-5 flex-shrink-0">
            <div className="relative hidden md:flex items-center bg-[#FFFFFF] border border-[#E8DFD3] rounded-full px-3.5 py-2 focus-within:border-[#2A211D] transition-colors shadow-xs">
              <Search className="w-3.5 h-3.5 text-[#A3958B]" strokeWidth={1.5} />
              <input
                type="text"
                placeholder="Search customer or job card"
                className="w-52 bg-transparent placeholder-[#C2B5A8] text-[12px] pl-2 focus:outline-none text-[#2A211D]"
              />
            </div>
            <button className="hidden sm:flex items-center gap-1.5 text-[#766A62] hover:text-[#2A211D] transition-colors" aria-label="Print last receipt">
              <Printer className="w-4 h-4" strokeWidth={1.5} />
              <MonoLabel className="text-[#766A62]">Print</MonoLabel>
            </button>
            <button className="relative text-[#766A62] hover:text-[#2A211D] transition-colors p-1" aria-label="Notifications">
              <Bell className="w-5 h-5" strokeWidth={1.5} />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#9E5B4B] ring-2 ring-[#FAF7F2]" />
            </button>
            <div className="h-5 w-px bg-[#E8DFD3] hidden sm:block" />
            <LiveDateTime />
          </div>
        </header>

        <main className="w-full px-6 sm:px-10 xl:px-12 py-9">
          {renderView()}
        </main>
      </div>
    </div>
  );
}

function FrontDeskProfileModal({ profile, onClose, onEdit }: { profile: any; onClose: () => void; onEdit: () => void }) {
  const details: [string, string][] = [
    ['Employee ID', profile?.employee_id || 'Not set'], ['Position', profile?.position || 'Front Desk'],
    ['Department', 'Customer Service & Reception'], ['Date Hired', profile?.date_hired ? new Date(profile.date_hired).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not set'],
    ['Account Status', profile?.status || 'Approved'],
  ];
  const responsibilities = ['Register new customers', 'Create tailoring job orders', 'Record customer measurements', 'Schedule fitting appointments', 'Process deposits and final payments', 'Print and issue receipts', 'Release completed garments', 'Assist customers with inquiries'];
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <button aria-label="Close profile" onClick={onClose} className="absolute inset-0 bg-[#1F1916]/45 backdrop-blur-sm" />
    <section className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[#E2D7C7] bg-[#FFFCF8] shadow-2xl">
      <header className="flex items-start justify-between border-b border-[#E8DFD3] px-6 py-6 sm:px-8">
        <div><MonoLabel>Front Desk Staff Profile</MonoLabel><h2 className="mt-1 text-3xl text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>{profile?.full_name || 'Front Desk Staff'}</h2></div>
        <button onClick={onClose} className="rounded-full p-2 text-[#766A62] hover:bg-[#F2ECE1]"><X className="h-5 w-5" /></button>
      </header>
      <div className="space-y-8 p-6 sm:p-8">
        <div className="flex items-center gap-5 rounded-xl bg-[#F8F3EB] p-5">
          <div className="h-20 w-20 overflow-hidden rounded-full border border-[#D9C8B7] bg-[#EFE7DC]">{profile?.profile_picture ? <img src={profile.profile_picture} alt="Profile" className="h-full w-full object-cover" /> : <User className="m-6 h-8 w-8 text-[#8C6F3E]" />}</div>
          <div><div className="text-lg font-medium">{profile?.full_name || 'Front Desk Staff'}</div><p className="text-sm text-[#766A62]">{profile?.position || 'Front Desk'}</p><p className="mt-1 text-xs text-[#8C7E74]">{profile?.email || 'No email'}</p></div>
        </div>
        <ProfileSection title="Personal Information" items={[['Full Name', profile?.full_name], ['Email Address', profile?.email], ['Contact Number', profile?.contact_number], ['Address', profile?.address]]} />
        <ProfileSection title="Employment Information" items={details} />
        <ProfileSection title="Account Information" items={[["Username", profile?.email?.split('@')[0] || 'Not set'], ['Role', 'Front Desk'], ['Last Login', 'Current session'], ['Password', '••••••••••••']]} />
        <div><h3 className="text-lg text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>Responsibilities</h3><ul className="mt-3 grid gap-2 sm:grid-cols-2">{responsibilities.map((item) => <li key={item} className="flex gap-2 text-sm text-[#766A62]"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#8C6F3E]" />{item}</li>)}</ul></div>
        <div className="flex flex-wrap gap-3 border-t border-[#E8DFD3] pt-6"><button onClick={onEdit} className="rounded-lg bg-[#2A211D] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-white">Edit Profile</button><button onClick={onEdit} className="rounded-lg border border-[#D9C8B7] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#5E5048]">Change Photo</button></div>
      </div>
    </section>
  </div>;
}

function ProfileSection({ title, items }: { title: string; items: [string, string | undefined][] }) {
  return <div><h3 className="text-lg text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>{title}</h3><dl className="mt-3 grid gap-x-6 gap-y-4 sm:grid-cols-2">{items.map(([label, value]) => <div key={label}><dt className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#8C7E74]">{label}</dt><dd className="mt-1 text-sm text-[#2A211D]">{value || 'Not set'}</dd></div>)}</dl></div>;
}