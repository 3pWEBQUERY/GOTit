/**
 * Die geteilten Schemas aus `@app/core/account` für Client-Komponenten.
 * Der Einstieg `@app/core/account` exportiert auch Servercode (Prisma,
 * node:crypto) und lässt sich deshalb nicht im Browser bündeln. Bis das Paket
 * einen eigenen Einstieg für die Schemas hat, kommt diese Datei direkt aus
 * dem Quelltext; die Regeln bleiben dieselben wie auf dem Server.
 */
export { PASSWORD_MIN_LENGTH, passwordResetRequestSchema, passwordResetSchema, registrationSchema } from "../../../../../packages/core/src/account/schemas";
export type { AccountTypeInput } from "../../../../../packages/core/src/account/schemas";
