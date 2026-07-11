export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

const HERE_KEY = process.env.HERE_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const { from, to, departureTime } = await req.json();

    if (!HERE_KEY) return NextResponse.json({ error: 'HERE_API_KEY non configuré' }, { status: 500 });
    if (!from || !to) return NextResponse.json({ error: 'Points manquants' }, { status: 400 });

    const departure = departureTime
      ? `&departureTime=${encodeURIComponent(departureTime)}`
      : `&departureTime=${encodeURIComponent(new Date().toISOString())}`;

    const url = `https://router.hereapi.com/v8/routes?origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&transportMode=car&return=summary${departure}&apiKey=${HERE_KEY}`;

    const res = await fetch(url);
    if (!res.ok) {
      // Fallback gracieux si HERE échoue
      return NextResponse.json({ error: 'HERE indisponible', fallback: true }, { status: 502 });
    }

    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) return NextResponse.json({ error: 'Aucun itinéraire', fallback: true }, { status: 404 });

    const totalDist = route.sections.reduce((s: number, sec: {summary:{length:number}}) => s + sec.summary.length, 0);
    const totalDur  = route.sections.reduce((s: number, sec: {summary:{duration:number}}) => s + sec.summary.duration, 0);

    return NextResponse.json({
      distance_km: Math.round(totalDist / 100) / 10,
      duree_min: Math.round(totalDur / 60),
      with_traffic: true,
    });

  } catch (err) {
    return NextResponse.json({ error: String(err), fallback: true }, { status: 500 });
  }
}
