import { Asset, Resource } from '../types';

/** A resource (room or equipment category) is "locked" when admin has set a
 *  non-empty reason. Locked = users cannot book/pinjam. */
export function isResourceLocked(r: Resource | undefined | null): boolean {
  return Boolean(r?.lockedReason && r.lockedReason.trim().length > 0);
}

/** An asset (specific unit) is locked when admin set lockedReason OR when the
 *  legacy `status` field was set to 'maintenance'. */
export function isAssetLocked(a: Asset | undefined | null): boolean {
  if (!a) return false;
  if (a.lockedReason && a.lockedReason.trim().length > 0) return true;
  if (a.status === 'maintenance') return true;
  return false;
}

export function lockReasonOf(item: Resource | Asset | undefined | null): string {
  if (!item) return '';
  if (item.lockedReason && item.lockedReason.trim().length > 0) return item.lockedReason.trim();
  if ('status' in item && item.status === 'maintenance') return 'Sedang dalam penyelenggaraan';
  return '';
}
