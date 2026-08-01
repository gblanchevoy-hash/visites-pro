import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/stores/appStore';

export interface Subscription {
  plan: 'gratuit' | 'solo' | 'cabinet';
  statut: 'actif' | 'expire' | 'annule';
  date_fin: string | null;
  stripe_customer_id: string | null;
  daysLeft: number | null;
  isTrialing: boolean;
  isExpired: boolean;
  isActive: boolean;
}

export function useSubscription() {
  const { user } = useAppStore();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  // Garde-fou : évite de retenter l'appel (et surtout l'INSERT) à chaque re-rendu.
  // Sans ça, un simple rafraîchissement de session (fréquent, y compris juste en
  // revenant sur l'onglet) recréait un nouvel objet `user` et relançait la requête
  // en boucle, saturant la connexion et perturbant les autres appels (rendez-vous...).
  const attemptedForUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    if (attemptedForUserId.current === user.id) return; // déjà tenté pour cet utilisateur
    attemptedForUserId.current = user.id;

    supabase.from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (!data) {
          // Pas encore d'abonnement — créer un essai gratuit de 30 jours
          const dateDebut = new Date().toISOString();
          const dateFin = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          supabase.from('subscriptions').insert({
            user_id: user.id, plan: 'solo', statut: 'actif', date_debut: dateDebut, date_fin: dateFin,
          }).then(({ data: newSub, error: insertError }) => {
            if (insertError) {
              // On log discrètement sans bloquer l'utilisateur : l'app continue de
              // fonctionner avec l'essai gratuit calculé localement ci-dessous.
              console.warn('[useSubscription] Création abonnement essai impossible :', insertError.message);
            }
            if (newSub) setSub(buildSub(newSub));
          });
          setSub({
            plan: 'solo', statut: 'actif', date_fin: dateFin,
            stripe_customer_id: null, daysLeft: 30, isTrialing: true,
            isExpired: false, isActive: true,
          });
        } else {
          setSub(buildSub(data));
        }
        setLoading(false);
      });
  }, [user]);

  return { sub, loading };
}

function buildSub(data: Record<string, string | null>): Subscription {
  const dateFin = data.date_fin ? new Date(data.date_fin) : null;
  const now = new Date();
  const daysLeft = dateFin ? Math.ceil((dateFin.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const isExpired = data.statut === 'expire' || data.statut === 'annule' || (daysLeft !== null && daysLeft <= 0);
  const isTrialing = !data.stripe_subscription_id && data.statut === 'actif';
  const isActive = !isExpired && data.statut === 'actif';

  return {
    plan: (data.plan as Subscription['plan']) ?? 'solo',
    statut: (data.statut as Subscription['statut']) ?? 'actif',
    date_fin: data.date_fin ?? null,
    stripe_customer_id: data.stripe_customer_id ?? null,
    daysLeft,
    isTrialing,
    isExpired,
    isActive,
  };
}
