// Pages_Frontdesk/Paymentsdesk.tsx
import { useMemo, useState, useEffect, useCallback } from 'react';
import { Banknote, Check, ChevronRight, Plus, Search, X, Loader2, Printer } from 'lucide-react';
import frontDeskApi, { type Payment, type Order } from '../../services/frontDeskApi';

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] uppercase tracking-[0.2em] text-[#8C7E74]" style={{ fontFamily: "'Space Mono', monospace" }}>{children}</span>;
}

const peso = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(amount);

function Badge({ status }: { status: string }) {
  const isPaid = status === 'Fully Paid' || status === 'Paid';
  return (
    <span className={`inline-block rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.08em] ${isPaid ? 'border-[#B9DDD0] bg-[#E7F4EE] text-[#277257]' : 'border-[#ECD8A7] bg-[#FFF7E3] text-[#8A6618]'}`}>
      {status}
    </span>
  );
}

function PaymentDetails({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button onClick={onClose} className="absolute inset-0 bg-[#1F1916]/45 backdrop-blur-sm" />
      <section className="relative w-full max-w-lg rounded-xl border border-[#E2D7C7] bg-[#FFFCF8] p-7 shadow-2xl">
        <button onClick={onClose} className="absolute right-5 top-5 text-[#766A62]"><X className="h-5 w-5" /></button>
        <Label>Payment receipt</Label>
        <h2 className="mt-1 text-3xl text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>{payment.customer_name}</h2>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {[
            ['Job card', payment.job_card_id],
            ['Payment ID', payment.payment_id],
            ['Date', new Date(payment.payment_date).toLocaleDateString()],
            ['Type', payment.payment_type],
            ['Method', payment.payment_method],
            ['Recorded by', payment.recorded_by_name],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-[#E2D7C7] bg-white p-3">
              <Label>{label}</Label>
              <div className="mt-1 text-sm text-[#2A211D]">{value}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-between border-t border-[#E8DFD3] pt-5">
          <Badge status={payment.payment_type === 'Final Payment' ? 'Fully Paid' : 'Paid'} />
          <span className="text-xl text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>{peso(payment.amount)}</span>
        </div>
        <button className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg border border-[#E2D7C7] py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5E5048] hover:bg-[#F8F3EB]">
          <Printer className="h-4 w-4" /> Print receipt
        </button>
      </section>
    </div>
  );
}

function RecordPaymentModal({ onClose, onRecord, orders }: { onClose: () => void; onRecord: (data: any) => void; orders: Order[] }) {
  const [form, setForm] = useState({
    jobCardId: '',
    orderId: '',
    amount: '',
    paymentType: 'Deposit' as 'Deposit' | 'Final Payment' | 'Partial',
    paymentMethod: 'Cash' as 'Cash' | 'Card' | 'Bank Transfer' | 'GCash' | 'Other',
    notes: '',
  });
  const [error, setError] = useState('');

  const selectedOrder = orders.find(o => o.job_card_id === form.jobCardId.toUpperCase());

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amountNum = Number(form.amount);
    if (!form.jobCardId.trim()) {
      setError('Job card ID is required.');
      return;
    }
    if (!form.amount.trim() || Number.isNaN(amountNum) || amountNum <= 0) {
      setError('Enter a valid payment amount.');
      return;
    }
    if (selectedOrder && amountNum > selectedOrder.remaining_balance) {
      setError(`Amount exceeds the balance due of ${peso(selectedOrder.remaining_balance)} for this job card.`);
      return;
    }
    if (!selectedOrder) {
      setError('Job card not found. Please check the ID.');
      return;
    }
    onRecord({
      orderId: selectedOrder.order_id,
      amount: amountNum,
      paymentType: form.paymentType,
      paymentMethod: form.paymentMethod,
      notes: form.notes,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#1F1916]/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-[#FFFFFF] border border-[#E8DFD3] rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-7 sm:px-10 pt-8 pb-2">
          <Label>Cash transaction</Label>
          <button onClick={onClose} className="text-[#A3958B] hover:text-[#2A211D] transition-colors p-1 rounded-full hover:bg-[#F2ECE1]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-7 sm:px-10 pb-9 pt-2">
          <h2 className="text-3xl leading-tight mb-2 text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>Record payment</h2>
          <p className="text-[14px] text-[#766A62] font-light mb-8 leading-relaxed">Logs a cash payment against a job card.</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <div className="border border-[#C86A58]/30 bg-[#FDF4F2] px-4 py-3 rounded-lg text-sm text-[#9A3B2A]">{error}</div>}

            <div>
              <label className="block mb-1.5"><Label>Job card ID</Label></label>
              <input value={form.jobCardId} onChange={(e) => setForm(f => ({ ...f, jobCardId: e.target.value }))} placeholder="JC-0001" className="w-full border-b border-[#E2D7C7] bg-transparent py-2.5 text-[14px] outline-none focus:border-[#2A211D]" />
            </div>

            {selectedOrder && (
              <div className="rounded-lg border border-[#E8DFD3] bg-[#FCFAF7] p-4">
                <div className="flex justify-between"><span className="font-medium">{selectedOrder.customer_name}</span><span>{selectedOrder.garment_type}</span></div>
                <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-dashed border-[#E2D7C7]">
                  <div><Label>Total</Label><div className="text-sm font-semibold">{peso(selectedOrder.total_amount)}</div></div>
                  <div><Label>Paid</Label><div className="text-sm font-semibold text-[#4E7357]">{peso(selectedOrder.deposit_paid)}</div></div>
                  <div><Label>Balance</Label><div className="text-sm font-semibold text-[#9E5B4B]">{peso(selectedOrder.remaining_balance)}</div></div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1.5"><Label>Payment type</Label></label>
                <select value={form.paymentType} onChange={(e) => setForm(f => ({ ...f, paymentType: e.target.value as any }))} className="w-full border-b border-[#E2D7C7] bg-transparent py-2.5 text-[14px] outline-none">
                  <option value="Deposit">Deposit</option>
                  <option value="Final Payment">Final Payment</option>
                  <option value="Partial">Partial</option>
                </select>
              </div>
              <div>
                <label className="block mb-1.5"><Label>Payment method</Label></label>
                <select value={form.paymentMethod} onChange={(e) => setForm(f => ({ ...f, paymentMethod: e.target.value as any }))} className="w-full border-b border-[#E2D7C7] bg-transparent py-2.5 text-[14px] outline-none">
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="GCash">GCash</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block mb-1.5"><Label>Amount (₱)</Label></label>
              <div className="relative flex items-center border-b border-[#E2D7C7] focus-within:border-[#2A211D]">
                <Banknote className="w-4 h-4 text-[#A3958B]" strokeWidth={1.5} />
                <input type="number" min="0" step="1" value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" className="w-full bg-transparent pl-3 py-2.5 text-[14px] outline-none" />
              </div>
            </div>

            <div>
              <label className="block mb-1.5"><Label>Notes (optional)</Label></label>
              <input value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Cash payment" className="w-full border-b border-[#E2D7C7] bg-transparent py-2.5 text-[14px] outline-none focus:border-[#2A211D]" />
            </div>

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-lg border border-[#E2D7C7] text-[#766A62] text-[11px] font-semibold uppercase hover:bg-[#F2ECE1]">Cancel</button>
              <button type="submit" className="flex-1 px-4 py-3 rounded-lg bg-[#2A211D] text-[#FAF7F2] text-[11px] font-semibold uppercase hover:bg-[#3D312B] shadow-md">Record payment</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export function FrontDeskPaymentsView() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Payment | null>(null);
  const [recordOpen, setRecordOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [paymentsData, ordersData] = await Promise.all([
        frontDeskApi.getAllPayments(),
        frontDeskApi.getAllOrders(),
      ]);
      setPayments(paymentsData);
      setOrders(ordersData);
    } catch (err) {
      console.error('Failed to load data:', err);
      setNotice('Failed to load payment data.');
      setTimeout(() => setNotice(''), 4000);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    if (!query.trim()) return payments;
    const q = query.toLowerCase();
    return payments.filter((p) =>
      p.job_card_id.toLowerCase().includes(q) ||
      p.customer_name.toLowerCase().includes(q) ||
      p.payment_id.toLowerCase().includes(q)
    );
  }, [payments, query]);

  const collected = payments.reduce((total, p) => total + p.amount, 0);

  const handleRecordPayment = async (data: any) => {
    try {
      const newPayment = await frontDeskApi.recordPayment(data);
      setPayments(prev => [newPayment, ...prev]);
      setRecordOpen(false);
      setNotice(`Payment of ${peso(newPayment.amount)} recorded for ${newPayment.job_card_id}.`);
      setTimeout(() => setNotice(''), 4000);
      loadData(); // Refresh orders to update balances
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Failed to record payment.');
      setTimeout(() => setNotice(''), 4000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-[#8C6F3E]" />
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div className="dash-in flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Label>Counter transactions</Label>
          <h1 className="mt-1 text-2xl text-[#2A211D] sm:text-3xl" style={{ fontFamily: "'DM Serif Display', serif" }}>Payments</h1>
          <p className="mt-2 text-sm text-[#766A62]">Record deposits and final balances for tailoring orders.</p>
        </div>
        <button onClick={() => setRecordOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-[#2A211D] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white shadow-[0_10px_26px_-14px_rgba(42,33,29,0.55)]">
          <Plus className="h-4 w-4" /> Record payment
        </button>
      </div>

      {notice && (
        <div className="dash-in flex items-center gap-2 rounded-lg border border-[#8B9E87]/40 bg-[#F1F5F0] px-4 py-3 text-sm text-[#4E7357] shadow-sm">
          <Check className="h-4 w-4" />{notice}
        </div>
      )}

      <div className="dash-in grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Metric label="Total collected" value={peso(collected)} />
        <Metric label="Transactions" value={payments.length.toString()} />
        <Metric label="Orders with balance" value={orders.filter(o => o.remaining_balance > 0).length.toString()} tone={orders.some(o => o.remaining_balance > 0) ? 'warn' : 'default'} />
      </div>

      <section className="dash-card overflow-hidden rounded-xl">
        <div className="flex flex-col gap-4 border-b border-[#E8DFD3] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A3958B]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search payment, job card, or customer" className="w-full rounded-lg border border-[#E2D7C7] bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#A46B48]" />
          </div>
          <span className="text-xs text-[#8C7E74]">{filtered.length} transaction{filtered.length === 1 ? '' : 's'}</span>
        </div>

        <div className="hidden grid-cols-[0.8fr_1.2fr_1fr_0.8fr_0.9fr_24px] gap-4 border-b border-[#E8DFD3] bg-[#FCFAF7] px-6 py-3 md:grid">
          {['Job card', 'Customer', 'Type', 'Amount', 'Status', ''].map((label) => <Label key={label}>{label}</Label>)}
        </div>

        {filtered.map((payment) => (
          <button key={payment.payment_id} onClick={() => setSelected(payment)} className="grid w-full grid-cols-1 gap-2 border-b border-[#F0EAE2] px-6 py-4 text-left hover:bg-[#FCFAF7] md:grid-cols-[0.8fr_1.2fr_1fr_0.8fr_0.9fr_24px] md:items-center md:gap-4">
            <span className="text-[12px] text-[#8C6F3E]" style={{ fontFamily: "'Space Mono', monospace" }}>{payment.job_card_id}</span>
            <span className="font-medium text-[#2A211D]">{payment.customer_name}</span>
            <span className="text-sm text-[#5E5048]">{payment.payment_type}</span>
            <span className="text-sm font-medium text-[#2A211D]">{peso(payment.amount)}</span>
            <Badge status={payment.payment_type === 'Final Payment' ? 'Fully Paid' : 'Paid'} />
            <ChevronRight className="hidden h-4 w-4 text-[#A46B48] md:block" />
          </button>
        ))}
        {!filtered.length && <p className="p-12 text-center text-sm text-[#766A62]">No payments match your search.</p>}
      </section>

      {selected && <PaymentDetails payment={selected} onClose={() => setSelected(null)} />}
      {recordOpen && <RecordPaymentModal onClose={() => setRecordOpen(false)} onRecord={handleRecordPayment} orders={orders} />}
    </div>
  );
}

function Metric({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'warn' }) {
  const toneClass = tone === 'warn' ? 'text-[#9E5B4B]' : 'text-[#2A211D]';
  return <div className="dash-card rounded-xl p-5"><div className={`text-2xl ${toneClass}`} style={{ fontFamily: "'DM Serif Display', serif" }}>{value}</div><Label>{label}</Label></div>;
}

export default FrontDeskPaymentsView;