import { createLogger } from "@app/core/observability";
import { tasks } from "./tasks";

const logger = createLogger("cron");
const name = process.argv[2] ?? "";
const task = tasks[name];

if (!task) {
  logger.error("unknown_task", {
    task: name,
    known: Object.keys(tasks).join(","),
  });
  process.exit(1);
}

try {
  await task();
  logger.info("task_done", { task: name });
  process.exit(0);
} catch (error) {
  logger.error("task_failed", {
    task: name,
    error: error instanceof Error ? error.name : "unknown",
  });
  process.exit(1);
}
