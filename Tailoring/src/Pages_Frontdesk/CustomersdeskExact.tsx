// Pages_Frontdesk/CustomersdeskExact.tsx
import { useMemo, useState, useEffect, useCallback } from 'react';
import { ChevronRight, Mail, MapPin, Phone, Ruler, Search, UserPlus, X, Loader2 } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
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

function CustomerDetails({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMeasurements = async () => {
      try {
        const data = await frontDeskApi.getCustomerMeasurements(customer.customer_id);
        setMeasurements(data);
      } catch (err) {
        console.error('Failed to load measurements:', err);
      } finally {
        setLoading(false);
      }
    };
    loadMeasurements();
  }, [customer.customer_id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button onClick={onClose} aria-label="Close customer details" className="absolute inset-0 bg-[#1F1916]/45 backdrop-blur-sm" />
      <section className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-[#E2D7C7] bg-[#FFFCF8] shadow-2xl">
        <header className="flex justify-between border-b border-[#E8DFD3] p-6">
          <div>
            <MonoLabel>Customer profile</MonoLabel>
            <h2 className="mt-1 text-3xl text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>{customer.full_name}</h2>
            <p className="mt-1 text-xs text-[#8C7E74]">{customer.customer_id}</p>
          </div>
          <button onClick={onClose} className="text-[#766A62]"><X className="h-5 w-5" /></button>
        </header>
        <div className="grid gap-7 p-6 sm:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-4 rounded-xl bg-[#F8F3EB] p-5 text-sm text-[#5E5048]">
            <p className="flex gap-2"><Mail className="h-4 w-4 text-[#A46B48]" />{customer.email}</p>
            <p className="flex gap-2"><Phone className="h-4 w-4 text-[#A46B48]" />{customer.contact_number}</p>
            <p className="flex gap-2"><MapPin className="h-4 w-4 shrink-0 text-[#A46B48]" />{customer.address || 'Not set'}</p>
            <div className="border-t border-[#E2D7C7] pt-4">
              <MonoLabel>Status</MonoLabel>
              <p className={`mt-1 ${customer.status === 'Active' ? 'text-[#4E7357]' : 'text-[#8A6618]'}`}>{customer.status}</p>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Ruler className="h-4 w-4 text-[#A46B48]" />
              <h3 className="text-lg text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>Saved measurements</h3>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {loading ? (
                <div className="col-span-2 flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-[#8C6F3E]" /></div>
              ) : measurements.length > 0 ? (
                measurements.slice(0, 4).map((m) => (
                  <div key={m.measurement_id} className="rounded-lg border border-[#E2D7C7] bg-white p-3">
                    <MonoLabel>Latest</MonoLabel>
                    <div className="mt-1 text-sm text-[#2A211D]">
                      {m.chest && `Chest: ${m.chest}in`}
                      {m.waist && ` · Waist: ${m.waist}in`}
                      {m.hip && ` · Hip: ${m.hip}in`}
                    </div>
                    <div className="text-[10px] text-[#8C7E74] mt-1">{new Date(m.measurement_date).toLocaleDateString()}</div>
                  </div>
                ))
              ) : (
                <p className="col-span-2 text-sm text-[#766A62]">No measurements recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export function FrontDeskCustomersExactView() {
  const [customers, setCustomers] = useState<Customer[]>([]);
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

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

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
                <span className="text-sm text-[#2A211D]">0 orders</span>
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