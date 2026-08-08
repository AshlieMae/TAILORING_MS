import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import {
  LayoutDashboard,
  Shirt,
  Ruler,
  Boxes,
  Settings,
  Bell,
  Search,
  ChevronRight,
  Menu,
  X,
  Scissors,
  Check,
  Clock,
  ArrowRight,
  PackageCheck,
  User,
  LogOut,
} from 'lucide-react';

/* ---------------------------------------------------------------
   MASTER TAILOR / CUTTER STAFF — Dashboard
   "The Pattern Table"
   Where the Admin view is a drafting-table schematic and the
   Front Desk view is a receipt roll, the Tailor view is built
   around the workbench as a literal cutting table: job cards are
   drawn as pattern pieces — dashed cut-line borders, corner notch
   marks — laid out on dot-grid pattern paper, in a graphite +
   tailor's-chalk-yellow + pin-red palette.
------------------------------------------------------------------ */

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=Work+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

@keyframes riseIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes drawRail {
  from { opacity: 0; transform: scaleX(0); }
  to { opacity: 1; transform: scaleX(1); }
}
.dash-in { opacity: 0; animation: riseIn 0.5s cubic-bezier(0.22,1,0.36,1) forwards; }
`;

function MonoLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`text-[10px] tracking-[0.22em] uppercase text-[#7A7568] ${className}`}
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      {children}
    </span>
  );
}

/* corner notch — the little triangular nick tailors cut into a
   pattern piece to mark alignment points */
function Notch({ className = '' }: { className?: string }) {
  return (
    <span
      className={`absolute w-2 h-2 bg-[#F3F1E7] border-[#D6D2C0] ${className}`}
      style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}
      aria-hidden="true"
    />
  );
}

