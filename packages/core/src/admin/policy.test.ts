import { describe, expect, it } from "vitest";
import { adminAccess } from "./policy";

describe("Zugang zur Admin-Anwendung (PRD 7.8, 16.2)", () => {
  it("verlangt eine interne Rolle", () => {
    expect(adminAccess(null)).toEqual({ allowed: false, reason: "no-role" });
    expect(adminAccess({ userId: "u", roles: [], twoFactorEnabled: true })).toEqual({ allowed: false, reason: "no-role" });
  });
  it("verlangt den zweiten Faktor, auch für Super Admins", () => {
    expect(adminAccess({ userId: "u", roles: ["SUPER_ADMIN"], twoFactorEnabled: false })).toEqual({ allowed: false, reason: "two-factor-required" });
  });
  it("prüft die Rolle für einen Bereich; Super Admin darf alles", () => {
    const support = { userId: "u", roles: ["SUPPORT"] as const, twoFactorEnabled: true };
    expect(adminAccess(support, ["TRUST_SAFETY", "MODERATOR"])).toEqual({ allowed: false, reason: "role-missing" });
    expect(adminAccess(support)).toEqual({ allowed: true });
    expect(adminAccess({ userId: "u", roles: ["SUPER_ADMIN"], twoFactorEnabled: true }, ["TRUST_SAFETY"])).toEqual({ allowed: true });
    expect(adminAccess({ userId: "u", roles: ["MODERATOR"], twoFactorEnabled: true }, ["TRUST_SAFETY", "MODERATOR"])).toEqual({ allowed: true });
  });
});
