import { createLogger } from "@app/core/observability";
import { createRedisConnection } from "@app/jobs/redis";
import { createRealtimeServer } from "./server";

const logger = createLogger("realtime");
const port = Number(process.env.PORT ?? process.env.REALTIME_PORT ?? 4001);
// Railway erreicht Dienste über IPv6; Umgebungen ohne IPv6 (zum Beispiel lokale Tests) setzen REALTIME_HOST=127.0.0.1.
const host = process.env.REALTIME_HOST ?? "::";
const subscriber = createRedisConnection();

const server = createRealtimeServer({ secret: process.env.BETTER_AUTH_SECRET, subscriber, logger });
server.listen(port, host, () => logger.info("listening", { port }));

process.on("SIGTERM", () => {
  server.close(() => {
    subscriber.disconnect();
    process.exit(0);
  });
});
