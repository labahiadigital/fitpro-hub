/**
 * Normalizes text by removing diacritical marks (accents) for accent-insensitive comparisons.
 */
export function normalizeText(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
