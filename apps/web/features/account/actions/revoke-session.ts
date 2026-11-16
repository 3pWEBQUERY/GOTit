"use server";

import { getAuth } from "@app/auth";
import { getDb } from "@app/db";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { getViewer } from "../../shell/queries/get-viewer";
import type { ActionResult } from "../action-result";

const schema = z.object({ sessionId: z.string().min(1).max(100) });

/**
 * Beendet eine eigene Sitzung. Die ID wird nur innerhalb der eigenen Sitzungen
 * gesucht; eine fremde ID verhält sich wie eine unbekannte (PRD 16.2). Das
 * Token verlässt den Server nie.
 */
export async function revokeSession(input: unknown): Promise<ActionResult> {
  const viewer = await getViewer();
  if (viewer.kind !== "account") return { ok: false, formError: "signInRequired" };
  const { sessionId } = schema.parse(input);
  const session = await getDb().session.findFirst({ where: { id: sessionId, userId: viewer.userId }, select: { token: true } });
  if (!session) return { ok: false, formError: "sessionNotFound" };
  await getAuth().api.revokeSession({ headers: await headers(), body: { token: session.token } });
  revalidatePath("/", "layout");
  return { ok: true };
}
