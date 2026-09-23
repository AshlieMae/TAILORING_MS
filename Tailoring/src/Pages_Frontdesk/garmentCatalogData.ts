// Pages_Frontdesk/garmentCatalogData.ts
//
// Single source of truth for the Front Desk Garment Catalog and the Garment
// Intake flow. The order taxonomy, the style library, the browse categories,
// the customization options and the catalog-card shaping helpers all live here
// so the catalog page, the catalog picker and the intake modal can never drift
// apart (and so nothing is duplicated between them).
import type { CatalogItem } from '../../services/frontDeskApi';
import { normalizeFraming, type ImageFraming } from '../utils/imageFraming';
import { formatPHP } from '../utils/currency';
import { businessDayRange, PRODUCTION_TIME_FALLBACK } from '../utils/productionTime';

// ============================================================
// ORDER TAXONOMY — category first, then the exact garment type.
// The garment type alone drives pricing, measurement requirements, the
// illustration preview and the production workflow.
// ============================================================
export const ORDER_CATEGORIES: { name: string; garments: string[] }[] = [
  { name: 'School Uniform', garments: ['Regular Uniform', 'Department Uniform', 'PE Uniform', 'Sports Jersey'] },
  { name: 'Corporate Uniform', garments: ['Office Uniform', 'Polo Shirt', 'Long Sleeve Uniform', 'Blazer'] },
  { name: 'Formal Wear', garments: ['Barong Tagalog', 'Two-Piece Suit', 'Three-Piece Suit', "Women's Coat", 'Evening Gown', 'Wedding Gown'] },
  { name: 'Casual Wear', garments: ['Polo Shirt', 'Long Sleeve', 'Dress', 'Jacket'] },
  { name: 'Sportswear', garments: ['Sports Jersey', 'Team Uniform', 'Training Uniform'] },
  { name: 'Custom/Bespoke', garments: ['Custom Shirt', 'Custom Pants', 'Custom Dress', 'Custom Coat', 'Other Custom Garment'] },
];

export const GARMENTS_BY_CATEGORY: Record<string, string[]> = ORDER_CATEGORIES.reduce(
  (acc, category) => { acc[category.name] = category.garments; return acc; },
  {} as Record<string, string[]>,
);

/** Flat union of every garment — keeps category-less lookups working. */
export const GARMENT_TYPES = Array.from(new Set(ORDER_CATEGORIES.flatMap((c) => c.garments)));

/** Uniform types listed in the catalog's uniform reference. */
export const UNIFORM_TYPES = Array.from(new Set([
  ...GARMENTS_BY_CATEGORY['School Uniform'],
  ...GARMENTS_BY_CATEGORY['Corporate Uniform'],
  ...GARMENTS_BY_CATEGORY['Sportswear'],
]));

// NOTE: there are NO frontend prices anywhere in this file. Every price —
// base prices, style adjustments, customization charges, rush fees,
// discounts — is owned by the server Pricing Engine (/api/auth/pricing).

/** Style library — also drives the catalog's style filters. */
export const STYLE_DESIGNS = ['Classic', 'Modern', 'Embroidered', 'Minimalist', 'Traditional', 'Ruffled', 'Fitted', 'Loose Fit'];

/** Browse buckets requested by the shop — every catalog garment maps into one. */
export const CATALOG_CATEGORIES = [
  'Barong Tagalog',
  'Two-Piece Suit',
  "Women's Coat",
  'Evening Gown',
  'School Uniform Set',
  'Department Uniform',
  'PE Uniform',
  'Sports Jersey',
  'Custom Garment',
] as const;
/** Which styles a category realistically offers in this shop. */
const STYLES_BY_CATEGORY: Record<CatalogCategory, string[]> = {
  'Barong Tagalog': ['Classic', 'Embroidered', 'Traditional'],
  'Two-Piece Suit': ['Classic', 'Modern', 'Fitted'],
  "Women's Coat": ['Modern', 'Fitted', 'Ruffled'],
  'Evening Gown': ['Modern', 'Ruffled', 'Traditional'],
  'School Uniform Set': ['Classic', 'Minimalist', 'Loose Fit'],
  'Department Uniform': ['Classic', 'Minimalist', 'Loose Fit'],
  'PE Uniform': ['Classic', 'Loose Fit'],
  'Sports Jersey': ['Modern', 'Minimalist', 'Loose Fit'],
  'Custom Garment': ['Classic', 'Modern', 'Traditional', 'Minimalist'],
};

