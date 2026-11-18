-- Entfernt die Lastdaten aus `seed.sql` (Schritt 1.14). Nur Zeilen mit Präfix `load_`.
\set ON_ERROR_STOP on
BEGIN;
DELETE FROM search_profile WHERE "providerProfileId" LIKE 'load\_pp\_%';
DELETE FROM provider_profile WHERE id LIKE 'load\_pp\_%';
DELETE FROM "user" WHERE id LIKE 'load\_user\_%';
DELETE FROM category WHERE id LIKE 'load\_cat\_%';
COMMIT;
ANALYZE search_profile;
SELECT (SELECT count(*) FROM search_profile WHERE "providerProfileId" LIKE 'load\_%') AS rest_search,
       (SELECT count(*) FROM provider_profile WHERE id LIKE 'load\_%') AS rest_profiles,
       (SELECT count(*) FROM "user" WHERE id LIKE 'load\_%') AS rest_users,
       (SELECT count(*) FROM category WHERE id LIKE 'load\_%') AS rest_categories;
