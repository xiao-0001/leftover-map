export type Chain = '7-11' | 'family';

export interface Store {
  id: string | number;
  name: string;
  tel?: string;
  address: string;
  lat: number;
  lng: number;
  city?: string;
  area?: string;
  road?: string;
  service?: string[];
  chain: Chain;
}

export interface Dorm {
  id: string;
  school: 'NYCU' | 'NTHU';
  name: string;
  lat: number;
  lng: number;
}

export interface LeftoverItem {
  id: number;
  scope?: 'dorm';
  dorm_id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  image_data_url?: string | null;
  expires_at: string;
  contact: string;
  claimed: 0 | 1;
  claimer_name?: string | null;
  claimer_contact?: string | null;
  claimed_at?: string | null;
  created_at: string;
}

// Note: the CVS mock-item type lives next to its generator in lib/mockCvsFood.ts.