export function stylesForCategory(category: string): string[] {
  return STYLES_BY_CATEGORY[category as CatalogCategory] || STYLES_BY_CATEGORY['Custom Garment'];
}

// ============================================================
// CONSULTATION GROUPS — the counter's coarse buckets. The detailed
// categories above stay the card labels; these only group them so the
// sidebar can filter a whole family (formal / women's / uniforms / bespoke)
// in one tap during a customer consultation.
// ============================================================
export const CONSULTATION_GROUPS = ['Formal Wear', "Women's Wear", 'Uniforms', 'Bespoke'] as const;
export type ConsultationGroup = (typeof CONSULTATION_GROUPS)[number];

const GROUP_BY_CATEGORY: Record<CatalogCategory, ConsultationGroup> = {
  'Barong Tagalog': 'Formal Wear',
  'Two-Piece Suit': 'Formal Wear',
  "Women's Coat": "Women's Wear",
  'Evening Gown': "Women's Wear",
  'School Uniform Set': 'Uniforms',
  'Department Uniform': 'Uniforms',
  'PE Uniform': 'Uniforms',
  'Sports Jersey': 'Uniforms',
  'Custom Garment': 'Bespoke',
};

export function groupForCategory(category: string): ConsultationGroup {
  return GROUP_BY_CATEGORY[category as CatalogCategory] || 'Bespoke';
}

// ============================================================
// FABRIC FAMILIES — how the sidebar buckets live fabric inventory.
// ============================================================
export const FABRIC_FAMILIES = ['Linen', 'Wool', 'Cotton', 'Others'] as const;
export type FabricFamily = (typeof FABRIC_FAMILIES)[number];

/** Bucket a fabric label/name into its family (anything else = Others). */
export function fabricFamilyOf(label: string): FabricFamily {
  const value = (label || '').toLowerCase();
  if (value.includes('linen')) return 'Linen';
  if (value.includes('wool')) return 'Wool';
  if (value.includes('cotton')) return 'Cotton';
  return 'Others';
}

// ============================================================
// PRODUCTION TIME — the shop's usual turnaround per garment type.
// Shown on the catalog cards and in the consultation drawer so the
// counter can promise a date before the job card is written.
// Every value is built by businessDayRange() from utils/productionTime,
// so the wording ("7–10 Business Days") and the en dash are consistent.
// ============================================================
export const PRODUCTION_TIME_DAYS: Record<string, string> = {
  'Barong Tagalog': businessDayRange(7, 10),
  'Two-Piece Suit': businessDayRange(10, 14),
  'Three-Piece Suit': businessDayRange(12, 16),
  'Blazer': businessDayRange(7, 10),
  "Women's Coat": businessDayRange(7, 10),
  'Evening Gown': businessDayRange(10, 14),
  'Wedding Gown': businessDayRange(14, 21),
  'Filipiniana Dress': businessDayRange(10, 14),
  'Dress': businessDayRange(7, 10),
  'Regular Uniform': businessDayRange(5, 7),
  'Department Uniform': businessDayRange(5, 7),
  'PE Uniform': businessDayRange(4, 6),
  'Sports Jersey': businessDayRange(4, 6),
  'Team Uniform': businessDayRange(5, 7),
  'Training Uniform': businessDayRange(5, 7),
  'Office Uniform': businessDayRange(5, 7),
  'Polo Shirt': businessDayRange(4, 6),
  'Long Sleeve Uniform': businessDayRange(5, 7),
  'Long Sleeve': businessDayRange(5, 7),
  'School Uniform': businessDayRange(5, 7),
  'Custom Shirt': businessDayRange(5, 7),
  'Custom Pants': businessDayRange(5, 7),
  'Custom Dress': businessDayRange(7, 10),
  'Custom Coat': businessDayRange(7, 10),
  'Other Custom Garment': businessDayRange(7, 10),
  'Jacket': businessDayRange(7, 10),
  'Scrub Suit': businessDayRange(5, 7),
  'Chef Uniform': businessDayRange(5, 7),
  'Corporate Uniform': businessDayRange(5, 7),
};

