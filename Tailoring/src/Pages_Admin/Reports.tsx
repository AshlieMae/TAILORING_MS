import { useState } from 'react';
import { BarChart3, CalendarDays, Download, PackageCheck, PhilippinePeso, Shirt, TrendingUp } from 'lucide-react';
import {
  COLORS, FONT_IMPORT, PageHeader, StatCard, Card, EyebrowLabel, PrimaryButton,
  BarChartPanel, AreaLineChart, DonutChart,
} from './Theme';

const monthlyRevenue = [{ label: 'Mar', value: 118000 }, { label: 'Apr', value: 142000 }, { label: 'May', value: 126000 }, { label: 'Jun', value: 168000 }, { label: 'Jul', value: 194000 }, { label: 'Aug', value: 121500 }];
const turnaroundTrend = [{ label: 'Wk 1', value: 9.6 }, { label: 'Wk 2', value: 9.1 }, { label: 'Wk 3', value: 8.7 }, { label: 'Wk 4', value: 8.4 }];
const garments = [{ name: 'Barong Tagalog', orders: 32, percent: 82 }, { name: 'Two-piece Suit', orders: 26, percent: 67 }, { name: 'Filipiniana Dress', orders: 21, percent: 54 }, { name: 'School Uniform Set', orders: 18, percent: 46 }];
const fabricUsage = [{ fabric: 'Piña Jusi — Ivory', usage: '16.5 m' }, { fabric: 'Italian Wool — Charcoal', usage: '12.0 m' }, { fabric: 'Silk Habotai — Wine', usage: '9.5 m' }, { fabric: 'Cotton Poplin — White', usage: '8.0 m' }];
const donutSegments = [
  { value: 32, color: COLORS.navy },
  { value: 26, color: COLORS.brass },
  { value: 21, color: '#7B92B2' },
  { value: 18, color: COLORS.border },
];

export function AdminReportsView() {
  const [period, setPeriod] = useState('This month');

  return (
    <div className="space-y-7" style={{ color: COLORS.ink }}>
      <style>{FONT_IMPORT}</style>

      <PageHeader
        eyebrow="Business intelligence"
        title="Reports"
        description="Track sales, production output, payments, and inventory consumption."
        action={
          <div className="flex gap-2">
            <select value={period} onChange={(event) => setPeriod(event.target.value)} className="border bg-white px-3 py-2.5 text-sm outline-none" style={{ borderColor: COLORS.border, color: COLORS.ink, borderRadius: 8 }}>
              <option>This month</option>
              <option>Last month</option>
              <option>This year</option>
            </select>
            <PrimaryButton icon={<Download />}>Export</PrimaryButton>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard delay={0.05} icon={<PhilippinePeso />} label="Revenue" value="₱121,500" trend="+12.4% vs last month" sparkline={[92, 105, 98, 112, 121]} tone="brass" />
        <StatCard delay={0.09} icon={<Shirt />} label="Orders received" value="48" trend="+8 this month" sparkline={[30, 34, 33, 40, 48]} tone="neutral" />
        <StatCard delay={0.13} icon={<PackageCheck />} label="Completed orders" value="39" trend="81% completion" sparkline={[22, 26, 29, 34, 39]} tone="success" />
        <StatCard delay={0.17} icon={<CalendarDays />} label="Outstanding balance" value="₱18,725" trend="6 open balances" trendTone="danger" tone="danger" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <Card delay={0.2} className="p-6 sm:p-8">
          <EyebrowLabel>Revenue overview</EyebrowLabel>
          <div className="flex items-end justify-between">
            <h2 className="text-[16px] font-semibold" style={{ color: COLORS.ink }}>Monthly sales</h2>
            <span className="text-sm" style={{ color: COLORS.muted }}>{period}</span>
          </div>
          <div className="mt-6"><BarChartPanel data={monthlyRevenue} /></div>
        </Card>

        <Card delay={0.24} className="p-6 sm:p-8">
          <EyebrowLabel>Production efficiency</EyebrowLabel>
          <h2 className="text-[16px] font-semibold" style={{ color: COLORS.ink }}>Turnaround performance</h2>
          <div className="mt-6 space-y-6">
            <RulerStat label="Completed on time" value="92%" percent={92} />
            <RulerStat label="Average turnaround" value="8.4 days" percent={70} />
            <RulerStat label="First fitting approval" value="86%" percent={86} />
          </div>
        </Card>
      </div>

      <Card delay={0.28} className="p-6 sm:p-8">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" style={{ color: COLORS.brassDeep }} />
          <EyebrowLabel>Weekly turnaround trend</EyebrowLabel>
        </div>
        <h2 className="text-[16px] font-semibold" style={{ color: COLORS.ink }}>Average days to complete a job</h2>
        <div className="mt-4"><AreaLineChart data={turnaroundTrend} /></div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card delay={0.32} className="p-6 sm:p-8">
          <EyebrowLabel>Demand report</EyebrowLabel>
          <h2 className="text-[16px] font-semibold" style={{ color: COLORS.ink }}>Most ordered garments</h2>
          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center">
            <DonutChart segments={donutSegments} />
            <div className="flex-1 space-y-4">
              {garments.map((garment, i) => (
                <div key={garment.name}>
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="flex items-center gap-2" style={{ color: COLORS.ink }}>
                      <span className="h-2 w-2 rounded-full" style={{ background: donutSegments[i].color }} />
                      {garment.name}
                    </span>
                    <span className="mono" style={{ color: COLORS.muted }}>{garment.orders} orders</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card delay={0.36} className="p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" style={{ color: COLORS.brassDeep }} />
            <EyebrowLabel>Inventory consumption</EyebrowLabel>
          </div>
          <h2 className="text-[16px] font-semibold" style={{ color: COLORS.ink }}>Most used fabrics</h2>
          <dl className="mt-6 divide-y border-y" style={{ borderColor: COLORS.border }}>
            {fabricUsage.map(({ fabric, usage }) => (
              <div key={fabric} className="flex justify-between py-3 text-sm">
                <dt style={{ color: COLORS.ink }}>{fabric}</dt>
                <dd className="mono" style={{ color: COLORS.brassDeep }}>{usage}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </div>
  );
}

function RulerStat({ label, value, percent }: { label: string; value: string; percent: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span style={{ color: COLORS.ink }}>{label}</span>
        <span className="mono" style={{ color: COLORS.brassDeep }}>{value}</span>
      </div>
      <div className="mt-3 h-2" style={{ background: COLORS.border, borderRadius: 4 }}>
        <div style={{ width: `${percent}%`, height: '100%', background: `linear-gradient(90deg, ${COLORS.navy}, ${COLORS.brass})`, borderRadius: 4 }} />
      </div>
    </div>
  );
}

export default AdminReportsView;
