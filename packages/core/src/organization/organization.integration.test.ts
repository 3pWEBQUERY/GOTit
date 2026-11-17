import { getDb, type OrganizationRole } from "@app/db";
import type * as Jobs from "@app/jobs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Viewer } from "../identity/types";

vi.mock("@app/jobs", async (importOriginal) => ({
  ...(await importOriginal<typeof Jobs>()),
  enqueue: async () => undefined,
  createRedisConnection: () => ({ publish: async () => 0 }),
}));

const org = await import("./index");
const messaging = await import("../messaging");
const booking = await import("../booking");
const { reindexProfile } = await import("../search/indexer");

/** Organisationen gegen Postgres (Abnahme 1.11, v1 5.10). Fiktive Konten, danach gelöscht. */
const db = getDb();
const run = `${Date.now()}`;
const users: string[] = [];
const roles: OrganizationRole[] = [
  "OWNER",
  "LOCATION_MANAGER",
  "MARKETING",
  "EDITOR",
  "SCHEDULING",
];
const account = (id: string): Viewer => ({
  kind: "account",
  userId: id,
  name: "Fiktiv",
  ageConfirmed: true,
  provider: null,
  organizations: [],
});
const members: Partial<Record<OrganizationRole, string>> = {};
let organizationId = "";
const slug = `fiktiv-club-${run}`;
let provider = { userId: "", slug: "", profileId: "" };
let conversationId = "";
let requestId = "";

