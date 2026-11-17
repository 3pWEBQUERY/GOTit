# Übergabe Phase 1, Schritt 1.5 (Verifizierung und Onboarding)

**Stand:** 17.11.2026, Branch `claude/trusting-carson-zd6syt`

Kurz: Anbieter durchlaufen ein Onboarding in acht Schritten, bestehen eine Identitätsprüfung beim Dienstleister und reichen ein. Das Profil wird erst nach manueller Freigabe im Admin öffentlich. Das Abnahmekriterium «Kein Profil wird ohne Prüfung und Freigabe öffentlich, per Test für jede Statuskombination belegt» ist erfüllt: Der Test prüft 3808 Kombinationen, und genau eine ergibt «öffentlich». Regeln und Gates: `docs/decisions/0009-verifizierung-und-onboarding.md`.

## Was gebaut ist

- **Datenmodell:**
  - Neue Tabellen: Identitätsprüfung (nur Ergebnis, Zeitpunkt, Ablauf, Grund als Schlüssel), Prüffall mit Grund pro Feld, interne Rollen, Audit-Log, Regionen, Leistungen und Preise eines Profils.
  - Migration `20261117000000_verifizierung`.
- **Kern** (`packages/core`):
  - `verification`: Regel für «öffentlich», Schnittstelle zum Dienstleister, Test-Dienstleister nur ausserhalb von `APP_ENV=production`, Prüffälle.
  - `onboarding`: Schritte, Speichern, Einreichen.
  - `admin`: Zugang nur mit interner Rolle und 2FA.
- **Prüfregeln:**
  - Entscheide sind atomar, verlangen Begründung und Regel und landen im Audit-Log.
  - Freigeben prüft die Identität zum Zeitpunkt des Entscheids erneut.
  - Die Prüfrolle verlangt der Kern selbst.
- **Minderjährigkeit:** Das Profil wird sofort gesperrt, und im Audit-Log entsteht ein Fall für Trust & Safety.
- **Seiten für Anbieter** (`studio/(einrichtung)`):
  - Onboarding unter `/studio/start/[schritt]` mit Fortschritt, Dauer, Speichern beim Weitergehen und Gründen pro Feld bei einer Rückgabe.
  - `/studio/verifizierung` mit Status, Ablauf und erneuter Prüfung.
  - Hinweise auf Heute: «wird geprüft», Korrekturen, Ablauf in höchstens 30 Tagen.
- **Test-Dienstleister** `/dev/verifizierung/[ref]`: nur mit `IDENTITY_PROVIDER=test` und ausserhalb der Produktion.
- **Admin** (`/admin`):
  - Eigene Shell. Ohne interne Rolle eine echte 404; mit Rolle, aber ohne 2FA die Aufforderung zur Einrichtung.
  - Warteschlange älteste zuerst, Taste N öffnet den nächsten Fall.
  - Einzelfall mit verdeckten Prüfdetails: Aufdecken nur mit Grund und Audit-Eintrag.
  - Entscheid «Freigeben», «Zur Korrektur» (mit Grund pro Feld) oder «Ablehnen». Unter 1024 px nur lesend.
- **Erste Admin-Rolle einer Umgebung:** `pnpm --filter @app/db grant-role <email> SUPER_ADMIN`.

## Was getestet ist (ausgeführt am 17.11.2026)

| Prüfung | Ergebnis |
| --- | --- |
| `pnpm check:file-size` | 728 Dateien, keine über 600 Zeilen |
| Lint, Typen, Unit- und Integrationstests (Turbo, alle Pakete) | 27 von 27 Aufgaben grün |
| Regel «öffentlich» | 3808 Kombinationen aus Identität, Profilstatus und Prüfentscheid |
| Integrationstests gegen Postgres | Siehe Liste unten |
| Playwright gegen den Produktions-Build, alle Schritte 1.1 bis 1.5 | **125 von 125 grün** |

Die Integrationstests gegen Postgres decken ab:
- der vollständige Weg bis zur Freigabe,
- eine Referenz wirkt nur einmal,
- Minderjährigkeit sperrt,
- abgelaufene Prüfung verhindert die Freigabe,
- Rückgabe zur Korrektur mit Gründen pro Feld,
- ohne Prüfrolle verweigert der Kern,
- zwei gleichzeitige Entscheide ergeben genau einen Gewinner.

Ein Passkey-Test fiel im ersten vollen Lauf einmal mit einer abgebrochenen Navigation aus. Allein lief er dreimal grün, im zweiten vollen Lauf ebenfalls; er ist als möglicherweise wackelig vermerkt.

## Was nicht geprüft ist

- **Ein echter Prüfdienstleister** (Gate 16.3). In der Produktion gibt es keinen. Dort kann deshalb niemand die Prüfung bestehen, und kein Profil wird öffentlich. So verlangt es die PRD.
- **Medien und Verfügbarkeit im Onboarding:** Die Schritte erklären, dass ihre Editoren mit 1.6 und 1.9 kommen, und lassen sich überspringen.

## Offene Punkte

1. **Prüfdienstleister wählen** (Gate 16.3). Danach entsteht eine zweite Implementierung von `IdentityProvider` samt Webhook für das Ergebnis.
2. **Zuweisung von Fällen** an Prüfende gibt es noch nicht; die Spalte zeigt nur an. Kommt mit der Moderation in Schritt 1.13.
3. **Mobile Tab-Leiste:** Die Shell sollte einen offiziellen Weg bekommen, sie in mehrstufigen Formularen auszublenden. Heute geschieht das über eine CSS-Regel im Onboarding.
4. **`getOnboardingState`** könnte die vollständige Identitätsprüfung liefern; die Seite lädt sie heute ein zweites Mal.
5. **Erinnerungs-E-Mail vor Ablauf der Verifizierung:** Sie kommt mit dem E-Mail-Anbieter und dem Cron-Dienst. Heute erscheint der Hinweis nur auf Heute.
