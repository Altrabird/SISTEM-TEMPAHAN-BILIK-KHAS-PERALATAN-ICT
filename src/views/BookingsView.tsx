import React, { useState, useMemo } from 'react';
import { CalendarDays, Clock, Search, Filter, Trash2, Download } from 'lucide-react';
import { Booking, Resource, Profile } from '../types';

interface Props {
  bookings: Booking[];
  rooms: Resource[];
  equipment: Resource[];
  profile: Profile | null;
  onCancel: (id: string) => void;
}

export function BookingsView({ bookings, rooms, equipment, profile, onCancel }: Props) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'mine' | 'upcoming'>('all');

  const allResources = useMemo(() => [...rooms, ...equipment], [rooms, equipment]);
  const today = new Date().toISOString().split('T')[0];

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      if (filter === 'mine' && profile && b.userId !== profile.id) return false;
      if (filter === 'upcoming' && b.date < today) return false;
      if (search) {
        const q = search.toLowerCase();
        const resourceName = allResources.find((r) => r.id === b.resourceId)?.name?.toLowerCase() ?? '';
        const haystack = `${b.userName} ${b.purpose} ${resourceName}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [bookings, filter, search, profile, allResources, today]);

  const exportCSV = () => {
    const rows = [
      ['ID', 'Sumber', 'Tarikh', 'Mula', 'Tamat', 'Pemohon', 'Tujuan', 'Status'],
      ...filtered.map((b) => [
        b.id,
        allResources.find((r) => r.id === b.resourceId)?.name ?? b.resourceId,
        b.date,
        b.startTime,
        b.endTime,
        b.userName,
        b.purpose.replace(/,/g, ';'),
        b.status,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tempahan_skbt_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-white space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Arkib Tempahan</h3>
            <p className="text-lg font-bold text-slate-800 leading-tight">Rekod Penggunaan Sumber</p>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-[10px] font-bold px-3 py-1 bg-slate-50 text-slate-600 rounded-full border border-slate-200 uppercase tracking-widest">
              {filtered.length} / {bookings.length} Rekod
            </span>
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-slate-700 transition-all"
            >
              <Download size={12} /> CSV
            </button>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari pemohon, sumber, tujuan..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-xs font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
            />
          </div>
          <div className="flex gap-1 bg-slate-50 rounded-lg p-1 border border-slate-200">
            {[
              { id: 'all', label: 'Semua' },
              { id: 'mine', label: 'Saya' },
              { id: 'upcoming', label: 'Akan Datang' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as typeof filter)}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-1 ${
                  filter === f.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {f.id === 'all' && <Filter size={10} />}
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">ID / Sumber</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Aktiviti / Tujuan</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Slot Masa</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Pemohon</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Status</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length > 0 ? filtered.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <p className="text-[10px] font-mono text-blue-600 uppercase mb-0.5">#{b.id.split('-')[1]?.slice(-6) ?? b.id.slice(-6)}</p>
                  <p className="text-sm font-bold text-slate-800">
                    {allResources.find((r) => r.id === b.resourceId)?.name || b.resourceId}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-slate-600 max-w-xs truncate">{b.purpose}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-slate-700">
                    <CalendarDays size={14} className="text-slate-400" />
                    <span className="text-[11px] font-bold">{b.date}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-slate-500">
                    <Clock size={14} className="text-slate-400" />
                    <span className="text-[10px] font-medium">{b.startTime} - {b.endTime}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-200">
                      {b.userName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{b.userName}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                    b.status === 'confirmed' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                    b.status === 'cancelled' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                    'bg-amber-50 text-amber-600 border-amber-100'
                  }`}>
                    {b.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {b.status !== 'cancelled' && profile && b.userId === profile.id && (
                    <button
                      onClick={() => {
                        if (confirm('Batalkan tempahan ini?')) onCancel(b.id);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      title="Batalkan"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium text-sm italic">
                  Tiada rekod tempahan dijumpai.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