/** Turnaround for a garment type (shop default when the type is unlisted). */
export function productionTimeFor(garmentType: string): string {
  return PRODUCTION_TIME_DAYS[garmentType] || PRODUCTION_TIME_FALLBACK;
}

/** Ordered production-time options offered in the console / intake. */
export const PRODUCTION_TIME_OPTIONS = Array.from(new Set([
  businessDayRange(3, 5),
  businessDayRange(4, 6),
  businessDayRange(5, 7),
  businessDayRange(7, 10),
  businessDayRange(10, 14),
  businessDayRange(12, 16),
  businessDayRange(14, 21),
]));

// ============================================================
// CUSTOMIZATION OPTIONS — used by intake Step 3
// ============================================================
export const CUSTOMIZATION_OPTIONS = {
  collarStyles: ['Point Collar', 'Spread Collar', 'Mandarin / Chinese Collar', 'Barong U-Shape', 'Shawl Lapel', 'Notch Lapel', 'Peter Pan Collar', 'Hooded'],
  sleeveStyles: ['Short Sleeve', 'Long Sleeve', 'Three-Quarter Sleeve', 'Sleeveless', 'Raglan Sleeve', 'Puff Sleeve', 'Bell Sleeve', 'Cuffed'],
  embroideryOptions: ['None', 'Chest Monogram', 'Full Front Embroidery', 'Sleeve Detail', 'Collar Detail', 'Logo / Patch Placement', 'Filipiniana Hand Embroidery'],
} as const;

export const PRIORITY_LEVELS = ['Normal', 'Express', 'Rush'] as const;
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number];

// ============================================================
// CATALOG DESIGN — the object handed from the catalog to intake
// ============================================================
/** The design picked in the Garment Catalog and handed to the intake flow. */
export interface CatalogDesign {
  source: 'catalog' | 'custom';
  name: string;
  /** Explicit link back to the catalog row (catalog orders only). */
  catalogItemId?: number | null;
  /** The item's stored base price — display only; the quote is engine-side. */
  basePrice?: number | null;
  /** Production workflow key from the catalog item. */
  productionWorkflow?: string;
  /** Styles the catalog item allows. */
  allowedStyles?: string[];
  image: string;
  /** Image framing saved by the Admin Live Preview (same everywhere). */
  imageFraming?: ImageFraming;
  description: string;
  priceLabel: string;
  suggestedFabrics: string[];
  suggestedColors: string[];
  garmentType: string;
  orderCategory: string;
  /** Style pre-picked from the catalog card (optional). */
  styleDesign?: string;
  /** Browse bucket the card was filed under. */
  category?: string;
  /** Customization options ticked at the catalog's Customization tab (optional). */
  consultationNotes?: string;
}

/** Bespoke fallback — garments or references not present in the catalog. */
export const CUSTOM_DESIGN: CatalogDesign = {
  source: 'custom',
  name: 'Start Bespoke Brief',
  image: '',
  description: 'A consultation-driven custom order. No catalog design or template is required — start from the brief: measurements, requirements, fabric and preferences.',
  priceLabel: 'Priced at intake',
  suggestedFabrics: [],
  suggestedColors: [],
  garmentType: '',
  orderCategory: '',
  styleDesign: '',
  category: 'Custom Garment',
};

