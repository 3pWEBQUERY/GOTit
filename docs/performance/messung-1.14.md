# Leistungsmessung Schritt 1.14

**Stand:** 18.11.2026

Schritt 1.14 verlangt einen «Lasttest der Suche» und dass die «Leistungsziele aus 14.6 auf Staging gemessen und dokumentiert» sind (PRD v2 Abschnitt 14.4 und 14.6). Die Ziele:

| Ziel | Grenze |
| --- | --- |
| LCP (Largest Contentful Paint) | unter 2,5 s am 75. Perzentil |
| INP (Interaction to Next Paint) | unter 200 ms am 75. Perzentil |
| CLS (Cumulative Layout Shift) | unter 0,1 am 75. Perzentil |
| Suchanfragen serverseitig | unter 500 ms am 95. Perzentil; darüber kommt Meilisearch (14.4) |

## Kurzfassung

| Ziel | Urteil | Begründung |
| --- | --- | --- |
| Suche < 500 ms p95 serverseitig | **erfüllt** | Staging (24 Demo-Profile): Railway misst für `/de/suche` p95 80 ms, `/api/suche/anzahl` 15 ms, `/api/suche/vorschlaege` 18 ms. Lokal mit 10'000 Profilen: Kernfunktion p95 24 ms (1 Client), 150 ms (20 parallel), 461 ms (50 parallel). Meilisearch ist nicht nötig. |
| CLS < 0,1 | **nicht erfüllt auf der Profilseite am Desktop (Labor)** | 0,000 auf allen Seiten mobil und auf Entdecken, Suche, Club und Hilfe am Desktop. Profil Desktop: 0,98 (Lighthouse, 2 von 3 Läufen), weil die Fusszeile beim Streamen aus dem Bild springt. |
| LCP < 2,5 s | **Desktop erfüllt, mobil nicht erfüllt (Labor)** | Desktop 0,7 bis 0,8 s. Mobil (Lighthouse-Drosselung «Slow 4G», CPU ×4) 3,6 bis 4,0 s. Hauptursache: Das grösste Bild lädt spät (`loading="lazy"` auf den ersten Karten, kein `fetchpriority`). |
| INP < 200 ms | **nicht messbar im Labor** | INP ist ein Feldwert. Ersatzgrössen: TBT (Lighthouse) und gemessene Interaktionsdauer (PerformanceObserver). TBT mobil 216 bis 304 ms. Interaktionen ohne Drosselung ≤ 56 ms; mit CPU ×4 liegt «Filter-Sheet öffnen» bei 176 bis 360 ms (Median 200 ms) und damit im Grenzbereich. |

Im Code geändert (noch nicht auf Staging bereitgestellt, nicht committet):

1. **Ranking-Ausdruck in `double precision`** (`packages/core/src/search/postgres-search.ts`): `EXTRACT(EPOCH …)` liefert seit Postgres 14 `numeric`, und `power()` auf `numeric` kostete bei 10'000 Profilen rund 90 ms pro Abfrage. Mit `::float8` sinkt die teuerste Abfrage von 106 ms auf 17 ms; die Reihenfolge ist identisch (geprüft über alle 10'000 Zeilen: 0 Abweichungen). Keine Migration.
2. **«Welcher Filter schränkt am stärksten ein?» parallel** statt nacheinander (gleiche Datei, `findMostRestrictive`): Bei null Treffern mit fünf Filtern liefen fünf Zählungen in Folge. Ergebnis und Reihenfolge bei Gleichstand unverändert.
3. **Messpunkte:** Header `Server-Timing: search;dur=…` an `/api/suche/anzahl` und `/api/suche/vorschlaege`, Log-Zeile `search.timing` mit `durationMs` beim Laden der Suchseite (`apps/web/features/search/timing.ts`, `queries/load-search.ts`). Nur die Dauer, nie Suchbegriffe oder Filter.

## Aufbau und Grenzen der Messung

