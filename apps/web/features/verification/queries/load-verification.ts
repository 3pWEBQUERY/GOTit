import { getLatestIdentityCheck, resolveIdentityProvider } from "@app/core/verification";
import { identityView } from "../identity-view";

/** Letzte Identitätsprüfung des eigenen Kontos als Zustand der Oberfläche. */
export async function loadVerification(userId: string) {
  const check = await getLatestIdentityCheck(userId);
  return {
    view: identityView(check),
    providerConfigured: resolveIdentityProvider() !== null,
  };
}

export type VerificationData = Awaited<ReturnType<typeof loadVerification>>;
