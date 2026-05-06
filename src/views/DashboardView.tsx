import React from 'react';
import { motion } from 'motion/react';
import {
  DoorOpen, Laptop, Clock, CheckCircle2, Info, AlertCircle, TrendingUp, CalendarDays
} from 'lucide-react';
import { Booking, Resource, Profile } from '../types';
import { todayLocalISO } from '../lib/dates';

interface Props {
  bookings: Booking[];
  rooms: Resource[];
  equipment: Resource[];
  profile: Profile | null;
  onOpenPortfolio: () => void;
}

export function DashboardView({ bookings, rooms, equipment, profile, onOpenPortfolio }: Props) {
  const today = todayLocalISO();
  const todayBookings = bookings.filter((b) => b.date === today && b.status !== 'cancelled');
  const myBookings = profile ? bookings.filter((b) => b.userId === profile.id && b.status !== 'cancelled') : [];

  const stats = [
    {
      label: 'Tempahan Hari Ini',
      value: todayBookings.length,
      sub: 'aktiviti',
      icon: Clock,
      gradient: 'from-emerald-500 to-green-600',
      shadow: 'shadow-emerald-500/30',
    },
    {
      label: 'Total Tempahan',
      value: bookings.filter((b) => b.status !== 'cancelled').length,
      sub: 'rekod sistem',
      icon: CheckCircle2,
      gradient: 'from-orange-500 to-amber-600',
      shadow: 'shadow-orange-500/30',
    },
    {
      label: 'Bilik Khas',
      value: rooms.length,
      sub: 'unit aktif',
      icon: DoorOpen,
      gradient: 'from-blue-500 to-indigo-600',
      shadow: 'shadow-blue-500/30',
    },
    {
      label: 'Peralatan ICT',
      value: equipment.length,
      sub: 'kategori',
      icon: Laptop,
      gradient: 'from-purple-500 to-pink-600',
      shadow: 'shadow-purple-500/30',
    },
  ];

  const allResources = [...rooms, ...equipment];

  return (
    <div className="space-y-6">
      {profile && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white p-5 md:p-6 shadow-xl shadow-blue-500/30"
        >
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute right-12 bottom-0 w-32 h-32 bg-pink-500/20 rounded-full blur-2xl" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 md:gap-4">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 rounded-xl object-cover ring-2 ring-white/40 shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-xl font-black ring-2 ring-white/30 shrink-0">
                  {profile.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-blue-100/90">Selamat Datang Kembali</p>
                <h2 className="text-lg md:text-xl font-bold">{profile.name}</h2>
                <p className="text-[11px] md:text-xs text-blue-100/80 mt-0.5">
                  {myBookings.length} tempahan tersimpan dalam portfolio anda
                </p>
              </div>
            </div>
            <button
              onClick={onOpenPortfolio}
              className="w-full sm:w-auto bg-white text-blue-700 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 justify-center shrink-0 hover:bg-blue-50 shadow-lg"
            >
              <TrendingUp size={16} /> Lihat Portfolio
            </button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`bg-gradient-to-br ${stat.gradient} text-white rounded-2xl p-4 md:p-5 shadow-lg ${stat.shadow} relative overflow-hidden`}
          >
            <div className="absolute -right-3 -top-3 opacity-20">
              <stat.icon size={64} />
            </div>
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-2">
                <stat.icon size={14} className="opacity-90" />
                <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-white/90">{stat.label}</p>
              </div>
              <h3 className="text-3xl md:text-4xl font-black tracking-tight">{stat.value}</h3>
              <p className="text-[10px] text-white/80 font-medium mt-0.5">{stat.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="w-7 h-7 bg-blue-600 text-white rounded-lg flex items-center justify-center shadow-md shadow-blue-500/30">
                <Clock size={14} />
              </span>
              Tempahan Hari Ini
              <span className="text-[10px] font-black px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                {todayBookings.length}
              </span>
            </h3>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
              <CalendarDays size={12} /> {new Date().toLocaleDateString('ms-MY', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>

          {todayBookings.length > 0 ? (
            <div className="space-y-3">
              {todayBookings.map((b) => (
                <div key={b.id} className="bg-white p-4 rounded-xl border-l-4 border-l-blue-600 border border-slate-200 flex items-center justify-between group hover:shadow-md transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-50 rounded-lg flex flex-col items-center justify-center border border-slate-100 shrink-0">
                      <span className="text-[10px] font-bold text-slate-400 leading-none">MULA</span>
                      <span className="text-xs font-bold text-blue-600">{b.startTime}</span>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-800">
                        {allResources.find((r) => r.id === b.resourceId)?.name || 'N/A'}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{b.purpose}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-slate-700">{b.userName}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">{b.startTime} - {b.endTime}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 border-dashed rounded-2xl p-12 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Info className="text-slate-300" size={32} />
              </div>
              <p className="text-slate-400 text-sm font-medium">Tiada aktiviti tempahan untuk hari ini.</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span className="w-7 h-7 bg-amber-500 text-white rounded-lg flex items-center justify-center shadow-md shadow-amber-500/30">
              <AlertCircle size={14} />
            </span>
            Notifikasi Sistem
          </h3>
          <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white p-5 md:p-6 rounded-2xl shadow-xl overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/20 rounded-full -ml-12 -mb-12" />
            <div className="relative z-10">
              <h3 className="text-base md:text-lg font-bold mb-2">Peringatan Penting</h3>
              <p className="text-xs text-blue-100/80 leading-relaxed mb-4">
                Pastikan suis utama dimatikan dan pintu dikunci sebelum meninggalkan premis. Laporkan sebarang kerosakan segera.
              </p>
              <div className="p-3 bg-white/10 rounded-lg flex items-center gap-3 border border-white/20 backdrop-blur-sm">
                <div className="w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-100">Sistem Aktif</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
