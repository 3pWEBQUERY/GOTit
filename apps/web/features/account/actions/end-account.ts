"use server";

import { getAuth } from "@app/auth";
import { deactivateOwnAccount, recordSecurityEvent, requestOwnDeletion } from "@app/core/account";
import { headers } from "next/headers";
import { z } from "zod";
import { getViewer } from "../../shell/queries/get-viewer";
import type { ActionResult } from "../action-result";

const schema = z.object({ mode: z.enum(["deactivate", "delete"]) });

/**
 * Deaktivieren oder Löschung beantragen (PRD 7.5). Beides beendet alle
 * Sitzungen über die Auth-API, auch die im Redis-Zweitspeicher. Eine neue
 * Anmeldung innerhalb der Frist hebt beides auf.
 */
export async function endAccount(input: unknown): Promise<ActionResult> {
  const viewer = await getViewer();
  if (viewer.kind !== "account") return { ok: false, formError: "signInRequired" };
  const { mode } = schema.parse(input);
  const requestHeaders = await headers();
  if (mode === "deactivate") await deactivateOwnAccount(viewer.userId);
  else await requestOwnDeletion(viewer.userId);
  await recordSecurityEvent(viewer.userId, mode === "deactivate" ? "ACCOUNT_DEACTIVATED" : "DELETION_REQUESTED", requestHeaders.get("user-agent"));
  await getAuth().api.revokeSessions({ headers: requestHeaders });
  return { ok: true };
}
