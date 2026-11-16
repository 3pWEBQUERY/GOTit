/** Schmaler Einstieg für Dienste, die nur Redis brauchen (realtime): ohne BullMQ und Zod. */
export { USER_CHANNEL_PREFIX, userChannel } from "./channels";
export { createRedisConnection } from "./connection";
