// Pages_Admin/optionPickers.tsx
//
// Reusable option selectors for the Styles & Customizations tab. They exist so
// the Admin configures a garment with the SAME option vocabulary the rest of
// the system already speaks — the Front Desk style library, the shop's
// customization catalogue and the fabric_inventory table — instead of typing
// free text that downstream modules cannot match.
import { useState } from 'react';
import { Check, Plus, Search, X } from 'lucide-react';
import { COLORS } from './Theme';
import { formatPHP } from '../utils/currency';

/** One fabric row as served by GET /api/auth/catalog/fabrics (fabric_inventory). */
export type FabricOption = {
  id: number;
  fabricName: string;
  tone: string;
  unit: string;
  stockQuantity?: number;
  unitCost?: number | null;
};

const chipBase = 'inline-flex items-center gap-1.5 border px-2.5 py-1 text-[11px] font-medium transition-colors';

/* ------------------------------------------------------------- option card */

/** A titled card for one configuration group: icon, blurb, count and content. */
export function OptionCard({ icon, title, description, count, children }: {
  icon: React.ReactNode; title: string; description: string; count: number; children: React.ReactNode;
}) {
  return (
    <section className="border bg-white" style={{ borderColor: COLORS.border, borderRadius: 14, boxShadow: '0 1px 3px rgba(16,24,40,0.05)' }}>
      <header className="flex items-start gap-3 px-4 pt-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center" style={{ background: COLORS.brassSoft, color: COLORS.brassDeep, borderRadius: 9 }}>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[13px] font-semibold" style={{ color: COLORS.ink }}>{title}</h3>
            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: COLORS.navySoft, color: COLORS.navy }}>
              {count} selected
            </span>
          </div>
          <p className="mt-0.5 text-[11px] leading-relaxed" style={{ color: COLORS.muted }}>{description}</p>
        </div>
      </header>
      <div className="px-4 pb-4 pt-3">{children}</div>
    </section>
  );
}

/* --------------------------------------------------------- removable badge */

