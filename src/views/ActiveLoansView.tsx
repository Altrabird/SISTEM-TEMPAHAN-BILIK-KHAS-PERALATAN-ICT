import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  PackageCheck, Calendar, Clock, AlertTriangle, Search, RefreshCw,
  Laptop, Cloud, CloudOff, ArrowRight, Filter, Mail, Trash2,
} from 'lucide-react';
import { Asset, Booking, Resource } from '../types';
import { fetchBookingsFromCloud, fetchAssetsFromCloud } from '../lib/storage';
import { isSupabaseEnabled } from '../lib/supabase';
import { todayLocalISO, daysBetween as daysBetweenISO } from '../lib/dates';

interface Props {
  rooms: Resource[];
  equipment: Resource[];
  localBookings: Booking[];
  localAssets: Asset[];
  onMarkReturn: (booking: Booking, asset: Asset | null) => void;
  /** Admin cancels a loan the teacher never picked up / no longer needs.
   *  Distinct from "Tanda Pulang": cancelling voids the loan record
   *  instead of closing it as a completed return. */
  onRequestCancel: (booking: Booking) => void;
}

type FilterMode = 'active' | 'overdue' | 'all-loans' | 'returned';

// Local-timezone-safe helpers re-exported from ../lib/dates
const todayISO = todayLocalISO;
const daysBetween = daysBetweenISO;

