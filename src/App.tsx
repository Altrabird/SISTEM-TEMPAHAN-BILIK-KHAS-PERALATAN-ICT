/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  DoorOpen, 
  Laptop, 
  Settings, 
  Plus, 
  Menu, 
  X,
  Clock,
  User,
  Info,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { INITIAL_ROOMS, INITIAL_EQUIPMENT, INITIAL_ASSETS, STORAGE_KEYS } from './constants';
import { Booking, Resource, ResourceType, Asset } from './types';

// Simple View type for routing
type View = 'dashboard' | 'bookings' | 'rooms' | 'equipment' | 'settings';

export default function App() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // State for data
  const [rooms, setRooms] = useState<Resource[]>([]);
  const [equipment, setEquipment] = useState<Resource[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Asset Modal
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [showAssetList, setShowAssetList] = useState(false);
  
  // New Asset Modal
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [newAsset, setNewAsset] = useState<Partial<Asset>>({
    name: '',
    serialNumber: '',
    specifications: '',
    imageUrl: '',
    status: 'available'
  });
  
  // New Booking Modal
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [purposeCategory, setPurposeCategory] = useState('PdPc');
  const [purposeDetail, setPurposeDetail] = useState('');
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [newBooking, setNewBooking] = useState<Partial<Booking>>({
    date: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    endTime: '09:00',
    status: 'confirmed'
  });

  // Load data from localStorage
  useEffect(() => {
    const savedRooms = localStorage.getItem(STORAGE_KEYS.ROOMS);
    const savedEq = localStorage.getItem(STORAGE_KEYS.EQUIPMENT);
    const savedAssets = localStorage.getItem(STORAGE_KEYS.ASSETS);
    const savedBookings = localStorage.getItem(STORAGE_KEYS.BOOKINGS);

    setRooms(savedRooms ? JSON.parse(savedRooms) : INITIAL_ROOMS);
    setEquipment(savedEq ? JSON.parse(savedEq) : INITIAL_EQUIPMENT);
    setAssets(savedAssets ? JSON.parse(savedAssets) : INITIAL_ASSETS);
    setBookings(savedBookings ? JSON.parse(savedBookings) : []);
  }, []);

  // Save data on changes
  useEffect(() => {
    if (rooms.length > 0) localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(rooms));
    if (equipment.length > 0) localStorage.setItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify(equipment));
    if (assets.length > 0) localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(assets));
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
  }, [rooms, equipment, assets, bookings]);

  // Check for conflicts
  const checkConflict = (resourceId: string, date: string, start: string, end: string) => {
    return bookings.find(b => 
      b.resourceId === resourceId && 
      b.date === date && 
      b.status !== 'cancelled' &&
      start < b.endTime && 
      end > b.startTime
    );
  };

  const handleAddBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);

    if (!newBooking.resourceId || !newBooking.userName || !newBooking.date || !newBooking.startTime || !newBooking.endTime) {
      setBookingError("Sila lengkapkan semua maklumat peranti/bilik, tarikh dan waktu.");
      return;
    }

    if (newBooking.startTime >= newBooking.endTime) {
      setBookingError("Waktu tamat mestilah selepas waktu mula.");
      return;
    }

    // Check for existing booking conflict
    const conflict = checkConflict(newBooking.resourceId, newBooking.date, newBooking.startTime, newBooking.endTime);
    
    if (conflict) {
      setBookingError(`RALAT: ${newBooking.resourceType === 'room' ? 'Bilik' : 'Peralatan'} ini telah ditempah oleh ${conflict.userName} pada waktu tersebut (${conflict.startTime} - ${conflict.endTime}).`);
      return;
    }

    const finalPurpose = purposeCategory === 'Lain-lain' 
      ? purposeDetail 
      : (purposeDetail ? `${purposeCategory}: ${purposeDetail}` : purposeCategory);

    const booking: Booking = {
      ...(newBooking as Booking),
      id: `book-${Date.now()}`,
      purpose: finalPurpose,
      createdAt: Date.now(),
      status: 'confirmed',
      userId: 'user-1',
    } as Booking;

    setBookings([booking, ...bookings]);
    setShowBookingModal(false);
    setPurposeCategory('PdPc');
    setPurposeDetail('');
    setBookingError(null);
    setNewBooking({
      date: new Date().toISOString().split('T')[0],
      startTime: '08:00',
      endTime: '09:00',
      status: 'confirmed'
    });
  };

  const navItems = [
    { id: 'dashboard', label: 'Utama', icon: LayoutDashboard },
    { id: 'bookings', label: 'Tempahan', icon: CalendarDays },
    { id: 'rooms', label: 'Bilik Khas', icon: DoorOpen },
    { id: 'equipment', label: 'Peralatan ICT', icon: Laptop },
    { id: 'settings', label: 'Tetapan', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-[#f8fafc] text-[#1e293b] font-sans overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="bg-[#0f172a] text-slate-300 flex flex-col z-20 shrink-0"
      >
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <CalendarDays className="text-white w-5 h-5" />
            </div>
            {isSidebarOpen && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <h1 className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400 leading-none">SKBT Booking</h1>
                <p className="text-lg font-semibold text-white leading-tight mt-1">SISTEM 2026</p>
              </motion.div>
            )}
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as View)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 group ${
                activeView === item.id 
                ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20 shadow-lg shadow-blue-500/5' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent'
              }`}
            >
              <item.icon className={`w-5 h-5 shrink-0 ${activeView === item.id ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
              {isSidebarOpen && (
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-medium text-sm"
                >
                  {item.label}
                </motion.span>
              )}
            </button>
          ))}

          {isSidebarOpen && (
            <div className="mt-8 px-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-4">Pengurusan</p>
              <div className="space-y-3">
                <button 
                  onClick={() => setShowBookingModal(true)}
                  className="w-full text-left text-xs font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-2 group"
                >
                  <Plus size={14} className="text-slate-600 group-hover:text-blue-400" /> Tempahan Baru
                </button>
              </div>
            </div>
          )}
        </nav>

        <div className="p-4 bg-slate-900/50 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">AD</div>
            {isSidebarOpen && (
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate">Admin Developer</p>
                <p className="text-[10px] text-slate-500 truncate">admin@skbt.edu.my</p>
              </div>
            )}
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full h-8 flex items-center justify-center hover:bg-slate-800 rounded-lg transition-colors text-slate-500 hover:text-slate-300"
          >
            {isSidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 z-10 shrink-0 shadow-sm shadow-slate-200/50">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
            {navItems.find(n => n.id === activeView)?.label}
          </h2>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Tersedia</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Ditempah</span>
              </div>
            </div>
            <button 
              onClick={() => {
                setBookingError(null);
                setShowBookingModal(true);
              }}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 active:scale-95"
            >
              <Plus size={16} /> Tempahan Baru
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-[#f8fafc]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeView === 'dashboard' && (
                <DashboardView bookings={bookings} rooms={rooms} equipment={equipment} />
              )}
              {activeView === 'bookings' && (
                <BookingsList bookings={bookings} rooms={rooms} equipment={equipment} />
              )}
              {activeView === 'rooms' && (
                <ResourceManagement 
                  resources={rooms} 
                  title="Bilik Khas" 
                  type="room" 
                  onAction={(id) => {
                    const room = rooms.find(r => r.id === id);
                    if (room) {
                      setNewBooking({
                        ...newBooking,
                        resourceId: id,
                        resourceType: 'room'
                      });
                      setShowBookingModal(true);
                    }
                  }}
                />
              )}
              {activeView === 'equipment' && (
                <ResourceManagement 
                  resources={equipment} 
                  title="Peralatan ICT" 
                  type="equipment" 
                  onAction={(id) => {
                    setSelectedResourceId(id);
                    setShowAssetList(true);
                  }}
                  onAdd={() => setShowAddAssetModal(true)}
                />
              )}
              {activeView === 'settings' && (
                <SettingsView onReset={() => {
                  localStorage.clear();
                  window.location.reload();
                }} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Booking Modal */}
        <AnimatePresence>
          {showBookingModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowBookingModal(false)}
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
                  <button 
                    onClick={() => setShowBookingModal(false)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleAddBooking} className="space-y-6">
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
                        value={newBooking.userName}
                        onChange={e => setNewBooking({...newBooking, userName: e.target.value})}
                        placeholder="Contoh: En. Razak"
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm font-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tarikh Tempahan</label>
                      <input 
                        required
                        type="date" 
                        value={newBooking.date}
                        onChange={e => setNewBooking({...newBooking, date: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Sumber (Bilik / Peralatan)</label>
                    <select 
                      required
                      value={newBooking.resourceId}
                      onChange={e => {
                        const allResources = [...rooms, ...equipment];
                        const selected = allResources.find(r => r.id === e.target.value);
                        setNewBooking({
                          ...newBooking, 
                          resourceId: e.target.value,
                          resourceType: selected?.type
                        });
                      }}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none bg-white text-sm font-medium"
                    >
                      <option value="">Pilih Sumber</option>
                      <optgroup label="Bilik Khas">
                        {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </optgroup>
                      <optgroup label="Peralatan ICT">
                        {equipment.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </optgroup>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Waktu Mula</label>
                      <input 
                        required
                        type="time" 
                        value={newBooking.startTime}
                        onChange={e => setNewBooking({...newBooking, startTime: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm font-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Waktu Tamat</label>
                      <input 
                        required
                        type="time" 
                        value={newBooking.endTime}
                        onChange={e => setNewBooking({...newBooking, endTime: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-sm font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tujuan Aktiviti</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {['PdPc', 'Mesyuarat / Taklimat / Bengkel', 'Ujian / Peperiksaan', 'Pertandingan', 'Kuiz', 'Lain-lain'].map((preset) => (
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
                        {purposeCategory === 'Lain-lain' 
                          ? 'Sila Nyatakan Tujuan' 
                          : 'Perincian Tambahan'}
                      </label>
                      <textarea 
                        required={purposeCategory === 'Lain-lain'}
                        rows={3}
                        value={purposeDetail}
                        onChange={e => setPurposeDetail(e.target.value)}
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

        {/* Asset List Modal */}
        <AnimatePresence>
          {showAssetList && selectedResourceId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAssetList(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-[#f8fafc] rounded-2xl w-full max-w-5xl h-[85vh] relative shadow-2xl overflow-hidden border border-slate-200 flex flex-col"
              >
                <div className="p-8 border-b border-slate-200 bg-white flex justify-between items-start shrink-0">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800">
                      Pinjam Peralatan: {equipment.find(e => e.id === selectedResourceId)?.name}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-semibold">Pilih unit spesifik untuk tempahan</p>
                  </div>
                  <button 
                    onClick={() => setShowAssetList(false)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {assets.filter(a => a.resourceId === selectedResourceId).map((asset) => (
                      <motion.div 
                        key={asset.id}
                        className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:border-blue-500 transition-all flex flex-col"
                      >
                        <div className="h-40 bg-slate-100 relative group overflow-hidden">
                          {asset.imageUrl ? (
                            <img 
                              src={asset.imageUrl} 
                              alt={asset.name} 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <Laptop size={48} />
                            </div>
                          )}
                          <div className="absolute top-3 left-3">
                            <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border ${
                              asset.status === 'available' ? 'bg-green-50 text-green-600 border-green-100' : 
                              asset.status === 'borrowed' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                              'bg-rose-50 text-rose-600 border-rose-100'
                            }`}>
                              {asset.status}
                            </span>
                          </div>
                        </div>
                        <div className="p-5 flex-1">
                          <h3 className="font-bold text-lg text-slate-800">{asset.name}</h3>
                          <p className="text-[10px] font-mono text-blue-600 uppercase mt-1">S/N: {asset.serialNumber}</p>
                          
                          <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 items-center flex gap-1">
                              <Info size={10} /> Spesifikasi
                            </p>
                            <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                              {asset.specifications}
                            </p>
                          </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                          <button 
                            disabled={asset.status !== 'available'}
                            onClick={() => {
                              setNewBooking({
                                ...newBooking,
                                resourceId: asset.id, // We book the specific asset ID now
                                resourceType: 'equipment'
                              });
                              setShowAssetList(false);
                              setBookingError(null);
                              setShowBookingModal(true);
                            }}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                              asset.status === 'available' 
                              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/10' 
                              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            Pilih Unit
                          </button>
                        </div>
                      </motion.div>
                    ))}
                    
                    {/* Placeholder for "Add Unit" within this view if admin */}
                    <button 
                      onClick={() => {
                        setNewAsset({...newAsset, resourceId: selectedResourceId});
                        setShowAddAssetModal(true);
                      }}
                      className="bg-white border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-8 gap-3 group hover:border-blue-500 transition-all min-h-[300px]"
                    >
                      <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <Plus size={24} />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-slate-600 uppercase">Tambah Unit Baru</p>
                        <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-tighter">Daftar Aset ICT</p>
                      </div>
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Add Asset Modal */}
        <AnimatePresence>
          {showAddAssetModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAddAssetModal(false)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-2xl w-full max-w-lg p-8 relative shadow-2xl border border-slate-200"
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-800">Daftar Peralatan Baru</h2>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-semibold">Masukkan perincian aset spesifik</p>
                  </div>
                  <button 
                    onClick={() => setShowAddAssetModal(false)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form className="space-y-4" onSubmit={(e) => {
                  e.preventDefault();
                  if (!newAsset.name || !newAsset.resourceId) return;
                  const asset: Asset = {
                    ...newAsset as Asset,
                    id: `ast-${Date.now()}`,
                  };
                  setAssets([...assets, asset]);
                  setShowAddAssetModal(false);
                  setNewAsset({
                    name: '',
                    serialNumber: '',
                    specifications: '',
                    imageUrl: '',
                    status: 'available'
                  });
                }}>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Kategori</label>
                    <select 
                      required
                      value={newAsset.resourceId}
                      onChange={e => setNewAsset({...newAsset, resourceId: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none bg-white"
                    >
                      <option value="">Pilih Kategori</option>
                      {equipment.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nama Item / Unit</label>
                    <input 
                      required
                      type="text" 
                      placeholder="Contoh: Laptop Murid 22"
                      value={newAsset.name}
                      onChange={e => setNewAsset({...newAsset, name: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">No. Siri</label>
                    <input 
                      required
                      type="text" 
                      placeholder="Contoh: SKBT-LP-022"
                      value={newAsset.serialNumber}
                      onChange={e => setNewAsset({...newAsset, serialNumber: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-bold text-blue-600 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Spesifikasi</label>
                    <textarea 
                      required
                      rows={2}
                      placeholder="Contoh: Intel Core i5, 8GB RAM, SSD 256GB"
                      value={newAsset.specifications}
                      onChange={e => setNewAsset({...newAsset, specifications: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">URL Gambar Item</label>
                    <input 
                      type="url" 
                      placeholder="https://..."
                      value={newAsset.imageUrl}
                      onChange={e => setNewAsset({...newAsset, imageUrl: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-blue-600"
                    />
                    <p className="text-[9px] text-slate-400 italic">Masukkan URL gambar produk (Unsplash/Direct link)</p>
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-[#0f172a] text-white py-3 rounded-lg text-sm font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95 mt-4"
                  >
                    Daftar Item
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// Sub-components

function DashboardView({ bookings, rooms, equipment }: { bookings: Booking[], rooms: Resource[], equipment: Resource[] }) {
  const today = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter(b => b.date === today);

  const stats = [
    { label: 'Jumlah Bilik', value: rooms.length, icon: DoorOpen, color: 'bg-blue-100 text-blue-600' },
    { label: 'Peralatan ICT', value: equipment.length, icon: Laptop, color: 'bg-purple-100 text-purple-600' },
    { label: 'Tempahan Hari Ini', value: todayBookings.length, icon: Clock, color: 'bg-green-100 text-green-600' },
    { label: 'Total Tempahan', value: bookings.length, icon: CheckCircle2, color: 'bg-amber-100 text-amber-600' },
  ];

  const allResources = [...rooms, ...equipment];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
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
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest cursor-pointer hover:underline">Lihat Kalendar</span>
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
                        {allResources.find(r => r.id === b.resourceId)?.name || 'N/A'}
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

function BookingsList({ bookings, rooms, equipment }: { bookings: Booking[], rooms: Resource[], equipment: Resource[] }) {
  const allResources = [...rooms, ...equipment];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Arkib Tempahan</h3>
          <p className="text-lg font-bold text-slate-800 leading-tight">Rekod Penggunaan Sumber</p>
        </div>
        <div className="flex gap-2">
          <span className="text-[10px] font-bold px-3 py-1 bg-slate-50 text-slate-600 rounded-full border border-slate-200 uppercase tracking-widest">
            {bookings.length} Rekod
          </span>
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
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {bookings.length > 0 ? bookings.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <p className="text-[10px] font-mono text-blue-600 uppercase mb-0.5">#{b.id.split('-')[1].slice(-6)}</p>
                  <p className="text-sm font-bold text-slate-800">
                    {allResources.find(r => r.id === b.resourceId)?.name || b.resourceId}
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
                      {b.userName.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{b.userName}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100">
                    CONFIRMED
                  </span>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium text-sm italic">Tiada rekod tempahan dijumpai.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ResourceManagement({ resources, title, type, onAction, onAdd }: { resources: Resource[], title: string, type: ResourceType, onAction: (id: string) => void, onAdd?: () => void }) {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</h3>
            <p className="text-lg font-bold text-slate-800 leading-tight">Sistem Inventori & Rekod Penggunaan</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onAdd || (() => {})} 
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20"
            >
              <Plus size={14} /> Tambah {type === 'room' ? 'Bilik' : 'Alatan'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {resources.map((r) => (
            <div key={r.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mb-1 line-clamp-1">{r.name}</p>
              <p className="text-lg font-black text-slate-800 leading-none">
                {type === 'room' ? r.capacity : r.quantity}
              </p>
              <p className="text-[8px] font-bold text-slate-500 uppercase mt-1">UNIT</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {resources.map((r, i) => (
          <motion.div 
            key={r.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm group hover:border-blue-500 transition-all relative overflow-hidden"
          >
            <div className="flex items-start justify-between mb-8">
              <div className={`w-10 h-10 ${type === 'room' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'} rounded-lg flex items-center justify-center border border-slate-100 group-hover:scale-110 transition-transform`}>
                {type === 'room' ? <DoorOpen size={18} /> : <Laptop size={18} />}
              </div>
              <div className="flex flex-col items-end">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
                  {type === 'room' ? 'Muatan' : 'Stok'}
                </p>
                <p className="text-sm font-black text-slate-800 leading-none">
                  {type === 'room' ? `${r.capacity} PAX` : `${r.quantity} UNIT`}
                </p>
              </div>
            </div>
            
            <div className="min-h-[64px]">
              <h3 className="font-bold text-base text-slate-800 leading-snug tracking-tight group-hover:text-blue-600 transition-colors uppercase">{r.name}</h3>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{type === 'room' ? 'Inventori Bilik' : 'Inventori ICT'}</p>
            </div>
  
            <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Aktif</span>
              </div>
              <button 
                onClick={() => onAction(r.id)}
                className="bg-blue-600/10 text-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all"
              >
                {type === 'room' ? 'Tempah' : 'Pinjam'}
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SettingsView({ onReset }: { onReset: () => void }) {
  return (
    <div className="max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-8">
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Konfigurasi</h3>
        <h2 className="text-2xl font-bold tracking-tight text-slate-800">Tetapan Sistem 2026</h2>
        <p className="text-sm text-slate-500 mt-1">Urus data dan tetapan aplikasi SKBT.</p>
      </div>

      <div className="space-y-6">
        <section className="space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Data & Storan Lokal</h3>
          <div className="p-6 bg-rose-50 border border-rose-100 rounded-xl space-y-4">
            <div>
              <h4 className="text-sm font-bold text-rose-700">Padamkan Semua Data</h4>
              <p className="text-xs text-rose-600/80 mt-1 leading-relaxed">Ini akan memadamkan secara kekal semua rekod tempahan, senarai bilik kustom, dan peralatan daripada storan pelayar anda.</p>
            </div>
            <button 
              onClick={onReset}
              className="bg-rose-600 text-white px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-rose-700 transition-all shadow-md shadow-rose-500/20 active:scale-95"
            >
              Reset Sistem Sekarang
            </button>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Mengenai Aplikasi</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Versi Stabil</p>
              <p className="text-sm font-bold text-slate-700">v1.2.4 (Enterprise Edition)</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tahun Aktif</p>
              <p className="text-sm font-bold text-blue-600 tracking-widest leading-none mt-1">2026 / 2027</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

