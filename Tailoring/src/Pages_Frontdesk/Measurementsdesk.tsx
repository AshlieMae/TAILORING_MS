// Pages_Frontdesk/Measurementsdesk.tsx
import { useMemo, useState, useEffect, useCallback } from 'react';
import { Check, ChevronRight, Ruler, Search, X, Loader2 } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import frontDeskApi, { type Customer, type Measurement } from '../../services/frontDeskApi';

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] uppercase tracking-[0.2em] text-[#8C7E74]" style={{ fontFamily: "'Space Mono', monospace" }}>{children}</span>;
}

function Metric({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'warn' }) {
  const toneClass = tone === 'warn' ? 'text-[#9E5B4B]' : 'text-[#2A211D]';
  return <div className="dash-card rounded-xl p-5"><div className={`text-2xl ${toneClass}`} style={{ fontFamily: "'DM Serif Display', serif" }}>{value}</div><Label>{label}</Label></div>;
}

const MEASUREMENT_FIELDS = ['Chest', 'Waist', 'Hip', 'Shoulder', 'Sleeve', 'Neck', 'Inseam'];

function MeasurementEditor({ 
  customer, 
  existingMeasurements, 
  onClose, 
  onSave 
}: { 
  customer: Customer; 
  existingMeasurements: Measurement[];
  onClose: () => void; 
  onSave: (data: any) => Promise<void>;
}) {
  const latest = existingMeasurements.length > 0 ? existingMeasurements[0] : null;
  const [values, setValues] = useState<Record<string, string>>(() => {
    if (latest) {
      const map: Record<string, string> = {};
      MEASUREMENT_FIELDS.forEach(field => {
        const key = field.toLowerCase() as keyof Measurement;
        map[field] = latest[key] !== null && latest[key] !== undefined ? String(latest[key]) : '';
      });
      return map;
    }
    return Object.fromEntries(MEASUREMENT_FIELDS.map(f => [f, '']));
  });
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
  measurements: Measurement[];
  onClose: () => void; 
  onEdit: () => void;
}) {
  const latest = measurements.length > 0 ? measurements[0] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button onClick={onClose} className="absolute inset-0 bg-[#1F1916]/45 backdrop-blur-sm" />
      <section className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#E2D7C7] bg-[#FFFCF8] p-7 shadow-2xl">
        <button onClick={onClose} className="absolute right-5 top-5 text-[#766A62]"><X className="h-5 w-5" /></button>
        <Label>Measurement profile</Label>
        <h2 className="mt-1 text-3xl text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>{customer.full_name}</h2>
        <p className="mt-2 text-sm text-[#766A62]">{customer.customer_id} · {customer.contact_number}</p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {latest ? (
            MEASUREMENT_FIELDS.map((field) => {
              const key = field.toLowerCase() as keyof Measurement;
              const value = latest[key];
              return (
                <div key={field} className="rounded-lg border border-[#E2D7C7] bg-white p-3">
                  <Label>{field}</Label>
                  <div className="mt-1 text-sm text-[#2A211D]">{value !== null && value !== undefined ? `${value} in` : '—'}</div>
                </div>
              );
            })
          ) : (
            <p className="col-span-full rounded-lg border border-dashed border-[#D9C8B7] bg-[#FCFAF7] p-6 text-center text-sm text-[#766A62]">
              No measurements have been recorded for this customer.
            </p>
          )}
        </div>

        <div className="mt-7 flex items-center justify-between border-t border-[#E8DFD3] pt-5">
          <span className="text-xs text-[#8C7E74]">
            Last updated: {latest ? new Date(latest.measurement_date).toLocaleDateString() : 'Never'}
          </span>
          <div className="flex gap-3">
            <button onClick={onEdit} className="inline-flex items-center gap-2 rounded-lg bg-[#2A211D] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
              <Ruler className="h-4 w-4" /> Update measurements
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export function FrontDeskMeasurementsView() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [measurements, setMeasurements] = useState<Record<string, Measurement[]>>({});
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
      const measurementsMap: Record<string, Measurement[]> = {};
      await Promise.all(
        customersData.map(async (c) => {
          try {
            const m = await frontDeskApi.getCustomerMeasurements(c.customer_id);
            measurementsMap[c.customer_id] = m;
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
    const newMeasurement = await frontDeskApi.createMeasurement(data);
    setMeasurements(prev => ({
      ...prev,
      [data.customerId]: [newMeasurement, ...(prev[data.customerId] || [])],
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
          const lastUpdated = hasMeasurements ? new Date(customerMeasurements[0].measurement_date).toLocaleDateString() : 'Not recorded';

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