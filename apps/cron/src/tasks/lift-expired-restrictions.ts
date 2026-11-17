import { expireRestrictions } from "@app/core/moderation";
import { createLogger } from "@app/core/observability";

const logger = createLogger("cron");

/**
 * Stündlich (v1 9.2 «Zeitlich befristete Sperren»): Abgelaufene
 * Einschränkungen gelten schon ab ihrem Ende nicht mehr; dieser Lauf hebt
 * sie auch formal auf und gibt gesperrte Profile wieder frei.
 */
export async function liftExpiredRestrictions(): Promise<void> {
  const lifted = await expireRestrictions();
  logger.info("lift_expired_restrictions", { lifted });
}
