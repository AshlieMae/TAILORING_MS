import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Mail, MapPin, Phone, Ruler, Search, X } from 'lucide-react';

type CustomerStatus = 'Active' | 'Pickup due' | 'Inactive';

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  orders: number;
  lastOrder: string;
  status: CustomerStatus;
  measurements: { label: string; value: string }[];
  recentOrders: { id: string; garment: string; stage: string; due: string }[];
};

const CUSTOMERS: Customer[] = [
  { id: 'CUS-001', name: 'Reyna Fuentes', email: 'reyna.fuentes@email.com', phone: '0917 555 0182', address: 'Tagbilaran City, Bohol', orders: 6, lastOrder: 'Aug 01, 2026', status: 'Active', measurements: [{ label: 'Chest', value: '36 in' }, { label: 'Waist', value: '29 in' }, { label: 'Hip', value: '38 in' }, { label: 'Shoulder', value: '15 in' }, { label: 'Sleeve', value: '22 in' }, { label: 'Neck', value: '14 in' }], recentOrders: [{ id: 'JC-3021', garment: 'Barong Tagalog', stage: 'First Fitting', due: 'Aug 05' }, { id: 'JC-2974', garment: 'Filipiniana Dress', stage: 'Completed', due: 'Jul 11' }] },
  { id: 'CUS-002', name: 'Boyet Salcedo', email: 'boyet.salcedo@email.com', phone: '0918 420 7641', address: 'Dauis, Bohol', orders: 3, lastOrder: 'Jul 30, 2026', status: 'Active', measurements: [{ label: 'Chest', value: '41 in' }, { label: 'Waist', value: '35 in' }, { label: 'Hip', value: '40 in' }, { label: 'Shoulder', value: '18 in' }, { label: 'Sleeve', value: '25 in' }, { label: 'Inseam', value: '31 in' }], recentOrders: [{ id: 'JC-3020', garment: 'Two-piece Suit', stage: 'Pattern Cutting', due: 'Aug 09' }] },
  { id: 'CUS-003', name: 'Consuelo Reyes', email: 'consuelo.reyes@email.com', phone: '0920 336 9028', address: 'Baclayon, Bohol', orders: 8, lastOrder: 'Jul 28, 2026', status: 'Active', measurements: [{ label: 'Chest', value: '39 in' }, { label: 'Waist', value: '33 in' }, { label: 'Hip', value: '42 in' }, { label: 'Shoulder', value: '16 in' }, { label: 'Sleeve', value: '21 in' }, { label: 'Neck', value: '15 in' }], recentOrders: [{ id: 'JC-3019', garment: "Women's Coat", stage: 'Final Alterations', due: 'Aug 03' }] },
  { id: 'CUS-004', name: 'Tomas Villareal', email: 'tomas.v@email.com', phone: '0916 287 1140', address: 'Panglao, Bohol', orders: 2, lastOrder: 'Jul 25, 2026', status: 'Pickup due', measurements: [{ label: 'Chest', value: '38 in' }, { label: 'Waist', value: '32 in' }, { label: 'Hip', value: '37 in' }, { label: 'Shoulder', value: '17 in' }, { label: 'Sleeve', value: '24 in' }, { label: 'Inseam', value: '30 in' }], recentOrders: [{ id: 'JC-3018', garment: 'School Uniform Set', stage: 'Ready for Pickup', due: 'Aug 02' }] },
  { id: 'CUS-005', name: 'Marisol Chan', email: 'marisol.chan@email.com', phone: '0917 911 4835', address: 'Tagbilaran City, Bohol', orders: 5, lastOrder: 'Jul 22, 2026', status: 'Inactive', measurements: [{ label: 'Chest', value: '34 in' }, { label: 'Waist', value: '27 in' }, { label: 'Hip', value: '36 in' }, { label: 'Shoulder', value: '14 in' }, { label: 'Sleeve', value: '20 in' }, { label: 'Neck', value: '13 in' }], recentOrders: [{ id: 'JC-3017', garment: 'Evening Gown', stage: 'Initial Assembly', due: 'Aug 12' }] },
];

// Thread colors per status — matches the spool-tag language used across the workroom views.
const statusClasses: Record<CustomerStatus, string> = {
  Active: 'border-[#BFD8BC] bg-[#E4EEE2] text-[#3F6B3F]',
  'Pickup due': 'border-[#E3CFA0] bg-[#F5ECD8] text-[#8A6A1F]',
  Inactive: 'border-[#D8CBA9] bg-[#F3EDDC] text-[#7A6F58]',
};

const INK = '#2A2620';
const PAPER = '#FBF7EA';
const LINE = '#D8CBA9';
const MUTED = '#7A6F58';
const THREAD = '#B33F35';

