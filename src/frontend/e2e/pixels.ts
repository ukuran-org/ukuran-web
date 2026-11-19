import type { Page } from "@playwright/test";

export type Region = { x: number; y: number; width: number; height: number };

// Grey levels at or below this count as ink. Halfway between black and white
// keeps anti-aliased edges from shifting the measured bounds by more than a
// fraction of a pixel.
const inkThreshold = 128;

/**
 * Takes a screenshot of a region of the page and returns the grey level of
 * every pixel, row by row, in CSS pixels. Infinite animations are reset to
 * their first frame so the result does not depend on timing.
 */
export async function greyLevels(page: Page, region: Region) {
  const clip = {
    x: Math.floor(region.x),
    y: Math.floor(region.y),
    width: Math.ceil(region.width),
    height: Math.ceil(region.height),
  };
  const png = await page.screenshot({
    clip,
    fullPage: true,
    scale: "css",
    animations: "disabled",
  });

  const rows = await page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("2D canvas is not available");
    }
    context.drawImage(image, 0, 0);
    const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);

    const result: number[][] = [];
    for (let y = 0; y < height; y++) {
      const row: number[] = [];
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        row.push(Math.round(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]));
      }
      result.push(row);
    }
    return result;
  }, png.toString("base64"));

  return { origin: { x: clip.x, y: clip.y }, rows };
}

/**
 * Returns the horizontal page coordinates of the leftmost and rightmost ink
 * pixels inside a region, or null when the region holds no ink.
 */
export async function inkExtent(page: Page, region: Region) {
  const { origin, rows } = await greyLevels(page, region);
  let left = Infinity;
  let right = -Infinity;

  for (const row of rows) {
    row.forEach((level, x) => {
      if (level <= inkThreshold) {
        left = Math.min(left, x);
        right = Math.max(right, x);
      }
    });
  }

  if (left === Infinity) {
    return null;
  }
  return { left: origin.x + left, right: origin.x + right + 1, width: right + 1 - left };
}
