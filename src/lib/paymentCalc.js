const GLOVO_COLUMNS = {
  totalTransfer: "Total Venituri de transferat",
};

const BOLT_COLUMNS = {
  adjustedEarnings: "Adjusted Earnings (Without VAT)",
  tips: "Courier Tips (With VAT)",
  overdueDebt: "Overdue courier cash debt",
};

function parseNumber(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;
  const cleaned = String(value).replace(/[^\d.,-]/g, "").replace(",", ".");
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function paymentBreakdown(periodCalculated, commissionRate, taxAmount) {
  const commissionAmount = periodCalculated * (commissionRate / 100);
  const tax = Math.max(0, Number(taxAmount) || 0);
  return {
    commissionAmount: Math.round(commissionAmount * 100) / 100,
    taxAmount: Math.round(tax * 100) / 100,
  };
}

function calculateGlovoPayment(row, commissionRate, taxAmount) {
  const totalTransfer = parseNumber(row[GLOVO_COLUMNS.totalTransfer]);
  const { commissionAmount, taxAmount: tax } = paymentBreakdown(totalTransfer, commissionRate, taxAmount);
  const grandPayment = totalTransfer - commissionAmount - tax;
  return { periodCalculated: totalTransfer, commissionAmount, taxAmount: tax, grandPayment };
}

function calculateBoltPayment(row, commissionRate, taxAmount) {
  const earnings = parseNumber(row[BOLT_COLUMNS.adjustedEarnings]);
  const tips = parseNumber(row[BOLT_COLUMNS.tips]);
  const overdueDebt = parseNumber(row[BOLT_COLUMNS.overdueDebt]);
  const subtotal = earnings + tips;
  const { commissionAmount, taxAmount: tax } = paymentBreakdown(subtotal, commissionRate, taxAmount);
  const afterTax = subtotal - commissionAmount - tax;
  const grandPayment = afterTax - overdueDebt;
  return { periodCalculated: subtotal, commissionAmount, taxAmount: tax, grandPayment };
}

export function computePreviewPayment(source, row, commissionRate, taxAmount, previousDueAmount = 0) {
  const rates = {
    commissionRate: Number(commissionRate) || 0,
    taxAmount: Number(taxAmount) || 0,
  };

  const result =
    source === "glovo"
      ? calculateGlovoPayment(row, rates.commissionRate, rates.taxAmount)
      : calculateBoltPayment(row, rates.commissionRate, rates.taxAmount);

  const totalPayable = result.grandPayment + (Number(previousDueAmount) || 0);

  return {
    ...result,
    totalPayable: Math.round(totalPayable * 100) / 100,
  };
}

export function parseRateInput(value) {
  if (value === "" || value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
