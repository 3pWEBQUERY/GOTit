import { getDb } from "@app/db";
import { z } from "zod";
import { REPORT_REASONS } from "../messaging/schemas";
import { fileReport } from "./intake";

/**
 * Meldung ohne Konto über `/melden` (v2 7.8, 13). Die Adresse wird einem
 * Profil oder einer Organisation zugeordnet, wenn sie dazu passt; sonst
 * bleibt sie als Pfad am Fall. Die Kontaktadresse ist freiwillig. Ohne Konto
 * sperrt eine Meldung nichts automatisch (Entscheid 0020); die Grenze pro
 * Adresse setzt der Aufrufer (`publicReport`).
 */
export const anonymousReportSchema = z.object({
  url: z.string().trim().min(1).max(500),
  reason: z.enum(REPORT_REASONS),
  details: z
    .string()
    .max(2000)
    .transform((value) => value.trim())
    .default(""),
  contactEmail: z
    .union([z.literal(""), z.string().trim().max(254).pipe(z.email())])
    .default("")
    .transform((value) => value || null),
});

export type AnonymousReportResult = { ok: true; reportId: string } | { ok: false; reason: "invalid" | "foreign-url" };

/** Pfad aus einer Adresse dieser Plattform; null für fremde Hosts. */
export function platformPath(raw: string, allowedHosts: readonly string[]): string | null {
  let url: URL;
  try {
    url = new URL(raw, "https://platform.invalid");
  } catch {
    return null;
  }
  if (url.host !== "platform.invalid" && !allowedHosts.includes(url.host)) return null;
  const path = url.pathname.replace(/\/+$/, "") || "/";
  return path.length <= 300 ? path : null;
}

const PROFILE_PATH = /^\/(?:de|fr|it|en)\/p\/([a-z0-9-]{1,80})(?:\/|$)/;
const ORGANIZATION_PATH = /^\/(?:de|fr|it|en)\/c\/([a-z0-9-]{1,80})(?:\/|$)/;

export async function fileAnonymousReport(input: unknown, allowedHosts: readonly string[]): Promise<AnonymousReportResult> {
  const parsed = anonymousReportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  const path = platformPath(parsed.data.url, allowedHosts);
  if (!path) return { ok: false, reason: "foreign-url" };
  const db = getDb();
  let targetType: "PROFILE" | "ORGANIZATION" | "URL" = "URL";
  let targetId = path;
  const profileSlug = PROFILE_PATH.exec(path)?.[1];
  const organizationSlug = ORGANIZATION_PATH.exec(path)?.[1];
  if (profileSlug) {
    const profile = await db.providerProfile.findUnique({ where: { slug: profileSlug }, select: { id: true } });
    if (profile) [targetType, targetId] = ["PROFILE", profile.id];
  } else if (organizationSlug) {
    const organization = await db.organization.findUnique({ where: { slug: organizationSlug }, select: { id: true } });
    if (organization) [targetType, targetId] = ["ORGANIZATION", organization.id];
  }
  const report = await fileReport({
    reporterId: null,
    targetType,
    targetId,
    reason: parsed.data.reason,
    details: parsed.data.details || null,
    targetUrl: path,
    contactEmail: parsed.data.contactEmail,
  });
  return { ok: true, reportId: report.reportId };
}
