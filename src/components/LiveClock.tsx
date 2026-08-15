import React, { useEffect, useState } from 'react';
import { Clock, WifiOff } from 'lucide-react';
import { serverNow, syncClock, isClockSynced, clockOffsetMs } from '../lib/serverTime';

interface Props {
  /** `header` = date + seconds (desktop bar). `compact` = HH:MM only,
   *  sized for the mobile header where space is tight. */
  variant?: 'header' | 'compact';
  className?: string;
}

// Formatters are expensive to build; make them once. Everything is
// rendered in the school's timezone rather than the device's, so a
// laptop left on the wrong timezone still shows Malaysian time.
const TZ = 'Asia/Kuala_Lumpur';

const timeWithSeconds = new Intl.DateTimeFormat('ms-MY', {
  timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
});
const timeShort = new Intl.DateTimeFormat('ms-MY', {
  timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false,
});
const dateLong = new Intl.DateTimeFormat('ms-MY', {
  timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
});

/**
 * Live clock, corrected against internet time.
 *
 * Shared PCs and school laptops drift, so `new Date()` alone can be
 * minutes out — awkward when the same screen shows booking slots down to
 * the minute. `serverTime` measures the offset against Postgres (or the
 * origin's `Date` header) and this component just ticks off that.
 *
 * The dot next to the time says which clock you're looking at: green =
 * synced with the server, amber = device clock only (offline / RPC
 * unavailable). Hover for the exact drift.
 */
export function LiveClock({ variant = 'header', className = '' }: Props) {
  const [now, setNow] = useState<Date>(() => serverNow());
  const [synced, setSynced] = useState(isClockSynced());

  useEffect(() => {
    let alive = true;

    const resync = () => {
      void syncClock().then((ok) => {
        if (!alive) return;
        setSynced(ok && isClockSynced());
        setNow(serverNow());
      });
    };

    resync();

    // Tick every second. `serverNow()` re-reads the offset each time, so a
    // later re-sync corrects the display without restarting the interval.
    const tick = setInterval(() => {
      if (alive) setNow(serverNow());
    }, 1000);

    // A phone that was asleep for hours comes back with a stale reading —
    // and a device that just regained connectivity may never have synced.
    const onVisible = () => {
      if (document.visibilityState === 'visible') resync();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', resync);

    return () => {
      alive = false;
      clearInterval(tick);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', resync);
    };
  }, []);

  const offsetSeconds = Math.round(clockOffsetMs() / 1000);
  const title = synced
    ? `Masa Malaysia (MYT), diselaraskan dengan jam pelayan${
        Math.abs(offsetSeconds) >= 2
          ? ` — jam peranti ini ${offsetSeconds > 0 ? 'lambat' : 'cepat'} ${Math.abs(offsetSeconds)} saat`
          : ''
      }`
    : 'Menggunakan jam peranti — gagal selaras dengan pelayan';

  if (variant === 'compact') {
    return (
      <div
        title={title}
        className={`flex items-center gap-1.5 text-white/90 ${className}`}
      >
        {synced ? (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
        ) : (
          <WifiOff size={11} className="text-amber-300 shrink-0" />
        )}
        <span className="text-xs font-bold tabular-nums tracking-tight">
          {timeShort.format(now)}
        </span>
      </div>
    );
  }

  return (
    <div
      title={title}
      className={`flex items-center gap-2 pr-3 mr-1 border-r border-slate-200 ${className}`}
    >
      <Clock size={14} className="text-slate-400 shrink-0" />
      <div className="leading-tight">
        <p className="text-sm font-bold text-slate-700 tabular-nums tracking-tight flex items-center gap-1.5">
          {timeWithSeconds.format(now)}
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              synced ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
          />
        </p>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight whitespace-nowrap">
          {dateLong.format(now)}
        </p>
      </div>
    </div>
  );
}
