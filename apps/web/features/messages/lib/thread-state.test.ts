import { describe, expect, it } from "vitest";
import {
  buildTimeline,
  groupByDay,
  latestIncoming,
  mergeMessages,
  newIncoming,
  pendingOutbox,
  settleOutbox,
  type OutboxEntry,
} from "./thread-state";
import type { ClientMessage } from "./types";

function message(
  id: string,
  createdAt: string,
  extra: Partial<ClientMessage> = {},
): ClientMessage {
  return {
    id,
    clientId: null,
    fromMe: false,
    body: id,
    deleted: false,
    hidden: false,
    createdAt,
    status: null,
    attachments: [],
    ...extra,
  };
}

const outbox = (
  clientId: string,
  extra: Partial<OutboxEntry> = {},
): OutboxEntry => ({
  clientId,
  body: "Hallo",
  images: [],
  createdAt: "2026-11-17T10:00:00.000Z",
  state: "sending",
  ...extra,
});

describe("Verlauf im Browser", () => {
  it("führt ältere und neueste Seite zusammen; die neueste gewinnt", () => {
    const older = [
      message("a", "2026-11-17T08:00:00Z"),
      message("b", "2026-11-17T09:00:00Z"),
    ];
    const latest = [
      message("b", "2026-11-17T09:00:00Z", { deleted: true, body: null }),
      message("c", "2026-11-17T10:00:00Z"),
    ];
    const merged = mergeMessages(older, latest);
    expect(merged.map((entry) => entry.id)).toEqual(["a", "b", "c"]);
    expect(merged[1]?.deleted).toBe(true);
  });

  it("zeigt eine gesendete Nachricht genau einmal, auch wenn der Ausgang sie noch als fehlgeschlagen führt", () => {
    const stored = [
      message("m1", "2026-11-17T10:00:01Z", {
        fromMe: true,
        clientId: "abc12345",
      }),
    ];
    const box = [outbox("abc12345", { state: "failed", failure: "network" })];
    expect(pendingOutbox(box, stored)).toEqual([]);
    const timeline = buildTimeline(stored, box);
    expect(timeline).toHaveLength(1);
    expect(timeline[0]?.key).toBe("c-abc12345");
  });

  it("behält den Schlüssel, wenn aus dem Ausgang eine gespeicherte Nachricht wird", () => {
    const before = buildTimeline([], [outbox("xyz98765")]);
    const after = buildTimeline(
      [
        message("m2", "2026-11-17T10:00:01Z", {
          fromMe: true,
          clientId: "xyz98765",
        }),
      ],
      [outbox("xyz98765", { state: "sent", messageId: "m2" })],
    );
    expect(before.map((item) => item.key)).toEqual(
      after.map((item) => item.key),
    );
  });

  it("setzt das Ergebnis des Servers am richtigen Eintrag", () => {
    const box = [outbox("one11111"), outbox("two22222")];
    const failed = settleOutbox(box, "two22222", {
      ok: false,
      failure: "undeliverable",
    });
    expect(failed[1]).toMatchObject({
      state: "failed",
      failure: "undeliverable",
    });
    const sent = settleOutbox(failed, "two22222", {
      ok: true,
      messageId: "m9",
    });
    expect(sent[1]).toMatchObject({
      state: "sent",
      messageId: "m9",
      failure: undefined,
    });
    expect(sent[0]?.state).toBe("sending");
  });

  it("gruppiert nach Tagen in der gegebenen Reihenfolge", () => {
    const groups = groupByDay(
      ["2026-11-16a", "2026-11-16b", "2026-11-17a"],
      (item) => item.slice(0, 10),
    );
    expect(groups.map((group) => [group.day, group.items.length])).toEqual([
      ["2026-11-16", 2],
      ["2026-11-17", 1],
    ]);
  });

  it("findet neue Nachrichten der Gegenseite für die Ansage", () => {
    const messages = [
      message("a", "2026-11-17T08:00:00Z"),
      message("b", "2026-11-17T09:00:00Z", { fromMe: true }),
      message("c", "2026-11-17T10:00:00Z"),
    ];
    expect(
      newIncoming(new Set(["a"]), messages).map((entry) => entry.id),
    ).toEqual(["c"]);
    expect(latestIncoming(messages)?.id).toBe("c");
  });
});

describe("Terminanfragen im Verlauf", () => {
  it("stehen an ihrem Zeitpunkt zwischen den Nachrichten; der Ausgang bleibt zuunterst", () => {
    const timeline = buildTimeline(
      [
        message("a", "2026-11-17T09:00:00.000Z"),
        message("b", "2026-11-17T11:00:00.000Z"),
      ],
      [outbox("x", { createdAt: "2026-11-17T08:00:00.000Z" })],
      [
        { id: "spaet", createdAt: "2026-11-17T12:00:00.000Z" },
        { id: "mitte", createdAt: "2026-11-17T10:00:00.000Z" },
      ],
    );
    expect(timeline.map((item) => item.key)).toEqual([
      "m-a",
      "b-mitte",
      "m-b",
      "b-spaet",
      "c-x",
    ]);
  });
});
