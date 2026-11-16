import type { HrefBuilder } from "../shell/nav/href";

export const SETTINGS_SECTIONS = ["profile", "security", "privacy", "notifications", "appearance", "data"] as const;
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

const PATHS = {
  profile: "/einstellungen/profil",
  security: "/einstellungen/sicherheit",
  privacy: "/einstellungen/privatsphaere",
  notifications: "/einstellungen/benachrichtigungen",
  appearance: "/einstellungen/darstellung",
  data: "/einstellungen/daten",
} as const satisfies Record<SettingsSection, string>;

/** Abschnitte der Einstellungen in fester Reihenfolge, je eine Route (PRD 7.5, 12.1). */
export function settingsLinks(href: HrefBuilder, label: (section: SettingsSection) => string) {
  return SETTINGS_SECTIONS.map((section) => ({ key: section, href: href(PATHS[section]), label: label(section) }));
}
