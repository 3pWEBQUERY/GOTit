"use client";

import {
  Button,
  ConfirmDialog,
  InlineAlert,
  Lightbox,
  MessageThread,
  ReportDialog,
  type ThreadEntry,
} from "@app/ui";
import { useLocale, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { deleteMessageAction } from "../../actions/thread";
import { reportMessageAction } from "../../actions/safety";
import { groupByDay, type TimelineItem } from "../../lib/thread-state";
import { dayKey, dayLabel, formatTime } from "../../lib/time";
import { attachmentSrc } from "./attachment-src";
import { MessageImages, type ThreadImage } from "./message-images";
import { MessageMenu } from "./message-menu";
import { useReportDialog } from "./report-labels";

export interface ThreadLogProps {
  timeline: readonly TimelineItem[];
  counterpartName: string;
  now: string;
  onRetry: (clientId: string) => void;
  /** Nach dem Löschen: neu laden und eine ältere Seite anpassen. */
  onDeleted: (messageId: string) => void;
  /** Karte einer Terminanfrage (v2 11.4); fehlt, gibt es keine Karten. */
  renderBooking?: (bookingId: string) => ReactNode;
}

/**
 * Verlauf mit Trennern pro Tag, Zustellstatus, Bildern und den Aktionen pro
 * Nachricht: eigene löschen (mit Rückfrage, nicht umkehrbar), fremde melden.
 */
export function ThreadLog({
  timeline,
  counterpartName,
  now,
  onRetry,
  onDeleted,
  renderBooking,
}: ThreadLogProps) {
  const t = useTranslations("messages.thread");
  const tDelete = useTranslations("messages.delete");
  const locale = useLocale();
  const report = useReportDialog("message");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const [reporting, setReporting] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{
    images: ThreadImage[];
    alt: string;
    index: number;
  } | null>(null);

  function body(options: {
    text: string | null;
    images: ThreadImage[];
    own: boolean;
    deleted: boolean;
    hidden?: boolean;
    failure?: string;
  }): ReactNode {
    if (options.hidden)
      return (
        <span className="text-ink-muted italic" data-message-hidden>
          {t("hidden")}
        </span>
      );
    if (options.deleted)
      return <span className="text-ink-muted italic">{t("deleted")}</span>;
    const alt = options.own
      ? t("imageAltOwn")
      : t("imageAlt", { name: counterpartName });
    return (
      <span className="flex flex-col gap-2">
        <MessageImages
          images={options.images}
          alt={alt}
          openLabel={t("openImage")}
          onOpen={(index) =>
            setLightbox({ images: options.images, alt, index })
          }
        />
        {options.text ? (
          <span className="break-words">{options.text}</span>
        ) : null}
        {options.failure ? (
          <span className="text-small text-error">{options.failure}</span>
        ) : null}
      </span>
    );
  }

  const entries: ThreadEntry[] = groupByDay(timeline, (item) =>
    dayKey(item.createdAt),
  ).flatMap((group) => [
    {
      type: "date" as const,
      key: `day-${group.day}`,
      label: dayLabel(group.items[0]?.createdAt ?? now, now, locale, {
        today: t("today"),
        yesterday: t("yesterday"),
      }),
    },
    ...group.items.map((item): ThreadEntry => {
      if (item.kind === "booking")
        return {
          type: "card",
          key: item.key,
          content: renderBooking?.(item.bookingId) ?? null,
        };
      if (item.kind === "outbox") {
        const { entry } = item;
        return {
          type: "message",
          key: item.key,
          own: true,
          text: body({
            text: entry.body || null,
            images: entry.images,
            own: true,
            deleted: false,
            failure:
              entry.state === "failed"
                ? t(`failure.${entry.failure ?? "network"}`)
                : undefined,
          }),
          time: formatTime(entry.createdAt, locale),
          dateTime: entry.createdAt,
          status:
            entry.state === "failed"
              ? "failed"
              : entry.state === "sent"
                ? "sent"
                : "sending",
        };
      }
      const { message } = item;
      return {
        type: "message",
        key: item.key,
        own: message.fromMe,
        text: body({
          text: message.body,
          images: message.attachments.map((attachment) => ({
            ...attachment,
            src: attachmentSrc(attachment.id),
          })),
          own: message.fromMe,
          deleted: message.deleted,
          hidden: message.hidden,
        }),
        time: formatTime(message.createdAt, locale),
        dateTime: message.createdAt,
        status: message.fromMe && message.status ? message.status : undefined,
        menu:
          message.deleted || message.hidden ? undefined : (
            <MessageMenu
              own={message.fromMe}
              onDelete={() => {
                setDeleteFailed(false);
                setDeleting(message.id);
              }}
              onReport={() => setReporting(message.id)}
            />
          ),
      };
    }),
  ]);

  return (
    <>
      <MessageThread
        label={t("logLabel", { name: counterpartName })}
        entries={entries}
        announce={false}
        authorLabels={{ own: t("authorOwn"), other: counterpartName }}
        statusLabels={{
          sending: t("status.sending"),
          sent: t("status.sent"),
          read: t("status.read"),
          failed: t("status.failed"),
        }}
        retryLabel={t("retry")}
        onRetry={(key) => onRetry(key.replace(/^c-/, ""))}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => (open ? undefined : setDeleting(null))}
        title={tDelete("title")}
        description={tDelete("description", { name: counterpartName })}
        confirmLabel={tDelete("confirm")}
        cancelLabel={tDelete("cancel")}
        onConfirm={async () => {
          if (!deleting) return;
          const ok = await deleteMessageAction(deleting).catch(() => false);
          if (!ok) {
            setDeleteFailed(true);
            throw new Error("delete-failed");
          }
          onDeleted(deleting);
        }}
      >
        {deleteFailed ? (
          <InlineAlert tone="error" title={tDelete("failed")} />
        ) : null}
      </ConfirmDialog>
      <ReportDialog
        open={reporting !== null}
        onOpenChange={(open) => (open ? undefined : setReporting(null))}
        reasons={report.reasons}
        labels={report.labels}
        onSubmit={async (submission) => {
          if (!reporting) return;
          const result = await reportMessageAction(reporting, submission);
          if (!result.ok) throw new Error(result.reason);
        }}
      />
      <Lightbox
        open={lightbox !== null}
        onOpenChange={(open) => (open ? undefined : setLightbox(null))}
        items={(lightbox?.images ?? []).map((image) => ({
          key: image.id,
          src: image.src,
          alt: lightbox?.alt ?? "",
        }))}
        index={lightbox?.index ?? 0}
        onIndexChange={(index) =>
          setLightbox((current) => (current ? { ...current, index } : current))
        }
        labels={{
          title: t("lightboxTitle", { name: counterpartName }),
          close: t("lightboxClose"),
          previous: t("lightboxPrevious"),
          next: t("lightboxNext"),
        }}
        counterLabel={(current, total) =>
          t("lightboxCounter", { current, total })
        }
      />
    </>
  );
}

/** «Ältere Nachrichten laden» über dem Verlauf; ein Fehler steht am Ort. */
export function LoadOlder({
  onLoad,
  loading,
  failed,
}: {
  onLoad: () => void;
  loading: boolean;
  failed: boolean;
}) {
  const t = useTranslations("messages.thread");
  return (
    <div className="flex flex-col items-center gap-2 pb-2">
      {failed ? (
        <p role="alert" className="text-small text-error">
          {t("olderFailed")}
        </p>
      ) : null}
      <Button variant="secondary" loading={loading} onClick={onLoad}>
        {t("loadOlder")}
      </Button>
    </div>
  );
}
