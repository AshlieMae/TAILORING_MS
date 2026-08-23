import { useState } from 'react';
import { X, User, Mail, Phone, MapPin, Lock } from 'lucide-react';

function MonoLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] uppercase tracking-[0.22em] text-[#8C7E74]" style={{ fontFamily: "'Space Mono', monospace" }}>{children}</span>;
}

export interface NewCustomerForm {
  lastName: string;
  middleName: string;
  firstName: string;
  suffix: string;
  contact: string;
  email: string;
  password: string;
  address: string;
  dateOfBirth: string;
  gender: string;
  civilStatus: string;
  occupation: string;
}

export function RegisterCustomerModal({
  onClose,
  onRegister,
}: {
  onClose: () => void;
  onRegister: (form: NewCustomerForm) => Promise<void>;
}) {
  const [form, setForm] = useState<NewCustomerForm>({
    lastName: '', middleName: '', firstName: '', suffix: '',
    contact: '', email: '', password: '', address: '',
    dateOfBirth: '', gender: '', civilStatus: '', occupation: ''
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.lastName.trim() || !form.firstName.trim() || !form.dateOfBirth || !form.gender || !form.contact.trim() || !form.email.trim() || !form.password) {
      setError('Last name, first name, birth date, gender, contact number, email, and temporary password are required.');
      return;
    }
    if (form.password.length < 8) {
      setError('Temporary password must be at least 8 characters.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onRegister(form);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to register customer.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#1F1916]/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-[#FFFFFF] border border-[#E8DFD3] rounded-xl shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-7 sm:px-10 pt-8 pb-2">
          <MonoLabel>New customer</MonoLabel>
          <button onClick={onClose} aria-label="Close" className="text-[#A3958B] hover:text-[#2A211D] transition-colors p-1 rounded-full hover:bg-[#F2ECE1]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-7 sm:px-10 pb-9 pt-2">
          <h2 className="text-3xl leading-tight mb-2 text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Register customer
          </h2>
          <p className="text-[14px] text-[#766A62] font-light mb-8 leading-relaxed">
            Create a customer account at the counter. It will remain pending until an Admin approves it.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div role="alert" className="border border-[#C86A58]/30 bg-[#FDF4F2] px-4 py-3 rounded-lg text-sm text-[#9A3B2A]">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
              <div>
                <label htmlFor="custFirstName" className="block mb-1.5"><MonoLabel>First name</MonoLabel></label>
                <div className="relative flex items-center border-b border-[#E2D7C7] focus-within:border-[#2A211D] transition-colors">
                  <User className="w-4 h-4 text-[#A3958B]" strokeWidth={1.5} />
                  <input 
                    id="custFirstName" 
                    value={form.firstName} 
                    onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} 
                    placeholder="Juana" 
                    className="w-full bg-transparent placeholder-[#C2B5A8] text-[14px] pl-3 py-2.5 focus:outline-none text-[#2A211D]" 
                  />
                </div>
              </div>
              <div>
                <label htmlFor="custMiddleName" className="block mb-1.5"><MonoLabel>Middle name</MonoLabel></label>
                <div className="border-b border-[#E2D7C7] focus-within:border-[#2A211D] transition-colors">
                  <input 
                    id="custMiddleName" 
                    value={form.middleName} 
                    onChange={(e) => setForm((f) => ({ ...f, middleName: e.target.value }))} 
                    placeholder="Santos" 
                    className="w-full bg-transparent placeholder-[#C2B5A8] text-[14px] py-2.5 focus:outline-none text-[#2A211D]" 
                  />
                </div>
              </div>
              <div>
                <label htmlFor="custLastName" className="block mb-1.5"><MonoLabel>Last name</MonoLabel></label>
                <div className="border-b border-[#E2D7C7] focus-within:border-[#2A211D] transition-colors">
                  <input 
                    id="custLastName" 
                    value={form.lastName} 
                    onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} 
                    placeholder="Dela Cruz" 
                    className="w-full bg-transparent placeholder-[#C2B5A8] text-[14px] py-2.5 focus:outline-none text-[#2A211D]" 
                  />
                </div>
              </div>
              <div>
                <label htmlFor="custSuffix" className="block mb-1.5"><MonoLabel>Suffix (optional)</MonoLabel></label>
                <div className="border-b border-[#E2D7C7] focus-within:border-[#2A211D] transition-colors">
                  <input 
                    id="custSuffix" 
                    value={form.suffix} 
                    onChange={(e) => setForm((f) => ({ ...f, suffix: e.target.value }))} 
                    placeholder="Jr., Sr., III" 
                    className="w-full bg-transparent placeholder-[#C2B5A8] text-[14px] py-2.5 focus:outline-none text-[#2A211D]" 
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
              <div>
                <label htmlFor="custBirthDate" className="block mb-1.5"><MonoLabel>Birth date</MonoLabel></label>
                <div className="border-b border-[#E2D7C7] focus-within:border-[#2A211D] transition-colors">
                  <input 
                    id="custBirthDate" 
                    type="date" 
                    value={form.dateOfBirth} 
                    onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} 
                    required 
                    className="w-full bg-transparent text-[14px] py-2.5 focus:outline-none text-[#2A211D]" 
                  />
                </div>
              </div>
              <div>
                <label htmlFor="custGender" className="block mb-1.5"><MonoLabel>Gender</MonoLabel></label>
                <div className="border-b border-[#E2D7C7] focus-within:border-[#2A211D] transition-colors">
                  <select 
                    id="custGender" 
                    value={form.gender} 
                    onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))} 
                    required 
                    className="w-full bg-transparent text-[14px] py-2.5 focus:outline-none text-[#2A211D]"
                  >
                    <option value="">Select gender</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="custCivilStatus" className="block mb-1.5"><MonoLabel>Civil status (optional)</MonoLabel></label>
                <div className="border-b border-[#E2D7C7] focus-within:border-[#2A211D] transition-colors">
                  <select 
                    id="custCivilStatus" 
                    value={form.civilStatus} 
                    onChange={(e) => setForm((f) => ({ ...f, civilStatus: e.target.value }))} 
                    className="w-full bg-transparent text-[14px] py-2.5 focus:outline-none text-[#2A211D]"
                  >
                    <option value="">Select status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widowed">Widowed</option>
                    <option value="Separated">Separated</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="custOccupation" className="block mb-1.5"><MonoLabel>Occupation (optional)</MonoLabel></label>
                <div className="border-b border-[#E2D7C7] focus-within:border-[#2A211D] transition-colors">
                  <input 
                    id="custOccupation" 
                    value={form.occupation} 
                    onChange={(e) => setForm((f) => ({ ...f, occupation: e.target.value }))} 
                    placeholder="e.g. Teacher" 
                    className="w-full bg-transparent placeholder-[#C2B5A8] text-[14px] py-2.5 focus:outline-none text-[#2A211D]" 
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
              <div>
                <label htmlFor="custContact" className="block mb-1.5"><MonoLabel>Contact number</MonoLabel></label>
                <div className="relative flex items-center border-b border-[#E2D7C7] focus-within:border-[#2A211D] transition-colors">
                  <Phone className="w-4 h-4 text-[#A3958B]" strokeWidth={1.5} />
                  <input 
                    id="custContact" 
                    value={form.contact} 
                    onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} 
                    placeholder="0917 000 0000" 
                    className="w-full bg-transparent placeholder-[#C2B5A8] text-[14px] pl-3 py-2.5 focus:outline-none text-[#2A211D]" 
                  />
                </div>
              </div>
              <div>
                <label htmlFor="custEmail" className="block mb-1.5"><MonoLabel>Email address</MonoLabel></label>
                <div className="relative flex items-center border-b border-[#E2D7C7] focus-within:border-[#2A211D] transition-colors">
                  <Mail className="w-4 h-4 text-[#A3958B]" strokeWidth={1.5} />
                  <input 
                    id="custEmail" 
                    type="email" 
                    value={form.email} 
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} 
                    placeholder="you@example.com" 
                    required 
                    className="w-full bg-transparent placeholder-[#C2B5A8] text-[14px] pl-3 py-2.5 focus:outline-none text-[#2A211D]" 
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="custPassword" className="block mb-1.5"><MonoLabel>Temporary password</MonoLabel></label>
              <div className="relative flex items-center border-b border-[#E2D7C7] focus-within:border-[#2A211D] transition-colors">
                <Lock className="w-4 h-4 text-[#A3958B]" strokeWidth={1.5} />
                <input 
                  id="custPassword" 
                  type="password" 
                  value={form.password} 
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} 
                  placeholder="At least 8 characters" 
                  required 
                  className="w-full bg-transparent placeholder-[#C2B5A8] text-[14px] pl-3 py-2.5 focus:outline-none text-[#2A211D]" 
                />
              </div>
            </div>

            <div>
              <label htmlFor="custAddress" className="block mb-1.5"><MonoLabel>Address (optional)</MonoLabel></label>
              <div className="relative flex items-center border-b border-[#E2D7C7] focus-within:border-[#2A211D] transition-colors">
                <MapPin className="w-4 h-4 text-[#A3958B]" strokeWidth={1.5} />
                <input 
                  id="custAddress" 
                  value={form.address} 
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} 
                  placeholder="Street, Barangay, City" 
                  className="w-full bg-transparent placeholder-[#C2B5A8] text-[14px] pl-3 py-2.5 focus:outline-none text-[#2A211D]" 
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="flex-1 px-4 py-3 rounded-lg border border-[#E2D7C7] text-[#766A62] text-[11px] font-semibold tracking-[0.14em] uppercase hover:bg-[#F2ECE1] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-3 rounded-lg bg-[#2A211D] text-[#FAF7F2] text-[11px] font-semibold tracking-[0.14em] uppercase hover:bg-[#3D312B] transition-colors shadow-md disabled:opacity-50"
              >
                {saving ? 'Registering...' : 'Register customer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}