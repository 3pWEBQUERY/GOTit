import { getDb } from "@app/db";
import type * as Jobs from "@app/jobs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Viewer } from "../identity/types";

const published = vi.hoisted(
  () => [] as { channel: string; payload: string }[],
);
vi.mock("@app/jobs", async (importOriginal) => ({
  ...(await importOriginal<typeof Jobs>()),
  enqueue: async () => undefined,
  createRedisConnection: () => ({
    publish: async (channel: string, payload: string) =>
      void published.push({ channel, payload }),
  }),
}));

const messaging = await import("./index");

/**
 * Messenger gegen Postgres (Abnahme 20.4 aus v1.0, Schritt 1.8). Konten und
 * Profile sind fiktiv und werden danach gelöscht.
 */
const db = getDb();
const run = `${Date.now()}`;
const users: string[] = [];
let clientCounter = 0;
const clientId = () => `c${run}x${(clientCounter += 1)}`;

function account(
  id: string,
  extra: Partial<Extract<Viewer, { kind: "account" }>> = {},
): Extract<Viewer, { kind: "account" }> {
  return {
    kind: "account",
    userId: id,
    name: "Fiktiv",
    ageConfirmed: true,
    provider: null,
    organizations: [],
    ...extra,
  };
}

async function user(
  label: string,
  options: {
    internalRole?: "SUPER_ADMIN" | "MODERATOR" | "SUPPORT";
    readReceipts?: boolean;
  } = {},
) {
  const id = `it_msg_${label}_${run}`;
  users.push(id);
  await db.user.create({
    data: {
      id,
      name: `Fiktiv ${label}`,
      email: `${id}@fiktiv.test`,
      emailVerified: true,
      ageConfirmedAt: new Date(),
      username: `fiktiv_${label}_${run}`.slice(0, 30),
    },
  });
  if (options.internalRole)
    await db.internalRoleAssignment.create({
      data: { userId: id, role: options.internalRole, grantedBy: "test" },
    });
  if (options.readReceipts !== undefined)
    await db.userPreference.create({
      data: { userId: id, readReceipts: options.readReceipts },
    });
  return id;
}

async function provider(
  label: string,
  options: {
    status?: "PUBLISHED" | "PAUSED" | "SUSPENDED";
    allowMessages?: boolean;
    readReceipts?: boolean;
  } = {},
) {
  const id = await user(label, { readReceipts: options.readReceipts ?? false });
  const profile = await db.providerProfile.create({
    data: {
      userId: id,
      slug: `fiktiv-msg-${label}-${run}`,
      displayName: `Fiktiv ${label}`,
      status: options.status ?? "PUBLISHED",
      allowMessages: options.allowMessages ?? true,
    },
  });
  await db.identityCheck.create({
    data: {
      userId: id,
      provider: "test",
      externalRef: `it-msg-${label}-${run}`,
      status: "APPROVED",
      ageOver18: true,
      livenessPassed: true,
      checkedAt: new Date(),
      expiresAt: new Date(Date.now() + 100 * 86_400_000),
    },
  });
  await db.profileReview.create({
    data: {
      providerProfileId: profile.id,
      decision: "APPROVED",
      decidedAt: new Date(),
    },
  });
  return { userId: id, slug: profile.slug, profileId: profile.id };
}

let member = "";
let anbieter: Awaited<ReturnType<typeof provider>>;
let conversationId = "";
let messageId = "";

beforeAll(async () => {
  member = await user("mitglied", { readReceipts: true });
  anbieter = await provider("anbieter", { readReceipts: true });
  const started = await messaging.startConversation(
    account(member),
    anbieter.slug,
  );
  if (!started.ok) throw new Error(started.reason);
  conversationId = started.conversationId;
  const sent = await messaging.sendMessage(account(member), conversationId, {
    body: "Fiktive erste Nachricht.",
    clientId: clientId(),
  });
  if (!sent.ok) throw new Error(sent.reason);
  messageId = sent.messageId;
});

