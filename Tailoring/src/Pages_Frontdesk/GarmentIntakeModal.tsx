// Pages_Frontdesk/GarmentIntakeModal.tsx
//
// FRONT DESK — GARMENT INTAKE (New Custom Order)
//
// The walk-in counter workflow, simplified to five real tailoring steps:
//
//   1. Customer                     — who is ordering, their profile + balance
//   2. Garment Selection            — what they chose (from the Garment Catalog)
//   3. Customization & Measurements — collar / sleeve / embroidery + body sizes
//   4. Production & Pricing         — tailor, deadline, fabric, price breakdown
//   5. Deposit & Confirmation       — deposit, balance, receipt, job card
//
// Catalog browsing lives on the standalone Garment Catalog page (and its picker
// modal) — this form only ever receives a chosen design, so intake never turns
// into an online-shopping flow.
import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Banknote,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Layers,
  Loader2,
  Package,
  Palette,
  Printer,
  Ruler,
  Save,
  Scissors,
  Search,
  Shirt,
  User,
  X,
} from 'lucide-react';
import frontDeskApi, { type CatalogItem, type Customer, type Order, type OrderCustomizations, type PriceCalculation, type QuoteBreakdown } from '../../services/frontDeskApi';
import { formatPHPSmart } from '../utils/currency';
import { printIntakeReceipt } from '../utils/printReceipt';
import { GarmentIllustration } from './GarmentIllustration';
import { GarmentCatalogPicker } from './GarmentCatalogdesk';
import {
  CUSTOMIZATION_OPTIONS,
  GARMENTS_BY_CATEGORY,
  GARMENT_TYPES,
  ORDER_CATEGORIES,
  PRIORITY_LEVELS,
  STYLE_DESIGNS,
  catalogCategoryForGarmentType,
  classificationForCatalogItem,
  stylesForCategory,
  type CatalogDesign,
  type PriorityLevel,
} from './garmentCatalogData';

/* ------------------------------------------------------------------ types */

export interface IntakeMeasurementValues {
  Chest: string;
  Waist: string;
  Hips: string;
  Shoulder: string;
  Sleeve: string;
  Inseam: string;
  Height: string;
}

/** Everything the intake form hands to the dashboard's create handler. */
export interface GarmentIntakeData {
  customerId: string;
  orderCategory: string;
  garmentType: string;
  styleDesign: string;
  fabric: string;
  fabricQuantity: string;
  quantity: number;
  specialInstructions: string;
  targetCompletionDate: string;
  assignedTailorId: string;
  depositAmount: string;
  collectDeposit: boolean;
  depositPaymentMethod: 'Cash' | 'Card' | 'Bank Transfer' | 'GCash' | 'Other';
  depositReferenceNumber: string;
  /** Which intake flow produced this order: a catalog template or a bespoke brief. */
  orderType: 'catalog' | 'bespoke';
  /** The catalog item the order started from (catalog orders only). */
  catalogItemId: number | null;
  priority: PriorityLevel;
  collarStyle: string;
  sleeveStyle: string;
  embroidery: string;
  /** Structured customization fields stored as real database columns. */
  lining: string;
  pocketStyle: string;
  buttons: string;
  monogram: string;
  rushOrder: boolean;
  /** Optional reference material uploaded in the bespoke brief (data URLs). */
  referenceImages: string[];
  color: string;
  customizationNotes: string;
  /** Extra work agreed with the customer (recorded on the job card). */
  additionalCharges: string;
  /** Counter goodwill / promo discount agreed with the customer. */
  discount: string;
  /** Save the typed measurements onto the customer's profile. */
  saveMeasurements: boolean;
  measurements: IntakeMeasurementValues;
  /** True when the counter is reusing the profile measurements. */
  useExistingMeasurements: boolean;
}

export type IntakeMode = 'draft' | 'confirm';

/** What the dashboard reports back after the job card is written. */
export interface IntakeCreationResult {
  jobCardId: string;
  totalAmount: number;
  depositPaid: number;
  remainingBalance: number;
  receiptReference: string;
}


// The two real intake flows. A Catalog Order starts from a catalog template;
// a Bespoke Order starts from a consultation brief with no catalog design,
// template or image requirement. Pricing and deposit steps are shared.
const INTAKE_STEPS = {
  catalog: [
    { label: 'Customer', hint: 'Who is ordering' },
    { label: 'Choose Catalog Design', hint: 'A template from the catalog' },
    { label: 'Style · Fabric · Customize', hint: 'Allowed styles & real stock' },
    { label: 'Generate Quote', hint: 'Tailor, deadline, engine price' },
    { label: 'Deposit & Confirm', hint: 'Deposit, balance, job card' },
  ],
  bespoke: [
    { label: 'Customer', hint: 'Who is ordering' },
    { label: 'Start Bespoke Brief', hint: 'No catalog design required' },
    { label: 'Measurements · Requirements', hint: 'Body, fabric, preferences' },
    { label: 'Generate Quote', hint: 'Tailor, deadline, engine price' },
    { label: 'Deposit & Confirm', hint: 'Deposit, balance, job card' },
  ],
} as const;

const EMPTY_MEASUREMENTS: IntakeMeasurementValues = {
  Chest: '', Waist: '', Hips: '', Shoulder: '', Sleeve: '', Inseam: '', Height: '',
};

const MEASUREMENT_FIELDS: { key: keyof IntakeMeasurementValues; label: string; placeholder: string; aliases: string[] }[] = [
  { key: 'Chest', label: 'Chest', placeholder: '40', aliases: ['chest', 'bust'] },
  { key: 'Waist', label: 'Waist', placeholder: '32', aliases: ['waist'] },
  { key: 'Hips', label: 'Hips', placeholder: '38', aliases: ['hip', 'hips'] },
  { key: 'Shoulder', label: 'Shoulder', placeholder: '18', aliases: ['shoulder'] },
  { key: 'Sleeve', label: 'Sleeve length', placeholder: '24', aliases: ['sleeve', 'sleeve length'] },
  { key: 'Inseam', label: 'Inseam', placeholder: '30', aliases: ['inseam'] },
  { key: 'Height', label: 'Height', placeholder: "5'8\"", aliases: ['height'] },
];


/* ------------------------------------------------------------------ atoms */

function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`text-[10px] uppercase tracking-[0.2em] text-[#8C7E74] ${className}`} style={{ fontFamily: "'Space Mono', monospace" }}>
      {children}
    </span>
  );
}

const INPUT = 'w-full rounded-lg border border-[#E2D7C7] bg-white px-3 py-2.5 text-[13.5px] text-[#2A211D] outline-none transition-colors placeholder-[#C2B5A8] focus:border-[#A46B48] disabled:bg-[#F7F2EA] disabled:text-[#A3958B]';

const peso = (amount: number) => formatPHPSmart(amount);

