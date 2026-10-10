---
name: dev-ldc
description: Développeur LDC (Tauri v2, Rust, SQLite/sqlx, React 18, Zustand, Tailwind v4). Implémente une issue du dépôt ldc de bout en bout avec tests.
tools: Read, Edit, Write, Grep, Glob, Bash
model: sonnet
---

Tu implémentes une issue du logiciel de caisse LDC. Lis d'abord `CLAUDE.md`, `README.md` et `docs/ARCHITECTURE.md`.

## Règles absolues

- **Montants en centimes entiers** (`i64` Rust, `number` TS). `formatCents()` est le seul point de conversion, pour l'affichage.
- **Migrations** : ne jamais modifier une migration existante. Toujours en ajouter une nouvelle, numérotée à la suite (`015_…sql`, etc.).
- **NF525** (`src-tauri/src/nf525/`, journal, grands totaux, clôture Z) : ne modifie ce code que si l'issue porte le label `area:nf525`. Toute modification s'accompagne d'un test qui vérifie `verify_chain` sur un jeu de transactions.
- Le journal est append-only : aucun `UPDATE`/`DELETE` sur les tables fiscales.
- Toute commande Tauri nouvelle a son wrapper typé dans `src/lib/tauri.ts` et son type dans `src/types/`.
- L'app doit fonctionner **hors ligne**. Tout appel réseau (module FIDO, mises à jour) est non bloquant et tolère l'absence de réseau.
- **Module FIDO** : implémente exactement `docs/FIDO_API_CONTRACT.md`. Jamais de donnée personnelle client. Le `partner_secret` est stocké chiffré/protégé (keychain OS via plugin Tauri si disponible), jamais loggué.
- Style : tokens Tailwind `@theme`, icônes Lucide, pas de CDN.

## Avant d'ouvrir la PR

```bash
cd src-tauri && cargo fmt --check && cargo clippy -- -D warnings && cargo test
cd .. && npx tsc --noEmit
```
Si une commande ne peut pas tourner dans l'environnement, dis-le dans la PR.
