"use client";

import { Button, ConfirmDialog, InlineAlert, useToast } from "@app/ui";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { deleteCollectionAction } from "../actions/collections";

/**
 * «Sammlung löschen» mit Rückfrage, die die Folge nennt (PRD 13). Danach geht
 * es zurück zu «Favoriten»; scheitert es, bleibt der Dialog offen.
 */
export function DeleteCollectionButton({
  collection,
}: {
  collection: { id: string; name: string; count: number };
}) {
  const t = useTranslations("favorites.collection");
  const router = useRouter();
  const { toast } = useToast();
  const [failed, setFailed] = useState(false);
  return (
    <ConfirmDialog
      trigger={
        <Button icon={<Trash2 aria-hidden strokeWidth={1.5} />}>
          {t("delete")}
        </Button>
      }
      onOpenChange={(open) => {
        if (!open) setFailed(false);
      }}
      title={t("deleteTitle", { name: collection.name })}
      description={t("deleteDescription", { count: collection.count })}
      confirmLabel={t("deleteConfirm")}
      cancelLabel={t("cancel")}
      onConfirm={async () => {
        const result = await deleteCollectionAction(collection.id).catch(
          () => null,
        );
        if (!result?.ok) {
          setFailed(true);
          throw new Error("delete-failed");
        }
        toast({
          title: t("deleted", { name: collection.name }),
          tone: "success",
        });
        router.replace("/favoriten");
      }}
    >
      {failed ? <InlineAlert tone="error" title={t("deleteError")} /> : null}
    </ConfirmDialog>
  );
}
