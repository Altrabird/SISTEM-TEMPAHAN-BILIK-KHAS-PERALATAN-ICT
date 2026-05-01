import React from 'react';
import { motion } from 'motion/react';
import {
  DoorOpen, Laptop, Clock, CheckCircle2, Info, AlertCircle, TrendingUp, CalendarDays
} from 'lucide-react';
import { Booking, Resource, Profile } from '../types';

interface Props {
  bookings: Booking[];
  rooms: Resource[];
  equipment: Resource[];
  profile: Profile | null;
  onOpenPortfolio: () => void;
}

export function DashboardView({ bookings, rooms, equipment, profile, onOpenPortfolio }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter((b) => b.date === today && b.status !== 'cancelled');
  const myBookings = profile ? bookings.filter((b) => b.userId === profile.id && b.status !== 'cancelled') : [];

  const stats = [
    { label: 'Jumlah Bilik', value: rooms.length, icon: DoorOpen, color: 'bg-blue-100 text-blue-600' },
    { label: 'Peralatan ICT', value: equipment.length, icon: Laptop, color: 'bg-purple-100 text-purple-600' },
    { label: 'Tempahan Hari Ini', value: todayBookings.length, icon: Clock, color: 'bg-green-100 text-green-600' },
    { label: 'Total Tempahan', value: bookings.filter((b) => b.status !== 'cancelled').length, icon: CheckCircle2, color: 'bg-amber-100 text-amber-600' },
  ];

  const allResources = [...rooms, ...equipment];

  return (
    <div className="space-y-8">
      {profile && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-6 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center text-xl font-black border border-white/20">
              {profile.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-blue-100/80">Selamat Datang Kembali</p>
              <h2 className="text-xl font-bold">{profile.name}</h2>
              <p className="text-xs text-blue-100/70 mt-0.5">
                Anda mempunyai {myBookings.length} tempahan tersimpan dalam portfolio anda.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenPortfolio}
            className="bg-white/15 hover:bg-white/25 backdrop-blur border border-white/20 text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 shrink-0"
          >
            <TrendingUp size={16} /> Lihat Portfolio Saya
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
          >
            <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <stat.icon size={24} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{stat.label}</p>
            <h3 className="text-2xl font-bold tracking-tight mt-1 text-slate-800">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Clock size={16} /> Tempahan Hari Ini ({todayBookings.length})
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

        <div className="space-y-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <AlertCircle size={16} /> Notifikasi Sistem
          </h3>
          <div className="bg-[#0f172a] text-white p-6 rounded-2xl shadow-xl overflow-hidden relative group border border-slate-800">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500" />
            <div className="relative z-10">
              <h3 className="text-lg font-bold mb-2">Peringatan Penting</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Pastikan suis utama dimatikan dan pintu dikunci sebelum meninggalkan premis. Laporkan sebarang kerosakan segera.
              </p>
              <div className="p-3 bg-white/5 rounded-lg flex items-center gap-3 border border-white/10 backdrop-blur-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Tahun Operasi 2026 Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
