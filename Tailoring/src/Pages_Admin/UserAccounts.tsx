import { useState, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  Check, X, Ban, RotateCcw, ChevronDown, Filter, Plus, User, Mail, Lock, Eye, EyeOff,
} from 'lucide-react';
import {
  COLORS, FONT_IMPORT, PageHeader, SearchField, Card, EyebrowLabel, PrimaryButton, SecondaryButton,
  ModalShell, Badge, shadowSm,
} from './Theme';

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
  updatedAt: string | null;
  // Basic information — sourced per-row from the database (customers table for
  // customer accounts, users table for admin/front_desk/tailor). Never derived
  // from the logged-in session.
  contactNumber: string | null;
  address: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  civilStatus: string | null;
  occupation: string | null;
  position: string | null;
  dateHired: string | null;
  activityType?: 'profile_updated' | 'password_changed' | 'settings_updated' | null;
  activityDetails?: string | null;
  activityAt?: string | null;
}

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Admin',
  front_desk: 'Front Desk',
  tailor: 'Master Tailor',
  customer: 'Customer',
};

const STATUS_TONE: Record<AccountStatus, 'warning' | 'success' | 'danger' | 'neutral'> = {
  pending: 'warning', approved: 'success', rejected: 'danger', disabled: 'neutral',
};
const STATUS_LABEL: Record<AccountStatus, string> = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected', disabled: 'Disabled' };
const STATUS_TAB_COLOR: Record<AccountStatus, string> = { pending: COLORS.warning, approved: COLORS.success, rejected: COLORS.danger, disabled: COLORS.muted };

const FILTERS: { key: AccountStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All accounts' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'disabled', label: 'Disabled' },
];

interface NewAccountForm {
  lastName: string;
  middleName: string;
  firstName: string;
  suffix: string;
  email: string;
  role: AccountRole;
  tempPassword: string;
  contactNumber: string;
  address: string;
  dateOfBirth: string;
  gender: string;
  civilStatus: string;
  occupation: string;
}

function InputField({ id, label, icon, ...props }: { id: string; label: string; icon?: ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block"><span className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: COLORS.muted }}>{label}</span></label>
      <div className="relative flex items-center border-b transition-colors" style={{ borderColor: COLORS.border }} onFocus={(e) => { e.currentTarget.style.borderColor = COLORS.navy; }} onBlur={(e) => { e.currentTarget.style.borderColor = COLORS.border; }}>
        {icon && <span style={{ color: COLORS.faint }}>{icon}</span>}
        <input id={id} className="w-full bg-transparent py-2.5 text-[14px] outline-none" style={{ paddingLeft: icon ? 10 : 0, color: COLORS.ink }} {...props} />
      </div>
    </div>
  );
}

