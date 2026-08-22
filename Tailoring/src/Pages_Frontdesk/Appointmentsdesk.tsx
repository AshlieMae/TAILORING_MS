// Pages_Frontdesk/Appointmentsdesk.tsx
import { useMemo, useState, useEffect, useCallback } from 'react';
import { CalendarClock, Check, ChevronRight, Plus, Search, Sparkles, TrendingUp, X, Loader2 } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import frontDeskApi, { type Appointment, type Customer, type Order } from '../../services/frontDeskApi';

type AppointmentStatus = 'Scheduled' | 'Confirmed' | 'Completed' | 'Rescheduled' | 'Cancelled';

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] uppercase tracking-[0.2em] text-[#8C7E74]" style={{ fontFamily: "'Space Mono', monospace" }}>{children}</span>;
}

function StatusBadge({ status }: { status: AppointmentStatus }) {
  const classes = status === 'Completed' ? 'border-[#B9DDD0] bg-[#E7F4EE] text-[#277257]' : 
    status === 'Confirmed' ? 'border-[#C7DDD3] bg-[#EDF5F0] text-[#4E7357]' : 
    status === 'Scheduled' ? 'border-[#ECD8A7] bg-[#FFF7E3] text-[#8A6618]' :
    status === 'Rescheduled' ? 'border-[#E6C8C2] bg-[#FDF0ED] text-[#9E5B4B]' :
    'border-[#D9C8B7] bg-[#F8F3EB] text-[#766A62]';
  const dot = status === 'Completed' ? 'bg-[#277257]' : 
    status === 'Confirmed' ? 'bg-[#4E7357]' : 
    status === 'Scheduled' ? 'bg-[#8A6618]' :
    status === 'Rescheduled' ? 'bg-[#9E5B4B]' : 'bg-[#766A62]';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.08em] shadow-sm ${classes}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {status}
    </span>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#E2D7C7] bg-[#FFFCF8] px-3 py-2 shadow-lg">
      <div className="text-[10px] uppercase tracking-[0.14em] text-[#8C7E74]" style={{ fontFamily: "'Space Mono', monospace" }}>{label}</div>
      <div className="text-[13px] font-semibold text-[#2A211D] mt-0.5">{payload[0].value} appointment{payload[0].value === 1 ? '' : 's'}</div>
    </div>
  );
}

