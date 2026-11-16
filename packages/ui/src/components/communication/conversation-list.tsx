import type { ReactNode } from "react";
import { cn } from "../../cn";
import { UiLink } from "../../link/ui-link";
import { SkeletonRow } from "../feedback/skeleton";
import { ChatLabel } from "./chat-label";

export interface Conversation {
  key: string;
  href: string;
  name: string;
  /** Fertige Zeitangabe, zum Beispiel «14:02» oder «Gestern». */
  time: string;
  /** Maschinenlesbare Zeit (ISO). */
  dateTime?: string;
  /** Letzte Nachricht; gezeigt wird eine Zeile. */
  preview: string;
  /** Text für Screenreader, zum Beispiel «2 ungelesene Nachrichten». Ist er gesetzt, gilt die Unterhaltung als ungelesen. */
  unreadLabel?: string;
  labels?: readonly { key: string; label: string }[];
  /** Die geöffnete Unterhaltung. */
  current?: boolean;
}

export interface ConversationListProps {
  /** Zugänglicher Name der Navigation. */
  label: string;
  conversations: readonly Conversation[];
  loading?: boolean;
  /** Wird vorgelesen, solange geladen wird. */
  loadingLabel?: string;
  /** Anzahl der Skelett-Zeilen im Ladezustand. */
  skeletonRows?: number;
  /** Leerzustand, zum Beispiel ein `EmptyState`. */
  empty?: ReactNode;
  className?: string;
}

/**
 * Liste der Unterhaltungen (PRD 11.4). Die ganze Zeile führt zur Unterhaltung;
 * «ungelesen» ist ein Punkt und zusätzlich Text für Screenreader und fette Schrift.
 */
export function ConversationList({ label, conversations, loading, loadingLabel, skeletonRows = 4, empty, className }: ConversationListProps) {
  if (loading) {
    return (
      <div aria-busy="true" className={cn("flex flex-col divide-y divide-border px-3", className)}>
        {loadingLabel ? (
          <span role="status" className="sr-only">
            {loadingLabel}
          </span>
        ) : null}
        {Array.from({ length: skeletonRows }, (_, row) => (
          <SkeletonRow key={row} />
        ))}
      </div>
    );
  }
  if (conversations.length === 0) return <div className={className}>{empty}</div>;

  return (
    <nav aria-label={label} className={className}>
      <ul className="flex flex-col divide-y divide-border">
        {conversations.map((conversation) => {
          const unread = Boolean(conversation.unreadLabel);
          return (
            <li
              key={conversation.key}
              className={cn(
                "relative flex min-h-11 flex-col gap-1 px-3 py-3 text-ink transition-colors duration-state hover:bg-surface-2",
                conversation.current && "bg-surface-2",
              )}
            >
              <div className="flex items-baseline gap-2">
                <UiLink
                  href={conversation.href}
                  aria-current={conversation.current ? "page" : undefined}
                  className={cn(
                    "min-w-0 flex-1 truncate text-body after:absolute after:inset-0 focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-accent",
                    unread && "font-[650]",
                  )}
                >
                  {conversation.name}
                  {unread ? <span className="sr-only">, {conversation.unreadLabel}</span> : null}
                </UiLink>
                <time dateTime={conversation.dateTime} className="tabular shrink-0 text-small text-ink-muted">
                  {conversation.time}
                </time>
                {unread ? <span aria-hidden data-unread className="size-2 shrink-0 self-center rounded-full bg-accent" /> : null}
              </div>
              <p className={cn("truncate text-small", unread ? "text-ink" : "text-ink-muted")}>{conversation.preview}</p>
              {conversation.labels && conversation.labels.length > 0 ? (
                <ul className="flex flex-wrap gap-1 pt-1">
                  {conversation.labels.map((item) => (
                    <li key={item.key} className="flex min-w-0">
                      <ChatLabel label={item.label} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
