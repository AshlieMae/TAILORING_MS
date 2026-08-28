// @ts-nocheck
import { useEffect, useState } from 'react';
import { Bell, Check, Save, UserRound, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { PasswordChangePanel } from '../components/PasswordChangePanel';

/* ===================================================================
   PRESS & TAILOR — Settings
   Premium pass: the alert toggles now sit beside a small ledger
   chart of how many notifications actually fired each day this
   week, so a tailor can judge whether an alert type is worth
   leaving on rather than toggling blind.
=================================================================== */

const TOKENS = {
  ink: '#262420', inkSoft: '#55503F', paper: '#FBF9F2', paperDim: '#F4F1E6',
  line: '#DCD8C7', lineSoft: '#E8E4D5', muted: '#8A846F', muted2: '#A39D8A',
  brass: '#C9A227', brassLight: '#E4C25E', pin: '#C0392B', green: '#3F6633',
};

const ALERT_ACTIVITY = [
  { day: 'Mon', count: 2 }, { day: 'Tue', count: 4 }, { day: 'Wed', count: 1 },
  { day: 'Thu', count: 5 }, { day: 'Fri', count: 3 }, { day: 'Sat', count: 6 }, { day: 'Sun', count: 2 },
];
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const authToken = () => localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';

function MonoLabel({ children, className = '' }) {
  return (
    <span className={`text-[10px] uppercase tracking-[0.2em] ${className}`} style={{ color: TOKENS.muted, fontFamily: "'JetBrains Mono', monospace" }}>
      {children}
    </span>
  );
}

function LedgerTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[3px] px-3 py-2" style={{ background: TOKENS.paper, border: `1px solid ${TOKENS.line}`, boxShadow: '0 10px 24px -10px rgba(38,36,32,0.35)' }}>
      <div className="text-[9px] uppercase tracking-[0.16em]" style={{ color: TOKENS.muted, fontFamily: "'JetBrains Mono', monospace" }}>{label}</div>
      <div className="mt-0.5 text-[13px] font-semibold" style={{ color: TOKENS.ink, fontFamily: "'Fraunces', serif" }}>{payload[0].value} alerts</div>
    </div>
  );
}

