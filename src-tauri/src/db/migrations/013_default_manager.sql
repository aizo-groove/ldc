-- Insère un responsable par défaut avec le PIN 0000 si aucun manager n'existe.
-- L'utilisateur peut modifier ce PIN depuis l'écran de gestion des caissiers.
INSERT OR IGNORE INTO cashiers (id, name, pin, role)
VALUES ('cashier-manager-default', 'Manager', '0000', 'manager');
