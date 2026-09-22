/** Shared pure number formatter (server- and client-safe, no directives). */
export function formatMoney(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