afterAll(async () => {
  await db.conversation.deleteMany({
    where: { participants: { some: { userId: { in: users } } } },
  });
  await db.user.deleteMany({ where: { id: { in: users } } });
});

describe("Zustellung (20.4)", () => {
  it("die Nachricht kommt an, mit Ereignis an beide Seiten, ohne Inhalt im Ereignis", async () => {
    const thread = await messaging.getThread(anbieter.userId, conversationId);
    expect(thread?.messages.map((message) => message.body)).toEqual([
      "Fiktive erste Nachricht.",
    ]);
    expect(thread?.counterpart.name).toBe(
      `fiktiv_mitglied_${run}`.slice(0, 30),
    );
    const events = published.filter((entry) =>
      entry.payload.includes(conversationId),
    );
    expect(events.map((entry) => entry.channel).sort()).toEqual(
      [`user:${anbieter.userId}`, `user:${member}`].sort(),
    );
    expect(events.every((entry) => !entry.payload.includes("Fiktive"))).toBe(
      true,
    );
  });

  it("erneutes Senden mit derselben clientId ergibt keine zweite Nachricht", async () => {
    const id = clientId();
    const first = await messaging.sendMessage(account(member), conversationId, {
      body: "Doppelt?",
      clientId: id,
    });
    const second = await messaging.sendMessage(
      account(member),
      conversationId,
      { body: "Doppelt?", clientId: id },
    );
    expect(
      first.ok &&
        second.ok &&
        second.duplicate &&
        first.messageId === second.messageId,
    ).toBe(true);
    expect(
      await db.message.count({ where: { conversationId, body: "Doppelt?" } }),
    ).toBe(1);
  });

  it("leere, zu lange und fremde Bilder werden abgelehnt", async () => {
    expect(
      await messaging.sendMessage(account(member), conversationId, {
        body: "   ",
        clientId: clientId(),
      }),
    ).toEqual({ ok: false, reason: "invalid" });
    expect(
      await messaging.sendMessage(account(member), conversationId, {
        body: "x".repeat(4001),
        clientId: clientId(),
      }),
    ).toEqual({ ok: false, reason: "invalid" });
    expect(
      await messaging.sendMessage(account(member), conversationId, {
        body: "mit Bild",
        clientId: clientId(),
        attachmentIds: ["fremd"],
      }),
    ).toEqual({ ok: false, reason: "attachments" });
  });

  it("ungelesen, gelesen und «Gelesen» nur mit Lesebestätigung auf beiden Seiten", async () => {
    const inbox = await messaging.listInbox(anbieter.userId, {
      view: "ungelesen",
    });
    expect(
      inbox.find((entry) => entry.conversationId === conversationId)?.unread,
    ).toBeGreaterThan(0);
    expect(await messaging.countUnreadConversations(anbieter.userId)).toBe(1);
    await messaging.markRead(anbieter.userId, conversationId);
    expect(await messaging.countUnreadConversations(anbieter.userId)).toBe(0);
    const own = (
      await messaging.getThread(member, conversationId)
    )?.messages.filter((message) => message.fromMe);
    expect(own?.every((message) => message.status === "read")).toBe(true);
    await db.userPreference.update({
      where: { userId: member },
      data: { readReceipts: false },
    });
    const hidden = (
      await messaging.getThread(member, conversationId)
    )?.messages.filter((message) => message.fromMe);
    expect(hidden?.every((message) => message.status === "sent")).toBe(true);
  });

  it("löschen leert den Text für beide; nur eigene Nachrichten", async () => {
    const sent = await messaging.sendMessage(account(member), conversationId, {
      body: "Wird gelöscht.",
      clientId: clientId(),
    });
    if (!sent.ok) throw new Error(sent.reason);
    expect(
      await messaging.deleteOwnMessage(anbieter.userId, sent.messageId),
    ).toBe(false);
    expect(await messaging.deleteOwnMessage(member, sent.messageId)).toBe(true);
    const seen = (
      await messaging.getThread(anbieter.userId, conversationId)
    )?.messages.find((message) => message.id === sent.messageId);
    expect(seen).toMatchObject({ body: null, deleted: true });
  });

  it("archivieren, markieren und eine neue Nachricht holt aus dem Archiv", async () => {
    expect(
      await messaging.setArchived(anbieter.userId, conversationId, true),
    ).toBe(true);
    expect(
      (await messaging.listInbox(anbieter.userId)).some(
        (entry) => entry.conversationId === conversationId,
      ),
    ).toBe(false);
    expect(
      (await messaging.listInbox(anbieter.userId, { view: "archiviert" })).some(
        (entry) => entry.conversationId === conversationId,
      ),
    ).toBe(true);
    await messaging.sendMessage(account(member), conversationId, {
      body: "Wieder da?",
      clientId: clientId(),
    });
    expect(
      (await messaging.listInbox(anbieter.userId)).some(
        (entry) => entry.conversationId === conversationId,
      ),
    ).toBe(true);
    await messaging.setStarred(member, conversationId, true);
    expect(
      (await messaging.listInbox(member, { view: "favoriten" })).map(
        (entry) => entry.conversationId,
      ),
    ).toEqual([conversationId]);
  });

  it("Suche in eigenen Chats findet Text und Namen, nie fremde", async () => {
    expect(
      (await messaging.listInbox(member, { q: "Wieder da" })).map(
        (entry) => entry.conversationId,
      ),
    ).toEqual([conversationId]);
    expect(
      (
        await messaging.listInbox(anbieter.userId, { q: "fiktiv_mitglied" })
      ).map((entry) => entry.conversationId),
    ).toEqual([conversationId]);
    const stranger = await user("suchfremd");
    expect(await messaging.listInbox(stranger, { q: "Wieder da" })).toEqual([]);
  });
});

