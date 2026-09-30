// financialCenter/CustomerSelector.tsx
//
// CUSTOMER SELECTION FLOW
//   Search Customer  ->  Select Customer  ->  Open Customer Financial Center
//
// Real customers only: the list comes from GET /api/financial-center/customers
// (name, code, contact, e-mail) with each customer's live order count, total
// paid and outstanding balance. No demo customers and no placeholder figures.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronRight, Loader2, Search, UserRound } from 'lucide-react';
import frontDeskApi, { type FinancialCustomerSummary } from '../../services/frontDeskApi';
import { COLORS, shadowSm } from '../Pages_Admin/Theme';
import { formatPHP } from '../utils/currency';

function initials(name: string): string {
  return name.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'CU';
}

export function CustomerSelector({ onSelect }: { onSelect: (customerId: string) => void }) {
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<FinancialCustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (search: string) => {
    setLoading(true);
    setError('');
    try {
      setRows(await frontDeskApi.searchFinancialCustomers(search));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load customers.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(''); }, [load]);

  const totals = useMemo(() => ({
    customers: rows.length,
    withBalance: rows.filter((row) => row.outstanding_balance > 0).length,
    outstanding: rows.reduce((sum, row) => sum + row.outstanding_balance, 0),
    collected: rows.reduce((sum, row) => sum + row.total_paid, 0),
  }), [rows]);

  return (
    <section className="border bg-white" style={{ borderColor: COLORS.border, borderRadius: 16, boxShadow: shadowSm }}>
      <header className="border-b p-5" style={{ borderColor: COLORS.border }}>
        <h2 className="text-[15px] font-semibold" style={{ color: COLORS.ink }}>Search customer</h2>
        <p className="mt-1 text-[11.5px]" style={{ color: COLORS.muted }}>
          Pick a customer to open their financial profile: orders, payments, receipts, balances and statements.
        </p>
        <form
          className="mt-4 flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => { event.preventDefault(); load(query); }}
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: COLORS.faint }} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, customer code, contact number or email"
              className="w-full border bg-white py-2.5 pl-9 pr-3 text-[12.5px] outline-none"
              style={{ borderColor: COLORS.border, borderRadius: 8, color: COLORS.ink }}
            />
          </div>
          <button type="submit" className="px-4 py-2.5 text-[12px] font-semibold text-white" style={{ background: COLORS.navy, borderRadius: 8 }}>
            Search
          </button>
        </form>

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ['Customers', String(totals.customers)],
            ['With balance', String(totals.withBalance)],
            ['Outstanding', formatPHP(totals.outstanding)],
            ['Collected', formatPHP(totals.collected)],
          ].map(([label, value]) => (
            <div key={label} className="border px-3 py-2" style={{ borderColor: COLORS.border, background: COLORS.surfaceAlt, borderRadius: 10 }}>
              <div className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: COLORS.muted }}>{label}</div>
              <div className="mono mt-0.5 text-[15px] font-semibold" style={{ color: COLORS.ink }}>{value}</div>
            </div>
          ))}
        </div>
      </header>

      {error && <p className="border-b px-5 py-3 text-[12px]" style={{ borderColor: COLORS.dangerBorder, background: COLORS.dangerBg, color: COLORS.danger }}>{error}</p>}
      {loading && <p className="flex items-center gap-2 px-5 py-4 text-[12px]" style={{ color: COLORS.muted }}><Loader2 className="h-4 w-4 animate-spin" /> Loading customers…</p>}


      <div className="divide-y" style={{ borderColor: COLORS.border }}>
        {rows.map((row) => (
          <button
            key={row.customer_code}
            type="button"
            onClick={() => onSelect(row.customer_code)}
            className="flex w-full flex-col gap-3 p-4 text-left transition-colors sm:flex-row sm:items-center sm:justify-between"
            onMouseEnter={(event) => { event.currentTarget.style.background = COLORS.surfaceAlt; }}
            onMouseLeave={(event) => { event.currentTarget.style.background = 'transparent'; }}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center text-[12px] font-semibold text-white" style={{ background: COLORS.navy, borderRadius: 999 }}>
                {initials(row.full_name)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13.5px] font-medium" style={{ color: COLORS.ink }}>{row.full_name}</span>
                <span className="mono mt-0.5 block text-[11px]" style={{ color: COLORS.muted }}>
                  {row.customer_code}{row.contact_number ? ` · ${row.contact_number}` : ''}{row.email ? ` · ${row.email}` : ''}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-4 sm:gap-6">
              <span className="text-right">
                <span className="block text-[10px] uppercase tracking-[0.1em]" style={{ color: COLORS.muted }}>Orders</span>
                <span className="mono text-[12.5px]" style={{ color: COLORS.ink }}>{row.total_orders}</span>
              </span>
              <span className="text-right">
                <span className="block text-[10px] uppercase tracking-[0.1em]" style={{ color: COLORS.muted }}>Paid</span>
                <span className="mono text-[12.5px]" style={{ color: COLORS.success }}>{formatPHP(row.total_paid)}</span>
              </span>
              <span className="text-right">
                <span className="block text-[10px] uppercase tracking-[0.1em]" style={{ color: COLORS.muted }}>Outstanding</span>
                <span className="mono text-[12.5px]" style={{ color: row.outstanding_balance > 0 ? COLORS.warning : COLORS.success }}>{formatPHP(row.outstanding_balance)}</span>
              </span>
              <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: COLORS.faint }} />
            </div>
          </button>
        ))}
      </div>

      {!loading && !rows.length && !error && (
        <p className="flex items-center justify-center gap-2 p-10 text-[13px]" style={{ color: COLORS.muted }}>
          <UserRound className="h-4 w-4" /> No customer matches this search.
        </p>
      )}
    </section>
  );
}

export default CustomerSelector;
