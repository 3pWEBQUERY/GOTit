import { getDb, type InternalRole } from "@app/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listCategoriesForAdmin, setCategoryApproved, upsertCategory } from "../catalog/admin";
import {
  deleteContentPage,
  deleteSeoOverride,
  getContentPage,
  listContentPages,
  listSeoOverrides,
  saveContentPage,
  saveSeoOverride,
  setContentPublished,
} from "../content";
import { listRegionsForAdmin, markRegionChecked, setRegionApproved, updateRegionRules } from "../geo/admin";
import { assignTicket, getSupportTicket, listSupportTickets, replyToTicket, setTicketStatus } from "../support";
import { getPlatformOverview } from "./dashboard";
import { ADMIN_PERMISSIONS, AdminForbiddenError, type AdminPermission } from "./permissions";
import { getServiceStatus, listAuditEvents, listFeatureFlags, setFeatureFlag } from "./system";
import { listProvidersForAdmin } from "./providers";
import { getUserDetail, listInternalStaff, searchUsers, setInternalRoles } from "./users";

/**
 * Abnahme v1 20.6 «Rollenrechte werden in jedem API-Endpunkt geprüft»: Jede
 * exportierte Admin-Funktion lehnt ab ohne interne Rolle, ohne zweiten Faktor
 * und mit einer Rolle ohne das Recht, auch bei ungültiger Eingabe.
 */
const db = getDb();
const run = `${Date.now()}`;
const users: string[] = [];

async function user(label: string, role?: InternalRole, twoFactor = true) {
  const id = `it_adm_${label}_${run}`;
  users.push(id);
  await db.user.create({ data: { id, name: `Fiktiv ${label}`, email: `${id}@fiktiv.test`, emailVerified: true, twoFactorEnabled: twoFactor } });
  if (role) await db.internalRoleAssignment.create({ data: { userId: id, role, grantedBy: "test" } });
  return id;
}

const ROLES: InternalRole[] = ["PLATFORM_ADMIN", "MODERATOR", "TRUST_SAFETY", "SUPPORT", "FINANCE", "CONTENT_EDITOR"];
const accounts: Partial<Record<InternalRole | "member" | "noTwoFactor", string>> = {};

beforeAll(async () => {
  accounts.member = await user("mitglied");
  accounts.noTwoFactor = await user("ohne2fa", "SUPER_ADMIN", false);
  for (const role of ROLES) accounts[role] = await user(role.toLowerCase(), role);
});

