import { useState } from 'react';
import { Briefcase, Edit3, Mail, MapPin, Phone, Save, UserRound, X } from 'lucide-react';
import { COLORS, FONT_IMPORT, ModalShell, PrimaryButton, SecondaryButton, EyebrowLabel, shadowSm } from './Theme';

type Profile = { full_name?: string; email?: string; contact_number?: string; address?: string; position?: string; profile_picture?: string } | null;

export function AdminProfileModal({ profile, onClose, onSave }: { profile: Profile; onClose: () => void; onSave: (profile: Profile) => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: profile?.full_name || 'Admin', email: profile?.email || '', contact_number: profile?.contact_number || '', address: profile?.address || '', position: profile?.position || 'Shop Owner' });
  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const save = () => { const updated = { ...profile, ...form }; const storage = localStorage.getItem('authToken') ? localStorage : sessionStorage; storage.setItem('currentUser', JSON.stringify(updated)); onSave(updated); setEditing(false); };
  const initials = form.full_name.split(' ').map((name) => name[0]).join('').slice(0, 2);

  return (
    <ModalShell onClose={onClose}>
      <style>{FONT_IMPORT}</style>
      <header className="flex items-start justify-between border-b px-7 py-6 sm:px-8" style={{ borderColor: COLORS.border }}>
        <div>
          <EyebrowLabel>Admin profile</EyebrowLabel>
          <h2 className="mt-1.5 text-2xl font-semibold tracking-[-0.01em]" style={{ color: COLORS.ink }}>{form.full_name}</h2>
        </div>
        <button onClick={onClose} className="p-2 transition-colors" style={{ color: COLORS.muted, borderRadius: 8 }} onMouseEnter={(e) => { e.currentTarget.style.background = COLORS.surfaceAlt; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="space-y-7 p-7 sm:p-8">
        <div className="flex items-center gap-5 border p-5" style={{ borderColor: COLORS.border, background: COLORS.navySoft, borderRadius: 10 }}>
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden text-lg font-semibold text-white" style={{ background: COLORS.navy, borderRadius: 999, boxShadow: shadowSm }}>
            {profile?.profile_picture ? <img src={profile.profile_picture} alt="Profile" className="h-full w-full object-cover" /> : initials}
          </div>
          <div>
            <div className="text-base font-semibold" style={{ color: COLORS.ink }}>{form.full_name}</div>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm" style={{ color: COLORS.muted }}><Briefcase className="h-3.5 w-3.5" />{form.position}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.08em]" style={{ color: COLORS.navy }}>Administrator account</p>
          </div>
        </div>

        {editing ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" value={form.full_name} onChange={(value) => update('full_name', value)} />
            <Field label="Position" value={form.position} onChange={(value) => update('position', value)} />
            <Field label="Email address" type="email" value={form.email} onChange={(value) => update('email', value)} />
            <Field label="Contact number" value={form.contact_number} onChange={(value) => update('contact_number', value)} />
            <div className="sm:col-span-2"><Field label="Address" value={form.address} onChange={(value) => update('address', value)} /></div>
          </div>
        ) : (
          <div>
            <h3 className="text-[15px] font-semibold" style={{ color: COLORS.ink }}>Account information</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Info label="Position" value={form.position} icon={<UserRound className="h-4 w-4" />} />
              <Info label="Role" value="Administrator / Shop Owner" icon={<Briefcase className="h-4 w-4" />} />
              <Info label="Email address" value={form.email || 'Not set'} icon={<Mail className="h-4 w-4" />} />
              <Info label="Contact number" value={form.contact_number || 'Not set'} icon={<Phone className="h-4 w-4" />} />
              <Info label="Address" value={form.address || 'Not set'} icon={<MapPin className="h-4 w-4" />} />
            </div>
          </div>
        )}

        <div className="border-t pt-6" style={{ borderColor: COLORS.border }}>
          {editing ? (
            <div className="flex gap-3">
              <PrimaryButton icon={<Save />} onClick={save}>Save profile</PrimaryButton>
              <SecondaryButton onClick={() => setEditing(false)}>Cancel</SecondaryButton>
            </div>
          ) : (
            <PrimaryButton icon={<Edit3 />} onClick={() => setEditing(true)}>Edit profile</PrimaryButton>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="border p-4" style={{ borderColor: COLORS.border, background: COLORS.surfaceAlt, borderRadius: 8 }}>
      <div className="flex items-center gap-2" style={{ color: COLORS.brassDeep }}>
        {icon || <UserRound className="h-4 w-4" />}
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: COLORS.muted }}>{label}</span>
      </div>
      <div className="mt-2 text-sm" style={{ color: COLORS.ink }}>{value}</div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block text-xs font-semibold" style={{ color: COLORS.inkSoft }}>
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full border bg-white px-3 py-2.5 text-sm outline-none transition-colors"
        style={{ borderColor: COLORS.border, color: COLORS.ink, borderRadius: 8 }}
        onFocus={(e) => { e.currentTarget.style.borderColor = COLORS.navy; e.currentTarget.style.boxShadow = `0 0 0 3px ${COLORS.navySoft}`; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.boxShadow = 'none'; }}
      />
    </label>
  );
}

export default AdminProfileModal;
