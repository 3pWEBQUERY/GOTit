/** Ein Namensraum pro Datei unter `messages/<sprache>/` (PRD 4.1). */
export const NAMESPACES = ["common", "shell", "nav", "footer", "ageGate", "discover", "studio", "forProviders", "system", "auth", "settings", "member", "admin", "onboarding", "media", "profile", "search", "favorites", "messages", "booking", "bookingStudio", "reviews", "organization", "clubs", "stats", "moderation", "adminCommon", "adminUsers", "adminCatalog", "adminContent", "adminSupport", "adminSystem", "info"] as const;
export type Namespace = (typeof NAMESPACES)[number];
