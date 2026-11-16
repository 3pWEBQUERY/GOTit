# 0003 Datenmodell vor Vorliegen der PRD v1.0

Die Shell braucht Rollen, Regionen, Kategorien und Feature Flags. Die Entitäten der PRD v1.0 (Abschnitte 12.2, 12.3) liegen nicht vor. Angelegt ist deshalb nur das Minimum: `User`, `Session`, `Account`, `Verification` (Better Auth), `ProviderProfile` (Slug, Anzeigename, Status), `Organization`, `OrganizationMember`, `Region`, `Category`, `FeatureFlag`.

Die Statuswerte von `ProviderProfile` (`DRAFT`, `SUBMITTED`, `CHANGES_REQUESTED`, `PUBLISHED`, `PAUSED`, `SUSPENDED`, `ARCHIVED`) sind aus der PRD v2.0 abgeleitet (Onboarding 11.8, Pausieren 6.2, Regeln 10.1). Sobald v1.0 vorliegt, wird das Modell per Migration angeglichen.

Die Registrierung über die API ist bis Schritt 1.4 abgeschaltet (`disableSignUp`). Konten entstehen bis dahin nur über den Seed.
