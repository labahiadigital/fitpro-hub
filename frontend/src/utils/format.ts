/**
 * Formatting utilities for the Spanish locale (es-ES).
 * Decimal separator: comma. Thousands separator: dot.
 */

export function formatDecimal(value: number, decimals = 2): string {
  return value.toLocaleString("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatDecimalCompact(value: number): string {
  if (Number.isInteger(value)) return value.toLocaleString("es-ES");
  return value.toLocaleString("es-ES", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
}

export function formatCurrency(amount: number, currency = "EUR"): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
  }).format(amount);
}
