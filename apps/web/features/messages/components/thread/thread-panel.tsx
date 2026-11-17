"use client";

import { EmptyState, ReportDialog, cn } from "@app/ui";
import { MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useId, useMemo, useState } from "react";
import { reportCounterpartAction } from "../../actions/safety";
import { buildTimeline } from "../../lib/thread-state";
import type {
  ClientLabel,
  ClientMessage,
  ClientPendingAttachment,
  ClientThread,
  MessengerArea,
} from "../../lib/types";
import { ThreadBookingCard } from "../../../booking/components/thread/thread-booking-card";
import type { ThreadBookings } from "../../../booking/queries/load-thread-bookings";
import { ThreadContext } from "../context/thread-context";
import { useThreadActions } from "../context/use-thread-actions";
import { useReportDialog } from "./report-labels";
import { ThreadComposer } from "./thread-composer";
import { ThreadHeader } from "./thread-header";
import { LoadOlder, ThreadLog } from "./thread-log";
import { useOutbox } from "./use-outbox";
import {
  useIncomingAnnouncement,
  useMarkRead,
  useThreadScroll,
} from "./use-thread-effects";
import { useThreadMessages } from "./use-thread-messages";

export interface ThreadPanelProps {
  thread: ClientThread;
  pending: readonly ClientPendingAttachment[];
  area: MessengerArea;
  labels: readonly ClientLabel[];
  profileHref: string | null;
  /** Jetzt als ISO-Text vom Server, für «Heute» und «Gestern» ohne Abweichung. */
  now: string;
  /** Terminanfragen der Unterhaltung als Karten im Verlauf (v2 11.4). */
  bookings: ThreadBookings;
  /** Pfad jeder Anfrage im eigenen Bereich: `/termine/[id]` oder `/studio/anfragen/[id]`. */
  bookingHrefs: Record<string, string>;
}

/**
 * Eine Unterhaltung (PRD v2 11.4): Verlauf mit Tagen und Zustellstatus,
 * optimistisches Senden, Composer mit Bildern und der Kontext als Spalte
 * oder, wo sie fehlt, als Sheet. Neues kommt über `MessengerLive` als
 * frischer Stand vom Server.
 */
export function ThreadPanel({
  thread,
  pending,
  area,
  labels,
  profileHref,
  now,
  bookings,
  bookingHrefs,
}: ThreadPanelProps) {
  const t = useTranslations("messages.thread");
  const router = useRouter();
  const headingId = useId();
  const name = thread.counterpart.name;
  const stored = useThreadMessages(thread);
  const outbox = useOutbox(thread.conversationId, () => router.refresh());
  const actions = useThreadActions(thread.conversationId, name);
  const report = useReportDialog("counterpart");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const timeline = useMemo(
    () => buildTimeline(stored.messages, outbox.outbox, bookings.bookings),
    [stored.messages, outbox.outbox, bookings.bookings],
  );
  const last = timeline.at(-1);
  const { endRef, scrollerRef, keepPosition } = useThreadScroll(
    last?.key ?? null,
    last?.kind === "outbox" ||
      (last?.kind === "message" && last.message.fromMe),
    timeline.length,
  );
  useMarkRead(thread.conversationId, stored.messages);
  const describe = useCallback(
    (message: ClientMessage) =>
      t("announce", { name, text: message.body ?? t("announceImage") }),
    [t, name],
  );
  const announcement = useIncomingAnnouncement(stored.messages, describe);
  // Mitglied: Kontext ab 1024 px als Spalte; Studio erst ab 1280 px, weil die Seitenleiste Platz braucht.
  const wideColumn = area === "studio" ? "xl" : "lg";

  const context = (heading: boolean) => (
    <ThreadContext
      thread={thread}
      area={area}
      labels={labels}
      profileHref={profileHref}
      actions={actions}
      showHeading={heading}
      onReport={() => {
        setDetailsOpen(false);
        setReportOpen(true);
      }}
    />
  );

  return (
    <div
      className="flex min-w-0 gap-6 md:min-h-0"
      data-thread={thread.conversationId}
    >
      <section
        aria-labelledby={headingId}
        className="flex min-w-0 flex-1 flex-col gap-3 md:min-h-0"
      >
        <ThreadHeader
          headingId={headingId}
          conversationId={thread.conversationId}
          name={name}
          starred={thread.starred}
          archived={thread.archived}
          onArchive={actions.setArchived}
          detailsClassName={wideColumn === "xl" ? "xl:hidden" : "lg:hidden"}
          context={context(false)}
          detailsOpen={detailsOpen}
          onDetailsOpenChange={setDetailsOpen}
        />
        <div
          ref={scrollerRef}
          className="flex min-w-0 flex-col gap-2 md:min-h-0 md:flex-1 md:overflow-y-auto md:pr-2"
        >
          {stored.hasOlder ? (
            <LoadOlder
              loading={stored.loading}
              failed={stored.loadFailed}
              onLoad={() => {
                keepPosition();
                void stored.loadOlder();
              }}
            />
          ) : null}
          {timeline.length === 0 ? (
            <EmptyState
              icon={<MessageSquare strokeWidth={1.5} />}
              title={t("emptyTitle")}
              description={t("emptyText", { name })}
              className="py-6"
            />
          ) : (
            <ThreadLog
              timeline={timeline}
              counterpartName={name}
              now={now}
              onRetry={outbox.retry}
              onDeleted={(id) => {
                stored.markDeleted(id);
                router.refresh();
              }}
              renderBooking={(id) => {
                const booking = bookings.bookings.find(
                  (entry) => entry.id === id,
                );
                const href = bookingHrefs[id];
                return booking && href ? (
                  <ThreadBookingCard
                    booking={booking}
                    slots={bookings.slots}
                    href={href}
                  />
                ) : null;
              }}
            />
          )}
          <div
            ref={endRef}
            aria-hidden
            className="h-px shrink-0 scroll-mb-40 md:scroll-mb-0"
          />
        </div>
        <p
          role="status"
          aria-live="polite"
          className="sr-only"
          data-announcement
        >
          {announcement}
        </p>
        <ThreadComposer
          key={thread.conversationId}
          conversationId={thread.conversationId}
          counterpartName={name}
          pending={pending}
          blockedByMe={thread.blockedByMe}
          restriction={thread.messagingRestriction}
          onUnblock={actions.unblock}
          unblocking={actions.pending}
          onSend={outbox.send}
        />
      </section>
      <aside
        aria-label={t("contextLabel")}
        className={cn(
          "hidden w-64 shrink-0 border-l border-border pl-6 md:overflow-y-auto",
          wideColumn === "xl" ? "xl:block" : "lg:block",
        )}
      >
        {context(true)}
      </aside>
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        reasons={report.reasons}
        labels={report.labels}
        onSubmit={async (submission) => {
          const result = await reportCounterpartAction(
            thread.conversationId,
            submission,
          );
          if (!result.ok) throw new Error(result.reason);
        }}
      />
    </div>
  );
}
