import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Save, DoorOpen, Laptop, Image as ImageIcon, Camera, Trash2, Loader2, AlertCircle, Lock, Unlock, AlertTriangle
} from 'lucide-react';
import { Resource } from '../types';
import { uploadResourceImage } from '../lib/storage';
import { isSupabaseEnabled } from '../lib/supabase';

interface Props {
  open: boolean;
  resource: Resource | null;
  onClose: () => void;
  onSave: (r: Resource) => void;
  /** Admin-only delete callback. Returns `true` if the delete went
   *  through (so the modal closes); `false` if cancelled or failed. */
  onDelete?: (r: Resource) => Promise<boolean>;
}

export function EditResourceModal({ open, resource, onClose, onSave, onDelete }: Props) {
  const [draft, setDraft] = useState<Resource | null>(resource);
  const [savedFlash, setSavedFlash] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setDraft(resource);
      setSavedFlash(false);
      setUploadError(null);
      setDeleting(false);
    }
  }, [open, resource]);

  if (!draft) return null;

  const isRoom = draft.type === 'room';
  const Icon = isRoom ? DoorOpen : Laptop;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    const { url, error } = await uploadResourceImage(file, { id: draft.id, type: draft.type });
    setUploading(false);
    if (error || !url) {
      setUploadError(error ?? 'Muat naik gagal.');
      return;
    }
    setDraft({ ...draft, imageUrl: url });
  };

  const removeImage = () => {
    setDraft({ ...draft, imageUrl: undefined });
    setUploadError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) return;
    // Normalise lockedReason: empty/whitespace = not locked
    const cleaned: Resource = {
      ...draft,
      lockedReason: draft.lockedReason && draft.lockedReason.trim().length > 0
        ? draft.lockedReason.trim()
        : undefined,
    };
    onSave(cleaned);
    setSavedFlash(true);
    setTimeout(() => {
      setSavedFlash(false);
      onClose();
    }, 700);
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
            className="bg-white rounded-2xl w-full max-w-lg p-8 relative shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto scrollbar-hide"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${
                  isRoom
                    ? 'bg-gradient-to-br from-blue-600 to-indigo-600'
                    : 'bg-gradient-to-br from-purple-600 to-pink-600'
                }`}>
                  <Icon size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-slate-800">
                    Edit {isRoom ? 'Bilik Khas' : 'Peralatan ICT'}
                  </h2>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                    Hanya pentadbir
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Nama">
                <input
                  required
                  type="text"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="er-input"
                  placeholder={isRoom ? 'Contoh: Makmal Komputer 1' : 'Contoh: Laptop Murid'}
                />
              </Field>

              <Field label={`Gambar ${isRoom ? 'Bilik' : 'Peralatan'} (pilihan)`}>
                <input
                  ref={galleryRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFile}
                />
                <input
                  ref={cameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFile}
                />

                <div className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                  <div className="relative w-full h-44 bg-slate-100">
                    {draft.imageUrl ? (
                      <img
                        src={draft.imageUrl}
                        alt={draft.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                        <Icon size={48} />
                        <p className="text-[11px] font-bold uppercase tracking-widest">Tiada gambar</p>
                      </div>
                    )}
                    {uploading && (
                      <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center gap-2 text-white">
                        <Loader2 size={20} className="animate-spin" />
                        <span className="text-xs font-bold uppercase tracking-widest">Memuat naik...</span>
                      </div>
                    )}
                  </div>

                  <div className="p-3 space-y-2 bg-white border-t border-slate-100">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={uploading || !isSupabaseEnabled}
                        onClick={() => galleryRef.current?.click()}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-[11px] font-bold uppercase tracking-widest text-slate-700 hover:border-blue-500 hover:text-blue-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ImageIcon size={13} /> Galeri
                      </button>
                      <button
                        type="button"
                        disabled={uploading || !isSupabaseEnabled}
                        onClick={() => cameraRef.current?.click()}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-[11px] font-bold uppercase tracking-widest text-slate-700 hover:border-blue-500 hover:text-blue-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Camera size={13} /> Kamera
                      </button>
                    </div>
                    {draft.imageUrl && !uploading && (
                      <button
                        type="button"
                        onClick={removeImage}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={11} /> Buang Gambar
                      </button>
                    )}
                    {!isSupabaseEnabled && (
                      <p className="text-[10px] text-amber-600 leading-snug">
                        Supabase tidak dikonfig — muat naik tidak tersedia.
                      </p>
                    )}
                  </div>
                </div>

                {uploadError && (
                  <div className="mt-2 bg-rose-50 border border-rose-100 rounded-lg p-2 flex items-start gap-2">
                    <AlertCircle size={12} className="text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] font-bold text-rose-700 leading-snug">{uploadError}</p>
                  </div>
                )}
              </Field>

              <Field label="Penerangan / Maklumat untuk Guru">
                <textarea
                  value={draft.description ?? ''}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  rows={3}
                  className="er-input resize-none"
                  placeholder={isRoom
                    ? 'Contoh: Bilik dengan 40 PC desktop, projektor, papan putih digital. Sesuai untuk PdPc TMK & ujian online.'
                    : 'Contoh: Untuk pinjaman jangka pendek bagi aktiviti PdPc dan kerja kursus.'}
                />
              </Field>

              <div className="grid grid-cols-1">
                <Field label={isRoom ? 'Muatan (Pax)' : 'Kuantiti'}>
                  <input
                    type="number"
                    min={0}
                    value={isRoom ? (draft.capacity ?? '') : (draft.quantity ?? '')}
                    onChange={(e) => {
                      const v = e.target.value === '' ? undefined : Number(e.target.value);
                      setDraft(isRoom ? { ...draft, capacity: v } : { ...draft, quantity: v });
                    }}
                    className="er-input"
                    placeholder="0"
                  />
                </Field>
              </div>

              {/* Lock controls */}
              <div className={`rounded-xl border p-4 space-y-3 transition-colors ${
                draft.lockedReason ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {draft.lockedReason ? (
                      <Lock size={14} className="text-amber-600 shrink-0" />
                    ) : (
                      <Unlock size={14} className="text-slate-500 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800">
                        {draft.lockedReason ? 'Sumber Dikunci' : 'Sumber Terbuka'}
                      </p>
                      <p className="text-[10px] text-slate-500 leading-snug">
                        {draft.lockedReason
                          ? 'Pengguna tak boleh tempah / pinjam.'
                          : `Pengguna boleh ${isRoom ? 'tempah bilik' : 'lihat senarai unit'} ini.`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDraft({
                      ...draft,
                      lockedReason: draft.lockedReason ? undefined : '',
                    })}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all shrink-0 ${
                      draft.lockedReason
                        ? 'bg-white border border-amber-300 text-amber-700 hover:bg-amber-100'
                        : 'bg-slate-900 text-white hover:bg-slate-700'
                    }`}
                  >
                    {draft.lockedReason ? 'Buka' : 'Kunci'}
                  </button>
                </div>

                {draft.lockedReason !== undefined && (
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-1 block">
                      Sebab / Penerangan untuk Pengguna *
                    </label>
                    <textarea
                      value={draft.lockedReason ?? ''}
                      onChange={(e) => setDraft({ ...draft, lockedReason: e.target.value })}
                      rows={2}
                      placeholder={isRoom
                        ? 'Contoh: Ujian Online minggu ini (3-7 Mei). Sila guna Bilik Akses sahaja.'
                        : 'Contoh: Sedang dipinjam pukal untuk Hari Sukan. Tersedia 12 Mei.'}
                      className="w-full px-3 py-2 rounded-lg border border-amber-300 text-sm bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                      autoFocus
                    />
                    <p className="text-[10px] text-amber-700 mt-1 leading-snug">
                      Mesej ini akan dipaparkan kepada pengguna pada kad sumber.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={!draft.name.trim() || uploading || deleting}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg text-sm font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Save size={14} /> {savedFlash ? 'Disimpan!' : 'Simpan'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={deleting}
                  className="px-5 py-3 rounded-lg text-xs font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all disabled:opacity-40"
                >
                  Batal
                </button>
              </div>

              {/* Danger zone — delete the entire room/category. Cascades
                  for equipment (deletes child assets too); rooms only
                  affect historical bookings via raw-id fallback. */}
              {onDelete && (
                <div className="mt-4 pt-4 border-t border-rose-100">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-rose-700 mb-2 flex items-center gap-1.5">
                    <AlertTriangle size={11} /> Zon Bahaya
                  </p>
                  <button
                    type="button"
                    disabled={deleting || uploading}
                    onClick={async () => {
                      setDeleting(true);
                      const ok = await onDelete(draft);
                      setDeleting(false);
                      if (ok) onClose();
                    }}
                    className="w-full bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    {deleting
                      ? 'Memadam...'
                      : `Padam ${isRoom ? 'Bilik' : 'Kategori'} Ini`}
                  </button>
                  <p className="text-[10px] text-rose-600/80 mt-2 leading-snug">
                    {isRoom
                      ? 'Bilik akan hilang sepenuhnya dari sistem. Rekod tempahan lama kekal sebagai sejarah.'
                      : 'Semua unit dalam kategori ini akan dipadam sekali. Tindakan tidak boleh dipulihkan.'}
                  </p>
                </div>
              )}
            </form>

            <style>{`
              .er-input {
                width: 100%;
                padding: 0.625rem 1rem;
                border-radius: 0.5rem;
                border: 1px solid rgb(226 232 240);
                font-size: 0.875rem;
                font-weight: 500;
                outline: none;
                transition: all 0.15s;
                background: white;
              }
              .er-input:focus {
                border-color: rgb(59 130 246);
                box-shadow: 0 0 0 4px rgb(59 130 246 / 0.1);
              }
            `}</style>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</label>
      {children}
    </div>
  );
}
