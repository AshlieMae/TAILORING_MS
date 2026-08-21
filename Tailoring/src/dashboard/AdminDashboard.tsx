import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import {
  LayoutDashboard,
  Users,
  Shirt,
  Scissors,
  Boxes,
  Wallet,
  BarChart3,
  Settings,
  Bell,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Clock,
  ChevronRight,
  Menu,
  X,
  UserCog,
  LogOut,
} from 'lucide-react';
import { UserManagementView } from '../Pages_Admin/UserAccounts';
import { AdminCustomersView } from '../Pages_Admin/Customers';
import { AdminOrdersView } from '../Pages_Admin/Orders';
import { AdminProductionView } from '../Pages_Admin/Production';
import { AdminInventoryManagementView } from '../Pages_Admin/InventoryManagement';
import { AdminGarmentCatalogView } from '../Pages_Admin/GarmentCatalog';
import { AdminPaymentsView } from '../Pages_Admin/Payments';
import { AdminReportsView } from '../Pages_Admin/Reports';
import { AdminSettingsWideView } from '../Pages_Admin/SettingsWide';
import { AdminProfileModal } from '../Pages_Admin/AdminProfile';

/* ---------------------------------------------------------------
   ADMIN — Dashboard + User Management
   "The Tailor's Ledger"
   Same visual system as the other workroom views: kraft paper,
   charcoal ink, a single basting-thread red accent, Fraunces
   italic headings, IBM Plex Mono for numbers. The production
   pipeline is drawn as a tape measure with a pin marking the
   busiest stage. The sidebar is a dark walnut control panel with
   the same thread-red accent — a real router between views.
------------------------------------------------------------------ */

const INK = '#2A2620';
const PAPER = '#FBF7EA';
const PAGE = '#F4EEDD';
const LINE = '#D8CBA9';
const MUTED = '#7A6F58';
const THREAD = '#B33F35';
const WALNUT = '#1E1912';
const WALNUT_RAISED = '#2A2319';
const WALNUT_LINE = '#3C3225';
const WALNUT_MUTED = '#9C8F79';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const authToken = () => localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,600;1,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

