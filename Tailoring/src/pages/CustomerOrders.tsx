// pages/CustomerOrders.tsx
//
// My Orders — the customer-facing order studio, connected LIVE to the server:
// - Orders come from GET /api/auth/customer/dashboard (job card number,
//   garment, fabric, production stage, estimated ready date, balance).
// - Upcoming fitting visits come from that same payload and are pinned onto
//   their matching job card.
// - The customer's body measurements come from GET /api/measurements/mine
//   (Server/routes/frontDeskRoutes/measurements.js) — the measurements each
//   garment is being cut against. A customer can only ever read their own.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ChevronRight, Loader2, PackageCheck, Ruler, X } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function authToken(): string {
  return localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';
}

interface CustomerOrder {
  id: string;
  garment: string;
  fabric: string | null;
  stage: string;
  estimated_ready: string | null;
  balance: number | string;
}

interface UpcomingVisit {
  job_card_number: string | null;
  appointment_at: string;
  appointment_type: string;
}

interface MeasurementRow {
  label: string;
  value: string;
  updated_at?: string;
}

function formatPeso(value: number | string): string {
  const n = Number(value || 0);
  return `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value: string | null): string {
  if (!value) return 'To be scheduled';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 'To be scheduled' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function CustomerOrdersView() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [visits, setVisits] = useState<UpcomingVisit[]>([]);
  const [measurements, setMeasurements] = useState<MeasurementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<CustomerOrder | null>(null);

  const loadData = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    try {
      const response = await fetch(`${API_URL}/auth/customer/dashboard`, {
        headers: { Authorization: `Bearer ${authToken()}` },
      });
      if (response.status === 401) throw new Error('Your session has expired — please sign in again.');
      if (!response.ok) throw new Error('Unable to load your orders right now.');
      const data = await response.json();
      setOrders(Array.isArray(data.orders) ? data.orders : []);
      setVisits(Array.isArray(data.appointments) ? data.appointments : []);

      // The measurements this customer's garments are being cut against.
      const mineResponse = await fetch(`${API_URL}/measurements/mine`, {
        headers: { Authorization: `Bearer ${authToken()}` },
      });
      if (mineResponse.ok) {
        const mine = await mineResponse.json();
        if (Array.isArray(mine.measurements)) setMeasurements(mine.measurements);
      }
      if (!silent) setError('');
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : 'Unable to load your orders.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime: when another order is placed for this customer at the front
  // desk, it appears here automatically — no manual reload needed.
  useEffect(() => {
    const id = setInterval(() => { loadData({ silent: true }); }, 10000);
    return () => clearInterval(id);
  }, [loadData]);

  // Next upcoming visit per job card, pinned onto its order card.
  const nextVisitByJob = useMemo(() => {
    const map = new Map<string, UpcomingVisit>();
    visits.forEach((v) => {
      if (v.job_card_number && !map.has(v.job_card_number)) map.set(v.job_card_number, v);
    });
    return map;
  }, [visits]);

  return (
    <div className="space-y-6">
      <header className="border-b-4 border-[#D8A927] bg-[#0F1F3D] p-7 text-white">
        <Tag>Order studio</Tag>
        <h1 className="mt-1 text-4xl font-bold" style={{ fontFamily: "'Big Shoulders Display', sans-serif" }}>My Orders</h1>
        <p className="mt-2 text-sm text-[#C7D6EB]">Follow each garment from the first measurement to final pickup.</p>
      </header>

      {loading && (
        <div className="flex items-center justify-center gap-3 rounded-lg border border-[#DCE5EF] bg-white py-16 text-sm text-[#4C6E93]">
          <Loader2 className="h-5 w-5 animate-spin text-[#D8A927]" /> Loading your orders…
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center gap-2 rounded-lg border border-[#E4B7A8] bg-[#FDF3EF] px-4 py-3 text-sm text-[#9A3B2A]">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
        </div>
      )}

      {!loading && !error && !orders.length && (
        <div className="rounded-lg border border-dashed border-[#9DB1CB] bg-white p-12 text-center">
          <PackageCheck className="mx-auto h-8 w-8 text-[#9DB1CB]" />
          <p className="mt-3 text-sm font-medium text-[#0F1F3D]">No orders yet.</p>
          <p className="mt-1 text-sm text-[#4C6E93]">Visit the front desk to place your first garment order.</p>
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <>
          {measurements.length > 0 && (
            <section className="border border-dashed border-[#9DB1CB] bg-white p-5">
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4 text-[#D8A927]" />
                <Tag>Your measurements on file</Tag>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {measurements.map((m) => (
                  <span key={m.label} className="border border-[#DCE5EF] bg-[#F8FBFF] px-3 py-1.5 text-xs font-medium text-[#0F1F3D]">
                    {m.label}: <span className="font-bold">{m.value}</span>
                  </span>
                ))}
              </div>
            </section>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {orders.map((order) => {
              const visit = nextVisitByJob.get(order.id);
              return (
                <button key={order.id} onClick={() => setSelected(order)} className="border border-dashed border-[#9DB1CB] bg-white p-6 text-left shadow-sm hover:border-[#0F1F3D]">
                  <Tag>{order.id}</Tag>
                  <h2 className="mt-3 text-2xl font-bold text-[#0F1F3D]" style={{ fontFamily: "'Big Shoulders Display', sans-serif" }}>{order.garment}</h2>
                  <p className="mt-1 text-sm text-[#4C6E93]">{order.fabric || 'Fabric not specified'}</p>
                  {visit && (
                    <p className="mt-3 inline-block bg-[#FFF7E3] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8A6618]">
                      Next visit: {visit.appointment_type} · {formatDateTime(visit.appointment_at)}
                    </p>
                  )}
                  <div className="mt-6 flex items-center justify-between border-t border-[#DCE5EF] pt-4">
                    <div>
                      <Tag>Production stage</Tag>
                      <p className="mt-1 text-sm font-semibold text-[#0F1F3D]">{order.stage}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-[#D8A927]" />
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button onClick={() => setSelected(null)} className="absolute inset-0 bg-[#0F1F3D]/70" />
          <section className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto border-t-4 border-[#D8A927] bg-white p-7 shadow-2xl">
            <button onClick={() => setSelected(null)} className="absolute right-5 top-5"><X className="h-5 w-5" /></button>
            <Tag>Order details</Tag>
            <h2 className="mt-2 text-3xl font-bold text-[#0F1F3D]" style={{ fontFamily: "'Big Shoulders Display', sans-serif" }}>{selected.id}</h2>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {([
                ['Garment', selected.garment],
                ['Fabric', selected.fabric || 'Not specified'],
                ['Current stage', selected.stage],
                ['Estimated ready', formatDate(selected.estimated_ready)],
              ] as [string, string][]).map(([label, value]) => (
                <Detail key={label} label={label} value={value} />
              ))}
            </div>

            {measurements.length > 0 && (
              <div className="mt-5 border border-[#DCE5EF] bg-[#F8FBFF] p-4">
                <div className="flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-[#D8A927]" />
                  <Tag>Measurements used for this garment</Tag>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {measurements.map((m) => (
                    <div key={m.label} className="bg-white px-3 py-2">
                      <Tag>{m.label}</Tag>
                      <p className="text-sm font-bold text-[#0F1F3D]">{m.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="mt-5 flex items-center gap-2 text-sm font-medium text-[#0F1F3D]">
              <PackageCheck className="h-4 w-4 text-[#D8A927]" />
              {Number(selected.balance) > 0 ? `${formatPeso(selected.balance)} remaining balance` : 'Paid in full'}
            </p>
          </section>
        </div>
      )}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] uppercase tracking-[0.2em] text-[#5A769A]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{children}</span>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="border border-[#DCE5EF] bg-[#F8FBFF] p-3"><Tag>{label}</Tag><p className="mt-1 text-sm font-medium text-[#0F1F3D]">{value}</p></div>;
}

export default CustomerOrdersView;