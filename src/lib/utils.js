import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import { formatMoney } from "./currency";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/** @deprecated use useCurrency().formatCurrency instead */
export function formatCurrency(value, currency = "RON") {
  return formatMoney(value, currency);
}

export function formatDate(value) {
  const d = new Date(value);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}
