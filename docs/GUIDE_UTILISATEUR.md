# LDC Caisse — Guide Utilisateur

## À propos de ce logiciel

LDC Caisse est un logiciel de point de vente conforme à la norme fiscale française **NF525** (obligatoire depuis 2018). Il fonctionne **entièrement hors ligne** : aucune connexion internet requise pour encaisser. Toutes les données sont stockées localement et protégées contre toute modification frauduleuse par une chaîne de hachage cryptographique.

---

## Premier lancement — Assistant de configuration

Lors du tout premier démarrage (ou sur une installation vierge), LDC affiche un **assistant en 5 étapes** avant d'ouvrir la caisse :

| Étape | Contenu |
|-------|---------|
| **Bienvenue** | Présentation du logiciel |
| **Type de commerce** | Restaurant, Café/Bar ou Commerce — adapte l'interface |
| **Établissement** | Nom du commerce (obligatoire) et SIRET (optionnel) |
| **Imprimante** | Adresse IP et port de l'imprimante thermique (optionnel — "Configurer plus tard") |
| **C'est parti !** | Résumé des paramètres saisis, option visite guidée, bouton pour ouvrir la caisse |

Sur la dernière étape, une case **Démarrer la visite guidée** est cochée par défaut. Si vous la laissez cochée, la visite guidée se lance automatiquement une fois votre premier caissier créé.

Après l'assistant, l'écran de connexion s'affiche pour créer votre premier caissier.

> L'assistant ne s'affiche **qu'une seule fois** : dès que le nom du commerce est renseigné et qu'un caissier existe, il ne réapparaît plus.

---

## Visite guidée interactive

La visite guidée présente les fonctionnalités principales du logiciel en 7 à 8 étapes illustrées :

| Étape | Ce qui est mis en avant |
|-------|------------------------|
| Introduction | Présentation générale |
| Navigation | Le menu latéral et ses sections |
| Catalogue | Le panneau des produits et les catégories |
| Panier | La colonne panier, les quantités, les totaux |
| Encaisser | Le bouton PAYER et l'écran de paiement |
| Plan de salle *(restaurant/café uniquement)* | Gestion des tables en direct |
| Historique | Consultation des ventes passées |
| Inventaire | Gestion du catalogue produits |
| Paramètres | Configuration de l'imprimante et du profil |

**Relancer la visite guidée** : allez dans **Paramètres → À propos**, puis cliquez sur **Relancer la visite guidée**. Vous pouvez l'interrompre à tout moment avec le bouton **Terminer**.

---

## Démarrage rapide

Au lancement du logiciel, un écran de connexion vous invite à choisir un caissier. La première fois, un compte **Manager** (PIN `0000`) est disponible — créez vos propres caissiers via **Gérer les caissiers**.

La barre de navigation à gauche donne accès aux modules principaux :

| Icône | Module | Usage |
|-------|--------|-------|
| Panier | **Vente** | Encaisser un client |
| Horloge | **Historique** | Consulter les transactions passées |
| Boîte | **Inventaire** | Gérer le catalogue produits |
| Grille | **Tables** | Plan de salle et tickets par table *(restaurant/café)* |
| Cadenas | **Clôture** | Fermer la journée (clôture Z) |
| Engrenage | **Paramètres** | Configurer le logiciel et les appareils |

> Le module **Tables** n'apparaît que si le profil sélectionné est **Restaurant** ou **Café**.

---

## 1. Encaisser un client

### Ajouter des articles

L'écran de vente est divisé en deux zones :

- **À droite** : le catalogue produits, organisé par catégories. Tapez sur un produit pour l'ajouter au panier.
- **À gauche** : le panier en cours, avec le détail des lignes et le total TTC.

Pour filtrer par catégorie, tapez sur le nom de la catégorie en haut du catalogue. Pour revenir à l'affichage complet, tapez sur "Tous".

