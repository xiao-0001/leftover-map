import { useEffect, useMemo, useState } from 'react';
import { Marker, useMap } from 'react-leaflet';
import { dorms, NYCU_CENTER, NTHU_CENTER } from '../data/dorms';
import { listItems } from '../lib/api';
import { makeDormIcon } from '../lib/markers';
import MapControl from './MapControl';
import { useI18n } from '../lib/useI18n';
import type { Dorm, LeftoverItem } from '../types';

interface Props {
  onSelect: (d: Dorm) => void;
  itemsVersion: number;
}

export default function DormLayer({ onSelect, itemsVersion }: Props) {
  const { t } = useI18n();
  const [allItems, setAllItems] = useState<LeftoverItem[]>([]);
  const [school, setSchool] = useState<'NYCU' | 'NTHU' | 'all'>('all');
  const map = useMap();

  const countsByDorm = useMemo(() => {
    const m: Record<string, number> = {};
    for (const it of allItems) {
      if (it.claimed) continue;
      m[it.dorm_id] = (m[it.dorm_id] ?? 0) + 1;
    }
    return m;
  }, [allItems]);

  useEffect(() => {
    let cancelled = false;
    listItems()
      .then((items) => {
        if (!cancelled) setAllItems(items);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [itemsVersion]);

  useEffect(() => {
    const tm = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(tm);
  }, [map]);

  const filtered = school === 'all' ? dorms : dorms.filter((d) => d.school === school);

  function focusSchool(target: 'NYCU' | 'NTHU' | 'all') {
    setSchool(target);
    if (target === 'NYCU') map.setView(NYCU_CENTER, 16);
    else if (target === 'NTHU') map.setView(NTHU_CENTER, 16);
    else map.setView([24.79, 120.997], 14);
  }

  const totalListed = Object.values(countsByDorm).reduce((a, b) => a + b, 0);

  return (
    <>
      {filtered.map((d) => (
        <Marker
          key={d.id}
          position={[d.lat, d.lng]}
          icon={makeDormIcon(d.school, (countsByDorm[d.id] ?? 0) > 0)}
          eventHandlers={{ click: () => onSelect(d) }}
        />
      ))}

      <MapControl className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-lg px-3 py-2 text-sm space-y-2 min-w-[220px]">
        <div className="font-semibold text-gray-800">{t('dorm.zone')}</div>
        <div className="flex flex-col gap-1">
          {(['all', 'NYCU', 'NTHU'] as const).map((s) => (
            <button
              key={s}
              onClick={() => focusSchool(s)}
              className={`text-left px-2 py-1 rounded transition ${
                school === s ? 'bg-emerald-600 text-white' : 'hover:bg-gray-100'
              }`}
            >
              {s === 'all' ? t('dorm.zone.all') : s === 'NYCU' ? t('dorm.zone.nycu') : t('dorm.zone.nthu')}
            </button>
          ))}
        </div>
        <div className="text-xs text-gray-500 border-t pt-1">
          {t('dorm.posted')}: <b>{totalListed}</b> {t('dorm.items')}
        </div>
      </MapControl>
    </>
  );
}