- **Staging:** `https://staging.thegnd.net`, Dienst `web` mit einer Instanz in `europe-west4` (Railway), Postgres und Redis im selben Projekt. Datenbestand: fiktive Demo-Daten (Entscheid 0023), 22 veröffentlichte Profile, keine freigegebenen Kategorien.
- **Messrechner:** Sandbox mit 4 Kernen und 16 GB, ausgehend über einen Proxy. Railway leitet die Anfragen über den Rand in `iad1` (US-Ostküste, Header `x-railway-edge`) nach Europa. Ein Aufruf von `/api/health` (nur `select 1`) braucht deshalb von hier **rund 134 ms** (p50, wiederverwendete Verbindung); der Server selbst braucht laut Railway 8 ms. Alle Zeiten «vom Client» enthalten diesen Weg über den Atlantik und den Proxy. Für Nutzerinnen und Nutzer in der Schweiz ist der Weg viel kürzer; die Laborwerte sind deshalb Hinweise, keine Feldwerte.
- **Lokal:** Postgres 16 und Redis auf demselben Rechner wie der Next-Server und der Lastgenerator. Alle teilen sich die 4 Kerne; Durchsatzwerte sind deshalb untere Schranken für eine einzelne Instanz, keine Kapazitätszusage für Railway.
- **Staging nur lesend:** keine Konten, keine Schreibzugriffe; einmal die Altersbestätigung (Cookie `age_ok`, gilt 24 h). Insgesamt rund 160 Suchanfragen, sequenziell und höchstens 40 pro Minute, weit unter dem Limit von 120 (Seite) und 90 (API) pro Minute und Adresse.

## 1. Suchlatenz auf Staging

### Methode

- `curl` mit einer wiederverwendeten Verbindung, 40 Anfragen pro Minute, Cookie `age_ok` aus einem Playwright-Lauf (Altersprüfung einmal bestätigt).
- `/de/suche`: 15 Filterkombinationen × 5 Wiederholungen (ohne Filter; Kanton `ort=zuerich`; Stadt mit Umkreis `ort=stadt-zuerich&umkreis=25`; Region + Sprache; zwei Sprachen; Preisspanne; Freitext Name, Präfix «zür», Tippfehler «linna»; Sortierung Preis und Neu mit Fotos; Bewertungen + Neu; Seite 2; Kombination ohne Treffer; unbekannte Kategorie).
- `/api/suche/anzahl`: 8 Kombinationen × 4; `/api/suche/vorschlaege`: 8 Begriffe × 4.
- Gemessen: Zeit bis zum ersten Byte und bis zum Ende der Antwort, jeweils **ohne Verbindungsaufbau** (`time_starttransfer − time_pretransfer`). Die Suchseite streamt (`loading.tsx`); das erste Byte kommt vor dem Suchergebnis, deshalb ist für die Seite die Gesamtzeit massgebend.
- Serverseitig: Railway-Metrik «HTTP response time» des Dienstes `web` in Staging, gefiltert nach Pfad, im Zeitfenster der Messung (Bucket 07:40 bis 08:00 UTC). Einen `Server-Timing`-Header gab es auf Staging noch nicht.

### Ergebnis (ms)

| Route | n | Client TTFB p50 / p95 / max | Client gesamt p50 / p95 / max | Railway serverseitig p50 / p95 / p99 |
| --- | --- | --- | --- | --- |
| `/api/health` (Vergleich, nur `select 1`) | 20 | 134 / 145 / 150 | 134 / 145 / 151 | 8 / 10 / 10 |
| `/de/suche` | 75 | 176 / 210 / 588 | 249 / 305 / 680 | 56 / 80 / 513 |
| `/api/suche/anzahl` | 32 | 135 / 151 / 248 | 135 / 151 / 249 | 12 / 15 / 133 |
| `/api/suche/vorschlaege` | 32 | 139 / 161 / 161 | 140 / 161 / 161 | 11 / 18 / 35 |

- Zieht man den Weg zum Server ab (Health-Aufruf, 134 ms), braucht der Server für die Trefferzahl und die Vorschläge praktisch nichts; für die ganze Suchseite (Suche, Filteroptionen, Rendern, Streamen) rund 115 ms bis zum Ende der Antwort.
- Die Ausreisser (588 ms erstes Byte, 513 ms p99 bei Railway) sind jeweils die erste Anfrage einer Kombination bzw. der erste Aufruf nach einer Pause; ab der zweiten Wiederholung liegt jede Kombination zwischen 241 und 280 ms gesamt (p50).
- Keine Kombination fällt heraus, auch nicht die ohne Treffer (dort zählt die Suche zusätzlich pro Filter): p50 243 ms gesamt.
- **Urteil Staging:** p95 serverseitig 80 ms für die Suchseite, 15 bis 18 ms für die API-Routen. Ziel erfüllt, allerdings mit 22 Profilen; die Aussage für grössere Bestände kommt aus dem lokalen Lasttest.

### Server-Timing nach der nächsten Bereitstellung

