import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getDb, type OrganizationRole } from "@app/db";
import type * as Jobs from "@app/jobs";
import { getStorage, resetStorage } from "@app/storage";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const queued = vi.hoisted(() => [] as { queue: string; payload: unknown }[]);
vi.mock("@app/jobs", async (importOriginal) => {
  const actual = await importOriginal<typeof Jobs>();
  return {
    ...actual,
    enqueue: async (definition: { queue: string }, payload: unknown) =>
      void queued.push({ queue: definition.queue, payload }),
  };
});

const media = await import("./index");

/**
 * Medien einer Organisation (Entscheid 0018) gegen Postgres mit dem Treiber fs.
 * Fiktive Organisationen und Konten, danach gelöscht.
 */
const db = getDb();
const run = `${Date.now()}`;
const users: string[] = [];
const organizations: string[] = [];
let root = "";
const valid = {
  contentType: "image/jpeg",
  sizeBytes: 3,
  rightsConfirmed: true as const,
};

async function user(label: string) {
  const id = `it_orgmedia_${label}_${run}`;
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

async function organization(
  label: string,
  members: Partial<Record<OrganizationRole, string>>,
) {
  const slug = `fiktiv-medien-${label}-${run}`;
  const { id } = await db.organization.create({
    data: { slug, name: `Fiktiv ${label}`, kind: "CLUB", status: "PUBLISHED" },
    select: { id: true },
  });
  organizations.push(id);
  for (const [role, userId] of Object.entries(members))
    await db.organizationMember.create({
      data: { organizationId: id, userId, role: role as OrganizationRole },
    });
  return { id, slug };
}

async function uploaded(userId: string, slug: string) {
  const result = await media.requestOrganizationUpload(userId, slug, valid);
  if (!result.ok) throw new Error(result.reason);
  const asset = await db.mediaAsset.findUniqueOrThrow({
    where: { id: result.mediaId },
  });
  await getStorage().putObject({
    bucket: "originals",
    key: asset.originalKey,
    body: new Uint8Array([1, 2, 3]),
    contentType: "image/jpeg",
  });
  return result.mediaId;
}

async function processed(mediaId: string) {
  await db.mediaAsset.update({
    where: { id: mediaId },
    data: { status: "PROCESSING" },
  });
  const variants = media.MEDIA_WIDTHS.flatMap((width) =>
    media.MEDIA_FORMATS.map((format) => ({
      name: media.variantName(width, format),
      width,
      height: width,
      format,
      key: `m/${mediaId}/t/${media.variantName(width, format)}`,
      bytes: 3,
    })),
  );
  const result = await media.completeProcessing(mediaId, {
    mimeType: "image/jpeg",
    sizeBytes: 3,
    width: 1440,
    height: 1440,
    dominantColor: "#112233",
    variants,
  });
  expect(result.ok).toBe(true);
}

let owner = "";
let marketing = "";
let scheduling = "";
let outsider = "";
let club = { id: "", slug: "" };
let other = { id: "", slug: "" };

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "org-media-it-"));
  process.env.STORAGE_DRIVER = "fs";
  process.env.STORAGE_FS_ROOT = root;
  process.env.APP_ENV = "test";
  process.env.BETTER_AUTH_SECRET ??= "x".repeat(32);
  resetStorage();
  owner = await user("inhaber");
  marketing = await user("marketing");
  scheduling = await user("termine");
  outsider = await user("fremd");
  club = await organization("club", {
    OWNER: owner,
    MARKETING: marketing,
    SCHEDULING: scheduling,
  });
  other = await organization("andere", { OWNER: outsider });
});
beforeEach(() => void queued.splice(0));
afterAll(async () => {
  await db.mediaAsset.deleteMany({
    where: { organizationId: { in: organizations } },
  });
  await db.organization.deleteMany({ where: { id: { in: organizations } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await rm(root, { recursive: true, force: true });
});

describe("Medien der Organisation", () => {
  it("nur Mitglieder mit «media.edit» laden hoch; das Medium gehört der Organisation und ist öffentlich", async () => {
    expect(
      await media.requestOrganizationUpload(scheduling, club.slug, valid),
    ).toEqual({ ok: false, reason: "not-allowed" });
    expect(
      await media.requestOrganizationUpload(outsider, club.slug, valid),
    ).toEqual({ ok: false, reason: "not-allowed" });
    expect(
      await media.requestOrganizationUpload(marketing, club.slug, {
        ...valid,
        rightsConfirmed: false,
      }),
    ).toEqual({ ok: false, reason: "rights" });
    const id = await uploaded(marketing, club.slug);
    const row = await db.mediaAsset.findUniqueOrThrow({ where: { id } });
    expect(row).toMatchObject({
      organizationId: club.id,
      providerProfileId: null,
      visibility: "PUBLIC",
      ownerUserId: marketing,
    });
    // Bestätigen darf nur, wer den Upload angemeldet hat.
    expect(await media.confirmOrganizationUpload(owner, club.slug, id)).toEqual(
      { ok: false, reason: "not-found" },
    );
    expect(
      await media.confirmOrganizationUpload(marketing, club.slug, id),
    ).toEqual({ ok: true });
    expect(queued.map((entry) => entry.queue)).toEqual(["media-process"]);
  });

  it("jedes Mitglied sieht die Bibliothek; bearbeiten darf nur, wer das Recht hat", async () => {
    const library = await media.listOrganizationMedia(scheduling, club.slug);
    expect(library?.canEdit).toBe(false);
    expect(library?.canUpload).toBe(false);
    expect(library?.media.length).toBeGreaterThan(0);
    expect((await media.listOrganizationMedia(owner, club.slug))?.canEdit).toBe(
      true,
    );
    expect(await media.listOrganizationMedia(outsider, club.slug)).toBeNull();
    const [first] = library?.media ?? [];
    expect(
      await media.getOrganizationMedia(outsider, club.slug, first?.id ?? ""),
    ).toBeNull();
    expect(
      await media.getOrganizationMedia(outsider, other.slug, first?.id ?? ""),
    ).toBeNull();
    expect(
      await media.setOrganizationCover(scheduling, club.slug, first?.id ?? ""),
    ).toEqual({ ok: false, reason: "not-found" });
    expect(
      await media.deleteOrganizationMedia(
        scheduling,
        club.slug,
        first?.id ?? "",
      ),
    ).toEqual({ deleted: 0 });
  });

  it("nie eine andere Organisation: fremde IDs wirken wie unbekannte", async () => {
    const foreign = await uploaded(outsider, other.slug);
    await media.confirmOrganizationUpload(outsider, other.slug, foreign);
    await processed(foreign);
    expect(await media.setOrganizationCover(owner, club.slug, foreign)).toEqual(
      { ok: false, reason: "not-found" },
    );
    expect(await media.setOrganizationLogo(owner, club.slug, foreign)).toEqual({
      ok: false,
      reason: "not-found",
    });
    expect(
      await media.setOrganizationMediaAltText(owner, club.slug, foreign, {
        altText: "Fremd",
      }),
    ).toEqual({ ok: false, reason: "not-found" });
    expect(
      await media.deleteOrganizationMedia(owner, club.slug, foreign),
    ).toEqual({ deleted: 0 });
    expect(
      await media.moveOrganizationMedia(owner, club.slug, foreign, {
        direction: "forward",
      }),
    ).toEqual({ ok: false, reason: "not-found" });
    const own =
      (await media.listOrganizationMedia(owner, club.slug))?.media.map(
        (entry) => entry.id,
      ) ?? [];
    expect(
      await media.reorderOrganizationMedia(owner, club.slug, {
        order: [...own, foreign],
      }),
    ).toEqual({ ok: false, reason: "invalid" });
    // Ein Profilmedium-Weg erreicht Medien der Organisation nicht, auch nicht für die hochladende Person.
    expect(await media.setCoverMedia(outsider, foreign)).toEqual({
      ok: false,
      reason: "not-found",
    });
  });
});

describe("Medien der Organisation: Logo, Titelbild, Ordnen, Auslieferung", () => {
  it("genau ein Logo und ein Titelbild; ein Bild ist nie beides", async () => {
    const a = await uploaded(owner, club.slug);
    const b = await uploaded(owner, club.slug);
    for (const id of [a, b]) {
      await media.confirmOrganizationUpload(owner, club.slug, id);
      await processed(id);
    }
    // Ohne ausdrückliche Wahl gibt es bei Organisationen kein Titelbild.
    expect(
      await db.mediaAsset.count({
        where: { organizationId: club.id, isCover: true },
      }),
    ).toBe(0);
    expect(await media.setOrganizationLogo(marketing, club.slug, a)).toEqual({
      ok: true,
    });
    expect(await media.setOrganizationCover(marketing, club.slug, b)).toEqual({
      ok: true,
    });
    expect(await media.setOrganizationCover(marketing, club.slug, a)).toEqual({
      ok: true,
    });
    const rows = await db.mediaAsset.findMany({
      where: { organizationId: club.id, deletedAt: null },
      select: { id: true, isCover: true, isLogo: true },
    });
    expect(rows.filter((row) => row.isCover).map((row) => row.id)).toEqual([a]);
    expect(rows.filter((row) => row.isLogo)).toEqual([]);
    expect(await media.setOrganizationLogo(owner, club.slug, b)).toEqual({
      ok: true,
    });
    const after = await db.mediaAsset.findMany({
      where: { organizationId: club.id, deletedAt: null },
      select: { id: true, isCover: true, isLogo: true },
    });
    expect(after.filter((row) => row.isLogo).map((row) => row.id)).toEqual([b]);
    expect(after.filter((row) => row.isCover).map((row) => row.id)).toEqual([
      a,
    ]);
    expect(after.some((row) => row.isCover && row.isLogo)).toBe(false);
  });
  it("ordnet, setzt den Alternativtext und löscht mit Job", async () => {
    const order =
      (await media.listOrganizationMedia(owner, club.slug))?.media.map(
        (entry) => entry.id,
      ) ?? [];
    expect(
      await media.reorderOrganizationMedia(marketing, club.slug, {
        order: [...order].reverse(),
      }),
    ).toEqual({ ok: true });
    const reversed = (
      await media.listOrganizationMedia(owner, club.slug)
    )?.media.map((entry) => entry.id);
    expect(reversed).toEqual([...order].reverse());
    const last = reversed?.at(-1) ?? "";
    expect(
      await media.moveOrganizationMedia(owner, club.slug, last, {
        direction: "backward",
      }),
    ).toEqual({ ok: false, reason: "edge" });
    expect(
      await media.setOrganizationMediaAltText(marketing, club.slug, last, {
        altText: "Eingang des Clubs",
      }),
    ).toEqual({ ok: true });
    const logo = await db.mediaAsset.findFirstOrThrow({
      where: { organizationId: club.id, isLogo: true },
      select: { id: true },
    });
    expect(
      await media.deleteOrganizationMedia(owner, club.slug, logo.id),
    ).toEqual({ deleted: 1 });
    expect(
      await db.mediaAsset.findUniqueOrThrow({ where: { id: logo.id } }),
    ).toMatchObject({ isLogo: false });
    expect(queued.some((entry) => entry.queue === "media-delete")).toBe(true);
  });

  it("Auslieferung: Mitglieder sehen alles ausser FAILED, öffentlich erst nach Freigabe", async () => {
    const id = await uploaded(marketing, club.slug);
    await media.confirmOrganizationUpload(marketing, club.slug, id);
    await processed(id);
    const variant = media.variantName(640, "webp");
    expect(
      (await media.resolveMediaDelivery(id, variant, scheduling))?.access,
    ).toBe("private");
    expect(await media.resolveMediaDelivery(id, variant, outsider)).toBeNull();
    expect(await media.resolveMediaDelivery(id, variant, null)).toBeNull();
  });
});

describe("Medien der Organisation in der Moderation", () => {
  it("die Warteschlange der Moderation zeigt Medien der Organisation mit ihrem Namen", async () => {
    const moderator = await user("pruefer");
    await db.user.update({
      where: { id: moderator },
      data: { twoFactorEnabled: true },
    });
    await db.internalRoleAssignment.create({
      data: { userId: moderator, role: "MODERATOR" },
    });
    const queue = await media.listMediaQueue(moderator);
    const entry = queue.find((row) => row.displayName === "Fiktiv club");
    expect(entry?.owner).toBe("organization");
    const detail = await media.getMediaCase(moderator, entry?.id ?? "");
    expect(detail?.organization?.slug).toBe(club.slug);
    expect(
      await media.decideMedia(moderator, entry?.id ?? "", {
        decision: "PUBLISHED",
        reason: "Zulässiges Bild des Clubs.",
      }),
    ).toEqual({ ok: true });
    expect(
      (
        await media.resolveMediaDelivery(
          entry?.id ?? "",
          media.variantName(640, "webp"),
          null,
        )
      )?.access,
    ).toBe("public");
    await db.auditEvent.deleteMany({ where: { actorId: moderator } });
  });
});
