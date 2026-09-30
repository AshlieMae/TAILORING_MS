import { useEffect, useState } from 'react';
import type { ComponentType, FormEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  ArrowRight,
  MapPin,
  Phone,
  Mail,
  Clock,
  Navigation,
  LogIn,
  Scissors,
  Ruler,
  Shirt,
  Sparkles,
  Check,
  ChevronLeft,
  ChevronRight,
  Camera,
  Copy,
  Building2,
  Users,
  CalendarClock,
  Store,
  BadgeCheck,
} from 'lucide-react';

/* ---------------------------------------------------------------------------
   LANDING PAGE — "The Walk-in Atelier"
   Customer-facing redesign for a walk-in tailoring atelier.

   Palette  Deep Ink #0B1220 · Warm Paper #F8F5EF · Brass Gold #C8A46A · Soft Charcoal #2B2B2B
   Type     Fraunces (display serif) + Inter (body/UI) + IBM Plex Mono (labels).
            All three are already loaded globally by src/index.css, so this page
            adds no extra font requests.
   Imagery  Real atelier photography in /public/landing/*.jpg (see IMAGE NOTES).

   IMAGE NOTES — SERVICES and GALLERY below point at files in public/landing.
   To swap in your own studio photography, replace those files, or change the
   `image` values in SERVICES / GALLERY. Nothing else needs to change.
--------------------------------------------------------------------------- */

const BUSINESS = {
  name: "Ashlie's Tailor",
  street: '118 Thread Street, Suite 4',
  city: 'Cebu City, Central Visayas',
  addressOneLine: '118 Thread Street, Suite 4, Cebu City',
  phoneDisplay: '+63 917 123 4567',
  phoneHref: 'tel:+639171234567',
  email: 'hello@ashlietailor.com',
  emailHref: 'mailto:hello@ashlietailor.com',
  hours: 'Monday – Saturday · 9:00 AM – 6:00 PM',
  closedNote: 'Sunday · Closed',
};

/* Working location links — these open the visitor's own maps app / browser. */
const MAPS_DIRECTIONS = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
  BUSINESS.addressOneLine,
)}`;
const MAPS_PLACE = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  BUSINESS.addressOneLine,
)}`;

/* Injected once — page-scoped helpers Tailwind can't express inline. */
const GLOBAL_STYLE = `
section[id] { scroll-margin-top: 88px; }
@keyframes atelierRise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
@keyframes atelierFade { from { opacity: 0; } to { opacity: 1; } }
.atelier-rise { animation: atelierRise 720ms cubic-bezier(0.22, 1, 0.36, 1) both; }
.atelier-fade { animation: atelierFade 420ms ease-out both; }
.atelier-grain {
  background-image:
    repeating-linear-gradient(45deg, rgba(11,18,32,0.05) 0px, rgba(11,18,32,0.05) 1px, transparent 1px, transparent 9px),
    repeating-linear-gradient(-45deg, rgba(11,18,32,0.05) 0px, rgba(11,18,32,0.05) 1px, transparent 1px, transparent 9px);
}
@media (prefers-reduced-motion: reduce) {
  .atelier-rise, .atelier-fade { animation: none !important; }
  html { scroll-behavior: auto; }
}
`;

/* Shared button treatments, so every CTA on the page stays consistent. */
const BTN_INK =
  'inline-flex items-center justify-center gap-2.5 rounded-full bg-[#0B1220] px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#F8F5EF] transition-all duration-300 hover:bg-[#C8A46A] hover:text-[#0B1220] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8A46A]';
const BTN_GOLD =
  'inline-flex items-center justify-center gap-2.5 rounded-full bg-[#C8A46A] px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0B1220] transition-all duration-300 hover:bg-[#b8924f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1220]';
const BTN_GHOST =
  'inline-flex items-center justify-center gap-2.5 rounded-full border border-[#0B1220]/25 px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0B1220] transition-all duration-300 hover:border-[#0B1220] hover:bg-[#0B1220] hover:text-[#F8F5EF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8A46A]';
const BTN_GHOST_LIGHT =
  'inline-flex items-center justify-center gap-2.5 rounded-full border border-[#F8F5EF]/35 px-6 py-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#F8F5EF] transition-all duration-300 hover:border-[#C8A46A] hover:bg-[#C8A46A] hover:text-[#0B1220] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8A46A]';

const MONO = "'IBM Plex Mono', monospace";
const SERIF = "'Fraunces', Georgia, serif";

