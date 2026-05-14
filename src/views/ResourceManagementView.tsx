import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  DoorOpen, Laptop, Plus, Pencil, Package, Lock, AlertTriangle,
  LayoutGrid, List as ListIcon, QrCode, Eye, EyeOff,
} from 'lucide-react';
import { Resource, ResourceType } from '../types';
import { isResourceLocked, lockReasonOf } from '../lib/locks';

type ViewMode = 'card' | 'list';

interface Props {
  resources: Resource[];
  title: string;
  type: ResourceType;
  onAction: (id: string) => void;
  onAdd?: () => void;
  isAdmin?: boolean;
  onEdit?: (resource: Resource) => void;
  onBulkLoan?: () => void;
  /** Admin-only: open QR sticker preview for a room. Only used when `type === 'room'`. */
  onShowQR?: (resource: Resource) => void;
  /** Admin-only: flip the resource's `hidden` flag. When hidden, regular
   *  users can't see this row in pickers / cards / scan results. */
  onToggleHidden?: (resource: Resource) => void;
}

const VIEW_MODE_KEY = 'tempah_resource_view_mode';

function loadViewMode(): ViewMode {
  try {
    const v = localStorage.getItem(VIEW_MODE_KEY);
    return v === 'list' ? 'list' : 'card';
  } catch {
    return 'card';
  }
}

