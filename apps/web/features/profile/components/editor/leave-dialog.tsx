"use client";

import { ConfirmDialog } from "@app/ui";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

/** Rückfrage vor dem Verlassen mit ungespeicherten Änderungen; die Eingaben bleiben zwischengespeichert. */
export function LeaveDialog({ target, onCancel }: { target: string | null; onCancel: () => void }) {
  const t = useTranslations("profile.editor.leave");
  const router = useRouter();
  return (
    <ConfirmDialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      title={t("title")}
      description={t("description")}
      confirmLabel={t("confirm")}
      cancelLabel={t("cancel")}
      onConfirm={() => {
        if (target) router.push(target);
      }}
    />
  );
}
