import { getStorage } from "@app/storage";
import { createDeleteMediaJob } from "./jobs/delete-media";
import { createIndexSearchJob } from "./jobs/index-search";
import { createProcessChatAttachmentJob } from "./jobs/process-chat-attachment";
import { createProcessMediaJob } from "./jobs/process-media";
import { createSendEmailJob } from "./jobs/send-email";
import { createMailSender } from "./mail/transport";

/**
 * Ein Handler pro Queue, jeder in einer eigenen Datei unter `jobs/`.
 * Die Payload ist beim Aufruf bereits mit dem Schema der Queue geprüft.
 */
export type JobHandler = (payload: never) => Promise<void>;

export function createHandlers(): Readonly<Record<string, JobHandler>> {
  return {
    email: createSendEmailJob(createMailSender()),
    "media-process": createProcessMediaJob(getStorage),
    "media-delete": createDeleteMediaJob(getStorage),
    "search-index": createIndexSearchJob(),
    "chat-attachment": createProcessChatAttachmentJob(getStorage),
  };
}
