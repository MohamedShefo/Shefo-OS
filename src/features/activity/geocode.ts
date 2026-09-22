/**
 * Reverse-geocoding layer (deliberately minimal + reversible).
 *
 * The default resolver performs NO network calls and returns null — exact
 * coordinates are stored and displayed as-is. A future phase may register a
 * resolver that calls an approved geocoding endpoint SERVER-SIDE ONLY
 * (never expose API keys in client code) by replacing `resolveAddress`.
 */

export interface ResolvedAddress {
  /** Human-readable label, e.g. "Berlin, Germany" (source-dependent). */
  label: string;
}

export type AddressResolver = (
  latitude: number,
  longitude: number
) => Promise<ResolvedAddress | null>;

export function resolveAddress(): Promise<ResolvedAddress | null> {
  return Promise.resolve(null);
}

export function formatCoords(latitude: number, longitude: number, decimals = 5): string {
  return `${latitude.toFixed(decimals)}, ${longitude.toFixed(decimals)}`;
}

export function formatApprox(latitude: number, longitude: number): string {
  return `≈ ${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
}