function CreateAccountModal({ onClose, onCreate }: { onClose: () => void; onCreate: (form: NewAccountForm) => Promise<void> }) {
  const [form, setForm] = useState<NewAccountForm>({ lastName: '', middleName: '', firstName: '', suffix: '', email: '', role: 'front_desk', tempPassword: '', contactNumber: '', address: '', dateOfBirth: '', gender: '', civilStatus: '', occupation: '' });
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
    if (form.role === 'customer' && (!form.contactNumber.trim() || !form.dateOfBirth || !form.gender)) {
      setError('Contact number, birth date, and gender are required for customer accounts.');
      return;
    }
    try { await onCreate(form); } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Unable to create account.'); }
  }

  return (
    <ModalShell onClose={onClose} maxWidth="max-w-3xl">
      <form onSubmit={handleSubmit}>
        <header className="flex items-start justify-between border-b px-7 py-6 sm:px-8" style={{ borderColor: COLORS.border }}>
          <div>
            <EyebrowLabel>New register entry</EyebrowLabel>
            <h2 className="mt-1.5 text-2xl font-semibold" style={{ color: COLORS.ink }}>Create account</h2>
            <p className="mt-2 max-w-md text-[13px]" style={{ color: COLORS.muted }}>Admin-created accounts skip the approval queue and are marked Approved right away.</p>
          </div>

          <button type="button" onClick={onClose} aria-label="Close" className="p-2" style={{ color: COLORS.muted, borderRadius: 8 }}><X className="h-4 w-4" /></button>
        </header>

        <div className="space-y-6 px-7 py-7 sm:px-8">
          {error && <div role="alert" className="border px-3 py-2.5 text-sm" style={{ borderColor: COLORS.dangerBorder, background: COLORS.dangerBg, color: COLORS.danger, borderRadius: 8 }}>{error}</div>}

          <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
            <InputField id="firstName" label="First name" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} placeholder="Juana" />
            <InputField id="middleName" label="Middle name" value={form.middleName} onChange={(e) => setForm((f) => ({ ...f, middleName: e.target.value }))} placeholder="Santos" />
            <InputField id="lastName" label="Last name" icon={<User className="h-4 w-4" />} value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} placeholder="Dela Cruz" />
            <InputField id="suffix" label="Suffix (optional)" value={form.suffix} onChange={(e) => setForm((f) => ({ ...f, suffix: e.target.value }))} placeholder="Jr., Sr., III" />
          </div>

          <InputField id="newEmail" label="Email address" type="email" icon={<Mail className="h-4 w-4" />} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="you@example.com" />

          <div>
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: COLORS.muted }}>Role</span>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(ROLE_LABEL) as AccountRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, role: r }))}
                  className="px-2 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] transition-colors"
                  style={form.role === r ? { background: COLORS.navy, borderColor: COLORS.navy, color: '#fff', borderRadius: 7, border: '1px solid' } : { borderColor: COLORS.border, color: COLORS.muted, borderRadius: 7, border: '1px solid' }}
                >
                  {ROLE_LABEL[r]}
                </button>
              ))}
            </div>
          </div>

          {form.role === 'customer' && (
            <div className="space-y-4 border-t pt-5" style={{ borderColor: COLORS.border }}>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: COLORS.muted }}>Customer basic information</span>
              <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
                <InputField id="customerBirthDate" label="Birth date" type="date" value={form.dateOfBirth} onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} />
                <SelectField id="customerGender" label="Gender" value={form.gender} onChange={(value) => setForm((f) => ({ ...f, gender: value }))} options={['Female', 'Male', 'Non-binary', 'Prefer not to say']} />
                <InputField id="customerContact" label="Contact number" value={form.contactNumber} onChange={(e) => setForm((f) => ({ ...f, contactNumber: e.target.value }))} placeholder="0917 000 0000" />
                <SelectField id="customerCivilStatus" label="Civil status (optional)" value={form.civilStatus} onChange={(value) => setForm((f) => ({ ...f, civilStatus: value }))} options={['Single', 'Married', 'Widowed', 'Separated']} />
                <InputField id="customerOccupation" label="Occupation (optional)" value={form.occupation} onChange={(e) => setForm((f) => ({ ...f, occupation: e.target.value }))} placeholder="e.g. Teacher" />
                <InputField id="customerAddress" label="Address (optional)" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Street, Barangay, City" />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="tempPassword" className="mb-2 block"><span className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: COLORS.muted }}>Temporary password</span></label>
            <div className="relative flex items-center border-b transition-colors" style={{ borderColor: COLORS.border }}>
              <Lock className="h-4 w-4" style={{ color: COLORS.faint }} />
              <input
                id="tempPassword"
                type={showPassword ? 'text' : 'password'}
                value={form.tempPassword}
                onChange={(e) => setForm((f) => ({ ...f, tempPassword: e.target.value }))}
                placeholder="At least 8 characters"
                className="w-full bg-transparent py-2.5 pl-2.5 pr-8 text-[14px] outline-none"
                style={{ color: COLORS.ink }}
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-0" style={{ color: COLORS.faint }}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-2 text-[11px]" style={{ color: COLORS.faint }}>The user will be asked to set their own password on first login.</p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
            <PrimaryButton type="submit">Create account</PrimaryButton>
          </div>
        </div>
      </form>
    </ModalShell>
  );
}

