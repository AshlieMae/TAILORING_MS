import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Boxes, Check, PackagePlus, X } from 'lucide-react';
import {
  COLORS, FONT_IMPORT, PageHeader, StatCard, SearchField, FilterPill, Card, TableHeadRow, EmptyState,
  ModalShell, EyebrowLabel, PrimaryButton, SecondaryButton,
} from './Theme';

type Fabric = { id: string; name: string; color: string; category: string; supplier: string; stock: number; reorderAt: number; unitCost: string };

const INITIAL_FABRICS: Fabric[] = [
  { id: 'FAB-001', name: 'Italian Wool', color: 'Charcoal', category: 'Suiting', supplier: 'Manila Textile House', stock: 8, reorderAt: 20, unitCost: '₱1,250/m' },
  { id: 'FAB-002', name: 'Silk Habotai', color: 'Ivory', category: 'Silk', supplier: 'Silk Road Fabrics', stock: 5, reorderAt: 15, unitCost: '₱980/m' },
  { id: 'FAB-003', name: 'Cotton Poplin', color: 'White', category: 'Shirting', supplier: 'Bohol Fabric Supply', stock: 12, reorderAt: 25, unitCost: '₱260/m' },
  { id: 'FAB-004', name: 'Piña Jusi', color: 'Ivory', category: 'Traditional', supplier: 'Luzon Handwoven', stock: 32, reorderAt: 10, unitCost: '₱780/m' },
  { id: 'FAB-005', name: 'Wool Blend', color: 'Camel', category: 'Coating', supplier: 'Manila Textile House', stock: 18, reorderAt: 12, unitCost: '₱740/m' },
];

const CATEGORY_TONE: Record<string, { bg: string; text: string; border: string }> = {
  Suiting: { bg: COLORS.navySoft, text: COLORS.navy, border: COLORS.navySoftBorder },
  Silk: { bg: COLORS.brassSoft, text: COLORS.brassDeep, border: COLORS.brassSoftBorder },
  Shirting: { bg: COLORS.surfaceAlt, text: COLORS.inkSoft, border: COLORS.border },
  Traditional: { bg: COLORS.warningBg, text: COLORS.warning, border: COLORS.warningBorder },
  Coating: { bg: COLORS.dangerBg, text: COLORS.danger, border: COLORS.dangerBorder },
  Uniform: { bg: COLORS.successBg, text: COLORS.success, border: COLORS.successBorder },
};

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
    <div className="space-y-7" style={{ color: COLORS.ink }}>
      <style>{FONT_IMPORT}</style>

      <PageHeader
        eyebrow="Bolt room"
        title="Fabric Inventory"
        description="Track stock on the shelf, usage by job, and what's due for reorder."
        action={<PrimaryButton icon={<PackagePlus />} onClick={() => setAddOpen(true)}>Add fabric</PrimaryButton>}
      />

      {notice && (
        <div className="rise-in flex items-center gap-2 border px-4 py-3 text-sm" style={{ borderColor: COLORS.successBorder, background: COLORS.successBg, color: COLORS.success, borderRadius: 8 }}>
          <Check className="h-4 w-4" /> {notice}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard delay={0.05} icon={<Boxes />} label="Fabric types" value={inventory.length} tone="neutral" />
        <StatCard delay={0.09} icon={<AlertTriangle />} label="Low-stock alerts" value={lowStock.length} tone="danger" />
        <StatCard delay={0.13} icon={<Boxes />} label="Total stock on hand" value={`${inventory.reduce((sum, fabric) => sum + fabric.stock, 0)} m`} tone="brass" />
      </div>

      {lowStock.length > 0 && (
        <div className="rise-in border p-4 text-sm" style={{ animationDelay: '0.16s', borderColor: COLORS.warningBorder, background: COLORS.warningBg, color: '#8A5A17', borderRadius: 10 }}>
          <strong style={{ color: COLORS.warning }}>{lowStock.length} low-stock alert{lowStock.length > 1 ? 's' : ''}:</strong> {lowStock.map((fabric) => `${fabric.name} — ${fabric.color}`).join(', ')}
        </div>
      )}

      <Card delay={0.2}>
        <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: COLORS.border }}>
          <SearchField value={query} onChange={setQuery} placeholder="Search fabric, color, category, or supplier" />
          <FilterPill active={lowOnly} onClick={() => setLowOnly((v) => !v)}>Low stock only</FilterPill>
        </div>

        <TableHeadRow gridCols="grid-cols-[1.3fr_1fr_1.1fr_1fr_0.8fr]" columns={['Fabric', 'Category', 'Supplier', 'Stock level', 'Unit cost']} />

        {fabrics.map((fabric, index) => <FabricRow key={fabric.id} fabric={fabric} delay={index * 0.03} />)}
        {!fabrics.length && <EmptyState message="No fabric matches your search." />}
      </Card>

      {addOpen && <AddFabricModal onClose={() => setAddOpen(false)} onAdd={addFabric} />}
    </div>
  );
}

