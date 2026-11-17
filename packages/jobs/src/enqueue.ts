import { Queue } from "bullmq";
import type { JobDefinition } from "./definitions";
import { createRedisConnection } from "./connection";

const queues = new Map<string, Queue>();

function queueFor(name: string): Queue {
  let queue = queues.get(name);
  if (!queue) {
    queue = new Queue(name, { connection: createRedisConnection() });
    queues.set(name, queue);
  }
  return queue;
}

/** Legt einen Job an. Die Payload wird vorher gegen das Schema der Queue geprüft. */
export async function enqueue<Payload>(
  definition: JobDefinition<Payload>,
  payload: Payload,
): Promise<void> {
  const data = definition.schema.parse(payload);
  await queueFor(definition.queue).add(definition.queue, data, {
    attempts: 5,
    backoff: { type: "exponential", delay: 10_000 },
    removeOnComplete: { age: 24 * 3600 },
    removeOnFail: { age: 7 * 24 * 3600 },
  });
}
