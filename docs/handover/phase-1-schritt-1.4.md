# Übergabe Phase 1, Schritt 1.4 (Konto)

**Stand:** 17.11.2026, Branch `claude/trusting-carson-zd6syt`

Kurz: Registrierung, Anmeldung, Passkeys, 2FA, Sitzungen, Einstellungen, Export und Löschung sind gebaut und getestet. Abnahmekriterien: `docs/decisions/0008-konto-abnahme.md`; die PRD v1.0 mit 20.1 liegt nicht vor, die Kriterien sind aus v2.0 abgeleitet. In der Produktion bleibt die Registrierung geschlossen, bis ein E-Mail-Anbieter gewählt ist (PRD-Gate 16.3).

## Was gebaut ist

### Datenmodell und Backend

- **Schema:**
  - Neu: Kontotyp, Benutzername, Deaktivierung und Löschantrag am Konto.
  - Neue Tabellen: `twoFactor`, `passkey`, `user_preference`, `security_event`, `email_outbox`.
  - Migration `20261116230000_konto`.
- **Better Auth** (`packages/auth`):
  - E-Mail-Bestätigung ist Pflicht, Passwort mindestens 12 Zeichen.
  - TOTP mit Ersatzcodes, Passkeys.
  - Sitzungen in Postgres und Redis.
  - Die öffentliche Registrierung ist gesperrt, registriert wird nur über die Server Action.
- **Rate Limits** in Redis, je Client-Adresse aus `x-real-ip`, das Railway am Rand setzt:
  - Anmeldung und zweiter Faktor: 5 pro Minute.
  - Registrierung und Passwort vergessen: 3 pro Stunde.
  - Erneut senden: 3 pro 15 Minuten.
  - Export: 3 pro Stunde.
- **E-Mail:**
  - Vorlagen in vier Sprachen mit neutralem Betreff.
  - Versand über die Queue `email` im Worker, per SMTP oder Ausgang.
  - Der Ausgang (`email_outbox`) ist nur ausserhalb von `APP_ENV=production` erlaubt. Ohne Versand ist die Registrierung geschlossen und sagt das.
- **Änderungsprotokoll:** Hooks schreiben Anmeldung, Reaktivierung, Passwort, 2FA, Passkey, Sitzung beendet und E-Mail bestätigt. Server Actions schreiben Profil, Export, Deaktivierung und Löschantrag. Ohne IP-Adresse, ohne Inhalte.
- **Aufbewahrung:** Fristen stehen in `packages/core/retention`. Der Cron-Dienst `purge-expired` (täglich 03:17 UTC) setzt sie durch: Konten 30 Tage nach dem Löschantrag, Protokoll 365 Tage, Ausgang 7 Tage, abgelaufene Token nach 1 Tag.

### Seiten

- **`/registrieren`:**
  - Kontotyp Mitglied, Anbieter, Club oder Agentur. Clubs und Agenturen werden als `CLUB` bzw. `AGENCY` angelegt, beide im Entwurf.
  - Volljährigkeit und Bedingungen sind Pflicht.
  - Eine vergebene Adresse wird nicht verraten.
- **`/registrieren/bestaetigen`:** Postfach-Hinweis mit «Erneut senden», «Bestätigt» mit dem nächsten Schritt je Kontotyp, Zustand für ungültige Links.
- **`/anmelden`:**
  - Passwort oder Passkey.
  - Die Fehlermeldung ist für unbekannte Adresse und falsches Passwort gleich.
  - Zusätzlich Zustände für unbestätigte Adresse und Wartezeit.
- **`/anmelden/2fa`:** Code oder Ersatzcode, «Diesem Gerät 30 Tage vertrauen».
- **`/passwort/vergessen`** und **`/passwort/neu`:** Die Antwort ist immer gleich; ein neues Passwort meldet alle Geräte ab.
- **`/einstellungen/profil`** und **`/einstellungen/sicherheit`:**
  - Passwort ändern.
  - 2FA mit QR-Code und Ersatzcodes.
  - Passkeys.
  - Sitzungen.
  - Änderungsprotokoll.
- **Weitere Einstellungen:**
  - `/einstellungen/privatsphaere`.
  - `/einstellungen/benachrichtigungen`: Sicherheit per E-Mail ist gesperrt und erklärt.
  - `/einstellungen/darstellung`: Sprache, Thema, Bewegung, neutraler Titel; wirkt sofort.
  - `/einstellungen/daten`: Export, Deaktivieren, Löschung beantragen.
- **`/ich`:** Übersicht mit ehrlichen Leerzuständen für Anfragen, Nachrichten und Termine (kommen mit 1.8/1.9), dazu Kurzlinks.
- **Zugriff:** Der Mitgliederbereich ist nur angemeldet erreichbar, sonst geht es zu `/anmelden?weiter=`.

## Was getestet ist (ausgeführt am 16./17.11.2026)