/**
 * Classification — ALWAYS explicit, never guessed from names.
 * A catalog item stores its official garment_category / garment_type; this
 * simply reads them back. Only a garment TYPE chosen without a catalog item
 * (bespoke intake) is looked up in the static taxonomy by exact membership.
 */
export function classificationForCatalogItem(item: CatalogItem): { garmentType: string; orderCategory: string } {
  const garmentType = (item.garment_type || '').trim() || item.name;
  const orderCategory = (item.garment_category || '').trim() || categoryForGarmentType(garmentType);
  return { garmentType, orderCategory };
}

/** Exact-membership lookup of a garment type in the static taxonomy (no fuzzy matching). */
export function categoryForGarmentType(garmentType: string): string {
  const exact = ORDER_CATEGORIES.find((c) => c.garments.includes(garmentType));
  return exact?.name || 'Custom/Bespoke';
}

/** Garment type → browse bucket, for explicit classification only. */
const BROWSE_BUCKET_BY_TYPE: Record<string, CatalogCategory> = {
  'Barong Tagalog': 'Barong Tagalog',
  'Two-Piece Suit': 'Two-Piece Suit',
  'Three-Piece Suit': 'Two-Piece Suit',
  'Blazer': 'Two-Piece Suit',
  "Women's Coat": "Women's Coat",
  'Evening Gown': 'Evening Gown',
  'Wedding Gown': 'Evening Gown',
  'Filipiniana Dress': 'Barong Tagalog',
  'Dress': 'Evening Gown',
  "Jacket": "Women's Coat",
  'Regular Uniform': 'School Uniform Set',
  'Department Uniform': 'Department Uniform',
  'Office Uniform': 'Department Uniform',
  'PE Uniform': 'PE Uniform',
  'Sports Jersey': 'Sports Jersey',
  'Team Uniform': 'Sports Jersey',
  'Training Uniform': 'Sports Jersey',
  'Custom Shirt': 'Custom Garment',
  'Custom Pants': 'Custom Garment',
  'Custom Dress': 'Custom Garment',
  'Custom Coat': 'Custom Garment',
  'Other Custom Garment': 'Custom Garment',
};

/** Browse bucket for a catalog item — from its explicit type/category, not its name. */
export function catalogCategoryForItem(item: CatalogItem): CatalogCategory {
  const garmentType = (item.garment_type || '').trim() || item.name;
  if (BROWSE_BUCKET_BY_TYPE[garmentType]) return BROWSE_BUCKET_BY_TYPE[garmentType];
  const category = (item.garment_category || '').trim();
  if (/formal|barong|suit|gown|coat/i.test(category)) return 'Barong Tagalog';
  if (/uniform|sport/i.test(category)) return 'School Uniform Set';
  return 'Custom Garment';
}

/** Browse bucket from an explicit garment type (no name guessing). */
export function catalogCategoryForGarmentType(garmentType: string): CatalogCategory {
  return BROWSE_BUCKET_BY_TYPE[garmentType] || 'Custom Garment';
}

/** Starting price for a catalog card — catalog label first, rate card second. */
export function startingPriceFor(item: CatalogItem): number {
  const stored = Number(item.base_price);
  return Number.isFinite(stored) && stored > 0 ? stored : 0;
}


export type CatalogCategory = (typeof CATALOG_CATEGORIES)[number];

