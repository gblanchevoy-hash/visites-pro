import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/server/rateLimiter';
import { logApiCall } from '@/lib/server/apiLogger';

const cache = new Map<string, { result: unknown; expires: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

function cacheKeyFor(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  return `${from.lat.toFixed(5)},${from.lng.toFixed(5)}->${to.lat.toFixed(5)},${to.lng.toFixed(5)}`;
}

export async function POST(req: NextRequest) {
  const started = Date.now();
  let userId: string | undefined;

  try {
    const body = await req.json();
    const from: { lat: number; lng: number } = body.from;
    const to: { lat: number; lng: number } = body.to;
    userId = body.userId;
    const userOrsKey: string | undefined = body.orsKey;

    if (!from || !to) {
      return NextResponse.json({ error: 'Points from/to requis' }, { status: 400 });
    }

    const rateKey = userId ?? req.headers.get('x-forwarded-for') ?? 'anonymous';
    const { allowed } = checkRateLimit(`segment:${rateKey}`, 60, 60_000);
    if (!allowed) {
      logApiCall({ api: 'segment', userId, success: false, durationMs: Date.now() - started, error: 'rate_limited' });
      return NextResponse.json({ error: 'Trop de requêtes, réessayez dans un instant.' }, { status: 429 });
    }

    const orsKey = (userOrsKey?.trim()) || process.env.ORS_API_KEY?.trim();
    if (!orsKey) {
      return NextResponse.json({ error: "Aucune clé OpenRouteService disponible côté serveur." }, { status: 503 });
    }

    const key = cacheKeyFor(from, to);
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) {
      logApiCall({ api: 'segment', userId, success: true, durationMs: Date.now() - started });
      return NextResponse.json({ ...(cached.result as object), cached: true });
    }

    const orsRes = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
      method: 'POST',
      headers: { Authorization: orsKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ coordinates: [[from.lng, from.lat], [to.lng, to.lat]], instructions: true, instructions_format: 'text' }),
    });

    if (!orsRes.ok) {
      const errText = await orsRes.text();
      logApiCall({ api: 'segment', userId, success: false, durationMs: Date.now() - started, error: errText.slice(0, 200) });
      return NextResponse.json({ error: 'Erreur OpenRouteService' }, { status: 502 });
    }

    const data = await orsRes.json();
    const feature = data.features?.[0];
    const summary = feature?.properties?.summary;
    if (!summary) {
      return NextResponse.json({ error: 'Trajet introuvable' }, { status: 404 });
    }

    // Détecter les autoroutes dans les étapes
    let hasMotorway = false;
    const segments = feature.properties?.segments ?? [];
    for (const seg of segments) {
      for (const step of (seg.steps ?? [])) {
        const name: string = step.name ?? '';
        const type: number = step.type ?? -1;
        if (type === 3 || /^A\d+/i.test(name) || name.toLowerCase().includes('autoroute') || name.toLowerCase().includes('motorway')) {
          hasMotorway = true;
          break;
        }
      }
      if (hasMotorway) break;
    }

    const result = {
      distance_km: Math.round(summary.distance / 100) / 10,
      duree_min: Math.round(summary.duration / 60),
      has_motorway: hasMotorway,
    };

    cache.set(key, { result, expires: Date.now() + CACHE_TTL_MS });
    if (cache.size > 1000) {
      const firstKey = cache.keys().next().value;
      if (firstKey) cache.delete(firstKey);
    }

    logApiCall({ api: 'segment', userId, success: true, durationMs: Date.now() - started });
    return NextResponse.json(result);
  } catch (err) {
    logApiCall({ api: 'segment', userId, success: false, durationMs: Date.now() - started, error: String(err) });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
