import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, UserCog, Image as ImageIcon, Camera, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { Profile } from '../types';
import { ROLE_LABELS } from '../constants';
import { uploadAvatar } from '../lib/storage';
import { isSupabaseEnabled } from '../lib/supabase';

interface Props {
  open: boolean;
  profile: Profile;
  isAdmin: boolean;
  onClose: () => void;
  onSave: (p: Profile) => void;
}

export function EditProfileModal({ open, profile, isAdmin, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<Profile>(profile);
  const [savedFlash, setSavedFlash] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setDraft(profile);
      setSavedFlash(false);
      setUploadError(null);
    }
  }, [open, profile]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    const { url, error } = await uploadAvatar(file, draft.id);
    setUploading(false);
    if (error || !url) {
      setUploadError(error ?? 'Muat naik gagal.');
      return;
    }
    setDraft({ ...draft, avatarUrl: url });
  };

  const removeAvatar = () => {
    setDraft({ ...draft, avatarUrl: undefined });
    setUploadError(null);
  };

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) return;
    onSave({ ...draft, lastActiveAt: Date.now() });
    setSavedFlash(true);
    setTimeout(() => {
      setSavedFlash(false);
      onClose();
    }, 700);
  };

  const initials = draft.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

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
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0">
                  <UserCog size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-slate-800">Edit Profil</h2>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Maklumat asas anda</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handle} className="space-y-4">
              <Field label="Nama Penuh *">
                <input
                  required
                  type="text"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="ep-input"
                  placeholder="Contoh: Cikgu Aishah"
                />
              </Field>
              <Field label="Emel">
                <input
                  value={draft.email ?? ''}
                  onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                  className="ep-input"
                  placeholder="contoh@moe.gov.my"
                  type="email"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Peranan">
                  {isAdmin ? (
                    <select
                      value={draft.role}
                      onChange={(e) => setDraft({ ...draft, role: e.target.value as Profile['role'] })}
                      className="ep-input"
                    >
                      {Object.entries(ROLE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="ep-input bg-slate-50 text-slate-500 cursor-not-allowed flex items-center justify-between">
                      <span>{ROLE_LABELS[draft.role] ?? draft.role}</span>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Hanya Pentadbir</span>
                    </div>
                  )}
                </Field>
                <Field label="Jabatan / Panitia">
                  <input
                    value={draft.department ?? ''}
                    onChange={(e) => setDraft({ ...draft, department: e.target.value })}
                    className="ep-input"
                    placeholder="Contoh: Sains"
                  />
                </Field>
              </div>
              <Field label="Gambar Profil (pilihan)">
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
                  capture="user"
                  className="hidden"
                  onChange={handleFile}
                />
                <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="relative shrink-0">
                    {draft.avatarUrl ? (
                      <img
                        src={draft.avatarUrl}
                        alt={draft.name}
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 rounded-full object-cover border-2 border-white shadow"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-lg font-black border-2 border-white shadow">
                        {initials || '?'}
                      </div>
                    )}
                    {uploading && (
                      <div className="absolute inset-0 bg-slate-900/60 rounded-full flex items-center justify-center">
                        <Loader2 size={20} className="text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
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
                    {draft.avatarUrl && !uploading && (
                      <button
                        type="button"
                        onClick={removeAvatar}
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
                    {!draft.avatarUrl && !uploadError && isSupabaseEnabled && (
                      <p className="text-[10px] text-slate-500 leading-snug">
                        Saiz auto-kecilkan kepada 512px. JPG/PNG.
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
              <Field label="Bio Ringkas">
                <textarea
                  value={draft.bio ?? ''}
                  onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
                  rows={2}
                  className="ep-input resize-none"
                  placeholder="Contoh: Guru Sains, suka eksperimen praktikal."
                />
              </Field>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={!draft.name.trim()}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg text-sm font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Save size={14} /> {savedFlash ? 'Disimpan!' : 'Simpan Profil'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-3 rounded-lg text-xs font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all"
                >
                  Batal
                </button>
              </div>
            </form>

            <style>{`
              .ep-input {
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
              .ep-input:focus {
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