// ============================================================
// CATALOG CARDS — the shape every catalog surface renders
// ============================================================
export interface CatalogCard {
  key: string;
  source: 'catalog' | 'custom';
  /** Catalog row id (undefined for the bespoke card). */
  id?: number;
  name: string;
  category: CatalogCategory;
  orderCategory: string;
  garmentType: string;
  styles: string[];
  priceLabel: string;
  startingPrice: number;
  fabrics: string[];
  colors: string[];
  image: string;
  description: string;
  /** The shop's usual turnaround for this garment type. */
  productionTime: string;
  /** Image framing saved from the Admin Live Preview (shared everywhere). */
  imageFraming?: ImageFraming;
}

/** Turn the admin-managed catalog rows into fully described catalog cards. */
export function buildCatalogCards(items: CatalogItem[], inventoryFabrics: string[] = []): CatalogCard[] {
  return (items || []).map((item, index) => {
    const { garmentType, orderCategory } = classificationForCatalogItem(item);
    const category = catalogCategoryForItem(item);
    const fabrics = (item.fabrics || []).length > 0 ? item.fabrics : inventoryFabrics.slice(0, 3);
    const startingPrice = startingPriceFor(item);
    return {
      key: `catalog-${item.id ?? item.name}-${index}`,
      source: 'catalog' as const,
      id: item.id,
      name: item.name,
      category,
      orderCategory,
      garmentType,
      styles: (item.allowed_styles || []).length > 0 ? item.allowed_styles : stylesForCategory(category),
      priceLabel: item.price || (startingPrice > 0 ? `From ${formatPHP(startingPrice)}` : 'Priced at intake'),
      startingPrice,
      fabrics,
      colors: item.colors || [],
      image: item.image || '',
      description: item.description || '',
      productionTime: productionTimeFor(garmentType),
      imageFraming: normalizeFraming(item),
    };
  });
}

/** Bespoke card — always offered so an unlisted design is never blocked. */
export function customCatalogCard(): CatalogCard {
  return {
    key: 'catalog-custom',
    source: 'custom',
    name: CUSTOM_DESIGN.name,
    category: 'Custom Garment',
    orderCategory: CUSTOM_DESIGN.orderCategory,
    garmentType: CUSTOM_DESIGN.garmentType,
    styles: stylesForCategory('Custom Garment'),
    priceLabel: CUSTOM_DESIGN.priceLabel,
    startingPrice: 0,
    fabrics: [],
    colors: [],
    image: '',
    description: CUSTOM_DESIGN.description,
    productionTime: productionTimeFor(CUSTOM_DESIGN.garmentType),
  };
}

/** Hand any catalog card over to the intake flow. */
export function cardToDesign(card: CatalogCard): CatalogDesign {
  if (card.source === 'custom') return { ...CUSTOM_DESIGN };
  return {
    source: 'catalog',
    catalogItemId: card.id ?? null,
    basePrice: card.startingPrice > 0 ? card.startingPrice : null,
    allowedStyles: card.styles,
    name: card.name,
    image: card.image,
    imageFraming: card.imageFraming,
    description: card.description,
    priceLabel: card.priceLabel,
    suggestedFabrics: card.fabrics,
    suggestedColors: card.colors,
    garmentType: card.garmentType,
    orderCategory: card.orderCategory,
    styleDesign: card.styles[0] || '',
    category: card.category,
  };
}

/**
 * Build a design from a garment type alone (bespoke intake). No pricing
 * fallback exists here — the quote always comes from the server Pricing Engine.
 */
export function designForGarmentType(garmentType: string, priceLabel?: string): CatalogDesign {
  return {
    source: 'custom',
    name: garmentType,
    image: '',
    description: `Bespoke ${garmentType} order — priced by the shop rate card at the counter.`,
    priceLabel: priceLabel || 'Priced at intake',
    suggestedFabrics: [],
    suggestedColors: [],
    garmentType,
    orderCategory: categoryForGarmentType(garmentType),
    styleDesign: '',
    category: catalogCategoryForGarmentType(garmentType),
  };
}

/**
 * Offline / empty-database seed. Mirrors the admin Garment Catalog defaults so
 * the Front Desk counter always has something to browse at the walk-in desk.
 */