@keyframes riseIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes growBar {
  from { transform: scaleY(0); }
  to { transform: scaleY(1); }
}
@keyframes drawRail {
  from { opacity: 0; transform: scaleX(0); }
  to { opacity: 1; transform: scaleX(1); }
}
@keyframes pinPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(179,63,53,0.4); }
  50% { box-shadow: 0 0 0 7px rgba(179,63,53,0); }
}
.dash-in { opacity: 0; animation: riseIn 0.5s cubic-bezier(0.22,1,0.36,1) forwards; }
.ledger-dots {
  background-image: radial-gradient(#D8CBA9 0.7px, transparent 0.7px);
  background-size: 14px 14px;
}
`;

function MonoLabel({ children, className = '', style = {} }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <span
      className={`text-[10px] tracking-[0.22em] uppercase ${className}`}
      style={{ fontFamily: "'IBM Plex Mono', monospace", color: MUTED, ...style }}
    >
      {children}
    </span>
  );
}

/* ---------------- Sample data (wire to real API) ---------------- */

const STAGES = [
  { key: 'measuring', label: 'Measuring', count: 4 },
  { key: 'cutting', label: 'Pattern Cutting', count: 6 },
  { key: 'assembly', label: 'Initial Assembly', count: 9 },
  { key: 'first_fit', label: 'First Fitting', count: 5 },
  { key: 'alterations', label: 'Final Alterations', count: 3 },
  { key: 'completed', label: 'Completed', count: 7 },
  { key: 'pickup', label: 'Ready for Pickup', count: 2 },
];

const WEEK_REVENUE = [
  { day: 'Mon', amount: 18400 },
  { day: 'Tue', amount: 21200 },
  { day: 'Wed', amount: 15800 },
  { day: 'Thu', amount: 27600 },
  { day: 'Fri', amount: 33100 },
  { day: 'Sat', amount: 41900 },
  { day: 'Sun', amount: 24300 },
];

const RECENT_ORDERS = [
  { id: 'JC-3021', customer: 'Reyna Fuentes', garment: 'Barong Tagalog', stage: 'First Fitting', amount: '₱4,800', due: 'Aug 05' },
  { id: 'JC-3020', customer: 'Boyet Salcedo', garment: 'Two-piece Suit', stage: 'Pattern Cutting', amount: '₱12,500', due: 'Aug 09' },
  { id: 'JC-3019', customer: 'Consuelo Reyes', garment: "Women's Coat", stage: 'Final Alterations', amount: '₱7,200', due: 'Aug 03' },
  { id: 'JC-3018', customer: 'Tomas Villareal', garment: 'School Uniform Set', stage: 'Ready for Pickup', amount: '₱2,150', due: 'Aug 02' },
  { id: 'JC-3017', customer: 'Marisol Chan', garment: 'Evening Gown', stage: 'Initial Assembly', amount: '₱15,900', due: 'Aug 12' },
];

const LOW_STOCK = [
  { fabric: 'Italian Wool — Charcoal', remaining: 8, threshold: 20 },
  { fabric: 'Silk Habotai — Ivory', remaining: 5, threshold: 15 },
  { fabric: 'Cotton Poplin — White', remaining: 12, threshold: 25 },
];

// Thread colors — kept identical to the orders/production/customers views.
const stageTone: Record<string, string> = {
  Measuring: 'border-[#D8CBA9] bg-[#F3EDDC] text-[#7A6F58]',
  'Pattern Cutting': 'border-[#C2C9E0] bg-[#E7EAF2] text-[#3A4372]',
  'Initial Assembly': 'border-[#E3CFA0] bg-[#F5ECD8] text-[#8A6A1F]',
  'First Fitting': 'border-[#E8C3AE] bg-[#F7E6DE] text-[#9C4A2B]',
  'Final Alterations': 'border-[#E8BEB8] bg-[#F7E1DE] text-[#9B3A31]',
  Completed: 'border-[#BFD8BC] bg-[#E4EEE2] text-[#3F6B3F]',
  'Ready for Pickup': 'border-[#B7D9D3] bg-[#E1EEEC] text-[#2C6E68]',
};

type ViewKey = 'dashboard' | 'customers' | 'orders' | 'catalog' | 'production' | 'inventory' | 'payments' | 'reports' | 'settings' | 'users';

const NAV: { label: string; icon: typeof LayoutDashboard; view: ViewKey }[] = [
  { label: 'Dashboard', icon: LayoutDashboard, view: 'dashboard' },
  { label: 'Customers', icon: Users, view: 'customers' },
  { label: 'Orders', icon: Shirt, view: 'orders' },
  { label: 'Garment Catalog', icon: Shirt, view: 'catalog' },
  { label: 'Production', icon: Scissors, view: 'production' },
  { label: 'Inventory', icon: Boxes, view: 'inventory' },
  { label: 'Payments', icon: Wallet, view: 'payments' },
  { label: 'User Management', icon: UserCog, view: 'users' },
  { label: 'Reports', icon: BarChart3, view: 'reports' },
  { label: 'Settings', icon: Settings, view: 'settings' },
];

/* ==================================================================
   DASHBOARD VIEW
================================================================== */

function DashboardView({ onGoToInventory }: { onGoToInventory: () => void }) {
  const maxRevenue = Math.max(...WEEK_REVENUE.map((d) => d.amount));
  const totalStageCount = STAGES.reduce((s, x) => s + x.count, 0);

  return (
    <div className="space-y-8">
      <div className="dash-in">
        <MonoLabel>01 — Overview</MonoLabel>
        <h1 className="text-3xl sm:text-4xl leading-tight mt-1 italic" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: INK }}>
          Good afternoon — here's today's shop.
        </h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard delay={0.04} label="Today's sales" value="₱24,300" trend="+12.4%" trendUp icon={<Wallet className="w-4 h-4" strokeWidth={1.6} />} />
        <StatCard delay={0.08} label="Orders in production" value={`${totalStageCount}`} trend="+3 this week" trendUp icon={<Scissors className="w-4 h-4" strokeWidth={1.6} />} />
        <StatCard delay={0.12} label="Outstanding balance" value="₱58,940" trend="-6.1%" trendUp={false} icon={<Clock className="w-4 h-4" strokeWidth={1.6} />} />
        <StatCard delay={0.16} label="Low stock alerts" value={`${LOW_STOCK.length}`} trend="Needs reorder" trendUp={false} tone="warn" icon={<AlertTriangle className="w-4 h-4" strokeWidth={1.6} />} />
      </div>

      <div className="dash-in relative p-6 sm:p-8 border shadow-[0_1px_3px_rgba(42,38,32,0.08)] hover:shadow-[0_4px_16px_-4px_rgba(42,38,32,0.14)] transition-shadow" style={{ animationDelay: '0.2s', borderColor: LINE, background: PAPER }}>
        <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2" style={{ borderColor: THREAD }} />
        <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2" style={{ borderColor: THREAD }} />
        <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2" style={{ borderColor: THREAD }} />
        <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2" style={{ borderColor: THREAD }} />
        <div className="flex items-center justify-between mb-8">
          <div>
            <MonoLabel>Measured today — production pipeline</MonoLabel>
            <h2 className="text-lg mt-1 italic" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: INK }}>Where every garment sits today</h2>
          </div>
          <button className="hidden sm:flex items-center gap-1 text-[11px] tracking-[0.14em] uppercase" style={{ color: THREAD }}>
            View all <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <TapeRail stages={STAGES} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
        <div className="dash-in p-6 sm:p-8 border shadow-[0_1px_3px_rgba(42,38,32,0.08)] hover:shadow-[0_4px_16px_-4px_rgba(42,38,32,0.14)] transition-shadow" style={{ animationDelay: '0.26s', borderColor: LINE, background: PAPER }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <MonoLabel>This week</MonoLabel>
              <h2 className="text-lg mt-1 italic" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: INK }}>Revenue</h2>
            </div>
            <span className="text-xl" style={{ fontFamily: "'IBM Plex Mono', monospace", color: INK }}>
              ₱{WEEK_REVENUE.reduce((s, d) => s + d.amount, 0).toLocaleString()}
            </span>
          </div>
          <div className="flex items-end gap-3 sm:gap-5 h-40">
            {WEEK_REVENUE.map((d, i) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <div className="relative w-full flex-1 flex items-end">
                  <div
                    className="w-full origin-bottom"
                    style={{
                      height: `${(d.amount / maxRevenue) * 100}%`,
                      backgroundColor: d.day === 'Sat' ? THREAD : INK,
                      animation: `growBar 0.7s ${0.3 + i * 0.06}s cubic-bezier(0.22,1,0.36,1) both`,
                    }}
                  />
                </div>
                <MonoLabel>{d.day}</MonoLabel>
              </div>
            ))}
          </div>
        </div>

        <div className="dash-in p-6 sm:p-8 border shadow-[0_1px_3px_rgba(42,38,32,0.08)] hover:shadow-[0_4px_16px_-4px_rgba(42,38,32,0.14)] transition-shadow" style={{ animationDelay: '0.32s', borderColor: LINE, background: PAPER }}>
          <MonoLabel>Fabric inventory</MonoLabel>
          <h2 className="text-lg mt-1 mb-6 italic" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: INK }}>Running low</h2>
          <div className="space-y-5">
            {LOW_STOCK.map((f) => {
              const pct = Math.min(100, (f.remaining / f.threshold) * 100);
              return (
                <div key={f.fabric}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[13px]" style={{ color: INK }}>{f.fabric}</span>
                    <span className="text-[11px]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: THREAD }}>{f.remaining}m / {f.threshold}m</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden" style={{ background: '#E7DEC4' }}>
                    <div className="h-full" style={{ width: `${pct}%`, background: THREAD }} />
                  </div>
                </div>
              );
            })}
          </div>
          <button onClick={onGoToInventory} className="mt-6 w-full text-center text-[11px] tracking-[0.14em] uppercase border py-2.5 transition-colors" style={{ borderColor: LINE, color: MUTED }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = THREAD; e.currentTarget.style.color = INK; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = LINE; e.currentTarget.style.color = MUTED; }}>
            Go to inventory
          </button>
        </div>
      </div>

      <div className="dash-in border overflow-hidden shadow-[0_1px_3px_rgba(42,38,32,0.08)]" style={{ animationDelay: '0.38s', borderColor: LINE, background: PAPER }}>
        <div className="flex items-center justify-between px-6 sm:px-8 py-6">
          <div>
            <MonoLabel>Job cards</MonoLabel>
            <h2 className="text-lg mt-1 italic" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: INK }}>Recent orders</h2>
          </div>
          <button className="flex items-center gap-1 text-[11px] tracking-[0.14em] uppercase" style={{ color: THREAD }}>
            View all <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="hidden md:grid grid-cols-[1fr_1.4fr_1.4fr_1.2fr_0.8fr_0.8fr] gap-4 px-8 py-2.5 border-t border-b" style={{ borderColor: LINE, background: '#F3EDDC' }}>
          {['Ticket #', 'Customer', 'Garment', 'Stage', 'Amount', 'Due'].map((h) => (
            <MonoLabel key={h}>{h}</MonoLabel>
          ))}
        </div>
        {RECENT_ORDERS.map((o) => (
          <div key={o.id} className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr_1.4fr_1.2fr_0.8fr_0.8fr] gap-2 md:gap-4 px-6 sm:px-8 py-4 border-t first:border-t-0 items-center" style={{ borderColor: LINE }}>
            <span className="flex items-center gap-2 text-[12px]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#3A4372' }}>
              <span className="h-1.5 w-1.5 rounded-full border" style={{ borderColor: MUTED }} />
              {o.id}
            </span>
            <span className="text-[13px] font-medium" style={{ color: INK }}>{o.customer}</span>
            <span className="text-[13px]" style={{ color: '#3D4F55' }}>{o.garment}</span>
            <span>
              <span className={`inline-block px-2 py-0.5 text-[10px] tracking-[0.1em] uppercase border ${stageTone[o.stage] ?? ''}`}>{o.stage}</span>
            </span>
            <span className="text-[13px]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: INK }}>{o.amount}</span>
            <span className="text-[12px]" style={{ color: MUTED }}>{o.due}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* placeholder for pages not built yet, so nav links never dead-end silently */
function ComingSoonView({ label }: { label: string }) {
  return (
    <div className="dash-in border p-16 text-center" style={{ borderColor: LINE, background: PAPER }}>
      <MonoLabel>{label}</MonoLabel>
      <h2 className="text-2xl mt-2 italic" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: INK }}>
        This page isn't built yet
      </h2>
      <p className="text-[13px] mt-2" style={{ color: MUTED }}>Ask to have the {label} page created next.</p>
    </div>
  );
}

/* ---------------- Tape Rail (production pipeline, tape-measure signature) ---------------- */
function TapeRail({ stages }: { stages: typeof STAGES }) {
  const busiest = stages.reduce((maxIdx, s, i, arr) => (s.count > arr[maxIdx].count ? i : maxIdx), 0);
  return (
    <div className="relative">
      <div
        className="absolute top-[13px] left-0 right-0 h-px origin-left"
        style={{ backgroundImage: `repeating-linear-gradient(90deg, ${THREAD} 0, ${THREAD} 6px, transparent 6px, transparent 12px)`, animation: 'drawRail 1s 0.2s cubic-bezier(0.22,1,0.36,1) both' }}
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-y-8 gap-x-4 relative">
        {stages.map((s, i) => {
          const active = i === busiest;
          return (
            <div key={s.key} className="dash-in flex flex-col items-start" style={{ animationDelay: `${0.3 + i * 0.05}s` }}>
              <div className="relative w-full mb-4">
                <MonoLabel className="absolute -top-5 left-0" style={{ color: '#C7BA97' }}>{String(i + 1).padStart(2, '0')}″</MonoLabel>
                <div
                  className="w-3.5 h-3.5 rounded-full border-2"
                  style={active ? { background: THREAD, borderColor: THREAD, animation: 'pinPulse 1.8s ease-in-out infinite' } : { background: PAPER, borderColor: '#B7AA85' }}
                />
              </div>
              <span className="text-2xl mb-1" style={{ fontFamily: "'IBM Plex Mono', monospace", color: INK }}>{s.count}</span>
              <MonoLabel className="leading-snug">{s.label}</MonoLabel>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Stat card ---------------- */
function StatCard({ label, value, trend, trendUp, icon, delay = 0, tone = 'default' }: { label: string; value: string; trend: string; trendUp: boolean; icon: ReactNode; delay?: number; tone?: 'default' | 'warn'; }) {
  return (
    <div className="dash-in p-5 sm:p-6 border shadow-[0_1px_3px_rgba(42,38,32,0.08)] hover:shadow-[0_4px_16px_-4px_rgba(42,38,32,0.14)] transition-shadow" style={{ animationDelay: `${delay}s`, borderColor: LINE, background: PAPER }}>
      <div className="flex items-center justify-between mb-4">
        <div className="w-8 h-8 flex items-center justify-center border" style={tone === 'warn' ? { borderColor: '#E8BEB8', background: '#F7E1DE', color: THREAD } : { borderColor: LINE, background: '#F3EDDC', color: '#3A4372' }}>{icon}</div>
        {trendUp ? <ArrowUpRight className="w-3.5 h-3.5" style={{ color: '#3F7D5C' }} /> : <ArrowDownRight className="w-3.5 h-3.5" style={{ color: tone === 'warn' ? THREAD : '#8B3235' }} />}
      </div>
      <div className="text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: INK }}>{value}</div>
      <MonoLabel className="block mb-2">{label}</MonoLabel>
      <span className="text-[11px]" style={{ color: tone === 'warn' ? THREAD : trendUp ? '#3F7D5C' : '#8B3235' }}>{trend}</span>
    </div>
  );
}

/* ==================================================================
   ROOT — sidebar drives which view renders
================================================================== */

export default function AdminDashboard({ initialView = 'dashboard' }: { initialView?: ViewKey }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(() => currentUser());
  const [navOpen, setNavOpen] = useState(false);
  const [view, setView] = useState<ViewKey>(initialView);
  const [quickSearch, setQuickSearch] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountActivity, setAccountActivity] = useState<{ activity_type: 'profile_updated' | 'password_changed'; details: string | null; created_at: string; full_name: string | null; email: string; customer_id: string | null; employee_id: string | null; role: string }[]>([]);
  const [showProfile, setShowProfile] = useState(false);
  const signOut = () => {
    localStorage.removeItem('authToken'); localStorage.removeItem('currentUser');
    sessionStorage.removeItem('authToken'); sessionStorage.removeItem('currentUser');
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    const token = authToken();
    if (!token) return;
    fetch(`${API_URL}/auth/account-activity?limit=5`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Unable to load account activity.');
        setAccountActivity(Array.isArray(data.activity) ? data.activity : []);
      })
      .catch(() => {});
  }, []);

  const currentNavLabel = NAV.find((n) => n.view === view)?.label ?? 'Dashboard';

  function renderView() {
    switch (view) {
      case 'dashboard':
        return <DashboardView onGoToInventory={() => setView('inventory')} />;
      case 'users':
        return <UserManagementView externalQuery={quickSearch} />;
      case 'customers':
        return <AdminCustomersView externalQuery={quickSearch} />;
      case 'orders':
        return <AdminOrdersView externalQuery={quickSearch} />;
      case 'catalog':
        return <AdminGarmentCatalogView />;
      case 'production':
        return <AdminProductionView />;
      case 'inventory':
        return <AdminInventoryManagementView />;
      case 'payments':
        return <AdminPaymentsView />;
      case 'reports':
        return <AdminReportsView />;
      case 'settings':
        return <AdminSettingsWideView />;
      default:
        return <ComingSoonView label={currentNavLabel} />;
    }
  }

  return (
    <div className="min-h-screen antialiased flex" style={{ fontFamily: "'IBM Plex Sans', sans-serif", background: PAGE, color: INK }}>
      <style>{FONT_IMPORT}</style>

      <div className="fixed inset-0 pointer-events-none ledger-dots" />

      {/* ---------------- SIDEBAR ---------------- */}
      <aside
        className={`${navOpen ? 'fixed inset-y-0 left-0 translate-x-0' : 'fixed inset-y-0 left-0 -translate-x-full'} z-40 lg:relative lg:inset-auto lg:translate-x-0 lg:z-0 w-72 flex-shrink-0 h-screen lg:h-auto lg:min-h-screen flex flex-col justify-between transition-transform duration-300`}
        style={{ background: WALNUT, color: '#E7DFCF' }}
      >
        <div>
          <div className="flex items-center justify-between px-8 py-8 border-b" style={{ borderColor: WALNUT_LINE }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 border flex items-center justify-center" style={{ borderColor: `${THREAD}99`, background: `${THREAD}14` }}>
                <span className="text-[10px]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: THREAD }}>A&T</span>
              </div>
              <div className="leading-tight" style={{ fontFamily: "'Fraunces', serif" }}>
                <div className="text-sm italic tracking-[0.02em]" style={{ color: '#F2E9D6', fontWeight: 600 }}>Ashlie's Tailor</div>
                <MonoLabel style={{ color: WALNUT_MUTED }}>Admin panel</MonoLabel>
              </div>
            </div>
            <button className="lg:hidden" style={{ color: WALNUT_MUTED }} onClick={() => setNavOpen(false)} aria-label="Close menu">
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="px-4 py-8 space-y-1.5">
            {NAV.map((item) => {
              const active = view === item.view;
              return (
                <button
                  key={item.label}
                  onClick={() => { setView(item.view); setNavOpen(false); }}
                  className="w-full flex items-center gap-3.5 px-4 py-3 text-[14px] transition-all border-l-2"
                  style={active
                    ? { background: WALNUT_RAISED, borderColor: THREAD, color: '#F2E9D6' }
                    : { borderColor: 'transparent', color: WALNUT_MUTED }}
                >
                  <item.icon className="w-4 h-4" strokeWidth={1.6} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="px-8 py-6 border-t space-y-4" style={{ borderColor: WALNUT_LINE }}>
          <button type="button" onClick={() => setShowProfile(true)} className="flex w-full items-center gap-3 p-1 text-left transition-colors" style={{ background: 'transparent' }} onMouseEnter={(e) => { e.currentTarget.style.background = WALNUT_RAISED; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
            <div className="w-9 h-9 overflow-hidden rounded-full border flex items-center justify-center" style={{ background: `${THREAD}1F`, borderColor: `${THREAD}80` }}>
              {profile?.profile_picture ? <img src={profile.profile_picture} alt="Profile" className="h-full w-full object-cover" /> : <span className="text-xs font-medium" style={{ color: THREAD }}>{profile?.full_name?.split(' ').map((name: string) => name[0]).join('').slice(0, 2) || 'AD'}</span>}
            </div>
            <div className="min-w-0 leading-tight"><div className="truncate text-[13px]" style={{ color: '#F2E9D6' }}>{profile?.full_name || 'Admin'}</div><MonoLabel style={{ color: WALNUT_MUTED }}>{profile?.position || 'Shop owner'}</MonoLabel></div>
          </button>
          <button onClick={signOut} className="group flex w-full items-center justify-between border px-3 py-2.5 text-[10px] tracking-[0.16em] uppercase transition-colors" style={{ borderColor: WALNUT_LINE, color: '#CBBFA6' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = THREAD; e.currentTarget.style.color = '#F2E9D6'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = WALNUT_LINE; e.currentTarget.style.color = '#CBBFA6'; }}>
            Sign out <LogOut className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" style={{ color: THREAD }} />
          </button>
        </div>
      </aside>

      {showProfile && <AdminProfileModal profile={profile} onClose={() => setShowProfile(false)} onSave={setProfile} />}

      {navOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setNavOpen(false)} />}

      {/* ---------------- MAIN ---------------- */}
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-20 backdrop-blur-md border-b px-6 sm:px-10 py-5 flex items-center justify-between gap-4" style={{ background: `${PAGE}F2`, borderColor: LINE }}>
          <div className="flex items-center gap-3 min-w-0">
            <button className="lg:hidden flex-shrink-0" style={{ color: INK }} onClick={() => setNavOpen(true)} aria-label="Open menu">
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <MonoLabel className="block">Admin / {currentNavLabel}</MonoLabel>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-5 flex-shrink-0">
            <div className="relative hidden md:flex items-center border px-3 py-2 transition-colors" style={{ background: PAPER, borderColor: LINE }}>
              <Search className="w-3.5 h-3.5" style={{ color: MUTED }} strokeWidth={1.5} />
              <input
                type="text"
                placeholder="Quick search"
                value={quickSearch}
                onChange={(event) => setQuickSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    setView('users');
                    event.currentTarget.blur();
                  }
                }}
                className="w-40 bg-transparent text-[12px] pl-2 focus:outline-none"
                style={{ fontFamily: "'IBM Plex Mono', monospace", color: INK }}
              />
            </div>
            <div className="relative">
            <button onClick={() => setNotificationsOpen((open) => !open)} className="relative transition-colors" style={{ color: '#3D4F55' }} aria-label="Notifications" aria-expanded={notificationsOpen}>
              <Bell className="w-5 h-5" strokeWidth={1.5} />
              {accountActivity.length > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full ring-2" style={{ background: THREAD, boxShadow: `0 0 0 2px ${PAGE}` }} />}
            </button>
            {notificationsOpen && (
              <div className="absolute right-0 top-8 z-30 w-72 border p-4 shadow-[0_12px_30px_-12px_rgba(42,38,32,0.4)]" style={{ borderColor: LINE, background: PAPER }}>
                <MonoLabel className="block mb-3">Notifications</MonoLabel>
                <div className="space-y-3">
                  {accountActivity.map((item) => {
                    const identifier = item.role === 'customer' ? item.customer_id : item.employee_id;
                    const message = item.activity_type === 'password_changed' ? 'changed password' : `updated profile${item.details ? `: ${item.details}` : ''}`;
                    return <div key={`${item.email}-${item.created_at}`} className="border-b pb-3 last:border-0 last:pb-0" style={{ borderColor: LINE }}><p className="text-[12px]" style={{ color: '#3D4F55' }}><strong>{item.full_name || item.email}</strong>{identifier ? ` (${identifier})` : ''} {message}.</p><MonoLabel className="mt-1 block">{new Date(item.created_at).toLocaleString()}</MonoLabel></div>;
                  })}
                  {!accountActivity.length && <p className="text-[13px]" style={{ color: '#3D4F55' }}>No recent account updates.</p>}
                </div>
                <button onClick={() => { setView('users'); setNotificationsOpen(false); }} className="mt-3 text-[11px] tracking-[0.12em] uppercase" style={{ color: THREAD }}>Open User Management</button>
              </div>
            )}
            </div>
            <div className="h-6 w-px hidden sm:block" style={{ background: LINE }} />
            <LiveDateTime />
          </div>
        </header>

        <main className="w-full px-6 sm:px-10 xl:px-12 py-10">
          {renderView()}
        </main>
      </div>
    </div>
  );
}

function LiveDateTime() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return <MonoLabel className="hidden sm:inline">{now.toLocaleString(undefined, { weekday: 'short', month: 'short', day: '2-digit', hour: 'numeric', minute: '2-digit' })}</MonoLabel>;
}

function currentUser() {
  const stored = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
  try { return stored ? JSON.parse(stored) : null; } catch { return null; }
}
