import { hashPassword } from "better-auth/crypto";
import type { PrismaClient, ProviderStatus } from "../../src";

/**
 * FIKTIVE Testkonten für lokale Entwicklung und End-to-End-Tests. Keine echten
 * Personen, Adressen unter der reservierten Domain `.test`. Wird nie in der
 * Produktion geladen (siehe run.ts).
 */
export const TEST_PASSWORD = "nur-fuer-tests-0000";

interface TestAccount {
  key: string;
  name: string;
  provider?: { slug: string; displayName: string; status: ProviderStatus };
  organization?: { slug: string; name: string };
}

export const testAccounts: TestAccount[] = [
  { key: "mitglied", name: "Testmitglied Fiktiv" },
  { key: "anbieter", name: "Testanbieter Fiktiv", provider: { slug: "testprofil-fiktiv", displayName: "Testprofil Fiktiv", status: "PUBLISHED" } },
  { key: "entwurf", name: "Testentwurf Fiktiv", provider: { slug: "testentwurf-fiktiv", displayName: "Testentwurf Fiktiv", status: "DRAFT" } },
  { key: "club", name: "Testclub-Inhaber Fiktiv", organization: { slug: "testclub-fiktiv", name: "Testclub Fiktiv" } },
];

export async function seedTestAccounts(db: PrismaClient): Promise<void> {
  const password = await hashPassword(TEST_PASSWORD);
  for (const account of testAccounts) {
    const id = `test_${account.key}`;
    const email = `${account.key}@fiktiv.test`;
    await db.user.upsert({
      where: { id },
      create: { id, email, name: account.name, emailVerified: true, ageConfirmedAt: new Date() },
      update: { name: account.name },
    });
    await db.account.upsert({
      where: { id: `${id}_credential` },
      create: { id: `${id}_credential`, accountId: id, providerId: "credential", userId: id, password },
      update: { password },
    });
    if (account.provider) {
      await db.providerProfile.upsert({ where: { userId: id }, create: { userId: id, ...account.provider }, update: { status: account.provider.status } });
    }
    if (account.organization) {
      const organization = await db.organization.upsert({
        where: { slug: account.organization.slug },
        create: { ...account.organization, kind: "CLUB", status: "PUBLISHED" },
        update: {},
      });
      await db.organizationMember.upsert({
        where: { organizationId_userId: { organizationId: organization.id, userId: id } },
        create: { organizationId: organization.id, userId: id, role: "OWNER" },
        update: {},
      });
    }
  }
}
