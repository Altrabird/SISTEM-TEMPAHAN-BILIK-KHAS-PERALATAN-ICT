import React, { useCallback, useEffect, useRef, useState } from 'react';
import { QrCode, Move } from 'lucide-react';

interface Props {
  onClick: () => void;
}

/**
 * Floating "Imbas QR" action button with long-press-to-move behaviour.
 *
 * Interaction model:
 *   - Tap (short press, no movement) → fire `onClick`
 *   - Long-press (~450ms held without moving) → enter drag mode (button
 *     glows + grows + small "move" indicator). User can then slide it
 *     anywhere on the screen.
 *   - Release → snap horizontally to the nearer edge, persist the
 *     `{ side, topPct }` pair so the position survives across sessions
 *     and viewport rotations.
 *
 * Smoothness note: while the user is dragging, position updates bypass
 * React entirely and mutate `style.left` / `style.top` on the DOM node
 * via a ref. We only commit to React state once, on drop. That keeps the
 * drag pinned to native 60fps even on lower-end Android browsers — the
 * earlier version called `setState` per `pointermove`, which queued a
 * full reconciliation on every frame and produced the stickiness the
 * user reported.
 */

const STORAGE_KEY = 'tempah.scanFab.pos';
const FAB_SIZE = 56;          // px — keep in sync with w-14/h-14 below
const EDGE_MARGIN = 16;
const LONG_PRESS_MS = 450;
const MOVE_THRESHOLD = 8;     // px — beyond this, treat as scroll, not long-press

type SavedPos = { side: 'left' | 'right'; topPct: number };
const DEFAULT_POS: SavedPos = { side: 'right', topPct: 78 };

