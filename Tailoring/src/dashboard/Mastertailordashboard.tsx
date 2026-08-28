import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TailorJobCardsView } from '../Pages_Tailor/TailorJobCards';
import { TailorMeasurementsView } from '../Pages_Tailor/TailorMeasurements';
import { TailorInventoryView } from '../Pages_Tailor/TailorInventory';
import { TailorSettingsView } from '../Pages_Tailor/TailorSettings';
import NotificationBell from '../components/NotificationBell';
import type { ReactNode } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts';
import {
  LayoutDashboard,
  Shirt,
  Ruler,
  Boxes,
  Settings,
  Search,
  ChevronRight,
  Menu,
  X,
  Scissors,
  Check,
  Clock,
  ArrowRight,
  PackageCheck,
  User,
  LogOut,
} from 'lucide-react';

/* ---------------------------------------------------------------
   MASTER TAILOR / CUTTER STAFF — Dashboard
   "The Pattern Table" — premium pass

   Signature: job cards are drawn as pattern pieces on dot-grid
   paper with corner notches, the sidebar's active state reads as
   a hand-basted thread stitch, and the production-flow chart is
   rendered as stacked fabric bolts on a cutting table, with the
   bottleneck stage called out in pin-red. Palette moves from flat
   chalk-yellow to a warmer brass/gold for accents, with layered
   "fabric lifted off the table" shadows for a tactile, premium,
   materially-real feel rather than flat cards.
------------------------------------------------------------------ */

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Archivo:wght@500;600;700&family=Work+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --ink: #241F19;
  --ink-soft: #55503F;
  --graphite: #1E1C18;
  --graphite-2: #29261F;
  --paper: #FBF9F2;
  --paper-dim: #F3EFE2;
  --line: #DBD6C2;
  --line-soft: #E8E3D2;
  --muted: #8A846F;
  --muted-2: #A39D8A;
  --brass: #C29A1E;
  --brass-light: #E4C25E;
  --brass-deep: #8A6A18;
  --chalk: #E8C547;
  --pin: #A32E22;
  --pin-soft: #C0392B;
  --emerald: #4C7A44;

  /* flat, small-element depth */
  --shadow-1: 0 1px 2px rgba(33,31,28,0.05), 0 10px 28px -14px rgba(33,31,28,0.22);
  /* elevated modal depth */
  --shadow-2: 0 2px 6px rgba(33,31,28,0.07), 0 22px 50px -18px rgba(33,31,28,0.28);
  /* "cloth lifted off the table" — layered, materially real */
  --shadow-fabric: 0 1px 1px rgba(36,31,25,0.05), 0 1px 0 rgba(255,255,255,0.6) inset, 0 10px 20px -12px rgba(36,31,25,0.16), 0 34px 64px -28px rgba(36,31,25,0.32);
  --shadow-fabric-hover: 0 1px 1px rgba(36,31,25,0.06), 0 1px 0 rgba(255,255,255,0.6) inset, 0 14px 26px -12px rgba(36,31,25,0.2), 0 40px 76px -26px rgba(36,31,25,0.38);
  --shadow-pressed: inset 0 1px 3px rgba(36,31,25,0.14), inset 0 0 0 1px rgba(36,31,25,0.04);
}

@keyframes riseIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes drawRail {
  from { opacity: 0; transform: scaleX(0); }
  to { opacity: 1; transform: scaleX(1); }
}
@keyframes shimmerOnce {
  0% { background-position: -120% 0; }
  60%, 100% { background-position: 220% 0; }
}
@keyframes jcPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.7); }
}
.dash-in { opacity: 0; animation: riseIn 0.55s cubic-bezier(0.22,1,0.36,1) forwards; }
.brass-shimmer {
  background-image: linear-gradient(110deg, transparent 40%, rgba(255,255,255,0.55) 50%, transparent 60%);
  background-size: 250% 100%;
  animation: shimmerOnce 1.8s ease-out 0.4s 1;
}
@media (prefers-reduced-motion: reduce) {
  .dash-in { opacity: 1; animation: none; }
  .brass-shimmer { animation: none; }
}
`;

function MonoLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`text-[10px] tracking-[0.22em] uppercase text-[#8A846F] ${className}`}
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      {children}
    </span>
  );
}

/* corner notch — the little triangular nick tailors cut into a
   pattern piece to mark alignment points; premium version gets a
   whisper of a gold hairline along the cut edge */
function Notch({ className = '' }: { className?: string }) {
  return (
    <span
      className={`absolute w-2.5 h-2.5 ${className}`}
      aria-hidden="true"
      style={{
        background:
          'linear-gradient(135deg, #FBF9F2 0%, #FBF9F2 46%, rgba(194,154,30,0.4) 48%, transparent 50%)',
        clipPath: 'polygon(0 0, 100% 0, 0 100%)',
      }}
    />
  );
}

/* baste-stitch divider — a running-stitch rule used as the active
   nav indicator and section separators, standing in for a plain bar */
function StitchLine({ className = '', color = 'var(--brass)' }: { className?: string; color?: string }) {
  return (
    <svg className={className} width="100%" height="2" preserveAspectRatio="none" aria-hidden="true">
      <line x1="0" y1="1" x2="100%" y2="1" stroke={color} strokeWidth="1.5" strokeDasharray="3 3" strokeLinecap="round" />
    </svg>
  );
}

/* subtle woven-cloth texture — two hairline crosshatches layered
   under the pattern-dot grid so panels read as fabric on a table,
   not flat vector shapes; kept faint so it never fights content */
function fabricTexture(dotColor = '#241F19', opacity = 0.045) {
  return {
    backgroundImage: `radial-gradient(${dotColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 0.6px, transparent 0.6px)`,
    backgroundSize: '18px 18px',
    backgroundColor: 'var(--paper)',
  } as const;
}

/* segmented stage tracker — reads a job card's production stage as
   a run of cut/uncut segments along the seam, not just a text pill */
