import { GeocodingResult } from '@/types';

// ==================== GEOCODING — via backend /api/geocode ====================
// No API keys here. The browser calls our own backend, which holds the keys.

interface BackendGeocodeResult {
  label: string;
  lat: number;
  lng: number;
  postcode?: string;
  city?: string;
  street?: string;
  housenumber?: string;
}

export async function searchAdresses(query: string, userId?: string): Promise<BackendGeocodeResult[]> {
  if (query.trim().length < 3) return [];
  try {
    const params = new URLSearchParams({ q: query });
    if (userId) params.set('uid', userId);
    const res = await fetch(`/api/geocode?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.results ?? [];
  } catch (e) {
    console.error('Geocode search error:', e);
    return [];
  }
}

// Geocode a free-form full address string — used for "depart" page single-shot geocoding
export async function geocodeFullAdresse(fullAdresse: string, userId?: string): Promise<GeocodingResult | null> {
  const results = await searchAdresses(fullAdresse, userId);
  if (results.length === 0) return null;
  const best = results[0];
  return { lat: best.lat, lng: best.lng, display_name: best.label };
}

// ==================== ROUTING — via backend /api/route and /api/segment ====================
// ORS API key never leaves the server. We pass optional userOrsKey (the user's
// own key from Supabase settings) so per-user keys still work if configured.

export async function calculerItineraire(
  points: Array<{ lat: number; lng: number }>,
  userOrsKey?: string,
  userId?: string
): Promise<{ distance_km: number; duree_min: number; geometry: GeoJSON.LineString; has_motorway?: boolean } | null> {
  if (points.length < 2) return null;
  try {
    const resp = await fetch('/api/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points, orsKey: userOrsKey, userId }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return { distance_km: data.distance_km, duree_min: data.duree_min, geometry: data.geometry, has_motorway: data.has_motorway ?? false };
  } catch (e) {
    console.error('Routing error:', e);
    return null;
  }
}

export async function calculerSegment(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  userOrsKey?: string,
  userId?: string
): Promise<{ distance_km: number; duree_min: number; has_motorway?: boolean } | null> {
  try {
    const resp = await fetch('/api/segment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, orsKey: userOrsKey, userId }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return { distance_km: data.distance_km, duree_min: data.duree_min, has_motorway: data.has_motorway ?? false };
  } catch { return null; }
}

// ==================== DISTANCE à vol d'oiseau (fallback instantané, pas d'appel réseau) ====================
export function distanceHaversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ==================== OPTIMISATION (algorithme du plus proche voisin) ====================
export function optimiserTournee<T extends { lat?: number; lng?: number }>(
  points: T[],
  depart: { lat: number; lng: number }
): T[] {
  if (points.length <= 2) return points;
  const restants = [...points];
  const optimises: T[] = [];
  let current = depart;
  while (restants.length > 0) {
    let minDist = Infinity;
    let minIdx = 0;
    restants.forEach((p, i) => {
      if (p.lat && p.lng) {
        const d = distanceHaversine(current.lat, current.lng, p.lat, p.lng);
        if (d < minDist) { minDist = d; minIdx = i; }
      }
    });
    const next = restants.splice(minIdx, 1)[0];
    optimises.push(next);
    if (next.lat && next.lng) current = { lat: next.lat, lng: next.lng };
  }
  return optimises;
}

// ==================== FORMATAGE ====================
export function formatDuree(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return `${h}h${m.toString().padStart(2, '0')}`;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export function calculateFraisKm(km: number, bareme: number): number {
  return Math.round(km * bareme * 100) / 100;
}
