// utils/imageFraming.ts
//
// THE CATALOG IMAGE FRAMING CONTRACT — one renderer for the garment photo on
// every surface. The Admin's Live Preview writes these settings onto the
// catalog record; the Front Desk Browse Catalog, the garment picker, the
// quotation preview and the customer storefront all render the photo through
// <CatalogImage>, so whatever the Admin framed is exactly what customers see.
//
// Settings live on the garment_catalog record:
//   image_zoom       1–3   display zoom (1 = the whole photo fits)
//   image_pos_x/y    0–100 focal point as percentages (object-position)
//   image_crop_mode  'contain' (whole photo) | 'cover' (fill the frame)
import type { CSSProperties } from 'react';

export type ImageCropMode = 'contain' | 'cover';

export type ImageFraming = {
  image_zoom: number;
  image_pos_x: number;
  image_pos_y: number;
  image_crop_mode: ImageCropMode;
};

export const DEFAULT_IMAGE_FRAMING: ImageFraming = {
  image_zoom: 1,
  image_pos_x: 50,
  image_pos_y: 50,
  image_crop_mode: 'contain',
};

const clamp = (value: number, min: number, max: number, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

/** Normalises any payload (DB row, form state, legacy sample) into safe settings. */
export function normalizeFraming(input?: Partial<ImageFraming> | null): ImageFraming {
  if (!input) return { ...DEFAULT_IMAGE_FRAMING };
  return {
    image_zoom: clamp(input.image_zoom ?? DEFAULT_IMAGE_FRAMING.image_zoom, 1, 3, DEFAULT_IMAGE_FRAMING.image_zoom),
    image_pos_x: clamp(input.image_pos_x ?? DEFAULT_IMAGE_FRAMING.image_pos_x, 0, 100, DEFAULT_IMAGE_FRAMING.image_pos_x),
    image_pos_y: clamp(input.image_pos_y ?? DEFAULT_IMAGE_FRAMING.image_pos_y, 0, 100, DEFAULT_IMAGE_FRAMING.image_pos_y),
    image_crop_mode: input.image_crop_mode === 'cover' ? 'cover' : 'contain',
  };
}

/**
 * The one image style every surface uses. In 'contain' the whole photo is
 * visible and the focal point nudges it inside the frame; in 'cover' the photo
 * fills the frame and the focal point decides what stays in view while zoomed.
 */
export function imageFramingStyle(framing?: Partial<ImageFraming> | null): CSSProperties {
  const settings = normalizeFraming(framing);
  return {
    objectFit: settings.image_crop_mode,
    objectPosition: `${settings.image_pos_x}% ${settings.image_pos_y}%`,
    transform: `scale(${settings.image_zoom})`,
    transformOrigin: `${settings.image_pos_x}% ${settings.image_pos_y}%`,
  };
}