function AppointmentDetails({ appointment, onClose, onComplete }: { appointment: Appointment; onClose: () => void; onComplete: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button onClick={onClose} className="absolute inset-0 bg-[#1F1916]/45 backdrop-blur-sm" />
      <section className="relative w-full max-w-xl rounded-xl border border-[#E2D7C7] bg-[#FFFCF8] p-7 shadow-2xl">
        <button onClick={onClose} className="absolute right-5 top-5 text-[#766A62]"><X className="h-5 w-5" /></button>
        <Label>Appointment details</Label>
        <h2 className="mt-1 text-3xl text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>{appointment.customer_name}</h2>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {[
            ['Date', new Date(appointment.appointment_date).toLocaleDateString()],
            ['Time', appointment.appointment_time],
            ['Type', appointment.appointment_type],
            ['Job Card', appointment.job_card_id],
            ['Notes', appointment.notes || '—'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-[#E2D7C7] bg-white p-3">
              <Label>{label}</Label>
              <div className="mt-1 text-sm text-[#2A211D]">{value}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-between border-t border-[#E8DFD3] pt-5">
          <StatusBadge status={appointment.status as AppointmentStatus} />
          {appointment.appointment_type === 'Final Fitting' &&
            appointment.status !== 'Completed' &&
            appointment.status !== 'Cancelled' && (
            <button onClick={onComplete} className="inline-flex items-center gap-2 rounded-lg bg-[#2A211D] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white shadow-sm hover:-translate-y-0.5 transition-transform">
              <Check className="h-4 w-4" /> Mark completed
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function AppointmentEditor({ 
  onClose, 
  onCreate, 
  customers, 
  orders 
}: { 
  onClose: () => void; 
  onCreate: (data: any) => Promise<void>;
  customers: Customer[];
  orders: Order[];
}) {
  const [form, setForm] = useState({
    customerId: '',
    orderId: '',
    appointmentDate: '',
    appointmentTime: '',
    appointmentType: 'First Fitting' as 'First Fitting' | 'Final Fitting' | 'Consultation' | 'Pickup',
    notes: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredOrders = orders.filter(o => o.customer_id === form.customerId && o.production_status !== 'Released');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerId || !form.appointmentDate || !form.appointmentTime) {
      setError('Customer, date, and time are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onCreate(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create appointment.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button onClick={onClose} className="absolute inset-0 bg-[#1F1916]/45 backdrop-blur-sm" />
      <form onSubmit={handleSubmit} className="relative w-full max-w-xl rounded-xl border border-[#E2D7C7] bg-[#FFFCF8] p-7 shadow-2xl">
        <button type="button" onClick={onClose} className="absolute right-5 top-5 text-[#766A62]"><X className="h-5 w-5" /></button>
        <Label>Fitting scheduler</Label>
        <h2 className="mt-1 text-3xl text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>Schedule appointment</h2>
        
        {error && <div className="mt-4 border border-[#C86A58]/30 bg-[#FDF4F2] px-4 py-3 rounded-lg text-sm text-[#9A3B2A]">{error}</div>}

        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-medium text-[#5E5048]">
            Customer
            <select value={form.customerId} onChange={(e) => setForm(f => ({ ...f, customerId: e.target.value, orderId: '' }))} className="mt-2 w-full rounded-lg border border-[#E2D7C7] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#A46B48]">
              <option value="">Select customer</option>
              {customers.map(c => <option key={c.customer_id} value={c.customer_id}>{c.full_name}</option>)}
            </select>
          </label>
          <label className="block text-xs font-medium text-[#5E5048]">
            Order (Job Card)
            <select value={form.orderId} onChange={(e) => setForm(f => ({ ...f, orderId: e.target.value }))} className="mt-2 w-full rounded-lg border border-[#E2D7C7] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#A46B48]" disabled={!form.customerId}>
              <option value="">Select order</option>
              {filteredOrders.map(o => <option key={o.order_id} value={o.order_id}>{o.job_card_id} - {o.garment_type}</option>)}
            </select>
          </label>
          <label className="block text-xs font-medium text-[#5E5048]">
            Date
            <input type="date" value={form.appointmentDate} onChange={(e) => setForm(f => ({ ...f, appointmentDate: e.target.value }))} className="mt-2 w-full rounded-lg border border-[#E2D7C7] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#A46B48]" />
          </label>
          <label className="block text-xs font-medium text-[#5E5048]">
            Time
            <input type="time" value={form.appointmentTime} onChange={(e) => setForm(f => ({ ...f, appointmentTime: e.target.value }))} className="mt-2 w-full rounded-lg border border-[#E2D7C7] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#A46B48]" />
          </label>
          <label className="block text-xs font-medium text-[#5E5048] sm:col-span-2">
            Appointment type
            <select value={form.appointmentType} onChange={(e) => setForm(f => ({ ...f, appointmentType: e.target.value as any }))} className="mt-2 w-full rounded-lg border border-[#E2D7C7] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#A46B48]">
              <option value="First Fitting">First Fitting</option>
              <option value="Final Fitting">Final Fitting</option>
              <option value="Consultation">Consultation</option>
              <option value="Pickup">Pickup</option>
            </select>
          </label>
          <label className="block text-xs font-medium text-[#5E5048] sm:col-span-2">
            Notes (optional)
            <input value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Special instructions..." className="mt-2 w-full rounded-lg border border-[#E2D7C7] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#A46B48]" />
          </label>
        </div>

        <div className="mt-7 flex gap-3">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#2A211D] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white disabled:opacity-50">
            <CalendarClock className="h-4 w-4" /> {saving ? 'Scheduling...' : 'Schedule'}
          </button>
          <button type="button" onClick={onClose} className="rounded-lg border border-[#E2D7C7] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5E5048]">Cancel</button>
        </div>
      </form>
    </div>
  );
}

const STAGES = ['Measuring', 'Pattern Cutting', 'Initial Assembly', 'Ready for First Fitting', 'Final Alterations', 'Completed', 'Ready for Pickup'];
const STAGE_SHORT: Record<string, string> = {
  Measuring: 'Measure',
  'Pattern Cutting': 'Pattern',
  'Initial Assembly': 'Assembly',
  'Ready for First Fitting': 'Fitting',
  'Final Alterations': 'Alter',
  Completed: 'Done',
  'Ready for Pickup': 'Pickup'
};
const STAGE_CHART_COLORS = ['#C9BBA6', '#8FAF9E', '#C9A15C', '#A8644A', '#B89255', '#6E8F72', '#4E7357'];

export function FrontDeskAppointmentsView() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [appointmentsData, customersData, ordersData] = await Promise.all([
        frontDeskApi.getAppointments(),
        frontDeskApi.searchCustomers(''),
        frontDeskApi.getAllOrders(),
      ]);
      setAppointments(appointmentsData);
      setCustomers(customersData);
      setOrders(ordersData);
    } catch (err) {
      console.error('Failed to load data:', err);
      setNotice('Failed to load appointment data.');
      setTimeout(() => setNotice(''), 4000);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    if (!query.trim()) return appointments;
    const q = query.toLowerCase();
    return appointments.filter((a) =>
      a.customer_name.toLowerCase().includes(q) ||
      a.job_card_id.toLowerCase().includes(q) ||
      a.appointment_type.toLowerCase().includes(q)
    );
  }, [appointments, query]);

  const today = appointments.filter((a) => {
    const todayStr = new Date().toISOString().split('T')[0];
    return a.appointment_date === todayStr;
  });

  const stageChart = useMemo(() => 
    STAGES.map((stage) => ({
      stage: STAGE_SHORT[stage] || stage,
      count: appointments.filter((a) => a.appointment_type.includes(stage) || a.appointment_type === 'First Fitting' && stage === 'Ready for First Fitting').length,
    })),
    [appointments]
  );

  const handleCreateAppointment = async (data: any) => {
    try {
      const newAppointment = await frontDeskApi.createAppointment({
        customerId: data.customerId,
        orderId: data.orderId,
        appointmentDate: data.appointmentDate,
        appointmentTime: data.appointmentTime,
        appointmentType: data.appointmentType,
        notes: data.notes,
      });
      setAppointments(prev => [...prev, newAppointment]);
      setEditorOpen(false);
      setNotice(`Appointment scheduled for ${newAppointment.customer_name}.`);
      setTimeout(() => setNotice(''), 4000);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Failed to create appointment.');
      setTimeout(() => setNotice(''), 4000);
    }
  };

  const handleCompleteAppointment = async () => {
    if (!selected) return;
    try {
      const updated = await frontDeskApi.updateAppointmentStatus(selected.appointment_id, 'Completed');
      setAppointments(prev => prev.map(a => a.appointment_id === updated.appointment_id ? updated : a));
      setSelected(updated);
      setNotice(`${updated.customer_name}'s appointment was completed.`);
      setTimeout(() => setNotice(''), 4000);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Failed to complete appointment.');
      setTimeout(() => setNotice(''), 4000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-[#8C6F3E]" />
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div className="dash-in flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Label>Fitting scheduler</Label>
          <h1 className="mt-1 text-2xl text-[#2A211D] sm:text-3xl" style={{ fontFamily: "'DM Serif Display', serif" }}>Appointments</h1>
          <p className="mt-2 text-sm text-[#766A62]">Schedule fittings and keep every customer visit on track.</p>
        </div>
        <button onClick={() => setEditorOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-[#2A211D] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white shadow-[0_10px_26px_-14px_rgba(42,33,29,0.55)] hover:-translate-y-0.5 hover:bg-[#3D312B] transition-all">
          <Plus className="h-4 w-4" /> Schedule appointment
        </button>
      </div>

      {notice && (
        <div className="flex items-center gap-2 rounded-lg border border-[#8B9E87]/40 bg-[#F1F5F0] px-4 py-3 text-sm text-[#4E7357] shadow-sm">
          <Check className="h-4 w-4" />{notice}
        </div>
      )}

      <div className="dash-in grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Metric label="Today's fittings" value={today.length} icon={<CalendarClock className="h-4 w-4" strokeWidth={1.6} />} />
        <Metric label="Confirmed" value={appointments.filter(a => a.status === 'Confirmed').length} icon={<Check className="h-4 w-4" strokeWidth={1.6} />} tone="good" />
        <Metric label="Upcoming" value={appointments.filter(a => a.status !== 'Completed' && a.status !== 'Cancelled').length} icon={<Sparkles className="h-4 w-4" strokeWidth={1.6} />} />
      </div>

      <section className="dash-in dash-card rounded-xl p-6 sm:p-7">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div><Label>Booked pipeline</Label><h2 className="text-xl font-normal mt-0.5 text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>Appointments by stage</h2></div>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F0] border border-[#C7DDD3] px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] uppercase text-[#4E7357] flex-shrink-0">
            <TrendingUp className="w-3 h-3" /> {appointments.length} total
          </span>
        </div>
        <p className="text-[12.5px] text-[#8C7E74] mb-5">Where every booked fitting currently sits in the workflow</p>
        <div className="h-44 -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stageChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#ECE3D8" strokeDasharray="3 4" />
              <XAxis dataKey="stage" tickLine={false} axisLine={false} tick={{ fill: '#A3958B', fontSize: 10.5, fontFamily: 'Space Mono, monospace' }} />
              <YAxis hide allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F8F3EB' }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={40}>
                {stageChart.map((entry, i) => <Cell key={entry.stage} fill={STAGE_CHART_COLORS[i % STAGE_CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="dash-in dash-card overflow-hidden rounded-xl">
        <div className="flex flex-col gap-4 border-b border-[#E8DFD3] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A3958B]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customer, garment, stage, or date" className="w-full rounded-lg border border-[#E2D7C7] bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition-shadow focus:border-[#A46B48] focus:shadow-[0_0_0_3px_rgba(164,107,72,0.1)]" />
          </div>
          <span className="text-xs text-[#8C7E74]">{filtered.length} appointment{filtered.length === 1 ? '' : 's'}</span>
        </div>

        <div className="hidden grid-cols-[0.85fr_1.15fr_1fr_1.1fr_0.8fr_24px] gap-4 border-b border-[#E8DFD3] bg-[#FCFAF7] px-6 py-3 md:grid">
          {['When', 'Customer', 'Job Card', 'Fitting stage', 'Status', ''].map((label) => <Label key={label}>{label}</Label>)}
        </div>

        {filtered.map((appointment) => (
          <button key={appointment.appointment_id} onClick={() => setSelected(appointment)} className="grid w-full grid-cols-1 gap-2 border-b border-[#F0EAE2] px-6 py-4 text-left transition-colors hover:bg-[#FCFAF7] md:grid-cols-[0.85fr_1.15fr_1fr_1.1fr_0.8fr_24px] md:items-center md:gap-4">
            <span>
              <span className="block text-sm font-medium text-[#2A211D]">{appointment.appointment_time}</span>
              <span className="text-[11px] text-[#8C7E74]">{new Date(appointment.appointment_date).toLocaleDateString()}</span>
            </span>
            <span className="font-medium text-[#2A211D]">{appointment.customer_name}</span>
            <span className="text-sm text-[#5E5048]">{appointment.job_card_id}</span>
            <span className="text-sm text-[#5E5048]">{appointment.appointment_type}</span>
            <StatusBadge status={appointment.status as AppointmentStatus} />
            <ChevronRight className="hidden h-4 w-4 text-[#A46B48] md:block" />
          </button>
        ))}
        {!filtered.length && <p className="p-12 text-center text-sm text-[#766A62]">No appointment matches your search.</p>}
      </section>

      {selected && <AppointmentDetails appointment={selected} onClose={() => setSelected(null)} onComplete={handleCompleteAppointment} />}
      {editorOpen && <AppointmentEditor onClose={() => setEditorOpen(false)} onCreate={handleCreateAppointment} customers={customers} orders={orders} />}
    </div>
  );
}

function Metric({ label, value, icon, tone = 'default' }: { label: string; value: number; icon?: React.ReactNode; tone?: 'default' | 'good' }) {
  return (
    <div className="dash-card flex items-center gap-4 rounded-xl p-5">
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${tone === 'good' ? 'bg-[#EDF5F0] text-[#4E7357]' : 'bg-[#F9F4EB] text-[#8C6F3E]'}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>{value}</div>
        <Label>{label}</Label>
      </div>
    </div>
  );
}

export default FrontDeskAppointmentsView;