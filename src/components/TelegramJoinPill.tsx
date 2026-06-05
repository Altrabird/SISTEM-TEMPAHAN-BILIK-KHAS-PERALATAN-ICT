import React from 'react';
import { Send, Megaphone } from 'lucide-react';
import { TELEGRAM_INVITE_URL, TELEGRAM_GROUP_LABEL } from '../constants';

/**
 * Opt-in CTA pointing at our Telegram group (or bot DM as fallback).
 *
 * The QR codes themselves encode plain HTTPS URLs — any phone camera or
 * generic QR scanner can read them and land the user in this PWA. This
 * pill is the in-app discovery surface for the Telegram channel where
 * automatic booking notifications get posted.
 *
 * Hidden entirely when `VITE_TELEGRAM_INVITE_URL` is set to an empty
 * string at build time, so deployments that don't want to expose the
 * group can opt out without code changes.
 *
 * Two visual variants:
 *  - `compact` (default): thin pill suitable for action sheets + dense
 *    cards. Single-line label.
 *  - `card`: full-width card with explanation copy. Good for hero
 *    sections, settings page, the top of a list view.
 */
interface Props {
  variant?: 'compact' | 'card';
  /** Override the default copy. Useful if the surrounding context already
   *  says "join the group" (e.g. an onboarding step) and you want a
   *  shorter label here. */
  label?: string;
  /** Hide the description line in card variant — title + button only.
   *  Has no effect on compact variant. */
  dense?: boolean;
  className?: string;
}

export function TelegramJoinPill({
  variant = 'compact',
  label,
  dense = false,
  className = '',
}: Props) {
  // Empty string from env = explicit opt-out
  if (!TELEGRAM_INVITE_URL) return null;

  const isBotFallback = TELEGRAM_INVITE_URL.includes('/TempahSKBT_bot');

  if (variant === 'card') {
    return (
      <a
        href={TELEGRAM_INVITE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`group flex items-center gap-3 rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50 to-blue-50 p-4 hover:from-sky-100 hover:to-blue-100 hover:border-sky-300 transition-all ${className}`}
      >
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
          <Send size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-sky-700">
            Telegram
          </p>
          <p className="text-sm font-bold text-slate-800 truncate">
            {label ?? (isBotFallback ? `Chat dengan bot ${TELEGRAM_GROUP_LABEL}` : `Sertai grup ${TELEGRAM_GROUP_LABEL}`)}
          </p>
          {!dense && (
            <p className="text-[11px] text-slate-600 leading-snug mt-0.5">
              {isBotFallback
                ? 'Dapatkan pemberitahuan pinjaman & pemulangan terus dari bot rasmi.'
                : 'Dapatkan pemberitahuan pinjaman, pemulangan & pengumuman penting.'}
            </p>
          )}
        </div>
        <Send size={14} className="text-sky-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
      </a>
    );
  }

  // Compact variant — pill, single line, slot well in action sheets
  return (
    <a
      href={TELEGRAM_INVITE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center justify-center gap-2 w-full rounded-lg border border-sky-200 bg-sky-50 text-sky-800 px-3 py-2 text-[11px] font-bold uppercase tracking-widest hover:bg-sky-100 hover:border-sky-300 transition-all ${className}`}
    >
      <Megaphone size={12} />
      <span className="truncate">
        {label ?? (isBotFallback ? `Chat bot ${TELEGRAM_GROUP_LABEL}` : `Sertai grup ${TELEGRAM_GROUP_LABEL}`)}
      </span>
      <Send size={11} className="text-sky-600 shrink-0" />
    </a>
  );
}
