import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Save, Pencil, Image as ImageIcon, Camera, Trash2, Loader2, AlertCircle, Laptop,
  Lock, Unlock, KeyRound,
} from 'lucide-react';
import { Asset, Resource } from '../types';
import { uploadAssetImage } from '../lib/storage';
import { isSupabaseEnabled } from '../lib/supabase';

interface Props {
  open: boolean;
  asset: Asset | null;
  equipment: Resource[];
  onClose: () => void;
  onSave: (asset: Asset) => void;
  onDelete?: (assetId: string) => void;
}

const STATUS_OPTIONS: { value: Asset['status']; label: string; tone: string }[] = [
  { value: 'available',   label: 'Tersedia',          tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'borrowed',    label: 'Sedang Dipinjam',   tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'maintenance', label: 'Dalam Penyelenggaraan', tone: 'bg-rose-50 text-rose-700 border-rose-200' },
];

export function EditAssetModal({ open, asset, equipment, onClose, onSave, onDelete }: Props) {
  const [draft, setDraft] = useState<Asset | null>(asset);
  const [savedFlash, setSavedFlash] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setDraft(asset);
      setSavedFlash(false);
      setUploadError(null);
    }
  }, [open, asset]);

  if (!draft) return null;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    const { url, error } = await uploadAssetImage(file, draft.id);
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
    if (!draft.name.trim() || !draft.serialNumber.trim() || !draft.resourceId) return;
    const cleaned: Asset = {
      ...draft,
      name: draft.name.trim(),
      serialNumber: draft.serialNumber.trim(),
      specifications: draft.specifications.trim(),
      lockedReason: draft.lockedReason && draft.lockedReason.trim().length > 0
        ? draft.lockedReason.trim()
        : undefined,
      accessNote: draft.accessNote && draft.accessNote.trim().length > 0
        ? draft.accessNote.trim()
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
            className="bg-white rounded-2xl w-full max-w-lg p-6 sm:p-8 relative shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto scrollbar-hide"
          >
            <div className="flex justify-between items-start mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shrink-0">
                  <Pencil size={16} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold tracking-tight text-slate-800">Edit Peralatan ICT</h2>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold truncate">
                    {draft.name} · {draft.serialNumber}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Kategori">
                <select
                  required
                  value={draft.resourceId}
                  onChange={(e) => setDraft({ ...draft, resourceId: e.target.value })}
                  className="ea-input"
                >
                  {equipment.map((eq) => (
                    <option key={eq.id} value={eq.id}>{eq.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Nama Item / Unit">
                <input
                  required
                  type="text"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="ea-input"
                  placeholder="Contoh: Laptop Murid 22"
                />
              </Field>

              <Field label="No. Siri">
                <input
                  required
                  type="text"
                  value={draft.serialNumber}
                  onChange={(e) => setDraft({ ...draft, serialNumber: e.target.value })}
                  className="ea-input font-mono text-blue-600 font-bold"
                />
              </Field>

              <Field label="Spesifikasi">
                <textarea
                  required
                  rows={2}
                  value={draft.specifications}
                  onChange={(e) => setDraft({ ...draft, specifications: e.target.value })}
                  className="ea-input resize-none"
                />
              </Field>

              <Field label="Status">
                <div className="grid grid-cols-3 gap-2">
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setDraft({ ...draft, status: s.value })}
                      className={`px-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                        draft.status === s.value
                          ? `${s.tone} ring-2 ring-offset-1 ring-current/30`
                          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Gambar Item">
                <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />

                <div className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                  <div className="relative w-full h-36 bg-slate-100">
                    {draft.imageUrl ? (
                      <img
                        src={draft.imageUrl}
                        alt={draft.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                        <Laptop size={40} />
                        <p className="text-[10px] font-bold uppercase tracking-widest">Tiada gambar</p>
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
                  </div>
                </div>
                {uploadError && (
                  <div className="mt-2 bg-rose-50 border border-rose-100 rounded-lg p-2 flex items-start gap-2">
                    <AlertCircle size={12} className="text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] font-bold text-rose-700 leading-snug">{uploadError}</p>
                  </div>
                )}
              </Field>

              {/* Access note (admin-only edit; surfaces to borrower on loan card + Telegram) */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <KeyRound size={13} className="text-amber-600 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-amber-700">
                      Nota Akses (pilihan)
                    </label>
                    <p className="text-[10px] text-amber-700/80 leading-snug mt-0.5">
                      Contoh: <span className="font-mono">User: pelajar · Pass: skbt2026</span>. Admin sahaja yang nampak
                      di sini. Bila peminjam pinjam unit ini, nota dihantar terus ke <strong>email peribadi</strong> peminjam
                      (tidak ditunjuk di Telegram atau in-app untuk keselamatan).
                    </p>
                  </div>
                </div>
                <textarea
                  rows={2}
                  placeholder="Username / password / PIN untuk unit ini..."
                  value={draft.accessNote ?? ''}
                  onChange={(e) => setDraft({ ...draft, accessNote: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-amber-300 text-sm font-mono bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all resize-none"
                />
              </div>

              {/* Lock section (consistent with EditResourceModal) */}
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
                        {draft.lockedReason ? 'Unit Dikunci' : 'Unit Terbuka'}
                      </p>
                      <p className="text-[10px] text-slate-500 leading-snug">
                        {draft.lockedReason ? 'Pengguna tak boleh pinjam.' : 'Pengguna boleh pinjam.'}
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
                  <textarea
                    value={draft.lockedReason ?? ''}
                    onChange={(e) => setDraft({ ...draft, lockedReason: e.target.value })}
                    rows={2}
                    placeholder="Sebab kunci (cth: Layar rosak, sedang baik pulih)"
                    className="w-full px-3 py-2 rounded-lg border border-amber-300 text-sm bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                  />
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={uploading || !draft.name.trim()}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg text-sm font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Save size={14} /> {savedFlash ? 'Disimpan!' : 'Simpan Perubahan'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-3 rounded-lg text-xs font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all"
                >
                  Batal
                </button>
              </div>

              {onDelete && (
                <div className="pt-3 mt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`PADAM unit ini secara KEKAL?\n\n${draft.name} (${draft.serialNumber})\n\nTindakan ini tidak boleh dipulihkan. Rekod tempahan lama akan kekal sebagai sejarah.`)) {
                        onDelete(draft.id);
                        onClose();
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest text-rose-600 border border-rose-200 hover:bg-rose-50 transition-all"
                  >
                    <Trash2 size={13} /> Padam Unit Ini
                  </button>
                </div>
              )}

              <p className="text-[10px] text-slate-400 text-center pt-1">
                Disimpan ke Supabase — perubahan disegerakkan ke semua peranti.
              </p>
            </form>

            <style>{`
              .ea-input {
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
              .ea-input:focus {
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
