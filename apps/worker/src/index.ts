import { createLogger } from "@app/core/observability";
import { createRedisConnection, jobDefinitions } from "@app/jobs";
import { Worker } from "bullmq";
import { createHandlers } from "./handlers";

const logger = createLogger("worker");
const connection = createRedisConnection();
const handlers = createHandlers();

const workers = jobDefinitions.map((definition) => {
  const handler = handlers[definition.queue];
  if (!handler) throw new Error(`Für die Queue «${definition.queue}» fehlt der Handler.`);
  const worker = new Worker(definition.queue, async (job) => handler(definition.schema.parse(job.data) as never), { connection });
  worker.on("failed", (job, error) => logger.error("job_failed", { queue: definition.queue, jobId: job?.id, error: error.name }));
  return worker;
});

connection.on("ready", () => logger.info("ready", { queues: workers.length }));
connection.on("error", (error) => logger.error("redis_error", { error: error.name }));

process.on("SIGTERM", () => {
  void Promise.all(workers.map((worker) => worker.close())).then(() => {
    connection.disconnect();
    process.exit(0);
  });
});
