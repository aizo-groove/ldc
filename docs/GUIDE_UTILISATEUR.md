# LDC Caisse — Guide Utilisateur

## À propos de ce logiciel

LDC Caisse est un logiciel de point de vente certifié **NF525**, la norme fiscale française obligatoire depuis 2018. Il fonctionne **entièrement hors ligne** : pas besoin de connexion internet pour encaisser. Toutes les données sont stockées localement et sécurisées contre toute modification frauduleuse.

---

## Démarrage rapide

Au lancement du logiciel, une session de caisse s'ouvre automatiquement. Vous pouvez commencer à encaisser immédiatement.

La barre de navigation à gauche donne accès aux modules principaux :

| Icône | Module | Usage |
|---|---|---|
| Panier | **Vente** | Encaisser un client |
| Horloge | **Historique** | Consulter les transactions passées |
| Boîte | **Inventaire** | Gérer le catalogue produits |
| Grille | **Tables** | Plan de salle et tickets par table *(restaurant/café)* |
| Cadenas | **Clôture** | Fermer la journée (clôture Z) |
| Engrenage | **Paramètres** | Configurer le profil du commerce |

> Le module **Tables** n'apparaît que si le profil sélectionné est **Restaurant** ou **Café**.

---

## 1. Encaisser un client

### Ajouter des articles

L'écran de vente est divisé en deux zones :

- **À droite** : le catalogue produits, organisé par catégories. Tapez sur un produit pour l'ajouter au panier.
- **À gauche** : le panier en cours, avec le détail des lignes et le total TTC.

Pour filtrer par catégorie, tapez sur le nom de la catégorie en haut du catalogue. Pour revenir à l'affichage complet, tapez sur "Tous".

### Gestion du stock à la caisse

Lorsqu'un produit est suivi en stock, le logiciel vérifie la disponibilité **à chaque ajout**. Si le stock est insuffisant pour la quantité demandée, un message d'alerte s'affiche dans le panier et l'article n'est pas ajouté. La même vérification s'applique lorsque vous augmentez la quantité d'une ligne déjà dans le panier avec le bouton **+**.

### Modifier les quantités dans le panier

Dans la colonne de gauche, chaque article affiche des boutons **+** et **−**. Le bouton **−** sur une quantité de 1 supprime la ligne.

### Lancer le paiement

Quand le panier est prêt, tapez le bouton **PAYER** en bas du panier. Le total TTC à encaisser s'affiche.

---

## 2. Écran de paiement

### Choisir le moyen de paiement

Trois moyens sont disponibles : **Carte bancaire**, **Espèces**, **Chèque**. Tapez sur le bouton correspondant.

### Saisie du montant (paiement en espèces)

Pour un paiement en espèces, utilisez le pavé numérique pour saisir la somme remise par le client. Le logiciel calcule automatiquement la **monnaie à rendre**.

Le bouton **Montant exact** remplit automatiquement le champ avec le total exact — pratique quand le client paye pile.

### Paiement partagé (addition divisée)

Le bouton **Personne suivante** permet de diviser l'addition entre plusieurs personnes. Chaque personne peut payer avec un moyen différent et un montant différent. Le logiciel suit le solde restant et indique quand l'addition est soldée.

> Cette fonctionnalité est disponible pour les profils **Restaurant** et **Café**.

### Valider

Tapez **VALIDER** pour enregistrer la transaction. Elle est immédiatement sécurisée dans la base de données et le stock des produits concernés est automatiquement mis à jour.

### Annuler

Le bouton **Retour** annule le paiement en cours et revient à l'écran de vente avec le panier intact.

---

## 3. Écran de confirmation

Après validation, un écran de confirmation s'affiche avec :

- Le numéro de la transaction
- Le total encaissé
- Le(s) moyen(s) de paiement utilisé(s)
- La monnaie rendue (si espèces)

Trois options sont proposées :
- **Ticket papier** — impression sur imprimante thermique (si configurée)
- **Ticket par e-mail** — envoi électronique (si configuré)
- **Pas de ticket** — passe directement à la vente suivante

Après 5 secondes, le logiciel revient automatiquement à l'écran de vente.

---

## 4. Gestion des tables *(Restaurant / Café)*

