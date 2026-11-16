import type { ZodType } from "zod";

/** Eine Queue mit dem Zod-Schema ihrer Payload (PRD 4.2: jede Job-Payload wird validiert). */
export interface JobDefinition<Payload = unknown> {
  queue: string;
  schema: ZodType<Payload>;
}

/**
 * Alle Queues der Plattform. Der Worker registriert genau diese Liste.
 * Die ersten Einträge kommen mit Schritt 1.4 (E-Mail) und 1.6 (Medien).
 */
export const jobDefinitions: readonly JobDefinition[] = [];