const dotPaper: React.CSSProperties = {
  backgroundImage: 'radial-gradient(#D8CBA9 0.7px, transparent 0.7px)',
  backgroundSize: '14px 14px',
};

export function AdminCustomersView({ externalQuery = '' }: { externalQuery?: string }) {
  const [query, setQuery] = useState(externalQuery);
  const [status, setStatus] = useState<'All' | CustomerStatus>('All');
  const [selected, setSelected] = useState<Customer | null>(null);

  useEffect(() => setQuery(externalQuery), [externalQuery]);

  const customers = useMemo(() => CUSTOMERS.filter((customer) => {
    const matchQuery = `${customer.name} ${customer.email} ${customer.phone} ${customer.id}`.toLowerCase().includes(query.toLowerCase());
    return matchQuery && (status === 'All' || customer.status === status);
  }), [query, status]);

  return (
    <div className="space-y-7 p-1" style={{ ...dotPaper, color: INK }}>
      <div className="dash-in flex flex-col gap-4 border-b border-dashed pb-6 sm:flex-row sm:items-end sm:justify-between" style={{ borderColor: LINE }}>
        <div>
          <span className="text-[10px] uppercase tracking-[0.28em]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: MUTED }}>Client records</span>
          <h1 className="mt-1 text-3xl sm:text-4xl italic" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: INK }}>Client Book</h1>
          <p className="mt-2 text-sm" style={{ color: MUTED }}>Profiles, running measurements, and order history, all in one card file.</p>
        </div>
        <div className="border px-4 py-3" style={{ borderColor: LINE, background: PAPER }}>
          <span className="text-xl" style={{ fontFamily: "'IBM Plex Mono', monospace", color: INK }}>{CUSTOMERS.length}</span>
          <span className="ml-2 text-[10px] uppercase tracking-[0.15em]" style={{ color: MUTED }}>on file</span>
        </div>
      </div>

      <div className="dash-in grid grid-cols-2 gap-4 lg:grid-cols-4" style={{ animationDelay: '0.08s' }}>
        <Swatch label="Active customers" value={CUSTOMERS.filter((c) => c.status === 'Active').length} />
        <Swatch label="Pickup due" value={CUSTOMERS.filter((c) => c.status === 'Pickup due').length} />
        <Swatch label="New this month" value={4} />
        <Swatch label="Avg. orders/customer" value="4.8" />
      </div>

      <section className="dash-in border shadow-[0_1px_3px_rgba(42,38,32,0.08)]" style={{ animationDelay: '0.14s', borderColor: LINE, background: PAPER }}>
        <div className="flex flex-col gap-4 border-b border-dashed p-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: LINE }}>
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: MUTED }} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, email, phone, or client ID"
              className="w-full border bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#B33F35]"
              style={{ borderColor: LINE, fontFamily: "'IBM Plex Mono', monospace" }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(['All', 'Active', 'Pickup due', 'Inactive'] as const).map((item) => (
              <button
                key={item}
                onClick={() => setStatus(item)}
                className="border px-3 py-2 text-[10px] font-medium uppercase tracking-[0.14em]"
                style={status === item ? { borderColor: THREAD, background: '#F7E1DE', color: INK } : { borderColor: LINE, color: MUTED }}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="hidden grid-cols-[1.35fr_1.1fr_1fr_0.8fr_0.9fr_24px] gap-4 border-b border-dashed px-6 py-3 md:grid" style={{ borderColor: LINE }}>
          {['Customer', 'Contact', 'Last order', 'Orders', 'Status', ''].map((label) => (
            <span key={label} className="text-[10px] uppercase tracking-[0.18em]" style={{ color: MUTED }}>{label}</span>
          ))}
        </div>

        {customers.map((customer) => (
          <button
            key={customer.id}
            onClick={() => setSelected(customer)}
            className="grid w-full grid-cols-1 items-center gap-2 border-b border-dashed px-6 py-4 text-left transition-colors hover:bg-[#F3EDDC] md:grid-cols-[1.35fr_1.1fr_1fr_0.8fr_0.9fr_24px] md:gap-4"
            style={{ borderColor: LINE }}
          >
            <div>
              <div className="font-medium" style={{ color: INK }}>{customer.name}</div>
              <div className="mt-1 flex items-center gap-2 text-[11px]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: MUTED }}>
                <span className="h-1.5 w-1.5 rounded-full border" style={{ borderColor: MUTED }} />
                {customer.id}
              </div>
            </div>
            <div className="text-sm" style={{ color: '#3D4F55' }}>
              {customer.phone}
              <span className="hidden text-xs lg:block" style={{ color: MUTED }}>{customer.email}</span>
            </div>
            <span className="text-sm" style={{ color: '#3D4F55' }}>{customer.lastOrder}</span>
            <span className="text-sm" style={{ fontFamily: "'IBM Plex Mono', monospace", color: INK }}>{customer.orders}</span>
            <span><span className={`inline-block border px-2 py-1 text-[10px] uppercase tracking-[0.1em] ${statusClasses[customer.status]}`}>{customer.status}</span></span>
            <ChevronRight className="hidden h-4 w-4 md:block" style={{ color: THREAD }} />
          </button>
        ))}
        {!customers.length && <div className="p-12 text-center text-sm" style={{ color: MUTED }}>No customer matches your search.</div>}
      </section>

      {selected && <CustomerProfile customer={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function Swatch({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border p-5" style={{ borderColor: LINE, background: PAPER }}>
      <div className="text-2xl" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: INK }}>{value}</div>
      <div className="mt-2 text-[10px] uppercase tracking-[0.18em]" style={{ color: MUTED }}>{label}</div>
    </div>
  );
}

function CustomerProfile({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button aria-label="Close customer details" onClick={onClose} className="absolute inset-0 bg-[#2A2620]/55 backdrop-blur-sm" />
      <section className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto border shadow-2xl" style={{ borderColor: LINE, background: PAPER }}>

        {/* punch hole, matching the swing-tag detail panel on the orders view */}
        <div className="absolute left-6 top-6 h-4 w-4 rounded-full border-2" style={{ borderColor: MUTED, background: '#F3EDDC' }} />

        <header className="flex items-start justify-between border-b border-dashed px-6 py-6 pl-14 sm:px-8 sm:pl-16" style={{ borderColor: LINE }}>
          <div>
            <span className="text-[10px] uppercase tracking-[0.28em]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: MUTED }}>Client card</span>
            <h2 className="mt-1 text-3xl italic" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: INK }}>{customer.name}</h2>
            <span className="mt-2 inline-block text-[11px]" style={{ color: MUTED }}>{customer.id}</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#F3EDDC]" style={{ color: MUTED }}>
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <div className="border border-dashed p-5" style={{ borderColor: LINE, background: '#F3EDDC' }}>
              <div className="mb-4 flex h-12 w-12 items-center justify-center border text-sm italic" style={{ borderColor: MUTED, background: PAPER, fontFamily: "'Fraunces', serif", fontWeight: 600, color: INK }}>
                {customer.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}
              </div>
              <div className="space-y-3 text-sm" style={{ color: '#3D4F55' }}>
                <p className="flex gap-2"><Mail className="h-4 w-4" style={{ color: THREAD }} />{customer.email}</p>
                <p className="flex gap-2"><Phone className="h-4 w-4" style={{ color: THREAD }} />{customer.phone}</p>
                <p className="flex gap-2"><MapPin className="h-4 w-4 shrink-0" style={{ color: THREAD }} />{customer.address}</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg italic" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: INK }}>Measurements</h3>
              {/* signature: read like an actual tailor's measurement chart, values dot-leadered off the label */}
              <div className="mt-3 divide-y divide-dashed border border-dashed bg-white" style={{ borderColor: LINE }}>
                {customer.measurements.map((measurement) => (
                  <div key={measurement.label} className="flex items-baseline gap-3 px-4 py-2.5" style={{ borderColor: LINE }}>
                    <span className="shrink-0 text-[11px] uppercase tracking-[0.12em]" style={{ color: MUTED }}>{measurement.label}</span>
                    <span className="flex-1 border-b border-dotted" style={{ borderColor: LINE }} />
                    <span className="shrink-0 text-sm" style={{ fontFamily: "'IBM Plex Mono', monospace", color: INK }}>{measurement.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <Ruler className="h-4 w-4" style={{ color: THREAD }} />
              <h3 className="text-lg italic" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: INK }}>Order history</h3>
            </div>
            <div className="mt-3 space-y-3">
              {customer.recentOrders.map((order) => (
                <div key={order.id} className="border border-dashed bg-white p-4" style={{ borderColor: LINE }}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-[11px]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: MUTED }}>
                        <span className="h-1.5 w-1.5 rounded-full border" style={{ borderColor: MUTED }} />
                        {order.id}
                      </div>
                      <div className="mt-1 font-medium" style={{ color: INK }}>{order.garment}</div>
                    </div>
                    <span className="border px-2 py-1 text-[10px] uppercase tracking-[0.1em]" style={{ borderColor: '#E3CFA0', background: '#F5ECD8', color: '#8A6A1F' }}>{order.stage}</span>
                  </div>
                  <div className="mt-3 text-xs" style={{ color: MUTED }}>Due {order.due}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AdminCustomersView;