function FabricRow({ fabric, delay }: { fabric: Fabric; delay: number }) {
  const low = fabric.stock <= fabric.reorderAt;
  const target = Math.min(100, (fabric.stock / fabric.reorderAt) * 100);
  const [width, setWidth] = useState(0);
  const tone = CATEGORY_TONE[fabric.category] ?? CATEGORY_TONE.Shirting;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setWidth(target));
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return (
    <div
      className="rise-in grid grid-cols-1 gap-3 border-b px-6 py-4 md:grid-cols-[1.3fr_1fr_1.1fr_1fr_0.8fr] md:items-center md:gap-4"
      style={{ borderColor: COLORS.border, animationDelay: `${0.24 + delay}s` }}
    >
      <div>
        <div className="font-medium" style={{ color: COLORS.ink }}>{fabric.name}</div>
        <div className="mono mt-1 text-[11px]" style={{ color: COLORS.faint }}>{fabric.id} · {fabric.color}</div>
      </div>
      <span>
        <span className="inline-block border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em]" style={{ background: tone.bg, color: tone.text, borderColor: tone.border, borderRadius: 6 }}>{fabric.category}</span>
      </span>
      <span className="text-sm" style={{ color: COLORS.inkSoft }}>{fabric.supplier}</span>
      <div>
        <div className="mono text-sm" style={{ fontWeight: low ? 600 : 400, color: low ? COLORS.danger : COLORS.ink }}>
          {fabric.stock} m <span className="text-xs font-normal" style={{ color: COLORS.muted }}>/ reorder at {fabric.reorderAt} m</span>
        </div>
        <div className="mt-2 h-1.5" style={{ background: COLORS.border, borderRadius: 4 }}>
          <div className="h-full transition-[width] duration-700 ease-out" style={{ width: `${width}%`, background: low ? COLORS.danger : COLORS.navy, borderRadius: 4 }} />
        </div>
      </div>
      <span className="mono text-sm" style={{ color: COLORS.ink }}>{fabric.unitCost}</span>
    </div>
  );
}

const FIELDS: { key: keyof Omit<Fabric, 'id'>; label: string; type?: string }[] = [
  { key: 'name', label: 'Fabric name' },
  { key: 'color', label: 'Color' },
  { key: 'category', label: 'Category' },
  { key: 'supplier', label: 'Supplier' },
  { key: 'stock', label: 'Stock on hand (meters)', type: 'number' },
  { key: 'reorderAt', label: 'Reorder level (meters)', type: 'number' },
  { key: 'unitCost', label: 'Unit cost per meter (₱)', type: 'number' },
];

function AddFabricModal({ onClose, onAdd }: { onClose: () => void; onAdd: (fabric: Omit<Fabric, 'id'>) => void }) {
  const [form, setForm] = useState({ name: '', color: '', category: '', supplier: '', stock: '', reorderAt: '', unitCost: '' });
  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    onAdd({ name: form.name, color: form.color, category: form.category, supplier: form.supplier, stock: Number(form.stock), reorderAt: Number(form.reorderAt), unitCost: `₱${form.unitCost}/m` });
  };

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-xl">
      <form onSubmit={submit}>
        <header className="flex items-start justify-between border-b px-7 py-6 sm:px-8" style={{ borderColor: COLORS.border }}>
          <div>
            <EyebrowLabel>New bolt ticket</EyebrowLabel>
            <h2 className="mt-1.5 text-2xl font-semibold" style={{ color: COLORS.ink }}>Add fabric</h2>
            <p className="mt-1 text-sm" style={{ color: COLORS.muted }}>Enter the fabric information and current quantity in meters.</p>
          </div>
          <button type="button" onClick={onClose} className="p-2" style={{ color: COLORS.muted, borderRadius: 8 }}><X className="h-5 w-5" /></button>
        </header>

        <div className="grid gap-5 p-7 sm:grid-cols-2 sm:p-8">
          {FIELDS.map((field) => (
            <label key={field.key} className={`block text-xs font-semibold ${field.key === 'unitCost' ? 'sm:col-span-2' : ''}`} style={{ color: COLORS.inkSoft }}>
              {field.label}
              <input
                required
                type={field.type ?? 'text'}
                min={field.type === 'number' ? 0 : undefined}
                value={form[field.key]}
                onChange={(event) => update(field.key, event.target.value)}
                className="mt-2 w-full border bg-white px-3 py-2.5 text-sm outline-none transition-colors"
                style={{ borderColor: COLORS.border, color: COLORS.ink, borderRadius: 8 }}
                onFocus={(e) => { e.currentTarget.style.borderColor = COLORS.navy; e.currentTarget.style.boxShadow = `0 0 0 3px ${COLORS.navySoft}`; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </label>
          ))}
        </div>

        <div className="flex gap-3 border-t px-7 py-6 sm:px-8" style={{ borderColor: COLORS.border }}>
          <PrimaryButton type="submit">Add to inventory</PrimaryButton>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        </div>
      </form>
    </ModalShell>
  );
}

export default AdminInventoryManagementView;
