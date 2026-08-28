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
import { Check, ChevronRight, X, Search, Scissors, Boxes, ClipboardCheck, Ruler, Clock, TrendingUp, Shirt } from 'lucide-react';
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

/* ---------------- demo seeds (used only when the API cannot be reached) ---------------- */
const DEMO_CARDS = [
  { id: 'JC-3021', customer: 'Reyna Fuentes', garment: 'Barong Tagalog', stage: 'First Fitting', due: 'Aug 12', priority: 'High', days: [2, 1, 3, 4] },
  { id: 'JC-3020', customer: 'Boyet Salcedo', garment: 'Two-piece Suit', stage: 'Pattern Cutting', due: 'Aug 13', priority: 'Normal', days: [3, 2] },
  { id: 'JC-3019', customer: 'Consuelo Reyes', garment: "Women's Coat", stage: 'Final Alterations', due: 'Aug 10', priority: 'Normal', days: [1, 2, 2, 5, 3] },
];

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
function Label({ children }) {
  return <span className="text-[10px] uppercase tracking-[0.2em] text-[#8A846F]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{children}</span>;
}
function Info({ label, value }) {
  return (
    <div className="rounded-[3px] p-3.5" style={{ background: '#FEFDF9', border: '1px solid #E2DECC', boxShadow: '0 1px 2px rgba(38,36,32,0.04), 0 1px 0 rgba(255,255,255,0.8) inset' }}>
      <Label>{label}</Label>
      <p className="mt-1.5 text-[13.5px] font-medium text-[#262420]">{value || '—'}</p>
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
          className="h-1.5 w-3 rounded-full transition-all duration-500"
          style={{
            background: i < stageIndex ? 'linear-gradient(90deg, #B4842A, #E4C25E)' : i === stageIndex ? 'linear-gradient(90deg, #A12F24, #C0392B)' : '#E2DECC',
            boxShadow: i <= stageIndex ? '0 1px 1px rgba(38,36,32,0.15)' : 'none',
          }}
        />
      ))}
    </div>
  );
}

function PriorityPill({ priority }: { priority: string }) {
  const color = PRIORITY_TONE[priority] || TOKENS.muted;
  return (
    <span className="px-2 py-0.5 rounded-[2px] text-[9px] font-semibold uppercase tracking-[0.12em]" style={{ color, border: `1px solid ${color}33`, background: `${color}10` }}>
      {priority || 'Normal'}
    </span>
  );
}

/* ===================================================================
   ANALYTICS VISUALS — animated gauges + charts fed by real backend data
=================================================================== */
function StatMini({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div className="rounded-[3px] p-2.5 border" style={{ borderColor: '#E2DECC', background: 'linear-gradient(180deg,#FEFDF9,#FAF7EE)' }}>
      <div className="text-[8.5px] uppercase tracking-[0.15em] text-[#8A846F]">{label}</div>
      <div className="mt-1 text-[13px] font-semibold truncate" style={{ color: tone, fontFamily: "'JetBrains Mono', monospace" }}>{value || '—'}</div>
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
    <section className="border border-[#E4DEC9] rounded-[3px] p-4" style={{ background: 'linear-gradient(180deg,#FFFDF6,#F7F2E5)' }}>
      <div className="flex items-center justify-between mb-2">
        <Label>Production progress</Label>
        <span className="text-[14px] font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#262420' }}>{pct}%</span>
      </div>
      <div className="relative h-2.5 w-full rounded-full overflow-hidden" style={{ background: '#E8E2CE' }}>
        <div className="relative h-full rounded-full overflow-hidden" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#9C7D12,#E4C25E)', animation: 'jcGrow 1s ease' }}>
          <span className="absolute inset-y-0 w-8" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.65),transparent)', animation: 'jcShimmer 2.2s ease-in-out 0.4s infinite' }} />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <StatMini label="Audit events" value={historyCount} tone="#C9A227" />
        <StatMini label="Current stage" value={status} tone="#C0392B" />
        <StatMini label={nextStage ? 'Next' : 'Stage'} value={nextStage || status} tone="#3F6633" />
      </div>
    </section>
  );
}

// Top-level overview strip inside the Job Card: progress gauge + quick counts.
function DetailOverview({ candidate, job }: { candidate: any; job: any }) {
  const history = candidate.productionHistory || [];
  return (
    <div>
      <div className="flex items-center gap-2 mb-3"><StitchLine className="w-7" /><Label>Bench overview</Label></div>
      <StageProgressGauge status={job.status} historyCount={history.length} />
    </div>
  );
}

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
    <div className="rounded-[3px] border border-[#E4DEC9] p-3" style={{ background: 'linear-gradient(180deg,#FEFDF6,#F6F1E3)' }}>
      <Label className="block mb-1">Figure map</Label>
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
    <div className="mt-2 rounded-[3px] border border-[#E4DEC9] p-3" style={{ background: 'linear-gradient(180deg,#FEFDF6,#F6F1E3)' }}>
      <Label className="mb-1">Fabric off the shelf</Label>
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

