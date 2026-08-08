import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Scissors } from 'lucide-react';

/* ---------------------------------------------------------------
   "The Measuring Line" — Login
   Press & Tailor, daylight version. Ink-espresso ticket motif
   swapped for a linen atelier: a deep-pine editorial panel on
   the left, a bright fitting-card form on the right, joined by
   a real tailor's tape measure (tick marks, cm numbers, pin)
   instead of a perforated seam. The submit button reads as a
   punched fabric swatch tag.
------------------------------------------------------------------ */

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400;1,9..144,500&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

@keyframes riseIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes pinDrop {
  from { opacity: 0; transform: translateY(-10px) rotate(-6deg); }
  to { opacity: 1; transform: translateY(0) rotate(-6deg); }
}
.ml-field { opacity: 0; animation: riseIn 0.55s cubic-bezier(0.22,1,0.36,1) forwards; }
`;

import type { ReactNode } from 'react';

function Label({ children }: { children: ReactNode }) {
  return (
    <span
      className="text-[10px] tracking-[0.24em] uppercase text-[#8A8060]"
      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
    >
      {children}
    </span>
  );
}

/* Vertical tape measure — the signature element */
function TapeMeasure() {
  const majorTicks = Array.from({ length: 11 }, (_, i) => i * 10);
  return (
    <div className="hidden lg:flex relative w-[52px] flex-shrink-0 bg-[#EFE8D6]">
      <div className="absolute inset-0 flex flex-col items-center py-8">
        <div className="relative flex-1 w-full">
          {majorTicks.map((n) => (
            <div
              key={n}
              className="absolute left-0 w-full flex items-center"
              style={{ top: `${(n / 100) * 100}%` }}
            >
              <div className="w-4 h-[1.5px] bg-[#6B6244]" />
              <span
                className="ml-1 text-[8px] text-[#6B6244]"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                {n}
              </span>
            </div>
          ))}
          {Array.from({ length: 51 }, (_, i) => i * 2).map(
            (n) =>
              n % 10 !== 0 && (
                <div
                  key={n}
                  className="absolute left-0 w-2.5 h-px bg-[#6B6244]/50"
                  style={{ top: `${(n / 100) * 100}%` }}
                />
              )
          )}
        </div>
      </div>
      {/* the "pin" marking the seam */}
      <div
        className="absolute left-1/2 -translate-x-1/2 top-[38%] w-2 h-2 rounded-full bg-[#A63D40] shadow-[0_0_0_3px_rgba(166,61,64,0.15)]"
        style={{ animation: 'pinDrop 0.7s 0.3s cubic-bezier(0.34,1.56,0.64,1) both' }}
      />
      <div className="absolute inset-y-0 right-0 w-px bg-[#D8CFAE]" />
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changeMode, setChangeMode] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

 const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setIsSubmitting(true);
    try {
      if (changeMode) {
        if (newPassword.length < 8) throw new Error('New password must be at least 8 characters.');
        if (newPassword !== confirmPassword) throw new Error('New passwords do not match.');
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/change-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, currentPassword: password, newPassword }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Unable to change password.');
        setNotice('Password changed successfully. You can now sign in.');
        setChangeMode(false); setPassword(''); setNewPassword(''); setConfirmPassword('');
        return;
      }
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || 'Unable to sign in. Please try again.');
        return;
      }
      const storage = remember ? localStorage : sessionStorage;
      const otherStorage = remember ? sessionStorage : localStorage;
      otherStorage.removeItem('authToken');
      otherStorage.removeItem('currentUser');
      storage.setItem('authToken', data.token);
      storage.setItem('currentUser', JSON.stringify(data.user));
      const destination = data.requiresProfile
        ? '/complete-profile'
        : data.user.role === 'admin'
        ? '/admin'
        : data.user.role === 'front_desk'
          ? '/frontdesk'
          : data.user.role === 'customer'
            ? '/customer'
            : data.user.role === 'tailor'
              ? '/master'
              : '/';
      navigate(destination, { replace: true });
    } catch {
      setError('Cannot reach the server. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#EDE7D6] text-[#242017] antialiased selection:bg-[#A63D40] selection:text-[#EDE7D6] flex items-center justify-center p-4 sm:p-8"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <style>{FONT_IMPORT}</style>

      {/* faint linen weave */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, #242017 0px, #242017 1px, transparent 1px, transparent 6px), repeating-linear-gradient(90deg, #242017 0px, #242017 1px, transparent 1px, transparent 6px)',
        }}
      />

      <div className="relative w-full max-w-7xl grid grid-cols-1 lg:grid-cols-[0.95fr_auto_1fr] rounded-md overflow-hidden shadow-[0_25px_70px_-25px_rgba(35,30,15,0.35)]">
        {/* ---------------- LEFT: EDITORIAL PANEL ---------------- */}
        <div className="relative hidden lg:flex flex-col justify-between p-10 bg-[#232B22] overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=900&auto=format&fit=crop"
            alt="Bolt of tailored fabric"
            className="absolute inset-0 w-full h-full object-cover opacity-[0.22]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#232B22]/40 via-[#232B22]/75 to-[#232B22]" />

          <button className="relative flex items-center gap-3 text-left" aria-label="Back to home">
            <div className="w-9 h-9 rounded-full border border-[#C9BB8E]/50 flex items-center justify-center">
              <Scissors className="w-4 h-4 text-[#C9BB8E]" strokeWidth={1.5} />
            </div>
            <div className="leading-tight text-[#F3EEDD]" style={{ fontFamily: "'Fraunces', serif" }}>
              <div className="text-base tracking-[0.08em]">Ashlie's Tailor</div>
              <div
                className="text-[9px] tracking-[0.3em] text-[#9BA98F] uppercase"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                Garment Atelier
              </div>
            </div>
          </button>

          <div className="relative space-y-5">
            <span
              className="inline-block text-[9px] tracking-[0.28em] uppercase text-[#9BA98F]"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              Fitting Room — Members
            </span>
            <h2
              className="text-4xl leading-[1.12] text-[#F3EEDD]"
              style={{ fontFamily: "'Fraunces', serif", fontWeight: 450 }}
            >
              Measured once.
              <br />
              <span className="italic text-[#D9B48A]">Remembered</span>
              <br />
              every time.
            </h2>
            <p className="text-[13px] text-[#B6AE94] font-light max-w-xs leading-relaxed">
              Sign in to check pickup times, track alterations, and revisit
              your fit notes.
            </p>
          </div>

          <div
            className="relative text-[9px] tracking-[0.25em] text-[#6E7A63] uppercase"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            Cut to order · Est. Nevada
          </div>
        </div>

        <TapeMeasure />

        {/* ---------------- RIGHT: FORM ---------------- */}
        <div className="relative bg-[#FBF9F2] p-8 sm:p-12">
          <button className="flex items-center gap-3 mb-8 lg:hidden text-left" aria-label="Back to home">
            <div className="w-9 h-9 rounded-full border border-[#232B22]/30 flex items-center justify-center">
              <Scissors className="w-4 h-4 text-[#232B22]" strokeWidth={1.5} />
            </div>
            <div className="leading-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              <div className="text-base tracking-[0.08em]">Ashlie's Tailor</div>
            </div>
          </button>

          <div className="mb-7">
            <Label>Account access</Label>
          </div>

          <h1
            className="text-3xl sm:text-4xl leading-tight mb-2 text-[#242017]"
            style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }}
          >
            {changeMode ? 'Change password' : 'Welcome back'}
          </h1>
          <p className="text-[13px] text-[#847A5F] font-light mb-9 leading-relaxed">
            {changeMode ? 'Enter your current password and choose a new one.' : 'Enter your details to pick up right where you left off.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div role="alert" className="border border-[#A63D40]/30 bg-[#A63D40]/10 px-3 py-2 text-sm text-[#8B3235]">
                {error}
              </div>
            )}
            {notice && <div role="status" className="border border-[#55734E]/30 bg-[#EEF5EA] px-3 py-2 text-sm text-[#3F6633]">{notice}</div>}
            <div className="ml-field" style={{ animationDelay: '0.05s' }}>
              <label htmlFor="email" className="block mb-2">
                <Label>Email address</Label>
              </label>
              <div className="relative flex items-center border-b border-[#D8CFAE] focus-within:border-[#A63D40] transition-colors">
                <Mail className="w-4 h-4 text-[#A69A76]" strokeWidth={1.5} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full bg-transparent placeholder-[#B6AC8E] text-[14px] pl-3 py-3 focus:outline-none"
                />
              </div>
            </div>

            <div className="ml-field" style={{ animationDelay: '0.12s' }}>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password">
                  <Label>Password</Label>
                </label>
                <button
                  type="button"
                  onClick={() => { setChangeMode((value) => !value); setError(''); setNotice(''); setNewPassword(''); setConfirmPassword(''); }}
                  className="text-[10px] tracking-[0.12em] uppercase text-[#A63D40] hover:text-[#8B3235] transition-colors"
                >
                  {changeMode ? 'Back to sign in' : 'Change password'}
                </button>
              </div>
              <div className="relative flex items-center border-b border-[#D8CFAE] focus-within:border-[#A63D40] transition-colors">
                <Lock className="w-4 h-4 text-[#A69A76]" strokeWidth={1.5} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-transparent placeholder-[#B6AC8E] text-[14px] pl-3 pr-8 py-3 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-0 text-[#A69A76] hover:text-[#A63D40] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {changeMode && <>
              <div className="ml-field" style={{ animationDelay: '0.16s' }}><label htmlFor="newPassword" className="block mb-2"><Label>New password</Label></label><input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="w-full bg-transparent border-b border-[#D8CFAE] py-3 text-[14px] focus:border-[#A63D40] focus:outline-none" /></div>
              <div className="ml-field" style={{ animationDelay: '0.2s' }}><label htmlFor="confirmPassword" className="block mb-2"><Label>Confirm new password</Label></label><input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="w-full bg-transparent border-b border-[#D8CFAE] py-3 text-[14px] focus:border-[#A63D40] focus:outline-none" /></div>
            </>}

            <div className="ml-field flex items-center justify-between pt-1" style={{ animationDelay: '0.18s' }}>
              <label className="flex items-center gap-2.5 text-xs text-[#847A5F] cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="rounded-sm border-[#D8CFAE] text-[#A63D40] focus:ring-[#A63D40]"
                />
                <span>Keep me signed in</span>
              </label>
            </div>

            {/* swatch-tag button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="ml-field group relative w-full inline-flex items-center justify-center gap-3 bg-[#232B22] text-[#F3EEDD] text-[11px] tracking-[0.2em] uppercase font-medium px-6 py-4 rounded-sm hover:bg-[#2C3629] transition-colors"
              style={{ animationDelay: '0.24s' }}
            >
              <span className="absolute left-4 w-1.5 h-1.5 rounded-full bg-[#EDE7D6]/70 shadow-[0_0_0_2px_rgba(237,231,214,0.15)]" />
              {isSubmitting ? 'Saving...' : changeMode ? 'Update password' : 'Sign in'}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </form>

          <div className="ml-field flex items-center gap-4 my-8" style={{ animationDelay: '0.3s' }}>
            <div className="h-px flex-1 bg-[#D8CFAE]" />
            <span
              className="text-[9px] tracking-[0.25em] uppercase text-[#A69A76]"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              Or
            </span>
            <div className="h-px flex-1 bg-[#D8CFAE]" />
          </div>

          <button
            type="button"
            className="ml-field w-full inline-flex items-center justify-center gap-3 bg-transparent border border-[#D8CFAE] text-[#242017] text-[11px] tracking-[0.16em] uppercase px-6 py-3.5 rounded-sm hover:border-[#A69A76] transition-colors"
            style={{ animationDelay: '0.36s' }}
          >
            <svg width="15" height="15" viewBox="0 0 48 48" aria-hidden="true">
              <path
                fill="#242017"
                opacity="0.85"
                d="M44.5 20H24v8.5h11.8C34.7 33.9 30 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.3 0 6.3 1.2 8.6 3.2l6-6C34.9 4.1 29.7 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.1-2.7-.5-4z"
              />
            </svg>
            Continue with Google
          </button>

          <p className="ml-field text-center text-[12px] text-[#A69A76] mt-9" style={{ animationDelay: '0.42s' }}>
            New to Ashlie's Tailor?{' '}
            <button type="button" onClick={() => navigate('/')} className="text-[#A63D40] hover:text-[#8B3235] transition-colors">
              Back to Home
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
