import { useEffect, useState } from 'react';
import { Bell, X, Check } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const authToken = () => localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';

type NotificationLog = {
  id: number;
  job_card_number?: string;
  title: string;
  message: string;
  type?: string;
  read_at?: string | null;
  created_at?: string;
};

const TYPE_TONE: Record<string, string> = {
  production: '#3F6633',
  charge: '#C9A227',
  order: '#8C6F3E',
  appointment: '#8C6F3E',
  customer: '#4E7357',
  payment: '#8C6F3E',
  measurement: '#C9A227',
};

function fmtTime(value?: string) {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleString() : '';
}

/**
 * Reusable notification bell + dropdown for any staff dashboard. Reads the
 * shared `notifications` table through the existing role endpoint and lets the
 * user mark everything read. The DB is the single source of truth.
 */
export default function NotificationBell({ endpoint }: { endpoint: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationLog[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}${endpoint}`, { headers: { Authorization: `Bearer ${authToken()}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Unable to load notifications.');
      const list = data.notifications || [];
      setItems(list);
      setUnread(list.filter((n: NotificationLog) => !n.read_at).length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
    /* eslint-disable-next-line */
  }, [endpoint]);

  async function markAllRead() {
    try {
      await fetch(`${API_URL}${endpoint}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken()}` },
      });
      setUnread(0);
      setItems((cur) => cur.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    } catch {
      /* non-fatal */
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen((o) => !o); if (!open) refresh(); }}
        aria-label="Notifications"
        className="relative flex items-center justify-center p-1 transition-colors"
        style={{ color: 'inherit' }}
      >
        <Bell className={`w-5 h-5 ${unread ? 'animate-bounce' : ''}`} strokeWidth={1.5} />
        {unread > 0 && (
          <span
            className="absolute top-0 right-0 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-semibold text-white"
            style={{ background: '#9E5B4B' }}
          >
            {unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 z-50 mt-2 w-80 max-h-[70vh] overflow-y-auto rounded-xl border border-[#E8DFD3] bg-white shadow-xl"
            style={{ fontFamily: 'Work Sans, sans-serif' }}
          >
            <div className="flex items-center justify-between border-b border-[#E8DFD3] px-4 py-3">
              <span className="text-[10px] uppercase tracking-[0.18em] text-[#8C7E74]" style={{ fontFamily: 'Space Mono, monospace' }}>
                Notifications
              </span>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button onClick={markAllRead} className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.1em] text-[#4E7357] hover:underline">
                    <Check className="h-3 w-3" /> Read all
                  </button>
                )}
                <button onClick={() => setOpen(false)} aria-label="Close notices" className="text-[#A3958B] hover:text-[#2A211D]"><X className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="divide-y divide-[#F0EAE2]">
              {error && <p className="px-4 py-3 text-xs text-[#9E5B4B]">{error}</p>}
              {!error && loading && !items.length && <p className="px-4 py-6 text-center text-xs text-[#A3958B]">Loading…</p>}
              {!error && !loading && !items.length && <p className="px-4 py-6 text-center text-xs text-[#A3958B]">No notifications yet.</p>}
              {items.map((n) => {
                const dot = TYPE_TONE[n.type || ''] || TYPE_TONE.production;
                return (
                  <div key={n.id} className={`px-4 py-3 ${n.read_at ? 'opacity-55' : ''}`}>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: dot }} />
                      <span className="text-[13px] font-medium text-[#2A211D]">{n.title}</span>
                      {!n.read_at && <span className="ml-auto rounded bg-[#FDF1EE] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.08em] text-[#9E5B4B]">New</span>}
                    </div>
                    <p className="mt-1 pl-4 text-[12px] leading-relaxed text-[#5E5048]">{n.message}</p>
                    <p className="mt-1 pl-4 text-[10.5px] text-[#A3958B]" style={{ fontFamily: 'Space Mono, monospace' }}>
                      {n.job_card_number ? `${n.job_card_number} · ` : ''}{fmtTime(n.created_at)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}