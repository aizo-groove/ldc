# ldc

Voir README.md pour la présentation du projet.

---

## Règles pour les agents

> Section ajoutée par le kit agents. Le reviewer vérifie chaque point.

1. Lire `docs/ECOSYSTEM.md` avant toute tâche ; `docs/FIDO_API_CONTRACT.md` pour tout ce qui touche FIDO.
2. Une issue = une PR = moins de ~400 lignes de diff. Sinon, s'arrêter et proposer un découpage.
3. Montants en centimes entiers ; `formatCents()` seul point de conversion.
4. Migrations : ajout uniquement, jamais de modification d'une migration existante.
5. NF525 : code de `src-tauri/src/nf525/` et tables fiscales modifiables uniquement avec le label `area:nf525`. Test `verify_chain` obligatoire.
6. Hors ligne d'abord : aucune fonctionnalité d'encaissement ne dépend du réseau.
7. Aucune donnée personnelle de client final, aucun secret dans les logs.
8. Commandes de vérification : `cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo test` (dans `src-tauri/`), `npx tsc --noEmit`.
