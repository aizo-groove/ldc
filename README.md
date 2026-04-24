# LDC — Logiciel de Caisse

Un logiciel de caisse open-source pour le marché français — restaurants, cafés, commerces de proximité. Fonctionne **entièrement hors ligne** comme application native de bureau (macOS, Windows) grâce à Tauri v2 + React + Rust.

---

## Fonctionnalités

**Vente & paiement**
- Catalogue produits avec catégories, taux de TVA et suivi de stock optionnel
- Panier avec remises par ligne, addition partagée entre plusieurs personnes
- Moyens de paiement : CB, espèces, chèque, virement, avoir, titre-restaurant, autre
- Vérification du stock à l'ajout avec message d'alerte explicite
- Partage de l'addition par nombre de parts égales ou par personne

**Gestion des tables** *(profils restaurant/café)*
- Plan de salle visuel avec positionnement des tables par glisser-déposer
- Support multi-salles
- Tickets ouverts par table — ajout d'articles, sauvegarde en cours de service, reprise
- Cycle de statut : libre → occupé → addition

**Caissiers & sessions**
- Écran de connexion multi-caissiers avec PIN à 4 chiffres optionnel
- Rôle responsable avec gestion des caissiers protégée par PIN (par défaut : `0000`)
- Sessions tracent le caissier actif ; pensé pour un usage mono-poste

**Conformité fiscale NF525**
- Chaîne de hachage SHA-256 sur toutes les transactions
- Journal d'audit immuable (append-only)
- Rapport X par session avec ventilation TVA par taux
- Clôture Z avec grands totaux cumulés non réinitialisables
- Vérification de la chaîne en un clic depuis les paramètres
- Export complet de l'archive fiscale JSON (à conserver 6 ans)
- Attestation de conformité pré-remplie exportable en HTML/PDF

**Gestion du catalogue (Inventaire)**
- Création, modification, désactivation logique des produits
- Suivi de stock par produit avec visibilité des ruptures
- Attribution du taux de TVA par produit

**Appareils (Matériel)**
- Imprimante thermique TCP/IP (58 ou 80 mm)
- Tiroir-caisse via impulsion ESC/POS (pin 2 ou pin 5), ouverture automatique configurable
- Scanner de codes-barres USB HID (plug & play)
- Terminal de paiement CB (référence)
- Écran client sur second moniteur — affiche le panier et le total en temps réel

**Profils commerciaux**
- Restaurant, Café/Bar, Commerce — active ou masque les fonctionnalités selon le profil

