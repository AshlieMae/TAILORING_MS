// @ts-nocheck
import { Ruler, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip, Legend,
} from 'recharts';

/* ===================================================================
   PRESS & TAILOR — Measurements
   Premium pass: opening a client profile reveals a radar chart
   plotting their measurements against the house's standard block,
   so a tailor can see at a glance where a pattern needs the most
   adjustment — rather than scanning four numbers independently.
=================================================================== */

const TOKENS = {
  ink: '#262420', inkSoft: '#55503F', paper: '#FBF9F2', paperDim: '#F4F1E6',
  line: '#DCD8C7', lineSoft: '#E8E4D5', muted: '#8A846F', muted2: '#A39D8A',
  brass: '#C9A227', brassLight: '#E4C25E', pin: '#C0392B', green: '#3F6633',
};

const FIELDS = ['Chest', 'Waist', 'Shoulder', 'Sleeve'];
const STANDARD = { Chest: 38, Waist: 32, Shoulder: 17, Sleeve: 24 };

const PROFILES = [
  { name: 'Reyna Fuentes', id: 'CUS-001', garment: 'Barong Tagalog', values: [36, 29, 15, 23] },
  { name: 'Boyet Salcedo', id: 'CUS-002', garment: 'Two-piece Suit', values: [41, 35, 18, 25] },
  { name: 'Consuelo Reyes', id: 'CUS-003', garment: "Women's Coat", values: [39, 33, 16, 22] },
];

function MonoLabel({ children, className = '' }) {
  return (
    <span className={`text-[10px] uppercase tracking-[0.2em] ${className}`} style={{ color: TOKENS.muted, fontFamily: "'JetBrains Mono', monospace" }}>
      {children}
    </span>
  );
}

function RadarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[3px] px-3.5 py-2.5" style={{ background: TOKENS.paper, border: `1px solid ${TOKENS.line}`, boxShadow: '0 10px 24px -10px rgba(38,36,32,0.35)' }}>
      <div className="text-[9px] uppercase tracking-[0.16em] mb-1" style={{ color: TOKENS.muted, fontFamily: "'JetBrains Mono', monospace" }}>{payload[0]?.payload?.field}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: p.stroke }} />
          <span className="text-[13px] font-semibold" style={{ color: TOKENS.ink, fontFamily: "'Fraunces', serif" }}>{p.value} in</span>
          <span className="text-[11px]" style={{ color: TOKENS.muted }}>{p.name}</span>
        </div>
      ))}
    </div>
  );
}

/* radar chart plotting a client's measurements against the house
   standard block, in the same brass/pin palette as the rest of the
   workbench */
