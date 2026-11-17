"use client";

import {
  Button,
  ConfirmDialog,
  InlineAlert,
  UiLink,
  buttonVariants,
  useToast,
} from "@app/ui";
import { ArrowRight, PencilLine, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  deleteSavedSearchAction,
  renameSavedSearchAction,
} from "../actions/saved-searches";
import type { SavedSearchItem } from "../queries/load-saved-searches";
import { NameDialog } from "./name-dialog";

/** Liste der gespeicherten Suchen: Name, Filter in Worten, «Öffnen», «Umbenennen», «Löschen» mit Rückfrage. */
export function SavedSearchList({
  items,
  nameMax,
}: {
  items: readonly SavedSearchItem[];
  nameMax: number;
}) {
  return (
    <ul
      className="flex flex-col divide-y divide-border border-y border-border"
      data-saved-searches
    >
      {items.map((item) => (
        <SavedSearchRow key={item.id} item={item} nameMax={nameMax} />
      ))}
    </ul>
  );
}

function SavedSearchRow({
  item,
  nameMax,
}: {
  item: SavedSearchItem;
  nameMax: number;
}) {
  const t = useTranslations("favorites.searches");
  const router = useRouter();
  const { toast } = useToast();
  const [failed, setFailed] = useState(false);
  const nameId = `suche-${item.id}-name`;
  const text = (key: string | undefined) =>
    key && t.has(`errors.${key}`)
      ? t(`errors.${key}`, { max: nameMax })
      : t("errors.generic");

  return (
    <li data-saved-search={item.id} className="flex flex-col gap-3 py-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h2 id={nameId} className="text-h3 break-words">
          {item.name}
        </h2>
        <p className="text-body break-words text-ink">{item.description}</p>
        <p className="text-small text-ink-muted">
          {t("savedAt", { date: item.savedAt })}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <UiLink
          href={item.href}
          aria-describedby={nameId}
          className={buttonVariants({ variant: "primary" })}
        >
          {t("open")}
          <ArrowRight aria-hidden strokeWidth={1.5} />
        </UiLink>
        <NameDialog
          trigger={
            <Button
              icon={<PencilLine aria-hidden strokeWidth={1.5} />}
              aria-describedby={nameId}
            >
              {t("rename")}
            </Button>
          }
          title={t("renameTitle")}
          label={t("nameLabel")}
          hint={t("nameHint", { max: nameMax })}
          submitLabel={t("renameSubmit")}
          cancelLabel={t("cancel")}
          closeLabel={t("close")}
          initial={item.name}
          maxLength={nameMax}
          genericError={t("errors.generic")}
          onSubmit={async (name) => {
            const result = await renameSavedSearchAction(item.id, name);
            if (result.ok) {
              toast({ title: t("renamed"), tone: "success" });
              router.refresh();
              return { ok: true };
            }
            const field = result.fieldErrors?.name;
            return {
              ok: false,
              fieldError: field ? text(field) : undefined,
              formError: field ? undefined : text(result.formError),
            };
          }}
        />
        <ConfirmDialog
          trigger={
            <Button
              icon={<Trash2 aria-hidden strokeWidth={1.5} />}
              aria-describedby={nameId}
            >
              {t("delete")}
            </Button>
          }
          onOpenChange={(open) => {
            if (!open) setFailed(false);
          }}
          title={t("deleteTitle", { name: item.name })}
          description={t("deleteDescription")}
          confirmLabel={t("deleteConfirm")}
          cancelLabel={t("cancel")}
          onConfirm={async () => {
            const result = await deleteSavedSearchAction(item.id).catch(
              () => null,
            );
            if (!result?.ok) {
              setFailed(true);
              throw new Error("delete-failed");
            }
            toast({
              title: t("deleted", { name: item.name }),
              tone: "success",
            });
            router.refresh();
          }}
        >
          {failed ? (
            <InlineAlert tone="error" title={t("deleteError")} />
          ) : null}
        </ConfirmDialog>
      </div>
    </li>
  );
}
