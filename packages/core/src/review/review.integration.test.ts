import { getDb, type BookingStatus } from "@app/db";
import type * as Jobs from "@app/jobs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Viewer } from "../identity/types";

vi.mock("@app/jobs", async (importOriginal) => ({
  ...(await importOriginal<typeof Jobs>()),
  enqueue: async () => undefined,
  createRedisConnection: () => ({ publish: async () => 0 }),
}));

const reviews = await import("./index");
const { reindexProfile } = await import("../search/indexer");

/** Bewertungen gegen Postgres (Abnahme 1.10, v1 5.9). Fiktive Konten, danach gelöscht. */
const db = getDb();
const run = `${Date.now()}`;
const users: string[] = [];
const account = (id: string): Viewer => ({
  kind: "account",
  userId: id,
  name: "Fiktiv",
  ageConfirmed: true,
  provider: null,
  organizations: [],
});
const valid = {
  communication: 5,
  accuracy: 4,
  organization: 5,
  overall: 5,
  text: "Fiktive Bewertung: pünktlich, freundlich und wie beschrieben.",
};

async function user(label: string, role?: "MODERATOR" | "SUPPORT") {
  const id = `it_rev_${label}_${run}`;
  users.push(id);
  await db.user.create({
    data: {
      id,
      name: "Fiktiv",
      email: `${id}@fiktiv.test`,
      emailVerified: true,
      ageConfirmedAt: new Date(),
      twoFactorEnabled: role !== undefined,
    },
  });
  if (role)
    await db.internalRoleAssignment.create({
      data: { userId: id, role, grantedBy: "test" },
    });
  return id;
}

let providerUser = "";
let providerProfileId = "";

async function booking(
  member: string,
  status: BookingStatus,
  endsAt = new Date(Date.now() - 3600_000),
) {
  const conversation =
    (await db.conversation.findUnique({
      where: {
        memberUserId_providerProfileId: {
          memberUserId: member,
          providerProfileId,
        },
      },
      select: { id: true },
    })) ??
    (await db.conversation.create({
      data: {
        providerProfileId,
        memberUserId: member,
        participants: {
          create: [
            { userId: member, role: "MEMBER" },
            { userId: providerUser, role: "PROVIDER" },
          ],
        },
      },
      select: { id: true },
    }));
  const request = await db.bookingRequest.create({
    data: {
      conversationId: conversation.id,
      providerProfileId,
      memberUserId: member,
      status,
      startsAt: new Date(endsAt.getTime() - 3600_000),
      endsAt,
      lastProposedBy: "MEMBER",
      expiresAt: endsAt,
    },
    select: { id: true },
  });
  return request.id;
}

beforeAll(async () => {
  providerUser = await user("anbieter");
  providerProfileId = (
    await db.providerProfile.create({
      data: {
        userId: providerUser,
        slug: `fiktiv-rev-${run}`,
        displayName: "Fiktiv Bewertet",
        status: "PUBLISHED",
      },
      select: { id: true },
    })
  ).id;
  await db.identityCheck.create({
    data: {
      userId: providerUser,
      provider: "test",
      externalRef: `it-rev-${run}`,
      status: "APPROVED",
      ageOver18: true,
      livenessPassed: true,
      checkedAt: new Date(),
      expiresAt: new Date(Date.now() + 100 * 86_400_000),
    },
  });
  await db.profileReview.create({
    data: { providerProfileId, decision: "APPROVED", decidedAt: new Date() },
  });
});

afterAll(async () => {
  await db.conversation.deleteMany({ where: { providerProfileId } });
  await db.user.deleteMany({ where: { id: { in: users } } });
});

