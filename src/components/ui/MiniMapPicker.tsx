'use client';
import { useEffect, useRef } from 'react';

interface Props {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}

export default function MiniMapPicker({ lat, lng, onChange }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<unknown>(null);
  const markerRef = useRef<unknown>(null);
  const mountedRef = useRef(true);

  // Init map once
  useEffect(() => {
    mountedRef.current = true;
    if (typeof window === 'undefined' || !mapRef.current) return;

    const init = async () => {
      try {
        const L = (await import('leaflet')).default;
        if (!mountedRef.current || !mapRef.current) return;

        delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        if (mapInstance.current) return;
        const map = L.map(mapRef.current, {
          center: [lat, lng], zoom: 16, zoomAnimation: false,
          attributionControl: false,
        });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

        const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          onChange(pos.lat, pos.lng);
        });

        mapInstance.current = map;
        markerRef.current = marker;
      } catch (e) {
        console.warn('MiniMap init error:', e);
      }
    };
    init();

    return () => {
      mountedRef.current = false;
      try {
        if (mapInstance.current) {
          (mapInstance.current as { remove: () => void }).remove();
          mapInstance.current = null;
        }
      } catch { /* ignore */ }
    };
  }, []);

  // Recenter marker + map when lat/lng change externally (e.g. new address selected)
  useEffect(() => {
    if (!mapInstance.current || !markerRef.current) return;
    try {
      const map = mapInstance.current as L.Map;
      const marker = markerRef.current as L.Marker;
      marker.setLatLng([lat, lng]);
      map.setView([lat, lng], map.getZoom());
    } catch { /* ignore */ }
  }, [lat, lng]);

  return (
    <div>
      <div ref={mapRef} className="w-full h-40 rounded-xl overflow-hidden border border-slate-200" style={{ zIndex: 0 }} />
      <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
        <span>📍</span> Glissez le repère pour ajuster la position exacte
      </p>
    </div>
  );
}
