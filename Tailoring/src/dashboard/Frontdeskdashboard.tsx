// Pages/FrontDesk/FrontDeskDashboard.tsx
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatPHPExact as formatPeso } from '../utils/currency';
import { FrontDeskCustomersExactView } from '../Pages_Frontdesk/CustomersdeskExact';
import { FrontDeskOrdersView, OrderDetails as FrontDeskOrderDetails } from '../Pages_Frontdesk/Ordersdesk';
import { FrontDeskMeasurementsView } from '../Pages_Frontdesk/Measurementsdesk';
import { FrontDeskAppointmentsView } from '../Pages_Frontdesk/Appointmentsdesk';
// The Payments page became the Customer Financial Center: one shared financial
// profile per customer, built from the same orders and payment records.
import { CustomerFinancialCenterView } from '../financialCenter/CustomerFinancialCenter';
import { FinancialCenterProvider } from '../financialCenter/FinancialCenterContext';
import { RecordCashPaymentModal } from '../financialCenter/CashPaymentForm';
import { FrontDeskSettingsView } from '../Pages_Frontdesk/Settingsdesk';
import { FrontDeskGarmentCatalogView } from '../Pages_Frontdesk/GarmentCatalogdesk';
import { GarmentIntakeModal, type GarmentIntakeData, type IntakeCartExtras, type IntakeCartIntent } from '../Pages_Frontdesk/GarmentIntakeModal';
// THE DRAFT ORDER CART — the counter's multi-garment workspace. It is Front
// Desk state only (never a database table) and one checkout turns the whole
// cart into separate job cards in a single transaction.
import { DraftOrderCartProvider, newCartLineId, useDraftOrderCart, type DraftCartItem } from '../Pages_Frontdesk/DraftOrderCartContext';
import type { PriorityLevel } from '../Pages_Frontdesk/garmentCatalogData';
import { DraftOrderCartPanel } from '../Pages_Frontdesk/DraftOrderCartPanel';
import { CheckoutReviewPanel } from '../Pages_Frontdesk/CheckoutReviewPanel';
import { type CatalogDesign } from '../Pages_Frontdesk/garmentCatalogData';
import frontDeskApi, { authToken, type Order, type Appointment, type Customer } from '../../services/frontDeskApi';
import { RegisterCustomerModal, type NewCustomerForm } from '../pages/FrontDesk/FrontDeskModals';
import { dedupeAppointments, stageBadgeStyle } from '../utils/appointmentDisplay';
import NotificationBell from '../components/NotificationBell';
import { FITTING_JOURNEY, determineStageForJob, findActiveAppointmentForJob } from '../utils/appointmentWorkflow';
import type { ReactNode } from 'react';
import {
  LayoutDashboard,
  Users,
  Shirt,
  Ruler,
  CalendarClock,
  Wallet,
  Settings,
  Search,
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
  Check,
  LogOut,
  ArrowUpRight,
  AlertCircle,
  BarChart3,
  Loader2,
  LayoutGrid,
  ShoppingBag,
} from 'lucide-react';

function LiveDateTime() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return <MonoLabel className="hidden sm:inline">{now.toLocaleString(undefined, { weekday: 'short', month: 'short', day: '2-digit', hour: 'numeric', minute: '2-digit' })}</MonoLabel>;
}

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Space+Mono:wght@400;700&display=swap');

@keyframes riseIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
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

function currentUser() {
  const stored = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
  try { return stored ? JSON.parse(stored) : null; } catch { return null; }
}

type ViewKey = 'dashboard' | 'customers' | 'catalog' | 'orders' | 'measurements' | 'appointments' | 'payments' | 'settings';

const NAV: { label: string; icon: typeof LayoutDashboard; view: ViewKey }[] = [
  { label: 'Dashboard', icon: LayoutDashboard, view: 'dashboard' },
  { label: 'Customers', icon: Users, view: 'customers' },
  { label: 'Garment Catalog', icon: LayoutGrid, view: 'catalog' },
  { label: 'Orders', icon: Shirt, view: 'orders' },
  { label: 'Measurements', icon: Ruler, view: 'measurements' },
  { label: 'Appointments', icon: CalendarClock, view: 'appointments' },
  { label: 'Customer Financial Center', icon: Wallet, view: 'payments' },
  { label: 'Settings', icon: Settings, view: 'settings' },
];

// ============================================================
// CASH PAYMENT FORM
// ============================================================
// The one cash payment form lives in financialCenter/CashPaymentForm.tsx. It is
// shared by the order-intake deposit, the existing-order payment modal, quick-pay
// actions and the Customer Financial Center, so it is no longer duplicated here.

// ============================================================
// SCHEDULE FITTING MODAL
// ============================================================
interface ScheduleFittingPayload {
  customerId: string;
  orderId: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: string;
  notes: string;
}

