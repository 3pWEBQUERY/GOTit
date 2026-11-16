import { z } from "zod";

export const confirmAgeSchema = z.object({
  locale: z.enum(["de", "fr", "it", "en"]),
  weiter: z.string().max(2000).optional(),
});
