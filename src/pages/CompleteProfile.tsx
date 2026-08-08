import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, CheckCircle2, UserRound } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const authToken = () => localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';

type ProfileForm = {
  fullName: string;
  email: string;
  contactNumber: string;
  address: string;
  employeeId: string;
  position: string;
  dateHired: string;
  profilePicture: string;
};

function savedUser() {
  const raw = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

export default function CompleteProfile() {
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const user = savedUser();
  const [form, setForm] = useState<ProfileForm>({
    fullName: user?.full_name || '',
    email: user?.email || '',
    contactNumber: user?.contact_number || '',
    address: user?.address || '',
    employeeId: user?.employee_id || '',
    position: user?.position || 'Front Desk Associate',
    dateHired: user?.date_hired ? String(user.date_hired).slice(0, 10) : '',
    profilePicture: user?.profile_picture || '',
  });
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  function update(field: keyof ProfileForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function selectPhoto(file?: File) {
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('Please choose an image file.');
    if (file.size > 2 * 1024 * 1024) return setError('Profile picture must be 2 MB or smaller.');
    const reader = new FileReader();
    reader.onload = () => update('profilePicture', String(reader.result));
    reader.readAsDataURL(file);
    setError('');
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (Object.values(form).some((value) => !value.trim())) {
      setError('Please complete every required profile field.');
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetch(`${API_URL}/auth/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to save your profile.');
      const storage = localStorage.getItem('authToken') ? localStorage : sessionStorage;
      storage.setItem('currentUser', JSON.stringify(data.user));
      navigate('/frontdesk', { replace: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save your profile.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#FAF7F2] px-4 py-10 text-[#2A211D] sm:px-8">
      <div className="mx-auto max-w-3xl rounded-2xl border border-[#E8DFD3] bg-white p-6 shadow-[0_24px_70px_-30px_rgba(42,33,29,0.28)] sm:p-10">
        <div className="mb-8">
          <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#A46B48]">Front Desk Setup</span>
          <h1 className="mt-2 font-serif text-4xl">Complete your profile</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#766A62]">Your account is approved. Complete these details before accessing the Front Desk dashboard.</p>
        </div>

        <form onSubmit={saveProfile} className="space-y-6">
          {error && <div role="alert" className="rounded-lg border border-[#C86A58]/30 bg-[#FDF4F2] px-4 py-3 text-sm text-[#9A3B2A]">{error}</div>}

          <div className="flex items-center gap-5 rounded-xl border border-[#E8DFD3] bg-[#FCFAF7] p-4">
            <button type="button" onClick={() => fileInput.current?.click()} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-[#D9C8B7] bg-[#EFE7DC] text-[#8C7E74]">
              {form.profilePicture ? <img src={form.profilePicture} alt="Profile preview" className="h-full w-full object-cover" /> : <UserRound className="mx-auto h-8 w-8" />}
              <span className="absolute inset-x-0 bottom-0 flex h-7 items-center justify-center bg-black/45 text-white"><Camera className="h-3.5 w-3.5" /></span>
            </button>
            <div><p className="font-medium">Profile picture</p><p className="mt-1 text-xs text-[#766A62]">Required · JPG, PNG, or WebP · up to 2 MB</p></div>
            <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(event) => selectPhoto(event.target.files?.[0])} />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" value={form.fullName} onChange={(value) => update('fullName', value)} />
            <Field label="Email address" value={form.email} onChange={(value) => update('email', value)} type="email" disabled />
            <Field label="Contact number" value={form.contactNumber} onChange={(value) => update('contactNumber', value)} type="tel" />
            <Field label="Employee ID" value={form.employeeId} onChange={(value) => update('employeeId', value)} />
            <Field label="Position" value={form.position} onChange={(value) => update('position', value)} />
            <Field label="Date hired" value={form.dateHired} onChange={(value) => update('dateHired', value)} type="date" />
            <div className="sm:col-span-2"><Field label="Address" value={form.address} onChange={(value) => update('address', value)} /></div>
          </div>

          <button type="submit" disabled={isSaving} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#2A211D] px-5 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#47382F] disabled:cursor-not-allowed disabled:opacity-60">
            <CheckCircle2 className="h-4 w-4" /> {isSaving ? 'Saving profile...' : 'Save and continue'}
          </button>
        </form>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, type = 'text', disabled = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; disabled?: boolean }) {
  return <label className="block text-xs font-medium text-[#5E5048]">{label}<input required type={type} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-[#E2D7C7] bg-white px-3 py-2.5 text-sm text-[#2A211D] outline-none transition-colors focus:border-[#A46B48] disabled:cursor-not-allowed disabled:bg-[#F4F0E9]" /></label>;
}