function Input({ label, value, onChange, placeholder = '', type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="block text-xs font-medium text-[#6D6A60]">
      {label}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full border border-[#DCD8C7] bg-white rounded-[2px] px-3 py-2.5 text-sm text-[#262420] outline-none focus:border-[#9C7D12] transition-colors"
      />
    </label>
  );
}

function TextArea({ label, value, onChange, placeholder = '' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block text-xs font-medium text-[#6D6A60]">
      {label}
      <textarea rows={3} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="mt-2 w-full border border-[#DCD8C7] bg-white rounded-[2px] px-3 py-2.5 text-sm text-[#262420] outline-none focus:border-[#9C7D12] transition-colors resize-none" />
    </label>
  );
}

function Band({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border border-[#E2DECC] bg-white rounded-[3px] overflow-hidden">
      <header className="flex items-center gap-2.5 px-4 py-3 border-b border-[#EEEADB]" style={{ background: 'linear-gradient(180deg, #FFFDF6, #F7F3E6)' }}>
        {icon}
        <Label>{label}</Label>
      </header>
      <div className="p-4">{children}</div>
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
  const [demo, setDemo] = useState(false);

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
        setDemo(false);
      })
      .catch(() => {
        if (cancelled) return;
        setCards(DEMO_CARDS.map((c) => ({ ...c, status: c.stage })));
        setTotal(DEMO_CARDS.length);
        setTotalPages(1);
        setDemo(true);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [query, status, garmentType, priority, deadlineFrom, deadlineTo, sort, order, page]);

  function announce(message: string) {
    setBanner(message);
    window.setTimeout(() => setBanner(''), 4000);
  }
  function replaceCard(id: string, patch: any) {
    setCards((prev: any[]) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }
  return (
    <div className="space-y-8">
      <GrainDefs />
      <div className="dash-in flex items-end justify-between gap-6 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5 mb-2"><Label>Assigned job cards</Label></div>
          <h1 className="text-2xl sm:text-[32px] leading-tight text-[#262420]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>The pattern table</h1>
          <p className="mt-1 text-sm text-[#6D6A60]">
            {demo
              ? 'Showing a saved demo — the API could not be reached. The MySQL backend is the source of truth.'
              : `${total} job card${total === 1 ? '' : 's'} on your bench.`}
          </p>
        </div>
      </div>

      {banner && (
        <div className="dash-in flex items-center gap-2 border border-[#8FAE85] bg-[#E4E9DB] px-4 py-3 text-sm text-[#3F6633] rounded-[3px]" style={{ boxShadow: '0 1px 2px rgba(38,36,32,0.05)' }}>
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>{banner}</span>
        </div>
      )}
      {error && !demo && (
        <div role="alert" className="border border-[#C87965]/40 bg-[#F7E7E1] px-4 py-3 text-sm text-[#9A4936] rounded-[3px]">{error}</div>
      )}

      {/* ------------------- FILTER TOOLBAR ------------------- */}
      <section className="border border-[#E2DECC] bg-[#FBF9F2] rounded-[3px] p-4" style={{ boxShadow: '0 1px 2px rgba(38,36,32,0.04)' }}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative flex items-center border border-[#DCD8C7] bg-white rounded-[2px] focus-within:border-[#9C7D12] transition-colors lg:col-span-2">
            <Search className="w-4 h-4 text-[#A39D8A] ml-3" strokeWidth={1.5} />
            <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search job card, customer or garment" className="w-full bg-transparent text-sm px-3 py-2.5 focus:outline-none" />
          </div>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="border border-[#DCD8C7] bg-white rounded-[2px] px-3 py-2.5 text-sm text-[#55503F] outline-none">
            <option value="">All statuses</option>
            {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={garmentType} onChange={(e) => { setGarmentType(e.target.value); setPage(1); }} className="border border-[#DCD8C7] bg-white rounded-[2px] px-3 py-2.5 text-sm text-[#55503F] outline-none">
            <option value="">All garment types</option>
            {GARMENTS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <select value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }} className="border border-[#DCD8C7] bg-white rounded-[2px] px-3 py-2 text-sm text-[#55503F] outline-none">
            <option value="">All priorities</option>
            <option>High</option><option>Normal</option><option>Low</option>
          </select>
          <label className="text-xs text-[#6D6A60]">From
            <input type="date" value={deadlineFrom} onChange={(e) => { setDeadlineFrom(e.target.value); setPage(1); }} className="ml-2 border border-[#DCD8C7] bg-white rounded-[2px] px-2 py-1.5 text-xs" />
          </label>
          <label className="text-xs text-[#6D6A60]">To
            <input type="date" value={deadlineTo} onChange={(e) => { setDeadlineTo(e.target.value); setPage(1); }} className="ml-2 border border-[#DCD8C7] bg-white rounded-[2px] px-2 py-1.5 text-xs" />
          </label>
          <div className="ml-auto flex items-center gap-2 text-xs text-[#6D6A60]">
            Sort
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="border border-[#DCD8C7] bg-white rounded-[2px] px-2 py-1.5 text-xs text-[#55503F] outline-none">
              <option value="assigned_at">Assigned date</option>
              <option value="deadline">Deadline</option>
              <option value="priority">Priority</option>
              <option value="stage">Stage</option>
              <option value="customer">Customer</option>
            </select>
            <button onClick={() => setOrder(order === 'desc' ? 'asc' : 'desc')} className="border border-[#DCD8C7] bg-white rounded-[2px] px-2 py-1.5 hover:border-[#A39D8A] transition-colors">
              {order === 'desc' ? 'Newest' : 'Oldest'}
            </button>
          </div>
        </div>
      </section>
      {/* ------------------- CARD GRID ------------------- */}
      {loading ? (
        <div className="py-16 text-center text-sm text-[#8A846F]">Loading job cards from the server&hellip;</div>
      ) : cards.length === 0 ? (
        <div className="py-16 text-center">
          <h2 className="text-xl text-[#262420]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>No job cards match the current filters.</h2>
          <p className="text-sm text-[#6D6A60] mt-1">Clear the filters to see every assigned card.</p>
        </div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card, index) => (
            <button
              key={card.id}
              onClick={() => setSelected(card.id)}
              className="group relative border p-5 rounded-[3px] text-left transition-all hover:-translate-y-[1px]"
              style={{ animationDelay: `${index * 0.06}s`, background: '#FBF9F2', borderColor: '#DCD8C7', boxShadow: '0 1px 2px rgba(38,36,32,0.06), 0 14px 26px -14px rgba(38,36,32,0.3)' }}
            >
              <div className="absolute inset-0 rounded-[3px] overflow-hidden pointer-events-none"><Grain opacity={0.45} /></div>
              <Notch className="-top-px -left-px" />
              <Notch className="-top-px -right-px rotate-90" />
              <div className="relative">
                <div className="flex items-center justify-between gap-3">
                  <Label>{card.id}</Label>
                  <PriorityPill priority={card.priority} />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-[#262420]" style={{ fontFamily: "'Fraunces', serif" }}>{card.customer}</h2>
                <p className="mt-1 text-sm text-[#6D6A60]">{card.garmentType}{card.quantity > 1 ? ` · ×${card.quantity}` : ''}</p>
                <div className="mt-4"><TapeDivider /></div>
                <div className="mt-4">
                  <Label>Stage</Label>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <StageTracker stage={card.status} />
                    <ChevronRight className="h-4 w-4 text-[#9C7D12] flex-shrink-0 transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <p className="mt-2 text-sm font-medium text-[#262420]">{card.status}</p>
                </div>
                <div className="mt-4 flex items-center justify-between text-[11px] text-[#8A846F]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
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
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="border border-[#DCD8C7] bg-white rounded-[2px] px-3 py-1.5 text-xs disabled:opacity-40">Prev</button>
          <span className="text-xs text-[#6D6A60]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="border border-[#DCD8C7] bg-white rounded-[2px] px-3 py-1.5 text-xs disabled:opacity-40">Next</button>
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
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 40%, rgba(38,36,32,0.45), rgba(20,19,17,0.72))', backdropFilter: 'blur(4px)' }} />
        <div className="relative w-full max-w-lg border border-[#D8D3C0] rounded-[4px] overflow-hidden" style={{ background: '#FBF9F2' }}>
          <div className="p-10 text-center text-sm text-[#8A846F]">Opening job card {jobCardId}…</div>
        </div>
      </div>
    );
  }
  const job = detail.jobCard;
  const locked = ['Ready for Pickup', 'Released'].includes(job.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 40%, rgba(38,36,32,0.45), rgba(20,19,17,0.72))', backdropFilter: 'blur(4px)' }} />
      <style>{`
        @keyframes jcGrow { from { width: 0%; } }
        @keyframes jcShimmer { 0% { transform: translateX(-120%); } 100% { transform: translateX(420%); } }
        @keyframes jcFadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes jcPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }
        .jc-anim { opacity: 0; animation: jcFadeUp 0.45s ease forwards; }
        .jc-line { position: relative; }
        .jc-line::before { content: ''; position: absolute; left: 5px; top: 8px; bottom: -8px; width: 2px; background: linear-gradient(#E4C25E,#DFD8C7); border-radius: 2px; }
      `}</style>
      <section className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto border border-[#D8D3C0] rounded-[4px]" style={{ background: '#FBF9F2', backgroundImage: 'radial-gradient(#E4E0CF 0.6px, transparent 0.6px)', backgroundSize: '16px 16px', boxShadow: '0 1px 0 rgba(255,255,255,0.6) inset, 0 0 0 1px rgba(38,36,32,0.04), 0 12px 24px -8px rgba(33,31,28,0.28), 0 40px 80px -18px rgba(20,19,17,0.5)' }}>
        <Grain opacity={0.3} />
        <Notch className="-top-px -left-px" />
        <Notch className="-top-px -right-px rotate-90" />

        <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg, #B4842A, #EBCB6E 45%, #F4DD8E 55%, #B4842A)' }} />
        <div className="p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <Label>Pattern work card</Label>
                <PriorityPill priority={job.priority} />
              </div>
              <h2 className="mt-2 text-2xl font-semibold text-[#262420]" style={{ fontFamily: "'Fraunces', serif" }}>{job.id}</h2>
              <p className="mt-1 text-sm text-[#6D6A60]">{job.customerName} · {job.garmentType}{job.quantity > 1 ? ` · ×${job.quantity}` : ''}</p>
            </div>
            <button onClick={onClose} aria-label="Close" className="w-7 h-7 flex items-center justify-center rounded-full text-[#A39D8A] hover:text-[#262420] hover:bg-[#EFEBDC] transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 mt-5">
            <Info label="Customer" value={job.customerId ? `${job.customerName} · ${job.customerId}` : job.customerName} />
            <Info label="Contact" value={job.customerContact || '—'} />
            <Info label="Deadline" value={formatDate(job.deadline)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3 mt-2">
            <Info label="Severity" value={`${job.priority || 'Normal'} priority`} />
            <Info label="Assigned to" value={job.assignedName || 'Unassigned'} />
            <Info label="Status" value={job.status} />
          </div>

          {job.specialInstructions && (
            <div className="mt-3"><Info label="Special instructions" value={job.specialInstructions} /></div>
          )}

          {locked && (
            <div className="mt-3 border border-[#C9A227]/50 bg-[#F7E9D8] px-4 py-2.5 text-[12px] text-[#8A5A12] rounded-[2px]">
              This job card is {job.status}. Major production details are locked and require manager authorization to change.
            </div>
          )}
        </div>
      {/* ------------------- BODY SECTIONS ------------------- */}
        <div className="p-6 sm:p-7 mt-1 space-y-5">
          <div className="jc-anim" style={{ animationDelay: '0.06s' }}><DetailOverview candidate={detail} job={job} /></div>
          <div className="jc-anim" style={{ animationDelay: '0.12s' }}><MeasurementSection detail={detail} locked={locked} onSaved={onSaved} refresh={refresh} /></div>
          <div className="jc-anim" style={{ animationDelay: '0.18s' }}><TimelineSection job={job} detail={detail} locked={locked} onSaved={onSaved} onStageChange={onStageChange} refresh={refresh} /></div>
          <div className="jc-anim" style={{ animationDelay: '0.24s' }}><FabricSection detail={detail} locked={locked} onSaved={onSaved} refresh={refresh} /></div>
          <div className="jc-anim" style={{ animationDelay: '0.30s' }}><FittingSection detail={detail} locked={locked} onSaved={onSaved} refresh={refresh} /></div>
          <div className="jc-anim" style={{ animationDelay: '0.36s' }}><AlterSection detail={detail} locked={locked} onSaved={onSaved} refresh={refresh} /></div>
          <div className="jc-anim" style={{ animationDelay: '0.42s' }}><QualitySection detail={detail} locked={locked} onSaved={onSaved} refresh={refresh} onStageChange={onStageChange} /></div>
          <div className="jc-anim" style={{ animationDelay: '0.48s' }}><VirtualSection detail={detail} /></div>
        </div>
      </section>
    </div>
  );
}
function MeasurementSection({ detail, locked, onSaved, refresh }: { detail: any; locked: boolean; onSaved: (m: string) => void; refresh: () => void }) {
  const snapshot = detail.measurementSnapshot || [];
  const verifications = detail.verifications || [];
  // The most recently saved verification becomes the source of truth for the
  // badge below, and pre-selects the radio buttons so the section reflects it.
  const latest = verifications[verifications.length - 1];
  const [status, setStatus] = useState(latest?.status || 'Verified');
  const [notes, setNotes] = useState(latest?.tailoring_notes || '');
  const [concern, setConcern] = useState(latest?.concern_flags || '');
  const [requestConfirm, setRequestConfirm] = useState(!!latest?.request_confirmation);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api(`/tailor/job-cards/${encodeURIComponent(detail.jobCard.id)}/verify-measurements`, {
        method: 'POST',
        body: JSON.stringify({ status, tailoringNotes: notes, concernFlags: concern, requestConfirmation: requestConfirm }),
      });
      onSaved(`Measurements ${status.toLowerCase()} for ${detail.jobCard.id}.`);
      refresh();
    } catch (e) { onSaved(e instanceof Error ? e.message : 'Could not save verification.'); }
    finally { setSaving(false); }
  }
  return (
    <Band label="Verify measurements" icon={<Ruler className="w-3.5 h-3.5 text-[#9C7D12]" strokeWidth={1.6} />}>
      {latest && (
        <div className={`mb-3 flex items-center gap-2.5 border px-3.5 py-2.5 rounded-[3px] text-sm ${latest.status === 'Verified' || latest.status === 'Approved for Production'
          ? 'border-[#8FAE85]/60 bg-[#E4EBDA] text-[#3F6633]'
          : 'border-[#C87965]/50 bg-[#F7E7E1] text-[#9A4936]'}`}>
          {latest.status === 'Verified' || latest.status === 'Approved for Production'
            ? <Check className="w-4 h-4 flex-shrink-0" />
            : <X className="w-4 h-4 flex-shrink-0" />}
          <div>
            <span className="font-semibold uppercase tracking-[0.08em] text-[11.5px]">{latest.status}</span>
            <span className="text-[12px] opacity-80 ml-2">— reviewed {new Date(latest.verified_at || Date.now()).toLocaleString()}{latest.tailoring_notes ? ` · ${latest.tailoring_notes}` : ''}</span>
          </div>
        </div>
      )}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {snapshot.length === 0 && <p className="text-sm text-[#8A846F]">No measurement snapshot is attached to this order yet.</p>}
        {snapshot.map((m: any) => (
          <div key={m.label} className="border border-dashed border-[#B4AF9E] bg-white rounded-[2px] p-3">
            <span className="text-[9px] uppercase tracking-[0.15em] text-[#8A846F]">{m.label}</span>
            <p className="mt-1 text-sm font-semibold text-[#262420]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{m.value || '—'} in</p>
          </div>
        ))}
      </div>
      {snapshot.length > 0 && (
        <div className="mt-3 grid gap-3 lg:grid-cols-[1.1fr_1fr] items-stretch">
          <RadarMeasurementChart snapshot={snapshot} />
          <div className="rounded-[3px] border border-[#E4DEC9] p-3" style={{ background: 'linear-gradient(180deg,#FEFDF6,#F6F1E3)' }}>
            <Label className="block mb-2">Snapshot check</Label>
            <p className="text-[12px] text-[#6D6A60] leading-relaxed">
              These figures were frozen on the Job Card at order time. Cross-check them against the customer before confirming below — a green light lets production begin.
            </p>
          </div>
        </div>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Verification status</Label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {['Verified', 'Needs Re-measurement', 'Approved for Production'].map((s) => (
              <button key={s} onClick={() => setStatus(s)} disabled={locked}
                className={`px-3 py-1.5 rounded-[2px] text-[10px] font-semibold uppercase tracking-[0.1em] border ${status === s ? 'border-[#3F6633] bg-[#3F6633]/12 text-[#3F6633]' : 'border-[#A39D8A] text-[#8A846F]'}`}>{s}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <TextArea label="Tailoring notes" value={notes} onChange={setNotes} placeholder="Anything the cutter should know about this block…" />
        <TextArea label="Concern flags" value={concern} onChange={setConcern} placeholder="e.g. chest seems large vs. past orders" />
      </div>
      <label className="flex items-center gap-2.5 text-xs text-[#6D6A60] mt-2 cursor-pointer">
        <input type="checkbox" checked={requestConfirm} onChange={(e) => setRequestConfirm(e.target.checked)} disabled={locked}
          className="rounded-sm border-[#DCD8C7] text-[#3F6633] focus:ring-[#3F6633]" />
        Request measurement confirmation from the Front Desk
      </label>
      <div className="mt-3 flex justify-end gap-2">
        <button onClick={save} disabled={locked || saving}
          className="inline-flex items-center gap-2 bg-[#262420] px-4 py-2.5 rounded-[2px] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#F3F1E7] disabled:opacity-50">
          <Check className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save verification'}
        </button>
      </div>
    </Band>
  );
}
function TimelineSection({ job, detail, locked, onSaved, onStageChange, refresh }: { job: any; detail: any; locked: boolean; onSaved: (m: string) => void; onStageChange: (id: string, s: string) => void; refresh: () => void }) {
  const history = detail.productionHistory || [];
  const stageIndex = Math.max(0, STAGES.indexOf(job.status));
  const nextStage = stageIndex < STAGES.length - 1 ? STAGES[stageIndex + 1] : null;
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
    <Band label="Production timeline" icon={<ClipboardCheck className="w-3.5 h-3.5 text-[#9C7D12]" strokeWidth={1.6} />}>
      <div className="flex flex-wrap items-center gap-2">
        {STAGES.map((s, i) => (
          <div key={s} className="jc-anim flex items-center gap-2" style={{ animationDelay: `${0.04 * i}s` }}>
            <span title={s} className="h-3.5 w-3.5 rounded-full"
              style={{ background: i < stageIndex ? 'linear-gradient(90deg,#B4842A,#E4C25E)' : i === stageIndex ? 'linear-gradient(90deg,#A12F24,#C0392B)' : '#E2DECC', boxShadow: i === stageIndex ? '0 0 0 3px rgba(192,57,43,0.2)' : i <= stageIndex ? '0 1px 1px rgba(38,36,32,0.2)' : 'none' }}>
              {i < stageIndex && <Check className="w-2.5 h-2.5 text-white absolute" style={{ position: 'relative', top: 1, left: 1 }} />}
              {i === stageIndex && <span className="absolute inset-0 rounded-full" style={{ animation: 'jcPulse 1.8s ease-in-out infinite' }} />}
            </span>
            <span className={`text-[10px] uppercase tracking-[0.08em] ${i === stageIndex ? 'text-[#A12F24] font-semibold' : i < stageIndex ? 'text-[#8A846F]' : 'text-[#B4AF9E]'}`}>{s}</span>
            {i < STAGES.length - 1 && <ChevronRight className="w-3 h-3 text-[#B4AF9E]" />}
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Stage notes / remarks</Label>
          <TextArea label="" value={notes} onChange={setNotes} placeholder="Remark saved with this status update…" />
        </div>
        <div className="flex items-end justify-between">
          <button onClick={() => nextStage && advance(nextStage)} disabled={locked || busy || !nextStage}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-[3px] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#F3F1E7] disabled:opacity-45 transition-all active:translate-y-px"
            style={{ background: 'linear-gradient(180deg, #33312C, #211F1C)' }}>
            <Check className="w-4 h-4" /> {busy ? 'Saving…' : nextStage ? `Mark ${nextStage}` : 'No next stage'}
          </button>
          {locked && <span className="text-[10px] text-[#8A5A12]">Locked — manager authorization required.</span>}
        </div>
      </div>

      {history.length > 0 && (
        <div className="mt-4 divide-y divide-[#EEEADB]">
          <Label>Audit trail (never overwritten)</Label>
          <div className="mt-1">
            {history.slice().reverse().map((h: any) => (
              <div key={h.id} className="flex items-start gap-2.5 py-2.5">
                <span className="w-2 h-2 rounded-full mt-1" style={{ background: '#C9A227' }} />
                <div className="flex-1">
                  <p className="text-sm text-[#262420]">{h.from_stage ? `${h.from_stage} → ` : ''}{h.to_stage}<span className="text-[#8A846F]"> · {h.updated_by_name || 'Tailor'}</span></p>
                  {h.notes && <p className="text-[12px] text-[#6D6A60] mt-0.5">{h.notes}</p>}
                  <p className="text-[10.5px] text-[#A39D8A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{new Date(h.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Band>
  );
}
function FabricSection({ detail, locked, onSaved, refresh }: { detail: any; locked: boolean; onSaved: (m: string) => void; refresh: () => void }) {
  const inventory = detail.inventory || [];
  const usage = detail.fabricUsage || [];
  // The fabric linked to the order flows straight into the usage form: the
  // dropdown is pre-selected to the job card's fabric so stock is deducted
  // from the right bolt (single shared record, no manual re-entry).
  const jobFabric = detail.jobCard?.fabric || '';
  const matched = useMemo(
    () => inventory.find((f: any) => String(f.fabricName).toLowerCase() === jobFabric.toLowerCase()) || null,
    [inventory, jobFabric]
  );
  // The unit selector is driven by the actual fabrics on the shelf: each entry
  // shows the fabric name with its tracked unit so the tailor sees cloth, not
  // a bare generic unit. Falls back to meters/yards only if inventory is empty.
  const unitOptions = useMemo(() => {
    const seen = new Map<string, string>();
    (inventory as any[]).forEach((f) => {
      if (f.unit && !seen.has(f.unit)) seen.set(f.unit, f.fabricName || f.unit);
    });
    const opts = Array.from(seen, ([unit, name]) => ({ unit, name }));
    if (!opts.length) {
      return [{ unit: 'meters', name: 'Fabric' }, { unit: 'yards', name: 'Fabric' }];
    }
    if (!opts.some((o) => o.unit === 'meters')) opts.push({ unit: 'meters', name: 'Fabric' });
    if (!opts.some((o) => o.unit === 'yards')) opts.push({ unit: 'yards', name: 'Fabric' });
    return opts;
  }, [inventory]);
  const [cutNotes, setCutNotes] = useState('');
  const [patternNotes, setPatternNotes] = useState('');
  const [fabricType, setFabricType] = useState(jobFabric || '');
  const [estMeters, setEstMeters] = useState('');
  const [fabricId, setFabricId] = useState(() => (matched ? String(matched.id) : ''));
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState(matched?.unit || 'meters');
  const [notes, setNotes] = useState('');
  const [warn, setWarn] = useState('');
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

  async function recordUsage() {
    setBusy(true); setWarn('');
    try {
      if (!fabricId && !jobFabric && !fabricType.trim()) {
        throw new Error('Select a fabric or enter a fabric type before recording usage.');
      }
      const body: any = { quantityUsed: qty, unit, notes };
      if (fabricId) body.fabricId = Number(fabricId);
      // Fall back to the fabric that is already on the order / typed in, so
      // the backend deducts (or creates) the correct fabric row.
      body.fabricName = jobFabric || fabricType.trim();
      const res = await api(`/tailor/job-cards/${encodeURIComponent(detail.jobCard.id)}/fabric-usage`, { method: 'POST', body: JSON.stringify(body) });
      onSaved(res.message || 'Fabric usage recorded.');
      if (res.warnings?.length) setWarn(`Low stock: ${res.warnings.map((w: any) => `${w.fabricName} (${w.remaining} ${w.unit})`).join(', ')}`);
      setQty(''); setFabricId(''); setNotes(''); refresh();
    } catch (e) { onSaved(e instanceof Error ? e.message : 'Could not record usage.'); }
    finally { setBusy(false); }
  }

  return (
    <Band label="Pattern cutting & fabric usage" icon={<Scissors className="w-3.5 h-3.5 text-[#9C7D12]" strokeWidth={1.6} />}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="border border-[#EEEADB] bg-[#F7F3E6] rounded-[2px] p-4">
          <Label>Stage details — Pattern cutting</Label>
          <div className="mt-3 space-y-3">
            <TextArea label="Cutting notes" value={cutNotes} onChange={setCutNotes} />
            <TextArea label="Pattern notes" value={patternNotes} onChange={setPatternNotes} />
            <div className="grid gap-3 grid-cols-2">
              <Input label="Fabric type" value={fabricType} onChange={setFabricType} />
              <Input label="Est. meters required" value={estMeters} onChange={setEstMeters} type="number" />
            </div>
            <button onClick={savePattern} disabled={locked || busy}
              className="inline-flex items-center gap-2 bg-[#262420] px-4 py-2 rounded-[2px] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#F3F1E7] disabled:opacity-50">
              <Check className="w-3.5 h-3.5" /> Save pattern details
            </button>
          </div>
        </div>

        <div className="border border-[#C3E9CE]/40 bg-white rounded-[3px] p-4">
          <Label>Record fabric usage (deducts stock)</Label>
          <div className="mt-3 space-y-3">
            <select
              value={fabricId}
              onChange={(e) => {
                const id = e.target.value;
                setFabricId(id);
                const picked = inventory.find((f: any) => String(f.id) === String(id));
                if (picked) setUnit(picked.unit || 'meters');
              }}
              disabled={locked}
              className="w-full border border-[#DCD8C7] bg-white rounded-[2px] px-3 py-2.5 text-sm text-[#55503F] outline-none"
            >
              <option value="">Select fabric…</option>
              {inventory.map((fabric: any) => <option key={fabric.id} value={fabric.id}>{fabric.fabricName} — {fabric.stockQuantity} {fabric.unit}{fabric.lowStock ? ' (LOW)' : ''}</option>)}
            </select>
            {jobFabric && (
              <p className="text-[10.5px] text-[#6D6A60]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Order fabric: <span className="font-semibold text-[#3F6633]">{jobFabric}</span>
                {matched ? ` · stock ${matched.stockQuantity} ${matched.unit}` : ` · not in catalogue — will be created on first use`}
              </p>
            )}
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
              <Input label="Quantity used" value={qty} onChange={setQty} type="number" />
              <label className="block text-xs font-medium text-[#6D6A60]">Unit
                  <select value={unit} onChange={(e) => setUnit(e.target.value)} className="mt-2 w-full border border-[#DCD8C7] bg-white rounded-[2px] px-3 py-2.5 text-sm outline-none">
                    {unitOptions.map((u) => <option key={u.unit} value={u.unit}>{u.name} — {u.unit}</option>)}
                  </select>
                </label>
            </div>
            <Input label="Notes" value={notes} onChange={setNotes} />
            {warn && <div className="border border-[#C87965]/50 bg-[#F7E7E1] px-3 py-2 text-xs text-[#9A4936] round-none">{warn}</div>}
            <button onClick={recordUsage} disabled={locked || busy}
              className="inline-flex items-center gap-2 bg-[#262420] px-4 py-2 rounded-[2px] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#F3F1E7] disabled:opacity-50">
              <Boxes className="w-3.5 h-3.5" /> Record usage
            </button>
          </div>
        </div>
      </div>

      {usage.length > 0 && (
        <div className="mt-3">
          <Label>Usage history</Label>
          <FabricUsageChart usage={usage} />
          <div className="mt-1 divide-y divide-[#EEEADB]">
            {usage.map((u: any) => (
              <div key={u.id} className="py-2 text-sm text-[#262420]">
                {u.fabric_name} — {u.quantity_used} {u.unit}{u.notes ? ` · ${u.notes}` : ''}
              </div>
            ))}
          </div>
        </div>
      )}
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
    <Band label="Fittings" icon={<Shirt className="w-3.5 h-3.5 text-[#9C7D12]" strokeWidth={1.6} />}>
      {fittings.length > 0 && (
        <div className="divide-y divide-[#EEEADB] mb-4">
          {fittings.map((f: any) => (
            <div key={f.id} className="py-2.5">
              <p className="text-sm text-[#262420]"><span className="font-semibold">{f.fit_result}</span><span className="text-[#8A846F]"> · {f.recorded_by_name || 'Tailor'}</span></p>
              {f.customer_feedback && <p className="text-[12px] text-[#6D6A60]">Feedback: {f.customer_feedback}</p>}
              {f.required_adjustments && <p className="text-[12px] text-[#6D6A60]">Adjustments: {f.required_adjustments}</p>}
              <p className="text-[10.5px] text-[#A39D8A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{new Date(f.recorded_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
      <div className="grid gap-3">
        <Label>Record fitting result</Label>
        <div className="flex flex-wrap gap-2 mt-1">
          {['Approved', 'Minor Alterations Needed', 'Major Alterations Needed'].map((r) => (
            <button key={r} onClick={() => setFitResult(r)} disabled={locked}
              className={`px-3 py-1.5 rounded-[2px] text-[10px] font-semibold uppercase tracking-[0.1em] border ${fitResult === r ? 'border-[#3F6633] bg-[#3F6633]/12 text-[#3F6633]' : 'border-[#A39D8A] text-[#8A846F]'}`}>{r}</button>
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <TextArea label="Customer feedback" value={feedback} onChange={setFeedback} />
          <TextArea label="Required adjustments" value={adjustments} onChange={setAdjustments} />
          <Input label="Notes" value={notes} onChange={setNotes} />
        </div>
        <div className="mt-2 flex justify-end">
          <button onClick={save} disabled={locked || busy}
            className="inline-flex items-center gap-2 bg-[#262420] px-4 py-2 rounded-[2px] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#F3F1E7] disabled:opacity-50">
            <Check className="w-3.5 h-3.5" /> Save fitting
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
    <Band label="Final alterations" icon={<Scissors className="w-3.5 h-3.5 text-[#9C7D12]" strokeWidth={1.6} />}>
      {alterations.length > 0 && (
        <div className="divide-y divide-[#EEEADB] mb-4">
          {alterations.map((a: any) => (
            <div key={a.id} className="py-2.5">
              <p className="text-sm text-[#262420]">Completion {a.completion_percentage}%{a.estimated_completion ? ` · est. ${formatDate(a.estimated_completion)}` : ''}</p>
              {a.notes && <p className="text-[12px] text-[#6D6A60]">{a.notes}</p>}
              {(a.waist_adjustment || a.sleeve_adjustment || a.length_adjustment || a.shoulder_adjustment || a.other_modifications) && (
                <p className="text-[12px] text-[#6D6A60]">{[a.waist_adjustment && `Waist ${a.waist_adjustment}`, a.sleeve_adjustment && `Sleeve ${a.sleeve_adjustment}`, a.length_adjustment && `Length ${a.length_adjustment}`, a.shoulder_adjustment && `Shoulder ${a.shoulder_adjustment}`, a.other_modifications].filter(Boolean).join(' · ')}</p>
              )}
            </div>
          ))}
        </div>
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
      <div className="mt-2 flex justify-end">
        <button onClick={save} disabled={locked || busy}
          className="inline-flex items-center gap-2 bg-[#262420] px-4 py-2 rounded-[2px] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#F3F1E7] disabled:opacity-50">
          <Check className="w-3.5 h-3.5" /> Save alterations
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
    <Band label="Quality control & completion" icon={<ClipboardCheck className="w-3.5 h-3.5 text-[#9C7D12]" strokeWidth={1.6} />}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[['measurementsVerified', 'Measurements verified'], ['stitchingChecked', 'Stitching checked'], ['fabricQualityChecked', 'Fabric quality checked'], ['requirementsCompleted', 'Customer requirements completed'], ['cleanedPressed', 'Garment cleaned & pressed']].map(([key, label]) => (
          <label key={key} className="flex items-center gap-2.5 text-xs text-[#6D6A60] cursor-pointer border border-[#EEEADB] bg-[#FBF9F2] rounded-[2px] px-3 py-2.5">
            <input type="checkbox" checked={!!checks[key]} onChange={() => toggle(key)} disabled={locked || job.status === 'Completed' || job.status === 'Ready for Pickup'} className="rounded-sm border-[#DCD8C7] text-[#3F6633]" />
            {label}
          </label>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3 flex-wrap">
        <Label>Result</Label>
        {['Passed', 'Returned for Rework'].map((r) => (
          <button key={r} onClick={() => setResult(r)} disabled={locked}
            className={`px-3 py-1.5 rounded-[2px] text-[10px] font-semibold uppercase border ${result === r ? (r === 'Passed' ? 'border-[#3F6633] bg-[#3F6633]/12 text-[#3F6633]' : 'border-[#A32E22] bg-[#A32E22]/10 text-[#A32E22]') : 'border-[#A39D8A] text-[#8A846F]'}`}>{r}</button>
        ))}
        <button onClick={saveQC} disabled={locked || busy} className="inline-flex items-center gap-2 bg-[#262420] px-4 py-2 rounded-[2px] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#F3F1E7] disabled:opacity-50">
          <Check className="w-3.5 h-3.5" /> Save quality review
        </button>
      </div>
      {!allTrue && <p className="mt-1 text-[11px] text-[#8A5A12]">Only a full checklist with a Passed result may proceed to Completed.</p>}

      {qc && qc.result === 'Returned for Rework' && (
        <div className="mt-3 border border-[#C87965]/50 bg-[#F7E7E1] px-4 py-2.5 text-xs text-[#9A4936] rounded-[2px]">Last review returned for rework{qc.rework_notes ? `: ${qc.rework_notes}` : ''}.</div>
      )}

      {['Quality Review', 'Final Alterations'].includes(job.status) && (
        <div className="mt-4 border border-[#CCC7B4] bg-[#FBF9F2] rounded-[3px] p-4">
          <Label>Mark as completed (order stays in system — not released)</Label>
          <div className="mt-2"><TextArea label="Final garment remarks" value={finalRemarks} onChange={setFinalRemarks} placeholder="Notes handed to the Front Desk for the pickup queue…" /></div>
          <button onClick={markComplete} disabled={locked || busy}
            className="inline-flex items-center gap-2 bg-[#262420] px-5 py-3 rounded-[3px] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#F3F1E7] disabled:opacity-50">
            <Check className="w-4 h-4" /> {busy ? 'Saving…' : 'Mark as completed'}
          </button>
        </div>
      )}
    </Band>
  );
}
function VirtualSection({ detail }: { detail: any }) {
  const job = detail.jobCard;
  const history = detail.productionHistory || [];
  const verifications = detail.verifications || [];
  const rawEvents = [
    ...verifications.map((v: any) => ({ at: v.verified_at, text: `Measurements ${v.status}${v.tailoring_notes ? ` — ${v.tailoring_notes}` : ''}`, by: 'Tailor', icon: 'Verified' })),
    ...history.map((h: any) => ({ at: h.created_at, text: `${h.from_stage ? `${h.from_stage} → ` : ''}${h.to_stage}${h.notes ? ` — ${h.notes}` : ''}`, by: h.updated_by_name || 'Tailor', icon: 'Stage' })),
    ...verifications.filter((v: any) => v.request_confirmation).map((v: any) => ({ at: v.verified_at, text: 'Requested measurement confirmation from Front Desk', by: 'Tailor', icon: 'Confirm' })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  // Collapse repeated, identical events (e.g. several "Measurements Verified"
  // saves in a row) into one entry showing only the most recent time, so the
  // journal isn't flooded by duplicates. Distinct stage changes and
  // confirmation requests are always kept intact.
  const allEvents = rawEvents.reduce((acc: any[], e) => {
    const last = acc[acc.length - 1];
    if (last && last.text === e.text && last.icon === e.icon) {
      last.count = (last.count || 1) + 1;
      last.at = e.at; // keep the newest timestamp for the group
    } else {
      acc.push({ ...e });
    }
    return acc;
  }, []);

  return (
    <Band label="Production journal" icon={<ClipboardCheck className="w-3.5 h-3.5 text-[#9C7D12]" strokeWidth={1.6} />}>
      <div className="grid gap-3 sm:grid-cols-3 mt-1">
        <Info label="Completion date" value={job.completionDate ? formatDate(job.completionDate) : '—'} />
        <Info label="Fabric used" value={job.fabricUsed || '—'} />
        <Info label="Tailor remarks" value={(job.finalRemarks || job.tailorNotes) || '—'} />
      </div>

      {allEvents.length > 0 ? (
        <div className="mt-4 jc-line">
          {allEvents.map((e: any, i: number) => (
            <div key={i} className="jc-anim relative flex items-start gap-3 py-2.5 pl-6" style={{ animationDelay: `${0.05 * i}s` }}>
              <span className="absolute left-0 top-3.5 w-[11px] h-[11px] rounded-full border-2" style={{ background: e.icon === 'Confirm' ? '#8FAE85' : '#B4840A', borderColor: '#FFF', boxShadow: '0 0 0 2px rgba(180,132,10,0.18)' }} />
              <div className="flex-1">
                <p className="text-sm text-[#262420]">{e.text}{e.count > 0 ? `  (×${e.count})` : ''}</p>
                <p className="text-[10.5px] text-[#A39D8A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{e.by} · {new Date(e.at).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-[#8A846F]">No production history yet for this job card.</p>
      )}

      {['Completed', 'Ready for Pickup', 'Released'].includes(job.status) && (
        <div className="mt-3 border border-[#8FAE85]/50 bg-[#E4E9DB] px-4 py-2.5 text-[12px] text-[#3F6633] rounded-[2px]">
          Production is {job.status === 'Completed' ? 'complete and awaiting the Final Alterations handoff' : 'complete'}. The garment remains in the system and is released only by the Front Desk.
        </div>
      )}
    </Band>
  );
}