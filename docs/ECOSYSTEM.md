# Écosystème LDC × FIDO

> Copie identique dans `docs/` de chaque dépôt. Source de vérité : `fidoweb/docs/ECOSYSTEM.md`.

## Modèle

LDC (caisse) est **gratuit et open-source** : c'est le produit d'appel. FIDO (fidélité) est **payant** (29 €/mois ou 279 €/an par SIRET) et s'active comme un module dans LDC. Tout ce qui rend le passage « LDC → FIDO » simple et désirable est prioritaire.

## Principe produit non négociable

**Aucune donnée personnelle du client final.** Le client est identifié uniquement par un identifiant de carte aléatoire (QR dans l'app FIDO). Ni LDC ni FIDO ne stockent de nom, e-mail ou téléphone de client final. Les données du *commerçant* (compte, SIRET, facturation) sont gérées par FidoWeb.

## Briques

| Dépôt | Produit | Stack | Public |
|---|---|---|---|
| `ldc` | Caisse, fonctionne hors ligne | Tauri v2, Rust, SQLite, React 18 | Commerçant, caissier |
| `fido` | App mobile fidélité | Flutter, Supabase | Client final |
| `fidoweb` | Portail d'abonnement commerçant | Next.js 15, Stripe, Supabase | Commerçant |
| `ldcweb` | Site vitrine LDC | Astro 4, Tailwind 3, Vercel | Prospects |

Backend partagé : projet Supabase `kyonrnuqklxhbtuwoind` (tables `merchants`, `loyalty_programs`, `customer_balances`, `subscriptions`, `merchant_credentials`, RPC `credit_transaction()`).

## Flux principaux

```
Commerçant ──(ldcweb)──► télécharge LDC (gratuit)
           ──(LDC, écran Paramètres → FIDO)──► « Activer la fidélité » ──► lien FidoWeb
           ──(FidoWeb)──► Stripe Checkout ──► reçoit partner_id + partner_secret (affiché une fois)
           ──(LDC)──► colle les identifiants ──► module FIDO actif

Client ──(app FIDO)──► affiche son QR ──► scanné par LDC à l'encaissement
LDC ──(API partenaire FIDO, voir FIDO_API_CONTRACT.md)──► crédite les points
App FIDO ──► affiche le nouveau solde
```

## Règles transverses

1. Le **contrat d'API** (`FIDO_API_CONTRACT.md`) est modifié par PR dans `fidoweb` **avant** toute implémentation côté `ldc` ou `fido`.
2. LDC doit continuer à encaisser si FIDO est injoignable (file d'attente locale, rejeu).
3. FIDO ne modifie **jamais** une transaction fiscale LDC. Une récompense utilisée devient une remise enregistrée par LDC dans sa chaîne NF525.
4. Les montants circulent en **centimes entiers** partout.
5. Les secrets ne quittent jamais le serveur en clair, sauf l'affichage unique dans FidoWeb.
