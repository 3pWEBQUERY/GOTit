import { THEME_COOKIE, type Theme } from "./theme";

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Schreibt eine Einstellung, die der Server beim nächsten Rendern lesen soll. */
export function rememberPreference(name: string, value: string): void {
  document.cookie = `${name}=${value}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
}

/** Setzt die Darstellung sofort am Dokument und merkt sie im Cookie. */
export function applyTheme(theme: Theme): void {
  if (theme === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", theme);
  rememberPreference(THEME_COOKIE, theme);
}
