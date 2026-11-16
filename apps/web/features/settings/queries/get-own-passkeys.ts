import { getDb } from "@app/db";

export interface PasskeyView {
  id: string;
  name: string | null;
  createdAt: Date | null;
  backedUp: boolean;
}

/** Eigene Passkeys ohne Schlüsselmaterial: Name, Datum, ob synchronisiert. */
export async function getOwnPasskeys(userId: string): Promise<PasskeyView[]> {
  return getDb().passkey.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, createdAt: true, backedUp: true },
  });
}
