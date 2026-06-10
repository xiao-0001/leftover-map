import { useEffect, useState, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import { loadChain, CHAIN_META } from '../data/cvs';
import MapControl from './MapControl';
import { useI18n } from '../lib/useI18n';
import type { Store, Chain } from '../types';

interface Props {
  onSelect: (s: Store) => void;
}

function makeCircleHtml(color: string, radius: number) {
  return `<div style="width:${radius * 2}px;height:${radius * 2}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.5);cursor:pointer"></div>`;
}

export default function CVSLayer({ onSelect }: Props) {
  const map = useMap();
  const { t } = useI18n();
  const [stores711, setStores711] = useState<Store[]>([]);
  const [storesFm, setStoresFm] = useState<Store[]>([]);
  const [show711, setShow711] = useState(true);
  const [showFm, setShowFm] = useState(true);
  // Store i18n KEY (not literal string) so language switches re-translate live.
  const [statusKey, setStatusKey] = useState<string>('cvs.loading.data');
  const [statusError, setStatusError] = useState<string>('');

  const clustersRef = useRef<{ '7-11'?: L.MarkerClusterGroup; family?: L.MarkerClusterGroup }>({});
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setStatusKey('cvs.loading.711');
        const s711 = await loadChain('7-11');
        if (cancelled) return;
        setStores711(s711);
        setStatusKey('cvs.loading.fm');
        const fm = await loadChain('family');
        if (cancelled) return;
        setStoresFm(fm);
        setStatusKey('');
      } catch (e) {
        if (!cancelled) {
          setStatusError((e as Error).message);
          setStatusKey('');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const status = statusError || (statusKey ? t(statusKey) : '');

  useEffect(() => {
    if (stores711.length === 0) return;
    const cluster = buildCluster(stores711, '7-11');
    clustersRef.current['7-11'] = cluster;
    if (show711) map.addLayer(cluster);
    return () => {
      map.removeLayer(cluster);
      clustersRef.current['7-11'] = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stores711, map]);

  useEffect(() => {
    if (storesFm.length === 0) return;
    const cluster = buildCluster(storesFm, 'family');
    clustersRef.current.family = cluster;
    if (showFm) map.addLayer(cluster);
    return () => {
      map.removeLayer(cluster);
      clustersRef.current.family = undefined;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storesFm, map]);

  useEffect(() => {
    const c = clustersRef.current['7-11'];
    if (!c) return;
    if (show711) map.addLayer(c);
    else map.removeLayer(c);
  }, [show711, map]);

  useEffect(() => {
    const c = clustersRef.current.family;
    if (!c) return;
    if (showFm) map.addLayer(c);
    else map.removeLayer(c);
  }, [showFm, map]);

  useEffect(() => {
    const tm = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(tm);
  }, [map]);

  function buildCluster(list: Store[], chain: Chain): L.MarkerClusterGroup {
    const meta = CHAIN_META[chain];
    const cluster = L.markerClusterGroup({
      chunkedLoading: true,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      zoomToBoundsOnClick: true,
      maxClusterRadius: 50,
      disableClusteringAtZoom: 17,
      iconCreateFunction: (c) =>
        L.divIcon({
          className: '',
          html: `<div class="cluster-icon" style="width:38px;height:38px;background:${meta.color}">${c.getChildCount()}</div>`,
          iconSize: [38, 38],
        }),
    });
    const icon = L.divIcon({
      className: '',
      html: makeCircleHtml(meta.color, 7),
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
    for (const s of list) {
      const m = L.marker([s.lat, s.lng], { icon });
      m.on('click', () => onSelectRef.current(s));
      cluster.addLayer(m);
    }
    return cluster;
  }

  return (
    <MapControl className="absolute top-4 left-4 z-[1000] bg-white rounded-lg shadow-lg px-3 py-2 text-sm space-y-1 min-w-[220px]">
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={show711} onChange={(e) => setShow711(e.target.checked)} />
        <span className="w-3 h-3 rounded-full" style={{ background: '#e74c3c' }} />
        <span>{t('cvs.legend.711')}</span>
        <span className="ml-auto text-xs text-gray-500">{stores711.length.toLocaleString()}</span>
      </label>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={showFm} onChange={(e) => setShowFm(e.target.checked)} />
        <span className="w-3 h-3 rounded-full" style={{ background: '#27ae60' }} />
        <span>{t('cvs.legend.fm')}</span>
        <span className="ml-auto text-xs text-gray-500">{storesFm.length.toLocaleString()}</span>
      </label>
      {status ? (
        <div className="text-xs text-gray-600 border-t pt-1 mt-1">
          <span className="inline-block w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mr-1 align-middle" />
          {status}
        </div>
      ) : (
        <div className="text-xs text-gray-500 border-t pt-1 mt-1">{t('cvs.tip')}</div>
      )}
    </MapControl>
  );
}
