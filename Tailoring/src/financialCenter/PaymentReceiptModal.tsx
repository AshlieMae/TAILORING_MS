// financialCenter/PaymentReceiptModal.tsx
//
// Receipt viewer + reprint. It always loads the EXISTING payment receipt record
// (GET /api/payments/:id/receipt) - a reprint never creates a new receipt
// number - and shows the cash figures, the balance snapshots, the staff member
// and the notes. Printing opens its own window, so the Financial Center stays
// exactly where it was.
import { useEffect, useState } from 'react';
import { Ban, Loader2, Printer, X, CheckCircle2, AlertCircle } from 'lucide-react';
import frontDeskApi, { type PaymentReceiptData } from '../../services/frontDeskApi';
import { COLORS, shadowModal } from '../Pages_Admin/Theme';
import { formatPHPExact } from '../utils/currency';
import { cashFigure } from './cash';
import { printPaymentReceipt } from '../utils/printFinancials';

function Row({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'good' | 'warn' }) {
  const color = tone === 'good' ? COLORS.success : tone === 'warn' ? COLORS.warning : COLORS.ink;
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-dashed py-2.5 last:border-0" style={{ borderColor: COLORS.border }}>
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
      <section className="relative max-h-[92vh] w-full max-w-[440px] overflow-y-auto border bg-white" style={{ borderColor: COLORS.border, borderRadius: 16, boxShadow: shadowModal }}>
        
        {/* RECEIPT HEADER */}
        <header className="flex items-start justify-between gap-4 p-6 pb-5" style={{ background: '#FDFBF7', borderBottom: `1px solid ${COLORS.border}` }}>
          <div>
            <span className="mono text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: COLORS.brassDeep }}>Payment receipt</span>
            <h2 className="mt-1 text-[20px] font-bold tracking-tight" style={{ color: COLORS.ink }}>{receipt?.receiptNumber || 'Receipt'}</h2>
            
            {receipt && (
              <div className="mt-3">
                {receipt.voidedAt ? (
                  <div className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em]" style={{ borderColor: COLORS.dangerBorder, background: COLORS.dangerBg, color: COLORS.danger }}>
                    <Ban className="h-3 w-3" /> Voided
                  </div>
                ) : receipt.remainingBalance === 0 ? (
                  <div className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em]" style={{ borderColor: COLORS.successBorder, background: COLORS.successBg, color: COLORS.success }}>
                    <CheckCircle2 className="h-3 w-3" /> Fully Paid
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em]" style={{ borderColor: COLORS.brassDeep, background: 'white', color: COLORS.brassDeep }}>
                    <AlertCircle className="h-3 w-3" /> Partial Payment
                  </div>
                )}
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 transition-colors hover:bg-gray-200" style={{ color: COLORS.muted, borderRadius: 8 }} aria-label="Close receipt">
            <X className="h-5 w-5" />
          </button>
        </header>


        <div className="px-6 py-6">
          {error && <p className="mb-4 border px-3 py-2 text-[12px]" style={{ borderColor: COLORS.dangerBorder, background: COLORS.dangerBg, color: COLORS.danger, borderRadius: 8 }}>{error}</p>}
          {!receipt && !error && (
            <div className="flex items-center gap-2 py-8 text-[12px]" style={{ color: COLORS.muted }}>
              <Loader2 className="h-4 w-4 animate-spin" /> Loading the receipt record…
            </div>
          )}

          {receipt && (
            <>
              {/* CUSTOMER & ORDER INFO */}
              <div className="mb-6">
                <Row label="Customer" value={receipt.customer} />
                <Row label="Job card" value={receipt.jobCardId} />
                <Row label="Receipt number" value={receipt.receiptNumber} />
                <Row label="Date & time" value={new Date(receipt.date).toLocaleString()} />
                <Row label="Staff user" value={receipt.staff || 'Front Desk'} />
              </div>

              {/* PAYMENT INFO */}
              <div className="mb-6">
                <Row label="Payment type" value={receipt.paymentType} />
                <Row label="Payment method" value={receipt.paymentMethod || 'Cash'} />
                {receipt.cashReceived != null && (
                  <Row label="Cash received" value={cashFigure(receipt.cashReceived)} />
                )}
                {receipt.changeGiven != null && (
                  <Row label="Change given" value={cashFigure(receipt.changeGiven)} />
                )}
              </div>

              {/* HIGHLIGHTED FINANCIAL SUMMARY */}
              <div className="mb-6 rounded-xl border p-4 shadow-sm" style={{ borderColor: COLORS.border, background: '#FAFAFA' }}>
                <div className="flex items-baseline justify-between gap-4 py-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: COLORS.muted }}>Previous balance</span>
                  <span className="mono text-[13px] font-medium" style={{ color: COLORS.ink }}>{formatPHPExact(receipt.previousBalance)}</span>
                </div>
                <div className="flex items-baseline justify-between gap-4 py-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: COLORS.navy }}>Payment amount</span>
                  <span className="mono text-[14px] font-bold" style={{ color: COLORS.navy }}>{'- ' + formatPHPExact(receipt.amount)}</span>
                </div>
                <div className="my-2 border-t border-dashed" style={{ borderColor: COLORS.border }} />
                <div className="flex items-baseline justify-between gap-4 py-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: COLORS.ink }}>Remaining balance</span>
                  <span className="mono text-[15px] font-bold" style={{ color: receipt.remainingBalance > 0 ? COLORS.warning : COLORS.success }}>
                    {formatPHPExact(receipt.remainingBalance)}
                  </span>
                </div>
              </div>

              {/* NOTES / VOID REASON */}
              {(receipt.notes || receipt.voidedAt) && (
                <div className="mb-6">
                  {receipt.notes && <Row label="Notes" value={receipt.notes} />}
                  {receipt.voidedAt && <Row label="Void reason" value={receipt.voidReason || 'Not recorded'} />}
                </div>
              )}

              {/* FOOTER MESSAGE */}
              <div className="mb-6 mt-2 text-center">
                <p className="text-[13px] font-medium" style={{ color: COLORS.ink }}>Thank you for your business!</p>
                {receipt.remainingBalance > 0 && !receipt.voidedAt && (
                  <p className="mt-1.5 text-[11px]" style={{ color: COLORS.muted }}>
                    Please note you still have a remaining balance of <span className="font-semibold" style={{ color: COLORS.warning }}>{formatPHPExact(receipt.remainingBalance)}</span>.
                  </p>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button onClick={onClose} className="px-5 py-2.5 text-[12px] font-semibold transition-colors hover:bg-gray-50" style={{ border: `1px solid ${COLORS.border}`, color: COLORS.inkSoft, borderRadius: 8, background: 'white' }}>
                  Close
                </button>
                <button
                  onClick={() => printPaymentReceipt(receipt)}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-[12px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90 [&>svg]:h-4 [&>svg]:w-4"
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

