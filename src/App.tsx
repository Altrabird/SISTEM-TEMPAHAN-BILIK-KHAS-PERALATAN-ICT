import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard, CalendarDays, DoorOpen, Laptop, Settings,
  Plus, Menu, X, UserCircle2, Sparkles, Shield, LogOut, FileText, PackageCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { INITIAL_ROOMS, INITIAL_EQUIPMENT, INITIAL_ASSETS, ROLE_LABELS } from './constants';
import { Booking, Resource, Asset, Profile } from './types';
import {
  localStore,
  syncProfileToCloud,
  syncBookingToCloud,
  fetchRoomsFromCloud,
  fetchEquipmentFromCloud,
  upsertResourceToCloud,
  fetchAssetsFromCloud,
  upsertAssetToCloud,
  deleteAssetFromCloud,
  fetchBookingsFromCloud,
  updateBookingInCloud,
} from './lib/storage';
import { isAssetLocked, isResourceLocked, lockReasonOf } from './lib/locks';
import { isSupabaseEnabled } from './lib/supabase';

import { DashboardView } from './views/DashboardView';
import { BookingsView } from './views/BookingsView';
import { ResourceManagementView } from './views/ResourceManagementView';
import { SettingsView } from './views/SettingsView';
import { PortfolioView } from './views/PortfolioView';
import { AdminView } from './views/AdminView';
import { ReportsView } from './views/ReportsView';
import { ActiveLoansView } from './views/ActiveLoansView';
import { MyLoansView } from './views/MyLoansView';

import { OnboardingModal } from './components/OnboardingModal';
import { BookingModal } from './components/BookingModal';
import { AssetListModal } from './components/AssetListModal';
import { AddAssetModal } from './components/AddAssetModal';
import { EditProfileModal } from './components/EditProfileModal';
import { EditResourceModal } from './components/EditResourceModal';
import { LoanModal } from './components/LoanModal';
import { BulkLoanModal } from './components/BulkLoanModal';
import { QRCodeModal } from './components/QRCodeModal';
import { LockAssetModal } from './components/LockAssetModal';
import { EditAssetModal } from './components/EditAssetModal';
import { BulkAssetActionsModal, BulkAction } from './components/BulkAssetActionsModal';
import { ReturnLoanModal } from './components/ReturnLoanModal';
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt';

