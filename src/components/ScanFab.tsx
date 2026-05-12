import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QrCode } from 'lucide-react';

interface Props {
  onClick: () => void;
}

const HINT_DISMISSED_KEY = 'tempah.scanFab.hintDismissed';

/**
 * Floating "Imbas QR" button.
 *
 * Fixed at the bottom-right (above the mobile bottom nav). To draw the
 * user's attention without being annoying:
 *
 *   - Two pulsing halo rings emanate outward continuously (slow, low-
 *     opacity — feels like a heartbeat rather than a strobe).
 *   - A small instruction tooltip appears on the user's first visit
 *     for ~6 seconds, then auto-hides. We remember the dismissal in
 *     localStorage so it doesn't keep nagging on every page load.
 *
 * (Replaces the earlier draggable version — on real Android phones the
 * drag stutter caused by per-frame React reconciliation made the
 * interaction worse than a fixed position.)
 */
export function ScanFab({ onClick }: Props) {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(HINT_DISMISSED_KEY);
      if (dismissed === '1') return;
    } catch { /* noop */ }

    // Show the hint after a brief delay so it feels intentional, not jarring
    const showTimer = window.setTimeout(() => setShowHint(true), 600);
    const hideTimer = window.setTimeout(() => {
      setShowHint(false);
      try { localStorage.setItem(HINT_DISMISSED_KEY, '1'); } catch { /* noop */ }
    }, 7000);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  const handleClick = () => {
    // Any tap permanently dismisses the hint — they've discovered the button
    if (showHint) {
      setShowHint(false);
      try { localStorage.setItem(HINT_DISMISSED_KEY, '1'); } catch { /* noop */ }
    }
    onClick();
  };

  return (
    <div className="md:hidden fixed right-4 bottom-20 z-30 flex items-center pointer-events-none">
      {/* Instruction tooltip — peeks in to the LEFT of the FAB */}
      <AnimatePresence>
        {showHint && (
          <motion.div
            initial={{ opacity: 0, x: 12, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 12, scale: 0.9 }}
            transition={{ duration: 0.25 }}
            className="relative mr-3 pointer-events-auto"
          >
            <div className="bg-slate-900 text-white px-3 py-2 rounded-xl shadow-xl max-w-[200px]">
              <p className="text-[11px] font-bold leading-snug">
                Imbas QR di sini untuk
                <br />
                <span className="text-purple-300">pinjam alat / tempah bilik</span>
              </p>
            </div>
            {/* Speech-bubble tail pointing right toward the FAB */}
            <span className="absolute right-[-5px] top-1/2 -translate-y-1/2 w-3 h-3 bg-slate-900 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* The FAB itself + the animated halo rings */}
      <div className="relative pointer-events-auto">
        {/* Pulsing halo rings — purely decorative, won't intercept taps */}
        <span className="absolute inset-0 rounded-full pointer-events-none">
          <motion.span
            className="absolute inset-0 rounded-full bg-purple-500/35"
            animate={{ scale: [1, 1.7], opacity: [0.55, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
          />
          <motion.span
            className="absolute inset-0 rounded-full bg-pink-500/30"
            animate={{ scale: [1, 1.7], opacity: [0.5, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut', delay: 1.1 }}
          />
        </span>

        <motion.button
          onClick={handleClick}
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className="relative w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-xl shadow-purple-500/40 flex items-center justify-center active:shadow-purple-500/60 transition-shadow"
          title="Imbas kod QR"
          aria-label="Imbas kod QR"
        >
          <QrCode size={22} />
        </motion.button>
      </div>
    </div>
  );
}
