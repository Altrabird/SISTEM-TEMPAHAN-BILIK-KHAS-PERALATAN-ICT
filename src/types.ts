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
}

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  description?: string;
  capacity?: number;
  quantity?: number;
}

export interface Booking {
  id: string;
  resourceId: string;
  resourceType: ResourceType;
  userName: string;
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: number;
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
