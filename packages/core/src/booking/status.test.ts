import { describe, expect, it } from "vitest";
import {
  BOOKING_STATUSES,
  allowedActions,
  isExpired,
  nextStatus,
  type BookingRole,
  type BookingStatus,
} from "./status";

const now = new Date("2026-11-20T10:00:00Z");
const future = {
  startsAt: new Date("2026-11-21T18:00:00Z"),
  endsAt: new Date("2026-11-21T19:00:00Z"),
};
const past = {
  startsAt: new Date("2026-11-19T18:00:00Z"),
  endsAt: new Date("2026-11-19T19:00:00Z"),
};
const roles: BookingRole[] = ["MEMBER", "PROVIDER"];

describe("Statusmodell (FR-BOOKING-003)", () => {
  it("Absagen ist in jedem offenen und bestätigten Status für beide Seiten möglich (Abnahme 1.9)", () => {
    for (const status of ["REQUESTED", "NEGOTIATING", "CONFIRMED"] as const) {
      for (const role of roles) {
        for (const lastProposedBy of roles) {
          const actions = allowedActions(
            { status, lastProposedBy, ...future },
            role,
            now,
          );
          expect(actions).toContain("cancel");
          expect(actions).toContain("cancel-safety");
        }
      }
    }
  });

  it("annehmen nur den Vorschlag der Gegenseite; ablehnen nur der Anbieter", () => {
    expect(
      allowedActions(
        { status: "REQUESTED", lastProposedBy: "MEMBER", ...future },
        "PROVIDER",
        now,
      ),
    ).toEqual(["accept", "counter", "decline", "cancel", "cancel-safety"]);
    expect(
      allowedActions(
        { status: "REQUESTED", lastProposedBy: "MEMBER", ...future },
        "MEMBER",
        now,
      ),
    ).toEqual(["counter", "cancel", "cancel-safety"]);
    expect(
      allowedActions(
        { status: "NEGOTIATING", lastProposedBy: "PROVIDER", ...future },
        "MEMBER",
        now,
      ),
    ).toEqual(["accept", "counter", "cancel", "cancel-safety"]);
  });

  it("nach dem Termin: stattgefunden oder strittig, kein Absagen mehr", () => {
    for (const role of roles) {
      expect(
        allowedActions(
          { status: "CONFIRMED", lastProposedBy: "MEMBER", ...past },
          role,
          now,
        ),
      ).toEqual(["complete", "dispute"]);
      expect(
        allowedActions(
          { status: "COMPLETED", lastProposedBy: "MEMBER", ...past },
          role,
          now,
        ),
      ).toEqual(["dispute"]);
    }
  });

  it("Endzustände erlauben nichts mehr", () => {
    for (const status of [
      "DECLINED",
      "CANCELLED",
      "EXPIRED",
      "DISPUTED",
    ] as BookingStatus[]) {
      for (const role of roles)
        expect(
          allowedActions(
            { status, lastProposedBy: "MEMBER", ...future },
            role,
            now,
          ),
        ).toEqual([]);
    }
  });

  it("jede Aktion führt in einen bekannten Status", () => {
    for (const action of [
      "accept",
      "counter",
      "decline",
      "cancel",
      "cancel-safety",
      "complete",
      "dispute",
    ] as const) {
      expect(BOOKING_STATUSES).toContain(nextStatus(action));
    }
  });

  it("offene Anfragen laufen ab, bestätigte nie", () => {
    expect(
      isExpired(
        "REQUESTED",
        new Date("2026-11-20T09:00:00Z"),
        future.startsAt,
        now,
      ),
    ).toBe(true);
    expect(
      isExpired(
        "NEGOTIATING",
        new Date("2026-11-22T00:00:00Z"),
        past.startsAt,
        now,
      ),
    ).toBe(true);
    expect(
      isExpired(
        "REQUESTED",
        new Date("2026-11-21T00:00:00Z"),
        future.startsAt,
        now,
      ),
    ).toBe(false);
    expect(
      isExpired(
        "CONFIRMED",
        new Date("2026-11-19T00:00:00Z"),
        past.startsAt,
        now,
      ),
    ).toBe(false);
  });
});