/** A titled card used for every group of fields in the intake form. */
function SectionCard({
  icon,
  title,
  hint,
  children,
  aside,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#ECE2D3] bg-white p-4 shadow-[0_1px_1px_rgba(42,33,29,0.03)] sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#F9F4EB] text-[#8C6F3E]">{icon}</span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>{title}</h3>
          {hint && <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#766A62]">{hint}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Label + control wrapper with an optional hint line. */
function Field({ label, hint, children, className = '' }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
      {hint && <span className="mt-1 block text-[10.5px] leading-relaxed text-[#A3958B]">{hint}</span>}
    </label>
  );
}

/** Read-only price line used by every breakdown in the form. */
function PriceRow({ label, value, tone = 'default', strong = false }: { label: string; value: string; tone?: 'default' | 'good' | 'warn' | 'accent'; strong?: boolean }) {
  const toneClass = tone === 'good' ? 'text-[#4E7357]' : tone === 'warn' ? 'text-[#9E5B4B]' : tone === 'accent' ? 'text-[#8C6F3E]' : 'text-[#2A211D]';
  return (
    <div className={`flex items-center justify-between gap-3 ${strong ? 'border-t border-dashed border-[#E2D7C7] pt-2 text-[14px] font-semibold' : 'text-[12.5px]'}`}>
      <span className={strong ? 'text-[#2A211D]' : 'text-[#766A62]'}>{label}</span>
      <span className={`${toneClass} ${strong ? 'text-[15px]' : ''}`} style={{ fontFamily: "'Space Mono', monospace" }}>{value}</span>
    </div>
  );
}

/* ==================================================================
   GARMENT INTAKE FORM
================================================================== */

export function GarmentIntakeModal({
  onClose,
  onCreate,
  customers,
  orders,
  initial = null,
  onOpenCatalogPage,
}: {
  onClose: () => void;
  /** Writes the job card (mode 'draft' skips the deposit, 'confirm' collects it). */
  onCreate: (data: GarmentIntakeData, mode: IntakeMode) => Promise<IntakeCreationResult>;
  customers: Customer[];
  orders: Order[];
  /** Design already chosen on the Garment Catalog page (null = manual intake). */
  initial?: CatalogDesign | null;
  /** Leave the form and open the full Garment Catalog page. */
  onOpenCatalogPage?: () => void;
}) {
  const [step, setStep] = useState(1);
  const [design, setDesign] = useState<CatalogDesign | null>(initial);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState('');
  const [savingMode, setSavingMode] = useState<IntakeMode | null>(null);
  const [created, setCreated] = useState<IntakeCreationResult | null>(null);
  const [fabricOptions, setFabricOptions] = useState<{ id: number; fabricName: string; tone: string; unit: string; stockQuantity?: number }[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [tailorOptions, setTailorOptions] = useState<{ id: number; full_name: string; position: string }[]>([]);
  const [existingMeasurements, setExistingMeasurements] = useState<Record<string, string>>({});
  const [loadingMeasurements, setLoadingMeasurements] = useState(false);
  const [priceCalculation, setPriceCalculation] = useState<PriceCalculation | null>(null);
  const [quoteBreakdown, setQuoteBreakdown] = useState<QuoteBreakdown | null>(null);
  const [quoteError, setQuoteError] = useState('');
  const [calculating, setCalculating] = useState(false);
  const [uploadingReferences, setUploadingReferences] = useState(false);

  const [form, setForm] = useState<GarmentIntakeData>(() => ({
    customerId: '',
    orderCategory: initial?.orderCategory || '',
    garmentType: initial?.garmentType || GARMENT_TYPES[0],
    styleDesign: initial?.styleDesign || '',
    fabric: '',
    fabricQuantity: '',
    quantity: 1,
    specialInstructions: '',
    targetCompletionDate: '',
    assignedTailorId: '',
    depositAmount: '',
    collectDeposit: true,
    depositPaymentMethod: 'Cash',
    depositReferenceNumber: '',
    orderType: initial && initial.source === 'catalog' ? 'catalog' : 'bespoke',
    catalogItemId: initial?.catalogItemId ?? null,
    priority: 'Normal',
    collarStyle: '',
    sleeveStyle: '',
    embroidery: 'None',
    lining: '',
    pocketStyle: '',
    buttons: '',
    monogram: '',
    rushOrder: false,
    referenceImages: [],
    color: '',
    customizationNotes: initial?.consultationNotes || '',
    additionalCharges: '',
    discount: '',
    saveMeasurements: true,
    measurements: { ...EMPTY_MEASUREMENTS },
    useExistingMeasurements: true,
  }));

  const update = (patch: Partial<GarmentIntakeData>) => setForm((current) => ({ ...current, ...patch }));
  const updateMeasurement = (key: keyof IntakeMeasurementValues, value: string) =>
    setForm((current) => ({ ...current, measurements: { ...current.measurements, [key]: value } }));

  // Escape closes the form (keyboard accessibility) — the picker handles its own.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !pickerOpen) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, pickerOpen]);

  const selectedCustomer = customers.find((c) => c.customer_id === form.customerId);

  // Business rule: unsettled earlier job cards are flagged before a new order.
  const unpaidOrders = useMemo(
    () => orders.filter((o) => String(o.customer_id) === String(form.customerId) && Number(o.remaining_balance) > 0),
    [orders, form.customerId],
  );
  const unsettledTotal = unpaidOrders.reduce((sum, o) => sum + Number(o.remaining_balance), 0);

  // Live fabric + tailor + garment lists (shared with the rest of the shop).
  // Garment types and styles come straight from the admin-managed garment
  // catalog records, so only garments the shop actually offers can be ordered.
  useEffect(() => {
    frontDeskApi.getFabricCatalog()
      .then((data) => setFabricOptions(data.fabrics || []))
      .catch(() => setFabricOptions([]));
    frontDeskApi.getGarmentCatalog()
      .then((items) => setCatalogItems(items || []))
      .catch(() => setCatalogItems([]));
    frontDeskApi.getTailors()
      .then((tailors) => setTailorOptions(tailors.map((t) => ({ id: t.id, full_name: t.full_name, position: t.position || '' }))))
      .catch(() => setTailorOptions([]));
  }, []);

  // The customer's saved measurement profile, loaded whenever the customer changes.
  useEffect(() => {
    if (!form.customerId) {
      setExistingMeasurements({});
      return;
    }
    let cancelled = false;
    setLoadingMeasurements(true);
    frontDeskApi.getCustomerMeasurements(form.customerId)
      .then((rows) => {
        if (cancelled) return;
        const map: Record<string, string> = {};
        (rows as unknown as { label?: string; value?: string }[]).forEach((row) => {
          const field = MEASUREMENT_FIELDS.find((f) => (row.label || '').toLowerCase() === f.key.toLowerCase()
            || f.aliases.includes((row.label || '').toLowerCase()));
          if (field && row.value !== null && row.value !== undefined && row.value !== '') map[field.key] = String(row.value);
        });
        setExistingMeasurements(map);
        // Reuse the profile by default — the counter only types new numbers when
        // the customer asks for a fresh measuring.
        setForm((current) => ({
          ...current,
          useExistingMeasurements: Object.keys(map).length > 0,
          measurements: { ...EMPTY_MEASUREMENTS, ...map },
        }));
      })
      .catch(() => { if (!cancelled) setExistingMeasurements({}); })
      .finally(() => { if (!cancelled) setLoadingMeasurements(false); });
    return () => { cancelled = true; };
  }, [form.customerId]);

  /* ----------------------------------------------------------- pricing */

  // THE quote — always computed by the server Pricing Engine. There is no
  // client-side fallback price: if the engine has no rule for this garment,
  // the counter sees an explicit error instead of an invented number.
  const calculatePrice = async () => {
    if (!form.garmentType) return;
    setCalculating(true);
    setQuoteError('');
    try {
      const customizations: OrderCustomizations = {
        collar_type: form.collarStyle || undefined,
        sleeve_type: form.sleeveStyle || undefined,
        embroidery: form.embroidery && form.embroidery !== 'None' ? form.embroidery : undefined,
        lining: form.lining || undefined,
        pocket_style: form.pocketStyle || undefined,
        buttons: form.buttons || undefined,
        monogram: form.monogram || undefined,
        rush_order: form.rushOrder || undefined,
      };
      const result = await frontDeskApi.calculatePrice({
        garmentType: form.garmentType,
        styleDesign: form.styleDesign || undefined,
        customizations,
        fabric: form.fabric || undefined,
        quantity: form.quantity || 1,
        priority: form.priority,
        additionalCharges: parseFloat(form.additionalCharges) || 0,
        discount: parseFloat(form.discount) || 0,
      });
      setPriceCalculation(result);
      setQuoteBreakdown(result.breakdown || null);
    } catch (err) {
      // No fallback prices. The counter must resolve the missing rate card
      // with the Admin before the job card can be quoted.
      setPriceCalculation(null);
      setQuoteBreakdown(null);
      setQuoteError(err instanceof Error ? err.message : 'The pricing engine returned no quote for this garment.');
    } finally {
      setCalculating(false);
    }
  };

  useEffect(() => {
    calculatePrice();
    // The engine quote follows every pricing-relevant input so the step-4
    // breakdown is always exactly what the job card will store.
  }, [form.garmentType, form.quantity, form.styleDesign, form.fabric, form.priority, form.collarStyle, form.sleeveStyle, form.embroidery, form.lining, form.pocketStyle, form.buttons, form.monogram, form.rushOrder, form.additionalCharges, form.discount]); /* eslint-disable-line react-hooks/exhaustive-deps */ /* eslint-disable-line react-hooks/exhaustive-deps */

  const pricingUnavailable = !priceCalculation && !calculating && Boolean(form.garmentType);
  const rateCardTotal = priceCalculation?.totalAmount ?? 0;
  const additionalCharges = parseFloat(form.additionalCharges) || 0;
  const discount = parseFloat(form.discount) || 0;
  const totalAmount = Math.max(0, rateCardTotal);
  const suggestedDeposit = Math.round(totalAmount * 0.5);
  const depositPaid = form.collectDeposit ? (parseFloat(form.depositAmount) || suggestedDeposit) : 0;
  const balanceDue = Math.max(0, totalAmount - depositPaid);
  // Base price: the catalog item's stored base_price, else the engine rule's.
  const basePrice = design?.basePrice ?? priceCalculation?.breakdown?.base_price ?? 0;

  /* ------------------------------------- live-inventory selection lists */

  // Garment choices come straight from the live garment-catalog records
  // (falls back to the shop taxonomy when the catalog is empty/offline).
  // Garment choices come straight from the live garment-catalog records;
  // classification is read from each item's explicit fields — never guessed
  // from its name. Without catalog rows the static taxonomy is the chooser.
  const availableGarments = useMemo(() => {
    if (catalogItems.length === 0) return GARMENTS_BY_CATEGORY[form.orderCategory] || GARMENT_TYPES;
    const inCategory = new Set(
      catalogItems
        .map((item) => classificationForCatalogItem(item))
        .filter((g) => !form.orderCategory || g.orderCategory === form.orderCategory)
        .map((g) => g.garmentType),
    );
    const list = Array.from(inCategory).filter(Boolean);
    // Always keep the currently selected type selectable so a catalog pick
    // (or an older draft) never gets clobbered by the filter.
    if (form.garmentType && !list.includes(form.garmentType)) list.unshift(form.garmentType);
    return list.length > 0 ? list : GARMENT_TYPES;
  }, [catalogItems, form.orderCategory, form.garmentType]);

  // Styles follow the selected garment's catalog record (falls back to the
  // shop's style library when the garment is not a catalog entry).
  // Styles follow the selected garment's catalog record: allowed_styles first,
  // then the category style library. No name matching.
  const availableStyles = useMemo(() => {
    if (catalogItems.length === 0) return STYLE_DESIGNS;
    const record = catalogItems.find((item) => (item.garment_type || '').trim() === form.garmentType.trim());
    if (record) {
      const styles = (record.allowed_styles || []).length > 0
        ? [...record.allowed_styles]
        : stylesForCategory(catalogCategoryForGarmentType((record.garment_type || '').trim() || record.name));
      if (form.styleDesign && !styles.includes(form.styleDesign)) styles.unshift(form.styleDesign);
      return styles;
    }
    return STYLE_DESIGNS;
  }, [catalogItems, form.garmentType, form.styleDesign]);

  // Only fabrics actually on the shelf can be ordered. A fabric already on the
  // form (e.g. re-opening a draft) stays selectable so it is never clobbered.
  // A missing stock figure (server not yet reporting it) is treated as
  // available — inventory rows are never hidden for want of a number.
  const inStockFabrics = useMemo(() => {
    const isUnknownStock = (fabric: { stockQuantity?: number }) =>
      fabric.stockQuantity === undefined || fabric.stockQuantity === null;
    const stocked = fabricOptions.filter((fabric) => isUnknownStock(fabric) || Number(fabric.stockQuantity) > 0);
    if (form.fabric && !stocked.some((fabric) => fabric.fabricName === form.fabric)) {
      const held = fabricOptions.find((fabric) => fabric.fabricName === form.fabric);
      if (held) return [held, ...stocked];
    }
    return stocked;
  }, [fabricOptions, form.fabric]);

  /* ------------------------------------------------- guided step rules */

  const stepProblem = useMemo((): string => {
    if (step === 1 && !form.customerId) return 'Select the customer to continue.';
    if (step === 2) {
      if (form.orderType === 'catalog' && !design) return 'Choose a catalog design to continue — or switch to a Bespoke Brief.';
      if (!form.garmentType) return 'Choose the garment type to continue.';
      if (!form.styleDesign) return 'Choose the style to continue.';
      if (!form.fabric) return 'Choose the fabric from live inventory to continue.';
    }
    if (step === 3 && !form.useExistingMeasurements && Object.values(form.measurements).every((value) => !value.trim())) {
      return 'Enter at least one measurement, or switch back to the saved profile.';
    }
    if (step === 4 && !form.targetCompletionDate) return 'Set the estimated completion date to continue.';
    if (step === 4 && pricingUnavailable) return 'No pricing rule exists for this garment type — ask the Admin to add it to the rate card before confirming.';
    return '';
  }, [step, design, form.orderType, form.customerId, form.garmentType, form.styleDesign, form.fabric, form.useExistingMeasurements, form.measurements, form.targetCompletionDate, pricingUnavailable]);

  const goNext = () => { if (!stepProblem) setStep((s) => Math.min(steps.length, s + 1)); };
  const goBack = () => setStep((s) => Math.max(1, s - 1));

  /* -------------------------------------------- catalog → intake handoff */

  const applyDesign = (picked: CatalogDesign) => {
    setPickerOpen(false);
    setDesign(picked);
    // A pick carrying consultation notes means the Customization tab was used —
    // open directly at Step 3 so the pre-filled options are visible.
    if (picked.consultationNotes) setStep(3);
    setForm((current) => ({
      ...current,
      orderType: picked.source === 'catalog' ? 'catalog' : current.orderType,
      catalogItemId: picked.catalogItemId ?? (picked.source === 'catalog' ? null : null),
      garmentType: picked.garmentType || current.garmentType,
      orderCategory: picked.orderCategory || current.orderCategory,
      styleDesign: picked.styleDesign || current.styleDesign || picked.allowedStyles?.[0] || '',
      // Auto-fill the fabric only when a catalog suggestion really exists on
      // the shelf — otherwise the counter picks the real stock piece.
      fabric: current.fabric || (() => {
        const usable = (picked.suggestedFabrics || []).find((label) => fabricOptions.some(
          (f) => label.toLowerCase().includes(f.fabricName.toLowerCase()) || f.fabricName.toLowerCase().includes(label.toLowerCase()),
        ));
        const inventoryMatch = usable
          ? fabricOptions.find((f) => usable.toLowerCase().includes(f.fabricName.toLowerCase()) || f.fabricName.toLowerCase().includes(usable.toLowerCase()))
          : undefined;
        return inventoryMatch?.fabricName || '';
      })(),
      // Ticked at the catalog's Customization tab — carried over so the
      // counter never retypes the agreed options.
      customizationNotes: picked.consultationNotes || current.customizationNotes,
    }));
  };

  /* --------------------------------------------------------- submission */

  // Free-text notes only. Collar, sleeve, embroidery, lining, pocket style,
  // buttons, monogram and rush flag travel to the job card as STRUCTURED
  // database columns (customizations), never buried in notes.
  const buildNotes = () => [
    form.priority !== 'Normal' ? `Priority: ${form.priority}` : '',
    form.color ? `Preferred colour: ${form.color}` : '',
    additionalCharges > 0 ? `Additional charges: ${peso(additionalCharges)}` : '',
    discount > 0 ? `Discount: ${peso(discount)}` : '',
    form.customizationNotes,
    form.specialInstructions,
  ].filter(Boolean).join(' · ');

  const submit = async (mode: IntakeMode, thenPrint = false) => {
    if (stepProblem) { setError(stepProblem); return; }
    if (!form.customerId) { setError('Select the customer before saving the order.'); return; }
    setSavingMode(mode);
    setError('');
    try {
      if (pricingUnavailable && step >= 4) {
        setError('No pricing rule exists for this garment type — the job card cannot be quoted. Ask the Admin to add it to the rate card.');
        setSavingMode(null);
        return;
      }
      const result = created ?? await onCreate({
        ...form,
        specialInstructions: buildNotes(),
        collectDeposit: mode === 'confirm' && form.collectDeposit,
      }, mode);
      setCreated(result);
      if (thenPrint) {
        printIntakeReceipt({
          jobCardId: result.jobCardId,
          customerName: selectedCustomer?.full_name || 'Walk-in customer',
          customerContact: selectedCustomer?.contact_number,
          garmentType: form.garmentType,
          orderCategory: form.orderCategory,
          styleDesign: form.styleDesign,
          fabric: form.fabric,
          quantity: form.quantity,
          totalAmount: result.totalAmount || totalAmount,
          depositPaid: result.depositPaid,
          remainingBalance: result.remainingBalance,
          paymentMethod: form.collectDeposit ? form.depositPaymentMethod : undefined,
          referenceNumber: form.depositReferenceNumber || result.receiptReference,
          targetCompletionDate: form.targetCompletionDate,
          assignedTailor: tailorOptions.find((t) => String(t.id) === form.assignedTailorId)?.full_name,
          notes: [form.customizationNotes, form.specialInstructions].filter(Boolean).join(' · '),
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create the order.');
    } finally {
      setSavingMode(null);
    }
  };

  /* -------------------------------------------------------------- shell */

  // The five steps shown in the header follow the active intake flow.
  const steps = form.orderType === 'catalog' ? INTAKE_STEPS.catalog : INTAKE_STEPS.bespoke;
  const progress = Math.round((step / steps.length) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-[#1F1916]/45 backdrop-blur-sm" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="New custom order — garment intake"
        className="relative flex h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-2xl border border-[#E8DFD3] bg-[#FAF7F2] shadow-2xl sm:h-auto sm:max-h-[94vh] sm:rounded-2xl"
      >
        {/* HEADER ------------------------------------------------------- */}
        <header className="flex-shrink-0 border-b border-[#ECE2D3] bg-[#FFFCF8] px-5 pb-4 pt-5 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Label>New custom order</Label>
              <h2 className="mt-1 text-2xl leading-tight text-[#2A211D] sm:text-3xl" style={{ fontFamily: "'DM Serif Display', serif" }}>
                Garment Intake
              </h2>
              <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-[#766A62]">
                The walk-in job card: customer, chosen garment, customization and measurements, production, then the deposit.
              </p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              {onOpenCatalogPage && (
                <button
                  type="button"
                  onClick={() => { onClose(); onOpenCatalogPage(); }}
                  className="hidden items-center gap-1.5 rounded-lg border border-[#E2D7C7] bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5E5048] transition-colors hover:bg-[#F2ECE1] lg:inline-flex"
                >
                  <Shirt className="h-3.5 w-3.5" /> Full catalog
                </button>
              )}
              <button onClick={onClose} aria-label="Close garment intake" className="rounded-full p-1.5 text-[#A3958B] transition-colors hover:bg-[#F2ECE1] hover:text-[#2A211D]">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* STEP INDICATOR ------------------------------------------- */}
          <div className="mt-4">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EFE7DC]">
              <div className="h-full rounded-full bg-[#8C6F3E] transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <ol className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" role="group" aria-label="Intake steps">
              {steps.map((item, index) => {
                const number = index + 1;
                const isActive = number === step;
                const isDone = number < step;
                return (
                  <li key={item.label}>
                    <button
                      type="button"
                      onClick={() => { if (number < step) setStep(number); }}
                      disabled={number > step}
                      aria-current={isActive ? 'step' : undefined}
                      className={`flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                        isActive
                          ? 'border-[#8C6F3E] bg-[#F9F4EB] shadow-sm'
                          : isDone
                            ? 'border-[#C7DDD3] bg-[#F1F5F0] hover:bg-[#E7F1EA]'
                            : 'border-[#E8DFD3] bg-white disabled:cursor-not-allowed'
                      }`}
                    >
                      <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        isActive ? 'bg-[#2A211D] text-[#FAF7F2]' : isDone ? 'bg-[#4E7357] text-white' : 'border border-[#E2D7C7] text-[#A3958B]'
                      }`}>
                        {isDone ? <Check className="h-3 w-3" /> : number}
                      </span>
                      <span className="min-w-0">
                        <span className={`block text-[11.5px] font-semibold leading-snug ${isActive ? 'text-[#2A211D]' : isDone ? 'text-[#4E7357]' : 'text-[#A3958B]'}`}>
                          {item.label}
                        </span>
                        <span className="mt-0.5 hidden text-[10px] leading-snug text-[#A3958B] sm:block">{item.hint}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </header>

        {/* BODY --------------------------------------------------------- */}
        <form
          onSubmit={(event) => { event.preventDefault(); if (step === steps.length) submit('confirm'); else goNext(); }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8">
            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-[#C86A58]/30 bg-[#FDF4F2] px-4 py-3 text-[12.5px] text-[#9A3B2A]" role="alert">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* STEP 1 — CUSTOMER ---------------------------------------- */}
            {step === 1 && (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.15fr_1fr]">
                <SectionCard icon={<User className="h-4 w-4" strokeWidth={1.7} />} title="Customer" hint="Pick the walk-in customer. Their saved measurements and balance load automatically.">
                  <div className="space-y-4">
                    <Field label="Customer">
                      <select
                        value={form.customerId}
                        onChange={(event) => update({ customerId: event.target.value })}
                        className={INPUT}
                      >
                        <option value="">Select a customer</option>
                        {customers.map((customer) => (
                          <option key={customer.customer_id} value={customer.customer_id}>
                            {customer.full_name} ({customer.customer_id})
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Contact number">
                      <input readOnly value={selectedCustomer?.contact_number || ''} placeholder="Shown once a customer is selected" className={INPUT} />
                    </Field>

                    {selectedCustomer && (
                      <div className="rounded-lg border border-[#ECE2D3] bg-[#FCFAF7] px-3.5 py-3 text-[11.5px] leading-relaxed text-[#766A62]">
                        <strong className="text-[#2A211D]">{selectedCustomer.full_name}</strong> · {selectedCustomer.customer_id}
                        <br />{selectedCustomer.email} · {selectedCustomer.contact_number}
                        <br />Status: {selectedCustomer.status}
                      </div>
                    )}
                  </div>
                </SectionCard>

                <div className="space-y-5">
                  <SectionCard
                    icon={<Ruler className="h-4 w-4" strokeWidth={1.7} />}
                    title="Existing measurements"
                    hint="Saved on the customer's profile — reused unless the customer wants a fresh measuring."
                    aside={loadingMeasurements ? <Loader2 className="h-4 w-4 animate-spin text-[#8C6F3E]" /> : undefined}
                  >
                    {!form.customerId ? (
                      <p className="text-[12px] text-[#A3958B]">Select a customer to load their measurement profile.</p>
                    ) : Object.keys(existingMeasurements).length === 0 ? (
                      <div className="rounded-lg border border-dashed border-[#E2D7C7] bg-[#FCFAF7] px-3.5 py-3 text-[12px] text-[#766A62]">
                        No measurements on file yet — enter them in Step 3 and they are saved to the profile.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {MEASUREMENT_FIELDS.filter((field) => existingMeasurements[field.key]).map((field) => (
                          <div key={field.key} className="rounded-lg border border-[#ECE2D3] bg-[#FCFAF7] px-3 py-2">
                            <Label>{field.label}</Label>
                            <div className="text-[13.5px] text-[#2A211D]" style={{ fontFamily: "'Space Mono', monospace" }}>{existingMeasurements[field.key]}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </SectionCard>

                  {unpaidOrders.length > 0 && (
                    <div className="rounded-xl border border-[#ECD8A7] bg-[#FFF7E3] p-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#8A6618]" />
                        <div className="min-w-0">
                          <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[#8A6618]">Outstanding balance warning</p>
                          <ul className="mt-2 space-y-1">
                            {unpaidOrders.map((order) => (
                              <li key={order.order_id} className="flex items-center justify-between gap-3 text-[12px] text-[#8A6618]">
                                <span className="truncate">{order.job_card_id} · {order.garment_type}</span>
                                <span className="flex-shrink-0 font-semibold" style={{ fontFamily: "'Space Mono', monospace" }}>{peso(Number(order.remaining_balance))}</span>
                              </li>
                            ))}
                          </ul>
                          <p className="mt-2 text-[11px] leading-relaxed text-[#8A6618]">
                            Total outstanding <strong>{peso(unsettledTotal)}</strong>. A new walk-in order is still allowed — collect the earlier balance from the Payments desk.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2 — GARMENT SELECTION -------------------------------- */}
            {step === 2 && (
              <div className="space-y-5">
                <SectionCard
                  icon={<Shirt className="h-4 w-4" strokeWidth={1.7} />}
                  title={form.orderType === 'bespoke' ? 'Bespoke brief' : 'Selected garment'}
                  hint={form.orderType === 'bespoke'
                    ? 'A consultation-driven order. No catalog design or template is needed — set the classification and the brief below. Reference images are optional.'
                    : 'The design template comes from the Garment Catalog; fabric comes from live inventory.'}
                  aside={form.orderType === 'catalog' ? (
                    <button
                      type="button"
                      onClick={() => setPickerOpen(true)}
                      className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-[#2A211D] px-3.5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#FAF7F2] shadow-md transition-colors hover:bg-[#3D312B]"
                    >
                      <Search className="h-3.5 w-3.5" /> Select from Garment Catalog
                    </button>
                  ) : undefined}
                >
                  {design && form.orderType === 'catalog' ? (
                    <div className="flex flex-col gap-4 sm:flex-row">
                      <div className="h-32 w-28 flex-shrink-0 overflow-hidden rounded-lg border border-[#E2D7C7] bg-[#F8F3EB]">
                        <div className="flex h-full w-full items-center justify-center"><GarmentIllustration type={form.garmentType} className="h-24 w-20" /></div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-[16px] font-semibold text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>{design.name}</h4>
                          <span className="rounded-full bg-[#F1F5F0] px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[#4E7357]">
                            Catalog template
                          </span>
                        </div>
                        <p className="mt-1 text-[11.5px] leading-relaxed text-[#766A62]">
                          {design.description || 'Design reference recorded on the job card.'}
                        </p>
                        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px] sm:grid-cols-3">
                          <div><dt className="text-[#A3958B]">Garment type</dt><dd className="font-medium text-[#2A211D]">{form.garmentType}</dd></div>
                          <div><dt className="text-[#A3958B]">Style</dt><dd className="font-medium text-[#2A211D]">{form.styleDesign || '—'}</dd></div>
                          <div><dt className="text-[#A3958B]">Base price</dt><dd className="font-medium text-[#8C6F3E]" style={{ fontFamily: "'Space Mono', monospace" }}>{basePrice > 0 ? peso(basePrice) : 'Priced at intake'}</dd></div>
                        </dl>
                      </div>
                    </div>
                  ) : form.orderType === 'bespoke' ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field label="Garment category" hint="Official classification — no name guessing.">
                          <select value={form.orderCategory} onChange={(event) => update({ orderCategory: event.target.value, garmentType: '' })} className={INPUT}>
                            <option value="">Select a category</option>
                            {ORDER_CATEGORIES.map((category) => <option key={category.name} value={category.name}>{category.name}</option>)}
                          </select>
                        </Field>
                        <Field label="Garment type" hint="Drives pricing, measurements and the production workflow.">
                          <select value={form.garmentType} onChange={(event) => update({ garmentType: event.target.value })} className={INPUT}>
                            <option value="">Select a garment type</option>
                            {(availableGarments).map((garment) => <option key={garment} value={garment}>{garment}</option>)}
                          </select>
                        </Field>
                      </div>
                      <Field label="Bespoke brief" hint="What the customer wants: silhouette, occasion, details. No catalog design required.">
                        <textarea
                          rows={3}
                          value={form.customizationNotes}
                          onChange={(event) => update({ customizationNotes: event.target.value })}
                          placeholder="e.g. Formal barong for a June wedding — slim cut, piña front, French cuffs…"
                          className={`${INPUT} resize-none`}
                        />
                      </Field>
                      <Field label="Reference images (optional)" hint="JPG, PNG, WEBP or PDF sketches — inspiration only, never required.">
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                          multiple
                          onChange={async (event) => {
                            const files = Array.from(event.target.files || []);
                            if (!files.length) return;
                            const permitted = files.slice(0, Math.max(0, 4 - form.referenceImages.length));
                            if (!permitted.length) { setError('A job card can keep up to four reference files.'); event.target.value = ''; return; }
                            setUploadingReferences(true);
                            setError('');
                            try {
                              const uploaded = await frontDeskApi.uploadReferenceFiles(permitted);
                              update({ referenceImages: [...form.referenceImages, ...uploaded.map((file) => file.url)].slice(0, 4) });
                            } catch (err) {
                              setError(err instanceof Error ? err.message : 'Could not upload the reference files.');
                            } finally {
                              setUploadingReferences(false);
                            }
                            event.target.value = '';
                          }}
                          disabled={uploadingReferences}
                          className="w-full cursor-pointer rounded-lg border border-dashed border-[#C9A15C]/60 bg-[#FFFCF8] px-3 py-2.5 text-[12px] text-[#766A62] disabled:cursor-wait disabled:opacity-60"
                        />
                        {uploadingReferences && <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#8C6F3E]"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading and attaching files…</p>}
                        {form.referenceImages.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {form.referenceImages.map((src, index) => (
                              <span key={index} className="relative inline-block h-16 w-16 overflow-hidden rounded-lg border border-[#E2D7C7] bg-white">
                                {src.startsWith('data:application/pdf')
                                  ? <span className="flex h-full w-full items-center justify-center text-[9px] font-semibold text-[#8A6618]">PDF</span>
                                  : <img src={src} alt={`Reference ${index + 1}`} className="h-full w-full object-cover" />}
                                <button
                                  type="button"
                                  aria-label="Remove reference image"
                                  onClick={() => update({ referenceImages: form.referenceImages.filter((_, i) => i !== index) })}
                                  className="absolute right-0 top-0 rounded-bl-lg bg-[#1F1916]/70 px-1 py-0.5 text-white"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </Field>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-[#E2D7C7] bg-[#FCFAF7] px-4 py-6 text-center">
                      <Shirt className="mx-auto mb-2 h-6 w-6 text-[#A3958B]" />
                      <p className="text-[13px] font-medium text-[#2A211D]">No catalog design selected yet</p>
                      <p className="mt-1 text-[11.5px] text-[#766A62]">Pick the template the customer chose — or switch this intake to a Bespoke Brief, which needs no design.</p>
                      <button type="button" onClick={() => update({ orderType: 'bespoke', catalogItemId: null })} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#C9A15C]/60 bg-white px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8C6F3E] hover:bg-[#F9F4EB]">
                        Start Bespoke Brief
                      </button>
                    </div>
                  )}
                </SectionCard>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <SectionCard icon={<Layers className="h-4 w-4" strokeWidth={1.7} />} title="Classification" hint="Auto-filled from the catalog pick — adjust only if the customer changes their mind.">
                    <div className="space-y-4">
                      {form.orderType === 'catalog' ? (
                      <>
  <Field label="Order category">
                          <select
                            value={form.orderCategory}
                            onChange={(event) => {
                              const list = GARMENTS_BY_CATEGORY[event.target.value] || GARMENT_TYPES;
                              update({ orderCategory: event.target.value, garmentType: list.includes(form.garmentType) ? form.garmentType : list[0] });
                            }}
                            className={INPUT}
                          >
                            {ORDER_CATEGORIES.map((category) => <option key={category.name} value={category.name}>{category.name}</option>)}
                          </select>
                        </Field>
                        <Field label="Garment type" hint="Drives pricing, measurement points and the production workflow.">
                          <select
                            value={form.garmentType}
                            onChange={(event) => update({ garmentType: event.target.value })}
                            className={INPUT}
                          >
                            {(availableGarments).map((garment) => <option key={garment} value={garment}>{garment}</option>)}
                          </select>
                        </Field>
                      </>
                    ) : (
                      <div className="rounded-lg border border-[#ECE2D3] bg-[#FCFAF7] px-3.5 py-3">
                        <Label>Classification (from the bespoke brief)</Label>
                        <p className="mt-1 text-[13px] font-medium text-[#2A211D]">
                          {form.orderCategory || 'No category'} › {form.garmentType || 'No garment type'}
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-[#766A62]">
                          Set in Step 2. Change it there with the customer — classification is never guessed from the garment name.
                        </p>
                      </div>
                    )}
                      <Field label="Quantity">
                        <input
                          type="number"
                          min={1}
                          value={form.quantity}
                          onChange={(event) => update({ quantity: parseInt(event.target.value, 10) || 1 })}
                          className={INPUT}
                        />
                      </Field>
                    </div>
                  </SectionCard>

                  <SectionCard icon={<Scissors className="h-4 w-4" strokeWidth={1.7} />} title="Selected style & fabric" hint="Fabric comes from live inventory, so the job card can only reach production with real stock.">
                    <div className="space-y-4">
                      <Field label="Selected style" hint="Styles offered for the selected garment, straight from the catalog record.">
                        <select value={form.styleDesign} onChange={(event) => update({ styleDesign: event.target.value })} className={INPUT}>
                          <option value="">Select a style</option>
                          {availableStyles.map((style) => <option key={style} value={style}>{style}</option>)}
                        </select>
                      </Field>
                      <Field label="Selected fabric" hint="Live inventory — fabrics are listed from the shop's stock records.">
                        <select value={form.fabric} onChange={(event) => update({ fabric: event.target.value })} className={INPUT}>
                          <option value="">Select a fabric</option>
                          {inStockFabrics.map((fabric) => (
                            <option key={fabric.id} value={fabric.fabricName}>
                              {fabric.fabricName}{fabric.tone ? ` — ${fabric.tone}` : ''}
                              {fabric.stockQuantity === undefined || fabric.stockQuantity === null
                                ? ` · ${fabric.unit}`
                                : ` · ${fabric.stockQuantity} ${fabric.unit} in stock`}
                            </option>
                          ))}
                        </select>
                        {inStockFabrics.length === 0 && (
                          <p className="mt-2 text-[11px] leading-relaxed text-[#9E5B4B]">
                            No fabrics are available in inventory yet. Add fabric stock at <strong>Inventory → Fabrics</strong>, then reopen this form.
                          </p>
                        )}
                      </Field>

                      {design && design.suggestedFabrics.length > 0 && (
                        <div className="rounded-lg border border-[#ECD8A7]/70 bg-[#FFF7E3] px-3.5 py-2.5">
                          <Label>Catalog suggestion — confirm the real stock fabric above</Label>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {design.suggestedFabrics.slice(0, 4).map((label) => {
                              const match = inStockFabrics.find((fabric) => label.toLowerCase().includes(fabric.fabricName.toLowerCase()) || fabric.fabricName.toLowerCase().includes(label.toLowerCase()));
                              return (
                                <button
                                  key={label}
                                  type="button"
                                  disabled={!match}
                                  title={match ? `Use ${match.fabricName} from inventory` : 'Not in inventory — choose a stock fabric above'}
                                  onClick={() => { if (match) update({ fabric: match.fabricName }); }}
                                  className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors ${
                                    match ? 'border border-[#E5C98F] bg-white text-[#8A6618] hover:bg-[#FBEDCB]' : 'border border-dashed border-[#E5C98F]/70 bg-white/60 text-[#B89255] opacity-70'
                                  }`}
                                >
                                  {label}{match ? ' ✓ in stock' : ' · not in stock'}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <Field label="Fabric requirement (yards)">
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          value={form.fabricQuantity}
                          onChange={(event) => update({ fabricQuantity: event.target.value })}
                          placeholder="2.5"
                          className={INPUT}
                        />
                      </Field>
                    </div>
                  </SectionCard>
                </div>
              </div>
            )}

            {/* STEP 3 — CUSTOMIZATION & MEASUREMENTS --------------------- */}
            {step === 3 && (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <SectionCard icon={<Palette className="h-4 w-4" strokeWidth={1.7} />} title="Customization" hint="What makes this piece the customer's own — recorded on the job card for the tailor.">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="Collar style">
                        <select value={form.collarStyle} onChange={(event) => update({ collarStyle: event.target.value })} className={INPUT}>
                          <option value="">Standard for {form.garmentType}</option>
                          {CUSTOMIZATION_OPTIONS.collarStyles.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                      </Field>
                      <Field label="Sleeve style">
                        <select value={form.sleeveStyle} onChange={(event) => update({ sleeveStyle: event.target.value })} className={INPUT}>
                          <option value="">Standard for {form.garmentType}</option>
                          {CUSTOMIZATION_OPTIONS.sleeveStyles.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                      </Field>
                    </div>
                    <Field label="Embroidery option">
                      <select value={form.embroidery} onChange={(event) => update({ embroidery: event.target.value })} className={INPUT}>
                        {CUSTOMIZATION_OPTIONS.embroideryOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </Field>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="Lining">
                        <select value={form.lining} onChange={(event) => update({ lining: event.target.value })} className={INPUT}>
                          <option value="">No lining preference</option>
                          <option>Full Lining</option>
                          <option>Half Lining</option>
                        </select>
                      </Field>
                      <Field label="Pocket style">
                        <select value={form.pocketStyle} onChange={(event) => update({ pocketStyle: event.target.value })} className={INPUT}>
                          <option value="">Standard pocket</option>
                          <option>Welt Pocket</option>
                          <option>Patch Pocket</option>
                          <option>Flap Pocket</option>
                        </select>
                      </Field>
                      <Field label="Buttons">
                        <select value={form.buttons} onChange={(event) => update({ buttons: event.target.value })} className={INPUT}>
                          <option value="">Standard buttons</option>
                          <option>Mother of Pearl</option>
                          <option>Corozo</option>
                          <option>Covered Buttons</option>
                        </select>
                      </Field>
                      <Field label="Monogram">
                        <select value={form.monogram} onChange={(event) => update({ monogram: event.target.value })} className={INPUT}>
                          <option value="">None</option>
                          <option value="Yes">Yes — add monogram</option>
                        </select>
                      </Field>
                    </div>
                    <label className="flex items-start gap-2.5 text-[11.5px] leading-relaxed text-[#766A62]">
                      <input
                        type="checkbox"
                        checked={form.rushOrder}
                        onChange={(event) => update({ rushOrder: event.target.checked })}
                        className="mt-0.5 h-4 w-4 accent-[#8C6F3E]"
                      />
                      <span>
                        <strong className="text-[#2A211D]">Rush order</strong> — priority production; the shop rush fee is applied by the pricing engine.
                      </span>
                    </label>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[auto_1fr] sm:items-end">
                      <Field label="Colour">
                        <input
                          type="color"
                          value={/^#[0-9a-fA-F]{6}$/.test(form.color) ? form.color : '#8C6F3E'}
                          onChange={(event) => update({ color: event.target.value })}
                          className="h-11 w-full cursor-pointer rounded-lg border border-[#E2D7C7] bg-white px-1.5 py-1.5 sm:w-24"
                          aria-label="Preferred colour"
                        />
                      </Field>
                      <Field label="Colour note" hint="Type a colour name or hex — it travels with the job card.">
                        <input value={form.color} onChange={(event) => update({ color: event.target.value })} placeholder="e.g. Ivory, #F5EEDF" className={INPUT} />
                      </Field>
                    </div>
                    <Field label="Customization notes">
                      <textarea
                        rows={3}
                        value={form.customizationNotes}
                        onChange={(event) => update({ customizationNotes: event.target.value })}
                        placeholder="Monogram initials, cuff detail, lining, customer preferences…"
                        className={`${INPUT} resize-none`}
                      />
                    </Field>
                  </div>
                </SectionCard>

                <SectionCard
                  icon={<Ruler className="h-4 w-4" strokeWidth={1.7} />}
                  title="Measurements"
                  hint="Reuse the saved profile for a repeat customer, or take fresh numbers at the counter."
                  aside={loadingMeasurements ? <Loader2 className="h-4 w-4 animate-spin text-[#8C6F3E]" /> : undefined}
                >
                  <div className="mb-4 flex flex-wrap gap-2">
                    {([
                      [true, 'Use existing measurements'],
                      [false, 'Enter new measurements'],
                    ] as const).map(([useExisting, label]) => {
                      const active = form.useExistingMeasurements === useExisting;
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => update({ useExistingMeasurements: useExisting, saveMeasurements: !useExisting })}
                          aria-pressed={active}
                          className={`rounded-full px-3.5 py-2 text-[10.5px] font-semibold uppercase tracking-[0.1em] transition-colors ${
                            active ? 'bg-[#2A211D] text-[#FAF7F2] shadow-sm' : 'border border-[#E2D7C7] bg-white text-[#766A62] hover:bg-[#F2ECE1]'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  {!form.customerId ? (
                    <p className="text-[12px] text-[#A3958B]">Select a customer in Step 1 to reuse their saved measurements.</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {MEASUREMENT_FIELDS.map((field) => (
                          <Field key={field.key} label={field.label}>
                            <input
                              value={form.measurements[field.key]}
                              onChange={(event) => updateMeasurement(field.key, event.target.value)}
                              placeholder={field.placeholder}
                              disabled={form.useExistingMeasurements && Object.keys(existingMeasurements).length > 0}
                              className={INPUT}
                            />
                          </Field>
                        ))}
                      </div>
                      <label className="mt-4 flex items-start gap-2.5 text-[11.5px] leading-relaxed text-[#766A62]">
                        <input
                          type="checkbox"
                          checked={form.saveMeasurements}
                          onChange={(event) => update({ saveMeasurements: event.target.checked })}
                          className="mt-0.5 h-4 w-4 accent-[#8C6F3E]"
                        />
                        Save these numbers to the customer's measurement profile (used by every future order).
                      </label>
                      {Object.keys(existingMeasurements).length > 0 && form.useExistingMeasurements && (
                        <p className="mt-2 text-[11px] text-[#4E7357]">
                          Reusing the profile saved on {selectedCustomer?.full_name || 'this customer'}'s record.
                        </p>
                      )}
                    </>
                  )}
                </SectionCard>
              </div>
            )}

            {/* STEP 4 — PRODUCTION & PRICING ---------------------------- */}
            {step === 4 && (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.15fr_1fr]">
                <SectionCard icon={<Clock className="h-4 w-4" strokeWidth={1.7} />} title="Production" hint="Who sews it and by when. The job card is handed to this tailor from the Orders desk.">
                  <div className="space-y-4">
                    <Field label="Assigned tailor" hint={tailorOptions.length === 0 ? 'No approved tailor found — the job is auto-assigned to the least-loaded tailor.' : 'Leave blank to auto-assign at production handoff.'}>
                      <select value={form.assignedTailorId} onChange={(event) => update({ assignedTailorId: event.target.value })} className={INPUT}>
                        <option value="">Auto-assign at production handoff</option>
                        {tailorOptions.map((tailor) => (
                          <option key={tailor.id} value={String(tailor.id)}>
                            {tailor.full_name}{tailor.position ? ` — ${tailor.position}` : ''}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="Priority level">
                        <select value={form.priority} onChange={(event) => update({ priority: event.target.value as PriorityLevel })} className={INPUT}>
                          {PRIORITY_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
                        </select>
                      </Field>
                      <Field label="Estimated completion date">
                        <input
                          type="date"
                          value={form.targetCompletionDate}
                          onChange={(event) => update({ targetCompletionDate: event.target.value })}
                          className={INPUT}
                        />
                      </Field>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <Field label="Fabric requirement (yards)">
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          value={form.fabricQuantity}
                          onChange={(event) => update({ fabricQuantity: event.target.value })}
                          placeholder="2.5"
                          className={INPUT}
                        />
                      </Field>
                      <Field label="Additional charges (₱)" hint="Extras agreed at the counter.">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={form.additionalCharges}
                          onChange={(event) => update({ additionalCharges: event.target.value })}
                          placeholder="0"
                          className={INPUT}
                        />
                      </Field>
                      <Field label="Discount (₱)" hint="Priority / volume discount.">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={form.discount}
                          onChange={(event) => update({ discount: event.target.value })}
                          placeholder="0"
                          className={INPUT}
                        />
                      </Field>
                    </div>
                    <Field label="Special instructions for the workshop">
                      <textarea
                        rows={2}
                        value={form.specialInstructions}
                        onChange={(event) => update({ specialInstructions: event.target.value })}
                        placeholder="Deadline reminders, pickup notes, customer requests…"
                        className={`${INPUT} resize-none`}
                      />
                    </Field>
                  </div>
                </SectionCard>

                <div className="space-y-5">
                  <SectionCard
                    icon={<DollarSign className="h-4 w-4" strokeWidth={1.7} />}
                    title="Price breakdown"
                    hint="Every peso comes from the server pricing engine — the single source of truth."
                    aside={calculating ? <Loader2 className="h-4 w-4 animate-spin text-[#8C6F3E]" /> : undefined}
                  >
                    {pricingUnavailable ? (
                      <div className="flex items-start gap-2 rounded-lg border border-[#C86A58]/30 bg-[#FDF4F2] px-3.5 py-3 text-[12px] text-[#9A3B2A]" role="alert">
                        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <span>
                          {quoteError || `No pricing rule exists for "${form.garmentType}".`} The Pricing Guide and this quote both come from the Admin Rate Card — nothing can be quoted until the rule exists.
                        </span>
                      </div>
                    ) : (
                    <div className="space-y-2.5">
                      <PriceRow label={`Base price — ${form.garmentType} (engine rate card)`} value={peso(quoteBreakdown?.base_total ?? 0)} />
                      {(quoteBreakdown?.style_adjustment ?? 0) > 0 && <PriceRow label={`Style — ${form.styleDesign}`} value={peso(quoteBreakdown?.style_adjustment ?? 0)} />}
                      {(quoteBreakdown?.fabric_adjustment ?? 0) > 0 && <PriceRow label="Premium fabric" value={peso(quoteBreakdown?.fabric_adjustment ?? 0)} />}
                      {(quoteBreakdown?.customization_cost ?? 0) > 0 && <PriceRow label="Customizations" value={peso(quoteBreakdown?.customization_cost ?? 0)} />}
                      {(quoteBreakdown?.rush_fee ?? 0) > 0 && <PriceRow label="Rush order fee" value={peso(quoteBreakdown?.rush_fee ?? 0)} tone="warn" />}
                      {additionalCharges > 0 && <PriceRow label="Additional charges" value={peso(additionalCharges)} />}
                      {((quoteBreakdown?.discount ?? 0) + discount) > 0 && <PriceRow label="Discount" value={`-${peso((quoteBreakdown?.discount ?? 0) + discount)}`} tone="good" />}
                      <PriceRow label="Total (quoted by the pricing engine)" value={peso(totalAmount)} strong />
                      <PriceRow label="Suggested deposit (50%)" value={peso(suggestedDeposit)} tone="accent" />
                      <PriceRow label="Balance after deposit" value={peso(Math.max(0, totalAmount - suggestedDeposit))} tone="warn" />
                    </div>
                    )}
                    {quoteBreakdown && quoteBreakdown.customization_lines.length > 0 && (
                      <div className="mt-3 rounded-lg border border-[#E5D5AE] bg-[#FFFBEE] px-3 py-2">
                        <Label>Priced customizations</Label>
                        <ul className="mt-1 space-y-0.5 text-[11px] text-[#8A6618]">
                          {quoteBreakdown.customization_lines.map((line) => (
                            <li key={line.field} className="flex items-center justify-between gap-3">
                              <span className="capitalize">{line.field.replace(/_/g, ' ')}: {line.option}</span>
                              <span style={{ fontFamily: "'Space Mono', monospace" }}>+{peso(line.amount)} × {quoteBreakdown.quantity}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <p className="mt-3 text-[10.5px] leading-relaxed text-[#A3958B]">
                      This breakdown is computed by the server pricing engine and snapshotted onto the job card when confirmed — later rate-card changes never alter it.</p>
                  </SectionCard>

                  <div className="rounded-xl border border-[#ECE2D3] bg-[#FCFAF7] p-4">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-[#8C6F3E]" strokeWidth={1.7} />
                      <Label>After this step</Label>
                    </div>
                    <ol className="mt-3 space-y-2 text-[11.5px] leading-relaxed text-[#766A62]">
                      <li><strong className="text-[#2A211D]">1.</strong> The job card is created as a Draft with the tailor preference saved.</li>
                      <li><strong className="text-[#2A211D]">2.</strong> Collect the deposit in the next step and print the receipt.</li>
                      <li><strong className="text-[#2A211D]">3.</strong> Send the card to production from the Orders desk — the tailor is notified with the measurements.</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5 — DEPOSIT & CONFIRMATION -------------------------- */}
            {step === 5 && (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1fr]">
                <SectionCard icon={<Package className="h-4 w-4" strokeWidth={1.7} />} title="Order summary" hint="Read this back to the customer before taking the deposit.">
                  <dl className="divide-y divide-[#F0EAE2] text-[12.5px]">
                    {([
                      ['Customer', selectedCustomer ? `${selectedCustomer.full_name} · ${selectedCustomer.contact_number}` : '—'],
                      ['Garment', `${form.garmentType} · ${form.orderCategory}`],
                      ['Style / design', `${form.styleDesign || '—'}${design ? ` · ${design.name}` : ''}`],
                      ['Fabric', form.fabric || '—'],
                      ['Fabric requirement', `${form.fabricQuantity || 0} yards · qty ${form.quantity}`],
                      ['Customization', [form.collarStyle, form.sleeveStyle, form.embroidery !== 'None' ? form.embroidery : '', form.color].filter(Boolean).join(' · ') || 'Standard finish'],
                      ['Measurements', form.useExistingMeasurements && Object.keys(existingMeasurements).length > 0 ? 'Reusing saved profile' : 'New measurements taken at the counter'],
                      ['Assigned tailor', tailorOptions.find((tailor) => String(tailor.id) === form.assignedTailorId)?.full_name || 'Auto-assigned at handoff'],
                      ['Priority', form.priority],
                      ['Completion date', form.targetCompletionDate || '—'],
                    ] as const).map(([label, value]) => (
                      <div key={label} className="flex items-start justify-between gap-4 py-2.5">
                        <dt className="text-[#766A62]">{label}</dt>
                        <dd className="max-w-[60%] text-right font-medium text-[#2A211D]">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  {created && (
                    <div className="mt-4 flex items-start gap-2 rounded-lg border border-[#C7DDD3] bg-[#F1F5F0] px-3.5 py-3 text-[12px] text-[#4E7357]">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      <span>Job card <strong>{created.jobCardId}</strong> is saved. Print the receipt or close the form.</span>
                    </div>
                  )}
                </SectionCard>

                <SectionCard icon={<Banknote className="h-4 w-4" strokeWidth={1.7} />} title="Deposit & confirmation" hint="Collect the deposit now, or save the job card as a draft and collect later.">
                  <div className="space-y-4">
                    <label className="flex cursor-pointer items-start gap-2.5 text-[12.5px] font-medium text-[#2A211D]">
                      <input
                        type="checkbox"
                        checked={form.collectDeposit}
                        onChange={(event) => update({ collectDeposit: event.target.checked })}
                        className="mt-0.5 h-4 w-4 accent-[#8C6F3E]"
                      />
                      Collect the deposit now (recorded automatically with the new job card)
                    </label>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="Deposit amount (₱)">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          disabled={!form.collectDeposit}
                          value={form.depositAmount}
                          onChange={(event) => update({ depositAmount: event.target.value })}
                          placeholder={String(suggestedDeposit)}
                          className={INPUT}
                        />
                      </Field>
                      <Field label="Payment method">
                        <select
                          disabled={!form.collectDeposit}
                          value={form.depositPaymentMethod}
                          onChange={(event) => update({ depositPaymentMethod: event.target.value as GarmentIntakeData['depositPaymentMethod'] })}
                          className={INPUT}
                        >
                          <option>Cash</option>
                          <option>GCash</option>
                          <option>Card</option>
                          <option>Bank Transfer</option>
                          <option>Other</option>
                        </select>
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field label="Receipt reference" hint="Optional — GCash, card or bank reference.">
                        <input
                          disabled={!form.collectDeposit}
                          value={form.depositReferenceNumber}
                          onChange={(event) => update({ depositReferenceNumber: event.target.value })}
                          placeholder="e.g. GCash 0932…"
                          className={INPUT}
                        />
                      </Field>
                      <Field label="Balance due" hint="Collectible on or before pickup.">
                        <input readOnly value={peso(balanceDue)} className={INPUT} style={{ fontFamily: "'Space Mono', monospace" }} />
                      </Field>
                    </div>

                    <div className="rounded-xl border border-[#E8DFD3] bg-[#FCFAF7] p-4">
                      <PriceRow label="Total price" value={peso(totalAmount)} />
                      <div className="mt-2 space-y-2">
                        <PriceRow label="Deposit paid now" value={peso(depositPaid)} tone="good" />
                        <PriceRow label="Remaining balance" value={peso(balanceDue)} tone="warn" strong />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => submit('draft')}
                        disabled={savingMode !== null}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#E2D7C7] bg-white px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5E5048] transition-colors hover:bg-[#F2ECE1] disabled:opacity-50"
                      >
                        <Save className="h-3.5 w-3.5" /> Save draft
                      </button>
                      <button
                        type="button"
                        onClick={() => submit('confirm', true)}
                        disabled={savingMode !== null}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#C9A15C]/60 bg-white px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8C6F3E] transition-colors hover:bg-[#F9F4EB] disabled:opacity-50"
                      >
                        <Printer className="h-3.5 w-3.5" /> Print receipt
                      </button>
                    </div>
                    <p className="text-[10.5px] leading-relaxed text-[#A3958B]">
                      <strong className="text-[#5E5048]">Save draft</strong> keeps the job card without a payment. <strong className="text-[#5E5048]">Create order</strong> (bottom bar) records the job card and the deposit. <strong className="text-[#5E5048]">Print receipt</strong> saves, then prints the receipt for the customer.
                    </p>
                  </div>
                </SectionCard>
              </div>
            )}
          </div>

          {/* FOOTER ---------------------------------------------------- */}
          <footer className="flex-shrink-0 border-t border-[#E8DFD3] bg-[#FFFCF8] px-5 py-4 sm:px-8">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                <span className="text-[11.5px] text-[#766A62]">
                  Total <strong className="text-[#2A211D]" style={{ fontFamily: "'Space Mono', monospace" }}>{peso(totalAmount)}</strong>
                  {calculating && <Loader2 className="ml-1.5 inline h-3 w-3 animate-spin text-[#8C6F3E]" />}
                </span>
                <span className="text-[11.5px] text-[#766A62]">
                  Deposit <strong className="text-[#4E7357]" style={{ fontFamily: "'Space Mono', monospace" }}>{peso(depositPaid)}</strong>
                </span>
                <span className="text-[11.5px] text-[#766A62]">
                  Balance <strong className="text-[#9E5B4B]" style={{ fontFamily: "'Space Mono', monospace" }}>{peso(balanceDue)}</strong>
                </span>
                {step < steps.length && stepProblem && <span className="text-[11px] text-[#9A3B2A]" role="status">{stepProblem}</span>}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={goBack}
                    disabled={savingMode !== null}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#E2D7C7] bg-white px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#766A62] transition-colors hover:bg-[#F2ECE1] disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" /> Back
                  </button>
                )}
                {step < steps.length ? (
                  <button
                    type="submit"
                    disabled={Boolean(stepProblem)}
                    title={stepProblem || undefined}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#2A211D] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#FAF7F2] shadow-md transition-colors hover:bg-[#3D312B] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => submit('draft')}
                      disabled={savingMode !== null}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#E2D7C7] bg-white px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5E5048] transition-colors hover:bg-[#F2ECE1] disabled:opacity-50"
                    >
                      {savingMode === 'draft' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save draft
                    </button>
                    <button
                      type="button"
                      onClick={() => submit('confirm', true)}
                      disabled={savingMode !== null}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#C9A15C]/60 bg-white px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8C6F3E] transition-colors hover:bg-[#F9F4EB] disabled:opacity-50"
                    >
                      <Printer className="h-3.5 w-3.5" /> Print receipt
                    </button>
                    <button
                      type="submit"
                      disabled={savingMode !== null}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#2A211D] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#FAF7F2] shadow-md transition-colors hover:bg-[#3D312B] disabled:opacity-50"
                    >
                      {savingMode !== null ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scissors className="h-3.5 w-3.5" />} Create order
                    </button>
                  </>
                )}
              </div>
            </div>
          </footer>
        </form>
      </div>

      {pickerOpen && (
        <GarmentCatalogPicker
          onClose={() => setPickerOpen(false)}
          onSelect={applyDesign}
          initialQuery={design?.source === 'catalog' ? design.name : ''}
        />
      )}
    </div>
  );
}

