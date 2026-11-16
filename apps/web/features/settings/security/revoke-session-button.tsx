"use client";

import { Button, ConfirmDialog, InlineAlert, useToast } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { revokeSession } from "../../account/actions/revoke-session";

/** Beendet eine andere eigene Sitzung über die Server Action, nach einer Rückfrage. */
export function RevokeSessionButton({ sessionId }: { sessionId: string }) {
  const t = useTranslations("settings");
  const router = useRouter();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  async function revoke() {
    setError(null);
    try {
      const result = await revokeSession({ sessionId });
      if (!result.ok) {
        setError(result.formError && t.has(`errors.${result.formError}`) ? result.formError : "generic");
        if (result.formError === "sessionNotFound") router.refresh();
        return;
      }
      toast({ title: t("security.sessions.revoked"), tone: "success" });
      router.refresh();
    } catch {
      setError("generic");
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <ConfirmDialog
        trigger={<Button>{t("security.sessions.revoke")}</Button>}
        title={t("security.sessions.revokeConfirmTitle")}
        description={t("security.sessions.revokeConfirmText")}
        confirmLabel={t("security.sessions.revoke")}
        cancelLabel={t("security.sessions.cancel")}
        onConfirm={revoke}
      />
      {error ? <InlineAlert tone="error" title={t(`errors.${error}`)} /> : null}
    </div>
  );
}