async function user(label: string, role?: "MODERATOR") {
  const id = `it_org_${label}_${run}`;
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

beforeAll(async () => {
  organizationId = (
    await db.organization.create({
      data: { slug, name: "Fiktiv Club", kind: "CLUB" },
      select: { id: true },
    })
  ).id;
  for (const role of roles) {
    const id = await user(`rolle-${role.toLowerCase()}`);
    members[role] = id;
    await db.organizationMember.create({
      data: { organizationId, userId: id, role },
    });
  }
  const providerUser = await user("anbieter");
  const profile = await db.providerProfile.create({
    data: {
      userId: providerUser,
      slug: `fiktiv-org-anbieter-${run}`,
      displayName: "Fiktiv Verknüpft",
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });
  await db.identityCheck.create({
    data: {
      userId: providerUser,
      provider: "test",
      externalRef: `it-org-${run}`,
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
  await reindexProfile(profile.id);
  provider = {
    userId: providerUser,
    slug: profile.slug,
    profileId: profile.id,
  };
  const member = await user("kunde");
  const started = await messaging.startConversation(
    account(member),
    provider.slug,
  );
  if (!started.ok) throw new Error(started.reason);
  conversationId = started.conversationId;
  await messaging.sendMessage(account(member), conversationId, {
    body: "Fiktive private Nachricht.",
    clientId: `org${run}x1`,
  });
  requestId = (
    await db.bookingRequest.create({
      data: {
        conversationId,
        providerProfileId: profile.id,
        memberUserId: member,
        startsAt: new Date(Date.now() + 86_400_000),
        endsAt: new Date(Date.now() + 90_000_000),
        lastProposedBy: "MEMBER",
        expiresAt: new Date(Date.now() + 86_400_000),
      },
      select: { id: true },
    })
  ).id;
});

afterAll(async () => {
  await db.organization.deleteMany({ where: { id: organizationId } });
  await db.conversation.deleteMany({
    where: { providerProfileId: provider.profileId },
  });
  await db.user.deleteMany({ where: { id: { in: users } } });
});

describe("Einladung und Verknüpfung (v1 FR-BUSINESS-003/005)", () => {
  it("Einladen nur mit Berechtigung; aktiv erst nach Zustimmung; Lösen lässt das Konto bestehen", async () => {
    expect(
      await org.inviteProvider(members.MARKETING as string, slug, {
        providerSlug: provider.slug,
        locationId: null,
        message: "",
      }),
    ).toEqual({ ok: false, reason: "forbidden" });
    expect(
      await org.inviteProvider(await user("aussen"), slug, {
        providerSlug: provider.slug,
        locationId: null,
        message: "",
      }),
    ).toEqual({ ok: false, reason: "not-found" });
    const invited = await org.inviteProvider(members.OWNER as string, slug, {
      providerSlug: provider.slug,
      locationId: null,
      message: "Fiktive Einladung",
    });
    if (!invited.ok) throw new Error(invited.reason);
    expect(
      await org.inviteProvider(members.LOCATION_MANAGER as string, slug, {
        providerSlug: provider.slug,
        locationId: null,
        message: "",
      }),
    ).toEqual({ ok: false, reason: "already-linked" });
    expect(
      await org.respondToInvitation(
        members.OWNER as string,
        invited.linkId,
        true,
      ),
    ).toBe(false);
    expect(
      await org.respondToInvitation(provider.userId, invited.linkId, true),
    ).toBe(true);
    expect(
      (await org.listOwnOrganizationLinks(provider.userId)).map(
        (link) => link.status,
      ),
    ).toEqual(["ACTIVE"]);
  });
});

describe("Keine Rolle sieht Nachrichten oder Ausweisdaten eines Anbieters (Abnahme 1.11)", () => {
  it("jede Rolle der Organisation scheitert an Nachrichten, Terminen, Kalender und Ausweisdaten", async () => {
    for (const role of roles) {
      const id = members[role] as string;
      expect(await messaging.getThread(id, conversationId)).toBeNull();
      expect(await messaging.listInbox(id)).toEqual([]);
      expect(await messaging.listInbox(id, { q: "Fiktive private" })).toEqual(
        [],
      );
      expect(await booking.getRequestDetail(id, requestId, "de")).toBeNull();
      expect(await booking.listRequests(id, "PROVIDER", "offen")).toEqual([]);
      expect(
        await booking.calendarEntries(
          id,
          new Date(),
          new Date(Date.now() + 7 * 86_400_000),
        ),
      ).toBeNull();
      expect(
        await booking.actOnBookingRequest(account(id), requestId, {
          action: "cancel",
        }),
      ).toEqual({ ok: false, reason: "not-found" });
      const table = await org.listOrganizationProviders(id, slug, "de");
      const serialized = JSON.stringify(table);
      for (const secret of [
        provider.userId,
        `${provider.userId}@fiktiv.test`,
        "it-org-",
        "APPROVED",
        "Fiktive private Nachricht",
      ])
        expect(serialized).not.toContain(secret);
      expect(Object.keys(table?.[0] ?? {}).sort()).toEqual([
        "displayName",
        "invitedAt",
        "linkId",
        "locationId",
        "locationName",
        "regionName",
        "respondedAt",
        "slug",
        "status",
      ]);
    }
  });

  it("die öffentliche Seite zeigt den verknüpften Anbieter nur mit öffentlichen Angaben", async () => {
    await db.organization.update({
      where: { id: organizationId },
      data: { status: "PUBLISHED" },
    });
    const page = await org.getPublicOrganization(
      slug,
      { kind: "visitor" },
      "de",
    );
    expect(page?.providers.map((entry) => entry.slug)).toEqual([provider.slug]);
    expect(JSON.stringify(page)).not.toContain(provider.userId);
    await db.providerProfile.update({
      where: { id: provider.profileId },
      data: { status: "PAUSED" },
    });
    expect(
      (await org.getPublicOrganization(slug, { kind: "visitor" }, "de"))
        ?.providers,
    ).toEqual([]);
    await db.providerProfile.update({
      where: { id: provider.profileId },
      data: { status: "PUBLISHED" },
    });
  });

  it("nach dem Lösen ist der Anbieter weg von der Seite, sein Konto und Profil bestehen", async () => {
    const [link] = await org.listOwnOrganizationLinks(provider.userId);
    expect(await org.endLink(members.MARKETING as string, link?.id ?? "")).toBe(
      false,
    );
    expect(await org.endLink(provider.userId, link?.id ?? "")).toBe(true);
    expect(
      (await org.getPublicOrganization(slug, { kind: "visitor" }, "de"))
        ?.providers,
    ).toEqual([]);
    expect(
      await db.providerProfile.count({ where: { id: provider.profileId } }),
    ).toBe(1);
    expect(await db.user.count({ where: { id: provider.userId } })).toBe(1);
  });
});

describe("Profil, Nachweise, Standorte", () => {
  it("Rechte pro Rolle; Nachweise mit UID; Freigabe durch die Moderation veröffentlicht", async () => {
    const other = await db.organization.create({
      data: {
        slug: `fiktiv-agentur-${run}`,
        name: "Fiktiv Agentur",
        kind: "AGENCY",
      },
      select: { id: true, slug: true },
    });
    const owner = await user("inhaber2");
    const scheduler = await user("termine2");
    await db.organizationMember.createMany({
      data: [
        { organizationId: other.id, userId: owner, role: "OWNER" },
        { organizationId: other.id, userId: scheduler, role: "SCHEDULING" },
      ],
    });
    expect(
      await org.saveOrganizationProfile(scheduler, other.slug, {
        name: "Fremd",
        description: "",
        website: "",
        phone: "",
        publicEmail: "",
      }),
    ).toEqual({ ok: false, reason: "forbidden" });
    expect(
      await org.saveOrganizationProfile(owner, other.slug, {
        name: "Fiktiv Agentur",
        description: "Fiktive Beschreibung.",
        website: "https://fiktiv.test",
        phone: "+41 44 000 00 00",
        publicEmail: "kontakt@fiktiv.test",
      }),
    ).toEqual({ ok: true });
    expect(
      await org.submitVerification(owner, other.slug, {
        legalName: "Fiktiv AG",
        uid: "CHE-123.456",
        authorityConfirmed: true,
        permitNote: "",
      }),
    ).toEqual({ ok: false, reason: "invalid" });
    expect(
      await org.submitVerification(owner, other.slug, {
        legalName: "Fiktiv AG",
        uid: "che-123.456.789",
        authorityConfirmed: true,
        permitNote: "",
      }),
    ).toEqual({ ok: true });
    expect(
      await org.submitVerification(owner, other.slug, {
        legalName: "Fiktiv AG",
        uid: "CHE-123.456.789",
        authorityConfirmed: true,
        permitNote: "",
      }),
    ).toEqual({ ok: false, reason: "open" });
    expect(
      await org.getPublicOrganization(other.slug, { kind: "visitor" }, "de"),
    ).toBeNull();
    const moderator = await user("moderation", "MODERATOR");
    const [entry] = (await org.listOrganizationVerifications(moderator)).filter(
      (row) => row.organization.slug === other.slug,
    );
    expect(entry?.uid).toBe("CHE-123.456.789");
    await expect(
      org.decideOrganizationVerification(owner, entry?.id ?? "", {
        decision: "APPROVED",
        reason: "Im Handelsregister gefunden.",
      }),
    ).rejects.toThrow(/forbidden/);
    expect(
      await org.decideOrganizationVerification(moderator, entry?.id ?? "", {
        decision: "APPROVED",
        reason: "Im Handelsregister gefunden.",
      }),
    ).toEqual({ ok: true });
    expect(
      (await org.getPublicOrganization(other.slug, { kind: "visitor" }, "de"))
        ?.name,
    ).toBe("Fiktiv Agentur");
    expect(
      await db.auditEvent.count({
        where: { target: `organization_verification:${entry?.id}` },
      }),
    ).toBe(1);

    const location = await org.saveLocation(owner, other.slug, null, {
      name: "Fiktiv Standort",
      description: "",
      regionId: null,
      areaLabel: "Kreis 4",
      phone: "",
      website: "",
    });
    if (!location.ok) throw new Error(location.reason);
    expect(
      await org.saveOpeningHours(owner, other.slug, location.id, [
        { weekday: 5, startMinute: 18 * 60, endMinute: 23 * 60 },
        { weekday: 5, startMinute: 22 * 60, endMinute: 24 * 60 },
      ]),
    ).toEqual({ ok: false, reason: "invalid" });
    expect(
      await org.saveOpeningHours(owner, other.slug, location.id, [
        { weekday: 5, startMinute: 18 * 60, endMinute: 24 * 60 },
      ]),
    ).toEqual({ ok: true, id: location.id });
    expect(
      (
        await org.saveOpeningException(owner, other.slug, location.id, {
          day: "2099-12-24",
          closed: true,
          startMinute: null,
          endMinute: null,
          note: "Fiktiv geschlossen",
        })
      ).ok,
    ).toBe(true);
    expect(
      (
        await org.saveLocation(scheduler, other.slug, null, {
          name: "Fremd",
          description: "",
          regionId: null,
          areaLabel: "",
          phone: "",
          website: "",
        })
      ).ok,
    ).toBe(false);
    const shown = await org.getPublicOrganization(
      other.slug,
      { kind: "visitor" },
      "de",
    );
    expect(shown?.locations[0]).toMatchObject({
      name: "Fiktiv Standort",
      areaLabel: "Kreis 4",
      hours: [{ weekday: 5, startMinute: 1080, endMinute: 1440 }],
    });
    expect(shown?.locations[0]?.exceptions[0]).toMatchObject({
      day: "2099-12-24",
      closed: true,
    });
    await db.organization.delete({ where: { id: other.id } });
  });
});
