import React from 'react';
import { motion } from 'motion/react';
import { DoorOpen, Laptop, Plus, Pencil, Package } from 'lucide-react';
import { Resource, ResourceType } from '../types';

interface Props {
  resources: Resource[];
  title: string;
  type: ResourceType;
  onAction: (id: string) => void;
  onAdd?: () => void;
  isAdmin?: boolean;
  onEdit?: (resource: Resource) => void;
  onBulkLoan?: () => void;
}

export function ResourceManagementView({ resources, title, type, onAction, onAdd, isAdmin, onEdit, onBulkLoan }: Props) {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</h3>
            <p className="text-lg font-bold text-slate-800 leading-tight">Sistem Inventori & Rekod Penggunaan</p>
          </div>
          <div className="flex gap-2">
            {type === 'equipment' && onBulkLoan && (
              <button
                onClick={onBulkLoan}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-purple-700 transition-all shadow-md shadow-purple-500/20"
              >
                <Package size={14} /> Pinjam Pukal
              </button>
            )}
            {isAdmin && (
              <button
                onClick={onAdd || (() => {})}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20"
              >
                <Plus size={14} /> Tambah {type === 'room' ? 'Bilik' : 'Alatan'}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {resources.map((r) => (
            <div key={r.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-1 line-clamp-1">{r.name}</p>
              <p className="text-lg font-black text-slate-800 leading-none">
                {type === 'room' ? r.capacity : r.quantity}
              </p>
              <p className="text-[8px] font-bold text-slate-500 uppercase mt-1">UNIT</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {resources.map((r, i) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm group hover:border-blue-500 hover:shadow-md transition-all relative overflow-hidden flex flex-col"
          >
            {/* Image / icon header */}
            <div className="relative h-36 bg-slate-100 overflow-hidden">
              {r.imageUrl ? (
                <img
                  src={r.imageUrl}
                  alt={r.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className={`w-full h-full flex items-center justify-center ${
                  type === 'room' ? 'bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-300' : 'bg-gradient-to-br from-purple-50 to-pink-100 text-purple-300'
                }`}>
                  {type === 'room' ? <DoorOpen size={56} /> : <Laptop size={56} />}
                </div>
              )}
              {/* Capacity badge top-right */}
              <div className="absolute top-3 right-3 bg-white/95 backdrop-blur px-2.5 py-1 rounded-md shadow-sm border border-white/40">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                  {type === 'room' ? 'Muatan' : 'Stok'}
                </p>
                <p className="text-xs font-black text-slate-800 leading-none mt-0.5">
                  {type === 'room' ? `${r.capacity ?? 0} pax` : `${r.quantity ?? 0} unit`}
                </p>
              </div>
              {/* Admin edit button top-left */}
              {isAdmin && onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(r);
                  }}
                  className="absolute top-3 left-3 bg-white/95 backdrop-blur p-1.5 rounded-md shadow-sm border border-white/40 text-slate-500 hover:text-blue-600 hover:bg-white transition-all"
                  title="Edit"
                >
                  <Pencil size={12} />
                </button>
              )}
            </div>

            {/* Body */}
            <div className="p-5 flex-1 flex flex-col">
              <h3 className="font-bold text-base text-slate-800 leading-snug tracking-tight group-hover:text-blue-600 transition-colors uppercase">
                {r.name}
              </h3>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                {type === 'room' ? 'Inventori Bilik' : 'Inventori ICT'}
              </p>

              {r.description ? (
                <p className="text-[12px] text-slate-600 mt-3 leading-relaxed line-clamp-3 flex-1">
                  {r.description}
                </p>
              ) : (
                <p className="text-[11px] text-slate-300 italic mt-3 leading-relaxed flex-1">
                  {isAdmin
                    ? 'Tiada penerangan. Klik ikon pensel untuk tambah.'
                    : 'Tiada penerangan tersedia.'}
                </p>
              )}

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Aktif</span>
                </div>
                <button
                  onClick={() => onAction(r.id)}
                  className="bg-blue-600/10 text-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all"
                >
                  {type === 'room' ? 'Tempah' : 'Pinjam'}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