describe("Ohne qualifizierenden Termin keine Bewertung (Abnahme 1.10)", () => {
  it("jeder Terminstatus ausser «Stattgefunden» wird abgelehnt", async () => {
    for (const status of [
      "REQUESTED",
      "NEGOTIATING",
      "CONFIRMED",
      "DECLINED",
      "CANCELLED",
      "EXPIRED",
      "DISPUTED",
    ] as const) {
      const member = await user(`status-${status.toLowerCase()}`);
      const id = await booking(member, status);
      expect(await reviews.createReview(account(member), id, valid)).toEqual({
        ok: false,
        reason: "not-completed",
      });
    }
  });

  it("nur das Mitglied des Termins, nicht der Anbieter, nicht Fremde, nicht Besucher", async () => {
    const member = await user("eigentuemer");
    const id = await booking(member, "COMPLETED");
    expect(
      await reviews.createReview(account(providerUser), id, valid),
    ).toEqual({ ok: false, reason: "not-member" });
    expect(
      await reviews.createReview(account(await user("fremd")), id, valid),
    ).toEqual({ ok: false, reason: "not-found" });
    expect(await reviews.createReview({ kind: "visitor" }, id, valid)).toEqual({
      ok: false,
      reason: "not-allowed",
    });
    expect(
      await reviews.createReview(account(member), "gibt-es-nicht", valid),
    ).toEqual({ ok: false, reason: "not-found" });
  });

  it("auch am Code vorbei: Die Datenbank lehnt eine Bewertung ohne stattgefundenen Termin ab", async () => {
    const member = await user("direkt");
    const confirmed = await booking(member, "CONFIRMED");
    await expect(
      db.review.create({
        data: {
          bookingRequestId: confirmed,
          providerProfileId,
          authorUserId: member,
          ...valid,
        },
      }),
    ).rejects.toThrow(/review_not_qualified/);
    const completed = await booking(member, "COMPLETED");
    await expect(
      db.review.create({
        data: {
          bookingRequestId: completed,
          providerProfileId,
          authorUserId: providerUser,
          ...valid,
        },
      }),
    ).rejects.toThrow(/review_not_qualified/);
    await expect(
      db.$executeRawUnsafe(
        `INSERT INTO review (id, "bookingRequestId", "providerProfileId", "authorUserId", communication, accuracy, organization, overall, text, "updatedAt") VALUES ('x${run}', $1, $2, $3, 9, 1, 1, 1, 'x', now())`,
        completed,
        providerProfileId,
        member,
      ),
    ).rejects.toThrow();
  });

  it("eine pro Termin, Text mit Mindestlänge, Fenster von 30 Tagen", async () => {
    const member = await user("einmal");
    const id = await booking(member, "COMPLETED");
    expect(
      await reviews.createReview(account(member), id, {
        ...valid,
        text: "zu kurz",
      }),
    ).toEqual({ ok: false, reason: "invalid" });
    expect((await reviews.createReview(account(member), id, valid)).ok).toBe(
      true,
    );
    expect(await reviews.createReview(account(member), id, valid)).toEqual({
      ok: false,
      reason: "already-reviewed",
    });
    const old = await booking(
      member,
      "COMPLETED",
      new Date(Date.now() - 31 * 86_400_000),
    );
    expect(await reviews.createReview(account(member), old, valid)).toEqual({
      ok: false,
      reason: "too-late",
    });
  });
});

