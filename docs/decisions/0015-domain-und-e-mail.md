# 0015 Domain und E-Mail-Versand

**Stand:** 17.11.2026

## Domain

- **Domains:** Die Plattform läuft unter `thegnd.net`, Staging unter `staging.thegnd.net`. Der Echtzeit-Dienst hat eigene Subdomains (`realtime.…`, `realtime-staging.…`, PRD v2 13: «eigene Subdomain»).
- **Kanonischer Host:** `APP_URL` bestimmt ihn. Better Auth nimmt Anmeldungen nur von diesem Ursprung an, und Cookies gelten pro Host.
- **Umleitung:**
  - Seitenaufrufe über `www.thegnd.net` oder die Railway-Domain leiten mit 308 auf `APP_URL` um, mit Pfad und Suchparametern (`apps/web/features/system/canonical-host.ts`).
  - Das gilt nur in `production` und `staging`; lokal und in Tests nicht.
  - API-Routen, Medien und der Gesundheitscheck sind ausgenommen, weil `proxy.ts` sie nicht erreicht.
- **Passkeys** sind an den Host aus `APP_URL` gebunden. In der Produktion gab es vor der Umstellung keine.

## E-Mail

- **Anbieter:** Resend, über die HTTP-API (Entscheid in `docs/railway.md`). Absender ist `noreply@thegnd.net` mit dem Produktnamen; die Domain ist bei Resend verifiziert.
- **Staging** verschickt nichts; E-Mails landen dort in der Tabelle `email_outbox`.
- **Nutzungsbedingungen (Gate 16.3):** Alexander hat Resend gewählt und eingerichtet. Ob die Nutzungsbedingungen von Resend Plattformen dieser Branche zulassen, ist damit nicht schriftlich geprüft; das bleibt ein offener Punkt der Übergabe.
