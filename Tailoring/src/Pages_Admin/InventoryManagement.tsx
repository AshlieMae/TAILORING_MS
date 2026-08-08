import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Boxes, PackagePlus, Scissors, Search, X } from 'lucide-react';

type Fabric = { id: string; name: string; color: string; category: string; supplier: string; stock: number; reorderAt: number; unitCost: string };

const INITIAL_FABRICS: Fabric[] = [
  { id: 'FAB-001', name: 'Italian Wool', color: 'Charcoal', category: 'Suiting', supplier: 'Manila Textile House', stock: 8, reorderAt: 20, unitCost: '₱1,250/m' },
  { id: 'FAB-002', name: 'Silk Habotai', color: 'Ivory', category: 'Silk', supplier: 'Silk Road Fabrics', stock: 5, reorderAt: 15, unitCost: '₱980/m' },
  { id: 'FAB-003', name: 'Cotton Poplin', color: 'White', category: 'Shirting', supplier: 'Bohol Fabric Supply', stock: 12, reorderAt: 25, unitCost: '₱260/m' },
  { id: 'FAB-004', name: 'Piña Jusi', color: 'Ivory', category: 'Traditional', supplier: 'Luzon Handwoven', stock: 32, reorderAt: 10, unitCost: '₱780/m' },
  { id: 'FAB-005', name: 'Wool Blend', color: 'Camel', category: 'Coating', supplier: 'Manila Textile House', stock: 18, reorderAt: 12, unitCost: '₱740/m' },
];

const INK = '#2A2620';
const PAPER = '#FBF7EA';
const LINE = '#D8CBA9';
const MUTED = '#7A6F58';
const THREAD = '#B33F35';

const dotPaper: React.CSSProperties = {
  backgroundImage: 'radial-gradient(#D8CBA9 0.7px, transparent 0.7px)',
  backgroundSize: '14px 14px',
};

const categoryTone: Record<string, string> = {
  Suiting: 'border-[#C2C9E0] bg-[#E7EAF2] text-[#3A4372]',
  Silk: 'border-[#E8C3AE] bg-[#F7E6DE] text-[#9C4A2B]',
  Shirting: 'border-[#D8CBA9] bg-[#F3EDDC] text-[#7A6F58]',
  Traditional: 'border-[#E3CFA0] bg-[#F5ECD8] text-[#8A6A1F]',
  Coating: 'border-[#E8BEB8] bg-[#F7E1DE] text-[#9B3A31]',
  Uniform: 'border-[#B7D9D3] bg-[#E1EEEC] text-[#2C6E68]',
};

const styleSheet = `
@keyframes bolt-fade-up { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
@keyframes bolt-marching { to { background-position: 16px 0; } }
@keyframes bolt-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
@keyframes bolt-modal-in { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
.bolt-in { animation: bolt-fade-up 0.45s ease both; }
.bolt-marching-border {
  background-image: repeating-linear-gradient(90deg, #8A6618 0 6px, transparent 6px 16px);
  background-size: 16px 2px;
  background-repeat: repeat-x;
  background-position: 0 0;
  animation: bolt-marching 0.9s linear infinite;
}
.bolt-pulse { animation: bolt-pulse 1.8s ease-in-out infinite; }
.bolt-ledger-input {
  border: none;
  border-bottom: 1px solid #D8CBA9;
  background: transparent;
  padding: 6px 2px;
  transition: border-color 0.15s ease;
}
.bolt-ledger-input:focus { border-bottom: 1px solid #B33F35; outline: none; }
.bolt-perforation {
  background-image: repeating-linear-gradient(90deg, #C7BA97 0 5px, transparent 5px 11px);
  background-size: 11px 1px;
  background-repeat: repeat-x;
  background-position: center;
}
`;

