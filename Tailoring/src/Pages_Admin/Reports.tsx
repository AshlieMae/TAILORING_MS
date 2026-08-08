import { useState } from 'react';
import type { ReactNode } from 'react';
import { BarChart3, CalendarDays, Download, PackageCheck, PhilippinePeso, Shirt } from 'lucide-react';

/* ---------------------------------------------------------------
   ADMIN — Reports
   "The Pattern Chart"
   Where Payments reads like a torn receipt, Reports reads like the
   grading chart pinned above a cutting table: pale graph-paper
   backing, an amber grading-pencil accent, and progress rendered as
   ruler tick marks rather than soft bars.
------------------------------------------------------------------ */

const INK = '#2B2620';
const PAPER = '#FAF6EC';
const PAGE = '#F0E9D4';
const LINE = '#DCCFA8';
const MUTED = '#7C7057';
const AMBER = '#B5730F';
const AMBER_DEEP = '#8A5613';
const AMBER_SOFT = '#F3E4C4';
const RED = '#9B4D45';
const GREEN = '#3F7D5C';

const monthlyRevenue = [{ label: 'Mar', value: 118000 }, { label: 'Apr', value: 142000 }, { label: 'May', value: 126000 }, { label: 'Jun', value: 168000 }, { label: 'Jul', value: 194000 }, { label: 'Aug', value: 121500 }];
const garments = [{ name: 'Barong Tagalog', orders: 32, percent: 82 }, { name: 'Two-piece Suit', orders: 26, percent: 67 }, { name: 'Filipiniana Dress', orders: 21, percent: 54 }, { name: 'School Uniform Set', orders: 18, percent: 46 }];
const maxRevenue = Math.max(...monthlyRevenue.map((item) => item.value));

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,600;1,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
@keyframes chartIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes growCol { from { transform: scaleY(0); } to { transform: scaleY(1); } }
@keyframes drawCurve { from { stroke-dashoffset: 220; } to { stroke-dashoffset: 0; } }
.chart-in { opacity: 0; animation: chartIn 0.5s cubic-bezier(0.22,1,0.36,1) forwards; }
.grid-paper { background-image: linear-gradient(${LINE} 1px, transparent 1px), linear-gradient(90deg, ${LINE} 1px, transparent 1px); background-size: 22px 22px; }
`;

function MonoLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`text-[10px] tracking-[0.22em] uppercase ${className}`} style={{ fontFamily: "'IBM Plex Mono', monospace", color: MUTED }}>{children}</span>;
}

/* Signature element: a hand-drawn French-curve flourish, the tool a
   tailor uses to draft grading lines — sits under section headers
   in place of a plain rule. */
function CurveRule({ delay = 0 }: { delay?: number }) {
  return (
    <svg width="72" height="14" viewBox="0 0 72 14" className="mt-1.5" aria-hidden="true">
      <path
        d="M1 12 C 14 2, 26 2, 36 7 C 46 12, 58 12, 71 2"
        fill="none"
        stroke={AMBER}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeDasharray="220"
        style={{ animation: `drawCurve 0.9s ${delay}s ease-out both` }}
      />
    </svg>
  );
}

export function AdminReportsView() {
  const [period, setPeriod] = useState('This month');

  return (
    <div className="space-y-7" style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: INK }}>
      <style>{FONT_IMPORT}</style>

      <div className="chart-in flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <MonoLabel>Business intelligence</MonoLabel>
          <h1 className="mt-1 text-2xl sm:text-3xl italic" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: INK }}>Reports</h1>
          <p className="mt-2 text-sm" style={{ color: MUTED }}>Track sales, production output, payments, and inventory consumption.</p>
        </div>
        <div className="flex gap-2">
          <select value={period} onChange={(event) => setPeriod(event.target.value)} className="border px-3 py-2.5 text-sm outline-none" style={{ borderColor: LINE, background: PAPER, color: INK }}>
            <option>This month</option>
            <option>Last month</option>
            <option>This year</option>
          </select>
          <button className="inline-flex items-center gap-2 border px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-white transition-colors" style={{ borderColor: AMBER_DEEP, background: AMBER_DEEP }} onMouseEnter={(e) => { e.currentTarget.style.background = AMBER; e.currentTarget.style.borderColor = AMBER; }} onMouseLeave={(e) => { e.currentTarget.style.background = AMBER_DEEP; e.currentTarget.style.borderColor = AMBER_DEEP; }}>
            <Download className="h-4 w-4" /> Export
          </button>
        </div>
      </div>

      <div className="chart-in grid grid-cols-2 gap-4 lg:grid-cols-4" style={{ animationDelay: '0.06s' }}>
        <Metric icon={<PhilippinePeso />} label="Revenue" value="₱121,500" trend="+12.4%" />
        <Metric icon={<Shirt />} label="Orders received" value="48" trend="+8 this month" />
        <Metric icon={<PackageCheck />} label="Completed orders" value="39" trend="81% completion" />
        <Metric icon={<CalendarDays />} label="Outstanding balance" value="₱18,725" trend="6 open balances" tone="warn" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <section className="chart-in border p-6 sm:p-8" style={{ animationDelay: '0.12s', borderColor: LINE, background: PAPER }}>
          <MonoLabel>Revenue overview</MonoLabel>
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-lg italic" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: INK }}>Monthly sales</h2>
              <CurveRule delay={0.15} />
            </div>
            <span className="text-sm" style={{ color: MUTED }}>{period}</span>
          </div>
          <div className="grid-paper mt-6 flex h-52 items-end gap-4 border p-3" style={{ borderColor: LINE }}>
            {monthlyRevenue.map((month, i) => (
              <div key={month.label} className="flex h-full flex-1 flex-col justify-end gap-2">
                <div className="relative flex-1">
                  <div
                    className="absolute inset-x-0 bottom-0 origin-bottom transition-colors"
                    style={{ height: `${(month.value / maxRevenue) * 100}%`, background: month.label === 'Jul' ? AMBER : INK, animation: `growCol 0.6s ${0.2 + i * 0.05}s cubic-bezier(0.22,1,0.36,1) both` }}
                    title={`₱${month.value.toLocaleString()}`}
                  />
                </div>
                <div className="text-center text-[10px]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: MUTED }}>{month.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="chart-in border p-6 sm:p-8" style={{ animationDelay: '0.18s', borderColor: LINE, background: PAPER }}>
          <MonoLabel>Production efficiency</MonoLabel>
          <h2 className="text-lg italic" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: INK }}>Turnaround performance</h2>
          <CurveRule delay={0.2} />
          <div className="mt-6 space-y-6">
            <RulerStat label="Completed on time" value="92%" percent={92} />
            <RulerStat label="Average turnaround" value="8.4 days" percent={70} />
            <RulerStat label="First fitting approval" value="86%" percent={86} />
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="chart-in border p-6 sm:p-8" style={{ animationDelay: '0.24s', borderColor: LINE, background: PAPER }}>
          <MonoLabel>Demand report</MonoLabel>
          <h2 className="text-lg italic" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: INK }}>Most ordered garments</h2>
          <CurveRule delay={0.3} />
          <div className="mt-6 space-y-5">
            {garments.map((garment) => (
              <div key={garment.name}>
                <div className="flex justify-between gap-4 text-sm">
                  <span style={{ color: INK }}>{garment.name}</span>
                  <span style={{ color: MUTED }}>{garment.orders} orders</span>
                </div>
                <div className="mt-2 h-2" style={{ background: PAGE }}>
                  <div className="h-full" style={{ width: `${garment.percent}%`, background: AMBER }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="chart-in border p-6 sm:p-8" style={{ animationDelay: '0.3s', borderColor: LINE, background: PAPER }}>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" style={{ color: AMBER }} />
            <MonoLabel>Inventory consumption</MonoLabel>
          </div>
          <h2 className="text-lg italic" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: INK }}>Most used fabrics</h2>
          <CurveRule delay={0.36} />
          <dl className="mt-6 divide-y border-y" style={{ borderColor: LINE }}>
            {[['Piña Jusi — Ivory', '16.5 m'], ['Italian Wool — Charcoal', '12.0 m'], ['Silk Habotai — Wine', '9.5 m'], ['Cotton Poplin — White', '8.0 m']].map(([fabric, usage]) => (
              <div key={fabric} className="flex justify-between py-3 text-sm" style={{ borderColor: LINE }}>
                <dt style={{ color: INK }}>{fabric}</dt>
                <dd style={{ fontFamily: "'IBM Plex Mono', monospace", color: AMBER_DEEP }}>{usage}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}

function Metric({ icon, label, value, trend, tone = 'default' }: { icon: React.ReactNode; label: string; value: string; trend: string; tone?: 'default' | 'warn' }) {
  return (
    <div className="border p-5" style={{ borderColor: LINE, background: PAPER }}>
      <div className="flex h-8 w-8 items-center justify-center [&>svg]:h-4 [&>svg]:w-4" style={{ background: AMBER_SOFT, color: AMBER_DEEP }}>{icon}</div>
      <div className="mt-4 text-2xl" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: INK }}>{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.16em]" style={{ color: MUTED }}>{label}</div>
      <div className="mt-2 text-xs" style={{ color: tone === 'warn' ? RED : GREEN }}>{trend}</div>
    </div>
  );
}

/* Ruler-tick stat: a horizontal line marked off like a tailor's ruler,
   with a filled amber run showing progress — grading-chart language
   in place of a plain progress bar. */
function RulerStat({ label, value, percent }: { label: string; value: string; percent: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span style={{ color: INK }}>{label}</span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: AMBER_DEEP }}>{value}</span>
      </div>
      <div className="relative mt-3 h-3">
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2" style={{ background: LINE }} />
        <div className="absolute left-0 top-1/2 h-px -translate-y-1/2" style={{ width: `${percent}%`, background: AMBER, height: '2px' }} />
        <div className="absolute inset-0 flex justify-between items-center px-px" aria-hidden="true">
          {Array.from({ length: 11 }).map((_, i) => (
            <span key={i} className="w-px" style={{ height: i % 5 === 0 ? '10px' : '6px', background: i * 10 <= percent ? AMBER : LINE }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default AdminReportsView;