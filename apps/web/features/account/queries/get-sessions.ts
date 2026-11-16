import { deviceLabel } from "@app/core/account";
import { getDb } from "@app/db";

export interface SessionView {
  id: string;
  device: string | null;
  createdAt: Date;
  lastActiveAt: Date;
  current: boolean;
}

/** Eigene, gültige Sitzungen ohne Token und ohne IP-Adresse. */
export async function getOwnSessions(userId: string, currentSessionId: string | null): Promise<SessionView[]> {
  const rows = await getDb().session.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { updatedAt: "desc" },
    select: { id: true, userAgent: true, createdAt: true, updatedAt: true },
  });
  return rows.map((row) => ({
    id: row.id,
    device: deviceLabel(row.userAgent),
    createdAt: row.createdAt,
    lastActiveAt: row.updatedAt,
    current: row.id === currentSessionId,
  }));
}