Ab der nächsten Bereitstellung von `web`:

- `/api/suche/anzahl` und `/api/suche/vorschlaege` senden `Server-Timing: search;dur=<ms>`: die Dauer des Aufrufs von `searchPort.count` bzw. `searchPort.suggest`, ohne Rate Limit, Sitzung und Serialisierung. Lesen: in den DevTools unter «Network → Timing», oder `curl -sI -H "Cookie: age_ok=…" "https://staging.thegnd.net/api/suche/anzahl?ort=zuerich" | grep -i server-timing`.
- Die Suchseite kann aus einer Server-Komponente keinen Header setzen. Sie schreibt deshalb pro Aufruf eine Log-Zeile `{"event":"search.timing","durationMs":…}` (Dauer von `searchPort.search`, ohne Filteroptionen und Rendern). Lesen: Railway-Logs des Dienstes `web`, Filter `search.timing`; daraus p95 bilden.
- Für die Gesamtzeit pro Pfad bleibt die Railway-Metrik «HTTP response time» (wie oben).

## 2. Lasttest lokal

### Daten

`scripts/load/` (nur gegen eine Datenbank auf `localhost`, `run.sh` bricht sonst ab):

- `run.sh seed 10000` lädt 10'000 synthetische Profile direkt in `user`, `provider_profile` und `search_profile` (IDs `load_…`, Slugs `load-…`) und 8 freigegebene Kategorien `load_cat_…`. Verteilung: Regionen gewichtet wie im Indexer (Stadt mit Kanton oder nur Kanton, Zürich am häufigsten), im Mittel 2 Sprachen, 0 bis 3 Kategorien, Preise 100 bis 990 CHF (10 % ohne Preis), 90 % mit Fotos, 40 % mit Bewertungen, 3 % pausiert, 3 % mit abgelaufener Identitätsprüfung, 5 % «nur für Mitglieder», 640 verschiedene Namen, Kurzbeschreibungen aus 12 Wörtern. Dauer rund 4 s.
- `run.sh cleanup` entfernt alles mit Präfix `load_` (geprüft: danach 0 Zeilen in allen vier Tabellen).
- `run.sh core [Clients…]` misst die Kernfunktion, `run.sh http <URL> [Clients…]` die HTTP-Routen, `explain.sql` zeigt die Pläne. Die Filterkombinationen stehen in `scenarios.mjs` (18 Kombinationen, darunter Seite 20 mit `LIMIT 480`, Freitext mit vielen Treffern auf Seite 5 und eine Kombination aus fünf Filtern ohne Treffer).

### Kernfunktion (`searchPort`, ohne HTTP und Rate Limit)

1'500 Aufrufe pro Stufe, Filterkombinationen reihum, Besucher-Sicht, Prisma mit dem Standard-Pool des Adapters. Werte in ms.

**Vor der Korrektur** (Ranking in `numeric`, Zählungen bei null Treffern nacheinander):

| Aufruf | Clients | p50 | p95 | p99 | Durchsatz |
| --- | --- | --- | --- | --- | --- |
| `search` | 1 | 26 | 109 | 132 | 24/s |
| `search` | 20 | 178 | **592** | 744 | 91/s |
| `search` | 50 | 452 | **1'904** | 2'370 | 92/s |

**Nach der Korrektur:**

| Aufruf | Clients | p50 | p95 | p99 | max | Durchsatz |
| --- | --- | --- | --- | --- | --- | --- |
| `search` | 1 | 13 | 24 | 29 | 35 | 73/s |
| `search` | 20 | 83 | 150 | 180 | 265 | 223/s |
| `search` | 50 | 225 | 461 | 571 | 660 | 197/s |
| `count` | 1 | 7 | 19 | 24 | 34 | 116/s |
| `count` | 20 | 33 | 57 | 64 | 79 | 584/s |
| `count` | 50 | 72 | 148 | 160 | 195 | 610/s |
| `suggest` | 1 | 14 | 21 | 24 | 33 | 67/s |
| `suggest` | 20 | 67 | 88 | 99 | 112 | 291/s |
| `suggest` | 50 | 176 | 211 | 219 | 236 | 279/s |

Langsamste Kombinationen nach der Korrektur: bei 1 Client Freitext mit vielen Treffern (`q=a&seite=5`, p95 31 ms) und Präfix «zür» (29 ms); bei 50 Clients die Kombination ohne Treffer (p95 630 ms, sie stellt sechs Abfragen), Stadt mit 50 km Umkreis (371 ms) und die Fünf-Filter-Kombination (359 ms).

