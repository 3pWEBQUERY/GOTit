"use client";

import { Ellipsis, Flag, Reply } from "lucide-react";
import type { ReactNode } from "react";
import { UiLink } from "../../link/ui-link";
import { Button } from "../actions/button";
import { IconButton } from "../actions/icon-button";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "../actions/menu";
import { AuthorAvatar, type CommunityAuthor } from "./author-avatar";

export interface CommentData {
  id: string;
  author: CommunityAuthor;
  /** Zeit als Text, zum Beispiel «vor 5 Minuten». */
  time: string;
  /** Genaues Datum für den Tooltip. */
  exactTime: string;
  dateTime?: string;
  text: ReactNode;
  /** Moderationsstatus am eigenen Kommentar, zum Beispiel «In Prüfung». */
  moderation?: { label: string };
  /** Antworten auf diesen Kommentar. Es gibt nur eine Ebene. */
  replies?: readonly CommentData[];
}

export interface CommentItemLabels {
  /** Zum Beispiel «Antworten». */
  reply: string;
  /** Label des Antwortfelds, zum Beispiel `(name) => `Antwort an ${name}``. */
  replyField: (authorName: string) => string;
  /** Zum Beispiel «Antwort senden». */
  submitReply: string;
  /** Zum Beispiel «Antwort verwerfen». */
  cancelReply: string;
  /** Zugänglicher Name des Menüs, zum Beispiel `(name) => `Aktionen zum Kommentar von ${name}``. */
  menu: (authorName: string) => string;
  /** Zum Beispiel «Kommentar melden». */
  report: string;
}

export interface CommentItemProps {
  comment: CommentData;
  labels: CommentItemLabels;
  onReport: (comment: CommentData) => void;
  /** Ohne Angabe gibt es kein «Antworten» (Antworten selbst haben keine weitere Ebene). */
  onReply?: () => void;
}

/** Ein Kommentar: Autor, Zeit, Text, «Antworten» und «Melden» im Menü. */
export function CommentItem({ comment, labels, onReport, onReply }: CommentItemProps) {
  const { author } = comment;
  return (
    <article className="flex items-start gap-3">
      <AuthorAvatar initials={author.initials} src={author.avatarSrc} size="sm" className="mt-1" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-ink-muted">
          {author.href ? (
            <UiLink href={author.href} className="font-[600] text-ink underline-offset-4 hover:underline">
              {author.name}
            </UiLink>
          ) : (
            <span className="font-[600] text-ink">{author.name}</span>
          )}
          <time dateTime={comment.dateTime} title={comment.exactTime}>
            {comment.time}
          </time>
          {comment.moderation ? <span className="rounded-chip border border-dashed border-border px-2 py-1 text-label">{comment.moderation.label}</span> : null}
        </p>
        <div className="max-w-prose text-body whitespace-pre-line text-ink">{comment.text}</div>
        {onReply ? (
          <div className="-ml-3">
            <Button variant="quiet" icon={<Reply aria-hidden strokeWidth={1.5} />} onClick={onReply}>
              {labels.reply}
            </Button>
          </div>
        ) : null}
      </div>
      <Menu>
        <MenuTrigger asChild>
          <IconButton label={labels.menu(author.name)} icon={<Ellipsis strokeWidth={1.5} />} className="-mt-2 -mr-2" />
        </MenuTrigger>
        <MenuContent align="end">
          <MenuItem icon={<Flag aria-hidden strokeWidth={1.5} />} onSelect={() => onReport(comment)}>
            {labels.report}
          </MenuItem>
        </MenuContent>
      </Menu>
    </article>
  );
}
