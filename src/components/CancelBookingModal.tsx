import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, Calendar, Clock, AlertTriangle, Shield, User } from 'lucide-react';
import { Booking, Profile } from '../types';

interface Props {
  open: boolean;
  booking: Booking | null;
  /** Display name of the resource being released (bilik / unit ICT). */
  resourceName: string;
  /** Who is performing the cancellation. */
  actor: Profile | null;
  onClose: () => void;
  onConfirm: (bookingId: string, reason: string) => void;
}

/** Reasons an admin typically cancels on someone else's behalf. */
const ADMIN_REASONS = [
  'Bilik/unit diperlukan untuk aktiviti sekolah',
  'Kerosakan / penyelenggaraan',
  'Pertindihan dengan tempahan lain',
  'Permintaan pemohon',
  'Tidak hadir / tidak digunakan',
];

const OWN_REASONS = [
  'Aktiviti dibatalkan',
  'Tukar tarikh',
  'Tidak jadi guna',
];

/**
 * Confirmation dialog for cancelling a booking or ICT loan.
 *
 * Replaces the old `prompt()` call. Beyond looking like the rest of the
 * app, the modal draws the distinction the prompt couldn't: when an
 * admin cancels a booking that belongs to someone else, a reason is
 * REQUIRED — that text is what the owner sees in the Telegram
 * "Dibatalkan oleh ... (admin)" message, so cancelling silently on
 * another teacher's behalf shouldn't be possible.
 */
export function CancelBookingModal({ open, booking, resourceName, actor, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('');
      setTouched(false);
    }
  }, [open, booking?.id]);

  if (!booking) return null;

  const isOwn = actor != null && booking.userId === actor.id;
  const byAdmin = !isOwn;
  const reasonRequired = byAdmin;
  const trimmed = reason.trim();
  const invalid = reasonRequired && trimmed.length === 0;
  const isLoan = booking.resourceType === 'equipment';
  const expectedReturn = booking.returnDate ?? booking.date;
  const presets = byAdmin ? ADMIN_REASONS : OWN_REASONS;

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (invalid) return;
    onConfirm(booking.id, trimmed);
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
            className="bg-white rounded-2xl w-full max-w-md p-6 sm:p-7 relative shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto scrollbar-hide"
          >
            <div className="flex justify-between items-start mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center text-white shrink-0">
                  <Trash2 size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold tracking-tight text-slate-800">
                    {isLoan ? 'Batalkan Pinjaman' : 'Batalkan Tempahan'}
                  </h2>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                    {byAdmin ? 'Tindakan Pentadbir' : 'Tempahan Anda'}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
                <X size={18} />
              </button>
            </div>

            {/* Booking summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 space-y-2">
              <p className="text-sm font-bold text-slate-800 leading-snug">{resourceName}</p>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <Calendar size={11} className="text-slate-400" />
                  <span className="text-slate-500">{isLoan ? 'Pinjam:' : 'Tarikh:'}</span>
                  <strong className="text-slate-800">{booking.date}</strong>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={11} className="text-slate-400" />
                  {isLoan ? (
                    <>
                      <span className="text-slate-500">Kembali:</span>
                      <strong className="text-slate-800">{expectedReturn}</strong>
                    </>
                  ) : (
                    <strong className="text-slate-800">
                      {booking.startTime} – {booking.endTime}
                    </strong>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-slate-600 pt-1 flex items-center gap-1.5">
                <User size={11} className="text-slate-400 shrink-0" />
                <span className="font-bold">Pemohon:</span> {booking.userName}
              </p>
              {booking.purpose && (
                <p className="text-[11px] text-slate-500 italic line-clamp-2">{booking.purpose}</p>
              )}
            </div>

            {byAdmin && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                <Shield size={14} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold text-amber-800 leading-relaxed">
                  Anda membatalkan tempahan milik <strong>{booking.userName}</strong>.
                  Sebab adalah wajib dan akan dihantar bersama pemberitahuan
                  pembatalan.
                </p>
              </div>
            )}

            <form onSubmit={handle} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Sebab Batal {reasonRequired ? <span className="text-rose-600">*wajib</span> : '(pilihan)'}
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  onBlur={() => setTouched(true)}
                  rows={3}
                  autoFocus
                  placeholder={byAdmin ? 'Contoh: Bilik diperlukan untuk mesyuarat guru' : 'Contoh: Aktiviti ditunda'}
                  className={`w-full px-3 py-2 rounded-lg border text-sm font-medium outline-none transition-all ${
                    touched && invalid
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                      : 'border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                  }`}
                />
                {touched && invalid && (
                  <p className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                    <AlertTriangle size={11} /> Sila nyatakan sebab pembatalan.
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {presets.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => { setReason(r); setTouched(true); }}
                      className="px-2.5 py-1 text-[10px] font-bold border border-slate-200 rounded-md text-slate-600 hover:border-rose-400 hover:bg-rose-50 hover:text-rose-700 transition-all"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-[10px] text-slate-400 leading-relaxed bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                Dibatalkan oleh <strong className="text-slate-600">{actor?.name ?? 'Pengguna'}</strong>
                {byAdmin && <strong className="text-amber-700"> (admin)</strong>}.
                Slot akan dilepaskan semula untuk tempahan baharu dan rekod
                kekal dalam arkib sebagai <strong className="text-rose-600">CANCELLED</strong>.
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={invalid}
                  className="flex-1 bg-gradient-to-r from-rose-500 to-red-600 text-white py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest hover:from-rose-600 hover:to-red-700 transition-all shadow-md shadow-rose-500/25 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-40 disabled:shadow-none disabled:active:scale-100 disabled:cursor-not-allowed"
                >
                  <Trash2 size={13} /> Sahkan Batal
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
