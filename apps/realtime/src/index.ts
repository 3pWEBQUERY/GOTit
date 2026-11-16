import { createLogger } from "@app/core/observability";
import { createRedisConnection } from "@app/jobs";
import { createRealtimeServer } from "./server";

const logger = createLogger("realtime");
const port = Number(process.env.PORT ?? process.env.REALTIME_PORT ?? 4001);
const subscriber = createRedisConnection();

const server = createRealtimeServer({ secret: process.env.BETTER_AUTH_SECRET, subscriber, logger });
server.listen(port, "::", () => logger.info("listening", { port }));

process.on("SIGTERM", () => {
  server.close(() => {
    subscriber.disconnect();
    process.exit(0);
  });
});
