// pages/CustomerOrders.tsx
//
// My Orders — professional tailoring order tracking portal.
// Visual language matches CustomerFinancialCenter.tsx exactly.
//
// Data: GET /api/auth/customer/dashboard
//   total_amount (final_price), paid, balance, payment_status,
//   quantity, assigned_tailor, created_at, catalog_image_*, appointments[]

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatPHPExact as fmt } from '../utils/currency';
import {
  AlertCircle, AlertTriangle, Calendar, CalendarClock,
  CheckCircle2, ChevronRight, Clock, Loader2,
  Ruler, Shirt, Tag, User, X,
} from 'lucide-react';
import { OrderGarmentImage } from '../components/OrderGarmentImage';
import { COLORS, FONT_IMPORT, shadowCard, shadowModal, shadowSm } from '../Pages_Admin/Theme';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
function authToken(): string {
  return localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';
}

/* ─── Types ─────────────────────────────────────────────────── */
interface CustomerOrder {
  id: string;
  garment: string;
  fabric: string | null;
  stage: string;
  estimated_ready: string | null;
  balance: number;
  paid: number;
  total_amount: number;
  quantity: number;
  assigned_tailor: string | null;
  payment_status: string;
  created_at: string | null;
  order_type: string | null;
  reference_image: string | null;
  catalog_image: string | null;
  catalog_image_zoom: number | null;
  catalog_image_pos_x: number | null;
  catalog_image_pos_y: number | null;
  catalog_image_crop_mode: 'contain' | 'cover' | null;
  catalog_item_id: number | null;
}

interface Appointment {
  job_card_number: string | null;
  appointment_at: string;
  appointment_type: string;
}

interface MeasurementRow {
  label: string;
  value: string;
  updated_at?: string;
}

/* ─── Helpers ───────────────────────────────────────────────── */
function fmtDate(v: string | null | undefined, fallback = 'To be scheduled'): string {
  if (!v) return fallback;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? fallback : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
function fmtDateTime(v: string): string {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function fmtDateShort(v: string): string {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ─── Tone system ───────────────────────────────────────────── */
type Tone = 'success' | 'warning' | 'danger' | 'info' | 'brass' | 'neutral';

const TONE: Record<Tone, { bg: string; border: string; text: string }> = {
  success: { bg: COLORS.successBg,  border: COLORS.successBorder, text: COLORS.success  },
  warning: { bg: COLORS.warningBg,  border: COLORS.warningBorder, text: COLORS.warning  },
  danger:  { bg: COLORS.dangerBg,   border: COLORS.dangerBorder,  text: COLORS.danger   },
  info:    { bg: COLORS.infoBg,     border: COLORS.infoBorder,    text: COLORS.info     },
  brass:   { bg: '#F6EEE0',         border: '#E9D6B3',            text: COLORS.brassDeep },
  neutral: { bg: COLORS.surfaceAlt, border: COLORS.border,        text: COLORS.muted    },
};

function stageTone(stage: string): Tone {
  if (!stage) return 'neutral';
  if (stage === 'Completed' || stage === 'Released') return 'success';
  if (stage === 'Ready for Pickup') return 'warning';
  if (stage === 'Quality Review') return 'info';
  if (stage === 'First Fitting' || stage === 'Final Alterations') return 'brass';
  if (stage === 'Draft') return 'neutral';
  return 'info';
}
function paymentTone(balance: number, paid: number): Tone {
  if (balance <= 0) return 'success';
  if (paid <= 0) return 'danger';
  return 'warning';
}
function paymentLabel(balance: number, paid: number): string {
  if (balance <= 0) return 'Fully Paid';
  if (paid <= 0) return 'Balance Due';
  return 'Partially Paid';
}

/* ─── Pill ──────────────────────────────────────────────────── */
function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const t = TONE[tone];
  return (
    <span
      className="inline-block border px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.06em] whitespace-nowrap"
      style={{ background: t.bg, borderColor: t.border, color: t.text, borderRadius: 6 }}
    >
      {children}
    </span>
  );
}

/* ─── KPI Card ──────────────────────────────────────────────── */
function KpiCard({ label, value, tone = 'neutral' }: {
  label: string; value: string; tone?: 'neutral' | 'good' | 'warn' | 'danger' | 'info';
}) {
  const color = tone === 'good' ? COLORS.success : tone === 'warn' ? COLORS.warning : tone === 'danger' ? COLORS.danger : tone === 'info' ? COLORS.info : COLORS.ink;
  return (
    <div className="border bg-white p-4" style={{ borderColor: COLORS.border, borderRadius: 14, boxShadow: shadowSm }}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: COLORS.muted }}>{label}</div>
      <div className="mono mt-2 text-[18px] font-semibold" style={{ color }}>{value}</div>
    </div>
  );
}

