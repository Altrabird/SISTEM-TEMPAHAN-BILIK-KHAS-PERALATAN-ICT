import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Sparkles, Star, Award, Medal, Trophy, Sunrise, Moon, Flame, Zap,
  Compass, Cpu, Rocket, Crown, CalendarDays, Clock, MapPin, TrendingUp,
  Heart, Activity, Target, Lock
} from 'lucide-react';
import { Asset, Booking, Resource, Profile, Achievement } from '../types';
import { ACHIEVEMENTS, ROLE_LABELS } from '../constants';
import { computePortfolioStats } from '../lib/achievements';
import { todayLocalISO } from '../lib/dates';
import { resolveResourceName } from '../lib/resources';

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Sparkles, Star, Award, Medal, Trophy, Sunrise, Moon, Flame, Zap,
  Compass, Cpu, Rocket, Crown,
};

const TIER_STYLES: Record<Achievement['tier'], { bg: string; text: string; ring: string; gradient: string }> = {
  bronze: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    ring: 'ring-amber-200',
    gradient: 'from-amber-400 to-orange-500',
  },
  silver: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    ring: 'ring-slate-300',
    gradient: 'from-slate-400 to-slate-500',
  },
  gold: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    ring: 'ring-yellow-300',
    gradient: 'from-yellow-400 to-amber-500',
  },
  platinum: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    ring: 'ring-indigo-300',
    gradient: 'from-indigo-500 via-purple-500 to-pink-500',
  },
};

interface Props {
  profile: Profile;
  bookings: Booking[];
  rooms: Resource[];
  equipment: Resource[];
  assets: Asset[];
  onEditProfile?: () => void;
  onNewBooking?: () => void;
  readOnly?: boolean;
}

