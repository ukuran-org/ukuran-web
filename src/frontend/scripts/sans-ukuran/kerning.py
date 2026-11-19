"""Derive kerning pairs from the glyph outlines.

For every candidate pair the horizontal gap between the two shapes is
sampled row by row. Pairs whose average gap is far from the gap between two
straight stems get a kerning value that pulls them towards it, without
letting the shapes come closer than a safe minimum anywhere.
"""

from metrics import CAP_HEIGHT, STRAIGHT_SIDE, X_HEIGHT

ROW_STEP = 10
# A row with more air than this counts as this much, so open shapes such as
# the arms of T do not dominate the average.
GAP_LIMIT = 260
REFERENCE_GAP = 2 * STRAIGHT_SIDE
STRENGTH = 0.6
MINIMUM_GAP = 50
LARGEST_KERN = 150
SMALLEST_KERN = 15

# Glyphs with open, slanted or pointed sides. Only pairs that involve at
# least one of them are kerned, so the spacing of other pairs stays in the
# side bearings.
OPEN_SHAPES = set("AFJKLPRTUVWXYfkrtuvwxy") | {".", ","}
CAPITALS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
LOWERCASE = "abcdefghijklmnopqrstuvwxyz"


def _crossings(contours, y):
    xs = []
    for points in contours:
        for (x0, y0), (x1, y1) in zip(points, points[1:] + points[:1]):
            if (y0 <= y < y1) or (y1 <= y < y0):
                xs.append(x0 + (y - y0) * (x1 - x0) / (y1 - y0))
    return xs


def profile(contours, top):
    """Leftmost and rightmost ink per sampled row, or None for empty rows."""
    rows = {}
    for y in range(ROW_STEP // 2, top, ROW_STEP):
        xs = _crossings(contours, y)
        rows[y] = (min(xs), max(xs)) if xs else None
    return rows


def pair_value(left_profile, left_advance, right_profile):
    gaps, touching = [], []
    for y, left_ink in left_profile.items():
        right_ink = right_profile.get(y)
        right_space = left_advance - left_ink[1] if left_ink else GAP_LIMIT
        left_space = right_ink[0] if right_ink else GAP_LIMIT
        gap = right_space + left_space
        if left_ink and right_ink:
            touching.append(gap)
        gaps.append(min(gap, GAP_LIMIT))
    average = sum(gaps) / len(gaps)
    value = (REFERENCE_GAP - average) * STRENGTH
    if touching:
        value = max(value, MINIMUM_GAP - min(touching))
    value = max(-LARGEST_KERN, min(value, 40))
    value = 5 * round(value / 5)
    return value if abs(value) >= SMALLEST_KERN else 0


def candidate_pairs():
    letters = CAPITALS + LOWERCASE
    for first in CAPITALS + LOWERCASE + ".,":
        for second in letters + ".,":
            if first in ".," and second in ".,":
                continue
            if first in LOWERCASE and second in CAPITALS:
                continue
            if first in OPEN_SHAPES or second in OPEN_SHAPES:
                yield first, second


def kerning_pairs(outlines, advances, glyph_name):
    profiles = {}
    pairs = {}
    for first, second in candidate_pairs():
        both_capitals = first in CAPITALS + ".," and second in CAPITALS + ".,"
        top = CAP_HEIGHT if both_capitals else X_HEIGHT
        for char in (first, second):
            key = (char, top)
            if key not in profiles:
                profiles[key] = profile(outlines[glyph_name(char)], top)
        value = pair_value(
            profiles[(first, top)], advances[glyph_name(first)], profiles[(second, top)])
        if value:
            pairs[(glyph_name(first), glyph_name(second))] = value
    return pairs


def kerning_feature(outlines, advances, glyph_name):
    """Return OpenType feature code with a kern feature for the pairs."""
    pairs = kerning_pairs(outlines, advances, glyph_name)
    lines = [
        "languagesystem DFLT dflt;",
        "languagesystem latn dflt;",
        "",
        "feature kern {",
    ]
    lines += [f"    pos {a} {b} {value};" for (a, b), value in sorted(pairs.items())]
    lines.append("} kern;")
    return "\n".join(lines) + "\n"