### Gestion du stock à la caisse

Lorsqu'un produit est suivi en stock, le logiciel vérifie la disponibilité **à chaque ajout**. Si le stock est insuffisant, un message d'alerte s'affiche et l'article n'est pas ajouté.

### Modifier les quantités dans le panier

Dans la colonne de gauche, chaque article affiche des boutons **+** et **−**. Le bouton **−** sur une quantité de 1 supprime la ligne.

### Lancer le paiement

Quand le panier est prêt, tapez le bouton **PAYER** en bas du panier.

---

## 2. Écran de paiement

### Choisir le moyen de paiement

Moyens disponibles : **Carte bancaire**, **Espèces**, **Chèque**, **Virement**, **Avoir**, **Titre-restaurant**, **Autre**.

### Paiement en espèces

Utilisez le pavé numérique pour saisir la somme remise par le client. Le logiciel calcule automatiquement la **monnaie à rendre**. Le bouton **Montant exact** remplit le champ avec le total pile.

### Paiement partagé (addition divisée)

Deux méthodes :

- **Par personne** : tapez **Personne suivante** pour diviser entre plusieurs personnes. Chacune peut payer avec un moyen différent et un montant différent.
- **Parts égales** : le bouton **Partager la note** divise automatiquement le total en N parts et génère une entrée de paiement par part.

> Cette fonctionnalité est disponible pour tous les profils.

### Valider

Tapez **VALIDER & IMPRIMER** pour enregistrer la transaction. Elle est immédiatement sécurisée dans la base de données et le stock est automatiquement mis à jour.

---

## 3. Écran de confirmation

Après validation, un écran de confirmation affiche :

- Le numéro et la date de la transaction
- Le total encaissé et les moyens de paiement utilisés
- La monnaie rendue (si espèces)
- Un bouton **Imprimer le ticket** (si une imprimante thermique est configurée)

Tapez **Nouvelle vente** pour revenir immédiatement à l'écran de vente.

---

## 4. Gestion des tables *(Restaurant / Café)*

### Plan de salle

L'écran affiche votre plan de salle avec toutes les tables positionnées. Chaque table est colorée selon son statut :

| Couleur | Statut | Signification |
|---------|--------|---------------|
| Vert (bordure) | **Libre** | Table disponible |
| Rouge (fond + badge) | **Occupé** | Table avec un ticket ouvert |
| Bleu (fond + badge) | **Addition** | Table en attente de paiement |

### Naviguer entre les salles

Si votre établissement a plusieurs salles, les onglets en haut permettent de basculer. L'onglet **Toutes les salles** affiche l'ensemble.

### Ouvrir, modifier, encaisser un ticket

Tapez sur une table pour ouvrir son ticket. Ajoutez des articles depuis le catalogue intégré, modifiez les quantités, puis :

- **Enregistrer** — sauvegarde le ticket sans encaisser. La table passe à **Occupé** et le ticket survit à une fermeture du logiciel.
- **Régler** — passe à l'écran de paiement avec le panier pré-chargé. Après validation, le ticket est supprimé et la table repasse à **Libre**.

### Modifier le plan de salle

Tapez **Modifier le plan** pour entrer en mode édition : glissez-déposez les tables, ajoutez/supprimez des tables et des salles. Tapez **Terminer l'édition** pour sauvegarder.

---

## 5. Gestion du catalogue (Inventaire)

### Consulter et filtrer les produits

Le tableau liste tous les produits avec SKU, nom, catégorie, prix TTC, TVA et stock. Quatre filtres : **Tous**, **Actifs**, **Inactifs**, **Rupture**.

### Ajouter ou modifier un produit

Le bouton **+ Nouveau produit** ouvre un formulaire. Renseignez le nom, SKU, catégorie, taux de TVA, prix TTC et, optionnellement, activez le suivi de stock avec la quantité initiale.

### Désactiver un produit

