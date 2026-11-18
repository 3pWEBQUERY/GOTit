# Leistungsmessung 1.14 (Staging)

**Stand:** 18.11.2026, 08:55 bis 09:50 Uhr Zürcher Zeit · **Grundlage:** PRD v2.0 Abschnitt 14.6 und Schritt 1.14 («Lasttest der Suche», «Leistungsziele aus 14.6 auf Staging gemessen und dokumentiert») · **Umgebung:** `staging.thegnd.net` mit den Demo-Daten (Entscheid 0023), Stand des Branches `claude/trusting-carson-zd6syt`

## Ergebnis in Kürze

| Ziel (14.6) | Gemessen | Erfüllt |
| --- | --- | --- |
| Suche unter 500 ms serverseitig, p95 | einzeln: p95 194 ms inklusive Netzweg (~120 ms), also rund 75 ms im Server · 10 gleichzeitig: p95 725 ms inklusive Netzweg | einzeln ja · bei 10 gleichzeitigen Anfragen auf einem Replikat **nein** (siehe unten) |
| LCP unter 2,5 s, p75 | Desktop 0,75 bis 1,6 s · Handy 0,8 bis 1,0 s | ja |
| INP unter 200 ms, p75 | 24 bis 56 ms | ja (Labor, siehe Grenzen) |
| CLS unter 0,1, p75 | Desktop **0,52 bis 0,54** · Handy 0 | Desktop **nein**, behoben (siehe unten) |

## Methode

- **Suche:** `apps/web/perf/suche-last.mjs`. Zufällige Kombinationen aus Ort, Sprache, Höchstpreis, «mit Fotos», Freitext, Sortierung und Seite. Gemessen wird bis zum Ende der gestreamten HTML-Antwort, nicht nur bis zum ersten Byte. Dazu kommen `/api/suche/anzahl` (nur die Abfrage, ohne Rendern) und `/api/health` als Grundlinie für den Netzweg.
- **Begrenzung:** Die Suche erlaubt 120 Anfragen pro Minute und Client-Adresse (`search`), die Anzahl 90 (`searchSuggest`). Das Skript bleibt darunter. Last von mehreren Adressen ist nicht gemessen, weil die Begrenzung an `x-real-ip` hängt und sich von aussen nicht umgehen lässt (B-19 der Sicherheitsprüfung).
- **Web Vitals:** `apps/web/perf/web-vitals.mjs`. Je Seite und Gerät 10 kalte Aufrufe in einem neuen Browser-Kontext (Chromium, «Desktop Chrome» 1280 × 720 und «Pixel 7»), ausgewertet am 75. Perzentil. INP aus einem Klick auf das erste Bedienelement im Hauptbereich.
- **Ressourcen:** Railway-Metriken der Dienste `web` und `Postgres` in Staging während der Messung.

## Suche

| Messung | n | p50 | p75 | p95 | max |
| --- | --- | --- | --- | --- | --- |
| Grundlinie `/api/health` | 50 | 122 ms | 125 ms | 137 ms | 251 ms |
| `/de/suche`, nacheinander | 100 | 163 ms | 170 ms | 194 ms | 445 ms |
| `/de/suche`, je 10 gleichzeitig | 100 | 547 ms | 578 ms | 725 ms | 769 ms |
| `/api/suche/anzahl`, je 10 gleichzeitig | 80 | 197 ms | – | 362 ms | 415 ms |

Alle Antworten hatten Status 200, keine war gedrosselt.

**Einordnung:**
- **Die Abfrage selbst ist schnell.** Postgres blieb während der Messung fast ohne Last (CPU höchstens 0,03 vCPU).
- **Das Rendern stellt sich an.** Bei 10 gleichzeitigen Anfragen kommt der Anstieg vom Rendern der Seite. `web` läuft in Staging mit **einem Replikat**, also mit einem Node-Prozess. Dieser rendert die Seiten nacheinander auf einem Kern, auch wenn mehr vCPU zugeteilt sind (Spitze 4,6 von 24 vCPU; der Rest sind Nebenprozesse und Garbage Collection).
- **Für den Start:** In der Produktion ebenfalls mit einem Replikat ist bei etwa 10 gleichzeitigen Suchen das Ziel überschritten. Abhilfe ohne Codeänderung: mehr Replikate von `web` (Railway `numReplicas`). Das ist ein Entscheid der Betreiberin (Kosten) und hier nicht umgesetzt. Danach diese Messung wiederholen.