/* ─── Section Heading ───────────────────────────────────────── */
function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-1">
      <h2 className="text-[15px] font-semibold" style={{ color: COLORS.ink }}>{title}</h2>
      {subtitle && <p className="mt-1 text-[11.5px]" style={{ color: COLORS.muted }}>{subtitle}</p>}
    </div>
  );
}

/* ─── Section Card ──────────────────────────────────────────── */
function SCard({ title, tone, icon, children }: {
  title: string; tone?: Tone; icon?: React.ReactNode; children: React.ReactNode;
}) {
  const t = tone ? TONE[tone] : null;
  return (
    <div className="border overflow-hidden" style={{ borderColor: t ? t.border : COLORS.border, borderRadius: 12 }}>
      <div
        className="flex items-center gap-2 border-b px-4 py-2.5"
        style={{ borderColor: t ? t.border : COLORS.border, background: t ? t.bg : COLORS.surfaceAlt }}
      >
        {icon && <span style={{ color: t ? t.text : COLORS.inkSoft }}>{icon}</span>}
        <span className="mono text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: t ? t.text : COLORS.inkSoft }}>
          {title}
        </span>
      </div>
      <div className="px-4 py-4" style={{ background: COLORS.surface }}>{children}</div>
    </div>
  );
}

/* ─── Amount Row ─────────────────────────────────────────────── */
function AmountRow({ label, amount, color, divider }: { label: string; amount: number; color?: string; divider?: boolean }) {
  return (
    <>
      {divider && <div className="my-2 border-t" style={{ borderColor: COLORS.border }} />}
      <div className="flex items-center justify-between py-0.5">
        <span className="text-[12px]" style={{ color: COLORS.muted }}>{label}</span>
        <span className="mono text-[13px] font-semibold" style={{ color: color || COLORS.ink }}>{fmt(amount)}</span>
      </div>
    </>
  );
}

