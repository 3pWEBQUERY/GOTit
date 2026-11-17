import { describe, expect, it } from "vitest";
import { createResendSender } from "./resend";

const mail = { to: "person@fiktiv.test", subject: "Betreff", text: "Text" };

describe("Versand über Resend", () => {
  it("sendet an die API mit Schlüssel, Absender und Idempotenzschlüssel", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const send = createResendSender(
      "re_test",
      "Plattform <hallo@fiktiv.test>",
      async (url, init) => {
        calls.push({ url, init });
        return new Response("{}", { status: 200 });
      },
    );
    await send(mail, "job-1");
    expect(calls[0]?.url).toBe("https://api.resend.com/emails");
    const headers = calls[0]?.init.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer re_test");
    expect(headers["idempotency-key"]).toBe("job-1");
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({
      from: "Plattform <hallo@fiktiv.test>",
      to: ["person@fiktiv.test"],
      subject: "Betreff",
      text: "Text",
    });
  });

  it("wirft bei einer Fehlerantwort, damit der Job wiederholt wird", async () => {
    const send = createResendSender(
      "re_test",
      "a@fiktiv.test",
      async () => new Response("{}", { status: 422 }),
    );
    await expect(send(mail)).rejects.toThrow("422");
  });
});
