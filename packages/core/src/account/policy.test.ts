import { describe, expect, it } from "vitest";
import { deviceLabel } from "./device-label";
import { deletionDueDate, draftSlug, isLockedNotification, resolveNotifications } from "./policy";
import { changePasswordSchema, profileSchema, registrationSchema } from "./schemas";

const valid = {
  accountType: "MEMBER",
  name: "Testperson",
  email: "Person@Fiktiv.test",
  password: "ein-langes-passwort",
  ageConfirmed: true,
  termsAccepted: true,
} as const;

describe("Registrierung", () => {
  it("normalisiert die E-Mail-Adresse", () => {
    expect(registrationSchema.parse(valid).email).toBe("person@fiktiv.test");
  });
  it("verlangt Volljährigkeit und Zustimmung zu den Bedingungen", () => {
    const result = registrationSchema.safeParse({ ...valid, ageConfirmed: false, termsAccepted: false });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message).sort()).toEqual(["ageRequired", "termsRequired"]);
  });
  it("verlangt mindestens 12 Zeichen Passwort", () => {
    expect(registrationSchema.safeParse({ ...valid, password: "kurz" }).error?.issues[0]?.message).toBe("passwordTooShort");
  });
  it("verlangt für Clubs und Agenturen einen Namen der Organisation", () => {
    const result = registrationSchema.safeParse({ ...valid, accountType: "ORGANIZATION" });
    expect(result.error?.issues[0]).toMatchObject({ path: ["organizationName"], message: "organizationNameRequired" });
    expect(registrationSchema.safeParse({ ...valid, accountType: "ORGANIZATION", organizationName: "Testclub" }).success).toBe(true);
  });
  it("kennt nur die drei Kontotypen", () => {
    expect(registrationSchema.safeParse({ ...valid, accountType: "ADMIN" }).success).toBe(false);
  });
});

describe("Profil und Passwort", () => {
  it("akzeptiert leere und gültige Benutzernamen, lehnt ungültige ab", () => {
    expect(profileSchema.parse({ name: "Testperson", username: "" }).username).toBeNull();
    expect(profileSchema.parse({ name: "Testperson", username: "Test.Name_1" }).username).toBe("test.name_1");
    expect(profileSchema.safeParse({ name: "Testperson", username: "-falsch" }).success).toBe(false);
    expect(profileSchema.safeParse({ name: "Testperson", username: "a" }).success).toBe(false);
  });
  it("verlangt die Wiederholung des neuen Passworts", () => {
    const result = changePasswordSchema.safeParse({ currentPassword: "x", newPassword: "ein-langes-passwort", newPasswordRepeat: "anders", revokeOtherSessions: true });
    expect(result.error?.issues[0]).toMatchObject({ path: ["newPasswordRepeat"], message: "passwordMismatch" });
  });
});

describe("Einstellungen und Fristen", () => {
  it("ergänzt gespeicherte Benachrichtigungen um die Voreinstellungen", () => {
    const settings = resolveNotifications({ message: { email: false } });
    expect(settings.message).toEqual({ email: false, push: false });
    expect(settings.security.email).toBe(true);
    expect(resolveNotifications(null).bookingRequest.email).toBe(true);
  });
  it("hält Sicherheitshinweise per E-Mail immer an", () => {
    expect(isLockedNotification("security", "email")).toBe(true);
    expect(isLockedNotification("message", "email")).toBe(false);
  });
  it("löscht 30 Tage nach dem Antrag", () => {
    expect(deletionDueDate(new Date("2026-11-16T10:00:00Z")).toISOString()).toBe("2026-12-16T10:00:00.000Z");
  });
  it("bildet lesbare Slugs mit Zufallsteil", () => {
    expect(draftSlug("Zoë Müller", "a1b2")).toBe("zoe-muller-a1b2");
    expect(draftSlug("!!!", "a1b2")).toBe("profil-a1b2");
  });
  it("kürzt den User-Agent auf Browser und System", () => {
    expect(deviceLabel("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) Gecko/20100101 Firefox/131.0")).toBe("Firefox · macOS");
    expect(deviceLabel("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1")).toBe("Safari · iOS");
    expect(deviceLabel(null)).toBeNull();
  });
});
