  // Pages_Frontdesk/GarmentCatalogdesk.tsx
  //
  // FRONT DESK — GARMENT CATALOG
  //
  // The walk-in counter's design reference. The customer arrives, the Front Desk
  // opens this page, they browse the shop's garments / uniform types / styles /
  // fabrics / customization options together, and the chosen garment is handed
  // straight to the Garment Intake flow ("Create order with this garment").
  //
  // The same card + filter components are reused by the intake's picker modal so
  // there is exactly ONE catalog implementation in the app.
  import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
  import {
    AlertCircle,
    ArrowRight,
    Check,
    ChevronDown,
    Clock,
    Info,
    Layers,
    ListFilter,
    Palette,
    Scissors,
    Search,
    Shirt,
    Sparkles,
    Tag,
    X,
  } from 'lucide-react';
  import frontDeskApi, { type CatalogItem, type RateCard } from '../../services/frontDeskApi';
  import { type ImageFraming } from '../utils/imageFraming';
  import { formatPHP } from '../utils/currency';
  import { CatalogImage } from '../utils/CatalogImage';
  import { GarmentIllustration } from './GarmentIllustration';
  import {
    CATALOG_CATEGORIES,
    CONSULTATION_GROUPS,
    CUSTOMIZATION_OPTIONS,
    FABRIC_FAMILIES,
    SAMPLE_CATALOG_ITEMS,
    STYLE_DESIGNS,
    UNIFORM_TYPES,
    buildCatalogCards,
    cardToDesign,
    customCatalogCard,
    designForGarmentType,
    fabricFamilyOf,
    groupForCategory,
    productionTimeFor,
    type CatalogCard,
    type CatalogDesign,
  } from './garmentCatalogData';

  /* ------------------------------------------------------------------ atoms */

  function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
      <span className={`text-[10px] uppercase tracking-[0.2em] text-[#8C7E74] ${className}`} style={{ fontFamily: "'Space Mono', monospace" }}>
        {children}
      </span>
    );
  }

  /** Base price for a garment type from the server rate card (null = not priced). */
function rateBaseFor(rateCard: RateCard | null | undefined, garmentType: string): number | null {
  if (!rateCard) return null;
  const hit = rateCard.garment_types.find((row) => row.garment_type === garmentType);
  return hit ? Number(hit.base_price) : null;
}

