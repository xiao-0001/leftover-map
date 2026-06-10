import { useRef, useState, useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { makeYouAreHereIcon } from '../lib/markers';
import { useI18n } from '../lib/useI18n';

export default function LocateButton() {
  const { t } = useI18n();
  const [locating, setLocating] = useState(false);
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, []);

  function locate() {
    if (!navigator.geolocation) {
      alert(t('locate.unsupported'));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.setView([latitude, longitude], 17);
        if (markerRef.current) markerRef.current.remove();
        markerRef.current = L.marker([latitude, longitude], { icon: makeYouAreHereIcon() })
          .addTo(map)
          .bindPopup(t('locate.popup'))
          .openPopup();
        setLocating(false);
      },
      (err) => {
        alert(err.code === err.PERMISSION_DENIED ? t('locate.denied') : t('locate.failed', { msg: err.message }));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <button
      onClick={locate}
      disabled={locating}
      className="absolute bottom-6 right-4 z-[1000] bg-white shadow-lg rounded-full w-12 h-12 flex items-center justify-center hover:bg-gray-50 disabled:opacity-60 text-xl"
      title={t('locate.title')}
      onMouseDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {locating ? '⏳' : '📍'}
    </button>
  );
}
