import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Boxes, PackagePlus } from 'lucide-react';
import {
  COLORS, FONT_IMPORT, PageHeader, StatCard, SearchField, FilterPill, Card, TableHeadRow, EmptyState,
  ModalShell, EyebrowLabel, PrimaryButton, 
} from './Theme';

type Fabric = { id: string; name: string; color: string; category: string; supplier: string; stock: number; reorderAt: number; unitCost: string; lastUpdated: string; usage: { job: string; meters: string; date: string }[]; };
const FABRICS: Fabric[] = [
  { id: 'FAB-001', name: 'Italian Wool', color: 'Charcoal', category: 'Suiting', supplier: 'Manila Textile House', stock: 8, reorderAt: 20, unitCost: '₱1,250/m', lastUpdated: 'Aug 02, 2026', usage: [{ job: 'JC-3020 · Two-piece Suit', meters: '3.5 m', date: 'Jul 26' }] },
  { id: 'FAB-002', name: 'Silk Habotai', color: 'Ivory', category: 'Silk', supplier: 'Silk Road Fabrics', stock: 5, reorderAt: 15, unitCost: '₱980/m', lastUpdated: 'Aug 01, 2026', usage: [{ job: 'JC-3017 · Evening Gown', meters: '4.0 m', date: 'Jul 21' }] },
  { id: 'FAB-003', name: 'Cotton Poplin', color: 'White', category: 'Shirting', supplier: 'Bohol Fabric Supply', stock: 12, reorderAt: 25, unitCost: '₱260/m', lastUpdated: 'Aug 02, 2026', usage: [{ job: 'JC-3016 · Long-sleeve Polo', meters: '2.0 m', date: 'Jul 18' }] },
  { id: 'FAB-004', name: 'Piña Jusi', color: 'Ivory', category: 'Traditional', supplier: 'Luzon Handwoven', stock: 32, reorderAt: 10, unitCost: '₱780/m', lastUpdated: 'Aug 03, 2026', usage: [{ job: 'JC-3021 · Barong Tagalog', meters: '2.5 m', date: 'Jul 27' }, { job: 'JC-3023 · Filipiniana Blouse', meters: '1.5 m', date: 'Aug 02' }] },
  { id: 'FAB-005', name: 'Wool Blend', color: 'Camel', category: 'Coating', supplier: 'Manila Textile House', stock: 18, reorderAt: 12, unitCost: '₱740/m', lastUpdated: 'Aug 01, 2026', usage: [{ job: "JC-3019 · Women's Coat", meters: '3.0 m', date: 'Jul 24' }] },
  { id: 'FAB-006', name: 'Polyester Twill', color: 'Navy', category: 'Uniform', supplier: 'Bohol Fabric Supply', stock: 45, reorderAt: 20, unitCost: '₱210/m', lastUpdated: 'Jul 31, 2026', usage: [{ job: 'JC-3018 · School Uniform Set', meters: '3.0 m', date: 'Jul 23' }] },
];

