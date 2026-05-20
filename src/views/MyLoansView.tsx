import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  PackageCheck, Calendar, Clock, AlertTriangle, Search,
  Laptop, ArrowRight, Filter, Sparkles, CheckSquare, Square,
  KeyRound, Copy, Check,
} from 'lucide-react';
import { Asset, Booking, Profile, Resource } from '../types';
import { todayLocalISO, daysBetween } from '../lib/dates';

interface Props {
  profile: Profile | null;
  bookings: Booking[];
  assets: Asset[];
  equipment: Resource[];
  onReturn: (booking: Booking) => void;
  onBulkReturn?: (
    items: { booking: Booking; asset?: Asset; category?: Resource }[],
  ) => void;
  onNewLoan: () => void;
}

type FilterMode = 'active' | 'history' | 'all';

export function MyLoansView({ profile, bookings, assets, equipment, onReturn, onBulkReturn, onNewLoan }: Props) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('active');
  const [selectMode, setSelectMode] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  // Reset selection when leaving active filter or toggling off select mode
  useEffect(() => {
    if (filter !== 'active') {
      setSelectMode(false);
      setPicked(new Set());
    }
  }, [filter]);
  useEffect(() => {
    if (!selectMode) setPicked(new Set());
  }, [selectMode]);

  const today = todayLocalISO();

  const myLoans = useMemo(() => {
    if (!profile) return [];
    return bookings.filter(
      (b) => b.userId === profile.id && b.resourceType === 'equipment' && b.status !== 'cancelled',
    );
  }, [bookings, profile]);

  const filtered = useMemo(() => {
    let list: Booking[];
    if (filter === 'history') list = myLoans.filter((b) => b.status === 'returned');
    else if (filter === 'active') list = myLoans.filter((b) => b.status !== 'returned');
    else list = myLoans;

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((b) => {
        const asset = assets.find((a) => a.id === b.resourceId);
        return (
          (asset?.name?.toLowerCase().includes(q) ?? false) ||
          (asset?.serialNumber?.toLowerCase().includes(q) ?? false) ||
          b.purpose.toLowerCase().includes(q)
        );
      });
    }

    // Active first (sorted by expected return), then returned (most recent first)
    return list.sort((a, b) => {
      if (a.status !== b.status) {
        if (a.status === 'returned' && b.status !== 'returned') return 1;
        if (b.status === 'returned' && a.status !== 'returned') return -1;
      }
      if (a.status === 'returned' && b.status === 'returned') {
        return (b.returnedAt ?? 0) - (a.returnedAt ?? 0);
      }
      const aDue = a.returnDate ?? a.date;
      const bDue = b.returnDate ?? b.date;
      return aDue.localeCompare(bDue);
    });
  }, [myLoans, filter, search, assets, today]);

  const counters = useMemo(() => {
    const active = myLoans.filter((b) => b.status !== 'returned').length;
    const overdue = myLoans.filter(
      (b) => b.status !== 'returned' && (b.returnDate ?? b.date) < today,
    ).length;
    const returned = myLoans.filter((b) => b.status === 'returned').length;
    return { active, overdue, returned, total: myLoans.length };
  }, [myLoans, today]);

  if (!profile) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <p className="text-sm text-slate-500">Sila log masuk profil untuk melihat pinjaman anda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Hero card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 text-white p-5 md:p-6 shadow-xl shadow-emerald-500/25"
      >
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute right-0 bottom-0 w-32 h-32 bg-teal-400/20 rounded-full blur-2xl" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3 md:gap-4">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-white/15 backdrop-blur ring-1 ring-white/30 flex items-center justify-center shrink-0">
              <PackageCheck size={22} />
            </div>
            <div>
              <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-emerald-100/90">Pinjaman Saya</p>
              <h2 className="text-lg md:text-xl font-bold">Pemulangan ICT</h2>
              <p className="text-[11px] md:text-xs text-emerald-100/80 mt-0.5 leading-relaxed">
                Tanda alat sebagai pulang setelah anda kembalikan.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
            <div className="text-center">
              <p className="text-2xl font-black leading-none">{counters.active}</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-100/80 mt-1">Aktif</p>
            </div>
            {counters.overdue > 0 && (
              <div className="text-center pl-3 border-l border-white/20">
                <p className="text-2xl font-black leading-none text-rose-200">{counters.overdue}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-rose-200 mt-1">Lewat</p>
              </div>
            )}
            <div className="text-center pl-3 border-l border-white/20">
              <p className="text-2xl font-black leading-none">{counters.returned}</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-100/80 mt-1">Pulang</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Empty state — no loans at all */}
      {myLoans.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <PackageCheck size={26} />
          </div>
          <p className="text-base font-bold text-slate-800">Tiada pinjaman</p>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-xs mx-auto">
            Anda belum ada pinjaman peralatan ICT. Pinjam unit dari menu Peralatan ICT atau imbas QR sticker.
          </p>
          <button
            onClick={onNewLoan}
            className="mt-5 bg-purple-600 text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-purple-700 transition-all shadow-md inline-flex items-center gap-2"
          >
            <Sparkles size={14} /> Pinjam Peralatan
          </button>
        </div>
      )}

      {/* Filter + search (only when there are loans) */}
      {myLoans.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 md:p-5 border-b border-slate-100 space-y-3">
            <div className="flex gap-1 bg-slate-50 rounded-lg p-1 border border-slate-200">
              {[
                { id: 'active' as FilterMode, label: `Aktif (${counters.active})` },
                { id: 'history' as FilterMode, label: `Telah Pulang (${counters.returned})` },
                { id: 'all' as FilterMode, label: `Semua (${counters.total})` },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`flex-1 px-2 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1 ${
                    filter === f.id ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {f.id === 'active' && <Filter size={10} />}
                  {f.label}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari unit, no. siri, tujuan..."
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all"
              />
            </div>

            {/* Bulk return controls (only on Aktif filter, only when onBulkReturn provided) */}
            {filter === 'active' && counters.active > 0 && onBulkReturn && (
              <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                <button
                  onClick={() => setSelectMode((v) => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border ${
                    selectMode
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-400 hover:text-emerald-600'
                  }`}
                >
                  {selectMode ? <CheckSquare size={12} /> : <Square size={12} />}
                  {selectMode ? 'Batal Pilih' : 'Pilih untuk Pulangkan Pukal'}
                </button>
                {selectMode && (
                  <div className="flex items-center gap-1.5 ml-auto">
                    <button
                      onClick={() => {
                        // Select all currently visible active items
                        const activeIds = filtered
                          .filter((b) => b.status !== 'returned')
                          .map((b) => b.id);
                        const allPicked = activeIds.every((id) => picked.has(id));
                        setPicked(allPicked ? new Set() : new Set(activeIds));
                      }}
                      className="text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:text-emerald-700 px-2 py-1.5"
                    >
                      {filtered.filter((b) => b.status !== 'returned').every((b) => picked.has(b.id))
                        ? 'Buang Semua'
                        : 'Pilih Semua'}
                    </button>
                    <button
                      disabled={picked.size === 0}
                      onClick={() => {
                        const items = Array.from(picked)
                          .map((id) => {
                            const booking = bookings.find((b) => b.id === id);
                            if (!booking) return null;
                            const asset = assets.find((a) => a.id === booking.resourceId);
                            const category = asset
                              ? equipment.find((e) => e.id === asset.resourceId) ?? undefined
                              : undefined;
                            return { booking, asset, category };
                          })
                          .filter(Boolean) as { booking: Booking; asset?: Asset; category?: Resource }[];
                        onBulkReturn(items);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 transition-all shadow-md shadow-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <PackageCheck size={12} /> Pulangkan {picked.size > 0 ? `(${picked.size})` : ''}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <div className="p-10 text-center text-xs text-slate-400 italic">
                Tiada pinjaman dalam kategori ini.
              </div>
            )}
            {filtered.map((b) => {
              const asset = assets.find((a) => a.id === b.resourceId);
              const category = asset ? equipment.find((e) => e.id === asset.resourceId) : null;
              const expectedReturn = b.returnDate ?? b.date;
              const overdue = b.status !== 'returned' && expectedReturn < today;
              const overdueDays = overdue ? daysBetween(expectedReturn, today) : 0;
              const isReturned = b.status === 'returned';
              const isPicked = picked.has(b.id);
              const showCheckbox = selectMode && !isReturned;
              return (
                <div
                  key={b.id}
                  className={`p-4 md:p-5 transition-colors ${
                    isPicked ? 'bg-emerald-50' :
                    isReturned ? 'bg-emerald-50/30' :
                    overdue ? 'bg-rose-50/30' :
                    selectMode ? 'hover:bg-emerald-50/40 cursor-pointer' :
                    'hover:bg-slate-50'
                  }`}
                  onClick={
                    showCheckbox
                      ? () => {
                          setPicked((prev) => {
                            const next = new Set(prev);
                            if (next.has(b.id)) next.delete(b.id);
                            else next.add(b.id);
                            return next;
                          });
                        }
                      : undefined
                  }
                >
                  <div className="flex items-start gap-3">
                    {showCheckbox && (
                      <div className="pt-1 shrink-0">
                        {isPicked ? (
                          <CheckSquare size={20} className="text-emerald-600" />
                        ) : (
                          <Square size={20} className="text-slate-400" />
                        )}
                      </div>
                    )}
                    {asset?.imageUrl ? (
                      <img
                        src={asset.imageUrl}
                        alt={asset.name}
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 rounded-lg object-cover ring-1 ring-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                        <Laptop size={22} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">
                            {asset?.name ?? b.resourceId}
                          </p>
                          {asset && (
                            <p className="text-[10px] font-mono text-blue-600 uppercase truncate">
                              {asset.serialNumber}
                            </p>
                          )}
                          {category && (
                            <p className="text-[10px] text-slate-500 truncate">{category.name}</p>
                          )}
                        </div>
                        <span
                          className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border shrink-0 ${
                            isReturned
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : overdue
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {isReturned ? 'Pulang' : overdue ? 'Lewat' : 'Aktif'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={11} className="text-slate-400" />
                          <span><strong className="text-slate-700">Pinjam:</strong> {b.date}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock size={11} className="text-slate-400" />
                          <span className={overdue ? 'text-rose-600' : ''}>
                            <strong className={overdue ? 'text-rose-600' : 'text-slate-700'}>Kembali:</strong> {expectedReturn}
                            {overdue && <span className="ml-1 font-bold">(lewat {overdueDays}h)</span>}
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500 mt-1.5 line-clamp-2">{b.purpose}</p>

                      {!isReturned && asset?.accessNote && (
                        <AccessNoteBlock note={asset.accessNote} />
                      )}

                      {isReturned && b.returnedAt && (
                        <p className="text-[10px] text-emerald-700 mt-1.5">
                          <PackageCheck size={10} className="inline mr-0.5" />
                          Dipulangkan pada {new Date(b.returnedAt).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {b.returnedByName && b.returnedByName !== profile.name && (
                            <span className="text-slate-500"> oleh {b.returnedByName}</span>
                          )}
                          {b.returnNotes && <span className="text-slate-500 italic"> · {b.returnNotes}</span>}
                        </p>
                      )}

                      {!isReturned && !selectMode && (
                        <div className="flex gap-2 mt-3 flex-wrap">
                          <button
                            onClick={(e) => { e.stopPropagation(); onReturn(b); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg hover:from-emerald-600 hover:to-green-700 transition-all shadow-md shadow-emerald-500/30 active:scale-95"
                          >
                            <PackageCheck size={12} /> Pulangkan Sekarang
                            <ArrowRight size={10} />
                          </button>
                          {overdue && (
                            <span className="text-[10px] text-rose-700 font-bold flex items-center gap-1">
                              <AlertTriangle size={11} /> Sila pulangkan secepat mungkin
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Renders the admin-seeded access note (password / PIN / credentials)
 * for an active loan. One-tap "Salin" copies the note to clipboard so the
 * borrower can paste it straight into the device login.
 */
function AccessNoteBlock({ note }: { note: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(note);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can fail on insecure contexts — fall back to selectable text only
    }
  };

  return (
    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 flex items-start gap-2">
      <KeyRound size={12} className="text-amber-700 mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-bold uppercase tracking-widest text-amber-700">
          Nota Akses
        </p>
        <p className="text-[12px] font-mono text-slate-800 leading-snug whitespace-pre-wrap break-words select-text mt-0.5">
          {note}
        </p>
      </div>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); void handleCopy(); }}
        className={`shrink-0 p-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-1 ${
          copied
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-white border border-amber-300 text-amber-700 hover:bg-amber-100'
        }`}
        title="Salin nota akses"
      >
        {copied ? <Check size={11} /> : <Copy size={11} />}
        {copied ? 'Salin!' : 'Salin'}
      </button>
    </div>
  );
}
