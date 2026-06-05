import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Database, User, Cloud, CloudOff, LogOut } from 'lucide-react';
import { Profile } from '../types';
import { ROLE_LABELS } from '../constants';
import { isSupabaseEnabled } from '../lib/supabase';
import { TelegramJoinPill } from '../components/TelegramJoinPill';

interface Props {
  profile: Profile | null;
  onReset: () => void;
  onSaveProfile: (p: Profile) => void;
  onSwitchProfile: () => void;
}

export function SettingsView({ profile, onReset, onSaveProfile, onSwitchProfile }: Props) {
  const [draft, setDraft] = useState<Profile | null>(profile);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (profile && !draft) setDraft(profile);
  }, [profile, draft]);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Konfigurasi</h3>
        <h2 className="text-2xl font-bold tracking-tight text-slate-800">Tetapan Sistem</h2>
        <p className="text-sm text-slate-500">Urus profil, data dan tetapan aplikasi SKBT.</p>
      </div>

      {draft && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <User size={12} /> Profil Pengguna
              </h3>
              <p className="text-base font-bold text-slate-800">Maklumat Asas</p>
            </div>
            {savedFlash && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-green-600 bg-green-50 border border-green-100 px-2 py-1 rounded">
                Disimpan
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nama">
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="input"
                placeholder="Contoh: En. Razak"
              />
            </Field>
            <Field label="Emel">
              <input
                value={draft.email ?? ''}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                className="input"
                placeholder="contoh@moe.gov.my"
                type="email"
              />
            </Field>
            <Field label="Peranan">
              <select
                value={draft.role}
                onChange={(e) => setDraft({ ...draft, role: e.target.value as Profile['role'] })}
                className="input"
              >
                {Object.entries(ROLE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="Jabatan / Panitia">
              <input
                value={draft.department ?? ''}
                onChange={(e) => setDraft({ ...draft, department: e.target.value })}
                className="input"
                placeholder="Contoh: Panitia Sains"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="URL Avatar (pilihan)">
                <input
                  value={draft.avatarUrl ?? ''}
                  onChange={(e) => setDraft({ ...draft, avatarUrl: e.target.value })}
                  className="input"
                  placeholder="https://..."
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Bio Ringkas">
                <textarea
                  value={draft.bio ?? ''}
                  onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
                  rows={2}
                  className="input resize-none"
                  placeholder="Contoh: Guru Sains, suka eksperimen praktikal."
                />
              </Field>
            </div>
          </div>

          <button
            onClick={() => {
              onSaveProfile({ ...draft, lastActiveAt: Date.now() });
              setSavedFlash(true);
              setTimeout(() => setSavedFlash(false), 2000);
            }}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 active:scale-95 flex items-center gap-2"
          >
            <Save size={14} /> Simpan Profil
          </button>
        </div>
      )}

      {profile && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <LogOut size={12} /> Profil Aktif
          </h3>
          <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">
                Anda log masuk sebagai <span className="text-blue-600">{profile.name}</span>
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tersilap profil? Tekan butang ini untuk kembali ke menu pemilihan profil
                (Cipta Baru atau Profil Sedia Ada).
              </p>
            </div>
            <button
              onClick={onSwitchProfile}
              className="bg-slate-900 text-white px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-700 transition-all shadow-md active:scale-95 flex items-center gap-2 shrink-0"
            >
              <LogOut size={14} /> Tukar Profil
            </button>
          </div>
        </div>
      )}

      {/* Telegram opt-in CTA — admin discovery surface */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-4">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Saluran Pemberitahuan
        </h3>
        <TelegramJoinPill variant="card" />
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Pemberitahuan tempahan baharu, pemulangan, dan ringkasan harian
          dihantar ke saluran ini. Bagi peminjam yang ingin terima notifikasi
          rasmi tanpa buka aplikasi.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-4">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <Database size={12} /> Backend
        </h3>
        <div className={`p-4 rounded-xl border flex items-center gap-3 ${
          isSupabaseEnabled
            ? 'bg-emerald-50 border-emerald-100'
            : 'bg-amber-50 border-amber-100'
        }`}>
          {isSupabaseEnabled ? (
            <Cloud className="text-emerald-600 shrink-0" size={20} />
          ) : (
            <CloudOff className="text-amber-600 shrink-0" size={20} />
          )}
          <div>
            <p className={`text-sm font-bold ${isSupabaseEnabled ? 'text-emerald-700' : 'text-amber-700'}`}>
              {isSupabaseEnabled ? 'Supabase Aktif' : 'Mod Tempatan (localStorage)'}
            </p>
            <p className={`text-xs ${isSupabaseEnabled ? 'text-emerald-600/80' : 'text-amber-600/80'} leading-relaxed mt-0.5`}>
              {isSupabaseEnabled
                ? 'Data tempahan dan profil disegerakkan ke awan Supabase.'
                : 'Tambah VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY ke .env.local untuk mengaktifkan storan awan.'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-4">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Data & Storan Lokal</h3>
        <div className="p-6 bg-rose-50 border border-rose-100 rounded-xl space-y-4">
          <div>
            <h4 className="text-sm font-bold text-rose-700">Padamkan Semua Data</h4>
            <p className="text-xs text-rose-600/80 mt-1 leading-relaxed">
              Ini akan memadamkan semua rekod tempahan, profil, senarai bilik kustom dan peralatan
              daripada storan pelayar anda. Data di Supabase tidak akan terjejas.
            </p>
          </div>
          <button
            onClick={onReset}
            className="bg-rose-600 text-white px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-rose-700 transition-all shadow-md shadow-rose-500/20 active:scale-95 flex items-center gap-2"
          >
            <RefreshCw size={14} /> Reset Sistem Sekarang
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-xl">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Versi Stabil</p>
          <p className="text-sm font-bold text-slate-700">v1.9.3</p>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tahun Aktif</p>
          <p className="text-sm font-bold text-blue-600 tracking-widest leading-none mt-1">
            {new Date().getFullYear()}
          </p>
        </div>
      </div>

      <style>{`
        .input {
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
        .input:focus {
          border-color: rgb(59 130 246);
          box-shadow: 0 0 0 4px rgb(59 130 246 / 0.1);
        }
      `}</style>
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
