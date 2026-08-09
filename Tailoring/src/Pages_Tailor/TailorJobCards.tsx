// @ts-nocheck
import { useState } from 'react';
import { Check, ChevronRight, X } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const TOKENS = {
  ink: '#262420', inkSoft: '#55503F', paper: '#FBF9F2', paperDim: '#F4F1E6',
  line: '#DCD8C7', lineSoft: '#E8E4D5', muted: '#8A846F', muted2: '#A39D8A',
  brass: '#C9A227', brassLight: '#E4C25E', pin: '#C0392B', green: '#3F6633',
};

const CARDS = [
  { id: 'JC-3021', customer: 'Reyna Fuentes', garment: 'Barong Tagalog', stage: 'First Fitting', due: 'Aug 12', days: [2, 1, 3, 4] },
  { id: 'JC-3020', customer: 'Boyet Salcedo', garment: 'Two-piece Suit', stage: 'Pattern Cutting', due: 'Aug 13', days: [3, 2] },
  { id: 'JC-3019', customer: 'Consuelo Reyes', garment: "Women's Coat", stage: 'Final Alterations', due: 'Aug 10', days: [1, 2, 2, 5, 3] },
];

const STAGES = ['Measuring', 'Pattern Cutting', 'Initial Assembly', 'First Fitting', 'Final Alterations', 'Completed', 'Ready for Pickup'];

/* a whisper of paper grain */
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
function Grain({ opacity = 0.5 }) {
  return <div className="pointer-events-none absolute inset-0 mix-blend-multiply" style={{ filter: 'url(#paperGrain)', opacity }} aria-hidden="true" />;
}