Accessible depuis l'icône **Grille** dans la navigation.

### Plan de salle

L'écran affiche le plan de votre établissement avec toutes les tables positionnées. Chaque table est colorée selon son statut :

| Couleur | Statut | Signification |
|---|---|---|
| Vert (bordure) | **Libre** | Table disponible |
| Rouge (fond + badge) | **Occupé** | Table avec un ticket ouvert |
| Bleu (fond + badge) | **Addition** | Table en attente de paiement |

Une barre de statistiques en haut indique le nombre de tables libres, occupées et en attente, ainsi que le nombre de places disponibles.

### Naviguer entre les salles

Si votre établissement a plusieurs salles (terrasse, salle principale…), les onglets en haut du plan permettent de basculer entre elles. L'onglet **Toutes les salles** affiche l'ensemble des tables.

### Ouvrir un ticket sur une table

Tapez sur une table pour ouvrir son ticket. L'écran se divise en deux parties :

- **À gauche** : le ticket de la table (articles, quantités, total)
- **À droite** : la carte produits pour ajouter des articles

Vous pouvez modifier les quantités directement dans le ticket avec les boutons **+** et **−**.

### Enregistrer un ticket (en attente)

Tapez **Enregistrer** pour sauvegarder le ticket sans encaisser. La table passe au statut **Occupé** et le ticket est conservé en base de données — il survit à une fermeture du logiciel.

Si vous videz entièrement le ticket avant d'enregistrer, la table repasse automatiquement à **Libre**.

### Encaisser un ticket de table

Tapez **Régler** pour passer à l'écran de paiement. Le panier est automatiquement chargé avec les articles du ticket. Après validation du paiement, le ticket est supprimé et la table repasse à **Libre**.

### Modifier le plan de salle (mode édition)

Tapez le bouton **Modifier le plan** en haut à droite pour entrer en mode édition. Dans ce mode :

- **Déplacer une table** : glissez-déposez la table à l'emplacement souhaité
- **Ajouter une table** : bouton **+ Ajouter une table**
- **Modifier / supprimer une table** : survolez la table pour faire apparaître les icônes crayon et poubelle
- **Gérer les salles** : renommez ou supprimez des salles depuis les onglets ; ajoutez une salle avec **+ Salle**

Tapez **Terminer l'édition** pour quitter le mode édition. Les positions sont sauvegardées automatiquement.

---

## 5. Gestion du catalogue (Inventaire)

Accessible depuis l'icône **Boîte** dans la navigation.

### Consulter les produits

Le tableau liste tous les produits, y compris les produits désactivés. Les produits inactifs apparaissent en grisé avec un badge **Inactif** et leur nom barré.

Colonnes affichées : SKU, nom, catégorie, prix TTC, TVA, stock (quantité ou "—" si non suivi).

### Filtrer par statut

Quatre filtres permettent de trier l'affichage :
- **Tous** — tous les produits (actifs + inactifs)
- **Actifs** — produits disponibles à la vente
- **Inactifs** — produits désactivés (supprimés logiquement)
- **Rupture** — produits suivis en stock dont la quantité est à zéro ou négative

### Statistiques

Quatre indicateurs en haut de page donnent une vue rapide :
- **Total Actifs** : nombre de références actives
- **Catégories** : nombre de catégories
- **Rupture Stock** : nombre de produits en rupture
- **Valeur Stock** : valeur totale du stock aux prix de vente TTC

### Ajouter ou modifier un produit

Le bouton **+ Nouveau produit** ouvre un formulaire. Renseignez :
- Nom, SKU (référence), catégorie, taux de TVA
- Prix TTC (le prix HT est calculé automatiquement)
- **Suivi du stock** : activez cette option pour décrémenter le stock à chaque vente. Saisissez la quantité initiale.

### Désactiver un produit

Le bouton **Supprimer** (icône poubelle) désactive le produit — il n'apparaît plus dans la caisse ni dans les grilles de sélection, mais reste visible dans l'inventaire avec le filtre **Inactifs**. Les transactions historiques restent intactes. Une confirmation est demandée avant la désactivation.

---

## 6. Clôture Z (fermeture de journée)

