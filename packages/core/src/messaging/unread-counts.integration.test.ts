import { getDb } from "@app/db";
import type * as Jobs from "@app/jobs";
import { afterAll, describe, expect, it, vi } from "vitest";
import type { Viewer } from "../identity/types";

vi.mock("@app/jobs", async (importOriginal) => ({
  ...(await importOriginal<typeof Jobs>()),
  enqueue: async () => undefined,
  createRedisConnection: () => ({ publish: async () => undefined }),
}));

const messaging = await import("./index");

/**
 * Zähler für Kopfzeile, Tab-Leiste und Studio-Seitenleiste (Schritt 1.8):
 * Ein Konto mit Anbieterprofil schreibt auch selbst als Mitglied; beide
 * Seiten zählen getrennt. Konten und Profile sind fiktiv.
 */
const db = getDb();
const run = `${Date.now()}`;
const users: string[] = [];
let counter = 0;
const clientId = () => `u${run}x${(counter += 1)}`;

function account(userId: string): Extract<Viewer, { kind: "account" }> {
  return {
    kind: "account",
    userId,
    name: "Fiktiv",
    ageConfirmed: true,
    provider: null,
    organizations: [],
  };
}

async function user(label: string) {
  const id = `it_unread_${label}_${run}`;
  users.push(id);
  await db.user.create({
    data: {
      id,
      name: `Fiktiv ${label}`,
      email: `${id}@fiktiv.test`,
      emailVerified: true,
      ageConfirmedAt: new Date(),
    },
  });
  return id;
}

async function provider(label: string) {
  const userId = await user(label);
  const profile = await db.providerProfile.create({
    data: {
      userId,
      slug: `fiktiv-unread-${label}-${run}`,
      displayName: `Fiktiv ${label}`,
      status: "PUBLISHED",
      allowMessages: true,
    },
  });
  await db.identityCheck.create({
    data: {
      userId,
      provider: "test",
      externalRef: `it-unread-${label}-${run}`,
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
  return { userId, slug: profile.slug };
}

afterAll(async () => {
  await db.conversation.deleteMany({
    where: { participants: { some: { userId: { in: users } } } },
  });
  await db.user.deleteMany({ where: { id: { in: users } } });
});

describe("Ungelesen je Seite", () => {
  it("zählt Mitglieder- und Anbieterseite eines Kontos getrennt", async () => {
    const both = await provider("zweiseitig");
    const other = await provider("gegenueber");
    const member = await user("mitglied");
    const asMember = await messaging.startConversation(
      account(both.userId),
      other.slug,
    );
    const asProvider = await messaging.startConversation(
      account(member),
      both.slug,
    );
    if (!asMember.ok || !asProvider.ok) throw new Error("start");
    for (const [sender, id] of [
      [other.userId, asMember.conversationId],
      [member, asProvider.conversationId],
      [member, asProvider.conversationId],
    ] as const) {
      const sent = await messaging.sendMessage(account(sender), id, {
        body: "Fiktiv ungelesen",
        clientId: clientId(),
      });
      if (!sent.ok) throw new Error(sent.reason);
    }

    expect(await messaging.countUnreadConversations(both.userId)).toBe(2);
    expect(
      await messaging.countUnreadConversations(both.userId, "MEMBER"),
    ).toBe(1);
    expect(
      await messaging.countUnreadConversations(both.userId, "PROVIDER"),
    ).toBe(1);

    await messaging.markRead(both.userId, asProvider.conversationId);
    expect(
      await messaging.countUnreadConversations(both.userId, "PROVIDER"),
    ).toBe(0);
    expect(
      await messaging.countUnreadConversations(both.userId, "MEMBER"),
    ).toBe(1);

    await messaging.setArchived(both.userId, asMember.conversationId, true);
    expect(
      await messaging.countUnreadConversations(both.userId, "MEMBER"),
    ).toBe(0);
  });
});