describe("Wer eine Unterhaltung beginnen darf", () => {
  it("nur erreichbare Profile mit Nachrichten, nie das eigene, nie ohne Altersbestätigung", async () => {
    const off = await provider("ohnenachrichten", { allowMessages: false });
    const paused = await provider("pausiert", { status: "PAUSED" });
    const suspended = await provider("gesperrt", { status: "SUSPENDED" });
    expect(
      await messaging.startConversation(account(member), off.slug),
    ).toEqual({ ok: false, reason: "not-allowed" });
    expect(
      await messaging.startConversation(account(member), paused.slug),
    ).toEqual({ ok: false, reason: "not-found" });
    expect(
      await messaging.startConversation(account(member), suspended.slug),
    ).toEqual({ ok: false, reason: "not-found" });
    expect(
      await messaging.startConversation(
        account(anbieter.userId),
        anbieter.slug,
      ),
    ).toEqual({ ok: false, reason: "own-profile" });
    expect(
      await messaging.startConversation(
        account(member, { ageConfirmed: false }),
        anbieter.slug,
      ),
    ).toEqual({ ok: false, reason: "not-allowed" });
    expect(
      await messaging.startConversation({ kind: "visitor" }, anbieter.slug),
    ).toEqual({ ok: false, reason: "not-allowed" });
    expect(
      await messaging.startConversation(account(member), anbieter.slug),
    ).toEqual({ ok: true, conversationId });
  });

  it("ein gesperrtes Profil nimmt in der bestehenden Unterhaltung nichts mehr an", async () => {
    const later = await provider("spaetergesperrt");
    const started = await messaging.startConversation(
      account(member),
      later.slug,
    );
    if (!started.ok) throw new Error(started.reason);
    await db.providerProfile.update({
      where: { id: later.profileId },
      data: { status: "SUSPENDED" },
    });
    expect(
      await messaging.sendMessage(account(member), started.conversationId, {
        body: "Hallo?",
        clientId: clientId(),
      }),
    ).toEqual({ ok: false, reason: "undeliverable" });
  });
});