type View = 'dashboard' | 'portfolio' | 'bookings' | 'rooms' | 'equipment' | 'returns' | 'admin' | 'reports' | 'loans' | 'settings';

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
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [bookingInitial, setBookingInitial] = useState<Partial<Booking>>({});

  const [loanAsset, setLoanAsset] = useState<Asset | null>(null);
  const [loanFromQr, setLoanFromQr] = useState(false);
  const [showBulkLoanModal, setShowBulkLoanModal] = useState(false);
  const [qrAsset, setQrAsset] = useState<Asset | null>(null);
  const [pendingLoanId, setPendingLoanId] = useState<string | null>(null);
  const [lockingAsset, setLockingAsset] = useState<Asset | null>(null);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [showBulkAssetActions, setShowBulkAssetActions] = useState(false);
  const [returningLoan, setReturningLoan] = useState<{ booking: Booking; asset: Asset | null } | null>(null);

  useEffect(() => {
    setRooms(localStore.getRooms(INITIAL_ROOMS));
    setEquipment(localStore.getEquipment(INITIAL_EQUIPMENT));
    setAssets(localStore.getAssets(INITIAL_ASSETS));
    setBookings(localStore.getBookings());
    setProfile(localStore.getProfile());
    setProfileLoaded(true);

    // Supabase is the source of truth. Cloud results overwrite local cache
    // (even when empty — we've seeded the canonical data via migrations).
    // localStorage only serves as an offline fallback when Supabase is off.
    void (async () => {
      const [cloudRooms, cloudEquipment, cloudAssets, cloudBookings] = await Promise.all([
        fetchRoomsFromCloud(),
        fetchEquipmentFromCloud(),
        fetchAssetsFromCloud(),
        fetchBookingsFromCloud(),
      ]);
      if (cloudRooms !== null) setRooms(cloudRooms);
      if (cloudEquipment !== null) setEquipment(cloudEquipment);
      if (cloudAssets !== null) setAssets(cloudAssets);
      if (cloudBookings !== null) setBookings(cloudBookings);
    })();

    // Parse ?loan=ast-X URL param (QR code deep-link entry).
    try {
      const params = new URLSearchParams(window.location.search);
      const loanId = params.get('loan');
      if (loanId) setPendingLoanId(loanId);
    } catch {
      /* noop */
    }
  }, []);

  // Once profile + assets are ready, open LoanModal for the pending QR target.
  useEffect(() => {
    if (!pendingLoanId || !profile || assets.length === 0) return;
    const asset = assets.find((a) => a.id === pendingLoanId);
    if (asset) {
      setLoanAsset(asset);
      setLoanFromQr(true);
      setActiveView('equipment');
    }
    setPendingLoanId(null);
    // Clean URL so refresh doesn't reopen
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('loan');
      window.history.replaceState({}, '', url.toString());
    } catch {
      /* noop */
    }
  }, [pendingLoanId, profile, assets]);

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

  const switchProfile = () => {
    if (!confirm('Tukar profil? Anda akan kembali ke menu pemilihan profil.')) return;
    localStore.clearProfile();
    setProfile(null);
    setActiveView('dashboard');
  };

  // A booking still "occupies" the resource only while it's confirmed/pending.
  // Cancelled OR returned bookings are released and don't block future ones.
  const isActiveBooking = (b: Booking) =>
    b.status !== 'cancelled' && b.status !== 'returned';

  // Room booking — single-day time-slot overlap.
  const checkConflict = (resourceId: string, date: string, start: string, end: string) =>
    bookings.find((b) =>
      b.resourceId === resourceId &&
      b.date === date &&
      isActiveBooking(b) &&
      start < b.endTime &&
      end > b.startTime,
    );

  // ICT loan — date-range overlap on a specific asset.
  const checkLoanConflict = (assetId: string, startDate: string, returnDate: string) =>
    bookings.find((b) => {
      if (b.resourceId !== assetId) return false;
      if (!isActiveBooking(b)) return false;
      const bStart = b.date;
      const bEnd = b.returnDate ?? b.date;
      return startDate <= bEnd && returnDate >= bStart;
    });

  const submitBooking = (b: Omit<Booking, 'id' | 'createdAt'> & { purposeFinal: string }): string | null => {
    // Lock check (room or equipment category)
    const allRes = [...rooms, ...equipment];
    const target = allRes.find((r) => r.id === b.resourceId);
    if (target && isResourceLocked(target)) {
      return `RALAT: ${target.name} sedang DIKUNCI oleh pentadbir. Sebab: ${lockReasonOf(target)}`;
    }
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

  const submitLoan = (input: {
    asset: Asset;
    purpose: string;
    startDate: string;
    returnDate: string;
  }): string | null => {
    if (!profile) return 'Sila log masuk profil terlebih dahulu.';
    // Lock checks
    if (isAssetLocked(input.asset)) {
      return `RALAT: ${input.asset.name} sedang DIKUNCI. Sebab: ${lockReasonOf(input.asset)}`;
    }
    const category = equipment.find((e) => e.id === input.asset.resourceId);
    if (category && isResourceLocked(category)) {
      return `RALAT: Kategori ${category.name} sedang DIKUNCI. Sebab: ${lockReasonOf(category)}`;
    }
    const conflict = checkLoanConflict(input.asset.id, input.startDate, input.returnDate);
    if (conflict) {
      return `RALAT: ${input.asset.name} sudah dipinjam oleh ${conflict.userName} dari ${conflict.date} hingga ${conflict.returnDate ?? conflict.date}.`;
    }
    const booking: Booking = {
      id: `loan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      resourceId: input.asset.id,
      resourceType: 'equipment',
      userId: profile.id,
      userName: profile.name,
      date: input.startDate,
      returnDate: input.returnDate,
      startTime: '08:00',
      endTime: '17:00',
      purpose: input.purpose,
      status: 'confirmed',
      createdAt: Date.now(),
    };
    setBookings((prev) => [booking, ...prev]);
    void syncBookingToCloud(booking);
    updateLastActive();
    return null;
  };

  const submitBulkLoan = (input: {
    assets: Asset[];
    purpose: string;
    startDate: string;
    returnDate: string;
  }): string | null => {
    if (!profile) return 'Sila log masuk profil terlebih dahulu.';
    // Lock checks first (asset OR its category)
    const lockedItems: string[] = [];
    input.assets.forEach((a) => {
      if (isAssetLocked(a)) lockedItems.push(a.name);
      else {
        const cat = equipment.find((e) => e.id === a.resourceId);
        if (cat && isResourceLocked(cat)) lockedItems.push(`${a.name} [${cat.name}]`);
      }
    });
    if (lockedItems.length > 0) {
      return `RALAT: ${lockedItems.length} unit DIKUNCI: ${lockedItems.slice(0, 3).join(', ')}${lockedItems.length > 3 ? '...' : ''}`;
    }
    const blocked: string[] = [];
    input.assets.forEach((a) => {
      const conflict = checkLoanConflict(a.id, input.startDate, input.returnDate);
      if (conflict) blocked.push(`${a.name} (${conflict.userName})`);
    });
    if (blocked.length > 0) {
      return `RALAT: ${blocked.length} unit telah dipinjam: ${blocked.slice(0, 3).join(', ')}${blocked.length > 3 ? '...' : ''}`;
    }

    const now = Date.now();
    const newBookings: Booking[] = input.assets.map((asset, i) => ({
      id: `loan-${now}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      resourceId: asset.id,
      resourceType: 'equipment' as const,
      userId: profile.id,
      userName: profile.name,
      date: input.startDate,
      returnDate: input.returnDate,
      startTime: '08:00',
      endTime: '17:00',
      purpose: `${input.purpose} [PUKAL ×${input.assets.length}]`,
      status: 'confirmed' as const,
      createdAt: now + i,
    }));
    setBookings((prev) => [...newBookings, ...prev]);
    newBookings.forEach((b) => void syncBookingToCloud(b));
    updateLastActive();
    return null;
  };

  const cancelBooking = (id: string, reason?: string) => {
    if (!profile) return;
    setBookings((prev) => {
      const next = prev.map((b) =>
        b.id === id
          ? {
              ...b,
              status: 'cancelled' as const,
              cancelledAt: Date.now(),
              cancelledById: profile.id,
              cancelledByName: profile.name,
              cancelReason: reason && reason.trim().length > 0 ? reason.trim() : undefined,
            }
          : b,
      );
      const updated = next.find((b) => b.id === id);
      if (updated) void updateBookingInCloud(updated);
      return next;
    });
  };

  const markLoanReturned = (booking: Booking, notes: string) => {
    if (!profile) return;
    const updated: Booking = {
      ...booking,
      status: 'returned',
      returnedAt: Date.now(),
      returnedById: profile.id,
      returnedByName: profile.name,
      returnNotes: notes || undefined,
    };
    setBookings((prev) => prev.map((b) => (b.id === booking.id ? updated : b)));
    void updateBookingInCloud(updated);
  };

  const saveResource = (r: Resource) => {
    if (r.type === 'room') {
      setRooms((prev) => prev.map((x) => (x.id === r.id ? r : x)));
    } else {
      setEquipment((prev) => prev.map((x) => (x.id === r.id ? r : x)));
    }
    void upsertResourceToCloud(r);
  };

  const saveAsset = (a: Asset) => {
    setAssets((prev) => {
      const exists = prev.some((x) => x.id === a.id);
      return exists ? prev.map((x) => (x.id === a.id ? a : x)) : [...prev, a];
    });
    void upsertAssetToCloud(a);
  };

  const deleteAsset = (assetId: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== assetId));
    void deleteAssetFromCloud(assetId);
  };

  const applyBulkAssetAction = async (
    action: BulkAction,
    targets: Asset[],
  ): Promise<{ ok: number; failed: number }> => {
    let ok = 0;
    let failed = 0;
    for (const a of targets) {
      try {
        if (action.kind === 'delete') {
          const r = await deleteAssetFromCloud(a.id);
          if (r.ok) {
            setAssets((prev) => prev.filter((x) => x.id !== a.id));
            ok += 1;
          } else failed += 1;
        } else {
          let updated: Asset = a;
          if (action.kind === 'lock') updated = { ...a, lockedReason: action.reason };
          else if (action.kind === 'unlock') updated = { ...a, lockedReason: undefined };
          else if (action.kind === 'status') updated = { ...a, status: action.status };
          const r = await upsertAssetToCloud(updated);
          if (r.ok) {
            setAssets((prev) => prev.map((x) => (x.id === a.id ? updated : x)));
            ok += 1;
          } else failed += 1;
        }
      } catch {
        failed += 1;
      }
    }
    return { ok, failed };
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
    { id: 'returns' as View, label: 'Pemulangan', icon: PackageCheck },
    ...(isAdmin
      ? [
          { id: 'admin' as View, label: 'Pentadbir', icon: Shield },
          { id: 'loans' as View, label: 'Pinjaman ICT', icon: PackageCheck },
          { id: 'reports' as View, label: 'Laporan', icon: FileText },
          { id: 'settings' as View, label: 'Tetapan', icon: Settings },
        ]
      : []),
  ];

  const initials = useMemo(
    () => (profile?.name ?? 'AD').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase(),
    [profile?.name],
  );

  const myBookingsCount = useMemo(
    () => (profile ? bookings.filter((b) => b.userId === profile.id && b.status !== 'cancelled').length : 0),
    [bookings, profile],
  );

  // Mobile bottom-nav items: 5 essentials reachable with thumb.
  // Admin items live inside the drawer (hamburger).
  const bottomNavItems = [
    { id: 'dashboard' as View, label: 'Utama',     icon: LayoutDashboard },
    { id: 'bookings'  as View, label: 'Tempahan',  icon: CalendarDays },
    { id: 'rooms'     as View, label: 'Bilik',     icon: DoorOpen },
    { id: 'equipment' as View, label: 'ICT',       icon: Laptop },
    { id: 'portfolio' as View, label: 'Profil',    icon: UserCircle2 },
  ];

  const closeSidebar = () => setIsSidebarOpen(false);

  if (!profileLoaded) return null;

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {!profile && <OnboardingModal onComplete={(p) => setProfile(p)} />}

      {/* Mobile drawer backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSidebar}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar — drawer on mobile, fixed-width on desktop */}
      <aside
        className={`app-sidebar fixed md:static inset-y-0 left-0 z-40 w-72 md:w-[280px] shrink-0
          flex flex-col text-white transform transition-transform duration-300 ease-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          bg-gradient-to-b from-blue-700 via-blue-800 to-indigo-900 shadow-2xl md:shadow-none`}
      >
        {/* Brand header */}
        <div className="p-5 border-b border-white/10 flex items-start gap-3">
          <div className="w-10 h-10 bg-white/15 backdrop-blur ring-1 ring-white/20 rounded-xl flex items-center justify-center shrink-0">
            <CalendarDays className="text-white w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h1 className="text-[9px] font-bold uppercase tracking-[0.18em] text-blue-200 leading-tight">SK Bandar Tawau</h1>
            <p className="text-[13px] font-bold text-white leading-snug mt-1">
              Sistem Tempahan Bilik Khas & Peralatan ICT
            </p>
          </div>
          <button
            onClick={closeSidebar}
            className="md:hidden p-1.5 -mr-1 -mt-0.5 text-white/70 hover:text-white"
            title="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-hide">
          {navItems.map((item) => {
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveView(item.id); closeSidebar(); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
                  active
                    ? 'bg-white text-blue-700 shadow-md shadow-blue-900/30 font-bold'
                    : 'text-blue-50/90 hover:bg-white/10 hover:text-white'
                }`}
              >
                <item.icon className={`w-5 h-5 shrink-0 ${active ? 'text-blue-700' : 'text-blue-200'}`} />
                <span className="font-semibold text-sm flex-1 text-left">{item.label}</span>
                {item.id === 'portfolio' && myBookingsCount > 0 && (
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                    active ? 'bg-blue-100 text-blue-700' : 'bg-white/20 text-white'
                  }`}>
                    {myBookingsCount}
                  </span>
                )}
              </button>
            );
          })}

          <div className="mt-5 px-3">
            <p className="text-[10px] uppercase tracking-widest text-blue-200/70 font-bold mb-2">Pengurusan</p>
            <button
              onClick={() => { openBookingModal(); closeSidebar(); }}
              className="w-full bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 text-white px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
            >
              <Plus size={14} /> Tempahan Baru
            </button>
          </div>
        </nav>

        {/* Footer profile chip */}
        <div className="p-3 bg-black/15 border-t border-white/10">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setActiveView('portfolio'); closeSidebar(); }}
              className="flex-1 flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-left min-w-0"
              title="Lihat portfolio saya"
            >
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.name} referrerPolicy="no-referrer" className="w-9 h-9 rounded-full object-cover ring-2 ring-white/30 shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-white text-blue-700 flex items-center justify-center text-xs font-black ring-2 ring-white/30 shrink-0">
                  {initials}
                </div>
              )}
              <div className="overflow-hidden flex-1">
                <p className="text-xs font-bold text-white truncate">{profile?.name ?? 'Tetamu'}</p>
                <p className="text-[10px] text-blue-200/80 truncate">
                  {profile ? (ROLE_LABELS[profile.role] ?? profile.role) : 'Belum ditetapkan'}
                  {isSupabaseEnabled && <span className="ml-1.5 text-emerald-300">●</span>}
                </p>
              </div>
            </button>
            {profile && (
              <button
                onClick={switchProfile}
                className="p-2 rounded-lg text-blue-200/80 hover:bg-white/10 hover:text-rose-300 transition-colors shrink-0"
                title="Tukar profil"
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
        </div>
      </aside>

      <main className="app-main flex-1 flex flex-col relative overflow-hidden min-w-0">
        {/* Header — vibrant blue on mobile (matches Hadir@SKBT), white on desktop */}
        <header className="app-header z-10 shrink-0 bg-gradient-to-r from-blue-600 to-indigo-700 md:bg-white md:bg-none border-b border-blue-800/20 md:border-slate-200 shadow-sm">
          <div className="flex items-center justify-between px-4 md:px-8 h-14 md:h-16 gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 -ml-2 text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Menu"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-sm md:text-xs font-bold md:uppercase tracking-tight md:tracking-widest text-white md:text-slate-400 flex-1 truncate">
              {navItems.find((n) => n.id === activeView)?.label ?? 'TEMPAH'}
            </h2>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-4 mr-2">
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
                className="bg-white md:bg-blue-600 text-blue-700 md:text-white px-3 md:px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 md:gap-2 hover:bg-blue-50 md:hover:bg-blue-700 transition-all shadow-sm md:shadow-md md:shadow-blue-500/20 active:scale-95"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Tempahan Baru</span>
                <span className="sm:hidden">Baru</span>
              </button>
            </div>
          </div>
        </header>

        <div className="app-content flex-1 overflow-y-auto scrollbar-hide p-4 md:p-8 pb-24 md:pb-8 bg-slate-50">
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
                  onEditProfile={() => setShowEditProfileModal(true)}
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
                  isAdmin={isAdmin}
                  onCancel={cancelBooking}
                  onReturn={(booking) => {
                    const asset = assets.find((a) => a.id === booking.resourceId) ?? null;
                    setReturningLoan({ booking, asset });
                  }}
                />
              )}
              {activeView === 'rooms' && (
                <ResourceManagementView
                  resources={rooms}
                  title="Bilik Khas"
                  type="room"
                  onAction={(id) => openBookingModal({ resourceId: id, resourceType: 'room' })}
                  isAdmin={isAdmin}
                  onEdit={(r) => setEditingResource(r)}
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
                  isAdmin={isAdmin}
                  onEdit={(r) => setEditingResource(r)}
                  onBulkLoan={() => setShowBulkLoanModal(true)}
                />
              )}
              {activeView === 'returns' && (
                <MyLoansView
                  profile={profile}
                  bookings={bookings}
                  assets={assets}
                  equipment={equipment}
                  onReturn={(booking) => {
                    const asset = assets.find((a) => a.id === booking.resourceId) ?? null;
                    setReturningLoan({ booking, asset });
                  }}
                  onNewLoan={() => setActiveView('equipment')}
                />
              )}
              {activeView === 'admin' && isAdmin && (
                <AdminView
                  rooms={rooms}
                  equipment={equipment}
                  localBookings={bookings}
                />
              )}
              {activeView === 'reports' && isAdmin && (
                <ReportsView
                  rooms={rooms}
                  equipment={equipment}
                  localBookings={bookings}
                />
              )}
              {activeView === 'loans' && isAdmin && (
                <ActiveLoansView
                  rooms={rooms}
                  equipment={equipment}
                  localBookings={bookings}
                  localAssets={assets}
                  onMarkReturn={(booking, asset) => setReturningLoan({ booking, asset })}
                />
              )}
              {activeView === 'loans' && !isAdmin && (
                <div className="max-w-lg mx-auto bg-white rounded-3xl border border-rose-200 p-12 text-center shadow-sm">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                    <PackageCheck size={32} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">Akses Terhad</h2>
                  <p className="text-sm text-slate-500 mt-2">
                    Hanya Pentadbir boleh memproses pemulangan ICT.
                  </p>
                </div>
              )}
              {activeView === 'reports' && !isAdmin && (
                <div className="max-w-lg mx-auto bg-white rounded-3xl border border-rose-200 p-12 text-center shadow-sm">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                    <FileText size={32} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">Akses Terhad</h2>
                  <p className="text-sm text-slate-500 mt-2">
                    Laporan rumusan sistem hanya boleh diakses oleh Pentadbir.
                  </p>
                </div>
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
              {activeView === 'settings' && isAdmin && (
                <SettingsView
                  profile={profile}
                  onReset={() => {
                    if (confirm('Padamkan SEMUA data tempatan termasuk profil?')) {
                      localStore.resetAll();
                      window.location.reload();
                    }
                  }}
                  onSaveProfile={(p) => setProfile(p)}
                  onSwitchProfile={switchProfile}
                />
              )}
              {activeView === 'settings' && !isAdmin && (
                <div className="max-w-lg mx-auto bg-white rounded-3xl border border-rose-200 p-12 text-center shadow-sm">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                    <Settings size={32} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">Akses Terhad</h2>
                  <p className="text-sm text-slate-500 mt-2">
                    Tetapan sistem hanya boleh diakses oleh Pentadbir.
                    Untuk edit profil anda, sila pergi ke <strong className="text-blue-600">Portfolio Saya</strong>.
                  </p>
                  <button
                    onClick={() => setActiveView('portfolio')}
                    className="mt-6 bg-blue-600 text-white px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all"
                  >
                    Pergi ke Portfolio Saya
                  </button>
                </div>
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
        isAdmin={isAdmin}
        onClose={() => setShowAssetList(false)}
        onPick={(asset) => {
          setShowAssetList(false);
          setLoanFromQr(false);
          setLoanAsset(asset);
        }}
        onAdd={() => setShowAddAssetModal(true)}
        onShowQR={(asset) => setQrAsset(asset)}
        onBulkLoan={() => {
          setShowAssetList(false);
          setShowBulkLoanModal(true);
        }}
        onLockAsset={(asset) => setLockingAsset(asset)}
        onEditAsset={(asset) => setEditingAsset(asset)}
        onBulkActions={() => {
          setShowAssetList(false);
          setShowBulkAssetActions(true);
        }}
      />

      <AddAssetModal
        open={showAddAssetModal}
        initialResourceId={selectedResourceId}
        equipment={equipment}
        onClose={() => setShowAddAssetModal(false)}
        onSubmit={saveAsset}
      />

      {profile && (
        <EditProfileModal
          open={showEditProfileModal}
          profile={profile}
          isAdmin={isAdmin}
          onClose={() => setShowEditProfileModal(false)}
          onSave={(p) => setProfile(p)}
        />
      )}

      <EditResourceModal
        open={editingResource !== null}
        resource={editingResource}
        onClose={() => setEditingResource(null)}
        onSave={saveResource}
      />

      <LoanModal
        open={loanAsset !== null}
        asset={loanAsset}
        category={loanAsset ? equipment.find((e) => e.id === loanAsset.resourceId) ?? null : null}
        profile={profile}
        fromQr={loanFromQr}
        onClose={() => {
          setLoanAsset(null);
          setLoanFromQr(false);
        }}
        onSubmit={submitLoan}
      />

      <BulkLoanModal
        open={showBulkLoanModal}
        assets={assets}
        equipment={equipment}
        profile={profile}
        onClose={() => setShowBulkLoanModal(false)}
        onSubmit={submitBulkLoan}
      />

      <QRCodeModal
        open={qrAsset !== null}
        asset={qrAsset}
        category={qrAsset ? equipment.find((e) => e.id === qrAsset.resourceId) ?? null : null}
        onClose={() => setQrAsset(null)}
      />

      <LockAssetModal
        open={lockingAsset !== null}
        asset={lockingAsset}
        onClose={() => setLockingAsset(null)}
        onSave={saveAsset}
      />

      <EditAssetModal
        open={editingAsset !== null}
        asset={editingAsset}
        equipment={equipment}
        onClose={() => setEditingAsset(null)}
        onSave={saveAsset}
        onDelete={deleteAsset}
      />

      <BulkAssetActionsModal
        open={showBulkAssetActions}
        resourceId={selectedResourceId}
        assets={assets}
        equipment={equipment}
        onClose={() => setShowBulkAssetActions(false)}
        onApply={applyBulkAssetAction}
      />

      <ReturnLoanModal
        open={returningLoan !== null}
        booking={returningLoan?.booking ?? null}
        asset={returningLoan?.asset ?? null}
        category={returningLoan?.asset
          ? equipment.find((e) => e.id === returningLoan.asset!.resourceId) ?? null
          : null}
        admin={profile}
        onClose={() => setReturningLoan(null)}
        onConfirm={(b, notes) => {
          markLoanReturned(b, notes);
          setReturningLoan(null);
        }}
      />

      <PWAUpdatePrompt />

      {/* Mobile bottom navigation — only visible < md */}
      {profile && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.08)] safe-area-bottom">
          <div className="grid grid-cols-5">
            {bottomNavItems.map((item) => {
              const active = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors ${
                    active ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <div className={`relative ${active ? 'scale-110' : ''} transition-transform`}>
                    <item.icon size={20} />
                    {active && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-600 rounded-full" />
                    )}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wide ${active ? 'text-blue-600' : ''}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
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
