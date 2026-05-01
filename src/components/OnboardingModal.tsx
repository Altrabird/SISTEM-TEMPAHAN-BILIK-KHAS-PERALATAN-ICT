import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sparkles, ArrowRight, UserPlus, Users, Search, RefreshCw } from 'lucide-react';
import { Profile, UserRole } from '../types';
import { ROLE_LABELS } from '../constants';
import { isSupabaseEnabled } from '../lib/supabase';
import { fetchProfilesFromCloud } from '../lib/storage';

interface Props {
  onComplete: (p: Profile) => void;
}

type Mode = 'create' | 'select';

export function OnboardingModal({ onComplete }: Props) {
  const [mode, setMode] = useState<Mode>('create');

  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('guru');
  const [department, setDepartment] = useState('');
  const [email, setEmail] = useState('');

  const [existing, setExisting] = useState<Profile[] | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (mode !== 'select' || existing !== null) return;
    let cancelled = false;
    setLoadingList(true);
    fetchProfilesFromCloud()
      .then((rows) => { if (!cancelled) setExisting(rows ?? []); })
      .finally(() => { if (!cancelled) setLoadingList(false); });
    return () => { cancelled = true; };
  }, [mode, existing]);

  const refreshList = () => {
    setExisting(null);
  };

  const submitCreate = (e: React.FormEvent) => {
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

  const pickExisting = (p: Profile) => {
    onComplete({ ...p, lastActiveAt: Date.now() });
  };

  const filtered = (existing ?? []).filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.email?.toLowerCase().includes(q) ?? false) ||
      (p.department?.toLowerCase().includes(q) ?? false)
    );
  });

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
          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 mb-2">Selamat Datang ke</p>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 leading-snug">
            Sistem Tempahan Bilik Khas & Peralatan ICT
          </h2>
          <p className="text-sm font-bold text-slate-700 mt-0.5">SK Bandar Tawau</p>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            Mari kita sediakan portfolio anda. Pilih profil sedia ada atau cipta yang baru.
          </p>

          {isSupabaseEnabled && (
            <div className="mt-6 grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                onClick={() => setMode('create')}
                className={`px-3 py-2 rounded-md text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'create' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <UserPlus size={13} /> Cipta Baru
              </button>
              <button
                onClick={() => setMode('select')}
                className={`px-3 py-2 rounded-md text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'select' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Users size={13} /> Profil Sedia Ada
              </button>
            </div>
          )}

          {!isSupabaseEnabled && (
            <p className="mt-4 text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-lg p-2 font-medium">
              Supabase belum dikonfig — hanya cipta profil baru tersedia.
            </p>
          )}

          {mode === 'create' ? (
            <form onSubmit={submitCreate} className="mt-6 space-y-4">
              <Field label="Nama Penuh *">
                <input
                  autoFocus
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Cikgu Aishah"
                  className="onb-input"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Peranan">
                  <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="onb-input">
                    {Object.entries(ROLE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Jabatan / Panitia">
                  <input
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Contoh: Sains"
                    className="onb-input"
                  />
                </Field>
              </div>
              <Field label="Emel (pilihan)">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contoh@moe.gov.my"
                  className="onb-input"
                />
              </Field>
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
          ) : (
            <div className="mt-6 space-y-3">
              <div className="flex gap-2 items-center">
                <div className="flex-1 relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari nama, emel, jabatan..."
                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-xs font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
                  />
                </div>
                <button
                  onClick={refreshList}
                  disabled={loadingList}
                  className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all disabled:opacity-40"
                  title="Muat semula"
                >
                  <RefreshCw size={14} className={loadingList ? 'animate-spin' : ''} />
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
                {loadingList && (
                  <div className="p-8 text-center text-xs text-slate-400">Memuat senarai profil...</div>
                )}
                {!loadingList && filtered.length === 0 && (existing?.length ?? 0) === 0 && (
                  <div className="p-8 text-center">
                    <p className="text-xs text-slate-500 font-semibold">Tiada profil berdaftar lagi.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Tukar ke "Cipta Baru" untuk mula.</p>
                  </div>
                )}
                {!loadingList && filtered.length === 0 && (existing?.length ?? 0) > 0 && (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Tiada padanan untuk "{search}".
                  </div>
                )}
                {!loadingList && filtered.map((p) => {
                  const initials = p.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                  return (
                    <button
                      key={p.id}
                      onClick={() => pickExisting(p)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 transition-colors text-left group"
                    >
                      {p.avatarUrl ? (
                        <img src={p.avatarUrl} alt={p.name} referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-black shrink-0">
                          {initials}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{p.name}</p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {ROLE_LABELS[p.role] ?? p.role}
                          {p.department && ` • ${p.department}`}
                          {p.email && ` • ${p.email}`}
                        </p>
                      </div>
                      <ArrowRight size={14} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  );
                })}
              </div>

            </div>
          )}
        </div>

        <style>{`
          .onb-input {
            width: 100%;
            padding: 0.625rem 1rem;
            border-radius: 0.5rem;
            border: 1px solid rgb(226 232 240);
            font-size: 0.875rem;
            font-weight: 500;
            outline: none;
            transition: all 0.15s;
            background: white;
          }
          .onb-input:focus {
            border-color: rgb(59 130 246);
            box-shadow: 0 0 0 4px rgb(59 130 246 / 0.1);
          }
        `}</style>
      </motion.div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</label>
      {children}
    </div>
  );
}
