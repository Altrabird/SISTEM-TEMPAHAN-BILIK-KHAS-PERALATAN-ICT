import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lock, Unlock, Save } from 'lucide-react';
import { Asset } from '../types';

interface Props {
  open: boolean;
  asset: Asset | null;
  onClose: () => void;
  onSave: (asset: Asset) => void;
}

const PRESET_REASONS = [
  'Sedang dibaikpulih',
  'Rosak — menunggu pembaikan',
  'Hilang aksesori (charger/cable)',
  'Diasingkan untuk audit',
];

export function LockAssetModal({ open, asset, onClose, onSave }: Props) {
  const [reason, setReason] = useState('');
  const initiallyLocked = Boolean(asset?.lockedReason && asset.lockedReason.trim().length > 0);

  useEffect(() => {
    if (open && asset) {
      setReason(asset.lockedReason ?? '');
    }
  }, [open, asset]);

  if (!asset) return null;

  const trimmed = reason.trim();
  const willLock = trimmed.length > 0;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...asset,
      lockedReason: willLock ? trimmed : undefined,
    });
    onClose();
  };

  const unlock = () => {
    onSave({ ...asset, lockedReason: undefined });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-2xl w-full max-w-md p-6 sm:p-7 relative shadow-2xl border border-slate-200"
          >
            <div className="flex justify-between items-start mb-5">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${
                  initiallyLocked
                    ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                    : 'bg-gradient-to-br from-slate-700 to-slate-900'
                }`}>
                  {initiallyLocked ? <Lock size={18} /> : <Unlock size={18} />}
                </div>
                <div>
                  <h2 className="text-base font-bold tracking-tight text-slate-800">
                    {initiallyLocked ? 'Edit Kunci Unit' : 'Kunci Unit'}
                  </h2>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                    Hanya pentadbir
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4">
              <p className="text-sm font-bold text-slate-800">{asset.name}</p>
              <p className="text-[10px] font-mono text-blue-600 uppercase">{asset.serialNumber}</p>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-2">
                  Sebab / Alasan Kunci
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Contoh: Layar rosak, sedang dihantar untuk baik pulih"
                  autoFocus
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                />
                <p className="text-[10px] text-slate-500 mt-1.5 leading-snug">
                  Biarkan kosong untuk <strong>buka kunci</strong>. Mesej ini dipaparkan kepada pengguna.
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sebab Pantas</p>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(r)}
                      className="px-2.5 py-1 text-[10px] font-bold border border-slate-200 rounded-md text-slate-600 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700 transition-all"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                {initiallyLocked && (
                  <button
                    type="button"
                    onClick={unlock}
                    className="px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-1.5"
                  >
                    <Unlock size={13} /> Buka Kunci
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!willLock && !initiallyLocked}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${
                    willLock
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700'
                      : 'bg-slate-900 text-white hover:bg-slate-700'
                  }`}
                >
                  <Save size={13} /> {willLock ? 'Kunci Unit' : 'Simpan'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
