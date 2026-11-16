/**
 * Die geteilten Schemas für Client-Komponenten aus dem browsertauglichen
 * Einstieg von core (nur Zod, kein Servercode). Die Regeln sind dieselben wie
 * auf dem Server.
 */
export { PASSWORD_MIN_LENGTH, passwordResetRequestSchema, passwordResetSchema, registrationSchema } from "@app/core/account/schemas";
export type { AccountTypeInput, OrganizationKindInput } from "@app/core/account/schemas";
