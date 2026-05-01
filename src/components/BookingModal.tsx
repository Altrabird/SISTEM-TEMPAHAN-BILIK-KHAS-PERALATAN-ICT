import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertCircle } from 'lucide-react';
import { Booking, Resource, Profile } from '../types';
import { PURPOSE_PRESETS } from '../constants';

interface Props {
  open: boolean;
  onClose: () => void;
  rooms: Resource[];
  equipment: Resource[];
  profile: Profile | null;
  initial: Partial<Booking>;
  onSubmit: (b: Omit<Booking, 'id' | 'createdAt'> & { purposeFinal: string }) => string | null;
}

export function BookingModal({ open, onClose, rooms, equipment, profile, initial, onSubmit }: Props) {
  const [purposeCategory, setPurposeCategory] = useState('PdPc');
  const [purposeDetail, setPurposeDetail] = useState('');
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Booking>>(initial);

  React.useEffect(() => {
    if (open) {
      setDraft({
        date: new Date().toISOString().split('T')[0],
        startTime: '08:00',
        endTime: '09:00',
        userName: profile?.name ?? '',
        ...initial,
      });
      setBookingError(null);
    }
  }, [open, initial, profile]);

  const reset = () => {
    setPurposeCategory('PdPc');
    setPurposeDetail('');
    setBookingError(null);
    setDraft({});
  };

  const handle = (e: React.FormEvent) => {
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
    const finalPurpose = purposeCategory === 'Lain-lain'
      ? purposeDetail
      : (purposeDetail ? `${purposeCategory}: ${purposeDetail}` : purposeCategory);

    const err = onSubmit({
      resourceId: draft.resourceId!,
      resourceType: draft.resourceType!,
      userName: draft.userName!,
      userId: profile?.id ?? 'guest',
      date: draft.date!,
      startTime: draft.startTime!,
      endTime: draft.endTime!,
      status: 'confirmed',
      purpose: finalPurpose,
      purposeFinal: finalPurpose,
    });
    if (err) {
      setBookingError(err);
    } else {
      reset();
      onClose();
    }
  };

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
            className="bg-white rounded-2xl w-full max-w-xl p-8 relative shadow-2xl overflow-hidden border border-slate-200"
          >
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-800">Borang Tempahan 2026</h2>
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-semibold">SKBT Resource Management</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handle} className="space-y-6">
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
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nama Pemohon</label>
                  <input
                    required
                    type="text"
                    value={draft.userName ?? ''}
                    onChange={(e) => setDraft({ ...draft, userName: e.target.value })}
                    placeholder="Contoh: En. Razak"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tarikh Tempahan</label>
                  <input
                    required
                    type="date"
                    value={draft.date ?? ''}
                    onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm font-medium"
                  />
                </div>
              </div>

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
                    {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </optgroup>
                  <optgroup label="Peralatan ICT">
                    {equipment.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </optgroup>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Waktu Mula</label>
                  <input
                    required
                    type="time"
                    value={draft.startTime ?? ''}
                    onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Waktu Tamat</label>
                  <input
                    required
                    type="time"
                    value={draft.endTime ?? ''}
                    onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm font-medium"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tujuan Aktiviti</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PURPOSE_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setPurposeCategory(preset)}
                        className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
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
                    rows={3}
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
                className="w-full bg-blue-600 text-white py-3.5 rounded-lg text-sm font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 transform active:scale-[0.98] mt-4"
              >
                Simpan Tempahan
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
