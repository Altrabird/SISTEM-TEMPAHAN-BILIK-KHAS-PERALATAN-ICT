import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, AlertCircle, Laptop, ArrowRight, ArrowLeft, CheckSquare, Square, Search,
  Lock, Unlock, Trash2, Settings2, Wrench, ShieldCheck, Loader2,
} from 'lucide-react';
import { Asset, Resource } from '../types';

interface Props {
  open: boolean;
  /** Optionally scope the picker to one category. If null, show all assets. */
  resourceId: string | null;
  assets: Asset[];
  equipment: Resource[];
  onClose: () => void;
  /** Apply action to each asset and return count of failures. */
  onApply: (action: BulkAction, assets: Asset[]) => Promise<{ failed: number; ok: number }>;
}

export type BulkAction =
  | { kind: 'lock'; reason: string }
  | { kind: 'unlock' }
  | { kind: 'status'; status: Asset['status'] }
  | { kind: 'delete' };

const ACTION_DEFS = [
  { kind: 'lock' as const, label: 'Kunci Unit', icon: Lock, tone: 'from-amber-500 to-orange-600' },
  { kind: 'unlock' as const, label: 'Buka Kunci', icon: Unlock, tone: 'from-emerald-500 to-green-600' },
  { kind: 'status' as const, label: 'Tukar Status', icon: Settings2, tone: 'from-indigo-500 to-blue-600' },
  { kind: 'delete' as const, label: 'Padam Unit', icon: Trash2, tone: 'from-rose-500 to-red-600' },
];

const STATUS_DEFS: { value: Asset['status']; label: string; icon: any }[] = [
  { value: 'available',   label: 'Tersedia',     icon: ShieldCheck },
  { value: 'borrowed',    label: 'Sedang Dipinjam', icon: Laptop },
  { value: 'maintenance', label: 'Penyelenggaraan', icon: Wrench },
];

