import { Resource, Asset, Achievement } from './types';

export const INITIAL_ROOMS: Resource[] = [
  { id: 'room-1', name: 'Makmal Komputer 1 (bawah)', type: 'room', capacity: 40 },
  { id: 'room-2', name: 'Makmal Komputer 2 (atas)', type: 'room', capacity: 40 },
  { id: 'room-3', name: 'Bilik Akses', type: 'room', capacity: 20 },
  { id: 'room-4', name: 'Bilik Panitia Bahasa', type: 'room', capacity: 15 },
  { id: 'room-5', name: 'Bilik Panitia Matematik', type: 'room', capacity: 15 },
  { id: 'room-6', name: 'Bengkel RBT 1', type: 'room', capacity: 30 },
  { id: 'room-7', name: 'Bengkel RBT 2', type: 'room', capacity: 30 },
  { id: 'room-8', name: 'Bilik Panitia Muzik', type: 'room', capacity: 25 },
  { id: 'room-9', name: 'Bilik Sains', type: 'room', capacity: 40 },
  { id: 'room-10', name: 'Bilik Gerakan SKBT', type: 'room', capacity: 50 },
];

export const INITIAL_EQUIPMENT: Resource[] = [
  { id: 'eq-1', name: 'PC', type: 'equipment', quantity: 20 },
  { id: 'eq-2', name: 'Laptop Murid', type: 'equipment', quantity: 21 },
  { id: 'eq-3', name: 'Laptop Guru Fasa 1', type: 'equipment', quantity: 7 },
  { id: 'eq-4', name: 'Laptop Guru Fasa 2', type: 'equipment', quantity: 6 },
  { id: 'eq-5', name: 'LCD', type: 'equipment', quantity: 10 },
  { id: 'eq-6', name: 'Pencetak', type: 'equipment', quantity: 5 },
];

export const INITIAL_ASSETS: Asset[] = [
  {
    id: 'ast-1',
    resourceId: 'eq-1',
    name: 'PC 01',
    serialNumber: 'SKBT-PC-2026-001',
    specifications: 'HP EliteDesk, Intel i5, 8GB RAM, 256GB SSD',
    imageUrl: 'https://images.unsplash.com/photo-1547082299-de196ea013d6?w=400&auto=format&fit=crop&q=60',
    status: 'available'
  },
  {
    id: 'ast-2',
    resourceId: 'eq-1',
    name: 'PC 02',
    serialNumber: 'SKBT-PC-2026-002',
    specifications: 'HP EliteDesk, Intel i5, 8GB RAM, 256GB SSD',
    imageUrl: 'https://images.unsplash.com/photo-1547082299-de196ea013d6?w=400&auto=format&fit=crop&q=60',
    status: 'available'
  },
  {
    id: 'ast-3',
    resourceId: 'eq-2',
    name: 'LAPTOP 01',
    serialNumber: 'SKBT-LP-2026-001',
    specifications: 'Dell Latitude, Intel i7, 16GB RAM, 512GB SSD',
    imageUrl: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&auto=format&fit=crop&q=60',
    status: 'available'
  },
];

export const STORAGE_KEYS = {
  ROOMS: 'skbt_rooms_2026',
  EQUIPMENT: 'skbt_equipment_2026',
  BOOKINGS: 'skbt_bookings_2026',
  ASSETS: 'skbt_assets_2026',
  PROFILE: 'skbt_profile_2026',
};

export const PURPOSE_PRESETS = [
  'PdPc',
  'Mesyuarat / Taklimat / Bengkel',
  'Ujian / Peperiksaan',
  'Pertandingan',
  'Kuiz',
  'Lain-lain',
];

export const ROLE_LABELS: Record<string, string> = {
  guru: 'Guru',
  admin: 'Pentadbir',
  pelajar: 'Pelajar',
  staf: 'Staf Sokongan',
};

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_booking',
    title: 'Langkah Pertama',
    description: 'Lengkapkan tempahan pertama anda.',
    icon: 'Sparkles',
    tier: 'bronze',
  },
  {
    id: 'five_bookings',
    title: 'Aktif Mingguan',
    description: '5 tempahan berjaya dicatatkan.',
    icon: 'Star',
    tier: 'bronze',
  },
  {
    id: 'ten_bookings',
    title: 'Pengguna Berdedikasi',
    description: '10 tempahan berjaya dicatatkan.',
    icon: 'Award',
    tier: 'silver',
  },
  {
    id: 'twenty_five_bookings',
    title: 'Tulang Belakang Sekolah',
    description: '25 tempahan berjaya dicatatkan.',
    icon: 'Medal',
    tier: 'silver',
  },
  {
    id: 'fifty_bookings',
    title: 'Legenda 2026',
    description: '50 tempahan berjaya dicatatkan.',
    icon: 'Trophy',
    tier: 'gold',
  },
  {
    id: 'early_bird',
    title: 'Burung Pagi',
    description: 'Tempahan sebelum 7:30 pagi.',
    icon: 'Sunrise',
    tier: 'bronze',
  },
  {
    id: 'night_owl',
    title: 'Burung Hantu',
    description: 'Tempahan selepas 5:00 petang.',
    icon: 'Moon',
    tier: 'bronze',
  },
  {
    id: 'streak_week',
    title: 'Konsisten 1 Minggu',
    description: 'Tempahan dalam 2 minggu berturut-turut.',
    icon: 'Flame',
    tier: 'silver',
  },
  {
    id: 'streak_month',
    title: 'Konsisten 1 Bulan',
    description: 'Tempahan dalam 4 minggu berturut-turut.',
    icon: 'Zap',
    tier: 'gold',
  },
  {
    id: 'room_explorer',
    title: 'Penjelajah Bilik',
    description: 'Guna 3 bilik berbeza.',
    icon: 'Compass',
    tier: 'silver',
  },
  {
    id: 'equipment_explorer',
    title: 'Pakar Peralatan',
    description: 'Guna 3 jenis peralatan ICT.',
    icon: 'Cpu',
    tier: 'silver',
  },
  {
    id: 'power_user',
    title: 'Pengguna Pro',
    description: 'Tempahan dalam 5 hari berbeza dalam 1 bulan.',
    icon: 'Rocket',
    tier: 'gold',
  },
  {
    id: 'pioneer',
    title: 'Perintis 2026',
    description: 'Antara pengguna terawal sistem ini.',
    icon: 'Crown',
    tier: 'platinum',
  },
];
