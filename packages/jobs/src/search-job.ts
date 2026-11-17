import { z } from "zod";
import type { JobDefinition } from "./definitions";

/** Payload der Queue `search-index`: nur die Profil-ID; der Worker liest den Rest aus der Datenbank (PRD v2 14.4). */
export const searchIndexJobSchema = z.object({
  providerProfileId: z.string().min(1).max(64),
});
export type SearchIndexJob = z.infer<typeof searchIndexJobSchema>;
export const searchIndexJob: JobDefinition<SearchIndexJob> = {
  queue: "search-index",
  schema: searchIndexJobSchema,
};
