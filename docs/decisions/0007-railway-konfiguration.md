# 0007 Railway-Konfiguration ohne `railway.json`

**Stand:** 16.11.2026

Die PRD (14.2) verlangt «Konfiguration als Code (`railway.json` pro Dienst)». Railway nimmt für neu angelegte Dienste keine Config-Datei mehr an («Config as Code» ist abgelöst durch «Infrastructure as Code» mit `.railway/railway.ts`). Die ursprünglich geschriebenen `apps/*/railway.json` hätten keine Wirkung gehabt und sind entfernt.

**Entscheid:** Build, Start, Pre-Deploy, Healthcheck, Watch-Pfade und Neustart sind direkt an den Diensten gesetzt. `docs/railway.md` beschreibt den Soll-Zustand vollständig.

**Offen:** Umstellung auf Infrastructure as Code. Sie braucht die Railway-CLI mit einem Projekt-Token in der CI. Den Token legt Alexander als GitHub-Secret an; danach kann die CI `.railway/railway.ts` anwenden.