afterAll(async () => {
  await db.auditEvent.deleteMany({ where: { actorId: { in: users } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
});

type Call = (actorId: string) => Promise<unknown>;
const missing = "fehlt";
const bad = "x".repeat(500);

/** Pro Funktion: Recht, ein Aufruf mit gültiger Form und einer mit ungültiger Eingabe. */
const matrix: { name: string; permission: AdminPermission; calls: Call[] }[] = [
  { name: "searchUsers", permission: "users.view", calls: [(a) => searchUsers(a, { q: "x" }), (a) => searchUsers(a, { q: bad, filter: "?" as never })] },
  { name: "getUserDetail", permission: "users.view", calls: [(a) => getUserDetail(a, missing), (a) => getUserDetail(a, bad)] },
  { name: "setInternalRoles", permission: "roles.manage", calls: [(a) => setInternalRoles(a, missing, ["SUPPORT"], "Begründung lang genug"), (a) => setInternalRoles(a, bad, ["NOPE" as never], "")] },
  { name: "listProvidersForAdmin", permission: "providers.view", calls: [(a) => listProvidersForAdmin(a, { q: "x" }), (a) => listProvidersForAdmin(a, { status: "KAPUTT" as never })] },
  { name: "listInternalStaff", permission: "roles.manage", calls: [(a) => listInternalStaff(a)] },
  { name: "getPlatformOverview", permission: "dashboard.view", calls: [(a) => getPlatformOverview(a)] },
  { name: "listFeatureFlags", permission: "flags.manage", calls: [(a) => listFeatureFlags(a)] },
  {
    name: "setFeatureFlag",
    permission: "flags.manage",
    calls: [(a) => setFeatureFlag(a, "community", { enabled: true, disabledRegions: [] }, "Begründung lang genug"), (a) => setFeatureFlag(a, "nope", { enabled: "x" as never, disabledRegions: [] }, "")],
  },
  { name: "listAuditEvents", permission: "audit.view", calls: [(a) => listAuditEvents(a, {}), (a) => listAuditEvents(a, { cursor: "kaputt" })] },
  { name: "getServiceStatus", permission: "system.status", calls: [(a) => getServiceStatus(a)] },
  { name: "listRegionsForAdmin", permission: "regions.manage", calls: [(a) => listRegionsForAdmin(a)] },
  {
    name: "updateRegionRules",
    permission: "regions.manage",
    calls: [
      (a) => updateRegionRules(a, missing, { legalNote: null, requiredPermits: null, contentRestrictions: null, featuredRank: null }),
      (a) => updateRegionRules(a, bad, { featuredRank: -1 } as never),
    ],
  },
  { name: "markRegionChecked", permission: "regions.manage", calls: [(a) => markRegionChecked(a, missing, "Notiz lang genug"), (a) => markRegionChecked(a, bad, "")] },
  { name: "setRegionApproved", permission: "regions.manage", calls: [(a) => setRegionApproved(a, missing, true, "Begründung lang genug"), (a) => setRegionApproved(a, bad, "ja" as never, "")] },
  { name: "listCategoriesForAdmin", permission: "categories.manage", calls: [(a) => listCategoriesForAdmin(a)] },
  {
    name: "upsertCategory",
    permission: "categories.manage",
    calls: [(a) => upsertCategory(a, { id: missing, slug: "ok-slug", nameDe: "a", nameFr: "a", nameIt: "a", nameEn: "a", sortOrder: 1 }), (a) => upsertCategory(a, { slug: "KAPUTT" } as never)],
  },
  { name: "setCategoryApproved", permission: "categories.manage", calls: [(a) => setCategoryApproved(a, missing, true, "Begründung lang genug"), (a) => setCategoryApproved(a, "", true, "")] },
  { name: "listContentPages", permission: "content.manage", calls: [(a) => listContentPages(a), (a) => listContentPages(a, { kind: "X" as never })] },
  { name: "getContentPage", permission: "content.manage", calls: [(a) => getContentPage(a, missing), (a) => getContentPage(a, bad)] },
  {
    name: "saveContentPage",
    permission: "content.manage",
    calls: [(a) => saveContentPage(a, { kind: "HELP", slug: `it-${run}`, locale: "de", title: "Titel", body: "Text" }), (a) => saveContentPage(a, { kind: "HELP", slug: "KAPUTT" } as never)],
  },
  { name: "setContentPublished", permission: "content.manage", calls: [(a) => setContentPublished(a, missing, true), (a) => setContentPublished(a, bad, true)] },
  { name: "deleteContentPage", permission: "content.manage", calls: [(a) => deleteContentPage(a, missing), (a) => deleteContentPage(a, bad)] },
  { name: "listSeoOverrides", permission: "content.manage", calls: [(a) => listSeoOverrides(a)] },
  { name: "saveSeoOverride", permission: "content.manage", calls: [(a) => saveSeoOverride(a, { path: `/it-${run}`, locale: "de", noindex: true }), (a) => saveSeoOverride(a, { path: "ohne-slash?q=1", locale: "xx" } as never)] },
  { name: "deleteSeoOverride", permission: "content.manage", calls: [(a) => deleteSeoOverride(a, `/it-${run}`, "de"), (a) => deleteSeoOverride(a, "kaputt", "xx")] },
  { name: "listSupportTickets", permission: "support.handle", calls: [(a) => listSupportTickets(a), (a) => listSupportTickets(a, { status: "X" as never })] },
  { name: "getSupportTicket", permission: "support.handle", calls: [(a) => getSupportTicket(a, missing), (a) => getSupportTicket(a, bad)] },
  { name: "replyToTicket", permission: "support.handle", calls: [(a) => replyToTicket(a, missing, { body: "Antwort", internal: false }), (a) => replyToTicket(a, bad, { body: "" })] },
  { name: "setTicketStatus", permission: "support.handle", calls: [(a) => setTicketStatus(a, missing, "CLOSED"), (a) => setTicketStatus(a, bad, "KAPUTT")] },
  { name: "assignTicket", permission: "support.handle", calls: [(a) => assignTicket(a, missing, null), (a) => assignTicket(a, bad, bad)] },
];

/** Eine interne Rolle ohne das Recht; null, wenn alle internen Rollen es haben. */
function roleWithout(permission: AdminPermission): InternalRole | null {
  const allowed: readonly InternalRole[] = ADMIN_PERMISSIONS[permission];
  return ROLES.find((role) => !allowed.includes(role)) ?? null;
}

async function expectForbidden(call: Call, actorId: string) {
  await expect(call(actorId)).rejects.toBeInstanceOf(AdminForbiddenError);
}

describe("Rechte jeder Admin-Funktion (v1 20.6)", () => {
  it.each(matrix)("$name lehnt ohne Recht ab", async ({ permission, calls }) => {
    const lacking = roleWithout(permission);
    const actors = [accounts.member, accounts.noTwoFactor, `it_adm_unbekannt_${run}`, ...(lacking ? [accounts[lacking]] : [])];
    for (const actor of actors) for (const call of calls) await expectForbidden(call, actor as string);
  });

  it("deckt jede exportierte Admin-Funktion der neuen Module ab", async () => {
    const modules = await Promise.all([import("./users"), import("./providers"), import("./dashboard"), import("./system"), import("../geo/admin"), import("../catalog/admin"), import("../content/admin"), import("../support/admin")]);
    const exported = modules
      .flatMap((module) => Object.entries(module))
      .filter(([name, value]) => typeof value === "function" && name !== "closeServiceStatusConnection")
      .map(([name]) => name);
    expect(new Set(matrix.map((entry) => entry.name))).toEqual(new Set(exported));
  });

  it("schreibt bei Ablehnung nichts", async () => {
    const written = await db.auditEvent.count({ where: { actorId: { in: users } } });
    expect(written).toBe(0);
    expect(await db.contentPage.count({ where: { slug: `it-${run}` } })).toBe(0);
  });
});
