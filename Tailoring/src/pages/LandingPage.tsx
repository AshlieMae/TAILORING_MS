import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  ArrowRight,
  Play,
  Star,
  Quote,
  MapPin,
  Phone,
  Mail,
  Clock,
} from 'lucide-react';

/* ---------------------------------------------------------------
   DESIGN SYSTEM — "The Atelier Ticket"
   Ink espresso base, brass + thread-red accents, parchment text.
   Display serif (Newsreader) for voice, IBM Plex Mono for the
   recurring "garment tag" labels, IBM Plex Sans for body/UI.
   Signature element: a rotated spec-tag (dashed stitch border +
   punch hole) reused as eyebrows, corner marks, and footer legend.
------------------------------------------------------------------ */

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500&family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes revealMeasure {
  from { opacity: 0; transform: scaleX(0); }
  to { opacity: 1; transform: scaleX(1); }
}
@keyframes revealMeasureY {
  from { opacity: 0; transform: scaleY(0); }
  to { opacity: 1; transform: scaleY(1); }
}
`;

function Tag({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-[10px] tracking-[0.28em] uppercase text-[#C9A66B] ${className}`}
      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
    >
      <span className="relative inline-block w-3 h-3 rounded-full border border-[#C9A66B]/60">
        <span className="absolute inset-[3px] rounded-full bg-[#C9A66B]/60" />
      </span>
      {children}
    </span>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [emailSub, setEmailSub] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [isCareGuideOpen, setIsCareGuideOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [contactSent, setContactSent] = useState(false);

  function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault();
    setContactSent(true);
    setContactForm({ name: '', email: '', message: '' });
  }

  return (
    <div
      className="min-h-screen bg-[#14120D] text-[#EFE7D8] antialiased selection:bg-[#C9A66B] selection:text-[#14120D]"
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      <style>{FONT_IMPORT}</style>

      {/* faint woven-texture backdrop */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, #EFE7D8 0px, #EFE7D8 1px, transparent 1px, transparent 10px), repeating-linear-gradient(-45deg, #EFE7D8 0px, #EFE7D8 1px, transparent 1px, transparent 10px)',
        }}
      />

      {/* ---------------- NAVIGATION ---------------- */}
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/20 backdrop-blur-lg">
        <div className="w-full px-6 sm:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              className="p-1 hover:opacity-70 transition-opacity md:hidden"
              aria-label="Open menu"
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-sm border border-[#C9A66B]/70 flex items-center justify-center rotate-3"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                <span className="text-[#C9A66B] text-xs">A&T</span>
              </div>
              <div className="leading-tight" style={{ fontFamily: "'Newsreader', serif" }}>
          <div className="text-2xl lg:text-4xl tracking-[0.08em]">Ashlie's Tailor</div>
                <div
                 className="text-xs lg:text-sm tracking-[0.35em] text-[#9C8F76] uppercase"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  Garment Atelier
                </div>
              </div>
            </div>
          </div>

        <nav className="hidden md:flex items-center gap-16 text-lg tracking-[0.25em] uppercase text-[#C7BDA8] font-medium">
            <a href="#home" className="hover:text-[#EFE7D8] transition-colors">Home</a>
            <a href="#craft" className="hover:text-[#EFE7D8] transition-colors">Craft</a>
            <a href="#reviews" className="hover:text-[#EFE7D8] transition-colors">Reviews</a>
            <a href="#services" className="hover:text-[#EFE7D8] transition-colors">Services</a>
            <a href="#contact-us" className="hover:text-[#EFE7D8] transition-colors">Contact</a>
          </nav>

          <div className="flex items-center gap-6">
            
            <button
  onClick={() => navigate('/login')}
  className="px-7 py-3 rounded-full border border-[#C9A66B] bg-[#C9A66B]/10 backdrop-blur-md text-[#C9A66B] font-medium tracking-[0.2em] uppercase hover:bg-[#C9A66B] hover:text-[#14120D] transition-all duration-300"
>
  Log In
</button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden px-6 pb-5 flex flex-col gap-4 text-xs tracking-[0.2em] uppercase text-[#C7BDA8]">
            <a href="#home">Home</a>
            <a href="#craft">Craft</a>
            <a href="#reviews">Reviews</a>
            <a href="#services">Services</a>
            <a href="#contact-us">Contact</a>
          </div>
        )}
      </header>

      {/* ---------------- HERO ---------------- */}
     <section id="home" className="relative max-w-[1600px] mx-auto px-8 lg:px-16 pt-24 pb-40 min-h-[90vh] grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-6 space-y-8">
          <Tag>No. 048 — Established Care</Tag>

          <h1
         
  className="text-[3rem] sm:text-6xl lg:text-[5rem] leading-[1] tracking-tight"

          >
            Every garment <br />
            <span className="italic text-[#C9A66B]">deserves a second</span>
            <br /> life, pressed well.
          </h1>

        <p className="text-xl lg:text-2xl text-[#B8AC94] font-light max-w-xl leading-relaxed">
            Precision dry cleaning and tailoring, done at the pace of your week — not
            the pace of a factory line.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-5">
            <button
              onClick={() => navigate('/login')}
              className="group inline-flex items-center gap-3 bg-[#C9A66B] text-[#14120D] text-[11px] tracking-[0.22em] uppercase font-semibold px-6 py-4 rounded-sm hover:bg-[#dcbb85] transition-colors"
            >
              Find a location
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
            <a
              href="#craft"
              className="text-[11px] tracking-[0.22em] uppercase text-[#C7BDA8] border-b border-[#C7BDA8]/30 hover:border-[#C9A66B] hover:text-[#EFE7D8] pb-1 transition-colors"
            >
              Our craft
            </a>
          </div>
        </div>

        <div className="lg:col-span-6 relative scale-110">
          <div className="relative">
            <MeasurementDiagram />
          </div>
        </div>
      </section>

      {/* ---------------- CRAFT SECTIONS ---------------- */}
      <section id="craft" className="max-w-7xl mx-auto px-6 sm:px-8 py-10">
        <SplitFeature
          tag="Fabric"
          title="Not just cleaned — read, and cared for accordingly"
          body="Every fibre behaves differently under heat, steam, and solvent. We inspect before we clean, so wool, silk, and technical fabrics each get the treatment they were made for, not a one-size cycle."
          img="https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?q=80&w=1000&auto=format&fit=crop"
          alt="Garments on a rack"
          reverse={false}
        />
        <SplitFeature
          tag="Press"
          title="Where style meets a schedule you can trust"
          body="Drop off in the morning, wear it by evening. Our routing is built around your week, so convenience never comes at the cost of finish."
          img="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=1000&auto=format&fit=crop"
          alt="A pressed green dress"
          reverse={true}
        />
        <SplitFeature
          tag="Fit"
          title="Your wardrobe's quiet second opinion"
          body="Loose hems, tired seams, a jacket that never quite sat right — our tailors handle the small corrections that make older pieces feel new again."
          img="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=1000&auto=format&fit=crop"
          alt="Sewing machine detail"
          reverse={false}
        />
      </section>

      {/* ---------------- VIDEO BANNER ---------------- */}
      <section className="max-w-6xl mx-auto px-6 sm:px-8 py-14">
        <div className="relative w-full h-[380px] sm:h-[480px] overflow-hidden rounded-sm group">
          <img
            src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1200&auto=format&fit=crop"
            alt="Boutique rack"
            className="w-full h-full object-cover brightness-[0.55] group-hover:brightness-[0.65] transition-all duration-500"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <span
              className="text-[10px] tracking-[0.3em] uppercase text-[#C9A66B] mb-4"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              Fall Collection Care Guide
            </span>
            <button type="button" onClick={() => setIsCareGuideOpen(true)} aria-label="Play Fall Collection Care Guide" className="w-16 h-16 rounded-full border border-[#EFE7D8]/70 flex items-center justify-center hover:scale-105 hover:border-[#C9A66B] transition-all">
              <Play className="w-5 h-5 fill-current ml-1" />
            </button>
          </div>
        </div>
      </section>

      {isCareGuideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" aria-label="Close video" onClick={() => setIsCareGuideOpen(false)} className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
          <section role="dialog" aria-modal="true" aria-label="Fall Collection Care Guide video" className="relative w-full max-w-4xl overflow-hidden rounded-sm border border-[#C9A66B]/60 bg-[#14120D] shadow-2xl">
            <button type="button" onClick={() => setIsCareGuideOpen(false)} className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-[#EFE7D8] hover:bg-black" aria-label="Close video"><X className="h-5 w-5" /></button>
            <div className="aspect-video">
              <iframe className="h-full w-full" src="https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ?autoplay=1&rel=0" title="Fall Collection Care Guide" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
            </div>
          </section>
        </div>
      )}

      {/* ---------------- REVIEWS ---------------- */}
      <section id="reviews" className="max-w-7xl mx-auto px-6 sm:px-8 py-20">
        <div className="mb-14 max-w-2xl">
          <Tag className="mb-4">Client Reviews</Tag>
          <h2
            className="text-3xl sm:text-5xl leading-tight"
            style={{ fontFamily: "'Newsreader', serif", fontWeight: 500 }}
          >
            Hear it from the best-dressed in town
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <Quote className="w-8 h-8 text-[#C9A66B]/60" />
            <div className="flex space-x-1 text-[#C9A66B]">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-current" />
              ))}
            </div>

            <blockquote className="text-xl lg:text-2xl text-[#C7BDA8] leading-relaxed font-light max-w-2xl">
  After retiring, I wanted my wardrobe kept in the same order as everything
  else in my life. Ashlie's Tailor team walked me through exactly what
  each piece needed, and nothing has come back the wrong shape since.
