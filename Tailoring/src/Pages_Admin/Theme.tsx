import type { ReactNode } from 'react';

/* ---------------------------------------------------------------
   ADMIN DESIGN SYSTEM — "Ledger & Brass"
   A premium, professional dashboard language shared by every admin
   view: deep navy for structure and authority, a restrained brass
   accent for the one thing that should draw the eye per screen,
   and quiet neutral surfaces so real data — tables, figures, charts
   — stays the star. Inter for UI text, IBM Plex Mono for anything
   numeric (IDs, money, dates) so figures read like a real ledger.
------------------------------------------------------------------ */

export const COLORS = {
  navy: '#152944',
  navyHover: '#1E3A5F',
  navySoft: '#EEF2F7',
  navySoftBorder: '#D7E0EC',
  brass: '#A9762F',
  brassDeep: '#8A5F22',
  brassSoft: '#F6EEE0',
  brassSoftBorder: '#E9D6B3',
  ink: '#111827',
  inkSoft: '#374151',
  muted: '#6B7280',
  faint: '#9CA3AF',
  canvas: '#F6F7F9',
  surface: '#FFFFFF',
  surfaceAlt: '#FAFBFC',
  border: '#E5E7EB',
  borderStrong: '#D8DCE3',
  success: '#0F7A54',
  successBg: '#EAF7F1',
  successBorder: '#BFE8D4',
  warning: '#B45309',
  warningBg: '#FEF6E7',
  warningBorder: '#FCE3B0',
  danger: '#B3261E',
  dangerBg: '#FCEEEE',
  dangerBorder: '#F2C6C3',
  info: '#2C4A78',
  infoBg: '#EAF0F8',
  infoBorder: '#C9D9EC',
} as const;

export const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
:root { font-feature-settings: 'tnum' 1, 'cv11' 1; }
@keyframes riseIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes growBar { from { transform: scaleY(0); } to { transform: scaleY(1); } }
@keyframes drawLine { from { stroke-dashoffset: 600; } to { stroke-dashoffset: 0; } }
@keyframes fadeScale { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
.rise-in { opacity: 0; animation: riseIn 0.5s cubic-bezier(0.22,1,0.36,1) forwards; }
.card-hover { transition: box-shadow 0.18s ease, border-color 0.18s ease, transform 0.18s ease; }
.card-hover:hover { box-shadow: 0 8px 24px -8px rgba(16,24,40,0.12); border-color: ${COLORS.borderStrong}; }
.mono { font-family: 'IBM Plex Mono', monospace; font-feature-settings: 'tnum' 1; }
`;

export const shadowSm = '0 1px 2px rgba(16,24,40,0.05)';
export const shadowCard = '0 1px 3px rgba(16,24,40,0.06), 0 1px 2px rgba(16,24,40,0.04)';
export const shadowModal = '0 24px 60px -16px rgba(16,24,40,0.35)';

export function EyebrowLabel({ children, color = COLORS.muted }: { children: ReactNode; color?: string }) {
  return (
    <span className="mono text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color }}>
      {children}
    </span>
  );
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="rise-in flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <EyebrowLabel color={COLORS.brassDeep}>{eyebrow}</EyebrowLabel>
        <h1 className="mt-1.5 text-[26px] sm:text-[30px] font-semibold tracking-[-0.02em]" style={{ color: COLORS.ink }}>{title}</h1>
        {description && <p className="mt-2 max-w-xl text-sm leading-relaxed" style={{ color: COLORS.muted }}>{description}</p>}
      </div>
      {action}
    </div>
  );
}

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brass';
const TONE_MAP: Record<Tone, { bg: string; border: string; text: string }> = {
  success: { bg: COLORS.successBg, border: COLORS.successBorder, text: COLORS.success },
  warning: { bg: COLORS.warningBg, border: COLORS.warningBorder, text: COLORS.warning },
  danger: { bg: COLORS.dangerBg, border: COLORS.dangerBorder, text: COLORS.danger },
  info: { bg: COLORS.infoBg, border: COLORS.infoBorder, text: COLORS.info },
  neutral: { bg: COLORS.surfaceAlt, border: COLORS.border, text: COLORS.inkSoft },
  brass: { bg: COLORS.brassSoft, border: COLORS.brassSoftBorder, text: COLORS.brassDeep },
};

export function Badge({ tone = 'neutral', children, dot = true }: { tone?: Tone; children: ReactNode; dot?: boolean }) {
  const t = TONE_MAP[tone];
  return (
    <span
      className="inline-flex items-center gap-1.5 border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]"
      style={{ background: t.bg, borderColor: t.border, color: t.text, borderRadius: 6 }}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: t.text }} />}
      {children}
    </span>
  );
}

export function IconTile({ icon, tone = 'neutral' }: { icon: ReactNode; tone?: Tone }) {
  const t = TONE_MAP[tone];
  return (
    <div
      className="flex h-10 w-10 items-center justify-center [&>svg]:h-[18px] [&>svg]:w-[18px]"
      style={{ background: tone === 'neutral' ? COLORS.navySoft : t.bg, color: tone === 'neutral' ? COLORS.navy : t.text, borderRadius: 8 }}
    >
      {icon}
    </div>
  );
}

/* Small inline sparkline — gives metric cards a "real analytics
   product" feel without pulling in a charting library. */
export function Sparkline({ data, color = COLORS.brass, width = 88, height = 28 }: { data: number[]; color?: string; width?: number; height?: number }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const points = data.map((v, i) => `${i * step},${height - ((v - min) / range) * height}`).join(' ');
  const areaPoints = `0,${height} ${points} ${width},${height}`;
  const gradId = `spark-${color.replace('#', '')}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradId})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={width} cy={height - ((data[data.length - 1] - min) / range) * height} r="2.5" fill={color} />
    </svg>
  );
}

