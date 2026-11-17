import {
  cleanup,
  createAccount,
  enableTwoFactor,
  query,
  signInAdmin,
  signInAs,
} from "./admin-fixtures";
import { choose } from "./booking-fixtures";
import { createMember, createProvider } from "./messages-fixtures";
import {
  appealRows,
  createAppealRow,
  createAppointment,
  createReviewRow,
  reviewRow,
} from "./reviews-fixtures";
import {
  expectNoHorizontalScroll,
  expectNoSeriousAxeFindings,
} from "./support/checks";
import { expect, test } from "./support/test";

/**
 * `/admin/bewertungen` (v2 12.4, Entscheid 0017): Warteschlange mit neuen
 * Bewertungen und Einsprüchen, älteste zuerst, «Nächsten Fall öffnen» und
 * Taste N; Einzelfall mit Termin und Einsprüchen; Entscheid mit Regel und
 * Begründung; Support ohne Zugang, auch nicht über die Server Action.
 */
const created: string[] = [];
test.afterAll(async () => cleanup(created));

async function pendingReview(hoursAgo = 3) {
  const provider = await createProvider(created);
  const member = await createMember(created);
  const { requestId } = await createAppointment(member, provider, { hoursAgo });
  const reviewId = await createReviewRow(member, provider, requestId);
  return { provider, member, reviewId };
}

test.describe("Bewertungen: Moderation", () => {
  test("Warteschlange, älteste zuerst, Taste N, Fall mit Termin; Fehler am Feld; Audit", async ({
    page,
    baseURL,
  }) => {
    const older = await pendingReview(30);
    await query(
      `update review set "createdAt" = now() - interval '400 days' where id = $1`,
      [older.reviewId],
    );
    const moderator = await signInAdmin(page, baseURL, "MODERATOR");
    created.push(moderator.id);

    await page.goto("/de/admin/bewertungen");
    await expect(
      page.getByRole("heading", { level: 1, name: "Bewertungen" }),
    ).toBeVisible();
    const nav = page.getByRole("navigation", { name: "Bereiche des Admins" });
    await expect(
      nav.getByRole("link", { name: /^Bewertungen/ }),
    ).toHaveAttribute("aria-current", "page");
    await expect(nav.getByRole("link", { name: /^Bewertungen/ })).toContainText(
      /\d+/,
    );
    await expect(
      page.locator("[data-review-case-link]").first(),
    ).toHaveAttribute("href", `/de/admin/bewertungen/${older.reviewId}`);
    await expect(page.locator("tbody")).not.toContainText(older.member.name);
    await expectNoSeriousAxeFindings(page);

    await page.keyboard.press("n");
    await expect(page).toHaveURL(`/de/admin/bewertungen/${older.reviewId}`);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: `Bewertung zu ${older.provider.displayName}`,
      }),
    ).toBeVisible();
    await expect(page.getByText(/bis .* · Stattgefunden/)).toBeVisible();
    await expect(
      page.getByText("Zu dieser Bewertung gibt es keinen Einspruch."),
    ).toBeVisible();
    await expect(page.getByRole("radio")).toHaveCount(2);
    const viewed = await query(
      `select id from audit_event where target = $1 and action = 'review.viewed'`,
      [`review:${older.reviewId}`],
    );
    expect(viewed.length).toBeGreaterThan(0);
    await expectNoSeriousAxeFindings(page);

    await page.getByRole("button", { name: "Entscheid speichern" }).click();
    await expect(
      page.getByRole("link", { name: "Wähle ein Ergebnis." }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Wähle eine Regel." }),
    ).toBeVisible();
    await page.getByRole("radio", { name: "Ablehnen" }).click();
    await choose(page, "Regel", /^R-REV-2 Intime oder sensible Details/);
    await page.getByLabel("Begründung", { exact: true }).fill("zu kurz");
    await page.getByRole("button", { name: "Entscheid speichern" }).click();
    await expect(
      page.getByRole("link", {
        name: "Die Begründung braucht mindestens 10 Zeichen.",
      }),
    ).toBeVisible();
    expect(await reviewRow(older.reviewId)).toMatchObject({
      status: "PENDING",
    });
    await page
      .getByLabel("Begründung", { exact: true })
      .fill("Fiktiv: Die Bewertung nennt intime Details.");
    await page.getByRole("button", { name: "Entscheid speichern" }).click();
    // Danach öffnet sich der nächste Fall der gemeinsamen Warteschlange. Unter parallelen Tests kann das ein
    // Fall sein, den ein anderer Test gerade aufräumt; die Meldung ginge dann mit der 404 verloren. Massgeblich
    // sind deshalb Navigation und gespeicherter Entscheid.
    await expect(page).not.toHaveURL(`/de/admin/bewertungen/${older.reviewId}`);
    expect(await reviewRow(older.reviewId)).toMatchObject({
      status: "REJECTED",
      moderationReason: "R-REV-2: Fiktiv: Die Bewertung nennt intime Details.",
    });
    const audit = await query<{ reason: string }>(
      `select reason from audit_event where target = $1 and action = 'review.rejected'`,
      [`review:${older.reviewId}`],
    );
    expect(audit).toEqual([
      { reason: "R-REV-2: Fiktiv: Die Bewertung nennt intime Details." },
    ]);
  });
});

