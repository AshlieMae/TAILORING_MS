import { useState } from 'react';
import { BarChart3, CalendarDays, Download, PackageCheck, PhilippinePeso, Shirt, TrendingUp } from 'lucide-react';
import ExcelJS from 'exceljs';
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

const REPORT_PERIODS = {
  'This month': { revenue: 121500, ordersReceived: 48, completedOrders: 39, outstandingBalance: 18725, revenueTrend: '+12.4% vs last month', ordersTrend: '+8 this month', completionTrend: '81% completion', balanceTrend: '6 open balances', revenueData: monthlyRevenue },
  'Last month': { revenue: 108100, ordersReceived: 40, completedOrders: 35, outstandingBalance: 22150, revenueTrend: '+5.1% vs previous month', ordersTrend: '+4 received', completionTrend: '88% completion', balanceTrend: '8 open balances', revenueData: monthlyRevenue.map((item) => ({ ...item, value: Math.round(item.value * 0.89) })) },
  'This year': { revenue: 1094500, ordersReceived: 386, completedOrders: 328, outstandingBalance: 92400, revenueTrend: '+18.7% vs last year', ordersTrend: '386 received', completionTrend: '85% completion', balanceTrend: '31 open balances', revenueData: monthlyRevenue.map((item) => ({ ...item, value: item.value * 8 })) },
};

const peso = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(amount);