Le bouton **Supprimer** (icône poubelle) désactive le produit — il disparaît de la caisse mais reste visible dans l'inventaire avec le filtre **Inactifs**. Les transactions historiques restent intactes.

---

## 6. Clôture Z (fermeture de journée)

La clôture Z est l'opération de **fin de journée**, **obligatoire** et **irréversible** (exigence NF525).

### Contenu de l'écran de clôture

- **Ventilation TVA** : chiffre d'affaires par taux (5,5 %, 10 %, 20 %) avec TVA collectée et base HT
- **Réconciliation paiements** : totaux CB, espèces, chèques
- **Recomptage caisse** : saisissez le montant physiquement compté — l'écart est calculé et enregistré pour traçabilité

### Valider la clôture

Tapez **VALIDER LA CLÔTURE ET ARCHIVER**. Le logiciel :
1. Verrouille définitivement la session
2. Génère un enregistrement certifié NF525 avec hash
3. Cumule les grands totaux depuis l'ouverture du commerce
4. Revient à l'écran de vente, prêt pour la prochaine journée

> Cette action est irréversible — c'est précisément ce qui garantit la conformité fiscale.

---

## 7. Paramètres

Accessible depuis l'icône **Engrenage** dans la barre latérale. Les paramètres sont organisés en **quatre onglets**.

### Onglet Établissement

**Informations de l'établissement**
Renseignez le nom, l'adresse, la forme juridique, le SIRET, le N° TVA intracommunautaire, le téléphone et le site web. Ces informations apparaissent sur tous les tickets et rapports Z.

> Le SIRET est obligatoire sur les tickets de caisse (article L441-9 du Code de commerce).

**Profil commercial**
Trois profils disponibles :

| Profil | Fonctionnalités |
|--------|----------------|
| **Restaurant** | Plan de salle, tickets par table, addition partagée |
| **Café / Bar** | Plan de salle, tickets par table, addition partagée |
| **Commerce / Épicerie** | Alertes de rupture de stock |

### Onglet Matériel

Gérez tous vos appareils depuis un panneau unique. Sélectionnez un appareil dans la grille pour afficher sa configuration.

**Imprimante thermique**
Renseignez l'adresse IP et le port (par défaut 9100) de votre imprimante réseau. Choisissez la largeur du papier (58 ou 80 mm). Le bouton **Tester la connexion** imprime une page de test.

**Tiroir-caisse**
Connecté à l'imprimante via le connecteur RJ-11. Activez le tiroir, choisissez le connecteur (Pin 2 le plus courant), et configurez l'ouverture automatique à chaque vente en espèces. Testez l'ouverture avec le bouton dédié.

**Scanner de codes-barres**
Les scanners USB en mode HID fonctionnent nativement — aucune configuration requise. Branchez le scanner et scannez directement dans le champ de recherche produit.

**Terminal de paiement CB**
Renseignez le modèle et le numéro de série pour vos archives. L'intégration automatique des terminaux est prévue dans une version future.

**Écran client**
Affiche le panier en cours et le total TTC sur un second moniteur face au client. Branchez un second écran, activez l'option, puis utilisez les boutons **Ouvrir / Fermer l'écran**. L'écran s'ouvre automatiquement à chaque démarrage si l'option est activée.

### Onglet Conformité NF525

**Vérification de la chaîne**
Lance un audit complet de la chaîne de hachage SHA-256. Le résultat indique le nombre de transactions vérifiées. Toute rupture de chaîne est signalée avec le numéro de séquence exact.

**Export archive fiscale**
Télécharge l'intégralité des données fiscales (sessions, transactions, lignes, paiements, journal) au format JSON. À conserver **6 ans** minimum (obligation NF525 / LPF art. L102 B).

**Base de données SQLite**
Affiche le chemin exact du fichier `ldc.db`. Copiez ce chemin pour configurer votre sauvegarde (Time Machine, NAS, cloud chiffré). Le bouton **Ouvrir dans le Finder** ouvre directement le dossier.

