// utils/getOrderGarmentImage.ts
//
// THE SINGLE ORDER-IMAGE POLICY.
//
// Every customer, Front Desk, Tailor and Admin surface resolves an order's
// garment photo through `getOrderGarmentImage` and renders it through
// <OrderGarmentImage>. This is the only place order imagery is decided — there
// are no fabric swatches, no generated colour blocks, no per-page thumbnail
// logic and no second resolver to drift out of sync.
//
// Resolution order — a catalog link always wins over everything else:
//
//   1. order.catalog_item_id is set
//        → the photo on that garment_catalog row (`catalog_image`).
//          The server resolves it live with
//             LEFT JOIN garment_catalog gc ON gc.id = o.catalog_item_id
//          and exposes gc.image AS catalog_image (plus the framing columns).
//          Nothing is copied onto the order, so an Admin editing the catalog
//          photo updates every existing order automatically.
//
//   2. order.catalog_item_id is null, or order_type === 'bespoke'
//        → the first usable file in `reference_image`, the inspiration
//          upload(s) captured at intake.
//
//   3. anything else → GARMENT_PLACEHOLDER.
//
// Only real images are returned. Documents (PDF, Word, Excel, PowerPoint,
// archives, plain text) and unusable values are skipped, so a PDF can never be
// put into an <img>. Orders created before catalog_item_id existed simply take
// path 2 or 3 and never throw.

/**
 * The one professional garment placeholder, shared by every surface so a
 * missing photo looks the same in the Customer, Front Desk, Tailor and Admin
 * views.
 */
export const GARMENT_PLACEHOLDER = '/assets/placeholders/garment-placeholder.svg';

export type OrderGarmentImageSource = {
  /** garment_catalog.id chosen at Front Desk intake; null for bespoke orders. */
  catalog_item_id?: string | number | null;
  /** 'catalog' | 'bespoke'. Legacy rows may leave this empty. */
  order_type?: string | null;
  /** garment_catalog.image, resolved live by the server — never stored here. */
  catalog_image?: string | null;
  /** The intake upload(s): a single URL/path or a JSON array of them. */
  reference_image?: string | null;
};

/** Documents and archives: never an image, whatever the caller passes in. */
const DOCUMENT_EXTENSION = /\.(?:pdf|docx?|xls[xm]?|pptx?|csv|txt|rtf|odt|zip|rar|7z)$/i;
/** Schemes that would never load a picture from our own storage. */
const UNUSABLE_URL = /^(?:blob:|about:|javascript:|#)/i;

/**
 * Accept only URLs a browser may safely load into an <img>.
 *
 * Uploaded files are served from the API's own upload path, which does not
 * guarantee a file extension, so extension-less '/…' and http(s) URLs are
 * accepted; a link that turns out to be dead or mislabelled is caught by the
 * renderer's onError and replaced by GARMENT_PLACEHOLDER. What is rejected up
 * front is anything that is definitely not an image: a document extension, a
 * non-image data URL, or a scheme we do not serve from.
 */
export function isValidImageUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const src = value.trim();
  if (!src || UNUSABLE_URL.test(src)) return false;
  // A single URL never contains raw whitespace. This also stops a comma-joined
  // list of uploads from being mistaken for one URL.
  if (/\s/.test(src)) return false;
  // A data URL is only usable when its own MIME type says "image".
  if (/^data:/i.test(src)) return /^data:image\//i.test(src);
  // Strip the query/hash before looking at the extension.
  const path = src.split('?')[0].split('#')[0];
  if (DOCUMENT_EXTENSION.test(path)) return false;
  if (src.startsWith('/')) return !src.startsWith('//');
  try {
    return ['http:', 'https:'].includes(new URL(src).protocol);
  } catch {
    return false;
  }
}

/**
 * The first usable image inside a `reference_image` value.
 *
 * Intake stores a JSON array of uploaded file URLs, but older or hand-edited
 * rows may hold a plain URL, a single-element array, or `{ url }` upload
 * objects — every one of those shapes is handled, and documents are skipped
 * rather than returned.
 */
export function firstValidReferenceImage(value?: string | null): string | null {
  if (!value) return null;

  /** Pulls a URL out of a string, or out of an upload object that wraps one. */
  const fromEntry = (entry: unknown): string | null => {
    if (isValidImageUrl(entry)) return entry.trim();
    if (entry && typeof entry === 'object') {
      const wrapped = entry as { url?: unknown; src?: unknown; type?: unknown };
      // An upload object that declares a non-image type is a document.
      if (typeof wrapped.type === 'string' && wrapped.type && !wrapped.type.startsWith('image/')) return null;
      if (isValidImageUrl(wrapped.url)) return (wrapped.url as string).trim();
      if (isValidImageUrl(wrapped.src)) return (wrapped.src as string).trim();
    }
    return null;
  };

  const firstIn = (list: unknown[]): string | null => {
    for (const entry of list) {
      const found = fromEntry(entry);
      if (found) return found;
    }
    return null;
  };

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? firstIn(parsed) : fromEntry(parsed);
  } catch {
    // Not JSON: a bare URL, or a whitespace/comma separated list of them.
    const trimmed = value.trim();
    if (/^data:/i.test(trimmed)) {
      // A base64 payload contains commas, so a data URL is a single value and
      // is only ever split on whitespace.
      const dataParts = trimmed.split(/\s+/).filter(Boolean);
      return dataParts.length > 1 ? firstIn(dataParts) : fromEntry(trimmed);
    }
    // Split a plain list first, so it is never mistaken for one URL that
    // happens to have a document in front of it.
    const parts = trimmed.split(/[\s,]+/).filter(Boolean);
    if (parts.length > 1) return firstIn(parts);
    return fromEntry(trimmed);
  }
}

/**
 * The garment photo a customer should see for this order.
 *
 * Always returns something renderable, so callers never need a fallback of
 * their own and an order created before catalog_item_id existed cannot crash
 * a view.
 */
export function getOrderGarmentImage(order?: OrderGarmentImageSource | null): string {
  if (!order) return GARMENT_PLACEHOLDER;

  // 1. The catalog photo is the answer whenever the record carries a usable
  //    one. The server only ever sets catalog_image through the catalog_item_id
  //    join, so its presence means this order really is linked to that garment.
  if (isValidImageUrl(order.catalog_image)) return order.catalog_image.trim();

  // 2. Bespoke, or an order with no catalog link: its own intake upload. A row
  //    linked to a catalog item whose photo is unusable has no second chance —
  //    showing an unrelated upload would be worse than the placeholder.
  const catalogLinked = order.catalog_item_id != null && order.catalog_item_id !== '';
  if (!catalogLinked || order.order_type === 'bespoke') {
    const reference = firstValidReferenceImage(order.reference_image);
    if (reference) return reference;
  }

  // 3. Nothing usable anywhere — the shared professional placeholder.
  return GARMENT_PLACEHOLDER;
}
