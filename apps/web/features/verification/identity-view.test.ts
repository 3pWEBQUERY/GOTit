import { describe, expect, it } from "vitest";
import { failureReasonKey, identityView, type IdentityCheckRecord } from "./identity-view";

const now = new Date("2026-11-17T10:00:00Z");
const day = 24 * 60 * 60 * 1000;
const base: IdentityCheckRecord = {
  status: "APPROVED",
  ageOver18: true,
  livenessPassed: true,
  expiresAt: new Date(now.getTime() + 20 * day),
  checkedAt: now,
  failureReason: null,
};

describe("Status der Identitätsprüfung", () => {
  it("unterscheidet nicht begonnen, läuft, bestanden, abgelaufen und abgelehnt", () => {
    expect(identityView(null, now)).toEqual({ kind: "none" });
    expect(identityView({ ...base, status: "CANCELLED" }, now)).toEqual({
      kind: "none",
    });
    expect(identityView({ ...base, status: "PENDING" }, now)).toEqual({
      kind: "pending",
    });
    expect(identityView(base, now)).toMatchObject({
      kind: "valid",
      expiresInDays: 20,
    });
    expect(identityView({ ...base, expiresAt: new Date(now.getTime() - day) }, now)).toMatchObject({ kind: "expired" });
    expect(identityView({ ...base, status: "EXPIRED" }, now)).toMatchObject({
      kind: "expired",
    });
    expect(identityView({ ...base, status: "REJECTED", failureReason: "under-age" }, now)).toEqual({ kind: "rejected", reason: "under-age" });
  });

  it("zeigt für unbekannte Gründe einen allgemeinen Text", () => {
    expect(failureReasonKey("document-unreadable")).toBe("document-unreadable");
    expect(failureReasonKey("irgendwas")).toBe("other");
  });
});
