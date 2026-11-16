import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "@playwright/test";

/** Fiktive Testkonten aus `packages/db/seed/fixtures/test-accounts.ts`. */
export type TestAccount = "mitglied" | "anbieter" | "entwurf" | "club";

type Cookies = Parameters<ReturnType<Page["context"]>["addCookies"]>[0];

/** Übernimmt die Sitzung, die `global-setup.ts` für das Konto angelegt hat. */
export async function signIn(page: Page, account: TestAccount): Promise<void> {
  const state = JSON.parse(readFileSync(join(import.meta.dirname, "..", ".auth", `${account}.json`), "utf8")) as { cookies: Cookies };
  await page.context().clearCookies({ name: /session/ });
  await page.context().addCookies(state.cookies);
}

/** Bestätigt die Altersprüfung als Besucher und landet auf dem ursprünglichen Ziel. */
export async function confirmAge(page: Page, path = "/de"): Promise<void> {
  await page.goto(path);
  await page.getByRole("button", { name: "Alter bestätigen" }).click();
  await page.waitForURL((url) => !url.pathname.includes("alterspruefung"));
}
