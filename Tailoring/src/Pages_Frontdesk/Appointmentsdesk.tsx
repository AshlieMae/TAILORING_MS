// Pages_Frontdesk/Appointmentsdesk.tsx
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { AlertCircle, BarChart3, CalendarCheck, CalendarClock, Check, ChevronRight, Clock, Flame, Package, PackageCheck, Plus, Ruler, Scissors, Search, Sparkles, TrendingUp, User, X, Loader2 } from 'lucide-react';
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

/* ============================================================
   Motion library — Appointments Desk (pure CSS, no new deps).
   Rendered once per surface to unlock page fades, card lifts,
   modal pops, number pops, live rings and sheen sweeps.
============================================================= */
const APX_MOTION = (
  <style>{`
    @keyframes apxRise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
    @keyframes apxFade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes apxFadeOut { to { opacity: 0; } }
    @keyframes apxPop { from { opacity: 0; transform: translateY(20px) scale(.955); } to { opacity: 1; transform: none; } }
    @keyframes apxPopOut { to { opacity: 0; transform: translateY(12px) scale(.97); } }
    @keyframes apxFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
    @keyframes apxPulseRing { 0% { box-shadow: 0 0 0 0 rgba(164,107,72,.42); } 70% { box-shadow: 0 0 0 8px rgba(164,107,72,0); } 100% { box-shadow: 0 0 0 0 rgba(164,107,72,0); } }
    @keyframes apxGreenRing { 0% { box-shadow: 0 0 0 0 rgba(39,114,87,.42); } 70% { box-shadow: 0 0 0 8px rgba(39,114,87,0); } 100% { box-shadow: 0 0 0 0 rgba(39,114,87,0); } }
    @keyframes apxNum { from { opacity: 0; transform: translateY(9px) scale(.9); } to { opacity: 1; transform: none; } }
    @keyframes apxSheen { from { transform: translateX(-130%); } to { transform: translateX(280%); } }
    @keyframes apxThread { from { background-position: 0 0; } to { background-position: 48px 0; } }
    .apx-rise { opacity: 0; animation: apxRise .65s cubic-bezier(.22,1,.36,1) forwards; }
    .apx-fade { animation: apxFade .32s ease-out both; }
    .apx-fade-out { animation: apxFadeOut .22s ease-in forwards; }
    .apx-pop { animation: apxPop .42s cubic-bezier(.34,1.35,.64,1) both; }
    .apx-pop-out { animation: apxPopOut .2s ease-in forwards; }
    .apx-float { animation: apxFloat 7s ease-in-out infinite; }
    .apx-num { animation: apxNum .55s cubic-bezier(.22,1,.36,1) both; }
    .apx-ring { animation: apxPulseRing 2.2s ease-out infinite; }
    .apx-ring-green { animation: apxGreenRing 2.2s ease-out infinite; }
    .apx-lift { transition: transform .35s cubic-bezier(.22,1,.36,1), box-shadow .35s cubic-bezier(.22,1,.36,1), border-color .35s ease; }
    .apx-lift:hover { transform: translateY(-3px); }
    .apx-sheen { position: relative; overflow: hidden; }
    .apx-sheen::after { content: ''; position: absolute; top: 0; bottom: 0; left: 0; width: 34%; background: linear-gradient(105deg, transparent, rgba(255,255,255,.32), transparent); transform: translateX(-130%); pointer-events: none; }
    .apx-sheen:hover::after { animation: apxSheen 1.05s ease; }
    .apx-thread { background-image: radial-gradient(rgba(255,255,255,.14) 1px, transparent 1.4px); background-size: 16px 16px; animation: apxThread 22s linear infinite; }
    @keyframes apxSpin { to { transform: rotate(360deg); } }
    @keyframes apxBar { from { transform: scaleX(.2); opacity: .35; } to { transform: scaleX(1); opacity: 1; } }
    @keyframes apxSlideIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: none; } }
    .apx-spin { animation: apxSpin .85s linear infinite; }
    .apx-bar { transform-origin: left center; animation: apxBar .8s cubic-bezier(.22,1,.36,1) both; }
    .apx-slide-in { animation: apxSlideIn .4s cubic-bezier(.22,1,.36,1) both; }
    /* KPI cards lift AND scale in one atomic rule so Tailwind's transform
       utilities can never fight the keyframe-driven hover motion. */
    .apx-metric { transition: transform .4s cubic-bezier(.22,1,.36,1), box-shadow .4s cubic-bezier(.22,1,.36,1), border-color .4s ease; }
    .apx-metric:hover { transform: translateY(-3px) scale(1.02); }
    .apx-scroll { scrollbar-width: thin; scrollbar-color: #D9CFC2 transparent; }
  `}</style>
);

// Walk-in, production-driven status model. A visit starts as Suggested (the
// workshop reached a milestone), then the Front Desk decides: Approved,
// Rescheduled, Completed or Cancelled. Legacy values are display-only.
type AppointmentStatus = 'Suggested' | 'Approved' | 'Rescheduled' | 'Completed' | 'Cancelled' | 'Scheduled' | 'Confirmed';

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] uppercase tracking-[0.2em] text-[#8C7E74]" style={{ fontFamily: "'Space Mono', monospace" }}>{children}</span>;
}

