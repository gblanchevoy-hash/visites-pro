'use client';
import AppShell from '@/components/layout/AppShell';
import Topbar from '@/components/layout/Topbar';
import { Shield } from 'lucide-react';

export default function MentionsLegalesPage() {
  return (
    <AppShell>
      <Topbar title="Mentions légales & CGU" subtitle="Conditions générales d'utilisation" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl space-y-6">

          <div className="card p-6 space-y-3">
            <h2 className="font-bold text-slate-900 text-lg">Éditeur</h2>
            <p className="text-sm text-slate-600">Itilib est une application de gestion de tournées à domicile destinée aux professionnels de santé libéraux.</p>
          </div>

          <div className="card p-6 space-y-3">
            <h2 className="font-bold text-slate-900 text-lg">Données personnelles & RGPD</h2>
            <p className="text-sm text-slate-600 leading-relaxed">Conformément au Règlement Général sur la Protection des Données (RGPD), vos données sont traitées de manière sécurisée. Les données saisies dans l'application (patients, rendez-vous, trajets) sont stockées sur des serveurs sécurisés via Supabase, avec des règles d'accès strictes par utilisateur (Row Level Security).</p>
            <p className="text-sm text-slate-600 leading-relaxed">Vous disposez d'un droit d'accès, de rectification et de suppression de vos données à tout moment depuis les paramètres de l'application.</p>
          </div>

          <div className="card p-6 space-y-3 border-2 border-amber-200 bg-amber-50/30">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-600" />
              <h2 className="font-bold text-slate-900 text-lg">Messagerie interne — Utilisation responsable</h2>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed font-medium">
              ⚠️ La messagerie interne d'Itilib est un outil de communication entre professionnels de santé à usage organisationnel uniquement.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              <strong>Il est strictement interdit de communiquer via la messagerie interne des données médicales identifiantes concernant les patients</strong> (diagnostics, résultats d'examens, informations de santé couvertes par le secret médical, numéros de sécurité sociale, etc.).
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              Les messages sont chiffrés en transit (TLS) et protégés par des règles d'accès strictes. Cependant, l'application ne dispose pas d'un chiffrement de bout en bout (E2E) côté client. Pour l'échange de données de santé sensibles, utilisez un service homologué HDS (Hébergeur de Données de Santé) ou un système de messagerie sécurisée de santé certifié (ex : MSSanté).
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              L'éditeur décline toute responsabilité en cas d'utilisation non conforme de la messagerie pour la transmission de données médicales.
            </p>
          </div>

          <div className="card p-6 space-y-3">
            <h2 className="font-bold text-slate-900 text-lg">Hébergement des données</h2>
            <p className="text-sm text-slate-600 leading-relaxed">Les données sont hébergées par Supabase (PostgreSQL), localisé en Europe (région eu-west). Le prestataire est certifié ISO 27001 et conforme au RGPD.</p>
          </div>

          <div className="card p-6 space-y-3">
            <h2 className="font-bold text-slate-900 text-lg">Contact</h2>
            <p className="text-sm text-slate-600">Pour toute demande relative à vos données personnelles ou à l'utilisation de l'application, contactez l'administrateur de votre compte.</p>
          </div>

        </div>
      </div>
    </AppShell>
  );
}
