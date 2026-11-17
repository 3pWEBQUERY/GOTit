"use client";

import { Button, UiLink, buttonVariants } from "@app/ui";
import { Ban, Flag } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ClientLabel, ClientThread, MessengerArea } from "../../lib/types";
import { LabelAssign } from "./label-assign";
import { NoteForm } from "./note-form";

export interface ThreadContextProps {
  thread: ClientThread;
  area: MessengerArea;
  labels: readonly ClientLabel[];
  profileHref: string | null;
  actions: { block: () => void; unblock: () => void; pending: boolean };
  /** Öffnet «Melden»; im Sheet schliesst es zuerst das Sheet (keine Dialoge in Dialogen, PRD 13). */
  onReport: () => void;
  /** Überschrift sichtbar (Spalte) oder schon vom Sheet gesetzt. */
  showHeading: boolean;
}

/**
 * Kontext zur Unterhaltung (PRD v2 11.4). Mitgliederseite: Profil, Blockieren,
 * Melden. Studio: «Mitglied seit», Labels, private Notiz, Blockieren, Melden.
 * Online-Status gibt es nicht (Entscheid 0014).
 */
export function ThreadContext({
  thread,
  area,
  labels,
  profileHref,
  actions,
  onReport,
  showHeading,
}: ThreadContextProps) {
  const t = useTranslations("messages.context");
  const studio = area === "studio" && thread.role === "PROVIDER";
  const { counterpart } = thread;
  return (
    <div className="flex flex-col gap-6" data-thread-context>
      {showHeading ? (
        <h2 className="text-h3 break-words">{t("title")}</h2>
      ) : null}
      <div className="flex flex-col gap-1">
        <p className="text-body font-[550] break-words text-ink">
          {counterpart.name}
        </p>
        {counterpart.memberSinceYear &&
        thread.role === "PROVIDER" &&
        counterpart.name !==
          t("memberSince", { year: counterpart.memberSinceYear }) ? (
          <p className="text-small text-ink-muted">
            {t("memberSince", { year: counterpart.memberSinceYear })}
          </p>
        ) : null}
        {profileHref ? (
          <UiLink
            href={profileHref}
            className={buttonVariants({
              variant: "secondary",
              className: "mt-2 self-start",
            })}
          >
            {t("viewProfile")}
          </UiLink>
        ) : null}
      </div>
      {studio ? (
        <>
          <LabelAssign
            conversationId={thread.conversationId}
            labels={labels}
            selected={thread.labelIds}
          />
          <NoteForm
            key={thread.conversationId}
            conversationId={thread.conversationId}
            note={thread.note}
          />
        </>
      ) : null}
      <div className="flex flex-col items-start gap-2 border-t border-border pt-4">
        {thread.blockedByMe ? (
          <Button
            variant="secondary"
            loading={actions.pending}
            onClick={actions.unblock}
          >
            {t("unblock")}
          </Button>
        ) : (
          <Button
            variant="quiet"
            icon={<Ban aria-hidden strokeWidth={1.5} />}
            loading={actions.pending}
            onClick={actions.block}
          >
            {t("block")}
          </Button>
        )}
        <p className="text-small text-ink-muted">
          {thread.blockedByMe ? t("blockedHint") : t("blockHint")}
        </p>
        <Button
          variant="quiet"
          icon={<Flag aria-hidden strokeWidth={1.5} />}
          onClick={onReport}
        >
          {thread.role === "MEMBER" ? t("reportProfile") : t("reportMember")}
        </Button>
      </div>
    </div>
  );
}
