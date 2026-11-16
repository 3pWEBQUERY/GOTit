/**
 * Ein Handler pro Queue, jeder in einer eigenen Datei unter `jobs/`.
 * Die Payload ist beim Aufruf bereits mit dem Schema der Queue geprüft.
 */
export type JobHandler = (payload: unknown) => Promise<void>;

export const handlers: Readonly<Record<string, JobHandler>> = {};
