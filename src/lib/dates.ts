/**
 * Timezone-safe date helpers.
 *
 * The native pattern `new Date().toISOString().split('T')[0]` returns the
 * UTC date, which is wrong for users in non-UTC timezones (e.g. Malaysia,
 * UTC+8). Past 16:00 UTC the UTC date is already the next day even though
 * locally it's still the previous day — and vice versa in the morning. This
 * caused "Pinjam 2026-05-06 → Kembali 2026-05-06" for a 1-day preset.
 *
 * These helpers always work in the LOCAL timezone.
 */

/** Format a Date as YYYY-MM-DD using its local-time components. */
export function formatLocalISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Today's date in the local timezone, as YYYY-MM-DD. */
export function todayLocalISO(): string {
  return formatLocalISO(new Date());
}

/** Add (or subtract) calendar days to a YYYY-MM-DD string, returning
 *  YYYY-MM-DD in the local timezone. */
export function addDaysLocalISO(baseISO: string, days: number): string {
  // 'YYYY-MM-DDT00:00:00' is parsed as local time.
  const d = new Date(`${baseISO}T00:00:00`);
  d.setDate(d.getDate() + days);
  return formatLocalISO(d);
}

/** Number of calendar days between two YYYY-MM-DD dates (start <= end). */
export function daysBetween(startISO: string, endISO: string): number {
  const a = new Date(`${startISO}T00:00:00`);
  const b = new Date(`${endISO}T00:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
