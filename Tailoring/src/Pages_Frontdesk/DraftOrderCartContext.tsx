// Pages_Frontdesk/DraftOrderCartContext.tsx
//
// THE DRAFT ORDER CART — Front Desk only, customer intake and checkout only.
//
// The cart is COUNTER STATE, not a database table. A garment sits here while
// the walk-in customer is still at the counter; nothing is written until the
// Front Desk commits the cart through POST /api/orders/checkout, which creates
// one independent order / job card / payment record per garment inside a single
// server transaction. There is no "cart order" and no merged job card.
//
// Rules enforced here (and re-enforced on the server):
//   * ONE customer per cart — a cart belongs to the person standing at the counter
//   * every garment keeps its OWN price, deposit, tailor, deadline and allocation
//   * the allocation per garment may never be less than its deposit (the
//     production handoff gate) nor more than its job card total
//   * the cash handed over is ONE figure for the whole cart
//
// The cart survives a page reload through sessionStorage, and is cleared the
// moment the checkout succeeds.
import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import type {
  CheckoutCartItemInput, CheckoutCartRequest, CheckoutMeasurement, OrderCustomizations, QuoteBreakdown,
} from '../../services/frontDeskApi';
import type { PriorityLevel } from './garmentCatalogData';

const STORAGE_KEY = 'frontdesk:draftOrderCart:v1';

/** One garment waiting to be checked out. */
export interface DraftCartItem {
  /** Client-side line id (the cart is never persisted to the database). */
  lineId: string;
  customerId: string;
  customerName: string;
  orderType: 'catalog' | 'bespoke';
  catalogItemId: number | null;
  catalogName: string;
  garmentType: string;
  orderCategory: string;
  styleDesign: string;
  fabric: string;
  fabricQuantity: string;
  quantity: number;
  /** ENUM('Low','Normal','High') on the job card — 'High' for a rush intake. */
  priority: PriorityLevel;
  customizations: OrderCustomizations & { rush_order?: boolean };
  specialInstructions: string;
  targetCompletionDate: string;
  assignedTailorId: string;
  assignedTailorName: string;
  measurements: CheckoutMeasurement[];
  referenceImages: string[];
  color: string;
  customizationNotes: string;
  additionalCharges: number;
  discount: number;
  /** Thumbnail for the cart row (catalog image or the uploaded reference). */
  image: string;
  /** Frozen quote for this garment (the server re-quotes and rejects a stale cart). */
  unitPrice: number;
  finalPrice: number;
  depositRequired: number;
  /** How much of the single cash tender goes onto THIS job card. */
  amount: number;
  breakdown: QuoteBreakdown | null;
  addedAt: string;
}

export interface DraftOrderCartTotals {
  /** Number of garment lines in the cart. */
  lines: number;
  /** Total pieces (quantity summed across the lines). */
  pieces: number;
  total: number;
  depositDue: number;
  allocated: number;
  balanceAfterCheckout: number;
}

interface DraftOrderCartValue {
  items: DraftCartItem[];
  customerId: string;
  customerName: string;
  cashReceived: string;
  referenceNumber: string;
  notes: string;
  totals: DraftOrderCartTotals;
  addItem: (item: DraftCartItem) => { ok: boolean; message: string };
  updateItem: (lineId: string, patch: Partial<DraftCartItem>) => void;
  removeItem: (lineId: string) => void;
  clearCart: (reason?: string) => void;
  setCashReceived: (value: string) => void;
  setReferenceNumber: (value: string) => void;
  setNotes: (value: string) => void;
  setAllocation: (lineId: string, amount: number) => void;
  setAllAllocations: (mode: 'deposit' | 'full') => void;
  applyTailorToAll: (tailorId: string, tailorName: string) => void;
  buildRequest: () => CheckoutCartRequest;
}

const DraftOrderCartContext = createContext<DraftOrderCartValue | null>(null);

const round2 = (value: number) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

interface PersistedCart {
  items: DraftCartItem[];
  customerId: string;
  customerName: string;
  cashReceived: string;
  referenceNumber: string;
  notes: string;
}

function loadPersisted(): PersistedCart {
  const empty: PersistedCart = { items: [], customerId: '', customerName: '', cashReceived: '', referenceNumber: '', notes: '' };
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<PersistedCart>;
    if (!Array.isArray(parsed.items)) return empty;
    return {
      items: parsed.items as DraftCartItem[],
      customerId: String(parsed.customerId || ''),
      customerName: String(parsed.customerName || ''),
      cashReceived: String(parsed.cashReceived || ''),
      referenceNumber: String(parsed.referenceNumber || ''),
      notes: String(parsed.notes || ''),
    };
  } catch {
    // A corrupt cart must never break the Front Desk — start clean.
    return empty;
  }
}