export function PortfolioView({ profile, bookings, rooms, equipment, assets, onEditProfile, onNewBooking, readOnly = false }: Props) {
  const stats = useMemo(
    () => computePortfolioStats(bookings, rooms, equipment, profile.id, profile.joinedAt),
    [bookings, rooms, equipment, profile.id, profile.joinedAt],
  );

  const nameOf = useMemo(
    () => (id: string) => resolveResourceName(id, rooms, equipment, assets),
    [rooms, equipment, assets],
  );
  const today = todayLocalISO();
  const myBookings = useMemo(
    () => bookings.filter((b) => b.userId === profile.id && b.status !== 'cancelled'),
    [bookings, profile.id],
  );

  const upcoming = myBookings
    .filter((b) => b.date >= today)
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
    .slice(0, 3);

  const recent = myBookings
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 6);

  const maxMonthCount = Math.max(1, ...stats.usageByMonth.map((m) => m.count));

  const initials = profile.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const joinedLabel = new Date(profile.joinedAt).toLocaleDateString('ms-MY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white p-8 shadow-xl"
      >
        <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -right-10 -bottom-20 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row items-start gap-8">
          <div className="flex items-center gap-5 flex-1">
            <div className="relative shrink-0">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  referrerPolicy="no-referrer"
                  className="w-24 h-24 rounded-2xl object-cover ring-4 ring-white/20"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 ring-4 ring-white/20 flex items-center justify-center text-3xl font-black">
                  {initials}
                </div>
              )}
              {stats.currentStreakWeeks >= 2 && (
                <div className="absolute -bottom-2 -right-2 bg-orange-500 rounded-full px-2 py-1 flex items-center gap-1 ring-2 ring-slate-900">
                  <Flame size={12} />
                  <span className="text-[10px] font-black">{stats.currentStreakWeeks}M</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200/80">Profil Portfolio</p>
              <h1 className="text-3xl font-bold tracking-tight">{profile.name}</h1>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-widest bg-white/10 px-2.5 py-1 rounded-md border border-white/20">
                  {ROLE_LABELS[profile.role] ?? profile.role}
                </span>
                {profile.department && (
                  <span className="text-xs font-medium text-blue-200">{profile.department}</span>
                )}
              </div>
              {profile.bio && (
                <p className="text-sm text-blue-100/80 leading-relaxed mt-2 max-w-md">{profile.bio}</p>
              )}
              <p className="text-[11px] text-blue-200/60 mt-3 flex items-center gap-2">
                <CalendarDays size={11} /> Sertai sejak {joinedLabel}
              </p>
            </div>
          </div>

          {!readOnly && (
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2 w-full lg:w-auto">
              {onNewBooking && (
                <button
                  onClick={onNewBooking}
                  className="bg-white text-slate-900 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-blue-50 transition-all shadow-lg flex items-center gap-2 justify-center"
                >
                  <Sparkles size={14} /> Tempahan Baru
                </button>
              )}
              {onEditProfile && (
                <button
                  onClick={onEditProfile}
                  className="bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 justify-center"
                >
                  Edit Profil
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={CalendarDays} label="Total Tempahan" value={stats.totalBookings} accent="bg-blue-50 text-blue-600" />
        <KpiCard icon={TrendingUp} label="Bulan Ini" value={stats.thisMonthBookings} accent="bg-emerald-50 text-emerald-600" />
        <KpiCard icon={Clock} label="Jumlah Jam" value={`${stats.totalHours}j`} accent="bg-purple-50 text-purple-600" />
        <KpiCard icon={Flame} label="Streak Mingguan" value={stats.currentStreakWeeks} accent="bg-orange-50 text-orange-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Section icon={Activity} title="Aktiviti 6 Bulan Terakhir">
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-end justify-between gap-3 h-40">
                {stats.usageByMonth.map((m) => (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex items-end h-full">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${(m.count / maxMonthCount) * 100}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className={`w-full rounded-t-md ${m.count > 0 ? 'bg-gradient-to-t from-blue-600 to-blue-400' : 'bg-slate-100'} relative group`}
                      >
                        {m.count > 0 && (
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                            {m.count}
                          </div>
                        )}
                      </motion.div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{m.month}</span>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          <Section icon={Trophy} title={`Pencapaian (${stats.unlockedAchievements.length}/${ACHIEVEMENTS.length})`}>
            <div className="bg-white rounded-2xl border border-slate-200 p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {ACHIEVEMENTS.map((a) => {
                const Icon = ICONS[a.icon] ?? Award;
                const unlocked = stats.unlockedAchievements.includes(a.id);
                const tier = TIER_STYLES[a.tier];
                return (
                  <motion.div
                    key={a.id}
                    whileHover={{ scale: unlocked ? 1.05 : 1.02 }}
                    className={`p-3 rounded-xl border transition-all relative ${
                      unlocked
                        ? `${tier.bg} ${tier.ring} ring-1 border-transparent`
                        : 'bg-slate-50 border-slate-100 opacity-60'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${
                      unlocked
                        ? `bg-gradient-to-br ${tier.gradient} text-white shadow-md`
                        : 'bg-slate-200 text-slate-400'
                    }`}>
                      {unlocked ? <Icon size={18} /> : <Lock size={16} />}
                    </div>
                    <p className={`text-[11px] font-bold leading-tight ${unlocked ? tier.text : 'text-slate-500'}`}>
                      {a.title}
                    </p>
                    <p className="text-[9px] text-slate-500 mt-1 leading-snug line-clamp-2">{a.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </Section>

          <Section icon={Clock} title="Aktiviti Terkini">
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              {recent.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {recent.map((b) => (
                    <li key={b.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <CalendarDays size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">
                          {nameOf(b.resourceId)}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">{b.purpose}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[11px] font-bold text-slate-700">{b.date}</p>
                        <p className="text-[10px] font-medium text-slate-400">{b.startTime}-{b.endTime}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-12 text-center">
                  <p className="text-sm text-slate-400 italic">Tiada aktiviti tempahan lagi.</p>
                </div>
              )}
            </div>
          </Section>
        </div>

        <div className="space-y-6">
          <Section icon={Heart} title="Sumber Kegemaran">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
              {stats.favoriteResource ? (
                <>
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white mb-3 shadow-lg">
                    <Heart size={28} />
                  </div>
                  <p className="text-sm font-bold text-slate-800">{stats.favoriteResource.name}</p>
                  <p className="text-[11px] text-slate-500 mt-1">Digunakan {stats.favoriteResource.count} kali</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                    <Heart size={28} />
                  </div>
                  <p className="text-xs text-slate-400">Belum ada tempahan dicatatkan.</p>
                </>
              )}
            </div>
          </Section>

          <Section icon={Target} title="Cabaran Aktif">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-6 space-y-4 shadow-lg">
              <ChallengeRow label="5 tempahan" current={stats.totalBookings} target={5} />
              <ChallengeRow label="3 bilik berbeza" current={stats.uniqueRooms} target={3} />
              <ChallengeRow label="3 jenis peralatan" current={stats.uniqueEquipment} target={3} />
              <ChallengeRow label="Streak 4 minggu" current={stats.currentStreakWeeks} target={4} />
            </div>
          </Section>

          <Section icon={MapPin} title={`Tempahan Akan Datang (${upcoming.length})`}>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              {upcoming.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {upcoming.map((b) => (
                    <li key={b.id} className="p-4">
                      <p className="text-sm font-bold text-slate-800">
                        {nameOf(b.resourceId)}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <CalendarDays size={11} /> {b.date} • {b.startTime}-{b.endTime}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-6 text-center text-xs text-slate-400 italic">Tiada tempahan akan datang.</div>
              )}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon, label, value, accent,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number | string;
  accent: string;
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
      <p className="text-2xl font-black text-slate-800 mt-1">{value}</p>
    </motion.div>
  );
}

function Section({
  icon: Icon, title, children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
        <Icon size={14} /> {title}
      </h3>
      {children}
    </div>
  );
}

function ChallengeRow({ label, current, target }: { label: string; current: number; target: number }) {
  const pct = Math.min(100, Math.round((current / target) * 100));
  const done = current >= target;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px] font-bold">
        <span className={done ? 'text-emerald-300' : 'text-blue-100'}>{label}</span>
        <span className={done ? 'text-emerald-300' : 'text-white'}>{Math.min(current, target)}/{target}</span>
      </div>
      <div className="h-2 bg-white/15 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={`h-full rounded-full ${done ? 'bg-emerald-400' : 'bg-white'}`}
        />
      </div>
    </div>
  );
}