export function StatCard({
  icon, label, value, trend, trendTone = 'success', sparkline, tone = 'neutral', delay = 0,
}: {
  icon: ReactNode; label: string; value: string | number; trend?: string; trendTone?: 'success' | 'danger'; sparkline?: number[]; tone?: Tone; delay?: number;
}) {
  return (
    <div className="rise-in card-hover border p-5" style={{ animationDelay: `${delay}s`, borderColor: COLORS.border, background: COLORS.surface, borderRadius: 10, boxShadow: shadowCard }}>
      <div className="flex items-start justify-between">
        <IconTile icon={icon} tone={tone} />
        {sparkline && <Sparkline data={sparkline} color={trendTone === 'danger' ? COLORS.danger : COLORS.brass} />}
      </div>
      <div className="mt-4 text-[26px] font-semibold tracking-[-0.01em]" style={{ color: COLORS.ink }}>{value}</div>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.1em]" style={{ color: COLORS.muted }}>{label}</span>
      </div>
      {trend && <div className="mt-1.5 text-xs font-medium" style={{ color: trendTone === 'danger' ? COLORS.danger : COLORS.success }}>{trend}</div>}
    </div>
  );
}

export function SearchField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative max-w-md flex-1">
      <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: COLORS.faint }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition-colors"
        style={{ borderColor: COLORS.border, borderRadius: 8, color: COLORS.ink }}
        onFocus={(e) => { e.currentTarget.style.borderColor = COLORS.navy; e.currentTarget.style.boxShadow = `0 0 0 3px ${COLORS.navySoft}`; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.boxShadow = 'none'; }}
      />
    </div>
  );
}

export function FilterPill({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] transition-colors"
      style={active ? { borderColor: COLORS.navy, background: COLORS.navy, color: '#fff', borderRadius: 7 } : { borderColor: COLORS.border, color: COLORS.muted, borderRadius: 7, background: COLORS.surface }}
    >
      {children}
    </button>
  );
}

export function PrimaryButton({ icon, children, onClick, type = 'button' }: { icon?: ReactNode; children: ReactNode; onClick?: () => void; type?: 'button' | 'submit' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-[12px] font-semibold text-white transition-colors [&>svg]:h-4 [&>svg]:w-4"
      style={{ background: COLORS.navy, borderRadius: 8, boxShadow: shadowSm }}
      onMouseEnter={(e) => { e.currentTarget.style.background = COLORS.navyHover; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = COLORS.navy; }}
    >
      {icon}{children}
    </button>
  );
}

export function SecondaryButton({ icon, children, onClick, type = 'button' }: { icon?: ReactNode; children: ReactNode; onClick?: () => void; type?: 'button' | 'submit' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 border px-4 py-2.5 text-[12px] font-semibold transition-colors [&>svg]:h-4 [&>svg]:w-4"
      style={{ borderColor: COLORS.border, color: COLORS.inkSoft, borderRadius: 8, background: COLORS.surface }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = COLORS.borderStrong; e.currentTarget.style.background = COLORS.surfaceAlt; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.background = COLORS.surface; }}
    >
      {icon}{children}
    </button>
  );
}

