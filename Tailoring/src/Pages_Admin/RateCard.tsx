// Pages_Admin/RateCard.tsx
//
// THE ADMIN RATE CARD — the management interface to the ONE pricing source in
// the system.
//
// This page holds no prices of its own. It reads and writes the pricing_rules
// row that lib/pricingEngine.js quotes from, so a rule saved here is quotable
// at the Front Desk on the very next request: the engine re-reads the rate card
// per request, so there is nothing to restart, invalidate or refresh.
//
// The garment type is CHOSEN FROM THE LIVE GARMENT CATALOG rather than typed.
// The engine matches its rules by that exact string, so a hand-typed
// "Two Piece Suit" beside a catalog "Two-Piece Suit" is precisely how a garment
// ends up unquotable at the counter.
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle, CheckCircle2, Clock, Edit3, Eye, Info, Layers, LoaderCircle,
  Plus, Power, RefreshCw, Shirt, Sparkles, Tags, Trash2, X,
} from 'lucide-react';
import frontDeskApi, { type CatalogItem, type RateCardRule, type RateCardRuleInput } from '../../services/frontDeskApi';
import { formatPHP } from '../utils/currency';
import {
  COLORS, FONT_IMPORT, Badge, Card, EmptyState, EyebrowLabel, FilterPill, IconTile, ModalShell,
  PageHeader, PrimaryButton, SearchField, SecondaryButton, StatCard, TableHeadRow, shadowSm,
} from './Theme';

const peso = (value: number | string | null | undefined) => formatPHP(value);

/** A deactivated rule is hidden from the Front Desk but kept here in full. */
type StatusFilter = 'all' | 'active' | 'inactive';

/** The create/edit form's working copy. Price is a string while being typed. */
type RuleDraft = {
  garmentType: string;
  garmentCategory: string;
  basePrice: string;
  productionWorkflow: string;
  isActive: boolean;
  /** 'create' adds a rule for a garment type that has none; 'edit' changes one. */
  mode: 'create' | 'edit';
};

/**
 * Production workflows the engine assigns to a garment type. Mirrors the
 * workflow vocabulary the Garment Catalog uses, so a rule saved here and a
 * catalog record describe the same pipeline.
 */
const WORKFLOW_OPTIONS = [
  { value: 'formal_barong', label: 'Formal · Barong' },
  { value: 'suit', label: 'Suit' },
  { value: 'coat', label: 'Coat' },
  { value: 'gown', label: 'Gown' },
  { value: 'dress', label: 'Dress Workflow' },
  { value: 'uniform', label: 'Uniform' },
  { value: 'bespoke', label: 'Bespoke' },
  { value: 'standard', label: 'Standard' },
];

const workflowLabel = (value: string) =>
  WORKFLOW_OPTIONS.find((option) => option.value === value)?.label || value || 'Standard';

/** Category names offered alongside whatever the rules and catalog already use. */
const CATEGORY_SUGGESTIONS = [
  'Formal Wear', 'Uniform', 'Dress', 'Traditional', 'Business Attire', 'Custom Apparel',
  'School Uniform', 'Corporate Uniform', 'Sportswear', 'Casual Wear', 'Custom/Bespoke',
];

/**
 * The table's column template, written as literals twice on purpose: Tailwind
 * compiles classes from the literal source text, so a variant glued onto a
 * runtime value is never generated. The header (hidden below md) uses the bare
 * form; the rows use the md: form.
 */
const TABLE_GRID = 'grid-cols-[1.5fr_1fr_0.9fr_1fr_0.8fr_1fr_150px]';
const TABLE_GRID_MD = 'md:grid-cols-[1.5fr_1fr_0.9fr_1fr_0.8fr_1fr_150px]';

const SORTS = [
  { value: 'name', label: 'Garment type A–Z' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'recent', label: 'Recently updated' },
] as const;
type SortKey = (typeof SORTS)[number]['value'];

const fieldStyle: React.CSSProperties = {
  width: '100%',
  border: `1px solid ${COLORS.border}`,
  padding: '10px 12px',
  fontSize: 13,
  color: COLORS.ink,
  background: COLORS.surface,
  outline: 'none',
  borderRadius: 8,
  fontFamily: "'Inter', sans-serif",
};

const normalize = (value: string) => value.trim().toLowerCase();

