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

type AppointmentStatus = 'Scheduled' | 'Confirmed' | 'Completed' | 'Rescheduled' | 'Cancelled';

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] uppercase tracking-[0.2em] text-[#8C7E74]" style={{ fontFamily: "'Space Mono', monospace" }}>{children}</span>;
}

function StatusBadge({ status }: { status: AppointmentStatus }) {
  const classes = status === 'Completed' ? 'border-[#B9DDD0] bg-[#E7F4EE] text-[#277257]' : 
    status === 'Confirmed' ? 'border-[#C7DDD3] bg-[#EDF5F0] text-[#4E7357]' : 
    status === 'Scheduled' ? 'border-[#ECD8A7] bg-[#FFF7E3] text-[#8A6618]' :
    status === 'Rescheduled' ? 'border-[#E6C8C2] bg-[#FDF0ED] text-[#9E5B4B]' :
    'border-[#D9C8B7] bg-[#F8F3EB] text-[#766A62]';
  const dot = status === 'Completed' ? 'bg-[#277257]' : 
    status === 'Confirmed' ? 'bg-[#4E7357]' : 
    status === 'Scheduled' ? 'bg-[#8A6618]' :
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
const PRODUCTION_STAGES = ['Measuring', 'Pattern Cutting', 'Initial Assembly', 'Ready for First Fitting', 'Final Alterations', 'Completed', 'Ready for Pickup'];

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

function AppointmentDetails({ appointment, order, relatedAppointments, onClose, onComplete, onNextStage }: { appointment: Appointment; order?: Order; relatedAppointments?: Appointment[]; onClose: () => void; onComplete: () => void; onNextStage: () => void }) {
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
              <button onClick={onNextStage} title={`Book the ${nextStage} visit for this job card`} className="inline-flex items-center gap-2 rounded-lg bg-[#2A211D] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white shadow-sm hover:-translate-y-0.5 transition-transform">
                <CalendarClock className="h-4 w-4" /> Schedule {nextStage}
              </button>
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
      (o) => String(o.customer_id) === String(initial.customerId) && o.production_status !== 'Released'
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
      o.production_status !== 'Released' &&
      !findActiveAppointmentForJob(appointments, o.job_card_id)
  );
  const selectedOrder = orders.find(o => o.order_id === form.orderId);
  const selectedCustomer = customers.find(c => c.customer_id === form.customerId);

  // The fitting stage is decided automatically — never by the user.
  const activeVisit = useMemo(() => findActiveAppointmentForJob(appointments, form.orderId), [appointments, form.orderId]);
  const plannedType = useMemo(() => {
    if (initial?.appointmentType) return initial.appointmentType;
    // Fresh booking ("+ Schedule appointment", no job order attached yet):
    // the first visit on the journey is always a Consultation.
    if (!form.orderId) return 'Consultation';
    return determineStageForJob(appointments, form.orderId);
  }, [appointments, form.orderId, initial?.appointmentType]);

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
        <Label>Fitting scheduler</Label>
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

const STAGES = ['Measuring', 'Pattern Cutting', 'Initial Assembly', 'Ready for First Fitting', 'Final Alterations', 'Completed', 'Ready for Pickup'];
const STAGE_SHORT: Record<string, string> = {
  Measuring: 'Measure',
  'Pattern Cutting': 'Pattern',
  'Initial Assembly': 'Assembly',
  'Ready for First Fitting': 'Fitting',
  'Final Alterations': 'Alter',
  Completed: 'Done',
  'Ready for Pickup': 'Pickup'
};
const STAGE_CHART_COLORS = ['#C9BBA6', '#8FAF9E', '#C9A15C', '#A8644A', '#B89255', '#6E8F72', '#4E7357'];

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

  const loadData = useCallback(async () => {
    try {
      const [appointmentsData, customersData, ordersData] = await Promise.all([
        frontDeskApi.getAppointments(),
        frontDeskApi.searchCustomers(''),
        frontDeskApi.getAllOrders(),
      ]);
      setAppointments(appointmentsData);
      setCustomers(customersData);
      setOrders(ordersData);
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
        const appointmentsData = await frontDeskApi.getAppointments();
        setAppointments(appointmentsData);
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

  const stageChart = useMemo(() => 
    STAGES.map((stage) => ({
      stage: STAGE_SHORT[stage] || stage,
      count: visibleAppointments.filter((a) => a.appointment_type.includes(stage) || a.appointment_type === 'First Fitting' && stage === 'Ready for First Fitting').length,
    })),
    [visibleAppointments]
  );

  // One submission path for every scheduling flow. If the job order already
  // has a live appointment, that SAME record is updated in place (new date,
  // time and next fitting stage) — a duplicate row is never created.
  const handleScheduleAppointment = async (data: {
    customerId: string;
    orderId: string;
    appointmentDate: string;
    appointmentTime: string;
    appointmentType: string;
    notes: string;
  }) => {
    const existing = findActiveAppointmentForJob(appointments, data.orderId);
    if (existing) {
      const updated = await frontDeskApi.rescheduleAppointment(existing.appointment_id, {
        appointmentDate: data.appointmentDate,
        appointmentTime: data.appointmentTime,
        appointmentType: data.appointmentType,
      });
      setAppointments(prev => prev.map(a => a.appointment_id === updated.appointment_id ? { ...a, ...updated } : a));
      setEditorOpen(false);
      setEditorPreset(null);
      setNotice(`${updated.customer_name}'s ${existing.appointment_type} visit moved to ${updated.appointment_type} — same appointment updated.`);
      setTimeout(() => setNotice(''), 4000);
      return;
    }
    const newAppointment = await frontDeskApi.createAppointment({
      customerId: data.customerId,
      orderId: data.orderId,
      appointmentDate: data.appointmentDate,
      appointmentTime: data.appointmentTime,
      appointmentType: data.appointmentType,
      notes: data.notes,
    });
    setAppointments(prev => [...prev, newAppointment]);
    setEditorOpen(false);
    setEditorPreset(null);
    setNotice(`Appointment scheduled for ${newAppointment.customer_name}.`);
    setTimeout(() => setNotice(''), 4000);
  };

  const handleCompleteAppointment = async () => {
    if (!selected) return;
    try {
      const updated = await frontDeskApi.updateAppointmentStatus(selected.appointment_id, 'Completed');
      setAppointments(prev => prev.map(a => a.appointment_id === updated.appointment_id ? updated : a));
      setSelected(updated);
      setNotice(`${updated.customer_name}'s appointment was completed.`);
      setTimeout(() => setNotice(''), 4000);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Failed to complete appointment.');
      setTimeout(() => setNotice(''), 4000);
    }
  };

  // Opens the scheduler pre-filled with the SAME customer + job order and the
  // automatically determined next fitting stage — nothing to pick again.
  const handleNextStage = () => {
    if (!selected) return;
    const nextType = nextFittingStage(selected.appointment_type);
    if (!nextType) return;
    // Attach the SAME customer + job order directly — resolve the order from
    // the appointment's order id, its job card number, or failing both, the
    // customer's most recent active order. The staff never picks anything.
    const linkedOrder =
      orders.find((o) => String(o.order_id) === String(selected.order_id)) ||
      orders.find((o) => o.job_card_id === selected.job_card_id) ||
      orders.find((o) => String(o.customer_id) === String(selected.customer_id) && o.production_status !== 'Released');
    setEditorPreset({
      customerId: selected.customer_id,
      orderId: selected.order_id ?? linkedOrder?.order_id ?? '',
      appointmentType: nextType,
      customerName: selected.customer_name,
      jobCardId: selected.job_card_id,
    });
    setSelected(null);
    setEditorOpen(true);
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
          <Label>Fitting scheduler</Label>
          <h1 className="mt-1 text-2xl text-[#2A211D] sm:text-3xl" style={{ fontFamily: "'DM Serif Display', serif" }}>Appointments</h1>
          <p className="mt-2 text-sm text-[#766A62]">Schedule fittings and keep every customer visit on track.</p>
        </div>
        <button onClick={() => { setEditorPreset(null); setEditorOpen(true); }} className="inline-flex items-center gap-2 rounded-lg bg-[#2A211D] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white shadow-[0_10px_26px_-14px_rgba(42,33,29,0.55)] hover:-translate-y-0.5 hover:bg-[#3D312B] transition-all">
          <Plus className="h-4 w-4" /> Schedule appointment
        </button>
      </div>

      {notice && (
        <div className="flex items-center gap-2 rounded-lg border border-[#8B9E87]/40 bg-[#F1F5F0] px-4 py-3 text-sm text-[#4E7357] shadow-sm">
          <Check className="h-4 w-4" />{notice}
        </div>
      )}

      <div className="dash-in grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Metric label="Today's fittings" value={today.length} icon={<CalendarClock className="h-4 w-4" strokeWidth={1.6} />} />
        <Metric label="Confirmed" value={visibleAppointments.filter(a => a.status === 'Confirmed').length} icon={<Check className="h-4 w-4" strokeWidth={1.6} />} tone="good" />
        <Metric label="Upcoming" value={visibleAppointments.filter(a => a.status !== 'Completed' && a.status !== 'Cancelled').length} icon={<Sparkles className="h-4 w-4" strokeWidth={1.6} />} />
      </div>

      <section className="dash-in dash-card rounded-xl p-6 sm:p-7">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div><Label>Booked pipeline</Label><h2 className="text-xl font-normal mt-0.5 text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>Appointments by stage</h2></div>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F0] border border-[#C7DDD3] px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] uppercase text-[#4E7357] flex-shrink-0">
            <TrendingUp className="w-3 h-3" /> {visibleAppointments.length} total
          </span>
        </div>
        <p className="text-[12.5px] text-[#8C7E74] mb-5">Where every booked fitting currently sits in the workflow</p>
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
          One row per job order: each job card keeps a single live appointment that advances through Consultation → First Fitting → Final Fitting → Pickup. Scheduling the next visit updates this same record instead of creating duplicates, and the fitting stage is always determined automatically.
        </p>
      </section>

      {selected && (
        <AppointmentDetails
          appointment={selected}
          order={orders.find(o => o.order_id === selected.order_id) || orders.find(o => o.job_card_id === selected.job_card_id)}
          relatedAppointments={visibleAppointments.filter(a => a.job_card_id === selected.job_card_id)}
          onClose={() => setSelected(null)}
          onComplete={handleCompleteAppointment}
          onNextStage={handleNextStage}
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