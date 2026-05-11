import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, PackageCheck, Loader2, Laptop } from 'lucide-react';
import { Asset, Booking, Resource } from '../types';

interface PickedItem {
  booking: Booking;
  asset?: Asset;
  category?: Resource;
}

interface Props {
  open: boolean;
  items: PickedItem[];
  onClose: () => void;
  onConfirm: (notes: string) => Promise<number>;
}

const PRESET_NOTES = [
  'Diterima dalam keadaan baik',
  'Lengkap dengan charger / aksesori',
  'Aksesori tidak lengkap',
  'Layar / casing tergores ringan',
];

export function BulkReturnModal({ open, items, onClose, onConfirm }: Props) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setNotes('');
      setLoading(false);
    }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await onConfirm(notes.trim());
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={loading ? undefined : onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-2xl w-full max-w-md p-6 sm:p-7 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto scrollbar-hide"
          >
            <div className="flex justify-between items-start mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white shrink-0">
                  <PackageCheck size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold tracking-tight text-slate-800">Pemulangan Pukal</h2>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                    {items.length} unit dipilih
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={loading}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 disabled:opacity-40"
              >
                <X size={18} />
              </button>
            </div>

            {/* Items list (capped at first ~6 with "+N lagi") */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 max-h-48 overflow-y-auto scrollbar-hide">
              <ul className="space-y-1.5">
                {items.slice(0, 8).map(({ booking, asset, category }) => (
                  <li key={booking.id} className="flex items-center gap-2 text-[11px]">
                    {asset?.imageUrl ? (
                      <img src={asset.imageUrl} alt={asset.name} referrerPolicy="no-referrer" className="w-7 h-7 rounded object-cover shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                        <Laptop size={12} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 truncate">{asset?.name ?? booking.resourceId}</p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {category?.name ?? ''}
                        {asset?.serialNumber ? ` · ${asset.serialNumber}` : ''}
                      </p>
                    </div>
                  </li>
                ))}
                {items.length > 8 && (
                  <li className="text-[10px] text-slate-500 text-center pt-1 italic">
                    +{items.length - 8} unit lagi
                  </li>
                )}
              </ul>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block">
                  Nota keadaan (dikongsi untuk semua unit)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Contoh: Semua unit dalam keadaan baik, lengkap dengan charger"
                  disabled={loading}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all disabled:opacity-60"
                />
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_NOTES.map((n) => (
                    <button
                      key={n}
                      type="button"
                      disabled={loading}
                      onClick={() => setNotes(n)}
                      className="px-2.5 py-1 text-[10px] font-bold border border-slate-200 rounded-md text-slate-600 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 transition-all disabled:opacity-40"
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-[10px] text-slate-500 leading-relaxed bg-emerald-50 border border-emerald-100 rounded-lg p-2.5">
                <strong>{items.length} unit</strong> akan ditanda sebagai pulang sekaligus.
                Notifikasi Telegram dihantar <strong>SEKALI sahaja</strong> dengan senarai semua unit.
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all disabled:opacity-40"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading || items.length === 0}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest hover:from-emerald-600 hover:to-green-700 transition-all shadow-md shadow-emerald-500/25 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-wait"
                >
                  {loading ? <Loader2 size={13} className="animate-spin" /> : <PackageCheck size={13} />}
                  {loading ? 'Memproses...' : `Sahkan Pulang ${items.length} Unit`}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