export function AdminInventoryManagementView() {
  const [inventory, setInventory] = useState(INITIAL_FABRICS);
  const [query, setQuery] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [notice, setNotice] = useState('');

  const fabrics = useMemo(() => inventory.filter((fabric) => `${fabric.name} ${fabric.color} ${fabric.category} ${fabric.supplier}`.toLowerCase().includes(query.toLowerCase()) && (!lowOnly || fabric.stock <= fabric.reorderAt)), [inventory, lowOnly, query]);
  const lowStock = inventory.filter((fabric) => fabric.stock <= fabric.reorderAt);

  const addFabric = (fabric: Omit<Fabric, 'id'>) => {
    setInventory((current) => [...current, { ...fabric, id: `FAB-${String(current.length + 1).padStart(3, '0')}` }]);
    setAddOpen(false);
    setNotice(`${fabric.name} has been added to inventory.`);
  };

  return (
    <div className="space-y-7 p-1" style={{ ...dotPaper, color: INK }}>
      <style>{styleSheet}</style>

      <div className="bolt-in flex flex-col gap-4 border-b border-dashed pb-6 sm:flex-row sm:items-end sm:justify-between" style={{ borderColor: LINE }}>
        <div>
          <span className="text-[10px] uppercase tracking-[0.28em]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: MUTED }}>Bolt room</span>
          <h1 className="mt-1 text-3xl sm:text-4xl italic" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: INK }}>Fabric Inventory</h1>
          <p className="mt-2 text-sm" style={{ color: MUTED }}>Track stock on the shelf, usage by job, and what's due for reorder.</p>
        </div>
        <button onClick={() => setAddOpen(true)} className="inline-flex items-center justify-center gap-2 border px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-white transition-transform hover:-translate-y-0.5" style={{ borderColor: INK, background: INK }}>
          <PackagePlus className="h-4 w-4" /> Add fabric
        </button>
      </div>

      {notice && (
        <div className="bolt-in border px-4 py-3 text-sm" style={{ borderColor: '#BFD8BC', background: '#E4EEE2', color: '#3F6B3F' }}>
          {notice}
        </div>
      )}

      <div className="bolt-in grid gap-4 sm:grid-cols-3" style={{ animationDelay: '0.06s' }}>
        <Metric icon={<Boxes />} label="Fabric types" value={inventory.length} />
        <Metric icon={<AlertTriangle />} label="Low-stock alerts" value={lowStock.length} tone="warn" />
        <Metric icon={<Boxes />} label="Total stock on hand" value={`${inventory.reduce((sum, fabric) => sum + fabric.stock, 0)} m`} />
      </div>

      {lowStock.length > 0 && (
        <div className="bolt-in relative overflow-hidden border p-4 text-sm" style={{ animationDelay: '0.1s', borderColor: '#E3CFA0', background: '#F5ECD8', color: '#806421' }}>
          <div className="bolt-marching-border absolute inset-x-0 top-0 h-[2px]" />
          <strong style={{ color: '#5E4711' }}>{lowStock.length} low-stock alert{lowStock.length > 1 ? 's' : ''}:</strong> {lowStock.map((fabric) => `${fabric.name} — ${fabric.color}`).join(', ')}
        </div>
      )}

      <section className="bolt-in border" style={{ animationDelay: '0.14s', borderColor: LINE, background: PAPER }}>
        <div className="flex flex-col gap-4 border-b border-dashed p-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: LINE }}>
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: MUTED }} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search fabric, color, category, or supplier"
              className="w-full border bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#B33F35]"
              style={{ borderColor: LINE, fontFamily: "'IBM Plex Mono', monospace" }}
            />
          </div>
          <button
            onClick={() => setLowOnly((value) => !value)}
            className="border px-3 py-2.5 text-[10px] uppercase tracking-[0.12em] transition-colors"
            style={lowOnly ? { borderColor: THREAD, background: '#F7E1DE', color: '#9B3A31' } : { borderColor: LINE, color: MUTED }}
          >
            Low stock only
          </button>
        </div>

        <div className="hidden grid-cols-[1.3fr_1fr_1.1fr_1fr_0.8fr] gap-4 border-b border-dashed px-6 py-3 md:grid" style={{ borderColor: LINE }}>
          {['Fabric', 'Category', 'Supplier', 'Stock level', 'Unit cost'].map((label) => (
            <span key={label} className="text-[10px] uppercase tracking-[0.18em]" style={{ color: MUTED }}>{label}</span>
          ))}
        </div>

        {fabrics.map((fabric, index) => <FabricRow key={fabric.id} fabric={fabric} delay={index * 0.04} />)}
        {!fabrics.length && <div className="p-12 text-center text-sm" style={{ color: MUTED }}>No fabric matches your search.</div>}
      </section>

      {addOpen && <AddFabricModal onClose={() => setAddOpen(false)} onAdd={addFabric} />}
    </div>
  );
}