const TAILOR = { name: 'Delfin Ortega', role: 'Master Tailor' };
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function authToken() {
  return localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';
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

const STAGES = ['Measuring', 'Pattern Cutting', 'Initial Assembly', 'First Fitting', 'Final Alterations', 'Completed', 'Ready for Pickup'];

interface JobCard {
  id: string;
  customer: string;
  garment: string;
  fabric: string;
  stageIndex: number;
  due: string;
  measurements: { label: string; value: string }[];
  fabricUsed: string;
}

const FITTINGS_TODAY = [
  { time: '2:00 PM', customer: 'Consuelo Reyes', garment: "Women's Coat", jobCardId: 'JC-3019' },
  { time: '3:30 PM', customer: 'Reyna Fuentes', garment: 'Barong Tagalog', jobCardId: 'JC-3021' },
];

/* ---------------------------------------------------------------
   Update stage modal — advances a job card's production stage.
------------------------------------------------------------------ */
function UpdateStageModal({
  card,
  onClose,
  onUpdate,
}: {
  card: JobCard;
  onClose: () => void;
  onUpdate: (id: string, stageIndex: number) => void;
}) {
  const [stageIndex, setStageIndex] = useState(card.stageIndex);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#262420]/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-[#FAF8F0] border border-[#D6D2C0] rounded-sm shadow-[0_25px_70px_-25px_rgba(38,36,32,0.45)]">
        <div className="flex items-center justify-between px-7 sm:px-10 pt-8">
          <MonoLabel>{card.id}</MonoLabel>
          <button onClick={onClose} aria-label="Close" className="text-[#9C9686] hover:text-[#262420] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-7 sm:px-10 pb-9 pt-3">
          <h2 className="text-3xl leading-tight mb-2 text-[#262420]" style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700 }}>
            Update production stage
          </h2>
          <p className="text-[14px] text-[#6E6A5C] font-light mb-8 leading-relaxed">
            {card.garment} for {card.customer}
          </p>

          <div className="space-y-2">
            {STAGES.map((s, i) => (
              <button
                key={s}
                type="button"
                onClick={() => setStageIndex(i)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-sm border text-left transition-colors ${
                  i === stageIndex
                    ? 'bg-[#2A2A28] border-[#2A2A28] text-[#EDEAE2]'
                    : 'border-[#D6D2C0] text-[#55503F] hover:border-[#9C9686]'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    i === stageIndex ? 'border-[#E8C547] bg-[#E8C547]/20' : 'border-[#D6D2C0]'
                  }`}
                >
                  {i === stageIndex && <Check className="w-3 h-3 text-[#EDEAE2]" strokeWidth={2.5} />}
                </span>
                <span className="text-[13px]">{s}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-8">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-sm border border-[#D6D2C0] text-[#6E6A5C] text-[11px] tracking-[0.14em] uppercase hover:border-[#9C9686] transition-colors">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onUpdate(card.id, stageIndex)}
              className="flex-1 px-4 py-3 rounded-sm bg-[#2A2A28] text-[#EDEAE2] text-[11px] tracking-[0.14em] uppercase hover:bg-[#3A3936] transition-colors"
            >
              Save stage
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   Record fabric usage modal.
------------------------------------------------------------------ */
function RecordFabricModal({
  card,
  onClose,
  onRecord,
}: {
  card: JobCard;
  onClose: () => void;
  onRecord: (id: string, meters: string) => void;
}) {
  const [meters, setMeters] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = Number(meters);
    if (!meters.trim() || Number.isNaN(num) || num <= 0) {
      setError('Enter a valid fabric length in meters.');
      return;
    }
    onRecord(card.id, `${num} m logged`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#262420]/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#FAF8F0] border border-[#D6D2C0] rounded-sm shadow-[0_25px_70px_-25px_rgba(38,36,32,0.45)]">
        <div className="flex items-center justify-between px-7 sm:px-10 pt-8">
          <MonoLabel>{card.id}</MonoLabel>
          <button onClick={onClose} aria-label="Close" className="text-[#9C9686] hover:text-[#262420] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-7 sm:px-10 pb-9 pt-3">
          <h2 className="text-3xl leading-tight mb-2 text-[#262420]" style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700 }}>
            Record fabric usage
          </h2>
          <p className="text-[14px] text-[#6E6A5C] font-light mb-8 leading-relaxed">
            {card.garment} — {card.fabric}
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div role="alert" className="border border-[#C0392B]/30 bg-[#C0392B]/10 px-3 py-2 text-sm text-[#96291E]">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="fabricMeters" className="block mb-2"><MonoLabel>Fabric used (meters)</MonoLabel></label>
              <div className="border-b border-[#D6D2C0] focus-within:border-[#C0392B] transition-colors">
                <input
                  id="fabricMeters"
                  type="number"
                  min="0"
                  step="0.1"
                  value={meters}
                  onChange={(e) => setMeters(e.target.value)}
                  placeholder="2.1"
                  className="w-full bg-transparent placeholder-[#B4AF9E] text-[14px] py-2.5 focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-[#9C9686] mt-2">Currently: {card.fabricUsed}</p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-sm border border-[#D6D2C0] text-[#6E6A5C] text-[11px] tracking-[0.14em] uppercase hover:border-[#9C9686] transition-colors">
                Cancel
              </button>
              <button type="submit" className="flex-1 px-4 py-3 rounded-sm bg-[#2A2A28] text-[#EDEAE2] text-[11px] tracking-[0.14em] uppercase hover:bg-[#3A3936] transition-colors">
                Record usage
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

type ViewKey = 'dashboard' | 'jobcards' | 'measurements' | 'inventory' | 'settings';

const NAV: { label: string; icon: typeof LayoutDashboard; view: ViewKey }[] = [
  { label: 'Dashboard', icon: LayoutDashboard, view: 'dashboard' },
  { label: 'Job Cards', icon: Shirt, view: 'jobcards' },
  { label: 'Measurements', icon: Ruler, view: 'measurements' },
  { label: 'Fabric Inventory', icon: Boxes, view: 'inventory' },
  { label: 'Settings', icon: Settings, view: 'settings' },
];

/* ==================================================================
   DASHBOARD VIEW
================================================================== */

function DashboardView() {
  const [cards, setCards] = useState<JobCard[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [stageModalCard, setStageModalCard] = useState<JobCard | null>(null);
  const [fabricModalCard, setFabricModalCard] = useState<JobCard | null>(null);
  const [banner, setBanner] = useState('');
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const response = await fetch(`${API_URL}/auth/tailor/dashboard`, {
          headers: { Authorization: `Bearer ${authToken()}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Unable to load assigned job cards.');
        setCards(data.orders || []);
        setExpanded(data.orders?.[0]?.id ?? null);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Unable to load assigned job cards.');
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboard();
  }, []);

  function announce(message: string) {
    setBanner(message);
    setTimeout(() => setBanner(''), 4000);
  }

  async function handleUpdateStage(id: string, stageIndex: number) {
    try {
      const response = await fetch(`${API_URL}/auth/tailor/orders/${encodeURIComponent(id)}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
        body: JSON.stringify({ stage: STAGES[stageIndex] }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to update the production stage.');
      setCards((prev) => prev.map((c) => (c.id === id ? { ...c, stageIndex } : c)));
      setStageModalCard(null);
      announce(`${id} moved to "${STAGES[stageIndex]}".`);
    } catch (error) {
      announce(error instanceof Error ? error.message : 'Unable to update the production stage.');
    }
  }

  async function handleRecordFabric(id: string, fabricUsed: string) {
    try {
      const response = await fetch(`${API_URL}/auth/tailor/orders/${encodeURIComponent(id)}/fabric`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
        body: JSON.stringify({ fabricUsed }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to record fabric usage.');
      setCards((prev) => prev.map((c) => (c.id === id ? { ...c, fabricUsed } : c)));
      setFabricModalCard(null);
      announce(`Fabric usage recorded for ${id}.`);
    } catch (error) {
      announce(error instanceof Error ? error.message : 'Unable to record fabric usage.');
    }
  }

  const inProgress = cards.filter((c) => c.stageIndex < STAGES.length - 1).length;
  const dueSoon = cards.filter((c) => c.due === 'Aug 03' || c.due === 'Aug 05').length;

  return (
    <div className="space-y-8">
      <div className="dash-in">
        <MonoLabel>The pattern table</MonoLabel>
        <h1 className="text-2xl sm:text-3xl leading-tight mt-1 text-[#262420]" style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700 }}>
          Good afternoon, {TAILOR.name.split(' ')[0]} — here's what's on the table.
        </h1>
      </div>

      {banner && (
        <div className="dash-in flex items-center gap-2 border border-[#8FAE85] bg-[#E4E9DB] px-3 py-2.5 text-sm text-[#3F6633] rounded-sm">
          <Check className="w-4 h-4" />
          <span>{banner}</span>
        </div>
      )}

      {loadError && (
        <div role="alert" className="border border-[#C0392B]/30 bg-[#C0392B]/10 px-3 py-2.5 text-sm text-[#A12F24] rounded-sm">
          {loadError}
        </div>
      )}

      {/* ---------------- STATS ---------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard delay={0.04} label="Assigned job cards" value={`${cards.length}`} icon={<Shirt className="w-4 h-4" strokeWidth={1.6} />} />
        <StatCard delay={0.08} label="In production" value={`${inProgress}`} icon={<Scissors className="w-4 h-4" strokeWidth={1.6} />} />
        <StatCard delay={0.12} label="Fittings today" value={`${FITTINGS_TODAY.length}`} icon={<Clock className="w-4 h-4" strokeWidth={1.6} />} />
        <StatCard delay={0.16} label="Due within 2 days" value={`${dueSoon}`} icon={<PackageCheck className="w-4 h-4" strokeWidth={1.6} />} tone="warn" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
        {/* ---------------- JOB CARD STACK (signature element) ---------------- */}
        <div
          className="dash-in bg-[#FAF8F0] border border-[#D6D2C0] rounded-sm p-6 sm:p-8 shadow-[0_1px_3px_rgba(38,36,32,0.06)]"
          style={{
            animationDelay: '0.22s',
            backgroundImage: 'radial-gradient(#D6D2C0 0.6px, transparent 0.6px)',
            backgroundSize: '18px 18px',
            backgroundColor: '#FAF8F0',
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <MonoLabel>Assigned to you</MonoLabel>
              <h2 className="text-lg mt-1 text-[#262420]" style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700 }}>Job cards</h2>
            </div>
            <button className="hidden sm:flex items-center gap-1 text-[11px] tracking-[0.14em] uppercase text-[#C0392B]">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {isLoading && <p className="py-8 text-center text-sm text-[#6E6A5C]">Loading job cards…</p>}
            {!isLoading && !cards.length && !loadError && <p className="py-8 text-center text-sm text-[#6E6A5C]">No job cards are available yet.</p>}
            {cards.map((card, i) => {
              const isOpen = expanded === card.id;
              return (
                <div key={card.id} className="dash-in relative bg-[#FAF8F0] border border-dashed border-[#B4AF9E] rounded-sm overflow-hidden" style={{ animationDelay: `${0.26 + i * 0.05}s` }}>
                  <Notch className="-top-px -left-px" />
                  <Notch className="-top-px -right-px rotate-90" />
                  <button
                    onClick={() => setExpanded(isOpen ? null : card.id)}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-[#F3F1E7]/70 transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-9 h-9 rounded-sm bg-[#E8C547]/20 text-[#8A6A18] flex items-center justify-center flex-shrink-0">
                        <Scissors className="w-4 h-4" strokeWidth={1.6} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13.5px] text-[#262420] font-medium truncate">{card.garment} — {card.customer}</div>
                        <div className="text-[11px] text-[#9C9686]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{card.id} · Due {card.due}</div>
                      </div>
                    </div>
                    <span className="flex-shrink-0 inline-block px-2 py-0.5 rounded-sm text-[10px] tracking-[0.1em] uppercase bg-[#ECE8DA] text-[#55503F] border border-[#D6D2C0]">
                      {STAGES[card.stageIndex]}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 border-t border-dashed border-[#D6D2C0]">
                      <div className="flex flex-wrap gap-x-6 gap-y-3 py-4">
                        {card.measurements.map((m) => (
                          <div key={m.label}>
                            <MonoLabel>{m.label}</MonoLabel>
                            <div className="text-[14px] text-[#262420]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{m.value}</div>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-[12px] text-[#6E6A5C] mb-4">
                        <span>{card.fabric}</span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{card.fabricUsed}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          onClick={() => setStageModalCard(card)}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-sm bg-[#2A2A28] text-[#EDEAE2] text-[10px] tracking-[0.1em] uppercase hover:bg-[#3A3936] transition-colors"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                          Update stage
                        </button>
                        <button
                          onClick={() => setFabricModalCard(card)}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-sm border border-[#D6D2C0] text-[#55503F] text-[10px] tracking-[0.1em] uppercase hover:border-[#9C9686] transition-colors"
                        >
                          <Boxes className="w-3.5 h-3.5" />
                          Record fabric usage
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ---------------- RIGHT COLUMN: FITTINGS TODAY ---------------- */}
        <div className="dash-in bg-[#FAF8F0] border border-[#D6D2C0] rounded-sm p-6 sm:p-7 shadow-[0_1px_3px_rgba(38,36,32,0.06)]" style={{ animationDelay: '0.3s' }}>
          <MonoLabel>Today's calendar</MonoLabel>
          <h2 className="text-lg mt-1 mb-5 text-[#262420]" style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700 }}>Fittings &amp; alterations</h2>
          <div className="space-y-4">
            {FITTINGS_TODAY.map((f) => (
              <div key={`${f.time}-${f.customer}`} className="flex items-center gap-3">
                <div className="flex flex-col items-center flex-shrink-0 w-14">
                  <Clock className="w-3 h-3 text-[#E8C547] mb-0.5" strokeWidth={1.8} />
                  <span className="text-[11px] text-[#55503F]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{f.time}</span>
                </div>
                <div className="min-w-0 flex-1 border-l border-[#E2DECB] pl-3">
                  <div className="text-[13px] text-[#262420] font-medium truncate">{f.customer}</div>
                  <div className="text-[12px] text-[#6E6A5C] truncate">{f.garment} · {f.jobCardId}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-[#E2DECB]">
            <MonoLabel>Quick lookup</MonoLabel>
            <div className="relative flex items-center border-b border-[#D6D2C0] focus-within:border-[#C0392B] transition-colors mt-3">
              <User className="w-4 h-4 text-[#9C9686]" strokeWidth={1.5} />
              <input
                type="text"
                placeholder="Search customer or job card"
                className="w-full bg-transparent placeholder-[#B4AF9E] text-[13px] pl-3 py-2.5 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {stageModalCard && (
        <UpdateStageModal card={stageModalCard} onClose={() => setStageModalCard(null)} onUpdate={handleUpdateStage} />
      )}
      {fabricModalCard && (
        <RecordFabricModal card={fabricModalCard} onClose={() => setFabricModalCard(null)} onRecord={handleRecordFabric} />
      )}
    </div>
  );
}

/* placeholder for pages not built yet, so nav links never dead-end silently */
function ComingSoonView({ label }: { label: string }) {
  return (
    <div className="dash-in bg-[#FAF8F0] border border-[#D6D2C0] rounded-sm p-16 text-center">
      <MonoLabel>{label}</MonoLabel>
      <h2 className="text-2xl mt-2 text-[#262420]" style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700 }}>
        This page isn't built yet
      </h2>
      <p className="text-[13px] text-[#6E6A5C] mt-2">Ask to have the {label} page created next.</p>
    </div>
  );
}

/* ---------------- Stat card ---------------- */
function StatCard({ label, value, icon, delay = 0, tone = 'default' }: { label: string; value: string; icon: ReactNode; delay?: number; tone?: 'default' | 'warn'; }) {
  return (
    <div className="dash-in bg-[#FAF8F0] border border-[#D6D2C0] rounded-sm p-5 sm:p-6 shadow-[0_1px_3px_rgba(38,36,32,0.06)] hover:shadow-[0_4px_16px_-4px_rgba(38,36,32,0.1)] transition-shadow" style={{ animationDelay: `${delay}s` }}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-8 h-8 rounded-sm flex items-center justify-center ${tone === 'warn' ? 'bg-[#C0392B]/10 text-[#C0392B]' : 'bg-[#E8C547]/20 text-[#8A6A18]'}`}>{icon}</div>
      </div>
      <div className="text-2xl mb-1 text-[#262420]" style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700 }}>{value}</div>
      <MonoLabel className="block">{label}</MonoLabel>
    </div>
  );
}

