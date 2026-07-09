export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_placeholder', { apiVersion: '2026-06-24.dahlia' });

const PRICE_IDS: Record<string, string> = {
  solo:    'price_1TrGlVAOVWcgpAAos01PLe48',
  cabinet: 'price_1TrGopAOVWcgpAAofnR7P0Hs',
};

export async function POST(req: NextRequest) {
  try {
    const { plan, userId, email } = await req.json();
    if (!plan || !userId || !email) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
    }
    const priceId = PRICE_IDS[plan];
    if (!priceId) return NextResponse.json({ error: 'Plan invalide' }, { status: 400 });

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 30,
        metadata: { user_id: userId, plan },
      },
      metadata: { user_id: userId, plan },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?subscription=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      locale: 'fr',
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return NextResponse.json({ error: 'Erreur Stripe' }, { status: 500 });
  }
}
