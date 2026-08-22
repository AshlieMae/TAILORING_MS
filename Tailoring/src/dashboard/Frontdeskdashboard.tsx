// Pages/FrontDesk/FrontDeskDashboard.tsx
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FrontDeskCustomersExactView } from '../Pages_Frontdesk/CustomersdeskExact';
import { FrontDeskOrdersView } from '../Pages_Frontdesk/Ordersdesk';
import { FrontDeskMeasurementsView } from '../Pages_Frontdesk/Measurementsdesk';
import { FrontDeskAppointmentsView } from '../Pages_Frontdesk/Appointmentsdesk';
import { FrontDeskPaymentsView } from '../Pages_Frontdesk/Paymentsdesk';
import { FrontDeskSettingsView } from '../Pages_Frontdesk/Settingsdesk';
import frontDeskApi, { authToken, type Order, type Appointment, type Customer } from '../../services/frontDeskApi';
import { RegisterCustomerModal, type NewCustomerForm } from '../pages/FrontDesk/FrontDeskModals';
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
  Calendar,
  DollarSign,
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
}

const GARMENT_TYPES = ['Barong Tagalog', 'Two-piece Suit', "Women's Coat", 'Evening Gown', 'School Uniform Set', 'Custom garment'];
const UNIFORM_CATEGORIES = ['Regular University Uniform', 'Departmental Uniform', 'PE Uniform', 'Sports / Intramural Jersey', 'Custom/Bespoke Apparel', 'Not Applicable'];

