// @ts-nocheck
/* ===================================================================
   PRESS & TAILOR — Master Tailor / Cutter Staff — Job Card Workbench
   Full production workflow wired to the /api/tailor REST API:
   assigned job cards (search/filter/sort/pagination), job card detail,
   measurement verification, production timeline (append-only audit
   trail), pattern cutting, fabric usage + inventory deduction,
   assembly, fittings, alterations, quality control, and completion.
=================================================================== */
import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronRight, ChevronDown, ArrowRight, X, Search, Scissors, Boxes, ClipboardCheck, Ruler, Clock, TrendingUp, Shirt, AlertTriangle, RotateCcw } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';

const TOKENS = {
  ink: '#262420', inkSoft: '#55503F', paper: '#FBF9F2', paperDim: '#F4F1E6',
  line: '#DCD8C7', lineSoft: '#E8E4D5', muted: '#8A846F', muted2: '#A39D8A',
  brass: '#C9A227', brassLight: '#E4C25E', pin: '#C0392B', green: '#3F6633',
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const authToken = () => localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';
const STAGES = ['Measuring', 'Pattern Cutting', 'Initial Assembly', 'First Fitting', 'Final Alterations', 'Quality Review', 'Completed', 'Ready for Pickup'];
const PRIORITY_TONE: Record<string, string> = { High: '#A32E22', Normal: '#C9A227', Low: '#3F6633' };

async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}`, ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Request failed.');
  return data;
}

/* Walk-in shop policy: the bench shows ONLY job cards assigned to this tailor,
   read live from MySQL. There is deliberately no seed/demo card set — if the
   API is unreachable the workbench reports the failure and offers a retry
   instead of showing fictional customers or job cards. */

/* ---------------- visual primitives ---------------- */
function Grain({ opacity = 0.5 }) {
  return <div className="pointer-events-none absolute inset-0 mix-blend-multiply" style={{ filter: 'url(#paperGrain)', opacity }} aria-hidden="true" />;
}
function GrainDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true">
      <filter id="paperGrain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" result="noise" />
        <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0.16  0 0 0 0 0.14  0 0 0 0 0.11  0 0 0 0.5 0" />
      </filter>
    </svg>
  );
}
function Notch({ className = '' }) {
  return (
    <span className={`absolute w-2.5 h-2.5 ${className}`} aria-hidden="true"
      style={{ background: 'linear-gradient(135deg, #FBF9F2 0%, #FBF9F2 46%, rgba(201,162,39,0.35) 48%, transparent 50%)', clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
  );
}
function TapeDivider() {
  return (
    <div className="flex items-end gap-[3px] h-2.5" aria-hidden="true">
      {Array.from({ length: 26 }).map((_, i) => (
        <span key={i} className="w-px bg-[#C9C4AE]" style={{ height: i % 5 === 0 ? '100%' : i % 2 === 0 ? '60%' : '35%' }} />
      ))}
    </div>
  );
}
function Label({ children, className = '' }) {
  return <span className={`text-[10px] font-medium uppercase leading-none tracking-[0.2em] text-[#8A846F] ${className}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>{children}</span>;
}
function Info({ label, value }) {
  return (
    <div className="jc-lift group relative overflow-hidden rounded-[3px] border border-[#E9E5D4] p-3" style={{ background: 'linear-gradient(165deg, #FEFDF9 0%, #FAF7ED 100%)', boxShadow: '0 1px 0 rgba(255,255,255,0.8) inset, 0 1px 2px rgba(38,36,32,0.04)' }}>
      <span aria-hidden="true" className="absolute inset-y-2.5 left-0 w-[2px] rounded-r-full opacity-45 transition-opacity duration-200 group-hover:opacity-90" style={{ background: 'linear-gradient(180deg, #B4842A, #E4C25E)' }} />
      <div className="pl-2.5">
        <Label>{label}</Label>
        <p className="mt-1.5 text-[13px] font-medium leading-snug text-[#262420]">{value || '—'}</p>
      </div>
    </div>
  );
}
function StageTracker({ stage }: { stage: string }) {
  const stageIndex = Math.max(0, STAGES.indexOf(stage));
  return (
    <div className="flex items-center gap-[3px]">
      {STAGES.map((s, i) => (
        <span
          key={s}
          title={s}
          className="h-1.5 flex-1 rounded-full transition-all duration-500"
          style={{
            background: i < stageIndex ? 'linear-gradient(90deg, #B4842A, #E4C25E)' : i === stageIndex ? 'linear-gradient(90deg, #A12F24, #C0392B)' : '#E8E4D5',
            boxShadow: i === stageIndex ? '0 0 6px rgba(192,57,43,0.45)' : i < stageIndex ? '0 1px 1px rgba(38,36,32,0.15)' : 'none',
            animation: i === stageIndex ? 'jcPulse 2.2s ease-in-out infinite' : undefined,
          }}
        />
      ))}
    </div>
  );
}

function PriorityPill({ priority }: { priority: string }) {
  const color = PRIORITY_TONE[priority] || TOKENS.muted;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[2px] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]" style={{ color, border: `1px solid ${color}3D`, background: `${color}0D` }}>
      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 4px ${color}66` }} />
      {priority || 'Normal'}
    </span>
  );
}

/* ===================================================================
   ANALYTICS VISUALS — animated gauges + charts fed by real backend data
=================================================================== */
function StatMini({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div className="jc-lift rounded-[3px] border border-[#E9E5D4] p-2.5" style={{ background: 'linear-gradient(165deg,#FEFDF9,#FAF7ED)' }}>
      <div className="text-[8px] font-medium uppercase tracking-[0.16em] text-[#8A846F]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{label}</div>
      <div className="mt-1 truncate text-[12.5px] font-semibold" style={{ color: tone, fontFamily: "'JetBrains Mono', monospace" }}>{value || '—'}</div>
    </div>
  );
}

// Animated production progress gauge (width grows + shimmer sweep). Uses the
// Job Card's current stage to compute percent through the canonical timeline.
function StageProgressGauge({ status, historyCount }: { status: string; historyCount: number }) {
  const stageIndex = Math.max(0, STAGES.indexOf(status));
  const pct = Math.min(100, Math.max(0, Math.round((stageIndex / (STAGES.length - 1)) * 100)));
  const nextStage = stageIndex < STAGES.length - 1 ? STAGES[stageIndex + 1] : null;
  return (
    <section className="relative overflow-hidden rounded-[4px] border border-[#E4DEC9] p-4" style={{ background: 'linear-gradient(165deg,#FFFDF6,#F7F2E5)' }}>
      <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-14 h-28 w-28 rounded-full" style={{ background: 'radial-gradient(circle, rgba(228,194,94,0.18), transparent 70%)' }} />
      <div className="relative mb-2.5 flex items-center justify-between gap-3">
        <Label>Production progress</Label>
        <span className="text-[15px] font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#262420' }}>{pct}%</span>
      </div>
      <div className="relative h-2.5 w-full overflow-hidden rounded-full" style={{ background: '#ECE7D4', boxShadow: '0 1px 2px rgba(38,36,32,0.08) inset' }}>
        <div className="relative h-full overflow-hidden rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#9C7D12,#E4C25E,#9C7D12)', backgroundSize: '200% 100%', animation: 'jcGrow 1.1s cubic-bezier(0.22,1,0.36,1) both, jcRailFlow 2.8s linear 1.1s infinite' }}>
          <span className="absolute inset-y-0 w-8" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.65),transparent)', animation: 'jcShimmer 2.4s ease-in-out 0.5s infinite' }} />
        </div>
      </div>
      <div className="relative mt-3 grid grid-cols-3 gap-2">
        <StatMini label="Audit events" value={historyCount} tone="#C9A227" />
        <StatMini label="Current stage" value={status} tone="#C0392B" />
        <StatMini label={nextStage ? 'Next' : 'Stage'} value={nextStage || status} tone="#3F6633" />
      </div>
    </section>
  );
}

/* ===================================================================
   PRODUCTION WORKBENCH LAYOUT HELPERS
   The job card is organised like an ERP production screen: a permanently
   visible production timeline on top, a 3-column body (job information /
   current-stage workspace / fabric & production summary) and the
   append-only audit ledger at the very bottom. Nothing here changes an
   API contract — it only re-groups the data the job-card endpoint
   already returns.
=================================================================== */

// Position of a stage on the canonical rail. 'Released' sits past the last
// rail step, so it must read as fully complete instead of falling back to 0%.
function railIndex(status: string) {
  const i = STAGES.indexOf(status);
  if (i >= 0) return i;
  return status === 'Released' ? STAGES.length - 1 : 0;
}
function railDoneIndex(status: string) {
  const i = STAGES.indexOf(status);
  if (i >= 0) return i;
  return status === 'Released' ? STAGES.length : -1;
}
// Progress percentage: the stage position drives it, but a recorded
// alteration completion that is further ahead is honoured.
function progressFor(status: string, alterations: any[] = []) {
  const stagePct = Math.round((railIndex(status) / (STAGES.length - 1)) * 100);
  const latest = [...(alterations || [])].pop();
  const recorded = Number(latest?.completion_percentage);
  if (Number.isFinite(recorded) && recorded > 0) return Math.max(stagePct, Math.min(100, Math.round(recorded)));
  return Math.min(100, Math.max(0, stagePct));
}
// Newest timestamp across every production record held on the card.
function latestTimestamp(detail: any, job: any) {
  const stamps: any[] = [
    ...(detail.productionHistory || []).map((h: any) => h.created_at),
    ...(detail.verifications || []).map((v: any) => v.verified_at),
    ...(detail.fittings || []).map((f: any) => f.recorded_at),
    ...(detail.fabricUsage || []).map((u: any) => u.created_at),
    ...(detail.alterations || []).map((a: any) => a.recorded_at),
    job ? job.assignedAt : null,
  ];
  let bestTime = -Infinity;
  let bestValue: string | null = null;
  stamps.forEach((s) => {
    if (!s) return;
    const t = new Date(s).getTime();
    if (!Number.isNaN(t) && t >= bestTime) { bestTime = t; bestValue = s; }
  });
  return bestValue;
}
// What the centre column shows for each stage. Only the form that belongs to
// the CURRENT stage is ever rendered — never every form at once.
const STAGE_WORKSPACE: Record<string, string> = {
  'Measuring': 'Measurement verification',
  'Pattern Cutting': 'Pattern cutting form',
  'Initial Assembly': 'Assembly form',
  'First Fitting': 'Fitting form',
  'Final Alterations': 'Alteration form',
  'Quality Review': 'Quality control card',
  'Completed': 'Production complete',
  'Ready for Pickup': 'Awaiting front-desk release',
  'Released': 'Released to customer',
};

// Helper used by section headers to keep the same brass "thread" motif.
function StitchLine({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="28" height="8" viewBox="0 0 28 8" fill="none" aria-hidden="true">
      <path d="M2 2h6l2 4h6l2-4h6l2 4" stroke="#C9A227" strokeWidth="1.3" strokeLinecap="round" strokeDasharray="3 2" />
    </svg>
  );
}

// Radar chart of the customer's measurement snapshot — each axis is a body part.
function RadarMeasurementChart({ snapshot }: { snapshot: any[] }) {
  if (!snapshot || snapshot.length === 0) return null;
  const data = snapshot.map((m: any) => ({ subject: m.label, value: Number(m.value) || 0 }));
  const max = Math.max(24, ...data.map((d) => d.value));
  return (
    <div className="rounded-[3px] border border-[#E4DEC9] p-3.5" style={{ background: 'linear-gradient(165deg,#FEFDF6,#F6F1E3)' }}>
      <div className="mb-1.5 flex items-center justify-between"><Label className="block">Figure map</Label><span className="text-[8.5px] uppercase tracking-[0.14em] text-[#A39D8A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Snapshot · inches</span></div>
      <ResponsiveContainer width="100%" height={210}>
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="#E0DAC6" />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: '#6D6A60', fontFamily: "'JetBrains Mono', monospace" }} />
          <PolarRadiusAxis domain={[0, max]} tick={false} axisLine={false} />
          <Radar name="Measurement" dataKey="value" stroke="#B4840A" fill="#E4C25E" fillOpacity={0.5} strokeWidth={2} isAnimationActive animationDuration={900} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Bar chart comparing fabric usage across recorded entries (actual deduction).
function FabricUsageChart({ usage }: { usage: any[] }) {
  if (!usage || usage.length === 0) return null;
  const bars = usage.map((u: any, i: number) => ({
    name: u.fabric_name || `Fabric ${i + 1}`,
    value: Number(u.quantity_used) || 0,
    color: i % 2 === 0 ? '#3F6633' : '#C9A227',
  }));
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <div className="mt-2.5 rounded-[3px] border border-[#E4DEC9] p-3.5" style={{ background: 'linear-gradient(165deg,#FEFDF6,#F6F1E3)' }}>
      <Label className="mb-1.5 block">Fabric off the shelf</Label>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={bars} layout="vertical" margin={{ left: 6, right: 6 }}>
          <CartesianGrid stroke="#ECE8D7" horizontal={false} />
          <XAxis type="number" hide domain={[0, max]} />
          <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 9, fill: '#6D6A60' }} />
          <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} contentStyle={{ borderRadius: 4, border: '1px solid #E2DECC', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }} />
          <Bar dataKey="value" name="Usage" radius={[0, 3, 3, 0]} animationDuration={800} animationBegin={200}>
            {bars.map((b) => <Cell key={b.name} fill={b.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Compact glassmorphism KPI tile used by the production timeline strip.
function MetaTile({ label, value, tone, bar, delay = 0 }: { label: string; value: string | number; tone: string; bar?: number; delay?: number }) {
  return (
    <div className="jc-anim jc-lift group relative overflow-hidden rounded-[4px] border border-[#E2DECC]/90 px-3 py-2.5 transition-shadow hover:border-[#C9A227]/40"
      style={{
        animationDelay: `${delay}s`,
        background: 'linear-gradient(155deg, rgba(255,255,255,0.94) 0%, rgba(251,249,242,0.72) 100%)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.85) inset, 0 1px 2px rgba(38,36,32,0.05), 0 12px 24px -18px rgba(38,36,32,0.35)',
      }}>
      <span aria-hidden="true" className="absolute inset-y-3 left-0 w-[2.5px] rounded-r-full opacity-50 transition-opacity duration-200 group-hover:opacity-90" style={{ background: tone }} />
      <div className="pl-2 text-[8.5px] font-medium uppercase tracking-[0.16em] text-[#8A846F]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{label}</div>
      <div className="mt-1 truncate pl-2 text-[13px] font-semibold" style={{ color: tone, fontFamily: "'JetBrains Mono', monospace" }}>{value === '' || value === undefined || value === null ? '—' : value}</div>
      {typeof bar === 'number' && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full pl-0" style={{ background: '#EDE8D6', boxShadow: '0 1px 1px rgba(38,36,32,0.06) inset' }}>
          <div className="relative h-full overflow-hidden rounded-full" style={{ width: `${bar}%`, background: 'linear-gradient(90deg,#9C7D12,#E4C25E,#9C7D12)', backgroundSize: '200% 100%', animation: 'jcGrow 1s cubic-bezier(0.22,1,0.36,1) both, jcRailFlow 2.8s linear 1s infinite' }}>
            <span className="absolute inset-y-0 w-6" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.7),transparent)', animation: 'jcShimmer 2.4s ease-in-out 0.8s infinite' }} />
          </div>
        </div>
      )}
    </div>
  );
}
// Label/value row for the read-only job-information column.
function FieldRow({ label, value, accent }: { label: string; value?: React.ReactNode; accent?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-[#EAE6D6] py-2 first:pt-0 last:border-0 last:pb-0">
      <span className="pt-0.5 text-[9px] font-medium uppercase tracking-[0.15em] text-[#8A846F]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{label}</span>
      <span className="min-w-0 truncate text-right text-[12.5px] font-medium leading-snug text-[#262420]" style={accent ? { color: accent } : undefined}>{value || '—'}</span>
    </div>
  );
}
// Free-text block (special instructions, tailor notes, production notes).
function NoteBlock({ label, value }: { label: string; value?: string }) {
  return (
    <div className="relative rounded-[3px] border border-dashed border-[#D6D1BE] bg-[#FDFCF5] px-3.5 py-2.5 transition-colors duration-200 hover:border-[#C9A227]/45">
      <span aria-hidden="true" className="absolute bottom-2.5 left-0 top-2.5 w-[2px] rounded-r-full" style={{ background: 'linear-gradient(180deg, rgba(201,162,39,0.45), transparent)' }} />
      <Label>{label}</Label>
      <p className={`mt-1.5 whitespace-pre-line text-[12.5px] leading-relaxed ${value ? 'text-[#55503F]' : 'italic text-[#A39D8A]'}`}>{value || 'None recorded'}</p>
    </div>
  );
}
// Horizontal rail: Measuring → … → Ready for Pickup — the workbench's visual
// centrepiece. Larger stage nodes, an animated brass progress line, a
// breathing current stage, a brass shine on completed stages, and hover
// tooltips. Pure presentation: stage order and status logic are unchanged.
function StageRail({ status }: { status: string }) {
  const current = STAGES.indexOf(status);
  const done = railDoneIndex(status);
  // Segments fully walked: everything up to (but not including) the current
  // stage; a Released card (off-rail) has walked the entire rail.
  const traversed = current === -1 ? STAGES.length : current;
  const stageNo = current === -1 ? STAGES.length : Math.max(0, current) + 1;
  return (
    <div className="rounded-[4px] border border-[#E7E3D2] bg-white/60 px-3 pb-3.5 pt-3 sm:px-4" style={{ boxShadow: '0 1px 0 rgba(255,255,255,0.7) inset, 0 1px 2px rgba(38,36,32,0.04)' }}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <Label>Production rail</Label>
        <span className="text-[9.5px] font-medium uppercase tracking-[0.14em] text-[#8A846F]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {stageNo} / {STAGES.length} stages
        </span>
      </div>
      <div className="flex items-start overflow-x-auto pb-1">
        {STAGES.map((s, i) => {
          const isDone = i < done;
          const isCurrent = i === current;
          const traversedSeg = i < traversed;
          const tip = isCurrent ? 'Current stage' : isDone ? 'Completed' : 'Pending';
          return (
            <div key={s} className="jc-node-wrap group relative flex min-w-[92px] flex-1 flex-col items-center">
              {/* connector segment walked toward the next stage */}
              {i < STAGES.length - 1 && (
                <span aria-hidden="true"
                  className={`absolute top-[17px] h-[3px] rounded-full ${traversedSeg ? 'jc-flow' : ''}`}
                  style={{
                    left: 'calc(50% + 25px)',
                    width: 'calc(100% - 50px)',
                    background: traversedSeg ? 'linear-gradient(90deg,#B4842A,#E4C25E,#B4842A)' : '#E7E3D2',
                    boxShadow: traversedSeg ? '0 0 4px rgba(201,162,39,0.25)' : 'none',
                  }} />
              )}
              {/* node */}
              <div className={`relative z-10 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border transition-all duration-200 ${isDone ? 'jc-shine' : ''}`}
                style={{
                  background: isDone ? 'linear-gradient(135deg,#B4842A,#E4C25E)' : isCurrent ? 'linear-gradient(135deg,#A12F24,#C0392B)' : '#FDFCF7',
                  borderColor: isDone ? '#9C7D12' : isCurrent ? '#8E2A20' : '#DCD8C7',
                  boxShadow: isCurrent ? '0 0 0 4px rgba(192,57,43,0.14), 0 2px 6px rgba(38,36,32,0.22)' : isDone ? '0 1px 3px rgba(38,36,32,0.25)' : '0 1px 2px rgba(38,36,32,0.08)',
                }}>
                {isDone && <Check className="h-4 w-4 text-white" strokeWidth={2.75} />}
                {isCurrent && (
                  <>
                    <span className="absolute inset-0 rounded-full" style={{ background: 'rgba(192,57,43,0.5)', animation: 'jcBreath 2s ease-in-out infinite' }} />
                    <span className="relative h-2 w-2 rounded-full bg-white" />
                  </>
                )}
                {!isDone && !isCurrent && (
                  <span className="text-[11px] font-semibold text-[#B4AF9E]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{i + 1}</span>
                )}
              </div>
              {/* label */}
              <span className={`mt-2 hidden text-center text-[9.5px] uppercase leading-none tracking-[0.09em] sm:block ${isCurrent ? 'font-semibold text-[#A12F24]' : isDone ? 'text-[#8A5A12]' : 'text-[#B4AF9E]'}`}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {s}
              </span>
              {/* hover tooltip */}
              <div className="jc-tip rounded-[3px] border border-[#C9A227]/40 px-2.5 py-1.5 text-center" style={{ background: '#262420', boxShadow: '0 8px 20px -8px rgba(20,19,17,0.6)' }}>
                <span className="block text-[10px] font-semibold tracking-[0.06em] text-[#F3F1E7]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{tip}</span>
                <span className="block text-[9px] uppercase tracking-[0.14em] text-[#E4C25E]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{s}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}



function Input({ label, value, onChange, placeholder = '', type = 'text', className = '' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string }) {
  return (
    <label className={`block text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#8A846F] ${className}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {label}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-[3px] border border-[#DCD8C7] bg-white px-3 py-2.5 text-sm normal-case tracking-normal text-[#262420] outline-none transition-all duration-200 placeholder:text-[#B4AF9E] hover:border-[#C4BFA9] focus:border-[#9C7D12] focus:shadow-[0_0_0_3px_rgba(201,162,39,0.16)] disabled:cursor-not-allowed disabled:bg-[#F4F1E6]"
      />
    </label>
  );
}

