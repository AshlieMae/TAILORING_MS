import { useState } from 'react';
import { imageFramingStyle } from '../utils/imageFraming';
import { GARMENT_PLACEHOLDER, getOrderGarmentImage, type OrderGarmentImageSource } from '../utils/getOrderGarmentImage';

/**
 * An order row as the server returns it. `catalog_*` are the garment_catalog
 * columns resolved by the API's LEFT JOIN (they are never stored on the order);
 * every one of them is optional, because a bespoke order and any order written
 * before catalog framing existed simply do not have them.
 */
export type OrderImageSource = OrderGarmentImageSource & {
  garment?: string | null;
  garment_type?: string | null;
  catalog_image_zoom?: number | string | null;
  catalog_image_pos_x?: number | string | null;
  catalog_image_pos_y?: number | string | null;
  catalog_image_crop_mode?: 'contain' | 'cover' | null;
};

/**
 * null/undefined/'' must stay absent rather than becoming Number(null) === 0,
 * otherwise normalizeFraming would read a stray 0 and pin the photo to the
 * top-left corner instead of applying its own centred default.
 */
function framingNumber(value: number | string | null | undefined): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * THE order-image renderer — the single source of truth for how an order's
 * garment photo is drawn. Use it for order cards, list and grid rows, order
 * details, dashboards, timelines, previews and job cards, so the customer,
 * Front Desk, Tailor and Admin views can never disagree about which photo an
 * order shows.
 *
 * The photo itself comes from `getOrderGarmentImage` (catalog photo first,
 * then the bespoke intake upload, then the shared placeholder), and the
 * catalog's saved framing — image_zoom, image_pos_x, image_pos_y and
 * image_crop_mode — is applied through the shared imageFraming contract.
 *
 * A photo whose URL is dead, missing or mislabelled swaps itself for
 * GARMENT_PLACEHOLDER via onError, so a broken file never leaves a torn image
 * or an empty box in a layout.
 */
export function OrderGarmentImage({ order, className = '', alt }: { order: OrderImageSource; className?: string; alt?: string }) {
  const [failed, setFailed] = useState(false);
  const source = failed ? GARMENT_PLACEHOLDER : getOrderGarmentImage(order);
  // The placeholder is our own artwork: it keeps its natural shape centred in
  // the frame instead of inheriting a catalog photo's zoom and focal point.
  const style = source === GARMENT_PLACEHOLDER
    ? { objectFit: 'contain' as const }
    : imageFramingStyle({
      image_zoom: framingNumber(order.catalog_image_zoom),
      image_pos_x: framingNumber(order.catalog_image_pos_x),
      image_pos_y: framingNumber(order.catalog_image_pos_y),
      image_crop_mode: order.catalog_image_crop_mode ?? undefined,
    });
  return (
    <img
      src={source}
      alt={alt || `Image of ${order.garment || order.garment_type || 'garment'}`}
      loading="lazy"
      className={className}
      style={style}
      onError={() => { if (!failed) setFailed(true); }}
    />
  );
}