/* ─── Order Card ─────────────────────────────────────────────── */
function OrderCard({ order, visit, onClick }: { order: CustomerOrder; visit?: Appointment; onClick: () => void }) {
  const sTone = stageTone(order.stage);
  const pTone = paymentTone(order.balance, order.paid);
  const pLabel = paymentLabel(order.balance, order.paid);
  const _ref = useRef<HTMLButtonElement>(null);

  return (
    <button
      ref={_ref}
      type="button"
      onClick={onClick}
      className="card-hover flex flex-col overflow-hidden border bg-white text-left w-full"
      style={{ borderColor: COLORS.border, borderRadius: 16, boxShadow: shadowCard }}
    >
      {/* Garment image with overlaid badges */}
      <div className="relative h-36 w-full overflow-hidden flex-shrink-0" style={{ background: '#F4F1E6' }}>
        <OrderGarmentImage order={order} className="h-full w-full" />
        <div className="absolute bottom-2 left-2"><Pill tone={sTone}>{order.stage || 'In Progress'}</Pill></div>
        <div className="absolute top-2 right-2"><Pill tone={pTone}>{pLabel}</Pill></div>
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-0 p-4">
        {/* Identity */}
        <div className="mb-3">
          <div className="mono text-[10.5px]" style={{ color: COLORS.faint }}>{order.id}</div>
          <div className="mt-0.5 text-[14px] font-semibold" style={{ color: COLORS.ink }}>
            {order.garment}{order.quantity > 1 ? ` x${order.quantity}` : ''}
          </div>
          {order.fabric && <div className="mt-0.5 text-[11.5px]" style={{ color: COLORS.muted }}>{order.fabric}</div>}
          {order.created_at && <div className="mt-0.5 text-[11px]" style={{ color: COLORS.faint }}>Ordered {fmtDateShort(order.created_at)}</div>}
        </div>

        {/* Upcoming fitting banner */}
        {visit && (
          <div className="mb-3 flex items-start gap-2 px-3 py-2.5 rounded-lg" style={{ background: '#F6EEE0', border: '1px solid #E9D6B3' }}>
            <CalendarClock className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" style={{ color: COLORS.brassDeep }} />
            <div>
              <p className="mono text-[9.5px] font-semibold uppercase tracking-[0.1em]" style={{ color: COLORS.brassDeep }}>Upcoming Fitting</p>
              <p className="mt-0.5 text-[11.5px] font-medium" style={{ color: COLORS.ink }}>{visit.appointment_type}</p>
              <p className="text-[11px]" style={{ color: COLORS.inkSoft }}>{fmtDateTime(visit.appointment_at)}</p>
            </div>
          </div>
        )}

        {/* Financial summary — identical 3-col grid to CustomerFinancialCenter GarmentCard */}
        <div className="grid grid-cols-3 gap-2 border rounded-lg px-3 py-3" style={{ borderColor: COLORS.border, background: COLORS.surfaceAlt }}>
          <div>
            <div className="text-[10px]" style={{ color: COLORS.muted }}>Total</div>
            <div className="mono mt-0.5 text-[12.5px] font-semibold" style={{ color: COLORS.ink }}>{fmt(order.total_amount)}</div>
          </div>
          <div>
            <div className="text-[10px]" style={{ color: COLORS.muted }}>Paid</div>
            <div className="mono mt-0.5 text-[12.5px] font-semibold" style={{ color: COLORS.success }}>{fmt(order.paid)}</div>
          </div>
          <div>
            <div className="text-[10px]" style={{ color: COLORS.muted }}>Balance</div>
            <div className="mono mt-0.5 text-[12.5px] font-semibold" style={{ color: order.balance > 0 ? COLORS.warning : COLORS.success }}>{fmt(order.balance)}</div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" style={{ color: COLORS.faint }} />
            <span className="text-[11px]" style={{ color: COLORS.muted }}>Est. {fmtDate(order.estimated_ready, 'TBD')}</span>
          </div>
          <ChevronRight className="h-4 w-4" style={{ color: COLORS.faint }} />
        </div>
      </div>
    </button>
  );
}

