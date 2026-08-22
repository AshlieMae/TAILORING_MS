import { useState } from 'react';
import { Check, Eye, EyeOff, LockKeyhole } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const authToken = () => localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';

export function PasswordChangePanel({ buttonClassName = '' }: { buttonClassName?: string }) {
  const [open, setOpen] = useState(false);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const close = () => { setOpen(false); setError(''); setNotice(''); setForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setNotice('');
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) return setError('Complete all password fields.');
    if (form.newPassword.length < 8) return setError('New password must be at least 8 characters.');
    if (form.newPassword !== form.confirmPassword) return setError('New password and confirmation do not match.');
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/auth/change-password`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` }, body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.message || 'Unable to update password.');
      setNotice(data.message || 'Password updated successfully.'); setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to update password.'); } finally { setSaving(false); }
  };

  return <>
    <button type="button" onClick={() => setOpen(true)} className={buttonClassName}>Change password</button>
    {open && <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/45" aria-label="Close password dialog" onClick={close} />
      <form onSubmit={save} className="relative w-full max-w-md rounded-xl border border-[#E2D7C7] bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3"><span className="rounded-lg bg-[#F8F3EB] p-2 text-[#8C6F3E]"><LockKeyhole className="h-5 w-5" /></span><div><h2 className="text-xl text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>Change password</h2><p className="mt-1 text-sm text-[#766A62]">Use at least 8 characters for your new password.</p></div></div>
        {notice && <div className="mt-5 flex items-center gap-2 rounded-lg border border-[#8B9E87]/40 bg-[#F1F5F0] px-3 py-2.5 text-sm text-[#4E7357]"><Check className="h-4 w-4" />{notice}</div>}
        {error && <div role="alert" className="mt-5 rounded-lg border border-[#C86A58]/30 bg-[#FDF4F2] px-3 py-2.5 text-sm text-[#9A3B2A]">{error}</div>}
        <div className="mt-5 space-y-4">{[['Current password', 'currentPassword'], ['New password', 'newPassword'], ['Confirm new password', 'confirmPassword']].map(([label, key]) => <label key={key} className="block text-xs font-medium text-[#5E5048]">{label}<div className="relative mt-2"><input required type={show ? 'text' : 'password'} value={form[key as keyof typeof form]} onChange={(event) => update(key as keyof typeof form, event.target.value)} className="w-full rounded-lg border border-[#E2D7C7] px-3 py-2.5 pr-10 text-sm outline-none focus:border-[#A46B48]" /><button type="button" onClick={() => setShow((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C7E74]" aria-label={show ? 'Hide passwords' : 'Show passwords'}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label>)}</div>
        <div className="mt-6 flex gap-3"><button disabled={saving} className="rounded-lg bg-[#2A211D] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white disabled:opacity-60">{saving ? 'Updating…' : 'Update password'}</button><button type="button" onClick={close} className="rounded-lg border border-[#E2D7C7] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5E5048]">Close</button></div>
      </form>
    </div>}
  </>;
}