</blockquote>

<div
  className="text-lg lg:text-xl tracking-[0.15em] uppercase text-[#EFE7D8]"
  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
>
  Barbara Gordon
</div>

<a href="#reviews" className="pt-4 inline-flex items-center gap-3 group">
  <span className="text-sm lg:text-base uppercase tracking-[0.22em] text-[#C7BDA8] group-hover:text-[#EFE7D8]">
    More reviews
  </span>

  <ArrowRight className="w-4 h-4 text-[#C9A66B] transition-transform group-hover:translate-x-1" />
</a>
          </div>

          <div className="lg:col-span-6">
            <div className="w-full h-[380px] sm:h-[460px] overflow-hidden rounded-sm">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop"
                alt="Client portrait"
                className="w-full h-full object-cover grayscale-[20%]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- SERVICES ---------------- */}
      <section id="services" className="max-w-7xl mx-auto px-6 sm:px-8 py-20 border-t border-[#3A3226]/70">
        <div className="mb-14 max-w-4xl">
          <Tag className="mb-4 text-base">
  Our Services
</Tag>
          <h2
  className="text-4xl sm:text-5xl lg:text-6xl leading-[1.08]"
  style={{ fontFamily: "'Newsreader', serif", fontWeight: 500 }}
>
  Crafted with Precision, <span className="italic text-[#C9A66B]">Tailored for You</span>
