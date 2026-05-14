import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Save, DoorOpen, Laptop, Image as ImageIcon, Camera, Trash2, Loader2, AlertCircle, Sparkles
} from 'lucide-react';
import { Resource, ResourceType } from '../types';
import { uploadResourceImage } from '../lib/storage';
import { isSupabaseEnabled } from '../lib/supabase';

interface Props {
  open: boolean;
  type: ResourceType; // 'room' | 'equipment'
  onClose: () => void;
  onSubmit: (r: Resource) => void;
}

/**
 * Admin: create a brand-new Bilik Khas or Peralatan ICT category.
 *
 * Mirrors EditResourceModal's layout but:
 *   - No `resource` prop — fields start blank.
 *   - The resource type is fixed at modal-open time (room / equipment).
 *   - On save we generate a unique id `<prefix>-<timestamp>-<rand>` so it
 *     can't collide with any existing seeded ids (room-1 … eq-6 etc.).
 *   - Image upload uses the new id as part of the storage filename.
 *
 * For adding individual ICT units (assets within a category), use
 * `AddAssetModal` — that's a separate flow inside an existing category.
 */
export function AddResourceModal({ open, type, onClose, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState<number | undefined>(undefined);
  const [quantity, setQuantity] = useState<number | undefined>(undefined);
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  // Reset on open + pre-allocate the resource id so image uploads can
  // use it as part of the filename (matches the edit flow's convention).
  useEffect(() => {
    if (!open) return;
    setName('');
    setDescription('');
    setCapacity(undefined);
    setQuantity(undefined);
    setImageUrl(undefined);
    setUploadError(null);
    setUploading(false);
    const prefix = type === 'room' ? 'room' : 'eq';
    setPendingId(`${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  }, [open, type]);

  if (!open || !pendingId) return null;

  const isRoom = type === 'room';
  const Icon = isRoom ? DoorOpen : Laptop;
  const headerLabel = isRoom ? 'Bilik Khas Baharu' : 'Kategori Peralatan ICT Baharu';
  const namePlaceholder = isRoom ? 'Contoh: Makmal Bahasa' : 'Contoh: Tablet Pelajar';

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    const { url, error } = await uploadResourceImage(file, { id: pendingId, type });
    setUploading(false);
    if (error || !url) {
      setUploadError(error ?? 'Muat naik gagal.');
      return;
    }
    setImageUrl(url);
  };

  const removeImage = () => {
    setImageUrl(undefined);
    setUploadError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const newResource: Resource = {
      id: pendingId,
      name: name.trim(),
      type,
      description: description.trim() || undefined,
      imageUrl,
      capacity: isRoom ? capacity : undefined,
      quantity: !isRoom ? quantity : undefined,
    };
    onSubmit(newResource);
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
            className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col"
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${
                  isRoom
                    ? 'bg-gradient-to-br from-blue-600 to-indigo-600'
                    : 'bg-gradient-to-br from-purple-600 to-pink-600'
                }`}>
                  <Sparkles size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Daftar Baharu
                  </p>
                  <h2 className="text-base font-bold tracking-tight text-slate-800 leading-tight truncate">
                    {headerLabel}
                  </h2>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 shrink-0"
                title="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto scrollbar-hide px-6 py-5 space-y-4">
              {/* Name */}
              <Field label={`Nama ${isRoom ? 'Bilik' : 'Kategori'} *`}>
                <input
                  required
                  autoFocus
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="er-input"
                  placeholder={namePlaceholder}
                />
              </Field>

              {/* Image */}
              <Field label={`Gambar ${isRoom ? 'Bilik' : 'Kategori'} (pilihan)`}>
                <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />

                <div className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                  <div className="relative w-full h-40 bg-slate-100">
                    {imageUrl ? (
                      <img src={imageUrl} alt={name || headerLabel} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                        <Icon size={42} />
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
                    {imageUrl && !uploading && (
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

              {/* Description */}
              <Field label="Penerangan / Maklumat untuk Guru">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="er-input resize-none"
                  placeholder={isRoom
                    ? 'Contoh: Bilik dengan 30 PC desktop, projektor, papan putih digital. Sesuai untuk PdPc TMK & ujian online.'
                    : 'Contoh: Kategori untuk pinjaman tablet pelajar — sesuai aktiviti pembelajaran berasaskan video.'}
                />
              </Field>

              {/* Capacity / Quantity */}
              <Field label={isRoom ? 'Muatan (Pax)' : 'Kuantiti Awal'}>
                <input
                  type="number"
                  min={0}
                  value={isRoom ? (capacity ?? '') : (quantity ?? '')}
                  onChange={(e) => {
                    const v = e.target.value === '' ? undefined : Number(e.target.value);
                    if (isRoom) setCapacity(v); else setQuantity(v);
                  }}
                  className="er-input"
                  placeholder="0"
                />
                {!isRoom && (
                  <p className="text-[10px] text-slate-400 leading-snug">
                    Bilangan unit akan dikemas kini secara automatik bila tambah unit dalam kategori ini.
                  </p>
                )}
              </Field>

              <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={!name.trim() || uploading}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg text-sm font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Save size={14} /> Simpan {isRoom ? 'Bilik' : 'Kategori'}
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
