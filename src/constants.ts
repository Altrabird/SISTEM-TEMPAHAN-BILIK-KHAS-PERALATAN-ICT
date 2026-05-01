import { Resource, Asset } from './types';

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
};