function TextArea({ label, value, onChange, placeholder = '', className = '' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <label className={`block text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#8A846F] ${className}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {label}
      <textarea rows={3} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="mt-2 w-full resize-none rounded-[3px] border border-[#DCD8C7] bg-white px-3 py-2.5 text-sm normal-case leading-relaxed tracking-normal text-[#262420] outline-none transition-all duration-200 placeholder:text-[#B4AF9E] hover:border-[#C4BFA9] focus:border-[#9C7D12] focus:shadow-[0_0_0_3px_rgba(201,162,39,0.16)] disabled:cursor-not-allowed disabled:bg-[#F4F1E6]" />
    </label>
  );
}

function Band({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="jc-lift relative overflow-hidden rounded-[4px] border border-[#E2DECC] bg-white"
      style={{ boxShadow: '0 1px 0 rgba(255,255,255,0.6) inset, 0 1px 2px rgba(38,36,32,0.04), 0 18px 36px -28px rgba(38,36,32,0.38)' }}>
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px]" style={{ background: 'linear-gradient(90deg, rgba(201,162,39,0.6), rgba(228,194,94,0.25) 42%, rgba(201,162,39,0) 90%)' }} />
      <header className="relative flex items-center gap-3 border-b border-[#EEEADB] px-4 py-3" style={{ background: 'linear-gradient(180deg,#FFFDF6,#F8F4E9)' }}>
        {icon && (
          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[3px] border border-[#C9A227]/30" style={{ background: 'linear-gradient(135deg, rgba(228,194,94,0.22), rgba(201,162,39,0.06))' }}>
            {icon}
          </span>
        )}
        <Label>{label}</Label>
      </header>
      <div className="relative p-4 sm:p-5">{children}</div>
    </section>
  );
}
function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

function TailorJobCardsView() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [banner, setBanner] = useState('');
  const [selected, setSelected] = useState(null);
  // Bumping this re-runs the fetch effect (the "Retry" action on a failure).
  const [reloadKey, setReloadKey] = useState(0);

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [garmentType, setGarmentType] = useState('');
  const [priority, setPriority] = useState('');
  const [deadlineFrom, setDeadlineFrom] = useState('');
  const [deadlineTo, setDeadlineTo] = useState('');
  const [sort, setSort] = useState('assigned_at');
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const GARMENTS = useMemo(() => Array.from(new Set(cards.map((c) => c.garmentType))).filter(Boolean).sort(), [cards]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (status) params.set('stage', status);
    if (garmentType) params.set('garmentType', garmentType);
    if (priority) params.set('priority', priority);
    if (deadlineFrom) params.set('deadlineFrom', deadlineFrom);
    if (deadlineTo) params.set('deadlineTo', deadlineTo);
    params.set('sort', sort);
    params.set('order', order);
    params.set('page', String(page));
    params.set('limit', '12');

    api(`/tailor/job-cards?${params.toString()}`)
      .then((data) => {
        if (cancelled) return;
        // The API returns `jobCardId`; the workbench expects `id` (keys,
        // click-to-open, and the card label all read card.id).
        setCards((data.data || []).map((c: any) => ({ ...c, id: c.id ?? c.jobCardId })));
        setTotal(data.total || 0);
        setTotalPages(Math.max(1, data.totalPages || 1));
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        // Real server data only — never seed fictional job cards. The bench
        // simply reports that it could not reach the backend.
        setCards([]);
        setTotal(0);
        setTotalPages(1);
        setError(e instanceof Error && e.message ? e.message : 'Unable to load your assigned job cards.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [query, status, garmentType, priority, deadlineFrom, deadlineTo, sort, order, page, reloadKey]);

  function announce(message: string) {
    setBanner(message);
    window.setTimeout(() => setBanner(''), 4000);
  }
  // Re-run the job-card query after a failed load.
  function retry() {
    setError('');
    setReloadKey((k) => k + 1);
  }
  function replaceCard(id: string, patch: any) {
    setCards((prev: any[]) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-8">
      <GrainDefs />
      {/* Workbench motion system — shared by the bench and the job-card modal. */}
      <style>{`
        @keyframes jcFadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes jcGrow { from { width: 0%; } }
        @keyframes jcShimmer { 0% { transform: translateX(-120%); } 100% { transform: translateX(420%); } }
        @keyframes jcPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }
        @keyframes jcBreath { 0%,100% { transform: scale(1); opacity: 0.55; } 50% { transform: scale(1.45); opacity: 0; } }
        @keyframes jcRailFlow { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
        @keyframes jcBrassSweep { 0% { transform: translateX(-140%) skewX(-18deg); } 100% { transform: translateX(460%) skewX(-18deg); } }
        @keyframes jcModalIn { from { opacity: 0; transform: translateY(20px) scale(0.965); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes jcBackdropIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes jcSpin { to { transform: rotate(360deg); } }
        .jc-anim { opacity: 0; animation: jcFadeUp 0.5s cubic-bezier(0.22,1,0.36,1) forwards; }
        .jc-modal-panel { animation: jcModalIn 0.42s cubic-bezier(0.22,1,0.36,1) both; }
        .jc-backdrop { animation: jcBackdropIn 0.3s ease both; }
        .jc-lift { transition: transform 0.22s cubic-bezier(0.22,1,0.36,1), box-shadow 0.22s cubic-bezier(0.22,1,0.36,1), border-color 0.22s ease; }
        .jc-lift:hover { transform: translateY(-2px); }
        .jc-line { position: relative; }
        .jc-line::before { content: ''; position: absolute; left: 5px; top: 10px; bottom: 2px; width: 2px; background: linear-gradient(180deg, #E4C25E, #DFD8C7); border-radius: 2px; }
        .jc-shine { position: relative; overflow: hidden; }
        .jc-shine::after { content: ''; position: absolute; top: -30%; bottom: -30%; left: 0; width: 34%; background: linear-gradient(100deg, transparent, rgba(255,255,255,0.75), transparent); transform: translateX(-180%) skewX(-18deg); transition: transform 0.65s ease; }
        .jc-shine:hover::after { transform: translateX(340%) skewX(-18deg); }
        .jc-tip { position: absolute; bottom: calc(100% + 9px); left: 50%; z-index: 30; opacity: 0; transform: translate(-50%, 3px); transition: opacity 0.2s ease, transform 0.2s ease; pointer-events: none; white-space: nowrap; }
        .jc-node-wrap:hover .jc-tip, .jc-node-wrap:focus-within .jc-tip { opacity: 1; transform: translate(-50%, 0); }
        .jc-flow { background-size: 200% 100%; animation: jcRailFlow 2.6s linear infinite; }
        .jc-scroll::-webkit-scrollbar { width: 10px; }
        .jc-scroll::-webkit-scrollbar-thumb { background: #DCD6C2; border-radius: 8px; border: 2px solid #FBF9F2; }
        .jc-scroll::-webkit-scrollbar-track { background: transparent; }
        .jc-step::after { content: ''; position: absolute; left: 11.5px; top: 30px; bottom: -26px; width: 1px; background: linear-gradient(180deg, rgba(201,162,39,0.35), #E7E3D2); }
        .jc-step:last-child::after { display: none; }
        @media (prefers-reduced-motion: reduce) {
          .jc-anim, .jc-modal-panel, .jc-backdrop { animation: none; opacity: 1; }
          .jc-lift, .jc-tip, .jc-shine::after { transition: none; }
          .jc-flow { animation: none; }
        }
      `}</style>

      {/* ---------- PAGE HEADER — editorial masthead with brass accent line ---------- */}
      <header className="dash-in relative">
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <div className="mb-2.5 flex items-center gap-2.5">
              <svg width="26" height="8" viewBox="0 0 26 8" fill="none" aria-hidden="true" className="flex-shrink-0">
                <path d="M2 2h5l2 4h5l2-4h5l2 4" stroke="#C9A227" strokeWidth="1.3" strokeLinecap="round" strokeDasharray="3 2" />
              </svg>
              <Label>Assigned job cards</Label>
            </div>
            <h1 className="text-3xl leading-[1.05] tracking-[-0.01em] text-[#262420] sm:text-[38px]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>The pattern table</h1>
            <p className="mt-2 text-sm text-[#6D6A60]">
              {`${total} job card${total === 1 ? '' : 's'} on your bench.`}
            </p>
          </div>
          <div className="hidden items-center gap-2 pb-1.5 sm:flex">
            <span className="rounded-[3px] border border-[#E2DECC] bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8A5A12]" style={{ fontFamily: "'JetBrains Mono', monospace", boxShadow: '0 1px 2px rgba(38,36,32,0.05)' }}>
              {total} on bench
            </span>
          </div>
        </div>
        <div className="mt-4 h-px w-full" style={{ background: 'linear-gradient(90deg, #C9A227 0%, rgba(201,162,39,0.35) 34%, rgba(220,216,199,0) 78%)' }} />
        <div className="mt-[3px] h-[3px] w-24 rounded-full" style={{ background: 'linear-gradient(90deg, #B4842A, #E4C25E)' }} />
      </header>

      {banner && (
        <div className="dash-in relative flex items-center gap-3 overflow-hidden rounded-[3px] border border-[#8FAE85] bg-[#E4E9DB] px-4 py-3 text-sm text-[#3F6633]" style={{ boxShadow: '0 1px 2px rgba(38,36,32,0.05)' }}>
          <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: 'linear-gradient(180deg,#3F6633,#6D8F5E)' }} />
          <span className="ml-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#3F6633]/12"><Check className="h-3.5 w-3.5 flex-shrink-0" /></span>
          <span>{banner}</span>
        </div>
      )}
      {error && (
        <div role="alert" className="dash-in relative flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-[3px] border border-[#C87965]/40 bg-[#F7E7E1] px-4 py-3 text-sm text-[#9A4936]">
          <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: 'linear-gradient(180deg,#A32E22,#C87965)' }} />
          <span className="ml-1 flex items-center gap-2">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#A32E22]/10"><AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.8} /></span>
            <span>{error}</span>
          </span>
          <button
            type="button"
            onClick={retry}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-[2px] border border-[#C87965]/50 bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9A4936] transition-all duration-200 hover:-translate-y-px hover:bg-[#F2D9D1] hover:shadow-[0_6px_14px_-8px_rgba(163,46,34,0.5)] disabled:translate-y-0 disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.8} /> Retry
          </button>
        </div>
      )}

      {/* ------------------- FILTER TOOLBAR ------------------- */}
      <section className="jc-anim relative overflow-hidden rounded-[4px] border border-[#E2DECC] bg-[#FBF9F2] p-4 sm:p-5" style={{ animationDelay: '0.08s', boxShadow: '0 1px 2px rgba(38,36,32,0.04), 0 16px 32px -26px rgba(38,36,32,0.35)' }}>
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-[3px] border border-[#C9A227]/30" style={{ background: 'linear-gradient(135deg, rgba(228,194,94,0.2), rgba(201,162,39,0.05))' }}>
            <Search className="h-3 w-3 text-[#9C7D12]" strokeWidth={1.8} />
          </span>
          <Label>Bench filters</Label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative flex items-center rounded-[3px] border border-[#DCD8C7] bg-white transition-all duration-200 focus-within:border-[#9C7D12] focus-within:shadow-[0_0_0_3px_rgba(201,162,39,0.16)] lg:col-span-2">
            <Search className="ml-3 h-4 w-4 flex-shrink-0 text-[#A39D8A]" strokeWidth={1.5} />
            <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search job card, customer or garment" className="w-full bg-transparent px-3 py-2.5 text-sm focus:outline-none" />
          </div>
          <label className="block">
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#8A846F]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Stage</span>
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="mt-1.5 w-full cursor-pointer rounded-[3px] border border-[#DCD8C7] bg-white px-3 py-2 text-sm text-[#55503F] outline-none transition-all duration-200 hover:border-[#C4BFA9] focus:border-[#9C7D12] focus:shadow-[0_0_0_3px_rgba(201,162,39,0.16)]">
              <option value="">All statuses</option>
              {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#8A846F]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Garment</span>
            <select value={garmentType} onChange={(e) => { setGarmentType(e.target.value); setPage(1); }} className="mt-1.5 w-full cursor-pointer rounded-[3px] border border-[#DCD8C7] bg-white px-3 py-2 text-sm text-[#55503F] outline-none transition-all duration-200 hover:border-[#C4BFA9] focus:border-[#9C7D12] focus:shadow-[0_0_0_3px_rgba(201,162,39,0.16)]">
              <option value="">All garment types</option>
              {GARMENTS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-dashed border-[#E7E3D2] pt-3.5">
          <label className="block">
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#8A846F]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Priority</span>
            <select value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }} className="mt-1.5 cursor-pointer rounded-[3px] border border-[#DCD8C7] bg-white px-3 py-2 text-sm text-[#55503F] outline-none transition-all duration-200 hover:border-[#C4BFA9] focus:border-[#9C7D12] focus:shadow-[0_0_0_3px_rgba(201,162,39,0.16)]">
              <option value="">All priorities</option>
              <option>High</option><option>Normal</option><option>Low</option>
            </select>
          </label>
          <label className="block">
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#8A846F]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Deadline from</span>
            <input type="date" value={deadlineFrom} onChange={(e) => { setDeadlineFrom(e.target.value); setPage(1); }} className="mt-1.5 block rounded-[3px] border border-[#DCD8C7] bg-white px-2.5 py-2 text-xs text-[#55503F] outline-none transition-all duration-200 hover:border-[#C4BFA9] focus:border-[#9C7D12] focus:shadow-[0_0_0_3px_rgba(201,162,39,0.16)]" />
          </label>
          <label className="block">
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#8A846F]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Deadline to</span>
            <input type="date" value={deadlineTo} onChange={(e) => { setDeadlineTo(e.target.value); setPage(1); }} className="mt-1.5 block rounded-[3px] border border-[#DCD8C7] bg-white px-2.5 py-2 text-xs text-[#55503F] outline-none transition-all duration-200 hover:border-[#C4BFA9] focus:border-[#9C7D12] focus:shadow-[0_0_0_3px_rgba(201,162,39,0.16)]" />
          </label>
          <div className="ml-auto flex items-end gap-2">
            <label className="block">
              <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#8A846F]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Sort</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="mt-1.5 block cursor-pointer rounded-[3px] border border-[#DCD8C7] bg-white px-2.5 py-2 text-xs text-[#55503F] outline-none transition-all duration-200 hover:border-[#C4BFA9] focus:border-[#9C7D12] focus:shadow-[0_0_0_3px_rgba(201,162,39,0.16)]">
                <option value="assigned_at">Assigned date</option>
                <option value="deadline">Deadline</option>
                <option value="priority">Priority</option>
                <option value="stage">Stage</option>
                <option value="customer">Customer</option>
              </select>
            </label>
            <button onClick={() => setOrder(order === 'desc' ? 'asc' : 'desc')} className="rounded-[3px] border border-[#DCD8C7] bg-white px-3 py-2 text-xs text-[#55503F] transition-all duration-200 hover:border-[#9C7D12] hover:text-[#262420] hover:shadow-[0_4px_10px_-6px_rgba(38,36,32,0.4)]">
              {order === 'desc' ? 'Newest' : 'Oldest'}
            </button>
          </div>
        </div>
      </section>
      {/* ------------------- CARD GRID ------------------- */}
      {loading ? (
        <div className="jc-anim flex items-center justify-center gap-3 py-16 text-sm text-[#8A846F]">
          <span className="h-4 w-4 rounded-full border-2 border-[#C9A227]/30 border-t-[#9C7D12]" style={{ animation: 'jcSpin 0.9s linear infinite' }} />
          Loading job cards from the server&hellip;
        </div>
      ) : cards.length === 0 ? (
        <div className="jc-anim py-16 text-center">
          <div className="mx-auto max-w-md rounded-[4px] border border-dashed border-[#D6D1BE] bg-[#FDFCF5] px-8 py-10">
            <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-[#C9A227]/30" style={{ background: 'linear-gradient(135deg, rgba(228,194,94,0.18), rgba(201,162,39,0.05))' }}>
              <Shirt className="h-4.5 w-4.5 text-[#9C7D12]" strokeWidth={1.5} />
            </span>
            {error ? (
              <>
                <h2 className="text-xl text-[#262420]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>Your bench could not be loaded.</h2>
                <p className="mt-1.5 text-sm text-[#6D6A60]">The server did not return your assigned job cards. Use Retry above to try again.</p>
              </>
            ) : (
              <>
                <h2 className="text-xl text-[#262420]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>No job cards match the current filters.</h2>
                <p className="mt-1.5 text-sm text-[#6D6A60]">Clear the filters to see every assigned card. New work is assigned by the Front Desk.</p>
              </>
            )}
          </div>
        </div>
      ) : (
        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card, index) => (
            <button
              key={card.id}
              onClick={() => setSelected(card.id)}
              className="jc-anim group relative overflow-hidden rounded-[4px] border p-5 text-left transition-all duration-200 hover:-translate-y-[3px] hover:border-[#C9A227]/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227]/60 shadow-[0_1px_2px_rgba(38,36,32,0.06),0_14px_26px_-16px_rgba(38,36,32,0.3)] hover:shadow-[0_2px_4px_rgba(38,36,32,0.07),0_26px_44px_-20px_rgba(38,36,32,0.42)]"
              style={{ animationDelay: `${index * 0.06}s`, background: 'linear-gradient(180deg,#FDFCF7,#FAF7EE)', borderColor: '#DCD8C7' }}
            >
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[4px]"><Grain opacity={0.45} /></div>
              <Notch className="-top-px -left-px" />
              <Notch className="-top-px -right-px rotate-90" />
              <span aria-hidden="true" className="absolute right-0 top-0 h-3.5 w-3.5 border-r border-t opacity-0 transition-opacity duration-200 group-hover:opacity-100" style={{ borderColor: 'rgba(201,162,39,0.65)' }} />
              <span aria-hidden="true" className="absolute bottom-0 left-0 h-3.5 w-3.5 border-b border-l opacity-0 transition-opacity duration-200 group-hover:opacity-100" style={{ borderColor: 'rgba(201,162,39,0.65)' }} />
              <div className="relative">
                <div className="flex items-center justify-between gap-3">
                  <Label>{card.id}</Label>
                  <PriorityPill priority={card.priority} />
                </div>
                <h2 className="mt-3.5 text-[19px] font-semibold leading-tight text-[#262420]" style={{ fontFamily: "'Fraunces', serif" }}>{card.customer}</h2>
                <p className="mt-1 text-sm text-[#6D6A60]">{card.garmentType}{card.quantity > 1 ? ` · ×${card.quantity}` : ''}</p>
                <div className="mt-4"><TapeDivider /></div>
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <Label>Stage</Label>
                    <span className="text-[9.5px] font-medium text-[#8A846F]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {Math.round((railIndex(card.status) / (STAGES.length - 1)) * 100)}%
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <StageTracker stage={card.status} />
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-[#9C7D12] transition-transform duration-200 group-hover:translate-x-0.5" />
                  </div>
                  <p className="mt-2 text-sm font-medium text-[#262420]">{card.status}</p>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-dashed border-[#E7E3D2] pt-3 text-[10.5px] text-[#8A846F]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  <span>Due {formatDate(card.deadline)}</span>
                  <span>{card.assignedName || 'Unassigned'}</span>
                </div>
              </div>
            </button>
          ))}
        </section>
      )}

      {/* ------------------- PAGINATION ------------------- */}
      {totalPages > 1 && (
        <div className="jc-anim flex items-center justify-center gap-2.5" style={{ animationDelay: '0.2s' }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-[3px] border border-[#DCD8C7] bg-white px-3.5 py-2 text-xs text-[#55503F] transition-all duration-200 hover:border-[#9C7D12] hover:text-[#262420] hover:shadow-[0_4px_10px_-6px_rgba(38,36,32,0.4)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none">Prev</button>
          <span className="rounded-full border border-[#E2DECC] bg-white px-3.5 py-1.5 text-[11px] text-[#6D6A60]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-[3px] border border-[#DCD8C7] bg-white px-3.5 py-2 text-xs text-[#55503F] transition-all duration-200 hover:border-[#9C7D12] hover:text-[#262420] hover:shadow-[0_4px_10px_-6px_rgba(38,36,32,0.4)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none">Next</button>
        </div>
      )}

      {/* ------------------- JOB CARD DETAIL MODAL ------------------- */}
      {selected && (
        <JobCardDetail
          jobCardId={selected}
          onClose={() => setSelected(null)}
          onSaved={(message: string) => announce(message)}
          onStageChange={(id, status) => replaceCard(id, { status })}
        />
      )}
    </div>
  );
}

export default TailorJobCardsView;
export { TailorJobCardsView };
function JobCardDetail({ jobCardId, onClose, onSaved, onStageChange }: { jobCardId: string; onClose: () => void; onSaved: (m: string) => void; onStageChange: (id: string, s: string) => void; }) {
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    if (!jobCardId) return;
    try {
      const data = await api(`/tailor/job-cards/${encodeURIComponent(jobCardId)}`);
      setDetail(data);
    } catch (e) {
      setDetail(null);
    }
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [jobCardId]);

  if (!detail) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="jc-backdrop absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 40%, rgba(38,36,32,0.5), rgba(15,14,12,0.78))', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }} />
        <div className="jc-modal-panel relative w-full max-w-lg overflow-hidden rounded-[5px] border border-[#D8D3C0]" style={{ background: '#FBF9F2', boxShadow: '0 24px 48px -12px rgba(20,19,17,0.45), 0 80px 120px -40px rgba(20,19,17,0.55)' }}>
          <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg, #B4842A, #EBCB6E 45%, #F4DD8E 55%, #B4842A)' }} />
          <div className="flex items-center justify-center gap-3 p-10 text-sm text-[#8A846F]">
            <span className="h-4 w-4 rounded-full border-2 border-[#C9A227]/30 border-t-[#9C7D12]" style={{ animation: 'jcSpin 0.9s linear infinite' }} />
            Opening job card {jobCardId}…
          </div>
        </div>
      </div>
    );
  }
  const job = detail.jobCard;
  const locked = ['Ready for Pickup', 'Released'].includes(job.status);
  const stageIdx = railIndex(job.status);
  const nextStage = stageIdx < STAGES.length - 1 ? STAGES[stageIdx + 1] : null;
  // Production notes come from the job card's saved production record; the
  // newest audit remark is only a fallback for cards predating that field.
  const latestStageNote = [...(detail.productionHistory || [])].reverse().find((h: any) => h.notes)?.notes || '';
  const productionNotes = job.productionNotes || latestStageNote;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <button aria-label="Close" onClick={onClose} className="jc-backdrop absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 38%, rgba(38,36,32,0.5), rgba(15,14,12,0.78))', backdropFilter: 'blur(10px) saturate(0.92)', WebkitBackdropFilter: 'blur(10px) saturate(0.92)' }} />
      <section className="jc-modal-panel relative flex max-h-[94vh] w-full max-w-[1600px] flex-col overflow-hidden rounded-[6px] border border-[#D8D3C0]" style={{ background: '#FBF9F2', backgroundImage: 'radial-gradient(rgba(228,224,207,0.9) 0.6px, transparent 0.6px)', backgroundSize: '18px 18px', boxShadow: '0 1px 0 rgba(255,255,255,0.55) inset, 0 0 0 1px rgba(38,36,32,0.05), 0 24px 48px -12px rgba(20,19,17,0.42), 0 80px 120px -40px rgba(20,19,17,0.55)' }}>
        <Grain opacity={0.3} />
        <Notch className="-top-px -left-px" />
        <Notch className="-top-px -right-px rotate-90" />

        {/* Brass accent line with a slow light sweep — the modal's crown */}
        <div className="relative h-[3px] w-full flex-shrink-0 overflow-hidden" style={{ background: 'linear-gradient(90deg, #B4842A, #EBCB6E 45%, #F4DD8E 55%, #B4842A)' }}>
          <span aria-hidden="true" className="absolute inset-y-0 w-1/3" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)', animation: 'jcBrassSweep 3.2s ease-in-out 0.6s infinite' }} />
        </div>
        {/* ============ TOP: PRODUCTION TIMELINE — the primary focus, always visible ============ */}
        <ProductionTimeline
          job={job}
          detail={detail}
          locked={locked}
          nextStage={nextStage}
          onSaved={onSaved}
          onStageChange={onStageChange}
          refresh={refresh}
          onClose={onClose}
        />

        {/* ============ MAIN: 3-COLUMN PRODUCTION WORKBENCH ============ */}
        <div className="jc-scroll min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid gap-5 lg:grid-cols-12">
            {/* ------------------ LEFT: JOB INFORMATION ------------------ */}
            <div className="jc-anim min-w-0 space-y-4 lg:col-span-3" style={{ animationDelay: '0.06s' }}>
              <JobInformationCard job={job} locked={locked} productionNotes={productionNotes} />
            </div>

            {/* ------------- CENTER: CURRENT STAGE WORKSPACE ------------- */}
            <div className="jc-anim min-w-0 space-y-4 lg:col-span-5" style={{ animationDelay: '0.12s' }}>
              <StageWorkspace
                detail={detail}
                locked={locked}
                nextStage={nextStage}
                onSaved={onSaved}
                refresh={refresh}
                onStageChange={onStageChange}
              />
            </div>

            {/* ---------- RIGHT: FABRIC INFORMATION ---------- */}
            <div className="jc-anim min-w-0 space-y-4 lg:col-span-4" style={{ animationDelay: '0.18s' }}>
              <FabricPanel detail={detail} locked={locked} onSaved={onSaved} refresh={refresh} />
            </div>
          </div>

          {/* ---------- BOTTOM: PRODUCTION SUMMARY (saved production record) ---------- */}
          <div className="jc-anim mt-5" style={{ animationDelay: '0.24s' }}>
            <ProductionSummaryCard detail={detail} job={job} />
          </div>

          {/* ---------- BOTTOM: AUDIT HISTORY — read-only, never editable ---------- */}
          <div className="jc-anim mt-5" style={{ animationDelay: '0.3s' }}>
            <AuditHistorySection detail={detail} />
          </div>
        </div>
      </section>
    </div>
  );
}
/* -------------------------------------------------------------------
   MEASUREMENT RESULT — two mutually exclusive outcomes. `stored` is the
   canonical value the API, the DB enum and the workflow gate use; `label`
   is the production wording the tailor sees.
------------------------------------------------------------------- */
const MEASUREMENT_RESULTS = [
  { label: 'Approved for Production', stored: 'Approved for Production', passed: true },
  { label: 'Re-measurement Required', stored: 'Needs Re-measurement', passed: false },
];
function measurementResultLabel(stored?: string) {
  if (stored === 'Needs Re-measurement') return 'Re-measurement Required';
  if (stored === 'Verified' || stored === 'Approved for Production') return 'Approved for Production';
  return stored || '—';
}
function measurementResultPassed(stored?: string) {
  return stored === 'Verified' || stored === 'Approved for Production';
}

// Numbered step header for the verification workflow — brass circles and a
// connecting thread give the panel its step-by-step rhythm. Presentation only.
function VerifyStep({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="jc-step relative pl-9">
      <span className="absolute left-0 top-0 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-[#C9A227]/45 text-[10px] font-semibold text-[#8A5A12]" style={{ background: 'linear-gradient(135deg, rgba(228,194,94,0.25), rgba(201,162,39,0.08))', fontFamily: "'JetBrains Mono', monospace" }}>{n}</span>
      <div className="mb-2.5">
        <h3 className="text-[12.5px] font-semibold tracking-[0.01em] text-[#262420]">{title}</h3>
        {hint && <p className="mt-0.5 text-[10.5px] text-[#A39D8A]">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function MeasurementSection({ detail, locked, onSaved, refresh }: { detail: any; locked: boolean; onSaved: (m: string) => void; refresh: () => void }) {
  const snapshot = detail.measurementSnapshot || [];
  const verifications = detail.verifications || [];
  // The most recently saved verification becomes the source of truth for the
  // badge below, and pre-selects the radio buttons so the section reflects it.
  const latest = verifications[verifications.length - 1];
  const [status, setStatus] = useState(latest?.status || MEASUREMENT_RESULTS[0].stored);
  const [notes, setNotes] = useState(latest?.tailoring_notes || '');
  const [concern, setConcern] = useState(latest?.concern_flags || '');
  const [requestConfirm, setRequestConfirm] = useState(!!latest?.request_confirmation);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await api(`/tailor/job-cards/${encodeURIComponent(detail.jobCard.id)}/verify-measurements`, {
        method: 'POST',
        body: JSON.stringify({ status, tailoringNotes: notes, concernFlags: concern, requestConfirmation: requestConfirm }),
      });
      onSaved(res.message || `Measurement result saved for ${detail.jobCard.id}.`);
      refresh();
    } catch (e) { onSaved(e instanceof Error ? e.message : 'Could not save verification.'); }
    finally { setSaving(false); }
  }
  return (
    <Band label="Measurement verification" icon={<Ruler className="h-3.5 w-3.5 text-[#9C7D12]" strokeWidth={1.6} />}>
      <div className="space-y-7">
      {/* STEP 1 — frozen snapshot */}
      <VerifyStep n={1} title="Review the frozen snapshot" hint="Taken at the order counter — cross-check against the customer.">
        {latest && (
          <div className={`mb-3 flex items-center gap-3 rounded-[3px] border px-3.5 py-2.5 text-sm ${measurementResultPassed(latest.status)
            ? 'border-[#8FAE85]/60 bg-[#E4EBDA] text-[#3F6633]'
            : 'border-[#C87965]/50 bg-[#F7E7E1] text-[#9A4936]'}`}>
            <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${measurementResultPassed(latest.status) ? 'bg-[#3F6633]/12' : 'bg-[#A32E22]/10'}`}>
              {measurementResultPassed(latest.status)
                ? <Check className="h-3.5 w-3.5 flex-shrink-0" />
                : <X className="h-3.5 w-3.5 flex-shrink-0" />}
            </span>
            <div className="min-w-0">
              <span className="text-[11.5px] font-semibold uppercase tracking-[0.08em]">{measurementResultLabel(latest.status)}</span>
              <span className="ml-2 text-[12px] opacity-80">— reviewed {new Date(latest.verified_at || Date.now()).toLocaleString()}{latest.tailoring_notes ? ` · ${latest.tailoring_notes}` : ''}</span>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {snapshot.length === 0 && <p className="text-sm text-[#8A846F]">No measurement snapshot is attached to this order yet.</p>}
          {snapshot.map((m: any) => (
            <div key={m.label} className="jc-lift rounded-[3px] border border-dashed border-[#B4AF9E] bg-white p-3 hover:border-[#C9A227]/50">
              <span className="text-[9px] font-medium uppercase tracking-[0.15em] text-[#8A846F]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{m.label}</span>
              <p className="mt-1 text-sm font-semibold text-[#262420]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{m.value || '—'} in</p>
            </div>
          ))}
        </div>
        {snapshot.length > 0 && (
          <div className="mt-3 grid items-stretch gap-3 lg:grid-cols-[1.1fr_1fr]">
            <RadarMeasurementChart snapshot={snapshot} />
            <div className="rounded-[3px] border border-[#E4DEC9] p-3.5" style={{ background: 'linear-gradient(165deg,#FEFDF6,#F6F1E3)' }}>
              <Label className="mb-2 block">Snapshot check</Label>
              <p className="text-[12px] leading-relaxed text-[#6D6A60]">
                These figures were frozen on the Job Card at order time. Cross-check them against the customer before confirming below — a green light lets production begin.
              </p>
            </div>
          </div>
        )}
      </VerifyStep>
      {/* STEP 2 — record the result */}
      <VerifyStep n={2} title="Record the measurement result" hint="One outcome only — it gates the move to Pattern Cutting.">
        <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Measurement result">
          {MEASUREMENT_RESULTS.map((r) => (
            <button key={r.stored} type="button" onClick={() => setStatus(r.stored)} disabled={locked}
              role="radio" aria-checked={status === r.stored}
              className={`inline-flex items-center gap-2.5 rounded-[3px] border px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] transition-all duration-200 hover:-translate-y-px ${status === r.stored
                ? (r.passed ? 'border-[#3F6633] bg-[#3F6633]/12 text-[#3F6633] shadow-[0_8px_18px_-12px_rgba(63,102,51,0.6)]' : 'border-[#A32E22] bg-[#A32E22]/10 text-[#A32E22] shadow-[0_8px_18px_-12px_rgba(163,46,34,0.6)]')
                : 'border-[#A39D8A] text-[#8A846F] hover:border-[#8A846F] hover:bg-white disabled:translate-y-0'}`}>
              <span className="inline-flex h-2.5 w-2.5 rounded-full border transition-all duration-200" style={{ borderColor: 'currentColor', background: status === r.stored ? 'currentColor' : 'transparent', boxShadow: status === r.stored ? '0 0 6px currentColor' : 'none' }} />
              {r.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[10.5px] leading-relaxed text-[#8A846F]">
          Only one result may be selected.{' '}
          {status === 'Needs Re-measurement'
            ? 'Re-measurement keeps the job card in Measuring and asks the Front Desk to re-check the customer.'
            : 'Approved unlocks the move to Pattern Cutting.'}
        </p>
      </VerifyStep>

      {/* STEP 3 — notes for the bench */}
      <VerifyStep n={3} title="Notes for the bench" hint="Written onto the job card so they survive a refresh.">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextArea label="Verification notes" value={notes} onChange={setNotes} placeholder="Anything the cutter should know about this block…" />
          <TextArea label="Concern flags" value={concern} onChange={setConcern} placeholder="e.g. chest seems large vs. past orders" />
        </div>
        <label className="mt-2.5 flex cursor-pointer items-center gap-2.5 rounded-[3px] border border-dashed border-[#D6D1BE] bg-[#FDFCF5] px-3.5 py-2.5 text-xs text-[#6D6A60] transition-colors duration-200 hover:border-[#C9A227]/45">
          <input type="checkbox" checked={requestConfirm} onChange={(e) => setRequestConfirm(e.target.checked)} disabled={locked}
            className="rounded-sm border-[#DCD8C7] text-[#3F6633] focus:ring-[#3F6633]" />
          Re-measurement request — ask the Front Desk to confirm the measurements with the customer
        </label>
        <p className="mt-2.5 text-[10.5px] leading-relaxed text-[#8A846F]">
          Saving records an audit event and writes these notes onto the job card itself (Tailor Notes and Production Notes), so they stay visible after a refresh — including in the Production Summary below.
        </p>
      </VerifyStep>

      {/* ACTION BAR */}
      <div className="flex justify-end border-t border-[#EEEADB] pt-3.5">
        <button onClick={save} disabled={locked || saving}
          className="inline-flex items-center gap-2 rounded-[3px] bg-[#262420] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#F3F1E7] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_12px_24px_-10px_rgba(38,36,32,0.55)] disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none">
          <Check className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Save verification'}
        </button>
      </div>
      </div>
    </Band>
  );
}
/* ===================================================================
   TOP SECTION — PRODUCTION TIMELINE
   Visible for the whole session: the stage rail, current stage, assigned
   tailor, priority, deadline, progress %, and the single most important
   action — advancing this job card to its next stage. The audit trail is
   deliberately NOT here; it lives in its own section at the bottom.
=================================================================== */
function ProductionTimeline({ job, detail, locked, nextStage, onSaved, onStageChange, refresh, onClose }: {
  job: any; detail: any; locked: boolean; nextStage: string | null;
  onSaved: (m: string) => void; onStageChange: (id: string, s: string) => void; refresh: () => void; onClose: () => void;
}) {
  const history = detail.productionHistory || [];
  const pct = progressFor(job.status, detail.alterations);
  // The server refuses to move a card out of Measuring until a passing
  // measurement result is on file, so the action is gated here too.
  const verifications = detail.verifications || [];
  const blockedByMeasurement = job.status === 'Measuring' && !measurementResultPassed(verifications[verifications.length - 1]?.status);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  async function advance(stage: string) {
    setBusy(true);
    try {
      const res = await api(`/tailor/job-cards/${encodeURIComponent(job.id)}/stage`, {
        method: 'POST',
        body: JSON.stringify({ stage, notes }),
      });
      onSaved(res.message || `Stage advanced to ${stage}.`);
      onStageChange(job.id, stage);
      if (job.status === 'Quality Review' && stage === 'Completed') { /* production complete */ }
      setNotes('');
      refresh();
    } catch (e) { onSaved(e instanceof Error ? e.message : 'Could not update stage.'); }
    finally { setBusy(false); }
  }

  return (
    <header className="relative flex-shrink-0 overflow-hidden border-b border-[#E2DECC] px-4 pb-4 pt-4 sm:px-6" style={{ background: 'linear-gradient(180deg,#FFFDF6 0%,#F8F4E9 68%,#F3EEDF 100%)' }}>
      <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full" style={{ background: 'radial-gradient(circle, rgba(228,194,94,0.14), transparent 70%)' }} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <Label>Production workbench</Label>
            <PriorityPill priority={job.priority} />
            {locked && (
              <span className="inline-flex items-center gap-1.5 rounded-[2px] border border-[#C9A227]/50 bg-[#F7E9D8] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8A5A12]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#C9A227]" /> Locked
              </span>
            )}
          </div>
          <div className="mt-2 border-l-2 border-[#C9A227] pl-3">
            <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.01em] text-[#262420] sm:text-2xl" style={{ fontFamily: "'Fraunces', serif" }}>{job.id}</h2>
            <p className="mt-0.5 truncate text-[13px] text-[#6D6A60]">{job.customerName} · {job.garmentType}{job.quantity > 1 ? ` · ×${job.quantity}` : ''}</p>
          </div>
        </div>
        <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-transparent text-[#A39D8A] transition-all duration-200 hover:border-[#DCD8C7] hover:bg-white hover:text-[#262420] hover:shadow-[0_4px_10px_-6px_rgba(38,36,32,0.35)]">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Current stage · assigned tailor · priority · deadline · progress */}
      <div className="relative mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        <MetaTile label="Current stage" value={job.status} tone="#A32E22" delay={0.04} />
        <MetaTile label="Assigned tailor" value={job.assignedName || 'Unassigned'} tone="#262420" delay={0.08} />
        <MetaTile label="Priority" value={job.priority || 'Normal'} tone={PRIORITY_TONE[job.priority] || TOKENS.muted} delay={0.12} />
        <MetaTile label="Deadline" value={formatDate(job.deadline)} tone="#8A5A12" delay={0.16} />
        <MetaTile label="Progress" value={`${pct}%`} tone="#3F6633" bar={pct} delay={0.2} />
      </div>

      {/* Measuring → Pattern Cutting → Initial Assembly → First Fitting →
          Final Alterations → Quality Review → Completed → Ready for Pickup */}
      <div className="relative mt-4">
        <StageRail status={job.status} />
      </div>

      {/* Primary production action — always within reach */}
      <div className="relative mt-4 flex flex-col gap-2.5 border-t border-dashed border-[#E2DECC] pt-3.5 sm:flex-row sm:items-end">
        <label className="block flex-1 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#8A846F]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          Stage notes / remarks
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Remark saved with this status update…"
            className="mt-1.5 w-full rounded-[3px] border border-[#DCD8C7] bg-white px-3 py-2 text-[13px] normal-case tracking-normal text-[#262420] outline-none transition-all duration-200 placeholder:text-[#B4AF9E] hover:border-[#C4BFA9] focus:border-[#9C7D12] focus:shadow-[0_0_0_3px_rgba(201,162,39,0.16)]"
          />
        </label>
        <button onClick={() => nextStage && advance(nextStage)} disabled={locked || busy || !nextStage || blockedByMeasurement}
          className="group inline-flex items-center justify-center gap-2 rounded-[3px] px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#F3F1E7] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_12px_24px_-10px_rgba(38,36,32,0.55)] active:translate-y-0 disabled:translate-y-0 disabled:opacity-45 disabled:shadow-none"
          style={{ background: 'linear-gradient(180deg, #33312C, #211F1C)' }}>
          <Check className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" /> {busy ? 'Saving…' : nextStage ? `Proceed to ${nextStage}` : 'Production complete'}
        </button>
      </div>
      {blockedByMeasurement && !locked && (
        <div className="relative mt-2.5 flex items-start gap-2 rounded-[3px] border border-[#C9A227]/40 bg-[#F7E9D8] px-3 py-2 text-[10.5px] leading-relaxed text-[#8A5A12]">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          <span>Save an “Approved for Production” measurement result in the stage workspace below before this job card can leave Measuring.</span>
        </div>
      )}
      {locked ? (
        <div className="relative mt-2.5 flex items-start gap-2 rounded-[3px] border border-[#C9A227]/40 bg-[#F7E9D8] px-3 py-2 text-[10.5px] leading-relaxed text-[#8A5A12]">
          <span className="mt-[3px] h-2 w-2 flex-shrink-0 rounded-full bg-[#C9A227]" />
          <span>Locked — this job card has left the bench. Manager authorization is required to change production details.</span>
        </div>
      ) : !blockedByMeasurement && (
        <p className="relative mt-2.5 text-[10.5px] leading-relaxed text-[#A39D8A]">Next workflow step: <span className="font-semibold text-[#8A5A12]">{nextStage || 'none — production is complete'}</span>. {history.length} audit record{history.length === 1 ? '' : 's'} on file; the append-only ledger sits at the bottom of this workbench.</p>
      )}
    </header>
  );
}
/* ===================================================================
   FABRIC ROW NORMALISER
   The job-card detail endpoint returns catalogue rows with their database
   column names, while /tailor/inventory maps the same rows to camelCase.
   Read either shape so the fabric panel is correct regardless.
=================================================================== */
function fabricRow(f: any) {
  const stock = Number(f.stockQuantity ?? f.stock_quantity ?? 0);
  const threshold = Number(f.lowStockThreshold ?? f.low_stock_threshold ?? 0);
  return {
    id: f.id,
    name: f.fabricName ?? f.fabric_name ?? '',
    unit: f.unit || 'meters',
    stock: Number.isFinite(stock) ? stock : 0,
    threshold: Number.isFinite(threshold) ? threshold : 0,
    low: f.lowStock !== undefined ? !!f.lowStock : (Number.isFinite(stock) && stock <= threshold),
  };
}
// The two stages in which cloth physically comes off the shelf.
function isDrawStage(status: string) {
  return status === 'Pattern Cutting' || status === 'Initial Assembly';
}

/* ===================================================================
   CENTER COLUMN — STAGE-SPECIFIC FORMS
   Exactly one is mounted, chosen by the card's current stage. Each posts
   to the endpoint it has always posted to.
=================================================================== */

// Stage = Pattern Cutting → cutting + pattern details.
function PatternCuttingSection({ detail, locked, onSaved, refresh }: { detail: any; locked: boolean; onSaved: (m: string) => void; refresh: () => void }) {
  const jobFabric = detail.jobCard?.fabric || '';
  const [cutNotes, setCutNotes] = useState('');
  const [patternNotes, setPatternNotes] = useState('');
  const [fabricType, setFabricType] = useState(jobFabric || '');
  const [estMeters, setEstMeters] = useState('');
  const [busy, setBusy] = useState(false);

  async function savePattern() {
    setBusy(true);
    try {
      const res = await api(`/tailor/job-cards/${encodeURIComponent(detail.jobCard.id)}/pattern-cutting`, {
        method: 'POST',
        body: JSON.stringify({ cuttingNotes: cutNotes, patternNotes, fabricType, estimatedMeters: estMeters }),
      });
      onSaved(res.message); setCutNotes(''); setPatternNotes(''); setFabricType(''); setEstMeters(''); refresh();
    } catch (e) { onSaved(e instanceof Error ? e.message : 'Could not save pattern notes.'); }
    finally { setBusy(false); }
  }

  return (
    <Band label="Pattern cutting" icon={<Scissors className="h-3.5 w-3.5 text-[#9C7D12]" strokeWidth={1.6} />}>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextArea label="Cutting notes" value={cutNotes} onChange={setCutNotes} placeholder="How the block was cut…" />
        <TextArea label="Pattern notes" value={patternNotes} onChange={setPatternNotes} placeholder="Pattern used / any adjustment made…" />
        <Input label="Fabric type" value={fabricType} onChange={setFabricType} />
        <Input label="Est. meters required" value={estMeters} onChange={setEstMeters} type="number" />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#EEEADB] pt-3.5">
        <p className="flex items-center gap-2 text-[10.5px] text-[#A39D8A]"><StitchLine className="w-7 flex-shrink-0" /> Saved as an append-only entry on the job card's audit train.</p>
        <button onClick={savePattern} disabled={locked || busy}
          className="inline-flex items-center gap-2 rounded-[3px] bg-[#262420] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#F3F1E7] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_12px_24px_-10px_rgba(38,36,32,0.55)] disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none">
          <Check className="h-3.5 w-3.5" /> {busy ? 'Saving…' : 'Save pattern details'}
        </button>
      </div>
    </Band>
  );
}

// Stage = Initial Assembly → assembly notes, progress, issues, work photos.
function AssemblySection({ detail, locked, onSaved, refresh }: { detail: any; locked: boolean; onSaved: (m: string) => void; refresh: () => void }) {
  const [assemblyNotes, setAssemblyNotes] = useState('');
  const [progress, setProgress] = useState('');
  const [issues, setIssues] = useState('');
  const [startDate, setStartDate] = useState('');
  const [workPhotos, setWorkPhotos] = useState('');
  const [busy, setBusy] = useState(false);

  async function saveAssembly() {
    setBusy(true);
    try {
      const res = await api(`/tailor/job-cards/${encodeURIComponent(detail.jobCard.id)}/assembly`, {
        method: 'POST',
        body: JSON.stringify({ assemblyNotes, progress, issues, startDate: startDate || null, workPhotos }),
      });
      onSaved(res.message || 'Assembly details recorded.');
      setAssemblyNotes(''); setProgress(''); setIssues(''); setStartDate(''); setWorkPhotos('');
      refresh();
    } catch (e) { onSaved(e instanceof Error ? e.message : 'Could not save assembly details.'); }
    finally { setBusy(false); }
  }

  return (
    <Band label="Initial assembly" icon={<Shirt className="h-3.5 w-3.5 text-[#9C7D12]" strokeWidth={1.6} />}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <div className="mb-2 flex items-center gap-2.5">
            <span className="h-px w-4 bg-[#C9A227]/60" />
            <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#8A5A12]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Build activity</span>
          </div>
        </div>
        <TextArea label="Assembly notes" value={assemblyNotes} onChange={setAssemblyNotes} placeholder="Sleeves set, collar attached, lining basted…" />
        <TextArea label="Issues encountered" value={issues} onChange={setIssues} placeholder="e.g. shoulder padding needed on the left" />
        <div className="sm:col-span-2">
          <div className="mb-2 mt-1 flex items-center gap-2.5">
            <span className="h-px w-4 bg-[#C9A227]/60" />
            <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#8A5A12]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Tracking</span>
          </div>
        </div>
        <Input label="Assembly progress" value={progress} onChange={setProgress} placeholder="e.g. 60% of assembly" />
        <Input label="Assembly start date" value={startDate} onChange={setStartDate} type="date" />
        <div className="sm:col-span-2">
          <TextArea label="Work photo references" value={workPhotos} onChange={setWorkPhotos} placeholder="Filenames or links to assembly photos" />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#EEEADB] pt-3.5">
        <p className="flex items-center gap-2 text-[10.5px] text-[#A39D8A]"><StitchLine className="w-7 flex-shrink-0" /> Recorded on the job card's audit train — nothing is overwritten.</p>
        <button onClick={saveAssembly} disabled={locked || busy}
          className="inline-flex items-center gap-2 rounded-[3px] bg-[#262420] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#F3F1E7] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_12px_24px_-10px_rgba(38,36,32,0.55)] disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none">
          <Check className="h-3.5 w-3.5" /> {busy ? 'Saving…' : 'Save assembly details'}
        </button>
      </div>
    </Band>
  );
}

// Records cloth drawn for THIS job card (stock is deducted immediately). It
// lives in the right-hand Fabric card — expanded by default during the two
// stages that draw cloth, folded away otherwise so the workbench stays short.
function FabricUsageForm({ detail, locked, onSaved, refresh, startOpen = false }: { detail: any; locked: boolean; onSaved: (m: string) => void; refresh: () => void; startOpen?: boolean }) {
  const inventory = detail.inventory || [];
  const jobFabric = detail.jobCard?.fabric || '';
  const catalogue = useMemo(() => (inventory as any[]).map(fabricRow), [inventory]);
  const matched = useMemo(() => catalogue.find((r) => r.name.toLowerCase() === jobFabric.toLowerCase()) || null, [catalogue, jobFabric]);
  // The unit selector is driven by the fabrics actually on the shelf, so the
  // tailor sees cloth names rather than a bare generic unit.
  const unitOptions = useMemo(() => {
    const seen = new Map<string, string>();
    catalogue.forEach((f) => { if (f.unit && !seen.has(f.unit)) seen.set(f.unit, f.name || f.unit); });
    const opts = Array.from(seen, ([unit, name]) => ({ unit, name }));
    if (!opts.length) return [{ unit: 'meters', name: 'Fabric' }, { unit: 'yards', name: 'Fabric' }];
    if (!opts.some((o) => o.unit === 'meters')) opts.push({ unit: 'meters', name: 'Fabric' });
    if (!opts.some((o) => o.unit === 'yards')) opts.push({ unit: 'yards', name: 'Fabric' });
    return opts;
  }, [catalogue]);
  const [open, setOpen] = useState(!!startOpen);
  // Open automatically the moment the card reaches a stage that draws cloth.
  useEffect(() => { if (startOpen) setOpen(true); }, [startOpen]);
  const [fabricId, setFabricId] = useState(() => (matched ? String(matched.id) : ''));
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState(matched?.unit || 'meters');
  const [notes, setNotes] = useState('');
  const [warn, setWarn] = useState('');
  const [busy, setBusy] = useState(false);

  async function recordUsage() {
    setBusy(true); setWarn('');
    try {
      if (!fabricId && !jobFabric) throw new Error('Select a fabric from the shelf before recording usage.');
      const body: any = { quantityUsed: qty, unit, notes };
      if (fabricId) body.fabricId = Number(fabricId);
      // Fall back to the fabric already linked to the order so the backend
      // deducts from the correct bolt (one shared record, no re-entry).
      body.fabricName = jobFabric || (catalogue.find((r) => String(r.id) === String(fabricId))?.name || '');
      const res = await api(`/tailor/job-cards/${encodeURIComponent(detail.jobCard.id)}/fabric-usage`, { method: 'POST', body: JSON.stringify(body) });
      onSaved(res.message || 'Fabric usage recorded.');
      if (res.warnings?.length) setWarn(`Low stock: ${res.warnings.map((w: any) => `${w.fabricName} (${w.remaining} ${w.unit})`).join(', ')}`);
      setQty(''); setFabricId(''); setNotes(''); refresh();
    } catch (e) { onSaved(e instanceof Error ? e.message : 'Could not record usage.'); }
    finally { setBusy(false); }
  }

  return (
    <div className="mt-4 border-t border-[#EEEADB] pt-3.5">
      <button onClick={() => setOpen((v) => !v)} className="group flex w-full items-center justify-between gap-2 rounded-[3px] border border-dashed border-[#D6D1BE] bg-[#FDFCF6] px-3.5 py-2.5 text-left transition-all duration-200 hover:border-[#C9A227]/50">
        <span className="flex items-center gap-2"><Label>Record cloth usage</Label></span>
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9C7D12]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {open ? 'Hide' : 'Open'}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <label className="block">
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#8A846F]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Fabric bolt</span>
            <select value={fabricId} onChange={(e) => {
              const id = e.target.value;
              setFabricId(id);
              const picked = catalogue.find((f) => String(f.id) === String(id));
              if (picked) setUnit(picked.unit || 'meters');
            }}
              disabled={locked}
              className="mt-1.5 w-full cursor-pointer rounded-[3px] border border-[#DCD8C7] bg-white px-3 py-2.5 text-sm text-[#55503F] outline-none transition-all duration-200 hover:border-[#C4BFA9] focus:border-[#9C7D12] focus:shadow-[0_0_0_3px_rgba(201,162,39,0.16)] disabled:cursor-not-allowed disabled:bg-[#F4F1E6]">
              <option value="">Select fabric…</option>
              {catalogue.map((fabric) => <option key={fabric.id} value={fabric.id}>{fabric.name || `Fabric ${fabric.id}`} — {fabric.stock} {fabric.unit}{fabric.low ? ' (LOW)' : ''}</option>)}
            </select>
          </label>
          {jobFabric && (
            <p className="text-[10.5px] text-[#6D6A60]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              Order fabric: <span className="font-semibold text-[#3F6633]">{jobFabric}</span>
              {matched ? ` · stock ${matched.stock} ${matched.unit}` : ' · not in catalogue — created on first use'}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Quantity used" value={qty} onChange={setQty} type="number" />
            <label className="block text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#8A846F]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Unit
              <select value={unit} onChange={(e) => setUnit(e.target.value)} className="mt-2 w-full cursor-pointer rounded-[3px] border border-[#DCD8C7] bg-white px-3 py-2.5 text-sm normal-case tracking-normal outline-none transition-all duration-200 hover:border-[#C4BFA9] focus:border-[#9C7D12] focus:shadow-[0_0_0_3px_rgba(201,162,39,0.16)]">
                {unitOptions.map((u) => <option key={u.unit} value={u.unit}>{u.name} — {u.unit}</option>)}
              </select>
            </label>
          </div>
          <Input label="Notes" value={notes} onChange={setNotes} />
          {warn && <div className="flex items-center gap-2 rounded-[3px] border border-[#C87965]/50 bg-[#F7E7E1] px-3 py-2 text-xs text-[#9A4936]"><AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" /> {warn}</div>}
          <div className="flex justify-end border-t border-[#EEEADB] pt-3">
            <button onClick={recordUsage} disabled={locked || busy}
              className="inline-flex items-center gap-2 rounded-[3px] bg-[#262420] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#F3F1E7] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_12px_24px_-10px_rgba(38,36,32,0.55)] disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none">
              <Boxes className="h-3.5 w-3.5" /> {busy ? 'Saving…' : 'Record usage'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================================================================
   RIGHT COLUMN — FABRIC INFORMATION, USAGE HISTORY & PRODUCTION SUMMARY
   Viewing information only, apart from the single (collapsible) usage form.
=================================================================== */
function FabricPanel({ detail, locked, onSaved, refresh }: { detail: any; locked: boolean; onSaved: (m: string) => void; refresh: () => void }) {
  const inventory = detail.inventory || [];
  const usage = detail.fabricUsage || [];
  const jobFabric = detail.jobCard?.fabric || '';
  const stage = detail.jobCard?.status || '';
  const catalogue = useMemo(() => (inventory as any[]).map(fabricRow), [inventory]);
  const matched = useMemo(() => catalogue.find((r) => r.name.toLowerCase() === jobFabric.toLowerCase()) || null, [catalogue, jobFabric]);
  const drawName = matched?.name || usage[0]?.fabric_name || jobFabric;
  const unitLabel = matched?.unit || usage[0]?.unit || 'meters';
  // Cloth drawn for THIS job card — usage rows are liened to the job card.
  const usedForJob = usage
    .filter((u: any) => !drawName || String(u.fabric_name).toLowerCase() === String(drawName).toLowerCase())
    .reduce((sum: number, u: any) => sum + (Number(u.quantity_used) || 0), 0);
  const shelf = matched ? matched.stock : null;
  const opening = shelf === null ? null : Number((shelf + usedForJob).toFixed(2));

  return (
    <Band label="Fabric information" icon={<Boxes className="h-3.5 w-3.5 text-[#9C7D12]" strokeWidth={1.6} />}>
      {/* Inventory dashboard — bolt identity + stock meter */}
      <div className="mb-3 flex items-center gap-3 rounded-[3px] border border-[#E9E5D4] bg-[#FDFCF6] px-3.5 py-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[#C9A227]/30" style={{ background: 'linear-gradient(135deg, rgba(228,194,94,0.22), rgba(201,162,39,0.06))' }}>
          <Boxes className="h-4 w-4 text-[#9C7D12]" strokeWidth={1.6} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-tight text-[#262420]" style={{ fontFamily: "'Fraunces', serif" }}>{drawName || 'No fabric on the card'}</p>
          <p className="mt-0.5 text-[10.5px] text-[#8A846F]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>UNIT · {unitLabel.toUpperCase()}</p>
        </div>
        {matched && (
          <span className={`flex-shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] ${matched.low ? 'border-[#C87965]/50 bg-[#F7E7E1] text-[#9A4936]' : 'border-[#8FAE85]/60 bg-[#E4EBDA] text-[#3F6633]'}`}>
            {matched.low ? 'Low stock' : 'In stock'}
          </span>
        )}
      </div>
      {opening !== null && shelf !== null && (
        <div className="mb-3 rounded-[3px] border border-[#E9E5D4] bg-[#FDFCF6] p-3.5">
          <div className="flex items-center justify-between">
            <Label>Bolt balance</Label>
            <span className="text-[10px] font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace", color: matched?.low ? '#9A4936' : '#3F6633' }}>{shelf} {unitLabel} left</span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full" style={{ background: '#ECE7D4', boxShadow: '0 1px 2px rgba(38,36,32,0.08) inset' }}>
            <div className="relative h-full overflow-hidden rounded-full" style={{
              width: `${Math.min(100, Math.max(0, opening > 0 ? (shelf / opening) * 100 : 0))}%`,
              background: matched?.low ? 'linear-gradient(90deg,#8E2A20,#C87965,#8E2A20)' : 'linear-gradient(90deg,#9C7D12,#E4C25E,#9C7D12)',
              backgroundSize: '200% 100%',
              animation: 'jcGrow 1.1s cubic-bezier(0.22,1,0.36,1) both, jcRailFlow 2.8s linear 1.1s infinite',
            }}>
              <span className="absolute inset-y-0 w-6" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.65),transparent)', animation: 'jcShimmer 2.4s ease-in-out 0.6s infinite' }} />
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[9.5px] text-[#8A846F]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            <span>Used for this job · {Number(usedForJob.toFixed(2))} {unitLabel}</span>
            <span>Opening · {opening} {unitLabel}</span>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2.5">
        <Info label="Fabric name" value={drawName || '—'} />
        <Info label="Opening stock" value={opening === null ? '—' : `${opening} ${unitLabel}`} />
        <Info label="Used for this job" value={`${Number(usedForJob.toFixed(2))} ${unitLabel}`} />
        <Info label="Current stock" value={shelf === null ? 'Not in catalogue' : `${shelf} ${unitLabel}`} />
      </div>
      <p className="mt-2.5 text-[10.5px] leading-relaxed text-[#8A846F]">
        {opening === null
          ? 'This fabric is not in the catalogue yet — the row is created on the first recorded draw.'
          : `Opening stock ${opening} ${unitLabel} − used for this job ${Number(usedForJob.toFixed(2))} ${unitLabel} = current stock ${shelf} ${unitLabel}. Cloth leaves the shelf the moment usage is recorded, so the current balance already excludes every draw listed below.`}
      </p>
      {matched?.low && (
        <div className="mt-2.5 flex items-start gap-2 rounded-[3px] border border-[#C87965]/50 bg-[#F7E7E1] px-3.5 py-2.5 text-[11.5px] text-[#9A4936]">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" style={{ animation: 'jcPulse 2s ease-in-out infinite' }} />
          <span>Below the low-stock threshold{matched.threshold ? ` (${matched.threshold} ${unitLabel})` : ''} — flag the Front Desk for a restock.</span>
        </div>
      )}

      <div className="mt-4 border-t border-dashed border-[#E7E3D2] pt-3.5">
        <Label>Fabric usage history</Label>
        {usage.length === 0 ? (
          <p className="mt-1.5 text-[12px] italic text-[#A39D8A]">No cloth has been drawn for this job card yet.</p>
        ) : (
          <>
            <FabricUsageChart usage={usage} />
            <div className="mt-1 divide-y divide-[#EEEADB]">
              {usage.slice().reverse().map((u: any) => (
                <div key={u.id} className="group flex items-start justify-between gap-3 py-2.5 transition-colors duration-200 hover:bg-[#FDFCF6]">
                  <div className="min-w-0">
                    <p className="text-[12.5px] text-[#262420]"><span className="font-medium">{u.fabric_name}</span> — {u.quantity_used} {u.unit}</p>
                    {u.notes && <p className="text-[11.5px] text-[#6D6A60]">{u.notes}</p>}
                  </div>
                  {u.created_at && <p className="flex-shrink-0 text-[10px] text-[#A39D8A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{new Date(u.created_at).toLocaleString()}</p>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Single mount point for the usage form */}
      <FabricUsageForm detail={detail} locked={locked} onSaved={onSaved} refresh={refresh} startOpen={isDrawStage(stage)} />
    </Band>
  );
}
// Production summary — the read-only record of where this job card stands.
// Rendered at the BOTTOM of the workbench, deliberately kept apart from both
// the production actions above and the audit history beside it.
function ProductionSummaryCard({ detail, job }: { detail: any; job: any }) {
  const history = detail.productionHistory || [];
  const latestAlteration = [...(detail.alterations || [])].pop();
  const started = history[0]?.created_at || job.assignedAt;
  const pct = progressFor(job.status, detail.alterations);
  const estimated = latestAlteration?.estimated_completion || job.deadline;
  const estimateSource = latestAlteration?.estimated_completion ? 'from the alteration plan' : (job.deadline ? 'order deadline' : '');
  const updated = latestTimestamp(detail, job);
  // Remarks come from the SAVED production record first — final garment remarks,
  // then the production notes written by each workflow step — and never from the
  // audit event list alone.
  const remarks = job.finalRemarks || job.productionNotes || job.tailorNotes || '';
  return (
    <Band label="Production summary" icon={<TrendingUp className="h-3.5 w-3.5 text-[#9C7D12]" strokeWidth={1.6} />}>
      {/* Executive completion strip */}
      <div className="mb-4 flex items-center gap-4 rounded-[3px] border border-[#E9E5D4] bg-[#FDFCF6] px-3.5 py-3">
        <div className="flex-1">
          <div className="flex items-center justify-between gap-3">
            <Label>Overall completion</Label>
            <span className="text-[13px] font-semibold text-[#262420]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{pct}%</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full" style={{ background: '#ECE7D4', boxShadow: '0 1px 2px rgba(38,36,32,0.08) inset' }}>
            <div className="relative h-full overflow-hidden rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#9C7D12,#E4C25E,#9C7D12)', backgroundSize: '200% 100%', animation: 'jcGrow 1.1s cubic-bezier(0.22,1,0.36,1) both, jcRailFlow 2.8s linear 1.1s infinite' }}>
              <span className="absolute inset-y-0 w-6" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.65),transparent)', animation: 'jcShimmer 2.4s ease-in-out 0.5s infinite' }} />
            </div>
          </div>
        </div>
        <div className="hidden flex-shrink-0 border-l border-dashed border-[#E2DECC] pl-4 sm:block">
          <div className="text-[8.5px] font-medium uppercase tracking-[0.16em] text-[#8A846F]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Stage</div>
          <div className="mt-0.5 text-[13px] font-semibold text-[#A32E22]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{job.status}</div>
        </div>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <Info label="Current stage" value={job.status} />
        <Info label="Progress" value={`${pct}%`} />
        <Info label="Production start date" value={started ? formatDate(started) : '—'} />
        <Info label="Estimated completion" value={estimated ? formatDate(estimated) : '—'} />
        <Info label="Fabric used" value={job.fabricUsed || '—'} />
        <Info label="Completion date" value={job.completionDate ? formatDate(job.completionDate) : '—'} />
        <Info label="Last updated" value={updated ? new Date(updated).toLocaleString() : '—'} />
        <Info label="Audit records" value={String(history.length)} />
      </div>
      <div className="mt-3.5 grid gap-3 lg:grid-cols-[1.2fr_1fr]">
        <NoteBlock label="Tailor remarks" value={remarks} />
        <p className="text-[10.5px] leading-relaxed text-[#8A846F]">
          {estimateSource ? `Estimate ${estimateSource}. ` : ''}
          Tailor remarks are read from the saved production record — final garment remarks first, then the production notes written by each workflow step (for example the measurement verification). The audit history below holds the full immutable event list.
        </p>
      </div>
      <div className="mt-3.5">
        <StageProgressGauge status={job.status} historyCount={history.length} />
      </div>
    </Band>
  );
}
function FittingSection({ detail, locked, onSaved, refresh }: { detail: any; locked: boolean; onSaved: (m: string) => void; refresh: () => void }) {
  const fittings = detail.fittings || [];
  const [fitResult, setFitResult] = useState('Approved');
  const [feedback, setFeedback] = useState('');
  const [adjustments, setAdjustments] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const res = await api(`/tailor/job-cards/${encodeURIComponent(detail.jobCard.id)}/fittings`, {
        method: 'POST',
        body: JSON.stringify({ fitResult, customerFeedback: feedback, requiredAdjustments: adjustments, notes }),
      });
      onSaved(res.message); setFeedback(''); setAdjustments(''); setNotes(''); refresh();
    } catch (e) { onSaved(e instanceof Error ? e.message : 'Could not record fitting.'); }
    finally { setBusy(false); }
  }

  return (
    <Band label="Fittings" icon={<Shirt className="h-3.5 w-3.5 text-[#9C7D12]" strokeWidth={1.6} />}>
      {fittings.length > 0 && (
        <ol className="jc-line mb-5 space-y-0">
          {fittings.map((f: any) => {
            const tone = f.fit_result === 'Approved' ? '#3F6633' : f.fit_result === 'Minor Alterations Needed' ? '#B87A1A' : '#A32E22';
            return (
              <li key={f.id} className="relative pb-4 pl-6 last:pb-0">
                <span aria-hidden="true" className="absolute left-0 top-1 h-[11px] w-[11px] rounded-full border-2 border-white" style={{ background: tone, boxShadow: '0 0 0 1.5px rgba(201,162,39,0.35)' }} />
                <div className="rounded-[3px] border border-[#EEEADB] bg-[#FDFCF6] px-3.5 py-2.5 transition-colors duration-200 hover:border-[#C9A227]/35">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em]" style={{ color: tone, borderColor: `${tone}44`, background: `${tone}0D` }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone }} />{f.fit_result}
                    </span>
                    <span className="text-[10px] text-[#A39D8A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{new Date(f.recorded_at).toLocaleString()}</span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-[#8A846F]">Recorded by <span className="font-medium text-[#262420]">{f.recorded_by_name || 'Tailor'}</span></p>
                  {f.customer_feedback && <p className="mt-1 text-[12px] leading-relaxed text-[#6D6A60]">Feedback: {f.customer_feedback}</p>}
                  {f.required_adjustments && <p className="mt-1 text-[12px] leading-relaxed text-[#6D6A60]">Adjustments: {f.required_adjustments}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <StitchLine className="w-7 flex-shrink-0" />
          <Label>Record fitting result</Label>
        </div>
        <div className="flex flex-wrap gap-2">
          {['Approved', 'Minor Alterations Needed', 'Major Alterations Needed'].map((r) => {
            const tone = r === 'Approved' ? '#3F6633' : r === 'Minor Alterations Needed' ? '#B87A1A' : '#A32E22';
            return (
              <button key={r} onClick={() => setFitResult(r)} disabled={locked}
                className={`rounded-[3px] border px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] transition-all duration-200 hover:-translate-y-px disabled:translate-y-0 ${fitResult === r ? 'shadow-[0_8px_18px_-12px_rgba(38,36,32,0.5)]' : 'border-[#A39D8A] text-[#8A846F] hover:bg-white disabled:translate-y-0'}`}
                style={fitResult === r ? { color: tone, borderColor: tone, background: `${tone}12` } : undefined}>{r}</button>
            );
          })}
        </div>
        <div className="grid gap-3 pt-1 sm:grid-cols-2">
          <TextArea label="Customer feedback" value={feedback} onChange={setFeedback} />
          <TextArea label="Required adjustments" value={adjustments} onChange={setAdjustments} />
          <Input label="Notes" value={notes} onChange={setNotes} />
        </div>
        <div className="flex justify-end border-t border-[#EEEADB] pt-3.5">
          <button onClick={save} disabled={locked || busy}
            className="inline-flex items-center gap-2 rounded-[3px] bg-[#262420] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#F3F1E7] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_12px_24px_-10px_rgba(38,36,32,0.55)] disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none">
            <Check className="h-3.5 w-3.5" /> Save fitting
          </button>
        </div>
      </div>
    </Band>
  );
}
function AlterSection({ detail, locked, onSaved, refresh }: { detail: any; locked: boolean; onSaved: (m: string) => void; refresh: () => void }) {
  const alterations = detail.alterations || [];
  const [f, setF] = useState({ waist: '', sleeve: '', length: '', shoulder: '', other: '', notes: '', pct: '0', est: '' });
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const res = await api(`/tailor/job-cards/${encodeURIComponent(detail.jobCard.id)}/alterations`, {
        method: 'POST',
        body: JSON.stringify({ waistAdjustment: f.waist, sleeveAdjustment: f.sleeve, lengthAdjustment: f.length, shoulderAdjustment: f.shoulder, otherModifications: f.other, notes: f.notes, completionPercentage: f.pct === '' ? 0 : Number(f.pct), estimatedCompletion: f.est }),
      });
      onSaved(res.message); setF({ waist: '', sleeve: '', length: '', shoulder: '', other: '', notes: '', pct: '0', est: '' }); refresh();
    } catch (e) { onSaved(e instanceof Error ? e.message : 'Could not record alterations.'); }
    finally { setBusy(false); }
  }
  return (
    <Band label="Final alterations" icon={<Scissors className="h-3.5 w-3.5 text-[#9C7D12]" strokeWidth={1.6} />}>
      {alterations.length > 0 && (
        <ol className="jc-line mb-5 space-y-0">
          {alterations.map((a: any) => {
            const pctVal = Math.min(100, Math.max(0, Number(a.completion_percentage) || 0));
            return (
              <li key={a.id} className="relative pb-4 pl-6 last:pb-0">
                <span aria-hidden="true" className="absolute left-0 top-1 h-[11px] w-[11px] rounded-full border-2 border-white" style={{ background: 'linear-gradient(135deg,#B4842A,#E4C25E)', boxShadow: '0 0 0 1.5px rgba(201,162,39,0.35)' }} />
                <div className="rounded-[3px] border border-[#EEEADB] bg-[#FDFCF6] px-3.5 py-2.5 transition-colors duration-200 hover:border-[#C9A227]/35">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[12.5px] font-semibold text-[#262420]">Completion {a.completion_percentage}%</p>
                    {a.estimated_completion && (
                      <span className="rounded-full border border-[#C9A227]/40 bg-[#FBF4E2] px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8A5A12]">est. {formatDate(a.estimated_completion)}</span>
                    )}
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ background: '#EDE8D6' }}>
                    <div className="h-full rounded-full" style={{ width: `${pctVal}%`, background: 'linear-gradient(90deg,#9C7D12,#E4C25E)', animation: 'jcGrow 0.9s cubic-bezier(0.22,1,0.36,1) both' }} />
                  </div>
                  {a.notes && <p className="mt-1.5 text-[12px] leading-relaxed text-[#6D6A60]">{a.notes}</p>}
                  {(a.waist_adjustment || a.sleeve_adjustment || a.length_adjustment || a.shoulder_adjustment || a.other_modifications) && (
                    <p className="mt-1 text-[12px] leading-relaxed text-[#6D6A60]">{[a.waist_adjustment && `Waist ${a.waist_adjustment}`, a.sleeve_adjustment && `Sleeve ${a.sleeve_adjustment}`, a.length_adjustment && `Length ${a.length_adjustment}`, a.shoulder_adjustment && `Shoulder ${a.shoulder_adjustment}`, a.other_modifications].filter(Boolean).join(' · ')}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input label="Waist" value={f.waist} onChange={(v) => setF((p) => ({ ...p, waist: v }))} placeholder="e.g. −1 in" />
        <Input label="Sleeve" value={f.sleeve} onChange={(v) => setF((p) => ({ ...p, sleeve: v }))} placeholder="e.g. +0.5 in" />
        <Input label="Length" value={f.length} onChange={(v) => setF((p) => ({ ...p, length: v }))} placeholder="e.g. +1 in" />
        <Input label="Shoulder" value={f.shoulder} onChange={(v) => setF((p) => ({ ...p, shoulder: v }))} placeholder="e.g. −0.25 in" />
        <Input label="Other modifications" value={f.other} onChange={(v) => setF((p) => ({ ...p, other: v }))} className="col-span-2" />
        <Input label="Completion %" value={f.pct} onChange={(v) => setF((p) => ({ ...p, pct: v }))} type="number" />
        <Input label="Estimated completion" value={f.est} onChange={(v) => setF((p) => ({ ...p, est: v }))} type="date" />
        <TextArea label="Alteration notes" value={f.notes} onChange={(v) => setF((p) => ({ ...p, notes: v }))} className="col-span-2" />
      </div>
      {/* Live preview of the completion figure being recorded */}
      <div className="mt-3 rounded-[3px] border border-[#E9E5D4] bg-[#FDFCF6] px-3.5 py-2.5">
        <div className="flex items-center justify-between">
          <Label>Completion preview</Label>
          <span className="text-[11px] font-semibold text-[#262420]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{Math.min(100, Math.max(0, Number(f.pct) || 0))}%</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full" style={{ background: '#EDE8D6' }}>
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, Number(f.pct) || 0))}%`, background: 'linear-gradient(90deg,#9C7D12,#E4C25E)' }} />
        </div>
      </div>
      <div className="mt-3 flex justify-end border-t border-[#EEEADB] pt-3.5">
        <button onClick={save} disabled={locked || busy}
          className="inline-flex items-center gap-2 rounded-[3px] bg-[#262420] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#F3F1E7] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_12px_24px_-10px_rgba(38,36,32,0.55)] disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none">
          <Check className="h-3.5 w-3.5" /> Save alterations
        </button>
      </div>
    </Band>
  );
}
function QualitySection({ detail, locked, onSaved, refresh, onStageChange }: { detail: any; locked: boolean; onSaved: (m: string) => void; refresh: () => void; onStageChange: (id: string, s: string) => void }) {
  const job = detail.jobCard;
  const qc = detail.qualityReview;
  const [checks, setChecks] = useState({ measurementsVerified: false, stitchingChecked: false, fabricQualityChecked: false, requirementsCompleted: false, cleanedPressed: false });
  const [result, setResult] = useState('Passed');
  const [rework, setRework] = useState('');
  const [finalRemarks, setFinalRemarks] = useState('');
  const [busy, setBusy] = useState(false);

  function toggle(key: string) { setChecks((p) => ({ ...p, [key]: !p[key] })); }
  const allTrue = Object.values(checks).every(Boolean);
  // Server-side rule mirrored in the UI: only a saved Passed QC row may advance
  // the card to Completed, so the completion action stays locked until then.
  const qcPassed = qc?.result === 'Passed';

  async function saveQC() {
    setBusy(true);
    try {
      const res = await api(`/tailor/job-cards/${encodeURIComponent(job.id)}/quality-control`, {
        method: 'POST',
        body: JSON.stringify({ result, ...checks, reworkNotes: rework }),
      });
      onSaved(res.message); setRework(''); refresh();
    } catch (e) { onSaved(e instanceof Error ? e.message : 'Could not save quality review.'); }
    finally { setBusy(false); }
  }

  async function markComplete() {
    setBusy(true);
    try {
      const res = await api(`/tailor/job-cards/${encodeURIComponent(job.id)}/complete`, {
        method: 'POST',
        body: JSON.stringify({ finalRemarks }),
      });
      onSaved(res.message); onStageChange(job.id, 'Completed'); setFinalRemarks(''); refresh();
    } catch (e) { onSaved(e instanceof Error ? e.message : 'Could not mark complete.'); }
    finally { setBusy(false); }
  }

  return (
    <Band label="Quality review" icon={<ClipboardCheck className="h-3.5 w-3.5 text-[#9C7D12]" strokeWidth={1.6} />}>
      <p className="mb-3.5 text-[11.5px] leading-relaxed text-[#6D6A60]">Dedicated quality-control card — every item must be ticked and the result must be <span className="font-semibold text-[#3F6633]">Passed</span> before this garment can be marked Completed.</p>
      {/* Inspection checklist — visual completion indicators */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {[['measurementsVerified', 'Measurements verified'], ['stitchingChecked', 'Stitching checked'], ['fabricQualityChecked', 'Fabric quality checked'], ['requirementsCompleted', 'Customer requirements completed'], ['cleanedPressed', 'Garment cleaned and pressed']].map(([key, label]) => {
          const on = !!checks[key];
          return (
            <label key={key} className={`flex cursor-pointer items-center gap-3 rounded-[3px] border px-3.5 py-3 text-xs transition-all duration-200 hover:-translate-y-px ${on ? 'border-[#3F6633]/45 bg-[#F0F4E8] text-[#3F6633]' : 'border-[#EEEADB] bg-[#FBF9F2] text-[#6D6A60] hover:border-[#C9A227]/40'}`}>
              <input type="checkbox" checked={on} onChange={() => toggle(key)} disabled={locked || job.status === 'Completed' || job.status === 'Ready for Pickup'} className="sr-only" />
              <span className={`flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-[2px] border transition-all duration-200 ${on ? 'border-[#3F6633] bg-[#3F6633]' : 'border-[#C4BFA9] bg-white'}`}>
                {on && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
              </span>
              <span className="flex-1 leading-snug">{label}</span>
              <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full transition-all duration-200 ${on ? 'bg-[#3F6633] shadow-[0_0_5px_rgba(63,102,51,0.6)]' : 'bg-[#D6D1BE]'}`} />
            </label>
          );
        })}
      </div>
      {/* Checklist completion meter */}
      <div className="mt-3 rounded-[3px] border border-[#E9E5D4] bg-[#FDFCF6] px-3.5 py-2.5">
        <div className="flex items-center justify-between">
          <Label>Inspection progress</Label>
          <span className="text-[11px] font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace", color: allTrue ? '#3F6633' : '#8A5A12' }}>{Object.values(checks).filter(Boolean).length} / 5 checks</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full" style={{ background: '#EDE8D6' }}>
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(Object.values(checks).filter(Boolean).length / 5) * 100}%`, background: allTrue ? 'linear-gradient(90deg,#3F6633,#6D8F5E)' : 'linear-gradient(90deg,#9C7D12,#E4C25E)' }} />
        </div>
      </div>
      <div className="mt-3.5 flex flex-wrap items-center gap-3">
        <Label>Result</Label>
        {['Passed', 'Returned for Rework'].map((r) => (
          <button key={r} onClick={() => setResult(r)} disabled={locked}
            className={`inline-flex items-center gap-2 rounded-[3px] border px-3.5 py-2 text-[10px] font-semibold uppercase transition-all duration-200 hover:-translate-y-px disabled:translate-y-0 ${result === r ? (r === 'Passed' ? 'border-[#3F6633] bg-[#3F6633]/12 text-[#3F6633]' : 'border-[#A32E22] bg-[#A32E22]/10 text-[#A32E22]') : 'border-[#A39D8A] text-[#8A846F] hover:bg-white'}`}>
            <span className="inline-flex h-2.5 w-2.5 rounded-full border" style={{ borderColor: 'currentColor', background: result === r ? 'currentColor' : 'transparent', boxShadow: result === r ? '0 0 6px currentColor' : 'none' }} />
            {r}
          </button>
        ))}
        <button onClick={saveQC} disabled={locked || busy} className="ml-auto inline-flex items-center gap-2 rounded-[3px] bg-[#262420] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#F3F1E7] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_12px_24px_-10px_rgba(38,36,32,0.55)] disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none">
          <Check className="h-3.5 w-3.5" /> Save quality review
        </button>
      </div>
      {!allTrue && <p className="mt-2 text-[11px] leading-relaxed text-[#8A5A12]">Only a full checklist with a Passed result may proceed to Completed.</p>}

      {qc && qc.result === 'Returned for Rework' && (
        <div className="mt-3 flex items-start gap-2 rounded-[3px] border border-[#C87965]/50 bg-[#F7E7E1] px-3.5 py-2.5 text-xs leading-relaxed text-[#9A4936]">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          <span>Last review returned for rework{qc.rework_notes ? `: ${qc.rework_notes}` : ''}.</span>
        </div>
      )}

      {['Quality Review', 'Final Alterations'].includes(job.status) && (
        <div className="relative mt-4 overflow-hidden rounded-[4px] border border-[#C9A227]/35 bg-[#FBF4E2] p-4">
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px]" style={{ background: 'linear-gradient(90deg,#B4842A,#E4C25E 45%,rgba(228,194,94,0.2) 80%,transparent)' }} />
          <Label>Mark as completed (order stays in the system — not released)</Label>
          <div className="mt-2.5"><TextArea label="Final garment remarks" value={finalRemarks} onChange={setFinalRemarks} placeholder="Notes handed to the Front Desk for the pickup queue…" /></div>
          <button onClick={markComplete} disabled={locked || busy || !qcPassed}
            className="mt-2.5 inline-flex items-center gap-2 rounded-[3px] bg-[#262420] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#F3F1E7] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_12px_24px_-10px_rgba(38,36,32,0.55)] disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none">
            <Check className="h-4 w-4" /> {busy ? 'Saving…' : 'Mark as completed'}
          </button>
          {!qcPassed && (
            <p className="mt-2.5 text-[11px] leading-relaxed text-[#8A5A12]">Locked until a Passed quality review is saved — only a Passed result may advance this job card to Completed.</p>
          )}
        </div>
      )}
    </Band>
  );
}
/* ===================================================================
   BOTTOM SECTION — AUDIT HISTORY
   Append-only ledger. Each record shows the previous stage, the new
   stage, the user, the timestamp and the notes. Nothing here is
   editable. Measurement-verification events ride along underneath so no
   information from the old production journal is lost.
=================================================================== */
function AuditHistorySection({ detail }: { detail: any }) {
  const records = [...(detail.productionHistory || [])].reverse();
  const verifications = detail.verifications || [];
  const rawEvents = [
    ...verifications.map((v: any) => ({ at: v.verified_at, text: `Measurements ${v.status}${v.tailoring_notes ? ` — ${v.tailoring_notes}` : ''}`, by: 'Tailor' })),
    ...verifications.filter((v: any) => v.request_confirmation).map((v: any) => ({ at: v.verified_at, text: 'Requested measurement confirmation from Front Desk', by: 'Tailor' })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  // Collapse repeated, identical events (several identical verification saves
  // in a row) into one line showing the newest timestamp.
  const events = rawEvents.reduce((acc: any[], e) => {
    const last = acc[acc.length - 1];
    if (last && last.text === e.text) { last.count = (last.count || 1) + 1; last.at = e.at; }
    else acc.push({ ...e });
    return acc;
  }, []);

  return (
    <Band label="Audit history" icon={<Clock className="h-3.5 w-3.5 text-[#9C7D12]" strokeWidth={1.6} />}>
      <p className="mb-3.5 text-[11px] leading-relaxed text-[#8A846F]">Append-only production ledger — records can never be edited, overwritten or deleted.</p>
      {records.length === 0 ? (
        <p className="text-sm italic text-[#A39D8A]">No stage change has been recorded on this job card yet.</p>
      ) : (
        <ol className="jc-line space-y-0">
          {records.map((h: any) => (
            <li key={h.id} className="relative pb-3.5 pl-7 last:pb-0">
              <span aria-hidden="true" className="absolute left-0 top-1.5 flex h-[11px] w-[11px] items-center justify-center rounded-full border-2 border-white" style={{ background: 'linear-gradient(135deg,#B4842A,#E4C25E)', boxShadow: '0 0 0 1.5px rgba(156,125,18,0.35)' }} />
              <div className="rounded-[3px] border border-[#EEEADB] bg-[#FDFCF6] px-3.5 py-2.5 transition-colors duration-200 hover:border-[#C9A227]/35">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  <span className="text-[8.5px] font-medium uppercase tracking-[0.14em] text-[#A39D8A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Previous stage</span>
                  <span className="rounded-full border border-[#DCD8C7] bg-white px-2.5 py-0.5 text-[10.5px] text-[#55503F]">{h.from_stage || '—'}</span>
                  <ArrowRight className="h-3 w-3 text-[#B4AF9E]" />
                  <span className="text-[8.5px] font-medium uppercase tracking-[0.14em] text-[#A39D8A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>New stage</span>
                  <span className="rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold text-[#F3F1E7]" style={{ background: 'linear-gradient(180deg,#33312C,#211F1C)' }}>{h.to_stage}</span>
                  <span className="ml-auto text-[10px] text-[#A39D8A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{new Date(h.created_at).toLocaleString()}</span>
                </div>
                <div className="mt-1.5 text-[11px] text-[#6D6A60]">
                  User: <span className="font-medium text-[#262420]">{h.updated_by_name || 'Tailor'}</span>
                </div>
                {h.notes && <p className="mt-1.5 border-l-2 border-[#C9A227]/40 pl-2.5 text-[12px] leading-relaxed text-[#6D6A60]">{h.notes}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}

      {events.length > 0 && (
        <div className="mt-4 border-t border-dashed border-[#E7E3D2] pt-3.5">
          <Label>System event ledger (read-only)</Label>
          <div className="mt-1 divide-y divide-[#EEEADB]">
            {events.map((e: any, i: number) => (
              <div key={i} className="flex items-start justify-between gap-3 py-2.5 transition-colors duration-200 hover:bg-[#FDFCF6]">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: 'linear-gradient(135deg,#B4842A,#E4C25E)' }} />
                  <p className="text-[12.5px] leading-snug text-[#262420]">{e.text}{e.count > 0 ? ` (×${e.count})` : ''}</p>
                </div>
                <p className="flex-shrink-0 text-[10px] text-[#A39D8A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{e.by} · {new Date(e.at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Band>
  );
}

// Centre column once production is finished — closing facts only, never
// production inputs, so a completed card cannot look workable.
function CompletedStageCard({ job, detail }: { job: any; detail: any }) {
  const completed = [...(detail.productionHistory || [])].reverse().find((h: any) => h.to_stage === 'Completed');
  return (
    <Band label="Production complete" icon={<ClipboardCheck className="h-3.5 w-3.5 text-[#9C7D12]" strokeWidth={1.6} />}>
      <div className="flex items-center gap-3 rounded-[3px] border border-[#8FAE85]/50 bg-[#E4E9DB] px-3.5 py-2.5 text-[12px] leading-relaxed text-[#3F6633]">
        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#3F6633]/12"><Check className="h-3.5 w-3.5" /></span>
        <span>Production is {job.status}. The garment remains in the system and is released only by the Front Desk.</span>
      </div>
      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        <Info label="Completion date" value={job.completionDate ? formatDate(job.completionDate) : '—'} />
        <Info label="Fabric used" value={job.fabricUsed || '—'} />
        <Info label="Final remarks" value={job.finalRemarks || '—'} />
        <Info label="Assigned tailor" value={job.assignedName || 'Unassigned'} />
      </div>
      {completed?.notes && <p className="mt-2.5 border-l-2 border-[#C9A227]/40 pl-2.5 text-[12px] leading-relaxed text-[#6D6A60]">{completed.notes}</p>}
      <p className="mt-3 border-t border-dashed border-[#E7E3D2] pt-3 text-[11px] leading-relaxed text-[#8A846F]">No production form is shown — this job card has left the bench. The full ledger is in the audit history below.</p>
    </Band>
  );
}

/* ===================================================================
   CENTER COLUMN — CURRENT STAGE WORKSPACE
   Only the form belonging to the card's CURRENT stage is mounted; every
   other production form stays hidden. Each form posts to the endpoint it
   has always posted to, so no workflow or API behaviour changes.
=================================================================== */
function StageWorkspace({ detail, locked, nextStage, onSaved, refresh, onStageChange }: {
  detail: any; locked: boolean; nextStage: string | null;
  onSaved: (m: string) => void; refresh: () => void; onStageChange: (id: string, s: string) => void;
}) {
  const stage = detail.jobCard?.status || '';
  const shared = { detail, locked, onSaved, refresh };
  let form: React.ReactNode;
  switch (stage) {
    case 'Measuring':
      form = <MeasurementSection {...shared} />;
      break;
    case 'Pattern Cutting':
      form = <PatternCuttingSection {...shared} />;
      break;
    case 'Initial Assembly':
      form = <AssemblySection {...shared} />;
      break;
    case 'First Fitting':
      form = <FittingSection {...shared} />;
      break;
    case 'Final Alterations':
      form = <AlterSection {...shared} />;
      break;
    case 'Quality Review':
      form = <QualitySection {...shared} onStageChange={onStageChange} />;
      break;
    case 'Completed':
    case 'Ready for Pickup':
    case 'Released':
      form = <CompletedStageCard job={detail.jobCard} detail={detail} />;
      break;
    default:
      form = (
        <Band label="Current stage" icon={<ClipboardCheck className="w-3.5 h-3.5 text-[#9C7D12]" strokeWidth={1.6} />}>
          <p className="text-sm text-[#6D6A60]">This job card is at “{stage || 'an unrecognised stage'}”. No production form applies — use the production timeline above to move it forward.</p>
        </Band>
      );
  }
  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-[4px] border border-[#E2DECC] px-4 py-3.5" style={{ background: 'linear-gradient(150deg,#FFFDF6,#F7F3E6)', boxShadow: '0 1px 0 rgba(255,255,255,0.7) inset, 0 1px 2px rgba(38,36,32,0.04)' }}>
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px]" style={{ background: 'linear-gradient(180deg,#B4842A,#E4C25E)' }} />
        <div className="flex items-center gap-2.5 pl-1.5"><StitchLine className="w-7" /><Label>Current stage workspace</Label></div>
        <p className="mt-2 pl-1.5 text-[17px] font-semibold leading-snug text-[#262420]" style={{ fontFamily: "'Fraunces', serif" }}>{STAGE_WORKSPACE[stage] || stage || 'Production'}</p>
        <p className="mt-1 pl-1.5 text-[11.5px] leading-relaxed text-[#6D6A60]">
          Only the form for <span className="font-semibold text-[#8A5A12]">{stage || 'this stage'}</span> is shown.
          {nextStage ? ` Next stage on the rail: ${nextStage}.` : ' This is the final step on the production rail.'}
        </p>
        {nextStage && (
          <span className="ml-1.5 mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-[#C9A227]/40 bg-white/70 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8A5A12]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            Next <ArrowRight className="h-3 w-3" /> {nextStage}
          </span>
        )}
      </div>
      {form}
    </div>
  );
}

/* ===================================================================
   LEFT COLUMN — JOB INFORMATION
   Viewing only: the tailor's current job at a glance, with the free-text
   instruction blocks underneath. Nothing here is editable.
=================================================================== */
function JobInformationCard({ job, locked, productionNotes }: { job: any; locked: boolean; productionNotes?: string }) {
  return (
    <Band label="Job information" icon={<Shirt className="h-3.5 w-3.5 text-[#9C7D12]" strokeWidth={1.6} />}>
      {/* At-a-glance identity strip */}
      <div className="mb-3 flex items-center gap-3 rounded-[3px] border border-[#E9E5D4] bg-[#FDFCF6] px-3.5 py-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[#C9A227]/30" style={{ background: 'linear-gradient(135deg, rgba(228,194,94,0.22), rgba(201,162,39,0.06))' }}>
          <Shirt className="h-4 w-4 text-[#9C7D12]" strokeWidth={1.6} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold leading-tight text-[#262420]" style={{ fontFamily: "'Fraunces', serif" }}>{job.customerName || '—'}</p>
          <p className="mt-0.5 truncate text-[11px] text-[#8A846F]">{job.garmentType || '—'}{job.quantity > 1 ? ` · ×${job.quantity}` : ''}</p>
        </div>
      </div>
      <div>
        <FieldRow label="Job card no." value={job.id} />
        <FieldRow label="Customer name" value={job.customerName} />
        <FieldRow label="Customer ID" value={job.customerId} />
        <FieldRow label="Contact number" value={job.customerContact} />
        <FieldRow label="Garment type" value={job.garmentType} />
        <FieldRow label="Quantity" value={job.quantity ? `×${job.quantity}` : '—'} />
        <FieldRow label="Priority" value={<PriorityPill priority={job.priority} />} />
        <FieldRow label="Deadline" value={formatDate(job.deadline)} />
        <FieldRow label="Assigned tailor" value={job.assignedName || 'Unassigned'} />
        <FieldRow label="Current status" value={job.status} accent="#A32E22" />
      </div>
      <div className="mt-3.5 space-y-2.5">
        <NoteBlock label="Special instructions" value={job.specialInstructions} />
        <NoteBlock label="Tailor notes" value={job.tailorNotes} />
        <NoteBlock label="Production notes" value={productionNotes} />
      </div>
      {locked && (
        <div className="mt-3.5 flex items-start gap-2 rounded-[3px] border border-[#C9A227]/50 bg-[#F7E9D8] px-3.5 py-2.5 text-[11.5px] leading-relaxed text-[#8A5A12]">
          <span className="mt-[5px] h-2 w-2 flex-shrink-0 rounded-full bg-[#C9A227]" />
          <span>This job card is {job.status}. Major production details are locked and require manager authorization to change.</span>
        </div>
      )}
    </Band>
  );
}
