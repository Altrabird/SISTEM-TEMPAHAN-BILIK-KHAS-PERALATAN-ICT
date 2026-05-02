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

/**
 * Resize an image client-side to a square that fits within `maxSize`,
 * encoded as JPEG. Avatars don't need original-resolution detail and
 * smartphone photos are 5-10 MB raw, so we trim before upload.
 */
async function resizeImage(file: File | Blob, maxSize = 512, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(maxSize / bitmap.width, maxSize / bitmap.height, 1);
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Image encoding failed'))),
      'image/jpeg',
      quality,
    );
  });
}

export async function uploadAvatar(
  file: File,
  userId: string,
): Promise<{ url: string | null; error?: string }> {
  if (!isSupabaseEnabled || !supabase) {
    return { url: null, error: 'Supabase belum dikonfig.' };
  }
  if (!file.type.startsWith('image/')) {
    return { url: null, error: 'Sila pilih fail gambar sahaja.' };
  }
  try {
    const blob = await resizeImage(file, 512, 0.85);
    const safeId = userId.replace(/[^a-z0-9_-]/gi, '');
    const filename = `avatar-${safeId}-${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filename, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: true,
      });
    if (uploadError) {
      return { url: null, error: uploadError.message };
    }
    const { data } = supabase.storage.from('images').getPublicUrl(filename);
    return { url: data.publicUrl };
  } catch (err: any) {
    return { url: null, error: err?.message ?? 'Ralat tidak diketahui semasa muat naik.' };
  }
}

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

export async function fetchProfileById(id: string): Promise<Profile | null> {
  if (!isSupabaseEnabled || !supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    name: data.name,
    email: data.email ?? undefined,
    role: data.role,
    department: data.department ?? undefined,
    avatarUrl: data.avatar_url ?? undefined,
    bio: data.bio ?? undefined,
    joinedAt: new Date(data.joined_at).getTime(),
    lastActiveAt: new Date(data.last_active_at).getTime(),
  };
}

export async function fetchProfilesFromCloud(): Promise<Profile[] | null> {
  if (!isSupabaseEnabled || !supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('last_active_at', { ascending: false });
  if (error || !data) return null;
  return data.map((row: any) => ({
    id: row.id,
    name: row.name,
    email: row.email ?? undefined,
    role: row.role,
    department: row.department ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    bio: row.bio ?? undefined,
    joinedAt: new Date(row.joined_at).getTime(),
    lastActiveAt: new Date(row.last_active_at).getTime(),
  }));
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