test.describe("Bewertungen: Einsprüche und Zugang", () => {
  test("Einspruch abweisen: die Bewertung bleibt, der Einspruch ist abgewiesen", async ({
    page,
    baseURL,
  }) => {
    const provider = await createProvider(created);
    const member = await createMember(created);
    const { requestId } = await createAppointment(member, provider);
    const reviewId = await createReviewRow(member, provider, requestId, {
      status: "PUBLISHED",
    });
    await createAppealRow(
      reviewId,
      "PROVIDER",
      "Fiktiver Grund des Anbieters für den Einspruch.",
    );
    const moderator = await signInAdmin(page, baseURL, "PLATFORM_ADMIN");
    created.push(moderator.id);
    await page.goto(`/de/admin/bewertungen/${reviewId}`);
    await expect(
      page.getByRole("heading", { name: "Einspruch des Anbieters abweisen" }),
    ).toBeVisible();
    const form = page.locator("[data-dismiss-appeal]");
    await form.getByRole("button", { name: "Einspruch abweisen" }).click();
    await expect(
      form.getByText("Die Begründung braucht mindestens 10 Zeichen."),
    ).toBeVisible();
    await form.getByRole("textbox").fill("Fiktiv: keine Regel verletzt.");
    await form.getByRole("button", { name: "Einspruch abweisen" }).click();
    await expect(
      page.getByText("Einspruch abgewiesen", { exact: true }),
    ).toBeVisible();
    await expect(page.locator("[data-dismiss-appeal]")).toHaveCount(0);
    expect(await appealRows(reviewId)).toMatchObject([{ status: "DISMISSED" }]);
    expect(await reviewRow(reviewId)).toMatchObject({ status: "PUBLISHED" });
  });

  test("Support sieht den Hinweis statt der Warteschlange und keinen Fall", async ({
    page,
    baseURL,
  }) => {
    const { reviewId, provider } = await pendingReview();
    const support = await signInAdmin(page, baseURL, "SUPPORT");
    created.push(support.id);
    for (const path of [
      "/de/admin/bewertungen",
      `/de/admin/bewertungen/${reviewId}`,
    ]) {
      await page.goto(path);
      await expect(
        page.getByText(
          "Dieser Bereich ist für Moderation, Trust & Safety und Plattform-Administration.",
        ),
      ).toBeVisible();
      await expect(page.getByRole("table")).toHaveCount(0);
      await expect(page.getByText(provider.displayName)).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Entscheid speichern" }),
      ).toHaveCount(0);
    }
    await expectNoSeriousAxeFindings(page);
  });

  test("die Server Action verweigert Support den Entscheid", async ({
    page,
    baseURL,
  }) => {
    const { reviewId } = await pendingReview();
    const moderator = await signInAdmin(page, baseURL, "MODERATOR");
    const support = await createAccount("SUPPORT");
    created.push(moderator.id, support.id);
    await page.goto(`/de/admin/bewertungen/${reviewId}`);
    await expect(
      page.getByRole("button", { name: "Entscheid speichern" }),
    ).toBeVisible();

    // Dieselbe geladene Seite, jetzt mit der Sitzung von Support: die Aktion muss selbst prüfen.
    await signInAs(page, support, baseURL);
    await enableTwoFactor(page, baseURL);
    await page.getByRole("radio", { name: "Freigeben" }).click();
    await choose(page, "Regel", /^R-REV-1 /);
    await page
      .getByLabel("Begründung", { exact: true })
      .fill("Fiktive Begründung für den Test");
    await page.getByRole("button", { name: "Entscheid speichern" }).click();
    await expect(
      page.getByText(
        "Deine Rolle darf keine Bewertungen moderieren. Es wurde nichts gespeichert.",
      ),
    ).toBeVisible();
    expect(await reviewRow(reviewId)).toMatchObject({ status: "PENDING" });
  });

  test("375 px: Warteschlange und Fall ohne horizontales Scrollen, Entscheid erst ab 1024 px", async ({
    page,
    baseURL,
  }) => {
    const { reviewId } = await pendingReview();
    const moderator = await signInAdmin(page, baseURL, "MODERATOR");
    created.push(moderator.id);
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/de/admin/bewertungen");
    await expect(
      page.getByRole("heading", { level: 1, name: "Bewertungen" }),
    ).toBeVisible();
    await expectNoHorizontalScroll(page);
    await page.goto(`/de/admin/bewertungen/${reviewId}`);
    await expect(
      page.getByText("Entscheiden geht ab 1024 px Breite"),
    ).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
});
