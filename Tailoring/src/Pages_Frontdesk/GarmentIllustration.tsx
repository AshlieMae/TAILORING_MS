// Pages_Frontdesk/GarmentIllustration.tsx
//
// Hand-drawn style SVG illustration for each garment type. Shared by the
// Garment Catalog cards, the catalog detail view and the Garment Intake form
// so the counter always shows the same silhouette for a garment.

/** Hand-drawn style SVG illustration for each garment type — used by every catalog and intake surface. */
export function GarmentIllustration({ type, className }: { type: string; className?: string }) {
  const line = { fill: 'none', stroke: '#8C6F3E', strokeWidth: 2.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const body = (d: string, fill: string) => <path d={d} {...line} fill={fill} />;
  switch (type) {
    case 'Barong Tagalog':
      return (
        <svg viewBox="0 0 120 140" className={className} aria-label="Barong Tagalog illustration">
          <rect x="6" y="6" width="108" height="128" rx="10" fill="#F8F3EB" />
          {body('M38 34 L20 44 L24 96 L38 90', '#FAF7F2')}
          {body('M82 34 L100 44 L96 96 L82 90', '#FAF7F2')}
          {body('M38 34 Q60 26 82 34 L84 118 Q60 126 36 118 Z', '#FAF7F2')}
          <path d="M48 30 Q60 40 72 30" {...line} />
          <path d="M52 50 V110 M60 46 V114 M68 50 V110" stroke="#C9A15C" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="60" cy="54" r="1.8" fill="#8C6F3E" /><circle cx="60" cy="68" r="1.8" fill="#8C6F3E" /><circle cx="60" cy="82" r="1.8" fill="#8C6F3E" />
        </svg>
      );
    case 'Two-Piece Suit':
    case 'Three-Piece Suit':
    case 'Blazer':
    case 'Two-piece Suit':
      return (
        <svg viewBox="0 0 120 140" className={className} aria-label="Two-piece suit illustration">
          <rect x="6" y="6" width="108" height="128" rx="10" fill="#F8F3EB" />
          {body('M40 30 L60 40 L80 30 L86 100 L34 100 Z', '#E8DFD3')}
          <path d="M40 30 L32 42 L36 96" {...line} />
          <path d="M80 30 L88 42 L84 96" {...line} />
          <path d="M52 32 L60 46 L68 32" stroke="#2A211D" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="60" cy="58" r="1.8" fill="#2A211D" /><circle cx="60" cy="72" r="1.8" fill="#2A211D" />
          <path d="M44 104 L40 132 M76 104 L80 132" stroke="#2A211D" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M42 104 H78" stroke="#2A211D" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case "Women's Coat":
      return (
        <svg viewBox="0 0 120 140" className={className} aria-label="Women's coat illustration">
          <rect x="6" y="6" width="108" height="128" rx="10" fill="#F8F3EB" />
          {body('M38 34 L20 44 L24 96 L38 90', '#FAF7F2')}
          {body('M82 34 L100 44 L96 96 L82 90', '#FAF7F2')}
          {body('M42 32 Q60 24 78 32 L84 118 Q60 126 36 118 Z', '#FAF7F2')}
          <path d="M50 30 L60 54 L70 30" stroke="#A46B48" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="38" y="72" width="44" height="6" rx="3" fill="#C9A15C" />
          <circle cx="60" cy="88" r="1.8" fill="#A46B48" /><circle cx="60" cy="100" r="1.8" fill="#A46B48" />
        </svg>
      );
    case 'Dress':
    case 'Wedding Gown':
    case 'Evening Gown':
      return (
        <svg viewBox="0 0 120 140" className={className} aria-label="Evening gown illustration">
          <rect x="6" y="6" width="108" height="128" rx="10" fill="#F8F3EB" />
          {body('M46 30 Q60 24 74 30 L78 70 Q92 110 84 128 Q60 136 36 128 Q28 110 42 70 Z', '#FDF0ED')}
          <path d="M48 30 L46 20 M72 30 L74 20" stroke="#A46B48" strokeWidth="2" strokeLinecap="round" />
          <path d="M44 68 Q60 74 76 68" stroke="#A46B48" strokeWidth="1.8" fill="none" />
          <path d="M52 84 Q60 88 68 84 M48 100 Q60 106 72 100" stroke="#C9A15C" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </svg>
      );
    case 'Polo Shirt':
    case 'Long Sleeve Polo':
    case 'School Uniform':
    case 'PE Uniform':
    case 'Sports Jersey':
    case 'Scrub Suit':
    case 'Chef Uniform':
    case 'Corporate Uniform':
    case 'Department Uniform':
    case 'School Uniform Set':
      return (
        <svg viewBox="0 0 120 140" className={className} aria-label="School uniform set illustration">
          <rect x="6" y="6" width="108" height="128" rx="10" fill="#F8F3EB" />
          {body('M40 30 L60 38 L80 30 L82 78 L38 78 Z', '#FAF7F2')}
          <path d="M52 28 L60 40 L68 28" stroke="#4E7357" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M60 40 L56 48 L60 70 L64 48 Z" fill="#8A6618" />
          {body('M40 82 L80 82 L86 118 L34 118 Z', '#E8DFD3')}
          <path d="M50 84 V116 M60 84 V118 M70 84 V116" stroke="#4E7357" strokeWidth="1.2" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 120 140" className={className} aria-label="Custom garment illustration">
          <rect x="6" y="6" width="108" height="128" rx="10" fill="#F8F3EB" />
          {body('M44 34 Q60 26 76 34 L80 70 Q76 92 60 94 Q44 92 40 70 Z', '#FAF7F2')}
          <path d="M54 26 Q60 22 66 26" {...line} />
          <path d="M60 94 V124 M46 128 H74" stroke="#8C6F3E" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M28 58 Q60 76 92 58" stroke="#C9A15C" strokeWidth="1.6" strokeDasharray="4 3" fill="none" strokeLinecap="round" />
        </svg>
      );
  }
}

