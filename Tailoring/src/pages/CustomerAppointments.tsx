// pages/CustomerAppointments.tsx
//
// CUSTOMER PORTAL — VIEW ONLY.
//
// This is a walk-in tailoring shop: Front Desk owns every appointment decision.
// Visits are suggested automatically when production reaches a fitting or
// pickup milestone, and only the Front Desk approves, reschedules, cancels or
// completes them. There is nothing for a customer to book, confirm, reschedule
// or cancel here — the portal shows the visit and how to reach the counter.
import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CalendarClock, ChevronDown, Loader2, MapPin, Phone } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const token = () => localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';

type Appointment = {
  id: number;
  appointment_number?: string;
  job_card_number: string;
  appointment_at: string;
  appointment_type: string;
  status: string;
  notes?: string | null;
  assigned_tailor_name?: string | null;
  garment?: string;
};

export function CustomerAppointmentsView() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);
  const [showContact, setShowContact] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/auth/customer/my-appointments`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to load appointments.');
      setAppointments(Array.isArray(data.appointments) ? data.appointments : []);
    } catch (e) {
      setAppointments([]);
      setError(e instanceof Error ? e.message : 'Unable to load appointments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[#0F1F3D]" /></div>;

  return <div className="mx-auto max-w-4xl space-y-6">
    <header className="flex flex-col gap-4 border border-[#C9D8E8] bg-[#EAF1F8] p-7 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <span className="text-[10px] uppercase tracking-[0.2em] text-[#5A769A]">Visit schedule</span>
        <h1 className="mt-1 text-4xl font-bold text-[#0F1F3D]">Appointments</h1>
        <p className="mt-2 text-sm text-[#4C6E93]">Front Desk confirms your fitting and pickup visits after the workshop reports your garment is ready. You can view the details here.</p>
      </div>
      <CalendarClock className="h-10 w-10 text-[#0F1F3D]" />
    </header>

    {error && <section className="flex flex-col gap-3 border border-[#E7BDB4] bg-[#FDF4F2] p-5 sm:flex-row sm:items-center sm:justify-between">
      <span className="flex items-center gap-2 text-sm text-[#9A3B2A]"><AlertCircle className="h-4 w-4" />{error}</span>
      <button onClick={load} className="self-start border border-[#9A3B2A] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9A3B2A]">Retry</button>
    </section>}

    <section className="flex flex-col gap-3 border border-[#DCE5EF] bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-[#4C6E93]">Need a different date or time? Only the Front Desk can move a visit.</p>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setShowContact((v) => !v)} className="inline-flex items-center gap-2 border border-[#0F1F3D] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0F1F3D]">
          <Phone className="h-3.5 w-3.5" />Contact Front Desk
        </button>
        <button onClick={load} className="inline-flex items-center gap-2 border border-[#C9D8E8] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5A769A]">Refresh</button>
      </div>
    </section>

    {showContact && <section className="border border-[#C9D8E8] bg-[#F6F9FC] px-5 py-4 text-sm text-[#4C6E93]">
      The Front Desk counter is open <strong className="font-semibold text-[#0F1F3D]">Monday to Saturday, 9:00 AM – 6:00 PM</strong> (closed Sundays). Please call or visit the shop and our staff will adjust, cancel or re-book your visit for you.
    </section>}

    {!appointments.length
      ? <section className="border border-[#DCE5EF] bg-white p-10 text-center text-sm text-[#4C6E93]">{error ? 'Your appointments could not be loaded. Use Retry above.' : 'No fitting or pickup visit has been confirmed yet. Front Desk will notify you once your garment is ready — you may also visit or call the shop for an update.'}</section>
      : <section className="divide-y divide-[#DCE5EF] border border-[#DCE5EF] bg-white">
        {appointments.map((appointment) => renderVisit(appointment, openId, setOpenId))}
      </section>}

    <p className="text-center text-[11px] text-[#5A769A]">Front Desk schedules and confirms every visit after coordinating with the workshop. You will receive a notification once a visit is confirmed.</p>
  </div>;
}

// One visit: type, date, time, status and assigned tailor, with an expandable
// "View appointment details" panel (notes included). Read-only by design.
function renderVisit(appointment: Appointment, openId: number | null, setOpenId: (id: number | null) => void) {
  const date = new Date(appointment.appointment_at);
  const valid = !Number.isNaN(date.getTime());
  const open = openId === appointment.id;
  return <article key={appointment.id} className="p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-5">
        <div className="border-r border-[#DCE5EF] pr-5 text-center">
          <span className="block text-2xl font-bold text-[#0F1F3D]">{valid ? date.getDate() : '—'}</span>
          <span className="text-[10px] uppercase tracking-[0.15em] text-[#5A769A]">{valid ? date.toLocaleDateString(undefined, { month: 'short' }) : 'TBA'}</span>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-[0.16em] text-[#5A769A]">{appointment.appointment_number || appointment.job_card_number}</span>
          <h2 className="mt-1 text-lg font-bold text-[#0F1F3D]">{appointment.appointment_type}</h2>
          <p className="text-sm text-[#4C6E93]">{valid ? date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Date to be confirmed'}{appointment.garment ? ` · ${appointment.garment}` : ''}</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-[#5A769A]"><MapPin className="h-3.5 w-3.5" />Please visit the shop at your scheduled time.</p>
        </div>
      </div>
      <div className="flex flex-col items-start gap-2 sm:items-end">
        <span className="border border-[#C7DDD3] bg-[#EDF5F0] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#39705B]">{appointment.status}</span>
        <button onClick={() => setOpenId(open ? null : appointment.id)} className="inline-flex items-center gap-2 border border-[#C9D8E8] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0F1F3D]">
          {open ? 'Hide details' : 'View appointment details'}<ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </div>
    {open && <dl className="mt-4 grid gap-3 border-t border-[#DCE5EF] pt-4 sm:grid-cols-2">
      <div><dt className="text-[10px] uppercase tracking-[0.16em] text-[#5A769A]">Appointment type</dt><dd className="text-sm text-[#0F1F3D]">{appointment.appointment_type}</dd></div>
      <div><dt className="text-[10px] uppercase tracking-[0.16em] text-[#5A769A]">Date and time</dt><dd className="text-sm text-[#0F1F3D]">{valid ? date.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' }) : 'To be confirmed'}</dd></div>
      <div><dt className="text-[10px] uppercase tracking-[0.16em] text-[#5A769A]">Status</dt><dd className="text-sm text-[#0F1F3D]">{appointment.status}</dd></div>
      <div><dt className="text-[10px] uppercase tracking-[0.16em] text-[#5A769A]">Job card</dt><dd className="text-sm text-[#0F1F3D]">{appointment.job_card_number}</dd></div>
      <div><dt className="text-[10px] uppercase tracking-[0.16em] text-[#5A769A]">Assigned tailor</dt><dd className="text-sm text-[#0F1F3D]">{appointment.assigned_tailor_name || 'Assigned by the shop'}</dd></div>
      <div><dt className="text-[10px] uppercase tracking-[0.16em] text-[#5A769A]">Notes</dt><dd className="text-sm text-[#0F1F3D]">{appointment.notes || '—'}</dd></div>
    </dl>}
  </article>;
}

export default CustomerAppointmentsView;
