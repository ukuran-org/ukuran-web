import { expect, test, type Locator, type Page } from "@playwright/test";
import { greyLevels, inkExtent } from "./pixels";

// The hero markup has no roles beyond the heading, so these locators follow
// its structure: the banner holds the grid floor, the logo and the fade in order.
function hero(page: Page) {
  const banner = page.locator("header > div").first();
  return {
    banner,
    logo: banner.locator(":scope > div").nth(1),
    logoImage: banner.locator("img"),
    fade: banner.locator(":scope > div").nth(2),
    wordmark: page.getByRole("heading", { level: 1, name: "UKURAN" }),
  };
}

async function box(locator: Locator) {
  const result = await locator.boundingBox();
  if (!result) {
    throw new Error("element is not rendered");
  }
  return result;
}

// Pauses the levitation at a point in its cycle and returns the logo and fade boxes.
async function boxesAt(page: Page, time: number) {
  await page.evaluate((currentTime) => {
    for (const animation of document.getAnimations()) {
      animation.pause();
      animation.currentTime = currentTime;
    }
  }, time);
  const { logoImage, fade } = hero(page);
  return { logo: await box(logoImage), fade: await box(fade) };
}

test.describe("hero banner", () => {
  test("draw black text on a white page", async ({ page }) => {
    await page.goto("/");

    const colours = await page.evaluate(() => {
      const style = getComputedStyle(document.body);
      return { background: style.backgroundColor, text: style.color };
    });
    expect(colours).toEqual({ background: "rgb(255, 255, 255)", text: "rgb(0, 0, 0)" });
    await expect(page.getByText("Description placeholder.").first()).toHaveCSS(
      "color",
      "rgb(0, 0, 0)",
    );
    await expect(hero(page).wordmark).toHaveCSS("color", "rgb(0, 0, 0)");
  });

  test("use no shadows anywhere", async ({ page }) => {
    await page.goto("/");

    const shadowed = await page.evaluate(() =>
      [...document.querySelectorAll("*")]
        .map((element) => {
          const style = getComputedStyle(element);
          return {
            element: element.tagName.toLowerCase() + (element.className ? `.${element.className}` : ""),
            boxShadow: style.boxShadow,
            textShadow: style.textShadow,
            filter: style.filter,
          };
        })
        .filter(
          (style) =>
            style.boxShadow !== "none" ||
            style.textShadow !== "none" ||
            style.filter.includes("drop-shadow"),
        ),
    );
    expect(shadowed).toEqual([]);
  });

  test("centre the logo and the wordmark below it", async ({ page }) => {
    await page.goto("/");
    const { logoImage, wordmark, banner } = hero(page);
    const viewport = page.viewportSize();
    if (!viewport) {
      throw new Error("the test needs a fixed viewport");
    }

    const logo = await box(logoImage);
    const heading = await box(wordmark);
    const bannerBox = await box(banner);
    expect(Math.abs(logo.x + logo.width / 2 - viewport.width / 2)).toBeLessThanOrEqual(1);
    expect(Math.abs(heading.x + heading.width / 2 - viewport.width / 2)).toBeLessThanOrEqual(1);
    expect(heading.y).toBeGreaterThanOrEqual(bannerBox.y + bannerBox.height - 0.5);
  });

  test("levitate the logo gently without rotating or scaling it", async ({ page }) => {
    await page.goto("/");

    const animations = await page.evaluate(() =>
      document.getAnimations().map((animation) => {
        const effect = animation.effect as KeyframeEffect;
        return {
          target: effect.target === document.querySelector("header img")?.parentElement,
          duration: effect.getComputedTiming().duration,
          iterations: effect.getComputedTiming().iterations,
          transforms: effect.getKeyframes().map((keyframe) => String(keyframe.transform)),
          otherProperties: effect
            .getKeyframes()
            .flatMap((keyframe) =>
              Object.keys(keyframe).filter(
                (key) => !["offset", "easing", "composite", "computedOffset", "transform"].includes(key),
              ),
            ),
        };
      }),
    );

    // Only the logo moves, so the grid and the fade stay static.
    expect(animations).toHaveLength(1);
    const [levitation] = animations;
    expect(levitation.target).toBe(true);
    expect(levitation.duration).toBeGreaterThanOrEqual(4000);
    expect(levitation.duration).toBeLessThanOrEqual(6000);
    expect(levitation.iterations).toBe(Infinity);
    expect(levitation.otherProperties).toEqual([]);
    for (const transform of levitation.transforms) {
      expect(transform).toMatch(/^translateY\(-?\d+(\.\d+)?px\)$/);
    }
  });

  test("move the logo by 6 to 8 pixels while the fade stays fixed", async ({ page }) => {
    await page.goto("/");

    const duration = await page.evaluate(
      () => document.getAnimations()[0].effect?.getComputedTiming().duration as number,
    );
    const rest = await boxesAt(page, 0);
    const peak = await boxesAt(page, duration / 2);
    const quarter = await boxesAt(page, duration / 4);

    const travel = rest.logo.y - peak.logo.y;
    expect(travel).toBeGreaterThanOrEqual(6);
    expect(travel).toBeLessThanOrEqual(8);
    expect(quarter.logo.y).toBeLessThan(rest.logo.y);
    expect(quarter.logo.y).toBeGreaterThan(peak.logo.y);

    // The logo only moves vertically and keeps its size.
    expect(peak.logo.x).toBeCloseTo(rest.logo.x, 1);
    expect(peak.logo.width).toBeCloseTo(rest.logo.width, 1);
    expect(peak.logo.height).toBeCloseTo(rest.logo.height, 1);

    expect(peak.fade).toEqual(rest.fade);
    expect(quarter.fade).toEqual(rest.fade);
  });

  test("animate the logo in real time", async ({ page }) => {
    await page.goto("/");
    const { logoImage } = hero(page);
    const start = (await box(logoImage)).y;

    await expect.poll(async () => Math.abs((await box(logoImage)).y - start)).toBeGreaterThan(1);
  });

  test.describe("with reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("keep the logo still", async ({ page }) => {
      await page.goto("/");
      const { logo, logoImage } = hero(page);

      await expect(logo).toHaveCSS("animation-name", "none");
      expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);

      const start = await box(logoImage);
      await page.waitForTimeout(1000);
      expect(await box(logoImage)).toEqual(start);
    });
  });

  test("fade only the bottom quarter of the banner", async ({ page }) => {
    await page.goto("/");
    const { banner, fade, wordmark } = hero(page);

    const bannerBox = await box(banner);
    const fadeBox = await box(fade);
    expect(fadeBox.x).toBeCloseTo(bannerBox.x, 1);
    expect(fadeBox.width).toBeCloseTo(bannerBox.width, 1);
    expect(fadeBox.y + fadeBox.height).toBeCloseTo(bannerBox.y + bannerBox.height, 1);
    expect(fadeBox.height / bannerBox.height).toBeCloseTo(0.25, 2);

    // The wordmark sits below the banner, so the fade never covers it.
    expect((await box(wordmark)).y).toBeGreaterThanOrEqual(fadeBox.y + fadeBox.height - 0.5);
  });

  test("fade the logo and the grid into white", async ({ page }) => {
    await page.goto("/");
    const bannerBox = await box(hero(page).banner);
    // Hold the logo at rest, which is also the frame the screenshot uses.
    const { logo, fade: fadeBox } = await boxesAt(page, 0);

    const { rows } = await greyLevels(page, bannerBox);
    const rowAt = (y: number) => rows[Math.round(y - bannerBox.y)];
    const darkest = (row: number[], from: number, to: number) =>
      Math.min(...row.slice(Math.round(from), Math.round(to)));

    // Above the fade the logo is solid black and the grid lines show beside it.
    const aboveFade = rowAt(fadeBox.y - 4);
    expect(darkest(aboveFade, logo.x, logo.x + logo.width)).toBeLessThan(40);
    expect(darkest(aboveFade, 0, logo.x - 10)).toBeLessThan(250);

    // Near the bottom of the logo the fade has lightened it a lot.
    const nearLogoBottom = rowAt(logo.y + logo.height - 6);
    expect(darkest(nearLogoBottom, logo.x, logo.x + logo.width)).toBeGreaterThan(150);

    // The last row of the banner is pure white, grid included.
    const lastRow = rows[rows.length - 1];
    expect(Math.min(...lastRow)).toBeGreaterThanOrEqual(253);
  });

  test("fade the grid out as it recedes", async ({ page }) => {
    await page.goto("/");
    const bannerBox = await box(hero(page).banner);
    const { logo, fade: fadeBox } = await boxesAt(page, 0);
    const { rows } = await greyLevels(page, bannerBox);

    // Measure beside the logo so only the grid contributes.
    const besideLogo = (y: number) => rows[Math.round(y - bannerBox.y)].slice(0, Math.floor(logo.x) - 10);
    const darkness = (y: number) => {
      const row = besideLogo(y);
      return row.reduce((sum, level) => sum + (255 - level), 0) / row.length;
    };

    // The grid is light grey where it is closest to the viewer.
    expect(Math.min(...besideLogo(fadeBox.y - 4))).toBeGreaterThanOrEqual(150);
    // It gets fainter with distance and has vanished at the top of the banner.
    expect(darkness(fadeBox.y - 4)).toBeGreaterThan(darkness(fadeBox.y / 2));
    expect(Math.min(...rows[0])).toBeGreaterThanOrEqual(253);
  });

  for (const width of [360, 390, 768, 1440, 1920]) {
    test(`match the wordmark ink to the logo width at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await page.evaluate(() => document.fonts.ready);
      const { logoImage, wordmark } = hero(page);

      const logo = await box(logoImage);
      const heading = await box(wordmark);
      const ink = await inkExtent(page, { x: 0, y: heading.y, width, height: heading.height });
      if (!ink) {
        throw new Error("the wordmark rendered no ink");
      }

      // Allow about a pixel for anti-aliasing at each edge.
      const tolerance = 2;
      expect(Math.abs(ink.width - logo.width)).toBeLessThanOrEqual(tolerance);
      expect(Math.abs(ink.left - logo.x)).toBeLessThanOrEqual(tolerance);
      expect(Math.abs(ink.right - (logo.x + logo.width))).toBeLessThanOrEqual(tolerance);
    });

    test(`fit the page without horizontal scrolling at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});
