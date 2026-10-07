import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { Feature, FeatureCollection, GeoJsonObject, Geometry } from 'geojson';

export default function MapCanvas({ data, onClick, onSelect, small = false }: { data?: GeoJsonObject | null; onClick?: (longitude: number, latitude: number) => void; onSelect?: (entity: string, id: number) => void; small?: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.GeoJSON | null>(null);
  const click = useRef(onClick); click.current = onClick;
  const select = useRef(onSelect); select.current = onSelect;
  useEffect(() => {
    if (!container.current) return;
    const instance = L.map(container.current, { scrollWheelZoom: !small, zoomControl: true }).setView([25, 20], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(instance);
    instance.on('click', event => click.current?.(Number(event.latlng.lng.toFixed(7)), Number(event.latlng.lat.toFixed(7))));
    map.current = instance;
    const observer = new ResizeObserver(() => instance.invalidateSize()); observer.observe(container.current);
    return () => { observer.disconnect(); instance.remove(); map.current = null; };
  }, [small]);
  useEffect(() => {
    const instance = map.current; if (!instance) return;
    if (layer.current) instance.removeLayer(layer.current);
    if (!data) return;
    try {
      layer.current = L.geoJSON(data, {
        style: feature => ({ color: feature?.properties?.entity === 'assets' ? '#b07938' : '#168c7c', weight: 3, fillOpacity: .15 }),
        pointToLayer: (feature, point) => L.circleMarker(point, { radius: small ? 8 : 7, fillColor: feature?.properties?.entity === 'assets' ? '#b07938' : '#148977', color: '#ffffff', weight: 2, fillOpacity: 1 }),
        onEachFeature: (feature, item) => {
          if (!feature.properties?.name) return;
          const content = document.createElement('div');
          const name = document.createElement('strong'); name.textContent = feature.properties.name; content.appendChild(name);
          const subtitle = document.createElement('p'); subtitle.textContent = `${feature.properties.entity || ''} · ${feature.properties.code || ''}`; content.appendChild(subtitle);
          if (select.current && feature.properties.id) { const button = document.createElement('button'); button.className = 'map-detail-button'; button.textContent = 'View record →'; button.onclick = () => select.current?.(feature.properties.entity, Number(feature.properties.id)); content.appendChild(button); }
          item.bindPopup(content);
        },
      }).addTo(instance);
      const bounds = layer.current.getBounds(); if (bounds.isValid()) instance.fitBounds(bounds, { padding: [small ? 26 : 50, small ? 26 : 50], maxZoom: 15, animate: false });
    } catch { /* Invalid in-progress geometry is validated by the editor before submission. */ }
  }, [data, small]);
  return <div ref={container} className={`map-canvas ${small ? 'map-small' : ''}`} aria-label={onClick ? 'Interactive location editor. Use the coordinate fields as a keyboard alternative.' : 'Map of your department records'}/>;
}

export function geometryCollection(geometry: unknown): FeatureCollection | null {
  if (!geometry || typeof geometry !== 'object' || !('type' in geometry)) return null;
  return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: geometry as Geometry } as Feature] };
}