**Attestation de conformité**
Télécharge une attestation pré-remplie avec les informations de votre établissement au format HTML. Ouvrez le fichier dans votre navigateur pour l'imprimer ou l'enregistrer en PDF.

### Onglet À propos

- **Caissiers** — renvoi vers l'écran de connexion pour la gestion des comptes
- **Soutenir le projet** — lien Ko-fi pour supporter le développement
- **Retour développeur** — formulaire pour envoyer un bug ou une suggestion

---

## 8. Écran client (second moniteur)

L'écran client est une fenêtre distincte conçue pour être affichée sur un moniteur tourné vers le client.

**Ce qu'il affiche :**
- **En attente** : nom de l'établissement + heure en temps réel
- **Panier actif** : liste des articles avec quantité et prix, total TTC en grand format
- **Après paiement** : écran "Merci !" avec le montant payé pendant 4 secondes, puis retour à l'écran d'attente

La mise à jour est instantanée : dès qu'un article est ajouté ou retiré du panier, l'écran client se met à jour automatiquement.

Pour l'activer : **Paramètres → Matériel → Écran client**.

---

## 9. Historique des transactions

Accessible depuis l'icône **Horloge** dans la navigation.

L'historique affiche toutes les transactions des sessions passées. Tapez sur une transaction pour voir le détail (lignes, paiements, hash NF525). Un bouton **Imprimer** permet de réimprimer un ticket à tout moment.

Le **Rapport X** affiche le récapitulatif de la session en cours sans la clôturer.

---

## Questions fréquentes

**Le logiciel peut-il fonctionner sans internet ?**
Oui. LDC Caisse fonctionne entièrement hors ligne. Une connexion internet n'est nécessaire que pour les mises à jour automatiques.

**Que se passe-t-il si le logiciel se ferme en plein milieu d'une vente directe ?**
Le panier en cours n'est pas sauvegardé (il n'est pas encore enregistré comme transaction). Vous devrez resaisir les articles. En revanche, toutes les transactions déjà validées sont sécurisées.

**Que se passe-t-il si le logiciel se ferme avec un ticket de table ouvert ?**
Les tickets de table sont sauvegardés en base de données. Au prochain lancement, les tables conservent leurs articles intacts.

**Le stock se décrémente-t-il automatiquement ?**
Oui, pour les produits dont le suivi de stock est activé. Chaque vente validée décrémente le stock. En cas de rupture, le logiciel bloque l'ajout avant même l'écran de paiement.

**Puis-je annuler une transaction ?**
La fonction avoir (remboursement) est prévue dans une version prochaine.

**Le logiciel est-il conforme NF525 ?**
LDC Caisse implémente la chaîne de hachage SHA-256 obligatoire, le journal d'audit immuable et la clôture Z certifiée conformément à l'article 88 de la loi de finances 2016. Une attestation de conformité est disponible depuis **Paramètres → Conformité NF525**.

**Comment sauvegarder mes données ?**
Utilisez **Paramètres → Conformité NF525 → Base de données SQLite** pour localiser le fichier `ldc.db` et configurez votre outil de sauvegarde habituel (Time Machine recommandé sur macOS).

**macOS affiche « LDC est endommagé » à l'installation.**
Il s'agit d'une restriction Gatekeeper pour les applications non notarisées par Apple. Dans le Terminal, exécutez :
```bash
xattr -cr /Applications/LDC.app
```
Puis relancez l'application normalement.

---

## En cas de problème

Utilisez le bouton **Envoyer un retour** dans **Paramètres → À propos** pour signaler un bug ou faire une suggestion directement au développeur. Indiquez si possible :
- Le numéro de la dernière transaction (visible sur l'écran de confirmation)
- La date et l'heure de l'incident
- Un descriptif de ce qui s'est passé
