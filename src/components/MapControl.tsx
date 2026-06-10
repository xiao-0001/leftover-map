import { useEffect, useRef, type ReactNode } from 'react';
import L from 'leaflet';

interface Props {
  children: ReactNode;
  className?: string;
}

// Wraps an in-map overlay so clicks/scrolls don't reach the underlying Leaflet map
// (otherwise clicking a button drags the map or double-clicking it zooms).
export default function MapControl({ children, className }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    L.DomEvent.disableClickPropagation(el);
    L.DomEvent.disableScrollPropagation(el);
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
