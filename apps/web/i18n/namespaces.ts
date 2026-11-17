/** Ein Namensraum pro Datei unter `messages/<sprache>/` (PRD 4.1). */
export const NAMESPACES = ["common", "shell", "nav", "footer", "ageGate", "discover", "studio", "forProviders", "system", "auth", "settings", "member", "admin", "onboarding"] as const;
export type Namespace = (typeof NAMESPACES)[number];
