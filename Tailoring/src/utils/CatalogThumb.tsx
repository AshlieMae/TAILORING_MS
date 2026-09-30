// utils/CatalogThumb.tsx
//
// THE FIXED-FRAME GARMENT THUMBNAIL — one image box for the Admin's catalog
// MANAGEMENT surfaces (the management table rows and the management cards), so
// a portrait photo, a landscape photo and a transparent PNG product shot all
// occupy exactly the same rectangle. That is what keeps every card the same
// height, the columns aligned and the grid calm: no stretching, no surprise
// crops, no letterboxed gaps.
//
// Which frame a photo belongs in is decided by `thumbFitFor` in
// utils/imageFraming (the shared image contract). Note this differs from
// <CatalogImage>, which renders the framing the Admin saved for the
// CUSTOMER-facing storefront card: the admin table and card views are
// management surfaces whose job is a consistent, scannable grid, so they
// standardise the frame instead. The storefront, the Front Desk catalog, the
// picker and the quotation previews are untouched.
import { useState, type ReactNode } from 'react';
import { thumbFitFor } from './imageFraming';

/**
 * The fixed image frame. Give it a size through `className` (for example
 * `h-56 w-full` on a card, `h-14 w-16` in a table row) plus a `radius`, and it
 * guarantees that size regardless of the photo's natural aspect ratio.
 */
export function CatalogThumb({ src, alt, cropMode, className = '', radius = 0, fallback, matPadding = 'p-2.5' }: {
  src?: string | null;
  alt: string;
  /** The record's saved framing; 'cover' forces a fill. */
  cropMode?: 'contain' | 'cover' | null;
  className?: string;
  radius?: number;
  /** Shown instead of the photo when the record has none (or it fails to load). */
  fallback?: ReactNode;
  /** Breathing room around a matted product shot. */
  matPadding?: string;
}) {
  const [broken, setBroken] = useState(false);
  const hasImage = Boolean(src) && !broken;
  const fit = thumbFitFor({ src, cropMode });

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{ background: '#F3F4F6', borderRadius: radius }}
    >
      {hasImage && fit === 'fill' && (
        <img src={src as string} alt={alt} loading="lazy" draggable={false}
          onError={() => setBroken(true)} className="h-full w-full object-cover object-center" />
      )}
      {hasImage && fit === 'mat' && (
        <img src={src as string} alt={alt} loading="lazy" draggable={false}
          onError={() => setBroken(true)} className={`max-h-full max-w-full object-contain object-center ${matPadding}`} />
      )}
      {!hasImage && fallback}
    </div>
  );
}

export default CatalogThumb;