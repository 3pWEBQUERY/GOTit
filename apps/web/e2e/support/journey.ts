import type { Browser, Locator, Page } from "@playwright/test";
import { query, signInAdmin, type InternalRole } from "../admin-fixtures";
import { testClientIp } from "./test";

/**
 * Hilfen für die Journeys A bis D (PRD v1 17, v2 Schritt 1.14). Jede Journey
 * läuft durch die echte Oberfläche; diese Hilfen zählen Bedienschritte und
 * öffnen die Seiten der Gegenseite (Admin, Anbieter) in eigenen Kontexten.
 */

/**
 * Zählt die Bedienschritte einer Person: jeden Klick, jede Auswahl in einer
 * Liste, jedes Enter. Tippen in ein Feld zählt nicht als eigener Schritt,
 * wohl aber das Absenden. So lässt sich «ohne unnötige Schritte» als Zahl prüfen.
 */
export class StepCounter {
  readonly steps: string[] = [];

  /** Klickt und zählt den Schritt mit seiner Beschreibung. */
  async click(locator: Locator, label: string): Promise<void> {
    await locator.click();
    this.steps.push(label);
  }

  /** Drückt eine Taste und zählt den Schritt. */
  async press(locator: Locator, key: string, label: string): Promise<void> {
    await locator.press(key);
    this.steps.push(label);
  }

  get count(): number {
    return this.steps.length;
  }

  /** Lesbare Liste für Fehlermeldungen: «1. Alter bestätigen, 2. …». */
  toString(): string {
    return this.steps.map((step, index) => `${index + 1}. ${step}`).join(", ");
  }
}

/** Admin mit Rolle und eingerichteter 2FA in einem eigenen Kontext (eigene Client-Adresse). */
export async function adminPage(browser: Browser, baseURL: string | undefined, role: InternalRole, created: string[]): Promise<Page> {
  const context = await browser.newContext({ baseURL, extraHTTPHeaders: { "x-real-ip": testClientIp() } });
  const page = await context.newPage();
  const admin = await signInAdmin(page, baseURL, role, "Journey-Admin Fiktiv");
  created.push(admin.id);
  return page;
}

/** ID des Kontos zu einer Adresse, für das Aufräumen von Konten aus der echten Registrierung. */
export async function userIdByEmail(email: string): Promise<string> {
  const [row] = await query<{ id: string }>(`select id from "user" where email = $1`, [email]);
  if (!row) throw new Error(`Kein Konto zu ${email}`);
  return row.id;
}
