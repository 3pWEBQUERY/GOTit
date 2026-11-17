import sharp from "sharp";
import { query } from "./admin-fixtures";
import {
  cleanupOrganizations,
  createOrganization,
  openAs,
  member,
} from "./organization-fixtures";
import {
  expectNoHorizontalScroll,
  expectNoSeriousAxeFindings,
} from "./support/checks";
import { expect, test } from "./support/test";

/**
 * Medien der Organisation (v1 FR-BUSINESS-001, Entscheid 0018): dieselbe
 * Bibliothek wie im Anbieter-Studio, mit Logo statt Sichtbarkeit. Der Worker
 * verarbeitet den Upload mit dem Treiber fs.
 */
const organizations: string[] = [];
const users: string[] = [];
test.afterEach(async () => cleanupOrganizations(organizations, users));

async function photo(): Promise<Buffer> {
  return sharp({
    create: {
      width: 1200,
      height: 800,
      channels: 3,
      background: { r: 92, g: 106, b: 122 },
    },
  })
    .jpeg({ quality: 85 })
    .toBuffer();
}

test.describe("Medien der Organisation", () => {
  test("Upload als Organisation bis «In Prüfung», Logo festlegen; Terminorganisation sieht nur", async ({
    page,
  }) => {
    const org = await createOrganization(["MARKETING", "SCHEDULING"], {
      created: users,
    });
    organizations.push(org.id);
    await openAs(
      page,
      member(org, "MARKETING"),
      `/de/studio/o/${org.slug}/medien`,
    );
    await expect(
      page.getByRole("heading", { level: 1, name: "Medien" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Fotos der Organisation sind nach der Prüfung öffentlich",
        { exact: false },
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("radiogroup", { name: /Sichtbarkeit/ }),
    ).toHaveCount(0);
    await page
      .getByRole("checkbox", { name: /Ich habe die Rechte an diesen Fotos/ })
      .click();
    await page.locator("[data-upload-panel] input[type=file]").setInputFiles({
      name: "club-fiktiv.jpg",
      mimeType: "image/jpeg",
      buffer: await photo(),
    });

    await expect
      .poll(
        async () =>
          (
            await query(
              `select id from media_asset where "organizationId" = $1`,
              [org.id],
            )
          ).length,
      )
      .toBe(1);
    const [row] = await query<{
      id: string;
      providerProfileId: string | null;
      visibility: string;
      ownerUserId: string;
    }>(
      `select id, "providerProfileId", visibility, "ownerUserId" from media_asset where "organizationId" = $1`,
      [org.id],
    );
    expect(row).toMatchObject({
      providerProfileId: null,
      visibility: "PUBLIC",
      ownerUserId: member(org, "MARKETING").id,
    });
    const tile = page.locator(`[data-media-id="${row?.id}"]`);
    await expect(tile.getByText("In Prüfung")).toBeVisible({ timeout: 30_000 });
    await expect(tile.getByText("Titelbild")).toHaveCount(0);

    await tile.getByRole("button", { name: /Aktionen/ }).click();
    await page.getByRole("menuitem", { name: "Als Logo festlegen" }).click();
    await expect(tile.getByText("Logo", { exact: true })).toBeVisible();
    expect(
      (
        await query<{ isLogo: boolean; isCover: boolean }>(
          `select "isLogo", "isCover" from media_asset where id = $1`,
          [row?.id],
        )
      )[0],
    ).toEqual({ isLogo: true, isCover: false });
    await expectNoSeriousAxeFindings(page);
    await page.setViewportSize({ width: 375, height: 800 });
    await expectNoHorizontalScroll(page);

    await openAs(
      page,
      member(org, "SCHEDULING"),
      `/de/studio/o/${org.slug}/medien`,
    );
    await expect(page.locator("[data-permission-note]")).toContainText(
      "Deine Rolle kann Medien nur ansehen.",
    );
    await expect(page.locator("[data-upload-panel]")).toHaveCount(0);
    await expect(page.locator(`[data-media-id="${row?.id}"]`)).toBeVisible();
    await expect(page.locator(`[data-media-menu="${row?.id}"]`)).toHaveCount(0);
    expect(
      (await page.goto(`/de/studio/o/${org.slug}/medien/${row?.id}`))?.status(),
    ).toBe(404);
  });
});
