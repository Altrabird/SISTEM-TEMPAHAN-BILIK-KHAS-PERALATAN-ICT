import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Image as ImageIcon, Camera, Trash2, Loader2, AlertCircle, Laptop
} from 'lucide-react';
import { Asset, Resource } from '../types';
import { uploadAssetImage } from '../lib/storage';
import { isSupabaseEnabled } from '../lib/supabase';

interface Props {
  open: boolean;
  initialResourceId?: string | null;
  equipment: Resource[];
  onClose: () => void;
  onSubmit: (asset: Asset) => void;
}

export function AddAssetModal({ open, initialResourceId, equipment, onClose, onSubmit }: Props) {
  // Stable ID generated once per open so the upload filename matches the saved record
  const draftId = useMemo(() => `ast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, [open]);

  const [draft, setDraft] = useState<Partial<Asset>>({
    name: '',
    serialNumber: '',
    specifications: '',
    imageUrl: '',
    status: 'available',
  });

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setDraft({
        name: '',
        serialNumber: '',
        specifications: '',
        imageUrl: '',
        status: 'available',
        resourceId: initialResourceId ?? '',
      });
      setUploadError(null);
    }
  }, [open, initialResourceId]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    const { url, error } = await uploadAssetImage(file, draftId);
    setUploading(false);
    if (error || !url) {
      setUploadError(error ?? 'Muat naik gagal.');
      return;
    }
    setDraft({ ...draft, imageUrl: url });
  };

  const removeImage = () => {
    setDraft({ ...draft, imageUrl: '' });
    setUploadError(null);
  };

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name || !draft.resourceId) return;
    onSubmit({
      ...(draft as Asset),
      id: draftId,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-2xl w-full max-w-lg p-8 relative shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-800">Daftar Peralatan Baru</h2>
                <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-semibold">
                  Masukkan perincian aset spesifik
                </p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400">
                <X size={20} />
              </button>
            </div>

            <form className="space-y-4" onSubmit={handle}>
              <Field label="Kategori">
                <select
                  required
                  value={draft.resourceId ?? ''}
                  onChange={(e) => setDraft({ ...draft, resourceId: e.target.value })}
                  className="aa-input"
                >
                  <option value="">Pilih Kategori</option>
                  {equipment.map((eq) => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
                </select>
              </Field>

              <Field label="Nama Item / Unit">
                <input
                  required
                  type="text"
                  placeholder="Contoh: Laptop Murid 22"
                  value={draft.name ?? ''}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="aa-input"
                />
              </Field>

              <Field label="No. Siri">
                <input
                  required
                  type="text"
                  placeholder="Contoh: SKBT-LP-022"
                  value={draft.serialNumber ?? ''}
                  onChange={(e) => setDraft({ ...draft, serialNumber: e.target.value })}
                  className="aa-input font-mono text-blue-600 font-bold"
                />
              </Field>

              <Field label="Spesifikasi">
                <textarea
                  required
                  rows={2}
                  placeholder="Contoh: Intel Core i5, 8GB RAM, SSD 256GB"
                  value={draft.specifications ?? ''}
                  onChange={(e) => setDraft({ ...draft, specifications: e.target.value })}
                  className="aa-input resize-none"
                />
              </Field>

              <Field label="Gambar Item (pilihan)">
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
                  <div className="relative w-full h-36 bg-slate-100">
                    {draft.imageUrl ? (
                      <img
                        src={draft.imageUrl}
                        alt={draft.name ?? 'Preview'}
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

              <button
                type="submit"
                disabled={uploading}
                className="w-full bg-[#0f172a] text-white py-3 rounded-lg text-sm font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95 mt-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Daftar Item
              </button>
            </form>

            <style>{`
              .aa-input {
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
              .aa-input:focus {
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
