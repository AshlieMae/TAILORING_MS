import { useState, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  Search,
  Check,
  X,
  Ban,
  RotateCcw,
  ChevronDown,
  Filter,
  Plus,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';

/* ---------------------------------------------------------------
   ADMIN — User Management
   "The Fitting Register"
   Staff and customer accounts read like entries in a tailor's
   appointment register: navy ink, brass as the working accent, and
   status shown as a wax-seal stamp rather than a pill badge. Each
   row carries a thin colored tab on its left edge — the register's
   index-card system.
------------------------------------------------------------------ */

const INK = '#20242E';
const PAPER = '#FBF9F2';
const PAGE = '#EDE7D6';
const LINE = '#D8CFAE';
const MUTED = '#847A5F';
const FAINT = '#A69A76';
const NAVY = '#232B3A';
const NAVY_HOVER = '#2C3548';
const BRASS = '#B8892B';
const RED = '#A63D40';

function MonoLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`text-[10px] tracking-[0.22em] uppercase text-[#A69A76] ${className}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      {children}
    </span>
  );
}

type AccountStatus = 'pending' | 'approved' | 'rejected' | 'disabled';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const authToken = () => localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
type AccountRole = 'front_desk' | 'tailor' | 'customer';
type UserRole = AccountRole | 'admin';

interface PendingUser {
  dbId: number;
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  requestedAt: string;
}

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Admin',
  front_desk: 'Front Desk',
  tailor: 'Master Tailor',
  customer: 'Customer',
};

/* Wax-seal stamp tones — the register's index-tab colors, reused
   for both the row's left edge and the round stamp. */
const STATUS_META: Record<AccountStatus, { label: string; ink: string; ring: string; wash: string }> = {
  pending: { label: 'Pending', ink: '#8A6A2E', ring: '#D8B96B', wash: '#F4E6C4' },
  approved: { label: 'Approved', ink: '#2F5233', ring: '#8FAE85', wash: '#DCE7D3' },
  rejected: { label: 'Rejected', ink: '#8B3235', ring: '#C98A8C', wash: '#F2DCDB' },
  disabled: { label: 'Disabled', ink: '#5A5648', ring: '#B5AE94', wash: '#E4E0D2' },
};

const FILTERS: { key: AccountStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All accounts' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'disabled', label: 'Disabled' },
];

/* Signature element: a round wax-seal stamp instead of a pill badge. */
function StatusStamp({ status }: { status: AccountStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className="inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border"
      style={{ borderColor: meta.ring, background: meta.wash }}
    >
      <span
        className="flex h-4 w-4 items-center justify-center rounded-full border-2"
        style={{ borderColor: meta.ink, background: PAPER }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.ink }} />
      </span>
      <span className="text-[10px] tracking-[0.14em] uppercase font-medium" style={{ color: meta.ink, fontFamily: "'IBM Plex Mono', monospace" }}>
        {meta.label}
      </span>
    </span>
  );
}

/* ---------------------------------------------------------------
   Create Account modal — for accounts the Admin creates directly
   (Front Desk, Tailor, Customer), bypassing self-registration.
   Per the spec: these accounts are Approved immediately since the
   Admin is vouching for them.
------------------------------------------------------------------ */
interface NewAccountForm {
  lastName: string;
  middleName: string;
  firstName: string;
  suffix: string;
  email: string;
  role: AccountRole;
  tempPassword: string;
}

function CreateAccountModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (form: NewAccountForm) => Promise<void>;
}) {
  const [form, setForm] = useState<NewAccountForm>({ lastName: '', middleName: '', firstName: '', suffix: '', email: '', role: 'front_desk', tempPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.lastName.trim() || !form.firstName.trim() || !form.email.trim() || !form.tempPassword.trim()) {
      setError('Last name, first name, email, and temporary password are required.');
      return;
    }
    if (form.tempPassword.length < 8) {
      setError('Temporary password should be at least 8 characters.');
      return;
    }
    try { await onCreate(form); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to create account.'); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#14120D]/50 backdrop-blur-[2px]" onClick={onClose} />

      <div className="relative w-full max-w-3xl bg-[#FBF9F2] border border-[#D8CFAE] rounded-sm shadow-[0_25px_70px_-25px_rgba(35,30,15,0.45)]">
        <div className="flex items-center justify-between px-7 sm:px-10 pt-8">
          <MonoLabel>New register entry</MonoLabel>
          <button onClick={onClose} aria-label="Close" className="text-[#A69A76] hover:text-[#20242E] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-7 sm:px-10 pb-9 pt-3">
          <h2 className="text-3xl leading-tight mb-2 text-[#20242E]" style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontStyle: 'italic' }}>
            Create account
          </h2>
          <p className="text-[14px] text-[#847A5F] font-light mb-8 leading-relaxed">
            Admin-created accounts skip the approval queue and are marked Approved right away.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div role="alert" className="border border-[#A63D40]/30 bg-[#A63D40]/10 px-3 py-2 text-sm text-[#8B3235]">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
              <div>
                <label htmlFor="lastName" className="block mb-2"><MonoLabel>Last name</MonoLabel></label>
                <div className="relative flex items-center border-b border-[#D8CFAE] focus-within:border-[#B8892B] transition-colors">
                  <User className="w-4 h-4 text-[#A69A76]" strokeWidth={1.5} />
                  <input id="lastName" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} placeholder="Dela Cruz" className="w-full bg-transparent placeholder-[#B6AC8E] text-[14px] pl-3 py-2.5 focus:outline-none" />
                </div>
              </div>
              <div>
                <label htmlFor="middleName" className="block mb-2"><MonoLabel>Middle name</MonoLabel></label>
                <div className="border-b border-[#D8CFAE] focus-within:border-[#B8892B] transition-colors">
                  <input id="middleName" value={form.middleName} onChange={(e) => setForm((f) => ({ ...f, middleName: e.target.value }))} placeholder="Santos" className="w-full bg-transparent placeholder-[#B6AC8E] text-[14px] py-2.5 focus:outline-none" />
                </div>
              </div>
              <div>
                <label htmlFor="firstName" className="block mb-2"><MonoLabel>First name</MonoLabel></label>
                <div className="border-b border-[#D8CFAE] focus-within:border-[#B8892B] transition-colors">
                  <input id="firstName" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} placeholder="Juana" className="w-full bg-transparent placeholder-[#B6AC8E] text-[14px] py-2.5 focus:outline-none" />
                </div>
              </div>
              <div>
                <label htmlFor="suffix" className="block mb-2"><MonoLabel>Suffix (optional)</MonoLabel></label>
                <div className="border-b border-[#D8CFAE] focus-within:border-[#B8892B] transition-colors">
                  <input id="suffix" value={form.suffix} onChange={(e) => setForm((f) => ({ ...f, suffix: e.target.value }))} placeholder="Jr., Sr., III" className="w-full bg-transparent placeholder-[#B6AC8E] text-[14px] py-2.5 focus:outline-none" />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="newEmail" className="block mb-2"><MonoLabel>Email address</MonoLabel></label>
              <div className="relative flex items-center border-b border-[#D8CFAE] focus-within:border-[#B8892B] transition-colors">
                <Mail className="w-4 h-4 text-[#A69A76]" strokeWidth={1.5} />
                <input
                  id="newEmail"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="you@example.com"
                  className="w-full bg-transparent placeholder-[#B6AC8E] text-[14px] pl-3 py-2.5 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="role" className="block mb-2"><MonoLabel>Role</MonoLabel></label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(ROLE_LABEL) as AccountRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, role: r }))}
                    className={`px-2 py-2.5 rounded-sm border text-[11px] tracking-[0.08em] uppercase transition-colors ${
                      form.role === r
                        ? 'bg-[#232B3A] border-[#232B3A] text-[#F3EEDD]'
                        : 'border-[#D8CFAE] text-[#847A5F] hover:border-[#A69A76]'
                    }`}
                  >
                    {ROLE_LABEL[r]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="tempPassword" className="block mb-2"><MonoLabel>Temporary password</MonoLabel></label>
              <div className="relative flex items-center border-b border-[#D8CFAE] focus-within:border-[#B8892B] transition-colors">
                <Lock className="w-4 h-4 text-[#A69A76]" strokeWidth={1.5} />
                <input
                  id="tempPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={form.tempPassword}
                  onChange={(e) => setForm((f) => ({ ...f, tempPassword: e.target.value }))}
                  placeholder="At least 8 characters"
                  className="w-full bg-transparent placeholder-[#B6AC8E] text-[14px] pl-3 pr-8 py-2.5 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-0 text-[#A69A76] hover:text-[#B8892B] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-[#A69A76] mt-2">The user will be asked to set their own password on first login.</p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-sm border border-[#D8CFAE] text-[#847A5F] text-[11px] tracking-[0.14em] uppercase hover:border-[#A69A76] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-3 rounded-sm bg-[#232B3A] text-[#F3EEDD] text-[11px] tracking-[0.14em] uppercase hover:bg-[#2C3548] transition-colors"
              >
                Create account
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* Named export so it can be dropped straight into a dashboard's
   main panel (e.g. <UserManagementView /> inside admindashboard.tsx).
   Also the default export for standalone routing to /users. */
export function UserManagementView({ externalQuery = '' }: { externalQuery?: string }) {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<AccountStatus | 'all'>('all');
  const [pendingConfirm, setPendingConfirm] = useState<{ id: string; action: AccountStatus } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [justCreated, setJustCreated] = useState('');
  const [operationError, setOperationError] = useState('');

  useEffect(() => {
    const token = authToken();
    if (!token) {
      setOperationError('Please sign in as an admin to manage accounts.');
      setLoading(false);
      return;
    }
    fetch(`${API_URL}/auth/users`, { headers: { Authorization: `Bearer ${authToken()}` } })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Unable to load accounts.');
        setUsers(data.users.map((user: { id: number; full_name: string | null; email: string; role: UserRole; status: AccountStatus; created_at: string }) => ({
          dbId: user.id, id: accountIdentifier(user), fullName: user.full_name || user.email, email: user.email, role: user.role, status: user.status, requestedAt: user.created_at.slice(0, 10),
        })));
      })
      .catch((requestError) => {
        setOperationError(requestError instanceof Error ? requestError.message : 'Unable to load accounts.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setQuery(externalQuery);
  }, [externalQuery]);

  const counts = useMemo(() => {
    const base: Record<AccountStatus, number> = { pending: 0, approved: 0, rejected: 0, disabled: 0 };
    users.forEach((u) => { base[u.status] += 1; });
    return base;
  }, [users]);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchesFilter = activeFilter === 'all' || u.status === activeFilter;
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q || u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.id.toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [users, query, activeFilter]);

  async function applyStatusChange(id: string, next: AccountStatus) {
    setOperationError('');
    try {
      const user = users.find((item) => item.id === id);
      if (!user) throw new Error('User not found.');
      const response = await fetch(`${API_URL}/auth/users/${user.dbId}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` }, body: JSON.stringify({ status: next }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to update account status.');
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, status: next } : u)));
      setPendingConfirm(null);
    } catch (requestError) {
      setOperationError(requestError instanceof Error ? requestError.message : 'Unable to update account status.');
    }
  }

  async function handleCreateAccount(form: NewAccountForm) {
    const fullName = [form.firstName, form.middleName, form.lastName].map((name) => name.trim()).filter(Boolean).join(' ') + (form.suffix.trim() ? `, ${form.suffix.trim()}` : '');
    const response = await fetch(`${API_URL}/auth/users`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` }, body: JSON.stringify({ email: form.email, password: form.tempPassword, role: form.role, fullName }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to create account.');
    const newUser: PendingUser = { dbId: data.user.id, id: accountIdentifier(data.user), fullName: data.user.full_name || fullName, email: data.user.email, role: data.user.role, status: data.user.status, requestedAt: data.user.created_at.slice(0, 10) };
    setUsers((prev) => [newUser, ...prev]);
    setShowCreateModal(false);
    setJustCreated(newUser.fullName);
    setTimeout(() => setJustCreated(''), 4000);
  }

  function actionsFor(status: AccountStatus): { key: AccountStatus; label: string; icon: ReactNode; tone: string }[] {
    if (status === 'pending') {
      return [
        { key: 'approved', label: 'Approve', icon: <Check className="w-3.5 h-3.5" />, tone: '#2F5233' },
        { key: 'rejected', label: 'Reject', icon: <X className="w-3.5 h-3.5" />, tone: '#8B3235' },
      ];
    }
    if (status === 'approved') {
      return [{ key: 'disabled', label: 'Disable', icon: <Ban className="w-3.5 h-3.5" />, tone: '#5A5648' }];
    }
    if (status === 'disabled' || status === 'rejected') {
      return [{ key: 'approved', label: 'Reactivate', icon: <RotateCcw className="w-3.5 h-3.5" />, tone: '#2F5233' }];
    }
    return [];
  }

  return (
    <div className="w-full space-y-8" style={{ color: INK }}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <MonoLabel>Admin — Account approval</MonoLabel>
          <h1 className="text-3xl sm:text-4xl leading-tight mt-1" style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontStyle: 'italic', color: INK }}>
            User management
          </h1>
          <p className="text-[14px] text-[#847A5F] font-light mt-3 max-w-3xl leading-relaxed">
            Approve, reject, disable, or reactivate Front Desk, Tailor, and Customer accounts.
            Only approved accounts can sign in.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex-shrink-0 inline-flex items-center gap-2 text-[#F3EEDD] text-[11px] tracking-[0.16em] uppercase font-medium px-6 py-4 rounded-sm shadow-[0_4px_14px_-4px_rgba(35,30,15,0.35)] hover:-translate-y-px hover:shadow-[0_6px_18px_-4px_rgba(35,30,15,0.4)] transition-all"
          style={{ background: NAVY }}
          onMouseEnter={(e) => { e.currentTarget.style.background = NAVY_HOVER; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = NAVY; }}
        >
          <Plus className="w-4 h-4" />
          Create account
        </button>
      </div>

      {justCreated && (
        <div className="flex items-center gap-2 border border-[#8FAE85] bg-[#DCE7D3] px-3 py-2.5 text-sm text-[#2F5233] rounded-sm">
          <Check className="w-4 h-4" />
          <span>{justCreated}'s account was created and approved.</span>
        </div>
      )}
      {operationError && <div role="alert" className="border border-[#A63D40]/30 bg-[#A63D40]/10 px-3 py-2.5 text-sm text-[#8B3235] rounded-sm">{operationError}</div>}

      {/* ---------------- SEARCH + FILTERS ---------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative flex items-center border-b border-[#D8CFAE] focus-within:border-[#B8892B] transition-colors flex-1 max-w-sm">
          <Search className="w-4 h-4 text-[#A69A76]" strokeWidth={1.5} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, or ID"
            className="w-full bg-transparent placeholder-[#B6AC8E] text-[14px] pl-3 py-2.5 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-[#A69A76]" strokeWidth={1.5} />
          {FILTERS.map((f) => {
            const active = activeFilter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className="px-3.5 py-1.5 rounded-full text-[10px] tracking-[0.14em] uppercase border transition-all"
                style={active
                  ? { background: NAVY, color: '#F3EEDD', borderColor: NAVY, boxShadow: '0 2px 6px -1px rgba(35,30,15,0.25)' }
                  : { background: PAPER, color: MUTED, borderColor: LINE }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.borderColor = FAINT; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.borderColor = LINE; }}
              >
                {f.label}
                {f.key !== 'all' && (
                  <span className="ml-1.5 opacity-70">{counts[f.key as AccountStatus]}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------------- TABLE ---------------- */}
      <div className="bg-[#FBF9F2] rounded-sm border border-[#D8CFAE] overflow-x-auto shadow-[0_1px_3px_rgba(35,30,15,0.06)]">
        <div className="min-w-[940px]">
        <div className="hidden md:grid grid-cols-[1.25fr_1.55fr_0.9fr_0.85fr_0.95fr_1.15fr] gap-6 px-8 py-4 border-b border-[#D8CFAE] bg-[#F3EEDD]/60">
          {['Name', 'Email', 'Role', 'Requested', 'Status', 'Actions'].map((h) => (
            <span key={h} className="text-[10px] tracking-[0.2em] uppercase text-[#A69A76]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              {h}
            </span>
          ))}
        </div>

        {loading && (
          <div className="px-6 py-16 text-center">
            <p className="text-sm text-[#847A5F]">Loading accounts…</p>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="px-6 py-16 text-center">
            <p className="text-sm text-[#847A5F]">No accounts match this search.</p>
          </div>
        )}

        {filtered.map((user) => {
          const actions = actionsFor(user.status);
          const confirming = pendingConfirm?.id === user.id;
          const tab = STATUS_META[user.status];
          return (
            <div
              key={user.id}
              className="relative grid min-w-[940px] grid-cols-[1.25fr_1.55fr_0.9fr_0.85fr_0.95fr_1.15fr] gap-6 pl-8 pr-8 py-5 border-b border-[#D8CFAE] last:border-b-0 items-center hover:bg-[#F3EEDD]/50 transition-colors"
            >
              <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: tab.ring }} aria-hidden="true" />
              <div>
                <div className="text-[14px] font-medium">{user.fullName}</div>
                <div className="text-[11px] text-[#A69A76]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  {user.id}
                </div>
              </div>
              <div className="text-[13px] text-[#5C563F] truncate">{user.email}</div>
              <div className="text-[12px] text-[#5C563F]">{ROLE_LABEL[user.role]}</div>
              <div className="text-[12px] text-[#847A5F]">{user.requestedAt}</div>
              <div>
                <StatusStamp status={user.status} />
              </div>

              <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                {confirming ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#847A5F]">
                      {pendingConfirm.action === 'rejected' ? 'Reject this account?' : pendingConfirm.action === 'disabled' ? 'Disable this account?' : 'Confirm?'}
                    </span>
                    <button
                      onClick={() => applyStatusChange(user.id, pendingConfirm.action)}
                      className="px-2.5 py-1 rounded-sm text-[#F3EEDD] text-[10px] tracking-[0.1em] uppercase"
                      style={{ background: NAVY }}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setPendingConfirm(null)}
                      className="px-2.5 py-1 rounded-sm border border-[#D8CFAE] text-[#847A5F] text-[10px] tracking-[0.1em] uppercase"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  actions.map((a) => (
                    <button
                      key={a.key}
                      onClick={() =>
                        a.key === 'rejected' || a.key === 'disabled'
                          ? setPendingConfirm({ id: user.id, action: a.key })
                          : applyStatusChange(user.id, a.key)
                      }
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border border-[#D8CFAE] hover:border-[#A69A76] text-[10px] tracking-[0.1em] uppercase transition-colors"
                      style={{ color: a.tone }}
                    >
                      {a.icon}
                      {a.label}
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })}
        </div>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-[#A69A76]">
        <ChevronDown className="w-3.5 h-3.5" />
        <span>{filtered.length} of {users.length} accounts shown</span>
      </div>

      {showCreateModal && (
        <CreateAccountModal onClose={() => setShowCreateModal(false)} onCreate={handleCreateAccount} />
      )}
    </div>
  );
}

/* Default export renders the page standalone (e.g. routed at /users) */
export default function UserManagementPage() {
  return (
    <div className="min-h-screen bg-[#EDE7D6] text-[#20242E] antialiased" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, #20242E 0px, #20242E 1px, transparent 1px, transparent 6px), repeating-linear-gradient(90deg, #20242E 0px, #20242E 1px, transparent 1px, transparent 6px)',
        }}
      />
      <div className="relative max-w-6xl mx-auto px-6 sm:px-10 py-10">
        <UserManagementView />
      </div>
    </div>
  );
}

function accountIdentifier(user: { id: number; role: UserRole; employee_id?: string | null; customer_id?: string | null }) {
  if (user.role === 'customer') return user.customer_id || `CUS-${String(user.id).padStart(5, '0')}`;
  if (user.role === 'front_desk' || user.role === 'tailor') return user.employee_id || `EMP-${String(user.id).padStart(5, '0')}`;
  return `U-${user.id}`;
}