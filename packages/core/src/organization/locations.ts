import { getDb } from "@app/db";
import { authorize, membershipOf, type Membership } from "./access";
import {
  locationSchema,
  openingExceptionSchema,
  openingHoursSchema,
} from "./schemas";

/** Standorte mit Öffnungszeiten und Ausnahmen (v1 FR-BUSINESS-002, v2 12.2). */
export type LocationResult =
  | { ok: true; id: string }
  | { ok: false; reason: "not-found" | "forbidden" | "invalid" };

type Writable =
  | { membership: Membership }
  | { membership: null; reason: "forbidden" | "not-found" };

async function writable(
  userId: string,
  organizationSlug: string,
): Promise<Writable> {
  const membership = await authorize(
    userId,
    organizationSlug,
    "locations.edit",
  );
  if (membership) return { membership };
  return {
    membership: null,
    reason: (await membershipOf(userId, organizationSlug))
      ? "forbidden"
      : "not-found",
  };
}

async function ownLocation(organizationId: string, locationId: string) {
  if (locationId.length > 64) return null;
  return getDb().location.findFirst({
    where: { id: locationId, organizationId },
    select: { id: true },
  });
}

async function validRegion(regionId: string | null): Promise<boolean> {
  if (!regionId) return true;
  return (
    (await getDb().region.count({
      where: { id: regionId, approved: true },
    })) === 1
  );
}

export async function listLocations(userId: string, organizationSlug: string) {
  const membership = await membershipOf(userId, organizationSlug);
  if (!membership) return null;
  return getDb().location.findMany({
    where: { organizationId: membership.organizationId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      regionId: true,
      areaLabel: true,
      phone: true,
      website: true,
      hours: {
        orderBy: [{ weekday: "asc" }, { startMinute: "asc" }],
        select: { weekday: true, startMinute: true, endMinute: true },
      },
      exceptions: {
        orderBy: { day: "asc" },
        select: {
          id: true,
          day: true,
          closed: true,
          startMinute: true,
          endMinute: true,
          note: true,
        },
      },
      _count: { select: { links: { where: { status: "ACTIVE" } } } },
    },
  });
}

export async function saveLocation(
  userId: string,
  organizationSlug: string,
  locationId: string | null,
  input: unknown,
): Promise<LocationResult> {
  const access = await writable(userId, organizationSlug);
  if (!access.membership) return { ok: false, reason: access.reason };
  const parsed = locationSchema.safeParse(input);
  if (!parsed.success || !(await validRegion(parsed.data.regionId)))
    return { ok: false, reason: "invalid" };
  const db = getDb();
  const organizationId = access.membership.organizationId;
  if (locationId === null) {
    const count = await db.location.count({ where: { organizationId } });
    return {
      ok: true,
      id: (
        await db.location.create({
          data: { organizationId, ...parsed.data, sortOrder: count },
          select: { id: true },
        })
      ).id,
    };
  }
  if (!(await ownLocation(organizationId, locationId)))
    return { ok: false, reason: "not-found" };
  await db.location.update({ where: { id: locationId }, data: parsed.data });
  return { ok: true, id: locationId };
}

export async function deleteLocation(
  userId: string,
  organizationSlug: string,
  locationId: string,
): Promise<boolean> {
  const access = await writable(userId, organizationSlug);
  if (
    !access.membership ||
    !(await ownLocation(access.membership.organizationId, locationId))
  )
    return false;
  await getDb().location.delete({ where: { id: locationId } });
  return true;
}

/** Ersetzt die Öffnungszeiten eines Standorts. Überschneidungen am selben Tag werden abgelehnt. */
export async function saveOpeningHours(
  userId: string,
  organizationSlug: string,
  locationId: string,
  input: unknown,
): Promise<LocationResult> {
  const access = await writable(userId, organizationSlug);
  if (!access.membership) return { ok: false, reason: access.reason };
  const parsed = openingHoursSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const overlaps = parsed.data.some((a, i) =>
    parsed.data.some(
      (b, j) =>
        i !== j &&
        a.weekday === b.weekday &&
        a.startMinute < b.endMinute &&
        b.startMinute < a.endMinute,
    ),
  );
  if (overlaps) return { ok: false, reason: "invalid" };
  if (!(await ownLocation(access.membership.organizationId, locationId)))
    return { ok: false, reason: "not-found" };
  const db = getDb();
  await db.$transaction([
    db.openingHours.deleteMany({ where: { locationId } }),
    db.openingHours.createMany({
      data: parsed.data.map((entry) => ({ locationId, ...entry })),
    }),
  ]);
  return { ok: true, id: locationId };
}

export async function saveOpeningException(
  userId: string,
  organizationSlug: string,
  locationId: string,
  input: unknown,
): Promise<LocationResult> {
  const access = await writable(userId, organizationSlug);
  if (!access.membership) return { ok: false, reason: access.reason };
  const parsed = openingExceptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  if (!(await ownLocation(access.membership.organizationId, locationId)))
    return { ok: false, reason: "not-found" };
  const data = {
    ...parsed.data,
    startMinute: parsed.data.closed ? null : parsed.data.startMinute,
    endMinute: parsed.data.closed ? null : parsed.data.endMinute,
  };
  const row = await getDb().openingException.upsert({
    where: { locationId_day: { locationId, day: data.day } },
    create: { locationId, ...data },
    update: data,
    select: { id: true },
  });
  return { ok: true, id: row.id };
}

export async function deleteOpeningException(
  userId: string,
  organizationSlug: string,
  exceptionId: string,
): Promise<boolean> {
  const access = await writable(userId, organizationSlug);
  if (!access.membership || exceptionId.length > 64) return false;
  const { count } = await getDb().openingException.deleteMany({
    where: {
      id: exceptionId,
      location: { organizationId: access.membership.organizationId },
    },
  });
  return count > 0;
}
