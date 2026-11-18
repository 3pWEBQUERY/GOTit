-- EXPLAIN ANALYZE der teuersten Abfrageformen der Suche (Schritt 1.14).
-- Nachgebaut aus packages/core/src/search/postgres-search.ts mit festen Werten.
-- Aufruf: psql "$DATABASE_URL" -f scripts/load/explain.sql
\pset pager off
\set rank 'sp.completeness / 200.0::float8 + 0.3 * power(0.5::float8, GREATEST(EXTRACT(EPOCH FROM (now()::timestamp - sp."contentUpdatedAt"))::float8 / 86400, 0) / 30.0)'
\set base 'pp.status = ''PUBLISHED'' AND sp."identityValidUntil" > now() AND sp.audience = ''PUBLIC'''
SELECT array_agg(id ORDER BY id) AS zh_ids FROM region WHERE slug IN ('zuerich') \gset
SELECT array_agg(id ORDER BY id) AS radius_ids FROM region WHERE approved AND slug IN ('stadt-zuerich','zuerich') \gset

\echo '== 1 ohne Filter, Seite 20 (LIMIT 480), Relevanz'
EXPLAIN (ANALYZE, BUFFERS) SELECT sp.slug, sp."displayName", sp."shortDescription"
FROM search_profile sp JOIN provider_profile pp ON pp.id = sp."providerProfileId"
WHERE :base ORDER BY (0) + (0) + :rank DESC, sp."providerProfileId" LIMIT 480;

\echo '== 2 Freitext-Präfix «zür», Relevanz mit ts_rank und word_similarity'
EXPLAIN (ANALYZE, BUFFERS) SELECT sp.slug
FROM search_profile sp JOIN provider_profile pp ON pp.id = sp."providerProfileId"
WHERE :base AND (sp.search_vector @@ to_tsquery('simple', 'zür:*') OR word_similarity('zür', sp."displayName") > 0.4)
ORDER BY (ts_rank(sp.search_vector, to_tsquery('simple', 'zür:*')) * 2 + word_similarity('zür', sp."displayName")) + (0) + :rank DESC, sp."providerProfileId" LIMIT 24;

\echo '== 3 Zählung Freitext zwei Wörter «ruhig abend»'
EXPLAIN (ANALYZE, BUFFERS) SELECT count(*)
FROM search_profile sp JOIN provider_profile pp ON pp.id = sp."providerProfileId"
WHERE :base AND (sp.search_vector @@ to_tsquery('simple', 'ruhig:* & abend:*') OR word_similarity('ruhig abend', sp."displayName") > 0.4);

\echo '== 4 Kombination Region + Sprache + Kategorie + Preis + Fotos + Text'
EXPLAIN (ANALYZE, BUFFERS) SELECT sp.slug
FROM search_profile sp JOIN provider_profile pp ON pp.id = sp."providerProfileId"
WHERE :base AND sp."regionIds" @> :'zh_ids'::text[] AND sp."categoryIds" && ARRAY['load_cat_2']::text[]
  AND sp.languages && ARRAY['de']::text[] AND sp."priceFromChf" <= 600 AND sp."hasPhotos" = true
  AND (sp.search_vector @@ to_tsquery('simple', 'ruhig:*') OR word_similarity('ruhig', sp."displayName") > 0.4)
ORDER BY (ts_rank(sp.search_vector, to_tsquery('simple', 'ruhig:*')) * 2 + word_similarity('ruhig', sp."displayName")) + (0) + :rank DESC, sp."providerProfileId" LIMIT 24;

\echo '== 5 Region mit Umkreis (Überlappung &&), Relevanz'
EXPLAIN (ANALYZE, BUFFERS) SELECT sp.slug
FROM search_profile sp JOIN provider_profile pp ON pp.id = sp."providerProfileId"
WHERE :base AND sp."regionIds" && :'radius_ids'::text[]
ORDER BY (0) + (0) + :rank DESC, sp."providerProfileId" LIMIT 24;

\echo '== 6 Sortierung Preis in Region'
EXPLAIN (ANALYZE, BUFFERS) SELECT sp.slug
FROM search_profile sp JOIN provider_profile pp ON pp.id = sp."providerProfileId"
WHERE :base AND sp."regionIds" @> :'zh_ids'::text[]
ORDER BY sp."priceFromChf" ASC NULLS LAST, sp."providerProfileId" LIMIT 24;

\echo '== 7 Vorschläge: Profilnamen (ILIKE + word_similarity)'
EXPLAIN (ANALYZE, BUFFERS) SELECT sp.slug, sp."displayName"
FROM search_profile sp JOIN provider_profile pp ON pp.id = sp."providerProfileId"
WHERE pp.status = 'PUBLISHED' AND sp."identityValidUntil" > now() AND sp.audience = 'PUBLIC'
  AND (sp."displayName" ILIKE '%li%' OR word_similarity('li', sp."displayName") > 0.4)
ORDER BY word_similarity('li', sp."displayName") DESC, sp."providerProfileId" ASC LIMIT 4;
