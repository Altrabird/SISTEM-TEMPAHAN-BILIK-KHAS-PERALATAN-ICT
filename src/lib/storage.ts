import { Profile, Booking, Resource, Asset, NotificationSettings, WeekDay } from '../types';
import { STORAGE_KEYS, DEFAULT_NOTIFICATION_SETTINGS } from '../constants';
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

async function uploadImage(
  file: File,
  filename: string,
  maxSize: number,
): Promise<{ url: string | null; error?: string }> {
  if (!isSupabaseEnabled || !supabase) {
    return { url: null, error: 'Supabase belum dikonfig.' };
  }
  if (!file.type.startsWith('image/')) {
    return { url: null, error: 'Sila pilih fail gambar sahaja.' };
  }
  try {
    const blob = await resizeImage(file, maxSize, 0.85);
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
    // Cache-bust so changes appear immediately
    return { url: `${data.publicUrl}?t=${Date.now()}` };
  } catch (err: any) {
    return { url: null, error: err?.message ?? 'Ralat tidak diketahui semasa muat naik.' };
  }
}

export async function uploadAvatar(
  file: File,
  userId: string,
): Promise<{ url: string | null; error?: string }> {
  const safeId = userId.replace(/[^a-z0-9_-]/gi, '');
  return uploadImage(file, `avatar-${safeId}-${Date.now()}.jpg`, 512);
}

export async function uploadResourceImage(
  file: File,
  resource: { id: string; type: 'room' | 'equipment' },
): Promise<{ url: string | null; error?: string }> {
  const safeId = resource.id.replace(/[^a-z0-9_-]/gi, '');
  const prefix = resource.type === 'room' ? 'room' : 'equipment';
  return uploadImage(file, `${prefix}-${safeId}-${Date.now()}.jpg`, 1024);
}

export async function uploadAssetImage(
  file: File,
  assetId: string,
): Promise<{ url: string | null; error?: string }> {
  const safeId = assetId.replace(/[^a-z0-9_-]/gi, '') || `new-${Date.now()}`;
  return uploadImage(file, `asset-${safeId}.jpg`, 1024);
}

function rowToResource(row: any, type: 'room' | 'equipment'): Resource {
  return {
    id: row.id,
    name: row.name,
    type,
    description: row.description ?? undefined,
    imageUrl: row.image_url ?? undefined,
    capacity: row.capacity ?? undefined,
    quantity: row.quantity ?? undefined,
    lockedReason: row.locked_reason ?? undefined,
    hidden: row.hidden ?? false,
  };
}

function rowToAsset(row: any): Asset {
  return {
    id: row.id,
    resourceId: row.resource_id,
    name: row.name,
    serialNumber: row.serial_number,
    specifications: row.specifications ?? '',
    imageUrl: row.image_url ?? undefined,
    status: row.status ?? 'available',
    lockedReason: row.locked_reason ?? undefined,
    hidden: row.hidden ?? false,
    accessNote: row.access_note ?? undefined,
  };
}

export async function fetchRoomsFromCloud(): Promise<Resource[] | null> {
  if (!isSupabaseEnabled || !supabase) return null;
  const { data, error } = await supabase.from('rooms').select('*').order('name');
  if (error || !data) return null;
  return data.map((r: any) => rowToResource(r, 'room'));
}

export async function fetchEquipmentFromCloud(): Promise<Resource[] | null> {
  if (!isSupabaseEnabled || !supabase) return null;
  const { data, error } = await supabase.from('equipment').select('*').order('name');
  if (error || !data) return null;
  return data.map((r: any) => rowToResource(r, 'equipment'));
}

/**
 * Delete a room or equipment category from the cloud.
 *
 * Note: for equipment categories, the caller MUST first delete any
 * `assets` rows that reference this category — otherwise the FK
 * constraint `assets_resource_id_fkey` will block the delete. Rooms have
 * no FK pointing in, so the delete always succeeds (any historical
 * bookings will then resolve via raw id fallback in resolveResourceName).
 */
