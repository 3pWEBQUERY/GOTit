import { getDb } from "@app/db";
import { profileSchema } from "./schemas";

export type UpdateProfileResult = { ok: true } | { ok: false; field: "username"; error: "usernameTaken" };

/** Name und Benutzername des eigenen Kontos. Ein vergebener Benutzername wird am Feld gemeldet. */
export async function updateOwnProfile(userId: string, input: unknown): Promise<UpdateProfileResult> {
  const { name, username } = profileSchema.parse(input);
  const db = getDb();
  if (username) {
    const taken = await db.user.findFirst({ where: { username, NOT: { id: userId } }, select: { id: true } });
    if (taken) return { ok: false, field: "username", error: "usernameTaken" };
  }
  await db.user.update({ where: { id: userId }, data: { name, username } });
  return { ok: true };
}

export async function getOwnProfile(userId: string) {
  return getDb().user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, username: true, email: true, emailVerified: true, accountType: true, twoFactorEnabled: true, createdAt: true, deletionRequestedAt: true },
  });
}
