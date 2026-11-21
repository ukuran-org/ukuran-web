# Sans Ukuran

Build tooling for **Sans Ukuran**, the heavy display face reserved for the
UKURAN wordmark. Every glyph is a set of straight-edged polygons defined
in code, so the font follows the angular geometry of the logo.

## Rebuild

```sh
cd src/frontend/scripts/sans-ukuran
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python build.py
```

The build writes `assets/fonts/SansUkuran-Bold.ttf` and
`assets/fonts/SansUkuran-Bold.woff2` at the repository root. Pass
`--output <dir>` to write somewhere else. Builds are deterministic, so an
unchanged source produces byte-identical files. Use a virtual environment with
only the pinned requirements: if `uharfbuzz` is installed, fontTools packs the
GPOS table with it, which gives an equivalent font with different bytes.

## Layout

| File | Contents |
| --- | --- |
| `metrics.py` | Vertical metrics, stroke weights, side bearings and the glyph registry |
| `geometry.py` | Polygon primitives: frames with chamfered corners, slanted strokes, boolean operations |
| `uppercase.py` | A to Z |
| `lowercase.py` | a to z |
| `figures.py` | Tabular figures 0 to 9 |
| `punctuation.py` | Space and the remaining printable ASCII symbols |
| `kerning.py` | Kerning pairs derived from the outlines |
| `build.py` | Assembles the font tables and saves the TTF and WOFF2 files |

Each glyph function returns a path that starts near x = 0. The builder removes
overlaps, makes outer contours clockwise as TrueType expects, rounds to whole
units and applies the side bearings from the `@glyph` decorator.

## Design rules

- Units per em 1000, cap height 700, x-height 520, ascender 740, descender -200.
- Only straight lines. Round letters are octagons with diagonal corner cuts.
- `U` is drawn like `V`, two straight diagonals meeting in a point. Lowercase
  `u` keeps straight sides and then narrows to a near point.
- `R` is the one exception to straight lines: a classic R with a round bowl
  and the same leg as `K`.
- `N` is a classic N. Its diagonal runs from the flat top of the left stem to
  the flat foot of the right stem and joins both flush.
- `A` has no crossbar.
- Lowercase letters are single storey.

## Kerning

`kerning.py` samples the gap between two glyphs row by row and moves pairs
towards the gap between two straight stems. Only pairs where at least one
glyph has an open or slanted side are kerned, and no pair may come closer
than 50 units at any height.

## License

Copyright 2026 Ukuran. All rights reserved.
