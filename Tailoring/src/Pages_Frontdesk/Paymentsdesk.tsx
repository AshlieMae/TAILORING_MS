// Pages_Frontdesk/Paymentsdesk.tsx
import { useMemo, useState, useEffect, useCallback } from 'react';
import { Banknote, Check, ChevronRight, Plus, Search, X, Loader2, Printer, Package } from 'lucide-react';
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

function PaymentDetails({ payment, orders, onClose, onPay }: { payment: Payment; orders: Order[]; onClose: () => void; onPay: (data: any) => Promise<void> }) {
  // The job order behind this receipt — gives us the live balance.
  const order = orders.find((o) => o.job_card_id === payment.job_card_id);
  const balance = order ? Number(order.remaining_balance) : 0;
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'Cash' | 'Card' | 'Bank Transfer' | 'GCash' | 'Other'>('Cash');
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  async function handlePay() {
    const amt = Number(amount || balance);
    if (!Number.isFinite(amt) || amt <= 0) { setError('Enter a valid payment amount.'); return; }
    if (order && amt > Number(order.remaining_balance)) { setError(`Amount exceeds the balance due of ${peso(order.remaining_balance)}.`); return; }
    setPaying(true);
    setError('');
    try {
      await onPay({
        orderId: order?.order_id,
        amount: amt,
        paymentType: order && amt >= Number(order.remaining_balance) ? 'Final Payment' : 'Partial',
        paymentMethod: method,
        notes: 'Balance settled from receipt',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment.');
      setPaying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button onClick={onClose} className="absolute inset-0 bg-[#1F1916]/45 backdrop-blur-sm" />
      <section className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#E2D7C7] bg-[#FFFCF8] p-7 shadow-2xl">
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

        {/* Live order money summary */}
        {order && (
          <div className="mt-5 rounded-lg border border-[#E8DFD3] bg-[#FCFAF7] p-4">
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Total</Label><div className="mt-0.5 text-sm font-semibold text-[#2A211D]">{peso(Number(order.total_amount))}</div></div>
              <div><Label>Paid</Label><div className="mt-0.5 text-sm font-semibold text-[#4E7357]">{peso(Number(order.deposit_paid))}</div></div>
              <div><Label>Balance</Label><div className={`mt-0.5 text-sm font-semibold ${balance > 0 ? 'text-[#9E5B4B]' : 'text-[#4E7357]'}`}>{peso(balance)}</div></div>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-[#E8DFD3] pt-5">
          <Badge status={payment.payment_type === 'Final Payment' ? 'Fully Paid' : 'Paid'} />
          <span className="text-xl text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>{peso(payment.amount)}</span>
        </div>

        {/* Pay-the-order action */}
        {order && balance > 0 && (
          <div className="mt-5 rounded-lg border border-[#ECD8A7] bg-[#FFF7E3] p-4">
            <Label>Settle this order</Label>
            <p className="mt-1 text-[12px] leading-relaxed text-[#8A6618]">
              Balance due is <span className="font-bold">{peso(balance)}</span>. Enter the amount received and record it against the job card.
            </p>
            {error && <div className="mt-3 rounded-md border border-[#C86A58]/30 bg-[#FDF4F2] px-3 py-2 text-xs text-[#9A3B2A]">{error}</div>}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block text-xs font-medium text-[#5E5048]">
                Amount (₱)
                <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(balance)} className="mt-1 w-full rounded-lg border border-[#E2D7C7] bg-white px-3 py-2 text-sm outline-none focus:border-[#A46B48]" />
              </label>
              <label className="block text-xs font-medium text-[#5E5048]">
                Method
                <select value={method} onChange={(e) => setMethod(e.target.value as typeof method)} className="mt-1 w-full rounded-lg border border-[#E2D7C7] bg-white px-3 py-2 text-sm outline-none focus:border-[#A46B48]">
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="GCash">GCash</option>
                  <option value="Other">Other</option>
                </select>
              </label>
            </div>
            <button onClick={handlePay} disabled={paying} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#2A211D] py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white transition-transform hover:-translate-y-0.5 disabled:opacity-50">
              <Banknote className="h-4 w-4" /> {paying ? 'Recording…' : `Pay ${peso(Number(amount || balance))}`}
            </button>
          </div>
        )}
        {order && balance <= 0 && (
          <p className="mt-5 rounded-lg border border-[#B9DDD0] bg-[#E7F4EE] px-4 py-3 text-center text-sm font-medium text-[#277257]">This order is fully paid — no balance remains.</p>
        )}

        <button className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg border border-[#E2D7C7] py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5E5048] hover:bg-[#F8F3EB]">
          <Printer className="h-4 w-4" /> Print receipt
        </button>
      </section>
    </div>
  );
}

// One modal per JOB ORDER: money summary, full payment history, and the
// settle-balance action. Individual receipts open from the history rows.
function OrderDetails({ order, payments, onClose, onPay, onViewReceipt }: { order: Order; payments: Payment[]; onClose: () => void; onPay: (data: any) => Promise<void>; onViewReceipt: (p: Payment) => void }) {
  const orderPayments = payments
    .filter((p) => p.job_card_id === order.job_card_id)
    .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
  const balance = Number(order.remaining_balance);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'Cash' | 'Card' | 'Bank Transfer' | 'GCash' | 'Other'>('Cash');
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  async function handlePay() {
    const amt = Number(amount || balance);
    if (!Number.isFinite(amt) || amt <= 0) { setError('Enter a valid payment amount.'); return; }
    if (amt > Number(order.remaining_balance)) { setError(`Amount exceeds the balance due of ${peso(order.remaining_balance)}.`); return; }
    setPaying(true);
    setError('');
    try {
      await onPay({
        orderId: order.order_id,
        amount: amt,
        paymentType: amt >= Number(order.remaining_balance) ? 'Final Payment' : 'Partial',
        paymentMethod: method,
        notes: 'Balance settled from job order',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment.');
      setPaying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <style>{`@keyframes odPop{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:none}}.od-pop{animation:odPop .35s cubic-bezier(.22,1,.36,1) both}`}</style>
      <button onClick={onClose} className="absolute inset-0 bg-[#1F1916]/45 backdrop-blur-sm" />
      <section className="od-pop relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-xl border border-[#E2D7C7] bg-[#FFFCF8] shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-[#E8DFD3] p-6">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#A46B48] to-[#8C6F3E] text-lg font-semibold text-white shadow-md">
              {order.customer_name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
            </span>
            <div>
              <Label>Job order</Label>
              <h2 className="mt-1 text-3xl text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>{order.customer_name}</h2>
              <p className="mt-1 text-xs text-[#8C7E74]">{order.job_card_id} · {order.garment_type}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#766A62]"><X className="h-5 w-5" /></button>
        </header>

        <div className="p-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-[#E2D7C7] bg-white p-3"><Label>Total</Label><div className="mt-0.5 text-base font-semibold text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>{peso(Number(order.total_amount))}</div></div>
            <div className="rounded-lg border border-[#E2D7C7] bg-white p-3"><Label>Paid</Label><div className="mt-0.5 text-base font-semibold text-[#4E7357]" style={{ fontFamily: "'DM Serif Display', serif" }}>{peso(Number(order.deposit_paid))}</div></div>
            <div className="rounded-lg border border-[#E2D7C7] bg-white p-3"><Label>Balance</Label><div className={`mt-0.5 text-base font-semibold ${balance > 0 ? 'text-[#9E5B4B]' : 'text-[#4E7357]'}`} style={{ fontFamily: "'DM Serif Display', serif" }}>{peso(balance)}</div></div>
          </div>

          {balance > 0 ? (
            <div className="mt-5 rounded-lg border border-[#ECD8A7] bg-[#FFF7E3] p-4">
              <Label>Settle this order</Label>
              {error && <div className="mt-2 rounded-md border border-[#C86A58]/30 bg-[#FDF4F2] px-3 py-2 text-xs text-[#9A3B2A]">{error}</div>}
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="block text-xs font-medium text-[#5E5048]">
                  Amount (₱)
                  <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(balance)} className="mt-1 w-full rounded-lg border border-[#E2D7C7] bg-white px-3 py-2 text-sm outline-none focus:border-[#A46B48]" />
                </label>
                <label className="block text-xs font-medium text-[#5E5048]">
                  Method
                  <select value={method} onChange={(e) => setMethod(e.target.value as typeof method)} className="mt-1 w-full rounded-lg border border-[#E2D7C7] bg-white px-3 py-2 text-sm outline-none focus:border-[#A46B48]">
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="GCash">GCash</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
              </div>
              <button onClick={handlePay} disabled={paying} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#2A211D] py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white transition-transform hover:-translate-y-0.5 disabled:opacity-50">
                <Banknote className="h-4 w-4" /> {paying ? 'Recording…' : `Pay ${peso(Number(amount || balance))}`}
              </button>
            </div>
          ) : (
            <p className="mt-5 rounded-lg border border-[#B9DDD0] bg-[#E7F4EE] px-4 py-3 text-center text-sm font-medium text-[#277257]">This order is fully paid — no balance remains.</p>
          )}

          <div className="mt-6">
            <Label>Payment history ({orderPayments.length})</Label>
            <div className="mt-2 divide-y divide-[#F0EAE2] overflow-hidden rounded-lg border border-[#E2D7C7] bg-white">
              {orderPayments.length ? (
                orderPayments.map((p) => (
                  <button key={p.payment_id} onClick={() => onViewReceipt(p)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#FCFAF7]">
                    <span className="w-20 flex-shrink-0 text-[11px] text-[#8C7E74]" style={{ fontFamily: "'Space Mono', monospace" }}>{new Date(p.payment_date).toLocaleDateString()}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-[#2A211D]">{p.payment_type} · {p.payment_method}</span>
                    <span className="flex-shrink-0 text-sm font-semibold text-[#2A211D]">{peso(p.amount)}</span>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-[#A3958B]" />
                  </button>
                ))
              ) : (
                <p className="px-4 py-4 text-center text-sm text-[#766A62]">No payments recorded yet.</p>
              )}
            </div>
            <p className="mt-2 text-[10px] text-[#A3958B]">Click a payment to view its printable receipt.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

interface RecordPaymentFormData {
  jobCardId: string;
  orderId: string;
  amount: string;
  paymentType: 'Deposit' | 'Final Payment' | 'Partial';
  paymentMethod: 'Cash' | 'Card' | 'Bank Transfer' | 'GCash' | 'Other';
  notes: string;
}

function RecordPaymentModal({ 
  onClose, 
  onRecord, 
  orders 
}: { 
  onClose: () => void; 
  onRecord: (data: any) => Promise<void>;
  orders: Order[];
}) {
  const [form, setForm] = useState<RecordPaymentFormData>({
    jobCardId: '',
    orderId: '',
    amount: '',
    paymentType: 'Deposit',
    paymentMethod: 'Cash',
    notes: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedOrder = orders.find(o => o.job_card_id === form.jobCardId.toUpperCase());

  const handleJobCardSearch = (value: string) => {
    setForm(f => ({ ...f, jobCardId: value }));
    const found = orders.find(o => o.job_card_id === value.toUpperCase());
    if (found) {
      setForm(f => ({ ...f, orderId: found.order_id }));
    }
  };

  async function handleSubmit(e: React.FormEvent) {
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
    setSaving(true);
    setError('');
    try {
      await onRecord({
        orderId: selectedOrder.order_id,
        amount: amountNum,
        paymentType: form.paymentType,
        paymentMethod: form.paymentMethod,
        notes: form.notes,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#1F1916]/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-[#FFFFFF] border border-[#E8DFD3] rounded-xl shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-7 sm:px-10 pt-8 pb-2">
          <Label>Record payment</Label>
          <button onClick={onClose} className="text-[#A3958B] hover:text-[#2A211D] transition-colors p-1 rounded-full hover:bg-[#F2ECE1]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-7 sm:px-10 pb-9 pt-2">
          <h2 className="text-3xl leading-tight mb-2 text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Record Payment
          </h2>
          <p className="text-[14px] text-[#766A62] font-light mb-6 leading-relaxed">
            Record an additional deposit, partial payment, or final balance for an existing job card. Initial deposits can be collected while creating an order.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="border border-[#C86A58]/30 bg-[#FDF4F2] px-4 py-3 rounded-lg text-sm text-[#9A3B2A]">
                {error}
              </div>
            )}

            <div>
              <label className="block mb-1.5"><Label>Existing job card</Label></label>
              <div className="relative flex items-center border-b border-[#E2D7C7] focus-within:border-[#2A211D]">
                <Package className="w-4 h-4 text-[#A3958B]" strokeWidth={1.5} />
                <select
                  value={form.jobCardId}
                  onChange={(e) => handleJobCardSearch(e.target.value)}
                  className="w-full bg-transparent text-[14px] pl-3 py-2.5 focus:outline-none text-[#2A211D]"
                >
                  <option value="">Select an existing job card</option>
                  {orders.filter((order) => order.production_status !== 'Released').map((order) => (
                    <option key={order.order_id} value={order.job_card_id}>
                      {order.job_card_id} — {order.customer_name} ({peso(order.remaining_balance)} balance)
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-2 text-[11px] text-[#A3958B]">Choose the job card receiving this additional, partial, or final payment.</p>
            </div>

            {selectedOrder && (
              <div className="rounded-lg border border-[#E8DFD3] bg-[#FCFAF7] p-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-[#2A211D]">{selectedOrder.customer_name}</span>
                  <span className="text-sm text-[#766A62]">{selectedOrder.garment_type}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-dashed border-[#E2D7C7]">
                  <div>
                    <Label>Total</Label>
                    <div className="text-sm font-semibold text-[#2A211D]">{peso(selectedOrder.total_amount)}</div>
                  </div>
                  <div>
                    <Label>Paid</Label>
                    <div className="text-sm font-semibold text-[#4E7357]">{peso(selectedOrder.deposit_paid)}</div>
                  </div>
                  <div>
                    <Label>Balance</Label>
                    <div className="text-sm font-semibold text-[#9E5B4B]">{peso(selectedOrder.remaining_balance)}</div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-[#766A62]">
                  Status: {selectedOrder.payment_status} · Production: {selectedOrder.production_status}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1.5"><Label>Payment type</Label></label>
                <select
                  value={form.paymentType}
                  onChange={(e) => setForm(f => ({ ...f, paymentType: e.target.value as any }))}
                  className="w-full border-b border-[#E2D7C7] bg-transparent text-[14px] py-2.5 focus:outline-none focus:border-[#2A211D] text-[#2A211D]"
                >
                  <option value="Deposit">Deposit</option>
                  <option value="Final Payment">Final Payment</option>
                  <option value="Partial">Partial</option>
                </select>
              </div>
              <div>
                <label className="block mb-1.5"><Label>Payment method</Label></label>
                <select
                  value={form.paymentMethod}
                  onChange={(e) => setForm(f => ({ ...f, paymentMethod: e.target.value as any }))}
                  className="w-full border-b border-[#E2D7C7] bg-transparent text-[14px] py-2.5 focus:outline-none focus:border-[#2A211D] text-[#2A211D]"
                >
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
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.amount}
                  onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0"
                  className="w-full bg-transparent placeholder-[#C2B5A8] text-[14px] pl-3 py-2.5 focus:outline-none text-[#2A211D]"
                />
              </div>
              {selectedOrder && selectedOrder.remaining_balance > 0 && (
                <p className="text-[11px] text-[#A3958B] mt-1">
                  Remaining balance: {peso(selectedOrder.remaining_balance)}
                </p>
              )}
            </div>

            <div>
              <label className="block mb-1.5"><Label>Notes (optional)</Label></label>
              <input
                value={form.notes}
                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. Cash payment"
                className="w-full border-b border-[#E2D7C7] bg-transparent placeholder-[#C2B5A8] text-[14px] py-2.5 focus:outline-none focus:border-[#2A211D] text-[#2A211D]"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="flex-1 px-4 py-3 rounded-lg border border-[#E2D7C7] text-[#766A62] text-[11px] font-semibold uppercase hover:bg-[#F2ECE1] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-3 rounded-lg bg-[#2A211D] text-[#FAF7F2] text-[11px] font-semibold uppercase hover:bg-[#3D312B] shadow-md disabled:opacity-50"
              >
                {saving ? 'Recording...' : 'Record Payment'}
              </button>
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
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
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

  // ONE ROW PER JOB ORDER — multiple deposits/partials for the same job card
  // collapse into a single row with its running paid/balance totals.
  const orderRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders
      .map((o) => {
        const paid = Number(o.deposit_paid);
        const balance = Number(o.remaining_balance);
        const status = balance <= 0 ? 'Fully Paid' : paid > 0 ? 'Partial' : 'No Payment';
        return { order: o, paid, balance, status };
      })
      // A fully paid order (zero remaining balance) has nothing left to collect,
      // so it is hidden from the desk. The user asked: don't show a job card if
      // its status is Fully Paid or its balance is zero.
      .filter((row) => row.status !== 'Fully Paid' && row.balance > 0)
      .filter((row) =>
        !q ||
        row.order.job_card_id.toLowerCase().includes(q) ||
        row.order.customer_name.toLowerCase().includes(q) ||
        row.order.garment_type.toLowerCase().includes(q)
      );
  }, [orders, query]);

  const collected = payments.reduce((total, p) => total + p.amount, 0);

  const handleRecordPayment = async (data: any) => {
    const newPayment = await frontDeskApi.recordPayment(data);
    setPayments(prev => [newPayment, ...prev]);
    setNotice(`Payment of ${peso(newPayment.amount)} recorded for ${newPayment.job_card_id}.`);
    setTimeout(() => setNotice(''), 4000);
    await loadData(); // Refresh orders to update balances
  };

  // Quick-pay straight from a receipt/order: record the payment, refresh.
  const handleQuickPay = async (data: any) => {
    const newPayment = await frontDeskApi.recordPayment(data);
    setSelected(null);
    setSelectedOrder(null);
    setNotice(`Payment of ${peso(newPayment.amount)} recorded for ${newPayment.job_card_id}.`);
    setTimeout(() => setNotice(''), 4000);
    await loadData();
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
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search job card, customer, or garment" className="w-full rounded-lg border border-[#E2D7C7] bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#A46B48]" />
          </div>
          <span className="text-xs text-[#8C7E74]">{orderRows.length} order{orderRows.length === 1 ? '' : 's'}</span>
        </div>

        <div className="hidden grid-cols-[0.85fr_1fr_1.05fr_0.75fr_0.85fr_0.9fr_24px] gap-4 border-b border-[#E8DFD3] bg-[#FCFAF7] px-6 py-3 md:grid">
          {['Job card', 'Customer', 'Garment', 'Paid', 'Balance', 'Status', ''].map((label) => <Label key={label}>{label}</Label>)}
        </div>

        {orderRows.map(({ order, paid, balance, status }) => (
          <button key={order.order_id} onClick={() => setSelectedOrder(order)} className="grid w-full grid-cols-1 gap-2 border-b border-[#F0EAE2] px-6 py-4 text-left hover:bg-[#FCFAF7] md:grid-cols-[0.85fr_1fr_1.05fr_0.75fr_0.85fr_0.9fr_24px] md:items-center md:gap-4">
            <span className="text-[12px] text-[#8C6F3E]" style={{ fontFamily: "'Space Mono', monospace" }}>{order.job_card_id}</span>
            <span className="font-medium text-[#2A211D]">{order.customer_name}</span>
            <span className="text-sm text-[#5E5048]">{order.garment_type}</span>
            <span className="text-sm font-medium text-[#4E7357]">{peso(paid)}</span>
            <span className={`text-sm font-medium ${balance > 0 ? 'text-[#9E5B4B]' : 'text-[#4E7357]'}`}>{peso(balance)}</span>
            <Badge status={status} />
            <ChevronRight className="hidden h-4 w-4 text-[#A46B48] md:block" />
          </button>
        ))}
        {!orderRows.length && <p className="p-12 text-center text-sm text-[#766A62]">No orders match your search.</p>}
      </section>

      {selected && <PaymentDetails payment={selected} orders={orders} onClose={() => setSelected(null)} onPay={handleQuickPay} />}
      {selectedOrder && (
        <OrderDetails
          order={selectedOrder}
          payments={payments}
          onClose={() => setSelectedOrder(null)}
          onPay={handleQuickPay}
          onViewReceipt={(p) => setSelected(p)}
        />
      )}
      {recordOpen && <RecordPaymentModal onClose={() => setRecordOpen(false)} onRecord={handleRecordPayment} orders={orders.filter(o => Number(o.remaining_balance) > 0)} />}
    </div>
  );
}

function Metric({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'warn' }) {
  const toneClass = tone === 'warn' ? 'text-[#9E5B4B]' : 'text-[#2A211D]';
  return <div className="dash-card rounded-xl p-5"><div className={`text-2xl ${toneClass}`} style={{ fontFamily: "'DM Serif Display', serif" }}>{value}</div><Label>{label}</Label></div>;
}

export default FrontDeskPaymentsView;