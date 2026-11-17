"use client";

import {
  COLLECTION_NAME_MAX,
  MAX_COLLECTIONS,
} from "@app/core/favorites/schemas";
import { Button, useToast } from "@app/ui";
import { FolderPlus, PencilLine } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter as useNextRouter } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import type { ReactNode } from "react";
import type { ActionResult } from "../../account/action-result";
import {
  createCollectionAction,
  renameCollectionAction,
} from "../actions/collections";
import { NameDialog, type NameSubmitResult } from "./name-dialog";

function useNameResult() {
  const t = useTranslations("favorites.collection.errors");
  const text = (key: string) =>
    t.has(key)
      ? t(key, { max: key === "limit" ? MAX_COLLECTIONS : COLLECTION_NAME_MAX })
      : t("generic");
  return (result: ActionResult<unknown>): NameSubmitResult => {
    if (result.ok) return { ok: true };
    const field = result.fieldErrors?.name;
    return {
      ok: false,
      fieldError: field ? text(field) : undefined,
      formError: result.formError
        ? text(result.formError)
        : field
          ? undefined
          : text("generic"),
    };
  };
}

export interface NewCollectionDialogProps {
  /** Ohne Angabe ein Button «Neue Sammlung». */
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Nach dem Anlegen; ohne Angabe öffnet die neue Sammlung. */
  onCreated?: (collection: {
    id: string;
    name: string;
  }) => Promise<void> | void;
}

/** «Neue Sammlung» mit Feld «Name»: doppelte Namen und das Limit von 20 stehen am Feld. */
export function NewCollectionDialog({
  trigger,
  open,
  onOpenChange,
  onCreated,
}: NewCollectionDialogProps) {
  const t = useTranslations("favorites.collection");
  const router = useRouter();
  const { toast } = useToast();
  const toResult = useNameResult();
  const controlled = open !== undefined;
  return (
    <NameDialog
      trigger={
        controlled
          ? undefined
          : (trigger ?? (
              <Button icon={<FolderPlus aria-hidden strokeWidth={1.5} />}>
                {t("new")}
              </Button>
            ))
      }
      open={open}
      onOpenChange={onOpenChange}
      title={t("createTitle")}
      label={t("nameLabel")}
      hint={t("nameHint", { max: COLLECTION_NAME_MAX })}
      submitLabel={t("createSubmit")}
      cancelLabel={t("cancel")}
      closeLabel={t("close")}
      maxLength={COLLECTION_NAME_MAX}
      genericError={t("errors.generic")}
      onSubmit={async (name) => {
        const result = await createCollectionAction(name);
        if (result.ok && result.data) {
          if (onCreated) await onCreated(result.data);
          else {
            toast({
              title: t("created", { name: result.data.name }),
              tone: "success",
            });
            router.push({
              pathname: "/favoriten/[sammlung]",
              params: { sammlung: result.data.id },
            });
          }
        }
        return toResult(result);
      }}
    />
  );
}

/** Umbenennen einer eigenen Sammlung; «Favoriten» bietet das nicht an. */
export function RenameCollectionDialog({
  collection,
}: {
  collection: { id: string; name: string };
}) {
  const t = useTranslations("favorites.collection");
  const router = useNextRouter();
  const { toast } = useToast();
  const toResult = useNameResult();
  return (
    <NameDialog
      trigger={
        <Button icon={<PencilLine aria-hidden strokeWidth={1.5} />}>
          {t("rename")}
        </Button>
      }
      title={t("renameTitle")}
      label={t("nameLabel")}
      hint={t("nameHint", { max: COLLECTION_NAME_MAX })}
      submitLabel={t("renameSubmit")}
      cancelLabel={t("cancel")}
      closeLabel={t("close")}
      initial={collection.name}
      maxLength={COLLECTION_NAME_MAX}
      genericError={t("errors.generic")}
      onSubmit={async (name) => {
        const result = await renameCollectionAction(collection.id, name);
        if (result.ok) {
          toast({ title: t("renamed"), tone: "success" });
          router.refresh();
        }
        return toResult(result);
      }}
    />
  );
}
