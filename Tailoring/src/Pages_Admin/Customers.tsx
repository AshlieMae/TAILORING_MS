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

const statusClasses: Record<CustomerStatus, string> = {
  Active: 'border-[#B9DDD0] bg-[#E7F4EE] text-[#277257]',
  'Pickup due': 'border-[#ECD8A7] bg-[#FFF7E3] text-[#8A6618]',
  Inactive: 'border-[#D5DDDE] bg-[#EEF2F2] text-[#5D7480]',
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

  return <div className="space-y-7">
    <div className="dash-in flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><span className="text-[10px] uppercase tracking-[0.22em] text-[#5D7480]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Customer records</span><h1 className="mt-1 text-2xl sm:text-3xl text-[#122029]" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>Customers</h1><p className="mt-2 text-sm text-[#5D7480]">Review customer profiles, measurements, and order history.</p></div>
      <div className="border border-[#C7D2CE] bg-[#F7FAF9] px-4 py-3"><span className="text-xl text-[#122029]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{CUSTOMERS.length}</span><span className="ml-2 text-[10px] uppercase tracking-[0.15em] text-[#5D7480]">Total customers</span></div>
    </div>

    <div className="dash-in grid grid-cols-2 gap-4 lg:grid-cols-4" style={{ animationDelay: '0.08s' }}>
      <Summary label="Active customers" value={CUSTOMERS.filter((c) => c.status === 'Active').length} /><Summary label="Pickup due" value={CUSTOMERS.filter((c) => c.status === 'Pickup due').length} /><Summary label="New this month" value={4} /><Summary label="Avg. orders/customer" value="4.8" />
    </div>

    <section className="dash-in border border-[#C7D2CE] bg-[#F7FAF9] shadow-[0_1px_3px_rgba(18,32,41,0.06)]" style={{ animationDelay: '0.14s' }}>
      <div className="flex flex-col gap-4 border-b border-[#C7D2CE] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8FA2A8]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, phone, or customer ID" className="w-full border border-[#C7D2CE] bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#4FB6C4]" /></div>
        <div className="flex flex-wrap gap-2">{(['All', 'Active', 'Pickup due', 'Inactive'] as const).map((item) => <button key={item} onClick={() => setStatus(item)} className={`border px-3 py-2 text-[10px] font-medium uppercase tracking-[0.12em] ${status === item ? 'border-[#4FB6C4] bg-[#E4EEEE] text-[#122029]' : 'border-[#C7D2CE] text-[#5D7480] hover:border-[#8FA2A8]'}`}>{item}</button>)}</div>
      </div>
      <div className="hidden grid-cols-[1.35fr_1.1fr_1fr_0.8fr_0.9fr_24px] gap-4 border-b border-[#C7D2CE] bg-[#EDF1F0] px-6 py-3 md:grid">{['Customer', 'Contact', 'Last order', 'Orders', 'Status', ''].map((label) => <span key={label} className="text-[10px] uppercase tracking-[0.16em] text-[#5D7480]">{label}</span>)}</div>
      {customers.map((customer) => <button key={customer.id} onClick={() => setSelected(customer)} className="grid w-full grid-cols-1 gap-2 border-b border-[#DEE5DF] px-6 py-4 text-left transition-colors hover:bg-[#EDF5F3] md:grid-cols-[1.35fr_1.1fr_1fr_0.8fr_0.9fr_24px] md:items-center md:gap-4">
        <div><div className="font-medium text-[#122029]">{customer.name}</div><div className="mt-1 text-[11px] text-[#5D7480]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{customer.id}</div></div><div className="text-sm text-[#3D4F55]">{customer.phone}<span className="hidden lg:block text-xs text-[#5D7480]">{customer.email}</span></div><span className="text-sm text-[#3D4F55]">{customer.lastOrder}</span><span className="text-sm text-[#122029]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{customer.orders}</span><span><span className={`inline-block border px-2 py-1 text-[10px] uppercase tracking-[0.1em] ${statusClasses[customer.status]}`}>{customer.status}</span></span><ChevronRight className="hidden h-4 w-4 text-[#4FB6C4] md:block" /></button>)}
      {!customers.length && <div className="p-12 text-center text-sm text-[#5D7480]">No customer matches your search.</div>}
    </section>

    {selected && <CustomerProfile customer={selected} onClose={() => setSelected(null)} />}
  </div>;
}

function Summary({ label, value }: { label: string; value: number | string }) { return <div className="border border-[#C7D2CE] bg-[#F7FAF9] p-5"><div className="text-2xl text-[#122029]" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>{value}</div><div className="mt-2 text-[10px] uppercase tracking-[0.16em] text-[#5D7480]">{label}</div></div>; }

function CustomerProfile({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><button aria-label="Close customer details" onClick={onClose} className="absolute inset-0 bg-[#0E1E2A]/50 backdrop-blur-sm" /><section className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto border border-[#C7D2CE] bg-[#F7FAF9] shadow-2xl"><header className="flex items-start justify-between border-b border-[#C7D2CE] px-6 py-6 sm:px-8"><div><span className="text-[10px] uppercase tracking-[0.22em] text-[#5D7480]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Customer profile</span><h2 className="mt-1 text-3xl text-[#122029]" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>{customer.name}</h2><span className="mt-2 inline-block text-[11px] text-[#5D7480]">{customer.id}</span></div><button onClick={onClose} className="p-2 text-[#5D7480] hover:bg-[#E4EEEE]"><X className="h-5 w-5" /></button></header><div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[0.9fr_1.1fr]"><div className="space-y-6"><div className="border border-[#C7D2CE] bg-[#EDF5F3] p-5"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#2C4A57] text-sm font-semibold text-white">{customer.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div><div className="space-y-3 text-sm text-[#3D4F55]"><p className="flex gap-2"><Mail className="h-4 w-4 text-[#4FB6C4]" />{customer.email}</p><p className="flex gap-2"><Phone className="h-4 w-4 text-[#4FB6C4]" />{customer.phone}</p><p className="flex gap-2"><MapPin className="h-4 w-4 shrink-0 text-[#4FB6C4]" />{customer.address}</p></div></div><div><h3 className="text-lg text-[#122029]" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>Measurements</h3><div className="mt-3 grid grid-cols-2 gap-2">{customer.measurements.map((measurement) => <div key={measurement.label} className="border border-[#C7D2CE] bg-white p-3"><div className="text-[10px] uppercase tracking-[0.14em] text-[#5D7480]">{measurement.label}</div><div className="mt-1 text-sm text-[#122029]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{measurement.value}</div></div>)}</div></div></div><div><div className="flex items-center gap-2"><Ruler className="h-4 w-4 text-[#4FB6C4]" /><h3 className="text-lg text-[#122029]" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>Order history</h3></div><div className="mt-3 space-y-3">{customer.recentOrders.map((order) => <div key={order.id} className="border border-[#C7D2CE] bg-white p-4"><div className="flex items-start justify-between gap-4"><div><div className="text-[11px] text-[#5D7480]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{order.id}</div><div className="mt-1 font-medium text-[#122029]">{order.garment}</div></div><span className="border border-[#C7D2CE] bg-[#E4EEEE] px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-[#2C4A57]">{order.stage}</span></div><div className="mt-3 text-xs text-[#5D7480]">Due {order.due}</div></div>)}</div></div></div></section></div>;
}

export default AdminCustomersView;
