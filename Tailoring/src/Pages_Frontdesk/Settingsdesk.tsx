// Pages_Frontdesk/Settingsdesk.tsx
import { useEffect, useState } from 'react';
import { Bell, Check, LockKeyhole, Save, UserRound, Loader2 } from 'lucide-react';
import { authToken } from '../../services/frontDeskApi';

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] uppercase tracking-[0.2em] text-[#8C7E74]" style={{ fontFamily: "'Space Mono', monospace" }}>{children}</span>;
}

function Section({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="dash-in dash-card rounded-xl p-6 sm:p-7">
      <div className="flex items-start gap-3">
        <span className="rounded-lg bg-[#F8F3EB] p-2 text-[#8C6F3E]">{icon}</span>
        <div>
          <h2 className="text-xl text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>{title}</h2>
          <p className="mt-1 text-sm text-[#766A62]">{description}</p>
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block text-xs font-medium text-[#5E5048]">
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-[#E2D7C7] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#A46B48]" />
    </label>
  );
}

function Toggle({ label, detail, checked, onChange }: { label: string; detail: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-[#F0EAE2] py-4 last:border-0">
      <div>
        <span className="block text-sm font-medium text-[#2A211D]">{label}</span>
        <span className="mt-1 block text-xs text-[#766A62]">{detail}</span>
      </div>
      <button type="button" onClick={() => onChange(!checked)} aria-pressed={checked} className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-[#4E7357]' : 'bg-[#D9CFC4]'}`}>
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}

function PasswordChangePanel({ buttonClassName }: { buttonClassName?: string }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to change password.');
      setMessage('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleChangePassword} className="space-y-4">
      {message && <div className="rounded-lg border border-[#8B9E87]/40 bg-[#F1F5F0] px-4 py-3 text-sm text-[#4E7357]">{message}</div>}
      {error && <div className="rounded-lg border border-[#C86A58]/30 bg-[#FDF4F2] px-4 py-3 text-sm text-[#9A3B2A]">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Current password" value={currentPassword} onChange={setCurrentPassword} type="password" />
        <Field label="New password" value={newPassword} onChange={setNewPassword} type="password" />
        <Field label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} type="password" />
      </div>
      <button type="submit" disabled={loading} className={`${buttonClassName || 'rounded-lg bg-[#2A211D] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white'} disabled:opacity-50`}>
        {loading ? 'Changing...' : 'Change password'}
      </button>
    </form>
  );
}

export function FrontDeskSettingsView() {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    displayName: 'Front Desk Counter',
    email: 'frontdesk@ashliestailor.com',
    phone: '0917 555 0100',
    fitting: true,
    payments: true,
    pickup: true,
  });

  const update = (key: keyof typeof settings, value: string | boolean) => setSettings((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const headers = { Authorization: `Bearer ${authToken()}` };
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/me`, { headers });
        const data = await response.json();
        if (response.ok && data.user) {
          setSettings((current) => ({
            ...current,
            displayName: data.user.full_name || current.displayName,
            email: data.user.email || current.email,
            phone: data.user.contact_number || current.phone,
          }));
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const save = async () => {
    setError('');
    try {
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` };
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/profile`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          fullName: settings.displayName,
          email: settings.email,
          contactNumber: settings.phone,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to save profile.');
      
      const storage = localStorage.getItem('authToken') ? localStorage : sessionStorage;
      storage.setItem('currentUser', JSON.stringify(data.user));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save settings.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-[#8C6F3E]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-7">
      <div className="dash-in">
        <Label>Front desk preferences</Label>
        <h1 className="mt-1 text-2xl text-[#2A211D] sm:text-3xl" style={{ fontFamily: "'DM Serif Display', serif" }}>Settings</h1>
        <p className="mt-2 text-sm text-[#766A62]">Manage your counter profile, alerts, and account preferences.</p>
      </div>

      {saved && (
        <div className="dash-in flex items-center gap-2 rounded-lg border border-[#8B9E87]/40 bg-[#F1F5F0] px-4 py-3 text-sm text-[#4E7357]">
          <Check className="h-4 w-4" />Settings saved successfully.
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-lg border border-[#C86A58]/30 bg-[#FDF4F2] px-4 py-3 text-sm text-[#9A3B2A]">
          {error}
        </div>
      )}

      <Section icon={<UserRound className="h-5 w-5" />} title="Counter profile" description="Information shown on your front-desk account.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Display name" value={settings.displayName} onChange={(value) => update('displayName', value)} />
          <Field label="Email address" value={settings.email} onChange={(value) => update('email', value)} type="email" />
          <Field label="Contact number" value={settings.phone} onChange={(value) => update('phone', value)} />
        </div>
      </Section>

      <Section icon={<Bell className="h-5 w-5" />} title="Notifications" description="Choose the alerts you receive at the counter.">
        <div className="space-y-1">
          <Toggle label="Fitting reminders" detail="Alerts for upcoming scheduled fittings." checked={settings.fitting} onChange={(value) => update('fitting', value)} />
          <Toggle label="Payment confirmations" detail="Alerts after a deposit or final balance is recorded." checked={settings.payments} onChange={(value) => update('payments', value)} />
          <Toggle label="Pickup reminders" detail="Alerts when completed garments are due for release." checked={settings.pickup} onChange={(value) => update('pickup', value)} />
        </div>
      </Section>

      <Section icon={<LockKeyhole className="h-5 w-5" />} title="Account security" description="Keep your front-desk account secure.">
        <PasswordChangePanel buttonClassName="rounded-lg border border-[#E2D7C7] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5E5048] hover:bg-[#F8F3EB]" />
      </Section>

      <button onClick={save} className="dash-in inline-flex items-center gap-2 rounded-lg bg-[#2A211D] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white hover:bg-[#3D312B] transition-colors">
        <Save className="h-4 w-4" /> Save settings
      </button>
    </div>
  );
}

export default FrontDeskSettingsView;