export const CURRENCIES = {
  RON: { code: "RON", label: "RON (Lei)", symbol: "lei" },
};

/** Format as Lei with dot (.) decimal separator — e.g. 147.76 lei */
export function formatMoney(value, currency = "RON") {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0.00 lei";

  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const fixed = abs.toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return `${sign}${withThousands}.${decPart} lei`;
}
