import React from 'react';
import { motion } from 'motion/react';
import { DoorOpen, Laptop, Plus } from 'lucide-react';
import { Resource, ResourceType } from '../types';

interface Props {
  resources: Resource[];
  title: string;
  type: ResourceType;
  onAction: (id: string) => void;
  onAdd?: () => void;
}

export function ResourceManagementView({ resources, title, type, onAction, onAdd }: Props) {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</h3>
            <p className="text-lg font-bold text-slate-800 leading-tight">Sistem Inventori & Rekod Penggunaan</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onAdd || (() => {})}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20"
            >
              <Plus size={14} /> Tambah {type === 'room' ? 'Bilik' : 'Alatan'}
            </button>
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
            transition={{ delay: i * 0.05 }}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm group hover:border-blue-500 transition-all relative overflow-hidden"
          >
            <div className="flex items-start justify-between mb-8">
              <div className={`w-10 h-10 ${type === 'room' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'} rounded-lg flex items-center justify-center border border-slate-100 group-hover:scale-110 transition-transform`}>
                {type === 'room' ? <DoorOpen size={18} /> : <Laptop size={18} />}
              </div>
              <div className="flex flex-col items-end">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
                  {type === 'room' ? 'Muatan' : 'Stok'}
                </p>
                <p className="text-sm font-black text-slate-800 leading-none">
                  {type === 'room' ? `${r.capacity} PAX` : `${r.quantity} UNIT`}
                </p>
              </div>
            </div>

            <div className="min-h-[64px]">
              <h3 className="font-bold text-base text-slate-800 leading-snug tracking-tight group-hover:text-blue-600 transition-colors uppercase">{r.name}</h3>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{type === 'room' ? 'Inventori Bilik' : 'Inventori ICT'}</p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
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
          </motion.div>
        ))}
      </div>
    </div>
  );
}
