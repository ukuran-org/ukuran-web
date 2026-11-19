"""Lowercase letters a to z.

Single storey forms that reuse the capital construction at x-height: a is a
closed angular bowl on a stem, u narrows to a point like its capital.
"""

from geometry import (
    OPEN, arm_and_leg, band, difference, frame, polygon, rect, ring,
    slanted_width, union,
)
from metrics import (
    ANGLED_SIDE, ASCENDER, DESCENDER, LOWER_BAR as BAR, LOWER_CORNER as CORNER,
    LOWER_DIAGONAL as DIAGONAL, LOWER_STEM as STEM, OVERSHOOT, POINTED_SIDE,
    X_HEIGHT as XH, glyph,
)

BOWL_WIDTH = 490


def bowl(x0, y0, x1, y1, **corners):
    """A frame drawn with the lowercase stroke weights."""
    sides = dict(bottom=BAR, right=STEM, top=BAR, left=STEM, diagonal=DIAGONAL)
    for side in ("bottom", "right", "top", "left", "diagonal"):
        if side in corners:
            sides[side] = corners.pop(side)
    return frame(x0, y0, x1, y1, **sides, **corners)


def chevron(left, right, top, bottom, thickness=DIAGONAL):
    middle = (left + right) / 2
    return ring(
        [(left, top), (middle, bottom), (right, top)],
        [thickness, thickness, OPEN],
    )


def arch(x0, x1):
    """The shoulder of n, h and m: a frame open at the bottom."""
    return bowl(x0, 0, x1, XH, tr=CORNER, bottom=OPEN)


@glyph("a", left=ANGLED_SIDE)
def lower_a():
    return bowl(0, 0, BOWL_WIDTH, XH, tl=CORNER + 30, bl=CORNER + 30)


@glyph("b", right=ANGLED_SIDE)
def lower_b():
    return union(
        rect(0, 0, STEM, ASCENDER),
        bowl(0, 0, BOWL_WIDTH, XH, tr=CORNER, br=CORNER),
    )


@glyph("c", left=ANGLED_SIDE, right=24)
def lower_c():
    width = 460
    closed = bowl(0, 0, width, XH, tl=CORNER, tr=CORNER, br=CORNER, bl=CORNER)
    return difference(closed, rect(width / 2, 160, width + 10, XH - 160))


@glyph("d", left=ANGLED_SIDE)
def lower_d():
    return union(
        rect(BOWL_WIDTH - STEM, 0, BOWL_WIDTH, ASCENDER),
        bowl(0, 0, BOWL_WIDTH, XH, tl=CORNER, bl=CORNER),
    )


@glyph("e", left=ANGLED_SIDE, right=30)
def lower_e():
    width = 490
    bar_bottom = 220
    closed = bowl(0, 0, width, XH, tl=CORNER, tr=CORNER, br=CORNER, bl=CORNER)
    crossed = union(closed, rect(0, bar_bottom, width, bar_bottom + BAR))
    return difference(crossed, rect(width / 2, BAR, width + 10, bar_bottom))


@glyph("f", left=30, right=10)
def lower_f():
    stem_left = 70
    return union(
        bowl(stem_left, 0, 340, ASCENDER, tl=CORNER, right=OPEN, bottom=OPEN),
        rect(0, XH - BAR, 320, XH),
    )


@glyph("g", left=ANGLED_SIDE)
def lower_g():
    width = BOWL_WIDTH
    tail = bowl(0, DESCENDER, width, 60, br=CORNER, bl=90, top=OPEN, left=OPEN)
    return union(
        bowl(0, 0, width, XH, tl=CORNER + 30, bl=CORNER + 30),
        tail,
    )


@glyph("h")
def lower_h():
    return union(rect(0, 0, STEM, ASCENDER), arch(0, BOWL_WIDTH))


@glyph("i")
def lower_i():
    return union(rect(0, 0, STEM, XH), rect(0, XH + 90, STEM, ASCENDER))


@glyph("j", left=10)
def lower_j():
    hook_left = 0
    stem_left = 150
    hook = bowl(hook_left, DESCENDER, stem_left + STEM, XH,
                bl=90, top=OPEN, left=OPEN)
    return union(hook, rect(stem_left, XH + 90, stem_left + STEM, ASCENDER))


@glyph("k", right=POINTED_SIDE)
def lower_k():
    width = 500
    return union(
        rect(0, 0, STEM, ASCENDER),
        arm_and_leg(STEM, width, XH, junction=120, thickness=DIAGONAL, leg_start=160),
    )


