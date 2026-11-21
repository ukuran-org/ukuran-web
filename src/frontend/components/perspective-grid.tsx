/*
 * A floor tiled with unit squares, seen through a pinhole camera that looks
 * along the floor. A floor point at sideways offset x and depth z lands on
 *
 *   screen x = centre + focal * x / z
 *   screen y = horizon + focal * height / z
 *
 * so lines of constant x converge on the vanishing point and lines of
 * constant z get closer together in proportion to 1 / z. Every cell drawn is
 * therefore the exact image of a square. The SVG scales uniformly and only
 * crops its sides, which keeps that true at every viewport size.
 */

export const grid = {
  width: 3600,
  height: 600,
  horizon: 312,
  // The camera sits two cells above the floor and the nearest row starts
  // three cells in front of it, which gives a low, flat floor.
  cameraHeight: 2,
  nearDepth: 3,
  // Rows closer together than this are not drawn, so lines never merge.
  // At the smallest banner one unit is about 0.37 CSS pixels, so 10 units keep
  // rows at least 3.5 pixels apart.
  minRowSpacing: 10,
} as const;

const centre = grid.width / 2;
// Places the nearest row on the bottom edge of the view.
const focal = ((grid.height - grid.horizon) * grid.nearDepth) / grid.cameraHeight;

export function project(x: number, z: number) {
  return {
    x: centre + (focal * x) / z,
    y: grid.horizon + (focal * grid.cameraHeight) / z,
  };
}

/** Depths of the rows that are far enough apart to draw, nearest first. */
export function rowDepths() {
  const depths: number[] = [];
  for (let z = grid.nearDepth; ; z++) {
    const spacing = project(0, z).y - project(0, z + 1).y;
    depths.push(z);
    if (spacing < grid.minRowSpacing) {
      return depths;
    }
  }
}

/** Sideways offsets of every column that is visible somewhere on the floor. */
export function columnOffsets(farDepth: number) {
  const reach = Math.ceil((centre * farDepth) / focal);
  return Array.from({ length: reach * 2 + 1 }, (_, index) => index - reach);
}

const round = (value: number) => Math.round(value * 100) / 100;

export default function PerspectiveGrid() {
  const depths = rowDepths();
  const near = depths[0];
  const far = depths[depths.length - 1];
  const farY = project(0, far).y;

  const rows = depths
    .map((z) => {
      const y = round(project(0, z).y);
      return `M0 ${y}H${grid.width}`;
    })
    .join("");
  const columns = columnOffsets(far)
    .map((x) => {
      const top = project(x, far);
      const bottom = project(x, near);
      return `M${round(top.x)} ${round(top.y)}L${round(bottom.x)} ${round(bottom.y)}`;
    })
    .join("");

  return (
    <svg
      viewBox={`0 0 ${grid.width} ${grid.height}`}
      preserveAspectRatio="xMidYMid slice"
      width="100%"
      height="100%"
      focusable="false"
    >
      <defs>
        {/* The floor fades in from nothing at its far edge. */}
        <linearGradient
          id="perspective-grid-fade"
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1={round(farY)}
          x2="0"
          y2={round(farY + (grid.height - farY) * 0.45)}
        >
          <stop offset="0" stopColor="#d4d4d4" stopOpacity="0" />
          <stop offset="1" stopColor="#d4d4d4" stopOpacity="1" />
        </linearGradient>
      </defs>
      <path
        d={rows + columns}
        fill="none"
        stroke="url(#perspective-grid-fade)"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
