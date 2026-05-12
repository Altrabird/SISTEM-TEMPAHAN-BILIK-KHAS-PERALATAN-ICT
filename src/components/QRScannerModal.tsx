import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, QrCode, Camera, RefreshCw, AlertCircle, Keyboard, Check } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface Props {
  open: boolean;
  /** Called once a code is successfully decoded. Receives the raw payload. */
  onScan: (raw: string) => void;
  onClose: () => void;
}

const REGION_ID = 'qr-scanner-region';

/**
 * Camera-driven QR scanner.
 *
 * The component lazily starts the scanner only when `open === true`, and
 * always stops + releases the camera on unmount / close. Two modes:
 *   - `camera`: live video preview with continuous scanning
 *   - `manual`: type the asset/room id (e.g. `ast-1`) by hand for cases
 *                where the camera is unavailable or the sticker is damaged
 */
export function QRScannerModal({ open, onScan, onClose }: Props) {
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [manualValue, setManualValue] = useState('');
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  // Always call the latest onScan even if it changes between renders.
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  // Reset state every time the modal opens
  useEffect(() => {
    if (open) {
      setMode('camera');
      setError(null);
      setManualValue('');
    }
  }, [open]);

  // Start/stop the camera as `open` and `facing` change
  useEffect(() => {
    if (!open || mode !== 'camera') return;

    let cancelled = false;
    setStarting(true);
    setError(null);

    const start = async () => {
      try {
        // Tear down any previous instance first
        if (scannerRef.current) {
          try {
            await scannerRef.current.stop();
            await scannerRef.current.clear();
          } catch { /* noop */ }
          scannerRef.current = null;
        }

        const node = document.getElementById(REGION_ID);
        if (!node) {
          setError('Tidak dapat memuatkan kamera. Cuba semula.');
          setStarting(false);
          return;
        }

        const scanner = new Html5Qrcode(REGION_ID, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: facing },
          {
            fps: 10,
            qrbox: (vw, vh) => {
              const min = Math.min(vw, vh);
              const side = Math.floor(min * 0.7);
              return { width: side, height: side };
            },
            aspectRatio: 1.3333,
          },
          (decoded) => {
            if (cancelled) return;
            // Stop the camera before bubbling up so the next modal isn't
            // competing for the stream.
            void (async () => {
              try {
                if (scannerRef.current) {
                  await scannerRef.current.stop();
                  await scannerRef.current.clear();
                  scannerRef.current = null;
                }
              } catch { /* noop */ }
              onScanRef.current(decoded);
            })();
          },
          () => { /* per-frame failures are routine; ignore */ },
        );

        if (cancelled) {
          // Component unmounted before start() resolved
          try {
            await scanner.stop();
            await scanner.clear();
          } catch { /* noop */ }
          scannerRef.current = null;
        }
        setStarting(false);
      } catch (e: any) {
        if (cancelled) return;
        const msg = String(e?.message ?? e ?? 'Tidak dapat akses kamera.');
        // Most common: NotAllowedError (permission denied), NotFoundError
        if (/Permission|NotAllowed|denied/i.test(msg)) {
          setError('Kebenaran kamera ditolak. Sila benarkan akses kamera dalam tetapan pelayar.');
        } else if (/NotFound|no camera/i.test(msg)) {
          setError('Tiada kamera dijumpai pada peranti ini.');
        } else {
          setError(msg);
        }
        setStarting(false);
      }
    };

    void start();

    return () => {
      cancelled = true;
      if (scannerRef.current) {
        const s = scannerRef.current;
        scannerRef.current = null;
        void (async () => {
          try { await s.stop(); } catch { /* noop */ }
          try { await s.clear(); } catch { /* noop */ }
        })();
      }
    };
  }, [open, mode, facing]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = manualValue.trim();
    if (!v) return;
    onScanRef.current(v);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-slate-900 text-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-800 overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 py-4 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                  <QrCode size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-purple-200/80">Imbas QR</p>
                  <h2 className="text-sm font-bold tracking-tight">Pengimbas Kod QR</h2>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                title="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            {/* Mode tabs */}
            <div className="px-5 pt-3 flex gap-2">
              <button
                onClick={() => setMode('camera')}
                className={`flex-1 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'camera'
                    ? 'bg-white text-slate-900'
                    : 'bg-white/10 text-white/70 hover:bg-white/15'
                }`}
              >
                <Camera size={12} /> Kamera
              </button>
              <button
                onClick={() => setMode('manual')}
                className={`flex-1 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'manual'
                    ? 'bg-white text-slate-900'
                    : 'bg-white/10 text-white/70 hover:bg-white/15'
                }`}
              >
                <Keyboard size={12} /> Manual
              </button>
            </div>

            {/* Body */}
            <div className="p-5">
              {mode === 'camera' && (
                <div className="space-y-3">
                  <div className="relative bg-black rounded-xl overflow-hidden aspect-square">
                    <div id={REGION_ID} className="absolute inset-0 [&_video]:!w-full [&_video]:!h-full [&_video]:object-cover" />
                    {/* Corner brackets overlay */}
                    {!starting && !error && (
                      <>
                        <div className="absolute top-4 left-4 w-10 h-10 border-l-4 border-t-4 border-purple-400 rounded-tl-lg pointer-events-none" />
                        <div className="absolute top-4 right-4 w-10 h-10 border-r-4 border-t-4 border-purple-400 rounded-tr-lg pointer-events-none" />
                        <div className="absolute bottom-4 left-4 w-10 h-10 border-l-4 border-b-4 border-purple-400 rounded-bl-lg pointer-events-none" />
                        <div className="absolute bottom-4 right-4 w-10 h-10 border-r-4 border-b-4 border-purple-400 rounded-br-lg pointer-events-none" />
                      </>
                    )}
                    {starting && (
                      <div className="absolute inset-0 flex items-center justify-center text-white/70 text-xs font-bold uppercase tracking-widest">
                        <RefreshCw size={14} className="animate-spin mr-2" /> Memuat kamera...
                      </div>
                    )}
                    {error && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center">
                        <AlertCircle size={28} className="text-rose-400 mb-2" />
                        <p className="text-xs font-bold text-rose-300 leading-relaxed">{error}</p>
                        <button
                          onClick={() => setMode('manual')}
                          className="mt-4 text-[10px] font-bold uppercase tracking-widest text-white/80 underline"
                        >
                          Masukkan manual sahaja
                        </button>
                      </div>
                    )}
                  </div>

                  {!error && (
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] text-white/60 leading-relaxed">
                        Halakan kamera ke kod QR pada unit.
                      </p>
                      <button
                        onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
                        className="shrink-0 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-all"
                        title="Tukar kamera"
                      >
                        <RefreshCw size={11} /> Tukar
                      </button>
                    </div>
                  )}
                </div>
              )}

              {mode === 'manual' && (
                <form onSubmit={handleManualSubmit} className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                      ID Unit (cth: ast-1) atau URL penuh
                    </label>
                    <input
                      autoFocus
                      value={manualValue}
                      onChange={(e) => setManualValue(e.target.value)}
                      placeholder="ast-1 atau https://tempah.altrabird.click/?loan=ast-1"
                      className="w-full mt-1.5 px-3 py-2.5 rounded-lg bg-white/10 border border-white/15 text-sm font-medium text-white placeholder-white/30 focus:bg-white/15 focus:border-purple-400 outline-none transition-all"
                    />
                    <p className="text-[10px] text-white/50 mt-1.5 leading-relaxed">
                      Sesuai jika sticker rosak atau kamera tidak berfungsi.
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={manualValue.trim().length === 0}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg shadow-purple-500/30 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Check size={14} /> Teruskan
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Extract a known id (`ast-X` or `room-X`) from a raw QR payload. The
 *  printed stickers encode a full URL like
 *  `https://tempah.altrabird.click/?loan=ast-3` — pull the `?loan=` param
 *  first, then fall back to id-shaped substrings, then fall back to the
 *  trimmed raw text so manual entry of just `ast-3` still works. */
export function parseScannedId(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  // 1. Full URL with ?loan=
  try {
    const u = new URL(trimmed);
    const loan = u.searchParams.get('loan');
    if (loan) return loan;
  } catch { /* not a URL */ }
  // 2. Bare id shape
  const m = trimmed.match(/\b(ast-[A-Za-z0-9_-]+|room-[A-Za-z0-9_-]+|eq-[A-Za-z0-9_-]+)\b/);
  if (m) return m[1];
  // 3. Anything else — assume the user typed a raw id
  return trimmed;
}
