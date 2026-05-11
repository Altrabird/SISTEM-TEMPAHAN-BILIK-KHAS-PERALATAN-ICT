import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, CalendarDays, TrendingUp, MapPin, Shield, Search, RefreshCw,
  ArrowUpDown, X, Crown, Trophy, ChevronRight, Cloud, CloudOff
} from 'lucide-react';
import { Asset, Booking, Resource, Profile } from '../types';
import { ROLE_LABELS, ACHIEVEMENTS } from '../constants';
import { computePortfolioStats } from '../lib/achievements';
import { fetchProfilesFromCloud, fetchBookingsFromCloud } from '../lib/storage';
import { isSupabaseEnabled } from '../lib/supabase';
import { todayLocalISO } from '../lib/dates';
import { resolveResourceName } from '../lib/resources';
import { PortfolioView } from './PortfolioView';

interface Props {
  rooms: Resource[];
  equipment: Resource[];
  assets: Asset[];
  localBookings: Booking[];
}

type SortKey = 'name' | 'total' | 'thisMonth' | 'streak' | 'achievements' | 'lastActive';
type SortDir = 'asc' | 'desc';

export function AdminView({ rooms, equipment, assets, localBookings }: Props) {
  const [profiles, setProfiles] = useState<Profile[] | null>(null);
  const [bookings, setBookings] = useState<Booking[]>(localBookings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('total');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    if (!isSupabaseEnabled) {
      setProfiles([]);
      setBookings(localBookings);
      setLoading(false);
      return;
    }
    const [p, b] = await Promise.all([fetchProfilesFromCloud(), fetchBookingsFromCloud()]);
    if (p === null && b === null) {
      setError('Gagal sambung ke Supabase. Pastikan kunci VITE_SUPABASE_* betul.');
    }
    setProfiles(p ?? []);
    setBookings(b ?? localBookings);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo(() => {
    if (!profiles) return [];
    return profiles.map((p) => {
      const stats = computePortfolioStats(bookings, rooms, equipment, p.id, p.joinedAt);
      return { profile: p, stats };
    });
  }, [profiles, bookings, rooms, equipment]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = !q
      ? rows
      : rows.filter(({ profile: p }) => {
          return (
            p.name.toLowerCase().includes(q) ||
            (p.email?.toLowerCase().includes(q) ?? false) ||
            (p.department?.toLowerCase().includes(q) ?? false) ||
            (ROLE_LABELS[p.role] ?? p.role).toLowerCase().includes(q)
          );
        });
    return [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name': cmp = a.profile.name.localeCompare(b.profile.name); break;
        case 'total': cmp = a.stats.totalBookings - b.stats.totalBookings; break;
        case 'thisMonth': cmp = a.stats.thisMonthBookings - b.stats.thisMonthBookings; break;
        case 'streak': cmp = a.stats.currentStreakWeeks - b.stats.currentStreakWeeks; break;
        case 'achievements': cmp = a.stats.unlockedAchievements.length - b.stats.unlockedAchievements.length; break;
        case 'lastActive': cmp = a.profile.lastActiveAt - b.profile.lastActiveAt; break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rows, search, sortKey, sortDir]);

  const schoolStats = useMemo(() => {
    const now = new Date();
    const todayISO = todayLocalISO();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const active = bookings.filter((b) => b.status !== 'cancelled');

    const resourceCount = new Map<string, number>();
    active.forEach((b) => resourceCount.set(b.resourceId, (resourceCount.get(b.resourceId) ?? 0) + 1));
    let busiest: { name: string; count: number } | null = null;
    resourceCount.forEach((count, id) => {
      if (!busiest || count > busiest.count) {
        busiest = { name: resolveResourceName(id, rooms, equipment, assets), count };
      }
    });

    return {
      totalUsers: profiles?.length ?? 0,
      totalBookings: active.length,
      thisMonth: active.filter((b) => b.date.startsWith(monthKey)).length,
      today: active.filter((b) => b.date === todayISO).length,
      busiest,
    };
  }, [profiles, bookings, rooms, equipment, assets]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  };

  const selectedProfile = profiles?.find((p) => p.id === selectedProfileId) ?? null;

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 text-white p-8 shadow-xl"
      >
        <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute -right-10 -bottom-20 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative flex items-start gap-5">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center shrink-0">
            <Shield size={26} />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-purple-200/80">Paparan Pentadbir</p>
            <h1 className="text-2xl font-bold tracking-tight">Pemantauan Aktiviti & Pencapaian Guru</h1>
            <p className="text-sm text-purple-100/70 mt-1.5 max-w-2xl">
              Pantau penggunaan sumber, lihat statistik penuh setiap guru,
              dan kenal pasti pengguna paling aktif.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest">
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
        <Kpi icon={Users} label="Total Guru" value={schoolStats.totalUsers} accent="bg-purple-50 text-purple-600" />
        <Kpi icon={CalendarDays} label="Total Tempahan" value={schoolStats.totalBookings} accent="bg-blue-50 text-blue-600" />
        <Kpi icon={TrendingUp} label="Bulan Ini" value={schoolStats.thisMonth} accent="bg-emerald-50 text-emerald-600" />
        <Kpi
          icon={MapPin}
          label="Sumber Paling Laris"
          value={schoolStats.busiest?.name ?? '—'}
          subtitle={schoolStats.busiest ? `${schoolStats.busiest.count}x` : ''}
          accent="bg-rose-50 text-rose-600"
          isText
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Trophy size={14} /> Leaderboard Guru
            </h3>
            <p className="text-base font-bold text-slate-800 leading-tight mt-0.5">
              {filtered.length} guru dipaparkan
            </p>
          </div>
          <div className="flex gap-2 items-center flex-1 sm:flex-none sm:w-72 max-w-full">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, jabatan..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-xs font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
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

        {error && (
          <div className="p-4 bg-rose-50 border-b border-rose-100 text-xs text-rose-700 font-bold">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <SortHeader label="Guru" myKey="name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Total" myKey="total" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="right" />
                <SortHeader label="Bulan Ini" myKey="thisMonth" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="right" />
                <SortHeader label="Streak" myKey="streak" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="right" />
                <SortHeader label="Pencapaian" myKey="achievements" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} align="right" />
                <SortHeader label="Akhir Aktif" myKey="lastActive" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-xs text-slate-400 italic">
                    Memuat data dari Supabase...
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-xs text-slate-400 italic">
                    Tiada guru dijumpai.
                  </td>
                </tr>
              )}
              {!loading && filtered.map(({ profile: p, stats }, idx) => {
                const initials = p.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                const totalAch = ACHIEVEMENTS.length;
                const achPct = (stats.unlockedAchievements.length / totalAch) * 100;
                return (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedProfileId(p.id)}
                    className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {idx < 3 && sortKey !== 'name' && sortKey !== 'lastActive' && (
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                            idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                            idx === 1 ? 'bg-slate-200 text-slate-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {idx === 0 ? <Crown size={12} /> : idx + 1}
                          </div>
                        )}
                        {p.avatarUrl ? (
                          <img src={p.avatarUrl} alt={p.name} referrerPolicy="no-referrer" className="w-9 h-9 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{p.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {ROLE_LABELS[p.role] ?? p.role}
                            {p.department && ` • ${p.department}`}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right text-sm font-black text-slate-800">{stats.totalBookings}</td>
                    <td className="px-4 py-4 text-right text-sm font-bold text-slate-700">{stats.thisMonthBookings}</td>
                    <td className="px-4 py-4 text-right">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                        stats.currentStreakWeeks >= 4 ? 'text-orange-600' :
                        stats.currentStreakWeeks >= 2 ? 'text-amber-600' :
                        'text-slate-400'
                      }`}>
                        {stats.currentStreakWeeks}M
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col items-end gap-1">
                        <p className="text-[11px] font-bold text-slate-700">
                          {stats.unlockedAchievements.length}/{totalAch}
                        </p>
                        <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-yellow-400 to-amber-500"
                            style={{ width: `${achPct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(p.lastActiveAt).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selectedProfile && (
          <ProfileDetailModal
            profile={selectedProfile}
            bookings={bookings}
            rooms={rooms}
            equipment={equipment}
            assets={assets}
            onClose={() => setSelectedProfileId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ProfileDetailModal({
  profile, bookings, rooms, equipment, assets, onClose,
}: {
  profile: Profile;
  bookings: Booking[];
  rooms: Resource[];
  equipment: Resource[];
  assets: Asset[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-[#f8fafc] rounded-2xl w-full max-w-6xl shadow-2xl border border-slate-200 my-auto"
      >
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Paparan Pentadbir</p>
            <h2 className="text-base font-bold text-slate-800">Portfolio: {profile.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          <PortfolioView
            profile={profile}
            bookings={bookings}
            rooms={rooms}
            equipment={equipment}
            assets={assets}
            readOnly
          />
        </div>
      </motion.div>
    </div>
  );
}

function Kpi({
  icon: Icon, label, value, subtitle, accent, isText = false,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number | string;
  subtitle?: string;
  accent: string;
  isText?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all"
    >
      <div className={`w-10 h-10 rounded-lg ${accent} flex items-center justify-center mb-3`}>
        <Icon size={18} />
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`${isText ? 'text-base truncate' : 'text-2xl'} font-black text-slate-800 mt-1`}>{value}</p>
      {subtitle && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{subtitle}</p>}
    </motion.div>
  );
}

function SortHeader({
  label, myKey, sortKey, sortDir, onSort, align = 'left',
}: {
  label: string;
  myKey: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (k: SortKey) => void;
  align?: 'left' | 'right';
}) {
  const active = sortKey === myKey;
  return (
    <th className={`px-${align === 'right' ? '4' : '6'} py-3 text-${align}`}>
      <button
        onClick={() => onSort(myKey)}
        className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest transition-colors ${
          active ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        {label}
        <ArrowUpDown size={10} className={active ? '' : 'opacity-40'} />
        {active && <span className="text-[8px]">{sortDir === 'asc' ? '↑' : '↓'}</span>}
      </button>
    </th>
  );
}
