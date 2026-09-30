// Pages_Frontdesk/DraftOrderCartPanel.tsx
//
// THE DRAFT ORDER CART PANEL — the Front Desk's review of everything waiting to
// be checked out for the customer standing at the counter.
//
// It shows each garment as its OWN future job card: its own price, its own
// deposit requirement, its own tailor, its own deadline and its own share of
// the single cash tender. Nothing here has been written to the database — the
// cart becomes records only when the Front Desk commits it from the checkout
// review (POST /api/orders/checkout, one transaction).
import { useMemo } from 'react';
import { AlertCircle, ArrowRight, Layers, Pencil, ShoppingBag, Trash2, UserRound } from 'lucide-react';
import { OrderGarmentImage } from '../components/OrderGarmentImage';
import { formatPHP, formatPHPExact } from '../utils/currency';
import { useDraftOrderCart, type DraftCartItem } from './DraftOrderCartContext';

const CARD = 'rounded-xl border border-[#ECE2D3] bg-white shadow-[0_1px_1px_rgba(42,33,29,0.03)]';
const INPUT = 'rounded-lg border border-[#E2D7C7] bg-white px-3 py-2 text-[13px] text-[#2A211D] outline-none transition-colors placeholder-[#C2B5A8] focus:border-[#A46B48]';