function StageTracker({ stageIndex, compact = false }: { stageIndex: number; compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-[3px]">
        {STAGES.map((s, i) => (
          <span
            key={s}
            title={s}
            className="h-1.5 rounded-full transition-colors"
            style={{
              width: compact ? 10 : 14,
              background:
                i < stageIndex ? 'var(--brass)' : i === stageIndex ? 'var(--pin-soft)' : 'var(--line)',
            }}
          />
        ))}
      </div>
      {!compact && (
        <span className="text-[10px] font-medium tracking-[0.08em] uppercase text-[var(--ink-soft)] whitespace-nowrap">
          {STAGES[stageIndex]}
        </span>
      )}
    </div>
  );
}

const TAILOR = { name: 'Delfin Ortega', role: 'Master Tailor' };
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function authToken() {
  return localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';
}

function LiveDateTime() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <MonoLabel className="hidden sm:inline">
      {now.toLocaleString(undefined, { weekday: 'short', month: 'short', day: '2-digit', hour: 'numeric', minute: '2-digit' })}
    </MonoLabel>
  );
}

function currentUser() {
  const stored = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
  try { return stored ? JSON.parse(stored) : null; } catch { return null; }
}

const STAGES = ['Measuring', 'Pattern Cutting', 'Initial Assembly', 'First Fitting', 'Final Alterations', 'Quality Review', 'Completed', 'Ready for Pickup'];
const STAGE_SHORT = ['Measure', 'Cut', 'Assembly', '1st Fit', 'Alter', 'QC', 'Done', 'Pickup'];

interface JobCard {
  id: string;
  customer: string;
  garment: string;
  fabric: string;
  stageIndex: number;
  due: string;
  measurements: { label: string; value: string }[];
  fabricUsed: string;
}

const FITTINGS_TODAY = [
  { time: '2:00 PM', customer: 'Consuelo Reyes', garment: "Women's Coat", jobCardId: 'JC-3019' },
  { time: '3:30 PM', customer: 'Reyna Fuentes', garment: 'Barong Tagalog', jobCardId: 'JC-3021' },
];