Bei 20 und 50 gleichzeitigen Clients ist die Wartezeit fast ganz Warteschlange: Der Durchsatz bleibt bei rund 200 Suchen pro Sekunde (Postgres, Node und Lastgenerator teilen 4 Kerne), und mehr Clients verlängern nur die Wartezeit. 50 gleichzeitig laufende Suchen entsprechen etwa 200 Suchen pro Sekunde, weit über der Last vor dem Start.

### HTTP-Routen (lokaler Produktions-Build)

`next build` und `next start` mit `NEXT_DIST_DIR=.next-load`, Port 3360, unter `flock /home/user/gotit-local/build.lock`. Altersbestätigung als selbst signiertes Cookie mit dem lokalen `AGE_GATE_SECRET`.

Rate Limit: Es gibt keinen Test-Schalter. Das Limit gilt pro `x-real-ip`, die auf Railway der Rand des Netzes setzt. Deshalb zwei Läufe:

- **Im Limit:** eine Adresse, Suchseite 1,5 Anfragen/s (90 pro Minute bei 120 erlaubt), API-Routen 1 Anfrage/s (60 bei 90 erlaubt).
- **Parallel:** jede Anfrage mit eigener `x-real-ip`. Das geht nur lokal ohne Railway-Rand und wurde nie gegen Staging gerichtet.

Werte in ms; «Server» ist `Server-Timing` (API) bzw. die Log-Zeile `search.timing` (Seite).

| Route | Lauf | n | gesamt p50 / p95 / p99 | Server p50 / p95 / p99 | Durchsatz |
| --- | --- | --- | --- | --- | --- |
| `/de/suche` | im Limit | 90 | 73 / 180 / 234 | (siehe unten) | 1,5/s |
| `/api/suche/anzahl` | im Limit | 72 | 17 / 30 / 115 | 8 / 18 / 26 | 1/s |
| `/api/suche/vorschlaege` | im Limit | 64 | 22 / 28 / 45 | 14 / 20 / 26 | 1/s |
| `/de/suche` | 20 parallel | 600 | 1'560 / 2'157 / 2'375 | 425 / 822 / 1'098 | 12,4/s |
| `/de/suche` | 50 parallel | 600 | 3'947 / 6'621 / 8'563 | 2'581 / 5'477 / 7'661 | 11,5/s |
| `/api/suche/anzahl` | 20 parallel | 600 | 97 / 132 / 149 | 36 / 59 / 74 | 205/s |
| `/api/suche/anzahl` | 50 parallel | 600 | 206 / 321 / 382 | 85 / 194 / 224 | 222/s |
| `/api/suche/vorschlaege` | 20 parallel | 600 | 129 / 163 / 181 | 72 / 104 / 116 | 157/s |
| `/api/suche/vorschlaege` | 50 parallel | 600 | 303 / 360 / 382 | 242 / 279 / 297 | 164/s |

Einordnung der Suchseite: Ein Prozess rendert lokal rund 12 Suchseiten pro Sekunde (24 Karten, Filter, Shell; Server-Rendering ist CPU-gebunden und läuft in Node auf einem Kern). Bei 20 oder 50 gleichzeitigen Seitenaufrufen wartet jede Anfrage auf die Ereignisschleife; auch der Wert `search.timing` enthält dann diese Wartezeit (die Datenbank allein braucht bei derselben Last unter 150 ms p95, siehe Kernfunktion). Das ist eine Frage der Rechenkapazität pro Instanz, nicht der Suche. Im Limit, also im Normalbetrieb, braucht die ganze Seite 73 ms p50 und 180 ms p95.

### Abfragepläne (EXPLAIN ANALYZE, 10'000 Profile)

`psql "$DATABASE_URL" -f scripts/load/explain.sql`

| Form | Plan | Zeit |
| --- | --- | --- |
| Ohne Filter, Relevanz, `LIMIT 480`, **vor** der Korrektur | Seq Scan + Hash Join, Top-N-Heapsort; 97 ms im Hash Join für den Ranking-Ausdruck in `numeric` | 106 ms |
| dieselbe, **nach** der Korrektur | gleicher Plan, Ausdruck in `float8` | 17 bis 18 ms |
| Freitext-Präfix «zür», Relevanz mit `ts_rank` und `word_similarity` | Seq Scan auf `search_profile` (3'712 von 10'000 passend) | 24 ms |
| Zählung Freitext «ruhig abend» | Seq Scan | 24 ms |
| Fünf Filter + Freitext | BitmapAnd aus vier GIN/B-Tree-Indizes (Kategorie, Region, Sprache, Preis) | 5 ms |
| Region mit Umkreis (`&&`) | Bitmap Index Scan auf `regionIds` | 13 ms |
| Sortierung Preis in Region | Index Scan auf `priceFromChf` | 0,5 ms |
| Vorschläge: Profilnamen (`ILIKE` oder `word_similarity`) | Seq Scan | 20 ms |

