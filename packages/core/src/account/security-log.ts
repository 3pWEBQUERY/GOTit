import { getDb, type SecurityEventType } from "@app/db";
import { deviceLabel } from "./device-label";

/** Hält ein Sicherheitsereignis fest: Typ, Zeit, gekürzte Geräteangabe. Nie Inhalte, nie IP-Adressen. */
export async function recordSecurityEvent(userId: string, type: SecurityEventType, userAgent?: string | null): Promise<void> {
  await getDb().securityEvent.create({ data: { userId, type, device: deviceLabel(userAgent) } });
}

export interface SecurityEventView {
  id: string;
  type: SecurityEventType;
  device: string | null;
  createdAt: Date;
}

/** Änderungsprotokoll des eigenen Kontos, neueste zuerst. */
export async function listOwnSecurityEvents(userId: string, take = 50): Promise<SecurityEventView[]> {
  return getDb().securityEvent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, type: true, device: true, createdAt: true },
  });
}
