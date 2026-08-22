import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Bell, Building2, Check, LockKeyhole, Save, SlidersHorizontal } from 'lucide-react';
import { COLORS, FONT_IMPORT, EyebrowLabel, PrimaryButton, Card } from './Theme';
import { PasswordChangePanel } from '../components/PasswordChangePanel';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const authToken = () => localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';

function TagSection({ icon, title, description, delay = 0, children }: { icon: ReactNode; title: string; description: string; delay?: number; children: ReactNode }) {
  return (
    <Card delay={delay}>
      <div className="flex items-start gap-3 px-6 pt-6 sm:px-8">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center" style={{ background: COLORS.navySoft, color: COLORS.navy, borderRadius: 8 }}>{icon}</div>
        <div>
          <h2 className="text-[16px] font-semibold" style={{ color: COLORS.ink }}>{title}</h2>
          <p className="mt-1 text-[13px]" style={{ color: COLORS.muted }}>{description}</p>
        </div>
      </div>
      <div className="px-6 pb-8 pt-6 sm:px-8">{children}</div>
    </Card>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: COLORS.muted }}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full border bg-white px-3 py-2.5 text-sm outline-none transition-colors"
        style={{ borderColor: COLORS.border, color: COLORS.ink, borderRadius: 8 }}
        onFocus={(e) => { e.currentTarget.style.borderColor = COLORS.navy; e.currentTarget.style.boxShadow = `0 0 0 3px ${COLORS.navySoft}`; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.boxShadow = 'none'; }}
      />
    </label>
  );
}

function SwatchToggle({ label, detail, checked, onChange }: { label: string; detail: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b py-3" style={{ borderColor: COLORS.border }}>
      <div>
        <span className="block text-sm font-medium" style={{ color: COLORS.ink }}>{label}</span>
        <span className="mt-0.5 block text-xs" style={{ color: COLORS.muted }}>{detail}</span>
      </div>
      <div className="flex shrink-0 overflow-hidden border" style={{ borderColor: checked ? COLORS.navy : COLORS.border, borderRadius: 7 }}>
        <button type="button" onClick={() => onChange(false)} aria-pressed={!checked} className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors" style={!checked ? { background: COLORS.muted, color: '#fff' } : { background: COLORS.surface, color: COLORS.muted }}>Off</button>
        <button type="button" onClick={() => onChange(true)} aria-pressed={checked} className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors" style={checked ? { background: COLORS.navy, color: '#fff' } : { background: COLORS.surface, color: COLORS.muted }}>On</button>
      </div>
    </div>
  );
}

export function SettingsContent({ wide = false }: { wide?: boolean }) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState({ name: "Ashlie's Tailor", email: 'hello@ashliestailor.com', phone: '0917 555 0100', address: 'Tagbilaran City, Bohol', deposit: '50', lowStock: true, fitting: true, pickup: true });
  const update = (key: keyof typeof settings, value: string | boolean) => setSettings((current) => ({ ...current, [key]: value }));
  useEffect(() => {
    fetch(`${API_URL}/auth/shop-settings`, { headers: { Authorization: `Bearer ${authToken()}` } })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message); return data; })
      .then((data) => { if (data.settings && Object.keys(data.settings).length) setSettings((current) => ({ ...current, ...data.settings })); })
      .catch(() => {});
  }, []);
  const save = async () => {
    setError('');
    try {
      const response = await fetch(`${API_URL}/auth/shop-settings`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` }, body: JSON.stringify({ settings }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.message || 'Unable to save settings.');
      setSaved(true); window.setTimeout(() => setSaved(false), 3000);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to save settings.'); }
  };

  return (
    <div className={`${wide ? 'w-full' : 'max-w-5xl'} space-y-6`} style={{ color: COLORS.ink }}>
      <style>{FONT_IMPORT}</style>

      <div className="rise-in">
        <EyebrowLabel color={COLORS.brassDeep}>Shop settings</EyebrowLabel>
        <h1 className={`mt-1.5 font-semibold tracking-[-0.02em] ${wide ? 'text-[30px]' : 'text-[26px]'}`} style={{ color: COLORS.ink }}>Manage your shop</h1>
        <p className="mt-2 max-w-xl text-sm" style={{ color: COLORS.muted }}>Shop information, order rules, and notification preferences.</p>
      </div>

      {saved && (
        <div className="rise-in flex items-center gap-2 border px-4 py-3 text-sm" style={{ borderColor: COLORS.successBorder, background: COLORS.successBg, color: COLORS.success, borderRadius: 8 }}>
          <Check className="h-4 w-4" /> Settings saved successfully.
        </div>
      )}
      {error && <div role="alert" className="border px-4 py-3 text-sm" style={{ borderColor: COLORS.dangerBorder, background: COLORS.dangerBg, color: COLORS.danger, borderRadius: 8 }}>{error}</div>}

      <TagSection icon={<Building2 className="h-5 w-5" strokeWidth={1.75} />} title="Shop information" description="Details shown on receipts and customer communications." delay={0.05}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Shop name" value={settings.name} onChange={(value) => update('name', value)} />
          <Field label="Shop email" type="email" value={settings.email} onChange={(value) => update('email', value)} />
          <Field label="Contact number" value={settings.phone} onChange={(value) => update('phone', value)} />
          <div className="sm:col-span-2"><Field label="Shop address" value={settings.address} onChange={(value) => update('address', value)} /></div>
        </div>
      </TagSection>

      <TagSection icon={<SlidersHorizontal className="h-5 w-5" strokeWidth={1.75} />} title="Order rules" description="Default rules used while creating a custom order." delay={0.1}>
        <div className="max-w-xs"><Field label="Required deposit (%)" type="number" value={settings.deposit} onChange={(value) => update('deposit', value)} /></div>
      </TagSection>

      <TagSection icon={<Bell className="h-5 w-5" strokeWidth={1.75} />} title="Notifications" description="Choose which shop events require an alert." delay={0.15}>
        <div className="space-y-1">
          <SwatchToggle label="Low-stock alerts" detail="Notify when fabric reaches its reorder level." checked={settings.lowStock} onChange={(value) => update('lowStock', value)} />
          <SwatchToggle label="Fitting reminders" detail="Notify staff about upcoming fitting appointments." checked={settings.fitting} onChange={(value) => update('fitting', value)} />
          <SwatchToggle label="Pickup reminders" detail="Notify staff when completed garments are ready for pickup." checked={settings.pickup} onChange={(value) => update('pickup', value)} />
        </div>
      </TagSection>

      <TagSection icon={<LockKeyhole className="h-5 w-5" strokeWidth={1.75} />} title="Security" description="Manage account access under User Management." delay={0.2}>
        <PasswordChangePanel buttonClassName="border px-4 py-2.5 text-[12px] font-semibold transition-colors" />
      </TagSection>

      <div className="rise-in" style={{ animationDelay: '0.25s' }}>
        <PrimaryButton icon={<Save />} onClick={save}>Save settings</PrimaryButton>
      </div>
    </div>
  );
}
