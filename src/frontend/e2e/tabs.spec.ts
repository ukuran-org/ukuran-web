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

  test("centre the selected tab directly under the wordmark", async ({ page }) => {
    await page.goto("/");
    const viewport = page.viewportSize();
    if (!viewport) {
      throw new Error("the test needs a fixed viewport");
    }

    const selected = await page.getByRole("tab", { selected: true }).boundingBox();
    const wordmark = await page.getByRole("heading", { level: 1 }).boundingBox();
    if (!selected || !wordmark) {
      throw new Error("tabs and wordmark must be rendered");
    }

    expect(Math.abs(selected.x + selected.width / 2 - viewport.width / 2)).toBeLessThanOrEqual(1);
    const wordmarkBottom = wordmark.y + wordmark.height;
    for (const tab of await page.getByRole("tab").all()) {
      const box = await tab.boundingBox();
      expect(box?.y).toBeGreaterThan(wordmarkBottom);
    }
    // Nothing sits between the wordmark and the tabs any more, so the gap stays modest.
    expect(selected.y - wordmarkBottom).toBeLessThanOrEqual(48);
  });

  test("show no description paragraph outside the About panel", async ({ page }) => {
    await page.goto("/#about");

    await expect(page.getByText("Description placeholder.")).toHaveCount(1);
    await expect(
      page.getByRole("tabpanel", { name: "About" }).getByText("Description placeholder."),
    ).toBeVisible();
  });
});

// Durations of the slides currently running on the tabs. Colour transitions
// are CSS transitions and are left out.
async function tabSlides(page: Page) {
  return page.evaluate(() =>
    document
      .getAnimations()
      .filter(
        (animation) =>
          !(animation instanceof CSSTransition) &&
          (animation.effect as KeyframeEffect | null)?.target?.matches('[role="tab"]') &&
          animation.playState === "running",
      )
      .map((animation) => animation.effect?.getComputedTiming().duration),
  );
}

// Labels from left to right as they appear on screen, once every slide has finished.
async function visualOrder(page: Page) {
  await expect.poll(() => tabSlides(page)).toEqual([]);
  const boxes = await Promise.all(
    labels.map(async (label) => ({
      label,
      box: await page.getByRole("tab", { name: label }).boundingBox(),
    })),
  );
  return boxes
    .sort((a, b) => (a.box?.x ?? 0) - (b.box?.x ?? 0))
    .map((entry) => entry.label);
}

async function renderedHeight(page: Page, label: (typeof labels)[number]) {
  return page
    .getByRole("tab", { name: label })
    .evaluate((tab) => tab.getBoundingClientRect().height);
}

test.describe("tab carousel", () => {
  test("show Ask, Apps and About with Apps centred, bigger and darker", async ({ page }) => {
    await page.goto("/");

    expect(await visualOrder(page)).toEqual(["Ask", "Apps", "About"]);
    expect(await renderedHeight(page, "Apps")).toBeGreaterThan(
      await renderedHeight(page, "Ask"),
    );
    await expect(page.getByRole("tab", { name: "Apps" })).toHaveCSS("color", "rgb(0, 0, 0)");
    await expect(page.getByRole("tab", { name: "Ask" })).not.toHaveCSS("color", "rgb(0, 0, 0)");
    await expect(page.getByRole("tab", { name: "Apps" })).toHaveCSS(
      "border-bottom-color",
      "rgb(0, 0, 0)",
    );
  });

  test("rotate the left tab into the centre", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("tab", { name: "Ask" }).click();

    await expectSelected(page, "Ask");
    expect(await visualOrder(page)).toEqual(["About", "Ask", "Apps"]);
  });

  test("rotate the right tab into the centre", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("tab", { name: "About" }).click();

    await expectSelected(page, "About");
    expect(await visualOrder(page)).toEqual(["Apps", "About", "Ask"]);
  });

  test("ignore clicks on the centre tab", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("tab", { name: "Apps" }).click();

    expect(await tabSlides(page)).toEqual([]);
    expect(await visualOrder(page)).toEqual(["Ask", "Apps", "About"]);
    await expect(page).toHaveURL(/\/$/);
  });

  test("rotate with the arrow keys and keep focus on the centre tab", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");

    await page.keyboard.press("ArrowLeft");
    await expect(page.getByRole("tab", { name: "Ask" })).toBeFocused();
    expect(await visualOrder(page)).toEqual(["About", "Ask", "Apps"]);

    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "About" })).toBeFocused();
    expect(await visualOrder(page)).toEqual(["Apps", "About", "Ask"]);
  });


  test("open a deep link with that tab centred", async ({ page }) => {
    await recordSlides(page);
    await page.goto("/#ask");

    expect(await visualOrder(page)).toEqual(["About", "Ask", "Apps"]);
    // Opening a deep link does not play a slide.
    expect(await recordedSlides(page)).toEqual([]);
  });

  test("slide all three tabs for 300 milliseconds", async ({ page }) => {
    await recordSlides(page);
    await page.goto("/");

    await page.getByRole("tab", { name: "Ask" }).click();

    const slides = await recordedSlides(page);
    expect(slides.map((slide) => slide.duration)).toEqual([300, 300, 300]);
    // About leaves on the right and pops in on the left, so it is the only one that fades.
    expect(slides.filter((slide) => slide.fades).map((slide) => slide.label)).toEqual(["About"]);
    expect(await visualOrder(page)).toEqual(["About", "Ask", "Apps"]);
  });

  test.describe("with reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("switch tabs instantly", async ({ page }) => {
      await recordSlides(page);
      await page.goto("/");

      await page.getByRole("tab", { name: "Ask" }).click();

      expect(await recordedSlides(page)).toEqual([]);
      await expect(page.getByRole("tab", { name: "Ask" })).toHaveCSS("transition-property", "none");
      expect(await visualOrder(page)).toEqual(["About", "Ask", "Apps"]);
    });
  });
});

type RecordedSlide = { label: string; duration: number; fades: boolean };

// Records every animation started on a tab, so short slides cannot finish
// before the test gets to look at them.
async function recordSlides(page: Page) {
  await page.addInitScript(() => {
    const slides: RecordedSlide[] = [];
    Object.assign(window, { recordedSlides: slides });
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (keyframes, options) {
      if (this.matches('[role="tab"]')) {
        slides.push({
          label: this.textContent ?? "",
          duration: typeof options === "number" ? options : Number(options?.duration),
          fades: Array.isArray(keyframes) && keyframes.some((frame) => frame.opacity === 0),
        });
      }
      return animate.call(this, keyframes, options);
    };
  });
}

async function recordedSlides(page: Page) {
  return page.evaluate(
    () => (window as unknown as { recordedSlides: RecordedSlide[] }).recordedSlides,
  );
}
