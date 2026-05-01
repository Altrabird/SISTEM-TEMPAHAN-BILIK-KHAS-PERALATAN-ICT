export type ResourceType = 'room' | 'equipment';

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
  capacity?: number; // For rooms
  quantity?: number; // For equipment
}

export interface Booking {
  id: string;
  resourceId: string;
  resourceType: ResourceType;
  userName: string;
  userId: string;
  date: string; // ISO date string (YYYY-MM-DD)
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  purpose: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: number;
}
