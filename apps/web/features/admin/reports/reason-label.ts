/** Übersetzter Meldegrund; ein unbekannter Schlüssel erscheint als «Sonstiges», nie roh. */
export function reasonLabel(t: { (key: string): string; has: (key: string) => boolean }, reason: string): string {
  return t.has(`reasons.${reason}`) ? t(`reasons.${reason}`) : t("reasons.other");
}
