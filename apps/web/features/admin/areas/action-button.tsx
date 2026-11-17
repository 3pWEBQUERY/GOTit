"use client";

import { Button, ConfirmDialog, InlineAlert, useToast } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ActionResult } from "../../account/action-result";
import type { AdminFormConfirm } from "./admin-form";

/**
 * Ein Knopf, der eine Server Action ohne Eingaben auslöst, zum Beispiel
 * «Veröffentlichen» oder «Mir zuweisen». Mit `confirm` fragt ein Dialog
 * vorher nach (PRD 13). Fehler erscheinen am Ort.
 */
export function ActionButton({ action, label, successMessage, variant = "secondary", confirm }: { action: () => Promise<ActionResult<{ redirectTo?: string } | undefined>>; label: string; successMessage: string; variant?: "primary" | "secondary" | "quiet" | "destructive"; confirm?: AdminFormConfirm }) {
  const tError = useTranslations("adminCommon.errors");
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setPending(true);
    setError(null);
    const result = await action().catch((): ActionResult<undefined> => ({ ok: false, formError: "generic" }));
    setPending(false);
    if (!result.ok) {
      setError(result.formError ?? "generic");
      return;
    }
    toast({ title: successMessage, tone: "success" });
    const target = result.data && typeof result.data === "object" ? result.data.redirectTo : undefined;
    if (target) router.push(target);
    else router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      {confirm ? (
        <ConfirmDialog
          trigger={
            <Button variant={variant} loading={pending}>
              {label}
            </Button>
          }
          title={confirm.title}
          description={confirm.description}
          confirmLabel={confirm.confirmLabel}
          cancelLabel={confirm.cancelLabel}
          onConfirm={run}
        />
      ) : (
        <Button variant={variant} loading={pending} onClick={() => void run()} className="self-start">
          {label}
        </Button>
      )}
      {error ? <InlineAlert tone="error" title={tError(error)} /> : null}
    </div>
  );
}