/* ==================================================================
   ROOT — sidebar drives which view renders
================================================================== */

export default function MasterTailorDashboard({ initialView = 'dashboard' }: { initialView?: ViewKey }) {
  const navigate = useNavigate();
  const profile = currentUser();
  const [navOpen, setNavOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [view, setView] = useState<ViewKey>(initialView);

  const signOut = () => {
    localStorage.removeItem('authToken'); localStorage.removeItem('currentUser');
    sessionStorage.removeItem('authToken'); sessionStorage.removeItem('currentUser');
    navigate('/login', { replace: true });
  };

  const currentNavLabel = NAV.find((n) => n.view === view)?.label ?? 'Dashboard';

  function renderView() {
    switch (view) {
      case 'dashboard':
        return <DashboardView />;
      default:
        return <ComingSoonView label={currentNavLabel} />;
    }
  }

  return (
    <div className="min-h-screen bg-[#F3F1E7] text-[#262420] antialiased flex" style={{ fontFamily: "'Work Sans', sans-serif" }}>
      <style>{FONT_IMPORT}</style>

      <div
        className="fixed inset-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage: 'radial-gradient(#262420 0.7px, transparent 0.7px)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* ---------------- SIDEBAR ---------------- */}
      <aside
        className={`${navOpen ? 'fixed inset-y-0 left-0 translate-x-0' : 'fixed inset-y-0 left-0 -translate-x-full'} z-40 lg:relative lg:inset-auto lg:translate-x-0 lg:z-0 w-72 flex-shrink-0 h-screen lg:h-auto lg:min-h-screen bg-[#2A2A28] text-[#EDEAE2] flex flex-col justify-between transition-transform duration-300`}
      >
        <div>
          <div className="flex items-center justify-between px-8 py-8 border-b border-[#45443E]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-sm border border-[#E8C547]/60 bg-[#E8C547]/5 flex items-center justify-center rotate-3 shadow-[0_0_0_1px_rgba(232,197,71,0.08)]">
                <span className="text-[#E8C547] text-[10px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>P&T</span>
              </div>
              <div className="leading-tight" style={{ fontFamily: "'Archivo', sans-serif" }}>
                <div className="text-sm tracking-[0.08em] text-[#EDEAE2]" style={{ fontWeight: 600 }}>Press &amp; Tailor</div>
                <MonoLabel className="text-[#9C9686]">Workbench</MonoLabel>
              </div>
            </div>
            <button className="lg:hidden text-[#B4AF9E]" onClick={() => setNavOpen(false)} aria-label="Close menu">
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
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-r-sm text-[14px] transition-all border-l-2 ${
                    active
                      ? 'bg-gradient-to-r from-[#3A3936] to-[#333230] border-[#E8C547] text-[#EDEAE2] shadow-[inset_0_0_0_1px_rgba(232,197,71,0.08)]'
                      : 'border-transparent text-[#ABA495] hover:text-[#EDEAE2] hover:bg-[#333230]/70'
                  }`}
                >
                  <item.icon className="w-4 h-4" strokeWidth={1.6} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="px-8 py-7 border-t border-[#45443E] space-y-4">
          <button type="button" onClick={() => setShowProfile(true)} className="flex w-full items-center gap-3 rounded-sm p-1 text-left transition-colors hover:bg-[#333230]">
            <div className="w-9 h-9 overflow-hidden rounded-full bg-[#E8C547]/20 border border-[#E8C547]/50 flex items-center justify-center">
              {profile?.profile_picture ? <img src={profile.profile_picture} alt="Profile" className="h-full w-full object-cover" /> : <span className="text-[#E8C547] text-xs font-medium">{profile?.full_name?.split(' ').map((name: string) => name[0]).join('').slice(0, 2) || 'MT'}</span>}
            </div>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[13px] text-[#EDEAE2]">{profile?.full_name || TAILOR.name}</div>
              <MonoLabel className="text-[#9C9686]">{profile?.position || TAILOR.role}</MonoLabel>
            </div>
          </button>
          <button onClick={signOut} className="group flex w-full items-center justify-between border border-[#45443E] bg-[#333230] px-3.5 py-2.5 rounded-sm text-[10px] font-semibold tracking-[0.16em] uppercase text-[#B4AF9E] transition-all hover:border-[#E8C547]/60 hover:text-[#EDEAE2]">
            Sign out <LogOut className="h-3.5 w-3.5 text-[#E8C547] transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </aside>

      {showProfile && <MasterTailorProfileModal profile={profile} onClose={() => setShowProfile(false)} onEdit={() => navigate('/complete-profile')} />}

      {navOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setNavOpen(false)} />}

      {/* ---------------- MAIN ---------------- */}
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-20 bg-[#F3F1E7]/95 backdrop-blur-md border-b border-[#D6D2C0] px-6 sm:px-10 py-5 flex items-center justify-between gap-4 shadow-[0_1px_0_rgba(214,210,192,0.6)]">
          <div className="flex items-center gap-3 min-w-0">
            <button className="lg:hidden text-[#262420] flex-shrink-0" onClick={() => setNavOpen(true)} aria-label="Open menu">
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <MonoLabel className="block">Workbench / {currentNavLabel}</MonoLabel>
              <div className="text-[15px] text-[#262420] truncate" style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700 }}>
                {currentNavLabel}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-5 flex-shrink-0">
            <div className="relative hidden md:flex items-center bg-[#FAF8F0] border border-[#D6D2C0] rounded-full px-3 py-2 focus-within:border-[#9C9686] transition-colors">
              <Search className="w-3.5 h-3.5 text-[#9C9686]" strokeWidth={1.5} />
              <input
                type="text"
                placeholder="Search job cards"
                className="w-48 bg-transparent placeholder-[#B4AF9E] text-[12px] pl-2 focus:outline-none"
              />
            </div>
            <button className="relative text-[#55503F] hover:text-[#262420] transition-colors" aria-label="Notifications">
              <Bell className="w-5 h-5" strokeWidth={1.5} />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#C0392B] ring-2 ring-[#F3F1E7]" />
            </button>
            <div className="h-6 w-px bg-[#D6D2C0] hidden sm:block" />
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

function MasterTailorProfileModal({ profile, onClose, onEdit }: { profile: any; onClose: () => void; onEdit: () => void }) {
  const details: [string, string | undefined][] = [
    ['Employee ID', profile?.employee_id], ['Position', profile?.position || 'Master Tailor'],
    ['Department', 'Production & Alterations'], ['Date Hired', profile?.date_hired ? new Date(profile.date_hired).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : undefined],
    ['Account Status', profile?.status || 'Approved'],
  ];
  const responsibilities = ['Review assigned job cards', 'Take and verify measurements', 'Create patterns and cut fabric', 'Update production stages', 'Record fabric usage', 'Complete fittings and alterations'];
  const Section = ({ title, items }: { title: string; items: [string, string | undefined][] }) => <div><h3 className="text-lg text-[#262420]" style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700 }}>{title}</h3><dl className="mt-3 grid gap-x-6 gap-y-4 sm:grid-cols-2">{items.map(([label, value]) => <div key={label}><dt className="text-[10px] uppercase tracking-[0.16em] text-[#7A7568]">{label}</dt><dd className="mt-1 text-sm text-[#262420]">{value || 'Not set'}</dd></div>)}</dl></div>;
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <button aria-label="Close profile" onClick={onClose} className="absolute inset-0 bg-black/45 backdrop-blur-sm" />
    <section className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto border border-[#D6D2C0] bg-[#FAF8F0] shadow-2xl">
      <header className="flex items-start justify-between border-b border-[#D6D2C0] px-6 py-6 sm:px-8"><div><MonoLabel>Master Tailor Profile</MonoLabel><h2 className="mt-1 text-3xl text-[#262420]" style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700 }}>{profile?.full_name || TAILOR.name}</h2></div><button onClick={onClose} className="p-2 text-[#6E6A5C] hover:bg-[#EDEAE2]"><X className="h-5 w-5" /></button></header>
      <div className="space-y-8 p-6 sm:p-8">
        <div className="flex items-center gap-5 border border-[#D6D2C0] bg-[#F3F1E7] p-5"><div className="h-20 w-20 overflow-hidden rounded-full border border-[#E8C547]/60 bg-[#E8C547]/15">{profile?.profile_picture ? <img src={profile.profile_picture} alt="Profile" className="h-full w-full object-cover" /> : <User className="m-6 h-8 w-8 text-[#8A6A18]" />}</div><div><div className="text-lg font-medium">{profile?.full_name || TAILOR.name}</div><p className="text-sm text-[#6E6A5C]">{profile?.position || TAILOR.role}</p><p className="mt-1 text-xs text-[#7A7568]">{profile?.email || 'No email'}</p></div></div>
        <Section title="Personal Information" items={[["Full Name", profile?.full_name], ['Email Address', profile?.email], ['Contact Number', profile?.contact_number], ['Address', profile?.address]]} />
        <Section title="Employment Information" items={details} />
        <Section title="Account Information" items={[["Username", profile?.email?.split('@')[0]], ['Role', 'Master Tailor'], ['Last Login', 'Current session'], ['Password', '••••••••••••']]} />
        <div><h3 className="text-lg text-[#262420]" style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700 }}>Responsibilities</h3><ul className="mt-3 grid gap-2 sm:grid-cols-2">{responsibilities.map((item) => <li key={item} className="flex gap-2 text-sm text-[#6E6A5C]"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#8A6A18]" />{item}</li>)}</ul></div>
        <div className="flex flex-wrap gap-3 border-t border-[#D6D2C0] pt-6"><button onClick={onEdit} className="bg-[#2A2A28] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#EDEAE2]">Edit Profile</button><button onClick={onEdit} className="border border-[#B4AF9E] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#55503F]">Change Photo</button></div>
      </div>
    </section>
  </div>;
}
