/**
 * Internet-synced clock.
 *
 * School laptops and shared PCs drift — some are minutes off, some have
 * had their clock set by hand. `new Date()` on such a device disagrees
 * with the timestamps Postgres writes on every booking, which makes the
 * in-app clock untrustworthy for "am I late returning this?" decisions.
 *
 * So we measure the offset between the device clock and an authoritative
 * source ONCE, keep it in memory, and tick locally from there:
 *
 *     trueNow ≈ Date.now() + offsetMs
 *
 * Sources tried in order:
 *   1. `server_now()` RPC on Supabase (Postgres `now()`, NTP-synced host)
 *   2. The `Date` response header from our own origin (1s resolution —
 *      good enough, and works when Supabase is off)
 *   3. Nothing — offset stays 0 and we fall back to the device clock
 *
 * Round-trip is halved out: the server stamps its time somewhere in the
 * middle of the request, so by the time the reply lands roughly half the
 * round-trip has already elapsed.
 */
import { supabase, isSupabaseEnabled } from './supabase';
import type { WeekDay } from '../types';

/** Milliseconds to add to `Date.now()` to get true time. */
let offsetMs = 0;
let synced = false;
let lastSyncAt = 0;
let inFlight: Promise<boolean> | null = null;

/** Re-sync at most this often — enough to catch drift after a long
 *  suspend without hammering the network on every tab focus. */
const RESYNC_AFTER_MS = 15 * 60 * 1000;

/** Ignore absurd corrections (> 24h). A device that far off is more
 *  likely reporting a bad `Date` header than genuinely mis-set, and
 *  jumping the UI a day would be worse than showing the local clock. */
const MAX_PLAUSIBLE_OFFSET_MS = 24 * 60 * 60 * 1000;

async function readSupabaseTime(): Promise<number | null> {
  if (!isSupabaseEnabled || !supabase) return null;
  try {
    const t0 = Date.now();
    const { data, error } = await supabase.rpc('server_now');
    const t1 = Date.now();
    if (error || !data) return null;
    const server = new Date(data as string).getTime();
    if (!Number.isFinite(server)) return null;
    return server + (t1 - t0) / 2 - t1;
  } catch {
    return null;
  }
}

async function readHttpDate(): Promise<number | null> {
  if (typeof window === 'undefined') return null;
  try {
    const t0 = Date.now();
    // Cache-busted HEAD so a service-worker/proxy cache can't hand back a
    // stale `Date` header from an earlier response.
    const res = await fetch(`${window.location.origin}/?_clock=${t0}`, {
      method: 'HEAD',
      cache: 'no-store',
    });
    const t1 = Date.now();
    const header = res.headers.get('date');
    if (!header) return null;
    const server = new Date(header).getTime();
    if (!Number.isFinite(server)) return null;
    return server + (t1 - t0) / 2 - t1;
  } catch {
    return null;
  }
}

/**
 * Measure the offset against an authoritative source. Concurrent calls
 * share one request. Returns true when a source answered.
 *
 * `force` skips the RESYNC_AFTER_MS throttle (used on manual retry).
 */
export async function syncClock(force = false): Promise<boolean> {
  if (!force && synced && Date.now() - lastSyncAt < RESYNC_AFTER_MS) {
    return true;
  }
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const measured = (await readSupabaseTime()) ?? (await readHttpDate());
    inFlight = null;
    if (measured === null || Math.abs(measured) > MAX_PLAUSIBLE_OFFSET_MS) {
      return false;
    }
    offsetMs = measured;
    synced = true;
    lastSyncAt = Date.now();
    return true;
  })();

  return inFlight;
}

/** True time as a Date — device clock corrected by the measured offset. */
export function serverNow(): Date {
  return new Date(Date.now() + offsetMs);
}

/** How far the device clock is off, in ms (positive = device is behind). */
export function clockOffsetMs(): number {
  return offsetMs;
}

/** Whether we ever reached an authoritative source. When false, the
 *  clock is showing the raw device time and the UI says so. */
export function isClockSynced(): boolean {
  return synced;
}

const ISO_DOW_BY_SHORT_NAME: Record<string, WeekDay> = {
  Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7,
};

/**
 * ISO day-of-week in Asia/Kuala_Lumpur — 1 = Isnin … 7 = Ahad.
 *
 * Computed in the school's timezone rather than the device's so the
 * "is today a notification day?" preview in Tetapan matches what
 * `tg_should_send()` decides in Postgres, even on a device left on a
 * foreign timezone.
 */
export function kualaLumpurISODow(d: Date = serverNow()): WeekDay {
  const short = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kuala_Lumpur',
    weekday: 'short',
  }).format(d);
  return ISO_DOW_BY_SHORT_NAME[short] ?? 1;
}