function SelectedBadge({ label, detail, onRemove }: { label: string; detail?: string; onRemove: () => void }) {
  return (
    <span className={`${chipBase} max-w-full`} style={{ borderColor: COLORS.navySoftBorder, background: COLORS.navy, color: '#fff', borderRadius: 999 }}>
      <span className="truncate">{label}</span>
      {detail && <span className="hidden truncate opacity-70 sm:inline">· {detail}</span>}
      <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} className="shrink-0 rounded-full opacity-75 transition-opacity hover:opacity-100">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

/* ------------------------------------------------------------ chip picker */

/**
 * Tag-style multi-select: click a preset chip to toggle it, search to filter,
 * or add a custom value. Selected items render as removable badges.
 */
export function ChipSelect({ options, values, onChange, addLabel, emptyHint }: {
  options: string[];
  values: string[];
  onChange: (next: string[]) => void;
  addLabel: string;
  emptyHint?: string;
}) {
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const extras = values.filter((value) => !options.some((option) => option.toLowerCase() === value.toLowerCase()));
  const filtered = options.filter((option) => option.toLowerCase().includes(query.trim().toLowerCase()));

  const toggle = (option: string) => {
    const hit = values.find((value) => value.toLowerCase() === option.toLowerCase());
    onChange(hit ? values.filter((value) => value !== hit) : [...values, option]);
  };
  const commitDraft = () => {
    const value = draft.trim();
    if (value && !values.some((existing) => existing.toLowerCase() === value.toLowerCase())) onChange([...values, value]);
    setDraft('');
    setAdding(false);
  };

  return (
    <div>
      {/* Selected badges */}
      <div className="flex min-h-[30px] flex-wrap items-center gap-1.5">
        {values.map((value) => <SelectedBadge key={value} label={value} onRemove={() => onChange(values.filter((item) => item !== value))} />)}
        {!values.length && <span className="text-[11px]" style={{ color: COLORS.faint }}>{emptyHint || 'Nothing selected yet.'}</span>}
      </div>

      {/* Search (only when the option list is long enough to need it) */}
      {options.length > 6 && (
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: COLORS.faint }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${addLabel.toLowerCase()}…`}
            className="w-full border bg-white py-1.5 pl-8 pr-3 text-[12px] outline-none transition-colors"
            style={{ borderColor: COLORS.border, borderRadius: 8, color: COLORS.ink }}
          />
        </div>
      )}

      {/* Preset chips */}
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {filtered.map((option) => {
          const active = values.some((value) => value.toLowerCase() === option.toLowerCase());
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggle(option)}
              className={chipBase}
              style={active
                ? { borderColor: COLORS.brassSoftBorder, background: COLORS.brassSoft, color: COLORS.brassDeep, borderRadius: 999 }
                : { borderColor: COLORS.border, background: COLORS.surface, color: COLORS.inkSoft, borderRadius: 999 }}
            >
              {active && <Check className="h-3 w-3" />}{option}
            </button>
          );
        })}
        {!filtered.length && query && <span className="text-[11px]" style={{ color: COLORS.faint }}>No preset matches “{query}”.</span>}
        {extras.map((value) => (
          <span key={value} className={chipBase} style={{ borderColor: COLORS.brassSoftBorder, background: COLORS.brassSoft, color: COLORS.brassDeep, borderRadius: 999 }}>
            {value}<span className="text-[9px] uppercase tracking-wide opacity-75">custom</span>
            <button type="button" onClick={() => onChange(values.filter((item) => item !== value))} aria-label={`Remove ${value}`} className="opacity-75 hover:opacity-100"><X className="h-3 w-3" /></button>
          </span>
        ))}
      </div>

      {/* Add-new */}
      <div className="mt-2.5">
        {adding ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitDraft(); } if (e.key === 'Escape') { setDraft(''); setAdding(false); } }}
              onBlur={commitDraft}
              placeholder="Type a custom option…"
              className="flex-1 border bg-white px-2.5 py-1.5 text-[12px] outline-none"
              style={{ borderColor: COLORS.brassSoftBorder, borderRadius: 8, color: COLORS.ink }}
            />
            <button type="button" onClick={commitDraft} className="border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ borderColor: COLORS.brassSoftBorder, background: COLORS.brassSoft, color: COLORS.brassDeep, borderRadius: 8 }}>
              Add
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 border border-dashed px-2.5 py-1.5 text-[11px] font-medium transition-colors hover:bg-black/[0.03]"
            style={{ borderColor: COLORS.borderStrong, color: COLORS.inkSoft, borderRadius: 999 }}
          >
            <Plus className="h-3.5 w-3.5" /> {addLabel}
          </button>
        )}
      </div>
    </div>
  );
}


/* --------------------------------------------------- inventory fabric picker */

/**
 * Searchable multi-select bound to the Fabric Inventory module
 * (GET /api/auth/catalog/fabrics — the shared fabric_inventory table). Selecting
 * a fabric here is what the Front Desk offers on the intake form, so the two
 * modules can never drift.
 */
export function FabricInventorySelect({ fabrics, values, onChange }: {
  fabrics: FabricOption[];
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [stockOnly, setStockOnly] = useState(false);

  /** Stored values may be legacy free-text labels ("Piña Jusi — Ivory"); match loosely. */
  const matchValue = (fabric: FabricOption) => {
    const label = `${fabric.fabricName}${fabric.tone ? ` — ${fabric.tone}` : ''}`.toLowerCase();
    return values.find((value) => {
      const needle = value.toLowerCase();
      return needle === label || needle.includes(fabric.fabricName.toLowerCase()) || fabric.fabricName.toLowerCase().includes(needle);
    });
  };

  const toggle = (fabric: FabricOption) => {
    const label = `${fabric.fabricName}${fabric.tone ? ` — ${fabric.tone}` : ''}`;
    const hit = matchValue(fabric);
    onChange(hit ? values.filter((value) => value !== hit) : [...values, label]);
  };

  const needle = query.trim().toLowerCase();
  const results = fabrics
    .filter((fabric) => !stockOnly || (fabric.stockQuantity ?? 0) > 0)
    .filter((fabric) => !needle || `${fabric.fabricName} ${fabric.tone}`.toLowerCase().includes(needle));

  const outOfStock = (fabric: FabricOption) => (fabric.stockQuantity ?? 0) <= 0;

  return (
    <div>
      {/* Selected fabric badges */}
      <div className="flex min-h-[30px] flex-wrap items-center gap-1.5">
        {values.map((value) => (
          <SelectedBadge key={value} label={value} onRemove={() => onChange(values.filter((item) => item !== value))} />
        ))}
        {!values.length && <span className="text-[11px]" style={{ color: COLORS.faint }}>No fabrics linked yet — pick from the shelf below.</span>}
      </div>

      {/* Search + stock filter */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: COLORS.faint }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Fabric..."
            className="w-full border bg-white py-1.5 pl-8 pr-3 text-[12px] outline-none transition-colors"
            style={{ borderColor: COLORS.border, borderRadius: 8, color: COLORS.ink }}
          />
        </div>
        <button
          type="button"
          onClick={() => setStockOnly((current) => !current)}
          className={chipBase}
          style={stockOnly
            ? { borderColor: COLORS.successBorder, background: COLORS.successBg, color: COLORS.success, borderRadius: 999 }
            : { borderColor: COLORS.border, background: COLORS.surface, color: COLORS.inkSoft, borderRadius: 999 }}
        >
          {stockOnly && <Check className="h-3 w-3" />}In stock only
        </button>
      </div>

      {/* Inventory results */}
      <div className="mt-2.5 max-h-60 space-y-1 overflow-y-auto pr-0.5">
        {results.map((fabric) => {
          const picked = Boolean(matchValue(fabric));
          const low = !outOfStock(fabric) && (fabric.stockQuantity ?? 0) <= 5;
          return (
            <button
              key={fabric.id}
              type="button"
              onClick={() => toggle(fabric)}
              disabled={outOfStock(fabric) && !picked}
              title={outOfStock(fabric) ? 'Out of stock — not offered to customers' : undefined}
              className="flex w-full items-center gap-3 border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-55"
              style={{
                borderColor: picked ? COLORS.brassSoftBorder : COLORS.border,
                background: picked ? COLORS.brassSoft : COLORS.surface,
                borderRadius: 10,
              }}
            >
              <span
                className="flex shrink-0 items-center justify-center border"
                style={{
                  borderColor: picked ? COLORS.brassDeep : COLORS.borderStrong,
                  background: picked ? COLORS.brassDeep : COLORS.surface,
                  borderRadius: 5,
                  width: 18,
                  height: 18,
                }}
              >
                {picked && <Check className="h-3 w-3" style={{ color: '#fff' }} />}
              </span>
              <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium" style={{ color: COLORS.ink }}>
                {fabric.fabricName}{fabric.tone ? ` — ${fabric.tone}` : ''}
              </span>
              <span className="whitespace-nowrap text-[10px] font-medium" style={{ color: outOfStock(fabric) ? COLORS.danger : low ? COLORS.warning : COLORS.success }}>
                {outOfStock(fabric) ? 'Out of stock' : `${fabric.stockQuantity} ${fabric.unit} on shelf`}
              </span>
              {fabric.unitCost !== null && fabric.unitCost !== undefined && (
                <span className="mono hidden whitespace-nowrap text-[11px] sm:inline" style={{ color: COLORS.muted }}>{formatPHP(fabric.unitCost)}/{fabric.unit}</span>
              )}
            </button>
          );
        })}
        {!results.length && (
          <div className="px-3 py-4 text-center text-[11px]" style={{ color: COLORS.faint }}>
            {fabrics.length ? 'No fabric on the shelf matches that search.' : 'The Fabric Inventory has no entries yet — add fabrics in the Inventory module.'}
          </div>
        )}
      </div>
      {fabrics.length > 0 && (
        <p className="mt-2 text-[10px]" style={{ color: COLORS.faint }}>
          Pulled live from the Fabric Inventory ({fabrics.length} fabric{fabrics.length === 1 ? '' : 's'}) — the same shelf the Front Desk and the Master Tailor see.
        </p>
      )}
    </div>
  );
}

