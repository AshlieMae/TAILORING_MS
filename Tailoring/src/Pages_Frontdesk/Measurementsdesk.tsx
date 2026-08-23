// Pages_Frontdesk/Measurementsdesk.tsx
import { useMemo, useState, useEffect, useCallback } from 'react';
import { Check, ChevronDown, ChevronRight, Package, Ruler, Search, X, Loader2 } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import frontDeskApi, { type Customer, type Order } from '../../services/frontDeskApi';

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] uppercase tracking-[0.2em] text-[#8C7E74]" style={{ fontFamily: "'Space Mono', monospace" }}>{children}</span>;
}

function Metric({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'warn' }) {
  const toneClass = tone === 'warn' ? 'text-[#9E5B4B]' : 'text-[#2A211D]';
  return <div className="dash-card rounded-xl p-5"><div className={`text-2xl ${toneClass}`} style={{ fontFamily: "'DM Serif Display', serif" }}>{value}</div><Label>{label}</Label></div>;
}

const MEASUREMENT_FIELDS = ['Chest', 'Waist', 'Hip', 'Shoulder', 'Sleeve', 'Neck', 'Inseam'];

// The measurements table stores ONE ROW PER BODY PART: { label, value,
// updated_at } — not wide columns like chest/waist or a measurement_date.
interface MeasurementRow { id?: number | string; label: string; value: string; updated_at?: string; }

function safeDate(value?: string): string {
  if (!value) return 'Never';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 'Never' : d.toLocaleDateString();
}

/** Convert label/value rows into { Chest: '36', Waist: '29', ... } */
function rowsToValues(rows: MeasurementRow[]): Record<string, string> {
  const map: Record<string, string> = {};
  rows.forEach((row) => {
    const field = MEASUREMENT_FIELDS.find((f) => f.toLowerCase() === String(row.label).toLowerCase());
    if (field && row.value !== null && row.value !== undefined && row.value !== '') map[field] = String(row.value);
  });
  return map;
}

