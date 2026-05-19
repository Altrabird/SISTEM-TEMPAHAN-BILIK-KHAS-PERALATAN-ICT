import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertCircle, Calendar, CalendarRange, ListPlus, Trash2, Plus } from 'lucide-react';
import { Booking, Resource, Profile, ResourceType } from '../types';
import { PURPOSE_PRESETS } from '../constants';
import { isResourceLocked } from '../lib/locks';
import { todayLocalISO, addDaysLocalISO, daysBetween } from '../lib/dates';

type BookingMode = 'single' | 'range' | 'bulk';

interface BulkSlot {
  /** Local-only id for React keys + slot removal. Not the booking id. */
  key: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:MM
  endTime: string;    // HH:MM
}

export interface BulkBookingInput {
  resourceId: string;
  resourceType: ResourceType;
  userId: string;
  userName: string;
  slots: Array<{ date: string; startTime: string; endTime: string }>;
  purposeFinal: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  rooms: Resource[];
  equipment: Resource[];
  profile: Profile | null;
  initial: Partial<Booking>;
  /** Single booking submission (back-compat with the original flow). */
  onSubmit: (b: Omit<Booking, 'id' | 'createdAt'> & { purposeFinal: string }) => string | null;
  /** Multi-slot submission (range / pukal). Returns null on success, an
   *  error message string on failure (e.g. conflicts). When omitted, the
   *  mode tabs hide and the modal stays single-only. */
  onSubmitMany?: (input: BulkBookingInput) => Promise<string | null>;
}

/** Generate a stable-ish local key for a slot row. */
const newKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

/** Inclusive date range expansion as an array of YYYY-MM-DD strings. */
function expandRange(startISO: string, endISO: string): string[] {
  const days = daysBetween(startISO, endISO);
  if (days < 0) return [];
  const out: string[] = [];
  for (let i = 0; i <= days; i++) out.push(addDaysLocalISO(startISO, i));
  return out;
}

