import { useState, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Boxes, Minus, Plus, AlertTriangle, X, PlusCircle, Check } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
  RadialBarChart, RadialBar,
} from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const authToken = () => localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';

/* ===================================================================
   PRESS & TAILOR — Fabric Inventory
   Premium pass: each bolt gets a radial "spool" gauge instead of a
   flat progress bar, and a ledger-style bar chart up top shows stock
   across the whole shelf at a glance — baste-stitch gridlines and
   brass pin accents carried over from the rest of the workbench.
=================================================================== */

const TOKENS = {
  ink: '#262420', inkSoft: '#55503F', paper: '#FBF9F2', paperDim: '#F4F1E6',
  line: '#DCD8C7', lineSoft: '#E8E4D5', muted: '#8A846F', muted2: '#A39D8A',
  brass: '#C9A227', brassLight: '#E4C25E', pin: '#C0392B', green: '#3F6633',
};

const CAPACITY = 20;
type Fabric = { id: number | string; name: string; tone: string; stock: number; unit: string };
type ChartPayload = { dataKey?: string | number; fill?: string; color?: string; value?: string | number };

const INITIAL: Fabric[] = [
  { id: 1, name: 'Piña Jusi', tone: 'Ivory', stock: 14, unit: 'yards' },
  { id: 2, name: 'Italian Wool', tone: 'Charcoal', stock: 8, unit: 'yards' },
  { id: 3, name: 'Wool Blend', tone: 'Camel', stock: 3, unit: 'yards' },
  { id: 4, name: 'Polyester', tone: 'Navy', stock: 19, unit: 'yards' },
];

function toneHex(tone: string) {
  return tone === 'Ivory' ? '#F2E8C9' : tone === 'Charcoal' ? '#43423F' : tone === 'Camel' ? '#AE8259' : '#26364C';
}

/* woven-texture swatch */
function Swatch({ tone }: { tone: string }) {
  const base = toneHex(tone);
  return (
    <div
      className="h-11 w-11 rounded-[2px] border border-[#C9C4AE]/70 flex-shrink-0"
      style={{
        background: `repeating-linear-gradient(45deg, ${base} 0px, ${base} 3px, rgba(255,255,255,0.08) 3px, rgba(255,255,255,0.08) 4px, ${base} 4px, ${base} 7px)`,
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12), 0 1px 2px rgba(38,36,32,0.15)',
      }}
    />
  );
}

function MonoLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`text-[10px] uppercase tracking-[0.2em] ${className}`} style={{ color: TOKENS.muted, fontFamily: "'JetBrains Mono', monospace" }}>
      {children}
    </span>
  );
}

function LedgerTooltip({ active = false, payload = [], label = '', unit = '' }: { active?: boolean; payload?: ChartPayload[]; label?: string | number; unit?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[3px] px-3.5 py-2.5" style={{ background: TOKENS.paper, border: `1px solid ${TOKENS.line}`, boxShadow: '0 10px 24px -10px rgba(38,36,32,0.35)' }}>
      <div className="text-[9px] uppercase tracking-[0.16em]" style={{ color: TOKENS.muted, fontFamily: "'JetBrains Mono', monospace" }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="mt-1 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: p.fill || p.color }} />
          <span className="text-[13px] font-semibold" style={{ color: TOKENS.ink, fontFamily: "'Fraunces', serif" }}>{p.value}{unit}</span>
        </div>
      ))}
    </div>
  );
}

/* radial "spool" gauge — reads stock as thread wound on a spool
   rather than a flat linear bar */
function SpoolGauge({ stock, low }: { stock: number; low: boolean }) {
  const pct = Math.min(100, Math.round((stock / CAPACITY) * 100));
  const data = [{ value: pct, fill: low ? TOKENS.pin : TOKENS.brass }];
  return (
    <div className="relative w-[64px] h-[64px] flex-shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart innerRadius="72%" outerRadius="100%" barSize={6} data={data} startAngle={90} endAngle={-270}>
          <RadialBar dataKey="value" background={{ fill: TOKENS.lineSoft }} cornerRadius={6} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[12px] font-semibold leading-none" style={{ color: TOKENS.ink, fontFamily: "'Fraunces', serif" }}>{pct}%</span>
      </div>
    </div>
  );
}

