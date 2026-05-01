import { Profile, Booking, Resource, Asset } from '../types';
import { STORAGE_KEYS } from '../constants';
import { supabase, isSupabaseEnabled } from './supabase';

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[Storage] Failed to persist ${key}:`, err);
  }
}

export const localStore = {
  getProfile: (): Profile | null => readJSON<Profile | null>(STORAGE_KEYS.PROFILE, null),
  saveProfile: (p: Profile) => writeJSON(STORAGE_KEYS.PROFILE, p),
  clearProfile: () => localStorage.removeItem(STORAGE_KEYS.PROFILE),

  getRooms: (fallback: Resource[]): Resource[] => readJSON(STORAGE_KEYS.ROOMS, fallback),
  saveRooms: (v: Resource[]) => writeJSON(STORAGE_KEYS.ROOMS, v),

  getEquipment: (fallback: Resource[]): Resource[] => readJSON(STORAGE_KEYS.EQUIPMENT, fallback),
  saveEquipment: (v: Resource[]) => writeJSON(STORAGE_KEYS.EQUIPMENT, v),

  getAssets: (fallback: Asset[]): Asset[] => readJSON(STORAGE_KEYS.ASSETS, fallback),
  saveAssets: (v: Asset[]) => writeJSON(STORAGE_KEYS.ASSETS, v),

  getBookings: (): Booking[] => readJSON<Booking[]>(STORAGE_KEYS.BOOKINGS, []),
  saveBookings: (v: Booking[]) => writeJSON(STORAGE_KEYS.BOOKINGS, v),

  resetAll: () => {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
  },
};

export async function syncProfileToCloud(profile: Profile): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseEnabled || !supabase) {
    return { ok: false, error: 'Supabase not configured' };
  }
  const { error } = await supabase.from('profiles').upsert({
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role,
    department: profile.department,
    avatar_url: profile.avatarUrl,
    bio: profile.bio,
    joined_at: new Date(profile.joinedAt).toISOString(),
    last_active_at: new Date(profile.lastActiveAt).toISOString(),
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function syncBookingToCloud(booking: Booking): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseEnabled || !supabase) {
    return { ok: false, error: 'Supabase not configured' };
  }
  const { error } = await supabase.from('bookings').insert({
    id: booking.id,
    resource_id: booking.resourceId,
    resource_type: booking.resourceType,
    user_id: booking.userId,
    user_name: booking.userName,
    date: booking.date,
    start_time: booking.startTime,
    end_time: booking.endTime,
    purpose: booking.purpose,
    status: booking.status,
    created_at: new Date(booking.createdAt).toISOString(),
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function fetchBookingsFromCloud(): Promise<Booking[] | null> {
  if (!isSupabaseEnabled || !supabase) return null;
  const { data, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
  if (error || !data) return null;
  return data.map((row: any) => ({
    id: row.id,
    resourceId: row.resource_id,
    resourceType: row.resource_type,
    userId: row.user_id,
    userName: row.user_name,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    purpose: row.purpose,
    status: row.status,
    createdAt: new Date(row.created_at).getTime(),
  }));
}