export function BulkAssetActionsModal({ open, resourceId, assets, equipment, onClose, onApply }: Props) {
  const [step, setStep] = useState<'select' | 'action' | 'result'>('select');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [actionKind, setActionKind] = useState<BulkAction['kind'] | null>(null);
  const [reason, setReason] = useState('');
  const [statusValue, setStatusValue] = useState<Asset['status']>('available');
  const [confirming, setConfirming] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<{ ok: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStep('select');
      setPicked(new Set());
      setSearch('');
      setActionKind(null);
      setReason('');
      setStatusValue('available');
      setConfirming(false);
      setApplying(false);
      setResult(null);
      setError(null);
    }
  }, [open]);

  const scopedAssets = useMemo(() => {
    return resourceId ? assets.filter((a) => a.resourceId === resourceId) : assets;
  }, [assets, resourceId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return scopedAssets;
    return scopedAssets.filter((a) => {
      const cat = equipment.find((e) => e.id === a.resourceId)?.name?.toLowerCase() ?? '';
      return (
        a.name.toLowerCase().includes(q) ||
        a.serialNumber.toLowerCase().includes(q) ||
        cat.includes(q)
      );
    });
  }, [scopedAssets, search, equipment]);

  const grouped = useMemo(() => {
    const map = new Map<string, Asset[]>();
    filtered.forEach((a) => {
      const key = a.resourceId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    return [...map.entries()].map(([rid, list]) => ({
      resourceId: rid,
      categoryName: equipment.find((e) => e.id === rid)?.name ?? rid,
      assets: list,
    }));
  }, [filtered, equipment]);

  const toggle = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleGroup = (groupAssets: Asset[]) => {
    setPicked((prev) => {
      const next = new Set(prev);
      const allIn = groupAssets.every((a) => next.has(a.id));
      if (allIn) groupAssets.forEach((a) => next.delete(a.id));
      else groupAssets.forEach((a) => next.add(a.id));
      return next;
    });
  };

  const pickedAssets = useMemo(
    () => scopedAssets.filter((a) => picked.has(a.id)),
    [scopedAssets, picked],
  );

  const goAction = () => {
    if (picked.size === 0) {
      setError('Sila pilih sekurang-kurangnya 1 unit.');
      return;
    }
    setError(null);
    setStep('action');
  };

  const buildAction = (): BulkAction | null => {
    if (actionKind === 'lock') {
      if (!reason.trim()) return null;
      return { kind: 'lock', reason: reason.trim() };
    }
    if (actionKind === 'unlock') return { kind: 'unlock' };
    if (actionKind === 'status') return { kind: 'status', status: statusValue };
    if (actionKind === 'delete') return { kind: 'delete' };
    return null;
  };

  const apply = async () => {
    const action = buildAction();
    if (!action) return;
    setApplying(true);
    setError(null);
    const r = await onApply(action, pickedAssets);
    setApplying(false);
    setResult(r);
    setStep('result');
  };

  const actionVerb = (a: BulkAction['kind'] | null) => {
    switch (a) {
      case 'lock': return 'Kunci';
      case 'unlock': return 'Buka kunci';
      case 'status': return 'Tukar status';
      case 'delete': return 'Padam';
      default: return '';
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={applying ? undefined : onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shrink-0">
                  <Settings2 size={20} />
                </div>
                <div>
                  <p className="text-[10px] text-blue-600 uppercase tracking-widest font-bold">
                    {step === 'select' ? 'Langkah 1 / 2 — Pilih Unit' :
                     step === 'action' ? 'Langkah 2 / 2 — Pilih Tindakan' :
                     'Selesai'}
                  </p>
                  <h2 className="text-base font-bold tracking-tight text-slate-800 leading-tight">
                    Tindakan Pukal Unit ICT
                  </h2>
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={applying}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 disabled:opacity-40"
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="m-6 mb-0 bg-rose-50 border border-rose-100 rounded-lg p-3 flex items-start gap-2 shrink-0">
                <AlertCircle size={14} className="text-rose-500 shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-rose-700">{error}</p>
              </div>
            )}

            {/* Step 1: Select */}
            {step === 'select' && (
              <>
                <div className="p-6 pb-3 shrink-0">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      autoFocus
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Cari nama, no. siri, kategori..."
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 pb-3">
                  {grouped.length === 0 && (
                    <div className="p-12 text-center text-xs text-slate-400 italic">
                      Tiada unit ditemui.
                    </div>
                  )}
                  {grouped.map((g) => {
                    const allPicked = g.assets.every((a) => picked.has(a.id));
                    const somePicked = !allPicked && g.assets.some((a) => picked.has(a.id));
                    return (
                      <div key={g.resourceId} className="mb-4">
                        <button
                          type="button"
                          onClick={() => toggleGroup(g.assets)}
                          className="w-full flex items-center gap-2 mb-2 text-left"
                        >
                          {allPicked ? (
                            <CheckSquare size={14} className="text-blue-600" />
                          ) : somePicked ? (
                            <Square size={14} className="text-blue-400" fill="currentColor" />
                          ) : (
                            <Square size={14} className="text-slate-400" />
                          )}
                          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                            {g.categoryName} <span className="text-slate-400">({g.assets.length})</span>
                          </h3>
                        </button>
                        <div className="space-y-1.5">
                          {g.assets.map((a) => {
                            const checked = picked.has(a.id);
                            const locked = Boolean(a.lockedReason);
                            return (
                              <button
                                key={a.id}
                                type="button"
                                onClick={() => toggle(a.id)}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                                  checked
                                    ? 'bg-blue-50 border-blue-300'
                                    : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                                }`}
                              >
                                {checked ? (
                                  <CheckSquare size={16} className="text-blue-600 shrink-0" />
                                ) : (
                                  <Square size={16} className="text-slate-400 shrink-0" />
                                )}
                                {a.imageUrl ? (
                                  <img src={a.imageUrl} alt={a.name} referrerPolicy="no-referrer" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                                    <Laptop size={16} />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-slate-800 truncate flex items-center gap-1.5">
                                    {a.name}
                                    {locked && <Lock size={10} className="text-amber-600 shrink-0" />}
                                  </p>
                                  <p className="text-[10px] font-mono text-blue-600 uppercase truncate">{a.serialNumber}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-6 pt-3 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0 bg-slate-50">
                  <p className="text-xs text-slate-600">
                    <strong>{picked.size}</strong> unit dipilih
                  </p>
                  <button
                    type="button"
                    onClick={goAction}
                    disabled={picked.size === 0}
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 active:scale-95 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Seterusnya <ArrowRight size={14} />
                  </button>
                </div>
              </>
            )}

            {/* Step 2: Action */}
            {step === 'action' && (
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700 mb-2">
                    {pickedAssets.length} Unit Dipilih
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {pickedAssets.slice(0, 8).map((a) => (
                      <span key={a.id} className="text-[10px] font-bold px-2 py-1 bg-white border border-blue-200 rounded text-blue-800">
                        {a.name}
                      </span>
                    ))}
                    {pickedAssets.length > 8 && (
                      <span className="text-[10px] font-bold px-2 py-1 bg-blue-100 rounded text-blue-700">
                        +{pickedAssets.length - 8} lagi
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pilih Tindakan</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ACTION_DEFS.map((a) => {
                      const Icon = a.icon;
                      const active = actionKind === a.kind;
                      return (
                        <button
                          key={a.kind}
                          type="button"
                          onClick={() => setActionKind(a.kind)}
                          className={`flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all ${
                            active
                              ? `bg-gradient-to-br ${a.tone} text-white border-transparent shadow-md`
                              : 'bg-white border-slate-200 hover:border-slate-400 text-slate-700'
                          }`}
                        >
                          <Icon size={16} />
                          <span className="text-xs font-bold uppercase tracking-wider">{a.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {actionKind === 'lock' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-amber-700">
                      Sebab Kunci *
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={3}
                      autoFocus
                      placeholder="Contoh: Hari Sukan — sedia untuk pengguna pada 12 Mei"
                      className="w-full px-3 py-2 rounded-lg border border-amber-300 text-sm bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {['Sedang dibaikpulih', 'Hilang aksesori', 'Diasingkan untuk audit'].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setReason(r)}
                          className="px-2.5 py-1 text-[10px] font-bold border border-slate-200 rounded-md text-slate-600 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700 transition-all"
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {actionKind === 'status' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Status Baru
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {STATUS_DEFS.map((s) => {
                        const Icon = s.icon;
                        const active = statusValue === s.value;
                        return (
                          <button
                            key={s.value}
                            type="button"
                            onClick={() => setStatusValue(s.value)}
                            className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${
                              active
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                : 'bg-white border-slate-200 hover:border-indigo-400 text-slate-700'
                            }`}
                          >
                            <Icon size={16} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">{s.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {actionKind === 'delete' && (
                  <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-rose-800 leading-relaxed">
                      <p className="font-bold mb-1">Amaran: Tindakan tak boleh dipulihkan</p>
                      {pickedAssets.length} unit akan dipadam KEKAL dari sistem dan Supabase.
                      Rekod tempahan lama kekal sebagai sejarah.
                    </div>
                  </div>
                )}

                {actionKind && (
                  <div className="pt-3 border-t border-slate-100">
                    {!confirming ? (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setStep('select')}
                          className="px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all flex items-center gap-1"
                        >
                          <ArrowLeft size={12} /> Kembali
                        </button>
                        <button
                          type="button"
                          disabled={(actionKind === 'lock' && !reason.trim())}
                          onClick={() => setConfirming(true)}
                          className={`flex-1 py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
                            actionKind === 'delete'
                              ? 'bg-rose-600 text-white hover:bg-rose-700'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {actionVerb(actionKind)} {pickedAssets.length} Unit
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-slate-700 text-center">
                          Anda pasti mahu <strong className={actionKind === 'delete' ? 'text-rose-600' : ''}>
                            {actionVerb(actionKind).toLowerCase()}
                          </strong> {pickedAssets.length} unit?
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setConfirming(false)}
                            disabled={applying}
                            className="flex-1 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all disabled:opacity-40"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            onClick={apply}
                            disabled={applying}
                            className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest text-white transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-60 ${
                              actionKind === 'delete' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                          >
                            {applying ? <Loader2 size={13} className="animate-spin" /> : <CheckSquare size={13} />}
                            {applying ? 'Sedang dilaksanakan...' : 'Sahkan'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Result */}
            {step === 'result' && result && (
              <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
                  result.failed === 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                }`}>
                  <CheckSquare size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Selesai</h3>
                <p className="text-sm text-slate-500 mt-1">
                  <strong>{result.ok}</strong> unit berjaya dikemaskini
                  {result.failed > 0 && <>, <strong className="text-rose-600">{result.failed} gagal</strong></>}
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-6 bg-slate-900 text-white px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-700 transition-all"
                >
                  Tutup
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
