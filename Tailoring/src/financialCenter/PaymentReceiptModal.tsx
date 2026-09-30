// financialCenter/PaymentReceiptModal.tsx
//
// Receipt viewer + reprint. It always loads the EXISTING payment receipt record
// (GET /api/payments/:id/receipt) - a reprint never creates a new receipt
// number - and shows the cash figures, the balance snapshots, the staff member
// and the notes. Printing opens its own window, so the Financial Center stays
// exactly where it was.
import { useEffect, useState } from 'react';
import { Ban, Loader2, Printer, X } from 'lucide-react';
import frontDeskApi, { type PaymentReceiptData } from '../../services/frontDeskApi';
import { COLORS, shadowModal } from '../Pages_Admin/Theme';
import { formatPHPExact } from '../utils/currency';
import { cashFigure } from './cash';
import { printPaymentReceipt } from '../utils/printFinancials';

function Row({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'good' | 'warn' }) {
  const color = tone === 'good' ? COLORS.success : tone === 'warn' ? COLORS.warning : COLORS.ink;
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-dashed py-2 last:border-0" style={{ borderColor: COLORS.border }}>
      <span className="text-[11px]" style={{ color: COLORS.muted }}>{label}</span>
      <span className="mono text-[12.5px] font-medium" style={{ color }}>{value}</span>
    </div>
  );
}

export function PaymentReceiptModal({ paymentId, onClose }: { paymentId: string | number; onClose: () => void }) {
  const [receipt, setReceipt] = useState<PaymentReceiptData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await frontDeskApi.generateReceipt(String(paymentId));
        if (!cancelled) setReceipt(data.receiptData);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load this receipt.');
      }
    })();
    return () => { cancelled = true; };
  }, [paymentId]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0" style={{ background: 'rgba(17,24,39,0.55)', backdropFilter: 'blur(2px)' }} />
      <section className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto border bg-white" style={{ borderColor: COLORS.border, borderRadius: 16, boxShadow: shadowModal }}>
        <header className="flex items-start justify-between gap-4 p-6 pb-3">
          <div>
            <span className="mono text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: COLORS.brassDeep }}>Payment receipt</span>
            <h2 className="mt-1 text-lg font-semibold" style={{ color: COLORS.ink }}>{receipt?.receiptNumber || 'Receipt'}</h2>
          </div>
          <button onClick={onClose} className="p-1.5" style={{ color: COLORS.muted, borderRadius: 8 }} aria-label="Close receipt">
            <X className="h-5 w-5" />
          </button>
        </header>


        <div className="px-6 pb-6">
          {error && <p className="border px-3 py-2 text-[12px]" style={{ borderColor: COLORS.dangerBorder, background: COLORS.dangerBg, color: COLORS.danger, borderRadius: 8 }}>{error}</p>}
          {!receipt && !error && (
            <div className="flex items-center gap-2 py-8 text-[12px]" style={{ color: COLORS.muted }}>
              <Loader2 className="h-4 w-4 animate-spin" /> Loading the receipt record…
            </div>
          )}

          {receipt && (
            <>
              {receipt.voidedAt && (
                <p className="mb-3 inline-flex items-center gap-1.5 border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ borderColor: COLORS.dangerBorder, background: COLORS.dangerBg, color: COLORS.danger, borderRadius: 6 }}>
                  <Ban className="h-3 w-3" /> Voided
                </p>
              )}
              <Row label="Customer" value={receipt.customer} />
              <Row label="Job card" value={receipt.jobCardId} />
              <Row label="Receipt number" value={receipt.receiptNumber} />
              <Row label="Payment type" value={receipt.paymentType} />
              <Row label="Payment method" value={receipt.paymentMethod || 'Cash'} />
              <Row label="Date & time" value={new Date(receipt.date).toLocaleString()} />
              <Row label="Staff user" value={receipt.staff || 'Front Desk'} />
              <Row label="Payment amount" value={formatPHPExact(receipt.amount)} />
              <Row label="Cash received" value={receipt.cashReceived == null ? '—' : cashFigure(receipt.cashReceived)} />
              <Row label="Change given" value={receipt.changeGiven == null ? '—' : cashFigure(receipt.changeGiven)} />
              <Row label="Previous balance" value={formatPHPExact(receipt.previousBalance)} />
              <Row label="Remaining balance" value={formatPHPExact(receipt.remainingBalance)} tone={receipt.remainingBalance > 0 ? 'warn' : 'good'} />
              {receipt.notes ? <Row label="Notes" value={receipt.notes} /> : null}
              {receipt.voidedAt ? <Row label="Void reason" value={receipt.voidReason || 'Not recorded'} /> : null}

              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button onClick={onClose} className="px-4 py-2.5 text-[12px] font-semibold" style={{ border: `1px solid ${COLORS.border}`, color: COLORS.inkSoft, borderRadius: 8, background: COLORS.surface }}>Close</button>
                <button
                  onClick={() => printPaymentReceipt(receipt)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-[12px] font-semibold text-white [&>svg]:h-4 [&>svg]:w-4"
                  style={{ background: COLORS.navy, borderRadius: 8 }}
                >
                  <Printer /> Reprint receipt
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default PaymentReceiptModal;
