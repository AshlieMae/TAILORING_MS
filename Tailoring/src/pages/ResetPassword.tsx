import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, ArrowLeft, Scissors, Check } from 'lucide-react';

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400;1,9..144,500&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
@keyframes riseIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.fp-field { opacity: 0; animation: riseIn 0.55s cubic-bezier(0.22,1,0.36,1) forwards; }
`;

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [valid, setValid] = useState<boolean | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      if (!token) { setValid(false); return; }
      try {
        const res = await fetch(`${API_URL}/auth/reset-password/validate?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        setValid(res.ok && data.valid);
      } catch {
        setValid(false);
      }
    })();
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) { setError('Password must be at least 8 characters long.'); return; }
    if (newPassword !== confirm) { setError('Passwords do not match.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Reset failed.');
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }} className="min-h-screen flex items-center justify-center bg-[#EEE8D9] p-6">
      <style>{FONT_IMPORT}</style>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-2 text-[#232B22]">
            <Scissors className="w-5 h-5" strokeWidth={1.5} />
            <span className="font-serif text-xl" style={{ fontFamily: "'Fraunces', serif" }}>Ashlie's Tailor</span>
          </span>
          <h1 className="font-serif text-3xl mt-6 text-[#232B22]" style={{ fontFamily: "'Fraunces', serif" }}>
            Reset password
          </h1>
        </div>

        <div className="bg-[#FBF8F0] border border-[#D8CFAE] rounded p-7 shadow-sm">
          {done ? (
            <div className="text-center">
              <div className="mx-auto w-10 h-10 rounded-full bg-[#E4DDC8] flex items-center justify-center text-[#232B22]">
                <Check className="w-5 h-5" />
              </div>
              <p className="text-[13px] text-[#847A5F] mt-4">
                Your password has been reset. You can now sign in with your new password.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="mt-5 w-full inline-flex items-center justify-center gap-3 bg-[#232B22] text-[#F3EEDD] text-[11px] tracking-[0.2em] uppercase font-medium px-6 py-4 rounded-sm hover:bg-[#2C3629] transition-colors"
              >
                Go to sign in
              </button>
            </div>
          ) : valid === false ? (
            <div className="text-center">
              <p className="text-[13px] text-[#A63D40]">
                This reset link is invalid or has expired. Please request a new one.
              </p>
              <Link to="/forgot-password" className="mt-5 inline-flex items-center gap-2 text-xs text-[#A63D40] hover:text-[#8B3235] transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Request a new link
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              {error && (
                <div className="text-[12px] text-[#A63D40] border border-[#A63D40]/30 bg-[#A63D40]/5 rounded px-3 py-2">
                  {error}
                </div>
              )}
              <div className="fp-field">
                <label className="block mb-2 text-[10px] tracking-[0.24em] uppercase text-[#8A8060]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  New password
                </label>
                <div className="flex items-center border-b border-[#D8CFAE] focus-within:border-[#A63D40] transition-colors">
                  <Lock className="w-4 h-4 text-[#A69A76]" strokeWidth={1.5} />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full bg-transparent placeholder-[#B6AC8E] text-[14px] pl-3 py-3 focus:outline-none"
                  />
                </div>
              </div>

              <div className="fp-field">
                <label className="block mb-2 text-[10px] tracking-[0.24em] uppercase text-[#8A8060]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  Confirm new password
                </label>
                <div className="flex items-center border-b border-[#D8CFAE] focus-within:border-[#A63D40] transition-colors">
                  <Lock className="w-4 h-4 text-[#A69A76]" strokeWidth={1.5} />
                  <input
                    type="password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full bg-transparent placeholder-[#B6AC8E] text-[14px] pl-3 py-3 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || valid === null}
                className="fp-field w-full inline-flex items-center justify-center gap-3 bg-[#232B22] text-[#F3EEDD] text-[11px] tracking-[0.2em] uppercase font-medium px-6 py-4 rounded-sm hover:bg-[#2C3629] transition-colors disabled:opacity-60"
                style={{ animationDelay: '0.12s' }}
              >
                {submitting ? 'Saving…' : valid === null ? 'Checking link…' : 'Save new password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

