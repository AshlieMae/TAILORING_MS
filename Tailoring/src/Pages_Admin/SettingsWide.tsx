import { useState } from 'react';
import type { ReactNode } from 'react';
import { Bell, Building2, Check, LockKeyhole, Save, SlidersHorizontal } from 'lucide-react';

/* ---------------------------------------------------------------
   ADMIN — Settings
   "The Spec Tag"
   Where the Dashboard reads like a ledger and thread-red marks the
   busy stage, Settings reads like the hang-tags pinned to a finished
   garment: kraft tag paper, a punched hole + looped thread at each
   section, sage chalk-green as the working accent, fields drawn as
   fill-in measurement blanks rather than boxed inputs.
------------------------------------------------------------------ */

const INK = '#2A2620';
const PAPER = '#FBF7EA';
const PAGE = '#F1EAD6';
const LINE = '#D9CCA6';
const MUTED = '#7C7057';
const PIN = '#4B6A53';
const PIN_SOFT = '#E4EBE0';
const PIN_LINE = '#B9CBB4';

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,600;1,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

@keyframes tagIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes threadDraw { from { stroke-dashoffset: 40; } to { stroke-dashoffset: 0; } }
.tag-in { opacity: 0; animation: tagIn 0.5s cubic-bezier(0.22,1,0.36,1) forwards; }
`;

function MonoLabel({ children, className = '', style = {} }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <span className={`text-[10px] tracking-[0.22em] uppercase ${className}`} style={{ fontFamily: "'IBM Plex Mono', monospace", color: MUTED, ...style }}>
      {children}
    </span>
  );
}

/* Punched-hole + looped thread, drawn fresh above every section — the
   signature element. Reads as a hang-tag corner, not a decoration bolted on. */
function TagPunch() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" className="flex-shrink-0" aria-hidden="true">
      <circle cx="17" cy="10" r="4.5" fill={PAGE} stroke={LINE} strokeWidth="1.5" />
      <path
        d="M 13.5 10 Q 5 20 13 27 Q 20 33 17 27"
        fill="none"
        stroke={PIN}
        strokeWidth="1.3"
        strokeDasharray="2 2.4"
        strokeLinecap="round"
        style={{ animation: 'threadDraw 1.1s 0.15s ease-out both' }}
      />
    </svg>
  );
}

function TagSection({ icon, title, description, delay = 0, children }: { icon: ReactNode; title: string; description: string; delay?: number; children: ReactNode }) {
  return (
    <section className="tag-in relative border" style={{ animationDelay: `${delay}s`, borderColor: LINE, background: PAPER }}>
      <div className="flex items-start gap-3 px-6 sm:px-8 pt-6">
        <TagPunch />
        <div className="pt-1.5 flex items-start gap-3 flex-1 min-w-0">
          <span className="mt-0.5 flex-shrink-0" style={{ color: PIN }}>{icon}</span>
          <div>
            <h2 className="text-lg italic" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: INK }}>{title}</h2>
            <p className="mt-1 text-[13px]" style={{ color: MUTED }}>{description}</p>
          </div>
        </div>
      </div>
      <div className="px-6 sm:px-8 pb-8 pt-6">{children}</div>
    </section>
  );
}

export function AdminSettingsWideView() {
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({ name: "Ashlie's Tailor", email: 'hello@ashliestailor.com', phone: '0917 555 0100', address: 'Tagbilaran City, Bohol', deposit: '50', lowStock: true, fitting: true, pickup: true });
  const update = (key: keyof typeof settings, value: string | boolean) => setSettings((current) => ({ ...current, [key]: value }));
  const save = () => { setSaved(true); window.setTimeout(() => setSaved(false), 3000); };

  return (
    <div className="w-full space-y-6" style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: INK }}>
      <style>{FONT_IMPORT}</style>

      <div className="tag-in">
        <MonoLabel>Shop settings — spec sheet</MonoLabel>
        <h1 className="mt-1 text-3xl sm:text-4xl italic leading-tight" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: INK }}>
          Every detail, pinned in place.
        </h1>
        <p className="mt-2 text-[13px] max-w-xl" style={{ color: MUTED }}>Shop information, order rules, and notification preferences — the specs every job card is cut against.</p>
      </div>

      {saved && (
        <div className="tag-in flex items-center gap-2 border px-4 py-3 text-sm" style={{ borderColor: PIN_LINE, background: PIN_SOFT, color: PIN }}>
          <Check className="h-4 w-4" /> Settings saved successfully.
        </div>
      )}

      <TagSection icon={<Building2 className="h-5 w-5" strokeWidth={1.6} />} title="Shop information" description="Details shown on receipts and customer communications." delay={0.05}>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Shop name" value={settings.name} onChange={(value) => update('name', value)} />
          <Field label="Shop email" type="email" value={settings.email} onChange={(value) => update('email', value)} />
          <Field label="Contact number" value={settings.phone} onChange={(value) => update('phone', value)} />
          <div className="sm:col-span-2"><Field label="Shop address" value={settings.address} onChange={(value) => update('address', value)} /></div>
        </div>
      </TagSection>

      <TagSection icon={<SlidersHorizontal className="h-5 w-5" strokeWidth={1.6} />} title="Order rules" description="Default rules used while creating a custom order." delay={0.1}>
        <div className="max-w-xs">
          <Field label="Required deposit (%)" type="number" value={settings.deposit} onChange={(value) => update('deposit', value)} />
        </div>
      </TagSection>

      <TagSection icon={<Bell className="h-5 w-5" strokeWidth={1.6} />} title="Notifications" description="Choose which shop events require an alert." delay={0.15}>
        <div className="space-y-3">
          <SwatchToggle label="Low-stock alerts" detail="Notify when fabric reaches its reorder level." checked={settings.lowStock} onChange={(value) => update('lowStock', value)} />
          <SwatchToggle label="Fitting reminders" detail="Notify staff about upcoming fitting appointments." checked={settings.fitting} onChange={(value) => update('fitting', value)} />
          <SwatchToggle label="Pickup reminders" detail="Notify staff when completed garments are ready for pickup." checked={settings.pickup} onChange={(value) => update('pickup', value)} />
        </div>
      </TagSection>

      <TagSection icon={<LockKeyhole className="h-5 w-5" strokeWidth={1.6} />} title="Security" description="Manage account access under User Management." delay={0.2}>
        <button className="border px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.14em] transition-colors" style={{ borderColor: LINE, color: MUTED, background: PAGE }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = PIN; e.currentTarget.style.color = INK; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = LINE; e.currentTarget.style.color = MUTED; }}>
          Change admin password
        </button>
      </TagSection>

      <button onClick={save} className="tag-in inline-flex items-center gap-2 px-6 py-3.5 text-[11px] font-medium uppercase tracking-[0.16em] transition-colors" style={{ animationDelay: '0.25s', background: PIN, color: '#F4F7F1' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#3E5A46'; }} onMouseLeave={(e) => { e.currentTarget.style.background = PIN; }}>
        <Save className="h-4 w-4" /> Save settings
      </button>
    </div>
  );
}

/* Measurement-blank field: no box, just a dotted rule to fill in —
   the tag-writing motif carried into every input on the page. */
function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block">
      <MonoLabel className="block mb-2">{label}</MonoLabel>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-transparent px-0.5 py-2 text-[15px] outline-none border-0 border-b transition-colors"
        style={{ color: INK, borderBottomStyle: 'dashed', borderBottomWidth: '1.5px', borderColor: LINE }}
        onFocus={(e) => { e.currentTarget.style.borderColor = PIN; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = LINE; }}
      />
    </label>
  );
}

/* Swatch-chip toggle: two sample chips (Off / On) instead of a checkbox,
   like choosing between two fabric swatches pinned to the tag. */
function SwatchToggle({ label, detail, checked, onChange }: { label: string; detail: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-6 py-3 border-b" style={{ borderColor: LINE }}>
      <div>
        <span className="block text-[14px] font-medium" style={{ color: INK }}>{label}</span>
        <span className="mt-0.5 block text-[12px]" style={{ color: MUTED }}>{detail}</span>
      </div>
      <div className="flex-shrink-0 flex border" style={{ borderColor: checked ? PIN : LINE }}>
        <button
          type="button"
          onClick={() => onChange(false)}
          aria-pressed={!checked}
          className="px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] transition-colors"
          style={!checked ? { background: MUTED, color: PAPER } : { background: PAPER, color: MUTED }}
        >
          Off
        </button>
        <button
          type="button"
          onClick={() => onChange(true)}
          aria-pressed={checked}
          className="px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] transition-colors"
          style={checked ? { background: PIN, color: '#F4F7F1' } : { background: PAPER, color: MUTED }}
        >
          On
        </button>
      </div>
    </div>
  );
}

export default AdminSettingsWideView;