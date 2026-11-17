import type { BrowserContext, Page } from "@playwright/test";

/**
 * React 19 blendet gestreamte Suspense-Inhalte gebündelt und leicht verzögert
 * ein. Bis dahin liegt der fertige Inhalt zusätzlich in einem versteckten
 * `<div hidden id="S:…">`. Für Nutzer unsichtbar; Playwright zählt ihn aber in
 * `getByText` mit und meldet zwei Treffer. Nach jeder Navigation warten die
 * Tests deshalb, bis kein solcher Block mehr übrig ist.
 */
export async function settle(page: Page): Promise<void> {
  await page.waitForFunction(() => !document.querySelector('div[hidden][id^="S:"]'), undefined, { timeout: 10_000 }).catch(() => undefined);
}

const patched = new WeakSet<Page>();

export function settleNavigations(page: Page): void {
  if (patched.has(page)) return;
  patched.add(page);
  const goto = page.goto.bind(page);
  const reload = page.reload.bind(page);
  const goBack = page.goBack.bind(page);
  page.goto = async (...args) => {
    const response = await goto(...args);
    await settle(page);
    return response;
  };
  page.reload = async (...args) => {
    const response = await reload(...args);
    await settle(page);
    return response;
  };
  page.goBack = async (...args) => {
    const response = await goBack(...args);
    await settle(page);
    return response;
  };
}

export function settleContext(context: BrowserContext): void {
  context.pages().forEach(settleNavigations);
  context.on("page", settleNavigations);
}