function readSavedPos(): SavedPos {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_POS;
    const v = JSON.parse(raw);
    if ((v.side === 'left' || v.side === 'right') && typeof v.topPct === 'number') {
      return v;
    }
  } catch { /* noop */ }
  return DEFAULT_POS;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function DraggableScanFab({ onClick }: Props) {
  const [pos, setPos] = useState<SavedPos>(readSavedPos);
  const [isDragMode, setIsDragMode] = useState(false);
  // Force a re-render on viewport resize so the resting position stays valid
  const [, forceRender] = useState(0);

  const longPressTimer = useRef<number | null>(null);
  const startCoords = useRef<{ x: number; y: number } | null>(null);
  // Offset of the pointer from the button's top-left at the moment drag began
  const grabOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const movedDuringPress = useRef(false);
  const fabRef = useRef<HTMLButtonElement | null>(null);
  // Last drag position — written by pointermove (direct DOM), read on release
  const dragPosRef = useRef<{ x: number; y: number } | null>(null);
  // We track drag mode in a ref too so the synchronous pointermove handler
  // can see the latest value without waiting for a re-render.
  const dragModeRef = useRef(false);

  useEffect(() => {
    const onResize = () => forceRender((n) => n + 1);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  // Compute the resting (non-dragging) position from saved {side, topPct}
  const restingPosition = (): { top: number; left: number } => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const top = clamp((pos.topPct / 100) * vh, EDGE_MARGIN, vh - FAB_SIZE - EDGE_MARGIN);
    const left = pos.side === 'right' ? vw - FAB_SIZE - EDGE_MARGIN : EDGE_MARGIN;
    return { top, left };
  };

  const cancelLongPressTimer = () => {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  /** Write left/top to the FAB's DOM node directly — never goes through
   *  React. This is the hot path during a drag; calling setState here
   *  causes the stickiness the user saw on mid-range Android devices. */
  const writeDomPosition = (x: number, y: number) => {
    const node = fabRef.current;
    if (!node) return;
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    node.style.right = 'auto';
    node.style.bottom = 'auto';
    dragPosRef.current = { x, y };
  };

  const enterDragMode = useCallback(() => {
    dragModeRef.current = true;
    setIsDragMode(true);
    // Haptic feedback on Android; iOS Safari ignores this silently
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(35); } catch { /* noop */ }
    }
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== undefined && e.button !== 0) return;

    movedDuringPress.current = false;
    startCoords.current = { x: e.clientX, y: e.clientY };

    // Record grab offset against the button's current rendered rect so the
    // finger stays under the same spot when drag begins.
    const rect = fabRef.current?.getBoundingClientRect();
    if (rect) {
      grabOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    cancelLongPressTimer();
    longPressTimer.current = window.setTimeout(() => {
      longPressTimer.current = null;
      // Pin DOM position to the current rect *before* flipping state, so
      // the "switch to absolute coords" doesn't visually jump.
      const r = fabRef.current?.getBoundingClientRect();
      if (r) {
        dragPosRef.current = { x: r.left, y: r.top };
        writeDomPosition(r.left, r.top);
      }
      enterDragMode();
    }, LONG_PRESS_MS);

    try { (e.target as Element).setPointerCapture?.(e.pointerId); } catch { /* noop */ }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const start = startCoords.current;

    // Pre-drag-mode: cancel the long-press if the user moved (i.e. scrolling)
    if (!dragModeRef.current) {
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.abs(dx) > MOVE_THRESHOLD || Math.abs(dy) > MOVE_THRESHOLD) {
        movedDuringPress.current = true;
        cancelLongPressTimer();
      }
      return;
    }

    // In drag mode: direct DOM update — no React state churn
    e.preventDefault();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const x = clamp(e.clientX - grabOffset.current.x, EDGE_MARGIN, vw - FAB_SIZE - EDGE_MARGIN);
    const y = clamp(e.clientY - grabOffset.current.y, EDGE_MARGIN, vh - FAB_SIZE - EDGE_MARGIN);
    writeDomPosition(x, y);
  };

  const handlePointerUp = () => {
    const wasDragging = dragModeRef.current;
    const fired = longPressTimer.current !== null && !movedDuringPress.current;

    cancelLongPressTimer();

    if (wasDragging && dragPosRef.current) {
      // Snap horizontally to nearest edge + persist topPct
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const center = dragPosRef.current.x + FAB_SIZE / 2;
      const side: 'left' | 'right' = center < vw / 2 ? 'left' : 'right';
      const topPct = clamp((dragPosRef.current.y / vh) * 100, 5, 92);
      const next: SavedPos = { side, topPct };

      // Reset inline DOM overrides so React's resting style takes over
      const node = fabRef.current;
      if (node) {
        node.style.left = '';
        node.style.top = '';
        node.style.right = '';
        node.style.bottom = '';
      }
      dragPosRef.current = null;
      dragModeRef.current = false;
      setIsDragMode(false);
      setPos(next);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* noop */ }
      return;
    }

    dragModeRef.current = false;
    setIsDragMode(false);
    startCoords.current = null;

    // Treat as click only if the long-press timer hadn't fired yet
    // AND the user didn't scroll past the threshold.
    if (fired && !movedDuringPress.current) {
      onClick();
    }
  };

  const handlePointerCancel = () => {
    cancelLongPressTimer();
    // Clean DOM overrides if any
    const node = fabRef.current;
    if (node) {
      node.style.left = '';
      node.style.top = '';
      node.style.right = '';
      node.style.bottom = '';
    }
    dragPosRef.current = null;
    dragModeRef.current = false;
    setIsDragMode(false);
    startCoords.current = null;
    movedDuringPress.current = false;
  };

  // Resting style (used when NOT dragging). During drag the inline DOM
  // overrides set by writeDomPosition() win over these.
  const resting = restingPosition();
  const restingStyle: React.CSSProperties = {
    left: resting.left,
    top: resting.top,
    right: 'auto',
    bottom: 'auto',
    touchAction: isDragMode ? 'none' : 'manipulation',
    cursor: isDragMode ? 'grabbing' : 'pointer',
    // willChange hints the browser to promote to its own compositor layer,
    // which avoids the stuttery handoff when drag mode kicks in.
    willChange: 'left, top',
  };

  return (
    <button
      ref={fabRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onContextMenu={(e) => e.preventDefault()}
      className={`md:hidden fixed z-30 w-14 h-14 rounded-full text-white shadow-xl flex items-center justify-center transition-[transform,box-shadow] duration-150 select-none ${
        isDragMode
          ? 'bg-gradient-to-br from-pink-500 to-purple-700 shadow-purple-500/60 scale-110 ring-4 ring-purple-300/50'
          : 'bg-gradient-to-br from-purple-600 to-pink-600 shadow-purple-500/40 active:scale-95'
      }`}
      style={restingStyle}
      title={isDragMode ? 'Lepaskan untuk simpan kedudukan' : 'Imbas kod QR (tekan lama untuk gerak)'}
      aria-label="Imbas kod QR"
    >
      {isDragMode ? <Move size={20} /> : <QrCode size={22} />}
      {isDragMode && (
        <span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-black uppercase tracking-widest bg-slate-900/90 text-white px-2 py-0.5 rounded-md pointer-events-none">
          Geser
        </span>
      )}
    </button>
  );
}