export function AdminInventoryView() {
  const [query, setQuery] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [selected, setSelected] = useState<Fabric | null>(null);
  const [rows, setRows] = useState<Fabric[]>(FABRICS);
  const [loadError, setLoadError] = useState('');
  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const authToken = () => localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';
    fetch(`${API_URL}/admin/inventory`, { headers: { Authorization: `Bearer ${authToken()}` } })
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.message || 'Unable to load inventory.'); return d; })
      .then((d) => {
        const mapped: Fabric[] = (d.fabrics || []).map((f: any) => ({
          id: f.id, name: f.name, color: f.color, category: f.category, supplier: f.supplier,
          stock: f.stock, reorderAt: f.reorderAt, unitCost: f.unitCost, lastUpdated: f.lastUpdated, usage: f.usage || [],
        }));
        setRows(mapped);
      })
      .catch((e) => setLoadError(e.message));
  }, []);
  const fabrics = useMemo(() => rows.filter((fabric) => `${fabric.name} ${fabric.color} ${fabric.category} ${fabric.supplier}`.toLowerCase().includes(query.toLowerCase()) && (!lowOnly || fabric.stock <= fabric.reorderAt)), [query, lowOnly, rows]);
  const lowStock = rows.filter((fabric) => fabric.stock <= fabric.reorderAt);

  return (
    <div className="space-y-7" style={{ color: COLORS.ink }}>
      <style>{FONT_IMPORT}</style>

      <PageHeader
        eyebrow="Fabric stock control"
        title="Inventory"
        description="Track fabric stock, usage, suppliers, and reorder alerts."
        action={<PrimaryButton icon={<PackagePlus />}>Add fabric</PrimaryButton>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard delay={0.05} icon={<Boxes />} label="Fabric types" value={rows.length} tone="neutral" />
        <StatCard delay={0.09} icon={<AlertTriangle />} label="Low-stock alerts" value={lowStock.length} tone="danger" />
        <StatCard delay={0.13} icon={<Boxes />} label="Total stock on hand" value={`${rows.reduce((sum, fabric) => sum + fabric.stock, 0)} m`} tone="brass" />
        {loadError && <p className="text-sm sm:col-span-3" style={{ color: COLORS.danger }}>{loadError}</p>}
      </div>

      {lowStock.length > 0 && (
        <div className="rise-in border p-5" style={{ animationDelay: '0.16s', borderColor: COLORS.warningBorder, background: COLORS.warningBg, borderRadius: 10 }}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" style={{ color: COLORS.warning }} />
            <div>
              <h2 className="font-semibold" style={{ color: COLORS.warning }}>{lowStock.length} fabric item{lowStock.length > 1 ? 's' : ''} needs reordering</h2>
              <p className="mt-1 text-sm" style={{ color: '#8A5A17' }}>{lowStock.map((fabric) => `${fabric.name} — ${fabric.color}`).join(', ')}</p>
            </div>
          </div>
        </div>
      )}

      <Card delay={0.2}>
        <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: COLORS.border }}>
          <SearchField value={query} onChange={setQuery} placeholder="Search fabric, color, category, or supplier" />
          <FilterPill active={lowOnly} onClick={() => setLowOnly((v) => !v)}>Low stock only</FilterPill>
        </div>
        <TableHeadRow gridCols="grid-cols-[1.3fr_1fr_1.1fr_0.9fr_0.85fr_24px]" columns={['Fabric', 'Category', 'Supplier', 'Stock level', 'Unit cost', '']} />
        {fabrics.map((fabric) => {
          const percent = Math.min(100, (fabric.stock / fabric.reorderAt) * 100);
          const low = fabric.stock <= fabric.reorderAt;
          return (
            <button
              key={fabric.id}
              onClick={() => setSelected(fabric)}
              className="grid w-full grid-cols-1 gap-2 border-b px-6 py-4 text-left transition-colors md:grid-cols-[1.3fr_1fr_1.1fr_0.9fr_0.85fr_24px] md:items-center md:gap-4"
              style={{ borderColor: COLORS.border }}
              onMouseEnter={(e) => { e.currentTarget.style.background = COLORS.surfaceAlt; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div>
                <div className="font-medium" style={{ color: COLORS.ink }}>{fabric.name}</div>
                <div className="mono mt-1 text-[11px]" style={{ color: COLORS.faint }}>{fabric.id} · {fabric.color}</div>
              </div>
              <span className="text-sm" style={{ color: COLORS.inkSoft }}>{fabric.category}</span>
              <span className="text-sm" style={{ color: COLORS.inkSoft }}>{fabric.supplier}</span>
              <div>
                <div className="mono text-sm" style={{ fontWeight: low ? 600 : 400, color: low ? COLORS.danger : COLORS.ink }}>
                  {fabric.stock} m <span className="text-xs font-normal" style={{ color: COLORS.muted }}>/ reorder at {fabric.reorderAt} m</span>
                </div>
                <div className="mt-2 h-1.5" style={{ background: COLORS.border, borderRadius: 4 }}>
                  <div style={{ width: `${percent}%`, height: '100%', background: low ? COLORS.danger : COLORS.navy, borderRadius: 4 }} />
                </div>
              </div>
              <span className="mono text-sm" style={{ color: COLORS.ink }}>{fabric.unitCost}</span>
            </button>
          );
        })}
        {!fabrics.length && <EmptyState message="No fabric matches your search." />}
      </Card>

      {selected && <FabricDetails fabric={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function FabricDetails({ fabric, onClose }: { fabric: Fabric; onClose: () => void }) {
  const low = fabric.stock <= fabric.reorderAt;
  return (
    <ModalShell onClose={onClose} maxWidth="max-w-3xl">
      <header className="flex items-start justify-between border-b px-7 py-6 sm:px-8" style={{ borderColor: COLORS.border }}>
        <div>
          <EyebrowLabel>Fabric inventory record</EyebrowLabel>
          <h2 className="mt-1.5 text-2xl font-semibold" style={{ color: COLORS.ink }}>{fabric.name}</h2>
          <p className="mt-1 text-sm" style={{ color: COLORS.muted }}>{fabric.color} · {fabric.id}</p>
        </div>
        <button onClick={onClose} className="p-2" style={{ color: COLORS.muted, borderRadius: 8 }}><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
      </header>
      <div className="space-y-8 p-7 sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          {[['Category', fabric.category], ['Supplier', fabric.supplier], ['Unit cost', fabric.unitCost], ['Last stock update', fabric.lastUpdated]].map(([label, value]) => (
            <div key={label} className="border p-4" style={{ borderColor: COLORS.border, background: COLORS.surfaceAlt, borderRadius: 8 }}>
              <div className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: COLORS.muted }}>{label}</div>
              <div className="mt-1 text-sm" style={{ color: COLORS.ink }}>{value}</div>
            </div>
          ))}
        </div>
        <div className="border p-5" style={{ borderColor: low ? COLORS.warningBorder : COLORS.successBorder, background: low ? COLORS.warningBg : COLORS.successBg, borderRadius: 10 }}>
          <div className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: COLORS.muted }}>Current stock</div>
          <div className="mono mt-2 text-3xl font-semibold" style={{ color: low ? COLORS.warning : COLORS.success }}>{fabric.stock} m</div>
          <p className="mt-1 text-sm" style={{ color: COLORS.muted }}>Reorder point: {fabric.reorderAt} m {low && '— reorder recommended.'}</p>
        </div>
        <div>
          <h3 className="text-[15px] font-semibold" style={{ color: COLORS.ink }}>Recent fabric usage</h3>
          <div className="mt-3 space-y-3">
            {fabric.usage.map((entry) => (
              <div key={`${entry.job}-${entry.date}`} className="flex items-center justify-between border p-4" style={{ borderColor: COLORS.border, borderRadius: 8 }}>
                <div>
                  <div className="font-medium" style={{ color: COLORS.ink }}>{entry.job}</div>
                  <div className="mt-1 text-xs" style={{ color: COLORS.muted }}>Recorded {entry.date}</div>
                </div>
                <span className="mono text-sm" style={{ color: COLORS.navy }}>{entry.meters}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

export default AdminInventoryView;