function round(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

/** The date a job card is promised for, in the counter's own words. */
function dueLabel(value: string): string {
  if (!value) return 'No deadline';
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
}

export function DraftOrderCartPanel({
  onClose,
  onEditItem,
  onAddAnother,
  onProceedToCheckout,
  tailors = [],
}: {
  onClose: () => void;
  /** Reopen the intake form with this garment loaded so it can be corrected. */
  onEditItem: (item: DraftCartItem) => void;
  /** Start another garment for the SAME customer. */
  onAddAnother: () => void;
  /** Open the checkout review — the only place the cart is written. */
  onProceedToCheckout: () => void;
  tailors?: { id: number; full_name: string }[];
}) {
  const cart = useDraftOrderCart();
  const { items, totals } = cart;

  // A garment below its deposit cannot enter production, so the checkout button
  // stays closed until every line is funded (the server re-checks this too).
  const underFunded = useMemo(() => items.filter((item) => item.amount + 0.005 < item.depositRequired), [items]);
  // "Apply to every garment" shows the tailor already shared by every line (or
  // nothing when the garments are assigned individually).
  const sharedTailorId = useMemo(() => {
    if (!items.length) return '';
    const first = items[0].assignedTailorId || '';
    return items.every((item) => (item.assignedTailorId || '') === first) ? first : '';
  }, [items]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-[#1F1916]/45 backdrop-blur-sm" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Draft order cart"
        className="relative flex h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl border border-[#E8DFD3] bg-[#FAF7F2] shadow-2xl sm:h-auto sm:max-h-[92vh] sm:rounded-2xl"
      >
        <header className="flex-shrink-0 border-b border-[#ECE2D3] bg-[#FFFCF8] px-5 pb-4 pt-5 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#8C7E74]" style={{ fontFamily: "'Space Mono', monospace" }}>
                One cash payment · every garment gets its own job card
              </span>
              <h2 className="mt-1 flex items-center gap-2 text-2xl leading-tight text-[#2A211D]" style={{ fontFamily: "'DM Serif Display', serif" }}>
                <ShoppingBag className="h-5 w-5 text-[#8C6F3E]" strokeWidth={1.7} /> Draft Order Cart
              </h2>
              <p className="mt-1 text-[12px] text-[#766A62]">
                {items.length
                  ? <>Customer <strong className="text-[#2A211D]">{cart.customerName || 'Walk-in customer'}</strong> · {totals.lines} garment{totals.lines === 1 ? '' : 's'} · {totals.pieces} piece{totals.pieces === 1 ? '' : 's'}</>
                  : 'Nothing in the cart yet — add the first garment from the intake form.'}
              </p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    // A cart belongs to ONE customer: clearing it is how the
                    // counter deliberately starts over for a new customer.
                    if (window.confirm(`Clear the draft cart and start over for a different customer? ${items.length} garment(s) will be removed. No job card has been created yet.`)) {
                      cart.clearCart();
                      onClose();
                    }
                  }}
                  className="rounded-lg border border-[#ECD3CB] bg-white px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9A3B2A] transition-colors hover:bg-[#FBEDE9]"
                >
                  Clear cart
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-[#E2D7C7] bg-white px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#766A62] transition-colors hover:bg-[#F2ECE1]"
              >
                Close
              </button>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8">
          {!items.length && (
            <div className={`${CARD} p-10 text-center`}>
              <ShoppingBag className="mx-auto h-8 w-8 text-[#C2B5A8]" strokeWidth={1.4} />
              <p className="mt-3 text-[13.5px] font-semibold text-[#2A211D]">The draft cart is empty</p>
              <p className="mx-auto mt-1 max-w-md text-[12px] leading-relaxed text-[#766A62]">
                Add each garment the customer is ordering. Catalog and bespoke pieces can be mixed — every one is
                priced independently and becomes its own job card when you check out.
              </p>
              <button
                type="button"
                onClick={onAddAnother}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#2A211D] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#FAF7F2]"
              >
                Add the first garment
              </button>
            </div>
          )}

          {items.map((item, index) => {
            const shortfall = round(item.depositRequired - item.amount);
            const overAllocated = item.amount > item.finalPrice + 0.005;
            return (
              <article key={item.lineId} className={`${CARD} mb-3 overflow-hidden`}>
                <div className="flex gap-4 p-4">
                  <div className="h-24 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-[#ECE2D3] bg-[#F7F2EA]">
                    <OrderGarmentImage
                      order={{
                        garment: item.garmentType,
                        order_type: item.orderType,
                        catalog_item_id: item.catalogItemId,
                        catalog_image: item.image || null,
                        reference_image: item.referenceImages.length ? JSON.stringify(item.referenceImages) : null,
                      }}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-[#8C7E74]" style={{ fontFamily: "'Space Mono', monospace" }}>
                          Garment {index + 1} · {item.orderType === 'catalog' ? 'Catalog order' : 'Bespoke order'}
                        </p>
                        <h3 className="mt-0.5 truncate text-[15px] font-semibold text-[#2A211D]">
                          {item.garmentType}{item.styleDesign ? ` · ${item.styleDesign}` : ''}
                        </h3>
                        <p className="mt-1 text-[11.5px] leading-relaxed text-[#766A62]">
                          {item.catalogName || item.orderCategory || '—'} · {item.fabric || 'Fabric to be confirmed'}
                          {item.quantity > 1 ? ` · ${item.quantity} pcs` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEditItem(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#E2D7C7] bg-white px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5E5048] hover:bg-[#F2ECE1]"
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => cart.removeItem(item.lineId)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#ECD3CB] bg-white px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9A3B2A] hover:bg-[#FBEDE9]"
                        >
                          <Trash2 className="h-3 w-3" /> Remove
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[11.5px] sm:grid-cols-4">
                      <div>
                        <span className="block text-[10px] uppercase tracking-[0.14em] text-[#A3958B]">Price</span>
                        <span className="text-[#2A211D]" style={{ fontFamily: "'Space Mono', monospace" }}>{formatPHPExact(item.finalPrice)}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase tracking-[0.14em] text-[#A3958B]">Deposit required</span>
                        <span className="text-[#4E7357]" style={{ fontFamily: "'Space Mono', monospace" }}>{formatPHPExact(item.depositRequired)}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase tracking-[0.14em] text-[#A3958B]">Deadline</span>
                        <span className="text-[#2A211D]">{dueLabel(item.targetCompletionDate)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <UserRound className="h-3 w-3 text-[#A3958B]" />
                        <span className="truncate text-[#2A211D]">{item.assignedTailorName || 'Auto-assign at checkout'}</span>
                      </div>
                    </div>
                  </div>
                </div>


                <div className="flex flex-wrap items-end justify-between gap-3 border-t border-[#F1E9DD] bg-[#FCFAF7] px-4 py-3">
                  <label className="block">
                    <span className="block text-[10px] uppercase tracking-[0.14em] text-[#8C7E74]">Applied to this job card</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.amount}
                      onChange={(event) => cart.setAllocation(item.lineId, Number(event.target.value) || 0)}
                      className={`${INPUT} mt-1 w-40`}
                    />
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => cart.setAllocation(item.lineId, item.depositRequired)} className="rounded-lg border border-[#E2D7C7] bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5E5048] hover:bg-[#F2ECE1]">Use deposit</button>
                    <button type="button" onClick={() => cart.setAllocation(item.lineId, item.finalPrice)} className="rounded-lg border border-[#E2D7C7] bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5E5048] hover:bg-[#F2ECE1]">Pay in full</button>
                    <span className="text-[11.5px] text-[#766A62]">
                      Balance after: <strong className="text-[#2A211D]" style={{ fontFamily: "'Space Mono', monospace" }}>{formatPHP(round(item.finalPrice - item.amount))}</strong>
                    </span>
                  </div>
                </div>

                {shortfall > 0 && (
                  <p className="flex items-center gap-1.5 border-t border-[#F3DFD2] bg-[#FDF6F0] px-4 py-2 text-[11.5px] text-[#9A5B2A]">
                    <AlertCircle className="h-3.5 w-3.5" /> Add {formatPHPExact(shortfall)} to reach this garment&apos;s deposit before it can enter production.
                  </p>
                )}
                {overAllocated && (
                  <p className="flex items-center gap-1.5 border-t border-[#F3DFD2] bg-[#FDF6F0] px-4 py-2 text-[11.5px] text-[#9A3B2A]">
                    <AlertCircle className="h-3.5 w-3.5" /> The allocation is more than this job card&apos;s total.
                  </p>
                )}
              </article>
            );
          })}

          {items.length > 1 && (
            <div className={`${CARD} flex flex-wrap items-center gap-3 p-4`}>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8C7E74]">
                <Layers className="h-3.5 w-3.5" /> Apply to every garment
              </span>
              <button type="button" onClick={() => cart.setAllAllocations('deposit')} className="rounded-lg border border-[#E2D7C7] bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5E5048] hover:bg-[#F2ECE1]">Deposits only</button>
              <button type="button" onClick={() => cart.setAllAllocations('full')} className="rounded-lg border border-[#E2D7C7] bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5E5048] hover:bg-[#F2ECE1]">Pay everything in full</button>
              {tailors.length > 0 && (
                <label className="flex items-center gap-2 text-[11.5px] text-[#766A62]">
                  Same tailor for all
                  <select
                    value={sharedTailorId}
                    onChange={(event) => {
                      const chosen = tailors.find((tailor) => String(tailor.id) === event.target.value);
                      if (chosen) cart.applyTailorToAll(String(chosen.id), chosen.full_name);
                    }}
                    className={`${INPUT} w-auto`}
                  >
                    <option value="">Keep individual tailors</option>
                    {tailors.map((tailor) => <option key={tailor.id} value={String(tailor.id)}>{tailor.full_name}</option>)}
                  </select>
                </label>
              )}
            </div>
          )}
        </div>


        <footer className="flex-shrink-0 border-t border-[#E8DFD3] bg-[#FFFCF8] px-5 py-4 sm:px-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[11.5px] text-[#766A62]">
              <span>Total <strong className="text-[#2A211D]" style={{ fontFamily: "'Space Mono', monospace" }}>{formatPHP(totals.total)}</strong></span>
              <span>Deposits due <strong className="text-[#4E7357]" style={{ fontFamily: "'Space Mono', monospace" }}>{formatPHP(totals.depositDue)}</strong></span>
              <span>Applied so far <strong className="text-[#8C6F3E]" style={{ fontFamily: "'Space Mono', monospace" }}>{formatPHP(totals.allocated)}</strong></span>
              <span>Balance after checkout <strong className="text-[#9E5B4B]" style={{ fontFamily: "'Space Mono', monospace" }}>{formatPHP(totals.balanceAfterCheckout)}</strong></span>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={onAddAnother}
                disabled={!items.length}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#E2D7C7] bg-white px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5E5048] transition-colors hover:bg-[#F2ECE1] disabled:opacity-40"
              >
                Add another garment
              </button>
              <button
                type="button"
                onClick={onProceedToCheckout}
                disabled={!items.length || Boolean(underFunded.length)}
                title={underFunded.length ? 'Every garment needs at least its deposit before checkout.' : undefined}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#2A211D] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#FAF7F2] shadow-md transition-colors hover:bg-[#3D312B] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Proceed to checkout <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default DraftOrderCartPanel;

