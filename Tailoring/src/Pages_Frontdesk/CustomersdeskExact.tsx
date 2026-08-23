// Pages_Frontdesk/CustomersdeskExact.tsx
import { useMemo, useState, useEffect, useCallback } from 'react';
import { ChevronRight, Mail, MapPin, Phone, Ruler, Search, UserPlus, X, Loader2 } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import frontDeskApi, { type Customer } from '../../services/frontDeskApi';
// Pages_Frontdesk/CustomersdeskExact.tsx
import { RegisterCustomerModal, type NewCustomerForm } from '../pages/FrontDesk/FrontDeskModals';

function MonoLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] uppercase tracking-[0.22em] text-[#8C7E74]" style={{ fontFamily: "'Space Mono', monospace" }}>{children}</span>;
}

function Metric({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'good' | 'warn' }) {
  const toneClass = tone === 'good' ? 'text-[#4E7357]' : tone === 'warn' ? 'text-[#9E5B4B]' : 'text-[#2A211D]';
  return <div className="dash-card rounded-xl p-5"><div className={`text-2xl ${toneClass}`} style={{ fontFamily: "'DM Serif Display', serif" }}>{value}</div><MonoLabel>{label}</MonoLabel></div>;
}

interface MeasurementRow { id?: number | string; label: string; value: string; updated_at?: string; }

function safeDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// Lightbox that shows the outfit photograph attached to a specific job card.
function OrderPhotoModal({
  order,
  onClose,
}: {
  order: { id: string; garment: string; stage: string; image?: string };
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-[#1F1916]/50 backdrop-blur-sm" onClick={onClose} />
      <div className="cd-fade relative w-full max-w-2xl bg-[#FFFCF8] border border-[#E2D7C7] rounded-xl shadow-2xl overflow-hidden">
        <button onClick={onClose} className="absolute right-4 top-4 z-10 rounded-full bg-[#1F1916]/60 p-2 text-white hover:bg-[#1F1916]/80 transition-colors">
          <X className="h-5 w-5" />
        </button>

        <div className="px-7 pt-7 pb-5">
          <MonoLabel>Job card photo</MonoLabel>
          <h3 className="mt-1 text-2xl text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>
            {order.garment}
          </h3>
          <div className="mt-1 text-sm text-[#766A62]" style={{ fontFamily: "'Space Mono', monospace" }}>{order.id}</div>
        </div>

        <div className="px-7 pb-7">
          {order.image ? (
            <div className="rounded-lg border border-[#E8DFD3] bg-[#FCFAF7] p-2">
              <img
                src={order.image}
                alt={`${order.garment} — ${order.id}`}
                className="mx-auto max-h-[52vh] w-auto rounded-md object-contain"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#E2D7C7] bg-[#FCFAF7] py-12 text-center">
              <div className="text-3xl opacity-60" style={{ fontFamily: "'DM Serif Display', serif" }}>{order.garment[0] || '?'}</div>
              <p className="mt-3 text-sm text-[#766A62]">No photo uploaded for this job card.</p>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between border-t border-[#E8DFD3] pt-4">
            <MonoLabel>Stage</MonoLabel>
            <span className="text-sm font-medium text-[#2A211D]">{order.stage}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomerDetails({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const [measurements, setMeasurements] = useState<MeasurementRow[]>([]);
  const [recentOrders, setRecentOrders] = useState<{ id: string; garment: string; stage: string; image?: string }[]>([]);
  const [barsIn, setBarsIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewingOrder, setViewingOrder] = useState<{ id: string; garment: string; stage: string; image?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Measurements are stored as label/value rows; orders share the same
        // CUS-xxxxx id as the customer record.
        const [meas, allOrders] = await Promise.all([
          frontDeskApi.getCustomerMeasurements(customer.customer_id),
          frontDeskApi.getAllOrders(),
        ]);
        if (cancelled) return;
        setMeasurements(Array.isArray(meas) ? (meas as unknown as MeasurementRow[]) : []);
        setRecentOrders(
          allOrders
            .filter((o) => String(o.customer_id) === String(customer.customer_id))
            .slice(0, 4)
            .map((o) => ({ id: o.job_card_id, garment: o.garment_type, stage: o.production_status, image: o.reference_image || undefined }))
        );
      } catch (err) {
        console.error('Failed to load customer details:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    const t = setTimeout(() => setBarsIn(true), 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [customer.customer_id]);

  // Radar graph: every saved measurement plotted around the silhouette.
  const radarData = useMemo(
    () => measurements.map((m) => ({ label: m.label, value: Number.parseFloat(String(m.value)) || 0 })),
    [measurements]
  );
  const maxValue = useMemo(() => Math.max(1, ...radarData.map((d) => d.value)), [radarData]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <style>{`@keyframes cdFade{from{opacity:0}to{opacity:1}}@keyframes cdPop{from{opacity:0;transform:translateY(16px) scale(.96)}to{opacity:1;transform:none}}.cd-fade{animation:cdFade .22s ease-out both}.cd-pop{animation:cdPop .42s cubic-bezier(.22,1,.36,1) both}`}</style>
      <button onClick={onClose} aria-label="Close customer details" className="cd-fade absolute inset-0 bg-[#1F1916]/45 backdrop-blur-sm" />
      <section className="cd-pop relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-[#E2D7C7] bg-[#FFFCF8] shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-[#E8DFD3] p-6">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#A46B48] to-[#8C6F3E] text-lg font-semibold text-white shadow-md">
              {customer.full_name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
            </span>
            <div>
              <MonoLabel>Customer profile</MonoLabel>
              <h2 className="mt-1 text-3xl text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>{customer.full_name}</h2>
              <p className="mt-1 flex items-center gap-2 text-xs text-[#8C7E74]">
                {customer.customer_id}
                <span className={`inline-block rounded-md border px-2 py-0.5 text-[9px] uppercase tracking-[0.08em] ${customer.status === 'Active' ? 'border-[#B9DDD0] bg-[#E7F4EE] text-[#277257]' : 'border-[#ECD8A7] bg-[#FFF7E3] text-[#8A6618]'}`}>
                  {customer.status}
                </span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#766A62]"><X className="h-5 w-5" /></button>
        </header>

        <div className="grid gap-7 p-6 sm:grid-cols-[0.85fr_1.15fr]">
          {/* Contact + live job cards */}
          <div className="cd-pop space-y-3 rounded-xl bg-[#F8F3EB] p-5 text-sm text-[#5E5048]" style={{ animationDelay: '90ms' }}>
            <p className="flex gap-2"><Mail className="h-4 w-4 text-[#A46B48]" />{customer.email}</p>
            <p className="flex gap-2"><Phone className="h-4 w-4 text-[#A46B48]" />{customer.contact_number}</p>
            <p className="flex gap-2"><MapPin className="h-4 w-4 shrink-0 text-[#A46B48]" />{customer.address || 'Not set'}</p>
            <div className="border-t border-[#E2D7C7] pt-4">
              <MonoLabel>Job cards ({recentOrders.length})</MonoLabel>
              <div className="mt-2 space-y-2">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#8C6F3E]" />
                ) : recentOrders.length ? (
                  recentOrders.map((o, i) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setViewingOrder(o)}
                      className="cd-pop block w-full rounded-lg border border-[#E2D7C7] bg-white px-3 py-2 text-left transition-colors hover:border-[#A46B48] hover:bg-[#FFFCF8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A46B48]/40"
                      style={{ animationDelay: `${160 + i * 70}ms` }}
                    >
                      <div className="mono text-[10px] text-[#A3958B]">{o.id}</div>
                      <div className="text-[12.5px] font-medium text-[#2A211D]">{o.garment}</div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="inline-block rounded bg-[#FFF7E3] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-[#8A6618]">{o.stage}</span>
                        <span className="ml-2 inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.06em] text-[#A46B48]">View photo <ChevronRight className="h-3 w-3" /></span>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-[#A3958B]">No job cards yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Measurement radar + animated bars */}
          <div>
            <div className="flex items-center gap-2">
              <Ruler className="h-4 w-4 text-[#A46B48]" />
              <h3 className="text-lg text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>Measurement profile</h3>
            </div>
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-[#8C6F3E]" /></div>
            ) : radarData.length ? (
              <>
                <div className="cd-pop mt-3 h-56 rounded-xl border border-[#E2D7C7] bg-white p-2" style={{ animationDelay: '120ms' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} outerRadius="70%">
                      <PolarGrid stroke="#ECE3D8" />
                      <PolarAngleAxis dataKey="label" tick={{ fill: '#8C7E74', fontSize: 10, fontFamily: 'Space Mono, monospace' }} />
                      <Radar dataKey="value" stroke="#A46B48" strokeWidth={2} fill="#A46B48" fillOpacity={0.32} animationDuration={900} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2.5">
                  {radarData.map((m, i) => (
                    <div key={m.label} className="cd-pop" style={{ animationDelay: `${180 + i * 60}ms` }}>
                      <div className="flex items-baseline justify-between text-[11px]">
                        <span className="font-medium uppercase tracking-[0.08em] text-[#5E5048]">{m.label}</span>
                        <span className="mono text-[#2A211D]">{m.value}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#EFE7DB]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#C9A15C] to-[#8C6F3E] transition-all duration-700 ease-out"
                          style={{ width: barsIn ? `${Math.min(100, (m.value / maxValue) * 100)}%` : '0%', transitionDelay: `${i * 60}ms` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[10px] text-[#A3958B]">Last updated {safeDate(measurements[0]?.updated_at)}</p>
              </>
            ) : (
              <p className="mt-3 text-sm text-[#766A62]">No measurements recorded yet.</p>
            )}
          </div>
        </div>
      </section>

      {viewingOrder && (
        <OrderPhotoModal order={viewingOrder} onClose={() => setViewingOrder(null)} />
      )}
    </div>
  );
}

export function FrontDeskCustomersExactView() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orderCounts, setOrderCounts] = useState<Record<string, number>>({});
  const [query, setQuery] = useState('');
  const [registerOpen, setRegisterOpen] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const loadCustomers = useCallback(async (searchQuery: string = '') => {
    setSearching(true);
    try {
      const results = await frontDeskApi.searchCustomers(searchQuery || '');
      setCustomers(results);
    } catch (err) {
      console.error('Failed to load customers:', err);
      setNotice('Failed to load customers. Please try again.');
      setTimeout(() => setNotice(''), 4000);
    } finally {
      setSearching(false);
      setLoading(false);
    }
  }, []);

  // Real order counts per customer — orders carry the SAME CUS-xxxxx id as
  // the customer records, so we tally them client-side from /api/orders.
  const loadOrderCounts = useCallback(async () => {
    try {
      const allOrders = await frontDeskApi.getAllOrders();
      const counts: Record<string, number> = {};
      allOrders.forEach((o) => {
        const key = String(o.customer_id);
        counts[key] = (counts[key] || 0) + 1;
      });
      setOrderCounts(counts);
    } catch (err) {
      console.error('Failed to load order counts:', err);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
    loadOrderCounts();
  }, [loadCustomers, loadOrderCounts]);

  // Realtime: when another order is placed at the front desk, the per-customer
  // counts refresh automatically — no manual reload needed.
  useEffect(() => {
    const id = setInterval(loadOrderCounts, 10000);
    return () => clearInterval(id);
  }, [loadOrderCounts]);

  const filtered = useMemo(() => {
    if (!query.trim()) return customers;
    const q = query.toLowerCase();
    return customers.filter((c) => 
      c.full_name.toLowerCase().includes(q) ||
      c.customer_id.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.contact_number.includes(q)
    );
  }, [customers, query]);

  const active = customers.filter((c) => c.status === 'Active').length;
  const pending = customers.filter((c) => c.status === 'Pending approval').length;

  const donutData = useMemo(() => [
    { name: 'Active', value: active || 0.0001, color: '#4E7357' },
    { name: 'Pending approval', value: pending || 0.0001, color: '#ECD8A7' },
  ], [active, pending]);

  const registerCustomer = async (form: NewCustomerForm) => {
    try {
      const newCustomer = await frontDeskApi.registerCustomer({
        firstName: form.firstName,
        middleName: form.middleName,
        lastName: form.lastName,
        suffix: form.suffix,
        email: form.email,
        contactNumber: form.contact,
        address: form.address,
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        civilStatus: form.civilStatus,
        occupation: form.occupation,
        password: form.password,
      });
      const fullName = [form.firstName, form.middleName, form.lastName].filter(Boolean).join(' ') + (form.suffix ? `, ${form.suffix}` : '');
      setCustomers((prev) => [newCustomer, ...prev]);
      setRegisterOpen(false);
      setNotice(`${fullName}'s account was submitted for Admin approval.`);
      setTimeout(() => setNotice(''), 4000);
    } catch (err) {
      throw err;
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
          <MonoLabel>Customer records</MonoLabel>
          <h1 className="mt-1 text-2xl sm:text-3xl text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>Customers</h1>
          <p className="mt-2 text-sm text-[#766A62]">Register customers, manage profiles, and view saved measurements.</p>
        </div>
        <button onClick={() => setRegisterOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-[#2A211D] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white shadow-[0_10px_26px_-14px_rgba(42,33,29,0.55)] hover:bg-[#47382F]">
          <UserPlus className="h-4 w-4" /> Register customer
        </button>
      </div>

      {notice && (
        <div className="dash-in rounded-lg border border-[#8B9E87]/40 bg-[#F1F5F0] px-4 py-3 text-sm text-[#4E7357] shadow-sm">
          {notice}
        </div>
      )}

      <div className="dash-in grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.15fr]">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
          <Metric label="Total customers" value={customers.length} />
          <Metric label="Active accounts" value={active} tone="good" />
          <Metric label="Pending approval" value={pending} tone={pending ? 'warn' : 'default'} />
        </div>
        <div className="dash-card rounded-xl p-6 sm:p-7">
          <div className="flex items-start justify-between gap-3 mb-1">
            <div><MonoLabel>Account book</MonoLabel><h2 className="text-xl font-normal mt-0.5 text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>Roster status</h2></div>
          </div>
          <p className="text-[12.5px] text-[#8C7E74] mb-4">Approved vs pending customer accounts</p>
          <div className="flex items-center gap-6">
            <div className="relative h-28 w-28 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={34} outerRadius={52} paddingAngle={3} stroke="none">
                    {donutData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>{customers.length}</span>
                <span className="text-[8.5px] uppercase tracking-[0.12em] text-[#A3958B]">Total</span>
              </div>
            </div>
            <ul className="flex-1 space-y-2.5">
              <li className="flex items-center justify-between text-[12.5px]">
                <span className="flex items-center gap-2 text-[#5E5048]"><span className="h-2 w-2 rounded-full bg-[#4E7357]" />Active</span>
                <span className="font-medium text-[#2A211D]" style={{ fontFamily: "'Space Mono', monospace" }}>{active}</span>
              </li>
              <li className="flex items-center justify-between text-[12.5px]">
                <span className="flex items-center gap-2 text-[#5E5048]"><span className="h-2 w-2 rounded-full bg-[#ECD8A7]" />Pending approval</span>
                <span className="font-medium text-[#2A211D]" style={{ fontFamily: "'Space Mono', monospace" }}>{pending}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <section className="dash-card overflow-hidden rounded-xl">
        <div className="flex flex-col gap-4 border-b border-[#E8DFD3] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A3958B]" />
            <input 
              value={query} 
              onChange={(event) => {
                setQuery(event.target.value);
                if (event.target.value.length > 2) {
                  loadCustomers(event.target.value);
                } else if (event.target.value.length === 0) {
                  loadCustomers();
                }
              }} 
              placeholder="Search name, ID, email, or contact" 
              className="w-full rounded-lg border border-[#E2D7C7] bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#A46B48]" 
            />
          </div>
          <span className="text-xs text-[#8C7E74]">{filtered.length} customer{filtered.length === 1 ? '' : 's'}</span>
        </div>

        {searching ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#8C6F3E]" /></div>
        ) : (
          <>
            {filtered.map((customer) => (
              <button key={customer.customer_id} onClick={() => setSelected(customer)} className="grid w-full grid-cols-1 gap-2 border-b border-[#F0EAE2] px-6 py-4 text-left hover:bg-[#FCFAF7] md:grid-cols-[1.3fr_1.2fr_0.8fr_0.8fr_24px] md:items-center md:gap-4">
                <div>
                  <div className="font-medium text-[#2A211D]">{customer.full_name}</div>
                  <MonoLabel>{customer.customer_id}</MonoLabel>
                </div>
                <div className="text-sm text-[#5E5048]">
                  {customer.contact_number}
                  <span className="hidden lg:block text-xs text-[#8C7E74]">{customer.email}</span>
                </div>
                <span className="text-sm text-[#2A211D]">{orderCounts[customer.customer_id] || 0} order{((orderCounts[customer.customer_id] || 0) === 1) ? '' : 's'}</span>
                <span className={`inline-block w-fit rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.08em] ${customer.status === 'Active' ? 'border-[#B9DDD0] bg-[#E7F4EE] text-[#277257]' : 'border-[#ECD8A7] bg-[#FFF7E3] text-[#8A6618]'}`}>
                  {customer.status}
                </span>
                <ChevronRight className="hidden h-4 w-4 text-[#A46B48] md:block" />
              </button>
            ))}
            {!filtered.length && <p className="p-12 text-center text-sm text-[#766A62]">No customer matches your search.</p>}
          </>
        )}
      </section>

      {registerOpen && (
        <RegisterCustomerModal onClose={() => setRegisterOpen(false)} onRegister={registerCustomer} />
      )}
      {selected && <CustomerDetails customer={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

export default FrontDeskCustomersExactView;