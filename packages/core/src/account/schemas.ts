import { z } from "zod";

/** Ein Schema pro Vorgang, geteilt zwischen Formular und Server (PRD 4.2). Fehlertexte sind Schlüssel. */
export const ACCOUNT_TYPES = ["MEMBER", "PROVIDER", "ORGANIZATION"] as const;
export type AccountTypeInput = (typeof ACCOUNT_TYPES)[number];
/** Art der Organisation bei Kontotyp ORGANIZATION (PRD 3: Club oder Agentur). */
export const ORGANIZATION_KINDS = ["CLUB", "AGENCY"] as const;
export type OrganizationKindInput = (typeof ORGANIZATION_KINDS)[number];

export const PASSWORD_MIN_LENGTH = 12;
export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,28}[a-z0-9])$/;

const password = z.string().min(PASSWORD_MIN_LENGTH, "passwordTooShort").max(128, "passwordTooLong");
const email = z.email("emailInvalid").max(254).transform((value) => value.trim().toLowerCase());

export const registrationSchema = z
  .object({
    accountType: z.enum(ACCOUNT_TYPES, "accountTypeRequired"),
    name: z.string().trim().min(2, "nameTooShort").max(80, "nameTooLong"),
    organizationName: z.string().trim().max(120, "organizationNameTooLong").optional(),
    organizationKind: z.enum(ORGANIZATION_KINDS).optional(),
    email,
    password,
    ageConfirmed: z.literal(true, "ageRequired"),
    termsAccepted: z.literal(true, "termsRequired"),
  })
  .refine((input) => input.accountType !== "ORGANIZATION" || (input.organizationName?.length ?? 0) >= 2, {
    path: ["organizationName"],
    message: "organizationNameRequired",
    // Auch prüfen, wenn andere Felder noch Fehler haben: Alle Fehler erscheinen auf einmal (PRD 13).
    when: (payload) => {
      const value = payload.value as { accountType?: unknown; organizationName?: unknown };
      return value.accountType === "ORGANIZATION" && (typeof value.organizationName === "string" || value.organizationName === undefined);
    },
  });
export type RegistrationInput = z.input<typeof registrationSchema>;

export const passwordResetRequestSchema = z.object({ email });
export const passwordResetSchema = z
  .object({ token: z.string().min(10), password, passwordRepeat: z.string() })
  .refine((input) => input.password === input.passwordRepeat, { path: ["passwordRepeat"], message: "passwordMismatch" });

export const profileSchema = z.object({
  name: z.string().trim().min(2, "nameTooShort").max(80, "nameTooLong"),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .refine((value) => value === "" || USERNAME_PATTERN.test(value), "usernameInvalid")
    .transform((value) => (value === "" ? null : value)),
});

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1, "passwordRequired"), newPassword: password, newPasswordRepeat: z.string(), revokeOtherSessions: z.boolean() })
  .refine((input) => input.newPassword === input.newPasswordRepeat, { path: ["newPasswordRepeat"], message: "passwordMismatch" });

export const NOTIFICATION_EVENTS = ["message", "bookingRequest", "bookingStatus", "review", "verification", "security"] as const;
export const NOTIFICATION_CHANNELS = ["email", "push"] as const;
export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const preferenceSchema = z
  .object({
    theme: z.enum(["system", "light", "dark"]),
    reducedMotion: z.boolean(),
    neutralTabTitle: z.boolean(),
    showOnlineStatus: z.boolean(),
    readReceipts: z.boolean(),
    profileVisibility: z.enum(["MEMBERS", "NOBODY"]),
    locale: z.enum(["de", "fr", "it", "en"]),
    notification: z.object({ event: z.enum(NOTIFICATION_EVENTS), channel: z.enum(NOTIFICATION_CHANNELS), enabled: z.boolean() }),
  })
  .partial();
export type PreferenceInput = z.input<typeof preferenceSchema>;