export function ActiveLoansView({
  rooms, equipment, localBookings, localAssets, onMarkReturn, onRequestCancel,
}: Props) {
  const [bookings, setBookings] = useState<Booking[]>(localBookings);
  const [assets, setAssets] = useState<Asset[]>(localAssets);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('active');

  const load = async () => {
    setLoading(true);
    setError(null);
    if (!isSupabaseEnabled) {
      setBookings(localBookings);
      setAssets(localAssets);
      setLoading(false);
      return;
    }
    const [b, a] = await Promise.all([fetchBookingsFromCloud(), fetchAssetsFromCloud()]);
    if (b === null && a === null) setError('Gagal sambung ke Supabase.');
    setBookings(b ?? localBookings);
    setAssets(a ?? localAssets);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync local bookings into our state when caller hands us new ones (e.g.
  // after an admin marks a return).
  useEffect(() => {
    setBookings(localBookings);
  }, [localBookings]);
  useEffect(() => {
    setAssets(localAssets);
  }, [localAssets]);

  const today = todayISO();

  const allLoans = useMemo(
    () => bookings.filter((b) => b.resourceType === 'equipment' && b.status !== 'cancelled'),
    [bookings],
  );

  const filtered = useMemo(() => {
    let list: Booking[];
    if (filter === 'all-loans') list = allLoans;
    else if (filter === 'returned') list = allLoans.filter((b) => b.status === 'returned');
    else if (filter === 'overdue') {
      list = allLoans.filter(
        (b) => b.status !== 'returned' && (b.returnDate ?? b.date) < today,
      );
    } else {
      // active: confirmed + not yet returned
      list = allLoans.filter((b) => b.status !== 'returned');
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((b) => {
        const asset = assets.find((a) => a.id === b.resourceId);
        return (
          b.userName.toLowerCase().includes(q) ||
          b.purpose.toLowerCase().includes(q) ||
          (asset?.name?.toLowerCase().includes(q) ?? false) ||
          (asset?.serialNumber?.toLowerCase().includes(q) ?? false)
        );
      });
    }

    return list.sort((a, b) => {
      // Overdue first, then by expected return date
      const aDue = a.returnDate ?? a.date;
      const bDue = b.returnDate ?? b.date;
      return aDue.localeCompare(bDue);
    });
  }, [allLoans, filter, search, today, assets]);

  // Counters for header badges
  const counters = useMemo(() => {
    const active = allLoans.filter((b) => b.status !== 'returned').length;
    const overdue = allLoans.filter(
      (b) => b.status !== 'returned' && (b.returnDate ?? b.date) < today,
    ).length;
    const returned = allLoans.filter((b) => b.status === 'returned').length;
    return { active, overdue, returned, all: allLoans.length };
  }, [allLoans, today]);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 via-teal-800 to-slate-900 text-white p-8 shadow-xl"
      >
        <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -right-10 -bottom-20 w-80 h-80 rounded-full bg-teal-500/20 blur-3xl" />
        <div className="relative flex items-start gap-5 justify-between flex-wrap">
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center shrink-0">
              <PackageCheck size={26} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-200/80">Paparan Pentadbir</p>
              <h1 className="text-2xl font-bold tracking-tight">Pemantauan Pinjaman ICT</h1>
              <p className="text-sm text-emerald-100/70 mt-1.5 max-w-2xl">
                Tanda peralatan yang telah dipulangkan, semak yang masih lewat, dan log keadaan unit.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest">
            {isSupabaseEnabled ? (
              <span className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-200 px-2.5 py-1 rounded-md border border-emerald-400/30">
                <Cloud size={12} /> Supabase
              </span>
            ) : (
              <span className="flex items-center gap-1.5 bg-amber-500/20 text-amber-200 px-2.5 py-1 rounded-md border border-amber-400/30">
                <CloudOff size={12} /> Lokal
              </span>
            )}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Counter icon={Clock} label="Aktif" value={counters.active} accent="bg-blue-50 text-blue-600" />
        <Counter icon={AlertTriangle} label="Lewat" value={counters.overdue} accent="bg-rose-50 text-rose-600" highlight={counters.overdue > 0} />
        <Counter icon={PackageCheck} label="Telah Pulang" value={counters.returned} accent="bg-emerald-50 text-emerald-600" />
        <Counter icon={Calendar} label="Total Loan" value={counters.all} accent="bg-slate-100 text-slate-700" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Filter size={12} /> Senarai Pinjaman
            </h3>
            <p className="text-base font-bold text-slate-800 leading-tight mt-0.5">
              {filtered.length} rekod dipaparkan
            </p>
          </div>
          <div className="flex gap-2 items-center flex-1 sm:flex-none sm:w-72 max-w-full">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari peminjam, unit, S/N..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-xs font-medium focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all"
              />
            </div>
            <button
              onClick={() => void load()}
              disabled={loading}
              className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all disabled:opacity-40"
              title="Muat semula"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="px-6 pt-4 pb-2 border-b border-slate-100 flex gap-1.5 flex-wrap">
          {[
            { id: 'active' as FilterMode,    label: `Aktif (${counters.active})`,         tone: 'blue' },
            { id: 'overdue' as FilterMode,   label: `Lewat (${counters.overdue})`,        tone: 'rose' },
            { id: 'returned' as FilterMode,  label: `Telah Pulang (${counters.returned})`, tone: 'emerald' },
            { id: 'all-loans' as FilterMode, label: `Semua (${counters.all})`,            tone: 'slate' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all border ${
                filter === f.id
                  ? f.tone === 'rose' ? 'bg-rose-600 text-white border-rose-600' :
                    f.tone === 'emerald' ? 'bg-emerald-600 text-white border-emerald-600' :
                    f.tone === 'blue' ? 'bg-blue-600 text-white border-blue-600' :
                    'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border-b border-rose-100 text-xs text-rose-700 font-bold">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Unit</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Peminjam</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Tarikh</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Tujuan</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Status</th>
                <th className="px-4 py-3 text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-xs text-slate-400 italic">Memuat...</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-xs text-slate-400 italic">
                  Tiada pinjaman dalam kategori ini.
                </td></tr>
              )}
              {!loading && filtered.map((b) => {
                const asset = assets.find((a) => a.id === b.resourceId);
                const expectedReturn = b.returnDate ?? b.date;
                const overdue = b.status !== 'returned' && expectedReturn < today;
                const overdueDays = overdue ? daysBetween(today, expectedReturn) : 0;
                const isReturned = b.status === 'returned';
                return (
                  <tr key={b.id} className={`transition-colors ${isReturned ? 'bg-emerald-50/30' : overdue ? 'bg-rose-50/30' : 'hover:bg-slate-50'}`}>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        {asset?.imageUrl ? (
                          <img src={asset.imageUrl} alt={asset.name} referrerPolicy="no-referrer" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                            <Laptop size={14} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{asset?.name ?? b.resourceId}</p>
                          {asset && <p className="text-[10px] font-mono text-blue-600 uppercase truncate">{asset.serialNumber}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-bold text-slate-800">{b.userName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[11px] font-bold text-slate-700">
                        <span className="text-slate-400">Pinjam:</span> {b.date}
                      </p>
                      <p className={`text-[11px] font-bold ${overdue ? 'text-rose-600' : 'text-slate-700'}`}>
                        <span className="text-slate-400">Kembali:</span> {expectedReturn}
                        {overdue && <span className="text-rose-600 ml-1">• Lewat {overdueDays}h</span>}
                      </p>
                      {isReturned && b.returnedAt && (
                        <p className="text-[10px] text-emerald-700 mt-0.5">
                          Pulang: {new Date(b.returnedAt).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' })}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[11px] text-slate-600 max-w-xs truncate" title={b.purpose}>{b.purpose}</p>
                      {!isReturned && asset?.accessNote && (
                        <p
                          className="text-[10px] text-blue-700 mt-0.5 flex items-center gap-1"
                          title="Nota akses dihantar ke email peminjam — tidak ditunjuk di sini untuk keselamatan"
                        >
                          <Mail size={10} className="shrink-0" /> Nota akses → email peminjam
                        </p>
                      )}
                      {b.returnNotes && (
                        <p className="text-[10px] text-emerald-700 italic mt-0.5 max-w-xs truncate" title={b.returnNotes}>
                          📝 {b.returnNotes}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isReturned ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <PackageCheck size={10} /> Pulang
                        </span>
                      ) : overdue ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertTriangle size={10} /> Lewat
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-700 border border-blue-200">
                          <Clock size={10} /> Aktif
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!isReturned && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onRequestCancel(b)}
                            className="border border-slate-200 text-slate-500 px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 transition-all flex items-center gap-1"
                            title={`Batalkan pinjaman ${b.userName} (Admin)`}
                          >
                            <Trash2 size={11} /> Batal
                          </button>
                          <button
                            onClick={() => onMarkReturn(b, asset ?? null)}
                            className="bg-emerald-600 text-white px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-1"
                          >
                            <PackageCheck size={11} /> Tanda Pulang
                            <ArrowRight size={10} />
                          </button>
                        </div>
                      )}
                      {isReturned && b.returnedByName && (
                        <p className="text-[10px] text-slate-400">oleh {b.returnedByName}</p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Counter({
  icon: Icon, label, value, accent, highlight,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
  accent: string;
  highlight?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-2xl border p-5 shadow-sm transition-all ${
        highlight ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200'
      }`}
    >
      <div className={`w-10 h-10 rounded-lg ${accent} flex items-center justify-center mb-3`}>
        <Icon size={18} />
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-2xl font-black text-slate-800 mt-1">{value}</p>
    </motion.div>
  );
}
