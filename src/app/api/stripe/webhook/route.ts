export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const Stripe = (await import('stripe')).default;
    const { createClient } = await import('@supabase/supabase-js');

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2026-06-24.dahlia' });
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await req.text();
    const sig  = req.headers.get('stripe-signature')!;

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const getMeta = (obj: { metadata?: Record<string, string> | null }) =>
      (obj.metadata ?? {}) as Record<string, string>;

    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as { metadata?: Record<string,string>|null; customer?: string|null; subscription?: string|null };
        const { user_id, plan } = getMeta(s);
        if (user_id && plan) {
          await supabase.from('subscriptions').upsert({
            user_id, plan, statut: 'actif',
            stripe_customer_id: s.customer ?? null,
            stripe_subscription_id: s.subscription ?? null,
            date_debut: new Date().toISOString(),
            date_fin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          }, { onConflict: 'user_id' });
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const sub = event.data.object as { metadata?: Record<string,string>|null; status: string; customer: string|null; id: string; start_date: number };
        const { user_id, plan } = getMeta(sub);
        if (user_id) {
          const statut = ['active','trialing'].includes(sub.status) ? 'actif'
            : sub.status === 'canceled' ? 'annule' : 'expire';
          await supabase.from('subscriptions').upsert({
            user_id, plan: plan ?? 'solo', statut,
            stripe_customer_id: sub.customer ?? null,
            stripe_subscription_id: sub.id,
            date_debut: new Date(sub.start_date * 1000).toISOString(),
          }, { onConflict: 'user_id' });
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as { metadata?: Record<string,string>|null };
        const { user_id } = getMeta(sub);
        if (user_id) {
          await supabase.from('subscriptions')
            .update({ statut: 'annule', date_fin: new Date().toISOString() })
            .eq('user_id', user_id);
        }
        break;
      }
    }
  } catch (err) {
    console.error('Webhook error:', err);
  }

  return NextResponse.json({ received: true });
}
