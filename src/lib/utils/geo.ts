import { Patient, GeocodingResult } from '@/types';

// ==================== ORS KEY HELPER ====================
export function getOrsKey(settingsKey?: string | null): string {
  // Priority: user's own key → shared env key → empty
  return settingsKey?.trim() || process.env.NEXT_PUBLIC_ORS_API_KEY?.trim() || '';
}

// ==================== GEOCODING (Nominatim / OpenStreetMap) ====================
async function nominatimSearch(query: string): Promise<GeocodingResult | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=3&countrycodes=fr&addressdetails=1`;
  try {
    const resp = await fetch(url, {
      headers: { 'Accept-Language': 'fr', 'User-Agent': 'VisitesDomicile/1.0' },
    });
    const data = await resp.json();
    if (data && data.length > 0) {
      // Prefer results with highest importance
      const best = data.sort((a: {importance: number}, b: {importance: number}) => b.importance - a.importance)[0];
      return { lat: parseFloat(best.lat), lng: parseFloat(best.lon), display_name: best.display_name };
    }
  } catch (e) {
    console.error('Geocoding error:', e);
  }
  return null;
}

export async function geocodeAdresse(adresse: string, codePostal: string, ville: string): Promise<GeocodingResult | null> {
  // Try multiple query formats, from most to least specific
  const queries = [
    // Full address
    `${adresse}, ${codePostal} ${ville}, France`,
    // Without code postal
    `${adresse}, ${ville}, France`,
    // Structured search
    `${adresse} ${ville} ${codePostal} France`,
    // Just street + city
    `${adresse}, ${ville}`,
    // City + postcode fallback
    `${codePostal} ${ville}, France`,
  ].filter((q) => q.trim().length > 5);

  for (const query of queries) {
    // Small delay to respect Nominatim rate limit (1 req/sec)
    await new Promise((r) => setTimeout(r, 300));
    const result = await nominatimSearch(query);
    if (result) return result;
  }
  return null;
}

// Geocode using French gov API (most accurate for France)
async function geocodeGouv(adresse: string): Promise<GeocodingResult | null> {
  try {
    const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(adresse)}&limit=1`;
    const res = await fetch(url);
    const data = await res.json();
    const f = data.features?.[0];
    if (f) return { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0], display_name: f.properties.label };
  } catch { /* ignore */ }
  return null;
}

// Geocode a free-form full address string (for depart page)
export async function geocodeFullAdresse(fullAdresse: string): Promise<GeocodingResult | null> {
  // 1. French gov API first (best for France)
  const gouv = await geocodeGouv(fullAdresse);
  if (gouv) return gouv;
  // 2. Nominatim fallback
  for (const query of [`${fullAdresse}, France`, fullAdresse]) {
    await new Promise((r) => setTimeout(r, 300));
    const result = await nominatimSearch(query);
    if (result) return result;
  }
  return null;
}

// ==================== ROUTING (OpenRouteService) ====================
export async function calculerItineraire(
  points: Array<{ lat: number; lng: number }>,
  apiKey: string
): Promise<{ distance_km: number; duree_min: number; geometry: GeoJSON.LineString } | null> {
  if (!apiKey || points.length < 2) return null;
  const coordinates = points.map((p) => [p.lng, p.lat]);
  try {
    const resp = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ coordinates }),
    });
    if (!resp.ok) throw new Error(`ORS error: ${resp.status}`);
    const data = await resp.json();
    const summary = data.features[0].properties.summary;
    return {
      distance_km: Math.round(summary.distance / 100) / 10,
      duree_min: Math.round(summary.duration / 60),
      geometry: data.features[0].geometry,
    };
  } catch (e) {
    console.error('Routing error:', e);
    return null;
  }
}

// ==================== DISTANCE à vol d'oiseau (fallback) ====================
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

// ==================== SEGMENT ORS (entre 2 points) ====================
export async function calculerSegment(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  apiKey: string
): Promise<{ distance_km: number; duree_min: number } | null> {
  if (!apiKey) return null;
  try {
    const resp = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
      method: 'POST',
      headers: { 'Authorization': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ coordinates: [[from.lng, from.lat], [to.lng, to.lat]] }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const summary = data.features[0].properties.summary;
    return {
      distance_km: Math.round(summary.distance / 100) / 10,
      duree_min: Math.round(summary.duration / 60),
    };
  } catch { return null; }
}
