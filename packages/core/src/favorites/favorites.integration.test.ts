import { getDb } from "@app/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Viewer } from "../identity/types";
import * as favorites from "./index";

/** Favoriten und Sammlungen gegen Postgres (PRD v1 5.6). Konten sind fiktiv und werden danach gelöscht. */
const db = getDb();
const run = `${Date.now()}`;
const users: string[] = [];

function account(label: string): Viewer & { kind: "account" } {
  return {
    kind: "account",
    userId: `it_fav_${label}_${run}`,
    name: "Fiktiv",
    ageConfirmed: true,
    provider: null,
    organizations: [],
  };
}
const owner = account("inhaber");
const other = account("fremd");

async function provider(
  label: string,
  status: "PUBLISHED" | "PAUSED" | "SUSPENDED" = "PUBLISHED",
): Promise<{ id: string; slug: string }> {
  const userId = `it_fav_p_${label}_${run}`;
  users.push(userId);
  await db.user.create({
    data: {
      id: userId,
      name: "Fiktiv",
      email: `${userId}@fiktiv.test`,
      emailVerified: true,
      accountType: "PROVIDER",
    },
  });
  const profile = await db.providerProfile.create({
    data: {
      userId,
      slug: `fiktiv-fav-${label}-${run}`,
      displayName: `Fiktiv ${label}`,
      status,
      publishedAt: new Date(),
    },
  });
  await db.identityCheck.create({
    data: {
      userId,
      provider: "test",
      externalRef: `it-fav-${label}-${run}`,
      status: "APPROVED",
      ageOver18: true,
      livenessPassed: true,
      checkedAt: new Date(),
      expiresAt: new Date(Date.now() + 86_400_000 * 100),
    },
  });
  await db.profileReview.create({
    data: {
      providerProfileId: profile.id,
      decision: "APPROVED",
      decidedAt: new Date(),
    },
  });
  return { id: profile.id, slug: profile.slug };
}

beforeAll(async () => {
  for (const viewer of [owner, other]) {
    users.push(viewer.userId);
    await db.user.create({
      data: {
        id: viewer.userId,
        name: "Fiktiv",
        email: `${viewer.userId}@fiktiv.test`,
        emailVerified: true,
      },
    });
  }
});

afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: users } } });
});

