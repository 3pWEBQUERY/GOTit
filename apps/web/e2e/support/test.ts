import { randomInt } from "node:crypto";
import { test as base, type Browser } from "@playwright/test";
import { settleContext } from "./settle";

/**
 * Jeder Test erhält eine eigene Client-Adresse (`x-real-ip`, wie sie Railway am
 * Rand setzt). So greifen die echten Rate Limits, ohne dass sich parallele
 * Tests gegenseitig sperren.
 */
export function testClientIp(): string {
  return `10.${randomInt(1, 255)}.${randomInt(0, 255)}.${randomInt(1, 255)}`;
}

export const test = base.extend<object, { browser: Browser }>({
  extraHTTPHeaders: async ({ extraHTTPHeaders }, use) => {
    await use({ ...extraHTTPHeaders, "x-real-ip": testClientIp() });
  },
  context: async ({ context }, use) => {
    settleContext(context);
    await use(context);
  },
  // Auch Kontexte, die ein Test selbst öffnet, warten nach Navigationen auf das Einblenden (siehe settle.ts).
  browser: [
    async ({ browser }, use) => {
      const newContext = browser.newContext.bind(browser);
      browser.newContext = async (...args) => {
        const context = await newContext(...args);
        settleContext(context);
        return context;
      };
      await use(browser);
    },
    { scope: "worker" },
  ],
});

export { expect } from "@playwright/test";