export function TailorSettingsView() {
  const [alerts, setAlerts] = useState({ fittings: true, dueDates: true, assignments: false });
  const [profile, setProfile] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [activity, setActivity] = useState(ALERT_ACTIVITY);
  const [weekTotal, setWeekTotal] = useState(ALERT_ACTIVITY.reduce((s, d) => s + d.count, 0));
  const [counts, setCounts] = useState<Record<string, number>>({ fittings: 0, dueDates: 0, assignments: 0 });

  const toggle = (key) => setAlerts((current) => ({ ...current, [key]: !current[key] }));
  useEffect(() => {
    const headers = { Authorization: `Bearer ${authToken()}` };
    Promise.all([fetch(`${API_URL}/auth/me`, { headers }), fetch(`${API_URL}/auth/user-settings`, { headers })])
      .then(async ([me, preferences]) => {
        const user = (await me.json()).user;
        const settings = (await preferences.json()).settings;
        setProfile(user);
        if (settings) setAlerts((current) => ({ ...current, ...settings }));
      })
      .catch(() => {});
    // Pull the real weekly alert totals + sparkline from the server.
    fetch(`${API_URL}/tailor/alerts`, { headers })
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        if (data.daily?.length) {
          setActivity(data.daily);
          setWeekTotal(data.weekTotal || 0);
          setCounts(data.counts || {});
        }
      })
      .catch(() => { /* keep demo fallback */ });
  }, []);
  const save = async () => { setError(''); try { const response = await fetch(`${API_URL}/auth/user-settings`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` }, body: JSON.stringify({ settings: alerts }) }); const data = await response.json(); if (!response.ok) throw new Error(data.message || 'Unable to save preferences.'); setSaved(true); window.setTimeout(() => setSaved(false), 3000); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to save preferences.'); } };

  return (
    <div className="w-full space-y-6">
      <style>{`
        @keyframes riseIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .dash-in { opacity: 0; animation: riseIn 0.55s cubic-bezier(0.22,1,0.36,1) forwards; }
        @media (prefers-reduced-motion: reduce) { .dash-in { opacity: 1; animation: none; } }
      `}</style>

      <header className="dash-in relative pb-6">
        <svg className="absolute bottom-0 left-0 w-full" height="2" preserveAspectRatio="none" aria-hidden="true">
          <line x1="0" y1="1" x2="100%" y2="1" stroke="#C9A227" strokeWidth="2" strokeDasharray="1 5" strokeLinecap="round" />
        </svg>
        <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#8A846F]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Personal workbench</span>
        <h1 className="mt-2 text-[32px] font-semibold text-[#262420]" style={{ fontFamily: "'Fraunces', serif" }}>Settings</h1>
        <p className="mt-2 text-sm text-[#6D6A60]">Control the tailor workspace and production notifications.</p>
      </header>

      {saved && (
        <div className="flex items-center gap-2 border border-[#8FAE85]/60 bg-[#E4E9DB] p-3 rounded-[3px] text-sm text-[#3F6633]" style={{ boxShadow: '0 1px 2px rgba(38,36,32,0.05), 0 10px 28px -14px rgba(38,36,32,0.22)' }}>
          <Check className="h-4 w-4 flex-shrink-0" />
          Preferences saved.
        </div>
      )}
      {error && <div role="alert" className="border border-[#C0392B]/30 bg-[#F9E8E5] p-3 rounded-[3px] text-sm text-[#C0392B]">{error}</div>}

      <section className="dash-in border border-[#DCD8C7] bg-[#FBF9F2] p-6 sm:p-8 rounded-[3px]" style={{ boxShadow: '0 1px 2px rgba(38,36,32,0.05), 0 10px 28px -14px rgba(38,36,32,0.22)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[3px] border border-[#C9A227]/25 flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, rgba(228,194,94,0.18), rgba(201,162,39,0.05))' }}>
            <UserRound className="h-4 w-4 text-[#9C7D12]" strokeWidth={1.6} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#262420]" style={{ fontFamily: "'Fraunces', serif" }}>Tailor profile</h2>
            <p className="text-sm text-[#6D6A60]">Shown on your assigned job cards.</p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Full name" value={profile?.full_name || 'Not recorded'} />
          <Field label="Position" value={profile?.position || 'Master Tailor'} />
        </div>
      </section>

      <section className="dash-in border border-[#DCD8C7] bg-[#FBF9F2] p-6 sm:p-8 rounded-[3px]" style={{ boxShadow: '0 1px 2px rgba(38,36,32,0.05), 0 10px 28px -14px rgba(38,36,32,0.22)' }}>
        <h2 className="text-xl font-semibold text-[#262420]" style={{ fontFamily: "'Fraunces', serif" }}>Account security</h2>
        <p className="mt-1 text-sm text-[#6D6A60]">Keep your master tailor account secure.</p>
        <div className="mt-5"><PasswordChangePanel buttonClassName="rounded-[2px] border border-[#DCD8C7] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#55503F] hover:bg-[#F4F1E6]" /></div>
      </section>

      <section className="dash-in border border-[#DCD8C7] bg-[#FBF9F2] p-6 sm:p-8 rounded-[3px]" style={{ boxShadow: '0 1px 2px rgba(38,36,32,0.05), 0 10px 28px -14px rgba(38,36,32,0.22)' }}>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[3px] border border-[#C9A227]/25 flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, rgba(228,194,94,0.18), rgba(201,162,39,0.05))' }}>
              <Bell className="h-4 w-4 text-[#9C7D12]" strokeWidth={1.6} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#262420]" style={{ fontFamily: "'Fraunces', serif" }}>Production alerts</h2>
              <p className="text-sm text-[#6D6A60]">Stay aware of work that needs attention.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 border border-[#DCD8C7] rounded-[2px] px-3 py-1.5" style={{ background: TOKENS.paperDim }}>
            <Activity className="h-3.5 w-3.5 text-[#9C7D12]" strokeWidth={1.6} />
            <span className="text-[11px] text-[#55503F]"><strong className="font-semibold text-[#262420]">{weekTotal}</strong> alerts this week</span>
          </div>
        </div>

        {/* ---------------- alert activity sparkline ---------------- */}
        <div className="mt-5 h-[80px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activity} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="alertFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={TOKENS.brassLight} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={TOKENS.brassLight} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: TOKENS.muted, fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} />
              <Tooltip content={<LedgerTooltip />} cursor={{ stroke: TOKENS.brass, strokeDasharray: '2 4' }} />
              <Area type="monotone" dataKey="count" stroke={TOKENS.brass} strokeWidth={2} fill="url(#alertFill)" dot={{ r: 3, fill: TOKENS.brass, stroke: TOKENS.paper, strokeWidth: 1.5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-2 divide-y divide-[#E8E4D5]">
          {[
            ['fittings', 'Fitting reminders', 'Upcoming client fitting appointments'],
            ['dueDates', 'Due-date warnings', 'Job cards approaching their deadline'],
            ['assignments', 'New assignments', 'New job cards assigned to your workbench'],
          ].map(([key, title, detail]) => (
            <div key={key} className="flex items-center justify-between gap-5 py-4">
              <div>
                <p className="text-sm font-medium text-[#262420]">{title}
                  <span className="ml-2 inline-flex items-center rounded-[2px] px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: TOKENS.paperDim, color: TOKENS.muted, fontFamily: "'JetBrains Mono', monospace" }}>
                    {counts[key] ?? 0}
                  </span>
                </p>
                <p className="mt-1 text-xs text-[#6D6A60]">{detail}</p>
              </div>
              <button
                onClick={() => toggle(key)}
                aria-pressed={alerts[key]}
                className={`h-6 w-11 rounded-full p-1 transition-colors ${alerts[key] ? 'bg-[#3F6633]' : 'bg-[#B4AF9E]'}`}
              >
                <span className={`block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${alerts[key] ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <button
        onClick={save}
        className="inline-flex items-center gap-2 bg-[#262420] px-5 py-3 rounded-[2px] text-[10px] font-semibold uppercase tracking-[0.15em] text-[#F3F1E7] hover:bg-[#312F2A] transition-colors shadow-[0_10px_24px_-12px_rgba(38,36,32,0.55)]"
      >
        <Save className="h-4 w-4" /> Save preferences
      </button>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <label className="block text-xs font-medium text-[#6D6A60]">
      {label}
      <input
        value={value}
        readOnly
        className="mt-2 w-full border border-[#DCD8C7] bg-white rounded-[2px] px-3 py-2.5 text-sm text-[#262420] outline-none focus:border-[#9C7D12] transition-colors"
      />
    </label>
  );
}

export default TailorSettingsView;