Die Freitextformen nutzen keinen Index: Die Bedingung `search_vector @@ … OR word_similarity(…) > 0.4` lässt sich wegen des Funktionsaufrufs im `OR` nicht über die GIN-Indizes auflösen. Bei 10'000 Profilen kostet das rund 20 ms und ist unkritisch; es wächst aber linear mit dem Bestand (siehe nächste Schritte). Ein neuer Index wäre heute nicht «klar sicher» nötig, deshalb keine Migration.

### Urteil Lasttest

- Ziel «< 500 ms p95 serverseitig» für die Suche: **erfüllt** bei 10'000 Profilen bis 50 gleichzeitige Suchen (461 ms p95 in der Kernfunktion, auf einem Rechner, den sich Datenbank, Server und Lastgenerator teilen). Vor der Korrektur wäre es bei 20 gleichzeitigen Suchen knapp verfehlt worden (592 ms).
- Meilisearch ist nach dieser Messung nicht nötig.

## 3. Web Vitals auf Staging (Labor)

### Methode

- Lighthouse 12 (`npx lighthouse@12`, nur Kategorie «Performance»), Chromium 1243 aus `/opt/pw-browsers`, `--headless=new --no-sandbox`, über den Proxy der Sandbox. Altersbestätigung per `--extra-headers` mit dem Cookie `age_ok` aus einem Playwright-Lauf.
- **Mobil:** Standard von Lighthouse (Moto G Power, simulierte Drosselung «Slow 4G»: 150 ms RTT, 1,6 Mbit/s, CPU ×4). **Desktop:** `--preset=desktop` (40 ms RTT, 10 Mbit/s, keine CPU-Drosselung).
- Je Seite und Gerät 3 Läufe, angegeben ist der **Median** (Einzelwerte in Klammern). Ein Lauf (Hilfe, Desktop) brach mit `NO_NAVSTART` ab und wurde wiederholt.
- Seiten: Entdecken `/de`, Suche `/de/suche?ort=zuerich` (Kanton Zürich, 6 Profile), Profil `/de/p/demo-lina`, Club `/de/c/demo-club-lumen`, Hilfe `/de/hilfe`.
- **INP ist ein Feldwert** (Chrome UX Report bzw. echte Nutzer) und lässt sich im Labor nicht messen. Lighthouse gibt als Ersatz die **Total Blocking Time (TBT)** an; dazu kommt unten eine direkte Messung von Interaktionen.
- Die simulierte Drosselung rechnet mit eigenen Netzwerkwerten; der Weg der Sandbox über die USA fliesst nur über die beobachtete Serverantwortzeit (150 bis 210 ms) ein. Echte Mobilgeräte in der Schweiz mit 4G/5G sind in der Regel schneller als «Slow 4G».

### Ergebnis Lighthouse (Median aus 3 Läufen)

| Seite | Gerät | Score | LCP | CLS | TBT | FCP |
| --- | --- | --- | --- | --- | --- | --- |
| Entdecken `/de` | mobil | 82 | 3,85 s (3,85 / 3,85 / 4,00) | 0,000 | 290 ms | 1,36 s |
| Entdecken `/de` | Desktop | 100 | 0,81 s | 0,000 | 2 ms | 0,40 s |
| Suche `?ort=zuerich` | mobil | 81 | 3,87 s (3,81 / 3,87 / 4,00) | 0,000 | 304 ms | 1,33 s |
| Suche `?ort=zuerich` | Desktop | 100 | 0,79 s | 0,000 | 1 ms | 0,38 s |
| Profil `demo-lina` | mobil | 84 | 4,01 s (4,03 / 3,93 / 4,01) | 0,000 | 216 ms | 1,38 s |
| Profil `demo-lina` | Desktop | 75 | 0,80 s | **0,979** (0 / 0,979 / 0,979) | 2 ms | 0,40 s |
| Club `demo-club-lumen` | mobil | 85 | 3,54 s (3,57 / 3,54 / 3,54) | 0,000 | 270 ms | 1,40 s |
| Club `demo-club-lumen` | Desktop | 100 | 0,76 s | 0,000 | 17 ms | 0,40 s |
| Hilfe `/de/hilfe` | mobil | 87 | 3,54 s (3,57 / 3,54 / 3,52) | 0,000 | 225 ms | 1,29 s |
| Hilfe `/de/hilfe` | Desktop | 100 | 0,70 s | 0,000 | 0 ms | 0,37 s |

