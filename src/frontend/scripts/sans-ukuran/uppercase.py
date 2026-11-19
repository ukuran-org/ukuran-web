"""Capital letters A to Z.

The capitals follow the logo: inverted triangles, flat horizontal cuts and
diagonal corner chamfers instead of curves. U narrows to a point and A has
no crossbar.
"""

from geometry import (
    OPEN, arm_and_leg, band, difference, frame, polygon, rect, ring,
    slanted_width, union,
)
from metrics import (
    ANGLED_SIDE, BAR, CAP_HEIGHT as CAP, CORNER, DIAGONAL, OVERSHOOT,
    POINTED_SIDE, STEM, glyph,
)

MIDDLE = 286  # bottom of the middle bar in B, E, F, H, P, R


def bowl(x0, y0, x1, y1, **corners):
    """A frame drawn with the capital stroke weights."""
    sides = dict(bottom=BAR, right=STEM, top=BAR, left=STEM, diagonal=DIAGONAL)
    for side in ("bottom", "right", "top", "left", "diagonal"):
        if side in corners:
            sides[side] = corners.pop(side)
    return frame(x0, y0, x1, y1, **sides, **corners)


def chevron(left, right, top, bottom, thickness=DIAGONAL):
    """A V shape: a downward triangle with its top left open."""
    middle = (left + right) / 2
    return ring(
        [(left, top), (middle, bottom), (right, top)],
        [thickness, thickness, OPEN],
    )


@glyph("A", left=POINTED_SIDE, right=POINTED_SIDE)
def capital_a():
    width = 660
    return ring(
        [(0, 0), (width, 0), (width / 2, CAP + OVERSHOOT)],
        [OPEN, DIAGONAL, DIAGONAL],
    )


@glyph("B", right=ANGLED_SIDE)
def capital_b():
    upper = bowl(0, MIDDLE, 540, CAP, tr=150, br=90)
    lower = bowl(0, 0, 580, MIDDLE + BAR, tr=90, br=170)
    return union(upper, lower)


@glyph("C", left=ANGLED_SIDE, right=24)
def capital_c():
    width = 600
    closed = bowl(0, 0, width, CAP, tl=CORNER, tr=CORNER, br=CORNER, bl=CORNER)
    return difference(closed, rect(width / 2, 200, width + 10, CAP - 200))


@glyph("D", right=ANGLED_SIDE)
def capital_d():
    return bowl(0, 0, 610, CAP, tr=240, br=240)


@glyph("E", right=36)
def capital_e():
    return union(
        rect(0, 0, STEM, CAP),
        rect(0, CAP - BAR, 500, CAP),
        rect(0, MIDDLE, 450, MIDDLE + BAR),
        rect(0, 0, 510, BAR),
    )


@glyph("F", right=30)
def capital_f():
    return union(
        rect(0, 0, STEM, CAP),
        rect(0, CAP - BAR, 490, CAP),
        rect(0, MIDDLE - 10, 440, MIDDLE + BAR - 10),
    )


@glyph("G", left=ANGLED_SIDE)
def capital_g():
    width = 620
    closed = bowl(0, 0, width, CAP, tl=CORNER, tr=CORNER, br=CORNER, bl=CORNER)
    bar_top = 400
    opened = difference(closed, rect(width / 2, bar_top, width + 10, CAP - 230))
    return union(opened, rect(310, bar_top - BAR, width, bar_top))


@glyph("H")
def capital_h():
    width = 610
    return union(
        rect(0, 0, STEM, CAP),
        rect(width - STEM, 0, width, CAP),
        rect(0, MIDDLE, width, MIDDLE + BAR),
    )


@glyph("I")
def capital_i():
    return rect(0, 0, STEM, CAP)


@glyph("J", left=30)
def capital_j():
    width = 520
    hook = bowl(0, 0, width, CAP, bl=110, br=170, top=OPEN)
    return difference(hook, rect(-10, 290, width - STEM, CAP + 10))


@glyph("K", right=POINTED_SIDE)
def capital_k():
    width = 630
    return union(
        rect(0, 0, STEM, CAP),
        arm_and_leg(STEM, width, CAP, junction=170, thickness=DIAGONAL, leg_start=210),
    )


@glyph("L", right=26)
def capital_l():
    return union(rect(0, 0, STEM, CAP), rect(0, 0, 480, BAR))