export async function deleteResourceInCloud(
  resource: Pick<Resource, 'id' | 'type'>,
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseEnabled || !supabase) {
    return { ok: false, error: 'Supabase belum dikonfig.' };
  }
  const table = resource.type === 'room' ? 'rooms' : 'equipment';
  const { error } = await supabase.from(table).delete().eq('id', resource.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Insert a brand-new room or equipment category.
 *
 * Used by the admin "Tambah Bilik" / "Tambah Kategori" flows. Returns the
 * usual ok/error envelope; on RLS rejection or PK conflict the caller
 * should roll back the optimistic local state.
 */
export async function insertResourceInCloud(resource: Resource): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseEnabled || !supabase) {
    return { ok: false, error: 'Supabase belum dikonfig.' };
  }
  const table = resource.type === 'room' ? 'rooms' : 'equipment';
  const row: Record<string, any> = {
    id: resource.id,
    name: resource.name,
    description: resource.description ?? null,
    image_url: resource.imageUrl ?? null,
    locked_reason: resource.lockedReason ?? null,
    hidden: resource.hidden ?? false,
  };
  if (resource.type === 'room') row.capacity = resource.capacity ?? null;
  else row.quantity = resource.quantity ?? null;

  const { error } = await supabase.from(table).insert(row);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Persist room / equipment edits to the cloud.
 *
 * For pre-existing rows (seeded or admin-created). Uses `.update()` rather
 * than `.upsert()` because the latter runs `INSERT ... ON CONFLICT DO
 * UPDATE` under the hood, and RLS used to silently filter such inserts
 * before we added explicit INSERT policies. Treating 0 affected rows as
 * an error here also catches typos / wrong ids early.
 */
export async function upsertResourceToCloud(resource: Resource): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseEnabled || !supabase) {
    return { ok: false, error: 'Supabase belum dikonfig.' };
  }
  const table = resource.type === 'room' ? 'rooms' : 'equipment';
  const row: Record<string, any> = {
    name: resource.name,
    description: resource.description ?? null,
    image_url: resource.imageUrl ?? null,
    locked_reason: resource.lockedReason ?? null,
    hidden: resource.hidden ?? false,
  };
  if (resource.type === 'room') row.capacity = resource.capacity ?? null;
  else row.quantity = resource.quantity ?? null;

  // `select()` returns the affected rows; an empty array means 0 rows
  // matched (wrong id) OR the request was blocked by RLS — both worth
  // surfacing as an error rather than a silent success.
  const { data, error } = await supabase
    .from(table)
    .update(row)
    .eq('id', resource.id)
    .select();
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return { ok: false, error: `Tiada baris dikemaskini untuk ${resource.id} (RLS atau id salah?)` };
  }
  return { ok: true };
}

export async function fetchAssetsFromCloud(): Promise<Asset[] | null> {
  if (!isSupabaseEnabled || !supabase) return null;
  const { data, error } = await supabase.from('assets').select('*').order('name');
  if (error || !data) return null;
  return data.map(rowToAsset);
}

