import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/server/rateLimiter';
import { logApiCall } from '@/lib/server/apiLogger';

// Server-side cache for identical route requests (same waypoints)
const cache = new Map<string, { result: unknown; expires: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min — routes can change if traffic data updates

function cacheKeyFor(points: { lat: number; lng: number }[]) {
  return points.map(p => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join('|');
}

export async function POST(req: NextRequest) {
  const started = Date.now();
  let userId: string | undefined;

  try {
    const body = await req.json();
    const points: { lat: number; lng: number }[] = body.points;
    userId = body.userId;
    // Each user may supply their own ORS key (stored encrypted in Supabase);
    // otherwise we fall back to the shared server key.
    const userOrsKey: string | undefined = body.orsKey;

    if (!Array.isArray(points) || points.length < 2) {
      return NextResponse.json({ error: 'Au moins 2 points requis' }, { status: 400 });
    }

    const rateKey = userId ?? req.headers.get('x-forwarded-for') ?? 'anonymous';
    const { allowed } = checkRateLimit(`route:${rateKey}`, 30, 60_000);
    if (!allowed) {
      logApiCall({ api: 'route', userId, success: false, durationMs: Date.now() - started, error: 'rate_limited' });
      return NextResponse.json({ error: 'Trop de requêtes, réessayez dans un instant.' }, { status: 429 });
    }

    const orsKey = (userOrsKey?.trim()) || process.env.ORS_API_KEY?.trim();
    if (!orsKey) {
      return NextResponse.json({ error: "Aucune clé OpenRouteService disponible côté serveur." }, { status: 503 });
    }

    const key = cacheKeyFor(points);
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) {
      logApiCall({ api: 'route', userId, success: true, durationMs: Date.now() - started });
      return NextResponse.json({ ...(cached.result as object), cached: true });
    }

    const coordinates = points.map(p => [p.lng, p.lat]);
    const orsRes = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
      method: 'POST',
      headers: { Authorization: orsKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ coordinates, instructions: true, instructions_format: "text" }),
    });

    if (!orsRes.ok) {
      const errText = await orsRes.text();
      logApiCall({ api: 'route', userId, success: false, durationMs: Date.now() - started, error: errText.slice(0, 200) });
      return NextResponse.json({ error: 'Erreur OpenRouteService' }, { status: 502 });
    }

    const data = await orsRes.json();
    const feature = data.features?.[0];
    if (!feature) {
      return NextResponse.json({ error: 'Itinéraire introuvable' }, { status: 404 });
    }

    // Détecter les autoroutes dans les segments
    const segments = feature.properties?.segments ?? [];
    let hasMotorway = false;
    for (const seg of segments) {
      for (const step of (seg.steps ?? [])) {
        const name: string = step.name ?? '';
        const type: number = step.type ?? -1;
        // ORS type 3 = motorway, ou nom commençant par A suivi d'un chiffre
        if (type === 3 || /^A\d+/i.test(name) || name.toLowerCase().includes('autoroute') || name.toLowerCase().includes('motorway')) {
          hasMotorway = true;
          break;
        }
      }
      if (hasMotorway) break;
    }

    const result = {
      geometry: feature.geometry,
      distance_km: Math.round((feature.properties.summary.distance / 100)) / 10,
      duree_min: Math.round(feature.properties.summary.duration / 60),
      has_motorway: hasMotorway,
    };

    cache.set(key, { result, expires: Date.now() + CACHE_TTL_MS });
    if (cache.size > 500) {
      const firstKey = cache.keys().next().value;
      if (firstKey) cache.delete(firstKey);
    }

    logApiCall({ api: 'route', userId, success: true, durationMs: Date.now() - started });
    return NextResponse.json(result);
  } catch (err) {
    logApiCall({ api: 'route', userId, success: false, durationMs: Date.now() - started, error: String(err) });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