describe("Fremde Chats lesen: jede Rolle scheitert (Abnahme 1.8)", () => {
  it("anderes Mitglied, anderer Anbieter, Club-Inhaber, Admin, Moderation, Support und Besucher", async () => {
    const outsiders = [
      await user("fremdmitglied"),
      (await provider("fremdanbieter")).userId,
      await user("clubinhaber"),
      await user("admin", { internalRole: "SUPER_ADMIN" }),
      await user("moderation", { internalRole: "MODERATOR" }),
      await user("support", { internalRole: "SUPPORT" }),
    ];
    const organization = await db.organization.create({
      data: {
        slug: `fiktiv-club-${run}`,
        name: "Fiktiv Club",
        kind: "CLUB",
        status: "PUBLISHED",
      },
    });
    await db.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId: outsiders[2] as string,
        role: "OWNER",
      },
    });
    for (const outsider of outsiders) {
      expect(await messaging.getThread(outsider, conversationId)).toBeNull();
      expect(
        (await messaging.listInbox(outsider)).some(
          (entry) => entry.conversationId === conversationId,
        ),
      ).toBe(false);
      expect(
        await messaging.sendMessage(account(outsider), conversationId, {
          body: "Eingeschleust",
          clientId: clientId(),
        }),
      ).toEqual({ ok: false, reason: "not-found" });
      expect(await messaging.markRead(outsider, conversationId)).toBe(false);
      expect(await messaging.setArchived(outsider, conversationId, true)).toBe(
        false,
      );
      expect(await messaging.setStarred(outsider, conversationId, true)).toBe(
        false,
      );
      expect(await messaging.deleteOwnMessage(outsider, messageId)).toBe(false);
      expect(await messaging.blockCounterpart(outsider, conversationId)).toBe(
        false,
      );
      expect(
        await messaging.reportMessage(outsider, messageId, { reason: "spam" }),
      ).toEqual({ ok: false, reason: "not-found" });
      expect(
        await messaging.setConversationNote(outsider, conversationId, "fremd"),
      ).toBe(false);
      expect(
        await messaging.requestAttachmentUpload(outsider, conversationId, {
          contentType: "image/jpeg",
          sizeBytes: 10,
        }),
      ).toEqual({ ok: false, reason: "not-found" });
      expect(
        await messaging.pendingAttachments(outsider, conversationId),
      ).toEqual([]);
    }
    expect(
      await messaging.sendMessage({ kind: "visitor" }, conversationId, {
        body: "Besucher",
        clientId: clientId(),
      }),
    ).toEqual({ ok: false, reason: "not-found" });
    expect(
      await db.message.count({
        where: { conversationId, body: { in: ["Eingeschleust", "Besucher"] } },
      }),
    ).toBe(0);
    await db.organization.delete({ where: { id: organization.id } });
  });

  it("ein Mitglied sieht Labels und Notiz des Anbieters nie und kann sie nicht setzen", async () => {
    await messaging.ensureDefaultLabels(anbieter.userId, [
      "Neue Anfrage",
      "Termin offen",
    ]);
    const labels = await messaging.listLabels(anbieter.userId);
    expect(
      await messaging.setConversationLabels(anbieter.userId, conversationId, [
        labels[0]?.id ?? "",
      ]),
    ).toBe(true);
    expect(
      await messaging.setConversationNote(
        anbieter.userId,
        conversationId,
        "Private Notiz",
      ),
    ).toBe(true);
    const memberView = await messaging.getThread(member, conversationId);
    expect(memberView).toMatchObject({ note: null, labelIds: [] });
    expect(
      await messaging.setConversationLabels(member, conversationId, [
        labels[0]?.id ?? "",
      ]),
    ).toBe(false);
    expect(
      await messaging.setConversationNote(member, conversationId, "fremd"),
    ).toBe(false);
    expect(
      (await messaging.getThread(anbieter.userId, conversationId))?.note,
    ).toBe("Private Notiz");
    expect(
      (
        await messaging.listInbox(anbieter.userId, {
          labelId: labels[0]?.id ?? null,
        })
      ).map((entry) => entry.conversationId),
    ).toEqual([conversationId]);
  });
});