export async function upsertAssetToCloud(asset: Asset): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseEnabled || !supabase) {
    return { ok: false, error: 'Supabase belum dikonfig.' };
  }
  const { error } = await supabase.from('assets').upsert({
    id: asset.id,
    resource_id: asset.resourceId,
    name: asset.name,
    serial_number: asset.serialNumber,
    specifications: asset.specifications,
    image_url: asset.imageUrl ?? null,
    status: asset.status,
    locked_reason: asset.lockedReason ?? null,
    hidden: asset.hidden ?? false,
    access_note: asset.accessNote ?? null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteAssetFromCloud(assetId: string): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseEnabled || !supabase) {
    return { ok: false, error: 'Supabase belum dikonfig.' };
  }
  const { error } = await supabase.from('assets').delete().eq('id', assetId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
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
    return_date: booking.returnDate ?? null,
    start_time: booking.startTime,
    end_time: booking.endTime,
    purpose: booking.purpose,
    status: booking.status,
    created_at: new Date(booking.createdAt).toISOString(),
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Mark many ICT loans as returned in a single round-trip. The Supabase RPC
 * suppresses per-row Telegram notifications and emits ONE consolidated
 * digest message instead, so the group chat doesn't get flooded.
 *
 * Returns the count actually updated (already-returned ones are skipped
 * server-side).
 */
export async function bulkReturnLoansInCloud(
  loanIds: string[],
  byId: string,
  byName: string,
  notes?: string,
): Promise<{ ok: boolean; updated: number; error?: string }> {
  if (!isSupabaseEnabled || !supabase) {
    return { ok: false, updated: 0, error: 'Supabase belum dikonfig.' };
  }
  if (loanIds.length === 0) {
    return { ok: true, updated: 0 };
  }
  const { data, error } = await supabase.rpc('bulk_return_loans', {
    loan_ids: loanIds,
    by_id: byId,
    by_name: byName,
    notes: notes ?? null,
  });
  if (error) return { ok: false, updated: 0, error: error.message };
  return { ok: true, updated: typeof data === 'number' ? data : Number(data) || 0 };
}

/**
 * Insert many room bookings (range OR ad-hoc bulk slots) in a single
 * round-trip. The Supabase RPC sets `tempah.suppress_booking_notify`
 * to silence the per-row Telegram trigger, then emits ONE consolidated
 * "🚪🚪 Tempahan Bilik Pukal" digest listing every slot.
 *
 * All rows must share the same purpose + user. Per-row variables are
 * `id`, `resource_id`, `date`, `start_time`, `end_time`, `created_at`.
 */
export async function bulkBookRoomsInCloud(
  bookings: Booking[],
  byUserId: string,
  byUserName: string,
  purpose: string,
): Promise<{ ok: boolean; inserted: number; error?: string }> {
  if (!isSupabaseEnabled || !supabase) {
    return { ok: false, inserted: 0, error: 'Supabase belum dikonfig.' };
  }
  if (bookings.length === 0) {
    return { ok: true, inserted: 0 };
  }
  const rows = bookings.map((b) => ({
    id: b.id,
    resource_id: b.resourceId,
    date: b.date,
    start_time: b.startTime,
    end_time: b.endTime,
    created_at: new Date(b.createdAt).toISOString(),
  }));
  const { data, error } = await supabase.rpc('bulk_book_rooms', {
    rows,
    by_user_id: byUserId,
    by_user_name: byUserName,
    purpose,
  });
  if (error) return { ok: false, inserted: 0, error: error.message };
  return { ok: true, inserted: typeof data === 'number' ? data : Number(data) || 0 };
}

/**
 * Insert many ICT loan bookings in a single round-trip. The Supabase RPC
 * suppresses per-row Telegram notifications and emits ONE consolidated
 * digest message instead, so the group chat doesn't get flooded.
 *
 * Returns the count actually inserted.
 */
export async function bulkLoanAssetsInCloud(
  bookings: Booking[],
  byUserId: string,
  byUserName: string,
): Promise<{ ok: boolean; inserted: number; error?: string }> {
  if (!isSupabaseEnabled || !supabase) {
    return { ok: false, inserted: 0, error: 'Supabase belum dikonfig.' };
  }
  if (bookings.length === 0) {
    return { ok: true, inserted: 0 };
  }
  // All rows in a bulk loan share these fields — we send shared params once
  // and pass the per-row variables (id, resource_id) as a jsonb array.
  const first = bookings[0];
  const rows = bookings.map((b) => ({ id: b.id, resource_id: b.resourceId }));
  const { data, error } = await supabase.rpc('bulk_loan_assets', {
    rows,
    by_user_id: byUserId,
    by_user_name: byUserName,
    start_date: first.date,
    return_date: first.returnDate ?? first.date,
    start_time: first.startTime,
    end_time: first.endTime,
    purpose: first.purpose,
    created_at: new Date(first.createdAt).toISOString(),
  });
  if (error) return { ok: false, inserted: 0, error: error.message };
  return { ok: true, inserted: typeof data === 'number' ? data : Number(data) || 0 };
}

/**
 * Invoke the `send-password-email` Edge Function to deliver an asset's
 * Nota Akses to the borrower's profile email via Gmail SMTP.
 *
 * The function looks up the loan + asset + borrower email server-side
 * (service-role) so the frontend never needs to hold the access_note in
 * memory — it just hands over the loan id. The Edge Function:
 *   - Rejects with `code: 'no_email'` if the borrower's profile email is empty
 *   - Rejects if the asset has no access_note set
 *   - Sends a polished HTML email + plain-text fallback via Gmail SMTP (port 465 TLS)
 *
 * `mode: 'auto'` = post-insert first-time auto-send.
 * `mode: 'resend'` = user clicked "Hantar Semula ke Email" on their loan card.
 */
export async function sendLoanPasswordEmail(
  loanId: string,
  mode: 'auto' | 'resend' = 'auto',
): Promise<{ ok: boolean; error?: string; code?: string; sentTo?: string }> {
  if (!isSupabaseEnabled || !supabase) {
    return { ok: false, error: 'Supabase belum dikonfig.' };
  }
  try {
    const { data, error } = await supabase.functions.invoke('send-password-email', {
      body: { loanId, mode },
    });
    if (error) {
      // FunctionsHttpError → parse the JSON body for our app-level error message
      // The error object's message is usually generic ("Edge Function returned a non-2xx
      // status code"); the real reason is in error.context.response (if available).
      let parsedError = error.message ?? 'Email send failed';
      let parsedCode: string | undefined;
      try {
        const ctx: any = (error as any).context;
        if (ctx?.response && typeof ctx.response.json === 'function') {
          const body = await ctx.response.json();
          if (body?.error) parsedError = body.error;
          if (body?.code) parsedCode = body.code;
        }
      } catch {
        // best-effort parsing — fall back to the generic message
      }
      return { ok: false, error: parsedError, code: parsedCode };
    }
    return { ok: true, sentTo: data?.sentTo };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Network error semasa hantar email' };
  }
}

/** Update an existing booking row (e.g., return logging, cancellation). */
export async function updateBookingInCloud(booking: Booking): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseEnabled || !supabase) {
    return { ok: false, error: 'Supabase not configured' };
  }
  const { error } = await supabase.from('bookings').update({
    status: booking.status,
    returned_at: booking.returnedAt ? new Date(booking.returnedAt).toISOString() : null,
    returned_by_id: booking.returnedById ?? null,
    returned_by_name: booking.returnedByName ?? null,
    return_notes: booking.returnNotes ?? null,
    cancelled_at: booking.cancelledAt ? new Date(booking.cancelledAt).toISOString() : null,
    cancelled_by_id: booking.cancelledById ?? null,
    cancelled_by_name: booking.cancelledByName ?? null,
    cancel_reason: booking.cancelReason ?? null,
  }).eq('id', booking.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/* =========================================================================
 * Telegram notification settings (single row, id = 'telegram')
 * ====================================================================== */

function rowToNotificationSettings(row: any): NotificationSettings {
  // `active_days` is a Postgres smallint[]; supabase-js hands it back as a
  // number[]. Guard anyway — a hand-edited row could hold junk, and an
  // empty array must stay empty (it means "never send").
  const days = Array.isArray(row.active_days)
    ? (row.active_days
        .map((d: any) => Number(d))
        .filter((d: number) => d >= 1 && d <= 7) as WeekDay[])
    : DEFAULT_NOTIFICATION_SETTINGS.activeDays;
  return {
    enabled: row.enabled ?? true,
    activeDays: [...days].sort((a, b) => a - b) as WeekDay[],
    notifyNewBooking: row.notify_new_booking ?? true,
    notifyReturn: row.notify_return ?? true,
    notifyCancel: row.notify_cancel ?? true,
    notifyDailyReminder: row.notify_daily_reminder ?? true,
    notifyMorningDigest: row.notify_morning_digest ?? true,
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined,
    updatedBy: row.updated_by ?? undefined,
  };
}

/** Read the admin's Telegram notification rules. Returns null when
 *  Supabase is off or the row can't be read, so the caller can tell
 *  "not configured" apart from "configured and disabled". */
export async function fetchNotificationSettings(): Promise<NotificationSettings | null> {
  if (!isSupabaseEnabled || !supabase) return null;
  const { data, error } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('id', 'telegram')
    .maybeSingle();
  if (error || !data) return null;
  return rowToNotificationSettings(data);
}

/** Persist the notification rules. The row is seeded by notify_setup.sql,
 *  so this is an UPDATE — 0 affected rows means the migration hasn't been
 *  run on this project yet, which is worth surfacing rather than silently
 *  "succeeding". */
export async function updateNotificationSettings(
  settings: NotificationSettings,
  updatedBy?: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseEnabled || !supabase) {
    return { ok: false, error: 'Supabase belum dikonfig.' };
  }
  const { data, error } = await supabase
    .from('notification_settings')
    .update({
      enabled: settings.enabled,
      active_days: settings.activeDays,
      notify_new_booking: settings.notifyNewBooking,
      notify_return: settings.notifyReturn,
      notify_cancel: settings.notifyCancel,
      notify_daily_reminder: settings.notifyDailyReminder,
      notify_morning_digest: settings.notifyMorningDigest,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy ?? null,
    })
    .eq('id', 'telegram')
    .select();
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return {
      ok: false,
      error: 'Baris tetapan tidak dijumpai — jalankan supabase/notify_setup.sql dahulu.',
    };
  }
  return { ok: true };
}

