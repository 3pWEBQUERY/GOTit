# 0006 Details der Shell (reine UI-Entscheide)

- **Seitenleiste fährt ein, aber nicht aus.** Beim Wechsel ins Studio fährt sie in 250 ms von links ein. Beim Wechsel zurück verschwindet sie ohne Animation, weil ihr Layout dann bereits abgebaut ist. Die Kopfzeile bleibt in beiden Richtungen derselbe DOM-Knoten (per Test belegt).
- **Zuletzt besuchte Seite:** Der `ModeSwitch` merkt sich pro Bereich die letzte Seite in `sessionStorage` und führt beim Wechsel dorthin zurück.
- **Titel der mobilen Top-Leiste:** Seiten setzen ihn über `TopBarTitle`. Bis die Seite hydriert ist, steht dort der Produktname.
- **Entdecken-Sheet:** unter 768 px ein Sheet von unten (volle Höhe, deckend), von 768 bis 1023 px ein Seiten-Sheet. Auf Mobile öffnet es der Menü-Button der Top-Leiste.
- **«Zuletzt angesehen»** hat in der PRD keine eigene Route; der Link zeigt auf `/ich#zuletzt-angesehen`.
- **«Stories»** im Community-Menü zeigt auf `/community#stories`, weil es nur `/community/stories/[id]` gibt.
- **Ausgewählte Zustände** (Checkbox, Radio, Switch, Kalendertag) sind in Tinte statt Akzent gehalten: Der Akzent bleibt der primären Aktion, der aktiven Navigation und dem Fokus vorbehalten (PRD 5.1).
- **Sheet auf halber Höhe** ist als Ganzes Glas (PRD 5.5: «Ein Sheet auf halber Höhe ist Glas»).
- **`/dev/ui`** ist ein Entwicklerwerkzeug: deutsche, erkennbar fiktive Beispieltexte, nicht übersetzt, in der Produktion nicht erreichbar.
- **Produktname:** offen (PRD 18). Voreinstellung ist der Arbeitsname «GOTit», änderbar über `APP_NAME`.
- **Fliesstext-Breite:** 68 Zeichen (`max-w-prose`), Lesespalten 680 px (`max-w-reading`).
