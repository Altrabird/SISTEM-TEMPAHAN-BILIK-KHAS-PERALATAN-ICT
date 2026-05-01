import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard, CalendarDays, DoorOpen, Laptop, Settings,
  Plus, Menu, X, UserCircle2, Sparkles, Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { INITIAL_ROOMS, INITIAL_EQUIPMENT, INITIAL_ASSETS, ROLE_LABELS } from './constants';
import { Booking, Resource, Asset, Profile } from './types';
import { localStore, syncProfileToCloud, syncBookingToCloud } from './lib/storage';
import { isSupabaseEnabled } from './lib/supabase';

import { DashboardView } from './views/DashboardView';
import { BookingsView } from './views/BookingsView';
import { ResourceManagementView } from './views/ResourceManagementView';
import { SettingsView } from './views/SettingsView';
import { PortfolioView } from './views/PortfolioView';
import { AdminView } from './views/AdminView';

import { OnboardingModal } from './components/OnboardingModal';
import { BookingModal } from './components/BookingModal';
import { AssetListModal } from './components/AssetListModal';
import { AddAssetModal } from './components/AddAssetModal';

type View = 'dashboard' | 'portfolio' | 'bookings' | 'rooms' | 'equipment' | 'admin' | 'settings';

export default function App() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const [rooms, setRooms] = useState<Resource[]>([]);
  const [equipment, setEquipment] = useState<Resource[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [showAssetList, setShowAssetList] = useState(false);
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingInitial, setBookingInitial] = useState<Partial<Booking>>({});

  useEffect(() => {
    setRooms(localStore.getRooms(INITIAL_ROOMS));
    setEquipment(localStore.getEquipment(INITIAL_EQUIPMENT));
    setAssets(localStore.getAssets(INITIAL_ASSETS));
    setBookings(localStore.getBookings());
    setProfile(localStore.getProfile());
    setProfileLoaded(true);
  }, []);

  useEffect(() => { if (rooms.length) localStore.saveRooms(rooms); }, [rooms]);
  useEffect(() => { if (equipment.length) localStore.saveEquipment(equipment); }, [equipment]);
  useEffect(() => { if (assets.length) localStore.saveAssets(assets); }, [assets]);
  useEffect(() => { localStore.saveBookings(bookings); }, [bookings]);

  useEffect(() => {
    if (profile) {
      localStore.saveProfile(profile);
      void syncProfileToCloud(profile);
    }
  }, [profile]);

  const updateLastActive = () => {
    if (profile) setProfile({ ...profile, lastActiveAt: Date.now() });
  };

  const checkConflict = (resourceId: string, date: string, start: string, end: string) =>
    bookings.find((b) =>
      b.resourceId === resourceId &&
      b.date === date &&
      b.status !== 'cancelled' &&
      start < b.endTime &&
      end > b.startTime,
    );

  const submitBooking = (b: Omit<Booking, 'id' | 'createdAt'> & { purposeFinal: string }): string | null => {
    const conflict = checkConflict(b.resourceId, b.date, b.startTime, b.endTime);
    if (conflict) {
      return `RALAT: ${b.resourceType === 'room' ? 'Bilik' : 'Peralatan'} ini telah ditempah oleh ${conflict.userName} pada waktu tersebut (${conflict.startTime} - ${conflict.endTime}).`;
    }
    const booking: Booking = {
      ...b,
      purpose: b.purposeFinal,
      id: `book-${Date.now()}`,
      createdAt: Date.now(),
    };
    setBookings((prev) => [booking, ...prev]);
    void syncBookingToCloud(booking);
    updateLastActive();
    return null;
  };

  const cancelBooking = (id: string) => {
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: 'cancelled' } : b)));
  };

  const openBookingModal = (initial: Partial<Booking> = {}) => {
    setBookingInitial({ userName: profile?.name, ...initial });
    setShowBookingModal(true);
  };

  const isAdmin = profile?.role === 'admin';

  const navItems = [
    { id: 'dashboard' as View, label: 'Utama', icon: LayoutDashboard },
    { id: 'portfolio' as View, label: 'Portfolio Saya', icon: UserCircle2 },
    { id: 'bookings' as View, label: 'Tempahan', icon: CalendarDays },
    { id: 'rooms' as View, label: 'Bilik Khas', icon: DoorOpen },
    { id: 'equipment' as View, label: 'Peralatan ICT', icon: Laptop },
    ...(isAdmin ? [{ id: 'admin' as View, label: 'Pentadbir', icon: Shield }] : []),
    { id: 'settings' as View, label: 'Tetapan', icon: Settings },
  ];

  const initials = useMemo(
    () => (profile?.name ?? 'AD').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase(),
    [profile?.name],
  );

  const myBookingsCount = useMemo(
    () => (profile ? bookings.filter((b) => b.userId === profile.id && b.status !== 'cancelled').length : 0),
    [bookings, profile],
  );

  if (!profileLoaded) return null;

  return (
    <div className="flex h-screen bg-[#f8fafc] text-[#1e293b] font-sans overflow-hidden">
      {!profile && <OnboardingModal onComplete={(p) => setProfile(p)} />}

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
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden whitespace-nowrap">
                <h1 className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400 leading-none">SKBT Booking</h1>
                <p className="text-lg font-semibold text-white leading-tight mt-1">SISTEM 2026</p>
              </motion.div>
            )}
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 group ${
                activeView === item.id
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20 shadow-lg shadow-blue-500/5'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent'
              }`}
            >
              <item.icon className={`w-5 h-5 shrink-0 ${activeView === item.id ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
              {isSidebarOpen && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-medium text-sm flex-1 text-left">
                  {item.label}
                </motion.span>
              )}
              {isSidebarOpen && item.id === 'portfolio' && myBookingsCount > 0 && (
                <span className="text-[9px] font-black bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">{myBookingsCount}</span>
              )}
            </button>
          ))}

          {isSidebarOpen && (
            <div className="mt-6 px-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-3">Pengurusan</p>
              <button
                onClick={() => openBookingModal()}
                className="w-full text-left text-xs font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-2 group"
              >
                <Plus size={14} className="text-slate-600 group-hover:text-blue-400" /> Tempahan Baru
              </button>
            </div>
          )}
        </nav>

        <div className="p-4 bg-slate-900/50 border-t border-slate-800">
          <button
            onClick={() => setActiveView('portfolio')}
            className="w-full flex items-center gap-3 mb-3 px-2 py-1.5 rounded-lg hover:bg-slate-800 transition-colors text-left"
          >
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.name} referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                {initials}
              </div>
            )}
            {isSidebarOpen && (
              <div className="overflow-hidden flex-1">
                <p className="text-xs font-bold text-white truncate">{profile?.name ?? 'Tetamu'}</p>
                <p className="text-[10px] text-slate-500 truncate">
                  {profile ? (ROLE_LABELS[profile.role] ?? profile.role) : 'Belum ditetapkan'}
                  {isSupabaseEnabled && <span className="ml-1.5 text-emerald-400">●</span>}
                </p>
              </div>
            )}
          </button>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full h-8 flex items-center justify-center hover:bg-slate-800 rounded-lg transition-colors text-slate-500 hover:text-slate-300"
          >
            {isSidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </motion.aside>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 z-10 shrink-0 shadow-sm shadow-slate-200/50">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
            {navItems.find((n) => n.id === activeView)?.label}
          </h2>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Tersedia</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Ditempah</span>
              </div>
            </div>
            <button
              onClick={() => openBookingModal()}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 active:scale-95"
            >
              <Plus size={16} /> Tempahan Baru
            </button>
          </div>
        </header>

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
                <DashboardView
                  bookings={bookings}
                  rooms={rooms}
                  equipment={equipment}
                  profile={profile}
                  onOpenPortfolio={() => setActiveView('portfolio')}
                />
              )}
              {activeView === 'portfolio' && profile && (
                <PortfolioView
                  profile={profile}
                  bookings={bookings}
                  rooms={rooms}
                  equipment={equipment}
                  onEditProfile={() => setActiveView('settings')}
                  onNewBooking={() => openBookingModal()}
                />
              )}
              {activeView === 'portfolio' && !profile && (
                <EmptyProfilePrompt onCreate={() => setProfile(null)} />
              )}
              {activeView === 'bookings' && (
                <BookingsView
                  bookings={bookings}
                  rooms={rooms}
                  equipment={equipment}
                  profile={profile}
                  onCancel={cancelBooking}
                />
              )}
              {activeView === 'rooms' && (
                <ResourceManagementView
                  resources={rooms}
                  title="Bilik Khas"
                  type="room"
                  onAction={(id) => openBookingModal({ resourceId: id, resourceType: 'room' })}
                />
              )}
              {activeView === 'equipment' && (
                <ResourceManagementView
                  resources={equipment}
                  title="Peralatan ICT"
                  type="equipment"
                  onAction={(id) => {
                    setSelectedResourceId(id);
                    setShowAssetList(true);
                  }}
                  onAdd={() => {
                    setSelectedResourceId(null);
                    setShowAddAssetModal(true);
                  }}
                />
              )}
              {activeView === 'admin' && isAdmin && (
                <AdminView
                  rooms={rooms}
                  equipment={equipment}
                  localBookings={bookings}
                />
              )}
              {activeView === 'admin' && !isAdmin && (
                <div className="max-w-lg mx-auto bg-white rounded-3xl border border-rose-200 p-12 text-center shadow-sm">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                    <Shield size={32} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">Akses Terhad</h2>
                  <p className="text-sm text-slate-500 mt-2">
                    Hanya pengguna dengan peranan "Pentadbir" boleh mengakses paparan ini.
                  </p>
                </div>
              )}
              {activeView === 'settings' && (
                <SettingsView
                  profile={profile}
                  onReset={() => {
                    if (confirm('Padamkan SEMUA data tempatan termasuk profil?')) {
                      localStore.resetAll();
                      window.location.reload();
                    }
                  }}
                  onSaveProfile={(p) => setProfile(p)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <BookingModal
        open={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        rooms={rooms}
        equipment={equipment}
        profile={profile}
        initial={bookingInitial}
        onSubmit={submitBooking}
      />

      <AssetListModal
        open={showAssetList}
        resourceId={selectedResourceId}
        assets={assets}
        equipment={equipment}
        onClose={() => setShowAssetList(false)}
        onPick={(asset) => {
          setShowAssetList(false);
          openBookingModal({ resourceId: asset.id, resourceType: 'equipment' });
        }}
        onAdd={() => setShowAddAssetModal(true)}
      />

      <AddAssetModal
        open={showAddAssetModal}
        initialResourceId={selectedResourceId}
        equipment={equipment}
        onClose={() => setShowAddAssetModal(false)}
        onSubmit={(asset) => setAssets((prev) => [...prev, asset])}
      />
    </div>
  );
}

function EmptyProfilePrompt({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="max-w-lg mx-auto bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
        <Sparkles size={32} />
      </div>
      <h2 className="text-xl font-bold text-slate-800">Cipta Profil Anda</h2>
      <p className="text-sm text-slate-500 mt-2">Profil membolehkan anda menjejak tempahan dan pencapaian.</p>
      <button
        onClick={onCreate}
        className="mt-6 bg-blue-600 text-white px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all"
      >
        Mula Sekarang
      </button>
    </div>
  );
}
