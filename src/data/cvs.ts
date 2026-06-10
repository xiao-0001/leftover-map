import type { Store, Chain } from '../types';

const SOURCES: Record<Chain, { url: string; color: string; label: string }> = {
  '7-11': {
    url: 'https://raw.githubusercontent.com/Minato1123/taiwan-cvs-map/main/src/assets/json/s_data.json',
    color: '#e74c3c',
    label: '7-ELEVEN',
  },
  family: {
    url: 'https://raw.githubusercontent.com/Minato1123/taiwan-cvs-map/main/src/assets/json/f_data.json',
    color: '#27ae60',
    label: 'FamilyMart',
  },
};

export const CHAIN_META = SOURCES;

interface RawStore {
  id: number | string;
  name: string;
  tel?: string;
  address?: string;
  lat: number;
  lng: number;
  city?: string;
  area?: string;
  road?: string;
  service?: string[];
}

export async function loadChain(chain: Chain): Promise<Store[]> {
  const src = SOURCES[chain];
  const res = await fetch(src.url);
  if (!res.ok) throw new Error(`${src.label}: HTTP ${res.status}`);
  const raw = (await res.json()) as RawStore[];
  return raw
    .filter((s) => s.lat && s.lng)
    .map((s) => ({
      id: `${chain}-${s.id}`,
      name: s.name,
      tel: s.tel,
      address: s.address || `${s.city ?? ''}${s.area ?? ''}${s.road ?? ''}`,
      lat: s.lat,
      lng: s.lng,
      city: s.city,
      area: s.area,
      road: s.road,
      service: s.service,
      chain,
    }));
}
