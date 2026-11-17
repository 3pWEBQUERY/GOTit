"use client";

import { Button, ConfirmDialog, InlineAlert, useToast } from "@app/ui";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteLocationAction } from "../actions/locations";

/** Standort löschen mit Dialog, der die Folge benennt (PRD 13); danach zurück zur Liste. */
export function DeleteLocation({
  slug,
  locationId,
  name,
  listHref,
}: {
  slug: string;
  locationId: string;
  name: string;
  listHref: string;
}) {
  const t = useTranslations("organization.locations");
  const router = useRouter();
  const { toast } = useToast();
  const [failed, setFailed] = useState(false);
  return (
    <ConfirmDialog
      trigger={
        <Button
          variant="secondary"
          icon={<Trash2 aria-hidden strokeWidth={1.5} />}
          className="self-start"
        >
          {t("delete")}
        </Button>
      }
      title={t("deleteTitle", { name })}
      description={t("deleteDescription")}
      confirmLabel={t("deleteConfirm")}
      cancelLabel={t("cancel")}
      onConfirm={async () => {
        setFailed(false);
        const result = await deleteLocationAction(slug, locationId).catch(
          () => ({ ok: false as const }),
        );
        if (!result.ok) {
          setFailed(true);
          throw new Error("delete-failed");
        }
        toast({ title: t("deleted", { name }), tone: "success" });
        router.push(listHref);
      }}
    >
      {failed ? <InlineAlert tone="error" title={t("deleteFailed")} /> : null}
    </ConfirmDialog>
  );
}
