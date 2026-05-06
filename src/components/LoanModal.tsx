import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertCircle, Laptop, Sparkles, Calendar, ScanLine } from 'lucide-react';
import { Asset, Booking, Profile, Resource } from '../types';
import { PURPOSE_PRESETS } from '../constants';
import { todayLocalISO, addDaysLocalISO, daysBetween } from '../lib/dates';

interface Props {
  open: boolean;
  asset: Asset | null;
  category: Resource | null;
  profile: Profile | null;
  /** Was this opened via QR scan (?loan= URL param)? Used for the eyebrow label. */
  fromQr?: boolean;
  onClose: () => void;
  onSubmit: (loan: {
    asset: Asset;
    purpose: string;
    startDate: string;
    returnDate: string;
  }) => string | null;
}

const PERIOD_PRESETS: { id: string; label: string; days: number }[] = [
  { id: '1d', label: '1 Hari', days: 1 },
  { id: '3d', label: '3 Hari', days: 3 },
  { id: '1w', label: '1 Minggu', days: 7 },
  { id: '2w', label: '2 Minggu', days: 14 },
  { id: 'custom', label: 'Pilih Tarikh', days: 0 },
];

// Date helpers are imported from ../lib/dates and are local-timezone safe.
const todayISO = todayLocalISO;
const addDaysISO = addDaysLocalISO;

export function LoanModal({ open, asset, category, profile, fromQr, onClose, onSubmit }: Props) {
  const [purposeCategory, setPurposeCategory] = useState('PdPc');
  const [purposeDetail, setPurposeDetail] = useState('');
  const [period, setPeriod] = useState<string>('1d');
  const [customReturn, setCustomReturn] = useState<string>(addDaysISO(todayISO(), 1));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPurposeCategory('PdPc');
      setPurposeDetail('');
      setPeriod('1d');
      setCustomReturn(addDaysISO(todayISO(), 1));
      setError(null);
    }
  }, [open]);

  const startDate = todayISO();
  const returnDate = useMemo(() => {
    if (period === 'custom') return customReturn;
    const preset = PERIOD_PRESETS.find((p) => p.id === period);
    return preset ? addDaysISO(startDate, preset.days) : addDaysISO(startDate, 1);
  }, [period, customReturn, startDate]);

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!asset) {
      setError('Tiada peralatan dipilih.');
      return;
    }
    if (!profile) {
      setError('Sila log masuk profil dulu.');
      return;
    }
    if (returnDate < startDate) {
      setError('Tarikh kembali tak boleh lebih awal daripada tarikh pinjam.');
      return;
    }
    const finalPurpose = purposeCategory === 'Lain-lain'
      ? purposeDetail
      : (purposeDetail ? `${purposeCategory}: ${purposeDetail}` : purposeCategory);

    const err = onSubmit({ asset, purpose: finalPurpose, startDate, returnDate });
    if (err) {
      setError(err);
    } else {
      onClose();
    }
  };

  if (!asset) return null;

  // "1 hari" preset = today + 1 day (return tomorrow). Display the gap
  // between dates without an off-by-one shift so the preset label and
  // the badge match.
  const totalDays = Math.max(1, daysBetween(startDate, returnDate));

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-6 sm:p-8 relative shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex justify-between items-start mb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white shrink-0">
                  {fromQr ? <ScanLine size={20} /> : <Laptop size={20} />}
                </div>
                <div>
                  <p className="text-[10px] text-purple-600 uppercase tracking-widest font-bold">
                    {fromQr ? 'QR Discan' : 'Pinjaman ICT'}
                  </p>
                  <h2 className="text-base font-bold tracking-tight text-slate-800 leading-tight">
                    Pinjam Pantas
                  </h2>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            {/* Asset card */}
            <div className="bg-gradient-to-br from-slate-50 to-purple-50 border border-slate-200 rounded-xl p-4 mb-5 flex items-center gap-3">
              {asset.imageUrl ? (
                <img src={asset.imageUrl} alt={asset.name} referrerPolicy="no-referrer" className="w-14 h-14 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                  <Laptop size={22} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">{asset.name}</p>
                <p className="text-[10px] font-mono text-blue-600 uppercase">{asset.serialNumber}</p>
                <p className="text-[10px] text-slate-500 truncate">{category?.name ?? ''}</p>
              </div>
            </div>

            <form onSubmit={handle} className="space-y-5">
              {error && (
                <div className="bg-rose-50 border border-rose-100 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle size={14} className="text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-rose-700">{error}</p>
                </div>
              )}

              {/* Tujuan */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tujuan</label>
                <div className="grid grid-cols-2 gap-2">
                  {PURPOSE_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPurposeCategory(p)}
                      className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                        purposeCategory === p
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-blue-400 hover:text-blue-600'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                {(purposeCategory === 'Lain-lain' || purposeCategory !== 'PdPc') && (
                  <input
                    type="text"
                    value={purposeDetail}
                    onChange={(e) => setPurposeDetail(e.target.value)}
                    placeholder={purposeCategory === 'Lain-lain' ? 'Sila nyatakan...' : 'Perincian tambahan (pilihan)'}
                    required={purposeCategory === 'Lain-lain'}
                    className="w-full mt-2 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                  />
                )}
              </div>

              {/* Tempoh */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tempoh Pinjaman</label>
                <div className="grid grid-cols-3 gap-2">
                  {PERIOD_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPeriod(p.id)}
                      className={`px-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                        period === p.id
                          ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-purple-400 hover:text-purple-600'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {period === 'custom' && (
                  <input
                    type="date"
                    value={customReturn}
                    min={startDate}
                    onChange={(e) => setCustomReturn(e.target.value)}
                    required
                    className="w-full mt-2 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 outline-none transition-all"
                  />
                )}
              </div>

              {/* Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                <Calendar size={18} className="text-slate-400 shrink-0" />
                <div className="text-xs text-slate-600 leading-relaxed">
                  Pinjam: <strong>{startDate}</strong> → Kembali: <strong>{returnDate}</strong>
                  <span className="text-[10px] text-slate-400 ml-2">({totalDays} hari)</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3.5 rounded-lg text-sm font-bold uppercase tracking-widest hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg shadow-purple-500/25 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Sparkles size={14} /> Pinjam Sekarang
              </button>

              {profile && (
                <p className="text-[10px] text-slate-400 text-center">
                  Direkodkan atas nama <strong>{profile.name}</strong>
                </p>
              )}
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
