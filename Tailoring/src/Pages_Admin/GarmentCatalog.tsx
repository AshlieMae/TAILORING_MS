import { useEffect, useState } from 'react';
import { Edit3, Image as ImageIcon, PackagePlus, Plus, Trash2, X } from 'lucide-react';
import { COLORS, FONT_IMPORT, EyebrowLabel, PageHeader, PrimaryButton, shadowModal } from './Theme';

type Garment = { id?: number; name: string; price: string; description: string; fabrics: string[]; image: string; colors: string[] };

const DEFAULT_CATALOG: Garment[] = [
  { name: 'Barong Tagalog', price: 'From ₱6,500', description: 'Hand-finished formal wear for weddings and ceremonies.', fabrics: ['Piña Jusi — Ivory', 'Cocoon Silk — Natural'], colors: ['#F5EEDF', '#D8C9A7'], image: 'https://ibarrafilipino.com/cdn/shop/files/Barong_Tagalog_JV402_02.png?v=1769481827&width=1200' },
  { name: 'Two-piece Suit', price: 'From ₱12,000', description: 'A tailored jacket and trousers, cut to your measurements.', fabrics: ['Italian Wool — Charcoal', 'Wool Blend — Navy'], colors: ['#393B42', '#1D2A44'], image: 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=1200' },
  { name: 'Filipiniana Dress', price: 'From ₱9,500', description: 'Custom occasion dress with a silhouette made for you.', fabrics: ['Silk Habotai — Wine', 'Satin — Blush'], colors: ['#6A2737', '#D9A6A6'], image: 'https://www.kulturafilipino.com/cdn/shop/files/Copyof_IMG8614_1800x1800.jpg?v=1722242874' },
  { name: 'School Uniform Set', price: 'From ₱2,800', description: 'Durable uniforms tailored for everyday wear.', fabrics: ['Cotton Twill — Navy', 'Cotton Poplin — White'], colors: ['#233553', '#ECE9E0'], image: 'https://images.pexels.com/photos/5212345/pexels-photo-5212345.jpeg?auto=compress&cs=tinysrgb&w=1200' },
];

const emptyGarment: Garment = { name: '', price: '', description: '', fabrics: [], image: '', colors: ['#E6DED1', '#B58A3A'] };
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const authToken = () => localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';

const fieldStyle = {
  width: '100%',
  border: '1px solid #E5E7EB',
  padding: '10px 12px',
  fontSize: 13,
  color: '#111827',
  background: '#fff',
  outline: 'none',
  borderRadius: 8,
  fontFamily: "'Inter', sans-serif",
} as React.CSSProperties;

export function AdminGarmentCatalogView() {
  const [catalog, setCatalog] = useState<Garment[]>(DEFAULT_CATALOG);
  const [editing, setEditing] = useState<Garment | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    fetch(`${API_URL}/auth/catalog`, { headers: { Authorization: `Bearer ${authToken()}` } })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message); setCatalog(data.catalog); })
      .catch((requestError) => { setError(requestError instanceof Error ? requestError.message : 'Unable to load the catalog.'); });
  }, []);
  const flash = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 3500); };
  const remove = async (garment: Garment) => {
    if (!window.confirm(`Remove ${garment.name} from the customer catalog?`)) return;
    try {
      const response = await fetch(`${API_URL}/auth/catalog/${garment.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${authToken()}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setCatalog((current) => current.filter((item) => item.id !== garment.id));
      flash(`${garment.name} was removed from the catalog.`);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to remove garment.'); }
  };
  const save = async (garment: Garment) => {
    try {
      const editId = editing?.id;
      const isEdit = Boolean(editId);
      const response = await fetch(`${API_URL}/auth/catalog${editId ? `/${editId}` : ''}`, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
        body: JSON.stringify(garment),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setCatalog((current) => isEdit ? current.map((item) => item.id === data.garment.id ? data.garment : item) : [...current, data.garment]);
      setEditing(null);
      flash(`${data.garment.name} was ${isEdit ? 'updated' : 'added'} to the catalog.`);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to save garment.'); }
  };

  return (
    <div className="space-y-7" style={{ color: COLORS.ink }}>
      <style>{FONT_IMPORT}</style>
      <PageHeader eyebrow="Customer storefront" title="Garment Catalog" description="Manage the garments customers can browse and request online. Fabric names are display labels on the cards — they are not linked to fabric inventory." action={<PrimaryButton icon={<PackagePlus />} onClick={() => setEditing(emptyGarment)}>Add garment</PrimaryButton>} />
      {notice && <div className="border px-4 py-3 text-sm" style={{ borderColor: COLORS.successBorder, background: COLORS.successBg, color: COLORS.success, borderRadius: 8 }}>{notice}</div>}
      {error && <div className="border px-4 py-3 text-sm" style={{ borderColor: COLORS.dangerBorder, background: COLORS.dangerBg, color: COLORS.danger, borderRadius: 8 }}>{error}</div>}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {catalog.map((garment) => (
          <article key={garment.id || garment.name} className="card-hover overflow-hidden border bg-white" style={{ borderColor: COLORS.border, borderRadius: 12 }}>
            <img src={garment.image} alt={garment.name} className="h-44 w-full object-cover" />
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">{garment.name}</h2>
                  <p className="mt-1 text-sm font-semibold" style={{ color: COLORS.brassDeep }}>{garment.price}</p>
                </div>
                <ImageIcon className="h-4 w-4" style={{ color: COLORS.faint }} />
              </div>
              <p className="mt-3 min-h-10 text-sm" style={{ color: COLORS.muted }}>{garment.description}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(garment.fabrics || []).slice(0, 2).map((fabric) => (
                  <span key={fabric} className="rounded-full border px-2.5 py-1 text-[10px]" style={{ borderColor: COLORS.brassSoftBorder, background: COLORS.brassSoft, color: COLORS.brassDeep }}>{fabric}</span>
                ))}
                {(garment.fabrics || []).length > 2 && <span className="rounded-full border px-2.5 py-1 text-[10px]" style={{ borderColor: COLORS.border, color: COLORS.muted }}>+{(garment.fabrics || []).length - 2} more</span>}
              </div>
              <div className="mt-5 flex gap-2">
                <button onClick={() => setEditing(garment)} className="inline-flex items-center gap-1.5 border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ borderColor: COLORS.border, borderRadius: 7, color: COLORS.inkSoft }}><Edit3 className="h-3.5 w-3.5" />Edit</button>
                <button onClick={() => remove(garment)} className="inline-flex items-center gap-1.5 border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ borderColor: '#F0C9C3', borderRadius: 7, color: COLORS.danger }}><Trash2 className="h-3.5 w-3.5" />Remove</button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {editing && <GarmentForm garment={editing} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-end justify-between gap-2">
        <EyebrowLabel>{label}</EyebrowLabel>
        {hint && <span className="text-[10px]" style={{ color: COLORS.faint }}>{hint}</span>}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function GarmentForm({ garment, onClose, onSave }: { garment: Garment; onClose: () => void; onSave: (garment: Garment) => void }) {
  const [form, setForm] = useState<Garment>({ ...garment, fabrics: [...(garment.fabrics || [])] });
  const [fabricDraft, setFabricDraft] = useState('');
  const [colorDraft, setColorDraft] = useState('#A9762F');

  const update = <K extends keyof Garment>(field: K, value: Garment[K]) => setForm((current) => ({ ...current, [field]: value }));
  const focusRing = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>, on: boolean) => {
    const el = e.currentTarget;
    el.style.borderColor = on ? COLORS.navy : '#E5E7EB';
    el.style.boxShadow = on ? `0 0 0 3px ${COLORS.navySoft}` : 'none';
  };

  const addFabric = () => {
    const value = fabricDraft.trim().replace(/,+$/, '');
    if (!value) return;
    setForm((current) => ({ ...current, fabrics: current.fabrics.includes(value) ? current.fabrics : [...current.fabrics, value] }));
    setFabricDraft('');
  };
  const removeFabric = (value: string) => setForm((current) => ({ ...current, fabrics: current.fabrics.filter((item) => item !== value) }));
  const addColor = () => {
    const value = colorDraft.toUpperCase();
    setForm((current) => ({ ...current, colors: current.colors.includes(value) ? current.colors : [...current.colors, value] }));
  };
  const removeColor = (value: string) => setForm((current) => ({ ...current, colors: current.colors.filter((item) => item.toUpperCase() !== value.toUpperCase()) }));
  const previewGradient = form.colors.length >= 2
    ? `linear-gradient(135deg, ${form.colors[0]}, ${form.colors[1]})`
    : `linear-gradient(135deg, #E6DED1, #B58A3A)`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button onClick={onClose} className="absolute inset-0" style={{ background: 'rgba(13,22,40,0.55)', backdropFilter: 'blur(4px)' }} aria-label="Close garment form" />
      <form onSubmit={(event) => { event.preventDefault(); onSave(form); }} className="rise-in relative w-full max-w-4xl overflow-hidden bg-white shadow-2xl" style={{ borderRadius: 16, border: `1px solid ${COLORS.borderStrong}`, boxShadow: shadowModal, maxHeight: '92vh' }}>
        <div className="flex items-center justify-between px-7 py-5" style={{ borderBottom: `1px solid ${COLORS.border}`, background: COLORS.surfaceAlt }}>
          <div>
            <EyebrowLabel color={COLORS.brassDeep}>Customer storefront</EyebrowLabel>
            <h2 className="mt-0.5 text-xl font-semibold" style={{ color: COLORS.ink }}>{garment.name ? 'Edit garment' : 'Add garment'}</h2>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border transition-colors hover:bg-black/5" style={{ borderColor: COLORS.border, color: COLORS.muted }} aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid gap-6 overflow-y-auto p-7 lg:grid-cols-[1.3fr_1fr]" style={{ maxHeight: 'calc(92vh - 152px)' }}>
          <div className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Garment name" hint="Title on the storefront card">
                <input value={form.name} onChange={(e) => update('name', e.target.value)} required placeholder="e.g. Barong Tagalog" style={fieldStyle} onFocus={(e) => focusRing(e, true)} onBlur={(e) => focusRing(e, false)} />
              </Field>
              <Field label="Starting price" hint="Displayed as “From ₱…”">
                <input value={form.price} onChange={(e) => update('price', e.target.value)} required placeholder="From ₱5,000" style={fieldStyle} onFocus={(e) => focusRing(e, true)} onBlur={(e) => focusRing(e, false)} />
              </Field>
            </div>
            <Field label="Available fabrics" hint="Not linked to inventory — free labels for the card">
              <div className="border" style={{ borderColor: COLORS.border, borderRadius: 8, padding: 8, background: COLORS.surfaceAlt }}>
                <div className="flex flex-wrap gap-1.5">
                  {form.fabrics.map((fabric) => (
                    <span key={fabric} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px]" style={{ background: COLORS.navy, color: '#fff' }}>
                      {fabric}
                      <button type="button" onClick={() => removeFabric(fabric)} className="opacity-70 hover:opacity-100" aria-label={`Remove ${fabric}`}><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                  <input
                    value={fabricDraft}
                    onChange={(e) => setFabricDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addFabric(); } }}
                    onBlur={addFabric}
                    placeholder={form.fabrics.length ? 'Type a fabric and press Enter…' : 'e.g. Piña Jusi — Ivory'}
                    className="min-w-[180px] flex-1 bg-transparent px-1 py-1 text-[13px] outline-none"
                    style={{ color: COLORS.ink }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between" style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 6 }}>
                  <span className="text-[10px]" style={{ color: COLORS.faint }}>{form.fabrics.length} fabric label{form.fabrics.length === 1 ? '' : 's'} — press Enter to add</span>
                  {form.fabrics.length > 0 && <button type="button" onClick={() => update('fabrics', [])} className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: COLORS.danger }}>Clear all</button>}
                </div>
              </div>
            </Field>
            <Field label="Colour palette" hint="Drives the card gradient">
              <div className="flex items-center gap-2">
                <div className="flex flex-wrap gap-1.5 flex-1">
                  {form.colors.map((color) => (
                    <span key={color} className="group relative h-8 w-8 overflow-hidden rounded-md border" style={{ background: color, borderColor: COLORS.border, borderRadius: 8 }}>
                      <button type="button" onClick={() => removeColor(color)} className="absolute inset-0 hidden items-center justify-center bg-black/50 text-white group-hover:flex" aria-label={`Remove ${color}`}><X className="h-3.5 w-3.5" /></button>
                    </span>
                  ))}
                  <span className="relative h-8 w-8 overflow-hidden rounded-md" style={{ border: `1px dashed ${COLORS.border}` }}>
                    <input type="color" value={colorDraft} onChange={(e) => setColorDraft(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label="Pick a colour" />
                    <Plus className="absolute inset-0 m-auto h-4 w-4" style={{ color: COLORS.faint }} />
                  </span>
                </div>
                <button type="button" onClick={addColor} className="border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ borderColor: COLORS.border, borderRadius: 7, color: COLORS.inkSoft }}>Add</button>
              </div>
            </Field>
          </div>
          {/* RIGHT — image + live preview */}
          <div className="space-y-5">
            <Field label="Image URL" hint="Standard https:// photo">
              <div className="relative">
                <input value={form.image} onChange={(e) => update('image', e.target.value)} required placeholder="https://…" style={{ ...fieldStyle, paddingLeft: 34 }} onFocus={(e) => focusRing(e, true)} onBlur={(e) => focusRing(e, false)} />
                <ImageIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: COLORS.faint }} />
              </div>
            </Field>
            <Field label="Storefront preview">
              <div className="overflow-hidden rounded-xl border" style={{ borderColor: COLORS.border }}>
                <div className="h-40 w-full object-cover" style={{ background: previewGradient }}>
                  {form.image ? <img src={form.image} alt="Garment preview" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : null}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold" style={{ color: COLORS.ink }}>{form.name || 'Garment name'}</h3>
                    <span className="text-xs font-semibold whitespace-nowrap" style={{ color: COLORS.brassDeep }}>{form.price || 'From ₱0'}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs" style={{ color: COLORS.muted }}>{form.description || 'A short description of this bespoke garment.'}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {form.fabrics.slice(0, 3).map((fabric) => <span key={fabric} className="rounded-full px-2 py-0.5 text-[9px]" style={{ background: COLORS.brassSoft, color: COLORS.brassDeep }}>{fabric}</span>)}
                    {form.fabrics.length === 0 && <span className="rounded-full px-2 py-0.5 text-[9px]" style={{ background: COLORS.surfaceAlt, color: COLORS.faint }}>No fabrics yet</span>}
                  </div>
                </div>
              </div>
              <p className="mt-2 text-[10px]" style={{ color: COLORS.faint }}>This is how the card appears to customers on the storefront.</p>
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-7 py-5" style={{ borderTop: `1px solid ${COLORS.border}`, background: COLORS.surfaceAlt }}>
          <button type="button" onClick={onClose} className="border px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ borderColor: COLORS.border, borderRadius: 8, color: COLORS.muted }}>Cancel</button>
          <PrimaryButton type="submit" icon={<Plus />}>{garment.name ? 'Save changes' : 'Add garment'}</PrimaryButton>
        </div>
      </form>
    </div>
  );
}

export default AdminGarmentCatalogView;