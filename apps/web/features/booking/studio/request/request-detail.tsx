"use client";

import {
  BookingTimeline,
  Button,
  InlineAlert,
  ReportDialog,
  StatusPill,
  UiLink,
  type BookingStatus as UiStatus,
} from "@app/ui";
import { MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState, type ReactNode } from "react";
import { reportCounterpartAction } from "../../../messages/actions/safety";
import { useReportDialog } from "../../../messages/components/thread/report-labels";
import { ZoneNote } from "../lib/zone-note";
import type { RequestView } from "../queries/request-view";
import { RequestNoteForm } from "./note-form";
import { RequestActions } from "./request-actions";

export interface RequestDetailProps {
  request: RequestView;
  /** Ebene der Abschnittstitel: 2 auf der eigenen Seite, 3 im Seitenpanel. */
  headingLevel: 2 | 3;
  conversationHref: string;
  /**
   * Melden nach «Aus Sicherheitsgründen absagen»: auf der Seite als Dialog;
   * im Seitenpanel als Link zur Seite, die den Dialog öffnet (keine Dialoge in Dialogen).
   */
  report:
    | { mode: "dialog"; initiallyOpen: boolean }
    | { mode: "link"; href: string };
}

const uiStatus = (status: RequestView["status"]) =>
  status.toLowerCase() as UiStatus;

function Section({
  level,
  title,
  children,
}: {
  level: 2 | 3;
  title: string;
  children: ReactNode;
}) {
  const id = useId();
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-3 border-t border-border pt-4"
    >
      <Heading id={id} className="text-h3">
        {title}
      </Heading>
      {children}
    </section>
  );
}

function SafetyOffer({
  request,
  report,
  openInitially,
}: Pick<RequestDetailProps, "request" | "report"> & {
  openInitially: boolean;
}) {
  const t = useTranslations("bookingStudio.request");
  const dialog = useReportDialog("counterpart");
  const [open, setOpen] = useState(openInitially);
  const action =
    report.mode === "dialog" ? (
      <ReportDialog
        open={open}
        onOpenChange={setOpen}
        trigger={<Button>{t("report")}</Button>}
        reasons={dialog.reasons}
        labels={dialog.labels}
        onSubmit={async (submission) => {
          const result = await reportCounterpartAction(
            request.conversationId,
            submission,
          );
          if (!result.ok) throw new Error(result.reason);
        }}
      />
    ) : (
      <Button asChild>
        <UiLink href={report.href}>{t("report")}</UiLink>
      </Button>
    );
  return (
    <InlineAlert tone="info" title={t("safetyTitle")} action={action}>
      {t("safetyText")}
    </InlineAlert>
  );
}

/** Detail einer Terminanfrage (v2 11.5): Status, Vorschlag, Nachricht, Antworten, private Notiz und Verlauf. */
export function RequestDetail({
  request,
  headingLevel,
  conversationHref,
  report,
}: RequestDetailProps) {
  const t = useTranslations("bookingStudio");
  const tr = useTranslations("bookingStudio.request");
  const initiallyReporting =
    report.mode === "dialog" &&
    report.initiallyOpen &&
    request.status === "CANCELLED";
  const facts: [string, ReactNode][] = [
    [
      tr("when"),
      <span key="when" className="tabular">
        {request.when}
      </span>,
    ],
    [tr("duration"), request.duration],
    ...(request.expires
      ? [
          [
            tr("expires"),
            <span key="expires" className="tabular">
              {request.expires}
            </span>,
          ] as [string, ReactNode],
        ]
      : []),
    ...(request.regionName
      ? [[tr("region"), request.regionName] as [string, ReactNode]]
      : []),
  ];

  return (
    <div
      className="flex min-w-0 flex-col gap-6"
      data-request-detail={request.id}
      data-status={request.status}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="sr-only">{tr("status")}:</span>
          <StatusPill
            status={uiStatus(request.status)}
            label={t(`status.${request.status}`)}
          />
        </div>
        <ZoneNote timeZone={request.timeZone} />
        <dl className="grid gap-x-6 gap-y-3 xs:grid-cols-2">
          {facts.map(([term, value]) => (
            <div key={term} className="flex min-w-0 flex-col gap-1">
              <dt className="text-label text-ink-muted">{term}</dt>
              <dd className="text-body text-ink">{value}</dd>
            </div>
          ))}
          <div className="flex min-w-0 flex-col gap-1 xs:col-span-2">
            <dt className="text-label text-ink-muted">{tr("message")}</dt>
            <dd className="text-body break-words whitespace-pre-line text-ink">
              {request.message ?? (
                <span className="text-ink-muted">{tr("noMessage")}</span>
              )}
            </dd>
          </div>
        </dl>
        {request.proposedByMe && request.actions.includes("counter") ? (
          <p className="text-small text-ink-muted">{tr("proposedByMe")}</p>
        ) : null}
        <div>
          <Button asChild>
            <UiLink href={conversationHref}>
              <MessageSquare aria-hidden strokeWidth={1.5} />
              {tr("openConversation")}
            </UiLink>
          </Button>
        </div>
      </div>
      {initiallyReporting ? (
        <SafetyOffer request={request} report={report} openInitially />
      ) : null}
      <RequestActions
        request={request}
        headingLevel={headingLevel}
        safetyOffer={() => (
          <SafetyOffer
            request={request}
            report={report}
            openInitially={false}
          />
        )}
      />
      <Section level={headingLevel} title={tr("note")}>
        <RequestNoteForm requestId={request.id} note={request.providerNote} />
      </Section>
      <Section level={headingLevel} title={tr("history")}>
        <BookingTimeline
          label={tr("historyLabel")}
          latestLabel={tr("latest")}
          events={request.events.map((event) => ({
            id: event.id,
            status: uiStatus(event.status),
            statusLabel: event.title,
            time: event.time,
            exactTime: event.time,
            dateTime: event.dateTime,
            actor: event.actor,
            note: event.note ?? undefined,
          }))}
        />
      </Section>
    </div>
  );
}
