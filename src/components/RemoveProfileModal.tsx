import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Archive, ArchiveRestore, Trash2, AlertTriangle, ShieldAlert, PackageCheck, CalendarDays,
} from 'lucide-react';
import { Profile } from '../types';
import { ROLE_LABELS } from '../constants';

interface Props {
  open: boolean;
  profile: Profile | null;
  /** Booking counts for this profile, computed by the caller. */
  stats: { totalBookings: number; openLoans: number } | null;
  /** The admin performing the action — used to block self-removal. */
  actor: Profile | null;
  onClose: () => void;
  onArchive: (profile: Profile, archived: boolean) => Promise<string | null>;
  onDelete: (profile: Profile) => Promise<string | null>;
}

/** Typed into the danger-zone field to unlock a permanent delete. */
const DELETE_KEYWORD = 'PADAM';

/**
 * Admin removal of a staff profile — archive (reversible) or permanent delete.
 *
 * Archiving is the intended path for someone who has left the school: the
 * row survives, so their portfolio, achievements and booking history stay
 * queryable, and a mistake costs one click to undo. Permanent delete exists
 * for duplicates and junk profiles, and is deliberately harder to reach.
 *
 * Three guards, because this touches real staff records:
 *   1. You cannot remove your own profile (you'd lock yourself out mid-session).
 *   2. An open ICT loan blocks permanent delete — deleting the borrower
 *      would leave a unit out on loan with nobody to chase. Archive stays
 *      available, but says so.
 *   3. Permanent delete requires typing PADAM.
 */