/* ---------------------------------------------------------------
   Production flow chart — job cards grouped by stage, drawn as
   bolts of fabric stacked on the cutting table. The tallest bolt
   (the bottleneck stage) is called out in pin-red so the tailor
   can see where work is piling up at a glance.
------------------------------------------------------------------ */
function ProductionFlowChart({ cards }: { cards: JobCard[] }) {
  const data = useMemo(
    () =>
      STAGES.map((label, i) => ({
        stage: STAGE_SHORT[i],
        fullStage: label,
        count: cards.filter((c) => c.stageIndex === i).length,
      })),
    [cards]
  );

  const maxCount = Math.max(0, ...data.map((d) => d.count));
  const hasData = maxCount > 0;

  // Live pipeline reading derived from the SAME assigned job cards the tailor
  // sees: overall progress % across completed stages, and the single busiest
  // stage right now. No separate record — it's all from the shared job cards.
  const { totalStages, reachedStages } = useMemo(() => {
    if (!cards.length) return { totalStages: 0, reachedStages: 0 };
    const reached = new Array(STAGES.length).fill(false);
    cards.forEach((c) => {
      for (let i = 0; i <= c.stageIndex; i++) reached[i] = true;
    });
    return {
      totalStages: STAGES.length,
      reachedStages: reached.filter(Boolean).length,
    };
  }, [cards]);
  const overallPct = totalStages ? Math.round((reachedStages / totalStages) * 100) : 0;
  const busiestStage = data.reduce((a, b) => (b.count > a.count ? b : a), data[0]);
  const currentStageName = busiestStage?.count ? busiestStage.fullStage : null;
  const inProgressCount = cards.filter((c) => c.stageIndex < STAGES.length - 1).length;

  function CustomTooltip({ active, payload }: any) {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div
        className="rounded-[3px] border border-[var(--line)] bg-[var(--paper)] px-3 py-2"
        style={{ boxShadow: 'var(--shadow-2)' }}
      >
        <div className="text-[11px] font-medium text-[var(--ink)]">{d.fullStage}</div>
        <div className="text-[11px] text-[var(--ink-soft)]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {d.count} {d.count === 1 ? 'job card' : 'job cards'}
        </div>
      </div>
    );
  }

  return (
    <div
      className="dash-in relative bg-[var(--paper)] border border-[var(--line)] rounded-[3px] p-6 sm:p-8 overflow-hidden"
      style={{ animationDelay: '0.18s', boxShadow: 'var(--shadow-fabric)', ...fabricTexture() }}
    >
      <Notch className="-top-px -left-px" />
      <Notch className="-top-px -right-px rotate-90" />
      <Notch className="-bottom-px -left-px -rotate-90" />
      <Notch className="-bottom-px -right-px rotate-180" />

      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <StitchLine className="w-8" />
            <MonoLabel>Workshop pipeline</MonoLabel>
          </div>
          <h2 className="text-xl text-[var(--ink)]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>
            Production flow
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--ink-soft)]">
            <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--brass-deep)' }}>{overallPct}% of stages</span>
            {currentStageName ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--pin-soft)', animation: 'jcPulse 1.8s ease-in-out infinite' }} />
                Garment{inProgressCount === 1 ? ' is currently at' : 's currently at'} {currentStageName}
              </span>
            ) : (
              <span>No garments in the pipeline yet.</span>
            )}
          </div>
        </div>
        {hasData && (
          <div className="flex items-center gap-4 text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[1px]" style={{ background: 'var(--pin-soft)' }} />
              Bottleneck
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[1px]" style={{ background: 'var(--brass)' }} />
              On the table
            </span>
          </div>
        )}
      </div>

      {hasData ? (
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }} barCategoryGap="28%">
              <XAxis
                dataKey="stage"
                tick={{ fill: '#8A846F', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                tickLine={false}
                axisLine={{ stroke: '#DBD6C2' }}
                interval={0}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: '#8A846F', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                tickLine={false}
                axisLine={false}
                width={28}
              />
              <Tooltip cursor={{ fill: 'rgba(194,154,30,0.06)' }} content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[3, 3, 1, 1]} maxBarSize={38}>
                {data.map((d, i) => (
                  <Cell key={i} fill={d.count === maxCount && maxCount > 0 ? 'var(--pin-soft)' : 'var(--brass)'} fillOpacity={d.count === 0 ? 0.18 : 1} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="py-10 text-center">
          <p className="text-sm text-[var(--ink-soft)]">Nothing on the table yet.</p>
          <p className="text-[12px] text-[var(--muted-2)] mt-1">The chart fills in as job cards are assigned to you.</p>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   Update stage modal — advances a job card's production stage.
------------------------------------------------------------------ */
function UpdateStageModal({
  card,
  onClose,
  onUpdate,
}: {
  card: JobCard;
  onClose: () => void;
  onUpdate: (id: string, stageIndex: number) => Promise<void> | void;
}) {
  const [stageIndex, setStageIndex] = useState(card.stageIndex);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      await onUpdate(card.id, stageIndex);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to advance stage. Please verify the required steps.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#211F1C]/55 backdrop-blur-[3px]" onClick={onClose} />
      <div
        className="relative w-full max-w-xl bg-[var(--paper)] border border-[var(--line)] rounded-[3px] overflow-hidden"
        style={{ boxShadow: 'var(--shadow-2)' }}
      >
        <div className="h-[3px] w-full bg-gradient-to-r from-[var(--brass)] via-[var(--brass-light)] to-[var(--brass)]" />
        <div className="flex items-center justify-between px-7 sm:px-10 pt-8">
          <MonoLabel>{card.id}</MonoLabel>
          <button onClick={onClose} aria-label="Close" className="text-[var(--muted-2)] hover:text-[var(--ink)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-7 sm:px-10 pb-9 pt-3">
          <h2 className="text-3xl leading-tight mb-2 text-[var(--ink)]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>
            Update production stage
          </h2>
                                        <p className="text-[14px] text-[var(--ink-soft)] font-light mb-8 leading-relaxed">
            {card.garment} for {card.customer}
          </p>

          <div className="space-y-2">
            {STAGES.map((s, i) => (
              <button
                key={s}
                type="button"
                onClick={() => setStageIndex(i)}
                disabled={saving}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-[3px] border text-left transition-all duration-150 ${
                  i === stageIndex
                    ? 'bg-[var(--graphite)] border-[var(--graphite)] text-[#EDEAE2] shadow-[0_6px_16px_-8px_rgba(33,31,28,0.5)]'
                    : 'border-[var(--line)] text-[var(--ink-soft)] hover:border-[var(--muted-2)] hover:bg-[var(--paper-dim)]'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    i === stageIndex ? 'border-[var(--brass-light)] bg-[var(--brass)]/25' : 'border-[var(--line)]'
                  }`}
                >
                  {i === stageIndex && <Check className="w-3 h-3 text-[#EDEAE2]" strokeWidth={2.5} />}
                </span>
                <span className="text-[13px]">{s}</span>
              </button>
            ))}
          </div>

          {error && (
            <div role="alert" className="mt-4 border border-[var(--pin-soft)]/30 bg-[var(--pin-soft)]/10 px-3 py-2 text-sm text-[#96291E] rounded-[2px]">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 pt-8">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-3 rounded-[3px] border border-[var(--line)] text-[var(--ink-soft)] text-[11px] font-medium tracking-[0.14em] uppercase hover:border-[var(--muted-2)] hover:bg-[var(--paper-dim)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-3 rounded-[3px] bg-[var(--graphite)] text-[#EDEAE2] text-[11px] font-medium tracking-[0.14em] uppercase hover:bg-[var(--graphite-2)] transition-colors shadow-[0_10px_24px_-12px_rgba(33,31,28,0.55)] disabled:opacity-60 disabled:cursor-wait"
            >
              {saving ? 'Saving…' : 'Save stage'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   Record fabric usage modal.
------------------------------------------------------------------ */
function RecordFabricModal({
  card,
  onClose,
  onRecord,
}: {
  card: JobCard;
  onClose: () => void;
  onRecord: (id: string, payload: { quantityUsed: string; unit?: string; fabricId?: number | string; fabricName?: string }) => void;
}) {
  const [meters, setMeters] = useState('');
  const [unit, setUnit] = useState('meters');
  const [fabricId, setFabricId] = useState('');
  const [stock, setStock] = useState<null | number>(null);
  const [error, setError] = useState('');

  // Connect this modal to the shared inventory so the right bolt + unit is
  // used and the available stock is shown before deducting.
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/tailor/inventory`, { headers: { Authorization: `Bearer ${authToken()}` } })
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json();
        if (cancelled) return;
        const list = data.inventory || [];
        const match = list.find((f: any) => String(f.fabricName).toLowerCase() === String(card.fabric || '').toLowerCase());
        const chosen = match || list[0];
        if (chosen) {
          setFabricId(String(chosen.id));
          setUnit(chosen.unit || 'meters');
          setStock(Number(chosen.stockQuantity));
        }
      })
      .catch(() => { /* leave defaults */ });
    return () => { cancelled = true; };
  }, [card.fabric]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = Number(meters);
    if (!meters.trim() || Number.isNaN(num) || num <= 0) {
      setError('Enter a valid fabric length.');
      return;
    }
    if (stock !== null && stock <= 0) {
      setError('This fabric has no stock on hand. Add stock in Fabric Inventory first, then record usage.');
      return;
    }
    onRecord(card.id, { quantityUsed: String(num), unit, fabricId: fabricId || undefined, fabricName: card.fabric || 'Fabric' });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#211F1C]/55 backdrop-blur-[3px]" onClick={onClose} />
      <div
        className="relative w-full max-w-lg bg-[var(--paper)] border border-[var(--line)] rounded-[3px] overflow-hidden"
        style={{ boxShadow: 'var(--shadow-2)' }}
      >
        <div className="h-[3px] w-full bg-gradient-to-r from-[var(--pin-soft)] via-[#D3695B] to-[var(--pin-soft)]" />
        <div className="flex items-center justify-between px-7 sm:px-10 pt-8">
          <MonoLabel>{card.id}</MonoLabel>
          <button onClick={onClose} aria-label="Close" className="text-[var(--muted-2)] hover:text-[var(--ink)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-7 sm:px-10 pb-9 pt-3">
          <h2 className="text-3xl leading-tight mb-2 text-[var(--ink)]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>
            Record fabric usage
          </h2>
          <p className="text-[14px] text-[var(--ink-soft)] font-light mb-8 leading-relaxed">
            {card.garment} — {card.fabric}
          </p>
          {stock !== null && (
            <div className={`mb-4 flex items-center gap-2 border px-3 py-2 rounded-[2px] text-[12px] ${stock <= 0 ? 'border-[var(--pin-soft)]/40 bg-[var(--pin-soft)]/10 text-[#96291E]' : 'border-[#8FAE85]/60 bg-[#E4E9DB] text-[#3F6633]'}`}>
              Available: <span className="font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{stock} {unit}</span>
              {stock <= 0 ? ' — add stock first in Fabric Inventory.' : ' on hand for this bolt.'}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div role="alert" className="border border-[var(--pin-soft)]/30 bg-[var(--pin-soft)]/10 px-3 py-2 text-sm text-[#96291E] rounded-[2px]">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="fabricMeters" className="block mb-2"><MonoLabel>Fabric used ({unit})</MonoLabel></label>
              <div className="border-b border-[var(--line)] focus-within:border-[var(--pin-soft)] transition-colors">
                <input
                  id="fabricMeters"
                  type="number"
                  min="0"
                  step="0.1"
                  value={meters}
                  onChange={(e) => setMeters(e.target.value)}
                  placeholder="2.1"
                  className="w-full bg-transparent placeholder-[var(--muted-2)] text-[14px] py-2.5 focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-[var(--muted-2)] mt-2">Currently: {card.fabricUsed}</p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-[3px] border border-[var(--line)] text-[var(--ink-soft)] text-[11px] font-medium tracking-[0.14em] uppercase hover:border-[var(--muted-2)] hover:bg-[var(--paper-dim)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={stock !== null && stock <= 0}
                className="flex-1 px-4 py-3 rounded-[3px] bg-[var(--graphite)] text-[#EDEAE2] text-[11px] font-medium tracking-[0.14em] uppercase hover:bg-[var(--graphite-2)] transition-colors shadow-[0_10px_24px_-12px_rgba(33,31,28,0.55)] disabled:opacity-50"
              >
                Record usage
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

type ViewKey = 'dashboard' | 'jobcards' | 'measurements' | 'inventory' | 'settings';

const NAV: { label: string; icon: typeof LayoutDashboard; view: ViewKey }[] = [
  { label: 'Dashboard', icon: LayoutDashboard, view: 'dashboard' },
  { label: 'Job Cards', icon: Shirt, view: 'jobcards' },
  { label: 'Measurements', icon: Ruler, view: 'measurements' },
  { label: 'Fabric Inventory', icon: Boxes, view: 'inventory' },
  { label: 'Settings', icon: Settings, view: 'settings' },
];

/* ==================================================================
   DASHBOARD VIEW
================================================================== */

function DashboardView() {
  const [cards, setCards] = useState<JobCard[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [stageModalCard, setStageModalCard] = useState<JobCard | null>(null);
  const [fabricModalCard, setFabricModalCard] = useState<JobCard | null>(null);
  const [banner, setBanner] = useState('');
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [fittingsToday, setFittingsToday] = useState(FITTINGS_TODAY);
  const [usageSummary, setUsageSummary] = useState<any[]>([]);
  const [monthlyProductivity, setMonthlyProductivity] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadCards() {
      try {
        const response = await fetch(`${API_URL}/auth/tailor/dashboard`, {
          headers: { Authorization: `Bearer ${authToken()}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Unable to load assigned job cards.');
        if (cancelled) return;
        setCards(data.orders || []);
        setExpanded((cur) => cur ?? data.orders?.[0]?.id ?? null);
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : 'Unable to load assigned job cards.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    async function loadStats() {
      try {
        const response = await fetch(`${API_URL}/tailor/dashboard`, { headers: { Authorization: `Bearer ${authToken()}` } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'stats unavailable');
        if (cancelled) return;
        setStats(data.stats || data);
        setUsageSummary(data.fabricSummary || []);
        setMonthlyProductivity(data.monthlyProductivity || []);
        const upcoming = data.upcomingFittings || [];
        if (upcoming.length) {
          setFittingsToday(upcoming.map((f: any) => ({
            time: new Date(f.appointment_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
            customer: f.customer_name || 'Customer',
            garment: (f.job_card_number || 'Job card'),
            jobCardId: f.job_card_number || '',
          })));
        }
      } catch { /* non-fatal */ }
    }
    loadCards();
    loadStats();
    // Reuse the existing API refetch mechanism so the tailor sees updated
    // production/assignment state without manual reloads.
    const timer = setInterval(() => { loadCards(); loadStats(); }, 15000);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  function announce(message: string) {
    setBanner(message);
    setTimeout(() => setBanner(''), 4000);
  }

        async function handleUpdateStage(id: string, stageIndex: number) {
    const response = await fetch(`${API_URL}/tailor/job-cards/${encodeURIComponent(id)}/stage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
      body: JSON.stringify({ stage: STAGES[stageIndex], notes: '' }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to update the production stage.');
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, stageIndex, stage: STAGES[stageIndex] } : c)));
    setStageModalCard(null);
    announce(`${id} moved to "${STAGES[stageIndex]}".`);
  }

  async function handleRecordFabric(id: string, payload: { quantityUsed: string; unit?: string; fabricId?: number | string; fabricName?: string }) {
    try {
      const body: any = { quantityUsed: payload.quantityUsed, unit: payload.unit || 'meters', notes: '' };
      if (payload.fabricId) body.fabricId = Number(payload.fabricId);
      if (payload.fabricName) body.fabricName = payload.fabricName;
      const response = await fetch(`${API_URL}/tailor/job-cards/${encodeURIComponent(id)}/fabric-usage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to record fabric usage.');
      setCards((prev) => prev.map((c) => (c.id === id ? { ...c, fabricUsed: `${data.quantityUsed} ${data.unit} ${data.fabricName || ''}`.trim() } : c)));
      setFabricModalCard(null);
      announce(`Fabric usage recorded for ${id}.`);
    } catch (error) {
      announce(error instanceof Error ? error.message : 'Unable to record fabric usage.');
    }
  }

  const inProgress = cards.filter((c) => c.stageIndex < STAGES.length - 1).length;
  const dueSoon = cards.filter((c) => c.due === 'Aug 03' || c.due === 'Aug 05').length;

  return (
    <div className="space-y-8">
      <div className="dash-in flex items-end justify-between gap-6 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <StitchLine className="w-8" />
            <MonoLabel>The pattern table</MonoLabel>
          </div>
          <h1 className="text-2xl sm:text-[32px] leading-tight text-[var(--ink)]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>
            Good afternoon, {TAILOR.name.split(' ')[0]} — here's what's on the table.
          </h1>
        </div>
      </div>

      {banner && (
        <div className="dash-in flex items-center gap-2 border border-[#8FAE85] bg-[#E4E9DB] px-4 py-3 text-sm text-[#3F6633] rounded-[3px]" style={{ boxShadow: 'var(--shadow-1)' }}>
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>{banner}</span>
        </div>
      )}

      {loadError && (
        <div role="alert" className="border border-[var(--pin-soft)]/30 bg-[var(--pin-soft)]/10 px-4 py-3 text-sm text-[#A12F24] rounded-[3px]">
          {loadError}
        </div>
      )}

      {/* ---------------- STATS ---------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard delay={0.04} label="Assigned job cards" value={`${stats?.assignedJobs ?? cards.length}`} icon={<Shirt className="w-4 h-4" strokeWidth={1.6} />} />
        <StatCard delay={0.08} label="In production" value={`${stats?.activeJobs ?? inProgress}`} icon={<Scissors className="w-4 h-4" strokeWidth={1.6} />} />
        <StatCard delay={0.12} label="Fittings today" value={`${fittingsToday.length}`} icon={<Clock className="w-4 h-4" strokeWidth={1.6} />} />
        <StatCard delay={0.16} label="Due today / late" value={`${stats ? `${stats.dueToday}/${stats.lateOrders}` : dueSoon}`} icon={<PackageCheck className="w-4 h-4" strokeWidth={1.6} />} tone="warn" />
      </div>

      {stats && (
        <div className="dash-in flex flex-wrap items-center gap-3 text-[11px] text-[#6D6A60]">
          <span className="px-2.5 py-1 rounded-[2px] border border-[#8FAE85]/60 bg-[#E4E9DB] text-[#3F6633]">Completed garments: {stats.completedJobs}</span>
          <span className="px-2.5 py-1 rounded-[2px] border border-[#C9A227]/50 bg-[#F7E9D8] text-[#8A5A12]">Ready for pickup: {stats.readyForPickup}</span>
          <span className="px-2.5 py-1 rounded-[2px] border border-[#DCD8C7] bg-white text-[#6D6A60]">Avg completion: {stats.averageCompletionDays || 0} days</span>
          <span className="px-2.5 py-1 rounded-[2px] border border-[#DCD8C7] bg-white text-[#6D6A60]">Stage updates logged: {stats.totalStageUpdates}</span>
        </div>
      )}

      {/* ---------------- PERFORMANCE: FABRIC USAGE + MONTHLY PRODUCTIVITY ---------------- */}
      {(usageSummary.length > 0 || monthlyProductivity.length > 0) && (
        <div className="dash-in grid grid-cols-1 lg:grid-cols-2 gap-4">
          {usageSummary.length > 0 && (
            <section className="border p-5 rounded-[3px]" style={{ background: 'var(--paper)', borderColor: 'var(--line)', boxShadow: 'var(--shadow-1)' }}>
              <MonoLabel>Fabric usage summary</MonoLabel>
              <h2 className="mt-1 text-lg font-semibold" style={{ fontFamily: "'Fraunces', serif", color: 'var(--ink)' }}>Cloth off the shelf</h2>
              <div className="mt-4 space-y-2.5">
                {usageSummary.map((f) => {
                  const total = Math.max(1, f.stock + f.used);
                  return (
                    <div key={f.name}>
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="text-[#262420] font-medium">{f.name}</span>
                        <span className="text-[#8A846F]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{f.used} used · {f.stock} {f.unit} left</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full bg-[#E8E3D2] overflow-hidden">
                        <div className="h-full" style={{ width: `${Math.min(100, (f.used / total) * 100)}%`, background: 'linear-gradient(90deg, #B4842A, #E4C25E)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
          {monthlyProductivity.length > 0 && (
            <section className="border p-5 rounded-[3px]" style={{ background: 'var(--paper)', borderColor: 'var(--line)', boxShadow: 'var(--shadow-1)' }}>
              <MonoLabel>Monthly productivity</MonoLabel>
              <h2 className="mt-1 mb-2 text-lg font-semibold" style={{ fontFamily: "'Fraunces', serif", color: 'var(--ink)' }}>Garments completed</h2>
              <div className="h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyProductivity} margin={{ top: 6, right: 8, left: -22, bottom: 0 }} barCategoryGap="35%">
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#8A846F', fontFamily: "'JetBrains Mono', monospace" }} axisLine={{ stroke: '#DBD6C2' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#8A846F' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Bar dataKey="completed" name="Completed" radius={[3, 3, 0, 0]} maxBarSize={38}>
                      {monthlyProductivity.map((m) => <Cell key={m.month} fill="#C9A227" />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}
        </div>
      )}

      {/* ---------------- PRODUCTION FLOW CHART ---------------- */}
      <ProductionFlowChart cards={cards} />

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
        {/* ---------------- JOB CARD STACK (signature element) ---------------- */}
        <div
          className="dash-in bg-[var(--paper)] border border-[var(--line)] rounded-[3px] p-6 sm:p-8"
          style={{
            animationDelay: '0.22s',
            boxShadow: 'var(--shadow-fabric)',
            ...fabricTexture(),
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <MonoLabel>Assigned to you</MonoLabel>
              <h2 className="text-xl mt-1 text-[var(--ink)]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>Job cards</h2>
            </div>
            <button className="hidden sm:flex items-center gap-1 text-[11px] font-medium tracking-[0.14em] uppercase text-[var(--pin-soft)] hover:text-[var(--pin)] transition-colors">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {isLoading && (
              <div className="space-y-3" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-[60px] rounded-[3px] border border-dashed border-[var(--line)] overflow-hidden relative">
                    <div
                      className="absolute inset-0"
                      style={{
                        background: 'linear-gradient(90deg, transparent, rgba(220,216,199,0.5), transparent)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmerOnce 1.4s ease-in-out infinite',
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
            {!isLoading && !cards.length && !loadError && (
              <div className="py-14 text-center">
                <div className="mx-auto mb-3 w-10 h-10 rounded-full border border-dashed border-[var(--muted-2)] flex items-center justify-center text-[var(--muted-2)]">
                  <Shirt className="w-4 h-4" strokeWidth={1.5} />
                </div>
                <p className="text-sm text-[var(--ink-soft)]">No job cards are available yet.</p>
                <p className="text-[12px] text-[var(--muted-2)] mt-1">New assignments will appear here as soon as they're on the table.</p>
              </div>
            )}
            {cards.map((card, i) => {
              const isOpen = expanded === card.id;
              return (
                <div
                  key={card.id}
                  className="dash-in relative bg-[var(--paper)] border border-dashed border-[var(--muted-2)] rounded-[3px] overflow-hidden transition-shadow"
                  style={{ animationDelay: `${0.26 + i * 0.05}s`, boxShadow: isOpen ? 'var(--shadow-fabric)' : 'none' }}
                >
                  <Notch className="-top-px -left-px" />
                  <Notch className="-top-px -right-px rotate-90" />
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : card.id)}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-[var(--paper-dim)]/80 transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div
                        className="w-9 h-9 rounded-[3px] bg-gradient-to-br from-[var(--brass-light)]/35 to-[var(--brass)]/15 text-[var(--brass-deep)] flex items-center justify-center flex-shrink-0 border border-[var(--brass)]/25"
                        style={{ boxShadow: '0 1px 0 rgba(255,255,255,0.6) inset, 0 2px 6px -2px rgba(138,106,24,0.35)' }}
                      >
                        <Scissors className="w-4 h-4" strokeWidth={1.6} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13.5px] text-[var(--ink)] font-medium truncate">{card.garment} — {card.customer}</div>
                        <div className="text-[11px] text-[var(--muted-2)]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{card.id} · Due {card.due}</div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 hidden sm:block">
                      <StageTracker stageIndex={card.stageIndex} compact />
                    </div>
                    <span className="flex-shrink-0 sm:hidden inline-block px-2.5 py-1 rounded-[2px] text-[10px] font-medium tracking-[0.1em] uppercase bg-[var(--paper-dim)] text-[var(--ink-soft)] border border-[var(--line)]">
                      {STAGES[card.stageIndex]}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 border-t border-dashed border-[var(--line)]">
                      <div className="pt-4 pb-1 sm:hidden">
                        <StageTracker stageIndex={card.stageIndex} />
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-3 py-4">
                        {card.measurements.map((m) => (
                          <div key={m.label}>
                            <MonoLabel>{m.label}</MonoLabel>
                            <div className="text-[14px] text-[var(--ink)]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{m.value}</div>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-[12px] text-[var(--ink-soft)] mb-4">
                        <span>{card.fabric}</span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{card.fabricUsed}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          onClick={() => setStageModalCard(card)}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-[2px] bg-[var(--graphite)] text-[#EDEAE2] text-[10px] font-medium tracking-[0.1em] uppercase hover:bg-[var(--graphite-2)] active:scale-[0.98] transition-all shadow-[0_8px_18px_-10px_rgba(33,31,28,0.5)]"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                          Update stage
                        </button>
                        <button
                          onClick={() => setFabricModalCard(card)}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-[2px] border border-[var(--line)] text-[var(--ink-soft)] text-[10px] font-medium tracking-[0.1em] uppercase hover:border-[var(--muted-2)] hover:bg-[var(--paper-dim)] active:scale-[0.98] transition-all"
                        >
                          <Boxes className="w-3.5 h-3.5" />
                          Record fabric usage
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ---------------- RIGHT COLUMN: FITTINGS TODAY ---------------- */}
        <div
          className="dash-in bg-[var(--paper)] border border-[var(--line)] rounded-[3px] p-6 sm:p-7"
          style={{ animationDelay: '0.3s', boxShadow: 'var(--shadow-fabric)' }}
        >
          <MonoLabel>Today's calendar</MonoLabel>
          <h2 className="text-xl mt-1 mb-5 text-[var(--ink)]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>Fittings &amp; alterations</h2>
          <div className="space-y-4">
            {fittingsToday.map((f) => (
              <div key={`${f.time}-${f.customer}`} className="flex items-center gap-3">
                <div className="flex flex-col items-center flex-shrink-0 w-14">
                  <Clock className="w-3 h-3 text-[var(--brass)] mb-0.5" strokeWidth={1.8} />
                  <span className="text-[11px] text-[var(--ink-soft)]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{f.time}</span>
                </div>
                <div className="min-w-0 flex-1 border-l border-[var(--line-soft)] pl-3">
                  <div className="text-[13px] text-[var(--ink)] font-medium truncate">{f.customer}</div>
                  <div className="text-[12px] text-[var(--ink-soft)] truncate">{f.garment} · {f.jobCardId}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-[var(--line-soft)]">
            <MonoLabel>Quick lookup</MonoLabel>
            <div className="relative flex items-center border-b border-[var(--line)] focus-within:border-[var(--pin-soft)] transition-colors mt-3">
              <User className="w-4 h-4 text-[var(--muted-2)]" strokeWidth={1.5} />
              <input
                type="text"
                placeholder="Search customer or job card"
                className="w-full bg-transparent placeholder-[var(--muted-2)] text-[13px] pl-3 py-2.5 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {stageModalCard && (
        <UpdateStageModal card={stageModalCard} onClose={() => setStageModalCard(null)} onUpdate={handleUpdateStage} />
      )}
      {fabricModalCard && (
        <RecordFabricModal card={fabricModalCard} onClose={() => setFabricModalCard(null)} onRecord={handleRecordFabric} />
      )}
    </div>
  );
}

/* placeholder for pages not built yet, so nav links never dead-end silently */
function ComingSoonView({ label }: { label: string }) {
  return (
    <div className="dash-in bg-[var(--paper)] border border-[var(--line)] rounded-[3px] p-16 text-center" style={{ boxShadow: 'var(--shadow-fabric)' }}>
      <MonoLabel>{label}</MonoLabel>
      <h2 className="text-2xl mt-2 text-[var(--ink)]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>
        This page isn't built yet
      </h2>
      <p className="text-[13px] text-[var(--ink-soft)] mt-2">Ask to have the {label} page created next.</p>
    </div>
  );
}

/* ---------------- Stat card ---------------- */
function StatCard({ label, value, icon, delay = 0, tone = 'default' }: { label: string; value: string; icon: ReactNode; delay?: number; tone?: 'default' | 'warn'; }) {
  return (
    <div
      className="dash-in bg-[var(--paper)] border border-[var(--line)] rounded-[3px] p-5 sm:p-6 transition-all hover:-translate-y-[2px]"
      style={{ animationDelay: `${delay}s`, boxShadow: 'var(--shadow-fabric)' }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-fabric-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-fabric)')}
    >
      <div className="flex items-center justify-between mb-4">
        <div
          className={`w-8 h-8 rounded-[3px] flex items-center justify-center border ${
            tone === 'warn'
              ? 'bg-[var(--pin-soft)]/10 text-[var(--pin-soft)] border-[var(--pin-soft)]/20'
              : 'bg-gradient-to-br from-[var(--brass-light)]/30 to-[var(--brass)]/10 text-[var(--brass-deep)] border-[var(--brass)]/25'
          }`}
          style={{ boxShadow: '0 1px 0 rgba(255,255,255,0.6) inset' }}
        >
          {icon}
        </div>
      </div>
      <div className="text-[28px] mb-1 text-[var(--ink)]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>{value}</div>
      <MonoLabel className="block">{label}</MonoLabel>
    </div>
  );
}

/* ==================================================================
   ROOT — sidebar drives which view renders
================================================================== */

export default function MasterTailorDashboard({ initialView = 'dashboard' }: { initialView?: ViewKey }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(() => currentUser());
  const [navOpen, setNavOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [view, setView] = useState<ViewKey>(initialView);
  useEffect(() => {
    fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${authToken()}` } })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(); setProfile(data.user); const storage = localStorage.getItem('authToken') ? localStorage : sessionStorage; storage.setItem('currentUser', JSON.stringify(data.user)); })
      .catch(() => {});
  }, []);

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
      case 'jobcards':
        return <TailorJobCardsView />;
      case 'measurements':
        return <TailorMeasurementsView />;
      case 'inventory':
        return <TailorInventoryView />;
      case 'settings':
        return <TailorSettingsView />;
      default:
        return <ComingSoonView label={currentNavLabel} />;
    }
  }

  return (
    <div className="min-h-screen bg-[var(--paper-dim)] text-[var(--ink)] antialiased flex" style={{ fontFamily: "'Work Sans', sans-serif" }}>
      <style>{FONT_IMPORT}</style>

      <div
        className="fixed inset-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage: 'radial-gradient(#241F19 0.7px, transparent 0.7px)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* ---------------- SIDEBAR ---------------- */}
      <aside
        className={`${navOpen ? 'fixed inset-y-0 left-0 translate-x-0' : 'fixed inset-y-0 left-0 -translate-x-full'} z-40 lg:relative lg:inset-auto lg:translate-x-0 lg:z-0 w-72 flex-shrink-0 h-screen lg:h-auto lg:min-h-screen text-[#EDEAE2] flex flex-col justify-between transition-transform duration-300`}
        style={{
          background: 'linear-gradient(180deg, #241F19 0%, #1E1C18 55%, #19170F 100%)',
          boxShadow: '1px 0 0 rgba(194,154,30,0.09), 8px 0 36px -14px rgba(0,0,0,0.55)',
        }}
      >
        <div>
          <div className="flex items-center justify-between px-8 py-8 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div
                className="brass-shimmer w-10 h-10 rounded-[3px] border border-[var(--brass-light)]/50 flex items-center justify-center rotate-3"
                style={{
                  background: 'linear-gradient(135deg, rgba(228,194,94,0.16), rgba(194,154,30,0.05))',
                  boxShadow: '0 0 0 1px rgba(228,194,94,0.1), 0 4px 16px -6px rgba(228,194,94,0.3)',
                }}
              >
                <span className="text-[var(--brass-light)] text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>P&amp;T</span>
              </div>
              <div className="leading-tight">
                <div className="text-sm tracking-[0.05em] text-[#EDEAE2]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>Press &amp; Tailor</div>
                <MonoLabel className="text-[#9C9686]">Workbench</MonoLabel>
              </div>
            </div>
            <button className="lg:hidden text-[#B4AF9E]" onClick={() => setNavOpen(false)} aria-label="Close menu">
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
                  className={`relative w-full flex items-center gap-3.5 pl-4 pr-4 py-3 rounded-r-[3px] text-[14px] transition-all ${
                    active
                      ? 'bg-gradient-to-r from-white/[0.07] to-transparent text-[#EDEAE2]'
                      : 'text-[#ABA495] hover:text-[#EDEAE2] hover:bg-white/[0.03]'
                  }`}
                >
                  {active && (
                    <svg className="absolute left-0 top-0 h-full w-[2px]" width="2" height="100%" aria-hidden="true">
                      <line x1="1" y1="0" x2="1" y2="100%" stroke="var(--brass-light)" strokeWidth="2" strokeDasharray="4 3" strokeLinecap="round" />
                    </svg>
                  )}
                  <item.icon className="w-4 h-4" strokeWidth={1.6} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="px-8 py-7 border-t border-white/[0.06] space-y-4">
          <button type="button" onClick={() => setShowProfile(true)} className="flex w-full items-center gap-3 rounded-[3px] p-1.5 text-left transition-colors hover:bg-white/[0.04]">
            <div className="w-9 h-9 overflow-hidden rounded-full bg-gradient-to-br from-[var(--brass-light)]/30 to-[var(--brass)]/10 border border-[var(--brass-light)]/40 flex items-center justify-center">
              {profile?.profile_picture ? <img src={profile.profile_picture} alt="Profile" className="h-full w-full object-cover" /> : <span className="text-[var(--brass-light)] text-xs font-medium">{profile?.full_name?.split(' ').map((name: string) => name[0]).join('').slice(0, 2) || 'MT'}</span>}
            </div>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[13px] text-[#EDEAE2]">{profile?.full_name || TAILOR.name}</div>
              <MonoLabel className="text-[#9C9686]">{profile?.position || TAILOR.role}</MonoLabel>
            </div>
          </button>
          <button onClick={signOut} className="group flex w-full items-center justify-between border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 rounded-[3px] text-[10px] font-semibold tracking-[0.16em] uppercase text-[#B4AF9E] transition-all hover:border-[var(--brass-light)]/50 hover:text-[#EDEAE2]">
            Sign out <LogOut className="h-3.5 w-3.5 text-[var(--brass-light)] transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </aside>

      {showProfile && <MasterTailorProfileModal profile={profile} onClose={() => setShowProfile(false)} onEdit={() => navigate('/complete-profile')} />}

      {navOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setNavOpen(false)} />}

      {/* ---------------- MAIN ---------------- */}
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-20 bg-[var(--paper-dim)]/95 backdrop-blur-md border-b border-[var(--line)] px-6 sm:px-10 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button className="lg:hidden text-[var(--ink)] flex-shrink-0" onClick={() => setNavOpen(true)} aria-label="Open menu">
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <MonoLabel className="block">Workbench / {currentNavLabel}</MonoLabel>
              <div className="text-[16px] text-[var(--ink)] truncate" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>
                {currentNavLabel}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-5 flex-shrink-0">
            <div className="relative hidden md:flex items-center bg-[var(--paper)] border border-[var(--line)] rounded-full pl-3 pr-2 py-2 focus-within:border-[var(--muted-2)] transition-colors" style={{ boxShadow: 'var(--shadow-pressed)' }}>
              <Search className="w-3.5 h-3.5 text-[var(--muted-2)] flex-shrink-0" strokeWidth={1.5} />
              <input
                type="text"
                placeholder="Search job cards"
                className="w-44 bg-transparent placeholder-[var(--muted-2)] text-[12px] pl-2 focus:outline-none"
              />
              <kbd className="ml-1 flex-shrink-0 rounded-[3px] border border-[var(--line)] bg-[var(--paper-dim)] px-1.5 py-0.5 text-[9px] text-[var(--muted-2)]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                /
              </kbd>
            </div>
            <NotificationBell endpoint="/tailor/notifications" />
            <div className="h-6 w-px bg-[var(--line)] hidden sm:block" />
            <LiveDateTime />
          </div>
        </header>

        <main className="w-full px-6 sm:px-10 xl:px-12 py-10">
          {renderView()}
        </main>
      </div>
    </div>
  );
}

function MasterTailorProfileModal({ profile, onClose, onEdit }: { profile: any; onClose: () => void; onEdit: () => void }) {
  const details: [string, string | undefined][] = [
    ['Employee ID', profile?.employee_id], ['Position', profile?.position || 'Master Tailor'],
    ['Department', 'Production & Alterations'], ['Date Hired', profile?.date_hired ? new Date(profile.date_hired).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : undefined],
    ['Account Status', profile?.status || 'Approved'],
  ];
  const responsibilities = ['Review assigned job cards', 'Take and verify measurements', 'Create patterns and cut fabric', 'Update production stages', 'Record fabric usage', 'Complete fittings and alterations'];
  const Section = ({ title, items }: { title: string; items: [string, string | undefined][] }) => (
    <div>
      <h3 className="text-lg text-[var(--ink)]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>{title}</h3>
      <dl className="mt-3 grid gap-x-6 gap-y-4 sm:grid-cols-2">
        {items.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{label}</dt>
            <dd className="mt-1 text-sm text-[var(--ink)]">{value || 'Not set'}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button aria-label="Close profile" onClick={onClose} className="absolute inset-0 bg-[#211F1C]/55 backdrop-blur-[3px]" />
      <section className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto border border-[var(--line)] bg-[var(--paper)] rounded-[3px]" style={{ boxShadow: 'var(--shadow-2)' }}>
        <div className="h-[3px] w-full bg-gradient-to-r from-[var(--brass)] via-[var(--brass-light)] to-[var(--brass)]" />
        <header className="flex items-start justify-between border-b border-[var(--line)] px-6 py-6 sm:px-8">
          <div>
            <MonoLabel>Master Tailor Profile</MonoLabel>
            <h2 className="mt-1 text-3xl text-[var(--ink)]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>{profile?.full_name || TAILOR.name}</h2>
          </div>
          <button onClick={onClose} className="p-2 text-[var(--ink-soft)] hover:bg-[var(--paper-dim)] rounded-[2px]"><X className="h-5 w-5" /></button>
        </header>
        <div className="space-y-8 p-6 sm:p-8">
          <div className="flex items-center gap-5 border border-[var(--line)] bg-[var(--paper-dim)] p-5 rounded-[3px]">
            <div className="h-20 w-20 overflow-hidden rounded-full border border-[var(--brass-light)]/50 bg-gradient-to-br from-[var(--brass-light)]/25 to-[var(--brass)]/10">
              {profile?.profile_picture ? <img src={profile.profile_picture} alt="Profile" className="h-full w-full object-cover" /> : <User className="m-6 h-8 w-8 text-[var(--brass-deep)]" />}
            </div>
            <div>
              <div className="text-lg font-medium">{profile?.full_name || TAILOR.name}</div>
              <p className="text-sm text-[var(--ink-soft)]">{profile?.position || TAILOR.role}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">{profile?.email || 'No email'}</p>
            </div>
          </div>
          <Section title="Personal Information" items={[["Full Name", profile?.full_name], ['Email Address', profile?.email], ['Contact Number', profile?.contact_number], ['Address', profile?.address]]} />
          <Section title="Employment Information" items={details} />
          <Section title="Account Information" items={[["Username", profile?.email?.split('@')[0]], ['Role', 'Master Tailor'], ['Last Login', 'Current session'], ['Password', '••••••••••••']]} />
          <div>
            <h3 className="text-lg text-[var(--ink)]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>Responsibilities</h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {responsibilities.map((item) => <li key={item} className="flex gap-2 text-sm text-[var(--ink-soft)]"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brass-deep)]" />{item}</li>)}
            </ul>
          </div>
          <div className="flex flex-wrap gap-3 border-t border-[var(--line)] pt-6">
            <button onClick={onEdit} className="bg-[var(--graphite)] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#EDEAE2] rounded-[2px] hover:bg-[var(--graphite-2)] transition-colors">Edit Profile</button>
            <button onClick={onEdit} className="border border-[var(--muted-2)] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--ink-soft)] rounded-[2px] hover:bg-[var(--paper-dim)] transition-colors">Change Photo</button>
          </div>
        </div>
      </section>
    </div>
  );
}
