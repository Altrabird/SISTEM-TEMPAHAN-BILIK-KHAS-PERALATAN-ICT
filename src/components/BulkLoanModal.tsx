import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, AlertCircle, Laptop, Sparkles, Calendar, Search, CheckSquare, Square,
  Package, ArrowRight, ArrowLeft
} from 'lucide-react';
import { Asset, Profile, Resource } from '../types';
import { PURPOSE_PRESETS } from '../constants';
import { isAssetLocked, isResourceLocked } from '../lib/locks';
import { todayLocalISO, addDaysLocalISO, daysBetween } from '../lib/dates';

interface Props {
  open: boolean;
  assets: Asset[];
  equipment: Resource[];
  profile: Profile | null;
  onClose: () => void;
  onSubmit: (loan: {
    assets: Asset[];
    purpose: string;
    startDate: string;
    returnDate: string;
  }) => string | null;
}

const PERIOD_PRESETS: { id: string; label: string; days: number }[] = [
  { id: '1d', label: '1 Hari', days: 1 },
  { id: '1w', label: '1 Minggu', days: 7 },
  { id: '1m', label: '1 Bulan', days: 30 },
  { id: 'custom', label: 'Pilih', days: 0 },
];

// Date helpers from ../lib/dates are local-timezone safe.
const todayISO = todayLocalISO;
const addDaysISO = addDaysLocalISO;

