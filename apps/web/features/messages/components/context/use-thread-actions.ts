"use client";

import { useToast } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { blockAction, unblockAction } from "../../actions/safety";
import { setArchivedAction, setStarredAction } from "../../actions/thread";

/**
 * Umkehrbare Aktionen einer Unterhaltung (PRD 13): sofort wirksam, mit
 * «Rückgängig» im Toast. Fehler stehen im Toast, danach gilt der gespeicherte Stand.
 */
export function useThreadActions(conversationId: string, name: string) {
  const t = useTranslations("messages.actions");
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  function run(
    action: () => Promise<boolean>,
    success: { title: string; description?: string; undo?: () => void } | null,
  ) {
    startTransition(async () => {
      const ok = await action().catch(() => false);
      router.refresh();
      if (!ok) {
        toast({ title: t("failed"), tone: "error" });
        return;
      }
      if (success)
        toast({
          title: success.title,
          description: success.description,
          tone: "success",
          ...(success.undo
            ? { action: { label: t("undo"), onAction: success.undo } }
            : {}),
        });
    });
  }

  function setArchived(archived: boolean) {
    run(() => setArchivedAction(conversationId, archived), {
      title: archived ? t("archived") : t("unarchived"),
      undo: archived ? () => setArchived(false) : undefined,
    });
  }

  function setStarred(starred: boolean) {
    run(() => setStarredAction(conversationId, starred), null);
  }

  function block() {
    run(() => blockAction(conversationId), {
      title: t("blocked"),
      description: t("blockedText", { name }),
      undo: () => unblock(),
    });
  }

  function unblock() {
    run(() => unblockAction(conversationId), { title: t("unblocked") });
  }

  return { pending, setArchived, setStarred, block, unblock };
}
