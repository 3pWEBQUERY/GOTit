import { passwordResetRequestSchema } from "./account-schemas";
import { z } from "zod";

/**
 * Formulare, die Better Auth direkt bedient und für die `@app/core/account`
 * kein Schema hat. Die E-Mail-Regel stammt aus dem geteilten Schema.
 */
export const signInSchema = passwordResetRequestSchema.extend({ password: z.string().min(1, "passwordRequired") });

export const totpCodeSchema = z.object({ code: z.string().trim().regex(/^\d{6}$/, "codeInvalid"), trustDevice: z.boolean() });

export const backupCodeSchema = z.object({ code: z.string().trim().min(1, "codeRequired"), trustDevice: z.boolean() });
