import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, ChevronRight, Search, Shirt, UserRound, X } from 'lucide-react';

type Stage = 'Measuring' | 'Pattern Cutting' | 'Initial Assembly' | 'First Fitting' | 'Final Alterations' | 'Completed' | 'Ready for Pickup';
type Job = { id: string; customer: string; garment: string; tailor: string; stage: Stage; due: string; priority: 'Normal' | 'Due soon' | 'Overdue'; fabric: string; };

const STAGES: Stage[] = ['Measuring', 'Pattern Cutting', 'Initial Assembly', 'First Fitting', 'Final Alterations', 'Completed', 'Ready for Pickup'];
const JOBS: Job[] = [
  { id: 'JC-3023', customer: 'Leah Montes', garment: 'Filipiniana Blouse', tailor: 'Delfin Ortega', stage: 'Measuring', due: 'Aug 14', priority: 'Normal', fabric: 'Piña Jusi — Cream' },
  { id: 'JC-3020', customer: 'Boyet Salcedo', garment: 'Two-piece Suit', tailor: 'Delfin Ortega', stage: 'Pattern Cutting', due: 'Aug 09', priority: 'Normal', fabric: 'Italian Wool — Charcoal' },
  { id: 'JC-3017', customer: 'Marisol Chan', garment: 'Evening Gown', tailor: 'Alicia Ramos', stage: 'Initial Assembly', due: 'Aug 12', priority: 'Normal', fabric: 'Silk Habotai — Wine' },
  { id: 'JC-3021', customer: 'Reyna Fuentes', garment: 'Barong Tagalog', tailor: 'Delfin Ortega', stage: 'First Fitting', due: 'Aug 05', priority: 'Due soon', fabric: 'Piña Jusi — Ivory' },
  { id: 'JC-3019', customer: 'Consuelo Reyes', garment: "Women's Coat", tailor: 'Alicia Ramos', stage: 'Final Alterations', due: 'Aug 03', priority: 'Overdue', fabric: 'Wool Blend — Camel' },
  { id: 'JC-3016', customer: 'Cesar de la Cruz', garment: 'Long-sleeve Polo', tailor: 'Delfin Ortega', stage: 'Completed', due: 'Jul 31', priority: 'Normal', fabric: 'Cotton Poplin — White' },
  { id: 'JC-3018', customer: 'Tomas Villareal', garment: 'School Uniform Set', tailor: 'Alicia Ramos', stage: 'Ready for Pickup', due: 'Aug 02', priority: 'Due soon', fabric: 'Polyester — Navy' },
];

// Thread colors — kept identical to the orders and customers views so a stage reads the same everywhere.
const stageTone: Record<Stage, string> = {
  Measuring: 'border-[#D8CBA9] bg-[#F3EDDC] text-[#7A6F58]',
  'Pattern Cutting': 'border-[#C2C9E0] bg-[#E7EAF2] text-[#3A4372]',
  'Initial Assembly': 'border-[#E3CFA0] bg-[#F5ECD8] text-[#8A6A1F]',
  'First Fitting': 'border-[#E8C3AE] bg-[#F7E6DE] text-[#9C4A2B]',
  'Final Alterations': 'border-[#E8BEB8] bg-[#F7E1DE] text-[#9B3A31]',
  Completed: 'border-[#BFD8BC] bg-[#E4EEE2] text-[#3F6B3F]',
  'Ready for Pickup': 'border-[#B7D9D3] bg-[#E1EEEC] text-[#2C6E68]',
};

const INK = '#2A2620';
const PAPER = '#FBF7EA';
const LINE = '#D8CBA9';
const MUTED = '#7A6F58';
const THREAD = '#B33F35';

const dotPaper: React.CSSProperties = {
  backgroundImage: 'radial-gradient(#D8CBA9 0.7px, transparent 0.7px)',
  backgroundSize: '14px 14px',
};

