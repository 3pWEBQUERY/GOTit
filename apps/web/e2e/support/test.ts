import { randomInt } from "node:crypto";
import { test as base } from "@playwright/test";

/**
 * Jeder Test erhält eine eigene Client-Adresse (`x-real-ip`, wie sie Railway am
 * Rand setzt). So greifen die echten Rate Limits, ohne dass sich parallele
 * Tests gegenseitig sperren.
 */
export function testClientIp(): string {
  return `10.${randomInt(1, 255)}.${randomInt(0, 255)}.${randomInt(1, 255)}`;
}

export const test = base.extend({
  extraHTTPHeaders: async ({ extraHTTPHeaders }, use) => {
    await use({ ...extraHTTPHeaders, "x-real-ip": testClientIp() });
  },
});

export { expect } from "@playwright/test";
