/**
 * Admin-controlled visibility filter.
 *
 * `hidden = true` on a Resource or Asset means regular users cannot see
 * the row in pickers, cards, or scan results. Admin always sees
 * everything (with an "EyeOff" indicator on the card so they know it's
 * hidden from users).
 *
 * Independent of `lockedReason` — locking shows the row but blocks
 * booking with an explanation. Hiding removes the row entirely.
 */
export function visibleFor<T extends { hidden?: boolean }>(
  items: T[],
  isAdmin: boolean,
): T[] {
  return isAdmin ? items : items.filter((i) => !i.hidden);
}

/** Convenience boolean for a single item — used by ScannedActionSheet
 *  to decide whether a non-admin can act on a scanned hidden resource. */
export function isHiddenFromUser(
  item: { hidden?: boolean } | null | undefined,
  isAdmin: boolean,
): boolean {
  if (!item) return false;
  return !isAdmin && item.hidden === true;
}
