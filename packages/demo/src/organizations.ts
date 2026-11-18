import type { PrismaClient } from "@app/db";
import { upsertAccount } from "./accounts";
import type { DemoOrganization } from "./data/organizations";
import { EMAIL_DOMAIN, LOGIN_EMAILS, locationId, organizationEmail, organizationId, organizationUserId, profileId } from "./ids";

/**
 * Organisationen mit geprüfter Geschäftsidentität (Entscheid 0018, 0023): wie
 * nach `decideOrganizationVerification` mit «APPROVED», aber ohne Prüferkonto.
 * Standorte mit Öffnungszeiten und aktive, vom Anbieter bestätigte Verknüpfungen.
 */
const DAY = 86_400_000;

export function organizationOwnerEmail(ownerKey: string): string {
  return ownerKey === "club" ? LOGIN_EMAILS.club : organizationEmail(ownerKey);
}

export interface SeededOrganization {
  key: string;
  id: string;
  slug: string;
  ownerUserId: string;
}

export async function seedOrganizations(db: PrismaClient, organizations: readonly DemoOrganization[], now: Date): Promise<SeededOrganization[]> {
  const regions = new Map((await db.region.findMany({ where: { approved: true }, select: { id: true, slug: true } })).map((row) => [row.slug, row.id]));
  const seeded: SeededOrganization[] = [];
  for (const [index, organization] of organizations.entries()) {
    const ownerUserId = organizationUserId(organization.ownerKey);
    await upsertAccount(db, { id: ownerUserId, email: organizationOwnerEmail(organization.ownerKey), name: organization.ownerName, accountType: "ORGANIZATION" }, now);
    const id = organizationId(organization.key);
    const publishedAt = new Date(now.getTime() - (90 + index * 20) * DAY);
    const profile = {
      name: organization.name,
      kind: organization.kind,
      status: "PUBLISHED" as const,
      description: organization.description,
      website: `https://${organization.slug}.${EMAIL_DOMAIN}`,
      phone: null,
      publicEmail: `kontakt-${organization.key}@${EMAIL_DOMAIN}`,
    };
    await db.organization.upsert({ where: { id }, create: { id, slug: organization.slug, ...profile, publishedAt }, update: profile });
    await db.organizationMember.upsert({
      where: { organizationId_userId: { organizationId: id, userId: ownerUserId } },
      create: { id: `${id}_owner`, organizationId: id, userId: ownerUserId, role: "OWNER" },
      update: { role: "OWNER" },
    });

    const verificationId = `${id}_verification`;
    const verification = { legalName: organization.legalName, uid: organization.uid, authorityConfirmed: true, permitNote: null, status: "APPROVED" as const, reason: "Demo", decidedById: null, decidedAt: publishedAt };
    await db.organizationVerification.upsert({
      where: { id: verificationId },
      create: { id: verificationId, organizationId: id, submittedAt: new Date(publishedAt.getTime() - 2 * DAY), ...verification },
      update: verification,
    });

    for (const [sortOrder, location] of organization.locations.entries()) {
      const regionId = regions.get(location.region);
      if (!regionId) throw new Error(`Region «${location.region}» fehlt oder ist nicht freigegeben; zuerst «pnpm db:seed» ausführen.`);
      const lid = locationId(organization.key, location.key);
      const data = { name: location.name, description: location.description, regionId, areaLabel: location.areaLabel, phone: null, website: null, sortOrder };
      await db.location.upsert({ where: { id: lid }, create: { id: lid, organizationId: id, ...data }, update: data });
      await db.openingHours.deleteMany({ where: { locationId: lid } });
      await db.openingHours.createMany({
        data: location.hours.map(([weekday, startMinute, endMinute], position) => ({ id: `${lid}_hours_${position}`, locationId: lid, weekday, startMinute, endMinute })),
      });
    }
    await db.location.deleteMany({ where: { organizationId: id, id: { notIn: organization.locations.map((location) => locationId(organization.key, location.key)) } } });

    for (const link of organization.providers) {
      const lid = `${id}_link_${link.key}`;
      const invitedAt = new Date(publishedAt.getTime() + DAY);
      const data = { status: "ACTIVE" as const, locationId: link.location ? locationId(organization.key, link.location) : null, respondedAt: new Date(invitedAt.getTime() + DAY), endedAt: null, endedBy: null };
      await db.organizationLink.upsert({
        where: { id: lid },
        create: { id: lid, organizationId: id, providerProfileId: profileId(link.key), invitedById: ownerUserId, invitedAt, message: "Wir würden uns freuen, dich auf unserer Seite zu zeigen.", ...data },
        update: data,
      });
    }
    seeded.push({ key: organization.key, id, slug: organization.slug, ownerUserId });
  }
  return seeded;
}
