import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Boxes, Check, Minus, PackagePlus, Plus, X } from 'lucide-react';
import {
  COLORS, FONT_IMPORT, PageHeader, StatCard, SearchField, FilterPill, Card, TableHeadRow, EmptyState,
  EyebrowLabel, PrimaryButton, shadowModal,
} from './Theme';

type Fabric = { id: string; fabricId?: number; name: string; color: string; category: string; supplier: string; stock: number; reorderAt: number; unitCost: string | number | null; unit?: string };

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
  const [inventory, setInventory] = useState<Fabric[]>(INITIAL_FABRICS);
  const [query, setQuery] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const authToken = () => localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';
    fetch(`${API_URL}/admin/inventory`, { headers: { Authorization: `Bearer ${authToken()}` } })
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.message || 'Unable to load inventory.'); return d; })
      .then((d) => {
        const mapped: Fabric[] = (d.fabrics || []).map((f: any) => ({
          id: f.id, fabricId: f.fabricId, name: f.name, color: f.color, category: f.category, supplier: f.supplier,
          stock: f.stock, reorderAt: f.reorderAt, unitCost: f.unitCost, unit: f.unit || 'meters',
        }));
        setInventory(Array.isArray(mapped) && mapped.length ? mapped : INITIAL_FABRICS);
      })
      .catch(() => { /* keep bundled sample if the server is unavailable. */ });
  }, []);

  const fabrics = useMemo(() => inventory.filter((fabric) => `${fabric.name} ${fabric.color} ${fabric.category} ${fabric.supplier}`.toLowerCase().includes(query.toLowerCase()) && (!lowOnly || fabric.stock <= fabric.reorderAt)), [inventory, lowOnly, query]);
  const lowStock = inventory.filter((fabric) => fabric.stock <= fabric.reorderAt);

  const refresh = () => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const authToken = () => localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';
    fetch(`${API_URL}/admin/inventory`, { headers: { Authorization: `Bearer ${authToken()}` } })
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.message || 'Unable to load inventory.'); return d; })
      .then((d) => { const mapped: Fabric[] = (d.fabrics || []).map((f: any) => ({ id: f.id, fabricId: f.fabricId, name: f.name, color: f.color, category: f.category, supplier: f.supplier, stock: f.stock, reorderAt: f.reorderAt, unitCost: f.unitCost, unit: f.unit || 'meters' })); setInventory(mapped.length ? mapped : INITIAL_FABRICS); })
      .catch(() => { /* keep the current list if the server is unavailable. */ });
  };

  const addFabric = async (fabric: { fabricName: string; tone: string; unit: string; stockQuantity: number; unitCost?: number | null }) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const authToken = () => localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';
    try {
      const response = await fetch(`${API_URL}/admin/inventory/fabric`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
        body: JSON.stringify(fabric),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to add fabric.');
      setAddOpen(false);
      setNotice(data.message || `${fabric.fabricName} has been added to inventory.`);
      refresh();
      return true;
    } catch (err) {
      setNotice(`Error: ${err instanceof Error ? err.message : 'Unable to add fabric.'}`);
      return false;
    }
  };

  const adjustStock = async (fabric: Fabric, delta: number) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const authToken = () => localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';
    const targetId = fabric.fabricId ?? fabric.id;
    try {
      const response = await fetch(`${API_URL}/admin/inventory/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
        body: JSON.stringify({ fabricId: targetId, delta }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Unable to adjust stock.');
      setNotice(data.message || `${fabric.name} stock updated.`);
      refresh();
    } catch (err) {
      setNotice(`Error: ${err instanceof Error ? err.message : 'Unable to adjust stock.'}`);
    }
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

        {fabrics.map((fabric, index) => <FabricRow key={fabric.id} fabric={fabric} delay={index * 0.03} onAdjust={adjustStock} />)}
        {!fabrics.length && <EmptyState message="No fabric matches your search." />}
      </Card>

      {addOpen && <AddFabricModal onClose={() => setAddOpen(false)} onAdd={addFabric} />}
    </div>
  );
}

function FabricRow({ fabric, delay, onAdjust }: { fabric: Fabric; delay: number; onAdjust: (fabric: Fabric, delta: number) => void }) {
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
        <div className="flex items-center justify-between gap-2">
          <span className="mono text-sm" style={{ fontWeight: low ? 600 : 400, color: low ? COLORS.danger : COLORS.ink }}>
            {fabric.stock} {fabric.unit || 'm'} <span className="text-xs font-normal" style={{ color: COLORS.muted }}>/ reorder at {fabric.reorderAt} {fabric.unit || 'm'}</span>
          </span>
          <span className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onAdjust(fabric, -1); }}
              className="flex h-6 w-6 items-center justify-center rounded-full border transition-colors"
              style={{ borderColor: COLORS.border, color: COLORS.muted }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = COLORS.danger; e.currentTarget.style.color = COLORS.danger; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.muted; }}
              aria-label={`Decrease ${fabric.name}`}
            ><Minus className="h-3.5 w-3.5" /></button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onAdjust(fabric, 1); }}
              className="flex h-6 w-6 items-center justify-center rounded-full border transition-colors"
              style={{ borderColor: COLORS.border, color: COLORS.muted }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = COLORS.navy; e.currentTarget.style.color = COLORS.navy; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.muted; }}
              aria-label={`Increase ${fabric.name}`}
            ><Plus className="h-3.5 w-3.5" /></button>
          </span>
        </div>
        <div className="mt-2 h-1.5" style={{ background: COLORS.border, borderRadius: 4 }}>
          <div className="h-full transition-[width] duration-700 ease-out" style={{ width: `${width}%`, background: low ? COLORS.danger : COLORS.navy, borderRadius: 4 }} />
        </div>
      </div>
      <span className="mono text-sm" style={{ color: COLORS.ink }}>
        {typeof fabric.unitCost === 'number' ? `₱${fabric.unitCost.toLocaleString('en-PH')}/${fabric.unit || 'm'}` : fabric.unitCost}
        {typeof fabric.unitCost === 'number' && <span className="block text-[10px] font-normal" style={{ color: COLORS.faint }}>value: ₱{(fabric.stock * fabric.unitCost).toLocaleString('en-PH')}</span>}
      </span>
    </div>
  );
}

function AddFabricModal({ onClose, onAdd }: { onClose: () => void; onAdd: (fabric: { fabricName: string; tone: string; unit: string; stockQuantity: number; unitCost?: number | null }) => Promise<boolean> }) {
  const [fabricName, setFabricName] = useState('');
  const [tone, setTone] = useState('');
  const [unit, setUnit] = useState('yards');
  const [stock, setStock] = useState('');
  const [reorderAt, setReorderAt] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setError('');
    if (!fabricName.trim()) { setError('Fabric name is required.'); return; }
    const qty = Number(stock);
    if (Number.isNaN(qty) || qty < 0) { setError('Initial stock must be a positive number.'); return; }
    setBusy(true);
    const payload = { fabricName: fabricName.trim(), tone: tone.trim(), unit, stockQuantity: qty, lowStockThreshold: reorderAt ? Number(reorderAt) : 3, unitCost: unitCost !== '' ? Number(unitCost) : null };
    try {
      const ok = await onAdd(payload);
      if (ok) onClose();
    } catch {
      /* parent surfaces the backend error via the notice. */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={submit} className="rise-in relative w-full max-w-lg overflow-hidden border bg-white shadow-2xl" style={{ borderColor: COLORS.borderStrong, borderRadius: 16, boxShadow: shadowModal }}>
        <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg, #A9762F, #E9D6B3 50%, #A9762F)' }} />
        <div className="flex items-center justify-between px-7 pt-6">
          <EyebrowLabel color={COLORS.brassDeep}>New bolt on the shelf</EyebrowLabel>
          <button onClick={onClose} aria-label="Close" className="transition-colors" style={{ color: COLORS.faint }}><X className="h-4 w-4" /></button>
        </div>
        <div className="px-7 pb-8 pt-2">
          <h2 className="text-2xl font-semibold" style={{ fontFamily: "'Fraunces', serif", color: COLORS.ink }}>Add fabric</h2>
          <div className="mt-5 space-y-4">
            {error && <div role="alert" className="border px-3 py-2 text-sm" style={{ borderColor: COLORS.dangerBorder, background: COLORS.dangerBg, color: COLORS.danger, borderRadius: 6 }}>{error}</div>}
            <label className="block text-xs font-medium" style={{ color: COLORS.inkSoft }}>Fabric name
              <input value={fabricName} onChange={(e) => setFabricName(e.target.value)} placeholder="e.g. Linen" className="mt-2 w-full border bg-white px-3 py-2.5 text-sm outline-none transition-colors" style={{ borderColor: COLORS.border, color: COLORS.ink, borderRadius: 8 }} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-medium" style={{ color: COLORS.inkSoft }}>Tone / colour
                <input value={tone} onChange={(e) => setTone(e.target.value)} placeholder="e.g. Beige" className="mt-2 w-full border bg-white px-3 py-2.5 text-sm outline-none transition-colors" style={{ borderColor: COLORS.border, color: COLORS.ink, borderRadius: 8 }} />
              </label>
              <label className="block text-xs font-medium" style={{ color: COLORS.inkSoft }}>Unit
                <select value={unit} onChange={(e) => setUnit(e.target.value)} className="mt-2 w-full border bg-white px-3 py-2.5 text-sm outline-none" style={{ borderColor: COLORS.border, color: COLORS.ink, borderRadius: 8 }}>
                  <option value="yards">yards</option>
                  <option value="meters">meters</option>
                </select>
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-medium" style={{ color: COLORS.inkSoft }}>Initial stock on hand
                <input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} className="mt-2 w-full border bg-white px-3 py-2.5 text-sm outline-none transition-colors" style={{ borderColor: COLORS.border, color: COLORS.ink, borderRadius: 8 }} />
              </label>
              <label className="block text-xs font-medium" style={{ color: COLORS.inkSoft }}>Reorder level
                <input type="number" min="0" value={reorderAt} onChange={(e) => setReorderAt(e.target.value)} placeholder="3" className="mt-2 w-full border bg-white px-3 py-2.5 text-sm outline-none transition-colors" style={{ borderColor: COLORS.border, color: COLORS.ink, borderRadius: 8 }} />
              </label>
            </div>
            <label className="block text-xs font-medium" style={{ color: COLORS.inkSoft }}>Unit cost per {unit} (₱)
              <input type="number" min="0" step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} placeholder="e.g. 250" className="mt-2 w-full border bg-white px-3 py-2.5 text-sm outline-none transition-colors" style={{ borderColor: COLORS.border, color: COLORS.ink, borderRadius: 8 }} />
              <span className="mt-1 block text-[10px]" style={{ color: COLORS.faint }}>Purchase price of 1 {unit} of this fabric — used to value stock and track material cost.</span>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="border px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ borderColor: COLORS.border, borderRadius: 8, color: COLORS.muted }}>Cancel</button>
              <button type="submit" disabled={busy} className="inline-flex items-center gap-2 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white disabled:opacity-50" style={{ background: COLORS.navy, borderRadius: 8 }}>{busy ? 'Adding…' : 'Add to shelf'}</button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default AdminInventoryManagementView;
