'use client';
import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function LegalContent() {
  const params = useSearchParams();
  const tab = params.get('tab') ?? 'mentions';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'Inter',-apple-system,sans-serif;background:#f8fafc;color:#0f172a;}
        .wrap{max-width:760px;margin:0 auto;padding:40px 24px 80px;}
        .nav{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;background:#fff;border-bottom:1px solid #e2e8f0;margin-bottom:0;}
        .logo{display:flex;align-items:center;gap:10px;text-decoration:none;}
        .logo-ic{width:34px;height:34px;border-radius:10px;background:#2563eb;display:flex;align-items:center;justify-content:center;}
        .logo-n{font-size:16px;font-weight:800;color:#0f172a;}
        .back{font-size:13px;color:#2563eb;text-decoration:none;font-weight:500;}
        .back:hover{opacity:.75;}
        .tabs{display:flex;gap:0;border-bottom:1px solid #e2e8f0;background:#fff;padding:0 24px;}
        .tab{padding:14px 20px;font-size:14px;font-weight:500;color:#64748b;text-decoration:none;border-bottom:2px solid transparent;transition:all .15s;}
        .tab.active{color:#2563eb;border-bottom-color:#2563eb;font-weight:600;}
        .tab:hover{color:#0f172a;}
        h1{font-size:28px;font-weight:800;color:#0f172a;margin:32px 0 8px;letter-spacing:-.5px;}
        .date{font-size:13px;color:#94a3b8;margin-bottom:32px;}
        .section{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:28px;margin-bottom:16px;}
        .section h2{font-size:17px;font-weight:700;color:#0f172a;margin-bottom:12px;display:flex;align-items:center;gap:8px;}
        .section p,.section li{font-size:14px;color:#475569;line-height:1.75;margin-bottom:8px;}
        .section ul,.section ol{padding-left:20px;margin-bottom:8px;}
        .section li{margin-bottom:4px;}
        .highlight{background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px 20px;margin-top:12px;}
        .highlight p{color:#1d4ed8;font-size:13px;margin:0;}
        .warn{background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px 20px;margin-top:12px;}
        .warn p{color:#92400e;font-size:13px;margin:0;}
        a{color:#2563eb;text-decoration:none;}
        a:hover{text-decoration:underline;}
        .contact-box{background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:20px 24px;margin-top:16px;display:flex;align-items:center;gap:16px;}
        .contact-box .icon{width:40px;height:40px;background:#0ea5e9;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .contact-box p{font-size:14px;color:#0c4a6e;margin:0;}
        .contact-box strong{display:block;font-size:15px;color:#0f172a;margin-bottom:2px;}
      `}</style>

      <nav className="nav">
        <Link href="/auth" className="logo">
          <div className="logo-ic">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="white"/>
            </svg>
          </div>
          <span className="logo-n">Itilib</span>
        </Link>
        <Link href="/auth" className="back">← Retour à la connexion</Link>
      </nav>

      <div style={{display:'flex',gap:'0',borderBottom:'1px solid #e2e8f0',background:'#fff',padding:'0 24px'}}>
        <Link href="/legal?tab=mentions" className={`tab ${tab === 'mentions' ? 'active' : ''}`}>Mentions légales</Link>
        <Link href="/legal?tab=confidentialite" className={`tab ${tab === 'confidentialite' ? 'active' : ''}`}>Politique de confidentialité</Link>
        <Link href="/legal?tab=cgu" className={`tab ${tab === 'cgu' ? 'active' : ''}`}>CGU</Link>
      </div>

      <div className="wrap">
        {tab === 'mentions' && (
          <>
            <h1>Mentions légales</h1>
            <p className="date">Dernière mise à jour : juillet 2026</p>

            <div className="section">
              <h2>🏢 Éditeur de l'application</h2>
              <p><strong>Nom de l'application :</strong> Itilib</p>
              <p><strong>Nature :</strong> Application web progressive (PWA) de gestion de tournées professionnelles à domicile</p>
              <p><strong>Contact :</strong> <a href="mailto:contact@itilib.fr">contact@itilib.fr</a></p>
            </div>

            <div className="section">
              <h2>🌐 Hébergement</h2>
              <p>L'application Itilib est hébergée et déployée via les services suivants :</p>
              <ul>
                <li><strong>Vercel Inc.</strong> — Déploiement et CDN mondial<br/>340 Pine Street, Suite 701, San Francisco, CA 94104, USA</li>
                <li><strong>Supabase Inc.</strong> — Base de données et authentification<br/>Serveurs localisés en Europe (région eu-west)</li>
              </ul>
            </div>

            <div className="section">
              <h2>🗺️ API et services tiers</h2>
              <ul>
                <li><strong>OpenRouteService</strong> — Calcul d'itinéraires (openrouteservice.org)</li>
                <li><strong>Open-Meteo</strong> — Données météorologiques (open-meteo.com)</li>
                <li><strong>API Adresse (data.gouv.fr)</strong> — Géocodage d'adresses françaises</li>
                <li><strong>Google Fonts</strong> — Police Inter</li>
              </ul>
            </div>

            <div className="section">
              <h2>⚖️ Propriété intellectuelle</h2>
              <p>L'ensemble des éléments constituant l'application Itilib (design, code source, textes, logique métier) est protégé par le droit de la propriété intellectuelle. Toute reproduction, représentation, modification ou exploitation non autorisée est interdite.</p>
            </div>

            <div className="section">
              <h2>⚕️ Limitation de responsabilité</h2>
              <p>Itilib est un outil d'organisation professionnelle. L'éditeur ne saurait être tenu responsable :</p>
              <ul>
                <li>Des erreurs de calcul d'itinéraires dues aux APIs tierces</li>
                <li>D'une interruption temporaire du service</li>
                <li>De toute décision médicale ou professionnelle prise sur la base des données affichées</li>
              </ul>
              <div className="highlight">
                <p>La messagerie interne ne doit pas être utilisée pour transmettre des données de santé identifiantes. Pour tout échange médical sensible, utilisez un système certifié HDS (ex : MSSanté).</p>
              </div>
            </div>

            <div className="contact-box">
              <div className="icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg></div>
              <div>
                <strong>Une question juridique ?</strong>
                <p>Écrivez-nous à <a href="mailto:contact@itilib.fr">contact@itilib.fr</a></p>
              </div>
            </div>
          </>
        )}

        {tab === 'confidentialite' && (
          <>
            <h1>Politique de confidentialité</h1>
            <p className="date">Dernière mise à jour : juillet 2026 · Conforme RGPD (Règlement UE 2016/679)</p>

            <div className="section">
              <h2>📋 Responsable du traitement</h2>
              <p>Le responsable du traitement des données personnelles est l'éditeur d'Itilib.</p>
              <p>Contact DPO : <a href="mailto:contact@itilib.fr">contact@itilib.fr</a></p>
            </div>

            <div className="section">
              <h2>📊 Données collectées et finalités</h2>
              <ul>
                <li><strong>Données de compte :</strong> adresse email, pseudonyme — pour l'authentification</li>
                <li><strong>Données professionnelles :</strong> adresse de départ, horaires, barème km — pour le calcul de tournées</li>
                <li><strong>Données patients :</strong> nom, prénom, adresse, téléphone, notes — pour la gestion des visites. Ces données ne sont jamais transmises à des tiers.</li>
                <li><strong>Données de navigation :</strong> aucun cookie de tracking n'est utilisé</li>
                <li><strong>Messagerie interne :</strong> messages entre collaborateurs — usage organisationnel uniquement</li>
              </ul>
            </div>

            <div className="section">
              <h2>🔒 Sécurité et stockage</h2>
              <p>Toutes les données sont stockées sur Supabase (PostgreSQL), hébergé en Europe, avec :</p>
              <ul>
                <li>Chiffrement en transit (TLS 1.3)</li>
                <li>Isolation stricte par utilisateur (Row Level Security)</li>
                <li>Accès impossible entre comptes différents</li>
                <li>Aucune donnée vendue ni cédée à des tiers commerciaux</li>
              </ul>
              <div className="warn">
                <p>⚠️ Itilib ne dispose pas d'un chiffrement de bout en bout (E2E) pour la messagerie. Ne transmettez pas de données médicales confidentielles via la messagerie interne.</p>
              </div>
            </div>

            <div className="section">
              <h2>⏱️ Durée de conservation</h2>
              <ul>
                <li>Données de compte : conservées tant que le compte est actif</li>
                <li>Données patients et RDV : conservées tant que le compte est actif</li>
                <li>Après suppression du compte : effacement dans les 30 jours</li>
                <li>Logs serveur : 90 jours maximum</li>
              </ul>
            </div>

            <div className="section">
              <h2>✅ Vos droits RGPD</h2>
              <p>Conformément au RGPD, vous disposez des droits suivants :</p>
              <ul>
                <li><strong>Droit d'accès</strong> — obtenir une copie de vos données</li>
                <li><strong>Droit de rectification</strong> — corriger vos informations</li>
                <li><strong>Droit à l'effacement</strong> — demander la suppression de votre compte et données</li>
                <li><strong>Droit à la portabilité</strong> — recevoir vos données dans un format structuré</li>
                <li><strong>Droit d'opposition</strong> — vous opposer à certains traitements</li>
              </ul>
              <p>Pour exercer ces droits : <a href="mailto:contact@itilib.fr">contact@itilib.fr</a></p>
              <p>En cas de litige non résolu, vous pouvez saisir la <a href="https://www.cnil.fr" target="_blank" rel="noreferrer">CNIL</a>.</p>
            </div>

            <div className="section">
              <h2>🍪 Cookies</h2>
              <p>Itilib utilise uniquement des cookies techniques strictement nécessaires au fonctionnement de l'application (session d'authentification). Aucun cookie publicitaire ou de tracking n'est utilisé. Aucun bandeau cookie n'est requis.</p>
            </div>

            <div className="contact-box">
              <div className="icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
              <div>
                <strong>Exercer vos droits RGPD</strong>
                <p>Contactez-nous à <a href="mailto:contact@itilib.fr">contact@itilib.fr</a> — réponse sous 30 jours</p>
              </div>
            </div>
          </>
        )}

        {tab === 'cgu' && (
          <>
            <h1>Conditions Générales d'Utilisation</h1>
            <p className="date">Dernière mise à jour : juillet 2026</p>

            <div className="section">
              <h2>📌 Objet</h2>
              <p>Les présentes CGU régissent l'utilisation de l'application Itilib, outil de gestion de tournées à domicile destiné aux professionnels en itinérance (infirmiers, kinésithérapeutes, aides à domicile, techniciens, VRP, etc.).</p>
            </div>

            <div className="section">
              <h2>👤 Inscription et compte</h2>
              <ul>
                <li>L'inscription est gratuite et ouverte à tout professionnel adulte</li>
                <li>Vous êtes responsable de la confidentialité de vos identifiants</li>
                <li>Toute utilisation frauduleuse doit être signalée immédiatement</li>
                <li>Un compte par personne physique</li>
              </ul>
            </div>

            <div className="section">
              <h2>✅ Utilisation autorisée</h2>
              <ul>
                <li>Gestion de vos propres tournées et patients</li>
                <li>Communication avec des collègues via la messagerie interne</li>
                <li>Export de vos données personnelles (frais, rapports)</li>
                <li>Usage professionnel ou para-professionnel</li>
              </ul>
            </div>

            <div className="section">
              <h2>🚫 Utilisations interdites</h2>
              <ul>
                <li>Partage de données de patients sans consentement</li>
                <li>Transmission de données médicales confidentielles via la messagerie</li>
                <li>Tentative d'accès aux données d'autres utilisateurs</li>
                <li>Utilisation à des fins commerciales de revente</li>
                <li>Scraping, reverse engineering ou décompilation</li>
              </ul>
              <div className="warn">
                <p>⚠️ La messagerie interne est réservée aux communications organisationnelles entre professionnels. Elle ne constitue pas un canal sécurisé au sens de la réglementation HDS pour l'échange de données de santé.</p>
              </div>
            </div>

            <div className="section">
              <h2>💾 Données et responsabilité</h2>
              <p>Vous êtes responsable des données que vous saisissez dans Itilib, notamment :</p>
              <ul>
                <li>L'exactitude des informations patients</li>
                <li>La conformité RGPD de votre usage envers vos propres patients</li>
                <li>La sauvegarde régulière de vos données via les exports</li>
              </ul>
            </div>

            <div className="section">
              <h2>🔄 Modifications et résiliation</h2>
              <p>L'éditeur se réserve le droit de modifier les présentes CGU avec un préavis de 30 jours par email. La suppression du compte peut être demandée à tout moment à <a href="mailto:contact@itilib.fr">contact@itilib.fr</a>.</p>
            </div>

            <div className="section">
              <h2>⚖️ Droit applicable</h2>
              <p>Les présentes CGU sont régies par le droit français. Tout litige relève de la compétence des tribunaux français.</p>
            </div>

            <div className="contact-box">
              <div className="icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg></div>
              <div>
                <strong>Contact</strong>
                <p><a href="mailto:contact@itilib.fr">contact@itilib.fr</a></p>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default function LegalPage() {
  return <Suspense fallback={<div style={{padding:'40px',textAlign:'center',color:'#94a3b8'}}>Chargement…</div>}><LegalContent /></Suspense>;
}
