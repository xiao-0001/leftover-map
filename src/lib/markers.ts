import L from 'leaflet';

export function makeDot(color: string, radius = 6): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="width:${radius * 2}px;height:${radius * 2}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>`,
    iconSize: [radius * 2, radius * 2],
    iconAnchor: [radius, radius],
  });
}

export function makeDormIcon(school: 'NYCU' | 'NTHU', hasItems: boolean): L.DivIcon {
  const color = school === 'NYCU' ? '#1d4ed8' : '#7c2d12';
  const badge = hasItems
    ? `<div style="position:absolute;top:-6px;right:-6px;background:#f97316;color:white;border-radius:9999px;width:16px;height:16px;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;border:2px solid white">!</div>`
    : '';
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:30px;height:30px;background:${color};border-radius:6px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:700">
        ${school === 'NYCU' ? '交' : '清'}${badge}
      </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

export function makeYouAreHereIcon(): L.DivIcon {
  return L.divIcon({
    className: 'you-are-here',
    html: `<div style="width:18px;height:18px;background:#9b59b6;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}
