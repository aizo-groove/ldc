# Attestation de conformité NF525

> **Document à compléter, signer et conserver** par l'établissement utilisateur.
> Ce document est requis lors d'un contrôle fiscal ou d'un audit.

---

## 1. Identification du logiciel

| Champ | Valeur |
|-------|--------|
| **Nom du logiciel** | LDC — Logiciel de Caisse |
| **Éditeur** | aizogroove |
| **Version** | *(indiquer le numéro de version utilisé)* |
| **Dépôt source** | https://github.com/aizo-groove/ldc |
| **Licence** | Open-source — voir `LICENSE` |

---

## 2. Identification de l'établissement

| Champ | Valeur |
|-------|--------|
| **Raison sociale** | |
| **Forme juridique** | |
| **SIRET** | |
| **Adresse** | |
| **Code postal / Ville** | |
| **N° TVA intracommunautaire** | *(si applicable)* |

---

## 3. Déclaration de conformité NF525

Je soussigné(e), ………………………………………………, agissant en qualité de ………………………………
de l'établissement identifié ci-dessus, atteste que :

1. **Le logiciel LDC** est utilisé comme logiciel de caisse enregistreuse dans mon établissement
   depuis le ………………………… (date de première utilisation).

2. **L'intégrité des données** est assurée par une chaîne de hachage SHA-256 conforme aux
   exigences de la norme NF525 : chaque transaction est enchaînée à la précédente par son
   empreinte cryptographique, rendant toute modification rétroactive détectable.

3. **Les clôtures journalières (Z)** sont réalisées à chaque fin de service et conservées dans
   la base de données SQLite locale.

4. **Les archives fiscales** au format JSON sont exportées régulièrement et conservées pendant
   une durée minimale de **6 ans** conformément à l'article L. 102 B du Livre des Procédures
   Fiscales (LPF).

5. **La base de données** (`ldc.db`) est sauvegardée régulièrement sur un support distinct
   (sauvegarde externe, NAS ou service cloud chiffré).

6. Je m'engage à fournir, sur demande de l'administration fiscale, les archives et journaux
   d'événements produits par LDC.

---

## 4. Mécanismes techniques de conformité

| Mécanisme | Description |
|-----------|-------------|
| **Chaîne de hachage** | SHA-256 sur `sequence_no + type + total_ttc + created_at + previous_hash` |
| **Valeur initiale** | `"GENESIS"` pour la première transaction |
| **Grand Total** | Cumul non réinitialisable des montants nets TTC par clôture |
| **Journal d'événements** | Table `journal_entries` — séquence immuable |
| **Horodatage** | UTC ISO-8601 avec précision milliseconde |
| **Stockage** | SQLite — `{app_data_dir}/ldc.db` |
| **Vérification** | Commande `verify_chain` accessible depuis Paramètres > Conformité NF525 |
| **Export** | Archive JSON complète exportable depuis Paramètres > Conformité NF525 |

---

## 5. Vérification de la chaîne

Pour vérifier l'intégrité de la chaîne à tout moment :

1. Ouvrir LDC
2. Aller dans **Paramètres** (icône ⚙️ dans la barre latérale)
3. Section **Conformité NF525**
4. Cliquer sur **Vérifier la chaîne**

Le résultat indique le nombre de transactions vérifiées. Toute rupture de chaîne est signalée
avec le numéro de séquence fautif.

---

## 6. Signature

Fait à ………………………………, le ………………………………

**Signature et cachet de l'établissement :**

```
_________________________________
Nom : 
Qualité : 
Date :
```

---

*Ce document ne constitue pas une certification officielle par un organisme tiers.
La norme NF525 prévoit la possibilité d'une auto-déclaration pour les logiciels
open-source sous réserve que les mécanismes techniques requis soient effectivement
en place. Consultez votre expert-comptable ou le service des impôts de votre
département pour toute question relative à votre situation particulière.*
