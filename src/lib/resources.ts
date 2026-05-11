import { Asset, Resource } from '../types';

/**
 * Resolve a friendly display name for a booking's resource.
 *
 * - Room bookings: resourceId = 'room-X' → looks up in `rooms`
 * - Equipment loans: resourceId = 'ast-X' → looks up in `assets`,
 *   then joins category name from `equipment` for context
 * - Falls back to the raw id (never 'N/A') so the user always sees
 *   *something* identifiable, even mid-data-load
 */
export function resolveResourceName(
  resourceId: string,
  rooms: Resource[],
  equipment: Resource[],
  assets: Asset[],
): string {
  const direct = rooms.find((r) => r.id === resourceId)
              ?? equipment.find((e) => e.id === resourceId);
  if (direct) return direct.name;

  const asset = assets.find((a) => a.id === resourceId);
  if (asset) {
    const cat = equipment.find((e) => e.id === asset.resourceId);
    return cat ? `${asset.name} (${cat.name})` : asset.name;
  }

  return resourceId;
}
