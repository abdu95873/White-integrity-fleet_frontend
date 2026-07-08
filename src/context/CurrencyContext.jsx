import { createContext, useContext } from "react";
import { formatMoney } from "@/lib/currency";

const CurrencyContext = createContext(null);

/** All Excel uploads use Romanian Lei — currency is fixed to RON. */
const APP_CURRENCY = "RON";

export function CurrencyProvider({ children }) {
  const formatCurrency = (value) => formatMoney(value, APP_CURRENCY);

  return (
    <CurrencyContext.Provider
      value={{
        currency: APP_CURRENCY,
        formatCurrency,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
