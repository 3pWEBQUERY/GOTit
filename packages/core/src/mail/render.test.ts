import { describe, expect, it } from "vitest";
import { LOCALES } from "../locale";
import { renderMail } from "./render";
import { MAIL_TEMPLATES } from "./types";

describe("E-Mail-Vorlagen", () => {
  it.each(
    LOCALES.flatMap((locale) =>
      MAIL_TEMPLATES.map((template) => [locale, template] as const),
    ),
  )(
    "%s/%s enthält den Link und einen neutralen Betreff ohne Ausrufezeichen",
    (locale, template) => {
      const mail = renderMail({
        to: "person@fiktiv.test",
        template,
        locale,
        url: "https://example.test/link?token=abc",
      });
      expect(mail.text).toContain("https://example.test/link?token=abc");
      expect(mail.subject.length).toBeGreaterThan(5);
      expect(mail.subject).not.toContain("person");
      expect(`${mail.subject}${mail.text}`).not.toContain("!");
    },
  );
});

describe("Vorlagen und Job-Schema", () => {
  it("jede Vorlage ist im Schema der Queue erlaubt und in allen Sprachen vorhanden", async () => {
    const { emailJobSchema } = await import("@app/jobs");
    const { MAIL_TEMPLATES } = await import("./types");
    for (const template of MAIL_TEMPLATES) {
      expect(emailJobSchema.safeParse({ to: "a@fiktiv.test", template, locale: "de", url: "https://thegnd.net/de" }).success).toBe(true);
      for (const locale of ["de", "fr", "it", "en"] as const) {
        const mail = renderMail({ to: "a@fiktiv.test", template, locale, url: "https://thegnd.net/de" });
        expect(mail.subject.length).toBeGreaterThan(0);
        expect(mail.text).toContain("https://thegnd.net/de");
      }
    }
  });
});
