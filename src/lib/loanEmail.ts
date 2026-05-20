import { Asset, Booking } from '../types';

/**
 * Returns true when this user has NEVER previously borrowed this exact asset.
 * Cancelled bookings don't count (they never created an obligation).
 *
 * Drives the "auto-send password email vs ask first" decision: the first
 * loan of a unit always gets the password email auto-sent, subsequent
 * loans show an opt-in toggle so the borrower's inbox doesn't get spammed
 * with the same credentials.
 */
export function isFirstBorrowOfAsset(
  userId: string,
  assetId: string,
  bookings: Booking[],
  /** Optional: exclude a specific booking id (the one being currently submitted). */
  excludeBookingId?: string,
): boolean {
  return !bookings.some(
    (b) =>
      b.id !== excludeBookingId &&
      b.userId === userId &&
      b.resourceId === assetId &&
      b.resourceType === 'equipment' &&
      b.status !== 'cancelled',
  );
}

/**
 * Should we auto-send the password email for this loan candidate, without
 * asking the user? Yes when:
 *   - The asset has an access_note, AND
 *   - The borrower has never borrowed this specific asset before.
 *
 * For repeat borrows of the same asset we don't auto-send (use opt-in
 * toggle instead) to avoid inbox spam.
 */
export function shouldAutoSendPassword(
  asset: Asset,
  userId: string,
  bookings: Booking[],
): boolean {
  if (!asset.accessNote || asset.accessNote.trim().length === 0) return false;
  return isFirstBorrowOfAsset(userId, asset.id, bookings);
}
