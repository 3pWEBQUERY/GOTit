import { z } from "zod";

/** Eingaben der Organisationen (v1 5.10, v2 12.2). Browsertauglich. */
const optionalText = (max: number) =>
  z
    .string()
    .max(max, "too-long")
    .transform((value) => value.trim() || null);

const url = z
  .string()
  .trim()
  .max(200, "too-long")
  .refine(
    (value) => value === "" || /^https:\/\/[^\s/]+\.[^\s]+$/.test(value),
    "url",
  )
  .transform((value) => value || null);

const phone = z
  .string()
  .trim()
  .max(30, "too-long")
  .refine(
    (value) => value === "" || /^\+?[0-9 ()-]{6,30}$/.test(value),
    "phone",
  )
  .transform((value) => value || null);

export const organizationProfileSchema = z.object({
  name: z.string().trim().min(2, "required").max(80, "too-long"),
  description: optionalText(3000),
  website: url,
  phone,
  publicEmail: z
    .string()
    .trim()
    .max(120, "too-long")
    .refine(
      (value) => value === "" || z.email().safeParse(value).success,
      "email",
    )
    .transform((value) => value || null),
});

export const UID_PATTERN = /^CHE-\d{3}\.\d{3}\.\d{3}$/;

export const verificationSchema = z.object({
  legalName: z.string().trim().min(2, "required").max(120, "too-long"),
  uid: z
    .string()
    .trim()
    .toUpperCase()
    .refine((value) => UID_PATTERN.test(value), "uid"),
  authorityConfirmed: z.literal(true, { message: "authority" }),
  permitNote: optionalText(1000),
});

export const locationSchema = z.object({
  name: z.string().trim().min(2, "required").max(80, "too-long"),
  description: optionalText(1000),
  regionId: z.string().min(1).max(64).nullable(),
  areaLabel: optionalText(60),
  phone,
  website: url,
});

const minute = z
  .number()
  .int()
  .min(0)
  .max(24 * 60);
export const openingHoursSchema = z
  .array(
    z
      .object({
        weekday: z.number().int().min(0).max(6),
        startMinute: minute,
        endMinute: minute,
      })
      .refine(
        (value) => value.endMinute > value.startMinute,
        "end-before-start",
      ),
  )
  .max(28);

export const openingExceptionSchema = z
  .object({
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "day"),
    closed: z.boolean(),
    startMinute: minute.nullable(),
    endMinute: minute.nullable(),
    note: optionalText(200),
  })
  .refine(
    (value) =>
      value.closed ||
      (value.startMinute !== null &&
        value.endMinute !== null &&
        value.endMinute > value.startMinute),
    { message: "times", path: ["endMinute"] },
  );

export const inviteSchema = z.object({
  providerSlug: z.string().regex(/^[a-z0-9-]{1,80}$/, "slug"),
  locationId: z.string().min(1).max(64).nullable(),
  message: optionalText(500),
});
