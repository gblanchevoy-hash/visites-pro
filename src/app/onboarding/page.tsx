'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAppStore } from '@/lib/stores/appStore';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { CheckCircle2, Loader2, Navigation, Calendar, MapPin, ArrowRight, Sparkles } from 'lucide-react';

type Step = 'pseudo' | 'tutorial';

const TUTORIAL_STEPS = [
  {
    icon: Navigation,
    color: '#2563eb',
    title: '1. Configurez votre point de départ',
    desc: "Renseignez votre adresse de départ et de retour dans \"Mon Départ\". C'est le point de référence pour tous vos calculs d'itinéraires.",
  },
  {
    icon: MapPin,
    color: '#16a34a',
    title: '2. Ajoutez vos patients',
    desc: "Dans \"Patients\", créez les fiches de vos patients réguliers avec leur adresse. Vous pourrez les sélectionner rapidement lors de la planification.",
  },
  {
    icon: Calendar,
    color: '#ea580c',
    title: '3. Planifiez vos visites',
    desc: "Dans \"Planning\", créez vos rendez-vous. Cliquez sur un créneau ou le bouton + RDV, choisissez un patient ou un passage rapide.",
  },
  {
    icon: Sparkles,
    color: '#9333ea',
    title: '4. Visualisez votre tournée',
    desc: "Dans \"Tournées\", calculez l'itinéraire optimal, visualisez la carte et les temps de trajet entre chaque visite.",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { setSettings, loadSettings } = useAppStore();
  const [step, setStep] = useState<Step>('pseudo');
  const [pseudonyme, setPseudo] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [tutorialIdx, setTutorialIdx] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/auth'); return; }
      setUserId(data.session.user.id);
    });
  }, []);

  const handleSavePseudo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pseudonyme.trim() || !userId) return;
    setLoading(true);

    const { data: existing } = await supabase
      .from('user_settings').select('id').eq('user_id', userId).single();

    if (existing?.id) {
      await supabase.from('user_settings').update({ pseudonyme: pseudonyme.trim() }).eq('user_id', userId);
    } else {
      await supabase.from('user_settings').insert({
        user_id: userId,
        pseudonyme: pseudonyme.trim(),
        bareme_km: 0.62,
        duree_visite_defaut: 30,
        heure_debut_journee: '08:00',
        heure_fin_journee: '19:00',
        categories: [],
        couleurs_categories: {},
        theme: 'light',
      });
    }

    await loadSettings();
    setLoading(false);
    setStep('tutorial');
  };

  const finishOnboarding = () => {
    toast.success(`Bienvenue ${pseudonyme.trim()} ! Bonne organisation 👋`);
    router.replace('/dashboard');
  };

  // ── Step 1: Pseudonyme ──
  if (step === 'pseudo') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 bg-white rounded-3xl shadow-lg flex items-center justify-center mb-4">
              <Image src="/icons/logo.png" alt="Roulax" width={64} height={64} className="rounded-2xl" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Bienvenue sur Roulax !</h1>
            <p className="text-slate-500 text-sm mt-1 text-center">
              Avant de commencer, choisissez comment vous souhaitez être appelé.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Votre prénom ou pseudonyme</h2>
            <p className="text-sm text-slate-500 mb-6">Il apparaîtra sur votre tableau de bord et dans l'application.</p>

            <form onSubmit={handleSavePseudo} className="space-y-4">
              <input className="input text-lg py-3 text-center font-semibold"
                placeholder="Ex : Sophie, Dr Martin…" value={pseudonyme}
                onChange={e => setPseudo(e.target.value)} required autoFocus />

              {pseudonyme.trim() && (
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-center text-sm text-blue-700">
                  Votre tableau de bord affichera : <strong>Bonjour {pseudonyme.trim()} !</strong>
                </div>
              )}

              <button type="submit" disabled={loading || !pseudonyme.trim()} className="btn-primary w-full justify-center py-3 text-base">
                {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Enregistrement…</> : <>Continuer <ArrowRight className="w-5 h-5" /></>}
              </button>
            </form>

            <button onClick={() => router.replace('/dashboard')}
              className="w-full text-center text-xs text-slate-400 hover:text-slate-600 mt-4 transition-colors">
              Passer cette étape →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2: Tutorial ──
  const current = TUTORIAL_STEPS[tutorialIdx];
  const Icon = current.icon;
  const isLast = tutorialIdx === TUTORIAL_STEPS.length - 1;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {TUTORIAL_STEPS.map((_, i) => (
              <div key={i} className="h-1.5 rounded-full transition-all"
                style={{ width: i === tutorialIdx ? '28px' : '8px', background: i <= tutorialIdx ? '#2563eb' : '#e2e8f0' }} />
            ))}
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: `${current.color}15` }}>
              <Icon className="w-8 h-8" style={{ color: current.color }} />
            </div>
          </div>

          <h2 className="text-xl font-bold text-slate-900 text-center mb-2">{current.title}</h2>
          <p className="text-sm text-slate-500 text-center leading-relaxed mb-8 px-2">{current.desc}</p>

          <div className="flex gap-3">
            {tutorialIdx > 0 && (
              <button onClick={() => setTutorialIdx(i => i - 1)} className="btn-secondary flex-1 justify-center">
                Précédent
              </button>
            )}
            <button
              onClick={() => isLast ? finishOnboarding() : setTutorialIdx(i => i + 1)}
              className="btn-primary flex-1 justify-center">
              {isLast ? <><CheckCircle2 className="w-5 h-5" /> C'est parti !</> : <>Suivant <ArrowRight className="w-5 h-5" /></>}
            </button>
          </div>

          <button onClick={finishOnboarding}
            className="w-full text-center text-xs text-slate-400 hover:text-slate-600 mt-4 transition-colors">
            Passer le tutoriel →
          </button>
        </div>
      </div>
    </div>
  );
}
