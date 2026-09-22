/** YYYY-MM-DD in UTC. */
export function todayISO(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Shift a YYYY-MM-DD date by whole days (UTC). */
export function shiftDateISO(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
