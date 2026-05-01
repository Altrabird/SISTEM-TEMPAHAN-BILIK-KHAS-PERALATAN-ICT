import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { Asset, Resource } from '../types';

interface Props {
  open: boolean;
  initialResourceId?: string | null;
  equipment: Resource[];
  onClose: () => void;
  onSubmit: (asset: Asset) => void;
}

export function AddAssetModal({ open, initialResourceId, equipment, onClose, onSubmit }: Props) {
  const [draft, setDraft] = useState<Partial<Asset>>({
    name: '',
    serialNumber: '',
    specifications: '',
    imageUrl: '',
    status: 'available',
  });

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
    }
  }, [open, initialResourceId]);

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name || !draft.resourceId) return;
    onSubmit({
      ...(draft as Asset),
      id: `ast-${Date.now()}`,
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
            className="bg-white rounded-2xl w-full max-w-lg p-8 relative shadow-2xl border border-slate-200"
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-800">Daftar Peralatan Baru</h2>
                <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-semibold">Masukkan perincian aset spesifik</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400">
                <X size={20} />
              </button>
            </div>

            <form className="space-y-4" onSubmit={handle}>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Kategori</label>
                <select
                  required
                  value={draft.resourceId ?? ''}
                  onChange={(e) => setDraft({ ...draft, resourceId: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none bg-white"
                >
                  <option value="">Pilih Kategori</option>
                  {equipment.map((eq) => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nama Item / Unit</label>
                <input
                  required
                  type="text"
                  placeholder="Contoh: Laptop Murid 22"
                  value={draft.name ?? ''}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">No. Siri</label>
                <input
                  required
                  type="text"
                  placeholder="Contoh: SKBT-LP-022"
                  value={draft.serialNumber ?? ''}
                  onChange={(e) => setDraft({ ...draft, serialNumber: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-bold text-blue-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Spesifikasi</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Contoh: Intel Core i5, 8GB RAM, SSD 256GB"
                  value={draft.specifications ?? ''}
                  onChange={(e) => setDraft({ ...draft, specifications: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">URL Gambar Item</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={draft.imageUrl ?? ''}
                  onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-blue-600"
                />
                <p className="text-[9px] text-slate-400 italic">Masukkan URL gambar produk (Unsplash/Direct link)</p>
              </div>

              <button
                type="submit"
                className="w-full bg-[#0f172a] text-white py-3 rounded-lg text-sm font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95 mt-4"
              >
                Daftar Item
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