const peso = (amount: number) => formatPHP(amount);

  /** Catalog image with the shop's garment illustration as the fallback, rendered
      through the shared framing contract (Admin Live Preview → everywhere). */
  function SmartImage({ src, alt, garmentType, className, framing }: { src: string; alt: string; garmentType: string; className?: string; framing?: Partial<ImageFraming> | null }) {
    const [broken, setBroken] = useState(false);
    useEffect(() => { setBroken(false); }, [src]);
    if (!src || broken) {
      return (
        <div className={`flex items-center justify-center bg-gradient-to-br from-[#F8F3EB] to-[#F2ECE1] ${className || ''}`}>
          <GarmentIllustration type={garmentType} className="h-24 w-20" />
        </div>
      );
    }
    return <CatalogImage src={src} alt={alt} framing={framing} className={className} onBroken={() => setBroken(true)} />;
  }

  /* --------------------------------------------------- catalog data loading */

  interface CatalogData {
    cards: CatalogCard[];
    fabrics: { id: number; fabricName: string; tone: string; unit: string; stockQuantity?: number; unitCost?: number }[];
    /** Server Pricing Engine rate card (Admin-managed). Null = hide pricing. */
    rateCard: RateCard | null;
    loading: boolean;
    error: string;
    /** True when the shop catalog came back empty and samples are shown. */
    usingSamples: boolean;
    reload: () => void;
  }

  /**
   * Loads the admin-managed garment catalog + the live fabric inventory once and
   * shapes both into catalog cards. Falls back to shop samples when the catalog
   * is empty so the counter is never blocked.
   */
  function useGarmentCatalogData(): CatalogData {
    const [items, setItems] = useState<CatalogItem[]>([]);
    // The Pricing Guide + uniform "from" prices come from the server Pricing
    // Engine — the Admin Rate Card. Empty card = pricing is simply not shown.
    const [rateCard, setRateCard] = useState<RateCard | null>(null);
    const [fabrics, setFabrics] = useState<CatalogData['fabrics']>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [usingSamples, setUsingSamples] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
      let cancelled = false;
      setLoading(true);
      frontDeskApi.getRateCard().then((card) => { if (!cancelled) setRateCard(card); }).catch(() => { if (!cancelled) setRateCard(null); });
      Promise.allSettled([frontDeskApi.getGarmentCatalog(), frontDeskApi.getFabricCatalog()])
        .then(([catalogResult, fabricResult]) => {
          if (cancelled) return;
          const catalog = catalogResult.status === 'fulfilled' ? catalogResult.value : [];
          const fabricRows = fabricResult.status === 'fulfilled' ? (fabricResult.value.fabrics || []) : [];
          setFabrics(fabricRows);
          if (catalogResult.status === 'rejected') {
            setError(catalogResult.reason instanceof Error ? catalogResult.reason.message : 'Unable to load the garment catalog.');
          } else {
            setError('');
          }
          setItems(catalog.length > 0 ? catalog : SAMPLE_CATALOG_ITEMS);
          setUsingSamples(catalog.length === 0);
        })
        .finally(() => { if (!cancelled) setLoading(false); });
      return () => { cancelled = true; };
    }, [reloadKey]);

    const cards = useMemo(
      () => buildCatalogCards(items, fabrics.map((f) => f.fabricName)),
      [items, fabrics],
    );

    return {
      cards,
      fabrics,
      rateCard,
      loading,
      error,
      usingSamples,
      reload: useCallback(() => setReloadKey((k) => k + 1), []),
    };
  }

  /* --------------------------------------------------------- filter controls */

  interface CatalogFilterState {
    query: string;
    category: string;
    style: string;
    /** Consultation bucket (Formal Wear / Women's Wear / Uniforms / Bespoke). */
    group?: string;
    /** Live fabric family (Linen / Wool / Cotton / Others). */
    fabric?: string;
  }

  /** True when the card offers any fabric that belongs to the chosen family. */
  function cardHasFabricFamily(card: CatalogCard, family: string, inventoryFabrics: string[]): boolean {
    const labels = [...card.fabrics, ...inventoryFabrics.filter((name) => (
      card.fabrics.some((label) => label.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(label.toLowerCase()))
    ))];
    return labels.some((label) => fabricFamilyOf(label) === family);
  }

  function filterCards(cards: CatalogCard[], filters: CatalogFilterState, inventoryFabrics: string[] = []): CatalogCard[] {
    const q = filters.query.trim().toLowerCase();
    return cards.filter((card) => {
      if (filters.category !== 'All' && card.category !== filters.category) return false;
      if (filters.group && filters.group !== 'All' && groupForCategory(card.category) !== filters.group) return false;
      if (filters.style !== 'All' && !card.styles.includes(filters.style)) return false;
      if (filters.fabric && filters.fabric !== 'All' && !cardHasFabricFamily(card, filters.fabric, inventoryFabrics)) return false;
      if (!q) return true;
      return [
        card.name,
        card.category,
        card.garmentType,
        card.orderCategory,
        card.description,
        ...card.styles,
        ...card.fabrics,
      ].join(' ').toLowerCase().includes(q);
    });
  }

  function CatalogFilters({
    filters,
    onChange,
    resultCount,
  }: {
    filters: CatalogFilterState;
    onChange: (next: CatalogFilterState) => void;
    resultCount: number;
  }) {
    const dirty = filters.query !== '' || filters.category !== 'All' || filters.style !== 'All';
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-[#E2D7C7] bg-white px-3.5 py-2.5 shadow-sm transition-colors focus-within:border-[#A46B48]">
            <Search className="h-4 w-4 flex-shrink-0 text-[#A3958B]" strokeWidth={1.6} />
            <input
              value={filters.query}
              onChange={(e) => onChange({ ...filters, query: e.target.value })}
              placeholder="Search garment name, category, style or fabric…"
              aria-label="Search garment catalog"
              className="w-full bg-transparent text-[13.5px] text-[#2A211D] placeholder-[#C2B5A8] focus:outline-none"
            />
            {filters.query && (
              <button type="button" onClick={() => onChange({ ...filters, query: '' })} aria-label="Clear search" className="p-1 text-[#A3958B] hover:text-[#2A211D]">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2D7C7] bg-[#FCFAF7] px-3 py-2.5 text-[11px] font-medium text-[#766A62]">
              <ListFilter className="h-3.5 w-3.5 text-[#8C6F3E]" strokeWidth={1.7} />
              {resultCount} garment{resultCount === 1 ? '' : 's'}
            </span>
            {dirty && (
              <button
                type="button"
                onClick={() => onChange({ query: '', category: 'All', style: 'All' })}
                className="rounded-lg border border-[#E2D7C7] px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#766A62] transition-colors hover:bg-[#F2ECE1]"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Categories</Label>
          <div className="flex flex-wrap gap-1.5">
            {['All', ...CATALOG_CATEGORIES].map((category) => {
              const active = filters.category === category;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => onChange({ ...filters, category })}
                  aria-pressed={active}
                  className={`rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors ${
                    active ? 'bg-[#2A211D] text-[#FAF7F2] shadow-sm' : 'border border-[#E2D7C7] bg-white text-[#766A62] hover:bg-[#F2ECE1]'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Style</Label>
          <div className="flex flex-wrap gap-1.5">
            {['All', ...STYLE_DESIGNS].map((style) => {
              const active = filters.style === style;
              return (
                <button
                  key={style}
                  type="button"
                  onClick={() => onChange({ ...filters, style })}
                  aria-pressed={active}
                  className={`rounded-full px-3 py-1.5 text-[10px] font-medium transition-colors ${
                    active ? 'border border-[#8C6F3E] bg-[#F9F4EB] text-[#8C6F3E]' : 'border border-dashed border-[#E2D7C7] bg-white text-[#8C7E74] hover:bg-[#F9F4EB]'
                  }`}
                >
                  {style}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ----------------------------------------------------------- catalog cards */

  /** One garment card: image, name, category, styles, starting price, fabrics. */
  function CatalogGarmentCard({
    card,
    onView,
    onSelect,
    selectLabel = 'Select design',
    compact = false,
  }: {
    card: CatalogCard;
    onView: (card: CatalogCard) => void;
    onSelect?: (card: CatalogCard) => void;
    selectLabel?: string;
    compact?: boolean;
  }) {
    const isCustom = card.source === 'custom';
    return (
      <article className="group flex flex-col overflow-hidden rounded-2xl border border-[#ECE2D3] bg-white shadow-[0_1px_1px_rgba(42,33,29,0.03),0_10px_24px_-18px_rgba(42,33,29,0.18)] transition-all duration-300 hover:-translate-y-1 hover:border-[#E5C396]/70 hover:shadow-[0_24px_44px_-22px_rgba(42,33,29,0.34)]">
        <div className={`relative w-full overflow-hidden ${compact ? 'h-32' : 'h-48'} bg-[#F2ECE1]`}>
          {isCustom
            ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#FFFCF8] to-[#FBF4E8]">
                <Sparkles className="h-7 w-7 text-[#8C6F3E]" strokeWidth={1.5} />
                <span className="text-[10px] uppercase tracking-[0.16em] text-[#8C6F3E]" style={{ fontFamily: "'Space Mono', monospace" }}>Bespoke</span>
              </div>
            )
            : (
              <SmartImage
                src={card.image}
                alt={card.name}
                garmentType={card.garmentType}
                className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03]" framing={card.imageFraming}
              />
            )}
          <span className="absolute left-2.5 top-2.5 rounded-full bg-white/92 px-2.5 py-1 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[#5E5048] shadow-sm backdrop-blur-sm">
            {groupForCategory(card.category)}
          </span>
          <span className="absolute right-2.5 top-2.5 rounded-full bg-[#2A211D]/88 px-2.5 py-1 text-[10px] font-semibold text-[#F5EAD5] shadow" style={{ fontFamily: "'Space Mono', monospace" }}>
            {card.priceLabel}
          </span>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <h3 className="text-[15.5px] font-semibold leading-snug text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>{card.name}</h3>
          <p className="mt-0.5 text-[10.5px] uppercase tracking-[0.12em] text-[#A3958B]" style={{ fontFamily: "'Space Mono', monospace" }}>
            {card.orderCategory} · {card.garmentType}
          </p>
          {!compact && card.description && (
            <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-[#766A62]">{card.description}</p>
          )}

          <div className="mt-3">
            <Label>Available styles</Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {card.styles.map((style) => (
                <span key={style} className="rounded-full border border-[#E2D7C7] px-2 py-0.5 text-[9.5px] font-medium text-[#766A62]">{style}</span>
              ))}
            </div>
          </div>

          <div className="mt-3">
            <Label>Available fabrics</Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {card.fabrics.length > 0
                ? card.fabrics.slice(0, 3).map((fabric) => (
                  <span key={fabric} className="rounded-full bg-[#F9F4EB] px-2 py-0.5 text-[9.5px] font-medium text-[#8C6F3E]">{fabric}</span>
                ))
                : <span className="text-[10px] text-[#A3958B]">Fabric chosen from live inventory at intake</span>}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 rounded-lg border border-[#F0EAE2] bg-[#FCFAF7] px-3 py-2.5">
            <div className="min-w-0">
              <Label>Styles</Label>
              <p className="mt-0.5 truncate text-[11.5px] font-medium text-[#2A211D]">{card.styles.length} available</p>
            </div>
            <div className="min-w-0">
              <Label>Estimated Production Time</Label>
              <p className="mt-1 flex items-center gap-1.5 truncate text-[11.5px] font-semibold text-[#2A211D]">
                <Clock className="h-3 w-3 flex-shrink-0 text-[#8C6F3E]" strokeWidth={1.8} /> {card.productionTime}
              </p>
            </div>
          </div>

          {card.colors.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <Label>Colours</Label>
              {card.colors.slice(0, 6).map((color, index) => (
                <span key={`${color}-${index}`} title={color} className="h-4 w-4 rounded-full border border-[#E2D7C7] shadow-inner" style={{ backgroundColor: color }} />
              ))}
            </div>
          )}

          <div className="mt-auto flex items-center gap-2 pt-4">
            <button
              type="button"
              onClick={() => onView(card)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#E2D7C7] px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5E5048] transition-colors hover:bg-[#F2ECE1]"
            >
              View Details
            </button>
            {onSelect && (
              <button
                type="button"
                onClick={() => onSelect(card)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#2A211D] px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#FAF7F2] shadow-md transition-colors hover:bg-[#3D312B]"
              >
                <Check className="h-3.5 w-3.5" /> {selectLabel}
              </button>
            )}
          </div>
        </div>
      </article>
    );
  }

  function CatalogSkeleton({ count = 4 }: { count?: number }) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading garment catalog">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-xl border border-[#ECE2D3] bg-[#FCFAF7]">
            <div className="h-44 w-full animate-pulse bg-[#EFE7DC]" />
            <div className="space-y-3 p-4">
              <div className="h-4 w-1/2 animate-pulse rounded bg-[#EFE7DC]" />
              <div className="h-3 w-full animate-pulse rounded bg-[#F2ECE1]" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-[#F2ECE1]" />
              <div className="h-9 w-full animate-pulse rounded bg-[#F2ECE1]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  /* ------------------------------------------------------- garment details */

  /** Full design reference for one garment — pricing, fabrics, sample image. */
  function GarmentDetailsModal({
    card,
    fabricInventory,
    onClose,
    onStartOrder,
  }: {
    card: CatalogCard;
    fabricInventory: CatalogData['fabrics'];
    onClose: () => void;
    onStartOrder?: (design: CatalogDesign) => void;
  }) {
    const suggestions = useMemo(
      () => card.fabrics.map((label) => ({
        label,
        inStock: fabricInventory.find((fabric) => (
          label.toLowerCase().includes(fabric.fabricName.toLowerCase())
          || fabric.fabricName.toLowerCase().includes(label.toLowerCase())
        )),
      })),
      [card.fabrics, fabricInventory],
    );

    useEffect(() => {
      const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5">
        <div className="absolute inset-0 bg-[#1F1916]/45 backdrop-blur-sm" onClick={onClose} />
        <section
          role="dialog"
          aria-modal="true"
          aria-label={`${card.name} details`}
          className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-[#E8DFD3] bg-[#FFFCF8] shadow-2xl"
        >
          <header className="flex items-start justify-between gap-3 border-b border-[#ECE2D3] px-5 pb-4 pt-5 sm:px-7">
            <div className="min-w-0">
              <Label>Garment details</Label>
              <h2 className="mt-1 text-2xl leading-tight text-[#2A211D] sm:text-3xl" style={{ fontFamily: "'DM Serif Display', serif" }}>{card.name}</h2>
              <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[#A3958B]" style={{ fontFamily: "'Space Mono', monospace" }}>
                {card.category} · {card.orderCategory} · {card.garmentType}
              </p>
            </div>
            <button onClick={onClose} aria-label="Close garment details" className="flex-shrink-0 rounded-full p-1.5 text-[#A3958B] transition-colors hover:bg-[#F2ECE1] hover:text-[#2A211D]">
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.05fr_1fr]">
              <div>
                <div className="overflow-hidden rounded-xl border border-[#E2D7C7] bg-[#F8F3EB]">
                  {card.source === 'custom'
                    ? <div className="flex h-64 items-center justify-center"><Sparkles className="h-10 w-10 text-[#8C6F3E]" strokeWidth={1.4} /></div>
                    : <SmartImage src={card.image} alt={card.name} garmentType={card.garmentType} framing={card.imageFraming} className="h-64 w-full object-cover" />}
                </div>
                <p className="mt-2 text-[10.5px] leading-relaxed text-[#A3958B]">
                  Design reference shown to the customer at the counter. The garment, style and fabric recorded on the job card come from live inventory — nothing is typed by hand.
                </p>
                <div className="mt-4 rounded-xl border border-[#ECE2D3] bg-white p-4">
                  <Label>Illustration reference</Label>
                  <div className="mt-2 flex items-center gap-4">
                    <div className="flex h-24 w-20 items-center justify-center rounded-lg border border-[#E2D7C7] bg-[#FCFAF7]">
                      <GarmentIllustration type={card.garmentType} className="h-20 w-16" />
                    </div>
                    <p className="text-[11.5px] leading-relaxed text-[#766A62]">
                      The workshop cuts from the <strong className="text-[#2A211D]">{card.garmentType}</strong> pattern block. Pricing, measurement points and the production workflow all follow this garment type.
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-5">
                {card.description && (
                  <p className="text-[13px] leading-relaxed text-[#5E5048]">{card.description}</p>
                )}

                <div className="rounded-xl border border-[#E8DFD3] bg-white p-4">
                  <Label>Pricing reference</Label>
                  <dl className="mt-3 space-y-2.5">
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-[11.5px] text-[#766A62]">Starting Price</dt>
                      <dd className="text-[15px] font-semibold tabular-nums text-[#2A211D]" style={{ fontFamily: "'Space Mono', monospace" }}>{peso(card.startingPrice)}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-[11.5px] text-[#766A62]">Labor Estimate</dt>
                      <dd className="text-[13px] font-medium tabular-nums text-[#2A211D]" style={{ fontFamily: "'Space Mono', monospace" }}>{peso(Math.round(card.startingPrice * 0.6))}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-[11.5px] text-[#766A62]">Material Estimate</dt>
                      <dd className="text-[13px] font-medium tabular-nums text-[#2A211D]" style={{ fontFamily: "'Space Mono', monospace" }}>{peso(Math.round(card.startingPrice * 0.3))}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-4 border-t border-dashed border-[#E2D7C7] pt-2.5">
                      <dt className="text-[11.5px] font-medium text-[#766A62]">Suggested Deposit (50%)</dt>
                      <dd className="text-[15px] font-semibold tabular-nums text-[#8C6F3E]" style={{ fontFamily: "'Space Mono', monospace" }}>{peso(Math.round(card.startingPrice * 0.5))}</dd>
                    </div>
                  </dl>
                  <p className="mt-2.5 text-[10.5px] leading-relaxed text-[#A3958B]">Indicative only — the job card total is computed by the shop rate card when the order is saved.</p>
                </div>

                <div>
                  <Label>Styles offered</Label>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {card.styles.map((style) => (
                      <span key={style} className="rounded-full border border-[#E2D7C7] bg-white px-2.5 py-1 text-[10px] font-medium text-[#5E5048]">{style}</span>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Fabric options</Label>
                  <ul className="mt-2 space-y-1.5">
                    {suggestions.length > 0
                      ? suggestions.map((suggestion) => (
                        <li key={suggestion.label} className="flex items-center justify-between gap-3 rounded-lg border border-[#ECE2D3] bg-white px-3 py-2 text-[11.5px]">
                          <span className="min-w-0 truncate text-[#5E5048]">{suggestion.label}</span>
                          <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] ${suggestion.inStock ? 'bg-[#EDF5F0] text-[#4E7357]' : 'bg-[#FFF7E3] text-[#8A6618]'}`}>
                            {suggestion.inStock ? 'On the shelf' : 'Suggest only'}
                          </span>
                        </li>
                      ))
                      : <li className="text-[11.5px] text-[#A3958B]">Fabric is selected from live inventory during intake.</li>}
                  </ul>
                </div>

                {card.colors.length > 0 && (
                  <div>
                    <Label>Colour references</Label>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {card.colors.map((color, index) => (
                        <span key={`${color}-${index}`} className="flex items-center gap-1.5 rounded-full border border-[#E2D7C7] bg-white px-2 py-1">
                          <span className="h-4 w-4 rounded-full border border-[#E2D7C7]" style={{ backgroundColor: color }} />
                          <span className="text-[10px] text-[#8C7E74]" style={{ fontFamily: "'Space Mono', monospace" }}>{color}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <footer className="flex flex-col gap-3 border-t border-[#ECE2D3] bg-[#FCFAF7] px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-7">
            <button type="button" onClick={onClose} className="rounded-lg border border-[#E2D7C7] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5E5048] transition-colors hover:bg-[#F2ECE1]">
              Close
            </button>
            {onStartOrder && (
              <button
                type="button"
                onClick={() => { onStartOrder(cardToDesign(card)); onClose(); }}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2A211D] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#FAF7F2] shadow-md transition-colors hover:bg-[#3D312B]"
              >
                <Scissors className="h-3.5 w-3.5" /> Create order with this garment
              </button>
            )}
          </footer>
        </section>
      </div>
    );
  }


  /* ------------------------------------------------- CATALOG PICKER (intake) */

  /**
   * The picker used inside the Garment Intake form (Step 2 — "Select from
   * Garment Catalog"). Same data, same filters and same cards as the standalone
   * page, but compact and closable so the intake workflow is never lost.
   */
  export function GarmentCatalogPicker({
    onClose,
    onSelect,
    initialQuery = '',
    title = 'Garment Catalog',
  }: {
    onClose: () => void;
    onSelect: (design: CatalogDesign) => void;
    initialQuery?: string;
    title?: string;
  }) {
    const { cards, fabrics, loading, error, reload } = useGarmentCatalogData();
    const [filters, setFilters] = useState<CatalogFilterState>({ query: initialQuery, category: 'All', style: 'All' });
    const [detail, setDetail] = useState<CatalogCard | null>(null);
    const filtered = useMemo(() => filterCards(cards, filters), [cards, filters]);

    useEffect(() => {
      const onKey = (event: KeyboardEvent) => {
        if (event.key !== 'Escape') return;
        if (detail) setDetail(null); else onClose();
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [detail, onClose]);

    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-5">
        <div className="absolute inset-0 bg-[#1F1916]/55 backdrop-blur-sm" onClick={onClose} />
        <section
          role="dialog"
          aria-modal="true"
          aria-label="Select a garment from the catalog"
          className="relative flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-[#E8DFD3] bg-[#FAF7F2] shadow-2xl"
        >
          <header className="flex items-start justify-between gap-3 border-b border-[#E8DFD3] bg-[#FFFCF8] px-5 pb-4 pt-5 sm:px-7">
            <div className="min-w-0">
              <Label>Step 2 — garment selection</Label>
              <h2 className="mt-1 text-2xl leading-tight text-[#2A211D] sm:text-3xl" style={{ fontFamily: "'DM Serif Display', serif" }}>{title}</h2>
              <p className="mt-1 text-[12px] leading-relaxed text-[#766A62]">
                Browse the shop's garments, uniform types, styles and fabrics with the customer, then pick the design. The intake form fills in the garment type, style, fabric suggestion and base price.
              </p>
            </div>
            <button onClick={onClose} aria-label="Close garment catalog" className="flex-shrink-0 rounded-full p-1.5 text-[#A3958B] transition-colors hover:bg-[#F2ECE1] hover:text-[#2A211D]">
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="border-b border-[#E8DFD3] bg-[#FAF7F2] px-5 py-4 sm:px-7">
            <CatalogFilters filters={filters} onChange={setFilters} resultCount={filtered.length} />
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7">
            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-[#ECD8A7] bg-[#FFF7E3] px-4 py-3 text-[12px] text-[#8A6618]">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{error} Showing the shop's sample garments so you can continue.</span>
                <button type="button" onClick={reload} className="ml-auto flex-shrink-0 font-semibold uppercase tracking-[0.1em] underline-offset-2 hover:underline">Retry</button>
              </div>
            )}

            {loading
              ? <CatalogSkeleton count={4} />
              : filtered.length === 0
                ? (
                  <div className="rounded-xl border border-dashed border-[#E2D7C7] bg-white p-8 text-center">
                    <Shirt className="mx-auto mb-2 h-6 w-6 text-[#A3958B]" />
                    <p className="text-sm font-medium text-[#2A211D]">No garments match your search.</p>
                    <p className="mt-1 text-[12px] text-[#766A62]">Try another name or category, or start a Bespoke Brief instead.</p>
                    <button
                      type="button"
                      onClick={() => onSelect(cardToDesign(customCatalogCard()))}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[#C9A15C]/60 bg-white px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8C6F3E] hover:bg-[#F9F4EB]"
                    >
                      <Sparkles className="h-3.5 w-3.5" /> Start Bespoke Brief
                    </button>
                  </div>
                )
                : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {filtered.map((card) => (
                      <CatalogGarmentCard
                        key={card.key}
                        card={card}
                        compact
                        onView={setDetail}
                        onSelect={(picked) => onSelect(cardToDesign(picked))}
                        selectLabel="Use"
                      />
                    ))}
                    <CatalogGarmentCard
                      card={customCatalogCard()}
                      compact
                      onView={setDetail}
                      onSelect={(picked) => onSelect(cardToDesign(picked))}
                      selectLabel="Use"
                    />
                  </div>
                )}
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-[#E8DFD3] bg-[#FFFCF8] px-5 py-4 sm:px-7">
            <p className="text-[11px] text-[#8C7E74]">{fabrics.length} fabric{fabrics.length === 1 ? '' : 's'} on the shelf &middot; fabric is confirmed in intake Step 3</p>
            <button type="button" onClick={onClose} className="rounded-lg border border-[#E2D7C7] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5E5048] transition-colors hover:bg-[#F2ECE1]">
              Cancel
            </button>
          </footer>
        </section>
      </div>
    );
  }


  /* ==================================================================
    STANDALONE PAGE — Garment Catalog
    Front Desk tailoring consultation centre.

    Browse Design → Choose Design → Customize → Create Order.
    The catalog grid is the primary surface; uniform types, fabrics,
    customization options and the pricing guide live in tabs below it so
    the counter never scrolls through a long document mid-consultation.
  ================================================================== */

  const CATALOG_TABS = ['Design Details', 'Uniform Types', 'Fabrics', 'Customization', 'Pricing Guide'] as const;
  type CatalogTab = (typeof CATALOG_TABS)[number];

  /** Common fabric tone names → swatch colour for the fabric cards. */
  function toneSwatch(tone: string): string {
    const value = (tone || '').toLowerCase();
    const swatches: [string, string][] = [
      ['ivory', '#F6F1E4'], ['cream', '#F3EADA'], ['beige', '#DFD0B4'], ['natural', '#E4DCC8'],
      ['white', '#FAF8F4'], ['black', '#2A211D'], ['charcoal', '#3A3A3E'], ['navy', '#1D2A44'],
      ['blue', '#3C5A86'], ['camel', '#B79268'], ['brown', '#7A5A42'], ['wine', '#6A2737'],
      ['blush', '#D9A6A6'], ['grey', '#9AA0A6'], ['gray', '#9AA0A6'], ['green', '#4E7357'],
    ];
    return swatches.find(([key]) => value.includes(key))?.[1] || '#DED3C4';
  }

  /** Compact KPI tile used by the showroom header summary. */
  function StatTile({ icon, value, label, hint }: { icon: React.ReactNode; value: string; label: string; hint: string }) {
    return (
      <div className="dash-card flex items-center gap-3.5 rounded-2xl px-4 py-3.5">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#F9F4EB] text-[#8C6F3E] ring-1 ring-[#E5C396]/40">{icon}</span>
        <div className="min-w-0">
          <p className="text-[21px] leading-none text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>{value}</p>
          <p className="mt-1 truncate text-[10px] uppercase tracking-[0.14em] text-[#8C7E74]" style={{ fontFamily: "'Space Mono', monospace" }}>{label}</p>
          <p className="truncate text-[10.5px] text-[#A3958B]">{hint}</p>
        </div>
      </div>
    );
  }


  /* --------------------------------------------------- filter sidebar */

  /** Sticky consultation sidebar — every filter lives here, never in the grid. */
  function CatalogFilterSidebar({
    filters,
    onChange,
    resultCount,
    fabricCounts,
  }: {
    filters: CatalogFilterState;
    onChange: (next: CatalogFilterState) => void;
    resultCount: number;
    fabricCounts: Record<string, number>;
  }) {
    const dirty = filters.query !== ''
      || (filters.group ?? 'All') !== 'All'
      || filters.category !== 'All'
      || filters.style !== 'All'
      || (filters.fabric ?? 'All') !== 'All';

    const groupChip = (active: boolean) => `w-full rounded-lg px-3 py-2 text-left text-[11.5px] font-medium transition-colors ${
      active ? 'bg-[#2A211D] text-[#FAF7F2] shadow-sm' : 'text-[#5E5048] hover:bg-[#F4EEE4]'
    }`;
    const pill = (active: boolean) => `rounded-full border px-2.5 py-1 text-[10.5px] font-medium transition-colors ${
      active ? 'border-[#8C6F3E] bg-[#F9F4EB] text-[#8C6F3E]' : 'border-[#E2D7C7] bg-white text-[#766A62] hover:bg-[#F9F4EB]'
    }`;

    return (
      <div className="dash-card rounded-2xl p-5">
        <div className="flex items-center gap-2">
          <ListFilter className="h-4 w-4 text-[#8C6F3E]" strokeWidth={1.7} />
          <h2 className="text-[15px] text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>Consultation filters</h2>
          <span className="ml-auto rounded-full bg-[#F9F4EB] px-2 py-0.5 text-[10px] font-semibold text-[#8C6F3E]" style={{ fontFamily: "'Space Mono', monospace" }}>
            {resultCount}
          </span>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#E2D7C7] bg-white px-3 py-2.5 shadow-sm transition-colors focus-within:border-[#A46B48]">
          <Search className="h-4 w-4 flex-shrink-0 text-[#A3958B]" strokeWidth={1.6} />
          <input
            value={filters.query}
            onChange={(event) => onChange({ ...filters, query: event.target.value })}
            placeholder="Search garments…"
            aria-label="Search garment catalog"
            className="w-full bg-transparent text-[13px] text-[#2A211D] placeholder-[#C2B5A8] focus:outline-none"
          />
          {filters.query && (
            <button type="button" onClick={() => onChange({ ...filters, query: '' })} aria-label="Clear search" className="p-1 text-[#A3958B] hover:text-[#2A211D]">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="mt-5">
          <Label className="mb-2 block">Category</Label>
          <div className="space-y-1">
            {['All', ...CONSULTATION_GROUPS].map((group) => {
              const active = (filters.group ?? 'All') === group;
              return (
                <button
                  key={group}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange({ ...filters, category: 'All', group })}
                  className={groupChip(active)}
                >
                  {group}
                </button>
              );
            })}
          </div>
          <Label className="mt-3 mb-1.5 block">Refine category</Label>
          <div className="flex flex-wrap gap-1.5">
            {CATALOG_CATEGORIES.map((category) => {
              const active = filters.category === category;
              return (
                <button
                  key={category}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange({ ...filters, category: active ? 'All' : category })}
                  className={pill(active)}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5">
          <Label className="mb-2 block">Style</Label>
          <div className="flex flex-wrap gap-1.5">
            {['All', ...STYLE_DESIGNS].map((style) => (
              <button
                key={style}
                type="button"
                aria-pressed={filters.style === style}
                onClick={() => onChange({ ...filters, style })}
                className={pill(filters.style === style)}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <Label className="mb-2 block">Fabric</Label>
          <div className="flex flex-wrap gap-1.5">
            {['All', ...FABRIC_FAMILIES].map((family) => {
              const active = (filters.fabric ?? 'All') === family;
              const count = family === 'All'
                ? Object.values(fabricCounts).reduce((sum, value) => sum + value, 0)
                : fabricCounts[family] ?? 0;
              return (
                <button
                  key={family}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange({ ...filters, fabric: family })}
                  className={pill(active)}
                  title={`${count} fabric record${count === 1 ? '' : 's'} in stock`}
                >
                  {family} <span className="text-[9.5px] text-[#A3958B]">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {dirty && (
          <button
            type="button"
            onClick={() => onChange({ query: '', category: 'All', style: 'All', group: 'All', fabric: 'All' })}
            className="mt-5 w-full rounded-lg border border-[#E2D7C7] px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#766A62] transition-colors hover:bg-[#F2ECE1]"
          >
            Clear all filters
          </button>
        )}
      </div>
    );
  }



  /* ---------------------------------------------------------- tab panels */

  /** Tab 1 — everything the counter needs about the design being discussed. */
  function DesignDetailsPanel({
    card,
    fabrics,
    onStartOrder,
    onBrowse,
  }: {
    card: CatalogCard | null;
    fabrics: CatalogData['fabrics'];
    onStartOrder?: (design: CatalogDesign) => void;
    onBrowse: () => void;
  }) {
    if (!card) {
      return (
        <div className="rounded-2xl border border-dashed border-[#E2D7C7] bg-[#FCFAF7] px-6 py-10 text-center">
          <Shirt className="mx-auto mb-2 h-7 w-7 text-[#A3958B]" />
          <p className="text-[14px] font-medium text-[#2A211D]">No design selected yet</p>
          <p className="mx-auto mt-1 max-w-md text-[12px] leading-relaxed text-[#766A62]">
            Pick a garment from the catalog grid — its styles, colours, recommended fabrics, turnaround and pricing reference appear here for the consultation.
          </p>
          <button
            type="button"
            onClick={onBrowse}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[#C9A15C]/60 bg-white px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8C6F3E] transition-colors hover:bg-[#F9F4EB]"
          >
            <ArrowRight className="h-3.5 w-3.5" /> Browse designs
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-5">
            <div>
              <Label>Garment information</Label>
              <p className="mt-1 text-[11px] text-[#A3958B]">Everything agreed with the customer about this design, ready to be recorded on the job card.</p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
            <div className="h-40 w-full flex-shrink-0 overflow-hidden rounded-xl border border-[#E2D7C7] bg-[#F8F3EB] sm:h-36 sm:w-32">
              {card.source === 'custom'
                ? <div className="flex h-full w-full items-center justify-center"><Sparkles className="h-8 w-8 text-[#8C6F3E]" strokeWidth={1.4} /></div>
                : <SmartImage src={card.image} alt={card.name} garmentType={card.garmentType} framing={card.imageFraming} className="h-full w-full object-cover" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-[20px] leading-tight text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>{card.name}</h3>
              <p className="mt-1 text-[10.5px] uppercase tracking-[0.12em] text-[#A3958B]" style={{ fontFamily: "'Space Mono', monospace" }}>
                {groupForCategory(card.category)} · {card.category} · {card.garmentType}
              </p>
              {card.description && <p className="mt-2 text-[12.5px] leading-relaxed text-[#5E5048]">{card.description}</p>}
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#F9F4EB] px-3 py-1 text-[11px] font-semibold text-[#8C6F3E]">
                <Clock className="h-3.5 w-3.5" strokeWidth={1.8} /> Estimated production time · {card.productionTime}
              </p>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Available styles</Label>
            <div className="flex flex-wrap gap-1.5">
              {card.styles.map((style) => (
                <span key={style} className="rounded-full border border-[#E2D7C7] bg-white px-2.5 py-1 text-[10.5px] font-medium text-[#5E5048]">{style}</span>
              ))}
            </div>
          </div>

          {card.colors.length > 0 && (
            <div>
              <Label className="mb-2 block">Available colours</Label>
              <div className="flex flex-wrap items-center gap-2">
                {card.colors.map((color, index) => (
                  <span key={`${color}-${index}`} className="flex items-center gap-1.5 rounded-full border border-[#E2D7C7] bg-white px-2 py-1">
                    <span className="h-4 w-4 rounded-full border border-[#E2D7C7]" style={{ backgroundColor: color }} />
                    <span className="text-[10px] text-[#8C7E74]" style={{ fontFamily: "'Space Mono', monospace" }}>{color}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label className="mb-2 block">Recommended fabrics</Label>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {card.fabrics.length > 0
                ? card.fabrics.map((label) => {
                  const match = fabrics.find((fabric) => (
                    label.toLowerCase().includes(fabric.fabricName.toLowerCase())
                    || fabric.fabricName.toLowerCase().includes(label.toLowerCase())
                  ));
                  return (
                    <li key={label} className="flex items-center justify-between gap-3 rounded-lg border border-[#ECE2D3] bg-white px-3 py-2 text-[11.5px]">
                      <span className="min-w-0 truncate text-[#5E5048]">{label}</span>
                      <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] ${match ? 'bg-[#EDF5F0] text-[#4E7357]' : 'bg-[#FFF7E3] text-[#8A6618]'}`}>
                        {match ? 'On the shelf' : 'Suggest only'}
                      </span>
                    </li>
                  );
                })
                : <li className="text-[11.5px] text-[#A3958B]">Fabric is selected from live inventory during intake.</li>}
            </ul>
          </div>
        </div>

        <aside className="min-w-0 space-y-4 rounded-2xl border border-[#E8DFD3] bg-white p-4">
          <div>
            <Label>Pricing reference</Label>
            <dl className="mt-3 space-y-2.5">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-[11.5px] text-[#766A62]">Starting Price</dt>
                <dd className="text-[15px] font-semibold tabular-nums text-[#2A211D]" style={{ fontFamily: "'Space Mono', monospace" }}>{peso(card.startingPrice)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-[11.5px] text-[#766A62]">Labor Estimate</dt>
                <dd className="text-[13px] font-medium tabular-nums text-[#2A211D]" style={{ fontFamily: "'Space Mono', monospace" }}>{peso(Math.round(card.startingPrice * 0.6))}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-[11.5px] text-[#766A62]">Material Estimate</dt>
                <dd className="text-[13px] font-medium tabular-nums text-[#2A211D]" style={{ fontFamily: "'Space Mono', monospace" }}>{peso(Math.round(card.startingPrice * 0.3))}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-dashed border-[#E2D7C7] pt-2.5">
                <dt className="text-[11.5px] font-medium text-[#766A62]">Suggested Deposit (50%)</dt>
                <dd className="text-[15px] font-semibold tabular-nums text-[#8C6F3E]" style={{ fontFamily: "'Space Mono', monospace" }}>{peso(Math.round(card.startingPrice * 0.5))}</dd>
              </div>
            </dl>
            <p className="mt-2.5 text-[10.5px] leading-relaxed text-[#A3958B]">Indicative only — the job card total is computed by the shop rate card when the order is saved.</p>
          </div>

          <div className="rounded-xl border border-[#ECE2D3] bg-[#FCFAF7] p-3">
            <Label>Illustration reference</Label>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex h-20 w-16 items-center justify-center rounded-lg border border-[#E2D7C7] bg-white">
                <GarmentIllustration type={card.garmentType} className="h-16 w-12" />
              </div>
              <p className="text-[11px] leading-relaxed text-[#766A62]">Cut from the <strong className="text-[#2A211D]">{card.garmentType}</strong> pattern block.</p>
            </div>
          </div>

          {onStartOrder && (
            <button
              type="button"
              onClick={() => onStartOrder(cardToDesign(card))}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#2A211D] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#FAF7F2] shadow-md transition-colors hover:bg-[#3D312B]"
            >
              <Scissors className="h-3.5 w-3.5" /> Create order
            </button>
          )}
        </aside>
        </div>

        {/* Design notes — recorded verbatim on the job card at intake */}
        <div className="rounded-2xl border border-[#ECE2D3] bg-white p-4">
          <Label>Design notes</Label>
          <p className="mt-2 text-[12px] leading-relaxed text-[#766A62]">
            {card.description
              ? 'Agree the specifics with the customer now — collar, sleeves, embroidery, colour and fabric are all captured on intake Step 3 and printed on the job card for the tailor. Anything not offered on this design goes in the notes field at intake.'
              : `The ${card.name} follows the shop's ${card.garmentType} pattern block. Confirm collar, sleeves, embroidery, colour and fabric at intake Step 3; special requests go in the notes field and onto the job card.`}
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[#A3958B]">
            <Clock className="h-3.5 w-3.5" strokeWidth={1.8} /> Estimated production time · {card.productionTime} · deposit typically {peso(Math.round(card.startingPrice * 0.5))} at the counter
          </p>
        </div>

        {/* Bespoke upsell — kept in-tab so it never occupies its own section */}
        {card.source !== 'custom' && (
          <div className="relative overflow-hidden rounded-2xl bg-[#201A17] px-5 py-6 text-[#F5EAD5] sm:px-6">
            <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[#C9A15C]/12" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C9A15C]/45 bg-[#C9A15C]/12 px-3 py-1 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[#E8CF9E]" style={{ fontFamily: "'Space Mono', monospace" }}>
                  <Sparkles className="h-3 w-3" /> Bespoke service
                </span>
                <h3 className="mt-2.5 text-xl leading-tight sm:text-2xl" style={{ fontFamily: "'DM Serif Display', serif" }}>
                  Need something unique?
                </h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#D9C9AC]">
                  Create a bespoke garment — the workshop drafts a fresh pattern from scratch around the customer&rsquo;s measurements.
                </p>
              </div>
              {onStartOrder && (
                <button
                  type="button"
                  onClick={() => onStartOrder(cardToDesign(customCatalogCard()))}
                  className="flex-shrink-0 inline-flex items-center justify-center gap-2 rounded-lg bg-[#C9A15C] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#201A17] shadow-lg transition-colors hover:bg-[#DBB871]"
                >
                  <Scissors className="h-3.5 w-3.5" /> Create Bespoke Order
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  /** Tab 2 — the uniform sets the shop produces for schools and companies. */
    function UniformTypesPanel({ rateCard, onStartOrder }: { rateCard?: RateCard | null; onStartOrder?: (design: CatalogDesign) => void }) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {UNIFORM_TYPES.map((type) => (
          <div key={type} className="flex flex-col rounded-2xl border border-[#ECE2D3] bg-white p-4 transition-shadow hover:shadow-[0_16px_30px_-22px_rgba(42,33,29,0.35)]">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#F9F4EB] text-[#8C6F3E]">
                <Layers className="h-4 w-4" strokeWidth={1.7} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-semibold text-[#2A211D]">{type}</p>
                <p className="mt-0.5 text-[11px] text-[#8C6F3E]" style={{ fontFamily: "'Space Mono', monospace" }}>
                  {rateBaseFor(rateCard, type) !== null ? `from ${peso(rateBaseFor(rateCard, type) as number)}` : 'priced at intake'}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#F0EAE2] pt-3">
              <span className="inline-flex items-center gap-1.5 text-[10.5px] text-[#A3958B]">
                <Shirt className="h-3.5 w-3.5" strokeWidth={1.7} /> Volume orders welcome
              </span>
              <button
                type="button"
                disabled={!onStartOrder}
                onClick={() => onStartOrder?.(designForGarmentType(type))}
                className="inline-flex items-center gap-1 rounded-lg border border-[#E2D7C7] px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#5E5048] transition-colors hover:bg-[#F2ECE1] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Start order <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }


  /** Tab 3 — the live fabric inventory the workshop actually holds. */
  function FabricsPanel({ fabrics }: { fabrics: CatalogData['fabrics'] }) {
    if (fabrics.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-[#E2D7C7] bg-[#FCFAF7] px-6 py-10 text-center">
          <Scissors className="mx-auto mb-2 h-7 w-7 text-[#A3958B]" />
          <p className="text-[14px] font-medium text-[#2A211D]">No fabric recorded in inventory yet</p>
          <p className="mt-1 text-[12px] text-[#766A62]">Add fabric stock in Admin → Inventory and it appears here for the customer to choose.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {fabrics.map((fabric) => {
          const family = fabricFamilyOf(`${fabric.fabricName} ${fabric.tone}`);
          const stock = fabric.stockQuantity;
          const known = stock !== undefined && stock !== null;
          const low = known && Number(stock) > 0 && Number(stock) <= 10;
          const out = known && Number(stock) <= 0;
          const price = fabric.unitCost;
          return (
            <div key={fabric.id} className="flex flex-col overflow-hidden rounded-2xl border border-[#ECE2D3] bg-white transition-shadow hover:shadow-[0_16px_30px_-22px_rgba(42,33,29,0.35)]">
              <div className="flex h-20 items-center justify-center border-b border-[#F0EAE2]" style={{ background: `linear-gradient(135deg, ${toneSwatch(fabric.tone)} 0%, ${toneSwatch(fabric.tone)}cc 60%, #FFFFFF 100%)` }}>
                <Tag className="h-5 w-5 text-[#2A211D]/45" strokeWidth={1.6} />
              </div>
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-semibold text-[#2A211D]">{fabric.fabricName}</p>
                    <p className="mt-0.5 text-[10.5px] uppercase tracking-[0.1em] text-[#A3958B]" style={{ fontFamily: "'Space Mono', monospace" }}>
                      {family}{fabric.tone ? ` · ${fabric.tone}` : ''}
                    </p>
                  </div>
                  <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] ${
                    out ? 'bg-[#FBECE8] text-[#9E5B4B]' : low ? 'bg-[#FFF7E3] text-[#8A6618]' : 'bg-[#EDF5F0] text-[#4E7357]'
                  }`}>
                    {out ? 'Out of stock' : low ? 'Low stock' : known ? 'In stock' : 'In inventory'}
                  </span>
                </div>
                <dl className="mt-3 flex-1 space-y-1.5 text-[11.5px]">
                  <div className="flex items-center justify-between">
                    <dt className="text-[#766A62]">Available stock</dt>
                    <dd className="font-medium text-[#2A211D]" style={{ fontFamily: "'Space Mono', monospace" }}>
                      {known ? `${stock} ${fabric.unit}` : fabric.unit}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-[#766A62]">Colour / tone</dt>
                    <dd className="truncate font-medium text-[#2A211D]">{fabric.tone || '—'}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-[#766A62]">Price</dt>
                    <dd className="font-medium text-[#8C6F3E]" style={{ fontFamily: "'Space Mono', monospace" }}>
                      {price !== undefined && price !== null ? `${peso(Number(price))} / ${fabric.unit}` : 'Priced at intake'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  /** Tab 4 — collar, sleeve and embroidery choices, grouped and collapsible. */
  function CustomizationPanel({ onApply }: { onApply?: (summary: string) => void }) {
    const groups: [string, readonly string[]][] = [
      ['Collar Styles', CUSTOMIZATION_OPTIONS.collarStyles],
      ['Sleeve Styles', CUSTOMIZATION_OPTIONS.sleeveStyles],
      ['Embroidery', CUSTOMIZATION_OPTIONS.embroideryOptions],
    ];
    const [open, setOpen] = useState<Record<string, boolean>>({});
    const [picked, setPicked] = useState<Record<string, string[]>>({});
    const toggleGroup = (title: string) => setOpen((current) => ({ ...current, [title]: !(current[title] ?? true) }));
    const toggleOption = (title: string, option: string) => setPicked((current) => {
      const list = current[title] ?? [];
      return { ...current, [title]: list.includes(option) ? list.filter((value) => value !== option) : [...list, option] };
    });
    const chosen = groups.flatMap(([title]) => picked[title] ?? []);
    const summary = chosen.join(' · ');

    return (
      <div className="space-y-3">
        {groups.map(([title, options]) => {
          const expanded = open[title] ?? true;
          return (
            <div key={title} className="overflow-hidden rounded-2xl border border-[#ECE2D3] bg-white">
              <button
                type="button"
                onClick={() => toggleGroup(title)}
                aria-expanded={expanded}
                className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-[#FCFAF7]"
              >
                <Palette className="h-4 w-4 flex-shrink-0 text-[#8C6F3E]" strokeWidth={1.7} />
                <span className="text-[13.5px] font-semibold text-[#2A211D]">{title}</span>
                <span className="rounded-full bg-[#F9F4EB] px-2 py-0.5 text-[10px] text-[#8C6F3E]" style={{ fontFamily: "'Space Mono', monospace" }}>
                  {(picked[title] ?? []).length}/{options.length}
                </span>
                <ChevronDown className={`ml-auto h-4 w-4 flex-shrink-0 text-[#A3958B] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
              </button>
              <div className={`grid transition-all duration-300 ease-out ${expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                  <div className="flex flex-wrap gap-1.5 px-4 pb-4">
                    {options.map((option) => {
                      const active = (picked[title] ?? []).includes(option);
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => toggleOption(title, option)}
                          aria-pressed={active}
                          className={`rounded-full border px-2.5 py-1 text-[10.5px] font-medium transition-colors ${active
                            ? 'border-[#8C6F3E] bg-[#F9F4EB] text-[#8C6F3E] shadow-sm'
                            : 'border-dashed border-[#E2D7C7] bg-[#FCFAF7] text-[#766A62] hover:bg-[#F4EEE4]'}`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <div className="flex flex-col gap-3 rounded-xl border border-[#ECE2D3] bg-[#FCFAF7] px-4 py-3 sm:flex-row sm:items-center">
          <Info className="h-4 w-4 flex-shrink-0 text-[#8C6F3E]" strokeWidth={1.8} />
          <p className="min-w-0 flex-1 text-[11.5px] leading-relaxed text-[#766A62]">
            {chosen.length > 0
              ? <>Consultation selection: <strong className="text-[#2A211D]">{summary}</strong> — apply these and they pre-fill the intake form (Step 3); they are printed on the job card.</>
              : 'Tap the options the customer prefers, then apply them — they pre-fill the intake form (Step 3) and are printed on the job card for the tailor.'}
          </p>
          {onApply && (
            <button
              type="button"
              disabled={chosen.length === 0}
              onClick={() => onApply(summary)}
              className="flex-shrink-0 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#2A211D] px-3.5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#FAF7F2] shadow-sm transition-colors hover:bg-[#3D312B] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check className="h-3.5 w-3.5" /> Apply to next order
            </button>
          )}
        </div>
      </div>
    );
  }


  /** Tab 5 — the shop rate card as compact pricing cards (no long table). */
  function PricingGuidePanel({ rateCard, onStartOrder }: { rateCard?: RateCard | null; onStartOrder?: (design: CatalogDesign) => void }) {
    // The guide renders ONLY from the server Pricing Engine (Admin Rate Card).
    // When the shop has no pricing yet the guide is hidden — never fake values.
    const garments = (rateCard?.garment_types || []).filter((row) => Number(row.base_price) > 0);
    if (!rateCard || garments.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-[#E2D7C7] bg-[#FCFAF7] px-4 py-8 text-center">
          <Tag className="mx-auto mb-2 h-5 w-5 text-[#A3958B]" strokeWidth={1.7} />
          <p className="text-[13.5px] font-medium text-[#2A211D]">No pricing published yet</p>
          <p className="mx-auto mt-1 max-w-md text-[11.5px] leading-relaxed text-[#766A62]">
            The Pricing Guide follows the Admin Rate Card on the server. Ask the Admin to publish garment prices there and they appear here — the same source that quotes every job card.
          </p>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#ECD8A7] bg-[#FFF7E3] px-4 py-3">
          <Info className="h-4 w-4 flex-shrink-0 text-[#8A6618]" strokeWidth={1.8} />
          <p className="text-[11.5px] leading-relaxed text-[#8A6618]">
            Live from the server Pricing Engine — the same rate card that quotes every job card. Styles, customizations, rush fees and discounts are applied by the engine at intake.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {garments.map((row) => {
            const base = Number(row.base_price);
            const deposit = Math.round(base * (rateCard.deposit_percent || 0.5));
            return (
              <div key={row.garment_type} className="flex flex-col rounded-2xl border border-[#ECE2D3] bg-white p-4 transition-shadow hover:shadow-[0_16px_30px_-22px_rgba(42,33,29,0.35)]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="min-w-0 truncate text-[13.5px] font-semibold text-[#2A211D]">{row.garment_type}</p>
                    <p className="mt-0.5 text-[10.5px] uppercase tracking-[0.08em] text-[#A3958B]">{row.garment_category}</p>
                  </div>
                  <span className="flex-shrink-0 rounded-full bg-[#F9F4EB] px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[#8C6F3E]">
                    {productionTimeFor(row.garment_type).replace(' Business Days', ' BD')}
                  </span>
                </div>
                <p className="mt-2 text-[19px] leading-none text-[#2A211D]" style={{ fontFamily: "'Space Mono', monospace" }}>{peso(base)}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#F0EAE2] pt-3 text-[11.5px]">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.1em] text-[#A3958B]" style={{ fontFamily: "'Space Mono', monospace" }}>Deposit</p>
                    <p className="mt-0.5 font-medium text-[#8C6F3E]" style={{ fontFamily: "'Space Mono', monospace" }}>{peso(deposit)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.1em] text-[#A3958B]" style={{ fontFamily: "'Space Mono', monospace" }}>Balance</p>
                    <p className="mt-0.5 font-medium text-[#5E5048]" style={{ fontFamily: "'Space Mono', monospace" }}>{peso(base - deposit)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!onStartOrder}
                  onClick={() => onStartOrder?.(designForGarmentType(row.garment_type, `From ${formatPHP(base)}`))}
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#2A211D] px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#FAF7F2] shadow-sm transition-colors hover:bg-[#3D312B] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Scissors className="h-3.5 w-3.5" /> Start order
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }




  /* ------------------------------------------------- consultation drawer */

  /**
   * Right-side consultation panel. Opened when the Front Desk selects a design,
   * it keeps the customer conversation on one screen: what was chosen, what it
   * costs, what can be customised — then hands the design to the intake form.
   */
  function ConsultationDrawer({
    card,
    fabrics,
    onClose,
    onCustomize,
    onStartOrder,
  }: {
    card: CatalogCard;
    fabrics: CatalogData['fabrics'];
    onClose: () => void;
    onCustomize: (card: CatalogCard) => void;
    onStartOrder?: (design: CatalogDesign) => void;
  }) {
    const [entered, setEntered] = useState(false);

    useEffect(() => {
      const frame = requestAnimationFrame(() => setEntered(true));
      const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
      window.addEventListener('keydown', onKey);
      return () => { cancelAnimationFrame(frame); window.removeEventListener('keydown', onKey); };
    }, [onClose]);

    const fabricStatus = card.fabrics.map((label) => ({
      label,
      inStock: fabrics.some((fabric) => (
        label.toLowerCase().includes(fabric.fabricName.toLowerCase())
        || fabric.fabricName.toLowerCase().includes(label.toLowerCase())
      )),
    }));

    return (
      <div className="fixed inset-0 z-[65] flex justify-end">
        <div className="absolute inset-0 bg-[#1F1916]/45 backdrop-blur-sm" onClick={onClose} />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label={`${card.name} consultation`}
          className={`relative flex h-full w-full max-w-md flex-col border-l border-[#E8DFD3] bg-[#FFFCF8] shadow-2xl transition-transform duration-300 ease-out ${entered ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <header className="flex items-start justify-between gap-3 border-b border-[#ECE2D3] px-5 py-4">
            <div className="min-w-0">
              <Label>Selected design</Label>
              <h2 className="mt-1 text-xl leading-tight text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>{card.name}</h2>
              <p className="mt-0.5 text-[10.5px] uppercase tracking-[0.1em] text-[#A3958B]" style={{ fontFamily: "'Space Mono', monospace" }}>
                {groupForCategory(card.category)} · {card.garmentType}
              </p>
            </div>
            <button onClick={onClose} aria-label="Close consultation panel" className="flex-shrink-0 rounded-full p-1.5 text-[#A3958B] transition-colors hover:bg-[#F2ECE1] hover:text-[#2A211D]">
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
            <div className="overflow-hidden rounded-xl border border-[#E2D7C7] bg-[#F8F3EB]">
              {card.source === 'custom'
                ? <div className="flex h-40 items-center justify-center"><Sparkles className="h-9 w-9 text-[#8C6F3E]" strokeWidth={1.4} /></div>
                : <SmartImage src={card.image} alt={card.name} garmentType={card.garmentType} framing={card.imageFraming} className="h-40 w-full object-cover" />}
            </div>

            <div className="rounded-xl border border-[#E8DFD3] bg-white p-4">
              <div className="flex items-center justify-between">
                <Label>Price</Label>
                <span className="text-[17px] font-semibold text-[#2A211D]" style={{ fontFamily: "'Space Mono', monospace" }}>{peso(card.startingPrice)}</span>
              </div>
              <p className="mt-1 text-[10.5px] text-[#A3958B]">{card.priceLabel} · deposit typically {peso(Math.round(card.startingPrice * 0.5))}</p>
              <p className="mt-3 flex items-center gap-1.5 text-[11.5px] font-semibold text-[#8C6F3E]">
                <Clock className="h-3.5 w-3.5" strokeWidth={1.8} /> Estimated production time · {card.productionTime}
              </p>
            </div>


            <div>
              <Label className="mb-2 block">Styles</Label>
              <div className="flex flex-wrap gap-1.5">
                {card.styles.map((style) => (
                  <span key={style} className="rounded-full border border-[#E2D7C7] bg-white px-2.5 py-1 text-[10.5px] font-medium text-[#5E5048]">{style}</span>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Fabrics</Label>
              <ul className="space-y-1.5">
                {fabricStatus.length > 0
                  ? fabricStatus.map((entry) => (
                    <li key={entry.label} className="flex items-center justify-between gap-3 rounded-lg border border-[#ECE2D3] bg-white px-3 py-2 text-[11.5px]">
                      <span className="min-w-0 truncate text-[#5E5048]">{entry.label}</span>
                      <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] ${entry.inStock ? 'bg-[#EDF5F0] text-[#4E7357]' : 'bg-[#FFF7E3] text-[#8A6618]'}`}>
                        {entry.inStock ? 'In stock' : 'Suggest only'}
                      </span>
                    </li>
                  ))
                  : <li className="text-[11.5px] text-[#A3958B]">Fabric is chosen from live inventory during intake.</li>}
              </ul>
            </div>

            <div>
              <Label className="mb-2 block">Customization</Label>
              <div className="flex flex-wrap gap-1.5">
                {[CUSTOMIZATION_OPTIONS.collarStyles[0], CUSTOMIZATION_OPTIONS.sleeveStyles[0], ...CUSTOMIZATION_OPTIONS.embroideryOptions.slice(0, 3)].map((option) => (
                  <span key={option} className="rounded-full border border-dashed border-[#E2D7C7] bg-[#FCFAF7] px-2.5 py-1 text-[10.5px] text-[#766A62]">{option}</span>
                ))}
              </div>
              <p className="mt-2 text-[10.5px] leading-relaxed text-[#A3958B]">
                {CUSTOMIZATION_OPTIONS.collarStyles.length} collar, {CUSTOMIZATION_OPTIONS.sleeveStyles.length} sleeve and {CUSTOMIZATION_OPTIONS.embroideryOptions.length} embroidery options — set them on the intake form.
              </p>
            </div>

            {card.colors.length > 0 && (
              <div>
                <Label className="mb-2 block">Colour references</Label>
                <div className="flex flex-wrap items-center gap-2">
                  {card.colors.map((color, index) => (
                    <span key={`${color}-${index}`} title={color} className="h-5 w-5 rounded-full border border-[#E2D7C7] shadow-inner" style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <footer className="flex flex-col gap-2 border-t border-[#ECE2D3] bg-[#FCFAF7] px-5 py-4">
            <button
              type="button"
              disabled={!onStartOrder}
              onClick={() => onStartOrder?.(cardToDesign(card))}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2A211D] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#FAF7F2] shadow-md transition-colors hover:bg-[#3D312B] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Scissors className="h-3.5 w-3.5" /> Create Order
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onCustomize(card)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#C9A15C]/60 bg-white px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8C6F3E] transition-colors hover:bg-[#F9F4EB]"
              >
                <Palette className="h-3.5 w-3.5" /> Add Customizations
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-[#E2D7C7] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5E5048] transition-colors hover:bg-[#F2ECE1]"
              >
                Close
              </button>
            </div>
          </footer>
        </aside>
      </div>
    );
  }


  /* ==================================================================
    FRONT DESK — GARMENT CATALOG (consultation centre)
  ================================================================== */

  export function FrontDeskGarmentCatalogView({
    onStartOrder,
    onOpenIntake,
  }: {
    /** Hand a chosen design to the Garment Intake form. */
    onStartOrder?: (design: CatalogDesign) => void;
    /** Open an empty Garment Intake form (bespoke / manual intake). */
    onOpenIntake?: () => void;
  }) {
    const { cards, fabrics, rateCard, loading, error, usingSamples, reload } = useGarmentCatalogData();
    const [filters, setFilters] = useState<CatalogFilterState>({ query: '', category: 'All', style: 'All', group: 'All', fabric: 'All' });
    const [tab, setTab] = useState<CatalogTab>('Design Details');
    const [detail, setDetail] = useState<CatalogCard | null>(null);
    const [selected, setSelected] = useState<CatalogCard | null>(null);
    const gridRef = useRef<HTMLDivElement | null>(null);
    const tabsRef = useRef<HTMLDivElement | null>(null);

    const fabricNames = useMemo(() => fabrics.map((fabric) => fabric.fabricName), [fabrics]);
    const filtered = useMemo(() => filterCards(cards, filters, fabricNames), [cards, filters, fabricNames]);

    const fabricCounts = useMemo(() => {
      const counts: Record<string, number> = {};
      FABRIC_FAMILIES.forEach((family) => {
        counts[family] = fabrics.filter((fabric) => fabricFamilyOf(`${fabric.fabricName} ${fabric.tone}`) === family).length;
      });
      return counts;
    }, [fabrics]);

    const [customizationPicks, setCustomizationPicks] = useState('');
  const onHandOver = (design: CatalogDesign) => {
    if (!onStartOrder) return;
    onStartOrder({ ...design, consultationNotes: customizationPicks || undefined });
  };
    const focusGrid = () => gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const focusPanels = () => tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const stats = [
      { icon: <Shirt className="h-4 w-4" strokeWidth={1.6} />, value: `${cards.length}`, label: 'Garments', hint: 'Ready to show' },
      { icon: <Layers className="h-4 w-4" strokeWidth={1.6} />, value: `${UNIFORM_TYPES.length}`, label: 'Uniform types', hint: 'School & company' },
      { icon: <Palette className="h-4 w-4" strokeWidth={1.6} />, value: `${STYLE_DESIGNS.length}`, label: 'Style options', hint: 'Classic to bespoke' },
      { icon: <Scissors className="h-4 w-4" strokeWidth={1.6} />, value: `${fabrics.length}`, label: 'Fabrics available', hint: fabrics.length > 0 ? 'Live inventory' : 'Add stock in inventory' },
    ];

    return (
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        {/* PAGE HEADER -------------------------------------------------- */}
        <header className="dash-in dash-card relative overflow-hidden rounded-2xl px-6 py-6 sm:px-8 sm:py-7">
          <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#F9F4EB]" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <Label>Front desk · consultation</Label>
              <h1 className="mt-1.5 text-[32px] leading-tight text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>
                Garment Catalog
              </h1>
              <p className="mt-1 text-[13px] tracking-[0.02em] text-[#8C6F3E]">Tailoring Design Consultation Center</p>
              <p className="mt-2 max-w-2xl text-[12.5px] leading-relaxed text-[#766A62]">
                Browse garments, uniforms, fabrics and customization options with customers before creating an order.
              </p>
            </div>
            {onOpenIntake && (
              <button
                type="button"
                onClick={onOpenIntake}
                className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-xl bg-[#2A211D] px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#FAF7F2] shadow-lg transition-all hover:-translate-y-0.5 hover:bg-[#3D312B]"
              >
                <Scissors className="h-4 w-4" strokeWidth={1.8} /> New Tailoring Order
              </button>
            )}
          </div>
        </header>

        {/* KPI SUMMARY -------------------------------------------------- */}
        <div className="dash-in grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatTile key={stat.label} icon={stat.icon} value={stat.value} label={stat.label} hint={stat.hint} />
          ))}
        </div>

        {usingSamples && !error && (
          <div className="dash-in flex items-start gap-2 rounded-xl border border-[#ECD8A7] bg-[#FFF7E3] px-4 py-3 text-[12px] text-[#8A6618]">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>The shop catalog is empty, so sample garments are shown. Add real garments in Admin → Garment Catalog and they appear here instantly.</span>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-[#ECD8A7] bg-[#FFF7E3] px-4 py-3 text-[12px] text-[#8A6618]">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error} Showing the shop&rsquo;s sample garments so the counter keeps moving.</span>
            <button type="button" onClick={reload} className="ml-auto flex-shrink-0 font-semibold uppercase tracking-[0.1em] underline-offset-2 hover:underline">Retry</button>
          </div>
        )}

        {/* MAIN LAYOUT: SIDEBAR + CATALOG GRID -------------------------- */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[290px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <CatalogFilterSidebar
              filters={filters}
              onChange={setFilters}
              resultCount={filtered.length}
              fabricCounts={fabricCounts}
            />
          </aside>

          <div className="min-w-0 space-y-6">
            <div ref={gridRef} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Label>Design catalog</Label>
                  <h2 className="mt-0.5 text-[19px] text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>
                    {loading ? 'Loading garments…' : `${filtered.length} design${filtered.length === 1 ? '' : 's'} to show`}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={focusPanels}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2D7C7] bg-[#FCFAF7] px-3 py-2 text-[11px] font-medium text-[#766A62] transition-colors hover:bg-[#F2ECE1]"
                >
                  <ListFilter className="h-3.5 w-3.5 text-[#8C6F3E]" strokeWidth={1.7} /> Uniforms · fabrics · pricing
                </button>
              </div>

              {loading ? <CatalogSkeleton count={6} /> : (
                filtered.length === 0 ? (
                  <div className="dash-card rounded-2xl p-10 text-center">
                    <Shirt className="mx-auto mb-2 h-7 w-7 text-[#A3958B]" />
                    <p className="text-[15px] font-medium text-[#2A211D]">No garments match this search.</p>
                    <p className="mt-1 text-[12.5px] text-[#766A62]">Try another garment name, category, style or fabric — or start a Bespoke Brief for an unlisted design.</p>
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFilters({ query: '', category: 'All', style: 'All', group: 'All', fabric: 'All' })}
                        className="rounded-lg border border-[#E2D7C7] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5E5048] hover:bg-[#F2ECE1]"
                      >
                        Clear filters
                      </button>
                      <button
                        type="button"
                        onClick={() => onHandOver(cardToDesign(customCatalogCard()))}
                        className="rounded-lg border border-[#C9A15C]/60 bg-white px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8C6F3E] hover:bg-[#F9F4EB]"
                      >
                        Start Bespoke Brief
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {filtered.map((card) => (
                      <CatalogGarmentCard
                        key={card.key}
                        card={card}
                        onView={setDetail}
                        onSelect={setSelected}
                        selectLabel="Select Design"
                      />
                    ))}
                  </div>
                )
              )}
            </div>

            {/* REFERENCE TABS — uniform types, fabrics, customization, pricing */}
            <section ref={tabsRef} className="dash-card overflow-hidden rounded-2xl">
              <div className="relative flex gap-1 overflow-x-auto border-b border-[#ECE2D3] px-3 pt-1 sm:px-4">
                {CATALOG_TABS.map((name) => {
                  const active = tab === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setTab(name)}
                      aria-pressed={active}
                      aria-selected={active}
                      role="tab"
                      className={`relative flex-shrink-0 whitespace-nowrap px-3.5 py-3.5 text-[11.5px] font-semibold transition-colors duration-200 sm:px-4 ${
                        active ? 'text-[#2A211D]' : 'text-[#8C7E74] hover:text-[#2A211D]'
                      }`}
                    >
                      {name}
                      <span
                        aria-hidden="true"
                        className={`absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[#8C6F3E] transition-all duration-300 ease-out ${active ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'}`}
                      />
                    </button>
                  );
                })}
              </div>

              <div className="px-5 py-6 sm:px-6">
                <div key={tab} className="animate-[tabIn_0.28s_ease-out]">
                {tab === 'Design Details' && (
                  <DesignDetailsPanel
                    card={selected ?? detail}
                    fabrics={fabrics}
                    onStartOrder={onStartOrder ? onHandOver : undefined}
                    onBrowse={focusGrid}
                  />
                )}
                {tab === 'Uniform Types' && <UniformTypesPanel rateCard={rateCard} onStartOrder={onStartOrder ? onHandOver : undefined} />}
                {tab === 'Fabrics' && <FabricsPanel fabrics={fabrics} />}
                {tab === 'Customization' && <CustomizationPanel onApply={(summary) => setCustomizationPicks(summary)} />}
                {tab === 'Pricing Guide' && <PricingGuidePanel rateCard={rateCard} onStartOrder={onStartOrder ? onHandOver : undefined} />}
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* FULL DESIGN REFERENCE --------------------------------------- */}
        {detail && (
          <GarmentDetailsModal
            card={detail}
            fabricInventory={fabrics}
            onClose={() => setDetail(null)}
            onStartOrder={onStartOrder ? (design) => { onHandOver(design); setDetail(null); } : undefined}
          />
        )}

        {/* CONSULTATION DRAWER ----------------------------------------- */}
        {selected && (
          <ConsultationDrawer
            card={selected}
            fabrics={fabrics}
            onClose={() => setSelected(null)}
            onCustomize={(card) => { setDetail(card); setSelected(null); setTab('Customization'); focusPanels(); }}
            onStartOrder={onStartOrder ? (design) => { onHandOver(design); setSelected(null); } : undefined}
          />
        )}
      </div>
    );
  }

  export default FrontDeskGarmentCatalogView;