| Prüfung | Ergebnis |
| --- | --- |
| `pnpm check:file-size` | 601 Dateien, keine über 600 Zeilen |
| Lint, Typen, Unit- und Integrationstests (Turbo, alle Pakete) | 27 von 27 Aufgaben grün |
| Integrationstests gegen Postgres und Redis | Registrierung ist öffentlich gesperrt, die Bestätigung landet in der Queue, ohne Bestätigung keine Sitzung; Rate Limit |
| Playwright gegen den Produktions-Build mit Worker | **97 von 97 grün, zweimal hintereinander** |

Die End-to-End-Tests decken die Kriterien 1–24 aus `0008` ab:
- Die Registrierung als Mitglied und als Anbieter läuft mit echter E-Mail im Ausgang.
- Weitere Abläufe: vergebene Adresse, Pflichtfelder, unbestätigte Adresse, gleiche Fehlermeldung, Rate Limit, 2FA-Anmeldung, Passwort zurücksetzen.
- In den Einstellungen sind getestet:
  - Profil.
  - 2FA einrichten und abschalten.
  - Passkey mit virtuellem Authenticator, inklusive Anmeldung per Passkey.
  - Sitzungen beenden, auch der Versuch mit einer fremden Sitzungs-ID.
  - Passwort ändern mit Abmeldung der anderen Geräte.
  - Darstellung, Privatsphäre, Benachrichtigungen.
  - Export ohne Geheimnisse.
  - Löschung beantragen mit Reaktivierung.
  - Deaktivieren.
- axe ohne Befunde «serious» und «critical» hell und dunkel, kein horizontales Scrollen bei 320 px.
- Im Produktions-Build zeigen die geprüften Seiten keine CSP-Fehler in der Konsole.

## Unterwegs gefundene und behobene Fehler

- **Rate Limits:** Sie nutzten den ersten Eintrag von `x-forwarded-for`, den der Client fälschen kann. Jetzt nutzen sie `x-real-ip`, das Railway setzt.
- **Sitzungen:** Deaktivieren und Löschen beendeten die Sitzungen nur in Postgres, nicht in Redis. Jetzt laufen sie über die Auth-API.
- **Änderungsprotokoll:** Der Hook schrieb «2FA eingerichtet» und «E-Mail bestätigt» nie, weil ihm die Konto-ID fehlte. Er liest das Ereignis jetzt nach der Änderung aus dem Pfad.
- **Organisationen:** Der Fehler zum fehlenden Organisationsnamen erschien erst, wenn alle anderen Felder stimmten. Ausserdem wurden Agenturen als Club angelegt.
- **`realtime`:** Der Dienst startete auf Railway nicht, weil ihm ein Paket fehlte. Dienst-Builds prüfen jetzt jede externe Abhängigkeit.
- **`APP_ENV`:** Test-Builds laufen mit `NODE_ENV=production`. Die Unterscheidung der Umgebung läuft deshalb über die neue Variable `APP_ENV`, die auf Railway `production` ist.
- **Turbo:** Turbo reichte Laufzeitvariablen nicht an Tests weiter; in der CI wären die Integrationstests gescheitert.

## Was nicht geprüft ist

- **Echter E-Mail-Versand per SMTP:** Kein Anbieter gewählt. Getestet sind der Ausgang und die Fehlermeldung ohne Versand.
- **Passkeys auf echten Geräten:** Geprüft nur mit dem virtuellen Authenticator von Chromium.
- **Die CI auf GitHub:** noch nie gelaufen; lokal sind dieselben Befehle grün.

## Offene Punkte

1. **E-Mail-Anbieter (Gate 16.3):** Nach der Wahl an `web` und `worker` setzen: `MAIL_TRANSPORT=smtp`, `SMTP_URL`, `MAIL_FROM`. Erst dann öffnet die Registrierung in der Produktion.
2. **Darstellung auf einem neuen Gerät:** Sie folgt bis zur ersten Änderung der Gerätevorgabe; die Werte aus dem Konto werden bei der Anmeldung noch nicht in die Cookies übernommen.
3. **Hinweis nach Deaktivieren oder Löschantrag:** Er erscheint als Toast; die Startseite selbst zeigt ihn nicht.
4. **Fehlende Ziele:** Favoriten, gespeicherte Suchen und Bewertungen auf `/ich` führen auf die 404-Seite, bis die Schritte 1.7 und 1.10 sie bauen.
5. **`/studio/start` fehlt:** Anbieter landen nach der Bestätigung dort, die Seite kommt in Schritt 1.5.
6. **Railway, Dienst `staging`:** Er ist eine Kopie von `web` in der Produktion, hängt an der echten Datenbank und ist keine Umgebung. Entscheidung bei Alexander, siehe `docs/railway.md`.

## Nächster Schritt

1.5 Verifizierung und Onboarding: Identitätsprüfung über eine Dienstleister-Schnittstelle, acht Onboarding-Schritte, Prüfwarteschlange im Admin. Die Wahl des Prüfdienstleisters ist ein Gate (16.3); bis dahin entsteht die Schnittstelle mit einer Test-Implementierung, die nie freigibt.
