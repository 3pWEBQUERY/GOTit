import { describe, expect, it } from "vitest";
import { backupBase, dumpKey, manifestKey, manifestKeyFor, parseBackupKey, planRetention } from "./retention";

const at = (iso: string) => new Date(iso);
const both = (date: Date) => [dumpKey(date), manifestKey(date)];
const day = (date: Date) => date.toISOString().slice(0, 10);

/** Ein Lauf pro Tag um 02:13 UTC, nach jedem Lauf wird aufgeräumt, wie im Betrieb. */
function simulate(from: string, days: number, skip: (date: Date) => boolean = () => false): { keys: string[]; now: Date } {
  let keys: string[] = [];
  let now = at(from);
  for (let index = 0; index < days; index += 1) {
    now = new Date(at(from).getTime() + index * 86_400_000);
    if (skip(now)) continue;
    keys = [...keys, ...both(now)];
    keys = planRetention(keys, now).keep;
  }
  return { keys, now };
}

const keptDays = (keys: string[]) => [...new Set(keys.map((key) => day(parseBackupKey(key)?.createdAt ?? new Date(0))))].sort();

describe("Schlüssel", () => {
  it("bildet Ordner und Zeitstempel in UTC", () => {
    expect(dumpKey(at("2026-11-18T02:13:05.123Z"))).toBe("postgres/2026/11/18/20261118T021305Z.dump.age");
    expect(manifestKey(at("2026-01-02T00:00:00Z"))).toBe("postgres/2026/01/02/20260102T000000Z.manifest.json");
    expect(manifestKeyFor("postgres/2026/11/18/20261118T021305Z.dump.age")).toBe("postgres/2026/11/18/20261118T021305Z.manifest.json");
    expect(() => manifestKeyFor("postgres/x.manifest.json")).toThrow();
  });

  it("liest Schlüssel zurück und weist widersprüchliche ab", () => {
    expect(parseBackupKey("postgres/2026/11/18/20261118T021305Z.dump.age")).toEqual({
      base: "postgres/2026/11/18/20261118T021305Z",
      kind: "dump",
      createdAt: at("2026-11-18T02:13:05Z"),
    });
    expect(parseBackupKey("postgres/2026/11/17/20261118T021305Z.dump.age")).toBeNull();
    expect(parseBackupKey("postgres/2026/02/30/20260230T000000Z.dump.age")).toBeNull();
    expect(parseBackupKey("postgres/2026/11/18/20261118T021305Z.dump")).toBeNull();
    expect(parseBackupKey("other/file.txt")).toBeNull();
    expect(backupBase(at("2026-11-18T02:13:05Z"))).toBe("postgres/2026/11/18/20261118T021305Z");
  });
});

describe("planRetention", () => {
  it("hält nach zwei Jahren 14 Tage, 8 Sonntage und 12 Monatserste", () => {
    const { keys, now } = simulate("2024-11-01T02:13:00Z", 2 * 366);
    const kept = keptDays(keys);
    const today = Math.floor(now.getTime() / 86_400_000);
    const dates = kept.map((value) => at(`${value}T00:00:00Z`));

    const daily = dates.filter((date) => today - Math.floor(date.getTime() / 86_400_000) < 14);
    expect(daily).toHaveLength(14);
    const older = dates.filter((date) => !daily.includes(date));
    for (const date of older) expect(date.getUTCDay() === 0 || date.getUTCDate() === 1).toBe(true);

    const sundays = dates.filter((date) => date.getUTCDay() === 0 && today - Math.floor(date.getTime() / 86_400_000) < 8 * 7);
    expect(sundays.length).toBeGreaterThanOrEqual(7);
    const firsts = dates.filter((date) => date.getUTCDate() === 1);
    expect(firsts).toHaveLength(12);
    expect(dates[0]?.getTime()).toBeGreaterThan(now.getTime() - 366 * 86_400_000);
    expect(kept.length).toBeLessThanOrEqual(14 + 8 + 12);
    // Jede Sicherung bleibt mit Dump und Manifest.
    expect(keys.length).toBe(kept.length * 2);
  });

  it("nimmt den Samstag, wenn der Sonntag fehlt, und den 2., wenn der 1. fehlt", () => {
    const missing = new Set(["2026-10-04", "2026-09-01"]);
    const { keys } = simulate("2026-08-01T02:13:00Z", 100, (date) => missing.has(day(date)));
    const kept = keptDays(keys);
    expect(kept).toContain("2026-10-03");
    expect(kept).toContain("2026-09-02");
    expect(kept).not.toContain("2026-10-02");
  });

  it("räumt unvollständige Sicherungen ausserhalb der Tagesfrist weg", () => {
    const now = at("2026-11-18T03:00:00Z");
    const old = at("2026-10-01T02:13:00Z");
    const recent = at("2026-11-17T02:13:00Z");
    const plan = planRetention([dumpKey(old), dumpKey(recent), ...both(now)], now);
    expect(plan.remove).toEqual([dumpKey(old)]);
    expect(plan.keep).toContain(dumpKey(recent));
  });

  it("wählt für Woche und Monat nur vollständige Sicherungen", () => {
    const now = at("2026-11-18T03:00:00Z");
    const sunday = at("2026-10-04T02:13:00Z");
    const saturday = at("2026-10-03T02:13:00Z");
    const plan = planRetention([dumpKey(sunday), ...both(saturday), ...both(now)], now);
    expect(plan.keep).toEqual(expect.arrayContaining(both(saturday)));
    expect(plan.remove).toEqual([dumpKey(sunday)]);
  });

  it("behält mehrere Läufe am selben Tag innerhalb der Frist", () => {
    const now = at("2026-11-18T20:00:00Z");
    const keys = [...both(at("2026-11-18T02:13:00Z")), ...both(at("2026-11-18T14:00:00Z"))];
    expect(planRetention(keys, now).remove).toEqual([]);
  });

  it("löscht nie die neueste vollständige Sicherung, auch wenn sie alt ist", () => {
    const now = at("2028-01-01T00:00:00Z");
    const last = at("2026-03-15T02:13:00Z");
    const plan = planRetention([...both(at("2026-03-14T02:13:00Z")), ...both(last)], now);
    expect(plan.keep).toEqual(both(last).sort());
  });

  it("lässt fremde Schlüssel und Sicherungen aus der Zukunft stehen", () => {
    const now = at("2026-11-18T03:00:00Z");
    const future = at("2026-12-01T02:13:00Z");
    const plan = planRetention(["postgres/README.txt", "postgres/2020/01/01/x.dump.age", ...both(future), ...both(now)], now);
    expect(plan.remove).toEqual([]);
    expect(plan.keep).toContain("postgres/README.txt");
  });
});