// Renders the full Basic Information record for a single account inline, inside the
// row's expanded panel — no modal, no separate button. Sourced exactly as returned by
// GET /auth/users for that user's own database row. Fields that do not apply to the
// account's role are shown as "N/A" rather than hidden or borrowed from elsewhere.
function BasicInfoPanel({ user }: { user: PendingUser }) {
  const na = (value: string | null | undefined) => (value && value.trim() ? value : 'N/A');
  const isStaff = user.role === 'front_desk' || user.role === 'tailor';
  const isCustomer = user.role === 'customer';

  const rows: [string, string][] = [
    ['Full name', na(user.fullName)],
    ['Email', na(user.email)],
    ['Role', ROLE_LABEL[user.role]],
    ['Contact number', na(user.contactNumber)],
    ['Address', na(user.address)],
    ['Date of birth', user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : 'N/A'],
    ['Gender', na(user.gender)],
    ['Civil status', na(user.civilStatus)],
    ['Occupation', na(user.occupation)],
    ['Employee ID', isStaff ? na(user.id) : 'N/A'],
    ['Customer ID', isCustomer ? na(user.id) : 'N/A'],
    ['Position', isStaff ? na(user.position) : 'N/A'],
    ['Date hired', isStaff && user.dateHired ? new Date(user.dateHired).toLocaleDateString() : 'N/A'],
  ];

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-t px-8 py-6 sm:grid-cols-3 lg:grid-cols-4" style={{ borderColor: COLORS.border, background: COLORS.surfaceAlt }}>
      {rows.map(([label, value]) => (
        <div key={label}>
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: COLORS.faint }}>{label}</div>
          <div className="mt-1 text-[13px]" style={{ color: COLORS.ink }}>{value}</div>
        </div>
      ))}
    </div>
  );
}

