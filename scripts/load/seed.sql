-- Synthetische Lastdaten für den Lasttest der Suche (Schritt 1.14).
-- Nur lokal. Alle IDs beginnen mit `load_`, alle Slugs mit `load-`;
-- `cleanup.sql` entfernt alles wieder. Aufruf über `run.sh seed [Anzahl]`.
\set ON_ERROR_STOP on
\if :{?count}
\else
  \set count 10000
\endif

BEGIN;
SELECT setseed(0.14);

-- Acht freigegebene Kategorien, damit der Kategorienfilter etwas zu tun hat.
INSERT INTO category (id, slug, "nameDe", "nameFr", "nameIt", "nameEn", approved, "sortOrder", "updatedAt")
SELECT 'load_cat_' || i, 'load-kategorie-' || i, 'Lastkategorie ' || i, 'Catégorie ' || i,
       'Categoria ' || i, 'Category ' || i, true, 900 + i, now()
FROM generate_series(1, 8) AS i;

CREATE TEMP TABLE load_names AS
SELECT row_number() OVER () AS n, initcap(a || b || c) AS name
FROM unnest(ARRAY['li','ma','no','se','ka','an','el','ja','ro','sa','mi','vi','lu','da','ni','fe']) AS a,
     unnest(ARRAY['na','ra','li','mi','la','ne','ri','sa','e','a']) AS b,
     unnest(ARRAY['','n','a','e']) AS c;

CREATE TEMP TABLE load_words AS
SELECT row_number() OVER () AS n, w FROM unnest(string_to_array(
  'ruhig herzlich diskret gepflegt humorvoll elegant spontan zuverlässig sportlich kultiviert '
  'gesprächig entspannt aufmerksam neugierig warm offen charmant natürlich klar freundlich '
  'abend wochenende nachmittag stadt see altstadt bahnhof hotel lounge bar konzert museum '
  'reisen kochen tanzen lesen kunst musik theater wandern sprachen gespräche wein kaffee '
  'zuerich genf basel bern lausanne winterthur biel thun carouge montreux lugano luzern',
  ' ')) AS w;

-- Regionen: Stadt mit Kanton (wie der Indexer) oder nur Kanton. Gewichtet: Zürich am meisten.
CREATE TEMP TABLE load_regions AS
SELECT row_number() OVER () AS n, ids, primary_id, terms FROM (
  SELECT ARRAY(SELECT unnest(ARRAY[c.id, p.id]) ORDER BY 1) AS ids, c.id AS primary_id,
         c."nameDe" || ' ' || c."nameFr" || ' ' || p."nameDe" || ' ' || p."nameFr" AS terms,
         CASE c.slug WHEN 'stadt-zuerich' THEN 4 WHEN 'stadt-genf' THEN 2 ELSE 1 END AS weight
  FROM region c JOIN region p ON p.id = c."parentId" WHERE c.approved AND p.approved
  UNION ALL
  SELECT ARRAY[r.id], r.id, r."nameDe" || ' ' || r."nameFr",
         CASE r.slug WHEN 'zuerich' THEN 2 ELSE 1 END
  FROM region r WHERE r.approved AND r."parentId" IS NULL
) x, generate_series(1, x.weight);

CREATE TEMP TABLE load_rows AS
SELECT i,
       (SELECT name FROM load_names WHERE n = 1 + (i * 7919) % (SELECT count(*) FROM load_names)) AS name,
       1 + floor(random() * (SELECT count(*) FROM load_regions))::int AS region_n,
       random() AS r_status, random() AS r_aud, random() AS r_id, random() AS r_photo, random() AS r_rev,
       random() AS r_price, floor(random() * 365)::int AS published_days, random() AS r_upd,
       ARRAY(SELECT l FROM unnest(ARRAY['de','fr','en','it','es','pt','ru']) l
             WHERE random() < CASE l WHEN 'de' THEN 0.6 WHEN 'en' THEN 0.6 WHEN 'fr' THEN 0.35 WHEN 'it' THEN 0.2 ELSE 0.08 END + i * 0
             ORDER BY 1) AS langs,
       ARRAY(SELECT 'load_cat_' || c FROM generate_series(1, 8) c WHERE random() < 0.2 + i * 0 ORDER BY 1) AS cats,
       (SELECT string_agg(w, ' ') FROM (SELECT w FROM load_words ORDER BY random() + i * 0 LIMIT 12) s) AS words
FROM generate_series(1, :count) AS i;

INSERT INTO "user" (id, name, email, "updatedAt", "accountType")
SELECT 'load_user_' || i, name, 'load-' || i || '@load.invalid', now(), 'PROVIDER' FROM load_rows;

INSERT INTO provider_profile (id, "userId", slug, "displayName", status, visibility, languages,
                              "shortDescription", "publishedAt", "contentUpdatedAt", "updatedAt")
SELECT 'load_pp_' || i, 'load_user_' || i, 'load-' || i, name,
       (CASE WHEN r_status < 0.03 THEN 'PAUSED' ELSE 'PUBLISHED' END)::"ProviderStatus",
       (CASE WHEN r_aud < 0.05 THEN 'MEMBERS' ELSE 'PUBLIC' END)::"ProfileAudience",
       langs, initcap(words), now() - make_interval(days => published_days),
       now() - make_interval(days => floor(published_days * r_upd)::int), now()
FROM load_rows;

INSERT INTO search_profile ("providerProfileId", slug, "displayName", audience, "identityValidUntil",
       "shortDescription", languages, "regionIds", "primaryRegionId", "locationLabel", "categoryIds",
       "priceFromChf", "hasPhotos", "coverMediaId", "coverColor", "coverAlt", completeness, "searchTerms",
       "publishedAt", "contentUpdatedAt", "reviewCount")
SELECT 'load_pp_' || i, 'load-' || i, name,
       (CASE WHEN r_aud < 0.05 THEN 'MEMBERS' ELSE 'PUBLIC' END)::"ProfileAudience",
       CASE WHEN r_id < 0.03 THEN now() - interval '1 day' ELSE now() + interval '1 year' END,
       initcap(words), langs, lr.ids, lr.primary_id, NULL, cats,
       CASE WHEN r_price < 0.1 THEN NULL ELSE 100 + (floor(r_price * 90) * 10)::int END,
       r_photo < 0.9, NULL, NULL, NULL, 40 + floor(r_photo * 60)::int,
       lr.terms || ' ' || (SELECT coalesce(string_agg(c."nameDe" || ' ' || c."nameFr", ' '), '') FROM category c WHERE c.id = ANY(cats)),
       now() - make_interval(days => published_days),
       now() - make_interval(days => floor(published_days * r_upd)::int),
       CASE WHEN r_rev < 0.6 THEN 0 ELSE floor(r_rev * 20)::int END
FROM load_rows JOIN load_regions lr ON lr.n = region_n;

COMMIT;
ANALYZE search_profile;
ANALYZE provider_profile;
SELECT count(*) AS load_profiles FROM search_profile WHERE "providerProfileId" LIKE 'load\_%';