export function AdminProductionView() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Job | null>(null);
  const jobs = useMemo(() => JOBS.filter((job) => `${job.id} ${job.customer} ${job.garment} ${job.tailor}`.toLowerCase().includes(query.toLowerCase())), [query]);

  return (
    <div className="space-y-7 p-1" style={{ ...dotPaper, color: INK }}>
      <div className="dash-in border-b border-dashed pb-6" style={{ borderColor: LINE }}>
        <span className="text-[10px] uppercase tracking-[0.28em]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: MUTED }}>Workshop floor</span>
        <h1 className="mt-1 text-3xl sm:text-4xl italic" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: INK }}>Production Bench</h1>
        <p className="mt-2 text-sm" style={{ color: MUTED }}>Follow every ticket from first measurement to the pickup rack.</p>
      </div>

      <section className="dash-in relative border p-6 sm:p-8" style={{ animationDelay: '0.06s', borderColor: LINE, background: PAPER }}>
        <span className="absolute left-0 top-0 h-3 w-3 border-l-2 border-t-2" style={{ borderColor: THREAD }} />
        <span className="absolute right-0 top-0 h-3 w-3 border-r-2 border-t-2" style={{ borderColor: THREAD }} />
        <span className="absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2" style={{ borderColor: THREAD }} />
        <span className="absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2" style={{ borderColor: THREAD }} />
        <span className="text-[10px] uppercase tracking-[0.28em]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: MUTED }}>Cutting line — the pipeline, station by station</span>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {STAGES.map((stage, index) => {
            const count = JOBS.filter((job) => job.stage === stage).length;
            return (
              <button
                key={stage}
                onClick={() => setSelected(JOBS.find((job) => job.stage === stage) || null)}
                className="border bg-white p-4 text-left transition-colors hover:border-[#B33F35]"
                style={{ borderColor: LINE }}
              >
                <div className="text-[10px]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: MUTED }}>{String(index + 1).padStart(2, '0')}″</div>
                <div className="mt-3 text-3xl" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: INK }}>{count}</div>
                <div className="mt-2 text-[10px] uppercase leading-relaxed tracking-[0.1em]" style={{ color: MUTED }}>{stage}</div>
              </button>
            );
          })}
        </div>
      </section>

      <div className="dash-in grid gap-4 sm:grid-cols-3" style={{ animationDelay: '0.1s' }}>
        <Metric icon={<Shirt />} label="Jobs in progress" value={5} />
        <Metric icon={<CalendarDays />} label="Due within 3 days" value={3} />
        <Metric icon={<AlertTriangle />} label="Past due" value={1} tone="danger" />
      </div>

      <section className="dash-in border shadow-[0_1px_3px_rgba(42,38,32,0.08)]" style={{ animationDelay: '0.14s', borderColor: LINE, background: PAPER }}>
        <div className="flex flex-col gap-3 border-b border-dashed p-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: LINE }}>
          <div>
            <span className="text-[10px] uppercase tracking-[0.24em]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: MUTED }}>Job cards</span>
            <h2 className="mt-1 text-lg italic" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: INK }}>Production board</h2>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: MUTED }} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search ticket or customer"
              className="w-full border bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#B33F35]"
              style={{ borderColor: LINE, fontFamily: "'IBM Plex Mono', monospace" }}
            />
          </div>
        </div>

        <div className="hidden grid-cols-[0.8fr_1.2fr_1.2fr_1.15fr_1fr_0.7fr_24px] gap-4 border-b border-dashed px-6 py-3 md:grid" style={{ borderColor: LINE }}>
          {['Ticket #', 'Customer', 'Garment', 'Stage', 'Assigned tailor', 'Due', ''].map((label) => (
            <span key={label} className="text-[10px] uppercase tracking-[0.18em]" style={{ color: MUTED }}>{label}</span>
          ))}
        </div>

        {jobs.map((job) => (
          <button
            key={job.id}
            onClick={() => setSelected(job)}
            className="grid w-full grid-cols-1 items-center gap-2 border-b border-dashed px-6 py-4 text-left transition-colors hover:bg-[#F3EDDC] md:grid-cols-[0.8fr_1.2fr_1.2fr_1.15fr_1fr_0.7fr_24px] md:gap-4"
            style={{ borderColor: LINE }}
          >
            <span className="flex items-center gap-2 text-[12px]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#3A4372' }}>
              <span className="h-1.5 w-1.5 rounded-full border" style={{ borderColor: MUTED }} />
              {job.id}
            </span>
            <span className="font-medium" style={{ color: INK }}>{job.customer}</span>
            <span className="text-sm" style={{ color: '#3D4F55' }}>{job.garment}</span>
            <span><span className={`inline-block border px-2 py-1 text-[10px] uppercase tracking-[0.08em] ${stageTone[job.stage]}`}>{job.stage}</span></span>
            <span className="text-sm" style={{ color: '#3D4F55' }}>{job.tailor}</span>
            <span
              className="text-sm"
              style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: job.priority === 'Overdue' ? 600 : 400, color: job.priority === 'Overdue' ? THREAD : job.priority === 'Due soon' ? '#8A6A1F' : '#3D4F55' }}
            >
              {job.due}
            </span>
            <ChevronRight className="hidden h-4 w-4 md:block" style={{ color: THREAD }} />
          </button>
        ))}
      </section>

      {selected && <JobDetails job={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function Metric({ icon, label, value, tone = 'default' }: { icon: React.ReactNode; label: string; value: number; tone?: 'default' | 'danger' }) {
  return (
    <div className="border p-5" style={{ borderColor: LINE, background: PAPER }}>
      <div className="flex items-center justify-between">
        <div
          className="flex h-8 w-8 items-center justify-center border [&>svg]:h-4 [&>svg]:w-4"
          style={tone === 'danger' ? { borderColor: '#E8BEB8', background: '#F7E1DE', color: THREAD } : { borderColor: LINE, background: '#F3EDDC', color: '#3A4372' }}
        >
          {icon}
        </div>
        <span className="text-2xl" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: INK }}>{value}</span>
      </div>
      <div className="mt-4 text-[10px] uppercase tracking-[0.18em]" style={{ color: MUTED }}>{label}</div>
    </div>
  );
}

