import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BookingRequestCard } from "./booking-request-card";
import { ConversationList } from "./conversation-list";
import { MessageThread, type ThreadEntry } from "./message-thread";

const statusLabels = { sending: "Wird gesendet", sent: "Gesendet", read: "Gelesen", failed: "Nicht gesendet" };

const entries: ThreadEntry[] = [
  { type: "date", key: "d1", label: "Heute" },
  { type: "message", key: "m1", own: false, text: "Beispieltext einer Nachricht", time: "14:02" },
  { type: "message", key: "m2", own: true, text: "Beispieltext einer Antwort", time: "14:03", status: "read" },
  { type: "card", key: "c1", content: <p>Beispielkarte</p> },
  { type: "message", key: "m3", own: true, text: "Beispieltext ohne Zustellung", time: "14:05", status: "failed" },
];

describe("MessageThread", () => {
  it("ist ein höfliches Log mit Trenner, Karten und Zustellstatus als Wort", () => {
    render(
      <MessageThread label="Unterhaltung mit Beispielname" entries={entries} authorLabels={{ own: "Du", other: "Beispielname" }} statusLabels={statusLabels} retryLabel="Nachricht erneut senden" />,
    );
    const log = screen.getByRole("log", { name: "Unterhaltung mit Beispielname" });
    expect(log.getAttribute("aria-live")).toBe("polite");
    expect(screen.getByText("Heute")).toBeTruthy();
    expect(screen.getByText("Beispielkarte")).toBeTruthy();
    expect(screen.getByText("Gelesen")).toBeTruthy();
    expect(screen.getByText("Nicht gesendet")).toBeTruthy();
    // Ohne Callback gibt es keinen Button, der nichts tut.
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("bietet bei fehlgeschlagenen Nachrichten «Erneut senden» und meldet die Nachricht", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <MessageThread label="Unterhaltung" entries={entries} authorLabels={{ own: "Du", other: "Beispielname" }} statusLabels={statusLabels} retryLabel="Nachricht erneut senden" onRetry={onRetry} />,
    );
    const buttons = screen.getAllByRole("button", { name: "Nachricht erneut senden" });
    expect(buttons).toHaveLength(1);
    await user.click(buttons[0] as HTMLElement);
    expect(onRetry).toHaveBeenCalledWith("m3");
  });
});

describe("BookingRequestCard", () => {
  const base = {
    title: "Terminanfrage von Beispielname",
    details: [
      { key: "date", label: "Datum", value: "Do, 19.11.2026" },
      { key: "time", label: "Uhrzeit", value: "18:00" },
    ],
    status: { kind: "pending", label: "Offen" },
    labels: { accept: "Anfrage zusagen", counter: "Gegenvorschlag senden", decline: "Anfrage ablehnen" },
  } as const;

  it("zeigt ohne Callbacks keine Buttons", () => {
    render(<BookingRequestCard {...base} view={{ label: "Anfrage ansehen", href: "/termine/1" }} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Offen")).toBeTruthy();
    expect(screen.getByText("Do, 19.11.2026")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Anfrage ansehen" }).getAttribute("href")).toBe("/termine/1");
  });

  it("zeigt nur die Buttons, deren Callback gesetzt ist", async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn();
    const onDecline = vi.fn();
    render(<BookingRequestCard {...base} onAccept={onAccept} onDecline={onDecline} />);
    expect(screen.queryByRole("button", { name: "Gegenvorschlag senden" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Anfrage zusagen" }));
    await user.click(screen.getByRole("button", { name: "Anfrage ablehnen" }));
    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onDecline).toHaveBeenCalledTimes(1);
  });

  it("zeigt eigene Aktionen statt der fertigen Buttons", () => {
    render(<BookingRequestCard {...base} onAccept={() => undefined} actions={<button type="button">Anfrage zurückziehen</button>} />);
    expect(screen.getByRole("button", { name: "Anfrage zurückziehen" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Anfrage zusagen" })).toBeNull();
  });
});

describe("ConversationList", () => {
  const conversations = [
    { key: "1", href: "/nachrichten/1", name: "Beispielname Eins", time: "14:02", preview: "Beispieltext einer Nachricht", unreadLabel: "2 ungelesene Nachrichten", labels: [{ key: "l", label: "Termin offen" }] },
    { key: "2", href: "/nachrichten/2", name: "Beispielname Zwei", time: "Gestern", preview: "Beispieltext", current: true },
  ];

  it("verlinkt jede Unterhaltung, nennt Ungelesenes als Text und markiert die aktuelle", () => {
    render(<ConversationList label="Unterhaltungen" conversations={conversations} />);
    expect(screen.getByRole("navigation", { name: "Unterhaltungen" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Beispielname Eins, 2 ungelesene Nachrichten" }).getAttribute("href")).toBe("/nachrichten/1");
    expect(screen.getByRole("link", { name: "Beispielname Zwei" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByText("Termin offen")).toBeTruthy();
  });

  it("zeigt Skelette beim Laden und den Leerzustand ohne Einträge", () => {
    const { rerender, container } = render(<ConversationList label="Unterhaltungen" conversations={[]} loading loadingLabel="Unterhaltungen werden geladen" skeletonRows={3} />);
    expect(screen.getByRole("status").textContent).toBe("Unterhaltungen werden geladen");
    expect(container.querySelectorAll(".animate-skeleton").length).toBeGreaterThan(0);
    expect(screen.queryByRole("navigation")).toBeNull();
    rerender(<ConversationList label="Unterhaltungen" conversations={[]} empty={<p>Noch keine Unterhaltungen</p>} />);
    expect(screen.getByText("Noch keine Unterhaltungen")).toBeTruthy();
  });
});