function FabricRow({ fabric, delay }: { fabric: Fabric; delay: number }) {
  const low = fabric.stock <= fabric.reorderAt;
  const target = Math.min(100, (fabric.stock / fabric.reorderAt) * 100);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setWidth(target));
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return (
    <div
      className="bolt-in grid grid-cols-1 gap-3 border-b border-dashed px-6 py-4 md:grid-cols-[1.3fr_1fr_1.1fr_1fr_0.8fr] md:items-center md:gap-4"
      style={{ borderColor: LINE, animationDelay: `${0.16 + delay}s` }}
    >
      <div>
        <div className="font-medium" style={{ color: INK }}>{fabric.name}</div>
        <div className="mt-1 flex items-center gap-2 text-[11px]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: MUTED }}>
          <span className="h-1.5 w-1.5 rounded-full border" style={{ borderColor: MUTED }} />
          {fabric.id} · {fabric.color}
        </div>
      </div>
      <span><span className={`inline-block border px-2 py-1 text-[10px] uppercase tracking-[0.08em] ${categoryTone[fabric.category] ?? ''}`}>{fabric.category}</span></span>
      <span className="text-sm" style={{ color: '#3D4F55' }}>{fabric.supplier}</span>
      <div>
        <div className="text-sm" style={{ fontWeight: low ? 600 : 400, color: low ? THREAD : INK }}>
          {fabric.stock} m <span className="text-xs" style={{ color: MUTED, fontWeight: 400 }}>/ reorder at {fabric.reorderAt} m</span>
        </div>
        <div className="mt-2 h-1.5" style={{ background: '#E7DEC4' }}>
          <div className="h-full transition-[width] duration-700 ease-out" style={{ width: `${width}%`, background: low ? THREAD : '#3A4372' }} />
        </div>
      </div>
      <span className="text-sm" style={{ fontFamily: "'IBM Plex Mono', monospace", color: INK }}>{fabric.unitCost}</span>
    </div>
  );
}

function Metric({ icon, label, value, tone = 'default' }: { icon: React.ReactNode; label: string; value: number | string; tone?: 'default' | 'warn' }) {
  return (
    <div className="border p-5 transition-transform hover:-translate-y-0.5" style={{ borderColor: LINE, background: PAPER }}>
      <div
        className={`flex h-8 w-8 items-center justify-center border [&>svg]:h-4 [&>svg]:w-4 ${tone === 'warn' ? 'bolt-pulse' : ''}`}
        style={tone === 'warn' ? { borderColor: '#E8BEB8', background: '#F7E1DE', color: THREAD } : { borderColor: LINE, background: '#F3EDDC', color: '#3A4372' }}
      >
        {icon}
      </div>
      <div className="mt-4 text-2xl" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: INK }}>{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.16em]" style={{ color: MUTED }}>{label}</div>
    </div>
  );
}

