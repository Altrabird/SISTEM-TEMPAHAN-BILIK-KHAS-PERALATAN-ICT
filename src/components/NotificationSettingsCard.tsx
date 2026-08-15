import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell, BellOff, Save, RefreshCw, CalendarCheck, AlertTriangle, Check,
} from 'lucide-react';
import { NotificationSettings, Profile, WeekDay } from '../types';
import { WEEKDAYS, WORKING_DAYS, DEFAULT_NOTIFICATION_SETTINGS } from '../constants';
import { fetchNotificationSettings, updateNotificationSettings } from '../lib/storage';
import { isSupabaseEnabled } from '../lib/supabase';
import { kualaLumpurISODow } from '../lib/serverTime';

interface Props {
  profile: Profile | null;
}

const EVENT_TOGGLES: {
  key: keyof Pick<
    NotificationSettings,
    'notifyNewBooking' | 'notifyReturn' | 'notifyCancel' | 'notifyDailyReminder' | 'notifyMorningDigest'
  >;
  label: string;
  hint: string;
}[] = [
  { key: 'notifyNewBooking',    label: 'Tempahan / Pinjaman Baharu', hint: 'Setiap kali bilik ditempah atau unit ICT dipinjam' },
  { key: 'notifyReturn',        label: 'Pemulangan ICT',             hint: 'Bila unit ditanda telah dipulangkan' },
  { key: 'notifyCancel',        label: 'Pembatalan',                 hint: 'Bila tempahan atau pinjaman dibatalkan' },
  { key: 'notifyDailyReminder', label: 'Peringatan Harian (8:00 pg)', hint: 'Senarai pinjaman lewat + patut pulang esok' },
  { key: 'notifyMorningDigest', label: 'Ringkasan Pagi (6:30 pg)',   hint: 'Aktiviti bilik & pinjaman untuk hari tersebut' },
];

/**
 * Admin editor for the Telegram notification rules.
 *
 * The toggles here are not a client-side preference — they write the
 * `notification_settings` row that `tg_should_send()` reads inside
 * Postgres, so a muted day silences the triggers and the cron jobs
 * alike. Bookings still save normally on muted days; only the Telegram
 * message is withheld.
 */
