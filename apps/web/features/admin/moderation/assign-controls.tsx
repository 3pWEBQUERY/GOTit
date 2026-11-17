"use client";

import { Button, InlineAlert, useToast } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { assignCaseAction } from "../actions/moderation";

/**
 * «Mir zuweisen» und «Freigeben» (v1 9.3 Zuständigkeit). Zuweisen setzt den
 * Fall auf «In Prüfung», Freigeben zurück auf «Offen». Ein Problem steht am Ort.
 */
export function AssignControls({ reportId, assignedToMe, assigned }: { reportId: string; assignedToMe: boolean; assigned: boolean }) {
  const t = useTranslations("moderation.assign");
  const tErrors = useTranslations("moderation.errors");
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState<"me" | "release" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(toMe: boolean) {
    setPending(toMe ? "me" : "release");
    setError(null);
    const result = await assignCaseAction(reportId, toMe).catch(() => ({ ok: false as const, formError: "generic" }));
    setPending(null);
    if (result.ok) {
      toast({ title: t(toMe ? "assigned" : "released"), tone: "success" });
      router.refresh();
      return;
    }
    setError(result.formError ?? "generic");
    if (result.formError === "alreadyDecided") router.refresh();
  }

  return (
    <div className="flex flex-col gap-2" data-assign-controls>
      <div className="flex flex-wrap gap-2">
        {assignedToMe ? null : (
          <Button variant={assigned ? "secondary" : "primary"} loading={pending === "me"} onClick={() => void run(true)}>
            {assigned ? t("takeOver") : t("assignMe")}
          </Button>
        )}
        {assigned ? (
          <Button variant="quiet" loading={pending === "release"} onClick={() => void run(false)}>
            {t("release")}
          </Button>
        ) : null}
      </div>
      {error ? <InlineAlert tone="error" title={tErrors.has(error) ? tErrors(error) : tErrors("generic")} /> : null}
    </div>
  );
}
