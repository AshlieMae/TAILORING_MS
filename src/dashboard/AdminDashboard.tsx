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
import { AdminPaymentsView } from '../Pages_Admin/Payments';
import { AdminReportsView } from '../Pages_Admin/Reports';
import { AdminSettingsWideView } from '../Pages_Admin/SettingsWide';
import { AdminProfileModal } from '../Pages_Admin/AdminProfile';

/* ---------------------------------------------------------------
   ADMIN — Dashboard + User Management
   "The Blueprint Ledger"
   Signature element: the production pipeline rendered as a
   drafting-table schematic — a dashed measurement line with
   numbered nodes and a cyan "in progress" pin, on a cool
   blueprint-paper canvas. Dark navy control panel on the left
   is a real router between Dashboard and User Management — click
   a nav item, the main panel switches.
------------------------------------------------------------------ */

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

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
  0%, 100% { box-shadow: 0 0 0 0 rgba(79,182,196,0.45); }
  50% { box-shadow: 0 0 0 7px rgba(79,182,196,0); }
}
.dash-in { opacity: 0; animation: riseIn 0.5s cubic-bezier(0.22,1,0.36,1) forwards; }
`;

function MonoLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`text-[10px] tracking-[0.22em] uppercase text-[#5D7480] ${className}`}
      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
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

type ViewKey = 'dashboard' | 'customers' | 'orders' | 'production' | 'inventory' | 'payments' | 'reports' | 'settings' | 'users';

const NAV: { label: string; icon: typeof LayoutDashboard; view: ViewKey }[] = [
  { label: 'Dashboard', icon: LayoutDashboard, view: 'dashboard' },
  { label: 'Customers', icon: Users, view: 'customers' },
  { label: 'Orders', icon: Shirt, view: 'orders' },
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
        <h1 className="text-2xl sm:text-3xl leading-tight mt-1 text-[#122029]" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
          Good afternoon — here's today's shop.
        </h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard delay={0.04} label="Today's sales" value="₱24,300" trend="+12.4%" trendUp icon={<Wallet className="w-4 h-4" strokeWidth={1.6} />} />
        <StatCard delay={0.08} label="Orders in production" value={`${totalStageCount}`} trend="+3 this week" trendUp icon={<Scissors className="w-4 h-4" strokeWidth={1.6} />} />
        <StatCard delay={0.12} label="Outstanding balance" value="₱58,940" trend="-6.1%" trendUp={false} icon={<Clock className="w-4 h-4" strokeWidth={1.6} />} />
        <StatCard delay={0.16} label="Low stock alerts" value={`${LOW_STOCK.length}`} trend="Needs reorder" trendUp={false} tone="warn" icon={<AlertTriangle className="w-4 h-4" strokeWidth={1.6} />} />
      </div>

      <div className="dash-in relative bg-[#F7FAF9] border border-[#C7D2CE] rounded-none p-6 sm:p-8 shadow-[0_1px_3px_rgba(18,32,41,0.06)] hover:shadow-[0_4px_16px_-4px_rgba(18,32,41,0.12)] transition-shadow" style={{ animationDelay: '0.2s' }}>
        <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#4FB6C4]" />
        <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#4FB6C4]" />
        <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#4FB6C4]" />
        <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#4FB6C4]" />
        <div className="flex items-center justify-between mb-8">
          <div>
            <MonoLabel>Schematic — production pipeline</MonoLabel>
            <h2 className="text-lg mt-1 text-[#122029]" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>Where every garment sits today</h2>
          </div>
          <button className="hidden sm:flex items-center gap-1 text-[11px] tracking-[0.14em] uppercase text-[#4FB6C4]">
            View all <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <BlueprintRail stages={STAGES} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
        <div className="dash-in bg-[#F7FAF9] border border-[#C7D2CE] rounded-none p-6 sm:p-8 shadow-[0_1px_3px_rgba(18,32,41,0.06)] hover:shadow-[0_4px_16px_-4px_rgba(18,32,41,0.12)] transition-shadow" style={{ animationDelay: '0.26s' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <MonoLabel>This week</MonoLabel>
              <h2 className="text-lg mt-1 text-[#122029]" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>Revenue</h2>
            </div>
            <span className="text-xl text-[#122029]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
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
                      backgroundColor: d.day === 'Sat' ? '#4FB6C4' : '#2C4A57',
                      animation: `growBar 0.7s ${0.3 + i * 0.06}s cubic-bezier(0.22,1,0.36,1) both`,
                    }}
                  />
                </div>
                <MonoLabel className="text-[#8FA2A8]">{d.day}</MonoLabel>
              </div>
            ))}
          </div>
        </div>

        <div className="dash-in bg-[#F7FAF9] border border-[#C7D2CE] rounded-none p-6 sm:p-8 shadow-[0_1px_3px_rgba(18,32,41,0.06)] hover:shadow-[0_4px_16px_-4px_rgba(18,32,41,0.12)] transition-shadow" style={{ animationDelay: '0.32s' }}>
          <MonoLabel>Fabric inventory</MonoLabel>
          <h2 className="text-lg mt-1 mb-6 text-[#122029]" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>Running low</h2>
          <div className="space-y-5">
            {LOW_STOCK.map((f) => {
              const pct = Math.min(100, (f.remaining / f.threshold) * 100);
              return (
                <div key={f.fabric}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[13px] text-[#122029]">{f.fabric}</span>
                    <span className="text-[11px] text-[#C1544B]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{f.remaining}m / {f.threshold}m</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#E1E8E3] overflow-hidden">
                    <div className="h-full bg-[#C1544B]" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <button onClick={onGoToInventory} className="mt-6 w-full text-center text-[11px] tracking-[0.14em] uppercase text-[#5D7480] border border-[#C7D2CE] py-2.5 hover:border-[#4FB6C4] hover:text-[#122029] transition-colors">
            Go to inventory
          </button>
        </div>
      </div>

      <div className="dash-in bg-[#F7FAF9] border border-[#C7D2CE] rounded-none overflow-hidden shadow-[0_1px_3px_rgba(18,32,41,0.06)]" style={{ animationDelay: '0.38s' }}>
        <div className="flex items-center justify-between px-6 sm:px-8 py-6">
          <div>
            <MonoLabel>Job cards</MonoLabel>
            <h2 className="text-lg mt-1 text-[#122029]" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>Recent orders</h2>
          </div>
          <button className="flex items-center gap-1 text-[11px] tracking-[0.14em] uppercase text-[#4FB6C4]">
            View all <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="hidden md:grid grid-cols-[1fr_1.4fr_1.4fr_1.2fr_0.8fr_0.8fr] gap-4 px-8 py-2.5 border-t border-b border-[#C7D2CE] bg-[#EDF1F0]">
          {['Job card', 'Customer', 'Garment', 'Stage', 'Amount', 'Due'].map((h) => (
            <MonoLabel key={h}>{h}</MonoLabel>
          ))}
        </div>
        {RECENT_ORDERS.map((o) => (
          <div key={o.id} className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr_1.4fr_1.2fr_0.8fr_0.8fr] gap-2 md:gap-4 px-6 sm:px-8 py-4 border-t border-[#DEE5DF] first:border-t-0 items-center">
            <span className="text-[12px] text-[#5D7480]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{o.id}</span>
            <span className="text-[13px] text-[#122029] font-medium">{o.customer}</span>
            <span className="text-[13px] text-[#3D4F55]">{o.garment}</span>
            <span>
              <span className="inline-block px-2 py-0.5 text-[10px] tracking-[0.1em] uppercase bg-[#E4EEEE] text-[#2C4A57] border border-[#C7D2CE]">{o.stage}</span>
            </span>
            <span className="text-[13px] text-[#122029]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{o.amount}</span>
            <span className="text-[12px] text-[#5D7480]">{o.due}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* placeholder for pages not built yet, so nav links never dead-end silently */
function ComingSoonView({ label }: { label: string }) {
  return (
    <div className="dash-in bg-[#F7FAF9] border border-[#C7D2CE] rounded-none p-16 text-center">
      <MonoLabel>{label}</MonoLabel>
      <h2 className="text-2xl mt-2 text-[#122029]" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
        This page isn't built yet
      </h2>
      <p className="text-[13px] text-[#5D7480] mt-2">Ask to have the {label} page created next.</p>
    </div>
  );
}

/* ---------------- Blueprint Rail (schematic pipeline) ---------------- */
function BlueprintRail({ stages }: { stages: typeof STAGES }) {
  return (
    <div className="relative">
      <div
        className="absolute top-[13px] left-0 right-0 h-px origin-left"
        style={{ backgroundImage: 'repeating-linear-gradient(90deg, #4FB6C4 0, #4FB6C4 6px, transparent 6px, transparent 12px)', animation: 'drawRail 1s 0.2s cubic-bezier(0.22,1,0.36,1) both' }}
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-y-8 gap-x-4 relative">
        {stages.map((s, i) => {
          const active = i === stages.length - 2;
          return (
            <div key={s.key} className="dash-in flex flex-col items-start" style={{ animationDelay: `${0.3 + i * 0.05}s` }}>
              <div className="relative w-full mb-4">
                <MonoLabel className="absolute -top-5 left-0 text-[#B7C4C1]">{String(i + 1).padStart(2, '0')}</MonoLabel>
                <div
                  className={`w-3.5 h-3.5 rounded-full border-2 ${active ? 'bg-[#4FB6C4] border-[#4FB6C4]' : 'bg-[#F7FAF9] border-[#8FA2A8]'}`}
                  style={active ? { animation: 'pinPulse 1.8s ease-in-out infinite' } : undefined}
                />
              </div>
              <span className="text-2xl text-[#122029] mb-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{s.count}</span>
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
    <div className="dash-in bg-[#F7FAF9] border border-[#C7D2CE] rounded-none p-5 sm:p-6 shadow-[0_1px_3px_rgba(18,32,41,0.06)] hover:shadow-[0_4px_16px_-4px_rgba(18,32,41,0.12)] transition-shadow" style={{ animationDelay: `${delay}s` }}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-8 h-8 flex items-center justify-center ${tone === 'warn' ? 'bg-[#C1544B]/10 text-[#C1544B]' : 'bg-[#4FB6C4]/12 text-[#2C4A57]'}`}>{icon}</div>
        {trendUp ? <ArrowUpRight className="w-3.5 h-3.5 text-[#3F7D5C]" /> : <ArrowDownRight className={`w-3.5 h-3.5 ${tone === 'warn' ? 'text-[#C1544B]' : 'text-[#8B3235]'}`} />}
      </div>
      <div className="text-2xl mb-1 text-[#122029]" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>{value}</div>
      <MonoLabel className="block mb-2">{label}</MonoLabel>
      <span className={`text-[11px] ${tone === 'warn' ? 'text-[#C1544B]' : trendUp ? 'text-[#3F7D5C]' : 'text-[#8B3235]'}`}>{trend}</span>
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
  const [showProfile, setShowProfile] = useState(false);
  const signOut = () => {
    localStorage.removeItem('authToken'); localStorage.removeItem('currentUser');
    sessionStorage.removeItem('authToken'); sessionStorage.removeItem('currentUser');
    navigate('/login', { replace: true });
  };

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
    <div className="min-h-screen bg-[#EDF1F0] text-[#122029] antialiased flex" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <style>{FONT_IMPORT}</style>

      <div
        className="fixed inset-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, #122029 0px, #122029 1px, transparent 1px, transparent 24px), repeating-linear-gradient(90deg, #122029 0px, #122029 1px, transparent 1px, transparent 24px)',
        }}
      />

      {/* ---------------- SIDEBAR ---------------- */}
      <aside
        className={`${navOpen ? 'fixed inset-y-0 left-0 translate-x-0' : 'fixed inset-y-0 left-0 -translate-x-full'} z-40 lg:relative lg:inset-auto lg:translate-x-0 lg:z-0 w-72 flex-shrink-0 h-screen lg:h-auto lg:min-h-screen bg-[#0E1E2A] text-[#DCE7EA] flex flex-col justify-between transition-transform duration-300`}
      >
        <div>
          <div className="flex items-center justify-between px-8 py-8 border-b border-[#24404F]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 border border-[#4FB6C4]/60 bg-[#4FB6C4]/5 flex items-center justify-center">
                <span className="text-[#4FB6C4] text-[10px]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>A&T</span>
              </div>
              <div className="leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                <div className="text-sm tracking-[0.06em] text-[#EAF3F5]">Ashlie's Tailor</div>
                <MonoLabel className="text-[#6E93A0]">Admin panel</MonoLabel>
              </div>
            </div>
            <button className="lg:hidden text-[#9FB6C2]" onClick={() => setNavOpen(false)} aria-label="Close menu">
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
                  className={`w-full flex items-center gap-3.5 px-4 py-3 text-[14px] transition-all border-l-2 ${
                    active
                      ? 'bg-[#16283B] border-[#4FB6C4] text-[#EAF3F5]'
                      : 'border-transparent text-[#8CA3AD] hover:text-[#EAF3F5] hover:bg-[#16283B]/70'
                  }`}
                >
                  <item.icon className="w-4 h-4" strokeWidth={1.6} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="px-8 py-6 border-t border-[#24404F] space-y-4">
          <button type="button" onClick={() => setShowProfile(true)} className="flex w-full items-center gap-3 p-1 text-left transition-colors hover:bg-[#16283B]">
            <div className="w-9 h-9 overflow-hidden rounded-full bg-[#4FB6C4]/15 border border-[#4FB6C4]/50 flex items-center justify-center">
              {profile?.profile_picture ? <img src={profile.profile_picture} alt="Profile" className="h-full w-full object-cover" /> : <span className="text-[#4FB6C4] text-xs font-medium">{profile?.full_name?.split(' ').map((name: string) => name[0]).join('').slice(0, 2) || 'AD'}</span>}
            </div>
            <div className="min-w-0 leading-tight"><div className="truncate text-[13px] text-[#EAF3F5]">{profile?.full_name || 'Admin'}</div><MonoLabel className="text-[#6E93A0]">{profile?.position || 'Shop owner'}</MonoLabel></div>
          </button>
          <button onClick={signOut} className="group flex w-full items-center justify-between border border-[#2C4A57] px-3 py-2.5 text-[10px] tracking-[0.16em] uppercase text-[#B7CDD3] transition-colors hover:border-[#4FB6C4] hover:bg-[#4FB6C4]/10 hover:text-[#EAF3F5]">
            Sign out <LogOut className="h-3.5 w-3.5 text-[#4FB6C4] transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </aside>

      {showProfile && <AdminProfileModal profile={profile} onClose={() => setShowProfile(false)} onSave={setProfile} />}

      {navOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setNavOpen(false)} />}

      {/* ---------------- MAIN ---------------- */}
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-20 bg-[#EDF1F0]/95 backdrop-blur-md border-b border-[#C7D2CE] px-6 sm:px-10 py-5 flex items-center justify-between gap-4 shadow-[0_1px_0_rgba(199,210,206,0.6)]">
          <div className="flex items-center gap-3 min-w-0">
            <button className="lg:hidden text-[#122029] flex-shrink-0" onClick={() => setNavOpen(true)} aria-label="Open menu">
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <MonoLabel className="block">Admin / {currentNavLabel}</MonoLabel>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-5 flex-shrink-0">
            <div className="relative hidden md:flex items-center bg-[#F7FAF9] border border-[#C7D2CE] px-3 py-2 focus-within:border-[#4FB6C4] transition-colors">
              <Search className="w-3.5 h-3.5 text-[#8FA2A8]" strokeWidth={1.5} />
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
                className="w-40 bg-transparent placeholder-[#9FADAF] text-[12px] pl-2 focus:outline-none"
              />
            </div>
            <div className="relative">
            <button onClick={() => setNotificationsOpen((open) => !open)} className="relative text-[#3D4F55] hover:text-[#122029] transition-colors" aria-label="Notifications" aria-expanded={notificationsOpen}>
              <Bell className="w-5 h-5" strokeWidth={1.5} />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#C1544B] ring-2 ring-[#EDF1F0]" />
            </button>
            {notificationsOpen && (
              <div className="absolute right-0 top-8 z-30 w-72 border border-[#C7D2CE] bg-[#F7FAF9] p-4 shadow-[0_12px_30px_-12px_rgba(18,32,41,0.35)]">
                <MonoLabel className="block mb-3">Notifications</MonoLabel>
                <p className="text-[13px] text-[#3D4F55]">Review pending accounts in User Management.</p>
                <button onClick={() => { setView('users'); setNotificationsOpen(false); }} className="mt-3 text-[11px] tracking-[0.12em] uppercase text-[#4FB6C4] hover:text-[#2C4A57]">Open User Management</button>
              </div>
            )}
            </div>
            <div className="h-6 w-px bg-[#C7D2CE] hidden sm:block" />
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
