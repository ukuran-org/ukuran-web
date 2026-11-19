import { expect, test } from "@playwright/test";

test("home page shows the wordmark and switches tabs", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Ukuran");
  await expect(
    page.getByRole("heading", { level: 1, name: "UKURAN" }),
  ).toBeVisible();

  const appsTab = page.getByRole("tab", { name: "Apps" });
  const aboutTab = page.getByRole("tab", { name: "About" });
  await expect(appsTab).toHaveAttribute("aria-selected", "true");

  await aboutTab.click();

  await expect(aboutTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel", { name: "About" })).toHaveText(
    "Description placeholder.",
  );
  await expect(page).toHaveURL(/#about$/);
});
