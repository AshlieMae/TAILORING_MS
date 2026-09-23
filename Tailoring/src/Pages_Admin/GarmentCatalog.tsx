import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Archive, ArchiveRestore, Boxes, CheckCircle2, ChevronDown, Edit3, Eye, FileSpreadsheet, Image as ImageIcon,
  LayoutGrid, List, LoaderCircle, Maximize2, PackagePlus, Palette, PenLine, Plus, Scissors, ShieldAlert, Shirt,
  Sparkles, SwatchBook, Tags, Trash2, UploadCloud, X, ZoomIn, ZoomOut,
} from 'lucide-react';
import ExcelJS from 'exceljs';
import {
  COLORS, FONT_IMPORT, EyebrowLabel, IconTile, PageHeader, PrimaryButton, SecondaryButton, SearchField,
  TableHeadRow, Badge, shadowModal,
} from './Theme';
import { buildDescriptionContext, generateGarmentDescription, type DescriptionEngine } from './garmentDescription';
import { DEFAULT_IMAGE_FRAMING, normalizeFraming } from '../utils/imageFraming';
import { formatPHP } from '../utils/currency';
import { CatalogImage } from '../utils/CatalogImage';
import { ChipSelect, FabricInventorySelect, OptionCard, type FabricOption } from './optionPickers';
import { STYLE_DESIGNS, CUSTOMIZATION_OPTIONS } from '../Pages_Frontdesk/garmentCatalogData';
import {
  buildGarmentTypeRegistry, findGarmentType, hasRateCardRules, rateCardStatus, registryCategories,
  type GarmentTypeEntry, type RateCardRow,
} from '../utils/garmentTypes';

/**
 * A catalog garment is a REAL business record — not display data. Besides the
 * storefront presentation it carries the official taxonomy, the pricing rule
 * (base_price), the production workflow, what may be customized, and the
 * measurement profile the intake form uses.
 */
type Garment = {
  id?: number;
  name: string;
  price: string;
  description: string;
  fabrics: string[];
  image: string;
  colors: string[];
  // --- Structured business fields ---
  garment_category: string;
  garment_type: string;
  base_price: string;
  production_workflow: string;
  allowed_styles: string[];
  allowed_fabrics: string[];
  allowed_customizations: string[];
  measurement_profile: string;
  active: number;
  // --- Image framing (set in the Live Catalog Preview, reused by the Front
  // Desk catalog, the picker, quotations and the customer storefront) ---
  image_zoom?: number;
  image_pos_x?: number;
  image_pos_y?: number;
  image_crop_mode?: 'contain' | 'cover';
};

const WORKFLOWS = ['formal_barong', 'suit', 'coat', 'gown', 'dress', 'uniform', 'bespoke', 'standard'];
const MEASUREMENT_PROFILES = [
  { value: 'upper_body', label: 'Upper body (shirts, barong, blazers)' },
  { value: 'lower_body', label: 'Lower body (trousers, skirts)' },
  { value: 'full_body', label: 'Full body (suits, gowns, uniforms)' },
  { value: 'head', label: 'Head / accessory' },
];

const WORKFLOW_LABELS: Record<string, string> = {
  formal_barong: 'Formal · Barong',
  suit: 'Suit',
  coat: 'Coat',
  gown: 'Gown',
  dress: 'Dress',
  uniform: 'Uniform',
  bespoke: 'Bespoke',
  standard: 'Standard',
};

const PROFILE_LABELS: Record<string, string> = {
  upper_body: 'Upper body',
  lower_body: 'Lower body',
  full_body: 'Full body',
  head: 'Head / accessory',
};

const CATEGORIES = ['Formal Wear', 'School Uniform', 'Uniforms', "Women's Wear", 'Bespoke'];

const DEFAULT_CATALOG: Garment[] = [
  { name: 'Barong Tagalog', price: 'From ₱6,500', description: 'Hand-finished formal wear for weddings and ceremonies.', fabrics: ['Piña Jusi — Ivory', 'Cocoon Silk — Natural'], colors: ['#F5EEDF', '#D8C9A7'], image: 'https://ibarrafilipino.com/cdn/shop/files/Barong_Tagalog_JV402_02.png?v=1769481827&width=1200',
    garment_category: 'Formal Wear', garment_type: 'Barong Tagalog', base_price: '6500', production_workflow: 'formal_barong',
    allowed_styles: ["Classic","Modern","Minimalist"], allowed_fabrics: [], allowed_customizations: ["Embroidery","French Cuff","Custom Collar"],
    measurement_profile: 'upper_body', active: 1 },
  { name: 'Two-piece Suit', price: 'From ₱12,000', description: 'A tailored jacket and trousers, cut to your measurements.', fabrics: ['Italian Wool — Charcoal', 'Wool Blend — Navy'], colors: ['#393B42', '#1D2A44'], image: 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=1200',
    garment_category: 'Formal Wear', garment_type: 'Two-Piece Suit', base_price: '12000', production_workflow: 'suit',
    allowed_styles: ["Classic","Modern","Fitted"], allowed_fabrics: [], allowed_customizations: ["Lining","Custom Collar","Pocket Style"],
    measurement_profile: 'full_body', active: 1 },
  { name: 'Filipiniana Dress', price: 'From ₱9,500', description: 'Custom occasion dress with a silhouette made for you.', fabrics: ['Silk Habotai — Wine', 'Satin — Blush'], colors: ['#6A2737', '#D9A6A6'], image: 'https://www.kulturafilipino.com/cdn/shop/files/Copyof_IMG8614_1800x1800.jpg?v=1722242874',
    garment_category: 'Formal Wear', garment_type: 'Filipiniana Dress', base_price: '9500', production_workflow: 'gown',
    allowed_styles: ["Traditional","Modern","Ruffled"], allowed_fabrics: [], allowed_customizations: ["Embroidery","Lining","Sleeve Style"],
    measurement_profile: 'full_body', active: 1 },
  { name: 'School Uniform Set', price: 'From ₱2,800', description: 'Durable uniforms tailored for everyday wear.', fabrics: ['Cotton Twill — Navy', 'Cotton Poplin — White'], colors: ['#233553', '#ECE9E0'], image: 'https://images.pexels.com/photos/5212345/pexels-photo-5212345.jpeg?auto=compress&cs=tinysrgb&w=1200',
    garment_category: 'School Uniform', garment_type: 'Regular Uniform', base_price: '1800', production_workflow: 'uniform',
    allowed_styles: ["Classic","Loose Fit"], allowed_fabrics: [], allowed_customizations: ["Embroidery","Pocket Style"],
    measurement_profile: 'full_body', active: 1 },
];

const emptyGarment: Garment = {
  name: '', price: '', description: '', fabrics: [], image: '', colors: ['#E6DED1', '#B58A3A'],
  garment_category: '', garment_type: '', base_price: '', production_workflow: 'standard',
  allowed_styles: [], allowed_fabrics: [], allowed_customizations: [],
  measurement_profile: 'full_body', active: 1,
  ...DEFAULT_IMAGE_FRAMING,
};
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

const peso = (value: string | number | null | undefined) => formatPHP(value);

/** Photo formats the upload endpoint accepts (mirrors the server's allow-list). */
const PHOTO_FORMATS = ['JPG', 'PNG', 'WEBP'];
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Best-effort file name for an already-saved photo: the stored record only
 * keeps a URL, so the last path segment is the closest thing to a file name.
 */
function fileNameFromUrl(url: string): { name: string; size: number | null } | null {
  const value = (url || '').trim();
  if (!value) return null;
  try {
    const path = new URL(value, window.location.origin).pathname;
    const base = decodeURIComponent(path.split('/').filter(Boolean).pop() || '');
    return base ? { name: base, size: null } : null;
  } catch {
    return null;
  }
}