**Expérience**
- Thème sombre/clair (Material You)
- Horloge en temps réel dans la barre supérieure
- Mise à jour automatique depuis GitHub Releases
- Système de retour développeur intégré (→ GitHub Issues)

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Shell bureau | [Tauri v2](https://tauri.app) — binaire natif, pas d'Electron |
| Backend | Rust — chaîne fiscale, commandes SQLite, contrôle de stock |
| Base de données | SQLite via [sqlx](https://github.com/launchbadge/sqlx) — embarquée, offline-first |
| Frontend | React 18 + TypeScript |
| État | [Zustand](https://github.com/pmndrs/zustand) |
| Style | Tailwind CSS v4 avec tokens `@theme {}` — palette Material You |
| Icônes | [Lucide React](https://lucide.dev) — bundlé, aucune dépendance CDN |

> Tous les montants sont stockés et transmis en **centimes entiers** (i64 en Rust, number en TypeScript). `formatCents()` est le seul point de conversion, utilisé uniquement pour l'affichage.

---

## Démarrage rapide

### Prérequis

- [Rust](https://rustup.rs/) stable
- [Node.js](https://nodejs.org/) 18+
- [Prérequis Tauri CLI](https://tauri.app/start/prerequisites/) pour votre OS

### Développement

```bash
npm install
npm run tauri dev
```

### Build production

```bash
npm run tauri build
```

Génère un installeur natif dans `src-tauri/target/release/bundle/`.

---

## Structure du projet

```
ldc/
├── src/                             # Frontend React/TypeScript
│   ├── App.tsx                      # Shell et machine d'état des écrans
│   ├── components/layout/           # TopBar (horloge, thème), SideNav
│   ├── features/
│   │   ├── caisse/                  # Écran de vente — ProductGrid, CartPanel
│   │   ├── paiement/                # Écran de paiement — addition partagée
│   │   ├── confirmation/            # Ticket post-paiement
│   │   ├── inventaire/              # Gestion du catalogue
│   │   ├── cloture/                 # Clôture Z
│   │   ├── historique/              # Historique des transactions
│   │   ├── tables/                  # Plan de salle, tickets par table
│   │   ├── cashiers/                # Écran de connexion, gestion caissiers
│   │   ├── session/                 # Store de session
│   │   ├── settings/                # Paramètres (onglets : établissement, matériel, conformité, à propos)
│   │   ├── customer-display/        # Écran client (second moniteur)
│   │   ├── print/                   # Modal et zone d'impression ESC/POS
│   │   ├── feedback/                # Modal retour développeur
│   │   └── updater/                 # Bannière de mise à jour
│   ├── lib/
│   │   ├── tauri.ts                 # Wrappers invoke() typés pour chaque commande Rust
│   │   └── utils.ts                 # formatCents(), cn(), computeTva()
│   └── types/                       # Interfaces TypeScript partagées
│
├── src-tauri/
│   ├── src/
│   │   ├── commands/                # Handlers Tauri (catalogue, caisse, transactions, compliance…)
│   │   ├── db/
│   │   │   ├── migrations/          # Migrations SQL ordonnées (001 → 013)
│   │   │   └── models/              # Structs sqlx FromRow
│   │   ├── nf525/                   # Logique chaîne de hachage + grands totaux
│   │   ├── printer/                 # Génération ESC/POS
│   │   └── lib.rs                   # Setup app, enregistrement des commandes
│   ├── capabilities/                # Permissions Tauri v2 (main + customer-display)
│   └── tauri.conf.json
│
└── docs/
    ├── GUIDE_UTILISATEUR.md         # Manuel utilisateur en français
    ├── ATTESTATION_NF525.md         # Template attestation de conformité
    └── ARCHITECTURE.md              # Notes d'architecture technique
```

---

## Migrations base de données

Les migrations s'appliquent automatiquement au démarrage via `sqlx::migrate!()`. Chaque fichier de `src-tauri/src/db/migrations/` est appliqué en ordre et tracé dans `_sqlx_migrations`.

Migrations clés :
- `001` — tables de base (sessions, journal, grands totaux)
- `004` — transactions et lignes de transaction
- `010` — salles et tables (plan de salle)
- `011` — tickets ouverts (tickets par table)
- `012` — caissiers, `cashier_id` et `station_id` sur les sessions
- `013` — compte responsable par défaut (PIN : `0000`)

---

## Gestion des caissiers

Au premier lancement, deux caissiers sont créés :
- **Caissier** — caissier par défaut, sans PIN
- **Manager** — rôle responsable, PIN `0000`

Pour gérer les caissiers (ajouter, modifier, supprimer, changer les PINs) : sur l'écran de connexion, cliquez sur **Gérer les caissiers** et saisissez le PIN responsable.

---

## Notes fiscales (NF525)

Ce logiciel cible la conformité NF525 pour le marché français :
- Chaque transaction `VENTE` et `AVOIR` est ajoutée à une chaîne de hachage SHA-256
- Le journal est append-only ; aucun enregistrement ne peut être modifié après création
- La commande `verify_chain` revalide toute la chaîne et signale le premier maillon cassé
- La clôture Z enregistre les grands totaux et verrouille la session
- L'export archive JSON permet de conserver l'intégralité des données fiscales 6 ans

> Ce logiciel est en cours de développement. La certification NF525 complète requiert un audit accrédité. Utilisation en production à vos risques.

---

## Soutenir le projet

LDC est gratuit et open-source. Si vous l'utilisez au quotidien : [ko-fi.com/aizogroove](https://ko-fi.com/aizogroove)