export function ResourceManagementView({ resources, title, type, onAction, onAdd, isAdmin, onEdit, onBulkLoan, onShowQR, onToggleHidden }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>(loadViewMode);

  useEffect(() => {
    try { localStorage.setItem(VIEW_MODE_KEY, viewMode); } catch { /* noop */ }
  }, [viewMode]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200">
        <div className="flex items-start md:items-center justify-between gap-3 mb-5 flex-wrap">
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</h3>
            <p className="text-base md:text-lg font-bold text-slate-800 leading-tight">Sistem Inventori & Rekod Penggunaan</p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            {/* View-mode toggle */}
            <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
              <button
                onClick={() => setViewMode('card')}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === 'card' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Paparan kad"
              >
                <LayoutGrid size={14} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Paparan senarai"
              >
                <ListIcon size={14} />
              </button>
            </div>
            {type === 'equipment' && onBulkLoan && (
              <button
                onClick={onBulkLoan}
                className="flex items-center gap-2 px-3 md:px-4 py-2 bg-purple-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-purple-700 transition-all shadow-md shadow-purple-500/20"
              >
                <Package size={14} /> <span className="hidden sm:inline">Pinjam</span> Pukal
              </button>
            )}
            {isAdmin && onAdd && (
              <button
                onClick={onAdd}
                className="flex items-center gap-2 px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20"
                title={type === 'room'
                  ? 'Daftar bilik khas baharu (admin)'
                  : 'Daftar kategori peralatan baharu (admin)'}
              >
                <Plus size={14} /> <span className="hidden sm:inline">Tambah</span> {type === 'room' ? 'Bilik' : 'Kategori'}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
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

      {viewMode === 'card' ? (
        <CardGrid
          resources={resources}
          type={type}
          onAction={onAction}
          isAdmin={isAdmin}
          onEdit={onEdit}
          onShowQR={onShowQR}
          onToggleHidden={onToggleHidden}
        />
      ) : (
        <ListView
          resources={resources}
          type={type}
          onAction={onAction}
          isAdmin={isAdmin}
          onEdit={onEdit}
          onShowQR={onShowQR}
          onToggleHidden={onToggleHidden}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card view (default)
// ---------------------------------------------------------------------------
function CardGrid({
  resources, type, onAction, isAdmin, onEdit, onShowQR, onToggleHidden,
}: {
  resources: Resource[];
  type: ResourceType;
  onAction: (id: string) => void;
  isAdmin?: boolean;
  onEdit?: (r: Resource) => void;
  onShowQR?: (r: Resource) => void;
  onToggleHidden?: (r: Resource) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {resources.map((r, i) => {
        const locked = isResourceLocked(r);
        const reason = lockReasonOf(r);
        const hidden = r.hidden === true;
        return (
        <motion.div
          key={r.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.04 }}
          className={`rounded-2xl border shadow-sm group transition-all relative overflow-hidden flex flex-col ${
            hidden
              ? 'bg-slate-50 border-slate-300 border-dashed opacity-75'
              : locked
              ? 'bg-amber-50/30 border-amber-200'
              : 'bg-white border-slate-200 hover:border-blue-500 hover:shadow-md'
          }`}
        >
          <div className="relative h-36 bg-slate-100 overflow-hidden">
            {r.imageUrl ? (
              <img
                src={r.imageUrl}
                alt={r.name}
                referrerPolicy="no-referrer"
                className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
                  locked ? 'grayscale opacity-60' : ''
                }`}
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${
                type === 'room' ? 'bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-300' : 'bg-gradient-to-br from-purple-50 to-pink-100 text-purple-300'
              }`}>
                {type === 'room' ? <DoorOpen size={56} /> : <Laptop size={56} />}
              </div>
            )}

            {locked && (
              <div className="absolute inset-0 bg-amber-900/15 flex items-center justify-center">
                <div className="bg-amber-500 text-white rounded-full p-3.5 shadow-xl ring-4 ring-amber-100">
                  <Lock size={22} />
                </div>
              </div>
            )}

            <div className="absolute top-3 right-3 bg-white/95 backdrop-blur px-2.5 py-1 rounded-md shadow-sm border border-white/40">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                {type === 'room' ? 'Muatan' : 'Stok'}
              </p>
              <p className="text-xs font-black text-slate-800 leading-none mt-0.5">
                {type === 'room' ? `${r.capacity ?? 0} pax` : `${r.quantity ?? 0} unit`}
              </p>
            </div>
            {isAdmin && onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(r); }}
                className="absolute top-3 left-3 bg-white/95 backdrop-blur p-1.5 rounded-md shadow-sm border border-white/40 text-slate-500 hover:text-blue-600 hover:bg-white transition-all"
                title="Edit (termasuk kunci)"
              >
                <Pencil size={12} />
              </button>
            )}
            {/* Admin-only QR button for Bilik Khas — sits beside the edit icon */}
            {isAdmin && type === 'room' && onShowQR && (
              <button
                onClick={(e) => { e.stopPropagation(); onShowQR(r); }}
                className="absolute top-3 left-11 bg-white/95 backdrop-blur p-1.5 rounded-md shadow-sm border border-white/40 text-slate-500 hover:text-purple-600 hover:bg-white transition-all"
                title="Jana kod QR untuk tempahan pantas"
              >
                <QrCode size={12} />
              </button>
            )}
            {/* Admin-only visibility toggle — flips `hidden` flag.
                Hidden = users can't see this card at all. Different from
                lock (which shows it but blocks booking). */}
            {isAdmin && onToggleHidden && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleHidden(r); }}
                className={`absolute top-3 ${type === 'room' && onShowQR ? 'left-[4.75rem]' : 'left-11'} bg-white/95 backdrop-blur p-1.5 rounded-md shadow-sm border border-white/40 transition-all ${
                  hidden
                    ? 'text-rose-600 hover:bg-rose-50'
                    : 'text-slate-500 hover:text-emerald-600 hover:bg-white'
                }`}
                title={hidden ? 'Tunjukkan kepada pengguna' : 'Sembunyikan dari pengguna'}
              >
                {hidden ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            )}
            {/* Hidden-state ribbon (admin only — non-admin doesn't see this card at all) */}
            {hidden && (
              <div className="absolute bottom-3 right-3 bg-rose-500 text-white px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest shadow-md flex items-center gap-1">
                <EyeOff size={10} /> Disorok
              </div>
            )}
          </div>

          <div className="p-5 flex-1 flex flex-col">
            <h3 className={`font-bold text-base leading-snug tracking-tight transition-colors uppercase ${
              locked ? 'text-slate-700' : 'text-slate-800 group-hover:text-blue-600'
            }`}>
              {r.name}
            </h3>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
              {type === 'room' ? 'Inventori Bilik' : 'Inventori ICT'}
            </p>

            {locked ? (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertTriangle size={11} className="text-amber-600 shrink-0" />
                  <p className="text-[9px] font-bold text-amber-700 uppercase tracking-widest">Sebab Dikunci</p>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">{reason}</p>
              </div>
            ) : r.description ? (
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
                <div className={`w-1.5 h-1.5 rounded-full ${locked ? 'bg-amber-500' : 'bg-green-500'}`} />
                <span className={`text-[10px] font-bold uppercase tracking-widest ${
                  locked ? 'text-amber-700' : 'text-slate-500'
                }`}>
                  {locked ? 'Dikunci' : 'Aktif'}
                </span>
              </div>
              <button
                disabled={locked}
                onClick={() => onAction(r.id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                  locked
                    ? 'bg-amber-100 text-amber-700 cursor-not-allowed'
                    : 'bg-blue-600/10 text-blue-600 hover:bg-blue-600 hover:text-white'
                }`}
              >
                {locked ? 'Dikunci' : (type === 'room' ? 'Tempah' : 'Pinjam')}
              </button>
            </div>
          </div>
        </motion.div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// List view (compact)
// ---------------------------------------------------------------------------
function ListView({
  resources, type, onAction, isAdmin, onEdit, onShowQR, onToggleHidden,
}: {
  resources: Resource[];
  type: ResourceType;
  onAction: (id: string) => void;
  isAdmin?: boolean;
  onEdit?: (r: Resource) => void;
  onShowQR?: (r: Resource) => void;
  onToggleHidden?: (r: Resource) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <ul className="divide-y divide-slate-100">
        {resources.map((r) => {
          const locked = isResourceLocked(r);
          const reason = lockReasonOf(r);
          return (
            <li
              key={r.id}
              className={`flex items-center gap-3 md:gap-4 p-3 md:p-4 transition-colors ${
                locked ? 'bg-amber-50/30' : 'hover:bg-slate-50'
              }`}
            >
              {/* Thumbnail */}
              <div className="relative w-12 h-12 md:w-14 md:h-14 rounded-lg overflow-hidden shrink-0 bg-slate-100">
                {r.imageUrl ? (
                  <img
                    src={r.imageUrl}
                    alt={r.name}
                    referrerPolicy="no-referrer"
                    className={`w-full h-full object-cover ${locked ? 'grayscale opacity-60' : ''}`}
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${
                    type === 'room' ? 'bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-400' : 'bg-gradient-to-br from-purple-50 to-pink-100 text-purple-400'
                  }`}>
                    {type === 'room' ? <DoorOpen size={22} /> : <Laptop size={22} />}
                  </div>
                )}
                {locked && (
                  <div className="absolute inset-0 bg-amber-900/30 flex items-center justify-center">
                    <Lock size={14} className="text-white" />
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`text-sm font-bold truncate uppercase ${
                    locked ? 'text-slate-700' : 'text-slate-800'
                  }`}>
                    {r.name}
                  </p>
                  <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                    {type === 'room' ? `${r.capacity ?? 0} pax` : `${r.quantity ?? 0} unit`}
                  </span>
                  <span className={`text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 ${
                    locked ? 'text-amber-700' : 'text-emerald-700'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${locked ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    {locked ? 'Dikunci' : 'Aktif'}
                  </span>
                  {r.hidden && (
                    <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-100 flex items-center gap-1">
                      <EyeOff size={10} /> Disorok
                    </span>
                  )}
                </div>
                {locked ? (
                  <p className="text-[11px] text-amber-700 mt-0.5 truncate flex items-center gap-1">
                    <AlertTriangle size={10} className="shrink-0" />
                    <span className="truncate">{reason}</span>
                  </p>
                ) : r.description ? (
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 hidden sm:block">{r.description}</p>
                ) : (
                  <p className="text-[11px] text-slate-300 italic mt-0.5 hidden sm:block">Tiada penerangan</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {isAdmin && onToggleHidden && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleHidden(r); }}
                    className={`p-2 rounded-lg transition-all ${
                      r.hidden
                        ? 'text-rose-600 bg-rose-50 hover:bg-rose-100'
                        : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'
                    }`}
                    title={r.hidden ? 'Tunjukkan kepada pengguna' : 'Sembunyikan dari pengguna'}
                  >
                    {r.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                )}
                {isAdmin && type === 'room' && onShowQR && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onShowQR(r); }}
                    className="p-2 rounded-lg text-slate-400 hover:bg-purple-50 hover:text-purple-600 transition-all"
                    title="Jana kod QR untuk tempahan pantas"
                  >
                    <QrCode size={14} />
                  </button>
                )}
                {isAdmin && onEdit && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(r); }}
                    className="p-2 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                )}
                <button
                  disabled={locked}
                  onClick={() => onAction(r.id)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                    locked
                      ? 'bg-amber-100 text-amber-700 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                  }`}
                >
                  {locked ? 'Dikunci' : (type === 'room' ? 'Tempah' : 'Pinjam')}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
