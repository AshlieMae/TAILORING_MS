// Pages_Frontdesk/Appointmentsdesk.tsx
import { useMemo, useState, useEffect, useCallback } from 'react';
import { BarChart3, CalendarClock, Check, ChevronRight, Package, Plus, Search, Sparkles, TrendingUp, User, X, Loader2 } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceDot,
  ReferenceLine,
} from 'recharts';
import frontDeskApi, { type Appointment, type Customer, type Order } from '../../services/frontDeskApi';
import { dedupeAppointments, stageBadgeStyle } from '../utils/appointmentDisplay';
import { FITTING_JOURNEY, determineStageForJob, findActiveAppointmentForJob, nextFittingStage } from '../utils/appointmentWorkflow';

// Walk-in, production-driven status model. A visit starts as Suggested (the
// workshop reached a milestone), then the Front Desk decides: Approved,
// Rescheduled, Completed or Cancelled. Legacy values are display-only.
type AppointmentStatus = 'Suggested' | 'Approved' | 'Rescheduled' | 'Completed' | 'Cancelled' | 'Scheduled' | 'Confirmed';

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] uppercase tracking-[0.2em] text-[#8C7E74]" style={{ fontFamily: "'Space Mono', monospace" }}>{children}</span>;
}

function StatusBadge({ status }: { status: AppointmentStatus }) {
  const classes = status === 'Completed' ? 'border-[#B9DDD0] bg-[#E7F4EE] text-[#277257]' : 
    (status === 'Approved' || status === 'Confirmed') ? 'border-[#C7DDD3] bg-[#EDF5F0] text-[#4E7357]' : 
    status === 'Suggested' ? 'border-[#ECD8A7] bg-[#FFF7E3] text-[#8A6618]' :
    status === 'Rescheduled' ? 'border-[#E6C8C2] bg-[#FDF0ED] text-[#9E5B4B]' :
    'border-[#D9C8B7] bg-[#F8F3EB] text-[#766A62]';
  const dot = status === 'Completed' ? 'bg-[#277257]' : 
    (status === 'Approved' || status === 'Confirmed') ? 'bg-[#4E7357]' : 
    status === 'Suggested' ? 'bg-[#8A6618]' :
    status === 'Rescheduled' ? 'bg-[#9E5B4B]' : 'bg-[#766A62]';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.08em] shadow-sm ${classes}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {status}
    </span>
  );
}

/** Colored chip showing which fitting stage (visit type) this appointment belongs to. */
function StageBadge({ type }: { type: string }) {
  const style = stageBadgeStyle(type);
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-1 text-[10px] font-medium uppercase tracking-[0.08em] shadow-sm ${style.border} ${style.bg} ${style.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {type}
    </span>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#E2D7C7] bg-[#FFFCF8] px-3 py-2 shadow-lg">
      <div className="text-[10px] uppercase tracking-[0.14em] text-[#8C7E74]" style={{ fontFamily: "'Space Mono', monospace" }}>{label}</div>
      <div className="text-[13px] font-semibold text-[#2A211D] mt-0.5">{payload[0].value} appointment{payload[0].value === 1 ? '' : 's'}</div>
    </div>
  );
}

// ---------------- Live fitting tracker ----------------

const STEP_COLORS: Record<string, string> = {
  Consultation: '#C9A15C',
  'First Fitting': '#A46B48',
  'Final Fitting': '#8C6F3E',
  Pickup: '#4E7357',
};
const PRODUCTION_STAGES = ['Draft', 'Measuring', 'Pattern Cutting', 'Initial Assembly', 'First Fitting', 'Final Alterations', 'Quality Review', 'Completed', 'Ready for Pickup'];

