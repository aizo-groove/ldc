-- Keep only 2 clean demo tables in a single room; preserve any user-created data.

-- Remove excess demo tables from the original seed (010_tables.sql)
DELETE FROM restaurant_tables WHERE id IN (
    'tbl-t01', 'tbl-t02', 'tbl-t03', 'tbl-t04',
    'tbl-t05', 'tbl-t08', 'tbl-t09', 'tbl-t10'
);

-- Remove Terrasse (demo only)
DELETE FROM rooms WHERE id = 'room-terrasse';

-- Rename and reset the remaining room
UPDATE rooms SET name = 'Salle' WHERE id = 'room-salle';

-- Reposition the 2 kept tables nicely
UPDATE restaurant_tables SET name = 'T1', seats = 4, shape = 'square', pos_x = 100, pos_y = 100 WHERE id = 'tbl-t06';
UPDATE restaurant_tables SET name = 'T2', seats = 2, shape = 'round',  pos_x = 320, pos_y = 100 WHERE id = 'tbl-t07';
