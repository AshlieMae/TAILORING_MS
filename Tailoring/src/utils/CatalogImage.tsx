// utils/CatalogImage.tsx
//
// The single garment-photo renderer. Admin Live Preview, Front Desk Browse
// Catalog, the garment picker, quotation previews and the customer storefront
// all render through this component with the framing saved on the record.
import { useState } from 'react';
import { imageFramingStyle, type ImageFraming } from './imageFraming';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const IMAGE_SERVER_ORIGIN = API_URL.replace(/\/api\/?$/, '');

/**
 * Catalog image references predate the production deployment and may contain
 * the API server's local development origin. Keep those database values
 * unchanged, but resolve them against the active API server before rendering.
 * This preserves localhost during local development and uses Render in the
 * production build.
 */
export function resolveCatalogImageUrl(src: string): string {
  if (!src) return '';

  try {
    const url = new URL(src, IMAGE_SERVER_ORIGIN);
    const isLocalApiOrigin = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    if (isLocalApiOrigin || !/^https?:$/i.test(url.protocol)) {
      return `${IMAGE_SERVER_ORIGIN}${url.pathname}${url.search}${url.hash}`;
    }
    return url.toString();
  } catch {
    return src;
  }
}

/**
 * The single garment-photo renderer. Admin preview, Front Desk Browse Catalog,
 * the garment picker, quotation previews and the customer storefront all use
 * this component with the framing saved on the catalog record.
 */
export function CatalogImage({ src, alt, framing, className, onBroken }: {
  src: string; alt: string; framing?: Partial<ImageFraming> | null; className?: string; onBroken?: () => void;
}) {
  const [broken, setBroken] = useState(false);
  const style = imageFramingStyle(framing);
  if (!src || broken) return null;
  const resolvedSrc = resolveCatalogImageUrl(src);
  return (
    <img
      src={resolvedSrc}
      alt={alt}
      loading="lazy"
      className={className}
      style={style}
      onError={() => { setBroken(true); onBroken?.(); }}
    />
  );
}