### Was die Werte treibt

- **Mobiles LCP: das grösste Bild kommt spät.** Auf Entdecken und Suche ist das LCP-Element das Titelbild einer der ersten Karten, und es trägt `loading="lazy"` (`packages/ui/src/components/profile/profile-card.tsx`, auch `MediaFrame` ohne `eager`). Aufschlüsselung Suche mobil: TTFB 660 ms, **Ladeverzögerung 2'330 ms (61 %)**, Ladezeit 640 ms, Renderverzögerung 180 ms. Lighthouse schätzt die Einsparung allein durch «nicht lazy» auf rund 600 ms. Auf Profil und Club ist das Bild zwar `eager`, aber ohne `fetchpriority="high"`; Ladeverzögerung 1'160 bis 1'590 ms, Ladezeit 1'140 bis 1'560 ms (Variante `w960` für einen Bildschirm von 412 px).
- **Hilfe mobil:** LCP ist ein Textabsatz; 2,85 s Renderverzögerung, also Hauptthread (Hydration, Skripte) und Schrift (`display: swap`), kein Bild.
- **JavaScript:** auf allen Seiten rund 1,0 bis 1,1 s Skriptausführung und 1,8 bis 2,1 s Hauptthread-Arbeit bei CPU ×4; Lighthouse meldet rund 50 KiB ungenutztes JavaScript und «Legacy JavaScript» (Polyfills für moderne Browser). Daher TBT 216 bis 304 ms mobil.
- **CLS Profil Desktop: die Fusszeile springt.** Mit Playwright nachgestellt (3 von 3 Läufen, 1350 × 940): Während die Profilseite streamt, ist der Ladezustand (`profile-loading.tsx`) niedriger als das Fenster; die Fusszeile steht bei y = 551 im Bild und wird beim Eintreffen des Inhalts aus dem Bild geschoben (Verschiebung 0,41 je Lauf; Lighthouse misst mit seinem Fenster 0,98). Mobil tritt es nicht auf, weil der Platzhalter dort das Fenster füllt.
- Wenig Gewicht: 640 bis 690 KiB pro Seite.

### Interaktionen (Ersatz für INP)

Playwright auf Staging, `PerformanceObserver` für `event`-Einträge (`durationThreshold: 16`, Dauer = Eingabe bis zum nächsten Bild, wie INP; Auflösung 8 ms), pro Interaktion der grösste Eintrag. Je 3 Wiederholungen, angegeben Median (Höchstwert). «Mobil» ist Pixel 7 (Touch, 412 px); CPU ×4 per DevTools-Protokoll, vergleichbar mit Lighthouse mobil.

| Interaktion | mobil, CPU ×1 | mobil, CPU ×4 | Desktop, CPU ×1 |
| --- | --- | --- | --- |
| Filter-Sheet öffnen (Suche) | 48 ms (56) | **200 ms (360)** | – (Seitenleiste) |
| Filtergruppe «Profil» aufklappen | 24 ms (24) | 40 ms (40) | 24 ms (24) |
| Filter umschalten (Sprache) | 24 ms (32) | 80 ms (88) | 40 ms (48) |
| Lightbox öffnen (Profil) | 32 ms (40) | 104 ms (104) | 40 ms (40) |
| Lightbox: nächstes Bild (Pfeiltaste) | < 16 ms (16) | 40 ms (56) | 16 ms (24) |

- In allen Fällen ist die Verarbeitung im Handler kurz (1 bis 23 ms); die Zeit liegt im Rendern bis zum nächsten Bild (Präsentationsverzögerung).
- «Filter-Sheet öffnen» ist die einzige Interaktion nahe der Grenze: mit CPU ×4 einmal 360 ms. Vermutete Ursache: das Sheet rendert alle Filtergruppen auf einmal und hat einen Glas-Hintergrund (`backdrop-filter`); das ist mit einer Leistungsaufzeichnung zu bestätigen.
- Auf dem Desktop navigiert das Umschalten eines Filters in der Seitenleiste; gemessen ist nur bis zum nächsten Bild, nicht bis zur neuen Trefferliste (so zählt es auch INP).
- TBT mobil 216 bis 304 ms bedeutet: Während des Ladens kann eine frühe Eingabe auf einem langsamen Gerät länger warten als 200 ms.