export function BookingModal({ open, onClose, rooms, equipment, profile, initial, onSubmit, onSubmitMany }: Props) {
  const [mode, setMode] = useState<BookingMode>('single');
  const [purposeCategory, setPurposeCategory] = useState('PdPc');
  const [purposeDetail, setPurposeDetail] = useState('');
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Booking>>(initial);
  const [submitting, setSubmitting] = useState(false);

  // Range mode: draft.date is the "from", rangeEnd is the "to". Time pair
  // (draft.startTime / draft.endTime) applies to every day in the range.
  const [rangeEnd, setRangeEnd] = useState<string>('');

  // Pukal (bulk) mode: free-form list of per-day slots.
  const [slots, setSlots] = useState<BulkSlot[]>([]);

  useEffect(() => {
    if (!open) return;
    const today = todayLocalISO();
    setMode('single');
    setDraft({
      date: today,
      startTime: '08:00',
      endTime: '09:00',
      userName: profile?.name ?? '',
      ...initial,
    });
    setRangeEnd(addDaysLocalISO(today, 1));
    setSlots([
      { key: newKey(), date: today, startTime: '08:00', endTime: '09:00' },
    ]);
    setPurposeCategory('PdPc');
    setPurposeDetail('');
    setBookingError(null);
    setSubmitting(false);
  }, [open, initial, profile]);

  const isRoom = draft.resourceType === 'room';
  // Mode tabs are room-only. ICT loans through this modal stay single-mode
  // because date-range loans have different semantics (one booking spans
  // many days) handled by the dedicated LoanModal / BulkLoanModal flows.
  const canUseMulti = isRoom && Boolean(onSubmitMany);
  useEffect(() => {
    if (!canUseMulti && mode !== 'single') setMode('single');
  }, [canUseMulti, mode]);

  const finalPurpose = useMemo(() => {
    if (purposeCategory === 'Lain-lain') return purposeDetail;
    return purposeDetail ? `${purposeCategory}: ${purposeDetail}` : purposeCategory;
  }, [purposeCategory, purposeDetail]);

  // ─── Validation + submission ─────────────────────────────────────────

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);
    if (!draft.resourceId || !draft.userName || !draft.date || !draft.startTime || !draft.endTime) {
      setBookingError('Sila lengkapkan semua maklumat peranti/bilik, tarikh dan waktu.');
      return;
    }
    if (draft.startTime >= draft.endTime) {
      setBookingError('Waktu tamat mestilah selepas waktu mula.');
      return;
    }
    const err = onSubmit({
      resourceId: draft.resourceId,
      resourceType: draft.resourceType!,
      userName: draft.userName,
      userId: profile?.id ?? 'guest',
      date: draft.date,
      startTime: draft.startTime,
      endTime: draft.endTime,
      status: 'confirmed',
      purpose: finalPurpose,
      purposeFinal: finalPurpose,
    });
    if (err) {
      setBookingError(err);
    } else {
      onClose();
    }
  };

  const handleMultiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);
    if (!onSubmitMany) return;
    if (!draft.resourceId || !draft.resourceType || !draft.userName) {
      setBookingError('Sila lengkapkan nama pemohon dan pilih bilik.');
      return;
    }

    let resolvedSlots: Array<{ date: string; startTime: string; endTime: string }> = [];

    if (mode === 'range') {
      if (!draft.date || !rangeEnd || !draft.startTime || !draft.endTime) {
        setBookingError('Sila lengkapkan julat tarikh dan waktu.');
        return;
      }
      if (rangeEnd < draft.date) {
        setBookingError('Tarikh "Hingga" mestilah selepas atau sama dengan "Dari".');
        return;
      }
      if (draft.startTime >= draft.endTime) {
        setBookingError('Waktu tamat mestilah selepas waktu mula.');
        return;
      }
      const dates = expandRange(draft.date, rangeEnd);
      if (dates.length === 0) {
        setBookingError('Julat tarikh tidak sah.');
        return;
      }
      if (dates.length > 60) {
        setBookingError(`Julat ${dates.length} hari terlalu panjang (maks 60). Sila pendekkan julat atau guna mod Pukal.`);
        return;
      }
      resolvedSlots = dates.map((d) => ({
        date: d,
        startTime: draft.startTime!,
        endTime: draft.endTime!,
      }));
    } else if (mode === 'bulk') {
      if (slots.length === 0) {
        setBookingError('Sila tambah sekurang-kurangnya 1 slot.');
        return;
      }
      for (let i = 0; i < slots.length; i++) {
        const s = slots[i];
        if (!s.date || !s.startTime || !s.endTime) {
          setBookingError(`Slot #${i + 1} tidak lengkap (tarikh + waktu).`);
          return;
        }
        if (s.startTime >= s.endTime) {
          setBookingError(`Slot #${i + 1}: waktu tamat mestilah selepas waktu mula.`);
          return;
        }
      }
      // Detect duplicate / overlapping slots within the same submission
      const sortedSlots = [...slots].sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
      for (let i = 1; i < sortedSlots.length; i++) {
        const prev = sortedSlots[i - 1];
        const curr = sortedSlots[i];
        if (prev.date === curr.date && curr.startTime < prev.endTime) {
          setBookingError(`Slot bertindih dalam senarai anda pada ${curr.date}. Sila betulkan dulu.`);
          return;
        }
      }
      resolvedSlots = slots.map((s) => ({ date: s.date, startTime: s.startTime, endTime: s.endTime }));
    }

    setSubmitting(true);
    const err = await onSubmitMany({
      resourceId: draft.resourceId,
      resourceType: draft.resourceType,
      userId: profile?.id ?? 'guest',
      userName: draft.userName,
      slots: resolvedSlots,
      purposeFinal: finalPurpose,
    });
    setSubmitting(false);
    if (err) {
      setBookingError(err);
    } else {
      onClose();
    }
  };

  // ─── Bulk slot helpers ──────────────────────────────────────────────

  const addSlot = () => {
    const last = slots[slots.length - 1];
    setSlots((prev) => [
      ...prev,
      {
        key: newKey(),
        date: last ? addDaysLocalISO(last.date, 1) : todayLocalISO(),
        startTime: last?.startTime ?? '08:00',
        endTime: last?.endTime ?? '09:00',
      },
    ]);
  };
  const removeSlot = (key: string) => {
    setSlots((prev) => prev.filter((s) => s.key !== key));
  };
  const updateSlot = (key: string, patch: Partial<BulkSlot>) => {
    setSlots((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  };

  // Preview line for the submit button
  const submitLabel = (() => {
    if (submitting) return 'Sedang disimpan...';
    if (mode === 'single') return 'Simpan Tempahan';
    if (mode === 'range') {
      const days = draft.date && rangeEnd && rangeEnd >= draft.date
        ? daysBetween(draft.date, rangeEnd) + 1 : 0;
      return `Simpan ${days} Tempahan`;
    }
    return `Simpan ${slots.length} Tempahan`;
  })();

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-2xl w-full max-w-xl relative shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col"
          >
            <div className="relative px-5 md:px-8 pt-5 md:pt-7 pb-4 border-b border-slate-100 shrink-0">
              <button
                onClick={onClose}
                className="absolute right-3 top-3 md:right-5 md:top-5 p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
              <h2 className="text-lg md:text-xl font-bold tracking-tight text-slate-800 text-center">
                Borang Tempahan
              </h2>
            </div>

            <form
              onSubmit={mode === 'single' ? handleSingleSubmit : handleMultiSubmit}
              className="flex-1 overflow-y-auto scrollbar-hide px-5 md:px-8 py-5 md:py-6 space-y-5"
            >
              {bookingError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-start gap-3"
                >
                  <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={16} />
                  <p className="text-xs font-bold text-rose-700 leading-relaxed">{bookingError}</p>
                </motion.div>
              )}

              {/* Nama Pemohon */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nama Pemohon</label>
                <input
                  required
                  type="text"
                  value={draft.userName ?? ''}
                  onChange={(e) => setDraft({ ...draft, userName: e.target.value })}
                  placeholder="Contoh: En. Razak"
                  className="w-full px-3 md:px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm font-medium"
                />
              </div>

              {/* Sumber */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sumber (Bilik / Peralatan)</label>
                <select
                  required
                  value={draft.resourceId ?? ''}
                  onChange={(e) => {
                    const allResources = [...rooms, ...equipment];
                    const selected = allResources.find((r) => r.id === e.target.value);
                    setDraft({ ...draft, resourceId: e.target.value, resourceType: selected?.type });
                  }}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none bg-white text-sm font-medium"
                >
                  <option value="">Pilih Sumber</option>
                  <optgroup label="Bilik Khas">
                    {rooms.map((r) => {
                      const locked = isResourceLocked(r);
                      return (
                        <option key={r.id} value={r.id} disabled={locked}>
                          {r.name}{locked ? ' — DIKUNCI' : ''}
                        </option>
                      );
                    })}
                  </optgroup>
                  <optgroup label="Peralatan ICT">
                    {equipment.map((r) => {
                      const locked = isResourceLocked(r);
                      return (
                        <option key={r.id} value={r.id} disabled={locked}>
                          {r.name}{locked ? ' — DIKUNCI' : ''}
                        </option>
                      );
                    })}
                  </optgroup>
                </select>
              </div>

              {/* Mode tabs — room-only */}
              {canUseMulti && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Mod Tempahan</label>
                  <div className="grid grid-cols-3 gap-2">
                    <ModeButton
                      active={mode === 'single'}
                      icon={Calendar}
                      label="Satu Hari"
                      onClick={() => setMode('single')}
                    />
                    <ModeButton
                      active={mode === 'range'}
                      icon={CalendarRange}
                      label="Julat Hari"
                      onClick={() => setMode('range')}
                    />
                    <ModeButton
                      active={mode === 'bulk'}
                      icon={ListPlus}
                      label="Pukal"
                      onClick={() => setMode('bulk')}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    {mode === 'single' && 'Satu tempahan untuk satu tarikh & waktu sahaja.'}
                    {mode === 'range' && 'Tempah hari berturut-turut Dari → Hingga, dengan waktu yang sama setiap hari.'}
                    {mode === 'bulk' && 'Pilih beberapa hari + waktu berbeza dalam satu permohonan. Sesuai untuk jadual berkala.'}
                  </p>
                </div>
              )}

              {/* Single mode: Tarikh + Waktu Mula + Waktu Tamat */}
              {mode === 'single' && (
                <>
                  <div className="space-y-2 min-w-0">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tarikh Tempahan</label>
                    <input
                      required
                      type="date"
                      value={draft.date ?? ''}
                      onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                      className="w-full px-3 md:px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm font-medium"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:gap-5">
                    <div className="space-y-2 min-w-0">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Waktu Mula</label>
                      <input
                        required type="time"
                        value={draft.startTime ?? ''}
                        onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
                        className="w-full px-3 md:px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm font-medium"
                      />
                    </div>
                    <div className="space-y-2 min-w-0">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Waktu Tamat</label>
                      <input
                        required type="time"
                        value={draft.endTime ?? ''}
                        onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
                        className="w-full px-3 md:px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm font-medium"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Range mode: Dari + Hingga + one time pair */}
              {mode === 'range' && (
                <>
                  <div className="grid grid-cols-2 gap-3 md:gap-5">
                    <div className="space-y-2 min-w-0">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tarikh Dari</label>
                      <input
                        required type="date"
                        value={draft.date ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          setDraft({ ...draft, date: v });
                          if (rangeEnd && rangeEnd < v) setRangeEnd(v);
                        }}
                        className="w-full px-3 md:px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm font-medium"
                      />
                    </div>
                    <div className="space-y-2 min-w-0">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tarikh Hingga</label>
                      <input
                        required type="date"
                        value={rangeEnd}
                        min={draft.date}
                        onChange={(e) => setRangeEnd(e.target.value)}
                        className="w-full px-3 md:px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm font-medium"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:gap-5">
                    <div className="space-y-2 min-w-0">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Waktu Mula</label>
                      <input
                        required type="time"
                        value={draft.startTime ?? ''}
                        onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
                        className="w-full px-3 md:px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm font-medium"
                      />
                    </div>
                    <div className="space-y-2 min-w-0">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Waktu Tamat</label>
                      <input
                        required type="time"
                        value={draft.endTime ?? ''}
                        onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
                        className="w-full px-3 md:px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm font-medium"
                      />
                    </div>
                  </div>
                  {draft.date && rangeEnd && rangeEnd >= draft.date && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-[11px] font-bold text-blue-700">
                      {daysBetween(draft.date, rangeEnd) + 1} hari × 1 slot ={' '}
                      <span className="text-blue-800">{daysBetween(draft.date, rangeEnd) + 1} tempahan akan dicipta</span>
                    </div>
                  )}
                </>
              )}

              {/* Bulk mode: list of {date, startTime, endTime} rows */}
              {mode === 'bulk' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Senarai Slot ({slots.length})
                    </label>
                    <button
                      type="button"
                      onClick={() => setSlots([{ key: newKey(), date: todayLocalISO(), startTime: '08:00', endTime: '09:00' }])}
                      className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-rose-600 transition-colors"
                    >
                      Reset
                    </button>
                  </div>
                  <div className="space-y-2">
                    {slots.map((s, i) => (
                      <div key={s.key} className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                            Slot #{i + 1}
                          </span>
                          {slots.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSlot(s.key)}
                              className="p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded transition-all"
                              title="Buang slot ini"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                        <input
                          required type="date"
                          value={s.date}
                          onChange={(e) => updateSlot(s.key, { date: e.target.value })}
                          className="w-full px-3 py-2 rounded-md border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none text-sm font-medium bg-white"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            required type="time"
                            value={s.startTime}
                            onChange={(e) => updateSlot(s.key, { startTime: e.target.value })}
                            className="w-full px-3 py-2 rounded-md border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none text-sm font-medium bg-white"
                          />
                          <input
                            required type="time"
                            value={s.endTime}
                            onChange={(e) => updateSlot(s.key, { endTime: e.target.value })}
                            className="w-full px-3 py-2 rounded-md border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none text-sm font-medium bg-white"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addSlot}
                    className="w-full border-2 border-dashed border-slate-300 text-slate-500 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={13} /> Tambah Slot
                  </button>
                </div>
              )}

              {/* Tujuan */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tujuan Aktiviti</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PURPOSE_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setPurposeCategory(preset)}
                        className={`px-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all leading-tight ${
                          purposeCategory === preset
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-blue-400 hover:text-blue-600'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {purposeCategory === 'Lain-lain' ? 'Sila Nyatakan Tujuan' : 'Perincian Tambahan'}
                  </label>
                  <textarea
                    required={purposeCategory === 'Lain-lain'}
                    rows={2}
                    value={purposeDetail}
                    onChange={(e) => setPurposeDetail(e.target.value)}
                    placeholder={purposeCategory === 'Lain-lain'
                      ? 'Sila nyatakan tujuan aktiviti anda di sini...'
                      : 'Contoh: Amali Cahaya, Mesyuarat Kurikulum, etc.'}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none resize-none text-sm font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 text-white py-3 md:py-3.5 rounded-lg text-sm font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 transform active:scale-[0.98] mt-2 disabled:opacity-50 disabled:cursor-wait"
              >
                {submitLabel}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function ModeButton({
  active, icon: Icon, label, onClick,
}: {
  active: boolean;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1 py-2 rounded-lg border transition-all ${
        active
          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
          : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600'
      }`}
    >
      <Icon size={16} />
      <span className="text-[10px] font-bold uppercase tracking-wider leading-none">{label}</span>
    </button>
  );
}
