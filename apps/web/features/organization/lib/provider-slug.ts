const SLUG = /^[a-z0-9-]{1,80}$/;

/**
 * Profilname aus der Eingabe von «Einladen»: der Name selbst («lena-zh»), mit
 * «@» davor oder eine eingefügte Profil-URL wie `https://…/de/p/lena-zh/medien`.
 * Ohne erkennbaren Namen: null. Gross- und Kleinschreibung zählt nicht.
 */
export function parseProviderSlug(input: string): string | null {
  const value = input.trim();
  if (value === "") return null;
  const path = value.includes("/") ? pathOf(value) : value.replace(/^@/, "");
  if (path === null) return null;
  const match = path.match(/(?:^|\/)p\/([^/?#]+)/);
  const candidate = decodeSegment(
    match ? match[1] : value.includes("/") ? "" : path,
  )?.toLowerCase();
  return candidate && SLUG.test(candidate) ? candidate : null;
}

function pathOf(value: string): string | null {
  try {
    return new URL(
      value.includes("://")
        ? value
        : `https://platzhalter.invalid/${value.replace(/^\/+/, "")}`,
    ).pathname;
  } catch {
    return null;
  }
}

function decodeSegment(segment: string | undefined): string | null {
  if (!segment) return null;
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}
