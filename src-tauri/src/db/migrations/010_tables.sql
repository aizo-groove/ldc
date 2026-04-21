CREATE TABLE IF NOT EXISTS rooms (
    id         TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name       TEXT    NOT NULL,
    color      TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS restaurant_tables (
    id         TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    room_id    TEXT    REFERENCES rooms(id) ON DELETE SET NULL,
    name       TEXT    NOT NULL,
    seats      INTEGER NOT NULL DEFAULT 4,
    shape      TEXT    NOT NULL DEFAULT 'square' CHECK (shape IN ('square', 'round', 'rect')),
    status     TEXT    NOT NULL DEFAULT 'libre'  CHECK (status IN ('libre', 'occupe', 'addition')),
    pos_x      INTEGER NOT NULL DEFAULT 100,
    pos_y      INTEGER NOT NULL DEFAULT 100,
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- Seed demo rooms
INSERT OR IGNORE INTO rooms (id, name, sort_order) VALUES
    ('room-terrasse', 'Terrasse',         1),
    ('room-salle',    'Salle Principale', 2);

-- Seed demo tables
INSERT OR IGNORE INTO restaurant_tables (id, room_id, name, seats, shape, pos_x, pos_y) VALUES
    ('tbl-t01', 'room-terrasse', 'T01', 4, 'square',  60,  60),
    ('tbl-t02', 'room-terrasse', 'T02', 2, 'round',  220,  50),
    ('tbl-t03', 'room-terrasse', 'T03', 8, 'rect',   390,  60),
    ('tbl-t04', 'room-terrasse', 'T04', 4, 'square', 640,  60),
    ('tbl-t05', 'room-salle',    'T05', 6, 'rect',    60,  60),
    ('tbl-t06', 'room-salle',    'T06', 4, 'square', 300,  60),
    ('tbl-t07', 'room-salle',    'T07', 4, 'round',  460,  55),
    ('tbl-t08', 'room-salle',    'T08', 4, 'square', 620,  60),
    ('tbl-t09', 'room-salle',    'B01', 6, 'rect',    60, 240),
    ('tbl-t10', 'room-salle',    'B02', 6, 'rect',   300, 240);