function JobDetails({ job, onClose }: { job: Job; onClose: () => void }) {
  const active = STAGES.indexOf(job.stage);
  const progressPct = (active / (STAGES.length - 1)) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button aria-label="Close job card" onClick={onClose} className="absolute inset-0 bg-[#2A2620]/55 backdrop-blur-sm" />
      <section className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto border shadow-2xl" style={{ borderColor: LINE, background: PAPER }}>

        <div className="absolute left-6 top-6 h-4 w-4 rounded-full border-2" style={{ borderColor: MUTED, background: '#F3EDDC' }} />

        <header className="flex items-start justify-between border-b border-dashed px-6 py-6 pl-14 sm:px-8 sm:pl-16" style={{ borderColor: LINE }}>
          <div>
            <span className="text-[10px] uppercase tracking-[0.28em]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: MUTED }}>Production job card</span>
            <h2 className="mt-1 text-3xl italic" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: INK }}>{job.id}</h2>
            <p className="mt-1 text-sm" style={{ color: MUTED }}>{job.customer} · {job.garment}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#F3EDDC]" style={{ color: MUTED }}>
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-9 p-6 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            {[['Assigned tailor', job.tailor], ['Fabric', job.fabric], ['Due date', job.due], ['Priority', job.priority]].map(([label, value]) => (
              <div key={label} className="border border-dashed bg-white p-4" style={{ borderColor: LINE }}>
                <div className="text-[10px] uppercase tracking-[0.16em]" style={{ color: MUTED }}>{label}</div>
                <div className="mt-1 text-sm" style={{ color: value === 'Overdue' ? THREAD : INK }}>{value}</div>
              </div>
            ))}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <UserRound className="h-4 w-4" style={{ color: THREAD }} />
              <h3 className="text-lg italic" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: INK }}>Current progress</h3>
            </div>

            {/* tape-measure timeline, matching the orders view — a pin marks where the garment stands now */}
            <div className="relative mt-9 px-1 pb-8">
              <div className="absolute -top-4 h-3 w-3 -translate-x-1/2 rotate-45 border" style={{ left: `${progressPct}%`, borderColor: THREAD, background: THREAD }} />
              <div className="absolute left-0 right-0 top-3 h-[2px]" style={{ background: LINE }} />
              <div className="absolute left-0 top-3 h-[2px] transition-all" style={{ width: `${progressPct}%`, background: THREAD }} />
              <div className="relative flex justify-between">
                {STAGES.map((stage, index) => (
                  <div key={stage} className="flex flex-col items-center text-center" style={{ width: `${100 / STAGES.length}%` }}>
                    <div className="h-3 w-[2px]" style={{ background: index <= active ? THREAD : LINE }} />
                    <span className="mt-2 text-[9px]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: MUTED }}>{String(index + 1).padStart(2, '0')}″</span>
                    <span className="mt-1 text-[10px] leading-tight" style={{ color: index <= active ? INK : MUTED }}>{stage}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AdminProductionView;