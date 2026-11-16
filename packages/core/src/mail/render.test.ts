import { describe, expect, it } from "vitest";
import { LOCALES } from "../locale";
import { renderMail } from "./render";
import { MAIL_TEMPLATES } from "./types";

describe("E-Mail-Vorlagen", () => {
  it.each(LOCALES.flatMap((locale) => MAIL_TEMPLATES.map((template) => [locale, template] as const)))(
    "%s/%s enthält den Link und einen neutralen Betreff ohne Ausrufezeichen",
    (locale, template) => {
      const mail = renderMail({ to: "person@fiktiv.test", template, locale, url: "https://example.test/link?token=abc" });
      expect(mail.text).toContain("https://example.test/link?token=abc");
      expect(mail.subject.length).toBeGreaterThan(5);
      expect(mail.subject).not.toContain("person");
      expect(`${mail.subject}${mail.text}`).not.toContain("!");
    },
  );
});
