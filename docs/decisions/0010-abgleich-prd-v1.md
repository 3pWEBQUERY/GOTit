# 0010 Abgleich mit PRD v1.0

**Stand:** 17.11.2026

PRD v1.0 liegt jetzt vor (`docs/prd/prd-v1.0.md`). Die Entscheide 0008 und 0009 waren aus v2.0 abgeleitet; dieser Abgleich prüft das Gebaute (Schritte 1.1 bis 1.5) gegen v1.0. Bei Widersprüchen gilt v2.0 (v2.0, Abschnitt 2).

## Nachgezogen am 17.11.2026

| Anforderung v1.0 | Vorher | Jetzt |
| --- | --- | --- |
| FR-AUTH-001 Zustimmung zu Nutzungsbedingungen und Datenschutz, Datenmodell `ConsentRecord` | Geprüft, aber nicht gespeichert | Registrierung speichert AGB, Datenschutz und Altersbestätigung mit Version; der Datenexport enthält sie |
| FR-VERIFY-002 Zustimmung zur konkreten Profilveröffentlichung | Fehlte | Einreichen verlangt ausdrückliche Zustimmung (Kästchen); gespeichert als `PROFILE_PUBLICATION` |
| FR-PROFILE-005 «Jeder Statuswechsel wird protokolliert» | Fehlte | Datenbank-Trigger schreibt jede Änderung in `provider_status_event`, unabhängig vom Codepfad. Wer und warum steht bei Entscheiden im Audit-Log |
| FR-PROFILE-005 Status «Eingeschränkt» | Fehlte | `RESTRICTED` ergänzt; ein eingeschränktes Profil lässt sich nicht selbst pausieren oder freischalten |

Der Status «Verifizierung ausstehend» aus v1.0 ist kein eigener Profilstatus: Er ergibt sich aus Profil im Entwurf und laufender Identitätsprüfung und wird im Onboarding so angezeigt.

## Erfüllt

- **FR-AUTH-001:** Registrierung mit Kontotyp, E-Mail-Bestätigung, Passwortprüfung und Passwort-Reset. Massenregistrierung ist durch das Rate Limit begrenzt.
- **FR-AUTH-002:** Ein Konto mit mehreren Rollen; Organisationen sind getrennt.
- **FR-AUTH-003:** 2FA, Passkeys, Sitzungsübersicht, Abmeldung anderer Geräte, Beenden von Sitzungen, Änderungsprotokoll.
- **FR-AUTH-004:** Konto bearbeiten, Benutzername, Sichtbarkeit, Export, Deaktivieren, Löschung, Benachrichtigungen.
- **FR-VERIFY-002:** Volljährigkeit, Identität und Lebendigkeit beim Dienstleister; Status und Ablauf; manuelle Prüfung; gespeichert werden nur Ergebnisse.
- **FR-VERIFY-004:** Getrennte Signale; ein Tarif ändert nie die Verifizierung.
- **20.1:** alle Punkte.
- **20.2:** Entwurf, Veröffentlichung erst nach Prüfungen, selbstständiges Pausieren. Die Medien kommen mit 1.6.

## Offen und eingeplant

| Anforderung v1.0 | Wann |
| --- | --- |
| FR-AUTH-003 Benachrichtigung bei ungewöhnlichen Logins | Mit dem Benachrichtigungsmodul und dem E-Mail-Anbieter. Neue Geräte werden bereits im Änderungsprotokoll erfasst |
| FR-AUTH-001 Verhinderung eindeutig missbräuchlicher Doppelaccounts | Heute ist jede E-Mail-Adresse eindeutig. Weitergehend: Der Prüfdienstleister liefert eine stabile Personenreferenz; damit lässt sich ein zweites Anbieterprofil derselben Person erkennen. Kommt mit der Anbindung des Dienstleisters |
| FR-VERIFY-002 Prüfung rechtlich erforderlicher Nachweise | Hängt von der rechtlichen Einordnung je Kanton ab (Gate). Die Regionen tragen dafür später Freigaberegeln (v1.0, 9.5) |
| FR-VERIFY-003 Unternehmen prüfen | Schritt 1.11 |
| FR-PROFILE-001 bis 004 Profilinhalte, Kontaktoptionen, Sichtbarkeit; FR-MEDIA | Schritt 1.6 |
| FR-PROFILE-006 Kritische Änderungen erneut prüfen | Schritt 1.6 |
| v1.0, 9.3 Moderationsfall mit Kategorie, Priorität, Zuständigkeit, Einspruchsstatus | Schritt 1.13. Der Prüffall aus 1.5 wird dort Teil der allgemeinen Moderation |
| 13.2 und 20.7 Backups und Restore-Test | Schritt 1.14 |

## Entschieden: Altersprüfung für Besucher (FR-VERIFY-001)

**Entscheid vom 17.11.2026 (Alexander):** Für den Start bleibt die Selbstauskunft mit signiertem Cookie die Altersprüfung für Besucher. Die zweite Stufe unten bleibt ein Vorschlag für später, zum Beispiel wenn die rechtliche Einordnung einer Region sie verlangt.

Ursprüngliche Ausgangslage und Vorschlag:

v1.0 sagt: «Eine einfache ‹Ich bin 18›-Schaltfläche wird nicht als alleinige Schutzmassnahme vorausgesetzt.» Für Besucher ist heute genau das gebaut: Selbstauskunft mit signiertem Cookie (Entscheid 0002). Die Anbieter sind davon nicht betroffen; ihre Prüfung läuft beim Dienstleister.

Das ist eine rechtliche Frage. Nach der Regel der PRD (v2.0, Abschnitt 1, Punkt 6) entscheidet sie Alexander. Vorschlag:

1. **Selbstauskunft als erste Stufe beibehalten.** Sie verhindert den zufälligen Zugang.
2. **Zweite Stufe vorbereiten:** dieselbe Schnittstelle zum Dienstleister, aber nur als Altersnachweis ohne Identität, zum Beispiel per Schätzung oder digitalem Ausweis. Sie wird pro Region einschaltbar, sobald die rechtliche Einordnung sie verlangt.
3. **Festlegen,** was ohne zweite Stufe zugänglich bleibt, etwa Übersichtsseiten ohne Fotos. Auch das hängt von der rechtlichen Einordnung ab.

Die Selbstauskunft bleibt aktiv. Die zweite Stufe wird nicht gebaut.

## Prüfdienstleister (Gate 16.3)

Die Wahl folgt gegen Ende von Phase 1 (Entscheid vom 17.11.2026). Bis dahin läuft der Test-Dienstleister nur ausserhalb der Produktion; in der Produktion kann deshalb noch kein Profil öffentlich werden.