@glyph("M")
def capital_m():
    width = 780
    return union(
        rect(0, 0, STEM, CAP),
        rect(width - STEM, 0, width, CAP),
        chevron(0, width, CAP, 110),
    )


@glyph("N")
def capital_n():
    width = 630
    diagonal_width = slanted_width(width - 2 * STEM, CAP, DIAGONAL) + 20
    return union(
        rect(0, 0, STEM, CAP),
        rect(width - STEM, 0, width, CAP),
        polygon([
            (0, CAP), (diagonal_width, CAP),
            (width, 0), (width - diagonal_width, 0),
        ]),
    )


@glyph("O", left=ANGLED_SIDE, right=ANGLED_SIDE)
def capital_o():
    return bowl(0, 0, 640, CAP, tl=200, tr=200, br=200, bl=200)


@glyph("P", right=ANGLED_SIDE)
def capital_p():
    return union(
        rect(0, 0, STEM, CAP),
        bowl(0, MIDDLE - 30, 570, CAP, tr=190, br=150),
    )


@glyph("Q", left=ANGLED_SIDE, right=POINTED_SIDE)
def capital_q():
    width = 640
    body = bowl(0, 0, width, CAP, tl=200, tr=200, br=200, bl=200)
    tail = band(380, 300, 560, -120, 170)
    return union(body, tail)


@glyph("R", right=POINTED_SIDE)
def capital_r():
    width = 600
    top = bowl(0, MIDDLE - 10, 570, CAP, tr=190, br=130)
    leg_width = slanted_width(width - 340, MIDDLE + 50, DIAGONAL)
    leg = band(width - leg_width, 0, 340 - leg_width / 2, MIDDLE + 50, leg_width)
    return union(rect(0, 0, STEM, CAP), top, leg)


@glyph("S", left=ANGLED_SIDE, right=ANGLED_SIDE)
def capital_s():
    width = 580
    middle = 290
    upper = bowl(0, middle, width, CAP, tl=CORNER, bl=110, right=OPEN)
    lower = bowl(0, 0, width, middle + BAR, br=CORNER, left=OPEN)
    return union(upper, lower)


@glyph("T", left=20, right=20)
def capital_t():
    width = 600
    return union(
        rect(0, CAP - BAR, width, CAP),
        rect((width - STEM) / 2, 0, (width + STEM) / 2, CAP),
    )


@glyph("U", left=44, right=44)
def capital_u():
    # Straight sides that narrow into a near point at the baseline, like a
    # shield. The long straight sides keep it distinct from V.
    width = 600
    knee = 260
    base = 24
    middle = width / 2
    return ring(
        [(0, CAP), (0, knee), (middle - base, 0), (middle + base, 0), (width, knee), (width, CAP)],
        [STEM, DIAGONAL, BAR, DIAGONAL, STEM, OPEN],
    )


@glyph("V", left=POINTED_SIDE, right=POINTED_SIDE)
def capital_v():
    return chevron(0, 660, CAP, -OVERSHOOT)


@glyph("W", left=POINTED_SIDE, right=POINTED_SIDE)
def capital_w():
    width = 960
    span = 570
    return union(
        chevron(0, span, CAP, -OVERSHOOT, DIAGONAL - 10),
        chevron(width - span, width, CAP, -OVERSHOOT, DIAGONAL - 10),
    )


@glyph("X", left=POINTED_SIDE + 4, right=POINTED_SIDE + 4)
def capital_x():
    width = 640
    stroke = slanted_width(width - 180, CAP, DIAGONAL)
    return union(
        band(0, 0, width - stroke, CAP, stroke),
        band(width - stroke, 0, 0, CAP, stroke),
    )


@glyph("Y", left=POINTED_SIDE, right=POINTED_SIDE)
def capital_y():
    width = 660
    middle = width / 2
    return union(
        chevron(0, width, CAP, 250),
        rect(middle - STEM / 2, 0, middle + STEM / 2, 330),
    )


@glyph("Z", left=36, right=36)
def capital_z():
    width = 580
    stroke = slanted_width(width - 180, CAP - 2 * BAR, DIAGONAL)
    return union(
        rect(0, CAP - BAR, width, CAP),
        rect(0, 0, width, BAR),
        band(0, BAR, width - stroke, CAP - BAR, stroke),
    )
