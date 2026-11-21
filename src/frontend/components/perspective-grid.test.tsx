import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PerspectiveGrid, {
  columnOffsets,
  grid,
  project,
  rowDepths,
} from "./perspective-grid";

describe("perspective grid geometry", () => {
  const depths = rowDepths();
  const rowYs = depths.map((z) => project(0, z).y);

  it("starts the nearest row on the bottom edge and keeps every row below the horizon", () => {
    expect(rowYs[0]).toBeCloseTo(grid.height, 6);
    for (const y of rowYs) {
      expect(y).toBeGreaterThan(grid.horizon);
    }
  });

  it("draws rows one floor cell apart in depth", () => {
    depths.forEach((z, index) => {
      expect(z).toBe(grid.nearDepth + index);
    });
  });

  it("spaces rows by the inverse of their depth so each cell is a square on the floor", () => {
    // Recover the depth of every drawn row from its screen position. Squares
    // on the floor mean consecutive rows are exactly one cell apart.
    const focalHeight = (rowYs[0] - grid.horizon) * grid.nearDepth;
    const recovered = rowYs.map((y) => focalHeight / (y - grid.horizon));
    recovered.forEach((z, index) => {
      expect(z).toBeCloseTo(grid.nearDepth + index, 9);
    });

    // A cell is as deep as it is wide: its projected width equals the
    // projected width of one floor unit at that depth.
    for (const z of depths) {
      const left = project(0, z);
      const right = project(1, z);
      const width = right.x - left.x;
      const unitHeight = project(0, z).y - grid.horizon;
      expect(width / unitHeight).toBeCloseTo(1 / grid.cameraHeight, 9);
    }
  });

  it("converges every column on the vanishing point", () => {
    const far = depths[depths.length - 1];
    for (const x of columnOffsets(far)) {
      const near = project(x, grid.nearDepth);
      const distant = project(x, far);
      // Extending the column upwards reaches the centre of the horizon.
      const t = (grid.horizon - near.y) / (distant.y - near.y);
      expect(near.x + t * (distant.x - near.x)).toBeCloseTo(grid.width / 2, 6);
    }
  });

  it("never draws rows closer together than the minimum spacing", () => {
    const gaps = rowYs.slice(1).map((y, index) => rowYs[index] - y);
    for (const gap of gaps) {
      expect(gap).toBeGreaterThanOrEqual(grid.minRowSpacing);
    }
    // Gaps shrink steadily with distance, so no row is skipped or doubled.
    gaps.slice(1).forEach((gap, index) => {
      expect(gap).toBeLessThan(gaps[index]);
    });
  });

  it("covers the full width at the far edge with columns", () => {
    const far = depths[depths.length - 1];
    const offsets = columnOffsets(far);
    expect(project(offsets[0], far).x).toBeLessThanOrEqual(0);
    expect(project(offsets[offsets.length - 1], far).x).toBeGreaterThanOrEqual(grid.width);
  });
});

describe("PerspectiveGrid", () => {
  // The banner hides the floor that holds this SVG from assistive technology.
  it("renders an SVG with crisp, non-scaling strokes", () => {
    const { container } = render(<PerspectiveGrid />);
    const svg = container.querySelector("svg");

    expect(svg).toHaveAttribute("preserveAspectRatio", "xMidYMid slice");
    const path = svg?.querySelector("path");
    expect(path).toHaveAttribute("vector-effect", "non-scaling-stroke");
    expect(path).toHaveAttribute("stroke-width", "1");

    const rows = path?.getAttribute("d")?.match(/H/g) ?? [];
    expect(rows).toHaveLength(rowDepths().length);
  });
});
