import { zonedToUtc } from "@app/core/booking";

/** Ende einer Einschränkung aus einem Tag (YYYY-MM-DD): bis 23:59 Zürcher Zeit (Entscheid 0021). */
export function untilFromDay(day: string | null | undefined): Date | null {
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  return zonedToUtc(day, 23 * 60 + 59, "Europe/Zurich");
}
