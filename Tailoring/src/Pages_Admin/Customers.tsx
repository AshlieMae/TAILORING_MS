import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Mail, MapPin, Phone, Ruler, UserRound } from 'lucide-react';
import {
  COLORS, FONT_IMPORT, PageHeader, StatCard, SearchField, FilterPill, Card, TableHeadRow, EmptyState,
  ModalShell, EyebrowLabel, Badge, shadowSm,
} from './Theme';

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

const STATUS_TONE: Record<CustomerStatus, 'success' | 'warning' | 'neutral'> = { Active: 'success', 'Pickup due': 'warning', Inactive: 'neutral' };

export function AdminCustomersView({ externalQuery = '' }: { externalQuery?: string }) {
  const [query, setQuery] = useState(externalQuery);
  const [status, setStatus] = useState<'All' | CustomerStatus>('All');
  const [selected, setSelected] = useState<Customer | null>(null);
  const [rows, setRows] = useState<Customer[]>(CUSTOMERS);

  useEffect(() => setQuery(externalQuery), [externalQuery]);
  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const authToken = () => localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';
    fetch(`${API_URL}/admin/customers`, { headers: { Authorization: `Bearer ${authToken()}` } })
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.message || 'Unable to load customers.'); return d; })
      .then((d) => { setRows(Array.isArray(d.customers) && d.customers.length ? d.customers : CUSTOMERS); })
      .catch(() => { /* keep the bundled sample if the server is unavailable. */ });
  }, []);

  const customers = useMemo(() => rows.filter((customer) => {
    const matchQuery = `${customer.name} ${customer.email} ${customer.phone} ${customer.id}`.toLowerCase().includes(query.toLowerCase());
    return matchQuery && (status === 'All' || customer.status === status);
  }), [query, status, rows]);
  const activeCount = rows.filter((c) => c.status === 'Active').length;
  const pickupCount = rows.filter((c) => c.status === 'Pickup due').length;
  const avgOrders = rows.length ? (rows.reduce((s, c) => s + (c.orders || 0), 0) / rows.length).toFixed(1) : '0.0';
  const recentCount = rows.filter((c) => c.status !== 'Inactive').length;

  return (
    <div className="space-y-7" style={{ color: COLORS.ink }}>
      <style>{FONT_IMPORT}</style>

      <PageHeader
        eyebrow="Client records"
        title="Client Book"
        description="Profiles, running measurements, and order history, all in one place."
        action={
          <div className="border px-4 py-3" style={{ borderColor: COLORS.border, background: COLORS.surface, borderRadius: 10, boxShadow: shadowSm }}>
            <span className="mono text-xl font-semibold" style={{ color: COLORS.ink }}>{rows.length}</span>
            <span className="ml-2 text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: COLORS.muted }}>on file</span>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard delay={0.05} icon={<UserRound />} label="Active customers" value={activeCount} tone="success" />
        <StatCard delay={0.09} icon={<Ruler />} label="Pickup due" value={pickupCount} tone="warning" />
        <StatCard delay={0.13} icon={<UserRound />} label="Engaged customers" value={recentCount} tone="brass" />
        <StatCard delay={0.17} icon={<UserRound />} label="Avg. orders / customer" value={avgOrders} tone="neutral" />
      </div>

      <Card delay={0.2}>
        <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: COLORS.border }}>
          <SearchField value={query} onChange={setQuery} placeholder="Search name, email, phone, or client ID" />
          <div className="flex flex-wrap gap-2">
            {(['All', 'Active', 'Pickup due', 'Inactive'] as const).map((item) => (
              <FilterPill key={item} active={status === item} onClick={() => setStatus(item)}>{item}</FilterPill>
            ))}
          </div>
        </div>

        <TableHeadRow gridCols="grid-cols-[1.35fr_1.1fr_1fr_0.8fr_0.9fr_24px]" columns={['Customer', 'Contact', 'Last order', 'Orders', 'Status', '']} />

        {customers.map((customer) => (
          <button
            key={customer.id}
            onClick={() => setSelected(customer)}
            className="grid w-full grid-cols-1 items-center gap-2 border-b px-6 py-4 text-left transition-colors md:grid-cols-[1.35fr_1.1fr_1fr_0.8fr_0.9fr_24px] md:gap-4"
            style={{ borderColor: COLORS.border }}
            onMouseEnter={(e) => { e.currentTarget.style.background = COLORS.surfaceAlt; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <div>
              <div className="font-medium" style={{ color: COLORS.ink }}>{customer.name}</div>
              <div className="mono mt-1 text-[11px]" style={{ color: COLORS.faint }}>{customer.id}</div>
            </div>
            <div className="text-sm" style={{ color: COLORS.inkSoft }}>
              {customer.phone}
              <span className="hidden text-xs lg:block" style={{ color: COLORS.muted }}>{customer.email}</span>
            </div>
            <span className="mono text-sm" style={{ color: COLORS.inkSoft }}>{customer.lastOrder}</span>
            <span className="mono text-sm" style={{ color: COLORS.ink }}>{customer.orders}</span>
            <span><Badge tone={STATUS_TONE[customer.status]}>{customer.status}</Badge></span>
            <ChevronRight className="hidden h-4 w-4 md:block" style={{ color: COLORS.faint }} />
          </button>
        ))}
        {!customers.length && <EmptyState message="No customer matches your search." />}
      </Card>

      {selected && <CustomerProfile customer={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function CustomerProfile({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  return (
    <ModalShell onClose={onClose} maxWidth="max-w-4xl">
      <header className="flex items-start justify-between border-b px-7 py-6 sm:px-8" style={{ borderColor: COLORS.border }}>
        <div>
          <EyebrowLabel>Client card</EyebrowLabel>
          <h2 className="mt-1.5 text-2xl font-semibold tracking-[-0.01em]" style={{ color: COLORS.ink }}>{customer.name}</h2>
          <span className="mono mt-1.5 inline-block text-[11px]" style={{ color: COLORS.muted }}>{customer.id}</span>
        </div>
        <button onClick={onClose} className="p-2 transition-colors" style={{ color: COLORS.muted, borderRadius: 8 }} onMouseEnter={(e) => { e.currentTarget.style.background = COLORS.surfaceAlt; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </header>

      <div className="grid gap-8 p-7 sm:p-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <div className="border p-5" style={{ borderColor: COLORS.border, background: COLORS.navySoft, borderRadius: 10 }}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center text-sm font-semibold text-white" style={{ background: COLORS.navy, borderRadius: 999 }}>
              {customer.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}
            </div>
            <div className="space-y-3 text-sm" style={{ color: COLORS.inkSoft }}>
              <p className="flex gap-2"><Mail className="h-4 w-4" style={{ color: COLORS.brassDeep }} />{customer.email}</p>
              <p className="flex gap-2"><Phone className="h-4 w-4" style={{ color: COLORS.brassDeep }} />{customer.phone}</p>
              <p className="flex gap-2"><MapPin className="h-4 w-4 shrink-0" style={{ color: COLORS.brassDeep }} />{customer.address}</p>
            </div>
          </div>

          <div>
            <h3 className="text-[15px] font-semibold" style={{ color: COLORS.ink }}>Measurements</h3>
            <div className="mt-3 divide-y border bg-white" style={{ borderColor: COLORS.border, borderRadius: 8 }}>
              {customer.measurements.map((measurement) => (
                <div key={measurement.label} className="flex items-baseline justify-between gap-3 px-4 py-2.5" style={{ borderColor: COLORS.border }}>
                  <span className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: COLORS.muted }}>{measurement.label}</span>
                  <span className="mono text-sm" style={{ color: COLORS.ink }}>{measurement.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <Ruler className="h-4 w-4" style={{ color: COLORS.brassDeep }} />
            <h3 className="text-[15px] font-semibold" style={{ color: COLORS.ink }}>Order history</h3>
          </div>
          <div className="mt-3 space-y-3">
            {customer.recentOrders.map((order) => (
              <div key={order.id} className="border bg-white p-4" style={{ borderColor: COLORS.border, borderRadius: 8 }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="mono text-[11px]" style={{ color: COLORS.faint }}>{order.id}</div>
                    <div className="mt-1 font-medium" style={{ color: COLORS.ink }}>{order.garment}</div>
                  </div>
                  <Badge tone="warning" dot={false}>{order.stage}</Badge>
                </div>
                <div className="mt-3 text-xs" style={{ color: COLORS.muted }}>Due {order.due}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

export default AdminCustomersView;
