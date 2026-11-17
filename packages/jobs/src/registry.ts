import type { JobDefinition } from "./definitions";
import { emailJob } from "./email-job";
import { mediaDeleteJob, mediaProcessJob } from "./media-job";

/** Alle Queues der Plattform. Der Worker registriert genau diese Liste. */
export const jobDefinitions: readonly JobDefinition[] = [emailJob as JobDefinition, mediaProcessJob as JobDefinition, mediaDeleteJob as JobDefinition];