/**
 * Offline / empty-database seed. Mirrors the admin Garment Catalog defaults so
 * the Front Desk counter always has something to browse at the walk-in desk.
 * Every row carries explicit classification + pricing — nothing is inferred.
 */
export const SAMPLE_CATALOG_ITEMS: CatalogItem[] = [
  { name: 'Barong Tagalog', price: 'From ₱6,500', description: '', fabrics: [], colors: [], image: '',
    garment_category: 'Formal Wear', garment_type: 'Barong Tagalog', base_price: 6500, production_workflow: 'formal_barong',
    allowed_styles: ["Classic","Modern","Minimalist"], allowed_fabrics: [], allowed_customizations: ["Embroidery","French Cuff","Custom Collar"],
    measurement_profile: 'full_body', active: 1 },
  { name: 'Two-piece Suit', price: 'From ₱12,000', description: '', fabrics: [], colors: [], image: '',
    garment_category: 'Formal Wear', garment_type: 'Two-Piece Suit', base_price: 12000, production_workflow: 'suit',
    allowed_styles: ["Classic","Modern","Fitted"], allowed_fabrics: [], allowed_customizations: ["Lining","Custom Collar","Pocket Style"],
    measurement_profile: 'full_body', active: 1 },
  { name: "Women's Coat", price: 'From ₱6,500', description: '', fabrics: [], colors: [], image: '',
    garment_category: 'Formal Wear', garment_type: "Women's Coat", base_price: 6500, production_workflow: 'coat',
    allowed_styles: ["Modern","Fitted"], allowed_fabrics: [], allowed_customizations: ["Lining","Pocket Style"],
    measurement_profile: 'full_body', active: 1 },
  { name: 'Filipiniana Dress', price: 'From ₱9,500', description: '', fabrics: [], colors: [], image: '',
    garment_category: 'Formal Wear', garment_type: 'Filipiniana Dress', base_price: 9500, production_workflow: 'gown',
    allowed_styles: ["Traditional","Modern"], allowed_fabrics: [], allowed_customizations: ["Embroidery","Lining"],
    measurement_profile: 'full_body', active: 1 },
  { name: 'School Uniform Set', price: 'From ₱1,800', description: '', fabrics: [], colors: [], image: '',
    garment_category: 'School Uniform', garment_type: 'Regular Uniform', base_price: 1800, production_workflow: 'uniform',
    allowed_styles: ["Classic","Loose Fit"], allowed_fabrics: [], allowed_customizations: ["Embroidery","Pocket Style"],
    measurement_profile: 'full_body', active: 1 },
  { name: 'Department Uniform', price: 'From ₱2,200', description: '', fabrics: [], colors: [], image: '',
    garment_category: 'Corporate Uniform', garment_type: 'Department Uniform', base_price: 2200, production_workflow: 'uniform',
    allowed_styles: ["Classic","Minimalist"], allowed_fabrics: [], allowed_customizations: ["Embroidery","Pocket Style"],
    measurement_profile: 'full_body', active: 1 },
  { name: 'PE Uniform', price: 'From ₱1,500', description: '', fabrics: [], colors: [], image: '',
    garment_category: 'School Uniform', garment_type: 'PE Uniform', base_price: 1500, production_workflow: 'uniform',
    allowed_styles: ["Classic","Loose Fit"], allowed_fabrics: [], allowed_customizations: ["Embroidery"],
    measurement_profile: 'full_body', active: 1 },
  { name: 'Sports Jersey', price: 'From ₱1,600', description: '', fabrics: [], colors: [], image: '',
    garment_category: 'Sportswear', garment_type: 'Sports Jersey', base_price: 1600, production_workflow: 'uniform',
    allowed_styles: ["Modern","Minimalist"], allowed_fabrics: [], allowed_customizations: ["Embroidery"],
    measurement_profile: 'full_body', active: 1 },
];

