import React, { useState, useMemo } from 'react';
import { CalendarDays, Clock, Search, Filter, Trash2, Download, Printer } from 'lucide-react';
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

  const printList = () => window.print();

  const printSingle = (b: Booking) => {
    const resourceName = allResources.find((r) => r.id === b.resourceId)?.name ?? b.resourceId;
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) {
      alert('Pop-up disekat. Sila benarkan pop-up untuk laman ini.');
      return;
    }
    const html = `<!doctype html>
<html lang="ms">
<head>
<meta charset="utf-8">
<title>Slip Tempahan #${b.id}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; color: #1e293b; margin: 0; padding: 32px; background: white; }
  .wrap { max-width: 720px; margin: 0 auto; }
  header { border-bottom: 3px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
  header h1 { margin: 0; font-size: 18px; letter-spacing: -0.01em; }
  header p.sub { margin: 4px 0 0; font-size: 11px; color: #475569; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 700; }
  .badge { display: inline-block; padding: 6px 12px; background: #dbeafe; color: #1d4ed8; border-radius: 6px; font-size: 10px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; }
  .badge.cancelled { background: #fee2e2; color: #b91c1c; }
  h2 { font-size: 22px; margin: 24px 0 8px; letter-spacing: -0.02em; }
  .meta { font-size: 12px; color: #64748b; margin: 0 0 24px; }
  dl { display: grid; grid-template-columns: 160px 1fr; gap: 12px 16px; padding: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; }
  dt { font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.15em; padding-top: 4px; }
  dd { font-size: 14px; font-weight: 600; color: #1e293b; margin: 0; }
  dd.purpose { white-space: pre-wrap; }
  footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
  .sig { margin-top: 56px; display: grid; grid-template-columns: 1fr 1fr; gap: 48px; }
  .sig div { border-top: 1px solid #94a3b8; padding-top: 6px; font-size: 11px; color: #64748b; text-align: center; }
  @media print { body { padding: 16px; } @page { margin: 1.5cm; size: A4; } }
</style>
</head>
<body>
  <div class="wrap">
    <header>
      <div>
        <p class="sub">SK Bandar Tawau</p>
        <h1>Sistem Tempahan Bilik Khas & Peralatan ICT</h1>
        <p class="sub" style="margin-top: 8px;">Slip Tempahan Rasmi</p>
      </div>
      <span class="badge ${b.status === 'cancelled' ? 'cancelled' : ''}">${b.status}</span>
    </header>

    <h2>${escapeHtml(resourceName)}</h2>
    <p class="meta">Rujukan: <code>#${escapeHtml(b.id)}</code></p>

    <dl>
      <dt>Pemohon</dt><dd>${escapeHtml(b.userName)}</dd>
      <dt>Sumber</dt><dd>${escapeHtml(resourceName)} (${b.resourceType === 'room' ? 'Bilik Khas' : 'Peralatan ICT'})</dd>
      <dt>Tarikh</dt><dd>${escapeHtml(b.date)}</dd>
      <dt>Slot Masa</dt><dd>${b.startTime} - ${b.endTime}</dd>
      <dt>Tujuan</dt><dd class="purpose">${escapeHtml(b.purpose)}</dd>
      <dt>Status</dt><dd>${escapeHtml(b.status.toUpperCase())}</dd>
      <dt>Tarikh Dicipta</dt><dd>${new Date(b.createdAt).toLocaleString('ms-MY')}</dd>
    </dl>

    <div class="sig">
      <div>Tandatangan Pemohon</div>
      <div>Tandatangan Pengesahan / Pentadbir</div>
    </div>

    <footer>
      Dijana oleh SKBT Booking System • Dicetak pada ${new Date().toLocaleString('ms-MY')}
    </footer>
  </div>
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;
    w.document.write(html);
    w.document.close();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print-area">
      {/* Print-only header */}
      <div className="hidden print:block p-6 border-b-2 border-slate-900">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-700">SK Bandar Tawau</p>
        <h1 className="text-lg font-black text-slate-900">Sistem Tempahan Bilik Khas & Peralatan ICT</h1>
        <p className="text-xs font-bold text-slate-700 uppercase tracking-widest mt-1">
          Senarai Tempahan • {filtered.length} rekod • Dicetak {new Date().toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="p-6 border-b border-slate-100 bg-white space-y-4 no-print">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Arkib Tempahan</h3>
            <p className="text-lg font-bold text-slate-800 leading-tight">Rekod Penggunaan Sumber</p>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <span className="text-[10px] font-bold px-3 py-1 bg-slate-50 text-slate-600 rounded-full border border-slate-200 uppercase tracking-widest">
              {filtered.length} / {bookings.length} Rekod
            </span>
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-slate-200 transition-all"
            >
              <Download size={12} /> CSV
            </button>
            <button
              onClick={printList}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-slate-700 transition-all"
            >
              <Printer size={12} /> Cetak Senarai
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
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 no-print"></th>
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
                    b.status === 'returned' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    'bg-amber-50 text-amber-600 border-amber-100'
                  }`}>
                    {b.status === 'returned' ? 'Pulang' : b.status}
                  </span>
                  {b.status === 'returned' && b.returnedAt && (
                    <p className="text-[10px] text-emerald-700 mt-0.5 font-bold">
                      {new Date(b.returnedAt).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' })}
                      {b.returnedByName && <span className="text-slate-400 font-normal"> · {b.returnedByName}</span>}
                    </p>
                  )}
                </td>
                <td className="px-6 py-4 no-print">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => printSingle(b)}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      title="Cetak slip tempahan ini"
                    >
                      <Printer size={14} />
                    </button>
                    {b.status === 'confirmed' && profile && b.userId === profile.id && (
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
                  </div>
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