/* Micro label with a brass punch-hole — the atelier's ticket/tag signature. */
function Label({
  children,
  className = '',
  dark = false,
}: {
  children: ReactNode;
  className?: string;
  dark?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 text-[10px] uppercase tracking-[0.28em] ${
        dark ? 'text-[#C8A46A]' : 'text-[#8a6d38]'
      } ${className}`}
      style={{ fontFamily: MONO }}
    >
      <span className="relative inline-block h-3 w-3 shrink-0 rounded-full border border-[#C8A46A]">
        <span className="absolute inset-[3px] rounded-full bg-[#C8A46A]" />
      </span>
      {children}
    </span>
  );
}
type IconType = ComponentType<{ className?: string; strokeWidth?: number }>;

const NAV_ITEMS = [
  { href: '#walk-ins', label: 'Walk-ins' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#services', label: 'Services' },
  { href: '#gallery', label: 'Gallery' },
  { href: '#visit', label: 'Visit us' },
];

/* The four things a walk-in customer actually wants to know up front. */
const QUICK_FACTS: { icon: IconType; title: string; body: string }[] = [
  {
    icon: CalendarClock,
    title: 'No appointment needed',
    body: 'Walk in any time we are open — a tailor will attend to you, not a queue machine.',
  },
  {
    icon: Ruler,
    title: 'Measured properly',
    body: 'Your measurements are taken in person and saved on your client profile.',
  },
  {
    icon: Sparkles,
    title: 'Fit checked with you',
    body: 'The finished piece is fitted on you before it leaves the atelier.',
  },
  {
    icon: Store,
    title: 'Talk to a tailor, not a form',
    body: 'Bring the garment, the fabric, or just the idea and we will advise.',
  },
];

const SERVICES: {
  icon: IconType;
  title: string;
  body: string;
  image: string;
  alt: string;
}[] = [
  {
    icon: Shirt,
    title: 'Custom Suits & Blazers',
    body: 'Measured, cut and finished for your frame — for the office, a wedding, or everyday wear.',
    image: '/landing/hero-tailor-measuring.jpg',
    alt: 'Tailor taking a client’s back measurement with a tape measure',
  },
  {
    icon: Sparkles,
    title: 'Dresses & Gowns',
    body: 'Occasion pieces built from your measurements, from the first fitting to the final press.',
    image: '/landing/gowns&dress.jpg',
    alt: 'Tailor working at her bench in the atelier',
  },
  {
    icon: Scissors,
    title: 'Alterations & Repairs',
    body: 'Hems, tapering, sleeves, seams and zips — bring the garment exactly as it is.',
    image: '/landing/hands-edge-finishing.jpg',
    alt: 'Hands finishing the edge of a garment',
  },
  {
    icon: Users,
    title: 'Uniforms & Workwear',
    body: 'School, office and team uniforms cut to the same standard, batch after batch.',
    image: '/landing/uniforms.jpg',
    alt: 'Tailoring workshop detail',
  },
  {
    icon: Ruler,
    title: 'Fabric & Fit Consultation',
    body: 'Not sure what a piece needs? We read the fabric, the drape and the fit, then tell you honestly.',
    image: '/landing/detail-thread-library.jpg',
    alt: 'Wooden drawers filled with reels of thread',
  },
  {
    icon: CalendarClock,
    title: 'Wedding Parties & Events',
    body: 'Bring the whole party in to be measured together and we will keep every profile on file.',
    image: '/landing/atelier-shelves.jpg',
    alt: 'Shelves inside the tailoring atelier',
  },
];

/* The walk-in journey, in five steps. */
const WALK_IN_STEPS: { icon: IconType; step: string; title: string; body: string }[] = [
  {
    icon: Store,
    step: '01',
    title: 'Arrive',
    body: 'Walk in during open hours. No booking, no waiting list — you will be seen.',
  },
  {
    icon: Users,
    step: '02',
    title: 'Consult',
    body: 'Tell us what the piece needs: a new garment, an alteration, or uniforms for a team.',
  },
  {
    icon: Ruler,
    step: '03',
    title: 'Measure',
    body: 'We take your measurements and record them on your client profile for next time.',
  },
  {
    icon: Scissors,
    step: '04',
    title: 'Craft',
    body: 'Your garment is cut, sewn and pressed in our own atelier — nothing is sent away.',
  },
  {
    icon: Check,
    step: '05',
    title: 'Fit & collect',
    body: 'Try it on with us and we will fine-tune the fit until it sits exactly right.',
  },
];

const REASONS: { icon: IconType; title: string; body: string }[] = [
  {
    icon: Building2,
    title: 'Master tailors in house',
    body: 'Every piece is measured, cut and finished by our own tailors — never outsourced.',
  },
  {
    icon: BadgeCheck,
    title: 'Fit checked before you leave',
    body: 'We do not hand a garment over until it sits right on you, and we say so when it does.',
  },
  {
    icon: Users,
    title: 'Your measurements on file',
    body: 'Regular clients are measured once — repeat orders and uniform batches start from your saved profile.',
  },
  {
    icon: Sparkles,
    title: 'Honest advice on fabric and care',
    body: 'We tell you what a garment genuinely needs, and when it does not need work at all.',
  },
];

const GALLERY: { src: string; alt: string; caption: string }[] = [
  {
    src: '/landing/hero-tailor-measuring.jpg',
    alt: 'Tailor measuring a client’s back with a yellow tape measure',
    caption: 'Taking the measure',
  },
  {
    src: '/landing/tailor-at-her-bench.jpg',
    alt: 'Tailor at work at her bench',
    caption: 'At the bench',
  },
  {
    src: '/landing/detail-machine-needle.jpg',
    alt: 'Close-up of a sewing machine needle and thread',
    caption: 'Needle and thread',
  },
  {
    src: '/landing/detail-thread-library.jpg',
    alt: 'Wooden drawers of coloured thread reels',
    caption: 'The thread library',
  },
  {
    src: '/landing/atelier-shelves.jpg',
    alt: 'Shelves in the tailoring atelier',
    caption: 'On the shelves',
  },
  {
    src: '/landing/detail-hand-crank-machine.jpg',
    alt: 'Vintage hand-crank sewing machine',
    caption: 'Hand-cranked heritage',
  },
  {
    src: '/landing/tailor-sewing-cloth.jpg',
    alt: 'Tailor sewing cloth at a machine',
    caption: 'Sewing the seam',
  },
  {
    src: '/landing/hands-edge-finishing.jpg',
    alt: 'Hands finishing the edge of a garment',
    caption: 'Finishing the edge',
  },
  {
    src: '/landing/atelier-workshop-detail.jpg',
    alt: 'Workshop detail inside the atelier',
    caption: 'Workshop detail',
  },
  {
    src: '/landing/shopfront-counter.jpg',
    alt: 'The shopfront and counter of the tailoring shop',
    caption: 'The counter',
  },
];
export default function LandingPage() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#F8F5EF] text-[#0B1220] antialiased selection:bg-[#C8A46A] selection:text-[#0B1220]">
      <style>{GLOBAL_STYLE}</style>

      {/* woven paper grain */}
      <div className="atelier-grain pointer-events-none fixed inset-0 z-0 opacity-70" aria-hidden="true" />

      <div className="relative z-10">
        {/* ---------- announcement strip ---------- */}
        <div className="bg-[#0B1220] text-[#F8F5EF]">
          <div
            className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-center gap-x-7 gap-y-1.5 px-5 py-2.5 text-[9.5px] uppercase tracking-[0.2em] sm:justify-between sm:px-8 sm:text-[10px]"
            style={{ fontFamily: MONO }}
          >
            <span className="inline-flex items-center gap-2">
              <Store className="h-3 w-3 text-[#C8A46A]" strokeWidth={1.7} />
              Walk-ins welcome — no appointment
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock className="h-3 w-3 text-[#C8A46A]" strokeWidth={1.7} />
              {BUSINESS.hours}
            </span>
            <a href={BUSINESS.phoneHref} className="inline-flex items-center gap-2 transition-colors hover:text-[#C8A46A]">
              <Phone className="h-3 w-3 text-[#C8A46A]" strokeWidth={1.7} />
              {BUSINESS.phoneDisplay}
            </a>
          </div>
        </div>

        {/* ---------- header ---------- */}
        <header className="sticky top-0 z-50 border-b border-[#0B1220]/10 bg-[#F8F5EF]/92 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
            <a href="#home" className="flex min-w-0 items-center gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#C8A46A] text-[11px] font-semibold text-[#8a6d38]"
                style={{ fontFamily: MONO }}
              >
                AT
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[15px] leading-tight" style={{ fontFamily: SERIF, fontWeight: 600 }}>
                  {BUSINESS.name}
                </span>
                <span className="block text-[9px] uppercase tracking-[0.24em] text-[#8a6d38]" style={{ fontFamily: MONO }}>
                  Walk-in atelier · Cebu City
                </span>
              </span>
            </a>

            <nav className="hidden items-center gap-7 lg:flex">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="text-[11px] uppercase tracking-[0.2em] text-[#2B2B2B] transition-colors hover:text-[#0B1220]"
                  style={{ fontFamily: MONO }}
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-2.5">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-2 rounded-full bg-[#0B1220] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#F8F5EF] transition-all duration-300 hover:bg-[#C8A46A] hover:text-[#0B1220] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8A46A]"
              >
                <LogIn className="h-3.5 w-3.5 shrink-0" strokeWidth={1.7} />
                <span className="hidden sm:inline">Client login</span>
                <span className="sm:hidden">Login</span>
              </button>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#0B1220]/20 transition-colors hover:border-[#0B1220] lg:hidden"
              >
                {menuOpen ? <X className="h-4 w-4" strokeWidth={1.7} /> : <Menu className="h-4 w-4" strokeWidth={1.7} />}
              </button>
            </div>
          </div>

          {menuOpen && (
            <nav className="atelier-fade border-t border-[#0B1220]/10 bg-[#FFFDF9] lg:hidden">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between border-b border-[#0B1220]/8 px-5 py-4 text-[11px] uppercase tracking-[0.2em] text-[#2B2B2B] last:border-b-0 sm:px-8"
                  style={{ fontFamily: MONO }}
                >
                  {item.label}
                  <ArrowRight className="h-3.5 w-3.5 text-[#C8A46A]" strokeWidth={1.7} />
                </a>
              ))}
            </nav>
          )}
        </header>
        <main>
          {/* ---------- hero ---------- */}
          <section id="home" className="mx-auto w-full max-w-[1400px] px-5 pb-14 pt-12 sm:px-8 lg:pb-20 lg:pt-16">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-12 xl:gap-16">
              <div className="atelier-rise lg:col-span-6 lg:self-center xl:col-span-5">
                <Label>Walk-in tailoring · Thread Street</Label>
                <h1
                  className="mt-6 text-[2.35rem] leading-[1.05] tracking-[-0.015em] sm:text-[3.1rem] lg:text-[3.6rem] xl:text-[4.15rem]"
                  style={{ fontFamily: SERIF, fontWeight: 600 }}
                >
                  Walk-in tailoring,
                  <br />
                  <span className="italic text-[#8a6d38]">made to fit.</span>
                </h1>
                <p className="mt-6 max-w-xl text-base leading-relaxed text-[#2B2B2B] sm:text-[1.0625rem]">
                  Step in with your fabric, your measurements, or a garment that never quite sat right. Our
                  tailors measure, cut and finish it here in the atelier — no appointment needed.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <a href={MAPS_DIRECTIONS} target="_blank" rel="noreferrer" className={BTN_INK}>
                    <Navigation className="h-4 w-4" strokeWidth={1.7} />
                    Get directions
                  </a>
                  <a href={BUSINESS.phoneHref} className={BTN_GHOST}>
                    <Phone className="h-4 w-4" strokeWidth={1.7} />
                    Call the atelier
                  </a>
                </div>

                <ul className="mt-9 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {[
                    'Walk-ins welcome all day',
                    'Fitted on you before you leave',
                    'Your measurements kept on file',
                    'Honest advice on fabric and care',
                  ].map((point) => (
                    <li key={point} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-[#2B2B2B]">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8a6d38]" strokeWidth={2.1} />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="lg:col-span-6 xl:col-span-7">
                <div className="relative overflow-hidden rounded-sm border border-[#0B1220]/10 shadow-[0_30px_70px_-32px_rgba(11,18,32,0.55)]">
                  <img
                    src="/landing/hero-tailor-measuring.jpg"
                    alt="A tailor measuring a client’s back with a tape measure in the atelier"
                    className="h-[320px] w-full object-cover sm:h-[430px] lg:h-[515px]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B1220]/75 via-[#0B1220]/5 to-transparent" />
                  <div className="pointer-events-none absolute inset-3 border border-[#F8F5EF]/25" />
                  <div className="absolute inset-x-5 bottom-5 sm:inset-x-7 sm:bottom-7">
                    <p
                      className="text-[9.5px] uppercase tracking-[0.26em] text-[#C8A46A]"
                      style={{ fontFamily: MONO }}
                    >
                      In the atelier
                    </p>
                    <p
                      className="mt-1.5 max-w-md text-lg leading-snug text-[#F8F5EF] sm:text-xl"
                      style={{ fontFamily: SERIF, fontWeight: 500 }}
                    >
                      Every garment begins with a measurement taken by hand.
                    </p>
                  </div>
                </div>
                {/* walk-ins welcome card */}
                <div className="mt-4 grid grid-cols-1 divide-y divide-[#0B1220]/10 overflow-hidden rounded-sm border border-[#0B1220]/10 bg-[#FFFDF9] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                  <div className="flex items-start gap-3 p-5">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#8a6d38]" strokeWidth={1.7} />
                    <div>
                      <p className="text-[9.5px] uppercase tracking-[0.22em] text-[#8a6d38]" style={{ fontFamily: MONO }}>
                        Walk in
                      </p>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-[#2B2B2B]">
                        {BUSINESS.hours}
                        <br />
                        {BUSINESS.closedNote}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-5">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#8a6d38]" strokeWidth={1.7} />
                    <div>
                      <p className="text-[9.5px] uppercase tracking-[0.22em] text-[#8a6d38]" style={{ fontFamily: MONO }}>
                        Atelier
                      </p>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-[#2B2B2B]">
                        {BUSINESS.street}
                        <br />
                        {BUSINESS.city}
                      </p>
                      <a
                        href={MAPS_PLACE}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-[11px] text-[#8a6d38] underline decoration-[#C8A46A] underline-offset-4 transition-colors hover:text-[#0B1220]"
                      >
                        View on the map
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-5">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[#8a6d38]" strokeWidth={1.7} />
                    <div className="min-w-0">
                      <p className="text-[9.5px] uppercase tracking-[0.22em] text-[#8a6d38]" style={{ fontFamily: MONO }}>
                        Talk to us
                      </p>
                      <a
                        href={BUSINESS.phoneHref}
                        className="mt-1.5 block truncate text-[13px] text-[#2B2B2B] transition-colors hover:text-[#0B1220]"
                      >
                        {BUSINESS.phoneDisplay}
                      </a>
                      <a
                        href={BUSINESS.emailHref}
                        className="mt-0.5 block truncate text-[13px] text-[#2B2B2B] transition-colors hover:text-[#0B1220]"
                      >
                        {BUSINESS.email}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
          {/* ---------- walk-ins ---------- */}
          <section id="walk-ins" className="border-y border-[#0B1220]/10 bg-[#FFFDF9]">
            <div className="mx-auto w-full max-w-[1400px] px-5 py-14 sm:px-8 lg:py-20">
              <div className="max-w-3xl">
                <Label>Walk-ins welcome</Label>
                <h2
                  className="mt-5 text-[1.75rem] leading-tight tracking-[-0.01em] sm:text-[2.25rem] lg:text-[2.75rem]"
                  style={{ fontFamily: SERIF, fontWeight: 600 }}
                >
                  Come as you are — <span className="italic text-[#8a6d38]">we will take it from here.</span>
                </h2>
                <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-[#2B2B2B] sm:text-base">
                  No booking form, no call centre. Walk into the atelier during open hours with a garment, a
                  length of fabric, or a measurement you would like checked.
                </p>
              </div>

              <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-sm border border-[#0B1220]/10 bg-[#0B1220]/10 sm:grid-cols-2 xl:grid-cols-4">
                {QUICK_FACTS.map(({ icon: FactIcon, title, body }) => (
                  <div key={title} className="bg-[#F8F5EF] p-6">
                    <FactIcon className="h-5 w-5 text-[#8a6d38]" strokeWidth={1.6} />
                    <h3 className="mt-4 text-[17px] leading-snug" style={{ fontFamily: SERIF, fontWeight: 600 }}>
                      {title}
                    </h3>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-[#2B2B2B]">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ---------- how walk-ins work ---------- */}
          <section id="how-it-works" className="bg-[#0B1220] text-[#F8F5EF]">
            <div className="mx-auto w-full max-w-[1400px] px-5 py-16 sm:px-8 lg:py-24">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <Label dark>Five steps · start to finish</Label>
                  <h2
                    className="mt-5 text-[1.75rem] leading-tight sm:text-[2.25rem] lg:text-[2.75rem]"
                    style={{ fontFamily: SERIF, fontWeight: 600 }}
                  >
                    How a walk-in actually goes
                  </h2>
                </div>
                <p className="max-w-md text-[14px] leading-relaxed text-[#F8F5EF]/70">
                  The same routine for a single hem or a full uniform batch — measured, recorded and finished
                  by the people you meet at the counter.
                </p>
              </div>

              <div className="mt-14 grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
                {WALK_IN_STEPS.map(({ icon: StepIcon, step, title, body }) => (
                  <div key={step} className="relative">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#C8A46A]/60 text-[11px] text-[#C8A46A]"
                        style={{ fontFamily: MONO }}
                      >
                        {step}
                      </span>
                      <span
                        className="hidden h-px flex-1 bg-gradient-to-r from-[#C8A46A]/45 to-transparent lg:block"
                        aria-hidden="true"
                      />
                    </div>
                    <StepIcon className="mt-6 h-5 w-5 text-[#C8A46A]" strokeWidth={1.6} />
                    <h3 className="mt-3 text-xl" style={{ fontFamily: SERIF, fontWeight: 500 }}>
                      {title}
                    </h3>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-[#F8F5EF]/70">{body}</p>
                  </div>
                ))}
              </div>

              <div className="mt-14 flex flex-wrap items-center gap-3 border-t border-[#F8F5EF]/12 pt-10">
                <a href={MAPS_DIRECTIONS} target="_blank" rel="noreferrer" className={BTN_GOLD}>
                  <Navigation className="h-4 w-4" strokeWidth={1.7} />
                  Get directions
                </a>
                <a href={BUSINESS.phoneHref} className={BTN_GHOST_LIGHT}>
                  <Phone className="h-4 w-4" strokeWidth={1.7} />
                  {BUSINESS.phoneDisplay}
                </a>
                <span className="text-[11px] uppercase tracking-[0.2em] text-[#F8F5EF]/55" style={{ fontFamily: MONO }}>
                  Or just walk in — {BUSINESS.hours}
                </span>
              </div>
            </div>
          </section>
          {/* ---------- services ---------- */}
          <section id="services" className="mx-auto w-full max-w-[1400px] px-5 py-16 sm:px-8 lg:py-24">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <Label>What we make and mend</Label>
                <h2
                  className="mt-5 text-[1.75rem] leading-tight tracking-[-0.01em] sm:text-[2.25rem] lg:text-[2.75rem]"
                  style={{ fontFamily: SERIF, fontWeight: 600 }}
                >
                  Bring the garment — <span className="italic text-[#8a6d38]">we will fit the occasion.</span>
                </h2>
              </div>
              <p className="max-w-md text-[14px] leading-relaxed text-[#2B2B2B]">
                Everything below can be started at the counter. If you are not sure which one you need, walk in
                with the piece and we will tell you honestly.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {SERVICES.map(({ icon: ServiceIcon, title, body, image, alt }) => (
                <article
                  key={title}
                  className="group overflow-hidden rounded-sm border border-[#0B1220]/10 bg-[#FFFDF9] transition-all duration-500 hover:-translate-y-1 hover:border-[#C8A46A]/60 hover:shadow-[0_26px_55px_-32px_rgba(11,18,32,0.6)]"
                >
                  <div className="relative h-44 overflow-hidden sm:h-48">
                    <img
                      src={image}
                      alt={alt}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B1220]/50 via-transparent to-transparent" />
                    <span className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-[#F8F5EF]/90 text-[#8a6d38] backdrop-blur-sm">
                      <ServiceIcon className="h-4 w-4" strokeWidth={1.7} />
                    </span>
                  </div>
                  <div className="p-6">
                    <h3 className="text-[19px] leading-snug" style={{ fontFamily: SERIF, fontWeight: 600 }}>
                      {title}
                    </h3>
                    <p className="mt-2.5 text-[13.5px] leading-relaxed text-[#2B2B2B]">{body}</p>
                    <p
                      className="mt-5 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#8a6d38]"
                      style={{ fontFamily: MONO }}
                    >
                      <Scissors className="h-3 w-3" strokeWidth={2} />
                      Available to walk-ins
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
          {/* ---------- why choose us + trust statement ---------- */}
          <section className="border-y border-[#0B1220]/10 bg-[#FFFDF9]">
            <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-12 px-5 py-16 sm:px-8 lg:grid-cols-12 lg:gap-16 lg:py-24">
              <div className="lg:col-span-5">
                <Label>Why clients keep coming back</Label>
                <h2
                  className="mt-5 text-[1.75rem] leading-tight sm:text-[2.25rem] lg:text-[2.4rem]"
                  style={{ fontFamily: SERIF, fontWeight: 600 }}
                >
                  Old-fashioned standards,
                  <br />
                  <span className="italic text-[#8a6d38]">kept properly.</span>
                </h2>
                <p className="mt-5 text-[15px] leading-relaxed text-[#2B2B2B]">
                  We are a small atelier, and we like it that way. Fewer pieces, all of them measured on the
                  person who will wear them.
                </p>

                <div className="mt-8 rounded-sm border border-[#C8A46A]/45 bg-[#F8F5EF] p-6">
                  <BadgeCheck className="h-5 w-5 text-[#8a6d38]" strokeWidth={1.7} />
                  <p
                    className="mt-4 text-[10px] uppercase tracking-[0.24em] text-[#8a6d38]"
                    style={{ fontFamily: MONO }}
                  >
                    What you can expect
                  </p>
                  <p className="mt-2 text-[14px] leading-relaxed text-[#2B2B2B]">
                    A tailor attends to you when you walk in. Measurements are taken in person and written down
                    accurately. Your finished piece is fitted on you before it leaves the atelier, and we will
                    tell you plainly when a garment does not need work at all.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-px overflow-hidden rounded-sm border border-[#0B1220]/10 bg-[#0B1220]/10 sm:grid-cols-2 lg:col-span-7 lg:self-start">
                {REASONS.map(({ icon: ReasonIcon, title, body }) => (
                  <div key={title} className="bg-[#F8F5EF] p-6 sm:p-7">
                    <ReasonIcon className="h-5 w-5 text-[#8a6d38]" strokeWidth={1.6} />
                    <h3 className="mt-4 text-[17px] leading-snug" style={{ fontFamily: SERIF, fontWeight: 600 }}>
                      {title}
                    </h3>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-[#2B2B2B]">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ---------- gallery ---------- */}
          <Gallery />
          <VisitSection />
        </main>

        <SiteFooter onClientLogin={() => navigate('/login')} />
      </div>
    </div>
  );
}
/* ---------------------------------------------------------------------------
   GALLERY — masonry columns with a keyboard-accessible lightbox.
--------------------------------------------------------------------------- */
function Gallery() {
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    if (active === null) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActive(null);
      if (event.key === 'ArrowRight') setActive((i) => (i === null ? i : (i + 1) % GALLERY.length));
      if (event.key === 'ArrowLeft') setActive((i) => (i === null ? i : (i - 1 + GALLERY.length) % GALLERY.length));
    };

    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [active]);

  const activeItem = active === null ? null : GALLERY[active];

  const step = (delta: number) =>
    setActive((i) => (i === null ? i : (i + delta + GALLERY.length) % GALLERY.length));

  return (
    <section id="gallery" className="mx-auto w-full max-w-[1400px] px-5 py-16 sm:px-8 lg:py-24">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <Label>Inside the atelier</Label>
          <h2
            className="mt-5 text-[1.75rem] leading-tight sm:text-[2.25rem] lg:text-[2.75rem]"
            style={{ fontFamily: SERIF, fontWeight: 600 }}
          >
            A look at where your garment gets made
          </h2>
        </div>
        <p className="max-w-md text-[14px] leading-relaxed text-[#2B2B2B]">
          Photographs from the workroom, the fabric shelves and the counter. Open any image to see it larger.
        </p>
      </div>

      <div className="mt-12 gap-4 sm:columns-2 lg:columns-3">
        {GALLERY.map((item, index) => (
          <button
            key={item.src}
            type="button"
            onClick={() => setActive(index)}
            aria-label={`Open larger image: ${item.caption}`}
            className="group relative mb-4 block w-full break-inside-avoid overflow-hidden rounded-sm border border-[#0B1220]/10 bg-[#FFFDF9] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8A46A]"
          >
            <img
              src={item.src}
              alt={item.alt}
              loading="lazy"
              className="w-full transition-transform duration-700 ease-out group-hover:scale-[1.05]"
            />
            <span
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0B1220]/70 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              aria-hidden="true"
            />
            <span
              className="pointer-events-none absolute inset-x-4 bottom-3 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.2em] text-[#F8F5EF] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              style={{ fontFamily: MONO }}
            >
              {item.caption}
              <Camera className="h-3.5 w-3.5 shrink-0" strokeWidth={1.7} />
            </span>
          </button>
        ))}
      </div>
      {activeItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={activeItem.caption}
          className="atelier-fade fixed inset-0 z-[60] flex flex-col bg-[#0B1220]/95 px-4 py-5 sm:px-8"
        >
          <button
            type="button"
            onClick={() => setActive(null)}
            aria-label="Close image"
            className="absolute inset-0 cursor-zoom-out"
          />
          <div className="relative flex items-center justify-between gap-4 text-[#F8F5EF]">
            <p className="text-[10px] uppercase tracking-[0.24em]" style={{ fontFamily: MONO }}>
              {activeItem.caption}
            </p>
            <button
              type="button"
              onClick={() => setActive(null)}
              aria-label="Close image"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#F8F5EF]/30 transition-colors hover:border-[#C8A46A] hover:text-[#C8A46A]"
            >
              <X className="h-4 w-4" strokeWidth={1.7} />
            </button>
          </div>

          <div className="relative mt-4 flex min-h-0 flex-1 items-center justify-center gap-2 sm:gap-5">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous image"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#F8F5EF]/30 text-[#F8F5EF] transition-colors hover:border-[#C8A46A] hover:text-[#C8A46A]"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={1.7} />
            </button>

            <img
              src={activeItem.src}
              alt={activeItem.alt}
              className="max-h-full w-auto max-w-full rounded-sm object-contain"
            />

            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next image"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#F8F5EF]/30 text-[#F8F5EF] transition-colors hover:border-[#C8A46A] hover:text-[#C8A46A]"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={1.7} />
            </button>
          </div>

          <p
            className="relative mt-3 text-center text-[10px] uppercase tracking-[0.2em] text-[#F8F5EF]/55"
            style={{ fontFamily: MONO }}
          >
            Use ← → to browse · Esc to close
          </p>
        </div>
      )}

    </section>
  );
}
/* ---------------------------------------------------------------------------
   VISIT — address, working call / directions / email actions and a note form.
   The form composes a pre-filled email in the visitor's own mail app, so the
   page stays fully static while every action still does something real.
--------------------------------------------------------------------------- */
function VisitSection() {
  const [form, setForm] = useState({ name: '', contact: '', need: 'A custom garment', message: '' });
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);

  const mailtoHref = `mailto:${BUSINESS.email}?subject=${encodeURIComponent(
    `Atelier enquiry — ${form.need}`,
  )}&body=${encodeURIComponent(
    [
      `Name: ${form.name}`,
      `Phone or email: ${form.contact}`,
      `Looking for: ${form.need}`,
      '',
      form.message,
    ].join('\n'),
  )}`;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    /* Opens the visitor's mail application with the note already filled in. */
    window.location.href = mailtoHref;
    setSent(true);
  }

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(BUSINESS.addressOneLine);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section id="visit" className="border-t border-[#0B1220]/10 bg-[#FFFDF9]">
      <div className="mx-auto w-full max-w-[1400px] px-5 py-16 sm:px-8 lg:py-24">
        <div className="max-w-2xl">
          <Label>Visit us</Label>
          <h2
            className="mt-5 text-[1.75rem] leading-tight sm:text-[2.25rem] lg:text-[2.75rem]"
            style={{ fontFamily: SERIF, fontWeight: 600 }}
          >
            Find the shop, or <span className="italic text-[#8a6d38]">send us a note.</span>
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-[#2B2B2B]">
            Walking in is the fastest way to talk to a tailor. If you would rather ask first, the details
            below reach the atelier directly.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="rounded-sm bg-[#0B1220] p-7 text-[#F8F5EF] sm:p-9 lg:col-span-5">
            <p className="text-[10px] uppercase tracking-[0.24em] text-[#C8A46A]" style={{ fontFamily: MONO }}>
              The atelier
            </p>

            <div className="mt-7 space-y-7">
              <div className="flex items-start gap-4">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#C8A46A]" strokeWidth={1.7} />
                <div>
                  <p className="text-[13px] leading-relaxed">
                    {BUSINESS.street}
                    <br />
                    {BUSINESS.city}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2.5">
                    <a href={MAPS_DIRECTIONS} target="_blank" rel="noreferrer" className={BTN_GOLD}>
                      <Navigation className="h-3.5 w-3.5" strokeWidth={1.8} />
                      Get directions
                    </a>
                    <button
                      type="button"
                      onClick={copyAddress}
                      className="inline-flex items-center gap-2 rounded-full border border-[#F8F5EF]/35 px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors hover:border-[#C8A46A] hover:text-[#C8A46A]"
                    >
                      <Copy className="h-3.5 w-3.5" strokeWidth={1.8} />
                      {copied ? 'Address copied' : 'Copy address'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[#C8A46A]" strokeWidth={1.7} />
                <div>
                  <p className="text-[9.5px] uppercase tracking-[0.22em] text-[#F8F5EF]/55" style={{ fontFamily: MONO }}>
                    Call the atelier
                  </p>
                  <a
                    href={BUSINESS.phoneHref}
                    className="mt-1 block text-[15px] transition-colors hover:text-[#C8A46A]"
                  >
                    {BUSINESS.phoneDisplay}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#C8A46A]" strokeWidth={1.7} />
                <div>
                  <p className="text-[9.5px] uppercase tracking-[0.22em] text-[#F8F5EF]/55" style={{ fontFamily: MONO }}>
                    Email
                  </p>
                  <a
                    href={BUSINESS.emailHref}
                    className="mt-1 block break-all text-[15px] transition-colors hover:text-[#C8A46A]"
                  >
                    {BUSINESS.email}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4 border-t border-[#F8F5EF]/12 pt-7">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#C8A46A]" strokeWidth={1.7} />
                <div>
                  <p className="text-[9.5px] uppercase tracking-[0.22em] text-[#F8F5EF]/55" style={{ fontFamily: MONO }}>
                    Open hours
                  </p>
                  <p className="mt-1 text-[15px]">{BUSINESS.hours}</p>
                  <p className="mt-0.5 text-[13px] text-[#F8F5EF]/60">{BUSINESS.closedNote}</p>
                </div>
              </div>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="lg:col-span-7">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <label className="block">
                <span
                  className="mb-2 block text-[10px] uppercase tracking-[0.22em] text-[#8a6d38]"
                  style={{ fontFamily: MONO }}
                >
                  Your name
                </span>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Maria Santos"
                  className="w-full rounded-sm border border-[#0B1220]/15 bg-[#F8F5EF] px-4 py-3 text-[14px] text-[#0B1220] outline-none transition-colors placeholder:text-[#9a9486] focus:border-[#C8A46A]"
                />
              </label>

              <label className="block">
                <span
                  className="mb-2 block text-[10px] uppercase tracking-[0.22em] text-[#8a6d38]"
                  style={{ fontFamily: MONO }}
                >
                  Phone or email
                </span>
                <input
                  type="text"
                  required
                  value={form.contact}
                  onChange={(event) => setForm((current) => ({ ...current, contact: event.target.value }))}
                  placeholder="+63 917 123 4567"
                  className="w-full rounded-sm border border-[#0B1220]/15 bg-[#F8F5EF] px-4 py-3 text-[14px] text-[#0B1220] outline-none transition-colors placeholder:text-[#9a9486] focus:border-[#C8A46A]"
                />
              </label>
            </div>

            <label className="mt-5 block">
              <span
                className="mb-2 block text-[10px] uppercase tracking-[0.22em] text-[#8a6d38]"
                style={{ fontFamily: MONO }}
              >
                What do you need?
              </span>
              <select
                value={form.need}
                onChange={(event) => setForm((current) => ({ ...current, need: event.target.value }))}
                className="w-full rounded-sm border border-[#0B1220]/15 bg-[#F8F5EF] px-4 py-3 text-[14px] text-[#0B1220] outline-none transition-colors focus:border-[#C8A46A]"
              >
                {[
                  'A custom garment',
                  'Alterations & repairs',
                  'Uniforms & workwear',
                  'Wedding party or event',
                  'Something else',
                ].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-5 block">
              <span
                className="mb-2 block text-[10px] uppercase tracking-[0.22em] text-[#8a6d38]"
                style={{ fontFamily: MONO }}
              >
                Your note
              </span>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                placeholder="Tell us about the piece — what it is, and how you would like it to fit."
                className="w-full resize-none rounded-sm border border-[#0B1220]/15 bg-[#F8F5EF] px-4 py-3 text-[14px] leading-relaxed text-[#0B1220] outline-none transition-colors placeholder:text-[#9a9486] focus:border-[#C8A46A]"
              />
            </label>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <button type="submit" className={BTN_INK}>
                <Mail className="h-4 w-4" strokeWidth={1.7} />
                Send message
              </button>
              <a
                href={BUSINESS.phoneHref}
                className="text-[11px] uppercase tracking-[0.2em] text-[#8a6d38] underline decoration-[#C8A46A] underline-offset-4 transition-colors hover:text-[#0B1220]"
                style={{ fontFamily: MONO }}
              >
                Or call {BUSINESS.phoneDisplay}
              </a>
            </div>

            {sent && (
              <p className="atelier-fade mt-5 rounded-sm border border-[#C8A46A]/45 bg-[#F8F5EF] px-5 py-4 text-[13px] leading-relaxed text-[#2B2B2B]">
                Your mail app should now be open with the note ready to send. If it did not open,{' '}
                <a
                  href={mailtoHref}
                  className="text-[#8a6d38] underline decoration-[#C8A46A] underline-offset-4"
                >
                  email us directly
                </a>{' '}
                or simply walk in during open hours.
              </p>
            )}

          </form>

        </div>
      </div>
    </section>
  );
}
/* ---------------------------------------------------------------------------
   FOOTER — real details only: address, phone, email, hours and section links.
--------------------------------------------------------------------------- */
function SiteFooter({ onClientLogin }: { onClientLogin: () => void }) {
  return (
    <footer className="bg-[#0B1220] text-[#F8F5EF]">
      <div className="mx-auto w-full max-w-[1400px] px-5 py-14 sm:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="flex items-center gap-3">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#C8A46A] text-[11px] font-semibold text-[#C8A46A]"
                style={{ fontFamily: MONO }}
              >
                AT
              </span>
              <span className="text-[17px]" style={{ fontFamily: SERIF, fontWeight: 600 }}>
                {BUSINESS.name}
              </span>
            </div>
            <p className="mt-5 max-w-sm text-[13.5px] leading-relaxed text-[#F8F5EF]/70">
              A walk-in tailoring atelier on Thread Street. Measured, cut and finished in house — no
              appointment required.
            </p>
            <p
              className="mt-5 text-[11px] uppercase tracking-[0.2em] text-[#F8F5EF]/55"
              style={{ fontFamily: MONO }}
            >
              {BUSINESS.hours}
              <br />
              {BUSINESS.closedNote}
            </p>
          </div>

          <div className="lg:col-span-3">
            <p className="text-[10px] uppercase tracking-[0.24em] text-[#C8A46A]" style={{ fontFamily: MONO }}>
              Explore
            </p>
            <ul className="mt-5 space-y-3">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="text-[13.5px] text-[#F8F5EF]/75 transition-colors hover:text-[#C8A46A]"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-4">
            <p className="text-[10px] uppercase tracking-[0.24em] text-[#C8A46A]" style={{ fontFamily: MONO }}>
              Reach the atelier
            </p>
            <ul className="mt-5 space-y-4">
              <li>
                <a
                  href={MAPS_PLACE}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-3 text-[13.5px] text-[#F8F5EF]/75 transition-colors hover:text-[#C8A46A]"
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#C8A46A]" strokeWidth={1.7} />
                  {BUSINESS.street}, {BUSINESS.city}
                </a>
              </li>
              <li>
                <a
                  href={BUSINESS.phoneHref}
                  className="flex items-center gap-3 text-[13.5px] text-[#F8F5EF]/75 transition-colors hover:text-[#C8A46A]"
                >
                  <Phone className="h-4 w-4 shrink-0 text-[#C8A46A]" strokeWidth={1.7} />
                  {BUSINESS.phoneDisplay}
                </a>
              </li>
              <li>
                <a
                  href={BUSINESS.emailHref}
                  className="flex items-center gap-3 break-all text-[13.5px] text-[#F8F5EF]/75 transition-colors hover:text-[#C8A46A]"
                >
                  <Mail className="h-4 w-4 shrink-0 text-[#C8A46A]" strokeWidth={1.7} />
                  {BUSINESS.email}
                </a>
              </li>
            </ul>

            <div className="mt-7 flex flex-wrap items-center gap-4">
              <a href={MAPS_DIRECTIONS} target="_blank" rel="noreferrer" className={BTN_GHOST_LIGHT}>
                <Navigation className="h-3.5 w-3.5" strokeWidth={1.8} />
                Directions
              </a>
              <button
                type="button"
                onClick={onClientLogin}
                className="text-[11px] uppercase tracking-[0.18em] text-[#F8F5EF]/70 underline decoration-[#C8A46A] underline-offset-4 transition-colors hover:text-[#C8A46A]"
                style={{ fontFamily: MONO }}
              >
                Client login
              </button>
            </div>
          </div>
        </div>

        <div
          className="mt-12 flex flex-col gap-3 border-t border-[#F8F5EF]/12 pt-7 text-[10px] uppercase tracking-[0.2em] text-[#F8F5EF]/50 sm:flex-row sm:items-center sm:justify-between"
          style={{ fontFamily: MONO }}
        >
          <span>
            © {new Date().getFullYear()} {BUSINESS.name} · Walk-in tailoring atelier
          </span>
          <span>{BUSINESS.addressOneLine}</span>
        </div>
      </div>
    </footer>
  );
}











