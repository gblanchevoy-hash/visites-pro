'use client';
import { useEffect, useRef } from 'react';
import { RendezVous } from '@/types';

const SEG_COLORS = ['#2563eb','#16a34a','#dc2626','#9333ea','#ea580c','#0891b2','#be185d','#ca8a04'];

interface Props {
  rdvs: RendezVous[];
  routeGeo: GeoJSON.LineString | null;
  depart?: { lat: number; lng: number };
  activeSegments: boolean[];
}

export default function TourneeMap({ rdvs, routeGeo, depart, activeSegments }: Props) {
  const mapRef      = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<unknown>(null);
  const layersRef   = useRef<unknown[]>([]);
  const mountedRef  = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (typeof window === 'undefined' || !mapRef.current) return;

    let map: unknown = null;

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
        map = L.map(mapRef.current, { center: [46.8, 2.3], zoom: 6, zoomAnimation: false });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap', maxZoom: 19,
        }).addTo(map as L.Map);
        mapInstance.current = map;
      } catch (e) {
        console.warn('Map init error:', e);
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
      } catch (e) {
        console.warn('Map cleanup error:', e);
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !mountedRef.current) return;

    const update = async () => {
      try {
        const L = (await import('leaflet')).default;
        if (!mapInstance.current || !mountedRef.current) return;
        const map = mapInstance.current as L.Map;

        layersRef.current.forEach(l => { try { (l as L.Layer).remove(); } catch {} });
        layersRef.current = [];
        const bounds: [number, number][] = [];

        if (depart) {
          const m = L.circleMarker([depart.lat, depart.lng], {
            radius: 11, fillColor: '#1e293b', color: '#fff', weight: 2.5, fillOpacity: 1,
          }).bindPopup('<b>🏠 Départ / Retour</b>').addTo(map);
          layersRef.current.push(m);
          bounds.push([depart.lat, depart.lng]);
        }

        rdvs.forEach((rdv, i) => {
          const lat = rdv.patient?.lat ?? rdv.lat;
          const lng = rdv.patient?.lng ?? rdv.lng;
          if (!lat || !lng) return;
          bounds.push([lat, lng]);
          const color = SEG_COLORS[i % SEG_COLORS.length];
          const icon = L.divIcon({
            html: `<div style="width:32px;height:32px;background:${color};border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:13px">${i+1}</div>`,
            className: '', iconAnchor: [16, 16],
          });
          const nom = rdv.patient ? `${rdv.patient.prenom ?? ''} ${rdv.patient.nom ?? ''}`.trim()
            : rdv.notes?.replace('[Occasionnel] ','').split(' · ')[0] ?? 'Passage';
          const m = L.marker([lat, lng], { icon })
            .bindPopup(`<div style="min-width:150px;font-family:inherit">
              <p style="font-weight:700;font-size:13px;margin-bottom:3px;color:#1e293b">${i+1}. ${nom}</p>
              <p style="font-size:12px;color:#64748b">${rdv.heure_debut.replace(':','h')} – ${rdv.heure_fin.replace(':','h')}</p>
              ${rdv.patient?.adresse ? `<p style="font-size:11px;color:#94a3b8;margin-top:2px">${rdv.patient.adresse}</p>` : ''}
            </div>`).addTo(map);
          layersRef.current.push(m);
        });

        if (routeGeo) {
          const allCoords: [number,number][] = routeGeo.coordinates.map(([lng, lat]) => [lat, lng]);
          const total = allCoords.length;
          const numSegs = Math.max(1, (depart ? rdvs.length + 1 : rdvs.length - 1));

          for (let s = 0; s < numSegs; s++) {
            if (activeSegments[s] === false) continue;
            const si = Math.floor((s / numSegs) * total);
            const ei = Math.floor(((s+1) / numSegs) * total);
            const segCoords = allCoords.slice(si, ei + 1);
            if (segCoords.length < 2) continue;
            const color = SEG_COLORS[s % SEG_COLORS.length];
            const poly = L.polyline(segCoords, {
              color, weight: 5, opacity: 0.85,
              dashArray: s === numSegs - 1 && depart ? '8 6' : undefined,
            }).addTo(map);
            layersRef.current.push(poly);
          }
        }

        if (bounds.length > 0 && mountedRef.current) {
          try {
            map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [40, 40] });
          } catch (e) {
            console.warn('fitBounds error:', e);
          }
        }
      } catch (e) {
        console.warn('Map update error:', e);
      }
    };

    update();
  }, [rdvs, routeGeo, depart, activeSegments]);

  return (
    <div ref={mapRef}
      className="w-full h-full min-h-[400px] rounded-2xl overflow-hidden border border-slate-200"
      style={{ zIndex: 0 }} />
  );
}