/* ─── Detail Modal ───────────────────────────────────────────── */
function OrderDetailModal({ order, visit, measurements, onClose }: {
  order: CustomerOrder; visit?: Appointment; measurements: MeasurementRow[]; onClose: () => void;
}) {
  const sTone = stageTone(order.stage);
  const pTone = paymentTone(order.balance, order.paid);
  const pLabel = paymentLabel(order.balance, order.paid);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0" style={{ background: 'rgba(17,24,39,0.65)', backdropFilter: 'blur(3px)' }} />
      <div
        className="relative flex flex-col max-h-[90vh] w-full max-w-lg overflow-hidden border"
        style={{ borderColor: COLORS.border, background: COLORS.surface, borderRadius: 16, boxShadow: shadowModal, animation: 'fadeScale 0.22s ease both' }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex flex-shrink-0 items-center justify-between border-b px-6 py-4" style={{ background: COLORS.surface, borderColor: COLORS.border }}>
          <div>
            <span className="mono text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: COLORS.brassDeep }}>Order Details</span>
            <h2 className="mt-0.5 text-[18px] font-semibold" style={{ color: COLORS.ink }}>{order.id}</h2>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center" style={{ borderRadius: 8, color: COLORS.muted }} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="h-48 w-full overflow-hidden" style={{ background: '#F4F1E6' }}>
            <OrderGarmentImage order={order} className="h-full w-full" />
          </div>

          <div className="space-y-4 px-6 py-5">
            {/* Section 1 — Order Information */}
            <SCard title="Order Information" icon={<Tag className="h-3.5 w-3.5" />}>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                {([
                  ['Job Card', order.id],
                  ['Order Type', order.order_type === 'catalog' ? 'Catalog Design' : order.order_type === 'bespoke' ? 'Bespoke / Custom' : 'Standard'],
                  ['Garment', order.garment],
                  ['Fabric', order.fabric || 'Not specified'],
                  ['Quantity', String(order.quantity)],
                  ...(order.created_at ? [['Order Date', fmtDateShort(order.created_at)] as [string, string]] : []),
                ] as [string, string][]).map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: COLORS.muted }}>{label}</dt>
                    <dd className="mono mt-0.5 text-[12.5px] font-medium" style={{ color: COLORS.ink }}>{value}</dd>
                  </div>
                ))}
              </dl>
            </SCard>

            {/* Section 2 — Production Information */}
            <SCard title="Production Information" tone={sTone} icon={<Shirt className="h-3.5 w-3.5" />}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: COLORS.muted }}>Current Stage</dt>
                    <dd className="mt-0.5 text-[13.5px] font-semibold" style={{ color: COLORS.ink }}>{order.stage || 'In Progress'}</dd>
                  </div>
                  <Pill tone={sTone}>{order.stage || 'In Progress'}</Pill>
                </div>
                {order.assigned_tailor && (
                  <div className="flex items-center gap-2 border rounded-lg px-3 py-2.5" style={{ borderColor: COLORS.border, background: COLORS.surfaceAlt }}>
                    <User className="h-3.5 w-3.5 flex-shrink-0" style={{ color: COLORS.muted }} />
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: COLORS.muted }}>Assigned Tailor</p>
                      <p className="mt-0.5 text-[12.5px] font-medium" style={{ color: COLORS.ink }}>{order.assigned_tailor}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 border rounded-lg px-3 py-2.5" style={{ borderColor: COLORS.border, background: COLORS.surfaceAlt }}>
                  <Calendar className="h-3.5 w-3.5 flex-shrink-0" style={{ color: COLORS.brassDeep }} />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: COLORS.muted }}>Estimated Completion</p>
                    <p className="mt-0.5 text-[12.5px] font-medium" style={{ color: COLORS.ink }}>{fmtDate(order.estimated_ready)}</p>
                  </div>
                </div>
                {visit && (
                  <div className="flex items-start gap-2.5 rounded-lg px-3 py-3" style={{ background: '#F6EEE0', border: '1px solid #E9D6B3' }}>
                    <CalendarClock className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: COLORS.brassDeep }} />
                    <div>
                      <p className="mono text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: COLORS.brassDeep }}>Upcoming Appointment</p>
                      <p className="mt-0.5 text-[13px] font-semibold" style={{ color: COLORS.ink }}>{visit.appointment_type}</p>
                      <p className="mt-0.5 text-[12px]" style={{ color: COLORS.inkSoft }}>{fmtDateTime(visit.appointment_at)}</p>
                    </div>
                  </div>
                )}
              </div>
            </SCard>

            {/* Section 3 — Payment Summary */}
            <SCard title="Payment Summary" tone={pTone}>
              <div className="space-y-0.5">
                <AmountRow label="Total Amount" amount={order.total_amount} />
                <AmountRow label="Amount Paid" amount={order.paid} color={COLORS.success} />
                <AmountRow label="Remaining Balance" amount={order.balance} color={order.balance > 0 ? COLORS.warning : COLORS.success} divider />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11.5px] font-medium" style={{ color: COLORS.muted }}>Payment Status</span>
                <Pill tone={pTone}>{pLabel}</Pill>
              </div>

              {order.total_amount > 0 && (
                <div className="mt-4 border-t pt-4" style={{ borderColor: COLORS.border }}>
                  <div className="flex items-center justify-between text-[11.5px] font-medium" style={{ color: COLORS.inkSoft }}>
                    <span>{Math.round((order.paid / order.total_amount) * 100)}% Paid</span>
                    <span className="mono">{fmt(order.balance)} Balance Due</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ background: COLORS.surfaceAlt }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, (order.paid / order.total_amount) * 100))}%`, background: order.balance <= 0 ? COLORS.success : COLORS.warning }} />
                  </div>
                </div>
              )}

              {order.balance <= 0 ? (
                <div className="mt-4 flex items-center gap-2 px-3 py-2.5 rounded-lg" style={{ background: COLORS.successBg, border: `1px solid ${COLORS.successBorder}` }}>
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: COLORS.success }} />
                  <span className="text-[12px] font-medium" style={{ color: COLORS.success }}>This order is paid in full. No further payment required.</span>
                </div>
              ) : (
                <div className="mt-4 flex items-start gap-2 px-3 py-2.5 rounded-lg" style={{ background: COLORS.warningBg, border: `1px solid ${COLORS.warningBorder}` }}>
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: COLORS.warning }} />
                  <p className="text-[12px] leading-relaxed" style={{ color: COLORS.warning }}>
                    Please settle the remaining balance of <span className="mono font-semibold">{fmt(order.balance)}</span> at the front desk before pickup.
                  </p>
                </div>
              )}
            </SCard>

            {/* Section 4 — Measurements */}
            {measurements.length > 0 && (
              <SCard title="Measurements on File" icon={<Ruler className="h-3.5 w-3.5" />}>
                <p className="mb-3 text-[11.5px]" style={{ color: COLORS.muted }}>Body measurements used to cut your garments.</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {measurements.map((m) => (
                    <div key={m.label} className="border px-3 py-2.5" style={{ borderColor: COLORS.border, background: COLORS.surfaceAlt, borderRadius: 8 }}>
                      <p className="mono text-[9.5px] font-semibold uppercase tracking-[0.1em]" style={{ color: COLORS.muted }}>{m.label}</p>
                      <p className="mono mt-0.5 text-[13px] font-semibold" style={{ color: COLORS.ink }}>{m.value}</p>
                    </div>
                  ))}
                </div>
              </SCard>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Balance Alert ──────────────────────────────────────────── */
function BalanceAlert({ count, total }: { count: number; total: number }) {
  return (
    <div className="flex items-start gap-3 border px-5 py-4" style={{ borderColor: COLORS.warningBorder, background: COLORS.warningBg, borderRadius: 12 }}>
      <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: COLORS.warning }} />
      <div>
        <p className="text-[13px] font-semibold" style={{ color: COLORS.warning }}>Outstanding Balance</p>
        <p className="mt-0.5 text-[12px]" style={{ color: COLORS.warning }}>
          You have <span className="font-semibold">{count} order{count !== 1 ? 's' : ''}</span> with a remaining balance of{' '}
          <span className="mono font-semibold">{fmt(total)}</span>. Please settle at the front desk before pickup.
        </p>
      </div>
    </div>
  );
}

/* ─── Empty State ────────────────────────────────────────────── */
function EmptyState() {
  return (
    <div className="border py-20 text-center" style={{ borderColor: COLORS.border, background: COLORS.surface, borderRadius: 14, boxShadow: shadowCard }}>
      <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center" style={{ background: COLORS.navySoft, borderRadius: 20 }}>
        <Shirt className="h-9 w-9" style={{ color: COLORS.navy }} />
      </div>
      <h2 className="text-[17px] font-semibold" style={{ color: COLORS.ink }}>No Orders Yet</h2>
      <p className="mt-2 text-[13px]" style={{ color: COLORS.muted }}>You do not have any garment orders yet.</p>
      <p className="mt-1 text-[13px]" style={{ color: COLORS.muted }}>Visit the Front Desk to create your first tailoring order.</p>
    </div>
  );
}

/* ─── Page Root ──────────────────────────────────────────────── */
export function CustomerOrdersView() {
  const [orders, setOrders]     = useState<CustomerOrder[]>([]);
  const [visits, setVisits]     = useState<Appointment[]>([]);
  const [measurements, setMeas] = useState<MeasurementRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [selected, setSelected] = useState<CustomerOrder | null>(null);

  const loadData = useCallback(async (silent = false) => {
    try {
      const res = await fetch(`${API_URL}/auth/customer/dashboard`, {
        headers: { Authorization: `Bearer ${authToken()}` },
      });
      if (res.status === 401) throw new Error('Your session has expired. Please sign in again.');
      if (!res.ok) throw new Error('Unable to load your orders right now.');
      const data = await res.json();

      if (Array.isArray(data.orders)) {
        setOrders(data.orders.map((row: Record<string, unknown>): CustomerOrder => {
          const paid    = Number(row.paid ?? 0);
          const rawBalance = Number(row.balance ?? 0);
          const finalPrice = Number(row.total_amount ?? 0);
          const total   = finalPrice > 0 ? finalPrice : paid + rawBalance;
          const balance = finalPrice > 0 ? Math.max(0, total - paid) : rawBalance;
          return {
            id:                      String(row.id ?? ''),
            garment:                 String(row.garment ?? 'Custom garment'),
            fabric:                  row.fabric ? String(row.fabric) : null,
            stage:                   String(row.stage ?? ''),
            estimated_ready:         row.due ? String(row.due) : null,
            balance,
            paid,
            total_amount:            total,
            quantity:                Number(row.quantity ?? 1),
            assigned_tailor:         row.assigned_tailor ? String(row.assigned_tailor) : null,
            payment_status:          paymentLabel(balance, paid),
            created_at:              row.created_at ? String(row.created_at) : null,
            order_type:              row.order_type              as string | null,
            reference_image:         row.reference_image         as string | null,
            catalog_image:           row.catalog_image           as string | null,
            catalog_image_zoom:      row.catalog_image_zoom      as number | null,
            catalog_image_pos_x:     row.catalog_image_pos_x     as number | null,
            catalog_image_pos_y:     row.catalog_image_pos_y     as number | null,
            catalog_image_crop_mode: row.catalog_image_crop_mode as 'contain' | 'cover' | null,
            catalog_item_id:         row.catalog_item_id         as number | null,
          };
        }));
      }

      setVisits(Array.isArray(data.appointments) ? data.appointments : []);

      const mRes = await fetch(`${API_URL}/measurements/mine`, { headers: { Authorization: `Bearer ${authToken()}` } });
      if (mRes.ok) {
        const mData = await mRes.json();
        if (Array.isArray(mData.measurements)) setMeas(mData.measurements);
      }

      if (!silent) setError('');
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : 'Unable to load your orders.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    const id = setInterval(() => loadData(true), 12_000);
    return () => clearInterval(id);
  }, [loadData]);

  const nextVisit = useMemo(() => {
    const map = new Map<string, Appointment>();
    visits.forEach((v) => { if (v.job_card_number && !map.has(v.job_card_number)) map.set(v.job_card_number, v); });
    return map;
  }, [visits]);

  const totalOrders       = orders.length;
  const totalSpend        = orders.reduce((s, o) => s + o.total_amount, 0);
  const totalPaid         = orders.reduce((s, o) => s + o.paid, 0);
  const totalBalance      = orders.reduce((s, o) => s + o.balance, 0);
  const outstandingOrders = orders.filter((o) => o.balance > 0);
  const readyOrders       = orders.filter((o) => o.stage === 'Ready for Pickup');
  const selectedVisit     = selected ? nextVisit.get(selected.id) : undefined;

  return (
    <>
      <style>{FONT_IMPORT}</style>
      <div className="min-h-screen" style={{ background: COLORS.canvas, fontFamily: "'Inter', sans-serif" }}>
        {/* Header */}
        <header className="border-b px-6 py-8 sm:px-8" style={{ background: COLORS.navy, borderColor: 'transparent' }}>
          <div className="mx-auto max-w-5xl">
            <span className="mono text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: COLORS.brass }}>
              Order Studio
            </span>
            <h1 className="mt-1.5 text-[28px] font-semibold tracking-[-0.02em] text-white sm:text-[32px]">
              My Orders
            </h1>
            <p className="mt-1.5 text-[13px]" style={{ color: '#94A3B8' }}>
              Follow each garment from the first measurement to final pickup.
            </p>
          </div>
        </header>

        <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
          {loading && (
            <div className="flex items-center justify-center gap-3 border py-16 text-[13px]" style={{ borderColor: COLORS.border, background: COLORS.surface, borderRadius: 14, color: COLORS.muted, boxShadow: shadowCard }}>
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: COLORS.brass }} />
              Loading your orders...
            </div>
          )}

          {!loading && error && (
            <div className="flex items-center gap-3 border px-4 py-3 text-[13px]" style={{ borderColor: COLORS.dangerBorder, background: COLORS.dangerBg, color: COLORS.danger, borderRadius: 10 }}>
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {!loading && !error && orders.length === 0 && <EmptyState />}

          {!loading && !error && orders.length > 0 && (
            <>
              {/* KPI bar */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KpiCard label="Total Orders"       value={String(totalOrders)} />
                <KpiCard label="Total Spend"        value={fmt(totalSpend)} />
                <KpiCard label="Amount Paid"        value={fmt(totalPaid)} tone="good" />
                <KpiCard label="Outstanding"        value={fmt(totalBalance)} tone={totalBalance > 0 ? 'warn' : 'good'} />
              </div>

              {outstandingOrders.length > 0 && <BalanceAlert count={outstandingOrders.length} total={totalBalance} />}

              {readyOrders.length > 0 && (
                <div className="flex items-center gap-3 border px-5 py-4" style={{ borderColor: COLORS.successBorder, background: COLORS.successBg, borderRadius: 12 }}>
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0" style={{ color: COLORS.success }} />
                  <p className="text-[13px] font-medium" style={{ color: COLORS.success }}>
                    <span className="font-semibold">{readyOrders.length} garment{readyOrders.length !== 1 ? 's' : ''}</span>{' '}
                    {readyOrders.length === 1 ? 'is' : 'are'} ready for pickup. Please visit the front desk.
                  </p>
                </div>
              )}

              {measurements.length > 0 && (
                <div className="border px-5 py-4" style={{ borderColor: COLORS.infoBorder, background: COLORS.infoBg, borderRadius: 12, boxShadow: shadowSm }}>
                  <div className="mb-3 flex items-center gap-2">
                    <Ruler className="h-4 w-4" style={{ color: COLORS.info }} />
                    <span className="mono text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: COLORS.info }}>
                      Measurements on file
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {measurements.map((m) => (
                      <span key={m.label} className="border px-2.5 py-1 text-[11.5px] font-medium" style={{ borderColor: COLORS.infoBorder, background: COLORS.surface, color: COLORS.ink, borderRadius: 6 }}>
                        {m.label}: <span className="mono font-semibold">{m.value}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <SectionHeading
                title="Your Garment Orders"
                subtitle={`${totalOrders} order${totalOrders !== 1 ? 's' : ''} \u00b7 click any card to see full details`}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                {orders.map((order, i) => (
                  <div key={order.id} className="rise-in" style={{ animationDelay: `${i * 0.06}s` }}>
                    <OrderCard order={order} visit={nextVisit.get(order.id)} onClick={() => setSelected(order)} />
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      </div>

      {selected && (
        <OrderDetailModal order={selected} visit={selectedVisit} measurements={measurements} onClose={() => setSelected(null)} />
      )}
    </>
  );
}

export default CustomerOrdersView;
