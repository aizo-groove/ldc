-- Caissiers (opérateurs de caisse)
-- PIN optionnel stocké en clair (accountability simple, pas d'auth forte).
-- role : 'cashier' ou 'manager' (prévu pour futures restrictions d'accès).

CREATE TABLE IF NOT EXISTS cashiers (
    id         TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name       TEXT    NOT NULL,
    pin        TEXT,                         -- NULL = pas de PIN
    role       TEXT    NOT NULL DEFAULT 'cashier' CHECK (role IN ('cashier', 'manager')),
    active     INTEGER NOT NULL DEFAULT 1    CHECK (active IN (0, 1)),
    created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Rattache un caissier à chaque session
ALTER TABLE sessions ADD COLUMN cashier_id TEXT REFERENCES cashiers(id);

-- Identifiant de la station (poste de caisse).
-- Sur un setup mono-poste la valeur est toujours 'main'.
-- Prévu pour un futur mode multi-postes sans changer le schéma.
ALTER TABLE sessions ADD COLUMN station_id TEXT NOT NULL DEFAULT 'main';

-- Caissier par défaut (premier lancement)
INSERT OR IGNORE INTO cashiers (id, name, role) VALUES
    ('cashier-default', 'Caissier', 'cashier');
