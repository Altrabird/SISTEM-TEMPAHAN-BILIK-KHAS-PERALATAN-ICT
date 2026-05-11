import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Printer, FileText, Users, CalendarDays, Clock, MapPin, TrendingUp,
  RefreshCw, AlertCircle, Cpu, DoorOpen, Trophy
} from 'lucide-react';
import { Asset, Booking, Resource, Profile } from '../types';
import { ROLE_LABELS, ACHIEVEMENTS } from '../constants';
import { computePortfolioStats } from '../lib/achievements';
import { fetchProfilesFromCloud, fetchBookingsFromCloud } from '../lib/storage';
import { isSupabaseEnabled } from '../lib/supabase';
import { todayLocalISO } from '../lib/dates';
import { resolveResourceName } from '../lib/resources';

interface Props {
  rooms: Resource[];
  equipment: Resource[];
  assets: Asset[];
  localBookings: Booking[];
}

export function ReportsView({ rooms, equipment, assets, localBookings }: Props) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [bookings, setBookings] = useState<Booking[]>(localBookings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setError('Gagal sambung ke Supabase.');
    }
    setProfiles(p ?? []);
    setBookings(b ?? localBookings);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allResources = useMemo(() => [...rooms, ...equipment], [rooms, equipment]);
  const nameOf = useMemo(
    () => (id: string) => resolveResourceName(id, rooms, equipment, assets),
    [rooms, equipment, assets],
  );
  const today = new Date();
  const todayISO = todayLocalISO();
  const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const thisMonthKey = monthKey(today);
  const thisYearKey = String(today.getFullYear());

  // KPIs
  const kpis = useMemo(() => {
    const active = bookings.filter((b) => b.status !== 'cancelled');
    const cancelled = bookings.filter((b) => b.status === 'cancelled');
    const upcoming = active.filter((b) => b.date >= todayISO);
    const tdy = active.filter((b) => b.date === todayISO);

    // Week start (Monday)
    const weekStart = new Date(today);
    const day = weekStart.getDay();
    weekStart.setDate(weekStart.getDate() - day + (day === 0 ? -6 : 1));
    weekStart.setHours(0, 0, 0, 0);
    const thisWeek = active.filter((b) => new Date(b.date) >= weekStart);

    const totalHours = active.reduce((sum, b) => {
      const [sh, sm] = b.startTime.split(':').map(Number);
      const [eh, em] = b.endTime.split(':').map(Number);
      return sum + Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
    }, 0);

    return {
      totalActive: active.length,
      totalCancelled: cancelled.length,
      totalProfiles: profiles.length,
      thisYear: active.filter((b) => b.date.startsWith(thisYearKey)).length,
      thisMonth: active.filter((b) => b.date.startsWith(thisMonthKey)).length,
      thisWeek: thisWeek.length,
      today: tdy.length,
      upcoming: upcoming.length,
      totalHours: Math.round(totalHours),
    };
  }, [bookings, profiles, todayISO, thisMonthKey, thisYearKey, today]);

  // Monthly trend (12 months)
  const monthlyTrend = useMemo(() => {
    const result: { month: string; year: number; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = monthKey(d);
      const label = d.toLocaleDateString('ms-MY', { month: 'short' });
      const count = bookings.filter((b) => b.status !== 'cancelled' && b.date.startsWith(key)).length;
      result.push({ month: label, year: d.getFullYear(), count });
    }
    return result;
  }, [bookings, today]);

  // Top resources
  const topResources = useMemo(() => {
    const counts = new Map<string, number>();
    bookings.filter((b) => b.status !== 'cancelled').forEach((b) => {
      counts.set(b.resourceId, (counts.get(b.resourceId) ?? 0) + 1);
    });
    return [...counts.entries()]
      .map(([id, count]) => {
        const res = allResources.find((r) => r.id === id);
        const asset = assets.find((a) => a.id === id);
        // Asset IDs (ast-*) are ICT loans → type 'equipment'
        const type = res?.type ?? (asset ? 'equipment' : 'unknown');
        return { id, name: nameOf(id), type, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [bookings, allResources, assets, nameOf]);

  // Top users
  const topUsers = useMemo(() => {
    return profiles
      .filter((p) => p.role !== 'admin')
      .map((p) => {
        const stats = computePortfolioStats(bookings, rooms, equipment, p.id, p.joinedAt);
        return {
          profile: p,
          total: stats.totalBookings,
          thisMonth: stats.thisMonthBookings,
          achievements: stats.unlockedAchievements.length,
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [profiles, bookings, rooms, equipment]);

  // Resource type breakdown
  const typeBreakdown = useMemo(() => {
    const active = bookings.filter((b) => b.status !== 'cancelled');
    const room = active.filter((b) => b.resourceType === 'room').length;
    const eq = active.filter((b) => b.resourceType === 'equipment').length;
    const total = room + eq;
    return {
      room,
      equipment: eq,
      roomPct: total > 0 ? Math.round((room / total) * 100) : 0,
      equipmentPct: total > 0 ? Math.round((eq / total) * 100) : 0,
    };
  }, [bookings]);

  // Upcoming bookings (next 10)
  const upcomingList = useMemo(() => {
    return bookings
      .filter((b) => b.status !== 'cancelled' && b.date >= todayISO)
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
      .slice(0, 10);
  }, [bookings, todayISO]);

  // Recent bookings (last 15)
  const recentList = useMemo(() => {
    return [...bookings]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 15);
  }, [bookings]);

  const maxMonth = Math.max(1, ...monthlyTrend.map((m) => m.count));
  const printDate = today.toLocaleDateString('ms-MY', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print-area">
      {/* Print-only header */}
      <div className="hidden print:block print-header">
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3 mb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-700">SK Bandar Tawau</p>
            <h1 className="text-xl font-black text-slate-900">Sistem Tempahan Bilik Khas & Peralatan ICT</h1>
            <p className="text-sm font-bold text-slate-700 uppercase tracking-widest">Laporan Rumusan Sistem</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Dicetak Pada</p>
            <p className="text-xs font-bold text-slate-800">{printDate}</p>
          </div>
        </div>
      </div>

      {/* Screen-only header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="no-print relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 text-white p-8 shadow-xl"
      >
        <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute -right-10 -bottom-20 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5 justify-between">
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center shrink-0">
              <FileText size={26} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-purple-200/80">Paparan Pentadbir</p>
              <h1 className="text-2xl font-bold tracking-tight">Laporan Rumusan Sistem</h1>
              <p className="text-sm text-purple-100/70 mt-1.5 max-w-2xl">
                Statistik penuh, trend, sumber paling laris, dan guru paling aktif. Sedia untuk dicetak.
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => void load()}
              disabled={loading}
              className="bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-40"
              title="Muat semula"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              onClick={handlePrint}
              className="bg-white text-slate-900 hover:bg-purple-50 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg"
            >
              <Printer size={14} /> Cetak Laporan
            </button>
          </div>
        </div>
      </motion.div>

      {error && (
        <div className="no-print bg-rose-50 border border-rose-100 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
          <p className="text-sm font-bold text-rose-700">{error}</p>
        </div>
      )}

      {/* KPI Grid */}
      <Section title="Statistik Utama">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:gap-2">
          <Kpi icon={CalendarDays} label="Total Tempahan Aktif" value={kpis.totalActive} accent="bg-blue-50 text-blue-600" />
          <Kpi icon={Users} label="Total Profil" value={kpis.totalProfiles} accent="bg-purple-50 text-purple-600" />
          <Kpi icon={TrendingUp} label="Tahun Ini" value={kpis.thisYear} accent="bg-emerald-50 text-emerald-600" />
          <Kpi icon={CalendarDays} label="Bulan Ini" value={kpis.thisMonth} accent="bg-cyan-50 text-cyan-600" />
          <Kpi icon={Clock} label="Minggu Ini" value={kpis.thisWeek} accent="bg-amber-50 text-amber-600" />
          <Kpi icon={Clock} label="Hari Ini" value={kpis.today} accent="bg-rose-50 text-rose-600" />
          <Kpi icon={MapPin} label="Akan Datang" value={kpis.upcoming} accent="bg-indigo-50 text-indigo-600" />
          <Kpi icon={Clock} label="Jumlah Jam Guna" value={`${kpis.totalHours}j`} accent="bg-slate-100 text-slate-700" />
        </div>
        {kpis.totalCancelled > 0 && (
          <p className="text-[11px] text-slate-500 mt-3">
            <span className="font-bold">{kpis.totalCancelled}</span> tempahan telah dibatalkan (tidak dikira dalam total aktif).
          </p>
        )}
      </Section>

      {/* Monthly trend */}
      <Section title="Trend 12 Bulan Terakhir">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 print:p-3 print:rounded-none">
          <div className="flex items-end justify-between gap-2 h-48 print:h-36">
            {monthlyTrend.map((m, i) => (
              <div key={`${m.year}-${m.month}-${i}`} className="flex-1 flex flex-col items-center gap-2 min-w-0">
                <div className="w-full flex items-end h-full">
                  <div
                    className={`w-full rounded-t-md ${m.count > 0 ? 'bg-gradient-to-t from-indigo-600 to-purple-500 print:bg-slate-700' : 'bg-slate-100'} relative group`}
                    style={{ height: `${(m.count / maxMonth) * 100}%`, minHeight: m.count > 0 ? '4px' : '0' }}
                  >
                    {m.count > 0 && (
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-700">
                        {m.count}
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate w-full text-center">
                  {m.month}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Resource type breakdown */}
      <Section title="Pecahan Jenis Sumber">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 print:p-4 print:rounded-none">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <BreakdownRow icon={DoorOpen} label="Bilik Khas" count={typeBreakdown.room} pct={typeBreakdown.roomPct} color="bg-blue-500" />
            <BreakdownRow icon={Cpu} label="Peralatan ICT" count={typeBreakdown.equipment} pct={typeBreakdown.equipmentPct} color="bg-purple-500" />
          </div>
        </div>
      </Section>

      {/* Top resources */}
      <Section title="Sumber Paling Kerap Digunakan">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden print:rounded-none">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 w-12">No.</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Sumber</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Jenis</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">Kekerapan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topResources.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-xs text-slate-400 italic">Tiada data tempahan.</td></tr>
              )}
              {topResources.map((r, i) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-xs font-bold text-slate-400">{i + 1}</td>
                  <td className="px-4 py-2.5 text-sm font-bold text-slate-800">{r.name}</td>
                  <td className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest">
                    <span className={`px-2 py-0.5 rounded ${r.type === 'room' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                      {r.type === 'room' ? 'Bilik' : 'Peralatan'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-sm font-black text-slate-800">{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Top users */}
      <Section title="Guru Paling Aktif">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden print:rounded-none">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 w-12">No.</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Guru</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Jabatan</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">Total</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">Bulan Ini</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">
                  <Trophy size={11} className="inline mr-1" />
                  Pencapaian
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topUsers.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-xs text-slate-400 italic">Tiada profil pengguna.</td></tr>
              )}
              {topUsers.map((u, i) => (
                <tr key={u.profile.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-xs font-bold text-slate-400">{i + 1}</td>
                  <td className="px-4 py-2.5 text-sm font-bold text-slate-800">{u.profile.name}</td>
                  <td className="px-4 py-2.5 text-[11px] text-slate-500">
                    {ROLE_LABELS[u.profile.role] ?? u.profile.role}
                    {u.profile.department && ` • ${u.profile.department}`}
                  </td>
                  <td className="px-4 py-2.5 text-right text-sm font-black text-slate-800">{u.total}</td>
                  <td className="px-4 py-2.5 text-right text-xs font-bold text-slate-700">{u.thisMonth}</td>
                  <td className="px-4 py-2.5 text-right text-xs font-bold text-amber-600">
                    {u.achievements}/{ACHIEVEMENTS.length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Upcoming */}
      <Section title={`Tempahan Akan Datang (${upcomingList.length})`}>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden print:rounded-none">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Tarikh / Masa</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Sumber</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Pemohon</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Tujuan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {upcomingList.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-xs text-slate-400 italic">Tiada tempahan akan datang.</td></tr>
              )}
              {upcomingList.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <p className="text-xs font-bold text-slate-800">{b.date}</p>
                    <p className="text-[10px] text-slate-500">{b.startTime} - {b.endTime}</p>
                  </td>
                  <td className="px-4 py-2.5 text-xs font-bold text-slate-700">
                    {nameOf(b.resourceId)}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-600">{b.userName}</td>
                  <td className="px-4 py-2.5 text-[11px] text-slate-500 max-w-xs truncate">{b.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Recent activity */}
      <Section title="Aktiviti Terkini">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden print:rounded-none">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Tarikh Dicipta</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Sumber</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Pemohon</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentList.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-xs text-slate-400 italic">Tiada aktiviti.</td></tr>
              )}
              {recentList.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-[11px] font-bold text-slate-700">
                    {new Date(b.createdAt).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-2.5 text-xs font-bold text-slate-700">
                    {nameOf(b.resourceId)}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-600">{b.userName}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                      b.status === 'cancelled' ? 'bg-rose-50 text-rose-600' :
                      b.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                      'bg-emerald-50 text-emerald-600'
                    }`}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Print footer */}
      <div className="hidden print:block text-center text-[9px] text-slate-500 pt-4 border-t border-slate-300">
        Dijana oleh SKBT Booking System v1.4 • SK Bandar Tawau • {printDate}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 print:break-inside-avoid">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest print:text-slate-700 print:border-b print:border-slate-300 print:pb-1">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Kpi({
  icon: Icon, label, value, accent,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number | string;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 print:p-2 print:rounded-none print:border-slate-300">
      <div className={`w-8 h-8 rounded-lg ${accent} flex items-center justify-center mb-2 print:hidden`}>
        <Icon size={14} />
      </div>
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 leading-tight">{label}</p>
      <p className="text-xl print:text-base font-black text-slate-800 mt-1">{value}</p>
    </div>
  );
}

function BreakdownRow({
  icon: Icon, label, count, pct, color,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  count: number;
  pct: number;
  color: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-slate-500" />
          <span className="text-xs font-bold text-slate-700">{label}</span>
        </div>
        <span className="text-xs font-black text-slate-800">{count} ({pct}%)</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} print:bg-slate-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
