import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, ChevronRight, Shirt, UserRound } from 'lucide-react';
import {
  COLORS, FONT_IMPORT, PageHeader, StatCard, SearchField, Card, TableHeadRow, EmptyState,
  ModalShell, EyebrowLabel, Badge,
} from './Theme';

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

const STAGE_TONE: Record<Stage, 'neutral' | 'info' | 'warning' | 'danger' | 'success'> = {
  Measuring: 'neutral', 'Pattern Cutting': 'info', 'Initial Assembly': 'warning', 'First Fitting': 'warning',
  'Final Alterations': 'danger', Completed: 'success', 'Ready for Pickup': 'neutral',
};

export function AdminProductionView() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Job | null>(null);
  const jobs = useMemo(() => JOBS.filter((job) => `${job.id} ${job.customer} ${job.garment} ${job.tailor}`.toLowerCase().includes(query.toLowerCase())), [query]);

  return (
    <div className="space-y-7" style={{ color: COLORS.ink }}>
      <style>{FONT_IMPORT}</style>

      <PageHeader eyebrow="Workshop floor" title="Production Bench" description="Follow every ticket from first measurement to the pickup rack." />

      <Card delay={0.05} className="p-6 sm:p-8" style={{ borderRadius: 10 }}>
        <EyebrowLabel color={COLORS.brassDeep}>Cutting line — the pipeline, station by station</EyebrowLabel>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {STAGES.map((stage) => {
            const count = JOBS.filter((job) => job.stage === stage).length;
            return (
              <button
                key={stage}
                onClick={() => setSelected(JOBS.find((job) => job.stage === stage) || null)}
                className="border bg-white p-4 text-left transition-colors"
                style={{ borderColor: COLORS.border, borderRadius: 8 }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = COLORS.navy; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = COLORS.border; }}
              >
                <div className="text-2xl font-semibold" style={{ color: COLORS.ink }}>{count}</div>
                <div className="mt-2 text-[10px] font-medium uppercase leading-relaxed tracking-[0.06em]" style={{ color: COLORS.muted }}>{stage}</div>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard delay={0.1} icon={<Shirt />} label="Jobs in progress" value={5} tone="neutral" />
        <StatCard delay={0.14} icon={<CalendarDays />} label="Due within 3 days" value={3} tone="warning" />
        <StatCard delay={0.18} icon={<AlertTriangle />} label="Past due" value={1} tone="danger" />
      </div>

      <Card delay={0.22}>
        <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: COLORS.border }}>
          <div>
            <EyebrowLabel>Job cards</EyebrowLabel>
            <h2 className="mt-1 text-[15px] font-semibold" style={{ color: COLORS.ink }}>Production board</h2>
          </div>
          <div className="w-full sm:w-80"><SearchField value={query} onChange={setQuery} placeholder="Search ticket or customer" /></div>
        </div>

        <TableHeadRow gridCols="grid-cols-[0.8fr_1.2fr_1.2fr_1.15fr_1fr_0.7fr_24px]" columns={['Ticket #', 'Customer', 'Garment', 'Stage', 'Assigned tailor', 'Due', '']} />

        {jobs.map((job) => (
          <button
            key={job.id}
            onClick={() => setSelected(job)}
            className="grid w-full grid-cols-1 items-center gap-2 border-b px-6 py-4 text-left transition-colors md:grid-cols-[0.8fr_1.2fr_1.2fr_1.15fr_1fr_0.7fr_24px] md:gap-4"
            style={{ borderColor: COLORS.border }}
            onMouseEnter={(e) => { e.currentTarget.style.background = COLORS.surfaceAlt; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span className="mono text-[12px]" style={{ color: COLORS.navy }}>{job.id}</span>
            <span className="font-medium" style={{ color: COLORS.ink }}>{job.customer}</span>
            <span className="text-sm" style={{ color: COLORS.inkSoft }}>{job.garment}</span>
            <span><Badge tone={STAGE_TONE[job.stage]}>{job.stage}</Badge></span>
            <span className="text-sm" style={{ color: COLORS.inkSoft }}>{job.tailor}</span>
            <span className="mono text-sm" style={{ fontWeight: job.priority === 'Overdue' ? 600 : 400, color: job.priority === 'Overdue' ? COLORS.danger : job.priority === 'Due soon' ? COLORS.warning : COLORS.inkSoft }}>{job.due}</span>
            <ChevronRight className="hidden h-4 w-4 md:block" style={{ color: COLORS.faint }} />
          </button>
        ))}
        {!jobs.length && <EmptyState message="No job matches your search." />}
      </Card>

      {selected && <JobDetails job={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function JobDetails({ job, onClose }: { job: Job; onClose: () => void }) {
  const active = STAGES.indexOf(job.stage);
  const progressPct = (active / (STAGES.length - 1)) * 100;

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-3xl">
      <header className="flex items-start justify-between border-b px-7 py-6 sm:px-8" style={{ borderColor: COLORS.border }}>
        <div>
          <EyebrowLabel>Production job card</EyebrowLabel>
          <h2 className="mt-1.5 text-2xl font-semibold" style={{ color: COLORS.ink }}>{job.id}</h2>
          <p className="mt-1 text-sm" style={{ color: COLORS.muted }}>{job.customer} · {job.garment}</p>
        </div>
        <button onClick={onClose} className="p-2" style={{ color: COLORS.muted, borderRadius: 8 }}><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
      </header>

      <div className="space-y-9 p-7 sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          {[['Assigned tailor', job.tailor], ['Fabric', job.fabric], ['Due date', job.due], ['Priority', job.priority]].map(([label, value]) => (
            <div key={label} className="border p-4" style={{ borderColor: COLORS.border, background: COLORS.surfaceAlt, borderRadius: 8 }}>
              <div className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: COLORS.muted }}>{label}</div>
              <div className="mt-1 text-sm" style={{ color: value === 'Overdue' ? COLORS.danger : COLORS.ink }}>{value}</div>
            </div>
          ))}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4" style={{ color: COLORS.brassDeep }} />
            <h3 className="text-[15px] font-semibold" style={{ color: COLORS.ink }}>Current progress</h3>
          </div>

          <div className="relative mt-9 px-1 pb-6">
            <div className="absolute -top-4 h-3 w-3 -translate-x-1/2 rotate-45" style={{ left: `${progressPct}%`, background: COLORS.brass }} />
            <div className="absolute left-0 right-0 top-3 h-[3px]" style={{ background: COLORS.border, borderRadius: 4 }} />
            <div className="absolute left-0 top-3 h-[3px] transition-all" style={{ width: `${progressPct}%`, background: COLORS.navy, borderRadius: 4 }} />
            <div className="relative flex justify-between">
              {STAGES.map((stage, index) => (
                <div key={stage} className="flex flex-col items-center text-center" style={{ width: `${100 / STAGES.length}%` }}>
                  <div className="h-3 w-[2px]" style={{ background: index <= active ? COLORS.navy : COLORS.border }} />
                  <span className="mt-2 text-[10px]" style={{ color: index <= active ? COLORS.ink : COLORS.faint }}>{stage}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

export default AdminProductionView;
