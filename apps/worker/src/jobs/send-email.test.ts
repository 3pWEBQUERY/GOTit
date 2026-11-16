import { describe, expect, it, vi } from "vitest";
import { createMailSender } from "../mail/transport";
import { createSendEmailJob } from "./send-email";

describe("Job E-Mail", () => {
  it("rendert die Vorlage in der angefragten Sprache und übergibt sie dem Versand", async () => {
    const send = vi.fn(async () => undefined);
    await createSendEmailJob(send)({ to: "person@fiktiv.test", template: "reset-password", locale: "it", url: "https://app.test/x" });
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: "person@fiktiv.test", subject: "Imposta una nuova password" }));
  });

  it("schlägt ohne eingerichteten Versand fehl, statt still zu verwerfen", async () => {
    await expect(createMailSender({})({ to: "a@b.test", subject: "x", text: "y" })).rejects.toThrow("nicht eingerichtet");
  });
});