let lineCounter = 0;
/** A stable client-side line id (not a document number — those are server-side). */
export function newCartLineId(): string {
  lineCounter += 1;
  return `cart-${Date.now().toString(36)}-${lineCounter.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function DraftOrderCartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedCart>(() => loadPersisted());

  // The cart survives a reload but never leaves the browser: no table, no
  // server session. sessionStorage is cleared with the tab.
  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* quota / private mode — the cart still works in memory */ }
  }, [state]);

  const totals = useMemo<DraftOrderCartTotals>(() => {
    const total = state.items.reduce((sum, item) => sum + Number(item.finalPrice || 0), 0);
    const depositDue = state.items.reduce((sum, item) => sum + Number(item.depositRequired || 0), 0);
    const allocated = state.items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return {
      lines: state.items.length,
      pieces: state.items.reduce((sum, item) => sum + Math.max(1, Number(item.quantity) || 1), 0),
      total: round2(total),
      depositDue: round2(depositDue),
      allocated: round2(allocated),
      balanceAfterCheckout: round2(Math.max(0, total - allocated)),
    };
  }, [state.items]);

  const clearCart = useCallback(() => {
    setState({ items: [], customerId: '', customerName: '', cashReceived: '', referenceNumber: '', notes: '' });
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  const addItem = useCallback<DraftOrderCartValue['addItem']>((item) => {
    // ONE CUSTOMER PER CART — a cart belongs to the person at the counter. The
    // guard is evaluated against the CURRENT cart (not inside the updater, which
    // React may run later), so the counter is told immediately.
    if (state.items.length && state.customerId && state.customerId !== item.customerId) {
      return {
        ok: false,
        message: `This cart belongs to ${state.customerName || 'another customer'}. Check the cart out or clear it before starting a cart for ${item.customerName || 'a different customer'}.`,
      };
    }
    setState((current) => ({
      ...current,
      customerId: item.customerId,
      customerName: item.customerName,
      items: [...current.items, item],
    }));
    return { ok: true, message: `${item.garmentType} added to the draft cart.` };
  }, [state.items.length, state.customerId, state.customerName]);

  const updateItem = useCallback<DraftOrderCartValue['updateItem']>((lineId, patch) => {
    setState((current) => ({
      ...current,
      items: current.items.map((item) => (item.lineId === lineId ? { ...item, ...patch } : item)),
    }));
  }, []);

  const removeItem = useCallback<DraftOrderCartValue['removeItem']>((lineId) => {
    setState((current) => {
      const items = current.items.filter((item) => item.lineId !== lineId);
      // An empty cart forgets its tender; the next garment starts clean.
      return items.length ? { ...current, items } : { ...current, items, cashReceived: '', referenceNumber: '', notes: '' };
    });
  }, []);

  const setCashReceived = useCallback((value: string) => setState((current) => ({ ...current, cashReceived: value })), []);
  const setReferenceNumber = useCallback((value: string) => setState((current) => ({ ...current, referenceNumber: value })), []);
  const setNotes = useCallback((value: string) => setState((current) => ({ ...current, notes: value })), []);

  const setAllocation = useCallback<DraftOrderCartValue['setAllocation']>((lineId, amount) => {
    setState((current) => ({
      ...current,
      items: current.items.map((item) => (item.lineId === lineId ? { ...item, amount: round2(Math.max(0, amount)) } : item)),
    }));
  }, []);

  const setAllAllocations = useCallback<DraftOrderCartValue['setAllAllocations']>((mode) => {
    setState((current) => ({
      ...current,
      items: current.items.map((item) => ({
        ...item,
        amount: mode === 'full' ? round2(item.finalPrice) : round2(item.depositRequired),
      })),
    }));
  }, []);

  const applyTailorToAll = useCallback<DraftOrderCartValue['applyTailorToAll']>((tailorId, tailorName) => {
    setState((current) => ({
      ...current,
      items: current.items.map((item) => ({ ...item, assignedTailorId: tailorId, assignedTailorName: tailorName })),
    }));
  }, []);


  /**
   * The exact payload POST /api/orders/checkout expects — one entry per garment,
   * each with its own allocation, tailor, deadline and measurement snapshot.
   */
  const buildRequest = useCallback<DraftOrderCartValue['buildRequest']>(() => ({
    customerId: state.customerId,
    cashReceived: round2(Number(state.cashReceived) || 0),
    paymentMethod: 'Cash',
    referenceNumber: state.referenceNumber.trim() || undefined,
    notes: state.notes.trim() || undefined,
    items: state.items.map<CheckoutCartItemInput>((item) => ({
      garmentType: item.garmentType,
      orderType: item.orderType,
      catalogItemId: item.catalogItemId,
      uniformCategory: item.orderCategory,
      styleDesign: item.styleDesign,
      fabric: item.fabric,
      fabricQuantity: Number(item.fabricQuantity) || null,
      quantity: item.quantity,
      priority: item.priority,
      additionalCharges: item.additionalCharges,
      discount: item.discount,
      customizations: item.customizations,
      specialInstructions: item.specialInstructions,
      targetCompletionDate: item.targetCompletionDate,
      assignedTailorId: item.assignedTailorId || undefined,
      referenceImage: item.referenceImages.length ? JSON.stringify(item.referenceImages) : undefined,
      measurements: item.measurements,
      priceSnapshot: { final_price: round2(item.finalPrice), deposit_required: round2(item.depositRequired) },
      amount: round2(item.amount),
    })),
  }), [state]);

  const value = useMemo<DraftOrderCartValue>(() => ({
    ...state,
    totals,
    addItem, updateItem, removeItem, clearCart,
    setCashReceived, setReferenceNumber, setNotes,
    setAllocation, setAllAllocations, applyTailorToAll, buildRequest,
  }), [
    state, totals, addItem, updateItem, removeItem, clearCart,
    setCashReceived, setReferenceNumber, setNotes, setAllocation, setAllAllocations, applyTailorToAll, buildRequest,
  ]);

  return <DraftOrderCartContext.Provider value={value}>{children}</DraftOrderCartContext.Provider>;
}

/** Read the draft cart. Throws when used outside the Front Desk provider. */
export function useDraftOrderCart(): DraftOrderCartValue {
  const context = useContext(DraftOrderCartContext);
  if (!context) throw new Error('useDraftOrderCart must be used inside <DraftOrderCartProvider> (Front Desk only).');
  return context;
}

export default DraftOrderCartContext;