function MeasurementRadar({ profile }) {
  const data = FIELDS.map((field, i) => ({ field, Client: profile.values[i], Standard: STANDARD[field] }));
  return (
    <div className="h-[240px] -ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke={TOKENS.line} strokeDasharray="2 5" />
          <PolarAngleAxis dataKey="field" tick={{ fontSize: 11, fill: TOKENS.inkSoft, fontFamily: 'JetBrains Mono, monospace' }} />
          <PolarRadiusAxis tick={{ fontSize: 9, fill: TOKENS.muted2 }} axisLine={false} tickCount={4} />
          <Radar name="Standard block" dataKey="Standard" stroke={TOKENS.muted2} strokeDasharray="4 3" fill={TOKENS.muted2} fillOpacity={0.06} />
          <Radar name={profile.name} dataKey="Client" stroke={TOKENS.pin} fill={TOKENS.pin} fillOpacity={0.16} strokeWidth={2} />
          <Tooltip content={<RadarTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: TOKENS.inkSoft, fontFamily: "'JetBrains Mono', monospace" }}
            formatter={(value) => <span style={{ color: TOKENS.inkSoft }}>{value}</span>}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TailorMeasurementsView() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const profiles = useMemo(
    () => PROFILES.filter((p) => `${p.name} ${p.garment}`.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  return (
    <div className="space-y-7">
      <style>{`
        @keyframes riseIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes modalIn { from { opacity: 0; transform: translateY(14px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .dash-in { opacity: 0; animation: riseIn 0.55s cubic-bezier(0.22,1,0.36,1) forwards; }
        .modal-in { animation: modalIn 0.35s cubic-bezier(0.22,1,0.36,1) forwards; }
        @media (prefers-reduced-motion: reduce) { .dash-in, .modal-in { opacity: 1; animation: none; } }
      `}</style>

      <header
        className="dash-in relative overflow-hidden border border-[#DCD8C7] bg-[#E4E9DB] p-6 sm:p-8 rounded-[3px]"
        style={{ boxShadow: '0 1px 2px rgba(38,36,32,0.05), 0 10px 28px -14px rgba(38,36,32,0.22)' }}
      >
        <div className="absolute right-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-[#C9A227]/50 to-transparent" />
        <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#53654D]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Cutting reference</span>
        <h1 className="mt-2 text-[32px] font-semibold text-[#262420]" style={{ fontFamily: "'Fraunces', serif" }}>Measurements</h1>
        <p className="mt-2 text-sm text-[#576052] max-w-lg">Open a profile to compare it against the house's standard block before cutting.</p>
      </header>

      <section className="border border-[#DCD8C7] bg-[#FBF9F2] rounded-[3px] overflow-hidden" style={{ boxShadow: '0 1px 2px rgba(38,36,32,0.05), 0 10px 28px -14px rgba(38,36,32,0.22)' }}>
        <div className="border-b border-[#DCD8C7] p-5">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A846F]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find client or garment"
              className="w-full border border-[#DCD8C7] bg-white rounded-[2px] py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#9C7D12] transition-colors"
            />
          </div>
        </div>

        <div className="grid gap-px bg-[#DCD8C7] md:grid-cols-3">
          {profiles.map((profile, i) => (
            <button
              key={profile.id}
              onClick={() => setSelected(profile)}
              className="dash-in text-left bg-[#FBF9F2] p-6 hover:bg-[#F4F1E6]/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227]/50"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className="w-11 h-11 rounded-full border border-[#C9A227]/25 flex items-center justify-center flex-shrink-0 text-[13px] font-semibold text-[#9C7D12]"
                  style={{ background: 'linear-gradient(135deg, rgba(228,194,94,0.2), rgba(201,162,39,0.06))', fontFamily: "'Fraunces', serif" }}
                >
                  {profile.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-lg font-semibold text-[#262420] leading-tight" style={{ fontFamily: "'Fraunces', serif" }}>{profile.name}</h2>
                    <Ruler className="h-4 w-4 text-[#9C7D12] flex-shrink-0 mt-1" strokeWidth={1.6} />
                  </div>
                  <span className="text-[10px] font-medium tracking-[0.1em] text-[#8A846F]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{profile.id}</span>
                  <p className="text-sm text-[#6D6A60] mt-0.5">{profile.garment}</p>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-2">
                {FIELDS.map((field, index) => (
                  <div key={field} className="border border-dashed border-[#B4AF9E] bg-white rounded-[2px] p-3">
                    <span className="text-[9px] uppercase tracking-[0.15em] text-[#8A846F]">{field}</span>
                    <p className="mt-1 text-sm font-semibold text-[#262420]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{profile.values[index]} in</p>
                  </div>
                ))}
              </div>
            </button>
          ))}
          {!profiles.length && (
            <div className="col-span-full py-14 text-center text-sm text-[#6D6A60]">No client profile matches "{query}".</div>
          )}
        </div>
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button aria-label="Close" onClick={() => setSelected(null)} className="absolute inset-0 bg-[#211F1C]/55 backdrop-blur-[3px]" />
          <section
            className="modal-in relative w-full max-w-xl bg-[var(--paper,#FBF9F2)] border border-[#DCD8C7] rounded-[4px] overflow-hidden"
            style={{ boxShadow: '0 12px 24px -8px rgba(33,31,28,0.28), 0 40px 80px -18px rgba(20,19,17,0.5)' }}
          >
            <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg, #B4842A, #E4C25E 50%, #B4842A)' }} />
            <div className="p-7 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <MonoLabel>{selected.id}</MonoLabel>
                  <h2 className="mt-2 text-2xl font-semibold text-[#262420]" style={{ fontFamily: "'Fraunces', serif" }}>{selected.name}</h2>
                  <p className="mt-1 text-sm text-[#6D6A60]">{selected.garment}</p>
                </div>
                <button onClick={() => setSelected(null)} aria-label="Close" className="w-7 h-7 flex items-center justify-center rounded-full text-[#A39D8A] hover:text-[#262420] hover:bg-[#EFEBDC] transition-colors flex-shrink-0">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <MeasurementRadar profile={selected} />

              <div className="mt-2 grid grid-cols-4 gap-2 border-t border-[#E8E4D5] pt-4">
                {FIELDS.map((field, i) => {
                  const diff = selected.values[i] - STANDARD[field];
                  return (
                    <div key={field} className="text-center">
                      <MonoLabel>{field}</MonoLabel>
                      <p className="mt-1 text-sm font-semibold text-[#262420]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{selected.values[i]} in</p>
                      <p className="text-[10.5px]" style={{ color: diff === 0 ? TOKENS.muted : diff > 0 ? TOKENS.pin : TOKENS.green }}>
                        {diff === 0 ? 'on block' : `${diff > 0 ? '+' : ''}${diff} in`}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default TailorMeasurementsView;
