# Contrat d'API partenaire FIDO — v0 (BROUILLON)

> Statut : **brouillon à valider par le mainteneur**. Les points marqués 🟠 sont des décisions ouvertes : à transformer en issues `needs:human` dans `fidoweb`.
> Toute modification passe par une PR sur ce fichier dans `fidoweb`, avant les implémentations.

## 1. Périmètre

API appelée par un logiciel de caisse partenaire (LDC en premier, d'autres plus tard) pour lire un solde et créditer/débiter des points. Exposée par une edge function Supabase : `https://<project>.supabase.co/functions/v1/partner/v1/...`

## 2. Authentification

```
Authorization: Bearer <partner_id>.<partner_secret>
```
Le serveur calcule `sha256(partner_secret)` et le compare (temps constant) à `merchants.partner_secret_hash` du marchand `partner_id`, puis vérifie qu'un abonnement `subscriptions` est actif.

🟠 **Décision A — stockage du secret.** FidoWeb pousse aujourd'hui un secret d'edge function par marchand (`PARTNER_SECRET_<ID>`) via l'API Management. Recommandation : abandonner ce mécanisme au profit de la vérification du hash ci-dessus.
- Il ne passe pas à l'échelle (un secret d'environnement par commerçant, redéploiement à chaque ajout).
- Il oblige le webhook Stripe à détenir un token Management Supabase, qui donne la main sur tout le projet.
- Le hash est déjà en base, donc rien d'autre n'est nécessaire.

## 3. Identification du client (sans donnée personnelle)

Le QR affiché par l'app FIDO encode : `fido:v1:<card_id>` où `card_id` = 128 bits aléatoires (base64url). LDC ne voit que ce `card_id`.

🟠 **Décision B — QR statique ou tournant.** Un QR statique peut être photographié et réutilisé. Option : QR tournant (TOTP 60 s signé côté app). Recommandation : statique pour la v1, tournant en v2.

## 4. Endpoints

Tous en JSON, montants en **centimes entiers**, dates ISO 8601 UTC.

### `GET /v1/status`
Vérifie les identifiants et l'abonnement.
```json
200 { "merchant_name": "Café du Port", "subscription": "active", "programs": [{ "id": "…", "name": "1 café offert / 10", "kind": "stamps" }] }
```

### `POST /v1/cards/lookup`
```json
{ "card_token": "fido:v1:…" }
200 { "card_id": "…", "balance": 7, "unit": "stamps", "rewards_available": [{ "id": "…", "label": "Café offert", "cost": 10 }] }
```

### `POST /v1/earn`
Crédite des points après une vente **déjà enregistrée** dans LDC.
```json
{
  "idempotency_key": "uuid-v4",
  "card_token": "fido:v1:…",
  "pos_ticket_ref": "LDC-<transaction_id>",
  "amount_cents": 1250,
  "occurred_at": "2026-10-09T09:12:00Z"
}
200 { "credited": 1, "balance": 8 }
```
Le calcul des points est fait **côté serveur** à partir de `loyalty_programs` (LDC ne connaît pas les règles).

### `POST /v1/redeem`
Consomme une récompense. LDC l'appelle **avant** de finaliser le ticket, puis ajoute la remise correspondante comme ligne de ticket (chaîne NF525).
```json
{ "idempotency_key": "uuid-v4", "card_token": "fido:v1:…", "reward_id": "…", "pos_ticket_ref": "LDC-…" }
200 { "redemption_id": "…", "discount": { "kind": "item" | "amount_cents", "value": 0 }, "balance": 0 }
```

### `POST /v1/redeem/{redemption_id}/cancel`
Si la vente est annulée avant paiement.

## 5. Hors ligne et rejeu

- LDC stocke chaque appel `earn` dans une table locale `fido_outbox` et le rejoue jusqu'au succès.
- `idempotency_key` garantit qu'un rejeu ne crédite jamais deux fois (409 → considéré comme succès).
- `redeem` exige d'être en ligne : sans réseau, LDC n'affiche pas les récompenses.
- 🟠 **Décision C — délai de rejeu accepté** (`occurred_at` max dans le passé). Proposition : 7 jours.

## 6. Erreurs

```json
{ "error": { "code": "subscription_inactive", "message": "…" } }
```
| HTTP | code |
|---|---|
| 401 | `invalid_credentials` |
| 402 | `subscription_inactive` |
| 404 | `card_not_found`, `reward_not_found` |
| 409 | `duplicate_request` (idempotence) |
| 422 | `insufficient_balance`, `invalid_payload`, `too_old` |
| 429 | `rate_limited` |

## 7. Versionnement

Préfixe `/v1`. Ajout de champ = compatible. Suppression/renommage = `/v2`, ancienne version maintenue 6 mois.