function formatPeso(value: number | string): string {
  const n = Number(value || 0);
  return `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value?: string | null): string {
  if (!value) return 'To be scheduled';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 'To be scheduled' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function MeasurementEditor({ 
  customer, 
  existingMeasurements, 
  onClose, 
  onSave 
}: { 
  customer: Customer; 
  existingMeasurements: MeasurementRow[];
  onClose: () => void; 
  onSave: (data: any) => Promise<void>;
}) {
  const [values, setValues] = useState<Record<string, string>>(
    () => ({ ...Object.fromEntries(MEASUREMENT_FIELDS.map(f => [f, ''])), ...rowsToValues(existingMeasurements) })
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    
    const measurementData = {
      customerId: customer.customer_id,
      chest: values.Chest ? parseFloat(values.Chest) : null,
      waist: values.Waist ? parseFloat(values.Waist) : null,
      hip: values.Hip ? parseFloat(values.Hip) : null,
      sleeve: values.Sleeve ? parseFloat(values.Sleeve) : null,
      inseam: values.Inseam ? parseFloat(values.Inseam) : null,
      shoulder: values.Shoulder ? parseFloat(values.Shoulder) : null,
      neck: values.Neck ? parseFloat(values.Neck) : null,
      measurementDate: new Date().toISOString().split('T')[0],
      notes: 'Recorded at front desk',
      isSnapshot: false,
    };

    try {
      await onSave(measurementData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save measurements.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button onClick={onClose} className="absolute inset-0 bg-[#1F1916]/45 backdrop-blur-sm" />
      <form onSubmit={handleSubmit} className="relative w-full max-w-2xl rounded-xl border border-[#E2D7C7] bg-[#FFFCF8] p-7 shadow-2xl max-h-[92vh] overflow-y-auto">
        <button type="button" onClick={onClose} className="absolute right-5 top-5 text-[#766A62]"><X className="h-5 w-5" /></button>
        <Label>Record measurements</Label>
        <h2 className="mt-1 text-3xl text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>{customer.full_name}</h2>
        <p className="mt-2 text-sm text-[#766A62]">Enter measurements in inches. Leave blank for not measured.</p>
        
        {error && <div className="mt-4 border border-[#C86A58]/30 bg-[#FDF4F2] px-4 py-3 rounded-lg text-sm text-[#9A3B2A]">{error}</div>}

        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          {MEASUREMENT_FIELDS.map((label) => (
            <label key={label} className="block text-xs font-medium text-[#5E5048]">
              {label}
              <div className="mt-2 flex rounded-lg border border-[#E2D7C7] bg-white focus-within:border-[#A46B48]">
                <input 
                  inputMode="decimal" 
                  value={values[label] || ''} 
                  onChange={(e) => setValues((current) => ({ ...current, [label]: e.target.value }))} 
                  placeholder="0" 
                  className="w-full rounded-l-lg bg-transparent px-3 py-2.5 text-sm outline-none" 
                />
                <span className="border-l border-[#E2D7C7] px-3 py-2.5 text-xs text-[#8C7E74]">in</span>
              </div>
            </label>
          ))}
        </div>

        <div className="mt-7 flex gap-3">
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#2A211D] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white disabled:opacity-50">
            <Ruler className="h-4 w-4" /> {saving ? 'Saving...' : 'Save measurements'}
          </button>
          <button type="button" onClick={onClose} className="rounded-lg border border-[#E2D7C7] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5E5048]">Cancel</button>
        </div>
      </form>
    </div>
  );
}

function ProfileDetails({ 
  customer, 
  measurements, 
  onClose, 
  onEdit 
}: { 
  customer: Customer; 
  measurements: MeasurementRow[];
  onClose: () => void; 
  onEdit: () => void;
}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [barsIn, setBarsIn] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // This customer's real job orders — they share the SAME CUS-xxxxx id.
        const all = await frontDeskApi.getAllOrders();
        if (!cancelled) setOrders(all.filter((o) => String(o.customer_id) === String(customer.customer_id)));
      } catch (err) {
        console.error('Failed to load orders:', err);
      } finally {
        if (!cancelled) setLoadingOrders(false);
      }
    })();
    const t = setTimeout(() => setBarsIn(true), 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [customer.customer_id]);

  const values = rowsToValues(measurements);
  const latest = measurements.length > 0 ? measurements[0] : null;

  // Radar graph: every saved measurement plotted around the silhouette.
  const radarData = useMemo(
    () => Object.entries(values).map(([label, v]) => ({ label, value: Number.parseFloat(v) || 0 })),
    [values]
  );
  const maxValue = useMemo(() => Math.max(1, ...radarData.map((d) => d.value)), [radarData]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <style>{`@keyframes pdFade{from{opacity:0}to{opacity:1}}@keyframes pdPop{from{opacity:0;transform:translateY(16px) scale(.96)}to{opacity:1;transform:none}}.pd-fade{animation:pdFade .22s ease-out both}.pd-pop{animation:pdPop .42s cubic-bezier(.22,1,.36,1) both}`}</style>
      <button onClick={onClose} className="pd-fade absolute inset-0 bg-[#1F1916]/45 backdrop-blur-sm" />
      <section className="pd-pop relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-[#E2D7C7] bg-[#FFFCF8] shadow-2xl">
        {/* Header */}
        <header className="flex items-start justify-between gap-3 border-b border-[#E8DFD3] p-6">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#A46B48] to-[#8C6F3E] text-lg font-semibold text-white shadow-md">
              {customer.full_name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
            </span>
            <div>
              <Label>Measurement profile</Label>
              <h2 className="mt-1 text-3xl text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>{customer.full_name}</h2>
              <p className="mt-1 text-xs text-[#8C7E74]">{customer.customer_id} · {customer.contact_number}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#766A62]"><X className="h-5 w-5" /></button>
        </header>

        <div className="grid gap-6 p-6 lg:grid-cols-2">
          {/* Radar graph + comparison bars */}
          <div className="pd-pop rounded-xl border border-[#E2D7C7] bg-white p-4" style={{ animationDelay: '90ms' }}>
            <div className="flex items-center gap-2">
              <Ruler className="h-4 w-4 text-[#A46B48]" />
              <h3 className="text-base text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>Body profile</h3>
            </div>
            {radarData.length ? (
              <>
                <div className="mt-2 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} outerRadius="70%">
                      <PolarGrid stroke="#ECE3D8" />
                      <PolarAngleAxis dataKey="label" tick={{ fill: '#8C7E74', fontSize: 10, fontFamily: 'Space Mono, monospace' }} />
                      <Radar dataKey="value" stroke="#A46B48" strokeWidth={2} fill="#A46B48" fillOpacity={0.32} animationDuration={900} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {radarData.map((m, i) => (
                    <div key={m.label} className="pd-pop" style={{ animationDelay: `${160 + i * 60}ms` }}>
                      <div className="flex items-baseline justify-between text-[11px]">
                        <span className="font-medium uppercase tracking-[0.08em] text-[#5E5048]">{m.label}</span>
                        <span className="text-[#2A211D]" style={{ fontFamily: "'Space Mono', monospace" }}>{m.value} in</span>
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
              </>
            ) : (
              <p className="py-10 text-center text-sm text-[#766A62]">No measurements recorded yet.</p>
            )}
          </div>

          {/* Value cards */}
          <div className="grid grid-cols-2 content-start gap-3">
            {MEASUREMENT_FIELDS.map((field, i) => (
              <div key={field} className="pd-pop rounded-xl border border-[#E2D7C7] bg-white p-3.5" style={{ animationDelay: `${120 + i * 55}ms` }}>
                <Label>{field}</Label>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className={`text-xl ${values[field] ? 'text-[#2A211D]' : 'text-[#C9BBA6]'}`} style={{ fontFamily: "'DM Serif Display', serif" }}>{values[field] || '—'}</span>
                  {values[field] && <span className="text-[10px] uppercase tracking-[0.08em] text-[#A3958B]">in</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Job orders — what kind of garments this customer has, clickable */}
        <div className="border-t border-[#E8DFD3] px-6 pb-6 pt-5">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-[#A46B48]" />
            <h3 className="text-base text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>Job orders ({orders.length})</h3>
            <span className="text-[11px] text-[#A3958B]">— click one to see its details</span>
          </div>
          <div className="mt-3 space-y-2">
            {loadingOrders ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-[#8C6F3E]" /></div>
            ) : orders.length ? (
              orders.map((order, i) => {
                const open = openOrderId === order.order_id;
                return (
                  <div key={order.order_id} className="pd-pop overflow-hidden rounded-lg border border-[#E2D7C7] bg-white" style={{ animationDelay: `${120 + i * 60}ms` }}>
                    <button type="button" onClick={() => setOpenOrderId(open ? null : order.order_id)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#FCFAF7]">
                      <span className="flex-shrink-0 text-[10px] text-[#A3958B]" style={{ fontFamily: "'Space Mono', monospace" }}>{order.job_card_id}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#2A211D]">{order.garment_type}</span>
                      <span className="inline-block flex-shrink-0 rounded bg-[#FFF7E3] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-[#8A6618]">{order.production_status}</span>
                      <ChevronDown className={`h-4 w-4 flex-shrink-0 text-[#A3958B] transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
                    </button>
                    {open && (
                      <div className="grid grid-cols-2 gap-3 border-t border-[#F0EAE2] bg-[#FCFAF7] px-4 py-3 sm:grid-cols-4">
                        {([
                          ['Fabric', order.fabric || 'Not specified'],
                          ['Estimated ready', formatDate(order.target_completion_date)],
                          ['Payment', order.payment_status],
                          ['Balance', Number(order.remaining_balance) > 0 ? formatPeso(order.remaining_balance) : 'Paid in full'],
                        ] as [string, string][]).map(([label, val]) => (
                          <div key={label}>
                            <Label>{label}</Label>
                            <div className="mt-0.5 text-[12.5px] font-medium text-[#2A211D]">{val}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="rounded-lg border border-dashed border-[#D9C8B7] bg-[#FCFAF7] p-4 text-center text-sm text-[#766A62]">No job orders yet for this customer.</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#E8DFD3] px-6 py-5">
          <span className="text-xs text-[#8C7E74]">Last updated: {safeDate(latest?.updated_at)}</span>
          <button onClick={onEdit} className="inline-flex items-center gap-2 rounded-lg bg-[#2A211D] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white transition-transform hover:-translate-y-0.5">
            <Ruler className="h-4 w-4" /> Update measurements
          </button>
        </div>
      </section>
    </div>
  );
}

export function FrontDeskMeasurementsView() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [measurements, setMeasurements] = useState<Record<string, MeasurementRow[]>>({});
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Customer | null>(null);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const customersData = await frontDeskApi.searchCustomers('');
      setCustomers(customersData);
      
      // Load measurements for each customer
      const measurementsMap: Record<string, MeasurementRow[]> = {};
      await Promise.all(
        customersData.map(async (c) => {
          try {
            const m = await frontDeskApi.getCustomerMeasurements(c.customer_id);
            measurementsMap[c.customer_id] = Array.isArray(m) ? (m as unknown as MeasurementRow[]) : [];
          } catch {
            measurementsMap[c.customer_id] = [];
          }
        })
      );
      setMeasurements(measurementsMap);
    } catch (err) {
      console.error('Failed to load data:', err);
      setNotice('Failed to load measurement data.');
      setTimeout(() => setNotice(''), 4000);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    if (!query.trim()) return customers;
    const q = query.toLowerCase();
    return customers.filter((c) =>
      c.full_name.toLowerCase().includes(q) ||
      c.customer_id.toLowerCase().includes(q) ||
      c.contact_number.includes(q)
    );
  }, [customers, query]);

  const complete = customers.filter(c => measurements[c.customer_id]?.length > 0).length;
  const needsMeasuring = customers.length - complete;

  const donutData = useMemo(() => [
    { name: 'Measured', value: complete || 0.0001, color: '#4E7357' },
    { name: 'Needs measuring', value: needsMeasuring || 0.0001, color: '#ECD8A7' },
  ], [complete, needsMeasuring]);

  const handleSaveMeasurements = async (data: any) => {
    // POST /api/measurements responds with the customer's FULL updated
    // label/value row set — replace the cached list with it.
    const updatedRows = await frontDeskApi.createMeasurement(data);
    setMeasurements(prev => ({
      ...prev,
      [data.customerId]: Array.isArray(updatedRows) ? (updatedRows as unknown as MeasurementRow[]) : (prev[data.customerId] || []),
    }));
    setEditing(null);
    setNotice(`Measurements saved for ${selected?.full_name || ''}.`);
    setTimeout(() => setNotice(''), 4000);
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
          <Label>Customer profiles</Label>
          <h1 className="mt-1 text-2xl text-[#2A211D] sm:text-3xl" style={{ fontFamily: "'DM Serif Display', serif" }}>Measurements</h1>
          <p className="mt-2 text-sm text-[#766A62]">Record and review body measurements for custom garments.</p>
        </div>
      </div>

      {notice && (
        <div className="dash-in flex items-center gap-2 rounded-lg border border-[#8B9E87]/40 bg-[#F1F5F0] px-4 py-3 text-sm text-[#4E7357] shadow-sm">
          <Check className="h-4 w-4" />{notice}
        </div>
      )}

      <div className="dash-in grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.15fr]">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
          <Metric label="Measured customers" value={complete} />
          <Metric label="Needs measuring" value={needsMeasuring} tone={needsMeasuring ? 'warn' : 'default'} />
        </div>
        <div className="dash-card rounded-xl p-6 sm:p-7">
          <Label>Profile coverage</Label>
          <h2 className="mt-0.5 mb-4 text-xl font-normal text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>Measurement completeness</h2>
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
                <span className="text-lg text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>{customers.length ? Math.round((complete / customers.length) * 100) : 0}%</span>
                <span className="text-[8.5px] uppercase tracking-[0.12em] text-[#A3958B]">Complete</span>
              </div>
            </div>
            <ul className="flex-1 space-y-2.5">
              <li className="flex items-center justify-between text-[12.5px]">
                <span className="flex items-center gap-2 text-[#5E5048]"><span className="h-2 w-2 rounded-full bg-[#4E7357]" />Measured</span>
                <span className="font-medium text-[#2A211D]" style={{ fontFamily: "'Space Mono', monospace" }}>{complete}</span>
              </li>
              <li className="flex items-center justify-between text-[12.5px]">
                <span className="flex items-center gap-2 text-[#5E5048]"><span className="h-2 w-2 rounded-full bg-[#ECD8A7]" />Needs measuring</span>
                <span className="font-medium text-[#2A211D]" style={{ fontFamily: "'Space Mono', monospace" }}>{needsMeasuring}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <section className="dash-in dash-card overflow-hidden rounded-xl">
        <div className="flex flex-col gap-4 border-b border-[#E8DFD3] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A3958B]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customer, ID, or contact" className="w-full rounded-lg border border-[#E2D7C7] bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#A46B48]" />
          </div>
          <span className="text-xs text-[#8C7E74]">{filtered.length} profile{filtered.length === 1 ? '' : 's'}</span>
        </div>

        <div className="hidden grid-cols-[1.25fr_1fr_0.9fr_24px] gap-4 border-b border-[#E8DFD3] bg-[#FCFAF7] px-6 py-3 md:grid">
          {['Customer', 'Last updated', 'Status', ''].map((label) => <Label key={label}>{label}</Label>)}
        </div>

        {filtered.map((customer) => {
          const customerMeasurements = measurements[customer.customer_id] || [];
          const hasMeasurements = customerMeasurements.length > 0;
          const lastUpdated = hasMeasurements ? safeDate(customerMeasurements[0]?.updated_at) : 'Not recorded';

          return (
            <button key={customer.customer_id} onClick={() => setSelected(customer)} className="grid w-full grid-cols-1 gap-2 border-b border-[#F0EAE2] px-6 py-4 text-left transition-colors hover:bg-[#FCFAF7] md:grid-cols-[1.25fr_1fr_0.9fr_24px] md:items-center md:gap-4">
              <div>
                <div className="font-medium text-[#2A211D]">{customer.full_name}</div>
                <span className="mt-1 block text-[11px] text-[#8C7E74]" style={{ fontFamily: "'Space Mono', monospace" }}>{customer.customer_id}</span>
              </div>
              <span className="text-sm text-[#5E5048]">{lastUpdated}</span>
              <span><span className={`inline-block rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.08em] ${hasMeasurements ? 'border-[#B9DDD0] bg-[#E7F4EE] text-[#277257]' : 'border-[#ECD8A7] bg-[#FFF7E3] text-[#8A6618]'}`}>
                {hasMeasurements ? 'Complete' : 'Needs measuring'}
              </span></span>
              <ChevronRight className="hidden h-4 w-4 text-[#A46B48] md:block" />
            </button>
          );
        })}
        {!filtered.length && <p className="p-12 text-center text-sm text-[#766A62]">No customer matches your search.</p>}
      </section>

      {selected && (
        <ProfileDetails 
          customer={selected} 
          measurements={measurements[selected.customer_id] || []}
          onClose={() => setSelected(null)} 
          onEdit={() => { setEditing(selected); setSelected(null); }}
        />
      )}
      {editing && (
        <MeasurementEditor 
          customer={editing} 
          existingMeasurements={measurements[editing.customer_id] || []}
          onClose={() => setEditing(null)} 
          onSave={handleSaveMeasurements}
        />
      )}
    </div>
  );
}

export default FrontDeskMeasurementsView;