"use client";

import { Button, InlineAlert, useToast } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { reblockContact, unblockContact } from "../actions/blocking";

/**
 * Hebt eine Blockierung sofort auf. Das ist umkehrbar, darum gibt es keine
 * Rückfrage, sondern «Rückgängig» im Toast (PRD 13).
 */
export function UnblockButton({ conversationId, name }: { conversationId: string; name: string }) {
  const t = useTranslations("settings");
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function errorKey(formError: string | undefined): string {
    return formError && t.has(`errors.${formError}`) ? formError : "generic";
  }

  async function undo() {
    try {
      const result = await reblockContact({ conversationId });
      if (!result.ok) {
        toast({ title: t(`errors.${errorKey(result.formError)}`), tone: "error" });
        return;
      }
      toast({ title: t("privacy.blocked.reblocked", { name }), tone: "success" });
      router.refresh();
    } catch {
      toast({ title: t("errors.generic"), tone: "error" });
    }
  }

  async function unblock() {
    setError(null);
    setPending(true);
    try {
      const result = await unblockContact({ conversationId });
      if (!result.ok) {
        setError(errorKey(result.formError));
        if (result.formError === "blockNotFound") router.refresh();
        return;
      }
      toast({ title: t("privacy.blocked.unblocked", { name }), tone: "success", action: { label: t("privacy.blocked.undo"), onAction: () => void undo() } });
      router.refresh();
    } catch {
      setError("generic");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button loading={pending} onClick={() => void unblock()} aria-label={t("privacy.blocked.unblockNamed", { name })}>
        {t("privacy.blocked.unblock")}
      </Button>
      {error ? <InlineAlert tone="error" title={t(`errors.${error}`)} /> : null}
    </div>
  );
}