/** Smooth 0→100 readiness curve between the order start and its due date. */
function readinessPct(t: number, start: number, end: number): number {
  if (!Number.isFinite(t) || t <= start) return 0;
  if (t >= end) return 100;
  const p = (t - start) / (end - start);
  return Math.round((0.5 - 0.5 * Math.cos(Math.PI * p)) * 100);
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

function parseAppointmentMs(date: string, time: string): number {
  const d = new Date(`${date}T${(time || '00:00').slice(0, 5)}`);
  return d.getTime();
}

function TrackerTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point?.t) return null;
  return (
    <div className="rounded-lg border border-[#E2D7C7] bg-[#FFFCF8] px-3 py-2 shadow-lg">
      <div className="text-[10px] uppercase tracking-[0.14em] text-[#8C7E74]" style={{ fontFamily: "'Space Mono', monospace" }}>
        {new Date(point.t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
      </div>
      <div className="mt-0.5 text-[13px] font-semibold text-[#2A211D]">{point.progress}% ready</div>
    </div>
  );
}

function FittingTracker({ appointment, order, relatedAppointments = [] }: { appointment: Appointment; order?: Order; relatedAppointments?: Appointment[] }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const apptMs = useMemo(() => {
    const ms = parseAppointmentMs(appointment.appointment_date, appointment.appointment_time);
    return Number.isFinite(ms) ? ms : null;
  }, [appointment.appointment_date, appointment.appointment_time]);

  const isDone = appointment.status === 'Completed';
  const isCancelled = appointment.status === 'Cancelled';
  const diffMs = apptMs != null ? apptMs - now : 0;
  const isLive = !isDone && !isCancelled && apptMs != null && Math.abs(diffMs) <= 60 * 60 * 1000;

  // Furthest milestone reached across every visit booked for this job card
  const currentIndex = useMemo(() => {
    let idx = Math.max(0, FITTING_JOURNEY.indexOf(appointment.appointment_type as (typeof FITTING_JOURNEY)[number]));
    relatedAppointments.forEach((a) => {
      if (a.status === 'Completed') {
        const i = FITTING_JOURNEY.indexOf(a.appointment_type as (typeof FITTING_JOURNEY)[number]);
        if (i > idx) idx = i;
      }
    });
    return idx;
  }, [appointment.appointment_type, relatedAppointments]);

  // Timeline bounds: order creation → target completion (falls back around the visit)
  const { startMs, endMs } = useMemo(() => {
    const anchor = apptMs ?? Date.now();
    let s = order?.created_at ? new Date(order.created_at).getTime() : NaN;
    let e = order?.target_completion_date ? new Date(order.target_completion_date).getTime() : NaN;
    if (!Number.isFinite(s)) s = anchor - 21 * 86400000;
    if (!Number.isFinite(e)) e = anchor + 7 * 86400000;
    if (e <= s) e = s + 86400000;
    return { startMs: s, endMs: e };
  }, [order, apptMs]);

  const overallPct = readinessPct(now, startMs, endMs);

  const chartData = useMemo(() => {
    const points: { t: number; progress: number; past: number | null; future: number | null }[] = [];
    const steps = 56;
    for (let i = 0; i <= steps; i++) {
      const t = startMs + ((endMs - startMs) * i) / steps;
      const p = readinessPct(t, startMs, endMs);
      points.push({ t, progress: p, past: t <= now ? p : null, future: t >= now ? p : null });
    }
    const pNow = readinessPct(now, startMs, endMs);
    points.push({ t: now, progress: pNow, past: pNow, future: pNow });
    return points.sort((a, b) => a.t - b.t);
  }, [startMs, endMs, now]);

  const milestones = useMemo(
    () =>
      relatedAppointments
        .filter((a) => a.status !== 'Cancelled')
        .map((a) => {
          const t = parseAppointmentMs(a.appointment_date, a.appointment_time);
          return { id: a.appointment_id, type: a.appointment_type, t, y: readinessPct(t, startMs, endMs), valid: Number.isFinite(t) };
        })
        .filter((m) => m.valid && m.t >= startMs && m.t <= endMs),
    [relatedAppointments, startMs, endMs]
  );

  const productionIdx = order ? PRODUCTION_STAGES.indexOf(order.production_status) : -1;
  const productionPct = productionIdx >= 0 ? Math.round(((productionIdx + 1) / PRODUCTION_STAGES.length) * 100) : 0;

  const liveLabel = isDone
    ? 'Completed'
    : isCancelled
      ? 'Cancelled'
      : isLive
        ? 'Live now'
        : diffMs > 0
          ? `Starts in ${formatDuration(diffMs)}`
          : `Overdue by ${formatDuration(-diffMs)}`;

  return (
    <div className="mt-6 rounded-xl border border-[#E2D7C7] bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Label>Live fitting tracker</Label>
          <p className="mt-0.5 text-[12.5px] text-[#8C7E74]">Real-time progress from first measurement to pickup</p>
        </div>
        <span className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.08em] shadow-sm ${isLive ? 'border-[#B9DDD0] bg-[#E7F4EE] text-[#277257]' : 'border-[#ECD8A7] bg-[#FFF7E3] text-[#8A6618]'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${isLive ? 'animate-pulse bg-[#277257]' : 'bg-[#8A6618]'}`} />
          {liveLabel}
        </span>
      </div>

      {/* Milestone stepper */}
      <div className="relative mt-5 flex items-start justify-between">
        <div className="absolute left-3 right-3 top-[11px] h-[2px] bg-[#EFE7DB]" />
        <div
          className="absolute left-3 top-[11px] h-[2px] bg-[#8C6F3E] transition-all duration-700"
          style={{ width: `calc((100% - 24px) * ${currentIndex / (FITTING_JOURNEY.length - 1)})` }}
        />
        {FITTING_JOURNEY.map((step, i) => {
          const done = i < currentIndex || (i === currentIndex && isDone);
          const current = i === currentIndex && !isDone;
          const known = milestones.find((m) => m.type === step);
          return (
            <div key={step} className="relative z-10 flex w-[72px] flex-col items-center">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full border-2 shadow-sm ${done ? 'border-[#8C6F3E] bg-[#8C6F3E] text-white' : current ? 'border-[#8C6F3E] bg-white' : 'border-[#E2D7C7] bg-white'}`}>
                {done ? <Check className="h-3.5 w-3.5" /> : current ? <span className="h-2 w-2 animate-pulse rounded-full bg-[#8C6F3E]" /> : <span className="h-1.5 w-1.5 rounded-full bg-[#D9CFC2]" />}
              </span>
              <span className={`mt-1.5 text-center text-[10px] leading-tight ${current ? 'font-semibold text-[#2A211D]' : done ? 'text-[#5E5048]' : 'text-[#A3958B]'}`}>{step}</span>
              {known && (
                <span className="text-[9px] text-[#A3958B]" style={{ fontFamily: "'Space Mono', monospace" }}>
                  {new Date(known.t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Real-time readiness graph */}
      <div className="-ml-2 mt-5 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 12, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="fittingPastFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8C6F3E" stopOpacity={0.32} />
                <stop offset="100%" stopColor="#8C6F3E" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#ECE3D8" strokeDasharray="3 4" />
            <XAxis
              dataKey="t"
              type="number"
              domain={[startMs, endMs]}
              tickFormatter={(ms: number) => new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              tickLine={false}
              axisLine={false}
              minTickGap={42}
              tick={{ fill: '#A3958B', fontSize: 10, fontFamily: 'Space Mono, monospace' }}
            />
            <YAxis hide domain={[0, 100]} />
            <Tooltip content={<TrackerTooltip />} cursor={{ stroke: '#D9CFC2', strokeDasharray: '3 3' }} />
            <Area type="monotone" dataKey="future" stroke="#C9BBA6" strokeWidth={2} strokeDasharray="5 4" fill="none" dot={false} connectNulls={false} />
            <Area type="monotone" dataKey="past" stroke="#8C6F3E" strokeWidth={2.25} fill="url(#fittingPastFill)" dot={false} connectNulls={false} />
            {milestones.map((m) => (
              <ReferenceDot key={m.id} x={m.t} y={m.y} r={4.5} fill="#FFFCF8" stroke={STEP_COLORS[m.type] || '#8C6F3E'} strokeWidth={2} ifOverflow="extendDomain" />
            ))}
            {!isDone && !isCancelled && (
              <ReferenceLine
                x={now}
                stroke="#A46B48"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                label={{ value: isLive ? 'LIVE' : 'NOW', position: 'top', fill: '#A46B48', fontSize: 9.5, fontFamily: 'Space Mono, monospace' }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[10px] text-[#8C7E74]">
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-[2px] w-4 bg-[#8C6F3E]" /> Elapsed</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-0 w-4 border-t border-dashed border-[#C9BBA6]" /> Remaining</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full border-2 border-[#A46B48]" /> Fitting visit</span>
        <span className="ml-auto font-semibold text-[#5E5048]" style={{ fontFamily: "'Space Mono', monospace" }}>{overallPct}% of timeline</span>
      </div>

      {/* Workshop pipeline for the linked garment */}
      {order && productionIdx >= 0 && (
        <div className="mt-4 border-t border-[#F0EAE2] pt-4">
          <div className="flex items-center justify-between">
            <Label>Workshop pipeline</Label>
            <span className="text-[10px] text-[#8C7E74]" style={{ fontFamily: "'Space Mono', monospace" }}>{productionPct}% of stages</span>
          </div>
          <div className="mt-2 flex gap-1">
            {PRODUCTION_STAGES.map((stage, i) => (
              <div key={stage} title={stage} className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${i <= productionIdx ? 'bg-[#8C6F3E]' : 'bg-[#EFE7DB]'}`} />
            ))}
          </div>
          <div className="mt-1.5 text-[11px] text-[#766A62]">
            Garment is currently at <span className="font-medium text-[#2A211D]">{order.production_status}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function AppointmentDetails({ appointment, order, relatedAppointments, onClose, onComplete }: { appointment: Appointment; order?: Order; relatedAppointments?: Appointment[]; onClose: () => void; onComplete: () => void }) {
  const nextStage = nextFittingStage(appointment.appointment_type);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button onClick={onClose} className="absolute inset-0 bg-[#1F1916]/45 backdrop-blur-sm" />
      <section className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-xl border border-[#E2D7C7] bg-[#FFFCF8] p-7 shadow-2xl">
        <button onClick={onClose} className="absolute right-5 top-5 text-[#766A62]"><X className="h-5 w-5" /></button>
        <Label>Appointment details</Label>
        <h2 className="mt-1 text-3xl text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>{appointment.customer_name}</h2>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {[
            ['Date', new Date(appointment.appointment_date).toLocaleDateString()],
            ['Time', appointment.appointment_time],
            ['Type', appointment.appointment_type],
            ['Job Card', appointment.job_card_id],
            ['Notes', appointment.notes || '—'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-[#E2D7C7] bg-white p-3">
              <Label>{label}</Label>
              <div className="mt-1 text-sm text-[#2A211D]">{value}</div>
            </div>
          ))}
        </div>

        <FittingTracker appointment={appointment} order={order} relatedAppointments={relatedAppointments} />

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-[#E8DFD3] pt-5">
          <div className="flex flex-wrap items-center gap-2">
            <StageBadge type={appointment.appointment_type} />
            <StatusBadge status={appointment.status as AppointmentStatus} />
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {nextStage && (
              <span className="max-w-xs text-right text-[11px] leading-relaxed text-[#8C7E74]">
                The {nextStage} visit is suggested automatically once the workshop records that production milestone.
              </span>
            )}
            {appointment.appointment_type === 'Final Fitting' &&
              appointment.status !== 'Completed' &&
              appointment.status !== 'Cancelled' && (
              <button onClick={onComplete} className="inline-flex items-center gap-2 rounded-lg border border-[#E2D7C7] bg-white px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5E5048] shadow-sm hover:-translate-y-0.5 transition-transform">
                <Check className="h-4 w-4" /> Mark completed
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function AppointmentEditor({
  onClose,
  onSchedule,
  customers,
  orders,
  appointments,
  initial
}: {
  onClose: () => void;
  onSchedule: (data: { customerId: string; orderId: string; appointmentDate: string; appointmentTime: string; appointmentType: string; notes: string }) => Promise<void>;
  customers: Customer[];
  orders: Order[];
  appointments: Appointment[];
  initial?: { customerId?: string; orderId?: string; appointmentType?: string; customerName?: string; jobCardId?: string };
}) {
  // Reached via "Schedule <next stage>": customer + job order are attached
  // automatically — nothing ever has to be picked again.
  const [form, setForm] = useState({
    customerId: initial?.customerId || '',
    orderId: initial?.orderId || '',
    appointmentDate: '',
    appointmentTime: '',
    notes: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Self-healing: if the preset carries a customer whose order id could not be
  // resolved up front (legacy appointment rows without order_id), attach that
  // customer's most recent active order automatically — still zero manual
  // selection needed.
  useEffect(() => {
    if (!initial?.customerId || form.orderId) return;
    const pool = orders.filter(
      (o) => String(o.customer_id) === String(initial.customerId) && ['First Fitting', 'Final Alterations', 'Quality Review', 'Completed', 'Ready for Pickup'].includes(o.production_status)
    );
    if (pool.length) setForm((f) => ({ ...f, orderId: pool[0].order_id }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.customerId, form.orderId, orders]);

  const locked = Boolean(initial?.customerId && form.orderId);

  // Job orders that already have a live visit booked are hidden from the
  // selection — each job card keeps ONE live appointment, so its next stage is
  // scheduled from that appointment's own "Schedule <stage>" button instead.
  const filteredOrders = orders.filter(
    (o) =>
      o.customer_id === form.customerId &&
      ['First Fitting', 'Final Alterations', 'Quality Review', 'Completed', 'Ready for Pickup'].includes(o.production_status) &&
      !findActiveAppointmentForJob(appointments, o.job_card_id)
  );
  const selectedOrder = orders.find(o => o.order_id === form.orderId);
  const selectedCustomer = customers.find(c => c.customer_id === form.customerId);

  // The fitting stage is decided automatically — never by the user.
  const activeVisit = useMemo(() => findActiveAppointmentForJob(appointments, form.orderId), [appointments, form.orderId]);
  const plannedType = useMemo(() => {
    if (initial?.appointmentType) return initial.appointmentType;
    // Walk-in measuring happens during intake, so the first schedulable visit
    // is the First Fitting, never an online consultation.
    if (!form.orderId) return 'First Fitting';
    // Moving an active booking changes only its date/time. Advancing to the
    // next visit is allowed only after Front Desk marks the current visit
    // Completed, preserving the real fitting history.
    if (activeVisit) return activeVisit.appointment_type;
    return determineStageForJob(appointments, form.orderId);
  }, [appointments, form.orderId, initial?.appointmentType, activeVisit]);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule appointment.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button onClick={onClose} className="absolute inset-0 bg-[#1F1916]/45 backdrop-blur-sm" />
      <form onSubmit={handleSubmit} className="relative w-full max-w-xl rounded-xl border border-[#E2D7C7] bg-[#FFFCF8] p-7 shadow-2xl">
        <button type="button" onClick={onClose} className="absolute right-5 top-5 text-[#766A62]"><X className="h-5 w-5" /></button>
        <Label>Exception visit</Label>
        <h2 className="mt-1 text-3xl text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>Manual exception appointment</h2>
        
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
          {locked ? (
            <>
              {/* Reached via "Schedule <next stage>": the customer and job order
                  are attached directly — shown read-only, nothing to pick. */}
              <div className="rounded-lg border border-[#E2D7C7] bg-white p-3.5">
                <Label>Customer</Label>
                <div className="mt-1.5 flex items-center gap-2 text-sm font-medium text-[#2A211D]">
                  <User className="h-4 w-4 flex-shrink-0 text-[#8C6F3E]" />
                  <span className="truncate">{initial?.customerName || selectedCustomer?.full_name || 'Customer'}</span>
                </div>
                <p className="mt-1 text-[9.5px] uppercase tracking-[0.12em] text-[#A3958B]">Added automatically</p>
              </div>
              <div className="rounded-lg border border-[#E2D7C7] bg-white p-3.5">
                <Label>Order (Job Card)</Label>
                <div className="mt-1.5 flex items-center gap-2 text-sm font-medium text-[#2A211D]">
                  <Package className="h-4 w-4 flex-shrink-0 text-[#8C6F3E]" />
                  <span className="truncate">{selectedOrder?.job_card_id || initial?.jobCardId || '—'}</span>
                </div>
                <p className="mt-1 truncate text-[9.5px] uppercase tracking-[0.12em] text-[#A3958B]">
                  {selectedOrder ? `${selectedOrder.garment_type} · added automatically` : 'Added automatically'}
                </p>
              </div>
            </>
          ) : (
            <>
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
            </>
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
              <Label>Appointment types</Label>
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
                  {/* Node shows HOW MANY visits are booked at this stage */}
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
            <CalendarClock className="h-4 w-4" /> {saving ? 'Scheduling...' : 'Schedule'}
          </button>
          <button type="button" onClick={onClose} className="rounded-lg border border-[#E2D7C7] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5E5048]">Cancel</button>
        </div>
      </form>
    </div>
  );
}

// (stage ladder constants removed: the appointment pipeline is production-driven)
const STAGE_CHART_COLORS = ['#C9BBA6', '#8FAF9E', '#C9A15C', '#A8644A', '#B89255', '#6E8F72', '#4E7357'];

/* ============================================================
   PENDING APPOINTMENT APPROVALS — the Front Desk's primary surface.
   Production milestones create Suggested visits; only the Front Desk
   approves, reschedules, cancels or completes them.
============================================================= */
function PendingApprovals({
  items,
  busyId,
  onApprove,
  onReschedule,
  onCancel,
  onComplete,
  onViewDetails,
}: {
  items: Appointment[];
  busyId: string | null;
  onApprove: (appointment: Appointment) => void;
  onReschedule: (appointment: Appointment, data: { appointmentDate: string; appointmentTime: string; notes: string }) => void;
  onCancel: (appointment: Appointment) => void;
  onComplete: (appointment: Appointment) => void;
  onViewDetails: (appointment: Appointment) => void;
}) {
  const [target, setTarget] = useState<Appointment | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');

  const openReschedule = (appointment: Appointment) => {
    setTarget(appointment);
    setDate(appointment.appointment_date || '');
    setTime((appointment.appointment_time || '').slice(0, 5));
    setNotes(appointment.notes || '');
  };

  return (
    <section className="dash-in dash-card overflow-hidden rounded-xl">
      <div className="flex flex-col gap-3 border-b border-[#E8DFD3] p-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Label>Production suggestions</Label>
          <h2 className="mt-1 text-2xl text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>Pending appointment approvals</h2>
          <p className="mt-2 max-w-2xl text-[12.5px] leading-relaxed text-[#766A62]">
            Each visit below was suggested automatically when a job card reached a production milestone. The customer,
            job card, visit type and assigned tailor always come from that job card. Nothing is sent to the customer or
            tailor until you approve or reschedule the visit.
          </p>
        </div>
        <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full border border-[#ECD8A7] bg-[#FFF7E3] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8A6618]">
          <Sparkles className="h-3 w-3" /> {items.length} awaiting decision
        </span>
      </div>

      {!items.length && (
        <p className="p-8 text-center text-sm text-[#766A62]">
          No suggested visits are waiting. A First Fitting, Final Fitting or Pickup visit appears here automatically as
          soon as the workshop records the matching production milestone.
        </p>
      )}

      {items.map((appointment) => {
        const busy = busyId === appointment.appointment_id;
        return (
          <article key={appointment.appointment_id} className="border-b border-[#F0EAE2] p-6 last:border-b-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-[#8C7E74]" style={{ fontFamily: "'Space Mono', monospace" }}>{appointment.appointment_number || `APT-${appointment.appointment_id}`}</span>
                  <StageBadge type={appointment.appointment_type} />
                  <StatusBadge status={appointment.status as AppointmentStatus} />
                </div>
                <p className="mt-2 text-[15px] font-medium text-[#2A211D]">{appointment.customer_name || 'Customer on file'}</p>
                <p className="text-[12.5px] text-[#8C7E74]">
                  {appointment.suggested_reason || (appointment.appointment_type === 'Pickup' ? 'Garment passed production and is ready for pickup' : 'Garment is ready for the next fitting')}
                  {appointment.generated_from_stage ? ` · from ${appointment.generated_from_stage}` : ''}
                </p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-3">
                <div className="rounded-lg border border-[#E2D7C7] bg-white px-3 py-2 text-center">
                  <Label>Suggested</Label>
                  <div className="mt-0.5 text-sm font-medium text-[#2A211D]">{new Date(appointment.appointment_date).toLocaleDateString()}</div>
                  <div className="text-[11px] text-[#8C7E74]">{(appointment.appointment_time || '').slice(0, 5)}</div>
                </div>
              </div>
            </div>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Customer', appointment.customer_name || '—'],
                ['Job card', appointment.job_card_id || '—'],
                ['Garment', appointment.garment || '—'],
                ['Assigned tailor', appointment.assigned_tailor_name || 'Unassigned'],
                ['Suggested date', new Date(appointment.appointment_date).toLocaleDateString()],
                ['Suggested time', (appointment.appointment_time || '').slice(0, 5)],
                ['Reason', appointment.suggested_reason || '—'],
                ['Notes', appointment.notes || '—'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-[#E2D7C7] bg-[#FCFAF7] p-3">
                  <Label>{label}</Label>
                  <div className="mt-1 text-[13px] text-[#2A211D]">{value}</div>
                </div>
              ))}
            </dl>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                disabled={busy}
                onClick={() => onApprove(appointment)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#2A211D] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white shadow-sm transition-transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />{busy ? 'Saving…' : 'Approve'}
              </button>
              <button
                disabled={busy}
                onClick={() => openReschedule(appointment)}
                className="inline-flex items-center gap-2 rounded-lg border border-[#E2D7C7] bg-white px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5E5048] disabled:opacity-50"
              >
                <CalendarClock className="h-4 w-4" />Reschedule
              </button>
              <button
                disabled={busy}
                onClick={() => onViewDetails(appointment)}
                className="inline-flex items-center gap-2 rounded-lg border border-[#E2D7C7] bg-white px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5E5048] disabled:opacity-50"
              >
                <Search className="h-4 w-4" />View details
              </button>
              <button
                disabled={busy}
                onClick={() => onComplete(appointment)}
                className="inline-flex items-center gap-2 rounded-lg border border-[#C7DDD3] bg-[#EDF5F0] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#4E7357] disabled:opacity-50"
              >
                <Package className="h-4 w-4" />Mark completed
              </button>
              <button
                disabled={busy}
                onClick={() => onCancel(appointment)}
                className="inline-flex items-center gap-2 rounded-lg border border-[#E6C8C2] bg-[#FDF0ED] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9E5B4B] disabled:opacity-50"
              >
                <X className="h-4 w-4" />Cancel
              </button>
            </div>
          </article>
        );
      })}
      {target && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button onClick={() => setTarget(null)} className="absolute inset-0 bg-[#1F1916]/45 backdrop-blur-sm" />
          <form
            onSubmit={(e) => { e.preventDefault(); onReschedule(target, { appointmentDate: date, appointmentTime: time, notes }); setTarget(null); }}
            className="relative w-full max-w-lg rounded-xl border border-[#E2D7C7] bg-[#FFFCF8] p-7 shadow-2xl"
          >
            <button type="button" onClick={() => setTarget(null)} className="absolute right-5 top-5 text-[#766A62]"><X className="h-5 w-5" /></button>
            <Label>Front Desk decision</Label>
            <h2 className="mt-1 text-2xl text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>Reschedule visit</h2>
            <p className="mt-2 text-[12px] leading-relaxed text-[#8C7E74]">
              Only the date, time and notes can change. Customer, job card, visit type and assigned tailor belong to the
              job card and stay locked.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ['Customer', target.customer_name || '—'],
                ['Job card', target.job_card_id || '—'],
                ['Appointment type', target.appointment_type],
                ['Assigned tailor', target.assigned_tailor_name || 'Unassigned'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-[#E2D7C7] bg-[#F8F3EB] p-3">
                  <Label>{label}</Label>
                  <div className="mt-1 text-[13px] text-[#5E5048]">{value}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <Label>New date</Label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-lg border border-[#E2D7C7] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#A46B48]" />
              </label>
              <label className="block">
                <Label>New time</Label>
                <input type="time" step={1800} value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 w-full rounded-lg border border-[#E2D7C7] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#A46B48]" />
              </label>
            </div>
            <label className="mt-3 block">
              <Label>Notes</Label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-[#E2D7C7] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#A46B48]" />
            </label>
            <p className="mt-3 text-[11px] text-[#8C7E74]">Visits run Monday–Saturday, 9:00 AM–6:00 PM, in 30-minute slots. The shop is closed on Sundays.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setTarget(null)} className="rounded-lg border border-[#E2D7C7] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5E5048]">Cancel</button>
              <button type="submit" className="rounded-lg bg-[#2A211D] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">Save new schedule</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

export function FrontDeskAppointmentsView() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorPreset, setEditorPreset] = useState<{ customerId: string; orderId: string; appointmentType?: string; customerName?: string; jobCardId?: string } | null>(null);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  // PENDING APPOINTMENT APPROVALS: visits the system suggested when a job
  // card reached a production milestone, waiting for a Front Desk decision.
  const [pending, setPending] = useState<Appointment[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [details, setDetails] = useState<Appointment | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [appointmentsData, customersData, ordersData, pendingData] = await Promise.all([
        frontDeskApi.getAppointments(),
        frontDeskApi.searchCustomers(''),
        frontDeskApi.getAllOrders(),
        frontDeskApi.getPendingAppointments(),
      ]);
      setAppointments(appointmentsData);
      setCustomers(customersData);
      setOrders(ordersData);
      setPending(pendingData);
    } catch (err) {
      console.error('Failed to load data:', err);
      setNotice('Failed to load appointment data.');
      setTimeout(() => setNotice(''), 4000);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime: quietly re-poll appointments every 10s so the scheduler's
  // appointment-type stepper, metrics and lists stay current without a page
  // reload — including while the Schedule appointment modal is open.
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const [appointmentsData, pendingData] = await Promise.all([
          frontDeskApi.getAppointments(),
          frontDeskApi.getPendingAppointments(),
        ]);
        setAppointments(appointmentsData);
        setPending(pendingData);
      } catch {
        // transient failure — keep showing the last good data
      }
    }, 10000);
    return () => clearInterval(id);
  }, []);

  // Display pipeline: collapse duplicate records so the fitting calendar shows
  // ONE live appointment row per Job Order (Completed/Cancelled history stays).
  const visibleAppointments = useMemo(() => dedupeAppointments(appointments), [appointments]);

  const filtered = useMemo(() => {
    if (!query.trim()) return visibleAppointments;
    const q = query.toLowerCase();
    return visibleAppointments.filter((a) =>
      a.customer_name.toLowerCase().includes(q) ||
      a.job_card_id.toLowerCase().includes(q) ||
      a.appointment_type.toLowerCase().includes(q)
    );
  }, [visibleAppointments, query]);

  const today = visibleAppointments.filter((a) => {
    const todayStr = new Date().toISOString().split('T')[0];
    return a.appointment_date === todayStr;
  });

  // Appointment pipeline by visit type. In the production-driven model a visit
  // exists because a milestone was reached, so the chart counts live visits per
  // production visit type instead of a per-stage ladder.
  const stageChart = useMemo(() =>
    ['First Fitting', 'Final Fitting', 'Pickup'].map((type) => ({
      stage: type === 'Pickup' ? 'Pickup' : type.replace(' Fitting', ''),
      count: visibleAppointments.filter((a) => a.appointment_type === type && ['Suggested', 'Approved', 'Rescheduled', 'Scheduled', 'Confirmed'].includes(a.status)).length,
    })),
    [visibleAppointments]
  );

  // First Fitting / Final Fitting / Pickup counts for the pipeline card.
  const typeCounts = useMemo(() => {
    const live = visibleAppointments.filter((a) => ['Suggested', 'Approved', 'Rescheduled', 'Scheduled', 'Confirmed'].includes(a.status));
    return live.reduce<Record<string, number>>((acc, a) => {
      acc[a.appointment_type] = (acc[a.appointment_type] || 0) + 1;
      return acc;
    }, {});
  }, [visibleAppointments]);

  // MANUAL EXCEPTION APPOINTMENT (special follow-ups only). Normal fitting and
  // pickup visits are suggested automatically when production reaches a
  // milestone. An existing job card is required; its customer and assigned
  // tailor are derived from that card and never picked here.
  const handleScheduleAppointment = async (data: {
    customerId: string;
    orderId: string;
    appointmentDate: string;
    appointmentTime: string;
    appointmentType: string;
    notes: string;
  }) => {
    const order = orders.find((o) => String(o.order_id) === String(data.orderId))
      || orders.find((o) => String(o.customer_id) === String(data.customerId));
    const jobCardNumber = order?.job_card_id || '';
    if (!jobCardNumber) throw new Error('This customer has no job card yet. An exception visit must belong to an existing job card.');
    const existing = findActiveAppointmentForJob(appointments, jobCardNumber);
    if (existing) throw new Error(`Job card ${jobCardNumber} already has a live ${existing.appointment_type} visit. Reschedule that visit instead.`);
    const created = await frontDeskApi.createExceptionAppointment({
      jobCardNumber,
      appointmentDate: data.appointmentDate,
      appointmentTime: data.appointmentTime,
      appointmentType: data.appointmentType,
      notes: data.notes,
    });
    setAppointments(prev => [...prev, created]);
    setEditorOpen(false);
    setEditorPreset(null);
    setNotice(`Exception visit scheduled for ${created.customer_name || 'the customer'} (${jobCardNumber}).`);
    setTimeout(() => setNotice(''), 4000);
    await loadData();
  };

  const handleCompleteAppointment = async () => {
    if (!selected) return;
    try {
      const updated = await frontDeskApi.completeAppointment(selected.appointment_id);
      setAppointments(prev => prev.map(a => a.appointment_id === updated.appointment_id ? updated : a));
      setSelected(updated);
      setNotice(`${updated.customer_name || 'The customer'} - ${updated.appointment_type} visit marked completed.`);
      setTimeout(() => setNotice(''), 4000);
      await loadData();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Failed to complete the visit.');
      setTimeout(() => setNotice(''), 4000);
    }
  };

  // ---- Front Desk decisions on production-suggested visits -------------------
  const applyDecision = (updated: Appointment) => {
    setAppointments(prev => prev.map(a => a.appointment_id === updated.appointment_id ? { ...a, ...updated } : a));
    setPending(prev => prev.filter(a => a.appointment_id !== updated.appointment_id));
    setSelected(prev => (prev && prev.appointment_id === updated.appointment_id ? { ...prev, ...updated } : prev));
  };

  const handleApprove = async (appointment: Appointment) => {
    setBusyId(appointment.appointment_id);
    try {
      const updated = await frontDeskApi.approveAppointment(appointment.appointment_id);
      applyDecision(updated);
      setNotice(`${updated.appointment_type} for ${updated.customer_name || 'the customer'} approved. The customer and ${updated.assigned_tailor_name || 'the assigned tailor'} were notified.`);
      setTimeout(() => setNotice(''), 4000);
      await loadData();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'The visit could not be approved.');
      setTimeout(() => setNotice(''), 5000);
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (appointment: Appointment) => {
    setBusyId(appointment.appointment_id);
    try {
      const updated = await frontDeskApi.cancelAppointment(appointment.appointment_id, 'Cancelled at the Front Desk.');
      applyDecision(updated);
      setNotice(`${updated.appointment_type} for ${updated.customer_name || 'the customer'} was cancelled. Both parties were notified.`);
      setTimeout(() => setNotice(''), 4000);
      await loadData();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'The visit could not be cancelled.');
      setTimeout(() => setNotice(''), 5000);
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkCompleted = async (appointment: Appointment) => {
    setBusyId(appointment.appointment_id);
    try {
      const updated = await frontDeskApi.completeAppointment(appointment.appointment_id);
      applyDecision(updated);
      setNotice(`${updated.appointment_type} for ${updated.customer_name || 'the customer'} was marked completed.`);
      setTimeout(() => setNotice(''), 4000);
      await loadData();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'The visit could not be completed.');
      setTimeout(() => setNotice(''), 5000);
    } finally {
      setBusyId(null);
    }
  };

  const handleRescheduleDecision = async (appointment: Appointment, data: { appointmentDate: string; appointmentTime: string; notes: string }) => {
    setBusyId(appointment.appointment_id);
    try {
      const updated = await frontDeskApi.rescheduleAppointment(appointment.appointment_id, data);
      applyDecision(updated);
      setNotice(`${updated.appointment_type} for ${updated.customer_name || 'the customer'} moved to ${data.appointmentDate} ${data.appointmentTime}. The customer and ${updated.assigned_tailor_name || 'the assigned tailor'} were notified.`);
      setTimeout(() => setNotice(''), 4500);
      await loadData();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'The visit could not be rescheduled.');
      setTimeout(() => setNotice(''), 5000);
    } finally {
      setBusyId(null);
    }
  };

  const handleViewDetails = async (appointment: Appointment) => {
    setBusyId(appointment.appointment_id);
    try {
      setDetails(await frontDeskApi.getAppointmentDetails(appointment.appointment_id));
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'The appointment details could not be loaded.');
      setTimeout(() => setNotice(''), 4000);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-[#8C6F3E]" />
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div className="dash-in flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Label>Appointment approvals</Label>
          <h1 className="mt-1 text-2xl text-[#2A211D] sm:text-3xl" style={{ fontFamily: "'DM Serif Display', serif" }}>Appointments</h1>
          <p className="mt-2 text-sm text-[#766A62]">Front Desk approves, reschedules or cancels the visits the workshop suggests when a job card reaches a fitting or pickup milestone.</p>
        </div>
        <button onClick={() => { setEditorPreset(null); setEditorOpen(true); }} className="inline-flex items-center gap-2 rounded-lg border border-[#E2D7C7] bg-white px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5E5048] shadow-sm transition-colors hover:bg-[#FCFAF7]">
          <Plus className="h-4 w-4" /> Manual exception appointment
        </button>
      </div>

      {notice && (
        <div className="flex items-center gap-2 rounded-lg border border-[#8B9E87]/40 bg-[#F1F5F0] px-4 py-3 text-sm text-[#4E7357] shadow-sm">
          <Check className="h-4 w-4" />{notice}
        </div>
      )}

      {/* PENDING APPOINTMENT APPROVALS — production milestone suggestions. */}
      <PendingApprovals
        items={pending}
        busyId={busyId}
        onApprove={handleApprove}
        onReschedule={handleRescheduleDecision}
        onCancel={handleCancel}
        onComplete={handleMarkCompleted}
        onViewDetails={handleViewDetails}
      />

      <div className="dash-in grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Metric label="Suggested" value={pending.length} icon={<Sparkles className="h-4 w-4" strokeWidth={1.6} />} />
        <Metric label="Approved" value={visibleAppointments.filter(a => a.status === 'Approved' || a.status === 'Confirmed' || a.status === 'Scheduled').length} icon={<Check className="h-4 w-4" strokeWidth={1.6} />} tone="good" />
        <Metric label="Rescheduled" value={visibleAppointments.filter(a => a.status === 'Rescheduled').length} icon={<CalendarClock className="h-4 w-4" strokeWidth={1.6} />} />
        <Metric label="Completed" value={visibleAppointments.filter(a => a.status === 'Completed').length} icon={<Package className="h-4 w-4" strokeWidth={1.6} />} tone="good" />
        <Metric label="Cancelled" value={visibleAppointments.filter(a => a.status === 'Cancelled').length} icon={<X className="h-4 w-4" strokeWidth={1.6} />} />
        <Metric label="Today's fittings" value={today.length} icon={<CalendarClock className="h-4 w-4" strokeWidth={1.6} />} />
        <Metric label="Confirmed" value={visibleAppointments.filter(a => a.status === 'Confirmed').length} icon={<Check className="h-4 w-4" strokeWidth={1.6} />} tone="good" />
        <Metric label="Upcoming" value={visibleAppointments.filter(a => a.status !== 'Completed' && a.status !== 'Cancelled').length} icon={<Sparkles className="h-4 w-4" strokeWidth={1.6} />} />
      </div>

      <section className="dash-in dash-card rounded-xl p-6 sm:p-7">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div>
            <Label>Appointment pipeline</Label>
            <h2 className="text-xl font-normal mt-0.5 text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>Live visits by type</h2>
            <p className="mt-1 text-[12px] text-[#8C7E74]">First Fitting {typeCounts['First Fitting'] || 0} · Final Fitting {typeCounts['Final Fitting'] || 0} · Pickup {typeCounts['Pickup'] || 0}</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F0] border border-[#C7DDD3] px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] uppercase text-[#4E7357] flex-shrink-0">
            <TrendingUp className="w-3 h-3" /> {visibleAppointments.length} total
          </span>
        </div>
        <p className="text-[12.5px] text-[#8C7E74] mb-5">Each visit exists because the workshop reached that production milestone</p>
        <div className="h-44 -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stageChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#ECE3D8" strokeDasharray="3 4" />
              <XAxis dataKey="stage" tickLine={false} axisLine={false} tick={{ fill: '#A3958B', fontSize: 10.5, fontFamily: 'Space Mono, monospace' }} />
              <YAxis hide allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F8F3EB' }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={40}>
                {stageChart.map((entry, i) => <Cell key={entry.stage} fill={STAGE_CHART_COLORS[i % STAGE_CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="dash-in dash-card overflow-hidden rounded-xl">
        <div className="flex flex-col gap-4 border-b border-[#E8DFD3] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A3958B]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customer, garment, stage, or date" className="w-full rounded-lg border border-[#E2D7C7] bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition-shadow focus:border-[#A46B48] focus:shadow-[0_0_0_3px_rgba(164,107,72,0.1)]" />
          </div>
          <span className="text-xs text-[#8C7E74]">{filtered.length} appointment{filtered.length === 1 ? '' : 's'}</span>
        </div>

        <div className="hidden grid-cols-[0.85fr_1.15fr_1fr_1.1fr_0.8fr_24px] gap-4 border-b border-[#E8DFD3] bg-[#FCFAF7] px-6 py-3 md:grid">
          {['When', 'Customer', 'Job Card', 'Fitting stage', 'Status', ''].map((label) => <Label key={label}>{label}</Label>)}
        </div>

        {filtered.map((appointment) => (
          <button key={appointment.appointment_id} onClick={() => setSelected(appointment)} className="grid w-full grid-cols-1 gap-2 border-b border-[#F0EAE2] px-6 py-4 text-left transition-colors hover:bg-[#FCFAF7] md:grid-cols-[0.85fr_1.15fr_1fr_1.1fr_0.8fr_24px] md:items-center md:gap-4">
            <span>
              <span className="block text-sm font-medium text-[#2A211D]">{appointment.appointment_time}</span>
              <span className="text-[11px] text-[#8C7E74]">{new Date(appointment.appointment_date).toLocaleDateString()}</span>
            </span>
            <span className="font-medium text-[#2A211D]">{appointment.customer_name}</span>
            <span className="text-sm text-[#5E5048]">{appointment.job_card_id}</span>
            <span><StageBadge type={appointment.appointment_type} /></span>
            <StatusBadge status={appointment.status as AppointmentStatus} />
            <ChevronRight className="hidden h-4 w-4 text-[#A3958B] md:block" />
          </button>
        ))}
        {!filtered.length && <p className="p-12 text-center text-sm text-[#766A62]">No appointment matches your search.</p>}
        <p className="border-t border-[#F0EAE2] bg-[#FCFAF7]/60 px-6 py-3 text-[11px] leading-relaxed text-[#8C7E74]">
          Every visit below exists because the workshop reached a production milestone (First Fitting, Final Fitting or Pickup). Front Desk approves, reschedules, cancels or completes each one; nothing is booked by hand except documented exceptions.
        </p>
      </section>

      {/* View Details — read-only, with the append-only decision history. */}
      {details && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button onClick={() => setDetails(null)} className="absolute inset-0 bg-[#1F1916]/45 backdrop-blur-sm" />
          <section className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#E2D7C7] bg-[#FFFCF8] p-7 shadow-2xl">
            <button onClick={() => setDetails(null)} className="absolute right-5 top-5 text-[#766A62]"><X className="h-5 w-5" /></button>
            <Label>Appointment details</Label>
            <h2 className="mt-1 text-2xl text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>{details.appointment_number || `APT-${details.appointment_id}`}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ['Type', details.appointment_type],
                ['Status', details.status],
                ['Customer', details.customer_name || '-'],
                ['Job card', details.job_card_id || '-'],
                ['Garment', details.garment || '-'],
                ['Assigned tailor', details.assigned_tailor_name || 'Unassigned'],
                ['Date', details.appointment_date ? new Date(details.appointment_date).toLocaleDateString() : '-'],
                ['Time', (details.appointment_time || '').slice(0, 5)],
                ['Reason', details.suggested_reason || '-'],
                ['Generated from', details.generated_from_stage || '-'],
                ['Origin', details.appointment_origin === 'manual_exception' ? 'Manual exception' : 'Production milestone'],
                ['Notes', details.notes || '-'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-[#E2D7C7] bg-[#FCFAF7] p-3">
                  <Label>{label}</Label>
                  <div className="mt-1 text-[13px] text-[#2A211D]">{value}</div>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <Label>Decision history (read-only)</Label>
              <ol className="mt-2 space-y-2">
                {(details.history || []).map((h, i) => (
                  <li key={i} className="rounded-lg border border-[#E8DFD3] bg-white px-4 py-3 text-[12.5px] text-[#5E5048]">
                    <span className="font-semibold text-[#2A211D]">{h.from_status || 'Created'} {'->'} {h.to_status}</span>
                    <span className="text-[#8C7E74]"> · {h.actor_name || 'System'}{h.created_at ? ` · ${new Date(h.created_at).toLocaleString()}` : ''}</span>
                    {h.notes ? <div className="mt-1 text-[12px] text-[#8C7E74]">{h.notes}</div> : null}
                  </li>
                ))}
                {!(details.history || []).length && <li className="text-[12.5px] text-[#8C7E74]">No decisions recorded yet.</li>}
              </ol>
            </div>
          </section>
        </div>
      )}
      {selected && (
        <AppointmentDetails
          appointment={selected}
          order={orders.find(o => o.order_id === selected.order_id) || orders.find(o => o.job_card_id === selected.job_card_id)}
          relatedAppointments={visibleAppointments.filter(a => a.job_card_id === selected.job_card_id)}
          onClose={() => setSelected(null)}
          onComplete={handleCompleteAppointment}
        />
      )}
      {editorOpen && (
        <AppointmentEditor
          onClose={() => { setEditorOpen(false); setEditorPreset(null); }}
          onSchedule={handleScheduleAppointment}
          customers={customers}
          orders={orders}
          appointments={appointments}
          initial={editorPreset ?? undefined}
        />
      )}
    </div>
  );
}

function Metric({ label, value, icon, tone = 'default' }: { label: string; value: number; icon?: React.ReactNode; tone?: 'default' | 'good' }) {
  return (
    <div className="dash-card flex items-center gap-4 rounded-xl p-5">
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${tone === 'good' ? 'bg-[#EDF5F0] text-[#4E7357]' : 'bg-[#F9F4EB] text-[#8C6F3E]'}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>{value}</div>
        <Label>{label}</Label>
      </div>
    </div>
  );
}

export default FrontDeskAppointmentsView;
