import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

const assetsDir = path.resolve(__dirname, "../../../assets");

test.describe("page", () => {
  test("have the Ukuran title and the shared favicon", async ({ page, request }) => {
    await page.goto("/");

    await expect(page).toHaveTitle("Ukuran");

    const icon = page.locator('link[rel="icon"]');
    await expect(icon).toHaveCount(1);
    await expect(icon).toHaveAttribute("type", "image/svg+xml");

    const href = await icon.getAttribute("href");
    const response = await request.get(href ?? "");
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/svg+xml");
    expect(await response.text()).toBe(await readFile(path.join(assetsDir, "favicon.svg"), "utf8"));
  });

  test("serve the logo from the shared assets folder", async ({ page, request }) => {
    await page.goto("/");

    const src = await page.locator("header img").getAttribute("src");
    const response = await request.get(src ?? "");
    expect(response.ok()).toBe(true);
    expect(await response.text()).toBe(await readFile(path.join(assetsDir, "logo.svg"), "utf8"));
  });

  for (const route of ["/", "/#about", "/#ask", "/#unknown"]) {
    test(`load ${route} without console errors or failed requests`, async ({ page }) => {
      const problems: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error" || message.type() === "warning") {
          problems.push(`${message.type()}: ${message.text()}`);
        }
      });
      page.on("pageerror", (error) => problems.push(`page error: ${error.message}`));
      page.on("requestfailed", (request) =>
        problems.push(`request failed: ${request.url()} ${request.failure()?.errorText}`),
      );
      page.on("response", (response) => {
        if (response.status() >= 400) {
          problems.push(`HTTP ${response.status()}: ${response.url()}`);
        }
      });

      await page.goto(route, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);

      expect(problems).toEqual([]);
    });
  }
});