function rowToProfile(row: any): Profile {
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? undefined,
    role: row.role,
    department: row.department ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    bio: row.bio ?? undefined,
    joinedAt: new Date(row.joined_at).getTime(),
    lastActiveAt: new Date(row.last_active_at).getTime(),
    archived: row.archived ?? false,
    archivedAt: row.archived_at ? new Date(row.archived_at).getTime() : undefined,
    archivedBy: row.archived_by ?? undefined,
  };
}

/**
 * Lightweight liveness check for the signed-in profile.
 *
 * Distinct from `fetchProfileById`, which returns null for BOTH "row not
 * found" and "request failed" — a distinction that matters here, because
 * locking a teacher out of the app on a flaky connection would be far
 * worse than letting a stale session linger a few more minutes.
 *
 * Returns `null` when the answer is genuinely unknown (Supabase off, or
 * the request errored). Callers must treat null as "carry on".
 */
export async function fetchProfileStatus(
  id: string,
): Promise<{ exists: boolean; archived: boolean } | null> {
  if (!isSupabaseEnabled || !supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, archived')
    .eq('id', id)
    .maybeSingle();
  if (error) return null;
  if (!data) return { exists: false, archived: false };
  return { exists: true, archived: data.archived === true };
}

export async function fetchProfileById(id: string): Promise<Profile | null> {
  if (!isSupabaseEnabled || !supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  return rowToProfile(data);
}

/**
 * All profiles, newest-active first.
 *
 * Archived staff are excluded by default — that's what makes them vanish
 * from the "Profil Sedia Ada" picker and the reports at every call site
 * without each one needing to remember. Only the admin leaderboard passes
 * `includeArchived`, so it can offer a "show archived" toggle.
 */
export async function fetchProfilesFromCloud(
  includeArchived = false,
): Promise<Profile[] | null> {
  if (!isSupabaseEnabled || !supabase) return null;
  let query = supabase.from('profiles').select('*');
  if (!includeArchived) {
    // `is('archived', false)` alone would drop rows where the column is
    // still NULL on a database that hasn't run the v1.9.5 migration.
    query = query.or('archived.is.null,archived.eq.false');
  }
  const { data, error } = await query.order('last_active_at', { ascending: false });
  if (error || !data) return null;
  return data.map(rowToProfile);
}

/**
 * Archive or restore a profile (soft removal).
 *
 * Uses `.update().eq().select()` rather than upsert so 0 affected rows
 * surfaces as an error instead of a silent no-op — the same trap that bit
 * the resource editor before.
 */
export async function setProfileArchived(
  profileId: string,
  archived: boolean,
  byName?: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseEnabled || !supabase) {
    return { ok: false, error: 'Supabase belum dikonfig.' };
  }
  const { data, error } = await supabase
    .from('profiles')
    .update({
      archived,
      archived_at: archived ? new Date().toISOString() : null,
      archived_by: archived ? (byName ?? null) : null,
    })
    .eq('id', profileId)
    .select();
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return {
      ok: false,
      error: 'Tiada baris dikemaskini — jalankan supabase/schema.sql dahulu (kolum archived).',
    };
  }
  return { ok: true };
}

