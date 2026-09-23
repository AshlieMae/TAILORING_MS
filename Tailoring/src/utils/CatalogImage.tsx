// utils/CatalogImage.tsx
//
// The single garment-photo renderer. Admin Live Preview, Front Desk Browse
// Catalog, the garment picker, quotation previews and the customer storefront
// all render through this component with the framing saved on the record.
import { useState } from 'react';
import { imageFramingStyle, type ImageFraming } from './imageFraming';

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
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={className}
      style={style}
      onError={() => { setBroken(true); onBroken?.(); }}
    />
  );
}
