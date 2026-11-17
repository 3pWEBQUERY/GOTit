# 0012 Profilseite, Profil-Editor und Prüfung von Änderungen (Schritt 1.6)

**Stand:** 17.11.2026

## Sichtbarkeit der Profilseite `/p/[name]`

Die einzige Regel bleibt `isPubliclyVisible` (Entscheid 0009). `getPublicProfile` in `packages/core/src/provider-profile` wendet sie bei jedem Aufruf an:

| Lage | Ergebnis |
| --- | --- |
| `PUBLISHED`, letzte Erstprüfung freigegeben, Identität gültig | bereit |
| `PAUSED`, sonst wie oben | erreichbar mit «Dieses Profil ist zurzeit pausiert», ohne Kontakt, `noindex` (PRD v2 10.1) |
| `RESTRICTED`, sonst wie oben | sichtbar wie veröffentlicht, ohne Kontaktaktionen |
| Sichtbarkeit `MEMBERS`, Betrachter nicht angemeldet | nur Name und der Weg zur Anmeldung, `noindex` |
| `DRAFT`, `SUBMITTED`, `CHANGES_REQUESTED`, `SUSPENDED`, `ARCHIVED`, Identität abgelaufen oder fehlend, Erstprüfung nicht freigegeben | 404 |

- **Pausiert und eingeschränkt** gehen durch dieselbe Regel: Für die Prüfung wird nur ihr Status als «veröffentlicht» gelesen. Prüfentscheid und Identität müssen weiterhin gelten; eine abgelaufene Identität ergibt auch bei einem pausierten Profil 404.
- **Eingeschränkt** (PRD v1 FR-PROFILE-005) legt die PRD nicht näher fest. Auslegung: Die Moderation schränkt ein, ohne zu sperren. Das Profil bleibt mit seinen Inhalten sichtbar, Kontakt über die Plattform ist nicht möglich, und der Anbieter kann es weder pausieren noch selbst freischalten (Entscheid 0010). Prüfpflichtige Änderungen gehen wie bei veröffentlichten Profilen in die Prüfung.
- **Erstprüfung:** Massgeblich ist der letzte Prüffall der Art `PROFILE`. Änderungsprüfungen (`CHANGE`) beeinflussen die Sichtbarkeit nie; eine abgelehnte Änderung nimmt kein Profil offline.
- **Inhaber** sehen ihre Seite auch, wenn sie nicht öffentlich ist, mit der Eigentümer-Leiste und dem Status. Sie sehen immer den Online-Stand, nie wartende Änderungen.
- **Echte 404:** Ein Layout prüft vor dem Ladezustand, ob das Profil erreichbar ist; sonst käme die Seite gestreamt mit Status 200.
- **Felder:** Nur, was öffentlich sein darf. Nie Konto-ID, E-Mail oder Prüfdetails. «Identität geprüft» nur bei gültiger Prüfung mit Prüfdatum, «Fotos geprüft» nur mit mindestens einem freigegebenen Medium (`listProfileMedia`).

## Kontakt auf der Profilseite

«Termin anfragen» (1.9) und «Nachricht schreiben» (1.8) gibt es noch nicht. Statt toter Knöpfe steht in der `ContactBar` ein Satz, wann Kontakt möglich ist, je nach den Kontaktwegen des Anbieters. Dafür dient die Eigenschaft `paused` der Komponente, weil sie die einzige Form ohne Aktionen ist. Ihr Symbol ist das Pausenzeichen; eine eigene Form für Hinweise (etwa `notice`) gehört in `packages/ui` und kommt mit 1.8. «Melden» verlinkt `/melden` (Seite mit 1.13).

Unter 768 px ersetzt die Kontaktleiste aus Glas die Tab-Leiste. Die Tab-Leiste gehört der Shell; die Profilseite blendet sie für ihre Dauer aus (Inline-Stil am Element, weil ein `style`-Element bei Navigation im Browser an der Nonce der CSP scheitert).

## Prüfpflicht von Änderungen (PRD v2 11.2, v1 FR-PROFILE-006)

| Status | Wirkung |
| --- | --- |
| `DRAFT`, `CHANGES_REQUESTED` | alles sofort, kein Prüffall (Onboarding) |
| `PUBLISHED`, `PAUSED`, `RESTRICTED` | prüfpflichtige Felder warten, alles andere sofort |
| `SUBMITTED`, `SUSPENDED`, `ARCHIVED` | nicht bearbeitbar |

Prüfpflichtig sind Anzeigename, Kontaktwege und Regionen. Auslegung: **Was nur einschränkt, gilt sofort.** Einen Kontaktweg abschalten und Regionen streichen braucht keine Prüfung; einen Kontaktweg einschalten, Regionen hinzufügen und jeder neue Anzeigename schon. So kann ein Anbieter jederzeit ohne Wartezeit weniger zeigen.