@glyph("l", right=30)
def lower_l():
    return union(rect(0, 0, STEM, ASCENDER), rect(0, 0, STEM + 90, BAR))


@glyph("m")
def lower_m():
    middle = 420
    return union(
        rect(0, 0, STEM, XH),
        arch(0, middle),
        arch(middle - STEM, 2 * middle - STEM),
    )


@glyph("n")
def lower_n():
    return union(rect(0, 0, STEM, XH), arch(0, BOWL_WIDTH))


@glyph("o", left=ANGLED_SIDE, right=ANGLED_SIDE)
def lower_o():
    return bowl(0, 0, 510, XH, tl=CORNER, tr=CORNER, br=CORNER, bl=CORNER)


@glyph("p", right=ANGLED_SIDE)
def lower_p():
    return union(
        rect(0, DESCENDER, STEM, XH),
        bowl(0, 0, BOWL_WIDTH, XH, tr=CORNER, br=CORNER),
    )


@glyph("q", left=ANGLED_SIDE)
def lower_q():
    return union(
        rect(BOWL_WIDTH - STEM, DESCENDER, BOWL_WIDTH, XH),
        bowl(0, 0, BOWL_WIDTH, XH, tl=CORNER, bl=CORNER),
    )


@glyph("r", right=10)
def lower_r():
    return union(
        rect(0, 0, STEM, XH),
        polygon([(0, XH - BAR), (270, XH - BAR), (340, XH), (0, XH)]),
    )


@glyph("s", left=ANGLED_SIDE - 6, right=ANGLED_SIDE - 6)
def lower_s():
    width = 450
    middle = 206
    upper = bowl(0, middle, width, XH, tl=CORNER, bl=90, right=OPEN)
    lower = bowl(0, 0, width, middle + BAR, br=CORNER, left=OPEN)
    return union(upper, lower)


@glyph("t", left=24, right=20)
def lower_t():
    stem_left = 70
    return union(
        polygon([
            (stem_left, 0), (stem_left + STEM, 0),
            (stem_left + STEM, 690), (stem_left, 620),
        ]),
        rect(0, XH - BAR, 330, XH),
        rect(stem_left, 0, stem_left + STEM + 90, BAR),
    )


@glyph("u", left=40, right=40)
def lower_u():
    # Taller straight sides and a narrow flat base than the capital, so the
    # letter stays distinct from v at text sizes.
    width = 490
    knee = 150
    base = 40
    middle = width / 2
    return ring(
        [(0, XH), (0, knee), (middle - base, 0), (middle + base, 0), (width, knee), (width, XH)],
        [STEM, DIAGONAL, BAR, DIAGONAL, STEM, OPEN],
    )


@glyph("v", left=POINTED_SIDE, right=POINTED_SIDE)
def lower_v():
    return chevron(0, 520, XH, -OVERSHOOT)


@glyph("w", left=POINTED_SIDE, right=POINTED_SIDE)
def lower_w():
    width = 780
    span = 450
    return union(
        chevron(0, span, XH, -OVERSHOOT, DIAGONAL - 8),
        chevron(width - span, width, XH, -OVERSHOOT, DIAGONAL - 8),
    )


@glyph("x", left=POINTED_SIDE + 4, right=POINTED_SIDE + 4)
def lower_x():
    width = 500
    stroke = slanted_width(width - 150, XH, DIAGONAL)
    return union(
        band(0, 0, width - stroke, XH, stroke),
        band(width - stroke, 0, 0, XH, stroke),
    )


@glyph("y", left=POINTED_SIDE, right=POINTED_SIDE)
def lower_y():
    width = 520
    middle = width / 2
    slope = middle / (XH + OVERSHOOT)
    tail_x = middle - slope * (-DESCENDER - OVERSHOOT)
    arm_width = slanted_width(middle, XH, DIAGONAL)
    tail = polygon([
        (tail_x - arm_width, DESCENDER), (tail_x, DESCENDER),
        (width, XH), (width - arm_width, XH),
    ])
    return union(chevron(0, width, XH, -OVERSHOOT), tail)


@glyph("z", left=32, right=32)
def lower_z():
    width = 450
    stroke = slanted_width(width - 150, XH - 2 * BAR, DIAGONAL)
    return union(
        rect(0, XH - BAR, width, XH),
        rect(0, 0, width, BAR),
        band(0, BAR, width - stroke, XH - BAR, stroke),
    )
