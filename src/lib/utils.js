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
  if (value == null || value === "") return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [y, m, d] = value.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  // Period dates are stored as UTC midnight — use UTC parts to avoid off-by-one.
  const isUtcMidnight =
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0;
  if (isUtcMidnight) {
    return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
  }
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}
