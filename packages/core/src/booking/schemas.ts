import { z } from "zod";
import { isValidTimeZone } from "./time-zone";

/** Eingaben des Kalenders und der Anfragen (PRD v1 5.8, v2 10.2, 11.5). Browsertauglich. */
export const DURATIONS = [30, 60, 90, 120, 180, 240, 360, 480, 720] as const;
export const MESSAGE_MAX = 1000;
export const NOTE_MAX = 1000;
export const REASON_MAX = 500;
export const MAX_WINDOWS = 42;
/** Wie weit im Voraus angefragt werden kann. */
export const MAX_DAYS_AHEAD = 90;

const minute = z
  .number()
  .int()
  .min(0)
  .max(24 * 60);

export const windowSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    startMinute: minute,
    endMinute: minute,
  })
  .refine((value) => value.endMinute > value.startMinute, {
    message: "end-before-start",
    path: ["endMinute"],
  });

export const windowsSchema = z
  .array(windowSchema)
  .max(MAX_WINDOWS)
  .refine(
    (windows) =>
      windows.every((window, index) =>
        windows.every(
          (other, otherIndex) =>
            otherIndex === index ||
            other.weekday !== window.weekday ||
            other.endMinute <= window.startMinute ||
            other.startMinute >= window.endMinute,
        ),
      ),
    { message: "overlap" },
  );

export const settingsSchema = z.object({
  timeZone: z.string().refine(isValidTimeZone, "time-zone"),
  bufferMinutes: z.number().int().min(0).max(240),
  exclusiveBooking: z.boolean(),
  requestTtlHours: z.number().int().min(2).max(168),
  minNoticeHours: z.number().int().min(0).max(72),
});
export type CalendarSettingsInput = z.infer<typeof settingsSchema>;

export const blockSchema = z
  .object({
    kind: z.enum(["ABSENCE", "BLOCKER"]),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    note: z
      .string()
      .max(NOTE_MAX)
      .transform((value) => value.trim())
      .default(""),
  })
  .refine((value) => value.endsAt > value.startsAt, {
    message: "end-before-start",
    path: ["endsAt"],
  });

export const requestSchema = z.object({
  startsAt: z.coerce.date(),
  durationMinutes: z
    .number()
    .int()
    .refine(
      (value) => (DURATIONS as readonly number[]).includes(value),
      "duration",
    ),
  regionId: z.string().min(1).max(64).nullable().default(null),
  message: z
    .string()
    .max(MESSAGE_MAX, "too-long")
    .transform((value) => value.trim())
    .default(""),
});
export type BookingRequestInput = z.input<typeof requestSchema>;

export const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("accept") }),
  z.object({
    action: z.literal("counter"),
    startsAt: z.coerce.date(),
    durationMinutes: z
      .number()
      .int()
      .refine(
        (value) => (DURATIONS as readonly number[]).includes(value),
        "duration",
      ),
  }),
  z.object({
    action: z.literal("decline"),
    reason: z.string().max(REASON_MAX).default(""),
  }),
  z.object({
    action: z.literal("cancel"),
    reason: z.string().max(REASON_MAX).default(""),
  }),
  z.object({
    action: z.literal("cancel-safety"),
    reason: z.string().max(REASON_MAX).default(""),
  }),
  z.object({ action: z.literal("complete") }),
  z.object({
    action: z.literal("dispute"),
    reason: z.string().max(REASON_MAX).default(""),
  }),
]);
export type BookingActionInput = z.input<typeof actionSchema>;