</h2>
          <p className="mt-5 max-w-2xl text-base sm:text-lg leading-relaxed font-light text-[#B8AC94]">
            From a perfect first fitting to every final stitch, our services keep your wardrobe and orders in expert hands.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          <ServiceCard
            title="Custom Suit Tailoring"
            body="Personalized suit creation with precise measurements and premium craftsmanship."
            image="https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?auto=format&fit=crop&w=1200&q=85"
            alt="Tailor taking measurements for a custom suit"
          />
          <ServiceCard
            title="Uniform Customization"
            body="High-quality uniform tailoring and adjustments for schools, offices, and organizations."
            image="https://images.unsplash.com/photo-1598032895397-b9472444bf93?auto=format&fit=crop&w=1200&q=85"
            alt="Tailor working at a sewing machine"
          />
          <ServiceCard
            title="Dressmaking & Alterations"
            body="Custom dresses, repairs, resizing, and garment alterations."
            image="https://images.unsplash.com/photo-1585488434455-1a6d9d2e1655?auto=format&fit=crop&w=1200&q=85"
            alt="Formal dress displayed on a mannequin"
          />
          <ServiceCard
            title="Measurement Profile Management"
            body="Save customer measurements digitally for faster future orders."
            image="https://images.unsplash.com/photo-1613909671501-f9678ffc1d33?auto=format&fit=crop&w=1200&q=85"
            alt="Measuring tape and fabric on a tailor's work table"
          />
          <ServiceCard
            title="Production Tracking"
            body="Track every order from cutting and sewing to fitting and completion."
            image="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=85"
            alt="Garments in a tailoring workshop"
          />
          <ServiceCard
            title="Fabric & Material Management"
            body="Monitor fabric inventory, usage, and stock availability."
            image="https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=1200&q=85"
            alt="Colorful fabric rolls in a tailoring shop"
          />
        </div>
      </section>

      {/* ---------------- CONTACT — styled as an order ticket ---------------- */}
      <section id="contact-us" className="max-w-7xl mx-auto px-6 sm:px-8 py-20 border-t border-[#3A3226]/70">
        <div className="mb-14 max-w-2xl">
          <Tag className="mb-4">Get In Touch</Tag>
          <h2
            className="text-3xl sm:text-5xl leading-tight"
            style={{ fontFamily: "'Newsreader', serif", fontWeight: 500 }}
          >
            Bring us the piece, we'll take it from there
          </h2>
          <p className="mt-5 max-w-xl text-base sm:text-lg leading-relaxed font-light text-[#B8AC94]">
            Questions about an order, a fitting, or a fabric you're not sure about? Send a note or stop by the atelier.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Info card, styled like a garment ticket */}
          <div className="lg:col-span-5 relative rounded-sm border border-dashed border-[#C9A66B]/50 bg-[#1D1912] p-8 sm:p-10">
            <span className="absolute -top-3 left-8 h-6 w-6 rounded-full border border-[#3A3226] bg-[#14120D]" />
            <span className="absolute -bottom-3 left-8 h-6 w-6 rounded-full border border-[#3A3226] bg-[#14120D]" />

            <Tag className="mb-8">Shop Details — No. 048</Tag>

            <div className="space-y-7">
              <div className="flex items-start gap-4">
                <MapPin className="w-4 h-4 mt-1 text-[#C9A66B] shrink-0" />
                <div>
                  <div
                    className="text-[10px] tracking-[0.25em] text-[#6E6452] uppercase mb-1"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    Atelier
                  </div>
                  <div className="text-base text-[#EFE7D8] font-light">
                    118 Thread Street, Suite 4<br />Cebu City, Central Visayas
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Phone className="w-4 h-4 mt-1 text-[#C9A66B] shrink-0" />
                <div>
                  <div
                    className="text-[10px] tracking-[0.25em] text-[#6E6452] uppercase mb-1"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    Phone
                  </div>
                  <a href="tel:+639171234567" className="text-base text-[#EFE7D8] font-light hover:text-[#C9A66B] transition-colors">
                    +63 917 123 4567
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Mail className="w-4 h-4 mt-1 text-[#C9A66B] shrink-0" />
                <div>
                  <div
                    className="text-[10px] tracking-[0.25em] text-[#6E6452] uppercase mb-1"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    Email
                  </div>
                  <a href="mailto:hello@ashlietailor.com" className="text-base text-[#EFE7D8] font-light hover:text-[#C9A66B] transition-colors">
                    hello@ashlietailor.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Clock className="w-4 h-4 mt-1 text-[#C9A66B] shrink-0" />
                <div>
                  <div
                    className="text-[10px] tracking-[0.25em] text-[#6E6452] uppercase mb-1"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    Hours
                  </div>
                  <div className="text-base text-[#EFE7D8] font-light">
                    Mon–Sat, 9:00 AM – 7:00 PM<br />Sunday by appointment
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact form */}
          <div className="lg:col-span-7">
            <form onSubmit={handleContactSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label
                    htmlFor="contact-name"
                    className="block text-[10px] tracking-[0.25em] text-[#6E6452] uppercase mb-2"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    value={contactForm.name}
                    onChange={(e) => setContactForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full bg-[#1D1912] border border-[#3A3226] rounded-sm px-4 py-3 text-sm text-[#EFE7D8] placeholder-[#6E6452] focus:outline-none focus:border-[#C9A66B] transition-colors"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label
                    htmlFor="contact-email"
                    className="block text-[10px] tracking-[0.25em] text-[#6E6452] uppercase mb-2"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    Email
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    value={contactForm.email}
                    onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full bg-[#1D1912] border border-[#3A3226] rounded-sm px-4 py-3 text-sm text-[#EFE7D8] placeholder-[#6E6452] focus:outline-none focus:border-[#C9A66B] transition-colors"
                    placeholder="you@email.com"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="contact-message"
                  className="block text-[10px] tracking-[0.25em] text-[#6E6452] uppercase mb-2"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  Message
                </label>
                <textarea
                  id="contact-message"
                  required
                  rows={5}
                  value={contactForm.message}
                  onChange={(e) => setContactForm((f) => ({ ...f, message: e.target.value }))}
                  className="w-full bg-[#1D1912] border border-[#3A3226] rounded-sm px-4 py-3 text-sm text-[#EFE7D8] placeholder-[#6E6452] focus:outline-none focus:border-[#C9A66B] transition-colors resize-none"
                  placeholder="Tell us about the piece, the fit, or the fix it needs..."
                />
              </div>

              <div className="flex items-center gap-5 pt-1">
                <button
                  type="submit"
                  className="inline-flex items-center gap-3 bg-[#C9A66B] text-[#14120D] text-[11px] tracking-[0.22em] uppercase font-semibold px-6 py-4 rounded-sm hover:bg-[#dcbb85] transition-colors"
                >
                  Send Request
                  <ArrowRight className="w-4 h-4" />
                </button>
                {contactSent && (
                  <span
                    className="text-[11px] tracking-[0.2em] uppercase text-[#9C8F76]"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    Received — we'll reply shortly
                  </span>
                )}
              </div>
            </form>
          </div>
        </div>
      </section>


      {/* ---------------- FOOTER — styled like a care label ---------------- */}
      <footer className="bg-[#0F0D09] text-[#C7BDA8] pt-16 pb-10 px-6 sm:px-8 border-t border-[#3A3226]/70">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 pb-14 border-b border-[#3A3226]/70">
          <div className="md:col-span-4 space-y-6">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-sm border border-[#C9A66B]/70 flex items-center justify-center -rotate-3"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                <span className="text-[#C9A66B] text-xs">A&T</span>
              </div>
              <div
  style={{ fontFamily: "'Newsreader', serif" }}
  className="text-3xl lg:text-4xl text-[#EFE7D8] tracking-[0.1em]"
>
  Ashlie's Tailor
</div>
            </div>
            <p
             className="text-sm lg:text-base tracking-[0.15em] text-[#8E8067] uppercase max-w-[220px]"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              Handle with care — dry clean only — do not wring
            </p>
            <div className="flex space-x-3 pt-1">
              {['f', '▶', '◎', '𝕏', 'in'].map((label) => (
                <a
                  key={label}
                  href="#social"
                  className="w-12 h-12 rounded-sm border border-[#3A3226] flex items-center justify-center text-[#9C8F76] hover:border-[#C9A66B] hover:text-[#C9A66B] transition-colors"
                  aria-label={`Visit us on ${label}`}
                >
                 <span className="text-base font-semibold leading-none">{label}</span>
                </a>
              ))}
            </div>
          </div>

          <FooterCol title="Discover" items={['Home', 'About', 'Blog', 'Pricing', 'Contact us']} />
          <FooterCol title="Support" items={['Help center', 'Terms of service', 'Legal', 'Privacy policy', 'Status']} />

          <div className="md:col-span-4 space-y-4">
            <h4
              className="text-[10px] tracking-[0.25em] text-[#6E6452] uppercase mb-4"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              Stay Up to Date
            </h4>
            <div className="flex items-center bg-[#1D1912] border border-[#3A3226] rounded-sm p-1">
              <input
                type="email"
                placeholder="Email..."
                value={emailSub}
                onChange={(e) => setEmailSub(e.target.value)}
                className="bg-transparent text-xs text-[#EFE7D8] px-3 py-2.5 focus:outline-none w-full placeholder-[#6E6452]"
              />
              <button className="bg-[#C9A66B] text-[#14120D] text-[10px] tracking-[0.2em] uppercase px-4 py-2.5 font-semibold rounded-sm hover:bg-[#dcbb85] transition-colors">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        <div
          className="max-w-7xl mx-auto pt-8 flex justify-center text-[10px] text-[#6E6452] tracking-[0.25em] uppercase"
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        >
          All rights reserved · ©2026 Ashlie's Tailor
        </div>
      </footer>
    </div>
  );
}

function MeasurementDiagram() {
  return (
   <div className="group relative aspect-[2/1] w-full max-w-[1100px] mx-auto overflow-hidden rounded-sm border border-[#3A3226] bg-[#AAA59E] lg:aspect-[16/9]">
      <img
        src="/school-uniforms.png"
        alt="Male and female school uniforms"
        className="h-full w-full scale-[1.12] object-cover transition-transform duration-700 ease-out group-hover:scale-[1.16]"
        style={{ animation: 'fadeSlideIn 700ms ease-out both' }}
      />
      <div className="pointer-events-none absolute inset-2 border border-white/40" />

      <div className="pointer-events-none absolute inset-0 font-mono text-[6px] font-medium tracking-[0.12em] text-[#A64F3D] sm:text-[8px]">
        <div className="absolute left-[20%] top-[31%] h-px w-[16%] origin-left bg-[#A64F3D]" style={{ animation: 'revealMeasure 850ms 350ms ease-out both' }} />
        <span className="absolute left-[20%] top-[28%] rounded bg-[#16130F]/80 px-1 py-0.5 text-[#F8F1E3]" style={{ animation: 'fadeSlideIn 500ms 1.1s ease-out both' }}>CHEST</span>
        <div className="absolute left-[21%] top-[49%] h-px w-[14%] origin-left bg-[#A64F3D]" style={{ animation: 'revealMeasure 850ms 650ms ease-out both' }} />
        <span className="absolute left-[21%] top-[51%] rounded bg-[#16130F]/80 px-1 py-0.5 text-[#F8F1E3]" style={{ animation: 'fadeSlideIn 500ms 1.35s ease-out both' }}>WAIST</span>
        <div className="absolute left-[39%] top-[17%] h-[66%] w-px origin-top bg-[#C9A66B]" style={{ animation: 'revealMeasureY 1s 900ms ease-out both' }} />
        <span className="absolute left-[40%] top-[17%] bg-[#16130F]/80 px-1 py-0.5 text-[#EFD9A0]" style={{ animation: 'fadeSlideIn 500ms 1.75s ease-out both' }}>HEIGHT</span>

        <div className="absolute left-[65%] top-[31%] h-px w-[16%] origin-left bg-[#A64F3D]" style={{ animation: 'revealMeasure 850ms 500ms ease-out both' }} />
        <span className="absolute left-[66%] top-[28%] rounded bg-[#16130F]/80 px-1 py-0.5 text-[#F8F1E3]" style={{ animation: 'fadeSlideIn 500ms 1.25s ease-out both' }}>BUST</span>
        <div className="absolute left-[66%] top-[47%] h-px w-[15%] origin-left bg-[#A64F3D]" style={{ animation: 'revealMeasure 850ms 800ms ease-out both' }} />
        <span className="absolute left-[66%] top-[49%] rounded bg-[#16130F]/80 px-1 py-0.5 text-[#F8F1E3]" style={{ animation: 'fadeSlideIn 500ms 1.5s ease-out both' }}>WAIST</span>
        <div className="absolute left-[84%] top-[48%] h-[33%] w-px origin-top bg-[#C9A66B]" style={{ animation: 'revealMeasureY 1s 1.1s ease-out both' }} />
        <span className="absolute left-[85%] top-[64%] bg-[#16130F]/80 px-1 py-0.5 text-[#EFD9A0]" style={{ animation: 'fadeSlideIn 500ms 1.95s ease-out both' }}>SKIRT</span>
      </div>
      <div
        className="absolute bottom-3 left-3 bg-[#14120D]/90 px-2 py-1 text-[7px] uppercase tracking-[0.16em] text-[#EFD9A0] sm:bottom-4 sm:left-4 sm:px-3 sm:py-2 sm:text-[9px]"
        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
      >
        Uniform measurement guide
      </div>
    </div>
  );
}

interface SplitFeatureProps {
  tag: string;
  title: string;
  body: string;
  img: string;
  alt: string;
  reverse?: boolean;
}

function SplitFeature({ tag, title, body, img, alt, reverse = false }: SplitFeatureProps) {
  return (
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-20 items-center py-32 min-h-screen">
      <div className={`lg:col-span-6 ${reverse ? 'lg:order-2' : ''}`}>
       <div className="relative w-full h-[500px] sm:h-[600px] lg:h-[700px] overflow-hidden rounded-sm">
          <img src={img} alt={alt} className="w-full h-full object-cover grayscale-[10%]" />
        </div>
      </div>

      <div className={`lg:col-span-6 space-y-5 ${reverse ? 'lg:order-1' : ''} ${reverse ? 'lg:pr-8' : 'lg:pl-8'}`}>
        <Tag>{tag}</Tag>
        <h2
         
  className="text-5xl sm:text-6xl lg:text-7xl leading-tight"
          style={{ fontFamily: "'Newsreader', serif", fontWeight: 500 }}
        >
          {title}
        </h2>
       <p className="text-lg lg:text-xl text-[#B8AC94] font-light leading-relaxed max-w-xl">{body}</p>
      </div>
    </div>
  );
}

interface ServiceCardProps {
  title: string;
  body: string;
  image: string;
  alt: string;
}

function ServiceCard({ title, body, image, alt }: ServiceCardProps) {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setIsVisible(true),
      { threshold: 0.15 },
    );
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      className={`group relative isolate min-h-[440px] overflow-hidden rounded-2xl border border-white/15 bg-[#1D1912] shadow-[0_18px_55px_rgba(0,0,0,0.28)] transition-all duration-700 hover:-translate-y-1 hover:border-[#C9A66B]/60 hover:shadow-[0_24px_65px_rgba(0,0,0,0.42)] ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      }`}
    >
      <img
        src={image}
        alt={alt}
        className="absolute inset-0 -z-20 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
        loading="lazy"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#100e09] via-[#100e09]/75 to-[#100e09]/10" />
      <div className="relative flex min-h-[440px] flex-col justify-end p-6 sm:p-7">
        <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-[#E9D6AD]/35 bg-[#16130f]/45 px-3 py-1.5 text-[9px] font-medium uppercase tracking-[0.22em] text-[#F1DEB7] backdrop-blur-md">
          Atelier Service
        </div>
        <h3 className="max-w-[16ch] text-3xl leading-tight text-[#F8F1E3]" style={{ fontFamily: "'Newsreader', serif", fontWeight: 500 }}>
          {title}
        </h3>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-[#E8DECA]/85">{body}</p>
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="mt-6 w-fit rounded-full border border-[#C9A66B] bg-[#C9A66B]/15 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#F4D99D] backdrop-blur-md transition-all duration-300 hover:bg-[#C9A66B] hover:text-[#16130f]"
        >
          Available Now
        </button>
      </div>
    </div>
  );
}

function FooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="md:col-span-2 space-y-3">
      <h4
        className="text-[10px] tracking-[0.25em] text-[#6E6452] uppercase mb-4"
        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
      >
        {title}
      </h4>
      <ul className="space-y-2 text-[13px] font-light">
        {items.map((item) => (
          <li key={item}>
            <a href={`#${item.toLowerCase().replace(/\s+/g, '-')}`} className="hover:text-[#EFE7D8] transition-colors">
              {item}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}