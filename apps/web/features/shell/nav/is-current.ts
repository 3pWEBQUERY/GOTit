/** Ob ein Navigationsziel zur aktuellen Seite gehört. Wurzeln gelten nur bei exakter Übereinstimmung. */
export function isCurrentPath(pathname: string, href: string, roots: readonly string[]): boolean {
  const target = href.split(/[?#]/)[0] ?? href;
  if (roots.includes(target)) return pathname === target;
  return pathname === target || pathname.startsWith(`${target}/`);
}

/** Ob der Pfad im Studio liegt (zweites Segment nach der Sprache). */
export function isStudioPath(pathname: string): boolean {
  return pathname.split("/")[2] === "studio";
}

/** Slug der Organisation, wenn der Pfad in deren Studio-Kontext liegt. */
export function organizationSlugFromPath(pathname: string): string | null {
  const segments = pathname.split("/");
  return segments[2] === "studio" && segments[3] === "o" ? (segments[4] ?? null) : null;
}