describe("Favoriten (PRD v1 5.6)", () => {
  it("Herz merkt und entfernt, idempotent; nur in der eigenen Standardsammlung", async () => {
    const { slug } = await provider("herz");
    expect(await favorites.setFavorite(owner, slug, true)).toEqual({
      ok: true,
    });
    expect(await favorites.setFavorite(owner, slug, true)).toEqual({
      ok: true,
    });
    expect(await favorites.favoriteSlugs(owner, [slug])).toEqual(
      new Set([slug]),
    );
    expect(await favorites.favoriteSlugs(other, [slug])).toEqual(new Set());
    const [standard] = await favorites.listCollections(owner.userId);
    expect(standard).toMatchObject({ isDefault: true, count: 1 });
    expect(await favorites.setFavorite(owner, slug, false)).toEqual({
      ok: true,
    });
    expect(await favorites.favoriteSlugs(owner, [slug])).toEqual(new Set());
  });

  it("nicht erreichbare Profile lassen sich nicht merken; Besucher haben keine Favoriten", async () => {
    const { slug } = await provider("gesperrt", "SUSPENDED");
    expect(await favorites.setFavorite(owner, slug, true)).toEqual({
      ok: false,
      reason: "unavailable",
    });
    expect(await favorites.setFavorite(owner, "gibt-es-nicht", true)).toEqual({
      ok: false,
      reason: "unavailable",
    });
    expect(
      await favorites.setFavorite({ kind: "visitor" }, slug, true),
    ).toEqual({ ok: false, reason: "not-found" });
  });

  it("später gesperrte Profile erscheinen ohne Name und Link; pausierte bleiben erreichbar", async () => {
    const gesperrt = await provider("spaeter-gesperrt");
    const pausiert = await provider("spaeter-pausiert");
    await favorites.setFavorite(owner, gesperrt.slug, true);
    await favorites.setFavorite(owner, pausiert.slug, true);
    await db.providerProfile.update({
      where: { id: gesperrt.id },
      data: { status: "SUSPENDED" },
    });
    await db.providerProfile.update({
      where: { id: pausiert.id },
      data: { status: "PAUSED" },
    });
    const collectionId = await favorites.ensureDefaultCollection(owner.userId);
    const view = await favorites.getCollectionView(owner, collectionId, "de");
    const states = view?.entries.map((entry) =>
      entry.state === "unavailable"
        ? entry
        : { state: entry.state, slug: entry.slug },
    );
    expect(states).toEqual(
      expect.arrayContaining([
        { state: "paused", slug: pausiert.slug },
        expect.objectContaining({ state: "unavailable" }),
      ]),
    );
    const unavailable = view?.entries.find(
      (entry) => entry.state === "unavailable",
    );
    expect(unavailable && "displayName" in unavailable).toBe(false);
  });

  it("Sammlungen: anlegen, umbenennen, doppelt abgelehnt, Standard geschützt, fremde wie unbekannt", async () => {
    const created = await favorites.createCollection(
      owner.userId,
      "  Später   ansehen ",
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(
      (await favorites.getOwnCollection(owner.userId, created.id))?.name,
    ).toBe("Später ansehen");
    expect(
      await favorites.createCollection(owner.userId, "Später ansehen"),
    ).toEqual({ ok: false, reason: "duplicate" });
    expect(await favorites.createCollection(owner.userId, "")).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(
      await favorites.renameCollection(owner.userId, created.id, "Zürich"),
    ).toEqual({ ok: true, id: created.id });
    const standard = await favorites.ensureDefaultCollection(owner.userId);
    expect(
      await favorites.renameCollection(owner.userId, standard, "Neu"),
    ).toEqual({ ok: false, reason: "default" });
    expect(await favorites.deleteCollection(owner.userId, standard)).toEqual({
      ok: false,
      reason: "default",
    });
    expect(
      await favorites.renameCollection(other.userId, created.id, "Übernommen"),
    ).toEqual({ ok: false, reason: "not-found" });
    expect(
      await favorites.getCollectionView(other, created.id, "de"),
    ).toBeNull();
    const { slug } = await provider("sammlung");
    expect(await favorites.addToCollection(other, created.id, slug)).toEqual({
      ok: false,
      reason: "not-found",
    });
    expect(await favorites.addToCollection(owner, created.id, slug)).toEqual({
      ok: true,
    });
    expect(await favorites.collectionsContaining(owner.userId, slug)).toEqual(
      new Set([created.id]),
    );
    expect(await favorites.deleteCollection(owner.userId, created.id)).toEqual({
      ok: true,
      id: created.id,
    });
    expect(await db.providerProfile.count({ where: { slug } })).toBe(1);
  });

  it("sortieren: nach oben und unten, am Rand nichts; fremde Einträge unberührt", async () => {
    const viewer = account("sortierer");
    users.push(viewer.userId);
    await db.user.create({
      data: {
        id: viewer.userId,
        name: "Fiktiv",
        email: `${viewer.userId}@fiktiv.test`,
        emailVerified: true,
      },
    });
    const a = await provider("sort-a");
    const b = await provider("sort-b");
    await favorites.setFavorite(viewer, a.slug, true);
    await favorites.setFavorite(viewer, b.slug, true);
    const collectionId = await favorites.ensureDefaultCollection(viewer.userId);
    const order = async () =>
      (
        await favorites.getCollectionView(viewer, collectionId, "de")
      )?.entries.map((entry) => ("slug" in entry ? entry.slug : ""));
    expect(await order()).toEqual([b.slug, a.slug]);
    const [first] =
      (await favorites.getCollectionView(viewer, collectionId, "de"))
        ?.entries ?? [];
    expect(
      await favorites.moveFavorite(viewer.userId, first?.id ?? "", {
        direction: "up",
      }),
    ).toEqual({ ok: false, reason: "edge" });
    expect(
      await favorites.moveFavorite(other.userId, first?.id ?? "", {
        direction: "down",
      }),
    ).toEqual({ ok: false, reason: "not-found" });
    expect(
      await favorites.moveFavorite(viewer.userId, first?.id ?? "", {
        direction: "down",
      }),
    ).toEqual({ ok: true });
    expect(await order()).toEqual([a.slug, b.slug]);
    expect(
      await favorites.removeFavorite(other.userId, first?.id ?? ""),
    ).toEqual({ ok: false, reason: "not-found" });
    expect(
      await favorites.removeFavorite(viewer.userId, first?.id ?? ""),
    ).toEqual({ ok: true });
  });
});
