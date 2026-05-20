export type ResourceType = 'room' | 'equipment';

export type UserRole = 'guru' | 'admin' | 'pelajar' | 'staf';

export interface Profile {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  department?: string;
  avatarUrl?: string;
  bio?: string;
  joinedAt: number;
  lastActiveAt: number;
}

export interface Asset {
  id: string;
  resourceId: string;
  name: string;
  serialNumber: string;
  specifications: string;
  imageUrl?: string;
  status: 'available' | 'borrowed' | 'maintenance';
  lockedReason?: string;
  /** Admin-only visibility toggle. When true, regular users cannot see
   *  this unit in pickers / cards / scan results. Admin always sees it
   *  with a "hidden" indicator. Independent of `lockedReason` (which
   *  shows the unit but blocks booking with a reason). */
  hidden?: boolean;
  /** Admin-seeded access info (laptop password, login PIN, app key, etc.)
   *  surfaced to the borrower while the unit is on loan and in the new-loan
   *  Telegram message. Pengguna lain tidak nampak — admin sahaja yang boleh
   *  edit, dan hanya peminjam aktif yang lihat di kad pinjaman mereka. */
  accessNote?: string;
}

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  description?: string;
  imageUrl?: string;
  capacity?: number;
  quantity?: number;
  lockedReason?: string;
  /** Admin-only visibility toggle. See Asset.hidden for semantics. */
  hidden?: boolean;
}

export interface Booking {
  id: string;
  resourceId: string;
  resourceType: ResourceType;
  userName: string;
  userId: string;
  date: string;          // start date (YYYY-MM-DD)
  returnDate?: string;   // end date for multi-day equipment loans (YYYY-MM-DD)
  startTime: string;     // HH:mm
  endTime: string;       // HH:mm
  purpose: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'returned';
  createdAt: number;
  // Return logging (set when admin marks an ICT loan as returned)
  returnedAt?: number;       // timestamp of actual return
  returnedById?: string;     // admin profile id
  returnedByName?: string;   // admin name (denormalised)
  returnNotes?: string;      // condition / damage notes
  // Cancel logging
  cancelledAt?: number;
  cancelledById?: string;
  cancelledByName?: string;
  cancelReason?: string;
}

export type AchievementId =
  | 'first_booking'
  | 'five_bookings'
  | 'ten_bookings'
  | 'twenty_five_bookings'
  | 'fifty_bookings'
  | 'early_bird'
  | 'night_owl'
  | 'streak_week'
  | 'streak_month'
  | 'room_explorer'
  | 'equipment_explorer'
  | 'power_user'
  | 'pioneer';

export interface Achievement {
  id: AchievementId;
  title: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export interface PortfolioStats {
  totalBookings: number;
  thisMonthBookings: number;
  thisWeekBookings: number;
  upcomingBookings: number;
  uniqueRooms: number;
  uniqueEquipment: number;
  favoriteResource: { name: string; count: number } | null;
  totalHours: number;
  currentStreakWeeks: number;
  unlockedAchievements: AchievementId[];
  usageByMonth: { month: string; count: number }[];
}
