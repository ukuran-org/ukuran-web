import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("accessibility", () => {
  for (const route of ["/", "/#about", "/#ask"]) {
    test(`have no serious or critical axe violations on ${route}`, async ({ page }) => {
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
        .analyze();

      const blocking = results.violations
        .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
        .map((violation) => ({
          rule: violation.id,
          impact: violation.impact,
          targets: violation.nodes.map((node) => node.target.join(" ")),
        }));
      expect(blocking).toEqual([]);
    });
  }

  test("expose one level one heading named UKURAN", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName("UKURAN");
  });

  test("hide the decorative logo, grid and fade from assistive technology", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("header img")).toHaveAttribute("alt", "");
    const hiddenDecorations = page.locator('header [aria-hidden="true"]');
    await expect(hiddenDecorations).toHaveCount(2);
  });
});
