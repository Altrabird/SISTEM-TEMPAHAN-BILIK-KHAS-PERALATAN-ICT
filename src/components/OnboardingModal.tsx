import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Profile, UserRole } from '../types';
import { ROLE_LABELS } from '../constants';

interface Props {
  onComplete: (p: Profile) => void;
}

export function OnboardingModal({ onComplete }: Props) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('guru');
  const [department, setDepartment] = useState('');
  const [email, setEmail] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const now = Date.now();
    onComplete({
      id: `user-${now}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      email: email.trim() || undefined,
      role,
      department: department.trim() || undefined,
      joinedAt: now,
      lastActiveAt: now,
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl border border-slate-200 overflow-hidden"
      >
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-blue-500/10 blur-2xl" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-indigo-500/10 blur-2xl" />

        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg mb-4">
            <Sparkles size={24} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Selamat Datang ke SKBT 2026</h2>
          <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
            Mari kita sediakan portfolio anda. Maklumat ini digunakan untuk mengesan tempahan,
            pencapaian dan aktiviti anda.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nama Penuh *</label>
              <input
                autoFocus
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Cikgu Aishah"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Peranan</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none bg-white"
                >
                  {Object.entries(ROLE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Jabatan / Panitia</label>
                <input
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Contoh: Sains"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Emel (pilihan)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contoh@moe.gov.my"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full bg-blue-600 text-white py-3.5 rounded-lg text-sm font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Mula Guna Sistem <ArrowRight size={16} />
            </button>
            <p className="text-[10px] text-slate-400 text-center">
              Anda boleh edit profil dari menu Tetapan pada bila-bila masa.
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