export function RemoveProfileModal({
  open, profile, stats, actor, onClose, onArchive, onDelete,
}: Props) {
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDanger, setShowDanger] = useState(false);

  useEffect(() => {
    if (open) {
      setConfirmText('');
      setBusy(false);
      setError(null);
      setShowDanger(false);
    }
  }, [open, profile?.id]);

  if (!profile) return null;

  const isSelf = actor != null && actor.id === profile.id;
  const openLoans = stats?.openLoans ?? 0;
  const totalBookings = stats?.totalBookings ?? 0;
  const archived = profile.archived === true;
  const deleteBlocked = isSelf || openLoans > 0;
  const canDelete = !deleteBlocked && confirmText.trim().toUpperCase() === DELETE_KEYWORD;
  const initials = profile.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  const run = async (fn: () => Promise<string | null>) => {
    setBusy(true);
    setError(null);
    const err = await fn();
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
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
            onClick={busy ? undefined : onClose}
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
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white shrink-0">
                  <Archive size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold tracking-tight text-slate-800">Urus Profil Guru</h2>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                    Arkib atau Padam Kekal
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={busy}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 disabled:opacity-40"
              >
                <X size={18} />
              </button>
            </div>

            {/* Who */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.name} referrerPolicy="no-referrer" className="w-11 h-11 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-black shrink-0">
                    {initials}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800 truncate">{profile.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {ROLE_LABELS[profile.role] ?? profile.role}
                    {profile.department && ` • ${profile.department}`}
                  </p>
                </div>
                {archived && (
                  <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded bg-slate-200 text-slate-600 shrink-0">
                    Diarkib
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-200 text-[11px]">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <CalendarDays size={11} className="text-slate-400" />
                  <strong className="text-slate-800">{totalBookings}</strong> tempahan
                </span>
                <span className={`flex items-center gap-1.5 ${openLoans > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                  <PackageCheck size={11} className={openLoans > 0 ? 'text-rose-500' : 'text-slate-400'} />
                  <strong>{openLoans}</strong> pinjaman terbuka
                </span>
              </div>
            </div>

            {isSelf && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                <ShieldAlert size={14} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold text-amber-800 leading-relaxed">
                  Ini profil anda sendiri. Anda tidak boleh mengarkib atau
                  memadam profil yang sedang digunakan.
                </p>
              </div>
            )}

            {openLoans > 0 && !isSelf && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                <AlertTriangle size={14} className="text-rose-600 shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold text-rose-700 leading-relaxed">
                  Guru ini masih memegang <strong>{openLoans}</strong> unit ICT
                  yang belum dipulangkan. Selesaikan pemulangan di
                  <strong> Pinjaman ICT</strong> dahulu — padam kekal disekat
                  supaya unit itu tidak hilang jejak.
                </p>
              </div>
            )}

            {error && (
              <div className="bg-rose-50 border border-rose-100 rounded-lg p-3 mb-4 text-[11px] font-bold text-rose-700 flex items-start gap-2">
                <AlertTriangle size={13} className="shrink-0 mt-px" /> {error}
              </div>
            )}

            {/* Primary action — archive / restore */}
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-slate-200 bg-white">
                <p className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  {archived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
                  {archived ? 'Pulihkan Profil' : 'Arkib Profil'}
                  {!archived && (
                    <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Disyorkan
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-1">
                  {archived
                    ? 'Profil akan muncul semula dalam senarai pentadbir, laporan dan pemilihan profil.'
                    : 'Profil disembunyikan dari leaderboard, laporan dan senarai "Profil Sedia Ada". Rekod tempahan, portfolio dan pencapaian kekal — boleh dipulihkan bila-bila masa.'}
                </p>
                <button
                  onClick={() => void run(() => onArchive(profile, !archived))}
                  disabled={busy || isSelf}
                  className={`mt-3 w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-40 disabled:active:scale-100 ${
                    archived
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-900 text-white hover:bg-slate-700 shadow-md'
                  }`}
                >
                  {archived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
                  {busy ? 'Memproses...' : archived ? 'Pulihkan Profil' : 'Arkib Profil'}
                </button>
              </div>

              {/* Danger zone — permanent delete */}
              {!showDanger ? (
                <button
                  onClick={() => setShowDanger(true)}
                  disabled={busy}
                  className="w-full text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-rose-600 transition-colors py-2 disabled:opacity-40"
                >
                  Tunjuk pilihan padam kekal
                </button>
              ) : (
                <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 space-y-3">
                  <div>
                    <p className="text-xs font-bold text-rose-700 flex items-center gap-2">
                      <Trash2 size={13} /> Zon Bahaya — Padam Kekal
                    </p>
                    <p className="text-[11px] text-rose-600/80 leading-relaxed mt-1">
                      Baris profil dipadam terus dan <strong>tidak boleh
                      dipulihkan</strong>. Portfolio, pencapaian dan streak
                      guru ini hilang selama-lamanya.
                    </p>
                    <p className="text-[11px] text-slate-600 leading-relaxed mt-2">
                      <strong>{totalBookings} rekod tempahan kekal</strong> dalam
                      arkib dan laporan — nama pemohon disimpan pada setiap
                      tempahan, jadi sejarah tidak terjejas. Gunakan pilihan
                      ini untuk profil pendua atau ujian sahaja.
                    </p>
                  </div>

                  {!deleteBlocked && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-rose-700">
                        Taip <code className="font-mono bg-rose-100 px-1 rounded">{DELETE_KEYWORD}</code> untuk sahkan
                      </label>
                      <input
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder={DELETE_KEYWORD}
                        className="w-full px-3 py-2 rounded-lg border border-rose-300 text-sm font-bold tracking-widest uppercase focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all bg-white"
                      />
                    </div>
                  )}

                  <button
                    onClick={() => void run(() => onDelete(profile))}
                    disabled={!canDelete || busy}
                    className="w-full bg-gradient-to-r from-rose-500 to-red-600 text-white py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest hover:from-rose-600 hover:to-red-700 transition-all shadow-md shadow-rose-500/25 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-40 disabled:shadow-none disabled:active:scale-100 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={13} />
                    {busy ? 'Memadam...' : 'Padam Kekal Sekarang'}
                  </button>
                </div>
              )}

              <button
                onClick={onClose}
                disabled={busy}
                className="w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all disabled:opacity-40"
              >
                Kembali
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
