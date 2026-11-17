import { getDb } from "@app/db";
import { afterAll, describe, expect, it } from "vitest";
import type { Viewer } from "../identity/types";
import * as favorites from "./index";
import { MAX_ITEMS_PER_COLLECTION } from "./schemas";

/** Sammelaktionen: Verschieben, Entfernen, Rückgängig (PRD v2 12.1, PRD 13). Konten sind fiktiv. */
const db = getDb();
const run = `${Date.now()}`;
const users: string[] = [];

async function account(label: string): Promise<Viewer & { kind: "account" }> {
  const userId = `it_bulk_${label}_${run}`;
  users.push(userId);
  await db.user.create({
    data: {
      id: userId,
      name: "Fiktiv",
      email: `${userId}@fiktiv.test`,
      emailVerified: true,
    },
  });
  return {
    kind: "account",
    userId,
    name: "Fiktiv",
    ageConfirmed: true,
    provider: null,
    organizations: [],
  };
}

async function provider(label: string): Promise<{ id: string; slug: string }> {
  const userId = `it_bulk_p_${label}_${run}`;
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
      slug: `fiktiv-bulk-${label}-${run}`,
      displayName: `Fiktiv ${label}`,
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });
  await db.identityCheck.create({
    data: {
      userId,
      provider: "test",
      externalRef: `it-bulk-${label}-${run}`,
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

async function entries(
  viewer: Viewer & { kind: "account" },
  collectionId: string,
) {
  const view = await favorites.getCollectionView(viewer, collectionId, "de");
  return (view?.entries ?? []).map((entry) => ({
    id: entry.id,
    slug: entry.state === "unavailable" ? null : entry.slug,
  }));
}

afterAll(async () => {
  await db.user.deleteMany({ where: { id: { in: users } } });
});

describe("Sammelaktionen (PRD v2 12.1)", () => {
  it("verschiebt atomar: im Ziel oben in bisheriger Reihenfolge, hier weg; Dubletten im Ziel nur hier entfernt", async () => {
    const owner = await account("verschieber");
    const [a, b, c] = [
      await provider("a"),
      await provider("b"),
      await provider("c"),
    ];
    for (const p of [c, b, a]) await favorites.setFavorite(owner, p.slug, true);
    const standard = await favorites.ensureDefaultCollection(owner.userId);
    const created = await favorites.createCollection(owner.userId, "Ziel");
    if (!created.ok) throw new Error("Sammlung fehlt");
    await favorites.addToCollection(owner, created.id, c.slug);
    const before = await entries(owner, standard);
    expect(before.map((entry) => entry.slug)).toEqual([a.slug, b.slug, c.slug]);
    const ids = before.map((entry) => entry.id);

    expect(
      await favorites.moveFavorites(owner.userId, ids, created.id),
    ).toEqual({ ok: true, moved: 3 });
    expect(await entries(owner, standard)).toEqual([]);
    expect(
      (await entries(owner, created.id)).map((entry) => entry.slug),
    ).toEqual([a.slug, b.slug, c.slug]);
  });

  it("nur eigene Einträge und Sammlungen; Ziel voll: nichts ändert sich", async () => {
    const owner = await account("eigen");
    const other = await account("fremd");
    const p = await provider("eigen");
    await favorites.setFavorite(owner, p.slug, true);
    const standard = await favorites.ensureDefaultCollection(owner.userId);
    const [entry] = await entries(owner, standard);
    const foreign = await favorites.createCollection(other.userId, "Fremd");
    const own = await favorites.createCollection(owner.userId, "Voll");
    if (!foreign.ok || !own.ok || !entry) throw new Error("Vorbereitung fehlt");

    expect(
      await favorites.moveFavorites(owner.userId, [entry.id], foreign.id),
    ).toEqual({ ok: false, reason: "not-found" });
    expect(
      await favorites.moveFavorites(
        other.userId,
        [entry.id],
        await favorites.ensureDefaultCollection(other.userId),
      ),
    ).toEqual({ ok: false, reason: "not-found" });
    expect(await favorites.moveFavorites(owner.userId, [], own.id)).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(
      await favorites.moveFavorites(owner.userId, [entry.id], standard),
    ).toEqual({ ok: false, reason: "not-found" });

    // Ziel bis zur Grenze füllen: 200 fiktive Profile (Entwurf genügt, Einträge prüfen keine Erreichbarkeit).
    const fillers = Array.from(
      { length: MAX_ITEMS_PER_COLLECTION },
      (_, index) => `it_bulk_f${index}_${run}`,
    );
    users.push(...fillers);
    await db.user.createMany({
      data: fillers.map((id) => ({
        id,
        name: "Fiktiv",
        email: `${id}@fiktiv.test`,
        emailVerified: true,
      })),
    });
    await db.providerProfile.createMany({
      data: fillers.map((id) => ({
        id: `${id}_p`,
        userId: id,
        slug: id.replaceAll("_", "-"),
        displayName: "Fiktiv",
      })),
    });
    await db.favorite.createMany({
      data: fillers.map((id, index) => ({
        collectionId: own.id,
        providerProfileId: `${id}_p`,
        sortOrder: index,
      })),
    });
    expect(
      await favorites.moveFavorites(owner.userId, [entry.id], own.id),
    ).toEqual({ ok: false, reason: "limit" });
    expect((await entries(owner, standard)).map((row) => row.id)).toEqual([
      entry.id,
    ]);
  });

  it("entfernen und rückgängig: Platz bleibt; fremde Sammlung und gesperrte Profile werden nicht zurückgelegt", async () => {
    const owner = await account("entferner");
    const other = await account("dritter");
    const [a, b, c] = [
      await provider("ra"),
      await provider("rb"),
      await provider("rc"),
    ];
    for (const p of [c, b, a]) await favorites.setFavorite(owner, p.slug, true);
    const standard = await favorites.ensureDefaultCollection(owner.userId);
    const before = await entries(owner, standard);
    const middle = before[1];
    if (!middle) throw new Error("Eintrag fehlt");

    expect(await favorites.removeFavorites(other.userId, [middle.id])).toEqual({
      ok: false,
      reason: "not-found",
    });
    const removed = await favorites.removeFavorites(owner.userId, [
      middle.id,
      before[2]?.id,
    ]);
    expect(removed.ok).toBe(true);
    if (!removed.ok) return;
    expect((await entries(owner, standard)).map((entry) => entry.slug)).toEqual(
      [a.slug],
    );

    expect(await favorites.restoreFavorites(other, removed.removed)).toEqual({
      ok: true,
      restored: 0,
    });
    await db.providerProfile.update({
      where: { id: c.id },
      data: { status: "SUSPENDED" },
    });
    expect(await favorites.restoreFavorites(owner, removed.removed)).toEqual({
      ok: true,
      restored: 1,
    });
    expect((await entries(owner, standard)).map((entry) => entry.slug)).toEqual(
      [a.slug, b.slug],
    );
    expect(await favorites.restoreFavorites(owner, [{ bogus: true }])).toEqual({
      ok: false,
      reason: "invalid",
    });
  });
});

describe("Dublette im Ziel", () => {
  it("liegt das Profil schon im Ziel, wird nur der Eintrag hier entfernt", async () => {
    const owner = await account("dublette");
    const p = await provider("dublette");
    await favorites.setFavorite(owner, p.slug, true);
    const standard = await favorites.ensureDefaultCollection(owner.userId);
    const target = await favorites.createCollection(owner.userId, "Schon da");
    if (!target.ok) throw new Error("Sammlung fehlt");
    await favorites.addToCollection(owner, target.id, p.slug);
    const [entry] = await entries(owner, standard);
    expect(
      await favorites.moveFavorites(owner.userId, [entry?.id], target.id),
    ).toEqual({ ok: true, moved: 1 });
    expect(await entries(owner, standard)).toEqual([]);
    expect((await entries(owner, target.id)).map((row) => row.slug)).toEqual([
      p.slug,
    ]);
  });
});
