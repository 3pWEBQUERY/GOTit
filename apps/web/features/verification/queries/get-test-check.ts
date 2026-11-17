import { getDb } from "@app/db";

/** Prüfung des Test-Dienstleisters, nur wenn sie dem angemeldeten Konto gehört. */
export async function getTestCheck(externalRef: string, userId: string) {
  const check = await getDb().identityCheck.findUnique({
    where: { externalRef },
    select: { userId: true, status: true, provider: true },
  });
  if (!check || check.userId !== userId || check.provider !== "test") return null;
  return { status: check.status };
}