describe("Blockieren (20.4)", () => {
  it("blockierte Kontakte können nicht mehr senden, ohne Mitteilung; Aufheben stellt es wieder her", async () => {
    const memberB = await user("blockmitglied");
    const providerB = await provider("blockanbieter");
    const started = await messaging.startConversation(
      account(memberB),
      providerB.slug,
    );
    if (!started.ok) throw new Error(started.reason);
    expect(
      await messaging.blockCounterpart(
        providerB.userId,
        started.conversationId,
      ),
    ).toBe(true);
    expect(
      await messaging.sendMessage(account(memberB), started.conversationId, {
        body: "Noch da?",
        clientId: clientId(),
      }),
    ).toEqual({ ok: false, reason: "undeliverable" });
    expect(
      await messaging.sendMessage(
        account(providerB.userId),
        started.conversationId,
        { body: "Antwort", clientId: clientId() },
      ),
    ).toEqual({ ok: false, reason: "undeliverable" });
    const blockedView = await messaging.getThread(
      memberB,
      started.conversationId,
    );
    expect(blockedView && "undeliverable" in blockedView).toBe(false);
    expect(blockedView?.blockedByMe).toBe(false);
    expect(
      (await messaging.getThread(providerB.userId, started.conversationId))
        ?.blockedByMe,
    ).toBe(true);
    expect(
      (await messaging.listBlocked(providerB.userId)).map(
        (entry) => entry.conversationId,
      ),
    ).toEqual([started.conversationId]);
    expect(
      await messaging.unblockByConversation(
        providerB.userId,
        started.conversationId,
      ),
    ).toBe(true);
    expect(
      (
        await messaging.sendMessage(account(memberB), started.conversationId, {
          body: "Wieder offen",
          clientId: clientId(),
        })
      ).ok,
    ).toBe(true);
  });
});

describe("Melden (20.4)", () => {
  it("eine Meldung landet als offener Fall mit Kopie, auch wenn der Absender danach löscht", async () => {
    const sent = await messaging.sendMessage(
      account(anbieter.userId),
      conversationId,
      { body: "Fiktiver Betrugsversuch.", clientId: clientId() },
    );
    if (!sent.ok) throw new Error(sent.reason);
    expect(
      await messaging.reportMessage(anbieter.userId, sent.messageId, {
        reason: "scam",
      }),
    ).toEqual({ ok: false, reason: "not-found" });
    const report = await messaging.reportMessage(member, sent.messageId, {
      reason: "scam",
      details: "Fiktiv",
    });
    if (!report.ok) throw new Error(report.reason);
    await messaging.deleteOwnMessage(anbieter.userId, sent.messageId);
    const stored = await db.report.findUniqueOrThrow({
      where: { id: report.reportId },
    });
    expect(stored).toMatchObject({
      status: "OPEN",
      targetType: "MESSAGE",
      urgent: false,
      reporterId: member,
    });
    expect((stored.evidence as { body: string }).body).toBe(
      "Fiktiver Betrugsversuch.",
    );
    const urgent = await messaging.reportCounterpart(member, conversationId, {
      reason: "minor",
    });
    if (!urgent.ok) throw new Error(urgent.reason);
    expect(
      await db.report.findUniqueOrThrow({ where: { id: urgent.reportId } }),
    ).toMatchObject({
      targetType: "PROFILE",
      targetId: anbieter.profileId,
      urgent: true,
    });
    await db.report.deleteMany({
      where: { id: { in: [report.reportId, urgent.reportId] } },
    });
  });
});