/** Turn any failure into the copy the counter staff and Admin should read. */
function describeError(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (!message || /failed to fetch|network ?error|load failed|fetch failed/i.test(message)) {
    return 'Could not connect to the pricing service.';
  }
  return message;
}

const formatUpdated = (value: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, { month: 'short', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};

/** "just now" / "3h ago" — the KPI card shows recency at a glance. */
const relativeUpdated = (value: string | null) => {
  if (!value) return '';
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return '';
  const minutes = Math.round((Date.now() - time) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

/** A labelled control in the Admin design language. */
function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  // A plain div rather than a <label>: some fields hold several controls (the
  // Active/Inactive pills), and a wrapping label would forward a click on the
  // caption to whichever control comes first.
  return (
    <div>
      <span className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: COLORS.muted }}>{label}</span>
      <div className="mt-1.5">{children}</div>
      {error
        ? <span className="mt-1.5 flex items-center gap-1.5 text-[11.5px] font-medium" style={{ color: COLORS.danger }}><AlertTriangle className="h-3.5 w-3.5" />{error}</span>
        : hint && <span className="mt-1.5 block text-[11.5px] leading-relaxed" style={{ color: COLORS.muted }}>{hint}</span>}
    </div>
  );
}

export function AdminRateCardView() {
  const [rules, setRules] = useState<RateCardRule[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [workflowFilter, setWorkflowFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortKey>('name');
  const [draft, setDraft] = useState<RuleDraft | null>(null);
  const [draftError, setDraftError] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyType, setBusyType] = useState('');
  const [removeTarget, setRemoveTarget] = useState<RateCardRule | null>(null);
  const [details, setDetails] = useState<RateCardRule | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRules(await frontDeskApi.getRateCardRules());
      setLoadError('');
    } catch (error) {
      setLoadError(describeError(error));
    } finally {
      setLoading(false);
    }
    // The catalog decides which garment types may be selected. Its failure must
    // never hide the rules, so it loads on its own.
    try {
      setCatalog(await frontDeskApi.getGarmentCatalog());
    } catch {
      setCatalog([]);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Feedback banners clear themselves so the page never looks stuck.
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  /** Garment types that exist in the live catalog (deduped, case-insensitive). */
  const catalogTypes = useMemo(() => {
    const map = new Map<string, { type: string; category: string }>();
    for (const item of catalog) {
      const type = (item.garment_type || '').trim();
      if (!type) continue;
      const key = normalize(type);
      if (!map.has(key)) map.set(key, { type, category: (item.garment_category || '').trim() });
    }
    return map;
  }, [catalog]);

  const ruleByType = useMemo(() => {
    const map = new Map<string, RateCardRule>();
    for (const rule of rules) map.set(normalize(rule.garment_type), rule);
    return map;
  }, [rules]);

  /** Catalog garments the Front Desk still cannot quote — why this page exists. */
  const unpricedCatalogTypes = useMemo(
    () => [...catalogTypes.values()]
      .filter((entry) => !ruleByType.has(normalize(entry.type)))
      .sort((a, b) => a.type.localeCompare(b.type)),
    [catalogTypes, ruleByType],
  );

  /** Rules whose garment type is not in the catalog — an exact-match warning. */
  const offCatalogRules = useMemo(
    () => new Set(
      rules
        .filter((rule) => catalogTypes.size > 0 && !catalogTypes.has(normalize(rule.garment_type)))
        .map((rule) => rule.garment_type),
    ),
    [rules, catalogTypes],
  );

  const kpis = useMemo(() => {
    const active = rules.filter((rule) => rule.is_active).length;
    const categories = new Set(rules.map((rule) => (rule.garment_category || '').trim()).filter(Boolean));
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentlyUpdated = rules.filter((rule) => rule.updated_at && new Date(rule.updated_at).getTime() >= weekAgo).length;
    const latest = rules.reduce<string | null>(
      (newest, rule) => (rule.updated_at && (!newest || rule.updated_at > newest) ? rule.updated_at : newest), null,
    );
    const priced = rules.filter((rule) => rule.is_active && Number(rule.base_price) > 0);
    const average = priced.length ? priced.reduce((sum, rule) => sum + Number(rule.base_price), 0) / priced.length : 0;
    return { total: rules.length, active, inactive: rules.length - active, categories: categories.size, recentlyUpdated, latest, average };
  }, [rules]);

  const categoryOptions = useMemo(() => {
    const used = rules.map((rule) => (rule.garment_category || '').trim()).filter(Boolean);
    return [...new Set([...used, ...CATEGORY_SUGGESTIONS])].sort((a, b) => a.localeCompare(b));
  }, [rules]);

  const workflowOptions = useMemo(() => {
    const extra = [...new Set(rules.map((rule) => rule.production_workflow).filter(Boolean))]
      .filter((value) => !WORKFLOW_OPTIONS.some((option) => option.value === value));
    return [...WORKFLOW_OPTIONS, ...extra.map((value) => ({ value, label: value }))];
  }, [rules]);

  /** Search + filters + sort, applied to the already-loaded rules (no refetch). */
  const visibleRules = useMemo(() => {
    const needle = normalize(query);
    const rows = rules.filter((rule) => {
      if (statusFilter === 'active' && !rule.is_active) return false;
      if (statusFilter === 'inactive' && rule.is_active) return false;
      if (categoryFilter !== 'all' && (rule.garment_category || '').trim() !== categoryFilter) return false;
      if (workflowFilter !== 'all' && rule.production_workflow !== workflowFilter) return false;
      if (!needle) return true;
      return normalize(rule.garment_type).includes(needle)
        || normalize(rule.garment_category).includes(needle)
        || normalize(rule.production_workflow).includes(needle)
        || normalize(workflowLabel(rule.production_workflow)).includes(needle);
    });
    return rows.sort((a, b) => {
      if (sort === 'price-desc') return b.base_price - a.base_price;
      if (sort === 'price-asc') return a.base_price - b.base_price;
      if (sort === 'recent') return (b.updated_at || '').localeCompare(a.updated_at || '');
      return a.garment_type.localeCompare(b.garment_type);
    });
  }, [rules, query, statusFilter, categoryFilter, workflowFilter, sort]);

  const filtersActive = Boolean(query) || statusFilter !== 'all' || categoryFilter !== 'all' || workflowFilter !== 'all';

  const clearFilters = () => {
    setQuery('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setWorkflowFilter('all');
  };

  const openCreate = (garmentType = '', garmentCategory = '') => {
    setDraftError('');
    setDetails(null);
    setDraft({
      mode: 'create',
      garmentType,
      garmentCategory,
      basePrice: '',
      productionWorkflow: 'standard',
      isActive: true,
    });
  };

  const openEdit = (rule: RateCardRule) => {
    setDraftError('');
    setDetails(null);
    setDraft({
      mode: 'edit',
      garmentType: rule.garment_type,
      garmentCategory: rule.garment_category || '',
      basePrice: String(rule.base_price ?? ''),
      productionWorkflow: rule.production_workflow || 'standard',
      isActive: rule.is_active,
    });
  };

  const saveDraft = async () => {
    if (!draft) return;
    setDraftError('');
    const garmentType = draft.garmentType.trim();
    if (!garmentType) { setDraftError('Please select a garment type.'); return; }
    const basePrice = Number(draft.basePrice);
    if (draft.basePrice.trim() === '' || !Number.isFinite(basePrice) || basePrice <= 0) {
      setDraftError('Please enter a valid Starting Price.');
      return;
    }
    if (draft.mode === 'create' && ruleByType.has(normalize(garmentType))) {
      setDraftError('A pricing rule already exists for this garment type.');
      return;
    }
    const payload: RateCardRuleInput = {
      garmentType,
      garmentCategory: draft.garmentCategory.trim(),
      basePrice,
      productionWorkflow: draft.productionWorkflow || 'standard',
      isActive: draft.isActive,
    };
    setSaving(true);
    try {
      const result = draft.mode === 'create'
        ? await frontDeskApi.createRateCardRule(payload)
        : await frontDeskApi.updateRateCardRule(garmentType, payload);
      await load();
      setDraft(null);
      setNotice(result.message || `Pricing rule saved for ${garmentType}.`);
    } catch (error) {
      setDraftError(describeError(error));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (rule: RateCardRule) => {
    setBusyType(rule.garment_type);
    setLoadError('');
    try {
      const result = await frontDeskApi.setRateCardRuleActive(rule.garment_type, !rule.is_active);
      await load();
      setNotice(result.message || `${rule.garment_type} updated.`);
    } catch (error) {
      setLoadError(describeError(error));
    } finally {
      setBusyType('');
    }
  };

  const removeRule = async () => {
    if (!removeTarget) return;
    const target = removeTarget;
    setBusyType(target.garment_type);
    try {
      const result = await frontDeskApi.deleteRateCardRule(target.garment_type);
      setRemoveTarget(null);
      await load();
      setNotice(result.message || `Rule removed for ${target.garment_type}.`);
    } catch (error) {
      setRemoveTarget(null);
      setLoadError(describeError(error));
    } finally {
      setBusyType('');
    }
  };

  const shopSaved = useMemo(() => rules.filter((rule) => rule.source === 'shop').length, [rules]);

  return (
    <div className="space-y-6">
      <style>{FONT_IMPORT}</style>

      <PageHeader
        eyebrow="Admin · Pricing"
        title="Rate Card"
        description="Every price the Front Desk quotes comes from these rules — the same source the Garment Catalog, the Production workflow and every job card read. Add a rule and the garment becomes quotable immediately."
        action={(
          <div className="flex items-center gap-2">
            <SecondaryButton icon={<RefreshCw />} onClick={() => void load()}>Refresh</SecondaryButton>
            <PrimaryButton icon={<Plus />} onClick={() => openCreate()}>Add Pricing Rule</PrimaryButton>
          </div>
        )}
      />

      {loadError && (
        <div className="rise-in flex items-start gap-3 border p-4" style={{ borderColor: COLORS.dangerBorder, background: COLORS.dangerBg, borderRadius: 10 }}>
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: COLORS.danger }} />
          <p className="text-[12.5px] leading-relaxed" style={{ color: COLORS.danger }}>{loadError}</p>
        </div>
      )}
      {notice && (
        <div className="rise-in flex items-start gap-3 border p-4" style={{ borderColor: COLORS.successBorder, background: COLORS.successBg, borderRadius: 10 }}>
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: COLORS.success }} />
          <p className="text-[12.5px] leading-relaxed" style={{ color: COLORS.success }}>{notice}</p>
        </div>
      )}

      {/* ---------------- KPI CARDS ---------------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard delay={0} icon={<Tags />} label="Total pricing rules" value={kpis.total} trend={shopSaved > 0 ? `${shopSaved} set by your shop` : 'All engine defaults'} />
        <StatCard delay={0.04} icon={<CheckCircle2 />} label="Active rules" value={kpis.active} tone="success" trend="Quotable at the Front Desk" />
        <StatCard delay={0.08} icon={<Power />} label="Inactive rules" value={kpis.inactive} tone={kpis.inactive > 0 ? 'warning' : 'neutral'} trend={kpis.inactive > 0 ? 'Front Desk cannot quote these' : 'Nothing switched off'} trendTone={kpis.inactive > 0 ? 'danger' : 'success'} />
        <StatCard delay={0.12} icon={<Layers />} label="Categories covered" value={kpis.categories} trend={`Avg Starting Price ${peso(Math.round(kpis.average))}`} />
        <StatCard delay={0.16} icon={<Clock />} label="Updated this week" value={kpis.recentlyUpdated} trend={kpis.latest ? `Last change ${relativeUpdated(kpis.latest)}` : 'No changes yet'} />
      </div>

      {/* ---------------- BLOCKED CATALOG GARMENTS ---------------- */}
      {unpricedCatalogTypes.length > 0 && (
        <Card className="p-5" delay={0.1} style={{ borderColor: COLORS.warningBorder, background: COLORS.warningBg }}>
          <div className="flex items-start gap-3">
            <IconTile tone="warning" icon={<AlertTriangle />} />
            <div>
              <EyebrowLabel color={COLORS.warning}>Front Desk blocked</EyebrowLabel>
              <h2 className="mt-1 text-[15px] font-semibold" style={{ color: COLORS.ink }}>
                {unpricedCatalogTypes.length} catalog garment{unpricedCatalogTypes.length === 1 ? '' : 's'} cannot be quoted
              </h2>
              <p className="mt-1 max-w-3xl text-[12px] leading-relaxed" style={{ color: COLORS.inkSoft }}>
                These garment types exist in the Garment Catalog but have no pricing rule, so order intake stops with
                “Not on the rate card”. Pick one to create its rule — it is quotable the moment you save.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {unpricedCatalogTypes.map((entry) => (
              <button
                key={entry.type}
                type="button"
                onClick={() => openCreate(entry.type, entry.category)}
                className="card-hover inline-flex items-center gap-2 border bg-white px-3 py-2 text-[12px] font-medium"
                style={{ borderColor: COLORS.warningBorder, color: COLORS.ink, borderRadius: 8 }}
              >
                <Plus className="h-3.5 w-3.5" style={{ color: COLORS.warning }} />
                {entry.type}
                {entry.category && <span className="text-[10.5px]" style={{ color: COLORS.muted }}>· {entry.category}</span>}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* ---------------- SEARCH / FILTERS ---------------- */}
      <Card className="p-5" delay={0.14}>
        <div className="flex flex-wrap items-center gap-3">
          <SearchField value={query} onChange={setQuery} placeholder="Search garment type, category or workflow…" />
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              aria-label="Filter by category"
              style={{ ...fieldStyle, width: 'auto', paddingRight: 28 }}
            >
              <option value="all">All Categories</option>
              {categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
            <select
              value={workflowFilter}
              onChange={(event) => setWorkflowFilter(event.target.value)}
              aria-label="Filter by production workflow"
              style={{ ...fieldStyle, width: 'auto', paddingRight: 28 }}
            >
              <option value="all">All Workflows</option>
              {workflowOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <div className="flex items-center gap-1.5">
              <FilterPill active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>All</FilterPill>
              <FilterPill active={statusFilter === 'active'} onClick={() => setStatusFilter('active')}>Active</FilterPill>
              <FilterPill active={statusFilter === 'inactive'} onClick={() => setStatusFilter('inactive')}>Inactive</FilterPill>
            </div>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              aria-label="Sort rules"
              style={{ ...fieldStyle, width: 'auto', paddingRight: 28 }}
            >
              {SORTS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            {filtersActive && <SecondaryButton onClick={clearFilters}>Clear</SecondaryButton>}
          </div>
        </div>
      </Card>

      {/* ---------------- RULES TABLE ---------------- */}
      <Card className="overflow-hidden" delay={0.18}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4" style={{ borderColor: COLORS.border }}>
          <div>
            <EyebrowLabel>Pricing rules</EyebrowLabel>
            <h2 className="mt-1 text-[15px] font-semibold" style={{ color: COLORS.ink }}>
              {visibleRules.length} of {kpis.total} rule{kpis.total === 1 ? '' : 's'}
            </h2>
          </div>
          <div className="flex items-center gap-2 text-[11px]" style={{ color: COLORS.muted }}>
            Average Starting Price
            <span className="mono text-[13px] font-semibold" style={{ color: COLORS.ink }}>{peso(Math.round(kpis.average))}</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 p-14 text-sm" style={{ color: COLORS.muted }}>
            <LoaderCircle className="h-4 w-4 animate-spin" /> Loading the rate card…
          </div>
        ) : rules.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full" style={{ background: COLORS.navySoft, color: COLORS.navy }}>
              <Tags className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-[16px] font-semibold" style={{ color: COLORS.ink }}>No Pricing Rules Found</h3>
            <p className="mx-auto mt-2 max-w-md text-[12.5px] leading-relaxed" style={{ color: COLORS.muted }}>
              Create your first garment pricing rule to allow Front Desk staff to generate quotations.
            </p>
            <div className="mt-5 flex justify-center">
              <PrimaryButton icon={<Plus />} onClick={() => openCreate()}>Create Pricing Rule</PrimaryButton>
            </div>
          </div>
        ) : visibleRules.length === 0 ? (
          <EmptyState message="No pricing rules match this search. Clear the filters to see all rules." />
        ) : (
          <>
            <TableHeadRow
              columns={['Garment Type', 'Category', 'Starting Price', 'Workflow', 'Status', 'Last Updated', 'Actions']}
              gridCols={TABLE_GRID}
            />
            <div>
              {visibleRules.map((rule, index) => {
                const offCatalog = offCatalogRules.has(rule.garment_type);
                const busy = busyType === rule.garment_type;
                return (
                  <div
                    key={rule.garment_type}
                    className={`grid grid-cols-1 ${TABLE_GRID_MD} items-center gap-3 border-b px-6 py-4 transition-colors`}
                    style={{ borderColor: COLORS.border, background: index % 2 ? COLORS.surfaceAlt : COLORS.surface }}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Shirt className="h-3.5 w-3.5 flex-shrink-0" style={{ color: COLORS.faint }} />
                        <span className="truncate text-[13.5px] font-semibold" style={{ color: COLORS.ink }}>{rule.garment_type}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {rule.source === 'shop'
                          ? <Badge tone="brass" dot={false}>Shop rule</Badge>
                          : <Badge tone="neutral" dot={false}>Built-in</Badge>}
                        {offCatalog && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: COLORS.warning }}>
                            <AlertTriangle className="h-3 w-3" /> Not in catalog
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-[12.5px]" style={{ color: COLORS.inkSoft }}>{rule.garment_category || '—'}</div>

                    <div className="mono text-[13.5px] font-semibold tabular-nums" style={{ color: COLORS.ink }}>{peso(rule.base_price)}</div>

                    <div className="text-[12.5px]" style={{ color: COLORS.inkSoft }}>{workflowLabel(rule.production_workflow)}</div>

                    <div>
                      {busy
                        ? <span className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: COLORS.muted }}><LoaderCircle className="h-3.5 w-3.5 animate-spin" />Saving…</span>
                        : <Badge tone={rule.is_active ? 'success' : 'danger'}>{rule.is_active ? 'Active' : 'Inactive'}</Badge>}
                    </div>

                    <div className="text-[11.5px]" style={{ color: COLORS.muted }}>
                      {formatUpdated(rule.updated_at)}
                      {rule.updated_at && <span className="ml-1.5" style={{ color: COLORS.faint }}>· {relativeUpdated(rule.updated_at)}</span>}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <RowAction label="View rule" onClick={() => setDetails(rule)}><Eye /></RowAction>
                      <RowAction label="Edit rule" onClick={() => openEdit(rule)}><Edit3 /></RowAction>
                      <RowAction
                        label={rule.is_active ? 'Deactivate rule' : 'Activate rule'}
                        tone={rule.is_active ? 'warning' : 'success'}
                        onClick={() => void toggleActive(rule)}
                      >
                        <Power />
                      </RowAction>
                      {/* A built-in default has nothing saved to remove — deactivate it instead. */}
                      {rule.source === 'shop' && (
                        <RowAction label="Remove rule" tone="danger" onClick={() => setRemoveTarget(rule)}><Trash2 /></RowAction>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {/* ---------------- ADD / EDIT RULE ---------------- */}
      {draft && createPortal((
        <ModalShell onClose={() => setDraft(null)} maxWidth="max-w-xl">
          <div className="flex items-start justify-between gap-4 border-b px-6 py-5" style={{ borderColor: COLORS.border }}>
            <div className="flex items-start gap-3">
              <IconTile tone="brass" icon={draft.mode === 'create' ? <Plus /> : <Edit3 />} />
              <div>
                <EyebrowLabel>{draft.mode === 'create' ? 'New pricing rule' : 'Editing rule'}</EyebrowLabel>
                <h2 className="mt-1 text-[17px] font-semibold" style={{ color: COLORS.ink }}>
                  {draft.mode === 'create' ? 'Add a garment pricing rule' : draft.garmentType}
                </h2>
                <p className="mt-1 text-[12px] leading-relaxed" style={{ color: COLORS.muted }}>
                  Saved to the server rate card — the Front Desk can quote this garment on its next quotation, with no refresh.
                </p>
              </div>
            </div>
            <button type="button" onClick={() => setDraft(null)} aria-label="Close" className="rounded-full p-1.5 transition-colors" style={{ color: COLORS.faint }}>
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 px-6 py-5">
            <Field
              label="Garment Type"
              hint={draft.mode === 'edit'
                ? 'The garment type is the rule’s key. To move this price to another type, remove the rule and create it there.'
                : 'Chosen from the live Garment Catalog. The rule must match this exact string, or the Front Desk keeps refusing to quote it.'}
            >
              {draft.mode === 'edit' ? (
                <input value={draft.garmentType} readOnly disabled style={{ ...fieldStyle, background: COLORS.surfaceAlt, color: COLORS.inkSoft }} />
              ) : unpricedCatalogTypes.length === 0 ? (
                <div className="flex items-start gap-2 border p-3 text-[12px]" style={{ borderColor: COLORS.border, background: COLORS.surfaceAlt, borderRadius: 8, color: COLORS.muted }}>
                  <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" style={{ color: COLORS.info }} />
                  Every garment type in the Garment Catalog already has a pricing rule. Add the garment to the catalog first, then price it here.
                </div>
              ) : (
                <select
                  autoFocus
                  value={draft.garmentType}
                  onChange={(event) => {
                    const chosen = unpricedCatalogTypes.find((entry) => entry.type === event.target.value);
                    setDraft({ ...draft, garmentType: event.target.value, garmentCategory: draft.garmentCategory || chosen?.category || '' });
                  }}
                  style={fieldStyle}
                >
                  <option value="">Select a garment type…</option>
                  {unpricedCatalogTypes.map((entry) => (
                    <option key={entry.type} value={entry.type}>
                      {entry.type}{entry.category ? ` — ${entry.category}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Garment Category" hint="Groups the rule in reports and the catalog.">
                <input
                  list="rate-card-categories"
                  value={draft.garmentCategory}
                  onChange={(event) => setDraft({ ...draft, garmentCategory: event.target.value })}
                  placeholder="e.g. Formal Wear"
                  style={fieldStyle}
                />
                <datalist id="rate-card-categories">
                  {categoryOptions.map((category) => <option key={category} value={category} />)}
                </datalist>
              </Field>

              <Field label="Starting Price (₱)" hint="The Front Desk always quotes this figure.">
                <div className="flex items-center gap-2">
                  <span className="mono text-[13px] font-semibold" style={{ color: COLORS.muted }}>₱</span>
                  <input
                    type="number"
                    min={1}
                    step="0.01"
                    value={draft.basePrice}
                    onChange={(event) => setDraft({ ...draft, basePrice: event.target.value })}
                    placeholder="2500"
                    style={{ ...fieldStyle, fontFamily: "'IBM Plex Mono', monospace" }}
                  />
                </div>
              </Field>
            </div>

            <Field label="Production Workflow" hint="Sets the pipeline the job card follows once confirmed.">
              <select
                value={draft.productionWorkflow}
                onChange={(event) => setDraft({ ...draft, productionWorkflow: event.target.value })}
                style={fieldStyle}
              >
                {workflowOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </Field>

            <Field label="Status" hint="Inactive rules keep their price but cannot be quoted until switched back on.">
              <div className="flex items-center gap-1.5">
                <FilterPill active={draft.isActive} onClick={() => setDraft({ ...draft, isActive: true })}>Active</FilterPill>
                <FilterPill active={!draft.isActive} onClick={() => setDraft({ ...draft, isActive: false })}>Inactive</FilterPill>
              </div>
            </Field>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-6 py-4" style={{ borderColor: COLORS.border, background: COLORS.surfaceAlt }}>
            {draftError ? (
              <span className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: COLORS.danger }}>
                <AlertTriangle className="h-3.5 w-3.5" />{draftError}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[11.5px]" style={{ color: COLORS.muted }}>
                <Sparkles className="h-3.5 w-3.5" style={{ color: COLORS.brass }} />
                Live the moment it saves.
              </span>
            )}
            <div className="flex items-center gap-2">
              <SecondaryButton onClick={() => setDraft(null)}>Cancel</SecondaryButton>
              <PrimaryButton
                icon={saving ? <LoaderCircle className="animate-spin" /> : undefined}
                onClick={() => { if (!saving) void saveDraft(); }}
              >
                {saving ? 'Saving…' : draft.mode === 'create' ? 'Save Pricing Rule' : 'Save Changes'}
              </PrimaryButton>
            </div>
          </div>
        </ModalShell>
      ), document.body)}

      {/* ---------------- REMOVE RULE (confirmation) ---------------- */}
      {removeTarget && createPortal((
        <ModalShell onClose={() => setRemoveTarget(null)} maxWidth="max-w-lg">
          <div className="px-6 py-5">
            <div className="flex items-start gap-3">
              <IconTile tone="danger" icon={<Trash2 />} />
              <div>
                <EyebrowLabel color={COLORS.danger}>Remove pricing rule</EyebrowLabel>
                <h2 className="mt-1 text-[17px] font-semibold" style={{ color: COLORS.ink }}>
                  Remove the rule for {removeTarget.garment_type}?
                </h2>
              </div>
            </div>
            <p className="mt-4 text-[12.5px] leading-relaxed" style={{ color: COLORS.inkSoft }}>
              Are you sure you want to remove this pricing rule? Front Desk users may no longer be able to quote this garment.
            </p>
            <div className="mt-3 border p-3 text-[11.5px] leading-relaxed" style={{ borderColor: COLORS.border, background: COLORS.surfaceAlt, borderRadius: 8, color: COLORS.muted }}>
              Currently {peso(removeTarget.base_price)} on the {workflowLabel(removeTarget.production_workflow)} workflow.
              If the pricing engine ships a default for this garment type it reverts to that default and stays quotable;
              otherwise the Front Desk cannot quote it until you create a rule again. To stop quoting it while keeping
              the price, deactivate the rule instead.
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 border-t px-6 py-4" style={{ borderColor: COLORS.border, background: COLORS.surfaceAlt }}>
            <SecondaryButton onClick={() => setRemoveTarget(null)}>Keep the rule</SecondaryButton>
            <button
              type="button"
              onClick={() => { if (!busyType) void removeRule(); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold text-white [&>svg]:h-4 [&>svg]:w-4"
              style={{ background: COLORS.danger, borderRadius: 8, boxShadow: shadowSm }}
            >
              {busyType ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
              {busyType ? 'Removing…' : 'Remove rule'}
            </button>
          </div>
        </ModalShell>
      ), document.body)}

      {/* ---------------- VIEW RULE ---------------- */}
      {details && createPortal((
        <ModalShell onClose={() => setDetails(null)} maxWidth="max-w-lg">
          <div className="flex items-start justify-between gap-4 border-b px-6 py-5" style={{ borderColor: COLORS.border }}>
            <div className="flex items-start gap-3">
              <IconTile tone="info" icon={<Tags />} />
              <div>
                <EyebrowLabel>Rate card rule</EyebrowLabel>
                <h2 className="mt-1 text-[17px] font-semibold" style={{ color: COLORS.ink }}>{details.garment_type}</h2>
              </div>
            </div>
            <button type="button" onClick={() => setDetails(null)} aria-label="Close" className="rounded-full p-1.5" style={{ color: COLORS.faint }}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <dl className="px-6 py-2">
            {[
              ['Category', details.garment_category || '—'],
              ['Starting Price', peso(details.base_price)],
              ['Production Workflow', workflowLabel(details.production_workflow)],
              ['Status', details.is_active ? 'Active — quotable now' : 'Inactive — not quotable'],
              ['Source', details.source === 'shop' ? 'Saved in this Rate Card' : "The engine's built-in default"],
              ['Last Updated', formatUpdated(details.updated_at)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-6 border-b py-3 last:border-0" style={{ borderColor: COLORS.border }}>
                <dt className="text-[11.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: COLORS.muted }}>{label}</dt>
                <dd className="text-right text-[13px]" style={{ color: COLORS.ink }}>{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mx-6 mb-5 flex items-start gap-2 border p-3 text-[11.5px] leading-relaxed" style={{ borderColor: COLORS.infoBorder, background: COLORS.infoBg, borderRadius: 8, color: COLORS.info }}>
            <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            The Front Desk quotes straight from this rule, so a change here applies to the next quotation. Job cards
            already confirmed keep the price they were saved with.
          </div>
          <div className="flex items-center justify-end gap-2 border-t px-6 py-4" style={{ borderColor: COLORS.border, background: COLORS.surfaceAlt }}>
            <SecondaryButton onClick={() => setDetails(null)}>Close</SecondaryButton>
            <PrimaryButton icon={<Edit3 />} onClick={() => openEdit(details)}>Edit this rule</PrimaryButton>
          </div>
        </ModalShell>
      ), document.body)}
    </div>
  );
}

/** A compact row action in the Admin design language. */
function RowAction({ label, children, onClick, tone = 'neutral' }: { label: string; children: ReactNode; onClick: () => void; tone?: 'neutral' | 'success' | 'warning' | 'danger' }) {
  const palette = {
    neutral: { color: COLORS.inkSoft, border: COLORS.border, hover: COLORS.navySoft },
    success: { color: COLORS.success, border: COLORS.successBorder, hover: COLORS.successBg },
    warning: { color: COLORS.warning, border: COLORS.warningBorder, hover: COLORS.warningBg },
    danger: { color: COLORS.danger, border: COLORS.dangerBorder, hover: COLORS.dangerBg },
  }[tone];
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center border transition-colors [&>svg]:h-3.5 [&>svg]:w-3.5"
      style={{ borderColor: palette.border, color: palette.color, background: COLORS.surface, borderRadius: 7 }}
      onMouseEnter={(event) => { event.currentTarget.style.background = palette.hover; }}
      onMouseLeave={(event) => { event.currentTarget.style.background = COLORS.surface; }}
    >
      {children}
    </button>
  );
}









