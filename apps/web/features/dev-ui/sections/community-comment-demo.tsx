"use client";

import { CommentThread, type CommentData } from "@app/ui";
import { useState } from "react";
import { CommunityDemoBlock } from "./community-demo-block";

const labels = {
  field: "Dein Kommentar",
  submit: "Kommentar senden",
  loading: "Kommentare werden geladen",
  empty: "Noch keine Kommentare. Schreib den ersten.",
  reply: "Antworten",
  replyField: (name: string) => `Deine Antwort an ${name}`,
  submitReply: "Antwort senden",
  cancelReply: "Antwort verwerfen",
  menu: (name: string) => `Weitere Aktionen zum Kommentar von ${name}`,
  report: "Kommentar melden",
};

const initial: CommentData[] = [
  {
    id: "1",
    author: { name: "Beispielname A", initials: "BA", href: "#beispielprofil-a" },
    time: "vor 1 Stunde",
    exactTime: "16.11.2026, 11:00",
    dateTime: "2026-11-16T11:00",
    text: "Beispieltext eines Kommentars.",
    replies: [
      { id: "1-1", author: { name: "Beispielname B", initials: "BB" }, time: "vor 40 Minuten", exactTime: "16.11.2026, 11:20", text: "Beispieltext einer Antwort." },
      { id: "1-2", author: { name: "Beispielname (du)", initials: "BN" }, time: "vor 5 Minuten", exactTime: "16.11.2026, 11:55", text: "Beispieltext deiner Antwort.", moderation: { label: "In Prüfung" } },
    ],
  },
  { id: "2", author: { name: "Beispielname C", initials: "BC", href: "#beispielprofil-c" }, time: "vor 20 Minuten", exactTime: "16.11.2026, 11:40", text: "Zweiter Beispieltext eines Kommentars, etwas länger, damit der Umbruch sichtbar wird." },
];

const countLabel = (used: number, max: number) => `${used} von ${max} Zeichen`;

/** CommentThread der Testseite «Community». */
export function CommunityCommentDemo() {
  const [comments, setComments] = useState(initial);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [emptyText, setEmptyText] = useState("");
  const [loadingText, setLoadingText] = useState("");
  const [reported, setReported] = useState<string | null>(null);

  const own = (id: string, body: string): CommentData => ({ id, author: { name: "Beispielname (du)", initials: "BN" }, time: "gerade eben", exactTime: "16.11.2026, 12:00", text: body, moderation: { label: "In Prüfung" } });

  const submit = () => {
    if (text.trim() === "") {
      setError("Schreib zuerst einen Kommentar, dann kannst du ihn senden.");
      return;
    }
    setComments((current) => [...current, own(`neu-${current.length + 1}`, text)]);
    setText("");
    setError(null);
  };

  const reply = (parentId: string, body: string) => {
    if (body.trim() === "") return false;
    setComments((current) => current.map((comment) => (comment.id === parentId ? { ...comment, replies: [...(comment.replies ?? []), own(`${parentId}-${(comment.replies?.length ?? 0) + 1}`, body)] } : comment)));
    return true;
  };

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-h2">CommentThread</h2>
      <CommunityDemoBlock title="Bereit, mit Antworten und eigenem Kommentar in Prüfung">
        <CommentThread
          label="Kommentare zum Beispielbeitrag"
          comments={comments}
          labels={labels}
          value={text}
          onValueChange={(next) => {
            setText(next);
            setError(null);
          }}
          onSubmit={submit}
          error={error}
          onReplySubmit={reply}
          onReport={(comment) => setReported(`Gemeldet: Kommentar von ${comment.author.name}`)}
          maxLength={300}
          countLabel={countLabel}
        />
        <p role="status" className="text-small text-ink-muted">
          {reported ?? "Noch nichts gemeldet"}
        </p>
      </CommunityDemoBlock>
      <CommunityDemoBlock title="Lädt">
        <CommentThread label="Kommentare" comments={[]} labels={labels} state="loading" value={loadingText} onValueChange={setLoadingText} onSubmit={() => undefined} onReplySubmit={() => undefined} onReport={() => undefined} />
      </CommunityDemoBlock>
      <CommunityDemoBlock title="Leer">
        <CommentThread label="Kommentare" comments={[]} labels={labels} value={emptyText} onValueChange={setEmptyText} onSubmit={() => setEmptyText("")} onReplySubmit={() => undefined} onReport={() => undefined} />
      </CommunityDemoBlock>
    </section>
  );
}