/**
 * Permanently delete a profile row.
 *
 * Booking history is deliberately NOT touched: `bookings.user_id` has no
 * foreign key to `profiles`, and every booking carries a denormalised
 * `user_name`, so past records and reports stay complete after the person
 * is gone. Callers must block this when the user still holds an open loan.
 */
export async function deleteProfileFromCloud(
  profileId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseEnabled || !supabase) {
    return { ok: false, error: 'Supabase belum dikonfig.' };
  }
  const { data, error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', profileId)
    .select();
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return {
      ok: false,
      error: 'Tiada baris dipadam — polisi DELETE mungkin belum dipasang (jalankan supabase/schema.sql).',
    };
  }
  return { ok: true };
}

/** Postgres `time` columns come back as HH:MM:SS — trim the seconds so
 *  display strings match the optimistic local state (always HH:MM). */
function normalizeTime(t: string | null | undefined): string {
  if (!t) return '';
  return t.length >= 5 ? t.slice(0, 5) : t;
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
    returnDate: row.return_date ?? undefined,
    startTime: normalizeTime(row.start_time),
    endTime: normalizeTime(row.end_time),
    purpose: row.purpose,
    status: row.status,
    createdAt: new Date(row.created_at).getTime(),
    returnedAt: row.returned_at ? new Date(row.returned_at).getTime() : undefined,
    returnedById: row.returned_by_id ?? undefined,
    returnedByName: row.returned_by_name ?? undefined,
    returnNotes: row.return_notes ?? undefined,
    cancelledAt: row.cancelled_at ? new Date(row.cancelled_at).getTime() : undefined,
    cancelledById: row.cancelled_by_id ?? undefined,
    cancelledByName: row.cancelled_by_name ?? undefined,
    cancelReason: row.cancel_reason ?? undefined,
  }));
}