- Wartende Werte stehen in `pendingChanges`, dazu ein offener Prüffall `kind CHANGE`. Das bisherige Profil bleibt online. Unkritisches gilt sofort und setzt `contentUpdatedAt`.
- Ändert der Anbieter, was wartet, ersetzt ein neuer Fall den offenen (gleicher Platz in der Warteschlange). Ein Entscheid zum alten Fall trifft ins Leere; niemand gibt einen Stand frei, den er nicht gesehen hat. Speichern und Entscheid sperren dieselbe Profilzeile (`FOR UPDATE`).
- Entspricht ein Feld wieder dem Online-Stand, wartet es nicht mehr. Wartet nichts mehr, verschwindet der offene Fall.
- **Entscheid:** `decideReview` erkennt die Art. Ein Fall `CHANGE` kennt nur Freigeben (übernimmt `pendingChanges` atomar) und Ablehnen (verwirft sie); «Zur Korrektur» wird abgewiesen. Rolle im Kern, Begründung und Regel Pflicht, Audit-Eintrag `profile_change.approved` oder `profile_change.rejected`. Der Status des Profils ändert sich nie. Eine inzwischen nicht mehr freigegebene Region fällt beim Übernehmen weg.
- Die letzte abgelehnte Änderung zeigt der Editor mit der Begründung.

## Profil-Editor `/studio/profil`

- **Abschnitte:** Basis (Anzeigename, Kurzbeschreibung, Sprachen), Beschreibung, Angebot (Leistungen), Preise (mit Ein- und Ausblenden), Kontakt, Sichtbarkeit (öffentlich oder Mitglieder, Ortsangabe), Regionen. Die Sprachen stehen unter Basis, weil sie im Kopf des Profils erscheinen.
- **Angebot:** Solange keine Kategorie freigegeben ist (Entscheid 0004), steht der Abschnitt auf «folgt» und erklärt das. Auf der Profilseite entfällt «Angebot» ohne Leistungen.
- **Ein Renderer:** `ProfileView` in `apps/web/features/profile/components/view` rendert die Profilseite, die Live-Vorschau im Studio (mit ungespeicherten Werten) und die Vorschau im Onboarding. Die Vorschau erzwingt die Anordnung Mobile oder Desktop; die Desktop-Vorschau wird in 1100 px gesetzt und auf die Spalte verkleinert.
- **Ungespeichertes:** liegt pro Abschnitt im `sessionStorage` des Tabs und kommt beim nächsten Öffnen mit Hinweis zurück. Links in der App fragen vorher nach, Neuladen und Schliessen fragt der Browser. Das Seitenpanel fragt im Panel nach, nicht in einem zweiten Dialog (PRD 13). Die Zurück-Taste des Browsers fragt nicht nach; die Eingaben bleiben im Zwischenspeicher.
- **Formulare** speichern mit «Änderungen speichern»; Kontaktwege und Ausblenden sind deshalb Kästchen, keine Schalter (PRD 13: Schalter speichern sofort).
- **Mobile:** Abschnittsliste als erste Ebene, Formular als zweite. Die Vorschau öffnet ein eigener Button über dem Formular als Sheet; die Top-Leiste gehört der Shell.

## Eigentümer-Leiste und Bearbeiten am Ort (PRD v2 6.1)

- «Bearbeiten» wählt den Abschnitt; er öffnet als Seitenpanel über dem Profil unter `?bearbeiten=<abschnitt>` (übersetzter Abschnittsname). Zurück schliesst das Panel (PRD 8.2). An den Abschnitten der Seite stehen für den Inhaber zusätzlich «… bearbeiten»-Links.
- **«Statistik ansehen»** verlinkt `/studio/statistik`. Die Seite entsteht mit Schritt 1.12; bis dahin erscheint der Link nicht, weil er ins Leere führen würde (PRD 8.2: keine Sackgassen). Schritt 1.12 ergänzt ihn in `apps/web/features/profile/components/page/owner-bar.tsx`.

## Tabs und SEO

- Tabs Übersicht und Medien, der aktive steht in der URL (`/p/[name]`, `/p/[name]/medien`). Bewertungen (1.10) und Beiträge (Phase 3) folgen mit ihren Modulen. Verfügbarkeit (1.9), Bewertungen und «Verknüpft mit» (1.11) erscheinen erst mit ihren Daten, ohne leere Hüllen.
- Server-gerendert, Canonical immer auf die Übersicht, `noindex` für pausierte Profile, alle Tabs ausser der Übersicht, «nur Mitglieder» und die Ansicht des Inhabers ohne öffentliche Sichtbarkeit. Titel und Beschreibung nur aus öffentlichen Feldern.

## Admin

Prüffälle `CHANGE` stehen in derselben Warteschlange `/admin/verifizierungen`, mit dem Wort «Änderung» neben dem Namen. Der Einzelfall stellt vorher (online) und nachher (beantragt) nur für die geänderten Felder gegenüber; der Entscheid läuft wie bei Erstprüfungen, mit den zwei passenden Möglichkeiten.