### Urteil Web Vitals

| Ziel | Urteil |
| --- | --- |
| LCP < 2,5 s | Desktop **erfüllt** (0,70 bis 0,81 s). Mobil unter «Slow 4G» und CPU ×4 **nicht erfüllt** (3,54 bis 4,01 s). Ob das 75. Perzentil echter Nutzer darüber liegt, zeigt erst die Feldmessung; die Ursache (spätes LCP-Bild) ist aber unabhängig von der Drosselung und zu beheben. |
| CLS < 0,1 | **Nicht erfüllt** auf der Profilseite am Desktop (0,98 im Median von Lighthouse, 0,41 in Playwright). Alle anderen Seiten und mobil 0,000. |
| INP < 200 ms | **Im Labor nicht messbar.** Ersatz: Interaktionen ohne Drosselung ≤ 56 ms, mit CPU ×4 bis auf «Filter-Sheet öffnen» (Median 200 ms, max. 360 ms) unter 110 ms; TBT mobil 216 bis 304 ms. Tendenz: knapp, auf langsamen Geräten gefährdet beim Filter-Sheet. |

## 3a. Nachmessung nach den Korrekturen (18.11.2026, Commit 18f8533)

Gleiche Methode wie oben (Lighthouse 12, je 3 Läufe, Median). Bereitgestellt waren:
- Bilder der ersten Karten und der Galerie sofort und mit `fetchpriority="high"`.
- Ladezustand der Profilseite mindestens bildschirmhoch.
- Ranking in `float8` und parallele Zählungen.
- `Server-Timing` an den Such-APIs. Gemessen: `/api/suche/anzahl?ort=zuerich` meldet `search;dur=24.2`.

| Seite | LCP mobil | LCP Desktop | CLS mobil | CLS Desktop (Median, max) | TBT mobil |
| --- | --- | --- | --- | --- | --- |
| Entdecken | 3,97 s | 0,77 s | 0,000 | 0,000 (max 0,804) | 316 ms |
| Suche | 3,86 s | 0,76 s | 0,000 | 0,000 (max 0,000) | 436 ms |
| Profil | 3,94 s | 0,78 s | 0,000 | **0,000** (max 0,000, vorher 0,979) | 270 ms |
| Club | 3,66 s | 0,74 s | 0,000 | 0,000 (max 0,979) | 288 ms |
| Hilfe | 3,48 s | 0,65 s | 0,000 | 0,000 (max 0,000) | 145 ms |

**CLS:**
- Die Profilseite ist behoben.
- Entdecken und Club hatten je einen Ausreisser mit demselben Muster: Die Fusszeile steht beim Laden im Bild.
- Deshalb sind ihre Ladezustände (`SearchLoading`, `ClubLoading`) jetzt ebenfalls bildschirmhoch. Das wirkt mit der nächsten Bereitstellung und ist dann nachzumessen.

**LCP mobil bleibt bei 3,5 bis 4,0 s und ist damit nicht erfüllt.** Das Vorladen allein hilft nicht.
- **Zerlegung bei der Suche mobil:** TTFB 0,71 s, Ladeverzögerung 1,64 s, Ladezeit 1,19 s, Renderverzögerung 0,32 s.
- **Ursache:** Das LCP-Bild steckt im nachgestreamten Teil der Seite. Der Browser entdeckt es erst, wenn dieser Teil ankommt, unter «Slow 4G» also spät. Dazu kommen 1,1 bis 1,4 s JavaScript beim Start.
- **Hilfe:** Das LCP-Element ist Text, und 80 % sind Renderverzögerung, weil React den gestreamten Inhalt erst nach dem Laden des Skripts einblendet.
- **Abhilfe:** Sie braucht Arbeit an der Architektur (siehe «Nächste Schritte», Punkt 1). Das gehört nicht mehr in diesen Schritt.

## 4. Nächste Schritte

1. **LCP mobil:** Mit `eager` und `fetchpriority` umgesetzt, aber ohne Wirkung (Nachmessung oben). Der nächste Hebel ist, das LCP-Bild im ersten Teil der Antwort bekanntzumachen. Möglich sind:
   - `preload` für das erste Kartenbild aus dem Layout oder dem ersten gestreamten Teil, oder die erste Kartenreihe ohne Suspense-Grenze rendern.
   - Kleinere Varianten mit `srcset` und `sizes` für 412 px.
   - Weniger JavaScript beim Start (Punkt 6).

   Danach Lighthouse mobil wiederholen.