describe("Moderation, Stellungnahme, Einspruch (v1 FR-REVIEW-003)", () => {
  it("erst nach Freigabe öffentlich, ohne Autor; Zähler im Suchindex; Stellungnahme unter der Bewertung", async () => {
    const member = await user("veroeffentlicht");
    const moderator = await user("moderation", "MODERATOR");
    const created = await reviews.createReview(
      account(member),
      await booking(member, "COMPLETED"),
      valid,
    );
    if (!created.ok) throw new Error(created.reason);
    expect(
      (await reviews.listPublicReviews(providerProfileId)).reviews.map(
        (entry) => entry.id,
      ),
    ).not.toContain(created.reviewId);
    expect(
      await reviews.respondToReview(providerUser, created.reviewId, "Danke."),
    ).toEqual({ ok: false, reason: "not-published" });
    expect(
      await reviews.moderateReview(moderator, created.reviewId, {
        decision: "PUBLISHED",
        rule: "R-REV-1",
        reason: "Zulässig, keine sensiblen Angaben.",
      }),
    ).toEqual({ ok: true });
    const list = await reviews.listPublicReviews(providerProfileId);
    const shown = list.reviews.find((entry) => entry.id === created.reviewId);
    expect(shown).toMatchObject({
      verification: "completed-booking",
      ratings: { overall: 5 },
    });
    expect(JSON.stringify(shown)).not.toContain(member);
    expect(
      await reviews.respondToReview(
        await user("nicht-anbieter"),
        created.reviewId,
        "Fremd",
      ),
    ).toEqual({ ok: false, reason: "not-found" });
    expect(
      await reviews.respondToReview(
        providerUser,
        created.reviewId,
        "Danke für die Rückmeldung.",
      ),
    ).toEqual({ ok: true });
    expect(
      (await reviews.listPublicReviews(providerProfileId)).reviews.find(
        (entry) => entry.id === created.reviewId,
      )?.response?.text,
    ).toBe("Danke für die Rückmeldung.");
    await reindexProfile(providerProfileId);
    expect(
      (
        await db.searchProfile.findUniqueOrThrow({
          where: { providerProfileId },
        })
      ).reviewCount,
    ).toBeGreaterThan(0);
    expect(
      await db.auditEvent.count({
        where: {
          target: `review:${created.reviewId}`,
          action: "review.published",
        },
      }),
    ).toBe(1);
  });

  it("Einspruch des Anbieters führt zur Entfernung; Einspruch des Autors bringt sie zurück", async () => {
    const member = await user("einspruch");
    const moderator = await user("moderation2", "MODERATOR");
    const created = await reviews.createReview(
      account(member),
      await booking(member, "COMPLETED"),
      valid,
    );
    if (!created.ok) throw new Error(created.reason);
    expect(
      await reviews.appealReview(
        providerUser,
        created.reviewId,
        "Noch nicht veröffentlicht.",
      ),
    ).toEqual({ ok: false, reason: "not-allowed" });
    await reviews.moderateReview(moderator, created.reviewId, {
      decision: "PUBLISHED",
      rule: "R-REV-1",
      reason: "Zulässig, keine sensiblen Angaben.",
    });
    expect(
      await reviews.appealReview(
        providerUser,
        created.reviewId,
        "Die Bewertung nennt meinen Wohnort.",
      ),
    ).toEqual({ ok: true });
    expect(
      await reviews.appealReview(
        providerUser,
        created.reviewId,
        "Nochmals derselbe Einspruch.",
      ),
    ).toEqual({ ok: false, reason: "open" });
    expect(
      await reviews.appealReview(
        member,
        created.reviewId,
        "Ich bin der Autor.",
      ),
    ).toEqual({ ok: false, reason: "not-allowed" });
    expect(
      await reviews.moderateReview(moderator, created.reviewId, {
        decision: "REMOVED",
        rule: "R-REV-3",
        reason: "Enthält identifizierende Angaben.",
      }),
    ).toEqual({ ok: true });
    expect(
      await db.reviewAppeal.findFirstOrThrow({
        where: { reviewId: created.reviewId, byRole: "PROVIDER" },
      }),
    ).toMatchObject({ status: "UPHELD" });
    expect(
      await reviews.appealReview(
        member,
        created.reviewId,
        "Die Angaben waren allgemein gehalten.",
      ),
    ).toEqual({ ok: true });
    expect(
      await reviews.moderateReview(moderator, created.reviewId, {
        decision: "PUBLISHED",
        rule: "R-REV-1",
        reason: "Nach Prüfung des Einspruchs zulässig.",
      }),
    ).toEqual({ ok: true });
    expect(
      await db.reviewAppeal.findFirstOrThrow({
        where: { reviewId: created.reviewId, byRole: "MEMBER" },
      }),
    ).toMatchObject({ status: "UPHELD" });
  });

  it("ohne Moderationsrolle kein Zugang; doppelter Entscheid hat genau einen Gewinner", async () => {
    const member = await user("rollen");
    const support = await user("support", "SUPPORT");
    const moderator = await user("moderation3", "MODERATOR");
    const created = await reviews.createReview(
      account(member),
      await booking(member, "COMPLETED"),
      valid,
    );
    if (!created.ok) throw new Error(created.reason);
    await expect(
      reviews.moderateReview(support, created.reviewId, {
        decision: "PUBLISHED",
        rule: "R-REV-1",
        reason: "Zulässig, keine sensiblen Angaben.",
      }),
    ).rejects.toThrow(/forbidden/);
    await expect(reviews.listReviewQueue(member)).rejects.toThrow(/forbidden/);
    const decision = {
      decision: "REJECTED",
      rule: "R-REV-2",
      reason: "Enthält intime Details.",
    } as const;
    const results = await Promise.all([
      reviews.moderateReview(moderator, created.reviewId, decision),
      reviews.moderateReview(moderator, created.reviewId, {
        ...decision,
        decision: "PUBLISHED",
        rule: "R-REV-1",
      }),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
  });
});
