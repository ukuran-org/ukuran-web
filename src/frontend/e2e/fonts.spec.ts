import { expect, test, type Page } from "@playwright/test";

// Returns the first family in an element's computed font-family list.
async function primaryFamily(page: Page, selector: string) {
  return page.locator(selector).first().evaluate((element) =>
    getComputedStyle(element)
      .fontFamily.split(",")[0]
      .trim()
      .replace(/^["']|["']$/g, ""),
  );
}

// Lists the weights of the faces in the family that finished loading.
async function loadedWeights(page: Page, family: string) {
  return page.evaluate(async (name) => {
    await document.fonts.ready;
    return [...document.fonts]
      .filter((face) => face.family.replace(/^["']|["']$/g, "") === name && face.status === "loaded")
      .map((face) => face.weight);
  }, family);
}

test.describe("fonts", () => {
  test("set the wordmark in Sans Ukuran and load the face", async ({ page }) => {
    await page.goto("/");

    const family = await primaryFamily(page, "h1");
    expect(family).toMatch(/^sans ?ukuran$/i);
    expect(await loadedWeights(page, family)).toContain("700");
    await expect(page.locator("h1")).toHaveCSS("font-weight", "700");
  });

  test("set body text in Google Sans and load the faces it uses", async ({ page }) => {
    // The About panel holds the only running text on the page.
    await page.goto("/#about");

    // Plain Google Sans, not Google Sans Flex or Google Sans Code.
    for (const selector of ["body", '[role="tabpanel"]:not([hidden]) p', '[role="tab"]']) {
      expect(await primaryFamily(page, selector), selector).toBe("Google Sans");
    }

    const weights = await loadedWeights(page, "Google Sans");
    // Panel text uses the regular weight and the tabs the medium one.
    expect(weights).toContain("400");
    expect(weights).toContain("500");
  });

  test("reserve Sans Ukuran for the wordmark", async ({ page }) => {
    await page.goto("/#about");
    const wordmarkFamily = await primaryFamily(page, "h1");

    const others = await page.evaluate((family) => {
      const wordmark = document.querySelector("h1");
      return [...document.body.querySelectorAll("*")]
        .filter((element) => element !== wordmark && !wordmark?.contains(element))
        .filter((element) => getComputedStyle(element).fontFamily.includes(family))
        .map((element) => element.tagName.toLowerCase());
    }, wordmarkFamily);
    expect(others).toEqual([]);
  });
});
