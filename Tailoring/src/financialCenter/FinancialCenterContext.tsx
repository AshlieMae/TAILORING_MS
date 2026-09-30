// financialCenter/FinancialCenterContext.tsx
//
// Navigation into the Customer Financial Center from anywhere in the workspace.
//
// The Financial Center is the primary financial profile page for every customer,
// so any customer reference on screen - a name, a code, an avatar, a row in the
// order ledger, a receipt, a dashboard widget - opens it through this one hook.
// The dashboards own the selection state and render the page, so returning from
// an order detail (or closing the page) always lands back on the customer that
// was open.
import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

export interface FinancialCenterNav {
  /** Opens the Financial Center. Passing no id opens the customer selector. */
  open: (customerId?: string) => void;
}

const FinancialCenterContext = createContext<FinancialCenterNav>({ open: () => {} });

export function FinancialCenterProvider({ open, children }: { open: (customerId?: string) => void; children: ReactNode }) {
  return <FinancialCenterContext.Provider value={{ open }}>{children}</FinancialCenterContext.Provider>;
}

export function useFinancialCenter(): FinancialCenterNav {
  return useContext(FinancialCenterContext);
}

/**
 * Any customer reference in the UI. Renders a real button so it is keyboard
 * reachable, and stops the click from bubbling into a row-level action.
 */
export function CustomerLink({
  customerId, children, className = '', title = 'Open the Customer Financial Center',
}: {
  customerId?: string | number | null;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  const { open } = useFinancialCenter();
  if (customerId == null || customerId === '') return <span className={className}>{children}</span>;
  return (
    <button
      type="button"
      title={title}
      onClick={(event) => { event.stopPropagation(); open(String(customerId)); }}
      className={`text-left underline-offset-2 hover:underline ${className}`}
    >
      {children}
    </button>
  );
}
