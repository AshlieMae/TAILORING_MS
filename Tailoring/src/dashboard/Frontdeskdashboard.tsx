// Pages/FrontDesk/FrontDeskDashboard.tsx
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FrontDeskCustomersExactView } from '../Pages_Frontdesk/CustomersdeskExact';
import { FrontDeskOrdersView } from '../Pages_Frontdesk/Ordersdesk';
import { FrontDeskMeasurementsView } from '../Pages_Frontdesk/Measurementsdesk';
import { FrontDeskAppointmentsView } from '../Pages_Frontdesk/Appointmentsdesk';
import { FrontDeskPaymentsView } from '../Pages_Frontdesk/Paymentsdesk';
import { FrontDeskSettingsView } from '../Pages_Frontdesk/Settingsdesk';
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
  Loader2,
  Scissors,
  User,
  DollarSign,
  BarChart3,
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

function formatPeso(amount: number) {
  return `₱${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function currentUser() {
  const stored = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
  try { return stored ? JSON.parse(stored) : null; } catch { return null; }
}

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

// ============================================================
// CREATE ORDER MODAL
// ============================================================
interface CreateOrderFormData {
  customerId: string;
  customerName: string;
  garmentType: string;
  uniformCategory: string;
  styleDesign: string;
  fabric: string;
  fabricQuantity: string;
  quantity: number;
  specialInstructions: string;
  targetCompletionDate: string;
  assignedTailorId: string;
  depositAmount: string;
  collectDeposit: boolean;
  referenceImage: string;
}

const GARMENT_TYPES = ['Barong Tagalog', 'Two-piece Suit', "Women's Coat", 'Evening Gown', 'School Uniform Set', 'Custom garment'];
const UNIFORM_CATEGORIES = ['Regular University Uniform', 'Departmental Uniform', 'PE Uniform', 'Sports / Intramural Jersey', 'Custom/Bespoke Apparel', 'Not Applicable'];
const STYLE_DESIGNS = ['Classic', 'Modern', 'Embroidered', 'Minimalist', 'Traditional', 'Ruffled', 'Fitted', 'Loose fit'];

/** Hand-drawn style SVG illustration for each garment type — shown live in the order form. */
function GarmentIllustration({ type, className }: { type: string; className?: string }) {
  const line = { fill: 'none', stroke: '#8C6F3E', strokeWidth: 2.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const body = (d: string, fill: string) => <path d={d} {...line} fill={fill} />;
  switch (type) {
    case 'Barong Tagalog':
      return (
        <svg viewBox="0 0 120 140" className={className} aria-label="Barong Tagalog illustration">
          <rect x="6" y="6" width="108" height="128" rx="10" fill="#F8F3EB" />
          {body('M38 34 L20 44 L24 96 L38 90', '#FAF7F2')}
          {body('M82 34 L100 44 L96 96 L82 90', '#FAF7F2')}
          {body('M38 34 Q60 26 82 34 L84 118 Q60 126 36 118 Z', '#FAF7F2')}
          <path d="M48 30 Q60 40 72 30" {...line} />
          <path d="M52 50 V110 M60 46 V114 M68 50 V110" stroke="#C9A15C" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="60" cy="54" r="1.8" fill="#8C6F3E" /><circle cx="60" cy="68" r="1.8" fill="#8C6F3E" /><circle cx="60" cy="82" r="1.8" fill="#8C6F3E" />
        </svg>
      );
    case 'Two-piece Suit':
      return (
        <svg viewBox="0 0 120 140" className={className} aria-label="Two-piece suit illustration">
          <rect x="6" y="6" width="108" height="128" rx="10" fill="#F8F3EB" />
          {body('M40 30 L60 40 L80 30 L86 100 L34 100 Z', '#E8DFD3')}
          <path d="M40 30 L32 42 L36 96" {...line} />
          <path d="M80 30 L88 42 L84 96" {...line} />
          <path d="M52 32 L60 46 L68 32" stroke="#2A211D" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="60" cy="58" r="1.8" fill="#2A211D" /><circle cx="60" cy="72" r="1.8" fill="#2A211D" />
          <path d="M44 104 L40 132 M76 104 L80 132" stroke="#2A211D" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M42 104 H78" stroke="#2A211D" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case "Women's Coat":
      return (
        <svg viewBox="0 0 120 140" className={className} aria-label="Women's coat illustration">
          <rect x="6" y="6" width="108" height="128" rx="10" fill="#F8F3EB" />
          {body('M38 34 L20 44 L24 96 L38 90', '#FAF7F2')}
          {body('M82 34 L100 44 L96 96 L82 90', '#FAF7F2')}
          {body('M42 32 Q60 24 78 32 L84 118 Q60 126 36 118 Z', '#FAF7F2')}
          <path d="M50 30 L60 54 L70 30" stroke="#A46B48" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="38" y="72" width="44" height="6" rx="3" fill="#C9A15C" />
          <circle cx="60" cy="88" r="1.8" fill="#A46B48" /><circle cx="60" cy="100" r="1.8" fill="#A46B48" />
        </svg>
      );
    case 'Evening Gown':
      return (
        <svg viewBox="0 0 120 140" className={className} aria-label="Evening gown illustration">
          <rect x="6" y="6" width="108" height="128" rx="10" fill="#F8F3EB" />
          {body('M46 30 Q60 24 74 30 L78 70 Q92 110 84 128 Q60 136 36 128 Q28 110 42 70 Z', '#FDF0ED')}
          <path d="M48 30 L46 20 M72 30 L74 20" stroke="#A46B48" strokeWidth="2" strokeLinecap="round" />
          <path d="M44 68 Q60 74 76 68" stroke="#A46B48" strokeWidth="1.8" fill="none" />
          <path d="M52 84 Q60 88 68 84 M48 100 Q60 106 72 100" stroke="#C9A15C" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </svg>
      );
    case 'School Uniform Set':
      return (
        <svg viewBox="0 0 120 140" className={className} aria-label="School uniform set illustration">
          <rect x="6" y="6" width="108" height="128" rx="10" fill="#F8F3EB" />
          {body('M40 30 L60 38 L80 30 L82 78 L38 78 Z', '#FAF7F2')}
          <path d="M52 28 L60 40 L68 28" stroke="#4E7357" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M60 40 L56 48 L60 70 L64 48 Z" fill="#8A6618" />
          {body('M40 82 L80 82 L86 118 L34 118 Z', '#E8DFD3')}
          <path d="M50 84 V116 M60 84 V118 M70 84 V116" stroke="#4E7357" strokeWidth="1.2" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 120 140" className={className} aria-label="Custom garment illustration">
          <rect x="6" y="6" width="108" height="128" rx="10" fill="#F8F3EB" />
          {body('M44 34 Q60 26 76 34 L80 70 Q76 92 60 94 Q44 92 40 70 Z', '#FAF7F2')}
          <path d="M54 26 Q60 22 66 26" {...line} />
          <path d="M60 94 V124 M46 128 H74" stroke="#8C6F3E" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M28 58 Q60 76 92 58" stroke="#C9A15C" strokeWidth="1.6" strokeDasharray="4 3" fill="none" strokeLinecap="round" />
        </svg>
      );
  }
}

function CreateOrderModal({ 
  onClose, 
  onCreate, 
  customers,
  orders
}: { 
  onClose: () => void; 
  onCreate: (data: CreateOrderFormData) => Promise<void>;
  customers: Customer[];
  orders: Order[];
}) {
  const [form, setForm] = useState<CreateOrderFormData>({
    customerId: '',
    customerName: '',
    garmentType: GARMENT_TYPES[0],
    uniformCategory: UNIFORM_CATEGORIES[0],
    styleDesign: '',
    fabric: '',
    fabricQuantity: '',
    quantity: 1,
    specialInstructions: '',
    targetCompletionDate: '',
    assignedTailorId: '',
    depositAmount: '',
    collectDeposit: true,
    referenceImage: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [fabricOptions, setFabricOptions] = useState<{ id: number; fabricName: string; tone: string; unit: string }[]>([]);
  const [tailorOptions, setTailorOptions] = useState<{ id: number; full_name: string; position: string }[]>([]);
  const [priceCalculation, setPriceCalculation] = useState<{
    laborCost: number;
    fabricCost: number;
    additionalCharges: number;
    discount: number;
    totalAmount: number;
    depositRequired: number;
    remainingBalance: number;
  } | null>(null);
  const [calculating, setCalculating] = useState(false);

  const selectedCustomer = customers.find(c => c.customer_id === form.customerId);

  // Business rule: settle previous job cards before opening a new one.
  const unpaidOrders = useMemo(
    () => orders.filter((o) => String(o.customer_id) === String(form.customerId) && Number(o.remaining_balance) > 0),
    [orders, form.customerId]
  );
  const unsettledTotal = unpaidOrders.reduce((sum, o) => sum + Number(o.remaining_balance), 0);

  const calculatePrice = async () => {
    if (!form.garmentType) return;
    setCalculating(true);
    try {
      const result = await frontDeskApi.calculatePrice({
        garmentType: form.garmentType,
        uniformCategory: form.uniformCategory,
        fabric: form.fabric || 'Standard',
        fabricQuantity: parseFloat(form.fabricQuantity) || 0,
        quantity: form.quantity || 1,
        additionalCharges: 0,
        discount: 0,
      });
      setPriceCalculation(result);
    } catch (err) {
      console.error('Price calculation failed:', err);
      // Fallback calculation
      const basePrice = form.garmentType === 'Barong Tagalog' ? 2500 :
                        form.garmentType === 'Two-piece Suit' ? 4800 :
                        form.garmentType === "Women's Coat" ? 3500 :
                        form.garmentType === 'Evening Gown' ? 5000 :
                        form.garmentType === 'School Uniform Set' ? 1800 : 3000;
      const total = basePrice * (form.quantity || 1);
      setPriceCalculation({
        laborCost: total * 0.6,
        fabricCost: total * 0.3,
        additionalCharges: 0,
        discount: 0,
        totalAmount: total,
        depositRequired: total * 0.5,
        remainingBalance: total * 0.5,
      });
    } finally {
      setCalculating(false);
    }
  };

  useEffect(() => {
    if (form.garmentType) {
      calculatePrice();
    }
  }, [form.garmentType, form.quantity, form.fabricQuantity]);

  // Load the fabric catalogue from the shared inventory so the Front Desk picks
  // fabric that actually exists on the shelf.
  useEffect(() => {
    frontDeskApi.getFabricCatalog()
      .then((data) => setFabricOptions(data.fabrics || []))
      .catch(() => setFabricOptions([]));
  }, []);

  // Load approved Master Tailors so the Front Desk can pick who gets the job.
  useEffect(() => {
    frontDeskApi.getTailors()
      .then((tailors) => setTailorOptions(tailors.map((t) => ({ id: t.id, full_name: t.full_name, position: t.position || '' }))))
      .catch(() => setTailorOptions([]));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerId) {
      setError('Please select a customer.');
      return;
    }
    if (unpaidOrders.length) {
      setError(`This customer still owes ${formatPeso(unsettledTotal)} on ${unpaidOrders.length} earlier job card${unpaidOrders.length === 1 ? '' : 's'}. Settle it in the Payments desk before creating a new order.`);
      return;
    }
    if (!form.garmentType) {
      setError('Please select a garment type.');
      return;
    }
    if (!form.targetCompletionDate) {
      setError('Please set a target completion date.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onCreate(form);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order.');
    } finally {
      setSaving(false);
    }
  }

  const totalAmount = priceCalculation?.totalAmount || 0;
  const depositRequired = priceCalculation?.depositRequired || (totalAmount * 0.5);
  const remainingBalance = priceCalculation?.remainingBalance || (totalAmount * 0.5);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#1F1916]/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-[#FFFFFF] border border-[#E8DFD3] rounded-xl shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-7 sm:px-10 pt-8 pb-2">
          <MonoLabel>New order</MonoLabel>
          <button onClick={onClose} className="text-[#A3958B] hover:text-[#2A211D] transition-colors p-1 rounded-full hover:bg-[#F2ECE1]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-7 sm:px-10 pb-9 pt-2">
          <h2 className="text-3xl leading-tight mb-2 text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Create Custom Order
          </h2>
          <p className="text-[14px] text-[#766A62] font-light mb-6 leading-relaxed">
            Create a new job card for a custom garment order. You can collect and save the initial deposit before you finish.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="border border-[#C86A58]/30 bg-[#FDF4F2] px-4 py-3 rounded-lg text-sm text-[#9A3B2A]">
                {error}
              </div>
            )}

            {/* Customer Selection */}
            <div>
              <label className="block mb-1.5"><MonoLabel>Customer</MonoLabel></label>
              <div className="relative flex items-center border-b border-[#E2D7C7] focus-within:border-[#2A211D] transition-colors">
                <User className="w-4 h-4 text-[#A3958B]" strokeWidth={1.5} />
                <select
                  value={form.customerId}
                  onChange={(e) => {
                    const customer = customers.find(c => c.customer_id === e.target.value);
                    setForm(f => ({ 
                      ...f, 
                      customerId: e.target.value,
                      customerName: customer?.full_name || ''
                    }));
                  }}
                  className="w-full bg-transparent text-[14px] pl-3 py-2.5 focus:outline-none text-[#2A211D]"
                >
                  <option value="">Select a customer</option>
                  {customers.map(c => (
                    <option key={c.customer_id} value={c.customer_id}>{c.full_name} ({c.customer_id})</option>
                  ))}
                </select>
              </div>
              {selectedCustomer && (
                <div className="mt-2 text-xs text-[#766A62]">
                  {selectedCustomer.email} · {selectedCustomer.contact_number}
                </div>
              )}
              {unpaidOrders.length > 0 && (
                <div className="mt-3 rounded-lg border border-[#ECD8A7] bg-[#FFF7E3] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8A6618]">Unsettled balance — new order blocked</p>
                  <ul className="mt-2 space-y-1">
                    {unpaidOrders.map(o => (
                      <li key={o.order_id} className="flex items-center justify-between gap-3 text-[12px] text-[#8A6618]">
                        <span className="truncate">{o.job_card_id} · {o.garment_type}</span>
                        <span className="flex-shrink-0 font-semibold" style={{ fontFamily: "'Space Mono', monospace" }}>₱{Number(o.remaining_balance).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[11px] leading-relaxed text-[#8A6618]">
                    Total outstanding: <span className="font-bold">₱{unsettledTotal.toLocaleString()}</span>. Settle it in the Payments desk before creating a new job card for this customer.
                  </p>
                </div>
              )}
            </div>

            {/* Garment Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
              <div>
                <label className="block mb-1.5"><MonoLabel>Garment type</MonoLabel></label>
                <select
                  value={form.garmentType}
                  onChange={(e) => setForm(f => ({ ...f, garmentType: e.target.value }))}
                  className="w-full border-b border-[#E2D7C7] bg-transparent text-[14px] py-2.5 focus:outline-none focus:border-[#2A211D] text-[#2A211D]"
                >
                  {GARMENT_TYPES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block mb-1.5"><MonoLabel>Uniform category</MonoLabel></label>
                <select
                  value={form.uniformCategory}
                  onChange={(e) => setForm(f => ({ ...f, uniformCategory: e.target.value }))}
                  className="w-full border-b border-[#E2D7C7] bg-transparent text-[14px] py-2.5 focus:outline-none focus:border-[#2A211D] text-[#2A211D]"
                >
                  {UNIFORM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
              <div>
                <label className="block mb-1.5"><MonoLabel>Style/Design</MonoLabel></label>
                <select
                  value={form.styleDesign}
                  onChange={(e) => setForm(f => ({ ...f, styleDesign: e.target.value }))}
                  className="w-full border-b border-[#E2D7C7] bg-transparent text-[14px] py-2.5 focus:outline-none focus:border-[#2A211D] text-[#2A211D]"
                >
                  <option value="">Select a style</option>
                  {STYLE_DESIGNS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block mb-1.5"><MonoLabel>Fabric</MonoLabel></label>
                <select
                  value={form.fabric}
                  onChange={(e) => setForm(f => ({ ...f, fabric: e.target.value }))}
                  className="w-full border-b border-[#E2D7C7] bg-transparent text-[14px] py-2.5 focus:outline-none focus:border-[#2A211D] text-[#2A211D]"
                >
                  <option value="">Select a fabric</option>
                  {fabricOptions.map((f) => (
                    <option key={f.id} value={f.fabricName}>{f.fabricName}{f.tone ? ` — ${f.tone}` : ''} ({f.unit})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
              <div>
                <label className="block mb-1.5"><MonoLabel>Fabric quantity (yards)</MonoLabel></label>
                <div className="relative flex items-center border-b border-[#E2D7C7] focus-within:border-[#2A211D]">
                  <Scissors className="w-4 h-4 text-[#A3958B]" strokeWidth={1.5} />
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.fabricQuantity}
                    onChange={(e) => setForm(f => ({ ...f, fabricQuantity: e.target.value }))}
                    placeholder="2.5"
                    className="w-full bg-transparent placeholder-[#C2B5A8] text-[14px] pl-3 py-2.5 focus:outline-none text-[#2A211D]"
                  />
                </div>
              </div>
              <div>
                <label className="block mb-1.5"><MonoLabel>Quantity</MonoLabel></label>
                <div className="relative flex items-center border-b border-[#E2D7C7] focus-within:border-[#2A211D]">
                  <Package className="w-4 h-4 text-[#A3958B]" strokeWidth={1.5} />
                  <input
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={(e) => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
                    className="w-full bg-transparent text-[14px] pl-3 py-2.5 focus:outline-none text-[#2A211D]"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
              <div>
                <label className="block mb-1.5"><MonoLabel>Target completion date</MonoLabel></label>
                <input
                  type="date"
                  value={form.targetCompletionDate}
                  onChange={(e) => setForm(f => ({ ...f, targetCompletionDate: e.target.value }))}
                  className="w-full border-b border-[#E2D7C7] bg-transparent text-[14px] py-2.5 focus:outline-none focus:border-[#2A211D] text-[#2A211D]"
                />
              </div>
              <div>
                <label className="block mb-1.5"><MonoLabel>Assigned tailor (optional)</MonoLabel></label>
                <select
                  value={form.assignedTailorId}
                  onChange={(e) => setForm(f => ({ ...f, assignedTailorId: e.target.value }))}
                  className="w-full border-b border-[#E2D7C7] bg-transparent text-[14px] py-2.5 focus:outline-none focus:border-[#2A211D] text-[#2A211D]"
                >
                  <option value="">Auto-assign / not selected</option>
                  {tailorOptions.map((t) => (
                    <option key={t.id} value={String(t.id)}>{t.full_name}{t.position ? ` — ${t.position}` : ''}</option>
                  ))}
                </select>
                {tailorOptions.length === 0 && (
                  <span className="mt-1 block text-[10px]" style={{ color: '#A3958B' }}>No approved tailors found — the job will be auto-assigned to the least-loaded tailor.</span>
                )}
              </div>
            </div>

            <div>
              <label className="block mb-1.5"><MonoLabel>Special instructions</MonoLabel></label>
              <textarea
                value={form.specialInstructions}
                onChange={(e) => setForm(f => ({ ...f, specialInstructions: e.target.value }))}
                placeholder="Any special requests or notes for the tailor..."
                rows={2}
                className="w-full border-b border-[#E2D7C7] bg-transparent placeholder-[#C2B5A8] text-[14px] py-2.5 focus:outline-none focus:border-[#2A211D] text-[#2A211D] resize-none"
              />
            </div>

            {/* Garment preview — follows the selected type & category */}
            <div>
              <label className="block mb-1.5"><MonoLabel>Garment preview</MonoLabel></label>
              <div className="flex items-center gap-4 rounded-xl border border-[#E2D7C7] bg-gradient-to-br from-[#F8F3EB] to-[#FFFCF8] p-4">
                <div className="flex h-28 w-24 flex-shrink-0 items-center justify-center rounded-lg border border-[#E2D7C7] bg-white">
                  <GarmentIllustration type={form.garmentType} className="h-24 w-20" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>{form.garmentType}</p>
                  <p className="mt-0.5 text-[11px] uppercase tracking-[0.08em] text-[#8C7E74]" style={{ fontFamily: "'Space Mono', monospace" }}>{form.uniformCategory}</p>
                  <p className="mt-2 text-[11px] leading-relaxed text-[#766A62]">
                    The illustration follows the garment type. The category records the order's purpose — a school uniform program vs a bespoke piece.
                  </p>
                </div>
              </div>
            </div>

            {/* Price Breakdown */}
            {priceCalculation && (
              <div className="rounded-lg border border-[#E8DFD3] bg-[#FCFAF7] p-4 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-[#8C6F3E]" />
                  <h3 className="text-sm font-semibold text-[#2A211D]">Price Breakdown</h3>
                  {calculating && <Loader2 className="w-4 h-4 animate-spin text-[#8C6F3E] ml-auto" />}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between"><span className="text-[#766A62]">Labor Cost:</span><span className="font-medium">{formatPeso(priceCalculation.laborCost)}</span></div>
                  <div className="flex justify-between"><span className="text-[#766A62]">Fabric Cost:</span><span className="font-medium">{formatPeso(priceCalculation.fabricCost)}</span></div>
                  <div className="flex justify-between"><span className="text-[#766A62]">Additional Charges:</span><span className="font-medium">{formatPeso(priceCalculation.additionalCharges)}</span></div>
                  <div className="flex justify-between"><span className="text-[#766A62]">Discount:</span><span className="font-medium text-[#4E7357]">-{formatPeso(priceCalculation.discount)}</span></div>
                  <div className="col-span-2 border-t border-dashed border-[#E2D7C7] pt-2 flex justify-between font-semibold">
                    <span>Total Amount:</span>
                    <span className="text-[#2A211D]">{formatPeso(priceCalculation.totalAmount)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Initial deposit is recorded automatically with the new job card. */}
            <div className="rounded-lg border border-[#E8DFD3] bg-[#FCFAF7] p-4">
              <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-[#2A211D]">
                <input
                  type="checkbox"
                  checked={form.collectDeposit}
                  onChange={(e) => setForm(f => ({ ...f, collectDeposit: e.target.checked }))}
                  className="h-4 w-4 accent-[#8C6F3E]"
                />
                Collect initial deposit now (recorded automatically when this order is created)
              </label>
              {form.collectDeposit && (
                <div className="mt-4">
                  <label className="block mb-1.5"><MonoLabel>Deposit amount (₱)</MonoLabel></label>
                  <div className="relative flex items-center border-b border-[#E2D7C7] focus-within:border-[#2A211D]">
                    <Banknote className="w-4 h-4 text-[#A3958B]" strokeWidth={1.5} />
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.depositAmount}
                      onChange={(e) => setForm(f => ({ ...f, depositAmount: e.target.value }))}
                      placeholder={String(depositRequired)}
                      className="w-full bg-transparent placeholder-[#C2B5A8] text-[14px] pl-3 py-2.5 focus:outline-none text-[#2A211D]"
                    />
                  </div>
                  <p className="text-[11px] text-[#A3958B] mt-2">
                    Enter the amount collected now. It will be saved as the initial payment for this new job card. Suggested deposit: {formatPeso(depositRequired)} · Balance after deposit: {formatPeso(remainingBalance)}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="flex-1 px-4 py-3 rounded-lg border border-[#E2D7C7] text-[#766A62] text-[11px] font-semibold tracking-[0.14em] uppercase hover:bg-[#F2ECE1] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || unpaidOrders.length > 0}
                title={unpaidOrders.length ? 'Settle the outstanding balance first' : undefined}
                className="flex-1 px-4 py-3 rounded-lg bg-[#2A211D] text-[#FAF7F2] text-[11px] font-semibold tracking-[0.14em] uppercase hover:bg-[#3D312B] transition-colors shadow-md disabled:opacity-50"
              >
                {unpaidOrders.length ? 'Balance must be settled first' : saving ? 'Creating...' : 'Create Order'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// RECORD PAYMENT MODAL
// ============================================================
interface RecordPaymentFormData {
  jobCardId: string;
  orderId: string;
  amount: string;
  paymentType: 'Deposit' | 'Final Payment' | 'Partial';
  paymentMethod: 'Cash' | 'Card' | 'Bank Transfer' | 'GCash' | 'Other';
  notes: string;
}

function RecordPaymentModal({ 
  onClose, 
  onRecord, 
  orders 
}: { 
  onClose: () => void; 
  onRecord: (data: any) => Promise<void>;
  orders: Order[];
}) {
  const [form, setForm] = useState<RecordPaymentFormData>({
    jobCardId: '',
    orderId: '',
    amount: '',
    paymentType: 'Deposit',
    paymentMethod: 'Cash',
    notes: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedOrder = orders.find(o => o.job_card_id === form.jobCardId.toUpperCase());

  // Auto-fill the amount from the payment type: Deposit = 50% of the total,
  // Final Payment = the full remaining balance, Partial = typed by the staff.
  const applyAmountForType = (type: 'Deposit' | 'Final Payment' | 'Partial', order?: Order) => {
    const target = order || selectedOrder;
    if (!target) return;
    const total = Number(target.total_amount) || 0;
    const balance = Number(target.remaining_balance) || 0;
    let suggested = '';
    if (type === 'Deposit') {
      suggested = String(Math.min(Math.round(total * 0.5 * 100) / 100, balance));
    } else if (type === 'Final Payment') {
      suggested = String(balance);
    }
    setForm(f => ({ ...f, paymentType: type, amount: suggested }));
  };

  const handleJobCardSearch = (value: string) => {
    setForm(f => ({ ...f, jobCardId: value }));
    const found = orders.find(o => o.job_card_id === value.toUpperCase());
    if (found) {
      setForm(f => ({ ...f, orderId: found.order_id }));
      applyAmountForType(form.paymentType, found);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
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
    if (selectedOrder && amountNum > selectedOrder.remaining_balance) {
      setError(`Amount exceeds the balance due of ${formatPeso(selectedOrder.remaining_balance)} for this job card.`);
      return;
    }
    if (!selectedOrder) {
      setError('Job card not found. Please check the ID.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onRecord({
        orderId: selectedOrder.order_id,
        amount: amountNum,
        paymentType: form.paymentType,
        paymentMethod: form.paymentMethod,
        notes: form.notes,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#1F1916]/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-[#FFFFFF] border border-[#E8DFD3] rounded-xl shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-7 sm:px-10 pt-8 pb-2">
          <MonoLabel>Record payment</MonoLabel>
          <button onClick={onClose} className="text-[#A3958B] hover:text-[#2A211D] transition-colors p-1 rounded-full hover:bg-[#F2ECE1]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-7 sm:px-10 pb-9 pt-2">
          <h2 className="text-3xl leading-tight mb-2 text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Record Payment
          </h2>
          <p className="text-[14px] text-[#766A62] font-light mb-6 leading-relaxed">
            Record an additional deposit, partial payment, or final balance for an existing job card. Initial deposits can be collected while creating an order.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="border border-[#C86A58]/30 bg-[#FDF4F2] px-4 py-3 rounded-lg text-sm text-[#9A3B2A]">
                {error}
              </div>
            )}

            <div>
              <label className="block mb-1.5"><MonoLabel>Existing job card</MonoLabel></label>
              <div className="relative flex items-center border-b border-[#E2D7C7] focus-within:border-[#2A211D]">
                <Package className="w-4 h-4 text-[#A3958B]" strokeWidth={1.5} />
                <select
                  value={form.jobCardId}
                  onChange={(e) => handleJobCardSearch(e.target.value)}
                  className="w-full bg-transparent text-[14px] pl-3 py-2.5 focus:outline-none text-[#2A211D]"
                >
                  <option value="">Select an existing job card</option>
                  {orders.filter((order) => order.production_status !== 'Released').map((order) => (
                    <option key={order.order_id} value={order.job_card_id}>
                      {order.job_card_id} — {order.customer_name} ({formatPeso(order.remaining_balance)} balance)
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-2 text-[11px] text-[#A3958B]">Choose the job card receiving this additional, partial, or final payment.</p>
            </div>

            {selectedOrder && (
              <div className="rounded-lg border border-[#E8DFD3] bg-[#FCFAF7] p-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-[#2A211D]">{selectedOrder.customer_name}</span>
                  <span className="text-sm text-[#766A62]">{selectedOrder.garment_type}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-dashed border-[#E2D7C7]">
                  <div>
                    <MonoLabel>Total</MonoLabel>
                    <div className="text-sm font-semibold text-[#2A211D]">{formatPeso(Number(selectedOrder.total_amount))}</div>
                  </div>
                  <div>
                    <MonoLabel>Paid</MonoLabel>
                    <div className="text-sm font-semibold text-[#4E7357]">{formatPeso(Number(selectedOrder.deposit_paid))}</div>
                  </div>
                  <div>
                    <MonoLabel>Balance</MonoLabel>
                    <div className="text-sm font-semibold text-[#9E5B4B]">{formatPeso(Number(selectedOrder.remaining_balance))}</div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-[#766A62]">
                  Status: {selectedOrder.payment_status} · Production: {selectedOrder.production_status}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1.5"><MonoLabel>Payment type</MonoLabel></label>
                <select
                  value={form.paymentType}
                  onChange={(e) => applyAmountForType(e.target.value as any)}
                  className="w-full border-b border-[#E2D7C7] bg-transparent text-[14px] py-2.5 focus:outline-none focus:border-[#2A211D] text-[#2A211D]"
                >
                  <option value="Deposit">Deposit</option>
                  <option value="Final Payment">Final Payment</option>
                  <option value="Partial">Partial</option>
                </select>
              </div>
              <div>
                <label className="block mb-1.5"><MonoLabel>Payment method</MonoLabel></label>
                <select
                  value={form.paymentMethod}
                  onChange={(e) => setForm(f => ({ ...f, paymentMethod: e.target.value as any }))}
                  className="w-full border-b border-[#E2D7C7] bg-transparent text-[14px] py-2.5 focus:outline-none focus:border-[#2A211D] text-[#2A211D]"
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="GCash">GCash</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block mb-1.5"><MonoLabel>Amount (₱)</MonoLabel></label>
              <div className="relative flex items-center border-b border-[#E2D7C7] focus-within:border-[#2A211D]">
                <Banknote className="w-4 h-4 text-[#A3958B]" strokeWidth={1.5} />
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.amount}
                  onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0"
                  className="w-full bg-transparent placeholder-[#C2B5A8] text-[14px] pl-3 py-2.5 focus:outline-none text-[#2A211D]"
                />
              </div>
              {selectedOrder && (
                <p className="text-[11px] text-[#A3958B] mt-1">
                  Remaining balance: {formatPeso(Number(selectedOrder.remaining_balance))}
                  {Number(selectedOrder.remaining_balance) > 0 && (
                    <> · Deposit (50%): {formatPeso(Math.round(Number(selectedOrder.total_amount) * 0.5 * 100) / 100)} · Partial: type any amount</>
                  )}
                </p>
              )}
            </div>

            <div>
              <label className="block mb-1.5"><MonoLabel>Notes (optional)</MonoLabel></label>
              <input
                value={form.notes}
                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. Cash payment"
                className="w-full border-b border-[#E2D7C7] bg-transparent placeholder-[#C2B5A8] text-[14px] py-2.5 focus:outline-none focus:border-[#2A211D] text-[#2A211D]"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="flex-1 px-4 py-3 rounded-lg border border-[#E2D7C7] text-[#766A62] text-[11px] font-semibold uppercase hover:bg-[#F2ECE1] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-3 rounded-lg bg-[#2A211D] text-[#FAF7F2] text-[11px] font-semibold uppercase hover:bg-[#3D312B] shadow-md disabled:opacity-50"
              >
                {saving ? 'Recording...' : 'Record Payment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

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
    // Fresh booking (no job order attached yet): the first visit on the
    // journey is always a Consultation.
    if (!form.orderId) return 'Consultation';
    return determineStageForJob(appointments, form.orderId);
  }, [appointments, form.orderId]);

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
        appointmentType: plannedType || activeVisit?.appointment_type || 'Consultation',
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
                <span className="font-semibold uppercase tracking-[0.08em]">{plannedType || 'Consultation'}</span>. Just pick a date and time.
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

function DashboardView() {
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
  const [error, setError] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<null | 'customer' | 'order' | 'payment' | 'fitting'>(null);
  const [banner, setBanner] = useState('');
  // Same display rules as the Appointments page: merge duplicate records
  // (same appointment ID) and keep only the latest active booking per
  // job card + fitting stage.
  const visibleFittings = useMemo(() => dedupeAppointments(upcomingFittings), [upcomingFittings]);

  // Job orders that are already fully paid (zero remaining balance) have no
  // outstanding amount, so they are NOT offered in the Record-payment picker.
  // This matches the desk rule: hide a job card when it is Fully Paid / balance 0.
  const payableOrders = useMemo(() => orders.filter((o) => Number(o.remaining_balance) > 0), [orders]);

  const loadDashboardData = useCallback(async (silent = false) => {
    if (!silent) { setLoading(true); setError(null); }
    try {
      const [statsData, activityData, pickupData, fittingsData, customersData, ordersData, appointmentsData] = await Promise.all([
        frontDeskApi.getDashboardStats(),
        frontDeskApi.getRecentActivity(),
        frontDeskApi.getReadyForPickup(),
        frontDeskApi.getUpcomingFittings(),
        frontDeskApi.searchCustomers(''),
        frontDeskApi.getAllOrders(),
        frontDeskApi.getAppointments(),
      ]);
      setStats(statsData);
      setRecentActivity(activityData);
      setReadyForPickup(pickupData);
      setUpcomingFittings(fittingsData);
      setCustomers(customersData);
      setOrders(ordersData);
      setAllAppointments(appointmentsData);
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

  const handleCreateOrder = async (data: CreateOrderFormData) => {
    try {
      const newOrder = await frontDeskApi.createOrder({
        customerId: data.customerId,
        garmentType: data.garmentType,
        uniformCategory: data.uniformCategory,
        styleDesign: data.styleDesign,
        fabric: data.fabric,
        fabricQuantity: parseFloat(data.fabricQuantity) || 0,
        quantity: data.quantity,
        specialInstructions: data.specialInstructions,
        targetCompletionDate: data.targetCompletionDate,
        assignedTailorId: data.assignedTailorId,
        measurementSnapshotId: '',
        orderNotes: '',
        referenceImage: data.referenceImage,
      });

      if (data.collectDeposit && data.depositAmount) {
        const depositAmount = parseFloat(data.depositAmount);
        if (depositAmount > 0) {
          await frontDeskApi.recordPayment({
            orderId: newOrder.order_id,
            amount: depositAmount,
            paymentType: 'Deposit',
            paymentMethod: 'Cash',
            notes: 'Initial deposit recorded at front desk',
          });
          setBanner('Order created successfully. Deposit payment has been recorded.');
        } else {
          setBanner(`Order ${newOrder.job_card_id} created successfully.`);
        }
      } else {
        setBanner(`Order ${newOrder.job_card_id} created successfully.`);
      }
      setActiveModal(null);
      loadDashboardData();
      setTimeout(() => setBanner(''), 5000);
    } catch (err) {
      throw err;
    }
  };

  const handleRecordPayment = async (data: any) => {
    await frontDeskApi.recordPayment(data);
    setBanner(`Payment of ${formatPeso(data.amount)} recorded successfully.`);
    loadDashboardData();
    setTimeout(() => setBanner(''), 5000);
  };

  // Same rule as the Appointments page: if the job order already has a live
  // appointment, that SAME record is updated in place (new date/time + next
  // fitting stage) instead of creating a duplicate row.
  const handleScheduleFitting = async (data: ScheduleFittingPayload) => {
    const existing = findActiveAppointmentForJob(allAppointments, data.orderId);
    if (existing) {
      await frontDeskApi.rescheduleAppointment(existing.appointment_id, {
        appointmentDate: data.appointmentDate,
        appointmentTime: data.appointmentTime,
        appointmentType: data.appointmentType,
      });
      setBanner(`${existing.customer_name || 'Customer'}'s ${existing.appointment_type} visit moved to ${data.appointmentType} — same appointment updated.`);
    } else {
      await frontDeskApi.createAppointment({
        customerId: data.customerId,
        orderId: data.orderId,
        appointmentDate: data.appointmentDate,
        appointmentTime: data.appointmentTime,
        appointmentType: data.appointmentType,
        notes: data.notes,
      });
      setBanner('Fitting appointment scheduled successfully.');
    }
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

      <div className="dash-in grid grid-cols-2 lg:grid-cols-4 gap-4" style={{ animationDelay: '0.04s' }}>
        <QuickAction icon={<UserPlus className="w-5 h-5" strokeWidth={1.6} />} label="Register customer" hint="New profile" onClick={() => setActiveModal('customer')} />
        <QuickAction icon={<FilePlus2 className="w-5 h-5" strokeWidth={1.6} />} label="Create order" hint="New job card" helper="Create a new job card and optionally collect the initial deposit." onClick={() => setActiveModal('order')} />
        <QuickAction icon={<Banknote className="w-5 h-5" strokeWidth={1.6} />} label="Record payment" hint="Existing job card" helper="Record additional payments for existing job cards." onClick={() => setActiveModal('payment')} />
        <QuickAction icon={<CalendarPlus className="w-5 h-5" strokeWidth={1.6} />} label="Schedule fitting" hint="Book appointment" onClick={() => setActiveModal('fitting')} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard delay={0.1} label="Collected today" value={formatPeso(stats.todayCollected)} icon={<Wallet className="w-4 h-4" strokeWidth={1.6} />} />
        <StatCard delay={0.14} label="Customers today" value={`${stats.todayCustomers}`} icon={<Users className="w-4 h-4" strokeWidth={1.6} />} />
        <StatCard delay={0.18} label="Fittings today" value={`${stats.upcomingFittings}`} icon={<CalendarClock className="w-4 h-4" strokeWidth={1.6} />} />
        <StatCard delay={0.22} label="Ready for pickup" value={`${stats.readyForPickup}`} icon={<Package className="w-4 h-4" strokeWidth={1.6} />} tone="warn" />
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
                        try {
                          await frontDeskApi.releaseOrder(order.order_id);
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
        <CreateOrderModal 
          onClose={() => setActiveModal(null)} 
          onCreate={handleCreateOrder}
          customers={customers}
          orders={orders}
        />
      )}
      {activeModal === 'payment' && (
        <RecordPaymentModal 
          onClose={() => setActiveModal(null)} 
          onRecord={handleRecordPayment}
          orders={payableOrders}
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

export default function FrontDeskDashboard({ initialView = 'dashboard' }: { initialView?: ViewKey }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(() => currentUser());
  const [navOpen, setNavOpen] = useState(false);
  const [view, setView] = useState<ViewKey>(initialView);
  const [loading, setLoading] = useState(true);

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

        <main className="w-full px-6 sm:px-10 xl:px-12 py-9">
          {renderView()}
        </main>
      </div>
    </div>
  );
}