export function Card({ children, delay = 0, className = '', style = {} }: { children: ReactNode; delay?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <section
      className={`rise-in border ${className}`}
      style={{ animationDelay: `${delay}s`, borderColor: COLORS.border, background: COLORS.surface, borderRadius: 10, boxShadow: shadowCard, ...style }}
    >
      {children}
    </section>
  );
}

export function TableHeadRow({ columns, gridCols }: { columns: string[]; gridCols: string }) {
  return (
    <div className={`hidden ${gridCols} gap-4 border-b px-6 py-3 md:grid`} style={{ borderColor: COLORS.border, background: COLORS.surfaceAlt }}>
      {columns.map((label) => (
        <span key={label} className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: COLORS.faint }}>{label}</span>
      ))}
    </div>
  );
}

export function ModalShell({ onClose, children, maxWidth = 'max-w-2xl' }: { onClose: () => void; children: ReactNode; maxWidth?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0" style={{ background: 'rgba(17,24,39,0.55)', backdropFilter: 'blur(2px)' }} />
      <div className={`relative max-h-[92vh] w-full ${maxWidth} overflow-y-auto border`} style={{ animation: 'fadeScale 0.22s ease both', borderColor: COLORS.border, background: COLORS.surface, borderRadius: 12, boxShadow: shadowModal }}>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <div className="p-14 text-center text-sm" style={{ color: COLORS.muted }}>{message}</div>;
}

/* Bar chart with soft gradient columns + gridlines, for real revenue /
   volume charts (used on Reports and Dashboard). */
export function BarChartPanel({ data, height = 200 }: { data: { label: string; value: number }[]; height?: number }) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div className="relative" style={{ height }}>
      <div className="absolute inset-0 flex flex-col justify-between">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-px w-full" style={{ background: COLORS.border }} />)}
      </div>
      <div className="relative flex h-full items-end gap-3 sm:gap-4">
        {data.map((d, i) => (
          <div key={d.label} className="flex h-full flex-1 flex-col justify-end gap-2">
            <div className="relative flex-1">
              <div
                className="absolute inset-x-0 bottom-0 origin-bottom"
                style={{
                  height: `${(d.value / max) * 100}%`,
                  background: `linear-gradient(180deg, ${COLORS.navyHover} 0%, ${COLORS.navy} 100%)`,
                  borderRadius: '4px 4px 0 0',
                  animation: `growBar 0.6s ${0.15 + i * 0.04}s cubic-bezier(0.22,1,0.36,1) both`,
                }}
              />
            </div>
            <div className="mono text-center text-[10px]" style={{ color: COLORS.muted }}>{d.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Smooth SVG line/area chart with gradient fill — a genuine drawn
   curve (not CSS bars), for trend-over-time panels. */
export function AreaLineChart({ data, height = 200, color = COLORS.brass }: { data: { label: string; value: number }[]; height?: number; color?: string }) {
  const width = 560;
  const pad = 24;
  const max = Math.max(...data.map((d) => d.value));
  const min = Math.min(...data.map((d) => d.value));
  const range = max - min || 1;
  const step = (width - pad * 2) / (data.length - 1);
  const pts = data.map((d, i) => [pad + i * step, pad + (height - pad * 2) * (1 - (d.value - min) / range)] as const);
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
  const area = `${line} L ${pts[pts.length - 1][0]} ${height - pad} L ${pts[0][0]} ${height - pad} Z`;
  const gradId = `area-${color.replace('#', '')}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3].map((i) => (
        <line key={i} x1={pad} x2={width - pad} y1={pad + (i * (height - pad * 2)) / 3} y2={pad + (i * (height - pad * 2)) / 3} stroke={COLORS.border} strokeWidth="1" />
      ))}
      <path d={area} fill={`url(#${gradId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="600" style={{ animation: 'drawLine 1.1s ease-out both' }} />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill={COLORS.surface} stroke={color} strokeWidth="2" />
      ))}
      {data.map((d, i) => (
        <text key={d.label} x={pts[i][0]} y={height - 4} textAnchor="middle" fontSize="10" fontFamily="'IBM Plex Mono', monospace" fill={COLORS.muted}>{d.label}</text>
      ))}
    </svg>
  );
}

/* Donut chart for share-of-total breakdowns. */
export function DonutChart({ segments, size = 140, strokeWidth = 18 }: { segments: { value: number; color: string }[]; size?: number; strokeWidth?: number }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={COLORS.border} strokeWidth={strokeWidth} />
        {segments.map((seg, i) => {
          const dash = (seg.value / total) * circumference;
          const circle = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += dash;
          return circle;
        })}
      </g>
    </svg>
  );
}