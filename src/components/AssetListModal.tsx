import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Info, Laptop } from 'lucide-react';
import { Asset, Resource } from '../types';

interface Props {
  open: boolean;
  resourceId: string | null;
  assets: Asset[];
  equipment: Resource[];
  onClose: () => void;
  onPick: (asset: Asset) => void;
  onAdd: () => void;
}

export function AssetListModal({ open, resourceId, assets, equipment, onClose, onPick, onAdd }: Props) {
  if (!resourceId) return null;
  const filtered = assets.filter((a) => a.resourceId === resourceId);
  const eqName = equipment.find((e) => e.id === resourceId)?.name ?? 'Peralatan';

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
            className="bg-[#f8fafc] rounded-2xl w-full max-w-5xl h-[85vh] relative shadow-2xl overflow-hidden border border-slate-200 flex flex-col"
          >
            <div className="p-8 border-b border-slate-200 bg-white flex justify-between items-start shrink-0">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-800">Pinjam Peralatan: {eqName}</h2>
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-semibold">Pilih unit spesifik untuk tempahan</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((asset) => (
                  <motion.div
                    key={asset.id}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:border-blue-500 transition-all flex flex-col"
                  >
                    <div className="h-40 bg-slate-100 relative group overflow-hidden">
                      {asset.imageUrl ? (
                        <img
                          src={asset.imageUrl}
                          alt={asset.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <Laptop size={48} />
                        </div>
                      )}
                      <div className="absolute top-3 left-3">
                        <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border ${
                          asset.status === 'available' ? 'bg-green-50 text-green-600 border-green-100' :
                          asset.status === 'borrowed' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                          'bg-rose-50 text-rose-600 border-rose-100'
                        }`}>
                          {asset.status}
                        </span>
                      </div>
                    </div>
                    <div className="p-5 flex-1">
                      <h3 className="font-bold text-lg text-slate-800">{asset.name}</h3>
                      <p className="text-[10px] font-mono text-blue-600 uppercase mt-1">S/N: {asset.serialNumber}</p>
                      <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 items-center flex gap-1">
                          <Info size={10} /> Spesifikasi
                        </p>
                        <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">{asset.specifications}</p>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                      <button
                        disabled={asset.status !== 'available'}
                        onClick={() => onPick(asset)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                          asset.status === 'available'
                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/10'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        Pilih Unit
                      </button>
                    </div>
                  </motion.div>
                ))}

                <button
                  onClick={onAdd}
                  className="bg-white border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-8 gap-3 group hover:border-blue-500 transition-all min-h-[300px]"
                >
                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <Plus size={24} />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-600 uppercase">Tambah Unit Baru</p>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-tighter">Daftar Aset ICT</p>
                  </div>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