const formatBytes = (bytes: number | null | undefined) => {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export function AdminGarmentCatalogView() {
  const [catalog, setCatalog] = useState<Garment[]>(DEFAULT_CATALOG);
  const [editing, setEditing] = useState<Garment | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [view, setView] = useState<'table' | 'cards'>('table');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [workflowFilter, setWorkflowFilter] = useState('All Workflows');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [profileFilter, setProfileFilter] = useState('All Profiles');
  const [details, setDetails] = useState<Garment | null>(null);
  // The Admin Rate Card (GET /api/auth/pricing) is the same source the Front
  // Desk quotes from — it names the pricing engine's garment types, so the
  // catalog can only offer types the quote engine can actually price.
  const [rateCard, setRateCard] = useState<RateCardRow[]>([]);
  const [rateCardState, setRateCardState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  useEffect(() => {
    fetch(`${API_URL}/auth/catalog`, { headers: { Authorization: `Bearer ${authToken()}` } })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message); setCatalog(data.catalog); })
      .catch((requestError) => { setError(requestError instanceof Error ? requestError.message : 'Unable to load the catalog.'); });
    fetch(`${API_URL}/auth/pricing`, { headers: { Authorization: `Bearer ${authToken()}` } })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message); return data.rate_card; })
      .then((card) => { setRateCard(card?.garment_types || []); setRateCardState('ready'); })
      .catch(() => { setRateCardState('unavailable'); });
  }, []);
  // One shared garment-type list for the whole system: Front Desk taxonomy +
  // rate-card types + whatever the live catalog already uses.
  const registry = buildGarmentTypeRegistry({ rateCard, catalog });
  const flash = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 3500); };
  const remove = async (garment: Garment) => {
    if (!window.confirm(`Remove ${garment.name} from the customer catalog?`)) return;
    try {
      const response = await fetch(`${API_URL}/auth/catalog/${garment.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${authToken()}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setCatalog((current) => current.filter((item) => item.id !== garment.id));
      setDetails(null);
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
  /** Archive = flip the storefront flag in place (PATCH with the existing record). */
  const toggleArchive = async (garment: Garment) => {
    try {
      const response = await fetch(`${API_URL}/auth/catalog/${garment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
        body: JSON.stringify({ ...garment, active: garment.active ? 0 : 1 }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setCatalog((current) => current.map((item) => item.id === data.garment.id ? data.garment : item));
      setDetails((current) => current && current.id === data.garment.id ? data.garment : current);
      flash(`${data.garment.name} was ${data.garment.active ? 'restored to the storefront' : 'archived from the storefront'}.`);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to update garment status.'); }
  };
  const exportCatalog = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Ashlie's Tailor";
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('Garment Catalog');
    sheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Garment Name', key: 'name', width: 26 },
      { header: 'Category', key: 'category', width: 18 },
      { header: 'Type', key: 'type', width: 20 },
      { header: 'Base Price', key: 'base', width: 14 },
      { header: 'Workflow', key: 'workflow', width: 16 },
      { header: 'Measurement Profile', key: 'profile', width: 20 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'Styles', key: 'styles', width: 28 },
      { header: 'Customizations', key: 'customizations', width: 32 },
    ];
    sheet.getRow(1).font = { bold: true };
    filtered.forEach((garment) => sheet.addRow({
      id: garment.id ?? '', name: garment.name, category: garment.garment_category, type: garment.garment_type,
      base: Number(garment.base_price || 0), workflow: garment.production_workflow, profile: garment.measurement_profile,
      status: garment.active ? 'Active' : 'Inactive', styles: (garment.allowed_styles || []).join(', '),
      customizations: (garment.allowed_customizations || []).join(', '),
    }));
    const file = await workbook.xlsx.writeBuffer();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([file], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    link.download = 'ashlies-tailor-garment-catalog.xlsx';
    link.click();
    URL.revokeObjectURL(link.href);
    flash('Catalog exported to Excel.');
  };

  const filtered = catalog.filter((garment) => {
    const haystack = `${garment.name} ${garment.description} ${garment.garment_category} ${garment.garment_type} ${garment.production_workflow}`.toLowerCase();
    return haystack.includes(query.toLowerCase())
      && (categoryFilter === 'All Categories' || garment.garment_category === categoryFilter)
      && (workflowFilter === 'All Workflows' || garment.production_workflow === workflowFilter)
      && (statusFilter === 'All Statuses' || (statusFilter === 'Active' ? garment.active : !garment.active))
      && (profileFilter === 'All Profiles' || garment.measurement_profile === profileFilter);
  });

  // A record needs pricing attention when its type is missing from the rate
  // card (the Front Desk could not quote it) or its base price has drifted from
  // the rate-card figure. Without rate-card data we only flag the obvious gaps.
  const rateCardReady = hasRateCardRules(registry);
  const pricingIssues = rateCardReady
    ? catalog.filter((garment) => rateCardStatus(registry, garment.garment_type, garment.base_price).state !== 'priced')
    : catalog.filter((garment) => !garment.garment_type || !garment.base_price);
  const needsReview = pricingIssues.length;

  return (
    <div style={{ color: COLORS.ink }}>
      <style>{FONT_IMPORT}</style>
      <div className="space-y-6" style={{ maxWidth: 1600, margin: '0 auto' }}>
        <PageHeader
          eyebrow="Catalog management"
          title="Garment Catalog Management"
          description="Manage tailoring designs, garment classifications, pricing rules, workflows, customization options, and storefront visibility."
          action={(
            <div className="flex flex-wrap gap-3">
              <SecondaryButton icon={<FileSpreadsheet />} onClick={exportCatalog}>Export Catalog</SecondaryButton>
              <PrimaryButton icon={<PackagePlus />} onClick={() => setEditing(emptyGarment)}>Add Garment</PrimaryButton>
            </div>
          )}
        />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <CatalogKpi icon={<Shirt />} label="Total Garments" value={catalog.length} description="Catalog records managed here" tone="neutral" />
          <CatalogKpi icon={<CheckCircle2 />} label="Active Garments" value={catalog.filter((item) => item.active).length} description="Visible on the storefront" tone="success" />
          <CatalogKpi icon={<Archive />} label="Inactive Garments" value={catalog.filter((item) => !item.active).length} description="Hidden from customers" tone="info" />
          <CatalogKpi
            icon={<ShieldAlert />}
            label="Pricing Review Required"
            value={needsReview}
            description={rateCardState === 'ready'
              ? 'Not on the rate card, or price differs'
              : rateCardState === 'loading' ? 'Checking the rate card…' : 'Rate card unavailable — price not verified'}
            tone={needsReview ? 'warning' : 'success'}
          />
        </section>

        {notice && <div className="border px-4 py-3 text-sm" style={{ borderColor: COLORS.successBorder, background: COLORS.successBg, color: COLORS.success, borderRadius: 8 }}>{notice}</div>}
        {error && <div className="border px-4 py-3 text-sm" style={{ borderColor: COLORS.dangerBorder, background: COLORS.dangerBg, color: COLORS.danger, borderRadius: 8 }}>{error}</div>}

        {/* Search + filter bar */}
        <section className="border bg-white p-4" style={{ borderColor: COLORS.border, borderRadius: 16, boxShadow: '0 1px 3px rgba(16,24,40,0.06)' }}>
          <div className="flex flex-wrap items-center gap-3">
            <SearchField value={query} onChange={setQuery} placeholder="Search Garments..." />
            <div className="ml-auto flex items-center gap-1 border p-1" style={{ borderColor: COLORS.border, borderRadius: 8, background: COLORS.surfaceAlt }}>
              <ViewToggle active={view === 'table'} onClick={() => setView('table')} icon={<List className="h-3.5 w-3.5" />}>Table View</ViewToggle>
              <ViewToggle active={view === 'cards'} onClick={() => setView('cards')} icon={<LayoutGrid className="h-3.5 w-3.5" />}>Card View</ViewToggle>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <FilterSelect value={categoryFilter} onChange={setCategoryFilter}>
              <option>All Categories</option>
              {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              {catalog.map((garment) => garment.garment_category).filter((value, index, all) => value && !all.slice(0, index).includes(value) && !CATEGORIES.includes(value)).map((value) => <option key={value}>{value}</option>)}
            </FilterSelect>
            <FilterSelect value={workflowFilter} onChange={setWorkflowFilter}>
              <option>All Workflows</option>
              {WORKFLOWS.map((workflow) => <option key={workflow} value={workflow}>{WORKFLOW_LABELS[workflow] || workflow}</option>)}
            </FilterSelect>
            <FilterSelect value={statusFilter} onChange={setStatusFilter}>
              <option>All Statuses</option>
              <option>Active</option>
              <option>Inactive</option>
            </FilterSelect>
            <FilterSelect value={profileFilter} onChange={setProfileFilter}>
              <option>All Profiles</option>
              {MEASUREMENT_PROFILES.map((profile) => <option key={profile.value} value={profile.value}>{profile.label}</option>)}
            </FilterSelect>
            <span className="ml-auto text-[11px]" style={{ color: COLORS.muted }}>{filtered.length} of {catalog.length} records</span>
          </div>
        </section>

        {view === 'table' ? (
          <section className="border bg-white" style={{ borderColor: COLORS.border, borderRadius: 16, boxShadow: '0 1px 3px rgba(16,24,40,0.06)', overflow: 'hidden' }}>
            <TableHeadRow gridCols="grid-cols-[64px_1.4fr_1fr_1fr_0.9fr_1fr_0.8fr_180px]" columns={['Image', 'Garment Name', 'Category', 'Type', 'Base Price', 'Workflow', 'Status', 'Actions']} />
            {filtered.map((garment) => <GarmentTableRow key={garment.id || garment.name} garment={garment} registry={registry} onEdit={() => setEditing(garment)} onArchive={() => toggleArchive(garment)} onDelete={() => remove(garment)} onDetails={() => setDetails(garment)} />)}
            {!filtered.length && <div className="p-14 text-center text-sm" style={{ color: COLORS.muted }}>No garment records match the current filters.</div>}
          </section>
        ) : (
          <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((garment) => <GarmentCard key={garment.id || garment.name} garment={garment} registry={registry} onEdit={() => setEditing(garment)} onArchive={() => toggleArchive(garment)} onDelete={() => remove(garment)} onDetails={() => setDetails(garment)} />)}
            {!filtered.length && <div className="p-14 text-center text-sm sm:col-span-2 xl:col-span-3" style={{ color: COLORS.muted }}>No garment records match the current filters.</div>}
          </section>
        )}
      </div>
      {details && <GarmentDetailsDrawer garment={details} registry={registry} onClose={() => setDetails(null)} onEdit={() => { setEditing(details); setDetails(null); }} onArchive={() => toggleArchive(details)} onDelete={() => remove(details)} />}
      {editing && <GarmentForm garment={editing} registry={registry} rateCardState={rateCardState} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

/** KPI tile with a short description — States the number and what it means. */
function CatalogKpi({ icon, label, value, description, tone }: {
  icon: React.ReactNode; label: string; value: number; description: string; tone?: 'neutral' | 'success' | 'info' | 'warning';
}) {
  return (
    <div className="card-hover rise-in border p-5" style={{ borderColor: COLORS.border, background: COLORS.surface, borderRadius: 16, boxShadow: '0 1px 3px rgba(16,24,40,0.06)' }}>
      <IconTile icon={icon} tone={tone || 'neutral'} />
      <div className="mt-4 text-[26px] font-semibold tracking-[-0.01em]" style={{ color: COLORS.ink }}>{value}</div>
      <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.1em]" style={{ color: COLORS.muted }}>{label}</div>
      <p className="mt-1.5 text-[11px] leading-relaxed" style={{ color: COLORS.faint }}>{description}</p>
    </div>
  );
}

function ViewToggle({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold transition-colors"
      style={active ? { background: COLORS.navy, color: '#fff', borderRadius: 6 } : { color: COLORS.muted, borderRadius: 6 }}
    >
      {icon}{children}
    </button>
  );
}

function FilterSelect({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className="relative inline-flex items-center">
      <select value={value} onChange={(e) => onChange(e.target.value)} className="cursor-pointer appearance-none border bg-white py-2 pl-3 pr-8 text-[12px] outline-none transition-colors" style={{ borderColor: COLORS.border, borderRadius: 8, color: COLORS.inkSoft, maxWidth: 230 }}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5" style={{ color: COLORS.faint }} />
    </div>
  );
}

function StatusBadge({ active }: { active: number }) {
  return <Badge tone={active ? 'success' : 'neutral'}>{active ? 'Active' : 'Inactive'}</Badge>;
}

function IconButton({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="inline-flex h-8 w-8 items-center justify-center border transition-colors hover:bg-black/[0.04]"
      style={{ borderColor: danger ? COLORS.dangerBorder : COLORS.border, borderRadius: 7, color: danger ? COLORS.danger : COLORS.inkSoft }}
    >
      {children}
    </button>
  );
}

/** One management-table record row — the admin's primary lens on the catalog. */
function GarmentTableRow({ garment, registry, onEdit, onArchive, onDelete, onDetails }: {
  garment: Garment; registry: GarmentTypeEntry[]; onEdit: () => void; onArchive: () => void; onDelete: () => void; onDetails: () => void;
}) {
  const pricing = rateCardStatus(registry, garment.garment_type, garment.base_price);
  const rateCardReady = hasRateCardRules(registry);
  return (
    <div className="card-hover grid grid-cols-2 items-center gap-4 border-b px-6 py-4 md:grid-cols-[64px_1.4fr_1fr_1fr_0.9fr_1fr_0.8fr_180px]" style={{ borderColor: COLORS.border }}>
      <div className="h-14 w-16 shrink-0 overflow-hidden" style={{ borderRadius: 8, background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}` }}>
        {garment.image
          ? <CatalogImage src={garment.image} alt={garment.name} framing={garment} className="h-full w-full" />
          : <div className="flex h-full w-full items-center justify-center text-[9px]" style={{ color: COLORS.faint }}>No photo</div>}
      </div>
      <div className="min-w-0">
        <button type="button" onClick={onDetails} className="block max-w-full truncate text-left text-sm font-semibold hover:underline" style={{ color: COLORS.ink }} title="View details">{garment.name}</button>
        <span className="mono text-[10px]" style={{ color: COLORS.faint }}>#{garment.id ?? '—'}</span>
      </div>
      <span className="truncate text-[12px]" style={{ color: COLORS.inkSoft }}>{garment.garment_category || '—'}</span>
      <div className="min-w-0">
        <span className="block truncate text-[12px]" style={{ color: COLORS.inkSoft }}>{garment.garment_type || '—'}</span>
        {rateCardReady && pricing.state === 'unpriced' && <span className="mt-0.5 block text-[10px]" style={{ color: COLORS.warning }}>Not on rate card</span>}
      </div>
      <div className="min-w-0">
        <span className="mono block text-[12px]" style={{ color: COLORS.ink }}>{peso(garment.base_price)}</span>
        {rateCardReady && pricing.drift !== null && pricing.entry && (
          <span className="mt-0.5 block text-[10px]" style={{ color: COLORS.warning }} title="The Front Desk quotes the rate-card price">
            Rate card {peso(pricing.entry.basePrice)}
          </span>
        )}
      </div>
      <span className="truncate text-[12px]" style={{ color: COLORS.inkSoft }}>{WORKFLOW_LABELS[garment.production_workflow] || garment.production_workflow || '—'}</span>
      <span><StatusBadge active={garment.active} /></span>
      <div className="flex items-center justify-end gap-1.5">
        <IconButton label="View details" onClick={onDetails}><Eye className="h-3.5 w-3.5" /></IconButton>
        <IconButton label="Edit" onClick={onEdit}><Edit3 className="h-3.5 w-3.5" /></IconButton>
        <IconButton label={garment.active ? 'Archive' : 'Restore'} onClick={onArchive}>
          {garment.active ? <Archive className="h-3.5 w-3.5" /> : <ArchiveRestore className="h-3.5 w-3.5" />}
        </IconButton>
        <IconButton label="Delete" danger onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></IconButton>
      </div>
    </div>
  );
}

/** Compact management card — only the essentials; the rest lives in Details. */
function GarmentCard({ garment, registry, onEdit, onArchive, onDelete, onDetails }: {
  garment: Garment; registry: GarmentTypeEntry[]; onEdit: () => void; onArchive: () => void; onDelete: () => void; onDetails: () => void;
}) {
  const pricing = rateCardStatus(registry, garment.garment_type, garment.base_price);
  return (
    <article className="card-hover overflow-hidden border bg-white" style={{ borderColor: COLORS.border, borderRadius: 16, boxShadow: '0 1px 3px rgba(16,24,40,0.06)' }}>
      <div className="relative">
        <CatalogImage src={garment.image} alt={garment.name} framing={garment} className="h-40 w-full" />
        <span className="absolute left-3 top-3"><StatusBadge active={garment.active} /></span>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-[15px] font-semibold">{garment.name}</h2>
          <span className="whitespace-nowrap text-sm font-semibold" style={{ color: COLORS.brassDeep }}>{garment.price || peso(garment.base_price)}</span>
        </div>
        <p className="mt-1 text-[11px]" style={{ color: COLORS.muted }}>{garment.garment_type || garment.garment_category || 'Uncategorised'}</p>
        {hasRateCardRules(registry) && pricing.state !== 'priced' && (
          <p className="mt-1 text-[10px]" style={{ color: COLORS.warning }}>
            {pricing.state === 'unpriced' ? 'Not on the rate card — Front Desk cannot quote it' : 'Base price differs from the rate card'}
          </p>
        )}
        <div className="mt-4 flex items-center gap-2">
          <button type="button" onClick={onDetails} className="inline-flex items-center gap-1.5 border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors hover:bg-black/[0.04]" style={{ borderColor: COLORS.border, borderRadius: 7, color: COLORS.inkSoft }}>
            Details
          </button>
          <button type="button" onClick={onEdit} className="inline-flex items-center gap-1.5 border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors hover:bg-black/[0.04]" style={{ borderColor: COLORS.border, borderRadius: 7, color: COLORS.inkSoft }}>
            <Edit3 className="h-3.5 w-3.5" />Edit
          </button>
          <div className="ml-auto flex items-center gap-1.5">
            <IconButton label={garment.active ? 'Archive' : 'Restore'} onClick={onArchive}>{garment.active ? <Archive className="h-3.5 w-3.5" /> : <ArchiveRestore className="h-3.5 w-3.5" />}</IconButton>
            <IconButton label="Delete" danger onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></IconButton>
          </div>
        </div>
      </div>
    </article>
  );
}

/** Slide-in details drawer: the full record without opening the edit form.
    Portalled to <body> so no ancestor transform / backdrop-filter / overflow in
    the dashboard shell can clip it at any zoom level. */
function GarmentDetailsDrawer({ garment, registry, onClose, onEdit, onArchive, onDelete }: {
  garment: Garment; registry: GarmentTypeEntry[]; onClose: () => void; onEdit: () => void; onArchive: () => void; onDelete: () => void;
}) {
  const pricing = rateCardStatus(registry, garment.garment_type, garment.base_price);
  const rateCardReady = hasRateCardRules(registry);
  useLockBodyScroll();
  return createPortal((
    <div className="fixed inset-0 z-40">
      <button onClick={onClose} className="absolute inset-0" style={{ background: 'rgba(13,22,40,0.45)', backdropFilter: 'blur(2px)' }} aria-label="Close details" />
      <aside className="rise-in absolute right-0 top-0 flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl" style={{ borderLeft: `1px solid ${COLORS.border}` }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
          <div>
            <EyebrowLabel color={COLORS.brassDeep}>Catalog record #{garment.id ?? '—'}</EyebrowLabel>
            <h2 className="mt-1 text-lg font-semibold">{garment.name}</h2>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border transition-colors hover:bg-black/5" style={{ borderColor: COLORS.border, color: COLORS.muted }} aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 space-y-5 p-6">
          <div className="overflow-hidden" style={{ borderRadius: 12, border: `1px solid ${COLORS.border}`, background: COLORS.surfaceAlt }}>
            {garment.image
              ? <CatalogImage src={garment.image} alt={garment.name} framing={garment} className="h-52 w-full bg-white" />
              : <div className="flex h-52 items-center justify-center text-xs" style={{ color: COLORS.faint }}>No photo attached</div>}
          </div>
          <StatusBadge active={garment.active} />
          {garment.description && <p className="text-sm leading-relaxed" style={{ color: COLORS.inkSoft }}>{garment.description}</p>}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[12px]">
            <Detail label="Category" value={garment.garment_category || '—'} />
            <Detail label="Type" value={garment.garment_type || '—'} />
            <Detail label="Base price" value={peso(garment.base_price)} />
            <Detail label="Starting price" value={garment.price || '—'} />
            <Detail label="Workflow" value={WORKFLOW_LABELS[garment.production_workflow] || garment.production_workflow || '—'} />
            <Detail label="Measurement profile" value={PROFILE_LABELS[garment.measurement_profile] || garment.measurement_profile || '—'} />
            {rateCardReady && (
              <Detail
                label="Rate card"
                value={pricing.state === 'priced'
                  ? `Priced — ${peso(pricing.entry?.basePrice)} (${pricing.entry?.workflow || 'standard'})`
                  : pricing.state === 'drifted' ? `Record ${peso(garment.base_price)} · rate card ${peso(pricing.entry?.basePrice)}`
                    : 'Not on the rate card'}
              />
            )}
            {rateCardReady && <Detail label="Front Desk availability" value={pricing.state === 'priced' ? 'Quotable at intake' : 'No pricing rule — intake cannot quote'} />}
          </dl>
          {rateCardReady && pricing.state !== 'priced' && (
            <div className="border px-3 py-2.5 text-[11px] leading-relaxed" style={{ borderColor: COLORS.warningBorder, background: COLORS.warningBg, color: COLORS.warning, borderRadius: 8 }}>
              {pricing.message}
            </div>
          )}
          <ChipGroup label="Allowed styles" values={garment.allowed_styles} />
          <ChipGroup label="Allowed fabrics" values={garment.allowed_fabrics.length ? garment.allowed_fabrics : garment.fabrics} />
          <ChipGroup label="Allowed customizations" values={garment.allowed_customizations} />
        </div>
        <div className="flex items-center gap-2 px-6 py-4" style={{ borderTop: `1px solid ${COLORS.border}`, background: COLORS.surfaceAlt }}>
          <button type="button" onClick={onEdit} className="inline-flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-[11px] font-semibold text-white" style={{ background: COLORS.navy, borderRadius: 8 }}><Edit3 className="h-3.5 w-3.5" />Edit record</button>
          <button type="button" onClick={onArchive} className="inline-flex items-center gap-2 border px-4 py-2.5 text-[11px] font-semibold" style={{ borderColor: COLORS.border, borderRadius: 8, color: COLORS.inkSoft }}>
            {garment.active ? <Archive className="h-3.5 w-3.5" /> : <ArchiveRestore className="h-3.5 w-3.5" />}{garment.active ? 'Archive' : 'Restore'}
          </button>
          <IconButton label="Delete" danger onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></IconButton>
        </div>
      </aside>
    </div>
  ), document.body);
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <EyebrowLabel>{label}</EyebrowLabel>
      <div className="mt-1 text-[12px]" style={{ color: COLORS.inkSoft }}>{value}</div>
    </div>
  );
}

function ChipGroup({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <EyebrowLabel>{label}</EyebrowLabel>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {(values || []).map((value) => (
          <span key={value} className="rounded-full border px-2.5 py-1 text-[11px]" style={{ borderColor: COLORS.brassSoftBorder, background: COLORS.brassSoft, color: COLORS.brassDeep }}>{value}</span>
        ))}
        {!(values || []).length && <span className="text-[11px]" style={{ color: COLORS.faint }}>None configured</span>}
      </div>
    </div>
  );
}

type FormTab = 'basic' | 'business' | 'styles' | 'media';
const FORM_TABS: { key: FormTab; label: string }[] = [
  { key: 'basic', label: 'Basic Information' },
  { key: 'business', label: 'Business Rules' },
  { key: 'styles', label: 'Styles & Customizations' },
  { key: 'media', label: 'Media & Appearance' },
];

function GarmentForm({ garment, registry, rateCardState, onClose, onSave }: {
  garment: Garment; registry: GarmentTypeEntry[]; rateCardState: 'loading' | 'ready' | 'unavailable';
  onClose: () => void; onSave: (garment: Garment) => void;
}) {
  const [form, setForm] = useState<Garment>({ ...garment, fabrics: [...(garment.fabrics || [])] });
  // Fabric choices come straight from the Fabric Inventory module
  // (GET /api/auth/catalog/fabrics — the shared fabric_inventory table), the
  // same shelf the Front Desk offers at intake.
  const [fabricOptions, setFabricOptions] = useState<FabricOption[]>([]);
  const [colorDraft, setColorDraft] = useState('#A9762F');
  const [tab, setTab] = useState<FormTab>('basic');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [typeHighlight, setTypeHighlight] = useState(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // --- Garment photo state: upload metadata + preview view controls ---
  // The preview never crops by default; `cardFit` is the Admin's explicit
  // opt-in to crop the *storefront card* view only (the stored photo is
  // untouched either way).
  const [imageInfo, setImageInfo] = useState<{ name: string; size: number | null } | null>(() => fileNameFromUrl(garment.image));
  const [lightboxOpen, setLightboxOpen] = useState(false);
  // Image framing lives ON the record (form.image_*) so the Admin's Live
  // Preview is what the Front Desk catalog, picker, quotes and storefront
  // render — there is no separate preview-only rendering path.
  const framing = normalizeFraming(form);
  const resetFraming = () => setForm((current) => ({ ...current, ...DEFAULT_IMAGE_FRAMING }));
  const setFraming = (next: Partial<typeof DEFAULT_IMAGE_FRAMING>) => setForm((current) => ({ ...current, ...normalizeFraming({ ...normalizeFraming(current), ...next }) }));
  // --- AI description assistant state ---
  const [drafting, setDrafting] = useState(false);
  const [draftEngine, setDraftEngine] = useState<DescriptionEngine | null>(null);
  const [draftSources, setDraftSources] = useState<string[]>([]);
  const [draftMissing, setDraftMissing] = useState<string[]>([]);
  const [draftEdited, setDraftEdited] = useState(false);
  const [draftError, setDraftError] = useState('');
  useLockBodyScroll();

  const update = <K extends keyof Garment>(field: K, value: Garment[K]) => setForm((current) => ({ ...current, [field]: value }));
  const focusRing = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>, on: boolean) => {
    const el = e.currentTarget;
    el.style.borderColor = on ? COLORS.navy : '#E5E7EB';
    el.style.boxShadow = on ? `0 0 0 3px ${COLORS.navySoft}` : 'none';
  };

  // Fabric Inventory shelf — loaded once per form session. Failures fall back
  // to an empty shelf and the picker explains how to fix it.
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/auth/catalog/fabrics`, { headers: { Authorization: `Bearer ${authToken()}` } })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message); return data.fabrics; })
      .then((fabrics) => { if (!cancelled) setFabricOptions(fabrics || []); })
      .catch(() => { if (!cancelled) setFabricOptions([]); });
    return () => { cancelled = true; };
  }, []);

  /**
   * Description assistant: reads the garment's own business fields (name,
   * category, type, workflow, measurement profile, styles, fabrics,
   * customizations) and drafts storefront copy. The result lands in the normal
   * description field, so the admin can rewrite it before saving.
   */
  const draftDescription = async () => {
    const context = buildDescriptionContext(form);
    if (!context.name && !context.garmentType) {
      setDraftError('Add the garment name first, so the description has something to describe.');
      return;
    }
    setDrafting(true);
    setDraftError('');
    try {
      const result = await generateGarmentDescription(context);
      update('description', result.text);
      setDraftEngine(result.engine);
      setDraftSources(result.sources);
      setDraftMissing(result.missing);
      setDraftEdited(false);
    } catch (error) {
      setDraftError(error instanceof Error ? error.message : 'Could not draft a description.');
    } finally {
      setDrafting(false);
    }
  };

  /**
   * Garment type is chosen from the shared registry, never typed by hand, so
   * the value always matches what the Front Desk intake offers and what the
   * Pricing Engine keys its rules on. Selecting a type also pulls its category,
   * base price and production workflow across from the rate card.
   */
  const chooseGarmentType = (type: string) => {
    const entry = findGarmentType(registry, type);
    setForm((current) => ({
      ...current,
      garment_type: type,
      garment_category: entry?.category || current.garment_category,
      base_price: entry && entry.basePrice !== null ? String(entry.basePrice) : current.base_price,
      production_workflow: entry?.workflow || current.production_workflow,
    }));
  };

  /** Keeps what the admin typed, but adopts the registry's canonical casing when it matches an existing type. */
  const commitTypeText = () => {
    const typed = form.garment_type.trim();
    const canonical = registry.find((entry) => entry.type.toLowerCase() === typed.toLowerCase());
    if (canonical && canonical.type !== form.garment_type) chooseGarmentType(canonical.type);
    setTypeMenuOpen(false);
    setTypeHighlight(-1);
  };

  const selectTypeSuggestion = (entry: GarmentTypeEntry) => {
    chooseGarmentType(entry.type);
    setTypeMenuOpen(false);
    setTypeHighlight(-1);
  };

  const onTypeInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!typeMenuOpen) { setTypeMenuOpen(true); setTypeHighlight(typeSuggestions.length ? 0 : -1); return; }
      if (!typeSuggestions.length) return;
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      setTypeHighlight((current) => (current + delta + typeSuggestions.length) % typeSuggestions.length);
      return;
    }
    if (event.key === 'Enter') {
      // Never let this single-line field submit the whole garment form.
      event.preventDefault();
      const highlighted = typeMenuOpen && typeHighlight >= 0 ? typeSuggestions[typeHighlight] : null;
      if (highlighted) { selectTypeSuggestion(highlighted); return; }
      commitTypeText();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setTypeMenuOpen(false);
      setTypeHighlight(-1);
    }
  };

  /**
   * The category and its garment types cascade. Switching to a category the
   * current type does not belong to clears the type (and the price and workflow
   * synced from it), so a record can never carry a type from another category.
   */
  const chooseGarmentCategory = (category: string) => {
    const entry = findGarmentType(registry, form.garment_type);
    const typeBelongs = !form.garment_type || entry?.category === category;
    setForm((current) => typeBelongs
      ? { ...current, garment_category: category }
      : { ...current, garment_category: category, garment_type: '', base_price: '', production_workflow: 'standard' });
  };

  /** Re-applies the rate-card category / base price / workflow to the record. */
  const syncFromRateCard = () => {
    const entry = findGarmentType(registry, form.garment_type);
    if (!entry) return;
    setForm((current) => ({
      ...current,
      garment_category: entry.category || current.garment_category,
      base_price: entry.basePrice !== null ? String(entry.basePrice) : current.base_price,
      production_workflow: entry.workflow || current.production_workflow,
    }));
  };

  const pricing = rateCardStatus(registry, form.garment_type, form.base_price);
  const knownCategories = registryCategories(registry).filter(Boolean);

  // Customization presets: the intake form's structured categories (collars,
  // sleeves, embroidery) plus a curated quick-pick list. Custom values on the
  // record are always preserved and shown as "custom" chips.
  const customizationChoices = [
    'Embroidery', 'Monogram', 'French Cuff', 'Custom Collar', 'Premium Buttons',
    'Hidden Pocket', 'Lining', 'Pocket Style', 'Sleeve Style',
    ...CUSTOMIZATION_OPTIONS.collarStyles.filter((option) => option !== 'Hooded'),
    ...CUSTOMIZATION_OPTIONS.sleeveStyles.filter((option) => option !== 'Sleeveless'),
  ].filter((value, index, all) => all.indexOf(value) === index);

  // Storefront label suggestions reuse the allowed fabrics, so the card copy
  // matches what the shop can actually cut.
  const fabricLabelSuggestions = form.allowed_fabrics.filter((label) => !form.fabrics.includes(label));

  // --- Garment-type combobox -------------------------------------------------
  // Free text is allowed — bespoke shops regularly garment types that are not
  // on the standard list — while the shared registry supplies ranked
  // suggestions as the admin types.
  const typeQuery = form.garment_type.trim().toLowerCase();
  const typeSuggestions: GarmentTypeEntry[] = (() => {
    if (!typeQuery) {
      const preferred = form.garment_category
        ? registry.filter((entry) => entry.category === form.garment_category)
        : [];
      return [...preferred, ...registry.filter((entry) => !preferred.includes(entry))].slice(0, 8);
    }
    return registry
      .map((entry) => {
        const type = entry.type.toLowerCase();
        const category = entry.category.toLowerCase();
        const match = type.startsWith(typeQuery) ? 0 : type.includes(typeQuery) ? 1 : category.includes(typeQuery) ? 2 : -1;
        const preferred = form.garment_category && entry.category === form.garment_category ? 0 : 1;
        return { entry, rank: match === -1 ? 99 : match * 10 + preferred };
      })
      .filter((scored) => scored.rank < 99)
      .sort((a, b) => a.rank - b.rank || a.entry.type.localeCompare(b.entry.type))
      .map((scored) => scored.entry)
      .slice(0, 8);
  })();
  const exactTypeMatch = registry.find((entry) => entry.type.toLowerCase() === typeQuery) || null;
  const isNewTypeInput = Boolean(typeQuery) && !exactTypeMatch;

  const addColor = () => {
    const value = colorDraft.toUpperCase();
    setForm((current) => ({ ...current, colors: current.colors.includes(value) ? current.colors : [...current.colors, value] }));
  };
  const removeColor = (value: string) => setForm((current) => ({ ...current, colors: current.colors.filter((item) => item.toUpperCase() !== value.toUpperCase()) }));

  /** Removes the attached photo from the record (the file stays on the server). */
  const removePhoto = () => {
    update('image', '');
    setImageInfo(null);
    setUploadError('');
    resetFraming();
    setLightboxOpen(false);
  };
  const pickPhoto = () => fileInputRef.current?.click();
  /** Same endpoint + payload as before — now sent through XHR so a real
      progress percentage can be shown while the photo uploads. */
  const uploadCatalogImage = (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setUploadError('Choose a JPG, PNG, or WEBP image.'); return; }
    setUploadingImage(true);
    setUploadProgress(0);
    setUploadError('');
    try {
      const body = new FormData();
      body.append('files', file);
      const request = new XMLHttpRequest();
      request.open('POST', `${API_URL}/uploads/references`);
      request.setRequestHeader('Authorization', `Bearer ${authToken()}`);
      request.upload.onprogress = (event) => { if (event.lengthComputable) setUploadProgress(Math.round((event.loaded / event.total) * 100)); };
      request.onload = () => {
        setUploadingImage(false);
        try {
          const data = JSON.parse(request.responseText || '{}');
          if (request.status < 200 || request.status >= 300 || !data.files?.[0]?.url) throw new Error(data.message || 'Could not upload the garment image.');
          update('image', data.files[0].url);
          setImageInfo({ name: file.name, size: file.size });
          resetFraming();
        } catch (error) { setUploadError(error instanceof Error ? error.message : 'Could not upload the garment image.'); }
      };
      request.onerror = () => { setUploadingImage(false); setUploadError('Could not upload the garment image.'); };
      request.send(body);
    } catch (error) {
      setUploadingImage(false);
      setUploadError(error instanceof Error ? error.message : 'Could not upload the garment image.');
    }
  };
  const previewGradient = form.colors.length >= 2
    ? `linear-gradient(135deg, ${form.colors[0]}, ${form.colors[1]})`
    : 'linear-gradient(135deg, #E6DED1, #B58A3A)';

  return createPortal((
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <button onClick={onClose} className="absolute inset-0" style={{ background: 'rgba(13,22,40,0.55)', backdropFilter: 'blur(4px)' }} aria-label="Close garment form" />
      <form onSubmit={(event) => { event.preventDefault(); onSave(form); }} className="rise-in relative flex w-full max-w-[76rem] min-w-0 flex-col overflow-hidden bg-white" style={{ borderRadius: 16, border: `1px solid ${COLORS.borderStrong}`, boxShadow: shadowModal, maxHeight: '94vh' }}>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-7" style={{ borderBottom: `1px solid ${COLORS.border}`, background: COLORS.surfaceAlt }}>
          <div className="min-w-0">
            <EyebrowLabel color={COLORS.brassDeep}>Catalog record</EyebrowLabel>
            <h2 className="mt-0.5 truncate text-lg font-semibold sm:text-xl" style={{ color: COLORS.ink }}>{garment.name ? `Edit garment — ${garment.name}` : 'Add garment'}</h2>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors hover:bg-black/5" style={{ borderColor: COLORS.border, color: COLORS.muted }} aria-label="Close"><X className="h-4 w-4" /></button>
        </div>

        {/* Tab bar — never shrinks, scrolls horizontally when the row is wider
            than the modal, and stays pinned above the scrolling content. The
            flex column parent plus shrink-0 is what keeps every tab visible at
            every zoom level (the row can no longer be squeezed out of view). */}
        <div
          role="tablist"
          aria-label="Garment form sections"
          className="scrollbar-thin sticky top-0 z-20 flex shrink-0 gap-1 overflow-x-auto overscroll-x-contain whitespace-nowrap px-3 pt-3 sm:px-7"
          style={{ borderBottom: `1px solid ${COLORS.border}`, background: COLORS.surface }}
        >
          {FORM_TABS.map((entry) => {
            const active = tab === entry.key;
            return (
              <button
                key={entry.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(entry.key)}
                className="shrink-0 whitespace-nowrap px-3.5 py-2.5 text-[12px] font-semibold transition-colors sm:px-4"
                style={active
                  ? { color: COLORS.navy, borderBottom: `2px solid ${COLORS.brass}`, background: COLORS.surfaceAlt, borderRadius: '8px 8px 0 0' }
                  : { color: COLORS.muted, borderBottom: '2px solid transparent' }}
              >
                {entry.label}
              </button>
            );
          })}
        </div>

        {/* Body — fluid grid: content takes the remaining space (minmax(0,1fr))
            and the Live Preview column is clamped, so it can never squeeze the
            form fields or the tab strip. Single column below lg. */}
        <div className="scrollbar-thin grid min-h-0 flex-1 gap-5 overflow-y-auto p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_clamp(230px,26vw,340px)]">
          <div className="min-w-0 space-y-5">
            {tab === 'basic' && (
              <>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Garment name" hint="Title on the storefront card">
                    <input value={form.name} onChange={(e) => update('name', e.target.value)} required placeholder="e.g. Barong Tagalog" style={fieldStyle} onFocus={(e) => focusRing(e, true)} onBlur={(e) => focusRing(e, false)} />
                  </Field>
                  <Field label="Starting price" hint="Displayed as “From ₱…”">
                    <input value={form.price} onChange={(e) => update('price', e.target.value)} required placeholder="From ₱5,000" style={fieldStyle} onFocus={(e) => focusRing(e, true)} onBlur={(e) => focusRing(e, false)} />
                  </Field>
                </div>
                <Field
                  label="Description"
                  hint="Shown on the storefront card"
                  action={(
                    <button
                      type="button"
                      onClick={draftDescription}
                      disabled={drafting}
                      title={form.description ? 'Draft a fresh version from the garment details' : 'Draft a description from the garment details'}
                      className="inline-flex items-center gap-1.5 border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors disabled:cursor-wait disabled:opacity-60"
                      style={{ borderColor: COLORS.brassSoftBorder, background: COLORS.brassSoft, color: COLORS.brassDeep, borderRadius: 7 }}
                    >
                      {drafting
                        ? <><LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Writing…</>
                        : <><Sparkles className="h-3.5 w-3.5" /> {form.description ? 'Regenerate with AI' : 'Generate with AI'}</>}
                    </button>
                  )}
                >
                  <textarea
                    value={form.description}
                    onChange={(e) => { update('description', e.target.value); if (draftEngine) setDraftEdited(true); }}
                    rows={4}
                    placeholder="Write it yourself, or let the assistant draft it from the garment name, category, styles, fabrics, and customizations."
                    style={{ ...fieldStyle, resize: 'vertical', borderColor: draftEngine && !draftEdited ? COLORS.brassSoftBorder : '#E5E7EB' }}
                    onFocus={(e) => focusRing(e, true)}
                    onBlur={(e) => focusRing(e, false)}
                  />
                  {drafting && (
                    <p className="mt-2 flex items-center gap-1.5 text-[10px]" style={{ color: COLORS.brassDeep }}>
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Reading the garment details and drafting professional copy…
                    </p>
                  )}
                  {!drafting && draftError && (
                    <p className="mt-2 text-[10px]" style={{ color: COLORS.danger }}>{draftError}</p>
                  )}
                  {!drafting && draftEngine && !draftError && (
                    <div className="mt-2.5 border px-3 py-2.5" style={{ borderColor: draftEdited ? COLORS.border : COLORS.brassSoftBorder, background: COLORS.surfaceAlt, borderRadius: 8 }}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: draftEdited ? COLORS.navySoft : COLORS.brassSoft, color: draftEdited ? COLORS.navy : COLORS.brassDeep }}>
                          {draftEdited ? <><PenLine className="h-3 w-3" /> Edited by you</> : <><Sparkles className="h-3 w-3" /> {draftEngine === 'cloud' ? 'AI-generated' : 'AI-drafted'}</>}
                        </span>
                        <span className="text-[10px]" style={{ color: COLORS.muted }}>
                          {draftSources.length ? `Based on ${draftSources.join(' · ')}.` : 'Based on the garment details entered so far.'}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[10px]" style={{ color: COLORS.faint }}>
                        {draftEdited
                          ? 'Your wording is kept as-is — regenerate any time to start again from the fields.'
                          : 'Review and edit before saving — nothing is stored until you save the record.'}
                        {draftMissing.length > 0 && ` Add ${draftMissing.slice(0, 3).join(', ')} for a richer draft.`}
                      </p>
                    </div>
                  )}
                </Field>
                <Field label="Storefront status">
                  <select value={form.active ? '1' : '0'} onChange={(e) => update('active', e.target.value === '1' ? 1 : 0)} style={fieldStyle}>
                    <option value="1">Active — shown to customers</option>
                    <option value="0">Inactive — hidden</option>
                  </select>
                </Field>
              </>
            )}

            {tab === 'business' && (
              <section className="grid gap-4 sm:grid-cols-2" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 16 }}>
                <p className="text-[11px] sm:col-span-2" style={{ color: COLORS.faint }}>
                  Category and garment type come from the shared system list, so the storefront, the Front Desk intake and the Pricing Engine all refer to the same garment. Start typing to see suggestions — picking one pulls its category, base price and workflow from the rate card — or type a brand-new bespoke garment. A new type needs a rate-card rule before the Front Desk can quote it.
                </p>
                <Field label="Garment category" hint="Filters the garment type list">
                  <select value={form.garment_category} onChange={(e) => chooseGarmentCategory(e.target.value)} style={fieldStyle}>
                    <option value="">Select a category</option>
                    {knownCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                    {form.garment_category && !knownCategories.includes(form.garment_category) && (
                      <option value={form.garment_category}>{form.garment_category} (current)</option>
                    )}
                  </select>
                </Field>
                <Field label="Garment type" hint="Suggestions from the shared list — or type your own">
                  <div className="relative">
                    <input
                      value={form.garment_type}
                      onChange={(e) => { update('garment_type', e.target.value); setTypeMenuOpen(true); setTypeHighlight(-1); }}
                      onFocus={(e) => { focusRing(e, true); setTypeMenuOpen(true); }}
                      onKeyDown={onTypeInputKeyDown}
                      onBlur={(e) => { focusRing(e, false); commitTypeText(); }}
                      placeholder="e.g. Barong Tagalog — or type a bespoke garment"
                      autoComplete="off"
                      role="combobox"
                      aria-expanded={typeMenuOpen}
                      aria-autocomplete="list"
                      style={{ ...fieldStyle, paddingRight: 32 }}
                    />
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: COLORS.faint }} />
                    {typeMenuOpen && (
                      <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden border bg-white" style={{ borderColor: COLORS.borderStrong, borderRadius: 10, boxShadow: '0 12px 32px -12px rgba(16,24,40,0.28)' }}>
                        <div className="max-h-64 overflow-y-auto">
                          {typeSuggestions.map((entry, index) => (
                            <button
                              key={entry.type}
                              type="button"
                              tabIndex={-1}
                              onMouseDown={(e) => { e.preventDefault(); selectTypeSuggestion(entry); }}
                              onMouseEnter={() => setTypeHighlight(index)}
                              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors"
                              style={{ background: typeHighlight === index ? COLORS.navySoft : 'transparent' }}
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-[13px] font-medium" style={{ color: COLORS.ink }}>{entry.type}</span>
                                <span className="block truncate text-[10px]" style={{ color: COLORS.faint }}>
                                  {entry.category || 'Uncategorised'}{entry.sources.includes('rate-card') ? ' · on the rate card' : ''}
                                </span>
                              </span>
                              <span className="mono whitespace-nowrap text-[11px]" style={{ color: entry.basePrice !== null ? COLORS.brassDeep : COLORS.warning }}>
                                {entry.basePrice !== null ? formatPHP(entry.basePrice) : 'no rate-card price'}
                              </span>
                            </button>
                          ))}
                          {!typeSuggestions.length && (
                            <div className="px-3 py-2.5 text-[11px]" style={{ color: COLORS.faint }}>
                              No match in the shared list — you can use this as a new garment type.
                            </div>
                          )}
                        </div>
                        {isNewTypeInput && (
                          <div className="border-t px-3 py-2 text-[10px] leading-relaxed" style={{ borderColor: COLORS.border, background: COLORS.brassSoft, color: COLORS.brassDeep }}>
                            Press Enter to use “{form.garment_type.trim()}” as a new garment type — add a rate-card rule for it so the Front Desk can quote it.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="mt-2 border px-3 py-2.5 text-[10px] leading-relaxed" style={{
                    borderColor: typeMenuOpen && isNewTypeInput ? COLORS.brassSoftBorder : pricing.state === 'priced' ? COLORS.successBorder : pricing.state === 'empty' ? COLORS.border : COLORS.warningBorder,
                    background: typeMenuOpen && isNewTypeInput ? COLORS.surfaceAlt : pricing.state === 'priced' ? COLORS.successBg : pricing.state === 'empty' ? COLORS.surfaceAlt : COLORS.warningBg,
                    color: typeMenuOpen && isNewTypeInput ? COLORS.muted : pricing.state === 'priced' ? COLORS.success : pricing.state === 'empty' ? COLORS.faint : COLORS.warning,
                    borderRadius: 8,
                  }}>
                    {typeMenuOpen && isNewTypeInput
                      ? 'Keep typing to narrow the suggestions — pick one, or press Enter to keep what you typed.'
                      : (<>
                          {rateCardState === 'loading' && 'Loading the rate card…'}
                          {rateCardState === 'unavailable' && 'Rate card unavailable — showing the shop’s standard garment list. Prices will sync once the server responds.'}
                          {rateCardState === 'ready' && pricing.message}
                        </>)}
                    {!typeMenuOpen && pricing.state === 'drifted' && (
                      <button
                        type="button"
                        onClick={syncFromRateCard}
                        className="mt-1.5 inline-flex items-center gap-1 border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]"
                        style={{ borderColor: COLORS.warningBorder, color: COLORS.warning, background: COLORS.surface, borderRadius: 6 }}
                      >
                        Use rate-card price
                      </button>
                    )}
                  </div>
                </Field>
                <Field label="Garment type source" hint="Single source of truth">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(pricing.entry?.sources || []).map((source) => (
                      <span key={source} className="rounded-full border px-2.5 py-1 text-[10px]" style={{ borderColor: COLORS.border, background: COLORS.surface, color: COLORS.inkSoft }}>
                        {source === 'rate-card' ? 'Admin Rate Card' : source === 'front-desk' ? 'Front Desk intake list' : 'Existing catalog records'}
                      </span>
                    ))}
                    {!pricing.entry?.sources.length && <span className="text-[10px]" style={{ color: COLORS.faint }}>Pick a garment type to see where it comes from.</span>}
                  </div>
                </Field>
                <Field label="Base price (₱)" hint="The pricing rule base price">
                  <div className="flex items-center gap-2">
                    <input type="number" min={0} step={50} value={form.base_price} onChange={(e) => update('base_price', e.target.value)} placeholder="6500" style={fieldStyle} onFocus={(e) => focusRing(e, true)} onBlur={(e) => focusRing(e, false)} />
                    {rateCardState === 'ready' && pricing.state !== 'empty' && (
                      <button
                        type="button"
                        onClick={syncFromRateCard}
                        title="Apply the rate-card category, base price and workflow"
                        className="whitespace-nowrap border px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors hover:bg-black/[0.04]"
                        style={{ borderColor: COLORS.border, color: COLORS.inkSoft, borderRadius: 8, background: COLORS.surface }}
                      >
                        Sync
                      </button>
                    )}
                  </div>
                </Field>
                <Field label="Production workflow">
                  <select value={form.production_workflow} onChange={(e) => update('production_workflow', e.target.value)} style={fieldStyle}>
                    {WORKFLOWS.map((wf) => <option key={wf} value={wf}>{WORKFLOW_LABELS[wf] || wf}</option>)}
                  </select>
                </Field>
                <Field label="Measurement profile" hint="What intake asks to measure">
                  <select value={form.measurement_profile} onChange={(e) => update('measurement_profile', e.target.value)} style={fieldStyle}>
                    {MEASUREMENT_PROFILES.map((profile) => <option key={profile.value} value={profile.value}>{profile.label}</option>)}
                  </select>
                </Field>
              </section>
            )}

            {tab === 'styles' && (
              <div className="space-y-5">
                <p className="text-[11px] leading-relaxed" style={{ color: COLORS.faint }}>
                  These selections become the chip options the Front Desk offers at intake — configure them once here and every module (catalog, intake, quotation, production) offers exactly the same choices.
                </p>

                <OptionCard
                  icon={<Scissors className="h-4 w-4" />}
                  title="Allowed Styles"
                  description="Design lines offered for this garment — same vocabulary as the shop's style library and the pricing engine's style adjustments."
                  count={form.allowed_styles.length}
                >
                  <ChipSelect
                    options={STYLE_DESIGNS}
                    values={form.allowed_styles}
                    onChange={(next) => update('allowed_styles', next)}
                    addLabel="Add New Style"
                    emptyHint="No styles yet — click a chip below to allow one."
                  />
                </OptionCard>

                <OptionCard
                  icon={<SwatchBook className="h-4 w-4" />}
                  title="Allowed Fabrics"
                  description="Linked live to the Fabric Inventory — only what exists on the shelf is offered, with stock levels at a glance."
                  count={form.allowed_fabrics.length}
                >
                  <FabricInventorySelect
                    fabrics={fabricOptions}
                    values={form.allowed_fabrics}
                    onChange={(next) => update('allowed_fabrics', next)}
                  />
                </OptionCard>

                <OptionCard
                  icon={<Tags className="h-4 w-4" />}
                  title="Allowed Customizations"
                  description="Finishing options the intake form offers: collars, sleeves, embroidery, lining and pockets — the categories the pricing engine charges for."
                  count={form.allowed_customizations.length}
                >
                  <ChipSelect
                    options={customizationChoices}
                    values={form.allowed_customizations}
                    onChange={(next) => update('allowed_customizations', next)}
                    addLabel="Add New Customization"
                    emptyHint="No customizations yet — click a chip below to allow one."
                  />
                </OptionCard>

                <OptionCard
                  icon={<Boxes className="h-4 w-4" />}
                  title="Storefront Fabric Labels"
                  description="Short labels shown on the storefront card — usually the two or three flagship fabrics of this design."
                  count={form.fabrics.length}
                >
                  <ChipSelect
                    options={fabricLabelSuggestions}
                    values={form.fabrics}
                    onChange={(next) => update('fabrics', next)}
                    addLabel="Add Label"
                    emptyHint="No labels yet — reuse an allowed fabric or write a short card label."
                  />
                </OptionCard>
              </div>
            )}

            {tab === 'media' && (
              <div className="space-y-5">
                {/* ---------------- UPLOAD AREA (left panel) ---------------- */}
                <section className="border bg-white" style={{ borderColor: COLORS.border, borderRadius: 14, boxShadow: '0 1px 3px rgba(16,24,40,0.05)' }}>
                  <header className="flex items-start gap-3 px-4 pt-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center" style={{ background: COLORS.brassSoft, color: COLORS.brassDeep, borderRadius: 9 }}>
                      <UploadCloud className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[13px] font-semibold" style={{ color: COLORS.ink }}>Garment Photo</h3>
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{
                          background: form.image ? COLORS.successBg : COLORS.surfaceAlt,
                          color: form.image ? COLORS.success : COLORS.faint,
                        }}>
                          {uploadingImage ? 'Uploading…' : form.image ? 'Attached' : 'No photo'}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] leading-relaxed" style={{ color: COLORS.muted }}>
                        Stored with the catalog record and shown on the storefront card. The full photo is always kept — nothing is cropped on upload.
                      </p>
                    </div>
                  </header>

                  <div className="px-4 pb-4 pt-3">
                    {/* Drop zone with drag feedback */}
                    <div
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickPhoto(); } }}
                      onDragOver={(e) => { e.preventDefault(); if (!dragOver) setDragOver(true); }}
                      onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => { e.preventDefault(); setDragOver(false); const file = e.dataTransfer.files?.[0]; if (file) uploadCatalogImage(file); }}
                      onClick={pickPhoto}
                      className="flex cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed px-6 py-9 text-center transition-all"
                      style={{
                        borderColor: dragOver ? COLORS.brassDeep : COLORS.brassSoftBorder,
                        background: dragOver ? COLORS.brassSoft : COLORS.surfaceAlt,
                        borderRadius: 14,
                        boxShadow: dragOver ? `0 0 0 4px ${COLORS.brassSoft}` : 'none',
                        transform: dragOver ? 'scale(1.01)' : 'scale(1)',
                      }}
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded-full transition-colors" style={{ background: dragOver ? COLORS.brassDeep : COLORS.surface, border: `1px solid ${dragOver ? COLORS.brassDeep : COLORS.border}` }}>
                        <UploadCloud className="h-6 w-6" style={{ color: dragOver ? '#fff' : COLORS.brassDeep }} />
                      </span>
                      <p className="text-[13px] font-semibold" style={{ color: COLORS.ink }}>
                        {dragOver ? 'Drop to upload' : form.image ? 'Replace Garment Photo' : 'Upload Garment Photo'}
                      </p>
                      <p className="text-[11px]" style={{ color: COLORS.muted }}>
                        {dragOver ? 'Release the file to attach it' : 'Drag & drop your photo here, or click to browse'}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
                        {PHOTO_FORMATS.map((format) => (
                          <span key={format} className="rounded-full border px-2 py-0.5 text-[9px] font-semibold tracking-wide" style={{ borderColor: COLORS.border, background: COLORS.surface, color: COLORS.inkSoft }}>{format}</span>
                        ))}
                        <span className="text-[10px]" style={{ color: COLORS.faint }}>· up to {Math.round(PHOTO_MAX_BYTES / (1024 * 1024))} MB</span>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadCatalogImage(file); e.target.value = ''; }}
                      />
                    </div>

                    {/* Upload progress */}
                    {uploadingImage && (
                      <div className="mt-3 border px-3 py-2.5" style={{ borderColor: COLORS.navySoftBorder, background: COLORS.navySoft, borderRadius: 10 }}>
                        <div className="flex items-center justify-between text-[10px] font-medium" style={{ color: COLORS.navy }}>
                          <span className="inline-flex items-center gap-1.5"><LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Uploading photo…</span>
                          <span className="mono">{uploadProgress}%</span>
                        </div>
                        <div className="mt-2 h-1.5 w-full overflow-hidden" style={{ background: '#fff', borderRadius: 4 }}>
                          <div className="h-full transition-all" style={{ width: `${uploadProgress}%`, background: COLORS.brass, borderRadius: 4 }} />
                        </div>
                      </div>
                    )}
                    {uploadError && (
                      <div className="mt-3 border px-3 py-2 text-[11px]" style={{ borderColor: COLORS.dangerBorder, background: COLORS.dangerBg, color: COLORS.danger, borderRadius: 8 }}>
                        {uploadError}
                      </div>
                    )}

                    {/* Upload information */}
                    <dl className="mt-3 grid gap-2 sm:grid-cols-3">
                      <UploadFact label="File name" value={imageInfo?.name || '—'} />
                      <UploadFact label="Image size" value={formatBytes(imageInfo?.size)} />
                      <UploadFact
                        label="Upload status"
                        value={uploadingImage ? `Uploading · ${uploadProgress}%` : form.image ? 'Uploaded & attached' : 'Awaiting upload'}
                        tone={uploadingImage ? 'info' : form.image ? 'success' : 'muted'}
                      />
                    </dl>

                    {/* Image controls */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button type="button" onClick={pickPhoto} disabled={uploadingImage} className="inline-flex items-center gap-1.5 border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors hover:bg-black/[0.04] disabled:opacity-50" style={{ borderColor: COLORS.border, borderRadius: 8, color: COLORS.inkSoft, background: COLORS.surface }}>
                        <UploadCloud className="h-3.5 w-3.5" /> {form.image ? 'Replace Photo' : 'Choose Photo'}
                      </button>
                      <button type="button" onClick={() => setLightboxOpen(true)} disabled={!form.image} className="inline-flex items-center gap-1.5 border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors hover:bg-black/[0.04] disabled:opacity-40" style={{ borderColor: COLORS.border, borderRadius: 8, color: COLORS.inkSoft, background: COLORS.surface }}>
                        <Maximize2 className="h-3.5 w-3.5" /> View Full Image
                      </button>
                      <button type="button" onClick={removePhoto} disabled={!form.image} className="inline-flex items-center gap-1.5 border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors hover:bg-black/[0.04] disabled:opacity-40" style={{ borderColor: COLORS.dangerBorder, borderRadius: 8, color: COLORS.danger, background: COLORS.surface }}>
                        <Trash2 className="h-3.5 w-3.5" /> Remove Photo
                      </button>
                      <span className="text-[10px]" style={{ color: COLORS.faint }}>The complete photo is shown — nothing is cropped automatically.</span>
                    </div>
                  </div>
                </section>

                {/* ---------------- COLOUR PALETTE (bottom section) ---------------- */}
                <section className="border bg-white" style={{ borderColor: COLORS.border, borderRadius: 14, boxShadow: '0 1px 3px rgba(16,24,40,0.05)' }}>
                  <header className="flex items-start gap-3 px-4 pt-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center" style={{ background: COLORS.brassSoft, color: COLORS.brassDeep, borderRadius: 9 }}>
                      <Palette className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[13px] font-semibold" style={{ color: COLORS.ink }}>Colour Palette</h3>
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: COLORS.navySoft, color: COLORS.navy }}>{form.colors.length} colour{form.colors.length === 1 ? '' : 's'}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] leading-relaxed" style={{ color: COLORS.muted }}>
                        Sets the storefront card backdrop behind the photo (first two colours become the gradient).
                      </p>
                    </div>
                  </header>
                  <div className="px-4 pb-4 pt-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-24 shrink-0 items-end overflow-hidden border" style={{ borderColor: COLORS.border, background: previewGradient, borderRadius: 10 }}>
                        {form.image && <img src={form.image} alt="" className="h-full w-full object-contain p-1" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                      </div>
                      <div className="flex flex-1 flex-wrap gap-2">
                        {form.colors.map((color) => (
                          <span key={color} className="group relative h-9 w-9" style={{ borderRadius: 10 }}>
                            <span className="block h-full w-full border" style={{ background: color, borderColor: COLORS.border, borderRadius: 10 }} />
                            <button type="button" onClick={() => removeColor(color)} className="absolute inset-0 hidden items-center justify-center rounded-[10px] bg-black/50 text-white group-hover:flex" aria-label={`Remove ${color}`}><X className="h-3.5 w-3.5" /></button>
                            <span className="mono pointer-events-none absolute -bottom-3.5 left-1/2 hidden -translate-x-1/2 text-[8px] sm:block" style={{ color: COLORS.faint }}>{color}</span>
                          </span>
                        ))}
                        <span className="relative h-9 w-9 overflow-hidden" style={{ border: `1px dashed ${COLORS.borderStrong}`, borderRadius: 10 }}>
                          <input type="color" value={colorDraft} onChange={(e) => setColorDraft(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label="Pick a colour" />
                          <Plus className="absolute inset-0 m-auto h-4 w-4" style={{ color: COLORS.faint }} />
                        </span>
                      </div>
                      <button type="button" onClick={addColor} className="shrink-0 border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors hover:bg-black/[0.04]" style={{ borderColor: COLORS.border, borderRadius: 8, color: COLORS.inkSoft, background: COLORS.surface }}>Add Colour</button>
                    </div>
                  </div>
                </section>
              </div>
            )}

          </div>

          {/* RIGHT — Live Catalog Preview = exactly what the Front Desk shows */}
          <div className="min-w-0 lg:sticky lg:top-0 lg:self-start">
            <section className="border bg-white" style={{ borderColor: COLORS.border, borderRadius: 14, boxShadow: '0 4px 16px -8px rgba(16,24,40,0.18)' }}>
              <header className="flex flex-wrap items-center gap-2 px-4 pt-4">
                <div className="min-w-0 flex-1">
                  <EyebrowLabel color={COLORS.brassDeep}>Live catalog preview</EyebrowLabel>
                  <p className="mt-0.5 text-[10px]" style={{ color: COLORS.faint }}>Exactly what the Front Desk and customers see</p>
                </div>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{
                  background: form.image ? COLORS.successBg : COLORS.surfaceAlt,
                  color: form.image ? COLORS.success : COLORS.faint,
                }}>
                  {form.image ? 'Photo ready' : 'No photo'}
                </span>
              </header>

              <div className="px-4 pb-4 pt-3">
                {/* The storefront card itself: photo (framed), name, price, description, colour theme */}
                <div className="overflow-hidden border" style={{ borderColor: COLORS.border, borderRadius: 12, background: COLORS.surface }}>
                  <div className="relative h-48 w-full overflow-hidden" style={{ background: previewGradient }}>
                    {form.image ? (
                      <CatalogImage src={form.image} alt={form.name ? `${form.name} preview` : 'Garment preview'} framing={framing} className="h-full w-full" />
                    ) : (
                      <button type="button" onClick={() => setTab('media')} className="flex h-full w-full flex-col items-center justify-center gap-2 text-center">
                        <ImageIcon className="h-8 w-8" style={{ color: COLORS.faint }} />
                        <span className="text-[11px] font-medium" style={{ color: COLORS.inkSoft }}>No photo attached yet</span>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: COLORS.brassDeep }}>Upload on the Media tab</span>
                      </button>
                    )}
                    {form.image && (
                      <div className="absolute right-2 top-2 flex items-center gap-1 border bg-white/95 px-1 py-1" style={{ borderColor: COLORS.border, borderRadius: 8 }}>
                        <button type="button" onClick={() => setFraming({ image_zoom: Math.max(1, Number((framing.image_zoom - 0.25).toFixed(2))) })} disabled={framing.image_zoom <= 1} className="flex h-6 w-6 items-center justify-center disabled:opacity-35" aria-label="Zoom out" title="Zoom out"><ZoomOut className="h-3.5 w-3.5" style={{ color: COLORS.inkSoft }} /></button>
                        <button type="button" onClick={() => setFraming({ image_zoom: 1 })} className="mono px-1 text-[10px]" title="Reset zoom" style={{ color: COLORS.muted }}>{Math.round(framing.image_zoom * 100)}%</button>
                        <button type="button" onClick={() => setFraming({ image_zoom: Math.min(3, Number((framing.image_zoom + 0.25).toFixed(2))) })} disabled={framing.image_zoom >= 3} className="flex h-6 w-6 items-center justify-center disabled:opacity-35" aria-label="Zoom in" title="Zoom in"><ZoomIn className="h-3.5 w-3.5" style={{ color: COLORS.inkSoft }} /></button>
                        <span className="mx-0.5 h-4 w-px" style={{ background: COLORS.border }} />
                        <button type="button" onClick={() => setLightboxOpen(true)} className="flex h-6 w-6 items-center justify-center" aria-label="View full image" title="View full image"><Maximize2 className="h-3.5 w-3.5" style={{ color: COLORS.inkSoft }} /></button>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold" style={{ color: COLORS.ink }}>{form.name || 'Garment name'}</h3>
                      <span className="whitespace-nowrap text-[13px] font-semibold" style={{ color: COLORS.brassDeep }}>{form.price || 'From ₱0'}</span>
                    </div>
                    <p className="mt-2 line-clamp-3 text-xs leading-relaxed" style={{ color: COLORS.muted }}>{form.description || 'A short description of this bespoke garment.'}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {form.colors.map((color) => (
                        <span key={color} className="h-4 w-4 rounded-full border" style={{ background: color, borderColor: COLORS.border }} title={color} />
                      ))}
                      {!form.colors.length && <span className="text-[10px]" style={{ color: COLORS.faint }}>No colour theme set</span>}
                    </div>
                  </div>
                </div>


                {/* Framing tools — these ARE the settings saved with the record
                    and rendered by every other surface. Upload facts and upload
                    controls live once, in the Media tab's photo card. */}
                <div className="mt-3 border px-3 py-3" style={{ borderColor: COLORS.border, background: COLORS.surfaceAlt, borderRadius: 10 }}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: COLORS.muted }}>Image framing</span>
                    <div className="flex items-center gap-1 border p-0.5" style={{ borderColor: COLORS.border, borderRadius: 7, background: COLORS.surface }}>
                      <button type="button" onClick={() => setFraming({ image_crop_mode: 'contain' })} title="Show the whole photo" className="px-2 py-1 text-[10px] font-semibold" style={framing.image_crop_mode === 'contain' ? { background: COLORS.navy, color: '#fff', borderRadius: 5 } : { color: COLORS.muted, borderRadius: 5 }}>Fit</button>
                      <button type="button" onClick={() => setFraming({ image_crop_mode: 'cover' })} title="Fill the card (crops the photo — optional)" className="px-2 py-1 text-[10px] font-semibold" style={framing.image_crop_mode === 'cover' ? { background: COLORS.navy, color: '#fff', borderRadius: 5 } : { color: COLORS.muted, borderRadius: 5 }}>Fill card</button>
                    </div>
                  </div>
                  <div className="mt-2.5 grid gap-2">
                    <FramingSlider label="Horizontal position" value={framing.image_pos_x} onChange={(value) => setFraming({ image_pos_x: value })} />
                    <FramingSlider label="Vertical position" value={framing.image_pos_y} onChange={(value) => setFraming({ image_pos_y: value })} />
                  </div>
                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <span className="text-[10px]" style={{ color: COLORS.faint }}>Saved with the record and reused everywhere.</span>
                    <button type="button" onClick={resetFraming} className="border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors hover:bg-black/[0.04]" style={{ borderColor: COLORS.border, borderRadius: 7, color: COLORS.inkSoft, background: COLORS.surface }}>Reset</button>
                  </div>
                </div>
              </div>
            </section>
            <p className="mt-2 text-[10px]" style={{ color: COLORS.faint }}>This is how the card appears to customers on the storefront — the photo is shown whole, never cropped.</p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-7" style={{ borderTop: `1px solid ${COLORS.border}`, background: COLORS.surfaceAlt }}>
          <span className="text-[11px]" style={{ color: COLORS.faint }}>Tab {FORM_TABS.findIndex((entry) => entry.key === tab) + 1} of {FORM_TABS.length} — {FORM_TABS.find((entry) => entry.key === tab)?.label}</span>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="border px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ borderColor: COLORS.border, borderRadius: 8, color: COLORS.muted }}>Cancel</button>
            <PrimaryButton type="submit" icon={<Plus />}>{garment.name ? 'Save changes' : 'Add garment'}</PrimaryButton>
          </div>
        </div>
      </form>
      {lightboxOpen && form.image && (
        <ImageLightbox src={form.image} name={imageInfo?.name || form.name || 'Garment photo'} size={imageInfo?.size ?? null} onClose={() => setLightboxOpen(false)} />
      )}
    </div>
  ), document.body);
}