function ScheduleFittingModal({
  onClose,
  onSchedule,
  customers,
  orders,
  appointments
}: {
  onClose: () => void;
  onSchedule: (data: ScheduleFittingPayload) => Promise<void>;
  customers: Customer[];
  orders: Order[];
  appointments: Appointment[];
}) {
  const [form, setForm] = useState({
    customerId: '',
    orderId: '',
    appointmentDate: '',
    appointmentTime: '',
    notes: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Job orders that already have a live visit booked are hidden from the
  // selection — each job card keeps ONE live appointment, so its next stage is
  // scheduled from that appointment's own details instead.
  const filteredOrders = orders.filter(
    (o) =>
      o.customer_id === form.customerId &&
      o.production_status !== 'Released' &&
      !findActiveAppointmentForJob(appointments, o.job_card_id)
  );
  const selectedOrder = orders.find(o => o.order_id === form.orderId);

  // The fitting stage is decided automatically — never by the user.
  const activeVisit = useMemo(() => findActiveAppointmentForJob(appointments, form.orderId), [appointments, form.orderId]);
  const plannedType = useMemo(() => {
    // Walk-in measuring is completed at intake; the first bookable visit is
    // a First Fitting. Rescheduling an active visit must retain its type.
    if (!form.orderId) return 'First Fitting';
    if (activeVisit) return activeVisit.appointment_type;
    return determineStageForJob(appointments, form.orderId);
  }, [appointments, form.orderId, activeVisit]);

  // Appointment-type graph: every visit on record grouped by fitting stage.
  const typeChart = useMemo(
    () =>
      FITTING_JOURNEY.map((type) => ({
        type,
        count: appointments.filter((a) => a.appointment_type === type && a.status !== 'Cancelled').length,
      })),
    [appointments]
  );
  const totalVisits = typeChart.reduce((sum, t) => sum + t.count, 0);

  // Stepper progress: furthest stage that already has visits (or the one being scheduled).
  const plannedIdx = Math.max(0, FITTING_JOURNEY.indexOf((plannedType || '') as (typeof FITTING_JOURNEY)[number]));
  const furthestVisitedIdx = typeChart.reduce((acc, t, i) => (t.count > 0 ? i : acc), -1);
  const journeyProgress = Math.max(furthestVisitedIdx, plannedIdx) / (FITTING_JOURNEY.length - 1);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerId || !form.orderId || !form.appointmentDate || !form.appointmentTime) {
      setError('Customer, job order, date, and time are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSchedule({
        ...form,
        appointmentType: plannedType || activeVisit?.appointment_type || 'First Fitting',
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule appointment.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button onClick={onClose} className="absolute inset-0 bg-[#1F1916]/45 backdrop-blur-sm" />
      <form onSubmit={handleSubmit} className="relative w-full max-w-xl rounded-xl border border-[#E2D7C7] bg-[#FFFCF8] p-7 shadow-2xl max-h-[92vh] overflow-y-auto">
        <button type="button" onClick={onClose} className="absolute right-5 top-5 text-[#766A62]"><X className="h-5 w-5" /></button>
        <MonoLabel>Fitting scheduler</MonoLabel>
        <h2 className="mt-1 text-3xl text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>Schedule appointment</h2>

        {error && <div className="mt-4 border border-[#C86A58]/30 bg-[#FDF4F2] px-4 py-3 rounded-lg text-sm text-[#9A3B2A]">{error}</div>}
        {selectedOrder && (
          <p className="mt-4 rounded-lg border border-[#ECD8A7] bg-[#FFF7E3] px-4 py-2.5 text-[12px] leading-relaxed text-[#8A6618]">
            {activeVisit ? (
              <>
                <span className="font-semibold uppercase tracking-[0.08em]">{selectedOrder.job_card_id}</span> already has a live{' '}
                <span className="font-semibold uppercase tracking-[0.08em]">{activeVisit.appointment_type}</span> visit. Scheduling moves that same
                appointment{plannedType && plannedType !== activeVisit.appointment_type ? <> to <span className="font-semibold uppercase tracking-[0.08em]">{plannedType}</span></> : null} — no duplicate is created.
              </>
            ) : (
              <>
                Next visit for <span className="font-semibold uppercase tracking-[0.08em]">{selectedOrder.job_card_id}</span> is booked automatically as{' '}
                <span className="font-semibold uppercase tracking-[0.08em]">{plannedType || 'First Fitting'}</span>. Just pick a date and time.
              </>
            )}
          </p>
        )}

        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-medium text-[#5E5048]">
            Customer
            <select value={form.customerId} onChange={(e) => setForm(f => ({ ...f, customerId: e.target.value, orderId: '' }))} className="mt-2 w-full rounded-lg border border-[#E2D7C7] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#A46B48]">
              <option value="">Select customer</option>
              {customers.map(c => <option key={c.customer_id} value={c.customer_id}>{c.full_name}</option>)}
            </select>
          </label>

          <label className="block text-xs font-medium text-[#5E5048]">
            Order (Job Card)
            <select value={form.orderId} onChange={(e) => setForm(f => ({ ...f, orderId: e.target.value }))} disabled={!form.customerId} className="mt-2 w-full rounded-lg border border-[#E2D7C7] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#A46B48] disabled:bg-[#F8F3EB] disabled:text-[#766A62]">
              {form.customerId && !filteredOrders.length ? (
                <option value="">No order</option>
              ) : (
                <option value="">Select order</option>
              )}
              {filteredOrders.map(o => <option key={o.order_id} value={o.order_id}>{o.job_card_id} - {o.garment_type}</option>)}
            </select>
          </label>
          {form.customerId && !filteredOrders.length && (
            <p className="text-[10px] leading-relaxed text-[#A3958B] sm:col-span-2">
              {orders.some(o => o.customer_id === form.customerId)
                ? "Every job card for this customer already has a live visit scheduled — book their next stage from that appointment's details."
                : "This customer has no job orders yet."}
            </p>
          )}
          <label className="block text-xs font-medium text-[#5E5048]">
            Date
            <input type="date" value={form.appointmentDate} onChange={(e) => setForm(f => ({ ...f, appointmentDate: e.target.value }))} className="mt-2 w-full rounded-lg border border-[#E2D7C7] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#A46B48]" />
          </label>
          <label className="block text-xs font-medium text-[#5E5048]">
            Time
            <input type="time" value={form.appointmentTime} onChange={(e) => setForm(f => ({ ...f, appointmentTime: e.target.value }))} className="mt-2 w-full rounded-lg border border-[#E2D7C7] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#A46B48]" />
          </label>
          <label className="block text-xs font-medium text-[#5E5048] sm:col-span-2">
            Notes (optional)
            <input value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Special instructions..." className="mt-2 w-full rounded-lg border border-[#E2D7C7] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#A46B48]" />
          </label>
        </div>

        {/* Appointment-type graph */}
        <section className="mt-6 rounded-xl border border-[#E2D7C7] bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <MonoLabel>Appointment types</MonoLabel>
              <p className="mt-0.5 text-[12px] text-[#8C7E74]">Every visit booked across the workshop, by fitting stage</p>
            </div>
            <span className="inline-flex flex-shrink-0 items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#B9DDD0] bg-[#E7F4EE] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#277257]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#277257]" /> Live
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#ECD8A7] bg-[#FFF7E3] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8A6618]">
                <BarChart3 className="h-3 w-3" /> {totalVisits} total
              </span>
            </span>
          </div>
          {/* Journey stepper — same visual language as the live fitting tracker */}
          <div className="relative mt-6 flex items-start justify-between px-1">
            <div className="absolute left-3 right-3 top-[11px] h-[2px] bg-[#EFE7DB]" />
            <div
              className="absolute left-3 top-[11px] h-[2px] bg-[#8C6F3E] transition-all duration-700"
              style={{ width: `calc((100% - 24px) * ${journeyProgress})` }}
            />
            {typeChart.map((entry) => {
              const hasVisits = entry.count > 0;
              const isPlanned = entry.type === plannedType;
              return (
                <div key={entry.type} className="relative z-10 flex w-[72px] flex-col items-center">
                  <span
                    title={`${entry.count} ${entry.type} visit${entry.count === 1 ? '' : 's'} booked`}
                    className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-bold shadow-sm ${isPlanned ? 'animate-pulse border-[#8C6F3E] bg-white text-[#8C6F3E]' : hasVisits ? 'border-[#8C6F3E] bg-[#8C6F3E] text-white' : 'border-[#E2D7C7] bg-white text-[#A3958B]'}`}
                  >
                    {entry.count}
                  </span>
                  <span className={`mt-1.5 text-center text-[10px] leading-tight ${isPlanned ? 'font-semibold text-[#2A211D]' : hasVisits ? 'text-[#5E5048]' : 'text-[#A3958B]'}`}>{entry.type}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-2 px-1 text-[10px] text-[#A3958B]">Number in each node = visits booked at that stage · the pulsing node is the stage being scheduled now.</p>
        </section>

        <div className="mt-7 flex gap-3">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#2A211D] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white disabled:opacity-50">
            <CalendarPlus className="h-4 w-4" /> {saving ? 'Scheduling...' : 'Schedule'}
          </button>
          <button type="button" onClick={onClose} className="rounded-lg border border-[#E2D7C7] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5E5048]">Cancel</button>
        </div>
      </form>
    </div>
  );
}

// ============================================================
// DASHBOARD VIEW
// ============================================================

function DashboardView({
  pendingDesign,
  onDesignConsumed,
  onOpenCatalogPage,
  pendingIntakeCustomer,
  onIntakeCustomerConsumed,
}: {
  /** Garment chosen on the Garment Catalog page — opens intake pre-filled. */
  pendingDesign?: CatalogDesign | null;
  onDesignConsumed?: () => void;
  /** Switch to the standalone Garment Catalog page. */
  onOpenCatalogPage?: () => void;
  /** Customer chosen on the Customer Financial Center ("New order"). */
  pendingIntakeCustomer?: string | null;
  onIntakeCustomerConsumed?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayCustomers: 0,
    todayOrders: 0,
    pendingPayments: 0,
    upcomingFittings: 0,
    readyForPickup: 0,
    todayCollected: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [readyForPickup, setReadyForPickup] = useState<Order[]>([]);
  const [upcomingFittings, setUpcomingFittings] = useState<Appointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  // Approved Master Tailors, for per-garment assignment inside the draft cart.
  const [tailors, setTailors] = useState<{ id: number; full_name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<null | 'customer' | 'order' | 'payment' | 'fitting'>(null);
  // Garment handed to the intake form (from the catalog page or the picker).
  const [intakeDesign, setIntakeDesign] = useState<CatalogDesign | null>(null);
  // Customer handed to the intake form by the Customer Financial Center
  // ("New order"): the form opens with that customer already selected.
  const [intakeCustomerId, setIntakeCustomerId] = useState('');
  useEffect(() => {
    if (!pendingIntakeCustomer) return;
    setIntakeCustomerId(pendingIntakeCustomer);
    setIntakeDesign(null);
    setActiveModal('order');
    onIntakeCustomerConsumed?.();
  }, [pendingIntakeCustomer, onIntakeCustomerConsumed]);
  const [banner, setBanner] = useState('');
  // Same display rules as the Appointments page: merge duplicate records
  // (same appointment ID) and keep only the latest active booking per
  // job card + fitting stage.
  // APPOINTMENT PIPELINE — status counts plus the production visit types the
  // workshop suggests (First Fitting / Final Fitting / Pickup).
  const pipeline = useMemo(() => {
    const isActive = (a: Appointment) => ['Suggested', 'Approved', 'Rescheduled', 'Scheduled', 'Confirmed'].includes(a.status);
    const count = (fn: (a: Appointment) => boolean) => allAppointments.filter(fn).length;
    return [
      { label: 'Suggested', value: count((a) => a.status === 'Suggested') },
      { label: 'Approved', value: count((a) => a.status === 'Approved' || a.status === 'Confirmed' || a.status === 'Scheduled') },
      { label: 'Rescheduled', value: count((a) => a.status === 'Rescheduled') },
      { label: 'Completed', value: count((a) => a.status === 'Completed') },
      { label: 'Cancelled', value: count((a) => a.status === 'Cancelled') },
      { label: 'First fitting', value: count((a) => isActive(a) && a.appointment_type === 'First Fitting') },
      { label: 'Final fitting', value: count((a) => isActive(a) && a.appointment_type === 'Final Fitting') },
      { label: 'Pickup', value: count((a) => isActive(a) && a.appointment_type === 'Pickup') },
    ];
  }, [allAppointments]);

  const visibleFittings = useMemo(() => dedupeAppointments(upcomingFittings), [upcomingFittings]);

  // Job orders that are already fully paid (zero remaining balance) have no
  // outstanding amount, so they are NOT offered in the Record-payment picker.
  // This matches the desk rule: hide a job card when it is Fully Paid / balance 0.
  const payableOrders = useMemo(() => orders.filter((o) => Number(o.remaining_balance) > 0), [orders]);

  const loadDashboardData = useCallback(async (silent = false) => {
    if (!silent) { setLoading(true); setError(null); }
    try {
      const [statsData, activityData, pickupData, fittingsData, customersData, ordersData, appointmentsData, tailorsData] = await Promise.all([
        frontDeskApi.getDashboardStats(),
        frontDeskApi.getRecentActivity(),
        frontDeskApi.getReadyForPickup(),
        frontDeskApi.getUpcomingFittings(),
        frontDeskApi.searchCustomers(''),
        frontDeskApi.getAllOrders(),
        frontDeskApi.getAppointments(),
        // Approved Master Tailors — the draft cart assigns one per garment.
        frontDeskApi.getTailors().catch(() => []),
      ]);
      setStats(statsData);
      setRecentActivity(activityData);
      setReadyForPickup(pickupData);
      setUpcomingFittings(fittingsData);
      setCustomers(customersData);
      setOrders(ordersData);
      setAllAppointments(appointmentsData);
      setTailors((tailorsData || []).map((tailor) => ({ id: tailor.id, full_name: tailor.full_name })));
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
    // Reuse the existing API refetch so the Front Desk sees the tailor's
    // production/pickup updates automatically (no separate status record).
    const timer = setInterval(() => loadDashboardData(true), 15000);
    return () => clearInterval(timer);
  }, [loadDashboardData]);

  // A garment chosen on the Garment Catalog page re-opens the intake form with
  // the design already loaded.
  useEffect(() => {
    if (!pendingDesign) return;
    setIntakeDesign(pendingDesign);
    setActiveModal('order');
    onDesignConsumed?.();
  }, [pendingDesign, onDesignConsumed]);

  const handleRegisterCustomer = async (form: NewCustomerForm) => {
    try {
      await frontDeskApi.registerCustomer({
        firstName: form.firstName,
        middleName: form.middleName,
        lastName: form.lastName,
        suffix: form.suffix,
        email: form.email,
        contactNumber: form.contact,
        address: form.address,
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        civilStatus: form.civilStatus,
        occupation: form.occupation,
        password: form.password,
      });
      const fullName = [form.firstName, form.middleName, form.lastName].filter(Boolean).join(' ') + (form.suffix ? `, ${form.suffix}` : '');
      setBanner(`${fullName}'s account was submitted for admin approval.`);
      setActiveModal(null);
      loadDashboardData();
      setTimeout(() => setBanner(''), 5000);
    } catch (err) {
      throw err;
    }
  };

  /**
   * THE DRAFT ORDER CART — Front Desk only.
   *
   * `handleAddToCart` freezes one garment into the cart (nothing is written to
   * the database), and `handleCheckoutCompleted` refreshes the desks once the
   * checkout transaction has committed the job cards.
   */
  const draftCart = useDraftOrderCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  // The cart line being edited: its saved values prefill the intake form.
  const [editingCartLine, setEditingCartLine] = useState<DraftCartItem | null>(null);

  const openIntake = (design: CatalogDesign | null = null, customerId = '', line: DraftCartItem | null = null) => {
    setIntakeDesign(design);
    setIntakeCustomerId(customerId);
    setEditingCartLine(line);
    setActiveModal('order');
  };

  const handleAddToCart = (data: GarmentIntakeData, extras: IntakeCartExtras, intent: IntakeCartIntent) => {
    const tailorName = tailors.find((t) => String(t.id) === String(data.assignedTailorId))?.full_name || '';
    // "Add & add another" always adds a NEW line; the other actions apply the
    // correction to the line that was opened for editing.
    const isEditing = Boolean(editingCartLine) && intent !== 'stay';
    const lineId = isEditing ? (editingCartLine as DraftCartItem).lineId : newCartLineId();
    const item: DraftCartItem = {
      lineId,
      customerId: data.customerId,
      customerName: customers.find((c) => String(c.customer_id) === String(data.customerId))?.full_name || 'Walk-in customer',
      orderType: data.orderType,
      catalogItemId: data.catalogItemId ?? null,
      catalogName: extras.catalogName,
      garmentType: data.garmentType,
      orderCategory: data.orderCategory,
      styleDesign: data.styleDesign,
      fabric: data.fabric,
      fabricQuantity: data.fabricQuantity,
      quantity: data.quantity,
      priority: data.priority as PriorityLevel,
      customizations: {
        collar_type: data.collarStyle || undefined,
        sleeve_type: data.sleeveStyle || undefined,
        embroidery: data.embroidery && data.embroidery !== 'None' ? data.embroidery : undefined,
        lining: data.lining || undefined,
        pocket_style: data.pocketStyle || undefined,
        buttons: data.buttons || undefined,
        monogram: data.monogram || undefined,
        rush_order: data.rushOrder || undefined,
      },
      specialInstructions: data.specialInstructions,
      targetCompletionDate: data.targetCompletionDate,
      assignedTailorId: data.assignedTailorId,
      assignedTailorName: tailorName,
      measurements: extras.measurements,
      referenceImages: data.referenceImages || [],
      color: data.color,
      customizationNotes: data.customizationNotes,
      additionalCharges: parseFloat(data.additionalCharges) || 0,
      discount: parseFloat(data.discount) || 0,
      image: extras.catalogImage,
      unitPrice: extras.finalPrice,
      finalPrice: extras.finalPrice,
      depositRequired: extras.depositRequired,
      amount: extras.allocatedAmount,
      breakdown: extras.quote,
      addedAt: new Date().toISOString(),
    };

    if (isEditing) {
      // Editing an existing cart line never creates a second line.
      draftCart.updateItem(lineId, item);
      setEditingCartLine(null);
      return { ok: true, message: `${item.garmentType} updated in the draft cart.` };
    }

    const outcome = draftCart.addItem(item);
    if (!outcome.ok) return outcome;
    // A garment captured while a line was being edited ends the edit, so the
    // next garment the counter adds starts a fresh line.
    if (editingCartLine) setEditingCartLine(null);
    loadDashboardData(true);
    return outcome;
  };

  /** The whole cart committed: refresh every desk and clear the edit state. */
  const handleCheckoutCompleted = () => {
    setCheckoutOpen(false);
    setCartOpen(false);
    setEditingCartLine(null);
    setBanner('Checkout completed — every garment now has its own job card, receipt and balance.');
    loadDashboardData(true);
    window.setTimeout(() => setBanner(''), 6000);
  };

  // The single-order create handler is GONE on purpose: the Front Desk no
  // longer writes a job card from the intake form. The intake form adds to the
  // Draft Order Cart (handleAddToCart above) and the ONE server transaction at
  // checkout (POST /api/orders/checkout) creates the job cards, receipts and
  // payment allocations. There is no second order-creation path.


  // Payments are recorded through the shared cash form
  // (financialCenter/CashPaymentForm.tsx) which calls the one payment API, so
  // there is no dashboard-level payment handler to keep in sync.

  // Same rule as the Appointments page: if the job order already has a live
  // appointment, that SAME record is updated in place (new date/time + next
  // fitting stage) instead of creating a duplicate row.
  // MANUAL EXCEPTION APPOINTMENT (special follow-ups only). Normal fitting and
  // pickup visits are suggested automatically by production and approved on the
  // Appointments page. An existing job card is required; its customer and
  // assigned tailor come from the card, never from this form.
  const handleScheduleFitting = async (data: ScheduleFittingPayload) => {
    const order = orders.find((o) => String(o.order_id) === String(data.orderId))
      || orders.find((o) => String(o.customer_id) === String(data.customerId));
    const jobCardNumber = order?.job_card_id || '';
    if (!jobCardNumber) throw new Error('This customer has no job card yet. An exception visit must belong to an existing job card.');
    const existing = findActiveAppointmentForJob(allAppointments, jobCardNumber);
    if (existing) throw new Error(`Job card ${jobCardNumber} already has a live ${existing.appointment_type} visit. Reschedule it from the appointment queue instead.`);
    const created = await frontDeskApi.createExceptionAppointment({
      jobCardNumber,
      appointmentDate: data.appointmentDate,
      appointmentTime: data.appointmentTime,
      appointmentType: data.appointmentType,
      notes: data.notes,
    });
    setBanner(`Exception visit scheduled for ${created.customer_name || 'the customer'} (${jobCardNumber}).`);
    loadDashboardData();
    setTimeout(() => setBanner(''), 5000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-[#8C6F3E]" />
      </div>
    );
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

      {error && (
        <div className="dash-in flex items-center gap-2 border border-[#C86A58]/30 bg-[#FDF4F2] px-4 py-3 text-sm text-[#9A3B2A] rounded-lg shadow-sm">
          <AlertCircle className="w-4 h-4" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="dash-in grid grid-cols-2 lg:grid-cols-6 gap-4" style={{ animationDelay: '0.04s' }}>
        <QuickAction icon={<UserPlus className="w-5 h-5" strokeWidth={1.6} />} label="Register customer" hint="New profile" onClick={() => setActiveModal('customer')} />
        <QuickAction icon={<LayoutGrid className="w-5 h-5" strokeWidth={1.6} />} label="Garment catalog" hint="Designs & fabrics" helper="Browse the shop's garments, uniform types, styles, fabrics and customization options with the customer — then start the order from there." onClick={() => { setActiveModal(null); onOpenCatalogPage?.(); }} />
        <QuickAction icon={<FilePlus2 className="w-5 h-5" strokeWidth={1.6} />} label="New order" hint="Garment intake" helper="Guided intake: customer, garment, customization and measurements, pricing — then the garment joins the Draft Order Cart. Add as many garments as the customer needs before checking out once." onClick={() => openIntake(null)} />
        <QuickAction icon={<ShoppingBag className="w-5 h-5" strokeWidth={1.6} />} label="Draft order cart" hint={draftCart.totals.lines ? `${draftCart.totals.lines} garment(s) waiting` : 'Multi-garment checkout'} helper="Review every garment the customer has chosen, assign a tailor per garment, then take ONE cash payment that creates a separate job card and receipt for each item." onClick={() => setCartOpen(true)} />
        <QuickAction icon={<Banknote className="w-5 h-5" strokeWidth={1.6} />} label="Record payment" hint="Existing job card" helper="Record additional payments for existing job cards." onClick={() => setActiveModal('payment')} />
        <QuickAction icon={<CalendarPlus className="w-5 h-5" strokeWidth={1.6} />} label="Manual exception" hint="Special follow-ups" helper="Only for exceptional follow-ups. Normal fitting and pickup visits are suggested automatically by production and approved on the Appointments page." onClick={() => setActiveModal('fitting')} />
      </div>

      {draftCart.totals.lines > 0 && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="dash-in flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-[#C9A15C]/50 bg-[#FBEDCB]/50 px-5 py-4 text-left transition-colors hover:bg-[#F9F4EB]"
          style={{ animationDelay: '0.06s' }}
        >
          <span className="flex items-center gap-3">
            <ShoppingBag className="h-5 w-5 text-[#8C6F3E]" strokeWidth={1.7} />
            <span>
              <span className="block text-[13.5px] font-semibold text-[#2A211D]">
                Draft order cart · {draftCart.totals.lines} garment{draftCart.totals.lines === 1 ? '' : 's'} for {draftCart.customerName || 'the walk-in customer'}
              </span>
              <span className="mt-0.5 block text-[11.5px] text-[#7A5A1E]">
                {formatPeso(draftCart.totals.total)} total · {formatPeso(draftCart.totals.depositDue)} deposits due · one cash payment at checkout
              </span>
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8C6F3E]">
            Review &amp; check out <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </button>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard delay={0.1} label="Collected today" value={formatPeso(stats.todayCollected)} icon={<Wallet className="w-4 h-4" strokeWidth={1.6} />} />
        <StatCard delay={0.14} label="Customers today" value={`${stats.todayCustomers}`} icon={<Users className="w-4 h-4" strokeWidth={1.6} />} />
        <StatCard delay={0.18} label="Fittings today" value={`${stats.upcomingFittings}`} icon={<CalendarClock className="w-4 h-4" strokeWidth={1.6} />} />
        <StatCard delay={0.22} label="Ready for pickup" value={`${stats.readyForPickup}`} icon={<Package className="w-4 h-4" strokeWidth={1.6} />} tone="warn" />
      </div>

      {/* APPOINTMENT PIPELINE — production-driven appointment counts. */}
      <div className="dash-in dash-card rounded-xl p-6" style={{ animationDelay: '0.24s' }}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <MonoLabel>Appointment pipeline</MonoLabel>
            <h2 className="text-xl font-normal mt-0.5 text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>Suggested visits waiting for the counter</h2>
          </div>
          <span className="text-[11px] uppercase tracking-[0.14em] text-[#8C7E74]">Approve or reschedule them on the Appointments page</span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {pipeline.map((item) => (
            <div key={item.label} className="rounded-lg border border-[#E2D7C7] bg-[#FCFAF7] px-3 py-3">
              <div className="text-2xl text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>{item.value}</div>
              <MonoLabel>{item.label}</MonoLabel>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6">
        <div className="dash-in dash-card rounded-xl overflow-hidden" style={{ animationDelay: '0.28s' }}>
          <div className="ticket-edge h-3 w-full" aria-hidden="true" />
          <div className="p-6 sm:p-8 pt-5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <MonoLabel>Today's activity</MonoLabel>
                <h2 className="text-xl font-normal mt-0.5 text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>The counter roll</h2>
              </div>
            </div>
            <div className="border-b border-dashed border-[#E2D7C7] my-5" />

            <div className="space-y-0 max-h-80 overflow-y-auto">
              {recentActivity.length === 0 ? (
                <p className="text-center text-[#766A62] py-8">No activity yet today.</p>
              ) : (
                recentActivity.map((entry, i) => (
                  <div key={i} className="flex items-center gap-3.5 py-3 border-b border-dashed border-[#ECE3D8] last:border-b-0">
                    <div className="w-8 h-8 rounded-lg bg-[#F9F4EB] text-[#8C6F3E] flex items-center justify-center flex-shrink-0">
                      {entry.kind === 'customer' ? <UserPlus className="w-4 h-4" strokeWidth={1.8} /> :
                       entry.kind === 'order' ? <FilePlus2 className="w-4 h-4" strokeWidth={1.8} /> :
                       entry.kind === 'payment' ? <Banknote className="w-4 h-4" strokeWidth={1.8} /> :
                       entry.kind === 'pickup' ? <PackageCheck className="w-4 h-4" strokeWidth={1.8} /> :
                       <CalendarPlus className="w-4 h-4" strokeWidth={1.8} />}
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
                ))
              )}
            </div>
            <div className="border-t-2 border-dashed border-[#E2D7C7] mt-3 pt-4 flex items-center justify-between">
              <MonoLabel>Collected today</MonoLabel>
              <span className="text-[16px] text-[#2A211D]" style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>{formatPeso(stats.todayCollected)}</span>
            </div>
          </div>
          <div className="ticket-edge h-3 w-full rotate-180" aria-hidden="true" />
        </div>

        <div className="space-y-6">
          <div className="dash-in dash-card rounded-xl p-6 sm:p-7" style={{ animationDelay: '0.32s' }}>
            <MonoLabel>Fitting scheduler</MonoLabel>
            <h2 className="text-xl font-normal mt-0.5 mb-5 text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>Today's fittings</h2>
            <div className="space-y-4">
              {visibleFittings.length === 0 ? (
                <p className="text-center text-[#766A62] py-4">No fittings scheduled today.</p>
              ) : (
                visibleFittings.slice(0, 4).map((f) => (
                  <div key={f.appointment_id} className="flex items-center gap-3.5">
                    <div className="flex flex-col items-center flex-shrink-0 w-14">
                      <Clock className="w-3.5 h-3.5 text-[#B89255] mb-0.5" strokeWidth={1.8} />
                      <span className="text-[11px] text-[#8C7E74] font-medium" style={{ fontFamily: "'Space Mono', monospace" }}>{f.appointment_time}</span>
                    </div>
                    <div className="min-w-0 flex-1 border-l border-[#ECE3D8] pl-3.5">
                      <div className="text-[13.5px] text-[#2A211D] font-medium truncate">{f.customer_name}</div>
                      <div className="inline-flex max-w-full items-center gap-1.5 text-[12px] text-[#766A62]">
                        <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${stageBadgeStyle(f.appointment_type).dot}`} />
                        <span className="truncate">{f.appointment_type}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="dash-in dash-card rounded-xl p-6 sm:p-7" style={{ animationDelay: '0.38s' }}>
            <MonoLabel>Release queue</MonoLabel>
            <h2 className="text-xl font-normal mt-0.5 mb-5 text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>Ready for pickup</h2>
            <div className="space-y-4">
              {readyForPickup.length === 0 ? (
                <p className="text-center text-[#766A62] py-4">No garments ready for pickup.</p>
              ) : (
                readyForPickup.slice(0, 3).map((order) => (
                  <div key={order.order_id} className="flex items-center justify-between gap-3 border-t border-[#ECE3D8] pt-4 first:border-t-0 first:pt-0">
                    <div className="min-w-0">
                      <div className="text-[13.5px] text-[#2A211D] font-medium truncate">{order.customer_name}</div>
                      <div className="text-[12px] text-[#766A62] truncate">{order.garment_type}</div>
                      <div className="text-[11px] mt-0.5 font-medium" style={{ color: order.remaining_balance > 0 ? '#9E5B4B' : '#4E7357', fontFamily: "'Space Mono', monospace" }}>
                        {order.remaining_balance > 0 ? `Balance: ${formatPeso(order.remaining_balance)}` : 'Paid in full'}
                      </div>
                    </div>
                    <button
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#2A211D] text-[#FAF7F2] text-[10px] font-semibold tracking-[0.1em] uppercase hover:bg-[#3D312B] transition-colors shadow-sm"
                      aria-label={`Release ${order.job_card_id}`}
                      onClick={async () => {
                        if (order.remaining_balance > 0) {
                          setBanner(`Cannot release ${order.job_card_id} - balance of ${formatPeso(order.remaining_balance)} remains.`);
                          setTimeout(() => setBanner(''), 5000);
                          return;
                        }
                        const releasedToName = window.prompt('Enter the full name of the person receiving this garment:')?.trim();
                        if (!releasedToName) return;
                        const releasedToRelation = window.prompt('Relationship to customer (leave blank if the customer is collecting it):')?.trim() || '';
                        const releaseReference = window.prompt('ID/reference number (optional):')?.trim() || '';
                        if (!window.confirm(`Release ${order.job_card_id} to ${releasedToName}? This records the pickup acknowledgement.`)) return;
                        try {
                          await frontDeskApi.releaseOrder(order.order_id, { releasedToName, releasedToRelation, releaseReference, releaseAcknowledged: true });
                          setBanner(`${order.job_card_id} released successfully.`);
                          loadDashboardData();
                          setTimeout(() => setBanner(''), 5000);
                        } catch (err) {
                          setBanner(err instanceof Error ? err.message : 'Failed to release order.');
                          setTimeout(() => setBanner(''), 5000);
                        }
                      }}
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      Release
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {activeModal === 'customer' && (
        <RegisterCustomerModal onClose={() => setActiveModal(null)} onRegister={handleRegisterCustomer} />
      )}
      {activeModal === 'order' && (
        <GarmentIntakeModal
          onClose={() => { setActiveModal(null); setIntakeDesign(null); setIntakeCustomerId(''); setEditingCartLine(null); }}
          onAddToCart={handleAddToCart}
          onViewCart={() => { setActiveModal(null); setCartOpen(true); }}
          onProceedToCheckout={() => { setActiveModal(null); setCheckoutOpen(true); }}
          cartItemCount={draftCart.totals.lines}
          customers={customers}
          orders={orders}
          initial={intakeDesign}
          initialState={editingCartLine ? {
            customerId: editingCartLine.customerId,
            orderCategory: editingCartLine.orderCategory,
            garmentType: editingCartLine.garmentType,
            styleDesign: editingCartLine.styleDesign,
            fabric: editingCartLine.fabric,
            fabricQuantity: editingCartLine.fabricQuantity,
            quantity: editingCartLine.quantity,
            specialInstructions: editingCartLine.specialInstructions,
            targetCompletionDate: editingCartLine.targetCompletionDate,
            assignedTailorId: editingCartLine.assignedTailorId,
            orderType: editingCartLine.orderType,
            catalogItemId: editingCartLine.catalogItemId,
            priority: editingCartLine.priority,
            collarStyle: editingCartLine.customizations.collar_type || '',
            sleeveStyle: editingCartLine.customizations.sleeve_type || '',
            embroidery: editingCartLine.customizations.embroidery || 'None',
            lining: editingCartLine.customizations.lining || '',
            pocketStyle: editingCartLine.customizations.pocket_style || '',
            buttons: editingCartLine.customizations.buttons || '',
            monogram: editingCartLine.customizations.monogram || '',
            rushOrder: Boolean(editingCartLine.customizations.rush_order),
            color: editingCartLine.color,
            customizationNotes: editingCartLine.customizationNotes,
            additionalCharges: String(editingCartLine.additionalCharges || ''),
            discount: String(editingCartLine.discount || ''),
            depositAmount: String(editingCartLine.amount || ''),
            // The measurements frozen on the cart line come back into the form.
            measurements: cartMeasurementsToIntake(editingCartLine.measurements),
            useExistingMeasurements: false,
          } : null}
          initialCustomerId={intakeCustomerId || (editingCartLine?.customerId ?? '')}
          onOpenCatalogPage={onOpenCatalogPage}
        />
      )}
      {cartOpen && (
        <DraftOrderCartPanel
          onClose={() => setCartOpen(false)}
          tailors={tailors}
          onEditItem={(item) => {
            setCartOpen(false);
            // The design + measured body are carried back into the form so the
            // counter corrects one field instead of re-keying the garment.
            openIntake(designFromCartItem(item), item.customerId, item);
          }}
          onAddAnother={() => {
            // 'Add another garment' keeps the SAME customer: that is the whole
            // point of the draft cart (one cart = one customer).
            setCartOpen(false);
            openIntake(null, draftCart.customerId);
          }}
          onProceedToCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }}
        />
      )}
      {checkoutOpen && (
        <CheckoutReviewPanel
          onClose={() => setCheckoutOpen(false)}
          onBackToCart={() => { setCheckoutOpen(false); setCartOpen(true); }}
          customerName={draftCart.customerName}
          onCompleted={handleCheckoutCompleted}
        />
      )}
      {activeModal === 'payment' && (
        <RecordCashPaymentModal
          onClose={() => setActiveModal(null)}
          orders={payableOrders}
          onRecorded={(payment) => {
            setBanner(`Payment of ${formatPeso(Number(payment.amount))} recorded (receipt ${payment.receipt_number}).`);
            loadDashboardData();
            setTimeout(() => setBanner(''), 5000);
          }}
        />
      )}
      {activeModal === 'fitting' && (
        <ScheduleFittingModal 
          onClose={() => setActiveModal(null)} 
          onSchedule={handleScheduleFitting}
          customers={customers}
          orders={orders}
          appointments={allAppointments}
        />
      )}
    </div>
  );
}

function QuickAction({ icon, label, hint, helper, onClick }: { icon: ReactNode; label: string; hint: string; helper?: string; onClick?: () => void }) {
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
      {helper && <p className="mt-2 text-xs leading-relaxed text-[#E4D8CD]">{helper}</p>}
    </button>
  );
}

function StatCard({ label, value, icon, delay = 0, tone = 'default' }: { label: string; value: string; icon: ReactNode; delay?: number; tone?: 'default' | 'warn' }) {
  return (
    <div className="dash-in dash-card rounded-xl p-5 sm:p-6 transition-shadow hover:shadow-md" style={{ animationDelay: `${delay}s` }}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tone === 'warn' ? 'bg-[#FAF2F0] text-[#9E5B4B]' : 'bg-[#F9F4EB] text-[#8C6F3E]'}`}>{icon}</div>
      </div>
      <div className="text-2xl font-normal mb-1 text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>{value}</div>
      <MonoLabel className="block">{label}</MonoLabel>
    </div>
  );
}

/* ==================================================================
   ROOT — sidebar drives which view renders
================================================================== */

/** The intake form's measurement keys, so a cart line can be edited in place. */
function cartMeasurementsToIntake(measurements: { label: string; value: string }[]): GarmentIntakeData['measurements'] {
  const values = { Chest: '', Waist: '', Hips: '', Shoulder: '', Sleeve: '', Inseam: '', Height: '' };
  for (const measurement of measurements) {
    const label = measurement.label.toLowerCase();
    if (label === 'chest' || label === 'bust') values.Chest = measurement.value;
    else if (label === 'waist') values.Waist = measurement.value;
    else if (label === 'hip' || label === 'hips') values.Hips = measurement.value;
    else if (label === 'shoulder') values.Shoulder = measurement.value;
    else if (label === 'sleeve' || label === 'sleeve length') values.Sleeve = measurement.value;
    else if (label === 'inseam') values.Inseam = measurement.value;
    else if (label === 'height') values.Height = measurement.value;
  }
  return values;
}

/**
 * A cart line reopened for editing needs the DESIGN it started from, otherwise
 * the intake form's step-2 rule ("a catalog order needs a catalog design")
 * would block a catalog garment from being corrected.
 */
function designFromCartItem(item: DraftCartItem): CatalogDesign {
  return {
    source: item.orderType === 'catalog' ? 'catalog' : 'custom',
    name: item.catalogName || item.garmentType,
    catalogItemId: item.catalogItemId,
    image: item.image,
    description: '',
    priceLabel: '',
    suggestedFabrics: [],
    suggestedColors: [],
    garmentType: item.garmentType,
    orderCategory: item.orderCategory,
    styleDesign: item.styleDesign,
  };
}

/**
 * THE FRONT DESK WORKSPACE — every side of the counter: dashboard, customers,
 * orders, measurements, appointments, the financial center, the catalog and the
 * multi-garment Draft Order Cart.
 *
 * The cart provider wraps the whole workspace so the badge, the intake form,
 * the cart panel and the checkout review all read ONE cart (React state +
 * sessionStorage — never a database table). The cart is Front Desk only: no
 * customer, tailor or admin surface can see it.
 */
export default function FrontDeskDashboard(props: { initialView?: ViewKey }) {
  return (
    <DraftOrderCartProvider>
      <FrontDeskWorkspace {...props} />
    </DraftOrderCartProvider>
  );
}

function FrontDeskWorkspace({ initialView = 'dashboard' }: { initialView?: ViewKey }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(() => currentUser());
  const [navOpen, setNavOpen] = useState(false);
  const [view, setView] = useState<ViewKey>(initialView);
  const [loading, setLoading] = useState(true);
  // Garment picked on the Garment Catalog page, waiting for the intake form.
  const [pendingDesign, setPendingDesign] = useState<CatalogDesign | null>(null);

  // --- Customer Financial Center navigation -------------------------------
  // The Financial Center is the primary financial profile page for every
  // customer. It opens as a full-height overlay so any customer reference in
  // the workspace (a customer card, an order row, a receipt, a dashboard
  // widget) can open it without losing the page underneath. Closing the page,
  // or closing an order detail opened from it, always returns to the same
  // selected customer.
  const [fcOpen, setFcOpen] = useState(false);
  const [fcCustomer, setFcCustomer] = useState<string | null>(null);
  const [fcDetailOrder, setFcDetailOrder] = useState<Order | null>(null);
  const [pendingIntakeCustomer, setPendingIntakeCustomer] = useState<string | null>(null);

  const openFinancialCenter = useCallback((customerId?: string) => {
    setFcCustomer(customerId ?? null);
    setFcOpen(true);
    setView('payments');
  }, []);

  // A row in the Financial Center's order ledger opens the EXISTING order
  // details on top of the Financial Center, so closing it returns here.
  // The Financial Center reads the shared financial API while the detail modal
  // needs the dashboard's live Order rows, so we match on the same keys.
  const [liveOrders, setLiveOrders] = useState<Order[]>([]);
  useEffect(() => {
    frontDeskApi.getAllOrders().then(setLiveOrders).catch(() => setLiveOrders([]));
  }, [fcOpen]);

  const openOrderFromFinancialCenter = useCallback((financialOrder: { order_id: string | number; job_card_number: string }) => {
    const match = liveOrders.find((order) => String(order.order_id) === String(financialOrder.order_id))
      || liveOrders.find((order) => order.job_card_id === financialOrder.job_card_number);
    if (match) setFcDetailOrder(match);
  }, [liveOrders]);

  useEffect(() => {
    const token = authToken();
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error();
        setProfile(data.user);
        const storage = localStorage.getItem('authToken') ? localStorage : sessionStorage;
        storage.setItem('currentUser', JSON.stringify(data.user));
      })
      .catch(() => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('currentUser');
        navigate('/login', { replace: true });
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const signOut = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('currentUser');
    navigate('/login', { replace: true });
  };

  const currentNavLabel = NAV.find((n) => n.view === view)?.label ?? 'Dashboard';

  function renderView() {
    switch (view) {
      case 'dashboard':
        return (
          <DashboardView
            pendingDesign={pendingDesign}
            onDesignConsumed={() => setPendingDesign(null)}
            onOpenCatalogPage={() => setView('catalog')}
            pendingIntakeCustomer={pendingIntakeCustomer}
            onIntakeCustomerConsumed={() => setPendingIntakeCustomer(null)}
          />
        );
      case 'customers':
        return <div className="module-customers"><FrontDeskCustomersExactView /></div>;
      case 'catalog':
        return (
          <FrontDeskGarmentCatalogView
            onStartOrder={(design) => { setPendingDesign(design); setView('dashboard'); }}
            onOpenIntake={() => { setPendingDesign(null); setView('dashboard'); }}
          />
        );
      case 'orders':
        return <div className="module-orders"><FrontDeskOrdersView /></div>;
      case 'measurements':
        return <div className="module-measurements"><FrontDeskMeasurementsView /></div>;
      case 'appointments':
        return <div className="module-appointments"><FrontDeskAppointmentsView /></div>;
      case 'payments':
        return (
          <CustomerFinancialCenterView
            mode="front_desk"
            initialCustomerId={fcCustomer}
            onNewOrder={(customerCode) => { setPendingIntakeCustomer(customerCode); setView('dashboard'); }}
            onOpenOrder={openOrderFromFinancialCenter}
          />
        );
      case 'settings':
        return <div className="module-settings"><FrontDeskSettingsView /></div>;
      default:
        return <div className="dash-in dash-card rounded-xl p-16 text-center">Coming soon</div>;
    }
  }

  if (loading) {
    return (
      <div className="frontdesk-theme min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#8C6F3E]" />
      </div>
    );
  }

  return (
    <div className="frontdesk-theme min-h-screen bg-[#FAF7F2] text-[#2A211D] antialiased flex" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{FONT_IMPORT + FRONT_DESK_THEME}</style>

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
          <button type="button" className="flex w-full items-center gap-3 rounded-lg p-1 text-left transition-colors hover:bg-[#FAF7F2]/70">
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

      {navOpen && <div className="fixed inset-0 bg-[#1F1916]/30 z-30 lg:hidden backdrop-blur-xs" onClick={() => setNavOpen(false)} />}

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
            <NotificationBell endpoint="/frontdesk/notifications" />
            <div className="h-5 w-px bg-[#E8DFD3] hidden sm:block" />
            <LiveDateTime />
          </div>
        </header>

        <FinancialCenterProvider open={openFinancialCenter}>
          <main className="w-full px-6 sm:px-10 xl:px-12 py-9">
            {renderView()}
          </main>
        </FinancialCenterProvider>
      </div>

      {/* ---- Customer Financial Center overlay ---------------------------------
          Opened from any customer reference in the workspace. The page below is
          kept mounted, so closing the Financial Center (or an order detail
          opened from it) returns to exactly where the desk was working. */}
      {fcOpen && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-[#FAF7F2] px-4 py-6 sm:px-8">
          <div className="mx-auto max-w-[1500px]">
            <CustomerFinancialCenterView
              mode="front_desk"
              initialCustomerId={fcCustomer}
              onBack={() => { setFcOpen(false); setFcCustomer(null); }}
              onNewOrder={(customerCode) => { setFcOpen(false); setFcCustomer(null); setPendingIntakeCustomer(customerCode); setView('dashboard'); }}
              onOpenOrder={openOrderFromFinancialCenter}
            />
          </div>
        </div>
      )}

      {/* The existing job-card details for this customer, opened from the order
          ledger and rendered ABOVE the Financial Center so closing it returns to
          the same customer's Financial Center. */}
      {fcDetailOrder && (
        <FrontDeskOrderDetails
          order={fcDetailOrder}
          onClose={() => setFcDetailOrder(null)}
        />
      )}
    </div>
  );
}