export function BulkLoanModal({ open, assets, equipment, profile, onClose, onSubmit }: Props) {
  const [step, setStep] = useState<'select' | 'form'>('select');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [purposeCategory, setPurposeCategory] = useState('PdPc');
  const [purposeDetail, setPurposeDetail] = useState('');
  const [period, setPeriod] = useState<string>('1d');
  const [customStart, setCustomStart] = useState<string>(todayISO());
  const [customReturn, setCustomReturn] = useState<string>(addDaysISO(todayISO(), 1));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStep('select');
      setPicked(new Set());
      setSearch('');
      setPurposeCategory('PdPc');
      setPurposeDetail('');
      setPeriod('1d');
      setCustomStart(todayISO());
      setCustomReturn(addDaysISO(todayISO(), 1));
      setError(null);
    }
  }, [open]);

  // Preset rows always start today; only "Pilih" lets the user pick a start date.
  const startDate = period === 'custom' ? customStart : todayISO();
  const returnDate = useMemo(() => {
    if (period === 'custom') return customReturn;
    const preset = PERIOD_PRESETS.find((p) => p.id === period);
    return preset ? addDaysISO(startDate, preset.days) : addDaysISO(startDate, 1);
  }, [period, customReturn, startDate]);

  // Filter out locked assets and assets in locked categories from selection.
  const available = useMemo(() => {
    const lockedCategoryIds = new Set(equipment.filter(isResourceLocked).map((e) => e.id));
    return assets.filter((a) =>
      a.status === 'available' &&
      !isAssetLocked(a) &&
      !lockedCategoryIds.has(a.resourceId)
    );
  }, [assets, equipment]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return available;
    return available.filter((a) => {
      const cat = equipment.find((e) => e.id === a.resourceId)?.name?.toLowerCase() ?? '';
      return (
        a.name.toLowerCase().includes(q) ||
        a.serialNumber.toLowerCase().includes(q) ||
        cat.includes(q)
      );
    });
  }, [available, search, equipment]);

  const grouped = useMemo(() => {
    const map = new Map<string, Asset[]>();
    filtered.forEach((a) => {
      const key = a.resourceId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    return [...map.entries()].map(([resourceId, list]) => ({
      resourceId,
      categoryName: equipment.find((e) => e.id === resourceId)?.name ?? resourceId,
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
    () => available.filter((a) => picked.has(a.id)),
    [available, picked],
  );

  const goToForm = () => {
    if (picked.size === 0) {
      setError('Sila pilih sekurang-kurangnya 1 unit.');
      return;
    }
    setError(null);
    setStep('form');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!profile) {
      setError('Sila log masuk profil dulu.');
      return;
    }
    if (returnDate < startDate) {
      setError('Tarikh kembali tak boleh lebih awal.');
      return;
    }
    const finalPurpose = purposeCategory === 'Lain-lain'
      ? purposeDetail
      : (purposeDetail ? `${purposeCategory}: ${purposeDetail}` : purposeCategory);
    const err = onSubmit({ assets: pickedAssets, purpose: finalPurpose, startDate, returnDate });
    if (err) {
      setError(err);
    } else {
      onClose();
    }
  };

  const totalDays = Math.max(1, daysBetween(startDate, returnDate));

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
            className="relative bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white shrink-0">
                  <Package size={20} />
                </div>
                <div>
                  <p className="text-[10px] text-purple-600 uppercase tracking-widest font-bold">
                    {step === 'select' ? 'Langkah 1 / 2 — Pilih Unit' : 'Langkah 2 / 2 — Tujuan & Tempoh'}
                  </p>
                  <h2 className="text-base font-bold tracking-tight text-slate-800 leading-tight">
                    Pinjam Pukal ICT
                  </h2>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="m-6 mb-0 bg-rose-50 border border-rose-100 rounded-lg p-3 flex items-start gap-2 shrink-0">
                <AlertCircle size={14} className="text-rose-500 shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-rose-700">{error}</p>
              </div>
            )}

            {/* Step 1: Select assets */}
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
                      className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-hide px-6 pb-3">
                  {grouped.length === 0 && (
                    <div className="p-12 text-center text-xs text-slate-400 italic">
                      Tiada unit tersedia untuk dipinjam.
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
                            <CheckSquare size={14} className="text-purple-600" />
                          ) : somePicked ? (
                            <Square size={14} className="text-purple-400" fill="currentColor" />
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
                            return (
                              <button
                                key={a.id}
                                type="button"
                                onClick={() => toggle(a.id)}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                                  checked
                                    ? 'bg-purple-50 border-purple-300'
                                    : 'bg-white border-slate-200 hover:border-purple-300 hover:bg-slate-50'
                                }`}
                              >
                                {checked ? (
                                  <CheckSquare size={16} className="text-purple-600 shrink-0" />
                                ) : (
                                  <Square size={16} className="text-slate-400 shrink-0" />
                                )}
                                {a.imageUrl ? (
                                  <img src={a.imageUrl} alt={a.name} referrerPolicy="no-referrer" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                                    <Laptop size={16} />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-slate-800 truncate">{a.name}</p>
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
                    onClick={goToForm}
                    disabled={picked.size === 0}
                    className="bg-purple-600 text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-purple-700 transition-all shadow-md shadow-purple-500/20 active:scale-95 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Seterusnya <ArrowRight size={14} />
                  </button>
                </div>
              </>
            )}

            {/* Step 2: Form */}
            {step === 'form' && (
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto scrollbar-hide p-6 space-y-5">
                {/* Picked summary */}
                <div className="bg-gradient-to-br from-slate-50 to-purple-50 border border-slate-200 rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                    {pickedAssets.length} Unit Dipilih
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {pickedAssets.slice(0, 8).map((a) => (
                      <span key={a.id} className="text-[10px] font-bold px-2 py-1 bg-white border border-slate-200 rounded text-slate-700">
                        {a.name}
                      </span>
                    ))}
                    {pickedAssets.length > 8 && (
                      <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 rounded text-slate-500">
                        +{pickedAssets.length - 8} lagi
                      </span>
                    )}
                  </div>
                </div>

                {/* Tujuan */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tujuan</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PURPOSE_PRESETS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPurposeCategory(p)}
                        className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                          purposeCategory === p
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-blue-400 hover:text-blue-600'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={purposeDetail}
                    onChange={(e) => setPurposeDetail(e.target.value)}
                    placeholder={purposeCategory === 'Lain-lain' ? 'Sila nyatakan...' : 'Perincian tambahan (pilihan)'}
                    required={purposeCategory === 'Lain-lain'}
                    className="w-full mt-2 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                  />
                </div>

                {/* Tempoh */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tempoh</label>
                  <div className="grid grid-cols-4 gap-2">
                    {PERIOD_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPeriod(p.id)}
                        className={`px-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                          period === p.id
                            ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-purple-400 hover:text-purple-600'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  {period === 'custom' && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Dari</label>
                        <input
                          type="date"
                          value={customStart}
                          onChange={(e) => {
                            const v = e.target.value;
                            setCustomStart(v);
                            // Auto-bump end date if it falls behind the new start
                            if (customReturn < v) setCustomReturn(v);
                          }}
                          required
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Hingga</label>
                        <input
                          type="date"
                          value={customReturn}
                          min={customStart}
                          onChange={(e) => setCustomReturn(e.target.value)}
                          required
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 outline-none transition-all"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                  <Calendar size={18} className="text-slate-400 shrink-0" />
                  <div className="text-xs text-slate-600 leading-relaxed">
                    <strong>{startDate}</strong> → <strong>{returnDate}</strong>
                    <span className="text-[10px] text-slate-400 ml-2">({totalDays} hari × {pickedAssets.length} unit)</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep('select')}
                    className="px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all flex items-center gap-1"
                  >
                    <ArrowLeft size={12} /> Kembali
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg text-sm font-bold uppercase tracking-widest hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg shadow-purple-500/25 active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <Sparkles size={14} /> Pinjam {pickedAssets.length} Unit
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
