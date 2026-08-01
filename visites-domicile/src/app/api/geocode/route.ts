import { NextRequest, NextResponse } from 'next/server';
import { searchHere } from './here';
import { checkRateLimit } from '@/lib/server/rateLimiter';
import { logApiCall } from '@/lib/server/apiLogger';

// In-memory cache for recently geocoded addresses (process-lifetime cache)
const cache = new Map<string, { result: unknown; expires: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min

function getCached(key: string) {
  const entry = cache.get(key);
  if (entry && entry.expires > Date.now()) return entry.result;
  if (entry) cache.delete(key);
  return null;
}
function setCached(key: string, result: unknown) {
  cache.set(key, { result, expires: Date.now() + CACHE_TTL_MS });
  if (cache.size > 2000) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
}

interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
  postcode?: string;
  city?: string;
  street?: string;
  housenumber?: string;
}

async function searchGouv(q: string): Promise<GeocodeResult[]> {
  try {
    const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=6&autocomplete=1`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.features ?? []).map((f: {
      properties: { label: string; postcode?: string; city?: string; street?: string; housenumber?: string };
      geometry: { coordinates: [number, number] };
    }) => ({
      label: f.properties.label,
      lng: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
      postcode: f.properties.postcode,
      city: f.properties.city,
      street: f.properties.street,
      housenumber: f.properties.housenumber,
    }));
  } catch { return []; }
}

async function searchNominatim(q: string): Promise<GeocodeResult[]> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q + ', France')}&limit=4&countrycodes=fr&addressdetails=1&accept-language=fr`;
    const res = await fetch(url, { headers: { 'User-Agent': 'VisitesDomicile/1.0 (backend)' } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((f: {
      display_name: string; lon: string; lat: string;
      address: { postcode?: string; city?: string; town?: string; village?: string; road?: string; house_number?: string };
    }) => {
      const a = f.address;
      return {
        label: f.display_name.split(',').slice(0, 3).join(',').trim(),
        lng: parseFloat(f.lon),
        lat: parseFloat(f.lat),
        postcode: a.postcode,
        city: a.city ?? a.town ?? a.village ?? '',
        street: a.road,
        housenumber: a.house_number,
      };
    });
  } catch { return []; }
}

// Future: Google Places — only activated when GOOGLE_PLACES_API_KEY env var is set server-side.
async function searchGooglePlaces(): Promise<GeocodeResult[] | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return null;
  return null;
}

// Photon (Komoot) — basé sur OpenStreetMap, excellent pour la France, gratuit sans clé
async function searchPhoton(q: string): Promise<GeocodeResult[]> {
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lang=fr&bbox=-5.1,41.3,9.6,51.1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Itilib/1.0' } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.features ?? []).map((f: {
      properties: {
        name?: string; street?: string; housenumber?: string;
        postcode?: string; city?: string; country?: string; type?: string;
      };
      geometry: { coordinates: [number, number] };
    }) => {
      const p = f.properties;
      const parts = [
        p.housenumber && p.street ? `${p.housenumber} ${p.street}` : (p.street ?? p.name ?? ''),
        p.postcode && p.city ? `${p.postcode} ${p.city}` : (p.city ?? ''),
      ].filter(Boolean);
      return {
        label: parts.join(', ') || p.name || '',
        lng: f.geometry.coordinates[0],
        lat: f.geometry.coordinates[1],
        postcode: p.postcode,
        city: p.city,
        street: p.street,
        housenumber: p.housenumber,
      };
    }).filter((r: GeocodeResult) => r.label.length > 0);
  } catch { return []; }
}

export async function GET(req: NextRequest) {
  const started = Date.now();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() ?? '';
  const userId = searchParams.get('uid') ?? undefined;

  if (q.length < 3) {
    return NextResponse.json({ results: [] });
  }

  const rateKey = userId ?? req.headers.get('x-forwarded-for') ?? 'anonymous';
  const { allowed } = checkRateLimit(`geocode:${rateKey}`, 60, 60_000);
  if (!allowed) {
    logApiCall({ api: 'geocode', userId, success: false, durationMs: Date.now() - started, error: 'rate_limited' });
    return NextResponse.json({ error: 'Trop de requêtes, réessayez dans un instant.' }, { status: 429 });
  }

  const cacheKey = q.toLowerCase();
  const cached = getCached(cacheKey);
  if (cached) {
    logApiCall({ api: 'geocode', userId, success: true, durationMs: Date.now() - started });
    return NextResponse.json({ results: cached, cached: true });
  }

  try {
    const google = await searchGooglePlaces();
    if (google) {
      setCached(cacheKey, google);
      logApiCall({ api: 'geocode', userId, success: true, durationMs: Date.now() - started });
      return NextResponse.json({ results: google, source: 'google' });
    }

    // HERE en priorité 1 — geocoding avec trafic et données réelles
    const here = await searchHere(q);
    if (here && here.length > 0) {
      setCached(cacheKey, here);
      logApiCall({ api: 'geocode', userId, success: true, durationMs: Date.now() - started });
      return NextResponse.json({ results: here, source: 'here' });
    }

    // Photon en priorité 2 (meilleure couverture POI/bâtiments/résidences)
    const photon = await searchPhoton(q);
    if (photon.length > 0) {
      // Compléter avec data.gouv pour les adresses précises françaises
      const gouv = await searchGouv(q);
      const combined = [...gouv, ...photon.filter(p =>
        !gouv.some(g => Math.abs(g.lat - p.lat) < 0.001 && Math.abs(g.lng - p.lng) < 0.001)
      )].slice(0, 6);
      setCached(cacheKey, combined);
      logApiCall({ api: 'geocode', userId, success: true, durationMs: Date.now() - started });
      return NextResponse.json({ results: combined, source: 'photon+gouv' });
    }

    let results = await searchGouv(q);
    let source = 'gouv';

    if (results.length < 2) {
      const nom = await searchNominatim(q);
      results = [...results, ...nom].slice(0, 6);
      source = results.length > 0 ? 'gouv+nominatim' : 'nominatim';
    }

    setCached(cacheKey, results);
    logApiCall({ api: 'geocode', userId, success: true, durationMs: Date.now() - started });
    return NextResponse.json({ results, source });
  } catch (err) {
    logApiCall({ api: 'geocode', userId, success: false, durationMs: Date.now() - started, error: String(err) });
    return NextResponse.json({ error: 'Erreur de géocodage' }, { status: 500 });
  }
}
