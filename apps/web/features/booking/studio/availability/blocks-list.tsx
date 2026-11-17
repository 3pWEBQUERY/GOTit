"use client";

import {
  Button,
  ConfirmDialog,
  EmptyState,
  InlineAlert,
  useToast,
} from "@app/ui";
import { CalendarOff, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { removeBlockAction } from "../actions/calendar";
import { BlockDialog } from "../calendar/block-dialog";
import type { BlockView } from "../queries/load-calendar";

/** Kommende Abwesenheiten und Blocker mit Hinzufügen und Entfernen nach Rückfrage (PRD 13). */
export function BlocksList({
  blocks,
  today,
}: {
  blocks: BlockView[];
  today: string;
}) {
  const t = useTranslations("bookingStudio.availability");
  const tb = useTranslations("bookingStudio.block");
  const router = useRouter();
  const { toast } = useToast();
  const [dialog, setDialog] = useState({ open: false, key: 0 });
  const [failed, setFailed] = useState<string | null>(null);

  async function remove(block: BlockView) {
    setFailed(null);
    const result = await removeBlockAction(block.id).catch(() => ({
      ok: false,
    }));
    if (!result.ok) {
      setFailed(block.id);
      throw new Error("remove-failed");
    }
    toast({ title: tb("removed"), tone: "success" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {blocks.length === 0 ? (
        <EmptyState
          icon={<CalendarOff strokeWidth={1.5} />}
          title={t("blocksEmpty")}
          className="py-2"
        />
      ) : (
        <ul
          aria-label={t("blocksLabel")}
          className="flex flex-col divide-y divide-border border-y border-border"
          data-blocks-list
        >
          {blocks.map((block) => {
            const kind =
              block.kind === "ABSENCE" ? tb("kindAbsence") : tb("kindBlocker");
            return (
              <li
                key={block.id}
                className="flex flex-col gap-2 py-3 xs:flex-row xs:items-start xs:justify-between"
                data-block-row={block.id}
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="text-body text-ink">
                    <span className="font-[550]">{kind}</span>
                    <span aria-hidden> · </span>
                    <span className="sr-only">, </span>
                    <span className="tabular">{block.when}</span>
                  </p>
                  {block.note ? (
                    <p className="text-small break-words whitespace-pre-line text-ink-muted">
                      {block.note}
                    </p>
                  ) : null}
                  {failed === block.id ? (
                    <InlineAlert tone="error" title={tb("removeFailed")} />
                  ) : null}
                </div>
                <ConfirmDialog
                  trigger={
                    <Button
                      variant="quiet"
                      aria-label={t("removeBlockLabel", {
                        kind,
                        when: block.when,
                      })}
                      className="self-start"
                    >
                      {t("removeBlock")}
                    </Button>
                  }
                  title={tb("removeTitle")}
                  description={tb("removeText")}
                  confirmLabel={
                    block.kind === "ABSENCE"
                      ? tb("removeAbsence")
                      : tb("remove")
                  }
                  cancelLabel={tb("cancel")}
                  onConfirm={() => remove(block)}
                />
              </li>
            );
          })}
        </ul>
      )}
      <div>
        <Button
          icon={<Plus aria-hidden strokeWidth={1.5} />}
          onClick={() =>
            setDialog((current) => ({ open: true, key: current.key + 1 }))
          }
        >
          {t("addBlock")}
        </Button>
      </div>
      <BlockDialog
        key={dialog.key}
        open={dialog.open}
        onOpenChange={(open) => setDialog((current) => ({ ...current, open }))}
        initial={{
          kind: "ABSENCE",
          startDay: today,
          startTime: "12:00",
          endDay: today,
          endTime: "13:00",
        }}
      />
    </div>
  );
}