function CreateOrderModal({ 
  onClose, 
  onCreate, 
  customers 
}: { 
  onClose: () => void; 
  onCreate: (data: CreateOrderFormData) => Promise<void>;
  customers: Customer[];
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
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerId) {
      setError('Please select a customer.');
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
                <input
                  value={form.styleDesign}
                  onChange={(e) => setForm(f => ({ ...f, styleDesign: e.target.value }))}
                  placeholder="e.g. Classic, Modern, Embroidered"
                  className="w-full border-b border-[#E2D7C7] bg-transparent placeholder-[#C2B5A8] text-[14px] py-2.5 focus:outline-none focus:border-[#2A211D] text-[#2A211D]"
                />
              </div>
              <div>
                <label className="block mb-1.5"><MonoLabel>Fabric</MonoLabel></label>
                <input
                  value={form.fabric}
                  onChange={(e) => setForm(f => ({ ...f, fabric: e.target.value }))}
                  placeholder="e.g. Italian Wool, Cotton, Silk"
                  className="w-full border-b border-[#E2D7C7] bg-transparent placeholder-[#C2B5A8] text-[14px] py-2.5 focus:outline-none focus:border-[#2A211D] text-[#2A211D]"
                />
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
                <input
                  value={form.assignedTailorId}
                  onChange={(e) => setForm(f => ({ ...f, assignedTailorId: e.target.value }))}
                  placeholder="Tailor name or ID"
                  className="w-full border-b border-[#E2D7C7] bg-transparent placeholder-[#C2B5A8] text-[14px] py-2.5 focus:outline-none focus:border-[#2A211D] text-[#2A211D]"
                />
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
                disabled={saving}
                className="flex-1 px-4 py-3 rounded-lg bg-[#2A211D] text-[#FAF7F2] text-[11px] font-semibold tracking-[0.14em] uppercase hover:bg-[#3D312B] transition-colors shadow-md disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create Order'}
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

  const handleJobCardSearch = (value: string) => {
    setForm(f => ({ ...f, jobCardId: value }));
    const found = orders.find(o => o.job_card_id === value.toUpperCase());
    if (found) {
      setForm(f => ({ ...f, orderId: found.order_id }));
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
                    <div className="text-sm font-semibold text-[#2A211D]">{formatPeso(selectedOrder.total_amount)}</div>
                  </div>
                  <div>
                    <MonoLabel>Paid</MonoLabel>
                    <div className="text-sm font-semibold text-[#4E7357]">{formatPeso(selectedOrder.deposit_paid)}</div>
                  </div>
                  <div>
                    <MonoLabel>Balance</MonoLabel>
                    <div className="text-sm font-semibold text-[#9E5B4B]">{formatPeso(selectedOrder.remaining_balance)}</div>
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
                  onChange={(e) => setForm(f => ({ ...f, paymentType: e.target.value as any }))}
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
              {selectedOrder && selectedOrder.remaining_balance > 0 && (
                <p className="text-[11px] text-[#A3958B] mt-1">
                  Remaining balance: {formatPeso(selectedOrder.remaining_balance)}
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
interface ScheduleFittingFormData {
  customerId: string;
  orderId: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: 'First Fitting' | 'Final Fitting' | 'Consultation' | 'Pickup';
  notes: string;
}

function ScheduleFittingModal({ 
  onClose, 
  onSchedule,
  customers,
  orders
}: { 
  onClose: () => void; 
  onSchedule: (data: any) => Promise<void>;
  customers: Customer[];
  orders: Order[];
}) {
  const [form, setForm] = useState<ScheduleFittingFormData>({
    customerId: '',
    orderId: '',
    appointmentDate: new Date().toISOString().split('T')[0],
    appointmentTime: '',
    appointmentType: 'First Fitting',
    notes: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredOrders = orders.filter(o => o.customer_id === form.customerId && o.production_status !== 'Released');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerId || !form.orderId || !form.appointmentDate || !form.appointmentTime) {
      setError('Customer, order, date, and time are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSchedule(form);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule appointment.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#1F1916]/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-[#FFFFFF] border border-[#E8DFD3] rounded-xl shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-7 sm:px-10 pt-8 pb-2">
          <MonoLabel>Schedule fitting</MonoLabel>
          <button onClick={onClose} className="text-[#A3958B] hover:text-[#2A211D] transition-colors p-1 rounded-full hover:bg-[#F2ECE1]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-7 sm:px-10 pb-9 pt-2">
          <h2 className="text-3xl leading-tight mb-2 text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Schedule Fitting
          </h2>
          <p className="text-[14px] text-[#766A62] font-light mb-6 leading-relaxed">
            Book a fitting appointment for a customer.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="border border-[#C86A58]/30 bg-[#FDF4F2] px-4 py-3 rounded-lg text-sm text-[#9A3B2A]">
                {error}
              </div>
            )}

            <div>
              <label className="block mb-1.5"><MonoLabel>Customer</MonoLabel></label>
              <div className="relative flex items-center border-b border-[#E2D7C7] focus-within:border-[#2A211D]">
                <User className="w-4 h-4 text-[#A3958B]" strokeWidth={1.5} />
                <select
                  value={form.customerId}
                  onChange={(e) => setForm(f => ({ ...f, customerId: e.target.value, orderId: '' }))}
                  className="w-full bg-transparent text-[14px] pl-3 py-2.5 focus:outline-none text-[#2A211D]"
                >
                  <option value="">Select customer</option>
                  {customers.map(c => (
                    <option key={c.customer_id} value={c.customer_id}>{c.full_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block mb-1.5"><MonoLabel>Order (Job Card)</MonoLabel></label>
              <div className="relative flex items-center border-b border-[#E2D7C7] focus-within:border-[#2A211D]">
                <Package className="w-4 h-4 text-[#A3958B]" strokeWidth={1.5} />
                <select
                  value={form.orderId}
                  onChange={(e) => setForm(f => ({ ...f, orderId: e.target.value }))}
                  disabled={!form.customerId}
                  className="w-full bg-transparent text-[14px] pl-3 py-2.5 focus:outline-none text-[#2A211D] disabled:opacity-50"
                >
                  <option value="">Select order</option>
                  {filteredOrders.map(o => (
                    <option key={o.order_id} value={o.order_id}>
                      {o.job_card_id} - {o.garment_type} ({o.production_status})
                    </option>
                  ))}
                </select>
              </div>
              {filteredOrders.length === 0 && form.customerId && (
                <p className="text-[11px] text-[#A3958B] mt-1">No active orders for this customer.</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1.5"><MonoLabel>Date</MonoLabel></label>
                <div className="relative flex items-center border-b border-[#E2D7C7] focus-within:border-[#2A211D]">
                  <Calendar className="w-4 h-4 text-[#A3958B]" strokeWidth={1.5} />
                  <input
                    type="date"
                    value={form.appointmentDate}
                    onChange={(e) => setForm(f => ({ ...f, appointmentDate: e.target.value }))}
                    className="w-full bg-transparent text-[14px] pl-3 py-2.5 focus:outline-none text-[#2A211D]"
                  />
                </div>
              </div>
              <div>
                <label className="block mb-1.5"><MonoLabel>Time</MonoLabel></label>
                <div className="relative flex items-center border-b border-[#E2D7C7] focus-within:border-[#2A211D]">
                  <Clock className="w-4 h-4 text-[#A3958B]" strokeWidth={1.5} />
                  <input
                    type="time"
                    value={form.appointmentTime}
                    onChange={(e) => setForm(f => ({ ...f, appointmentTime: e.target.value }))}
                    className="w-full bg-transparent text-[14px] pl-3 py-2.5 focus:outline-none text-[#2A211D]"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block mb-1.5"><MonoLabel>Appointment type</MonoLabel></label>
              <select
                value={form.appointmentType}
                onChange={(e) => setForm(f => ({ ...f, appointmentType: e.target.value as any }))}
                className="w-full border-b border-[#E2D7C7] bg-transparent text-[14px] py-2.5 focus:outline-none focus:border-[#2A211D] text-[#2A211D]"
              >
                <option value="First Fitting">First Fitting</option>
                <option value="Final Fitting">Final Fitting</option>
                <option value="Consultation">Consultation</option>
                <option value="Pickup">Pickup</option>
              </select>
            </div>

            <div>
              <label className="block mb-1.5"><MonoLabel>Notes (optional)</MonoLabel></label>
              <input
                value={form.notes}
                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Special instructions for the fitting..."
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
                {saving ? 'Scheduling...' : 'Schedule Fitting'}
              </button>
            </div>
          </form>
        </div>
      </div>
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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<null | 'customer' | 'order' | 'payment' | 'fitting'>(null);
  const [banner, setBanner] = useState('');

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, activityData, pickupData, fittingsData, customersData, ordersData] = await Promise.all([
        frontDeskApi.getDashboardStats(),
        frontDeskApi.getRecentActivity(),
        frontDeskApi.getReadyForPickup(),
        frontDeskApi.getUpcomingFittings(),
        frontDeskApi.searchCustomers(''),
        frontDeskApi.getAllOrders(),
      ]);
      setStats(statsData);
      setRecentActivity(activityData);
      setReadyForPickup(pickupData);
      setUpcomingFittings(fittingsData);
      setCustomers(customersData);
      setOrders(ordersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
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
        referenceImage: '',
        specialInstructions: data.specialInstructions,
        targetCompletionDate: data.targetCompletionDate,
        assignedTailorId: data.assignedTailorId,
        measurementSnapshotId: '',
        orderNotes: '',
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

  const handleScheduleFitting = async (data: ScheduleFittingFormData) => {
    await frontDeskApi.createAppointment({
      customerId: data.customerId,
      orderId: data.orderId,
      appointmentDate: data.appointmentDate,
      appointmentTime: data.appointmentTime,
      appointmentType: data.appointmentType,
      notes: data.notes,
    });
    setBanner(`Fitting appointment scheduled successfully.`);
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
              {upcomingFittings.length === 0 ? (
                <p className="text-center text-[#766A62] py-4">No fittings scheduled today.</p>
              ) : (
                upcomingFittings.slice(0, 4).map((f) => (
                  <div key={f.appointment_id} className="flex items-center gap-3.5">
                    <div className="flex flex-col items-center flex-shrink-0 w-14">
                      <Clock className="w-3.5 h-3.5 text-[#B89255] mb-0.5" strokeWidth={1.8} />
                      <span className="text-[11px] text-[#8C7E74] font-medium" style={{ fontFamily: "'Space Mono', monospace" }}>{f.appointment_time}</span>
                    </div>
                    <div className="min-w-0 flex-1 border-l border-[#ECE3D8] pl-3.5">
                      <div className="text-[13.5px] text-[#2A211D] font-medium truncate">{f.customer_name}</div>
                      <div className="text-[12px] text-[#766A62] truncate">{f.appointment_type}</div>
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
        />
      )}
      {activeModal === 'payment' && (
        <RecordPaymentModal 
          onClose={() => setActiveModal(null)} 
          onRecord={handleRecordPayment}
          orders={orders}
        />
      )}
      {activeModal === 'fitting' && (
        <ScheduleFittingModal 
          onClose={() => setActiveModal(null)} 
          onSchedule={handleScheduleFitting}
          customers={customers}
          orders={orders}
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
