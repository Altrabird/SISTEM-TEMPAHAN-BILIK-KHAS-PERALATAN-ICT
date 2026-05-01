import { Booking, AchievementId, PortfolioStats, Resource } from '../types';

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = x.getDate() - day + (day === 0 ? -6 : 1);
  x.setDate(diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function computePortfolioStats(
  bookings: Booking[],
  rooms: Resource[],
  equipment: Resource[],
  userId: string,
  joinedAt: number,
): PortfolioStats {
  const mine = bookings.filter((b) => b.userId === userId && b.status !== 'cancelled');
  const now = new Date();
  const todayISO = now.toISOString().split('T')[0];

  const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const thisMonthKey = monthKey(now);
  const thisMonthBookings = mine.filter((b) => b.date.startsWith(thisMonthKey)).length;

  const weekStart = startOfWeek(now);
  const thisWeekBookings = mine.filter((b) => new Date(b.date) >= weekStart).length;

  const upcomingBookings = mine.filter((b) => b.date >= todayISO).length;

  const allResources = [...rooms, ...equipment];
  const resourceCounts = new Map<string, number>();
  mine.forEach((b) => {
    resourceCounts.set(b.resourceId, (resourceCounts.get(b.resourceId) ?? 0) + 1);
  });

  let favorite: { name: string; count: number } | null = null;
  resourceCounts.forEach((count, id) => {
    if (!favorite || count > favorite.count) {
      const r = allResources.find((res) => res.id === id);
      favorite = { name: r?.name ?? id, count };
    }
  });

  const uniqueRoomIds = new Set(mine.filter((b) => b.resourceType === 'room').map((b) => b.resourceId));
  const uniqueEqIds = new Set(mine.filter((b) => b.resourceType === 'equipment').map((b) => b.resourceId));

  const totalHours = mine.reduce((sum, b) => {
    const [sh, sm] = b.startTime.split(':').map(Number);
    const [eh, em] = b.endTime.split(':').map(Number);
    return sum + Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
  }, 0);

  const weekKeys = new Set<string>();
  mine.forEach((b) => {
    const sow = startOfWeek(new Date(b.date));
    weekKeys.add(sow.toISOString().split('T')[0]);
  });
  let currentStreakWeeks = 0;
  {
    let cursor = startOfWeek(now);
    while (weekKeys.has(cursor.toISOString().split('T')[0])) {
      currentStreakWeeks += 1;
      cursor.setDate(cursor.getDate() - 7);
    }
  }

  const usageByMonth: { month: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    const label = d.toLocaleDateString('ms-MY', { month: 'short' });
    const count = mine.filter((b) => b.date.startsWith(key)).length;
    usageByMonth.push({ month: label, count });
  }

  const unlockedAchievements = evaluateAchievements({
    bookings: mine,
    uniqueRooms: uniqueRoomIds.size,
    uniqueEquipment: uniqueEqIds.size,
    streak: currentStreakWeeks,
    joinedAt,
  });

  return {
    totalBookings: mine.length,
    thisMonthBookings,
    thisWeekBookings,
    upcomingBookings,
    uniqueRooms: uniqueRoomIds.size,
    uniqueEquipment: uniqueEqIds.size,
    favoriteResource: favorite,
    totalHours: Math.round(totalHours * 10) / 10,
    currentStreakWeeks,
    unlockedAchievements,
    usageByMonth,
  };
}

function evaluateAchievements(input: {
  bookings: Booking[];
  uniqueRooms: number;
  uniqueEquipment: number;
  streak: number;
  joinedAt: number;
}): AchievementId[] {
  const unlocked: AchievementId[] = [];
  const { bookings, uniqueRooms, uniqueEquipment, streak, joinedAt } = input;
  const total = bookings.length;

  if (total >= 1) unlocked.push('first_booking');
  if (total >= 5) unlocked.push('five_bookings');
  if (total >= 10) unlocked.push('ten_bookings');
  if (total >= 25) unlocked.push('twenty_five_bookings');
  if (total >= 50) unlocked.push('fifty_bookings');

  if (bookings.some((b) => b.startTime <= '07:30')) unlocked.push('early_bird');
  if (bookings.some((b) => b.startTime >= '17:00')) unlocked.push('night_owl');

  if (streak >= 2) unlocked.push('streak_week');
  if (streak >= 4) unlocked.push('streak_month');

  if (uniqueRooms >= 3) unlocked.push('room_explorer');
  if (uniqueEquipment >= 3) unlocked.push('equipment_explorer');

  const monthDays = new Map<string, Set<string>>();
  bookings.forEach((b) => {
    const d = new Date(b.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!monthDays.has(key)) monthDays.set(key, new Set());
    monthDays.get(key)!.add(b.date);
  });
  const hasFiveDayMonth = Array.from(monthDays.values()).some((set) => set.size >= 5);
  if (hasFiveDayMonth) unlocked.push('power_user');

  const PIONEER_CUTOFF = new Date('2026-07-01').getTime();
  if (joinedAt < PIONEER_CUTOFF) unlocked.push('pioneer');

  return unlocked;
}
