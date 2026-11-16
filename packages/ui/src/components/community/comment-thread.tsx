"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { cn } from "../../cn";
import { Button } from "../actions/button";
import { EmptyState } from "../feedback/empty-state";
import { SkeletonRow } from "../feedback/skeleton";
import { TextArea } from "../input/text-area";
import { CommentItem, type CommentData, type CommentItemLabels } from "./comment-item";

export interface CommentThreadLabels extends CommentItemLabels {
  /** Label des Felds für einen neuen Kommentar, zum Beispiel «Dein Kommentar». */
  field: string;
  /** Verb + Objekt, zum Beispiel «Kommentar senden». */
  submit: string;
  /** Wird vorgelesen, solange geladen wird, zum Beispiel «Kommentare werden geladen». */
  loading: string;
  /** Ein Satz für den Leerzustand, zum Beispiel «Noch keine Kommentare. Schreib den ersten.» */
  empty: string;
}

export interface CommentThreadProps {
  /** Zugänglicher Name der Liste, zum Beispiel «Kommentare». */
  label: string;
  comments: readonly CommentData[];
  labels: CommentThreadLabels;
  /** `loading` zeigt Skelette, sonst entscheidet die Liste zwischen leer und bereit. */
  state?: "ready" | "loading";
  /** Text des neuen Kommentars (kontrolliert). */
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  /** Fehler am Feld des neuen Kommentars. */
  error?: ReactNode;
  pending?: boolean;
  /** Sendet eine Antwort (auch als Promise). Ergibt der Aufruf `false` oder schlägt er fehl, bleibt die Eingabe erhalten. */
  onReplySubmit: (parentId: string, text: string) => unknown;
  onReport: (comment: CommentData) => void;
  maxLength?: number;
  countLabel?: (used: number, max: number) => string;
  /** Fehler am Antwortfeld, zum Beispiel wenn das Senden fehlschlug. */
  replyError?: ReactNode;
  className?: string;
}

/**
 * Kommentare mit einer Antwort-Ebene (PRD 12.3): Liste, Antwortfeld am Kommentar und
 * Eingabe für einen neuen Kommentar. Antworten auf Antworten hängen am selben Kommentar.
 */
export function CommentThread({ label, comments, labels, state = "ready", value, onValueChange, onSubmit, error, pending, onReplySubmit, onReport, maxLength, countLabel, replyError, className }: CommentThreadProps) {
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyPending, setReplyPending] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pending) onSubmit();
  };

  const submitReply = async (parentId: string) => {
    if (replyPending) return;
    setReplyPending(true);
    try {
      const result: unknown = await Promise.resolve(onReplySubmit(parentId, replyText));
      if (result !== false) {
        setReplyTo(null);
        setReplyText("");
      }
    } catch {
      // Die Eingabe bleibt stehen; die App zeigt den Grund über `replyError`.
    } finally {
      setReplyPending(false);
    }
  };

  const replyFormFor = (comment: CommentData) =>
    replyTo === comment.id ? (
      <form
        noValidate
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submitReply(comment.id);
        }}
      >
        <TextArea
          // Das Feld erscheint auf Wunsch des Menschen; der Fokus folgt seiner Aktion.
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          label={labels.replyField(comment.author.name)}
          value={replyText}
          onChange={(event) => setReplyText(event.currentTarget.value)}
          error={replyError}
          maxLength={maxLength}
          countLabel={countLabel}
          readOnly={replyPending}
          autoGrow
          rows={2}
        />
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="quiet" onClick={() => setReplyTo(null)}>
            {labels.cancelReply}
          </Button>
          <Button type="submit" variant="primary" loading={replyPending}>
            {labels.submitReply}
          </Button>
        </div>
      </form>
    ) : null;

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {state === "loading" ? (
        <div aria-busy="true">
          <span role="status" className="sr-only">
            {labels.loading}
          </span>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : comments.length === 0 ? (
        <EmptyState title={labels.empty} className="py-4" />
      ) : (
        <ul aria-label={label} className="flex flex-col gap-6">
          {comments.map((comment) => (
            <li key={comment.id} className="flex flex-col gap-4">
              <CommentItem
                comment={comment}
                labels={labels}
                onReport={onReport}
                onReply={() => {
                  if (replyTo !== comment.id) setReplyText("");
                  setReplyTo(comment.id);
                }}
              />
              {comment.replies?.length || replyTo === comment.id ? (
                <div className="ml-4 flex flex-col gap-4 border-l border-border pl-4 xs:ml-6">
                  {comment.replies?.length ? (
                    <ul className="flex flex-col gap-4">
                      {comment.replies.map((reply) => (
                        <li key={reply.id}>
                          <CommentItem comment={reply} labels={labels} onReport={onReport} />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {replyFormFor(comment)}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-3">
        <TextArea
          label={labels.field}
          value={value}
          onChange={(event) => onValueChange(event.currentTarget.value)}
          error={error}
          maxLength={maxLength}
          countLabel={countLabel}
          readOnly={pending}
          autoGrow
          rows={2}
        />
        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={pending}>
            {labels.submit}
          </Button>
        </div>
      </form>
    </div>
  );
}
