import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { CommentData } from "./comment-item";
import { CommentThread, type CommentThreadProps } from "./comment-thread";

const comments: CommentData[] = [
  {
    id: "1",
    author: { name: "Beispielname A", initials: "BA", href: "/profil/a" },
    time: "vor 1 Stunde",
    exactTime: "16.11.2026, 11:00",
    text: "Beispieltext eines Kommentars",
    replies: [{ id: "1-1", author: { name: "Beispielname B", initials: "BB" }, time: "vor 30 Minuten", exactTime: "16.11.2026, 11:30", text: "Beispieltext einer Antwort", moderation: { label: "In Prüfung" } }],
  },
  { id: "2", author: { name: "Beispielname C", initials: "BC" }, time: "vor 5 Minuten", exactTime: "16.11.2026, 11:55", text: "Zweiter Beispielkommentar" },
];

const labels = {
  field: "Dein Kommentar",
  submit: "Kommentar senden",
  loading: "Kommentare werden geladen",
  empty: "Noch keine Kommentare. Schreib den ersten.",
  reply: "Antworten",
  replyField: (name: string) => `Antwort an ${name}`,
  submitReply: "Antwort senden",
  cancelReply: "Antwort verwerfen",
  menu: (name: string) => `Aktionen zum Kommentar von ${name}`,
  report: "Kommentar melden",
};

function Thread(props: Partial<CommentThreadProps>) {
  const [value, setValue] = useState("");
  return <CommentThread label="Kommentare" comments={comments} labels={labels} value={value} onValueChange={setValue} onSubmit={() => undefined} onReplySubmit={() => undefined} onReport={() => undefined} {...props} />;
}

describe("CommentThread", () => {
  it("zeigt Kommentare mit einer Antwort-Ebene und dem Moderationsstatus als Wort", () => {
    render(<Thread />);
    const list = screen.getByRole("list", { name: "Kommentare" });
    expect(within(list).getAllByRole("article")).toHaveLength(3);
    expect(within(list).getByText("Beispieltext einer Antwort")).toBeTruthy();
    expect(within(list).getByText("In Prüfung")).toBeTruthy();
    expect(within(list).getByText("vor 1 Stunde").getAttribute("title")).toBe("16.11.2026, 11:00");
    // «Antworten» gibt es nur an Kommentaren der ersten Ebene.
    expect(within(list).getAllByRole("button", { name: "Antworten" })).toHaveLength(2);
  });

  it("öffnet das Antwortfeld am Kommentar, sendet die Antwort und schliesst es", async () => {
    const user = userEvent.setup();
    const onReplySubmit = vi.fn();
    render(<Thread onReplySubmit={onReplySubmit} />);
    await user.click(screen.getAllByRole("button", { name: "Antworten" })[1] as HTMLElement);
    const field = screen.getByLabelText("Antwort an Beispielname C");
    expect(document.activeElement).toBe(field);
    await user.type(field, "Beispielantwort");
    await user.click(screen.getByRole("button", { name: "Antwort senden" }));
    expect(onReplySubmit).toHaveBeenCalledWith("2", "Beispielantwort");
    await waitFor(() => expect(screen.queryByLabelText("Antwort an Beispielname C")).toBeNull());
  });

  it("behält die Antwort, wenn das Senden fehlschlägt, und verwirft sie auf Wunsch", async () => {
    const user = userEvent.setup();
    const onReplySubmit = vi.fn().mockRejectedValue(new Error("offline"));
    render(<Thread onReplySubmit={onReplySubmit} />);
    await user.click(screen.getAllByRole("button", { name: "Antworten" })[0] as HTMLElement);
    await user.type(screen.getByLabelText("Antwort an Beispielname A"), "Beispielantwort");
    await user.click(screen.getByRole("button", { name: "Antwort senden" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Antwort senden" }).getAttribute("aria-busy")).toBeNull());
    expect((screen.getByLabelText("Antwort an Beispielname A") as HTMLTextAreaElement).value).toBe("Beispielantwort");

    await user.click(screen.getByRole("button", { name: "Antwort verwerfen" }));
    expect(screen.queryByLabelText("Antwort an Beispielname A")).toBeNull();
  });

  it("sendet einen neuen Kommentar und zeigt Fehler am Feld", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { rerender } = render(<Thread onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText("Dein Kommentar"), "Neuer Beispielkommentar");
    await user.click(screen.getByRole("button", { name: "Kommentar senden" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    rerender(<Thread onSubmit={onSubmit} error="Schreib zuerst einen Kommentar." />);
    expect(screen.getByLabelText("Dein Kommentar").getAttribute("aria-invalid")).toBe("true");
  });

  it("meldet einen Kommentar über das Menü", async () => {
    const user = userEvent.setup();
    const onReport = vi.fn();
    render(<Thread onReport={onReport} />);
    await user.click(screen.getByRole("button", { name: "Aktionen zum Kommentar von Beispielname B" }));
    await user.click(screen.getByRole("menuitem", { name: "Kommentar melden" }));
    expect(onReport).toHaveBeenCalledWith(comments[0]?.replies?.[0]);
  });

  it("kennt die Zustände lädt und leer; das Eingabefeld bleibt", () => {
    const { rerender } = render(<Thread state="loading" />);
    expect(screen.getByRole("status").textContent).toBe("Kommentare werden geladen");
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.getByLabelText("Dein Kommentar")).toBeTruthy();
    rerender(<Thread comments={[]} />);
    expect(screen.getByText("Noch keine Kommentare. Schreib den ersten.")).toBeTruthy();
    expect(screen.getByLabelText("Dein Kommentar")).toBeTruthy();
  });
});
