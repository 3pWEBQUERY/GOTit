import { z } from "zod";
import { LOCALES } from "../locale";

/**
 * Supportanfragen über `/kontakt` (v2 7.8 `/admin/support`). `appeal` ist der
 * Einspruch gegen eine Sperre für Konten, die sich nicht mehr anmelden können.
 */
export const SUPPORT_CATEGORIES = ["account", "verification", "payment", "report", "appeal", "privacy", "other"] as const;
export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export const supportTicketSchema = z.object({
  userId: z.string().min(1).max(64).nullable().default(null),
  email: z.string().trim().max(254).optional(),
  category: z.enum(SUPPORT_CATEGORIES),
  subject: z.string().trim().min(3).max(150),
  body: z.string().trim().min(20).max(5000),
  locale: z.enum(LOCALES).default("de"),
});
export type SupportTicketInput = z.input<typeof supportTicketSchema>;

export const supportReplySchema = z.object({
  body: z.string().trim().min(1).max(5000),
  internal: z.boolean().default(false),
});
export type SupportReplyInput = z.input<typeof supportReplySchema>;

export const supportStatusSchema = z.enum(["OPEN", "ANSWERED", "CLOSED"]);
