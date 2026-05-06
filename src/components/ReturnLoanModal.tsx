import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, PackageCheck, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { Asset, Booking, Profile, Resource } from '../types';
import { todayLocalISO } from '../lib/dates';

interface Props {
  open: boolean;
  booking: Booking | null;
  asset: Asset | null;
  category: Resource | null;
  admin: Profile | null;
  onClose: () => void;
  onConfirm: (booking: Booking, notes: string) => void;
}

const PRESET_NOTES = [
  'Diterima dalam keadaan baik',
  'Lengkap dengan charger / aksesori',
  'Layar / casing tergores ringan',
  'Aksesori tidak lengkap',
  'Rosak — perlu hantar baik pulih',
];

export function ReturnLoanModal({ open, booking, asset, category, admin, onClose, onConfirm }: Props) {
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) setNotes('');
  }, [open]);

  if (!booking) return null;

  const expectedReturn = booking.returnDate ?? booking.date;
  const today = todayLocalISO();
  const overdue = today > expectedReturn;
  const overdueDays = overdue
    ? Math.ceil((new Date(today).getTime() - new Date(expectedReturn).getTime()) / 86400000)
    : 0;

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(booking, notes.trim());
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
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white shrink-0">
                  <PackageCheck size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold tracking-tight text-slate-800">Tanda Sebagai Pulang</h2>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                    Pengesahan Pemulangan ICT
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
                <X size={18} />
              </button>
            </div>

            {/* Loan summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 space-y-2">
              <div className="flex items-start gap-3">
                {asset?.imageUrl ? (
                  <img src={asset.imageUrl} alt={asset.name} referrerPolicy="no-referrer" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                    <PackageCheck size={20} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{asset?.name ?? booking.resourceId}</p>
                  {asset && <p className="text-[10px] font-mono text-blue-600 uppercase">{asset.serialNumber}</p>}
                  {category && <p className="text-[10px] text-slate-500">{category.name}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div className="flex items-center gap-1.5">
                  <Calendar size={11} className="text-slate-400" />
                  <span className="text-slate-500">Pinjam:</span>
                  <strong className="text-slate-800">{booking.date}</strong>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={11} className="text-slate-400" />
                  <span className="text-slate-500">Patut kembali:</span>
                  <strong className={overdue ? 'text-rose-600' : 'text-slate-800'}>{expectedReturn}</strong>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 pt-1">
                <span className="font-bold">Peminjam:</span> {booking.userName}
              </p>
              <p className="text-[11px] text-slate-500 italic">
                {booking.purpose}
              </p>
            </div>

            {overdue && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                <AlertTriangle size={14} className="text-rose-600 shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold text-rose-700">
                  Lewat <strong>{overdueDays}</strong> hari daripada tarikh kembali yang dijanjikan.
                </p>
              </div>
            )}

            <form onSubmit={handle} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Nota Keadaan (pilihan)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Contoh: Aksesori lengkap, layar bersih"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                />
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_NOTES.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setNotes(n)}
                      className="px-2.5 py-1 text-[10px] font-bold border border-slate-200 rounded-md text-slate-600 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 transition-all"
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-[10px] text-slate-400 leading-relaxed bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                Pemulangan akan direkodkan oleh <strong className="text-slate-600">{admin?.name ?? 'Pentadbir'}</strong> pada {new Date().toLocaleString('ms-MY')}.
                Status loan akan ditukar kepada <strong className="text-emerald-700">PULANG</strong>.
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest hover:from-emerald-600 hover:to-green-700 transition-all shadow-md shadow-emerald-500/25 active:scale-95 flex items-center justify-center gap-2"
                >
                  <PackageCheck size={13} /> Sahkan Pulang
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