/**
 * Full-image lightbox — the whole photo at its natural aspect ratio, on a dark
 * backdrop. Opened from "View Full Image" / "View Full".
 */
function ImageLightbox({ src, name, size, onClose }: { src: string; name: string; size: number | null; onClose: () => void }) {
  useLockBodyScroll();
  return createPortal((
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-black/80 p-4">
      <button type="button" onClick={onClose} className="absolute inset-0" aria-label="Close full image" />
      <div className="relative flex w-full max-w-5xl flex-col items-center gap-3">
        <div className="flex w-full flex-wrap items-center justify-between gap-2 text-white">
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold">{name || 'Garment photo'}</p>
            <p className="mono text-[10px] opacity-70">{formatBytes(size)} · full image, aspect ratio preserved</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/30 text-white transition-colors hover:bg-white/10" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        <img src={src} alt={name || 'Garment photo'} className="max-h-[78vh] w-auto max-w-full rounded-xl bg-white object-contain shadow-2xl" />
      </div>
    </div>
  ), document.body);
}

/** One label/value row in the upload-information list. */
function UploadFact({ label, value, tone = 'muted' }: { label: string; value: string; tone?: 'muted' | 'success' | 'info' }) {
  const color = tone === 'success' ? COLORS.success : tone === 'info' ? COLORS.navy : COLORS.inkSoft;
  return (
    <div className="flex items-center justify-between gap-2 border px-3 py-2" style={{ borderColor: COLORS.border, background: COLORS.surfaceAlt, borderRadius: 9 }}>
      <dt className="text-[10px] font-medium uppercase tracking-[0.08em]" style={{ color: COLORS.faint }}>{label}</dt>
      <dd className="mono min-w-0 truncate text-[11px]" style={{ color }} title={value}>{value}</dd>
    </div>
  );
}

/** Focal-point slider used by the Live Preview framing tools. */
function FramingSlider({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="flex items-center gap-2">
      <span className="w-[110px] shrink-0 text-[10px]" style={{ color: COLORS.muted }}>{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 flex-1 cursor-pointer accent-[#A9762F]"
        aria-label={label}
      />
      <span className="mono w-9 shrink-0 text-right text-[10px]" style={{ color: COLORS.inkSoft }}>{value}%</span>
    </label>
  );
}

function Field({ label, hint, action, children }: { label: string; hint?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-end justify-between gap-2">
        <EyebrowLabel>{label}</EyebrowLabel>
        <div className="flex items-center gap-2">
          {hint && <span className="text-[10px]" style={{ color: COLORS.faint }}>{hint}</span>}
          {action}
        </div>
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

/**
 * Keeps the page behind the modal/drawer from scrolling — and stops the fixed
 * overlay shifting when the background scrollbar disappears.
 */
function useLockBodyScroll(): void {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);
}

export default AdminGarmentCatalogView;