La clôture Z est l'opération de **fin de journée**. Elle est **obligatoire** et **irréversible** — c'est une exigence de la norme NF525.

### Quand faire la clôture ?

En fin de service, avant de fermer le logiciel pour la nuit, ou à chaque changement de journée fiscale.

### Que contient l'écran de clôture ?

L'écran récapitule toute l'activité de la session :

**Ventilation TVA**
Le tableau décompose le chiffre d'affaires par taux de TVA (5,5%, 10%, 20%), avec pour chacun le montant de TVA collectée et la base hors taxe correspondante.

**Réconciliation des paiements**
Trois encadrés affichent le total encaissé par moyen de paiement : Carte bancaire, Espèces, Chèques.

**Recomptage caisse**
Avant de valider, comptez physiquement les billets et pièces dans votre tiroir-caisse. Saisissez le montant compté dans le champ prévu.
- Si le montant compté correspond au montant théorique, l'**écart de caisse** affiche **0,00 €** en vert.
- Un écart positif (surplus) s'affiche en bleu.
- Un écart négatif (manque) s'affiche en rouge.

> L'écart de caisse est normal dans la pratique (erreurs de rendu, faux billets…). Il est enregistré dans le rapport pour traçabilité.

### Valider la clôture

Tapez le bouton **VALIDER LA CLÔTURE ET ARCHIVER**. Le logiciel :
1. Verrouille définitivement la session
2. Génère un enregistrement certifié NF525
3. Calcule les grands totaux cumulés depuis l'ouverture du commerce
4. Revient automatiquement à l'écran de vente, prêt pour la prochaine journée

**Attention** : cette action est irréversible. Une fois validée, il est impossible de modifier les données de la journée. C'est précisément ce qui garantit la conformité fiscale du logiciel.

---

## 7. Paramètres — Profil du commerce

Accessible depuis l'icône **Engrenage** en bas de la navigation.

### Choisir un profil

Trois profils sont disponibles :

| Profil | Fonctionnalités activées |
|---|---|
| **Restaurant** | Plan de salle, tickets par table, addition partagée |
| **Café / Bar** | Plan de salle, tickets par table, addition partagée |
| **Commerce / Épicerie** | Alertes de rupture de stock |

Le profil se change en tapant sur la carte correspondante. Le changement est immédiat et modifie la navigation et les fonctionnalités disponibles.

---

## Questions fréquentes

**Le logiciel peut-il fonctionner sans internet ?**
Oui. LDC Caisse fonctionne entièrement hors ligne. Toutes les données sont stockées localement sur votre appareil.

**Que se passe-t-il si le logiciel se ferme en plein milieu d'une vente directe ?**
Le panier en cours n'est pas sauvegardé (il n'a pas encore été enregistré comme transaction). Vous devrez resaisir les articles. En revanche, toutes les transactions déjà validées sont sécurisées et ne peuvent pas être perdues.

**Que se passe-t-il si le logiciel se ferme avec un ticket de table ouvert ?**
Les tickets de table sont sauvegardés en base de données. Au prochain lancement, les tables occupées conservent leurs articles intacts.

**Le stock se décrémente-t-il automatiquement ?**
Oui, pour les produits dont le suivi de stock est activé. Chaque vente validée décrémente le stock des articles vendus. En cas de rupture, le logiciel bloque l'ajout de l'article au panier avant même d'aller à l'écran de paiement.

**Puis-je annuler une transaction ?**
La fonction d'avoir (remboursement) est prévue dans une version prochaine. En attendant, contactez votre responsable.

**Le logiciel est-il conforme NF525 ?**
Oui. LDC Caisse implémente la chaîne de hachage SHA-256 obligatoire sur toutes les transactions, le journal d'audit immuable, et la clôture Z certifiée conformément à l'article 88 de la loi de finances 2016.

**Comment sauvegarder mes données ?**
Les données sont dans la base locale de l'application. Votre responsable technique peut configurer une sauvegarde automatique ou la synchronisation cloud (option payante).

---

## En cas de problème

Contactez votre responsable ou le support technique en fournissant :
- Le numéro de la dernière transaction (visible sur l'écran de confirmation)
- La date et l'heure de l'incident
- Un descriptif de ce qui s'est passé