function StatusBadge({ status }: { status: AppointmentStatus }) {
  const s = String(status);
  const conf = s === 'Completed'
    ? { wrap: 'border-[#A9D3C1] bg-gradient-to-r from-[#E7F4EE] to-[#D7ECDF] text-[#1F6A50] shadow-[0_3px_12px_-5px_rgba(39,114,87,0.55)]', dot: 'bg-[#2E8A66]', icon: <PackageCheck className="h-3 w-3" />, live: false }
    : (s === 'Approved' || s === 'Confirmed')
      ? { wrap: 'border-[#B5D2C0] bg-gradient-to-r from-[#EDF5F0] to-[#DFEEE6] text-[#3F6A4C] shadow-[0_3px_12px_-5px_rgba(78,115,87,0.5)]', dot: 'bg-[#4E7357]', icon: <Check className="h-3 w-3" />, live: true }
      : s === 'Suggested'
        ? { wrap: 'border-[#E5C98F] bg-gradient-to-r from-[#FFF7E3] to-[#FBEDCB] text-[#7E5C12] shadow-[0_3px_12px_-5px_rgba(138,102,24,0.5)]', dot: 'bg-[#B89255]', icon: <Sparkles className="h-3 w-3" />, live: true }
        : s === 'Rescheduled'
          ? { wrap: 'border-[#DFB4AB] bg-gradient-to-r from-[#FDF0ED] to-[#F9E0D9] text-[#8F4E3E] shadow-[0_3px_12px_-5px_rgba(158,91,75,0.5)]', dot: 'bg-[#A46B48]', icon: <CalendarClock className="h-3 w-3" />, live: true }
          : s === 'Cancelled'
            ? { wrap: 'border-[#D9C8B7] bg-gradient-to-r from-[#F5EFE7] to-[#EDE3D5] text-[#766A62] shadow-[0_2px_10px_-5px_rgba(118,106,98,0.45)]', dot: 'bg-[#9B8D82]', icon: <X className="h-3 w-3" />, live: false }
            : { wrap: 'border-[#D9C8B7] bg-gradient-to-r from-[#F8F3EB] to-[#F1E9DC] text-[#766A62] shadow-sm', dot: 'bg-[#766A62]', icon: <Clock className="h-3 w-3" />, live: false };
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] transition-all duration-300 hover:-translate-y-px hover:shadow-md ${conf.wrap}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${conf.dot} ${conf.live ? (s === 'Suggested' ? 'apx-ring' : 'apx-ring-green') : ''}`} />
      {conf.icon}
      {status}
    </span>
  );
}

/** Colored chip showing which fitting stage (visit type) this appointment belongs to. */
function StageBadge({ type }: { type: string }) {
  const style = stageBadgeStyle(type);
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${style.border} ${style.bg} ${style.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {type}
    </span>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="apx-pop overflow-hidden rounded-xl border border-[#E2D7C7]/80 bg-white/95 px-3.5 py-2.5 shadow-[0_18px_40px_-16px_rgba(42,33,29,0.35)] backdrop-blur-md">
      <div className="h-0.5 w-9 rounded-full bg-gradient-to-r from-[#8C6F3E] to-[#C9A15C]" />
      <div className="mt-1.5 text-[10px] uppercase tracking-[0.16em] text-[#8C7E74]" style={{ fontFamily: "'Space Mono', monospace" }}>{label}</div>
      <div className="mt-0.5 text-[13px] font-semibold text-[#2A211D]">{payload[0].value} appointment{payload[0].value === 1 ? '' : 's'}</div>
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
    <div className="apx-pop overflow-hidden rounded-xl border border-[#E2D7C7]/80 bg-white/95 px-3.5 py-2.5 shadow-[0_18px_40px_-16px_rgba(42,33,29,0.35)] backdrop-blur-md">
      <div className="h-0.5 w-9 rounded-full bg-gradient-to-r from-[#8C6F3E] to-[#A46B48]" />
      <div className="mt-1.5 text-[10px] uppercase tracking-[0.16em] text-[#8C7E74]" style={{ fontFamily: "'Space Mono', monospace" }}>
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
    <div className="apx-fade relative mt-6 overflow-hidden rounded-2xl border border-[#E2D7C7] bg-gradient-to-b from-white to-[#FCFAF6] p-4 shadow-[0_20px_44px_-26px_rgba(42,33,29,0.28)] sm:p-6">
      {APX_MOTION}
      <div className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-[#8C6F3E]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-40 w-40 rounded-full bg-[#A46B48]/8 blur-3xl" />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#8C6F3E] to-[#A46B48] text-white shadow-lg shadow-[#8C6F3E]/30">
              <Ruler className="h-4 w-4" />
            </span>
            <div>
              <Label>Live fitting tracker</Label>
              <p className="mt-0.5 text-[12.5px] text-[#8C7E74]">Real-time progress from first measurement to pickup</p>
            </div>
          </div>
        </div>
        <span className={`inline-flex flex-shrink-0 items-center gap-1.5 self-start rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] shadow-md ${isLive ? 'border-[#A9D3C1] bg-gradient-to-r from-[#E7F4EE] to-[#D9EEE4] text-[#1F6A50] shadow-[#277257]/15' : 'border-[#ECD8A7] bg-gradient-to-r from-[#FFF7E3] to-[#FBEDCB] text-[#8A6618] shadow-[#B89255]/15'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${isLive ? 'apx-ring-green bg-[#277257]' : 'apx-ring bg-[#8A6618]'}`} />
          {liveLabel}
        </span>
      </div>

      {/* Live summary chips */}
      <div className="relative mt-4 grid grid-cols-3 gap-2.5">
        {[
          { k: 'Current stage', v: FITTING_JOURNEY[currentIndex] },
          { k: 'Timeline', v: `${overallPct}%` },
          { k: 'Status', v: isLive ? 'Live now' : liveLabel },
        ].map((chip, ci) => (
          <div key={chip.k} className="apx-rise rounded-xl border border-[#EFE7DB] bg-white/80 px-3 py-2.5 shadow-sm" style={{ animationDelay: `${ci * 90}ms` }}>
            <div className="text-[9px] uppercase tracking-[0.14em] text-[#A3958B]" style={{ fontFamily: "'Space Mono', monospace" }}>{chip.k}</div>
            <div className="mt-0.5 truncate text-[12.5px] font-semibold text-[#2A211D]" title={chip.v}>{chip.v}</div>
          </div>
        ))}
      </div>

      {/* Milestone stepper */}
      <div className="relative mt-6 flex items-start justify-between">
        <div className="absolute left-3 right-3 top-[11px] h-[3px] rounded-full bg-[#EFE7DB]" />
        <div
          className="absolute left-3 top-[11px] h-[3px] overflow-hidden rounded-full bg-gradient-to-r from-[#8C6F3E] via-[#A46B48] to-[#C9A15C] shadow-[0_0_10px_rgba(140,111,62,0.35)] transition-all duration-700"
          style={{ width: `calc((100% - 24px) * ${currentIndex / (FITTING_JOURNEY.length - 1)})` }}
        />
        {FITTING_JOURNEY.map((step, i) => {
          const done = i < currentIndex || (i === currentIndex && isDone);
          const current = i === currentIndex && !isDone;
          const known = milestones.find((m) => m.type === step);
          return (
            <div key={step} className="relative z-10 flex min-w-0 flex-1 flex-col items-center px-0.5">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full border-2 shadow-sm transition-all duration-500 ${done ? 'border-[#8C6F3E] bg-gradient-to-br from-[#8C6F3E] to-[#A46B48] text-white shadow-[#8C6F3E]/35' : current ? 'apx-ring border-[#8C6F3E] bg-white' : 'border-[#E2D7C7] bg-white'}`}>
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
      <div className="relative mt-5 rounded-xl border border-[#F0EAE2] bg-white/70 p-2.5 shadow-inner">
        <div className="-ml-2 h-36 sm:h-44">
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
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-[#F0EAE2] bg-[#FCFAF7]/70 px-3 py-2 text-[10px] text-[#8C7E74]">
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-[3px] w-4 rounded-full bg-gradient-to-r from-[#8C6F3E] to-[#A46B48]" /> Elapsed</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-0 w-4 border-t border-dashed border-[#C9BBA6]" /> Remaining</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full border-2 border-[#A46B48] bg-white shadow-sm" /> Fitting visit</span>
        <span className="ml-auto rounded-full border border-[#ECD8A7] bg-[#FFF7E3] px-2.5 py-0.5 font-semibold text-[#8A6618]" style={{ fontFamily: "'Space Mono', monospace" }}>{overallPct}% of timeline</span>
      </div>

      {/* Workshop pipeline for the linked garment */}
      {order && productionIdx >= 0 && (
        <div className="mt-4 rounded-xl border border-[#F0EAE2] bg-[#FCFAF7]/80 p-3.5">
          <div className="flex items-center justify-between">
            <Label>Workshop pipeline</Label>
            <span className="rounded-full border border-[#ECD8A7] bg-[#FFF7E3] px-2.5 py-0.5 text-[10px] font-semibold text-[#8A6618]" style={{ fontFamily: "'Space Mono', monospace" }}>{productionPct}% of stages</span>
          </div>
          <div className="mt-2.5 flex gap-1">
            {PRODUCTION_STAGES.map((stage, i) => (
              <div
                key={stage}
                title={stage}
                style={{ animationDelay: `${Math.min(i * 55, 550)}ms` }}
                className={`apx-bar h-2 flex-1 rounded-full transition-all duration-500 ${i <= productionIdx ? 'bg-gradient-to-r from-[#8C6F3E] to-[#A46B48] shadow-[0_0_8px_rgba(140,111,62,0.3)]' : 'bg-[#EFE7DB]'}`}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#766A62]">
            <Scissors className="h-3 w-3 text-[#8C6F3E]" />
            Garment is currently at <span className="font-semibold text-[#2A211D]">{order.production_status}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function AppointmentDetails({ appointment, order, relatedAppointments, onClose, onComplete }: { appointment: Appointment; order?: Order; relatedAppointments?: Appointment[]; onClose: () => void; onComplete: () => void }) {
  const nextStage = nextFittingStage(appointment.appointment_type);
  const [closing, setClosing] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const close = () => { setClosing(true); setTimeout(onClose, 210); };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      {APX_MOTION}
      <button onClick={close} aria-label="Close details" className={`absolute inset-0 bg-[#1F1916]/55 backdrop-blur-md ${closing ? 'apx-fade-out' : 'apx-fade'}`} />
      <section className={`apx-scroll relative max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-[#E2D7C7]/90 bg-gradient-to-b from-[#FFFCF8] to-[#FAF5EC] p-5 pb-8 shadow-[0_40px_90px_-30px_rgba(31,25,22,0.55)] sm:rounded-2xl sm:p-7 ${closing ? 'apx-pop-out' : 'apx-pop'}`}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#8C6F3E] via-[#C9A15C] to-[#8C6F3E] sm:rounded-t-2xl" />
        <button onClick={close} className="absolute right-4 top-4 rounded-full border border-[#E8DFD3] bg-white/80 p-2 text-[#766A62] transition-all duration-300 hover:rotate-90 hover:border-[#D9C8B7] hover:text-[#2A211D] hover:shadow-md"><X className="h-4 w-4" /></button>
        <Label>Appointment details</Label>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
          <h2 className="text-2xl text-[#2A211D] sm:text-3xl" style={{ fontFamily: "'DM Serif Display', serif" }}>{appointment.customer_name}</h2>
          <StageBadge type={appointment.appointment_type} />
          <StatusBadge status={appointment.status as AppointmentStatus} />
        </div>
        <div className="mt-5 flex items-center gap-4 rounded-xl border border-[#ECD8A7]/70 bg-gradient-to-r from-[#FFF7E3] to-[#FDF4DE] p-4 shadow-sm">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white shadow-inner">
            <CalendarClock className="h-5 w-5 text-[#8A6618]" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-[#8A6618]" style={{ fontFamily: "'Space Mono', monospace" }}>Scheduled visit</div>
            <div className="text-[15px] font-semibold text-[#2A211D]">{new Date(appointment.appointment_date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} · {(appointment.appointment_time || '').slice(0, 5)}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            ['Type', appointment.appointment_type],
            ['Job Card', appointment.job_card_id],
            ['Notes', appointment.notes || '—'],
          ].map(([label, value]) => (
            <div key={label} className={`rounded-xl border border-[#E2D7C7] bg-white p-3.5 shadow-sm transition-shadow duration-300 hover:shadow-md ${label === 'Notes' ? 'sm:col-span-2' : ''}`}>
              <Label>{label}</Label>
              <div className="mt-1 text-sm text-[#2A211D]">{value}</div>
            </div>
          ))}
        </div>

        <FittingTracker appointment={appointment} order={order} relatedAppointments={relatedAppointments} />

        <div className="mt-6 flex flex-col gap-3 border-t border-[#E8DFD3] pt-5 sm:flex-row sm:items-center sm:justify-between">
          {nextStage ? (
            <span className="max-w-sm text-[11px] leading-relaxed text-[#8C7E74]">
              The <span className="font-semibold text-[#5E5048]">{nextStage}</span> visit is suggested automatically once the workshop records that production milestone.
            </span>
          ) : <span />}
          {appointment.appointment_type === 'Final Fitting' &&
            appointment.status !== 'Completed' &&
            appointment.status !== 'Cancelled' && (
            <button onClick={() => setConfirmComplete(true)} className="apx-sheen inline-flex flex-shrink-0 items-center gap-2 rounded-xl border border-[#B5D2C0] bg-gradient-to-r from-[#EDF5F0] to-[#E2EFE7] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#3F6A4C] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#4E7357]/20 active:translate-y-0">
              <Check className="h-4 w-4" /> Mark completed
            </button>
          )}
        </div>
        {confirmComplete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <button onClick={() => setConfirmComplete(false)} className="apx-fade absolute inset-0 bg-[#1F1916]/55 backdrop-blur-md" />
            <div className="apx-pop relative w-full max-w-sm rounded-2xl border border-[#E2D7C7]/90 bg-gradient-to-b from-[#FFFCF8] to-[#FAF5EC] p-6 shadow-[0_40px_90px_-30px_rgba(31,25,22,0.55)]">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#E7F4EE] to-[#D7ECDF] text-[#2E8A66] shadow-inner"><PackageCheck className="h-5 w-5" /></span>
                <div>
                  <h3 className="text-lg text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>Mark this visit completed?</h3>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#766A62]">
                    {appointment.customer_name || 'The customer'}'s {appointment.appointment_type} will be recorded as attended and the workshop history updated immediately.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2.5">
                <button onClick={() => setConfirmComplete(false)} className="rounded-xl border border-[#E2D7C7] bg-white px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5E5048] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">Keep visit</button>
                <button onClick={() => { setConfirmComplete(false); onComplete(); }} className="apx-sheen rounded-xl bg-gradient-to-r from-[#4E7357] to-[#3C5C44] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white shadow-lg shadow-[#4E7357]/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0">Yes, complete it</button>
              </div>
            </div>
          </div>
        )}
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
  const [closing, setClosing] = useState(false);
  const close = () => { setClosing(true); setTimeout(onClose, 210); };

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
    const chosen = new Date(`${form.appointmentDate}T${form.appointmentTime.slice(0, 5)}`);
    if (!Number.isFinite(chosen.getTime())) {
      setError('That date or time is not a valid schedule.');
      return;
    }
    if (chosen.getDay() === 0) {
      setError('The shop is closed on Sundays — pick a Monday–Saturday slot.');
      return;
    }
    const minutes = chosen.getHours() * 60 + chosen.getMinutes();
    if (minutes < 9 * 60 || minutes > 17 * 60 + 30) {
      setError('Visits run 9:00 AM–6:00 PM in 30-minute slots.');
      return;
    }
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    if (chosen.getTime() < todayStart.getTime()) {
      setError('Please choose today or a future date.');
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
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      {APX_MOTION}
      <button onClick={close} aria-label="Close editor" className={`absolute inset-0 bg-[#1F1916]/55 backdrop-blur-md ${closing ? 'apx-fade-out' : 'apx-fade'}`} />
      <form onSubmit={handleSubmit} className={`apx-scroll apx-sheen relative max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-[#E2D7C7]/90 bg-gradient-to-b from-[#FFFCF8] to-[#FAF5EC] p-5 pb-8 shadow-[0_40px_90px_-30px_rgba(31,25,22,0.55)] sm:rounded-2xl sm:p-7 ${closing ? 'apx-pop-out' : 'apx-pop'}`}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#8C6F3E] via-[#C9A15C] to-[#8C6F3E] sm:rounded-t-2xl" />
        <button type="button" onClick={close} className="absolute right-4 top-4 rounded-full border border-[#E8DFD3] bg-white/80 p-2 text-[#766A62] transition-all duration-300 hover:rotate-90 hover:border-[#D9C8B7] hover:text-[#2A211D] hover:shadow-md"><X className="h-4 w-4" /></button>
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#2A211D] to-[#4A382A] text-white shadow-lg shadow-[#2A211D]/25"><Plus className="h-4 w-4" /></span>
          <div>
            <Label>Exception visit</Label>
            <h2 className="mt-0.5 text-2xl text-[#2A211D] sm:text-3xl" style={{ fontFamily: "'DM Serif Display', serif" }}>Manual exception appointment</h2>
          </div>
        </div>
        {error && (
          <div role="alert" className="apx-fade mt-4 flex items-start gap-2.5 rounded-xl border border-[#C86A58]/30 bg-gradient-to-r from-[#FDF4F2] to-[#FBEAE6] px-4 py-3 text-sm text-[#9A3B2A] shadow-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />{error}
          </div>
        )}
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
              <div className="rounded-xl border border-[#E2D7C7] bg-white p-3.5 shadow-sm transition-shadow duration-300 hover:shadow-md">
                <Label>Customer</Label>
                <div className="mt-1.5 flex items-center gap-2 text-sm font-medium text-[#2A211D]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#F8F3EB] text-[#8C6F3E]"><User className="h-3.5 w-3.5" /></span>
                  <span className="truncate">{initial?.customerName || selectedCustomer?.full_name || 'Customer'}</span>
                </div>
                <p className="mt-1 text-[9.5px] uppercase tracking-[0.12em] text-[#A3958B]">Added automatically</p>
              </div>
              <div className="rounded-xl border border-[#E2D7C7] bg-white p-3.5 shadow-sm transition-shadow duration-300 hover:shadow-md">
                <Label>Order (Job Card)</Label>
                <div className="mt-1.5 flex items-center gap-2 text-sm font-medium text-[#2A211D]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#F8F3EB] text-[#8C6F3E]"><Package className="h-3.5 w-3.5" /></span>
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
                <select value={form.customerId} onChange={(e) => setForm(f => ({ ...f, customerId: e.target.value, orderId: '' }))} className={APX_INPUT}>
                  <option value="">Select customer</option>
                  {customers.map(c => <option key={c.customer_id} value={c.customer_id}>{c.full_name}</option>)}
                </select>
              </label>
              <label className="block text-xs font-medium text-[#5E5048]">
                Order (Job Card)
                <select value={form.orderId} onChange={(e) => setForm(f => ({ ...f, orderId: e.target.value }))} disabled={!form.customerId} className={APX_INPUT}>
                  {form.customerId && !filteredOrders.length ? (
                    <option value="">No order</option>
                  ) : (
                    <option value="">Select order</option>
                  )}
                  {filteredOrders.map(o => <option key={o.order_id} value={o.order_id}>{o.job_card_id} - {o.garment_type}</option>)}
                </select>
              </label>
              {form.customerId && !filteredOrders.length && (
                <p className="rounded-xl border border-[#ECD8A7]/60 bg-[#FFF7E3]/60 px-3.5 py-2.5 text-[10px] leading-relaxed text-[#8A6618] sm:col-span-2">
                  {orders.some(o => o.customer_id === form.customerId)
                    ? "Every job card for this customer already has a live visit scheduled — book their next stage from that appointment's details."
                    : "This customer has no job orders yet."}
                </p>
              )}
            </>
          )}
          <label className="block text-xs font-medium text-[#5E5048]">
            Date
            <input type="date" min={new Date().toISOString().split('T')[0]} value={form.appointmentDate} onChange={(e) => setForm(f => ({ ...f, appointmentDate: e.target.value }))} className={APX_INPUT} />
          </label>
          <label className="block text-xs font-medium text-[#5E5048]">
            Time
            <input type="time" step={1800} value={form.appointmentTime} onChange={(e) => setForm(f => ({ ...f, appointmentTime: e.target.value }))} className={APX_INPUT} />
          </label>
          <label className="block text-xs font-medium text-[#5E5048] sm:col-span-2">
            Notes (optional)
            <input value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Special instructions..." className={APX_INPUT} />
          </label>
        </div>
        <p className="mt-3 text-[11px] text-[#A3958B]">Visits run Monday–Saturday, 9:00 AM–6:00 PM, in 30-minute slots. The shop is closed on Sundays.</p>

        {/* Appointment-type graph */}
        <section className="mt-6 rounded-xl border border-[#E2D7C7] bg-gradient-to-b from-white to-[#FCFAF6] p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Label>Appointment types</Label>
              <p className="mt-0.5 text-[12px] text-[#8C7E74]">Every visit booked across the workshop, by fitting stage</p>
            </div>
            <span className="inline-flex flex-shrink-0 items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#B9DDD0] bg-gradient-to-r from-[#E7F4EE] to-[#DCEDE4] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#277257] shadow-sm">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#277257]" /> Live
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#ECD8A7] bg-gradient-to-r from-[#FFF7E3] to-[#FBEDCB] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8A6618] shadow-sm">
                <BarChart3 className="h-3 w-3" /> {totalVisits} total
              </span>
            </span>
          </div>
          {/* Journey stepper — same visual language as the live fitting tracker */}
          <div className="relative mt-6 flex items-start justify-between px-1">
            <div className="absolute left-3 right-3 top-[11px] h-[3px] rounded-full bg-[#EFE7DB]" />
            <div
              className="absolute left-3 top-[11px] h-[3px] rounded-full bg-gradient-to-r from-[#8C6F3E] via-[#A46B48] to-[#C9A15C] shadow-[0_0_10px_rgba(140,111,62,0.3)] transition-all duration-700"
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
                    className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-bold shadow-sm transition-all duration-500 ${isPlanned ? 'apx-ring animate-pulse border-[#8C6F3E] bg-white text-[#8C6F3E]' : hasVisits ? 'border-[#8C6F3E] bg-gradient-to-br from-[#8C6F3E] to-[#A46B48] text-white shadow-[#8C6F3E]/35' : 'border-[#E2D7C7] bg-white text-[#A3958B]'}`}
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

        <div className="mt-7 flex flex-wrap gap-3">
          <button type="submit" disabled={saving} className="apx-sheen inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2A211D] to-[#4A382A] px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white shadow-lg shadow-[#2A211D]/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#2A211D]/30 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0">
            {saving ? <Loader2 className="apx-spin h-4 w-4" /> : <CalendarClock className="h-4 w-4" />} {saving ? 'Scheduling…' : 'Schedule'}
          </button>
          <button type="button" onClick={close} className="rounded-xl border border-[#E2D7C7] bg-white px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5E5048] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#D9C8B7] hover:shadow-md active:translate-y-0">Cancel</button>
        </div>
      </form>
    </div>
  );
}

// (stage ladder constants removed: the appointment pipeline is production-driven)
const STAGE_CHART_COLORS = ['#C9BBA6', '#8FAF9E', '#C9A15C', '#A8644A', '#B89255', '#6E8F72', '#4E7357'];

/* Shared premium field styling for the scheduling forms. */
const APX_INPUT = 'mt-2 w-full rounded-xl border border-[#E2D7C7] bg-white px-3.5 py-2.5 text-sm text-[#2A211D] outline-none transition-all duration-300 placeholder:text-[#B7A99C] focus:border-[#A46B48] focus:shadow-[0_0_0_4px_rgba(164,107,72,0.12)] disabled:cursor-not-allowed disabled:bg-[#F8F3EB] disabled:text-[#766A62]';

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
  onReschedule: (appointment: Appointment, data: { appointmentDate: string; appointmentTime: string; notes: string }) => Promise<void> | void;
  onCancel: (appointment: Appointment) => void;
  onComplete: (appointment: Appointment) => void;
  onViewDetails: (appointment: Appointment) => void;
}) {
  const [target, setTarget] = useState<Appointment | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [confirm, setConfirm] = useState<{ appointment: Appointment; kind: 'cancel' | 'complete' } | null>(null);
  const [saving, setSaving] = useState(false);
  const [reviewNew, setReviewNew] = useState(false);
  const [rescheduleError, setRescheduleError] = useState('');
  const [closing, setClosing] = useState(false);

  const closeReschedule = () => {
    setClosing(true);
    setTimeout(() => { setTarget(null); setClosing(false); setReviewNew(false); }, 200);
  };

  const openReschedule = (appointment: Appointment) => {
    setRescheduleError('');
    // Reset the exit animation flag — without this the modal would open with
    // the fade-out keyframe applied on every re-open.
    setClosing(false);
    setReviewNew(false);
    setTarget(appointment);
    setDate(appointment.appointment_date || '');
    setTime((appointment.appointment_time || '').slice(0, 5));
    setNotes(appointment.notes || '');
  };

  // UI-level guard for the Front Desk decision: a visit needs a real future
  // slot inside the shop's published hours (Mon–Sat, 9:00 AM–6:00 PM).
  const validateReschedule = (): string => {
    if (!date.trim() || !time.trim()) return 'Please choose both a new date and a new time.';
    const chosen = new Date(`${date}T${time.slice(0, 5)}`);
    if (!Number.isFinite(chosen.getTime())) return 'That date or time is not a valid schedule.';
    if (chosen.getDay() === 0) return 'The shop is closed on Sundays — pick a Monday–Saturday slot.';
    const minutes = chosen.getHours() * 60 + chosen.getMinutes();
    if (minutes < 9 * 60 || minutes > 17 * 60 + 30) return 'Visits run 9:00 AM–6:00 PM in 30-minute slots.';
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    if (chosen.getTime() < todayStart.getTime()) return 'Please choose today or a future date.';
    return '';
  };

  // Two-step submit. Step 1 validates the slot and opens the review card;
  // step 2 saves. The request is awaited inside submitReschedule so the button
  // stays disabled for the whole round trip (no duplicate reschedules).
  const handleRescheduleSubmit = () => {
    if (saving) return;
    if (!reviewNew) {
      const problem = validateReschedule();
      if (problem) { setRescheduleError(problem); return; }
      setRescheduleError('');
      setReviewNew(true);
      return;
    }
    void submitReschedule();
  };

  // Human-readable rendering of the slot the Front Desk is about to confirm.
  const previewDate = (() => {
    if (!date || !time) return null;
    const parsed = new Date(`${date}T${time.slice(0, 5)}`);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  })();

  const submitReschedule = async () => {
    if (!target || saving) return;
    const problem = validateReschedule();
    if (problem) { setRescheduleError(problem); setReviewNew(false); return; }
    setSaving(true);
    setRescheduleError('');
    try {
      // Keep the button in its loading state until the Front Desk decision has
      // actually been sent, so a double-click can never fire two reschedules.
      await onReschedule(target, { appointmentDate: date, appointmentTime: time, notes });
      setReviewNew(false);
      closeReschedule();
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="dash-in dash-card relative overflow-hidden rounded-2xl">
      {APX_MOTION}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#ECD8A7] via-[#C9A15C] to-[#ECD8A7]" />
      <div className="flex flex-col gap-4 border-b border-[#E8DFD3] bg-gradient-to-r from-[#FFFCF8] via-white to-[#FCFAF6] p-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#B89255] to-[#8A6618] text-white shadow-lg shadow-[#B89255]/30">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <Label>Production suggestions</Label>
              <h2 className="mt-0.5 text-xl text-[#2A211D] sm:text-2xl" style={{ fontFamily: "'DM Serif Display', serif" }}>Pending appointment approvals</h2>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-[12.5px] leading-relaxed text-[#766A62]">
            Each visit below was suggested automatically when a job card reached a production milestone. The customer,
            job card, visit type and assigned tailor always come from that job card. Nothing is sent to the customer or
            tailor until you approve or reschedule the visit.
          </p>
        </div>
        <div className="flex flex-shrink-0 flex-col items-start gap-2 sm:items-end">
          <span className="apx-ring inline-flex items-center gap-1.5 rounded-full border border-[#E5C98F] bg-gradient-to-r from-[#FFF7E3] to-[#FBEDCB] px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7E5C12] shadow-md shadow-[#B89255]/15">
            <Sparkles className="h-3 w-3" /> {items.length} awaiting decision
          </span>
          <span className="text-[10px] uppercase tracking-[0.14em] text-[#A3958B]" style={{ fontFamily: "'Space Mono', monospace" }}>Front Desk decision required</span>
        </div>
      </div>

      {!items.length && (
        <div className="apx-fade flex flex-col items-center gap-3 p-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F8F3EB] to-[#EFE7DC] text-[#B89255] shadow-inner">
            <Check className="h-5 w-5" />
          </span>
          <p className="max-w-md text-sm leading-relaxed text-[#766A62]">
            No suggested visits are waiting. A First Fitting, Final Fitting or Pickup visit appears here automatically as
            soon as the workshop records the matching production milestone.
          </p>
        </div>
      )}

      {items.map((appointment, idx) => {
        const busy = busyId === appointment.appointment_id;
        const hand = appointment as Appointment & { is_priority?: boolean; priority?: string; is_urgent?: boolean; conflict?: boolean; has_conflict?: boolean; slot_conflict?: boolean; days_to_visit?: number; days_until?: number };
        /* Priority ribbon reflects backend flags when the API exposes them;
           otherwise it falls back to the shop's own rule — a suggested visit
           landing within two days is treated as priority. */
        const when = appointment.appointment_date ? new Date(appointment.appointment_date) : null;
        const validDate = when && Number.isFinite(when.getTime());
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const daysAway = validDate ? Math.ceil((new Date(when!.getFullYear(), when!.getMonth(), when!.getDate()).getTime() - todayStart.getTime()) / 86400000) : null;
        const flagged = Number(hand.days_to_visit ?? hand.days_until ?? NaN);
        const daysOut = Number.isFinite(flagged) ? flagged : daysAway;
        const urgent = Boolean(
          hand.is_priority || hand.is_urgent || (typeof hand.priority === 'string' && hand.priority.toLowerCase() !== 'normal') || (daysOut !== null && daysOut <= 2)
        );
        const conflict = Boolean(hand.conflict || hand.has_conflict || hand.slot_conflict);
        return (
          <article
            key={appointment.appointment_id}
            className="apx-rise group relative border-b border-[#F0EAE2] p-4 transition-colors duration-300 last:border-b-0 hover:bg-[#FCFAF7]/80 sm:p-6"
            style={{ animationDelay: `${Math.min(idx * 70, 420)}ms` }}
          >
            <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-[#B89255] to-[#8A6618] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="relative overflow-hidden rounded-2xl border border-[#EFE7DB] bg-white p-4 shadow-[0_10px_26px_-22px_rgba(42,33,29,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#E5D9C4] hover:shadow-[0_28px_54px_-26px_rgba(42,33,29,0.4)] sm:p-5">
              <span className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#ECD8A7] via-[#C9A15C] to-[#8A6618]" />
              <span className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-[#C9A15C]/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
              <div className="pointer-events-none absolute right-0 top-0 flex flex-col items-end gap-1">
                <span className="rounded-bl-xl border-b border-l border-[#E5C98F] bg-gradient-to-br from-[#FFF7E3] to-[#FBEDCB] px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#8A6618] shadow-sm">
                  Awaiting approval
                </span>
                {urgent && (
                  <span className="inline-flex items-center gap-1 rounded-bl-xl border-b border-l border-[#E6C8C2] bg-gradient-to-br from-[#FDF0ED] to-[#F9E0D9] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#9A3B2A] shadow-sm">
                    <Flame className="h-2.5 w-2.5" />
                    {daysOut !== null ? (daysOut <= 0 ? 'Visit today' : `${daysOut}d out`) : 'Priority'}
                  </span>
                )}
              </div>

              <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md border border-[#E8DFD3] bg-white px-2 py-0.5 text-[10px] font-medium text-[#8C7E74] shadow-sm" style={{ fontFamily: "'Space Mono', monospace" }}>{appointment.appointment_number || `APT-${appointment.appointment_id}`}</span>
                    <StageBadge type={appointment.appointment_type} />
                    <StatusBadge status={appointment.status as AppointmentStatus} />
                    {conflict && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#E6C8C2] bg-[#FDF4F2] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#9A3B2A]">
                        <AlertCircle className="h-2.5 w-2.5" /> Slot conflict
                      </span>
                    )}
                  </div>
                <div className="mt-2.5 flex items-center gap-3">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#F8F3EB] to-[#EFE7DC] text-sm font-semibold text-[#8C6F3E] shadow-inner transition-transform duration-300 group-hover:scale-105">
                    {(appointment.customer_name || 'C').trim().charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-[#2A211D]">{appointment.customer_name || 'Customer on file'}</p>
                    <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-relaxed text-[#8C7E74]">
                      {appointment.suggested_reason || (appointment.appointment_type === 'Pickup' ? 'Garment passed production and is ready for pickup' : 'Garment is ready for the next fitting')}
                      {appointment.generated_from_stage ? ` · from ${appointment.generated_from_stage}` : ''}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-3">
                <div className="rounded-xl border border-[#ECD8A7]/80 bg-gradient-to-br from-[#FFF7E3] to-[#FDF4DE] px-4 py-2.5 text-center shadow-sm">
                  <div className="text-[9px] uppercase tracking-[0.16em] text-[#8A6618]" style={{ fontFamily: "'Space Mono', monospace" }}>Suggested</div>
                  <div className="mt-0.5 text-sm font-semibold text-[#2A211D]">{validDate ? when!.toLocaleDateString() : '—'}</div>
                  <div className="text-[11px] font-medium text-[#8A6618]" style={{ fontFamily: "'Space Mono', monospace" }}>{(appointment.appointment_time || '').slice(0, 5) || '--:--'}</div>
                </div>
              </div>
            </div>
            <dl className="relative mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Customer', appointment.customer_name || '—'],
                ['Job card', appointment.job_card_id || '—'],
                ['Garment', appointment.garment || '—'],
                ['Assigned tailor', appointment.assigned_tailor_name || 'Unassigned'],
                ['Suggested date', validDate ? when!.toLocaleDateString() : '—'],
                ['Suggested time', (appointment.appointment_time || '').slice(0, 5) || '--:--'],
                ['Reason', appointment.suggested_reason || '—'],
                ['Notes', appointment.notes || '—'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-[#E8DFD3] bg-[#FCFAF7] p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#D9C8B7] hover:bg-white hover:shadow-sm">
                  <Label>{label}</Label>
                  <div className="mt-1 truncate text-[13px] font-medium text-[#2A211D]" title={String(value)}>{value}</div>
                </div>
              ))}
            </dl>

            <div className="relative mt-5 flex flex-wrap items-center gap-2 border-t border-dashed border-[#EFE7DB] pt-4">
              <button
                disabled={busy}
                onClick={() => onApprove(appointment)}
                className="apx-sheen inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#2A211D] to-[#4A382A] px-4.5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white shadow-lg shadow-[#2A211D]/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#2A211D]/30 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? <Loader2 className="apx-spin h-4 w-4" /> : <Check className="h-4 w-4" />}{busy ? 'Saving…' : 'Approve'}
              </button>
              <button
                disabled={busy}
                onClick={() => openReschedule(appointment)}
                className="inline-flex items-center gap-2 rounded-full border border-[#E2D7C7] bg-white px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5E5048] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#A46B48] hover:text-[#2A211D] hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CalendarClock className="h-4 w-4" />Reschedule
              </button>
              <button
                disabled={busy}
                onClick={() => onViewDetails(appointment)}
                className="inline-flex items-center gap-2 rounded-full border border-[#E2D7C7] bg-white px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5E5048] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#A46B48] hover:text-[#2A211D] hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? <Loader2 className="apx-spin h-4 w-4" /> : <Search className="h-4 w-4" />}View details
              </button>
              <button
                disabled={busy}
                onClick={() => setConfirm({ appointment, kind: 'complete' })}
                className="inline-flex items-center gap-2 rounded-full border border-[#B5D2C0] bg-gradient-to-r from-[#EDF5F0] to-[#E2EFE7] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#3F6A4C] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-[#4E7357]/15 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Package className="h-4 w-4" />Mark completed
              </button>
              <button
                disabled={busy}
                onClick={() => setConfirm({ appointment, kind: 'cancel' })}
                className="inline-flex items-center gap-2 rounded-full border border-[#E6C8C2] bg-gradient-to-r from-[#FDF0ED] to-[#F9E0D9] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8F4E3E] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-[#9E5B4B]/15 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="h-4 w-4" />Cancel
              </button>
            </div>
            </div>
          </article>
        );
      })}
      {target && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          {APX_MOTION}
          <button
            onClick={() => { setClosing(true); setTimeout(() => setTarget(null), 200); }}
            aria-label="Close reschedule"
            className={`absolute inset-0 bg-[#1F1916]/55 backdrop-blur-md ${closing ? 'apx-fade-out' : 'apx-fade'}`}
          />
          <form
            onSubmit={(e) => { e.preventDefault(); handleRescheduleSubmit(); }}
            className={`apx-scroll relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-[#E2D7C7]/90 bg-gradient-to-b from-[#FFFCF8] to-[#FAF5EC] p-5 pb-8 shadow-[0_40px_90px_-30px_rgba(31,25,22,0.55)] sm:rounded-2xl sm:p-7 ${closing ? 'apx-pop-out' : 'apx-pop'}`}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#8C6F3E] via-[#C9A15C] to-[#8C6F3E] sm:rounded-t-2xl" />
            <button
              type="button"
              onClick={closeReschedule}
              className="absolute right-4 top-4 rounded-full border border-[#E8DFD3] bg-white/80 p-2 text-[#766A62] transition-all duration-300 hover:rotate-90 hover:border-[#D9C8B7] hover:text-[#2A211D] hover:shadow-md"
            ><X className="h-4 w-4" /></button>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#A46B48] to-[#8C6F3E] text-white shadow-lg shadow-[#A46B48]/30"><CalendarClock className="h-4 w-4" /></span>
              <div>
                <Label>Front Desk decision</Label>
                <h2 className="mt-0.5 text-2xl text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>Reschedule visit</h2>
              </div>
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-[#8C7E74]">
              Only the date, time and notes can change. Customer, job card, visit type and assigned tailor belong to the
              job card and stay locked.
            </p>
            {rescheduleError && (
              <div role="alert" className="apx-fade mt-4 flex items-start gap-2.5 rounded-xl border border-[#C86A58]/30 bg-gradient-to-r from-[#FDF4F2] to-[#FBEAE6] px-4 py-3 text-sm text-[#9A3B2A] shadow-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />{rescheduleError}
              </div>
            )}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ['Customer', target.customer_name || '—'],
                ['Job card', target.job_card_id || '—'],
                ['Appointment type', target.appointment_type],
                ['Assigned tailor', target.assigned_tailor_name || 'Unassigned'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-[#E8DFD3] bg-[#F8F3EB] p-3 transition-all duration-300 hover:border-[#D9C8B7]">
                  <Label>{label}</Label>
                  <div className="mt-1 truncate text-[13px] font-medium text-[#5E5048]" title={String(value)}>{value}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <Label>New date</Label>
                <input type="date" min={new Date().toISOString().split('T')[0]} value={date} onChange={(e) => { setDate(e.target.value); setReviewNew(false); }} className={APX_INPUT} />
              </label>
              <label className="block">
                <Label>New time</Label>
                <input type="time" step={1800} value={time} onChange={(e) => { setTime(e.target.value); setReviewNew(false); }} className={APX_INPUT} />
              </label>
            </div>
            <label className="mt-3 block">
              <Label>Notes</Label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={`${APX_INPUT} resize-none`} />
            </label>
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-[#8C7E74]"><Clock className="h-3.5 w-3.5 text-[#A46B48]" /> Visits run Monday–Saturday, 9:00 AM–6:00 PM, in 30-minute slots. The shop is closed on Sundays.</p>

            {/* Step 2 of the two-step submit: the Front Desk sees the exact slot
                before it is committed, so an accidental save is impossible. */}
            {reviewNew && previewDate && (
              <div className="apx-rise mt-4 overflow-hidden rounded-xl border border-[#BCD4C6] bg-gradient-to-r from-[#F2F8F4] to-[#E7F1EA] shadow-sm">
                <div className="flex flex-wrap items-center gap-3 border-l-[3px] border-[#4E7357] px-4 py-3">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#4E7357] to-[#3C5C44] text-white shadow-lg shadow-[#4E7357]/25">
                    <CalendarCheck className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <Label>Confirm new schedule</Label>
                    <div className="mt-0.5 text-[13px] font-semibold text-[#2A211D]">
                      {previewDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} · {time.slice(0, 5)}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#CFE2D6] bg-white/60 px-4 py-2.5">
                  <span className="text-[11px] leading-relaxed text-[#3F6A4C]">
                    Was {target.appointment_date ? new Date(target.appointment_date).toLocaleDateString() : '—'} · {(target.appointment_time || '').slice(0, 5)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setReviewNew(false)}
                    className="rounded-full border border-[#BCD4C6] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#3F6A4C] transition-all duration-300 hover:-translate-y-px hover:shadow-md"
                  >
                    Edit slot
                  </button>
                </div>
              </div>
            )}

            <div className="mt-5 flex flex-wrap justify-end gap-2.5">
              <button
                type="button"
                onClick={closeReschedule}
                disabled={saving}
                className="rounded-xl border border-[#E2D7C7] bg-white px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5E5048] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#D9C8B7] hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
              >Keep current</button>
              <button
                type="submit"
                disabled={saving}
                className="apx-sheen inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2A211D] to-[#4A382A] px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white shadow-lg shadow-[#2A211D]/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? <Loader2 className="apx-spin h-4 w-4" /> : <Check className="h-4 w-4" />}
                {saving ? 'Saving…' : reviewNew ? 'Confirm & save' : 'Save new schedule'}
              </button>
            </div>
          </form>
        </div>
      )}
      {confirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button onClick={() => setConfirm(null)} aria-label="Dismiss confirmation" className="apx-fade absolute inset-0 bg-[#1F1916]/55 backdrop-blur-md" />
          <div className="apx-pop relative w-full max-w-sm rounded-2xl border border-[#E2D7C7]/90 bg-gradient-to-b from-[#FFFCF8] to-[#FAF5EC] p-6 shadow-[0_40px_90px_-30px_rgba(31,25,22,0.55)]">
            <div className="flex items-start gap-3">
              <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white shadow-lg ${confirm.kind === 'cancel' ? 'bg-gradient-to-br from-[#A46B48] to-[#9E5B4B] shadow-[#9E5B4B]/30' : 'bg-gradient-to-br from-[#4E7357] to-[#3C5C44] shadow-[#4E7357]/30'}`}>
                {confirm.kind === 'cancel' ? <X className="h-5 w-5" /> : <PackageCheck className="h-5 w-5" />}
              </span>
              <div>
                <h3 className="text-lg text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>
                  {confirm.kind === 'cancel' ? 'Cancel this visit?' : 'Mark this visit completed?'}
                </h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#766A62]">
                  {confirm.kind === 'cancel'
                    ? `${confirm.appointment.customer_name || 'The customer'}'s ${confirm.appointment.appointment_type} on ${new Date(confirm.appointment.appointment_date).toLocaleDateString()} will be cancelled and both parties notified. The visit stays visible in history.`
                    : `${confirm.appointment.customer_name || 'The customer'}'s ${confirm.appointment.appointment_type} will be recorded as attended.`}
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                onClick={() => setConfirm(null)}
                className="rounded-xl border border-[#E2D7C7] bg-white px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5E5048] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
              >Go back</button>
              <button
                disabled={busyId === confirm.appointment.appointment_id}
                onClick={() => { const target = confirm.appointment; const kind = confirm.kind; setConfirm(null); if (kind === 'cancel') onCancel(target); else onComplete(target); }}
                className={`apx-sheen inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 ${confirm.kind === 'cancel' ? 'bg-gradient-to-r from-[#9E5B4B] to-[#8F4E3E] shadow-[#9E5B4B]/25' : 'bg-gradient-to-r from-[#4E7357] to-[#3C5C44] shadow-[#4E7357]/25'}`}
              >
                {busyId === confirm.appointment.appointment_id && <Loader2 className="apx-spin h-4 w-4" />}
                {confirm.kind === 'cancel' ? 'Yes, cancel it' : 'Yes, complete it'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

type DeskTab = 'overview' | 'pending' | 'schedule' | 'calendar' | 'analytics';
type ScheduleFilter = 'All' | 'Today' | 'Upcoming' | 'Completed' | 'Cancelled';

/** A compact month view keeps the day plan separate from the actionable list. */
function AppointmentMonth({ appointments, onSelect }: { appointments: Appointment[]; onSelect: (appointment: Appointment) => void }) {
  const month = new Date();
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const leading = first.getDay();
  const cells = Array.from({ length: leading + days }, (_, index) => index < leading ? null : index - leading + 1);
  const byDay = (day: number) => appointments.filter((a) => {
    const d = new Date(`${a.appointment_date}T00:00:00`);
    return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth() && d.getDate() === day;
  });
  const today = new Date();
  return (
    <section className="dash-in overflow-hidden rounded-2xl border border-[#EDE4D8] bg-gradient-to-b from-white to-[#FCFAF6] shadow-[0_20px_48px_-28px_rgba(42,33,29,0.34)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0EAE2] p-5 sm:p-6">
        <div><Label>Daily schedule</Label><h2 className="mt-0.5 text-2xl text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2></div>
        <span className="rounded-full border border-[#ECD8A7] bg-[#FFF7E3] px-3 py-1 text-[10px] font-semibold text-[#8A6618]">{appointments.length} live visits</span>
      </div>
      <div className="grid grid-cols-7 border-l border-t border-[#F0EAE2]">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="border-b border-r border-[#F0EAE2] bg-[#FCFAF7] px-2 py-2 text-center text-[9px] uppercase tracking-[.14em] text-[#8C7E74]">{day}</div>)}
        {cells.map((day, index) => {
          const visits = day ? byDay(day) : [];
          const isToday = day && today.getFullYear() === month.getFullYear() && today.getMonth() === month.getMonth() && today.getDate() === day;
          return <div key={index} className={`min-h-24 border-b border-r border-[#F0EAE2] p-1.5 sm:min-h-32 sm:p-2 ${day ? 'bg-white' : 'bg-[#FCFAF7]/60'}`}>
            {day && <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${isToday ? 'bg-[#8C6F3E] font-semibold text-white' : 'text-[#5E5048]'}`}>{day}</span>}
            <div className="mt-1 space-y-1">{visits.slice(0, 3).map(a => <button key={a.appointment_id} onClick={() => onSelect(a)} className="block w-full truncate rounded-md bg-[#F8F3EB] px-1.5 py-1 text-left text-[9px] text-[#5E5048] transition hover:bg-[#FFF0CF]" title={`${a.customer_name} · ${a.appointment_time}`}>{(a.appointment_time || '').slice(0, 5)} {a.customer_name}</button>)}{visits.length > 3 && <div className="px-1 text-[9px] text-[#8A6618]">+{visits.length - 3} more</div>}</div>
          </div>;
        })}
      </div>
    </section>
  );
}

export function FrontDeskAppointmentsView() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<DeskTab>('overview');
  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>('All');
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorPreset, setEditorPreset] = useState<{ customerId: string; orderId: string; appointmentType?: string; customerName?: string; jobCardId?: string } | null>(null);
  const [notice, setNotice] = useState('');
  const [noticeKind, setNoticeKind] = useState<'ok' | 'error'>('ok');
  const [loading, setLoading] = useState(true);
  // PENDING APPOINTMENT APPROVALS: visits the system suggested when a job
  // card reached a production milestone, waiting for a Front Desk decision.
  const [pending, setPending] = useState<Appointment[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [details, setDetails] = useState<Appointment | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  // Guards the details fetch so a slow response can never overwrite a newer
  // request or re-open a modal the user already dismissed.
  const detailsRequestRef = useRef(0);
  // Transient banner messages. A single timer handle per message means a
  // fast-following notice can never be cleared early by the previous timeout.
  const noticeTimerRef = useRef<number | null>(null);
  const flash = useCallback((message: string, kind: 'ok' | 'error' = 'ok', ttl = 4000) => {
    setNotice(message);
    setNoticeKind(kind);
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice(''), ttl);
  }, []);

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
      flash('Failed to load appointment data. Please check your connection and try again.', 'error', 5000);
    } finally {
      setLoading(false);
    }
  }, [flash]);

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

  const searchedAppointments = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return visibleAppointments;
    // Same records, richer matching: customer, job card, visit type, reference
    // number, garment, tailor, notes and the formatted date all resolve.
    return visibleAppointments.filter((a) => {
      const haystack = [
        a.customer_name,
        a.job_card_id,
        a.appointment_type,
        a.appointment_number,
        a.garment,
        a.assigned_tailor_name,
        a.notes,
        a.status,
        a.appointment_date,
        a.appointment_date ? new Date(a.appointment_date).toLocaleDateString() : '',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [visibleAppointments, query]);

  const filtered = useMemo(() => {
    const todayString = new Date().toISOString().split('T')[0];
    if (scheduleFilter === 'Today') return searchedAppointments.filter(a => a.appointment_date === todayString);
    if (scheduleFilter === 'Upcoming') return searchedAppointments.filter(a => a.status !== 'Completed' && a.status !== 'Cancelled');
    if (scheduleFilter === 'Completed') return searchedAppointments.filter(a => a.status === 'Completed');
    if (scheduleFilter === 'Cancelled') return searchedAppointments.filter(a => a.status === 'Cancelled');
    return searchedAppointments;
  }, [searchedAppointments, scheduleFilter]);

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
    flash(`Exception visit scheduled for ${created.customer_name || 'the customer'} (${jobCardNumber}).`);
    await loadData();
  };

  const handleCompleteAppointment = async () => {
    if (!selected) return;
    try {
      const updated = await frontDeskApi.completeAppointment(selected.appointment_id);
      setAppointments(prev => prev.map(a => a.appointment_id === updated.appointment_id ? updated : a));
      setSelected(updated);
      flash(`${updated.customer_name || 'The customer'} — ${updated.appointment_type} visit marked completed.`);
      await loadData();
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Failed to complete the visit.', 'error', 5000);
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
      flash(`${updated.appointment_type} for ${updated.customer_name || 'the customer'} approved. The customer and ${updated.assigned_tailor_name || 'the assigned tailor'} were notified.`);
      await loadData();
    } catch (err) {
      flash(err instanceof Error ? err.message : 'The visit could not be approved.', 'error', 5000);
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (appointment: Appointment) => {
    setBusyId(appointment.appointment_id);
    try {
      const updated = await frontDeskApi.cancelAppointment(appointment.appointment_id, 'Cancelled at the Front Desk.');
      applyDecision(updated);
      flash(`${updated.appointment_type} for ${updated.customer_name || 'the customer'} was cancelled. Both parties were notified.`);
      await loadData();
    } catch (err) {
      flash(err instanceof Error ? err.message : 'The visit could not be cancelled.', 'error', 5000);
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkCompleted = async (appointment: Appointment) => {
    setBusyId(appointment.appointment_id);
    try {
      const updated = await frontDeskApi.completeAppointment(appointment.appointment_id);
      applyDecision(updated);
      flash(`${updated.appointment_type} for ${updated.customer_name || 'the customer'} was marked completed.`);
      await loadData();
    } catch (err) {
      flash(err instanceof Error ? err.message : 'The visit could not be completed.', 'error', 5000);
    } finally {
      setBusyId(null);
    }
  };

  const handleRescheduleDecision = async (appointment: Appointment, data: { appointmentDate: string; appointmentTime: string; notes: string }) => {
    setBusyId(appointment.appointment_id);
    try {
      const updated = await frontDeskApi.rescheduleAppointment(appointment.appointment_id, data);
      applyDecision(updated);
      flash(`${updated.appointment_type} for ${updated.customer_name || 'the customer'} moved to ${data.appointmentDate} ${data.appointmentTime}. The customer and ${updated.assigned_tailor_name || 'the assigned tailor'} were notified.`, 'ok', 4500);
      await loadData();
    } catch (err) {
      flash(err instanceof Error ? err.message : 'The visit could not be rescheduled.', 'error', 5000);
    } finally {
      setBusyId(null);
    }
  };

  const handleViewDetails = async (appointment: Appointment) => {
    const request = ++detailsRequestRef.current;
    setBusyId(appointment.appointment_id);
    setDetailsLoading(true);
    try {
      const data = await frontDeskApi.getAppointmentDetails(appointment.appointment_id);
      // Only the newest request may publish — keeps the modal free of stale data.
      if (detailsRequestRef.current === request) setDetails(data);
    } catch (err) {
      if (detailsRequestRef.current === request) {
        flash(err instanceof Error ? err.message : 'The appointment details could not be loaded.', 'error', 5000);
      }
    } finally {
      if (detailsRequestRef.current === request) {
        setBusyId(null);
        setDetailsLoading(false);
      }
    }
  };

  const closeDetails = () => {
    detailsRequestRef.current += 1;
    setDetails(null);
    setDetailsLoading(false);
  };

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        {APX_MOTION}
        <span className="apx-float flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2A211D] to-[#4A382A] text-white shadow-xl shadow-[#2A211D]/25">
          <Scissors className="h-6 w-6" />
        </span>
        <div className="flex items-center gap-2.5 text-sm text-[#8C7E74]">
          <Loader2 className="apx-spin h-4 w-4 text-[#8C6F3E]" />
          Preparing the appointments desk…
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {APX_MOTION}
      {/* ——— Hero ——— */}
      <header className="dash-in relative overflow-hidden rounded-2xl border border-[#E2D7C7] bg-[#FFFCF8] p-6 shadow-[0_22px_44px_-28px_rgba(42,33,29,0.32)] sm:p-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#8C6F3E] via-[#C9A15C] to-[#8C6F3E]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-[#E5C98F] bg-[#FFF7E3] text-[#8A6618] shadow-inner">
                <Scissors className="h-5 w-5" />
              </span>
              <div>
                <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.22em] text-[#8C7E74]" style={{ fontFamily: "'Space Mono', monospace" }}>
                  <span className="h-px w-6 bg-gradient-to-r from-[#C9A15C] to-transparent" />
                  Appointment approvals
                </div>
                <h1 className="mt-1.5 text-3xl leading-tight text-[#2A211D] sm:text-4xl" style={{ fontFamily: "'DM Serif Display', serif" }}>
                  Appointments Desk
                </h1>
              </div>
            </div>
            <p className="mt-3.5 max-w-2xl text-[13px] leading-relaxed text-[#5E5048]">
              Front Desk approves, reschedules or cancels the visits the workshop suggests when a job card reaches a fitting or pickup milestone.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#E2D7C7] bg-white px-3.5 py-1.5 text-[11px] font-medium text-[#5E5048]">
                <CalendarClock className="h-3.5 w-3.5 text-[#8C6F3E]" />
                {today.length} visit{today.length === 1 ? '' : 's'} today
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#E2D7C7] bg-white px-3.5 py-1.5 text-[11px] font-medium text-[#5E5048]">
                <TrendingUp className="h-3.5 w-3.5 text-[#8C6F3E]" />
                {visibleAppointments.filter((a) => a.status !== 'Completed' && a.status !== 'Cancelled').length} upcoming
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#E5C98F] bg-[#FFF7E3] px-3.5 py-1.5 text-[11px] font-medium text-[#7E5C12]">
                <span className="apx-ring h-1.5 w-1.5 rounded-full bg-[#B89255]" />
                {pending.length} awaiting approval
              </span>
            </div>
          </div>
          <button
            onClick={() => { setEditorPreset(null); setEditorOpen(true); }}
            className="apx-sheen group inline-flex w-full flex-shrink-0 items-center justify-center gap-2.5 rounded-2xl border border-[#2A211D] bg-[#2A211D] px-6 py-3.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#FFFCF8] shadow-lg shadow-[#2A211D]/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#4A382A] hover:shadow-xl active:translate-y-0 lg:w-auto"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#F5C96A] to-[#B96B24] text-white shadow-md transition-transform duration-300 group-hover:rotate-90">
              <Plus className="h-3.5 w-3.5" />
            </span>
            Manual exception appointment
          </button>
        </div>
      </header>

      {notice && (
        <div
          role={noticeKind === 'error' ? 'alert' : 'status'}
          className={`apx-fade flex items-start gap-2.5 rounded-2xl border px-4 py-3.5 text-sm shadow-[0_10px_30px_-14px_rgba(42,33,29,0.28)] ${
            noticeKind === 'error'
              ? 'border-[#C86A58]/40 bg-gradient-to-r from-[#FDF4F2] to-[#FBEAE6] text-[#9A3B2A]'
              : 'border-[#8B9E87]/40 bg-gradient-to-r from-[#F1F5F0] to-[#E9F0E9] text-[#3F6A4C]'
          }`}
        >
          <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-white shadow-sm ${noticeKind === 'error' ? 'bg-gradient-to-br from-[#A46B48] to-[#8F4E3E]' : 'bg-gradient-to-br from-[#4E7357] to-[#3C5C44]'}`}>
            {noticeKind === 'error' ? <AlertCircle className="h-3 w-3" /> : <Check className="h-3 w-3" />}
          </span>
          {notice}
        </div>
      )}

      {/* PENDING APPOINTMENT APPROVALS — production milestone suggestions. */}
      <nav aria-label="Appointment desk workflow" className="dash-in sticky top-2 z-20 flex gap-1 overflow-x-auto rounded-2xl border border-[#E8DFD3] bg-white/95 p-1.5 shadow-sm backdrop-blur">
        {([
          ['overview', 'Overview', BarChart3], ['pending', 'Pending Approvals', Sparkles], ['schedule', 'Schedule', CalendarClock], ['calendar', 'Calendar', CalendarCheck], ['analytics', 'Analytics', TrendingUp],
        ] as const).map(([id, label, Icon]) => <button key={id} onClick={() => setActiveTab(id)} className={`inline-flex min-w-max flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[.1em] transition-all sm:px-4 ${activeTab === id ? 'bg-gradient-to-r from-[#2A211D] to-[#4A382A] text-white shadow-md' : 'text-[#766A62] hover:bg-[#F8F3EB] hover:text-[#2A211D]'}`}><Icon className="h-3.5 w-3.5" /> {label}{id === 'pending' && pending.length ? <span className="rounded-full bg-[#C9A15C] px-1.5 py-0.5 text-[9px] text-white">{pending.length}</span> : null}</button>)}
      </nav>

      {activeTab === 'pending' && <PendingApprovals
        items={pending}
        busyId={busyId}
        onApprove={handleApprove}
        onReschedule={handleRescheduleDecision}
        onCancel={handleCancel}
        onComplete={handleMarkCompleted}
        onViewDetails={handleViewDetails}
      />}

      {activeTab === 'overview' && <>
      <div className="dash-in grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <Metric label="Suggested" value={pending.length} icon={<Sparkles className="h-4 w-4" strokeWidth={1.6} />} accent="gold" />
        <Metric label="Approved" value={visibleAppointments.filter(a => a.status === 'Approved' || a.status === 'Confirmed' || a.status === 'Scheduled').length} icon={<Check className="h-4 w-4" strokeWidth={1.6} />} tone="good" accent="green" />
        <Metric label="Rescheduled" value={visibleAppointments.filter(a => a.status === 'Rescheduled').length} icon={<CalendarClock className="h-4 w-4" strokeWidth={1.6} />} accent="gold" />
        <Metric label="Completed" value={visibleAppointments.filter(a => a.status === 'Completed').length} icon={<Package className="h-4 w-4" strokeWidth={1.6} />} tone="good" accent="green" />
        <Metric label="Cancelled" value={visibleAppointments.filter(a => a.status === 'Cancelled').length} icon={<X className="h-4 w-4" strokeWidth={1.6} />} accent="clay" />
        <Metric label="Today's fittings" value={today.length} icon={<CalendarClock className="h-4 w-4" strokeWidth={1.6} />} accent="gold" />
        <Metric label="Confirmed" value={visibleAppointments.filter(a => a.status === 'Confirmed').length} icon={<Check className="h-4 w-4" strokeWidth={1.6} />} tone="good" accent="green" />
        <Metric label="Upcoming" value={visibleAppointments.filter(a => a.status !== 'Completed' && a.status !== 'Cancelled').length} icon={<Sparkles className="h-4 w-4" strokeWidth={1.6} />} accent="gold" />
      </div>
      <section className="dash-in rounded-2xl border border-[#EDE4D8] bg-gradient-to-b from-white to-[#FCFAF6] p-5 shadow-[0_20px_48px_-28px_rgba(42,33,29,0.34)] sm:p-6">
        <div className="flex items-center justify-between gap-3"><div><Label>Recent appointments</Label><h2 className="mt-0.5 text-2xl text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>Today’s desk at a glance</h2></div><button onClick={() => setActiveTab('schedule')} className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#8C6F3E] hover:text-[#2A211D]">Open schedule →</button></div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{visibleAppointments.slice(0, 6).map(a => <button key={a.appointment_id} onClick={() => setSelected(a)} className="flex items-center gap-3 rounded-xl border border-[#EFE7DB] bg-white p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md"><span className="rounded-lg bg-[#F8F3EB] px-2 py-1 text-[10px] text-[#8A6618]">{(a.appointment_time || '--:--').slice(0, 5)}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[#2A211D]">{a.customer_name || 'Customer'}</span><span className="block truncate text-[11px] text-[#8C7E74]">{a.job_card_id} · {a.appointment_type}</span></span><ChevronRight className="h-4 w-4 text-[#C9BBA6]" /></button>)}</div>
      </section>
      </>}

      {activeTab === 'analytics' && <section className="dash-in apx-sheen dash-card relative overflow-hidden rounded-2xl p-6 sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#C9A15C]/10 blur-3xl" />
        <div className="relative mb-1 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#8C6F3E] to-[#A46B48] text-white shadow-lg shadow-[#8C6F3E]/25">
                <BarChart3 className="h-4 w-4" />
              </span>
              <div>
                <Label>Appointment pipeline</Label>
                <h2 className="mt-0.5 text-xl font-normal text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>Live visits by type</h2>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {stageChart.map((entry, i) => (
                <span key={entry.stage} className="inline-flex items-center gap-1.5 rounded-full border border-[#E8DFD3] bg-white px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#5E5048] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
                  <span className="h-2 w-2 rounded-full" style={{ background: STAGE_CHART_COLORS[i % STAGE_CHART_COLORS.length] }} />
                  {entry.stage} · {entry.count}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-shrink-0 flex-col items-start gap-2 sm:items-end">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C7DDD3] bg-gradient-to-r from-[#F1F5F0] to-[#E7EFE9] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#3F6A4C] shadow-sm">
              <TrendingUp className="w-3.5 h-3.5" /> {visibleAppointments.length} total
            </span>
            <span className="apx-slide-in inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full border border-[#ECD8A7] bg-gradient-to-r from-[#FFF7E3] to-[#FBEDCB] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8A6618] shadow-sm" style={{ animationDelay: '140ms' }}>
              <span className="apx-ring h-1.5 w-1.5 rounded-full bg-[#B89255]" />
              {typeCounts['First Fitting'] || 0} fitting
              <span className="text-[#C9BBA6]">|</span>
              {typeCounts['Final Fitting'] || 0} final
              <span className="text-[#C9BBA6]">|</span>
              {typeCounts['Pickup'] || 0} pickup
            </span>
          </div>
        </div>
        <p className="mb-5 mt-2 text-[12.5px] text-[#8C7E74]">Each visit exists because the workshop reached that production milestone</p>
        <div className="apx-fade relative h-40 rounded-xl border border-[#F0EAE2] bg-white/70 p-2 shadow-inner sm:h-52">
          <div className="-ml-2 h-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stageChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                {stageChart.map((entry, i) => (
                  <linearGradient key={entry.stage} id={`apxBar${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={STAGE_CHART_COLORS[(i + 1) % STAGE_CHART_COLORS.length]} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={STAGE_CHART_COLORS[i % STAGE_CHART_COLORS.length]} stopOpacity={0.55} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} stroke="#a17d51" strokeDasharray="3 4" />
              <XAxis dataKey="stage" tickLine={false} axisLine={false} tick={{ fill: '#A3958B', fontSize: 10.5, fontFamily: 'Space Mono, monospace' }} />
              <YAxis hide allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#cf912e' }} />
              <Bar dataKey="count" radius={[7, 7, 0, 0]} maxBarSize={40} animationDuration={900} animationEasing="ease-out">
                {stageChart.map((entry, i) => <Cell key={entry.stage} fill={`url(#apxBar${i})`} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          </div>
        </div>
      </section>}

      {activeTab === 'calendar' && <AppointmentMonth appointments={visibleAppointments.filter(a => a.status !== 'Cancelled')} onSelect={setSelected} />}

      {activeTab === 'schedule' && <>
      {/* Schedule — searchable and filterable appointment list. */}
      <section className="dash-in relative overflow-hidden rounded-2xl border border-[#EDE4D8] bg-gradient-to-b from-white to-[#FCFAF6] shadow-[0_20px_48px_-28px_rgba(42,33,29,0.34)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#8C6F3E] via-[#C9A15C] to-[#8C6F3E]" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-52 w-52 rounded-full bg-[#C9A15C]/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 border-b border-[#F0EAE2] bg-gradient-to-r from-[#FFFCF8] via-white to-[#FCFAF6] p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#2A211D] to-[#4A382A] text-white shadow-lg shadow-[#2A211D]/25">
                <CalendarClock className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Label>Daily schedule</Label>
                  <span className="rounded-full border border-[#ECD8A7] bg-gradient-to-r from-[#FFF7E3] to-[#FBEDCB] px-2 py-0.5 text-[10px] font-semibold text-[#8A6618] shadow-sm sm:hidden" style={{ fontFamily: "'Space Mono', monospace" }}>
                    {filtered.length}
                  </span>
                </div>
                <h2 className="mt-0.5 text-xl text-[#2A211D] sm:text-2xl" style={{ fontFamily: "'DM Serif Display', serif" }}>Appointment list</h2>
              </div>
            </div>
            <p className="mt-3 max-w-xl text-[12.5px] leading-relaxed text-[#8C7E74]">
              Search the live calendar, then open any visit for its job card, fitting stage and decision history.
            </p>
          </div>

          <div className="relative w-full flex-shrink-0 lg:max-w-md">
            <span className="pointer-events-none absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-[#C9A15C]/0 via-[#C9A15C]/30 to-[#8C6F3E]/0 opacity-0 blur-[3px] transition-opacity duration-500 focus-within:opacity-100" />
            <Search className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#A3958B] transition-colors duration-300" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search customer, job card, stage or date…"
              className="relative w-full rounded-2xl border border-[#E8DFD3] bg-white/75 py-3 pl-10 pr-12 text-sm text-[#2A211D] outline-none backdrop-blur-md transition-all duration-300 placeholder:text-[#B7A99C] hover:border-[#D9C8B7] focus:border-[#A46B48] focus:bg-white focus:shadow-[0_0_0_4px_rgba(164,107,72,0.12),0_18px_34px_-20px_rgba(164,107,72,0.6)] sm:pl-11 sm:pr-36"
            />
            {/* Trail controls sit in a flex row, so the clear button and the
                visit counter can never overlap at any viewport width. */}
            <span className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="rounded-full border border-[#E8DFD3] bg-white p-1 text-[#8C7E74] transition-all duration-300 hover:rotate-90 hover:text-[#2A211D] hover:shadow-md"
                >
                  <X className="h-3 w-3" />
                </button>
              ) : null}
              <span className="hidden rounded-full border border-[#ECD8A7] bg-gradient-to-r from-[#FFF7E3] to-[#FBEDCB] px-2.5 py-1 text-[10px] font-semibold text-[#8A6618] shadow-sm sm:inline-flex" style={{ fontFamily: "'Space Mono', monospace" }}>
                {filtered.length} visit{filtered.length === 1 ? '' : 's'}
              </span>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-[#F0EAE2] bg-[#FCFAF7]/70 px-5 py-3 sm:px-6">
          {(['All', 'Today', 'Upcoming', 'Completed', 'Cancelled'] as ScheduleFilter[]).map(filter => (
            <button key={filter} onClick={() => setScheduleFilter(filter)} className={`rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.1em] transition ${scheduleFilter === filter ? 'bg-[#8C6F3E] text-white shadow-sm' : 'border border-[#E8DFD3] bg-white text-[#766A62] hover:border-[#C9A15C]'}`}>{filter}</button>
          ))}
        </div>
        <div className="relative grid gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">

        {filtered.map((appointment, idx) => {
          const busy = busyId === appointment.appointment_id;
          const when = appointment.appointment_date ? new Date(appointment.appointment_date) : null;
          const validDate = when && Number.isFinite(when.getTime());
          return (
            <button
              key={appointment.appointment_id}
              onClick={() => setSelected(appointment)}
              style={{ animationDelay: `${Math.min(idx * 45, 420)}ms` }}
              className="apx-rise apx-lift apx-sheen group relative overflow-hidden rounded-2xl border border-[#EDE4D8] bg-white p-4 text-left shadow-[0_10px_26px_-20px_rgba(42,33,29,0.45)] transition-all duration-300 hover:border-[#D9C8B7] hover:shadow-[0_26px_50px_-24px_rgba(42,33,29,0.42)] sm:p-5"
            >
              <span className="pointer-events-none absolute -right-14 -top-14 h-32 w-32 rounded-full bg-[#C9A15C]/14 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
              <span className="pointer-events-none absolute inset-y-0 left-0 w-1 origin-top scale-y-0 bg-gradient-to-b from-[#C9A15C] to-[#8C6F3E] transition-transform duration-500 group-hover:scale-y-100" />
              {busy && (
                <span className="absolute inset-0 z-10 flex items-center justify-center bg-white/65 backdrop-blur-[1px]">
                  <Loader2 className="apx-spin h-5 w-5 text-[#8C6F3E]" />
                </span>
              )}
              <div className="relative flex items-start gap-3.5">
                {/* Date card */}
                <div className="flex w-[62px] flex-shrink-0 flex-col items-center rounded-xl border border-[#EDE4D8] bg-gradient-to-b from-[#FCFAF6] to-[#F4EDE2] px-2 py-2.5 shadow-inner">
                  <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#A3958B]" style={{ fontFamily: "'Space Mono', monospace" }}>
                    {validDate ? when!.toLocaleDateString(undefined, { month: 'short' }) : '—'}
                  </span>
                  <span className="mt-0.5 text-[26px] leading-none text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>
                    {validDate ? when!.getDate() : '–'}
                  </span>
                  <span className="mt-1 rounded-full bg-white/80 px-1.5 py-0.5 text-[9.5px] font-medium text-[#766A62]" style={{ fontFamily: "'Space Mono', monospace" }}>
                    {(appointment.appointment_time || '').slice(0, 5) || '--:--'}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-semibold text-[#2A211D] transition-colors duration-300 group-hover:text-[#8C6F3E]">
                        {appointment.customer_name || 'Unknown customer'}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-[#8C7E74]">
                        <span className="inline-flex items-center gap-1.5">
                          <Package className="h-3 w-3 text-[#B89255]" />
                          <span className="font-semibold tracking-wide text-[#5E5048]">{appointment.job_card_id || '—'}</span>
                        </span>
                        {appointment.appointment_number ? (
                          <span style={{ fontFamily: "'Space Mono', monospace" }}>{appointment.appointment_number}</span>
                        ) : null}
                      </div>
                    </div>
                    <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#C9BBA6] transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-[#8C6F3E]" />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StageBadge type={appointment.appointment_type} />
                    <StatusBadge status={appointment.status as AppointmentStatus} />
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#8C7E74]">
                    <span className="inline-flex items-center gap-1.5">
                      <User className="h-3 w-3" />
                      {appointment.assigned_tailor_name || 'Unassigned tailor'}
                    </span>
                    {appointment.garment ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Ruler className="h-3 w-3" />
                        <span className="truncate">{appointment.garment}</span>
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </button>
          );
        })}

        {!filtered.length && (
          <div className="apx-fade col-span-full flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#E2D7C7] bg-[#FCFAF7]/70 p-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F8F3EB] to-[#EFE7DC] text-[#B89255] shadow-inner">
              <Search className="h-5 w-5" />
            </span>
            <p className="max-w-md text-sm leading-relaxed text-[#766A62]">
              No appointment matches your search. Try a customer name, job card number, fitting stage or date.
            </p>
          </div>
        )}
        </div>
        <p className="border-t border-[#F0EAE2] bg-[#FCFAF7]/60 px-6 py-3 text-[11px] leading-relaxed text-[#8C7E74]">
          Every visit below exists because the workshop reached a production milestone (First Fitting, Final Fitting or Pickup). Front Desk approves, reschedules, cancels or completes each one; nothing is booked by hand except documented exceptions.
        </p>
      </section>
      </>}

      {/* View Details — read-only, with the append-only decision history. */}
      {/* View Details — read-only, with the append-only decision history. */}
      {(details || detailsLoading) && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          {APX_MOTION}
          <button onClick={closeDetails} aria-label="Close details" className="apx-fade absolute inset-0 bg-[#1F1916]/55 backdrop-blur-md" />
          <section className="apx-pop apx-scroll relative max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-[#E2D7C7]/90 bg-gradient-to-b from-[#FFFCF8] to-[#FAF5EC] p-5 shadow-[0_40px_90px_-30px_rgba(31,25,22,0.55)] sm:rounded-2xl sm:p-7">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#8C6F3E] via-[#C9A15C] to-[#8C6F3E]" />
            <button onClick={closeDetails} aria-label="Close details" className="absolute right-4 top-4 z-10 rounded-full border border-[#E8DFD3] bg-white/85 p-2 text-[#766A62] transition-all duration-300 hover:rotate-90 hover:border-[#D9C8B7] hover:text-[#2A211D] hover:shadow-md"><X className="h-4 w-4" /></button>

            {detailsLoading && !details ? (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <span className="apx-float flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2A211D] to-[#4A382A] text-white shadow-xl shadow-[#2A211D]/25">
                  <Loader2 className="apx-spin h-6 w-6" />
                </span>
                <p className="text-sm text-[#8C7E74]">Loading appointment details…</p>
              </div>
            ) : details ? (
              <>
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8C6F3E] to-[#A46B48] text-white shadow-lg shadow-[#8C6F3E]/30">
                    <Ruler className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 pr-8">
                    <Label>Appointment details</Label>
                    <h2 className="mt-0.5 break-words text-2xl text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>
                      {details.appointment_number || `APT-${details.appointment_id}`}
                    </h2>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <StageBadge type={details.appointment_type} />
                      <StatusBadge status={details.status as AppointmentStatus} />
                    </div>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
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
                  ].map(([label, value], i) => (
                    <div
                      key={label}
                      style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
                      className="apx-rise rounded-xl border border-[#EFE7DB] bg-white px-3.5 py-3 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#E2D7C7] hover:shadow-md"
                    >
                      <Label>{label}</Label>
                      <div className="mt-1 break-words text-[13px] text-[#2A211D]">{value}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label>Decision history (read-only)</Label>
                    <span className="rounded-full border border-[#E8DFD3] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#5E5048] shadow-sm" style={{ fontFamily: "'Space Mono', monospace" }}>
                      {(details.history || []).length} recorded
                    </span>
                  </div>
                  <ol className="apx-scroll mt-2.5 max-h-64 space-y-2 overflow-y-auto pr-1">
                    {(details.history || []).map((h, i) => (
                      <li
                        key={i}
                        style={{ animationDelay: `${Math.min(i * 55, 330)}ms` }}
                        className="apx-slide-in relative rounded-xl border border-[#EFE7DB] bg-white py-3 pl-10 pr-4 text-[12.5px] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#E2D7C7] hover:shadow-md"
                      >
                        <span className="absolute left-4 top-4 h-2 w-2 rounded-full bg-gradient-to-br from-[#C9A15C] to-[#8C6F3E] shadow-[0_0_0_3px_rgba(201,161,92,0.18)]" />
                        <span className="font-semibold text-[#2A211D]">{h.from_status || 'Created'} {'\u2192'} {h.to_status}</span>
                        <span className="text-[#8C7E74]"> · {h.actor_name || 'System'}{h.created_at ? ` · ${new Date(h.created_at).toLocaleString()}` : ''}</span>
                        {h.notes ? <div className="mt-1 text-[12px] text-[#8C7E74]">{h.notes}</div> : null}
                      </li>
                    ))}
                    {!(details.history || []).length && (
                      <li className="rounded-xl border border-dashed border-[#E2D7C7] bg-[#FCFAF7]/70 px-4 py-6 text-center text-[12.5px] text-[#8C7E74]">
                        No decisions recorded yet.
                      </li>
                    )}
                  </ol>
                </div>
              </>
            ) : null}
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

/* Premium KPI accents — warm brown (primary), cream/gold (warning),
   elegant green (success) and refined clay-red (danger). */
const METRIC_ACCENTS: Record<string, { icon: string; glow: string; value: string; rail: string; dot: string }> = {
  default: { icon: 'from-[#8C6F3E] to-[#A46B48] shadow-[#8C6F3E]/35', glow: 'bg-[#8C6F3E]/16', value: 'text-[#5E5048]', rail: 'from-transparent via-[#C9BBA6] to-transparent', dot: 'bg-[#8C6F3E]' },
  gold: { icon: 'from-[#C9A15C] to-[#8A6618] shadow-[#B89255]/35', glow: 'bg-[#C9A15C]/20', value: 'text-[#7E5C12]', rail: 'from-[#ECD8A7] via-[#C9A15C] to-[#B89255]', dot: 'bg-[#B89255]' },
  green: { icon: 'from-[#5C8A6C] to-[#3C5C44] shadow-[#4E7357]/35', glow: 'bg-[#4E7357]/18', value: 'text-[#3F6A4C]', rail: 'from-[#B5D2C0] via-[#4E7357] to-[#3C5C44]', dot: 'bg-[#4E7357]' },
  clay: { icon: 'from-[#B0785A] to-[#8F4E3E] shadow-[#A46B48]/35', glow: 'bg-[#A46B48]/18', value: 'text-[#8F4E3E]', rail: 'from-[#DFB4AB] via-[#A46B48] to-[#8F4E3E]', dot: 'bg-[#A46B48]' },
  slate: { icon: 'from-[#9B8D82] to-[#6E625A] shadow-[#766A62]/30', glow: 'bg-[#766A62]/14', value: 'text-[#5E5048]', rail: 'from-[#E2D7C7] via-[#B7A99C] to-[#9B8D82]', dot: 'bg-[#9B8D82]' },
};

/** Premium KPI card: gradient rail, glowing icon tile and an animated value. */
function Metric({
  label,
  value,
  icon,
  tone = 'default',
  accent = 'default',
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
  tone?: 'default' | 'good';
  accent?: 'default' | 'gold' | 'green' | 'clay' | 'slate';
}) {
  const a = METRIC_ACCENTS[accent] || (tone === 'good' ? METRIC_ACCENTS.green : METRIC_ACCENTS.default);
  return (
    <div className="apx-metric apx-sheen group relative overflow-hidden rounded-2xl border border-[#EDE4D8] bg-gradient-to-b from-white to-[#FCFAF6] p-3.5 shadow-[0_12px_30px_-22px_rgba(42,33,29,0.45)] hover:border-[#E2D7C7] hover:shadow-[0_26px_50px_-24px_rgba(42,33,29,0.42)] sm:p-5">
      <span className={`pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full opacity-70 blur-2xl transition-opacity duration-500 group-hover:opacity-100 ${a.glow}`} />
      <span className={`pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${a.rail}`} />
      <div className="relative flex items-start gap-3 sm:gap-3.5">
        <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br sm:h-11 sm:w-11 ${a.icon} text-white shadow-lg transition-transform duration-500 group-hover:rotate-3 group-hover:scale-105`}>
          {icon}
        </span>
        <div className="min-w-0">
          <div key={value} className={`apx-num text-[24px] leading-none tabular-nums sm:text-[31px] ${a.value}`} style={{ fontFamily: "'DM Serif Display', serif" }}>
            {value}
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${a.dot}`} />
            <span className="text-[9px] uppercase leading-tight tracking-[0.06em] text-[#8C7E74] sm:text-[10px] sm:tracking-[0.18em]" style={{ fontFamily: "'Space Mono', monospace" }}>{label}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FrontDeskAppointmentsView;
