'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/stores/appStore';
import { Users, TrendingUp, CreditCard, Calendar, RefreshCw, LogOut } from 'lucide-react';

// ── Votre email admin — seul vous pouvez accéder à cette page ──
const ADMIN_EMAIL = 'g.blanchevoy@gmail.com';

interface Stats {
  totalUsers: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  soloActif: number;
  soloEssai: number;
  soloExpire: number;
  cabinetContrats: number; // nombre de forfaits cabinet payants
  cabinetComptes: number;  // nombre total de comptes liés dans des cabinets
  cabinetDetail: Array<{ customer_id: string; comptes_lies: number; date_debut: string }>;
  mrr: number; // Monthly Recurring Revenue
  recentUsers: Array<{ userId: string; email: string; created_at: string; plan: string; statut: string; stripe_customer_id: string | null; date_fin: string | null }>;
  conversionRate: number; // % d'essais convertis en payants
}

export default function AdminPage() {
  const router = useRouter();
  const { user } = useAppStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [giftModal, setGiftModal] = useState<{ userId: string; pseudo: string; hasStripe: boolean; stripeId?: string } | null>(null);
  const [giftMonths, setGiftMonths] = useState(3);
  const [giftLoading, setGiftLoading] = useState(false);
  const [allSubs, setAllSubs] = useState<Array<{ user_id: string; plan: string; statut: string; stripe_customer_id: string | null; date_fin: string | null }>>([]);

  useEffect(() => {
    if (!user) return;
    if (user.email !== ADMIN_EMAIL) {
      router.replace('/dashboard');
      return;
    }
    loadStats();
  }, [user]);

  const loadStats = async () => {
    setLoading(true);
    try {
      // 1. Tous les utilisateurs
      const { data: allUsers } = await supabase
        .from('user_settings')
        .select('user_id, pseudonyme, created_at');

      // 2. Tous les abonnements
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('user_id, plan, statut, stripe_customer_id, date_debut, date_fin');
      setAllSubs(subs ?? []);

      // 3. Tous les auth users (email)
      const { data: authUsers } = await supabase
        .rpc('get_users_admin')
        .limit(1000);
      // Si la fonction RPC n'existe pas, on utilise ce qu'on a

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const totalUsers = allUsers?.length ?? 0;
      const newUsersThisWeek = allUsers?.filter(u =>
        new Date(u.created_at) > weekAgo).length ?? 0;
      const newUsersThisMonth = allUsers?.filter(u =>
        new Date(u.created_at) > monthAgo).length ?? 0;

      // Abonnements Solo
      const soloActif = subs?.filter(s => s.plan === 'solo' && s.statut === 'actif' && s.stripe_customer_id).length ?? 0;
      const soloEssai = subs?.filter(s => s.plan === 'solo' && s.statut === 'actif' && !s.stripe_customer_id).length ?? 0;
      const soloExpire = subs?.filter(s => s.plan === 'solo' && (s.statut === 'expire' || s.statut === 'annule')).length ?? 0;

      // Abonnements Cabinet
      const cabinetSubs = subs?.filter(s => s.plan === 'cabinet' && s.statut === 'actif') ?? [];
      const cabinetContrats = cabinetSubs.length;

      // Pour l'instant, comptes liés = contrats × 1 (on implémentera la liaison plus tard)
      // Quand la table cabinet_membres existera, on fera la jointure
      const cabinetComptes = cabinetContrats; // à améliorer quand cabinet_membres sera créé
      const cabinetDetail = cabinetSubs.map(s => ({
        customer_id: s.stripe_customer_id ?? 'Essai',
        comptes_lies: 1, // à améliorer
        date_debut: s.date_debut ?? '',
      }));

      // MRR = Solo payants × 7.90 + Cabinet × 19.90
      const mrr = soloActif * 7.90 + cabinetContrats * 19.90;

      // Taux de conversion (essais → payants)
      const totalEssais = soloEssai + totalUsers;
      const totalPayants = soloActif + cabinetContrats;
      const conversionRate = totalEssais > 0 ? Math.round((totalPayants / totalEssais) * 100) : 0;

      // Derniers inscrits
      const recentUsers = (allUsers ?? [])
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10)
        .map(u => {
          const sub = subs?.find(s => s.user_id === u.user_id);
          return {
            userId: u.user_id,
            email: u.pseudonyme ?? u.user_id,
            created_at: u.created_at,
            plan: sub?.plan ?? 'solo',
            statut: sub?.statut ?? 'actif',
            stripe_customer_id: sub?.stripe_customer_id ?? null,
            date_fin: sub?.date_fin ?? null,
          };
        });

      setStats({
        totalUsers, newUsersThisWeek, newUsersThisMonth,
        soloActif, soloEssai, soloExpire,
        cabinetContrats, cabinetComptes, cabinetDetail,
        mrr, recentUsers, conversionRate,
      });
    } catch (err) {
      console.error('Admin stats error:', err);
    }
    setLoading(false);
    setLastRefresh(new Date());
  };

  const handleGiftMonths = async () => {
    if (!giftModal) return;
    setGiftLoading(true);
    const newDateFin = new Date();
    // Si date_fin existante dans le futur, on ajoute à partir de là
    const sub = allSubs.find(s => s.user_id === giftModal.userId);
    const existingFin = sub?.date_fin ? new Date(sub.date_fin) : new Date();
    const base = existingFin > new Date() ? existingFin : new Date();
    base.setMonth(base.getMonth() + giftMonths);

    const { error } = await supabase.from('subscriptions').upsert({
      user_id: giftModal.userId,
      plan: sub?.plan ?? 'solo',
      statut: 'actif',
      date_fin: base.toISOString(),
    }, { onConflict: 'user_id' });

    if (error) {
      alert('Erreur : ' + error.message);
    } else {
      alert(`✅ ${giftMonths} mois offerts à ${giftModal.pseudo} jusqu'au ${base.toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })}`);
      setGiftModal(null);
      loadStats();
    }
    setGiftLoading(false);
  };

  const handleChangePlan = async (userId: string, newPlan: 'solo' | 'cabinet') => {
    const { error } = await supabase.from('subscriptions')
      .update({ plan: newPlan })
      .eq('user_id', userId);
    if (error) alert('Erreur : ' + error.message);
    else { loadStats(); }
  };

  const handleSuspend = async (userId: string, pseudo: string) => {
    if (!confirm(`Suspendre l'accès de ${pseudo} ?`)) return;
    const { error } = await supabase.from('subscriptions')
      .update({ statut: 'annule', date_fin: new Date().toISOString() })
      .eq('user_id', userId);
    if (error) alert('Erreur : ' + error.message);
    else { alert('Accès suspendu.'); loadStats(); }
  };

  if (!user || user.email !== ADMIN_EMAIL) return null;

  const S = {
    page: { background:'#F8FAFC', minHeight:'100vh', fontFamily:"'Inter',-apple-system,sans-serif" },
    header: { background:'#0F172A', padding:'20px 32px', display:'flex', alignItems:'center', justifyContent:'space-between' },
    title: { fontSize:'20px', fontWeight:800, color:'#FFFFFF', letterSpacing:'-0.5px' },
    sub: { fontSize:'12px', color:'#64748B', marginTop:'2px' },
    content: { maxWidth:'1200px', margin:'0 auto', padding:'32px 24px' },
    grid2: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:'16px', marginBottom:'24px' },
    grid4: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'16px', marginBottom:'24px' },
    card: { background:'#FFFFFF', borderRadius:'16px', padding:'24px', border:'1px solid #E2E8F0', boxShadow:'0 2px 8px rgba(15,23,42,.05)' },
    kpiVal: { fontSize:'36px', fontWeight:900, letterSpacing:'-1px', lineHeight:1 },
    kpiLabel: { fontSize:'12px', color:'#64748B', marginTop:'6px', fontWeight:500 },
    kpiSub: { fontSize:'11px', color:'#94A3B8', marginTop:'4px' },
    sectionTitle: { fontSize:'16px', fontWeight:700, color:'#0F172A', marginBottom:'16px' },
    badge: (color: string) => ({ display:'inline-block', padding:'3px 8px', borderRadius:'6px', fontSize:'11px', fontWeight:600, background: color === 'green' ? '#DCFCE7' : color === 'orange' ? '#FEF3C7' : color === 'red' ? '#FEE2E2' : '#F1F5F9', color: color === 'green' ? '#166534' : color === 'orange' ? '#92400E' : color === 'red' ? '#991B1B' : '#475569' }),
  };

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <div style={S.title}>📊 Itilib — Administration</div>
          <div style={S.sub}>Mis à jour le {lastRefresh.toLocaleTimeString('fr-FR')}</div>
        </div>
        <div style={{ display:'flex', gap:'10px' }}>
          <button onClick={loadStats} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 16px', background:'#1E293B', border:'1px solid #334155', borderRadius:'8px', color:'#94A3B8', fontSize:'13px', cursor:'pointer' }}>
            <RefreshCw style={{ width:'14px', height:'14px' }} /> Actualiser
          </button>
          <button onClick={() => router.push('/dashboard')} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 16px', background:'#2563EB', border:'none', borderRadius:'8px', color:'#fff', fontSize:'13px', cursor:'pointer' }}>
            <LogOut style={{ width:'14px', height:'14px' }} /> Dashboard
          </button>
        </div>
      </div>

      <div style={S.content}>
        {loading ? (
          <div style={{ textAlign:'center', padding:'60px', color:'#94A3B8' }}>
            <div style={{ fontSize:'32px', marginBottom:'12px' }}>⏳</div>
            <p>Chargement des statistiques…</p>
          </div>
        ) : stats && (
          <>
            {/* KPIs principaux */}
            <div style={S.grid4}>
              <div style={S.card}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ ...S.kpiVal, color:'#0F172A' }}>{stats.totalUsers}</div>
                    <div style={S.kpiLabel}>Utilisateurs total</div>
                    <div style={S.kpiSub}>+{stats.newUsersThisWeek} cette semaine · +{stats.newUsersThisMonth} ce mois</div>
                  </div>
                  <Users style={{ width:'28px', height:'28px', color:'#CBD5E1' }} />
                </div>
              </div>

              <div style={S.card}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ ...S.kpiVal, color:'#10B981' }}>{stats.mrr.toFixed(2)} €</div>
                    <div style={S.kpiLabel}>MRR (revenu mensuel)</div>
                    <div style={S.kpiSub}>ARR estimé : {(stats.mrr * 12).toFixed(0)} €</div>
                  </div>
                  <TrendingUp style={{ width:'28px', height:'28px', color:'#CBD5E1' }} />
                </div>
              </div>

              <div style={S.card}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ ...S.kpiVal, color:'#2563EB' }}>{stats.soloActif + stats.cabinetContrats}</div>
                    <div style={S.kpiLabel}>Abonnés payants</div>
                    <div style={S.kpiSub}>Taux de conversion essai→payant : {stats.conversionRate}%</div>
                  </div>
                  <CreditCard style={{ width:'28px', height:'28px', color:'#CBD5E1' }} />
                </div>
              </div>

              <div style={S.card}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ ...S.kpiVal, color:'#F59E0B' }}>{stats.soloEssai}</div>
                    <div style={S.kpiLabel}>Essais en cours</div>
                    <div style={S.kpiSub}>Potentiel : +{(stats.soloEssai * 7.90).toFixed(0)} €/mois</div>
                  </div>
                  <Calendar style={{ width:'28px', height:'28px', color:'#CBD5E1' }} />
                </div>
              </div>
            </div>

            {/* Détail abonnements */}
            <div style={S.grid2}>
              {/* Solo */}
              <div style={S.card}>
                <div style={S.sectionTitle}>📱 Forfait Solo — 7,90€ HT/mois</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', background:'#F0FDF4', borderRadius:'10px' }}>
                    <span style={{ fontSize:'14px', color:'#166534', fontWeight:600 }}>✅ Actifs (payants)</span>
                    <span style={{ fontSize:'24px', fontWeight:900, color:'#10B981' }}>{stats.soloActif}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', background:'#FFFBEB', borderRadius:'10px' }}>
                    <span style={{ fontSize:'14px', color:'#92400E', fontWeight:600 }}>⏳ En essai gratuit</span>
                    <span style={{ fontSize:'24px', fontWeight:900, color:'#F59E0B' }}>{stats.soloEssai}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', background:'#FEF2F2', borderRadius:'10px' }}>
                    <span style={{ fontSize:'14px', color:'#991B1B', fontWeight:600 }}>❌ Expirés / Annulés</span>
                    <span style={{ fontSize:'24px', fontWeight:900, color:'#EF4444' }}>{stats.soloExpire}</span>
                  </div>
                  <div style={{ padding:'12px 16px', background:'#F8FAFC', borderRadius:'10px', borderTop:'2px solid #E2E8F0' }}>
                    <div style={{ fontSize:'12px', color:'#64748B' }}>Revenu Solo mensuel</div>
                    <div style={{ fontSize:'20px', fontWeight:800, color:'#0F172A' }}>{(stats.soloActif * 7.90).toFixed(2)} €</div>
                  </div>
                </div>
              </div>

              {/* Cabinet */}
              <div style={S.card}>
                <div style={S.sectionTitle}>🏥 Forfait Cabinet — 19,90€ HT/mois</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', background:'#EFF6FF', borderRadius:'10px' }}>
                    <div>
                      <div style={{ fontSize:'14px', color:'#1E40AF', fontWeight:600 }}>📋 Contrats actifs</div>
                      <div style={{ fontSize:'11px', color:'#94A3B8', marginTop:'2px' }}>Chaque contrat = jusqu'à 5 comptes</div>
                    </div>
                    <span style={{ fontSize:'24px', fontWeight:900, color:'#2563EB' }}>{stats.cabinetContrats}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', background:'#F5F3FF', borderRadius:'10px' }}>
                    <div>
                      <div style={{ fontSize:'14px', color:'#5B21B6', fontWeight:600 }}>👥 Comptes utilisateurs</div>
                      <div style={{ fontSize:'11px', color:'#94A3B8', marginTop:'2px' }}>Utilisateurs réels dans les cabinets</div>
                    </div>
                    <span style={{ fontSize:'24px', fontWeight:900, color:'#7C3AED' }}>{stats.cabinetComptes}</span>
                  </div>
                  {stats.cabinetContrats > 0 && (
                    <div style={{ padding:'12px', background:'#F8FAFC', borderRadius:'10px' }}>
                      <div style={{ fontSize:'12px', fontWeight:600, color:'#64748B', marginBottom:'8px' }}>Détail des cabinets</div>
                      {stats.cabinetDetail.map((cab, i) => (
                        <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #F1F5F9', fontSize:'12px' }}>
                          <span style={{ color:'#475569' }}>Cabinet #{i+1}</span>
                          <span style={{ color:'#64748B' }}>{cab.comptes_lies} compte{cab.comptes_lies > 1 ? 's' : ''} · depuis {new Date(cab.date_debut).toLocaleDateString('fr-FR', { month:'short', year:'numeric' })}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ padding:'12px 16px', background:'#F8FAFC', borderRadius:'10px', borderTop:'2px solid #E2E8F0' }}>
                    <div style={{ fontSize:'12px', color:'#64748B' }}>Revenu Cabinet mensuel</div>
                    <div style={{ fontSize:'20px', fontWeight:800, color:'#0F172A' }}>{(stats.cabinetContrats * 19.90).toFixed(2)} €</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Derniers inscrits */}
            <div style={S.card}>
              <div style={S.sectionTitle}>👤 Derniers inscrits</div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                  <thead>
                    <tr style={{ background:'#F8FAFC' }}>
                      {['Pseudonyme', 'Date inscription', 'Plan', 'Statut', 'Fin essai/abo', 'Actions'].map(h => (
                        <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontWeight:600, color:'#64748B', fontSize:'12px', borderBottom:'1px solid #E2E8F0' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentUsers.map((u, i) => (
                      <tr key={i} style={{ borderBottom:'1px solid #F1F5F9' }}>
                        <td style={{ padding:'10px 14px', color:'#0F172A', fontWeight:500 }}>{u.email}</td>
                        <td style={{ padding:'10px 14px', color:'#64748B' }}>
                          {new Date(u.created_at).toLocaleDateString('fr-FR', { day:'numeric', month:'short', year:'numeric' })}
                        </td>
                        <td style={{ padding:'10px 14px' }}>
                          <span style={S.badge(u.plan === 'cabinet' ? 'blue' : 'gray')}>
                            {u.plan === 'solo' ? '📱 Solo' : '🏥 Cabinet'}
                          </span>
                        </td>
                        <td style={{ padding:'10px 14px' }}>
                          <span style={S.badge(u.statut === 'actif' ? 'green' : u.statut === 'expire' ? 'red' : 'orange')}>
                            {u.statut === 'actif' ? '✅ Actif' : u.statut === 'expire' ? '❌ Expiré' : '⚠️ ' + u.statut}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal — Offrir des mois */}
      {giftModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:'20px', padding:'32px', width:'380px', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize:'18px', fontWeight:800, color:'#0F172A', marginBottom:'6px' }}>🎁 Offrir des mois</h2>
            <p style={{ fontSize:'14px', color:'#64748B', marginBottom:'24px' }}>
              Pour <strong>{giftModal.pseudo}</strong> — sans facturation Stripe
            </p>
            <div style={{ marginBottom:'20px' }}>
              <label style={{ display:'block', fontSize:'13px', fontWeight:600, color:'#374151', marginBottom:'8px' }}>Durée à offrir</label>
              <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                {[1, 2, 3, 6, 12].map(m => (
                  <button key={m} onClick={() => setGiftMonths(m)}
                    style={{ padding:'8px 16px', borderRadius:'10px', border:`2px solid ${giftMonths === m ? '#2563EB' : '#E2E8F0'}`, background: giftMonths === m ? '#EFF6FF' : '#fff', color: giftMonths === m ? '#2563EB' : '#374151', fontSize:'14px', fontWeight:600, cursor:'pointer' }}>
                    {m} mois
                  </button>
                ))}
              </div>
            </div>
            <div style={{ background:'#F0FDF4', borderRadius:'10px', padding:'12px 16px', marginBottom:'20px' }}>
              <p style={{ fontSize:'13px', color:'#166534' }}>
                ✅ Accès prolongé jusqu'au <strong>{(() => { const d = new Date(); d.setMonth(d.getMonth() + giftMonths); return d.toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' }); })()}</strong>
              </p>
              <p style={{ fontSize:'12px', color:'#16a34a', marginTop:'4px' }}>Stripe n'est pas impliqué — aucune facturation</p>
            </div>
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={() => setGiftModal(null)}
                style={{ flex:1, padding:'12px', background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:'10px', fontSize:'14px', fontWeight:600, cursor:'pointer', color:'#374151' }}>
                Annuler
              </button>
              <button onClick={handleGiftMonths} disabled={giftLoading}
                style={{ flex:1, padding:'12px', background:'#2563EB', border:'none', borderRadius:'10px', fontSize:'14px', fontWeight:700, cursor:'pointer', color:'#fff' }}>
                {giftLoading ? 'En cours…' : `Offrir ${giftMonths} mois`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
