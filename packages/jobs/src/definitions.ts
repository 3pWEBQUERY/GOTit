import type { ZodType } from "zod";

/** Eine Queue mit dem Zod-Schema ihrer Payload (PRD 4.2: jede Job-Payload wird validiert). */
export interface JobDefinition<Payload = unknown> {
  queue: string;
  schema: ZodType<Payload>;
}