## Web Vitals

10 Aufrufe je Zeile, 75. Perzentil, vor der Korrektur:

| Gerät | Seite | LCP | CLS | INP |
| --- | --- | --- | --- | --- |
| Desktop | `/de` | 1617 ms | 0,540 | 40 ms |
| Desktop | `/de/suche?ort=stadt-zuerich` | 1524 ms | 0,520 | 30 ms |
| Desktop | `/de/p/demo-alessia` | 748 ms | 0,540 | 24 ms |
| Handy | `/de` | 971 ms | 0 | 32 ms |
| Handy | `/de/suche?ort=stadt-zuerich` | 971 ms | 0 | 56 ms |
| Handy | `/de/p/demo-alessia` | 776 ms | 0 | 32 ms |

### Befund: Fusszeile verschiebt sich am Desktop (CLS 0,54)

- **Was passiert:** Die Bildaufzeichnung zeigt beim ersten Zeichnen `main#inhalt` mit 267 px Höhe (Ladezustand aus `loading.tsx`) und die Fusszeile bei y = 331 px. Sie füllt den unteren Teil des Bildschirms, weil der Rahmen der Shell `min-h-dvh` hat und `main` nur `flex-1` ist. Rund 10 ms später kommt der gestreamte Inhalt, und die Fusszeile springt auf y = 1742 px. Das ist eine einzige Verschiebung mit dem Wert 0,54.
- **Handy:** Dort ist die Fusszeile höher als der Bildschirm und steht schon beim ersten Zeichnen ausserhalb. Deshalb ist der Wert dort 0.
- **Lokal nicht sichtbar:** Gegen den lokalen Produktions-Build kommt der Inhalt ohne Verzögerung mit, der Wert ist dort auch ohne Korrektur 0.
- **Korrektur:** `PageMain` (`apps/web/features/shell/components/page-main.tsx`) ist jetzt mindestens so hoch wie der Bildschirm (`min-h-dvh`). Die Fusszeile beginnt damit immer unterhalb des sichtbaren Bereichs.
- **Prüfung auf Staging:** Je 5 Aufrufe mit derselben Regel im ausgelieferten HTML (Playwright, `bypassCSP`, weil die CSP Inline-Stile ohne Nonce sperrt):

  | Seite | Desktop ohne | Desktop mit | Handy ohne | Handy mit |
  | --- | --- | --- | --- | --- |
  | `/de` | 0,54 | 0 | 0 | 0 |
  | `/de/suche?ort=stadt-zuerich` | 0,52 | 0 | 0 | 0 |
  | `/de/p/demo-alessia` | 0,54 | 0 | 0 | 0 |

- **Folge:** Kurze Seiten (zum Beispiel Rechtstexte oder «Nicht gefunden») zeigen die Fusszeile erst nach dem Scrollen.
- **Nach dem nächsten Deploy auf Staging:** `web-vitals.mjs` noch einmal ausführen. Die Messung mit dem echten Build steht noch aus.

## Grenzen

- **Labor, nicht Feld:** Die Ziele in 14.6 meinen das 75. Perzentil echter Besuche. Gemessen ist ein schneller Rechner mit guter Verbindung in einem Rechenzentrum, ohne CPU- oder Netzdrosselung. Langsame Handys und Mobilfunk liegen höher. Felddaten gibt es erst mit einer Erfassung im Browser (zum Beispiel `web-vitals` mit Meldung an den Server), die noch fehlt.
- **INP:** Nur ein Klick pro Aufruf. Teure Interaktionen wie das Filter-Sheet mit Trefferzahl, die Lightbox oder der Kalender sind nicht einzeln gemessen.
- **Netzweg:** Die Messung lief aus einer Cloud-Umgebung. Die ~120 ms der Grundlinie stecken in allen Zeiten der Suche; «serverseitig» ist deshalb nur abgeschätzt.
- **Datenmenge:** Die Suche fand in Staging 21 öffentliche Demo-Profile. Mit vielen Profilen ist die Abfrage erneut zu messen, spätestens vor einer Öffnung weiterer Regionen.
- **Statistik:** Die Aufrufe zählen in Staging als Sucheinblendungen und Profilansichten der Demo-Profile.