export function TailorInventoryView() {
  const [fabrics, setFabrics] = useState<Fabric[]>(INITIAL);
  const [logs, setLogs] = useState<any[]>([]);
  const [live, setLive] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addErr, setAddErr] = useState('');
  const [notice, setNotice] = useState('');

  const loadInventory = async () => {
    const response = await fetch(`${API_URL}/tailor/inventory`, { headers: { Authorization: `Bearer ${authToken()}` } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to load inventory.');
    setFabrics((data.inventory || []).map((f: any) => ({ id: f.id, name: f.fabricName, tone: f.tone || '—', stock: f.stockQuantity, unit: f.unit })));
    setLogs(data.logs || []);
    setLive(true);
  };

  useEffect(() => {
    let cancelled = false;
    loadInventory()
      .catch(() => { /* demo values remain */ })
      .finally(() => { if (!cancelled) setLive(false); });
    return () => { cancelled = true; };
  }, []);

  const adjust = async (id: number | string, delta: number) => {
    try {
      const res = await fetch(`${API_URL}/tailor/inventory/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
        body: JSON.stringify({ fabricId: Number(id), delta }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Unable to adjust stock.');
      // Update locally to match the persisted balance immediately.
      setFabrics((current) => current.map((f) => (Number(f.id) === Number(id) ? { ...f, stock: data.fabric.stockQuantity } : f)));
      await loadInventory(); // refresh logs + chart so the ledger stays in sync
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Unable to adjust stock.');
      setTimeout(() => setNotice(''), 4000);
    }
  };

  // Create a new bolt on the shelf (persisted to the backend, then refreshed).
  const addFabric = async (name: string, tone: string, stock: number, unit: string) => {
    setAddErr('');
    try {
      const res = await fetch(`${API_URL}/tailor/inventory/fabric`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
        body: JSON.stringify({ fabricName: name, tone, stockQuantity: stock, unit }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Unable to add fabric.');
      await loadInventory();
      setShowAdd(false);
    } catch (e) {
      setAddErr(e instanceof Error ? e.message : 'Unable to add fabric.');
    }
  };
  const record = useMemo(() => logs.slice(0, 8), [logs]);

  const withLevel = useMemo(
    () => fabrics.map((f) => ({ ...f, level: f.stock <= 3 ? 'Low' : 'Good' })),
    [fabrics],
  );
  const totalYards = fabrics.reduce((s, f) => s + f.stock, 0);
  const lowCount = withLevel.filter((f) => f.level === 'Low').length;

  return (
    <div className="space-y-7">
      <style>{`
        @keyframes riseIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .dash-in { opacity: 0; animation: riseIn 0.55s cubic-bezier(0.22,1,0.36,1) forwards; }
        @media (prefers-reduced-motion: reduce) { .dash-in { opacity: 1; animation: none; } }
      `}</style>

      {notice && (
        <div className="dash-in flex items-center gap-2 border border-[#8FAE85]/60 bg-[#E4E9DB] px-4 py-3 text-sm text-[#3F6633] rounded-[3px]">
          <Check className="h-4 w-4 flex-shrink-0" /> {notice}
        </div>
      )}

      <header
        className="dash-in flex flex-col justify-between gap-4 border border-[#3A3833] p-6 text-[#F3F1E7] sm:flex-row sm:items-end sm:p-8 rounded-[3px] relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #262420 0%, #211F1C 65%, #1C1A17 100%)', boxShadow: '0 22px 50px -18px rgba(33,31,28,0.28)' }}
      >
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 0.6px, transparent 0.6px)', backgroundSize: '16px 16px' }} />
        <div className="relative">
          <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#E4C25E]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Material board</span>
          <h1 className="mt-2 text-[32px] font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>Fabric Inventory</h1>
          <p className="mt-2 text-sm text-[#C9C5B7] max-w-md">Track available cloth before allocating a new cut.</p>
        </div>
        <div className="relative flex items-center gap-6 sm:gap-8 flex-shrink-0">
          <div className="text-right">
            <div className="text-2xl font-semibold text-[#F3F1E7]" style={{ fontFamily: "'Fraunces', serif" }}>{totalYards}</div>
            <div className="text-[9px] uppercase tracking-[0.15em] text-[#9C9686]">Yards on hand</div>
          </div>
          <div className="w-px h-9 bg-white/10" />
          <div className="text-right">
            <div className="text-2xl font-semibold text-[#E4C25E]" style={{ fontFamily: "'Fraunces', serif" }}>{lowCount}</div>
            <div className="text-[9px] uppercase tracking-[0.15em] text-[#9C9686]">Running low</div>
          </div>
          <div className="w-11 h-11 rounded-[3px] border border-[#E4C25E]/40 flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, rgba(228,194,94,0.14), rgba(201,162,39,0.04))' }}>
            <Boxes className="h-5 w-5 text-[#E4C25E]" strokeWidth={1.6} />
          </div>
          <button
            onClick={() => { setAddErr(''); setShowAdd(true); }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[3px] border border-[#E4C25E]/50 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#E4C25E] hover:bg-[#E4C25E]/10 transition-colors flex-shrink-0"
          >
            <PlusCircle className="h-3.5 w-3.5" strokeWidth={2} /> Add fabric
          </button>
        </div>
      </header>

      {/* ---------------- SHELF OVERVIEW (bar chart) ---------------- */}
      <section
        className="dash-in border border-[#DCD8C7] bg-[#FBF9F2] p-6 sm:p-8 rounded-[4px] relative overflow-hidden"
        style={{ boxShadow: '0 1px 2px rgba(38,36,32,0.05), 0 14px 30px -16px rgba(38,36,32,0.25)', animationDelay: '0.08s' }}
      >
        <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${TOKENS.brass}, ${TOKENS.brassLight} 50%, ${TOKENS.brass})` }} />
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <MonoLabel>Shelf overview</MonoLabel>
            <h2 className="mt-1 text-xl font-semibold text-[#262420]" style={{ fontFamily: "'Fraunces', serif" }}>Stock against a {CAPACITY}-yard bolt</h2>
          </div>
          {lowCount > 0 && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] text-[10px] font-semibold uppercase tracking-[0.1em] border border-[#C0392B]/40 bg-[#F7E7E1] text-[#9A4936]">
              <AlertTriangle className="h-3 w-3" /> {lowCount} below reorder line
            </span>
          )}
        </div>
        <div className="mt-6 h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={withLevel} margin={{ top: 6, right: 8, left: -18, bottom: 0 }} barCategoryGap="32%">
              <CartesianGrid stroke={TOKENS.line} strokeDasharray="2 5" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: TOKENS.muted, fontFamily: 'JetBrains Mono, monospace' }} axisLine={{ stroke: TOKENS.line }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: TOKENS.muted, fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} width={28} domain={[0, CAPACITY]} />
              <Tooltip content={<LedgerTooltip unit=" yd" />} cursor={{ fill: TOKENS.paperDim }} />
              <Bar dataKey="stock" name="Stock" radius={[3, 3, 0, 0]} maxBarSize={46}>
                {withLevel.map((f) => <Cell key={f.name} fill={f.level === 'Low' ? TOKENS.pin : TOKENS.brass} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ---------------- BOLT CARDS ---------------- */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {withLevel.map((fabric, index) => (
          <article
            key={fabric.name}
            className="dash-in border border-[#DCD8C7] bg-[#FBF9F2] p-6 rounded-[3px] transition-transform hover:-translate-y-[1px]"
            style={{ animationDelay: `${0.18 + index * 0.06}s`, boxShadow: '0 1px 2px rgba(38,36,32,0.05), 0 10px 28px -14px rgba(38,36,32,0.22)' }}
          >
            <div className="flex items-start justify-between">
              <Swatch tone={fabric.tone} />
              <span className={`border px-2 py-1 rounded-[2px] text-[9px] font-semibold uppercase tracking-[0.12em] ${
                fabric.level === 'Low' ? 'border-[#C87965]/60 bg-[#F7E7E1] text-[#9A4936]' : 'border-[#8FAE85]/60 bg-[#E4E9DB] text-[#3F6633]'
              }`}>
                {fabric.level}
              </span>
            </div>
            <h2 className="mt-5 text-lg font-semibold text-[#262420]" style={{ fontFamily: "'Fraunces', serif" }}>{fabric.name}</h2>
            <p className="text-sm text-[#6D6A60]">{fabric.tone}</p>

            <div className="mt-4 flex items-center gap-4">
              <SpoolGauge stock={fabric.stock} low={fabric.level === 'Low'} />
              <div>
                <span className="block text-2xl font-semibold text-[#262420]" style={{ fontFamily: "'Fraunces', serif" }}>{fabric.stock}</span>
                <span className="text-[9px] uppercase tracking-[0.15em] text-[#8A846F]">{fabric.unit} on hand</span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-3 border-t border-[#E8E4D5] pt-4">
              <button onClick={() => adjust(fabric.id, -1)} aria-label={`Decrease ${fabric.name} stock`} className="border border-[#DCD8C7] p-2 rounded-[2px] text-[#55503F] hover:border-[#A39D8A] hover:bg-[#F4F1E6] transition-colors active:scale-95">
                <Minus className="h-3 w-3" />
              </button>
              <span className="text-[10px] uppercase tracking-[0.12em] text-[#8A846F] w-16 text-center">Adjust</span>
              <button onClick={() => adjust(fabric.id, 1)} aria-label={`Increase ${fabric.name} stock`} className="border border-[#DCD8C7] p-2 rounded-[2px] text-[#55503F] hover:border-[#A39D8A] hover:bg-[#F4F1E6] transition-colors active:scale-95">
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </article>
        ))}
      </section>

      {/* ---------------- RECENT STOCK MOVEMENTS ---------------- */}
      {record.length > 0 && (
        <section className="dash-in border border-[#DCD8C7] bg-[#FBF9F2] p-6 sm:p-8 rounded-[4px]" style={{ boxShadow: '0 1px 2px rgba(38,36,32,0.05), 0 14px 30px -16px rgba(38,36,32,0.25)' }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <MonoLabel>Immutable ledger</MonoLabel>
              <h2 className="mt-1 text-xl font-semibold text-[#262420]" style={{ fontFamily: "'Fraunces', serif" }}>Recent stock movements</h2>
            </div>
            {live && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] text-[10px] font-semibold uppercase tracking-[0.1em] border border-[#8FAE85]/60 bg-[#E4E9DB] text-[#3F6633]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3F6633]" /> Live from backend
              </span>
            )}
          </div>
          <div className="mt-5 divide-y divide-[#E8E4D5]">
            {record.map((log) => (
              <div key={log.id} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#262420]">{log.fabricId ? `Fabric #${log.fabricId}` : 'Fabric'} · {log.jobCardNumber || 'shelf adjustment'}</p>
                  <p className="text-[12px] text-[#6D6A60]">
                    {log.logType === 'usage' ? 'Usage recorded' : log.logType} · {log.actor || 'Tailor'}{log.notes ? ` — ${log.notes}` : ''}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold" style={{ color: log.quantityChange < 0 ? '#A32E22' : '#3F6633' }}>{log.quantityChange > 0 ? '+' : ''}{log.quantityChange} {log.unit}</p>
                  <p className="text-[10.5px] text-[#8A846F]">{log.previousBalance} → {log.newBalance} {log.unit}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    {showAdd && (
        <AddFabricModal
          onClose={() => setShowAdd(false)}
          onAdd={addFabric}
          error={addErr}
        />
      )}
    </div>
  );
}

function AddFabricModal({ onClose, onAdd, error }: { onClose: () => void; onAdd: (name: string, tone: string, stock: number, unit: string) => void; error: string }) {
  const [name, setName] = useState('');
  const [tone, setTone] = useState('');
  const [stock, setStock] = useState('20');
  const [unit, setUnit] = useState('yards');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const qty = Number(stock);
    if (Number.isNaN(qty) || qty < 0) return;
    setBusy(true);
    try {
      await onAdd(name.trim(), tone.trim(), qty, unit);
    } catch (caught) {
      /* parent surfaces the backend error via `error` */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#211F1C]/60 backdrop-blur-[3px]" onClick={onClose} />
      <div className="relative w-full max-w-lg border border-[#D8D3C0] rounded-[4px] overflow-hidden" style={{ background: '#FBF9F2', boxShadow: '0 24px 60px -18px rgba(33,31,28,0.5)' }}>
        <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg, #B4842A, #E4C25E 50%, #B4842A)' }} />
        <div className="flex items-center justify-between px-7 pt-6">
          <MonoLabel>New bolt on the shelf</MonoLabel>
          <button onClick={onClose} aria-label="Close" className="text-[#A39D8A] hover:text-[#262420] transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-7 pb-8 pt-2">
          <h2 className="text-2xl font-semibold" style={{ fontFamily: "'Fraunces', serif", color: '#262420' }}>Add fabric</h2>
          <form onSubmit={submit} className="mt-5 space-y-4">
            {error && <div role="alert" className="border border-[#C87965]/50 bg-[#F7E7E1] px-3 py-2 text-sm text-[#9A4936] rounded-[2px]">{error}</div>}
            <label className="block text-xs font-medium text-[#6D6A60]">Fabric name
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Linen" className="mt-2 w-full border border-[#DCD8C7] bg-white rounded-[2px] px-3 py-2.5 text-sm text-[#262420] outline-none focus:border-[#9C7D12] transition-colors" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-medium text-[#6D6A60]">Tone / colour
                <input value={tone} onChange={(e) => setTone(e.target.value)} placeholder="e.g. Beige" className="mt-2 w-full border border-[#DCD8C7] bg-[#FFF] rounded-[2px] px-3 py-2.5 text-sm outline-none focus:border-[#9C7D12] transition-colors" />
              </label>
              <label className="block text-xs font-medium text-[#6D6A60]">Unit
                <select value={unit} onChange={(e) => setUnit(e.target.value)} className="mt-2 w-full border border-[#DCD8C7] bg-[#FFF] rounded-[2px] px-3 py-2.5 text-sm outline-none"><option value="yards">yards</option><option value="meters">meters</option></select>
              </label>
            </div>
            <label className="block text-xs font-medium text-[#6D6A60]">Initial stock on hand
              <input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} className="mt-2 w-full border border-[#DCD8C7] bg-[#FFF] rounded-[2px] px-3 py-2.5 text-sm outline-none focus:border-[#9C7D12] transition-colors" />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-[3px] border border-[#DCD8C7] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A846F] hover:text-[#262420] transition-colors">Cancel</button>
              <button type="submit" disabled={busy} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[3px] bg-[#262420] text-[#F3F1E7] text-[10px] font-semibold uppercase tracking-[0.12em] disabled:opacity-50">{busy ? 'Adding…' : 'Add to shelf'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