export function NotificationSettingsCard({ profile }: Props) {
  const [saved, setSaved] = useState<NotificationSettings | null>(null);
  const [draft, setDraft] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    if (!isSupabaseEnabled) {
      setLoading(false);
      return;
    }
    const s = await fetchNotificationSettings();
    if (!s) {
      setError('Gagal baca tetapan. Pastikan supabase/notify_setup.sql sudah dijalankan.');
    } else {
      setSaved(s);
      setDraft(s);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dirty = useMemo(
    () => (saved ? JSON.stringify(saved) !== JSON.stringify(draft) : false),
    [saved, draft],
  );

  const todayDow = kualaLumpurISODow();
  const todayLabel = WEEKDAYS.find((d) => d.value === todayDow)?.label ?? '—';
  const sendsToday = draft.enabled && draft.activeDays.includes(todayDow);

  const toggleDay = (day: WeekDay) => {
    setDraft((d) => ({
      ...d,
      activeDays: d.activeDays.includes(day)
        ? d.activeDays.filter((x) => x !== day)
        : [...d.activeDays, day].sort((a, b) => a - b),
    }));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    const r = await updateNotificationSettings(draft, profile?.name);
    setSaving(false);
    if (!r.ok) {
      setError(r.error ?? 'Gagal simpan tetapan.');
      return;
    }
    setSaved(draft);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  if (!isSupabaseEnabled) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-3">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <Bell size={12} /> Kawalan Pemberitahuan Telegram
        </h3>
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-700 leading-relaxed">
          Mod tempatan — tiada bot Telegram untuk dikawal. Aktifkan Supabase
          (<code className="font-mono">VITE_SUPABASE_URL</code> +{' '}
          <code className="font-mono">VITE_SUPABASE_ANON_KEY</code>) untuk
          menggunakan tetapan ini.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <Bell size={12} /> Kawalan Pemberitahuan Telegram
          </h3>
          <p className="text-base font-bold text-slate-800 mt-0.5">Bila bot dibenarkan menghantar</p>
        </div>
        <div className="flex items-center gap-2">
          {savedFlash && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-green-600 bg-green-50 border border-green-100 px-2 py-1 rounded">
              Disimpan
            </span>
          )}
          <button
            onClick={() => void load()}
            disabled={loading || saving}
            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all disabled:opacity-40"
            title="Muat semula"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-100 text-[11px] font-bold text-rose-700 flex items-start gap-2">
          <AlertTriangle size={14} className="shrink-0 mt-px" /> {error}
        </div>
      )}

      {loading ? (
        <p className="text-xs text-slate-400 italic py-4">Memuat tetapan...</p>
      ) : (
        <>
          {/* Master switch */}
          <div
            className={`p-5 rounded-xl border flex items-start justify-between gap-4 transition-colors ${
              draft.enabled ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-start gap-3 min-w-0">
              {draft.enabled ? (
                <Bell className="text-emerald-600 shrink-0" size={20} />
              ) : (
                <BellOff className="text-slate-400 shrink-0" size={20} />
              )}
              <div className="min-w-0">
                <p className={`text-sm font-bold ${draft.enabled ? 'text-emerald-700' : 'text-slate-600'}`}>
                  {draft.enabled ? 'Pemberitahuan Aktif' : 'Semua Pemberitahuan Dimatikan'}
                </p>
                <p className={`text-xs leading-relaxed mt-0.5 ${draft.enabled ? 'text-emerald-600/80' : 'text-slate-500'}`}>
                  Suis induk. Tempahan tetap disimpan seperti biasa — hanya
                  mesej Telegram yang ditahan.
                </p>
              </div>
            </div>
            <Switch
              checked={draft.enabled}
              onChange={(v) => setDraft((d) => ({ ...d, enabled: v }))}
              label="Suis induk pemberitahuan"
            />
          </div>

          {/* Active days */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <CalendarCheck size={12} /> Hari Aktif
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Waktu Malaysia. Hari yang tidak dipilih — bot senyap sepenuhnya.
                </p>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setDraft((d) => ({ ...d, activeDays: [...WORKING_DAYS] }))}
                  className="px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Hari Bekerja
                </button>
                <button
                  onClick={() => setDraft((d) => ({ ...d, activeDays: [1, 2, 3, 4, 5, 6, 7] }))}
                  className="px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Setiap Hari
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAYS.map((d) => {
                const on = draft.activeDays.includes(d.value);
                const isToday = d.value === todayDow;
                const weekend = d.value >= 6;
                return (
                  <button
                    key={d.value}
                    onClick={() => toggleDay(d.value)}
                    disabled={!draft.enabled}
                    title={d.label}
                    className={`relative py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wide border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      on
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : `bg-white ${weekend ? 'text-rose-400' : 'text-slate-500'} border-slate-200 hover:border-slate-400`
                    }`}
                  >
                    {d.short}
                    {isToday && (
                      <span
                        className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ring-2 ring-white ${
                          on ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div
              className={`p-3 rounded-lg border text-[11px] font-bold flex items-center gap-2 ${
                sendsToday
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              {sendsToday ? <Check size={13} className="shrink-0" /> : <BellOff size={13} className="shrink-0" />}
              Hari ini {todayLabel} —{' '}
              {sendsToday ? 'bot akan menghantar pemberitahuan.' : 'bot tidak akan menghantar apa-apa.'}
              {dirty && <span className="font-medium text-slate-400">(belum disimpan)</span>}
            </div>

            {draft.activeDays.length === 0 && draft.enabled && (
              <p className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle size={13} className="shrink-0 mt-px" />
                Tiada hari dipilih — kesannya sama seperti mematikan suis induk.
              </p>
            )}
          </div>

          {/* Per-event toggles */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Jenis Pemberitahuan
            </h4>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {EVENT_TOGGLES.map((t) => (
                <div
                  key={t.key}
                  className={`flex items-center justify-between gap-4 px-4 py-3 ${
                    draft.enabled ? 'bg-white' : 'bg-slate-50/60'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-700 truncate">{t.label}</p>
                    <p className="text-[10px] text-slate-500 leading-relaxed">{t.hint}</p>
                  </div>
                  <Switch
                    checked={draft[t.key]}
                    disabled={!draft.enabled}
                    onChange={(v) => setDraft((d) => ({ ...d, [t.key]: v }))}
                    label={t.label}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => void save()}
              disabled={!dirty || saving}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 active:scale-95 flex items-center gap-2 disabled:opacity-40 disabled:shadow-none disabled:active:scale-100"
            >
              <Save size={14} /> {saving ? 'Menyimpan...' : 'Simpan Tetapan'}
            </button>
            {dirty && !saving && (
              <button
                onClick={() => saved && setDraft(saved)}
                className="text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
              >
                Batal Perubahan
              </button>
            )}
            {saved?.updatedAt && !dirty && (
              <p className="text-[10px] text-slate-400">
                Kemas kini akhir:{' '}
                {new Date(saved.updatedAt).toLocaleString('ms-MY', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
                {saved.updatedBy && ` · ${saved.updatedBy}`}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Switch({
  checked, onChange, disabled, label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full shrink-0 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        checked ? 'bg-emerald-500' : 'bg-slate-300'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
