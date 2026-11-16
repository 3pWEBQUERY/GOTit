import { AGE_COOKIE_NAME, verifyAgeToken } from "@app/core/age-gate";
import type { Viewer } from "@app/core/identity";
import { cookies } from "next/headers";

/** Bestätigt ist, wer es im Konto hinterlegt hat oder in dieser Browser-Sitzung bestätigt hat. */
export async function isAgeConfirmed(viewer: Viewer): Promise<boolean> {
  if (viewer.kind === "account" && viewer.ageConfirmed) return true;
  const token = (await cookies()).get(AGE_COOKIE_NAME)?.value;
  return verifyAgeToken(token, process.env.AGE_GATE_SECRET);
}