export function UserManagementView({ externalQuery = '' }: { externalQuery?: string }) {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<AccountStatus | 'all'>('all');
  const [pendingConfirm, setPendingConfirm] = useState<{ id: string; action: AccountStatus } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [justCreated, setJustCreated] = useState('');
  const [operationError, setOperationError] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

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
        setUsers(data.users.map((user: {
          id: number; full_name: string | null; email: string; role: UserRole; status: AccountStatus;
          created_at: string; updated_at: string | null;
          contact_number: string | null; address: string | null;
          date_of_birth: string | null; gender: string | null; civil_status: string | null; occupation: string | null;
          position: string | null; date_hired: string | null;
          activity_type?: 'profile_updated' | 'password_changed' | 'settings_updated' | null;
          activity_details?: string | null; activity_at?: string | null;
        }) => ({
          dbId: user.id,
          id: accountIdentifier(user),
          fullName: user.full_name || user.email,
          email: user.email,
          role: user.role,
          status: user.status,
          requestedAt: user.created_at.slice(0, 10),
          updatedAt: user.updated_at,
          contactNumber: user.contact_number,
          address: user.address,
          dateOfBirth: user.date_of_birth,
          gender: user.gender,
          civilStatus: user.civil_status,
          occupation: user.occupation,
          position: user.position,
          dateHired: user.date_hired,
          activityType: user.activity_type,
          activityDetails: user.activity_details,
          activityAt: user.activity_at,
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
    const response = await fetch(`${API_URL}/auth/users`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` }, body: JSON.stringify({ email: form.email, password: form.tempPassword, role: form.role, fullName, contactNumber: form.contactNumber, address: form.address, dateOfBirth: form.dateOfBirth, gender: form.gender, civilStatus: form.civilStatus, occupation: form.occupation }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to create account.');
    const newUser: PendingUser = {
      dbId: data.user.id,
      id: accountIdentifier(data.user),
      fullName: data.user.full_name || fullName,
      email: data.user.email,
      role: data.user.role,
      status: data.user.status,
      requestedAt: data.user.created_at.slice(0, 10),
      updatedAt: data.user.updated_at,
      contactNumber: data.user.contact_number ?? (form.role === 'customer' ? form.contactNumber : null),
      address: data.user.address ?? (form.role === 'customer' ? form.address : null),
      dateOfBirth: data.user.date_of_birth ?? (form.role === 'customer' ? form.dateOfBirth : null),
      gender: data.user.gender ?? (form.role === 'customer' ? form.gender : null),
      civilStatus: data.user.civil_status ?? (form.role === 'customer' ? form.civilStatus : null),
      occupation: data.user.occupation ?? (form.role === 'customer' ? form.occupation : null),
      position: data.user.position ?? null,
      dateHired: data.user.date_hired ?? null,
    };
    setUsers((prev) => [newUser, ...prev]);
    setShowCreateModal(false);
    setJustCreated(newUser.fullName);
    setTimeout(() => setJustCreated(''), 4000);
  }

  function actionsFor(status: AccountStatus): { key: AccountStatus; label: string; icon: ReactNode; tone: string }[] {
    if (status === 'pending') {
      return [
        { key: 'approved', label: 'Approve', icon: <Check className="h-3.5 w-3.5" />, tone: COLORS.success },
        { key: 'rejected', label: 'Reject', icon: <X className="h-3.5 w-3.5" />, tone: COLORS.danger },
      ];
    }
    if (status === 'approved') {
      return [{ key: 'disabled', label: 'Disable', icon: <Ban className="h-3.5 w-3.5" />, tone: COLORS.muted }];
    }
    if (status === 'disabled' || status === 'rejected') {
      return [{ key: 'approved', label: 'Reactivate', icon: <RotateCcw className="h-3.5 w-3.5" />, tone: COLORS.success }];
    }
    return [];
  }

  return (
    <div className="w-full space-y-7" style={{ color: COLORS.ink }}>
      <style>{FONT_IMPORT}</style>

      <PageHeader
        eyebrow="Admin — Account approval"
        title="User management"
        description="Approve, reject, disable, or reactivate Front Desk, Tailor, and Customer accounts. Only approved accounts can sign in."
        action={<PrimaryButton icon={<Plus />} onClick={() => setShowCreateModal(true)}>Create account</PrimaryButton>}
      />

      {justCreated && (
        <div className="rise-in flex items-center gap-2 border px-3.5 py-2.5 text-sm" style={{ borderColor: COLORS.successBorder, background: COLORS.successBg, color: COLORS.success, borderRadius: 8 }}>
          <Check className="h-4 w-4" />
          <span>{justCreated}'s account was created and approved.</span>
        </div>
      )}
      {operationError && <div role="alert" className="border px-3.5 py-2.5 text-sm" style={{ borderColor: COLORS.dangerBorder, background: COLORS.dangerBg, color: COLORS.danger, borderRadius: 8 }}>{operationError}</div>}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <SearchField value={query} onChange={setQuery} placeholder="Search name, email, or ID" />
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-3.5 w-3.5" style={{ color: COLORS.faint }} />
          {FILTERS.map((f) => {
            const active = activeFilter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className="border px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] transition-all"
                style={active ? { background: COLORS.navy, color: '#fff', borderColor: COLORS.navy, borderRadius: 999, boxShadow: shadowSm } : { background: COLORS.surface, color: COLORS.muted, borderColor: COLORS.border, borderRadius: 999 }}
              >
                {f.label}
                {f.key !== 'all' && <span className="ml-1.5 opacity-70">{counts[f.key as AccountStatus]}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <Card className="overflow-x-auto">
        <div className="min-w-[940px]">
          <div className="hidden grid-cols-[1.25fr_1.55fr_0.9fr_1.2fr_0.95fr_1.15fr] gap-6 border-b px-8 py-4 md:grid" style={{ borderColor: COLORS.border, background: COLORS.surfaceAlt }}>
            {['Name', 'Email', 'Role', 'Latest update', 'Status', 'Actions'].map((h) => (
              <span key={h} className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: COLORS.faint }}>{h}</span>
            ))}
          </div>

          {loading && <div className="px-6 py-16 text-center"><p className="text-sm" style={{ color: COLORS.muted }}>Loading accounts…</p></div>}
          {!loading && filtered.length === 0 && <div className="px-6 py-16 text-center"><p className="text-sm" style={{ color: COLORS.muted }}>No accounts match this search.</p></div>}

          {filtered.map((user) => {
            const actions = actionsFor(user.status);
            const confirming = pendingConfirm?.id === user.id;
            const expanded = expandedIds.has(user.id);
            return (
              <div key={user.id} className="border-b last:border-b-0" style={{ borderColor: COLORS.border }}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleExpanded(user.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpanded(user.id); } }}
                  aria-expanded={expanded}
                  className="relative grid min-w-[940px] cursor-pointer grid-cols-[1.25fr_1.55fr_0.9fr_1.2fr_0.95fr_1.15fr] items-center gap-6 py-5 pl-8 pr-8 transition-colors"
                  onMouseEnter={(e) => { e.currentTarget.style.background = COLORS.surfaceAlt; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span className="absolute bottom-0 left-0 top-0 w-1" style={{ background: STATUS_TAB_COLOR[user.status] }} aria-hidden="true" />
                  <div className="flex items-center gap-2">
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform" style={{ color: COLORS.faint, transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
                    <div>
                      <div className="text-[14px] font-medium" style={{ color: COLORS.ink }}>{user.fullName}</div>
                      <div className="mono text-[11px]" style={{ color: COLORS.faint }}>{user.id}</div>
                    </div>
                  </div>
                  <div className="truncate text-[13px]" style={{ color: COLORS.inkSoft }}>{user.email}</div>
                  <div className="text-[12px]" style={{ color: COLORS.inkSoft }}>{ROLE_LABEL[user.role]}</div>
                  <div>
                    <div className="mono text-[11px]" style={{ color: COLORS.muted }}>{user.activityAt ? new Date(user.activityAt).toLocaleString() : user.updatedAt ? new Date(user.updatedAt).toLocaleString() : user.requestedAt}</div>
                    {user.activityType === 'password_changed' && <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.06em]" style={{ color: COLORS.success }}>Password changed</div>}
                    {user.activityType === 'profile_updated' && user.activityDetails && <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.06em]" style={{ color: COLORS.success }}>Profile updated: {user.activityDetails}</div>}
                    {user.activityType === 'settings_updated' && user.activityDetails && <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.06em]" style={{ color: COLORS.success }}>Settings updated: {user.activityDetails}</div>}
                  </div>
                  <div><Badge tone={STATUS_TONE[user.status]}>{STATUS_LABEL[user.status]}</Badge></div>

                  <div className="flex items-center justify-end gap-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    {confirming ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px]" style={{ color: COLORS.muted }}>
                          {pendingConfirm.action === 'rejected' ? 'Reject this account?' : pendingConfirm.action === 'disabled' ? 'Disable this account?' : 'Confirm?'}
                        </span>
                        <button onClick={() => applyStatusChange(user.id, pendingConfirm.action)} className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-white" style={{ background: COLORS.navy, borderRadius: 6 }}>Yes</button>
                        <button onClick={() => setPendingConfirm(null)} className="border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em]" style={{ borderColor: COLORS.border, color: COLORS.muted, borderRadius: 6 }}>Cancel</button>
                      </div>
                    ) : (
                      actions.map((a) => (
                        <button
                          key={a.key}
                          onClick={() => (a.key === 'rejected' || a.key === 'disabled' ? setPendingConfirm({ id: user.id, action: a.key }) : applyStatusChange(user.id, a.key))}
                          className="flex items-center gap-1.5 border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] transition-colors"
                          style={{ borderColor: COLORS.border, color: a.tone, borderRadius: 6 }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = COLORS.borderStrong; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = COLORS.border; }}
                        >
                          {a.icon}{a.label}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {expanded && <BasicInfoPanel user={user} />}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="flex items-center gap-2 text-[11px]" style={{ color: COLORS.faint }}>
        <ChevronDown className="h-3.5 w-3.5" />
        <span>{filtered.length} of {users.length} accounts shown</span>
      </div>

      {showCreateModal && <CreateAccountModal onClose={() => setShowCreateModal(false)} onCreate={handleCreateAccount} />}
    </div>
  );
}

export default function UserManagementPage() {
  return (
    <div className="min-h-screen antialiased" style={{ background: COLORS.canvas, fontFamily: "'Inter', sans-serif" }}>
      <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
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

function SelectField({ id, label, value, onChange, options }: { id: string; label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <div><label htmlFor={id} className="mb-2 block"><span className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: COLORS.muted }}>{label}</span></label><select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="w-full border-b bg-transparent py-2.5 text-[14px] outline-none" style={{ borderColor: COLORS.border, color: COLORS.ink }}><option value="">Select an option</option>{options.map((option) => <option key={option}>{option}</option>)}</select></div>;
}