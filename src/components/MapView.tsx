import { useState, useEffect } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import CVSLayer from './CVSLayer';
import DormLayer from './DormLayer';
import StoreDetailPanel from './StoreDetailPanel';
import DormDetailPanel from './DormDetailPanel';
import LocateButton from './LocateButton';
import QRCodeBadge from './QRCodeBadge';
import AIChat from './AIChat';
import type { Store, Dorm } from '../types';
import { NYCU_CENTER } from '../data/dorms';

type Mode = 'cvs' | 'dorm';

interface Props {
  mode: Mode;
}

const TAIWAN_CENTER: [number, number] = [23.7, 121];

export default function MapView({ mode }: Props) {
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [selectedDorm, setSelectedDorm] = useState<Dorm | null>(null);
  const [dormItemsVersion, setDormItemsVersion] = useState(0);

  // Clear panels on mode switch so stale selections don't pop back when toggling.
  useEffect(() => {
    setSelectedStore(null);
    setSelectedDorm(null);
  }, [mode]);

  const isCvs = mode === 'cvs';
  const center = isCvs ? TAIWAN_CENTER : NYCU_CENTER;
  const zoom = isCvs ? 8 : 15;

  return (
    <div className="absolute inset-0">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        className="absolute inset-0 z-0"
        key={mode}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · Store data <a href="https://github.com/Minato1123/taiwan-cvs-map">taiwan-cvs-map</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {isCvs ? (
          <CVSLayer onSelect={setSelectedStore} />
        ) : (
          <DormLayer onSelect={setSelectedDorm} itemsVersion={dormItemsVersion} />
        )}
        <LocateButton />
      </MapContainer>

      <QRCodeBadge />
      <AIChat onReserved={() => setDormItemsVersion((v) => v + 1)} />

      {isCvs && selectedStore && (
        <StoreDetailPanel store={selectedStore} onClose={() => setSelectedStore(null)} />
      )}
      {!isCvs && selectedDorm && (
        <DormDetailPanel
          dorm={selectedDorm}
          onClose={() => setSelectedDorm(null)}
          onChange={() => setDormItemsVersion((v) => v + 1)}
        />
      )}
    </div>
  );
}
