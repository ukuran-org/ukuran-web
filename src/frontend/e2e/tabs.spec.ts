import { expect, test, type Page } from "@playwright/test";

const labels = ["Apps", "About", "Ask"] as const;

async function expectSelected(page: Page, label: (typeof labels)[number]) {
  for (const other of labels) {
    await expect(page.getByRole("tab", { name: other })).toHaveAttribute(
      "aria-selected",
      String(other === label),
    );
  }
  await expect(page.getByRole("tabpanel", { name: label })).toBeVisible();
  await expect(page.getByRole("tabpanel")).toHaveCount(1);
}

test.describe("section tabs", () => {
  test("select Apps by default with an empty panel", async ({ page }) => {
    await page.goto("/");

    await expectSelected(page, "Apps");
    await expect(page.getByRole("tabpanel", { name: "Apps" })).toBeEmpty();
  });

  test("open the tab named by a deep link", async ({ page }) => {
    await page.goto("/#ask");
    await expectSelected(page, "Ask");
    await expect(page.getByRole("tabpanel", { name: "Ask" })).toBeEmpty();

    await page.goto("/#about");
    await expectSelected(page, "About");
    await expect(page.getByRole("tabpanel", { name: "About" })).toHaveText(
      "Description placeholder.",
    );
  });

  for (const hash of ["#settings", "#", "#About", "#about/extra", "#panel-ask"]) {
    test(`fall back to Apps for the hash ${hash}`, async ({ page }) => {
      await page.goto(`/${hash}`);

      await expectSelected(page, "Apps");
    });
  }

  test("keep the selected tab after a reload", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "Ask" }).click();
    await expect(page).toHaveURL(/#ask$/);

    await page.reload();

    await expectSelected(page, "Ask");
  });

  test("follow the hash through browser history", async ({ page }) => {
    await page.goto("/#about");
    await expectSelected(page, "About");

    await page.evaluate(() => {
      window.location.hash = "ask";
    });
    await expectSelected(page, "Ask");

    await page.goBack();
    await expect(page).toHaveURL(/#about$/);
    await expectSelected(page, "About");

    await page.goForward();
    await expectSelected(page, "Ask");
  });

  test("replace the history entry instead of adding one on click", async ({ page }) => {
    await page.goto("/");
    const initialLength = await page.evaluate(() => window.history.length);

    await page.getByRole("tab", { name: "About" }).click();
    await page.getByRole("tab", { name: "Ask" }).click();

    await expect(page).toHaveURL(/#ask$/);
    expect(await page.evaluate(() => window.history.length)).toBe(initialLength);
  });

  test("support the tabs keyboard pattern", async ({ page }) => {
    await page.goto("/");
    const tab = (label: (typeof labels)[number]) => page.getByRole("tab", { name: label });

    // The selected tab is the first stop in the tab order.
    await page.keyboard.press("Tab");
    await expect(tab("Apps")).toBeFocused();

    await page.keyboard.press("ArrowRight");
    await expect(tab("About")).toBeFocused();
    await expectSelected(page, "About");
    await expect(page).toHaveURL(/#about$/);

    await page.keyboard.press("ArrowRight");
    await expect(tab("Ask")).toBeFocused();
    await expectSelected(page, "Ask");

    await page.keyboard.press("ArrowRight");
    await expect(tab("Apps")).toBeFocused();
    await expectSelected(page, "Apps");

    await page.keyboard.press("ArrowLeft");
    await expect(tab("Ask")).toBeFocused();
    await expectSelected(page, "Ask");

    await page.keyboard.press("Home");
    await expect(tab("Apps")).toBeFocused();
    await expectSelected(page, "Apps");

    await page.keyboard.press("End");
    await expect(tab("Ask")).toBeFocused();
    await expectSelected(page, "Ask");
    await expect(page).toHaveURL(/#ask$/);

    // Tab leaves the tab list and moves to the active panel.
    await page.keyboard.press("Tab");
    await expect(page.getByRole("tabpanel", { name: "Ask" })).toBeFocused();

    // Shift+Tab returns to the selected tab rather than the first one.
    await page.keyboard.press("Shift+Tab");
    await expect(tab("Ask")).toBeFocused();
  });

  test("centre the tabs under the description", async ({ page }) => {
    await page.goto("/");
    const viewport = page.viewportSize();
    if (!viewport) {
      throw new Error("the test needs a fixed viewport");
    }

    const tabs = page.getByRole("tab");
    const first = await tabs.first().boundingBox();
    const last = await tabs.last().boundingBox();
    const description = await page.getByText("Description placeholder.").first().boundingBox();
    if (!first || !last || !description) {
      throw new Error("tabs and description must be rendered");
    }

    const tabsCentre = (first.x + last.x + last.width) / 2;
    expect(Math.abs(tabsCentre - viewport.width / 2)).toBeLessThanOrEqual(1);
    expect(first.y).toBeGreaterThan(description.y + description.height);
  });
});