const FIELDS: { key: keyof Omit<Fabric, 'id'>; label: string; type?: string; span?: boolean }[] = [
  { key: 'name', label: 'Fabric name' },
  { key: 'color', label: 'Color' },
  { key: 'category', label: 'Category' },
  { key: 'supplier', label: 'Supplier' },
  { key: 'stock', label: 'Stock on hand (meters)', type: 'number' },
  { key: 'reorderAt', label: 'Reorder level (meters)', type: 'number' },
  { key: 'unitCost', label: 'Unit cost per meter (₱)', type: 'number', span: true },
];

function AddFabricModal({ onClose, onAdd }: { onClose: () => void; onAdd: (fabric: Omit<Fabric, 'id'>) => void }) {
  const [form, setForm] = useState({ name: '', color: '', category: '', supplier: '', stock: '', reorderAt: '', unitCost: '' });
  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    onAdd({ name: form.name, color: form.color, category: form.category, supplier: form.supplier, stock: Number(form.stock), reorderAt: Number(form.reorderAt), unitCost: `₱${form.unitCost}/m` });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <style>{styleSheet}</style>
      <button aria-label="Close add fabric form" onClick={onClose} className="absolute inset-0 bg-[#2A2620]/55 backdrop-blur-sm" />

      <form onSubmit={submit} className="relative w-full max-w-xl shadow-2xl" style={{ animation: 'bolt-modal-in 0.3s ease both' }}>
        {/* tear-off swatch strip — the card's own "cut here" line, in keeping with a fabric bolt tag */}
        <div className="flex items-center justify-center gap-2 border border-b-0 py-2" style={{ borderColor: LINE, background: PAPER }}>
          <Scissors className="h-3 w-3 rotate-90" style={{ color: MUTED }} />
          <span className="bolt-perforation h-px flex-1" />
          <span className="shrink-0 text-[9px] uppercase tracking-[0.2em]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: MUTED }}>New bolt ticket</span>
          <span className="bolt-perforation h-px flex-1" />
          <Scissors className="h-3 w-3 -rotate-90" style={{ color: MUTED }} />
        </div>

        <div className="relative border p-6 sm:p-8" style={{ borderColor: LINE, background: PAPER }}>
          <div className="absolute left-6 top-6 h-4 w-4 rounded-full border-2" style={{ borderColor: MUTED, background: '#F3EDDC' }} />
          <button type="button" onClick={onClose} className="absolute right-5 top-5 p-1 hover:bg-[#F3EDDC]" style={{ color: MUTED }}>
            <X className="h-5 w-5" />
          </button>

          <div className="pl-8">
            <h2 className="text-2xl italic" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: INK }}>Add fabric</h2>
            <p className="mt-2 text-sm" style={{ color: MUTED }}>Enter the fabric information and current quantity in meters.</p>
          </div>

          {/* ledger lines — numbered like a measurement chart, values written on the rule rather than boxed */}
          <div className="mt-6 border border-dashed pl-8" style={{ borderColor: LINE }}>
            {FIELDS.map((field, index) => (
              <div key={field.key} className="flex items-start gap-3 border-b border-dashed px-4 py-2.5 last:border-b-0" style={{ borderColor: LINE }}>
                <span className="mt-2 shrink-0 text-[9px]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: MUTED }}>{String(index + 1).padStart(2, '0')}</span>
                <label className="flex-1 text-xs font-medium" style={{ color: '#3D4F55' }}>
                  {field.label}
                  <input
                    required
                    type={field.type ?? 'text'}
                    min={field.type === 'number' ? 0 : undefined}
                    value={form[field.key]}
                    onChange={(event) => update(field.key, event.target.value)}
                    className="bolt-ledger-input mt-1 block w-full text-sm"
                    style={{ color: INK }}
                  />
                </label>
              </div>
            ))}
          </div>

          <div className="mt-7 flex gap-3 pl-8">
            <button type="submit" className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white transition-transform hover:-translate-y-0.5" style={{ background: INK }}>Add to inventory</button>
            <button type="button" onClick={onClose} className="border px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ borderColor: LINE, color: MUTED }}>Cancel</button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default AdminInventoryManagementView;