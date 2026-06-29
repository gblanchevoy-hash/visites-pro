# VisitePro — Guide d'installation complet

Application web Progressive (PWA) pour l'organisation de visites à domicile.

---

## 📋 Prérequis

- **Node.js** 18+ ([télécharger](https://nodejs.org))
- **npm** 9+ (inclus avec Node.js)
- Un compte **Supabase** gratuit ([supabase.com](https://supabase.com))
- Un compte **Vercel** gratuit ([vercel.com](https://vercel.com)) pour le déploiement
- Un compte **OpenRouteService** gratuit ([openrouteservice.org](https://openrouteservice.org)) pour les itinéraires

---

## 🗄️ ÉTAPE 1 — Configuration Supabase

### 1.1 Créer le projet Supabase

1. Allez sur [supabase.com](https://supabase.com) → **New Project**
2. Choisissez un nom (ex: `visitepro`), un mot de passe fort, la région **eu-west-1 (Ireland)**
3. Attendez 2 minutes que le projet soit prêt

### 1.2 Exécuter le script SQL

1. Dans votre projet Supabase, allez dans **SQL Editor**
2. Cliquez **New Query**
3. Copiez-collez le contenu de `supabase/migrations/001_init.sql`
4. Cliquez **Run** (▶️)
5. Vérifiez que toutes les tables apparaissent dans **Table Editor**

Tables créées :
- `patients` — base de données patients
- `rendez_vous` — agenda/planning
- `user_settings` — paramètres utilisateur
- `frais_kilometriques` — suivi des frais km

### 1.3 Récupérer les clés API Supabase

Dans votre projet Supabase → **Project Settings** → **API** :

- Copiez l'**URL du projet** → `https://xxxxx.supabase.co`
- Copiez l'**anon/public key** → `eyJhbGci...`

---

## 📁 ÉTAPE 2 — Installation locale

### 2.1 Cloner/copier le projet

```bash
# Si vous avez le dossier zip, extrayez-le
cd visites-domicile

# Ou clonez depuis GitHub si vous l'y avez poussé
git clone https://github.com/VOTRE_USERNAME/visitepro.git
cd visitepro
```

### 2.2 Installer les dépendances

```bash
npm install
```

### 2.3 Configurer les variables d'environnement

```bash
cp .env.example .env.local
```

Éditez `.env.local` :

```env
NEXT_PUBLIC_SUPABASE_URL=https://VOTRE_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_anon_key_ici
```

### 2.4 Lancer en développement

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000)

---

## 🚀 ÉTAPE 3 — Déploiement Vercel

### 3.1 Via l'interface Vercel (recommandé)

1. Poussez votre code sur GitHub :
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/VOTRE_USERNAME/visitepro.git
git push -u origin main
```

2. Sur [vercel.com](https://vercel.com) → **Add New Project**
3. Importez votre dépôt GitHub
4. Dans **Environment Variables**, ajoutez :
   - `NEXT_PUBLIC_SUPABASE_URL` = votre URL Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = votre clé anon
5. Cliquez **Deploy**

### 3.2 Via CLI Vercel

```bash
npm i -g vercel
vercel login
vercel --prod
# Suivez les instructions, ajoutez les env vars quand demandé
```

---

## 🔑 ÉTAPE 4 — Configuration OpenRouteService

### 4.1 Obtenir une clé gratuite

1. Allez sur [openrouteservice.org](https://openrouteservice.org)
2. Créez un compte gratuit (email + mot de passe)
3. Dans votre tableau de bord → **Dashboard** → copiez votre **API Key**
4. Le plan gratuit inclut **2 000 requêtes/jour** — largement suffisant

### 4.2 Configurer dans l'application

1. Connectez-vous à VisitePro
2. Menu **Paramètres** (icône ⚙️ en bas de la sidebar)
3. Section **Clé API OpenRouteService** → collez votre clé
4. Cliquez **Enregistrer**

---

## 📱 ÉTAPE 5 — Installation PWA (optionnel)

L'application peut être installée comme une app native sur tous les appareils.

### Sur Android (Chrome)
1. Ouvrez l'app dans Chrome
2. Bannière automatique : **"Ajouter à l'écran d'accueil"**
3. Ou via le menu ⋮ → **Installer l'application**

### Sur iPad / iPhone (Safari)
1. Ouvrez dans Safari
2. Bouton **Partager** (carré avec flèche)
3. **"Sur l'écran d'accueil"**

### Sur ordinateur (Chrome/Edge)
1. Icône d'installation dans la barre d'adresse
2. Ou via Menu → **Installer VisitePro**

---

## 🎯 ÉTAPE 6 — Premiers pas

### 6.1 Créer votre compte

1. Ouvrez l'application
2. Cliquez **S'inscrire**
3. Entrez votre email et mot de passe (min. 6 caractères)
4. Vérifiez votre email (lien de confirmation Supabase)

### 6.2 Configuration initiale

1. Allez dans **Paramètres**
2. Renseignez votre **adresse de départ** (votre domicile ou cabinet)
3. Cliquez **Géolocaliser** pour calculer les coordonnées
4. Configurez votre **barème kilométrique**
5. Entrez votre **clé API OpenRouteService**
6. Cliquez **Enregistrer**

### 6.3 Ajouter vos patients

1. Menu **Patients** → **Nouveau patient**
2. Remplissez le formulaire (nom, adresse, téléphone…)
3. Cliquez **Géolocaliser l'adresse** → les coordonnées GPS sont calculées automatiquement
4. **Créer le patient**

### 6.4 Planifier des visites

1. Menu **Planning**
2. Choisissez la vue **Jour**, **Semaine** ou **Mois**
3. Cliquez sur un créneau ou le bouton **+ Ajouter**
4. Sélectionnez le patient, l'heure et la durée
5. **Créer**

### 6.5 Utiliser la tournée

1. Menu **Tournées**
2. Sélectionnez la date
3. Toutes les visites du jour apparaissent sur la carte
4. Bouton **Optimiser la tournée** → l'ordre est recalculé automatiquement
5. Bouton **Calculer l'itinéraire** → le tracé s'affiche sur la carte

---

## 🔧 Structure du projet

```
visites-domicile/
├── src/
│   ├── app/                    # Pages Next.js (App Router)
│   │   ├── auth/               # Connexion / Inscription
│   │   ├── dashboard/          # Tableau de bord
│   │   ├── patients/           # Gestion des patients
│   │   ├── planning/           # Agenda (jour/semaine/mois)
│   │   ├── tournees/           # Carte + itinéraires
│   │   ├── frais/              # Frais kilométriques
│   │   ├── statistiques/       # Statistiques & rapports
│   │   ├── exports/            # Exports PDF/Excel
│   │   └── settings/           # Paramètres utilisateur
│   ├── components/
│   │   ├── layout/             # AppShell, Sidebar, Topbar
│   │   ├── map/                # Composant Leaflet
│   │   ├── patients/           # Modal patient
│   │   └── planning/           # Modal rendez-vous
│   ├── lib/
│   │   ├── supabase/           # Client Supabase + types DB
│   │   ├── stores/             # État global (Zustand)
│   │   └── utils/              # Géocodage, dates, exports
│   ├── styles/                 # CSS global + Tailwind
│   └── types/                  # Types TypeScript
├── supabase/
│   └── migrations/
│       └── 001_init.sql        # Script SQL à exécuter
├── public/
│   ├── manifest.json           # Configuration PWA
│   └── icons/                  # Icônes PWA
├── .env.example                # Modèle variables d'environnement
├── next.config.js              # Config Next.js + PWA
├── tailwind.config.ts          # Config Tailwind CSS
└── package.json
```

---

## 🧩 Technologies utilisées

| Technologie | Usage | Coût |
|-------------|-------|------|
| **Next.js 14** | Framework React full-stack | Gratuit |
| **Tailwind CSS** | Styles | Gratuit |
| **Supabase** | Auth + base de données + temps réel | Gratuit (500 MB) |
| **Leaflet** | Cartographie interactive | Gratuit |
| **OpenStreetMap** | Fond de carte | Gratuit |
| **OpenRouteService** | Calcul d'itinéraires | Gratuit (2000 req/j) |
| **Zustand** | État global | Gratuit |
| **jsPDF + XLSX** | Exports PDF et Excel | Gratuit |
| **next-pwa** | Progressive Web App | Gratuit |
| **Vercel** | Hébergement | Gratuit |

**Coût total : 0 €/mois** pour un usage professionnel individuel.

---

## ⚠️ Génération des icônes PWA

Les icônes PNG doivent être générées. Deux options :

**Option A — ImageMagick (Linux/Mac)**
```bash
cd public/icons
sudo apt-get install imagemagick  # ou brew install imagemagick
bash generate-icons.sh
```

**Option B — Favicon.io (en ligne)**
1. Allez sur [favicon.io](https://favicon.io/favicon-generator/)
2. Créez une icône avec fond violet (#4f46e5) et lettre V
3. Téléchargez et renommez :
   - `android-chrome-192x192.png` → `icon-192.png`
   - `android-chrome-512x512.png` → `icon-512.png`
   - `apple-touch-icon.png` → `apple-touch-icon.png`
4. Placez les fichiers dans `public/icons/`

---

## 🐛 Résolution des problèmes courants

**La carte ne s'affiche pas**
→ Vérifiez que vous avez un accès Internet (tuiles OpenStreetMap)
→ Videz le cache navigateur (Ctrl+Shift+R)

**"Erreur calcul itinéraire"**
→ Vérifiez votre clé API ORS dans Paramètres
→ Vérifiez que les patients ont une adresse géolocalisée

**"Erreur connexion Supabase"**
→ Vérifiez les variables d'environnement `.env.local`
→ Vérifiez que le script SQL a bien été exécuté dans Supabase

**L'application ne s'installe pas en PWA**
→ L'installation PWA ne fonctionne qu'en HTTPS (Vercel, pas localhost)
→ Sur mobile, attendez quelques secondes sur la page

**Patients non géolocalisés**
→ Assurez-vous que l'adresse est complète (numéro, rue, code postal, ville)
→ Le géocodage utilise Nominatim/OpenStreetMap, parfois moins précis pour les zones rurales

---

## 📞 Support

Pour toute question sur le code, consultez :
- [Documentation Next.js](https://nextjs.org/docs)
- [Documentation Supabase](https://supabase.com/docs)
- [Documentation OpenRouteService](https://openrouteservice.org/dev/#/api-docs)
- [Documentation Leaflet](https://leafletjs.com/reference.html)
