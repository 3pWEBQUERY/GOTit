import { getDb } from "@app/db";

/** Benutzernamen zu Konto-IDs, für Zuständigkeit und Verfasser im Support. */
export async function usernames(ids: readonly (string | null)[]): Promise<Map<string, string | null>> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (unique.length === 0) return new Map();
  const rows = await getDb().user.findMany({ where: { id: { in: unique } }, select: { id: true, username: true, name: true } });
  return new Map(rows.map((row) => [row.id, row.username ?? row.name]));
}