function Notch({ className = '' }) {
  return (
    <span
      className={`absolute w-2.5 h-2.5 ${className}`}
      aria-hidden="true"
      style={{ background: 'linear-gradient(135deg, #FBF9F2 0%, #FBF9F2 46%, rgba(201,162,39,0.35) 48%, transparent 50%)', clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
    />
  );
}

function SwingTag({ label = 'ACTIVE' }) {
  return (
    <div className="absolute -right-1 -top-1 flex items-start" aria-hidden="true">
      <svg width="16" height="34" viewBox="0 0 16 34" className="flex-shrink-0 mt-1">
        <path d="M 8 2 Q 15 8 8 15" fill="none" stroke="#8A6A18" strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="8" cy="2" r="2.1" fill="none" stroke="#8A6A18" strokeWidth="1.3" />
      </svg>
      <div
        className="relative -ml-1 mt-4 rotate-[7deg] rounded-[2px] px-2.5 py-1 text-[9px] font-semibold tracking-[0.14em] text-[#3D2F08]"
        style={{ background: 'linear-gradient(155deg, #F0D488, #D9AF3F 55%, #BE9330)', boxShadow: '0 3px 6px -2px rgba(138,106,24,0.5), 0 1px 0 rgba(255,255,255,0.4) inset' }}
      >
        {label}
      </div>
    </div>
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

function StageTracker({ stage }) {
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

function ProgressRing({ stageIndex, total }) {
  const size = 56, stroke = 5, r = (size - stroke) / 2, circumference = 2 * Math.PI * r;
  const progress = stageIndex / (total - 1);
  const offset = circumference * (1 - progress);
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E2DECC" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#ringGradient)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.22,1,0.36,1)' }} />
        <defs>
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C0392B" /><stop offset="100%" stopColor="#E4C25E" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[13px] font-semibold text-[#262420] leading-none" style={{ fontFamily: "'Fraunces', serif" }}>{stageIndex + 1}</span>
        <span className="text-[7px] uppercase tracking-[0.1em] text-[#8A846F] leading-none mt-0.5">of {total}</span>
      </div>
    </div>
  );
}

function LedgerTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[3px] px-3 py-2" style={{ background: TOKENS.paper, border: `1px solid ${TOKENS.line}`, boxShadow: '0 10px 24px -10px rgba(38,36,32,0.35)' }}>
      <div className="text-[9px] uppercase tracking-[0.16em]" style={{ color: TOKENS.muted, fontFamily: "'JetBrains Mono', monospace" }}>{label}</div>
      <div className="mt-0.5 text-[13px] font-semibold" style={{ color: TOKENS.ink, fontFamily: "'Fraunces', serif" }}>{payload[0].value} day{payload[0].value === 1 ? '' : 's'}</div>
    </div>
  );
}

/* time-in-stage bar chart — how many days the card spent at each
   completed stage so far, so a tailor can spot where a job is
   dragging before it becomes a missed deadline */
function StageDurationChart({ card }) {
  const stageIndex = Math.max(0, STAGES.indexOf(card.stage));
  const data = card.days.map((d, i) => ({ stage: STAGES[i], days: d }));
  return (
    <div className="h-[120px] mt-1">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 4, left: 4, bottom: 0 }} barCategoryGap="30%">
          <XAxis dataKey="stage" tick={{ fontSize: 9.5, fill: TOKENS.muted, fontFamily: 'JetBrains Mono, monospace' }} axisLine={{ stroke: TOKENS.line }} tickLine={false} interval={0} tickFormatter={(v) => v.split(' ')[0]} />
          <Tooltip content={<LedgerTooltip />} cursor={{ fill: TOKENS.paperDim }} />
          <Bar dataKey="days" radius={[3, 3, 0, 0]} maxBarSize={30}>
            {data.map((d, i) => <Cell key={d.stage} fill={i === stageIndex ? TOKENS.pin : TOKENS.brass} fillOpacity={i === stageIndex ? 1 : 0.75} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const TILT = ['-0.6deg', '0.5deg', '-0.3deg'];

export function TailorJobCardsView() {
  const [cards, setCards] = useState(CARDS);
  const [selected, setSelected] = useState(null);
  const [selectedStage, setSelectedStage] = useState('');
  const [saved, setSaved] = useState(false);

  function openCard(card) {
    setSelected(card);
    setSelectedStage(card.stage);
    setSaved(false);
  }

  function updateStage() {
    if (!selected || !selectedStage || selectedStage === selected.stage) return;
    const updated = { ...selected, stage: selectedStage };
    setCards((current) => current.map((card) => (card.id === updated.id ? updated : card)));
    setSelected(updated);
    setSaved(true);
  }

  return (
    <div className="space-y-7">
      <GrainDefs />
      <style>{`
        @keyframes riseIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .dash-in { opacity: 0; animation: riseIn 0.55s cubic-bezier(0.22,1,0.36,1) forwards; }
        @keyframes modalBackdropIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalCardIn { from { opacity: 0; transform: translateY(14px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes popCheck { 0% { opacity: 0; transform: scale(0.5); } 60% { opacity: 1; transform: scale(1.15); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 1px 0 rgba(255,255,255,0.08) inset, 0 10px 20px -10px rgba(33,31,28,0.6), 0 0 0 0 rgba(228,194,94,0.35); }
          50% { box-shadow: 0 1px 0 rgba(255,255,255,0.08) inset, 0 10px 24px -8px rgba(33,31,28,0.65), 0 0 0 5px rgba(228,194,94,0.06); }
        }
        .modal-backdrop-in { animation: modalBackdropIn 0.25s ease-out forwards; }
        .modal-card-in { animation: modalCardIn 0.38s cubic-bezier(0.22,1,0.36,1) forwards; }
        .pop-check { animation: popCheck 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .glow-pulse { animation: glowPulse 2.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .dash-in, .modal-backdrop-in, .modal-card-in, .pop-check, .glow-pulse { animation: none; }
        }
      `}</style>

      <header
        className="dash-in relative overflow-hidden border border-[#DCD8C7] bg-[#FBF9F2] p-6 sm:p-8 rounded-[3px]"
        style={{ boxShadow: '0 1px 2px rgba(38,36,32,0.05), 0 10px 28px -14px rgba(38,36,32,0.22)', backgroundImage: 'radial-gradient(#DCD8C7 0.6px, transparent 0.6px)', backgroundSize: '18px 18px' }}
      >
        <Grain opacity={0.35} />
        <div className="relative">
          <Label>Workbench queue</Label>
          <h1 className="mt-2 text-[32px] font-semibold text-[#262420]" style={{ fontFamily: "'Fraunces', serif" }}>Job Cards</h1>
          <p className="mt-2 text-sm text-[#6D6A60] max-w-lg">Open a pattern card to review the work, update its stage, and check its time-in-stage history.</p>
        </div>
      </header>

      <section className="grid gap-5 lg:grid-cols-3 pt-1">
        {cards.map((card, index) => (
          <button
            key={card.id}
            onClick={() => openCard(card)}
            className="dash-in group relative overflow-visible border border-dashed border-[#A9A494] bg-[#FBF9F2] rounded-[3px] p-6 text-left transition-all duration-200 hover:!rotate-0 hover:-translate-y-[3px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227]/50"
            style={{ animationDelay: `${index * 0.06}s`, transform: `rotate(${TILT[index % TILT.length]})`, boxShadow: '0 1px 2px rgba(38,36,32,0.06), 0 14px 26px -14px rgba(38,36,32,0.3)' }}
          >
            <div className="absolute inset-0 rounded-[3px] overflow-hidden pointer-events-none">
              <Grain opacity={0.45} />
            </div>
            <Notch className="-top-px -left-px" />
            <Notch className="-top-px -right-px rotate-90" />
            <SwingTag />

            <div className="relative">
              <Label>{card.id}</Label>
              <h2 className="mt-4 text-xl font-semibold text-[#262420]" style={{ fontFamily: "'Fraunces', serif" }}>{card.customer}</h2>
              <p className="mt-1 text-sm text-[#6D6A60]">{card.garment}</p>

              <div className="mt-5"><TapeDivider /></div>

              <div className="mt-4">
                <Label>Stage</Label>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <StageTracker stage={card.stage} />
                  <ChevronRight className="h-4 w-4 text-[#9C7D12] flex-shrink-0 transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="mt-2 text-sm font-medium text-[#262420]">{card.stage}</p>
              </div>

              <p className="mt-4 text-xs text-[#8A846F]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Due {card.due}</p>
            </div>
          </button>
        ))}
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            aria-label="Close"
            onClick={() => setSelected(null)}
            className="modal-backdrop-in absolute inset-0"
            style={{ background: 'radial-gradient(circle at 50% 40%, rgba(38,36,32,0.45), rgba(20,19,17,0.72))', backdropFilter: 'blur(4px)' }}
          />
          <section
            className="modal-card-in relative w-full max-w-lg border border-[#D8D3C0] rounded-[4px] overflow-hidden"
            style={{
              background: '#FBF9F2', backgroundImage: 'radial-gradient(#E4E0CF 0.6px, transparent 0.6px)', backgroundSize: '16px 16px',
              boxShadow: '0 1px 0 rgba(255,255,255,0.6) inset, 0 0 0 1px rgba(38,36,32,0.04), 0 12px 24px -8px rgba(33,31,28,0.28), 0 40px 80px -18px rgba(20,19,17,0.5)',
            }}
          >
            <Grain opacity={0.3} />
            <Notch className="-top-px -left-px" />
            <Notch className="-top-px -right-px rotate-90" />

            <svg width="100%" height="14" className="absolute -top-[13px] left-1/2 -translate-x-1/2" viewBox="0 0 60 14" aria-hidden="true">
              <path d="M 20 14 Q 30 -4 40 14" fill="none" stroke="#8A6A18" strokeWidth="1.4" strokeLinecap="round" />
            </svg>

            <div className="h-[3px] w-full relative" style={{ background: 'linear-gradient(90deg, #B4842A, #EBCB6E 45%, #F4DD8E 55%, #B4842A)', boxShadow: '0 1px 3px rgba(180,132,42,0.4)' }} />
            <div className="relative p-7 sm:p-8">
              <button onClick={() => setSelected(null)} aria-label="Close" className="absolute right-5 top-6 w-7 h-7 flex items-center justify-center rounded-full text-[#A39D8A] hover:text-[#262420] hover:bg-[#EFEBDC] hover:rotate-90 transition-all duration-200">
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-start justify-between gap-4 pr-8">
                <div className="min-w-0">
                  <Label>Pattern work card</Label>
                  <h2 className="mt-2 text-[34px] leading-none font-semibold text-[#262420]" style={{ fontFamily: "'Fraunces', serif" }}>{selected.id}</h2>
                  <p className="mt-2 text-[15px] text-[#6D6A60]">{selected.customer} · {selected.garment}</p>
                </div>
                <ProgressRing stageIndex={STAGES.indexOf(selectedStage)} total={STAGES.length} />
              </div>

              <div className="mt-5"><StageTracker stage={selectedStage} /></div>
              <div className="mt-6"><TapeDivider /></div>

              <div className="mt-5">
                <Label>Time in stage so far</Label>
                <StageDurationChart card={selected} />
              </div>

              <div className="mt-2 grid grid-cols-2 gap-3">
                <div className="rounded-[3px] p-3.5 transition-shadow focus-within:shadow-[0_0_0_2px_rgba(201,162,39,0.3)]" style={{ background: '#FEFDF9', border: '1px solid #E2DECC', boxShadow: '0 1px 2px rgba(38,36,32,0.04), 0 1px 0 rgba(255,255,255,0.8) inset' }}>
                  <Label>Current stage</Label>
                  <select value={selectedStage} onChange={(e) => { setSelectedStage(e.target.value); setSaved(false); }} className="mt-1.5 w-full bg-transparent text-[13.5px] font-medium text-[#262420] outline-none cursor-pointer">
                    {STAGES.map((stage) => <option key={stage}>{stage}</option>)}
                  </select>
                </div>
                <Info label="Due date" value={selected.due} />
                <Info label="Fabric" value="Piña Jusi — Ivory" />
                <Info label="Assigned to" value="Delfin Ortega" />
              </div>

              {saved && (
                <p className="pop-check mt-4 flex items-center gap-2 text-xs font-medium text-[#3F6633]">
                  <Check className="h-3.5 w-3.5" />Stage updated on this job card.
                </p>
              )}

              <div className="mt-7 flex items-center gap-3">
                <button
                  onClick={updateStage}
                  disabled={selectedStage === selected.stage}
                  className={`inline-flex items-center gap-2 px-4 py-3 rounded-[3px] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#F3F1E7] transition-all active:translate-y-px disabled:opacity-60 ${selectedStage !== selected.stage ? 'glow-pulse' : ''}`}
                  style={{ background: 'linear-gradient(180deg, #33312C, #211F1C)' }}
                >
                  <Check className="h-4 w-4" /> {selectedStage === selected.stage ? 'Stage current' : 'Update stage'}
                </button>
                <button onClick={() => setSelected(null)} className="px-4 py-3 rounded-[3px] border border-[#DCD8C7] bg-white text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6D6A60] hover:border-[#A39D8A] hover:bg-[#F4F1E6] transition-colors">
                  Close
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
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
      <p className="mt-1.5 text-[13.5px] font-medium text-[#262420]">{value}</p>
    </div>
  );
}

export default TailorJobCardsView;
