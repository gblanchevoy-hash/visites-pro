'use client';
import { useRouter } from 'next/navigation';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { AlertTriangle, X, CreditCard, Clock } from 'lucide-react';
import { useState } from 'react';

export default function SubscriptionBanner() {
  const { sub, loading } = useSubscription();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  if (loading || !sub || dismissed) return null;

  // Abonnement expiré → bannière critique
  if (sub.isExpired) {
    return (
      <div style={{ background:'#FEF2F2', borderBottom:'1px solid #FECACA', padding:'12px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <AlertTriangle style={{ width:'18px', height:'18px', color:'#DC2626', flexShrink:0 }} />
          <p style={{ fontSize:'14px', color:'#DC2626', fontWeight:500 }}>
            Votre période d'essai est terminée. Abonnez-vous pour continuer à utiliser Itilib.
          </p>
        </div>
        <button onClick={() => router.push('/pricing')}
          style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 16px', background:'#DC2626', color:'#fff', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:600, cursor:'pointer', flexShrink:0 }}>
          <CreditCard style={{ width:'14px', height:'14px' }} />
          Choisir un forfait
        </button>
      </div>
    );
  }

  // Essai se terminant dans moins de 7 jours → avertissement
  if (sub.isTrialing && sub.daysLeft !== null && sub.daysLeft <= 7) {
    return (
      <div style={{ background:'#FFFBEB', borderBottom:'1px solid #FDE68A', padding:'10px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <Clock style={{ width:'16px', height:'16px', color:'#D97706', flexShrink:0 }} />
          <p style={{ fontSize:'13px', color:'#92400E' }}>
            <strong>Essai gratuit :</strong> il vous reste <strong>{sub.daysLeft} jour{sub.daysLeft > 1 ? 's' : ''}</strong>. Abonnez-vous pour ne pas perdre l'accès.
          </p>
        </div>
        <div style={{ display:'flex', gap:'8px', flexShrink:0 }}>
          <button onClick={() => router.push('/pricing')}
            style={{ padding:'6px 14px', background:'#D97706', color:'#fff', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>
            S'abonner
          </button>
          <button onClick={() => setDismissed(true)}
            style={{ padding:'6px', background:'none', border:'none', cursor:'pointer', color:'#D97706', display:'flex', alignItems:'center' }}>
            <X style={{ width:'14px', height:'14px' }} />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