2. **CLS (umgesetzt):** Die Ladezustände von Profil, Suche, Entdecken und Club sind bildschirmhoch; Profil ist nachgemessen. Ursprünglich vorgeschlagen war: Den Ladezustand der Profilseite mindestens so hoch machen wie den Inhalt oberhalb des Falzes, oder `main` eine Mindesthöhe von einem Fenster geben (`min-h-dvh` abzüglich Kopfzeile), damit die Fusszeile beim Streamen nicht im Bild steht. Mit `cls.mjs`-ähnlicher Messung (Layout-Shift-Observer) und Lighthouse Desktop prüfen; gleiche Prüfung für Club und Suche am Desktop.
3. **Korrekturen bereitstellen und nachmessen:** Ranking in `float8`, parallele Zählungen und Messpunkte nach Staging bringen; danach `Server-Timing` der API-Routen und die Log-Zeile `search.timing` auswerten (p95 über einen Tag).
4. **Feldmessung für INP, LCP, CLS:** Ohne Feldwerte bleibt INP offen. Vorschlag: `useReportWebVitals` (Next.js) mit einem eigenen, datensparsamen Endpunkt (nur Metrik, Wert, Routenmuster, Gerätetyp; keine IDs, keine URL-Parameter), aggregiert in `stat_daily` oder in Logs; Entscheid nötig (Datenschutz, PRD 16.2). Alternativ der Chrome UX Report, sobald die Produktion genug Verkehr hat.
5. **Filter-Sheet:** Leistungsaufzeichnung mit CPU ×4 beim Öffnen; falls der Glas-Hintergrund oder das Rendern aller Gruppen teuer ist, Gruppen erst beim Aufklappen rendern oder den Unschärfe-Effekt beim Einblenden abschwächen.
6. **JavaScript verkleinern:** «Legacy JavaScript» (Browserslist/Ziel prüfen) und ungenutzte Module auf Marktplatzseiten (Bundle-Analyse) angehen; das senkt TBT mobil.
7. **Freitextsuche für grössere Bestände vorbereiten:** Heute Seq Scan (rund 20 ms bei 10'000 Profilen, linear wachsend). Wenn der Bestand gegen 50'000 geht, die Namensähnlichkeit mit dem Operator `%>` (`word_similarity`-Schwelle über `pg_trgm.word_similarity_threshold`) statt `word_similarity(…) > 0.4` schreiben, damit der vorhandene Trigram-Index `search_profile_displayName_trgm_idx` greift, und den Lasttest mit `run.sh seed 50000` wiederholen. Meilisearch erst, wenn die Messung p95 > 500 ms zeigt.
8. **Kapazität pro Instanz:** Lokal rendert ein Node-Prozess rund 12 Suchseiten pro Sekunde. Für Lastspitzen in der Produktion eine zweite Instanz von `web` einplanen (Railway `numReplicas`) und die CPU-Auslastung in den Railway-Metriken beobachten.

## Anhang: Befehle

```bash
# Lastdaten (nur lokal)
scripts/load/run.sh seed 10000
scripts/load/run.sh core 1 20 50           # Kernfunktion; LOAD_REQUESTS=1500 pro Stufe
psql "$DATABASE_URL" -f scripts/load/explain.sql
cd apps/web && NEXT_DIST_DIR=.next-load flock /home/user/gotit-local/build.lock next build
NEXT_DIST_DIR=.next-load PORT=3360 flock /home/user/gotit-local/build.lock next start -p 3360
scripts/load/run.sh http http://localhost:3360           # im Rate Limit
scripts/load/run.sh http http://localhost:3360 20 50     # parallel, eigene x-real-ip pro Anfrage
scripts/load/run.sh cleanup

# Lighthouse gegen Staging (Cookie age_ok aus einem Playwright-Lauf, gilt 24 h)
CHROME_PATH=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome npx lighthouse@12 \
  "https://staging.thegnd.net/de/suche?ort=zuerich" --only-categories=performance [--preset=desktop] \
  --chrome-flags="--headless=new --no-sandbox --proxy-server=$HTTPS_PROXY" \
  --extra-headers='{"Cookie":"age_ok=<Wert>"}'
```