export function AdminReportsView() {
  const [period, setPeriod] = useState<keyof typeof REPORT_PERIODS>('This month');
  const report = REPORT_PERIODS[period];

  const exportReport = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Ashlie's Tailor";
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('Business Report', { views: [{ state: 'frozen', ySplit: 3 }] });
    worksheet.columns = [{ width: 32 }, { width: 18 }, { width: 4 }, { width: 16 }, { width: 16 }, { width: 16 }];

    const navy = '17324D';
    const cream = 'FFF9EE';
    const paleBlue = 'EAF2F8';
    const section = (rowNumber: number, title: string, valueTitle: string) => {
      const row = worksheet.getRow(rowNumber);
      row.values = [title, valueTitle];
      row.height = 22;
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: navy } };
        cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 10 };
        cell.alignment = { vertical: 'middle' };
      });
    };
    const dataRow = (rowNumber: number, label: string, value: string | number, currency = false) => {
      const row = worksheet.getRow(rowNumber);
      row.values = [label, value];
      row.height = 20;
      row.eachCell((cell, columnNumber) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowNumber % 2 === 0 ? cream : 'FFFFFF' } };
        cell.border = { bottom: { style: 'hair', color: { argb: 'D8CBA9' } } };
        cell.alignment = { vertical: 'middle', horizontal: columnNumber === 2 ? 'right' : 'left' };
      });
      row.getCell(2).font = { bold: true, color: { argb: navy } };
      if (currency) row.getCell(2).numFmt = '₱#,##0';
    };

    worksheet.mergeCells('A1:B1');
    worksheet.getCell('A1').value = "ASHLIE'S TAILOR — BUSINESS REPORT";
    worksheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFFFFF' } };
    worksheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: navy } };
    worksheet.getCell('A1').alignment = { vertical: 'middle' };
    worksheet.getRow(1).height = 30;
    worksheet.mergeCells('A2:B2');
    worksheet.getCell('A2').value = `Reporting period: ${period}`;
    worksheet.getCell('A2').font = { italic: true, color: { argb: '5B6770' } };
    worksheet.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: paleBlue } };
    worksheet.getRow(2).height = 22;

    section(4, 'REPORT SUMMARY', 'VALUE');
    dataRow(5, 'Revenue', report.revenue, true);
    dataRow(6, 'Orders received', report.ordersReceived);
    dataRow(7, 'Completed orders', report.completedOrders);
    dataRow(8, 'Outstanding balance', report.outstandingBalance, true);
    section(10, 'MONTHLY SALES', 'AMOUNT');
    report.revenueData.forEach(({ label, value }, index) => dataRow(11 + index, label, value, true));
    const garmentsRow = 12 + report.revenueData.length;
    section(garmentsRow, 'MOST ORDERED GARMENTS', 'ORDERS');
    garments.forEach(({ name, orders }, index) => dataRow(garmentsRow + 1 + index, name, orders));
    const fabricRow = garmentsRow + garments.length + 2;
    section(fabricRow, 'MOST USED FABRICS', 'USAGE');
    fabricUsage.forEach(({ fabric, usage }, index) => dataRow(fabricRow + 1 + index, fabric, usage));
    worksheet.autoFilter = { from: 'A4', to: 'B8' };

    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = 500;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#17324D';
      context.font = 'bold 28px Arial';
      context.fillText('Monthly Sales', 52, 58);
      context.fillStyle = '#667085';
      context.font = '18px Arial';
      context.fillText(period, 52, 88);
      const chart = { left: 70, top: 125, width: 830, height: 285 };
      const maximum = Math.max(...report.revenueData.map(({ value }) => value));
      context.strokeStyle = '#D8E1E8';
      context.lineWidth = 1;
      for (let line = 0; line <= 4; line += 1) {
        const y = chart.top + (chart.height / 4) * line;
        context.beginPath(); context.moveTo(chart.left, y); context.lineTo(chart.left + chart.width, y); context.stroke();
      }
      const gap = 26;
      const barWidth = (chart.width - gap * (report.revenueData.length + 1)) / report.revenueData.length;
      report.revenueData.forEach(({ label, value }, index) => {
        const height = (value / maximum) * chart.height;
        const x = chart.left + gap + index * (barWidth + gap);
        const y = chart.top + chart.height - height;
        context.fillStyle = index === report.revenueData.length - 1 ? '#B58A3A' : '#2F5D7C';
        context.fillRect(x, y, barWidth, height);
        context.fillStyle = '#334155'; context.font = '16px Arial';
        context.textAlign = 'center'; context.fillText(label, x + barWidth / 2, chart.top + chart.height + 28);
        context.fillStyle = '#17324D'; context.font = 'bold 14px Arial';
        context.fillText(`₱${Math.round(value / 1000)}k`, x + barWidth / 2, y - 10);
      });
      context.textAlign = 'left';
      const image = workbook.addImage({ base64: canvas.toDataURL('image/png'), extension: 'png' });
      worksheet.addImage(image, { tl: { col: 3, row: 1 }, ext: { width: 540, height: 281 } });
    }

    const file = await workbook.xlsx.writeBuffer();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([file], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    link.download = `ashlies-tailor-report-${period.toLowerCase().replaceAll(' ', '-')}.xlsx`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="space-y-7" style={{ color: COLORS.ink }}>
      <style>{FONT_IMPORT}</style>

      <PageHeader
        eyebrow="Business intelligence"
        title="Reports"
        description="Track sales, production output, payments, and inventory consumption."
        action={
          <div className="flex gap-2">
            <select value={period} onChange={(event) => setPeriod(event.target.value as keyof typeof REPORT_PERIODS)} aria-label="Report period" className="border bg-white px-3 py-2.5 text-sm outline-none" style={{ borderColor: COLORS.border, color: COLORS.ink, borderRadius: 8 }}>
              <option>This month</option>
              <option>Last month</option>
              <option>This year</option>
            </select>
            <PrimaryButton icon={<Download />} onClick={exportReport}>Export</PrimaryButton>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard delay={0.05} icon={<PhilippinePeso />} label="Revenue" value={peso(report.revenue)} trend={report.revenueTrend} sparkline={[92, 105, 98, 112, 121]} tone="brass" />
        <StatCard delay={0.09} icon={<Shirt />} label="Orders received" value={String(report.ordersReceived)} trend={report.ordersTrend} sparkline={[30, 34, 33, 40, 48]} tone="neutral" />
        <StatCard delay={0.13} icon={<PackageCheck />} label="Completed orders" value={String(report.completedOrders)} trend={report.completionTrend} sparkline={[22, 26, 29, 34, 39]} tone="success" />
        <StatCard delay={0.17} icon={<CalendarDays />} label="Outstanding balance" value={peso(report.outstandingBalance)} trend={report.balanceTrend} trendTone="danger" tone="danger" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <Card delay={0.2} className="p-6 sm:p-8">
          <EyebrowLabel>Revenue overview</EyebrowLabel>
          <div className="flex items-end justify-between">
            <h2 className="text-[16px] font-semibold" style={{ color: COLORS.ink }}>Monthly sales</h2>
            <span className="text-sm" style={{ color: COLORS.muted }}>{period}</span>
          </div>
          <div className="mt-6"><BarChartPanel data={report.revenueData} /></div>
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
