"""Tabular figures 0 to 9, all sharing one advance width."""

from geometry import (
    OPEN, band, difference, polygon, rect, ring, rotated_half_turn,
    slanted_width, union,
)
from metrics import BAR, CAP_HEIGHT as CAP, DIAGONAL, FIGURE_WIDTH, STEM, glyph
from uppercase import bowl

WIDTH = 540
CORNER = 170


def figure(chars):
    return glyph(chars, advance=FIGURE_WIDTH)


@figure("0")
def zero():
    return bowl(0, 0, WIDTH, CAP, tl=CORNER, tr=CORNER, br=CORNER, bl=CORNER)


@figure("1")
def one():
    stem_left = 170
    flag = polygon([
        (stem_left + 1, CAP), (0, CAP - 150), (0, CAP - 285), (stem_left + 1, CAP - 135),
    ])
    return union(rect(stem_left, 0, stem_left + STEM, CAP), flag)


@figure("2")
def two():
    hook_bottom = 360
    hook = bowl(0, hook_bottom, WIDTH, CAP, tl=CORNER, tr=CORNER,
                bottom=OPEN, left=OPEN)
    stroke = slanted_width(WIDTH - STEM, hook_bottom - BAR, DIAGONAL)
    spine = band(0, BAR - 1, WIDTH - stroke, hook_bottom + 1, stroke)
    return union(hook, spine, rect(0, 0, WIDTH, BAR))


@figure("3")
def three():
    middle = 290
    upper = bowl(0, middle, WIDTH - 30, CAP, tr=CORNER, br=90, left=OPEN)
    lower = bowl(0, 0, WIDTH, middle + BAR, tr=90, br=CORNER, left=OPEN)
    return difference(union(upper, lower), rect(-10, middle - 1, 150, middle + BAR + 1))


@figure("4")
def four():
    stem_right = WIDTH - 50
    bar_bottom = 170
    wedge = ring(
        [(0, bar_bottom), (stem_right, bar_bottom), (stem_right, CAP)],
        [BAR, STEM, DIAGONAL],
    )
    return union(
        wedge,
        rect(stem_right - STEM, 0, stem_right, CAP),
        rect(0, bar_bottom, WIDTH, bar_bottom + BAR),
    )


@figure("5")
def five():
    bowl_top = 440
    return union(
        rect(0, CAP - BAR, WIDTH - 20, CAP),
        rect(0, bowl_top - BAR, STEM, CAP),
        bowl(0, 0, WIDTH, bowl_top, tr=CORNER - 20, br=CORNER, bl=110, left=OPEN),
    )


@figure("6")
def six():
    bowl_top = 450
    return union(
        bowl(0, 0, WIDTH, bowl_top, tl=130, tr=130, br=CORNER - 20, bl=CORNER - 20),
        bowl(0, 200, WIDTH - 20, CAP, tl=CORNER, right=OPEN, bottom=OPEN),
    )


@figure("7")
def seven():
    stroke = slanted_width(WIDTH - 140, CAP - BAR, DIAGONAL)
    return union(
        rect(0, CAP - BAR, WIDTH, CAP),
        band(80, 0, WIDTH - stroke, CAP - BAR + 1, stroke),
    )


@figure("8")
def eight():
    middle = 300
    return union(
        bowl(30, middle, WIDTH - 30, CAP, tl=130, tr=130, br=90, bl=90),
        bowl(0, 0, WIDTH, middle + BAR, tl=90, tr=90, br=CORNER - 10, bl=CORNER - 10),
    )


@figure("9")
def nine():
    return rotated_half_turn(six(), WIDTH / 2, CAP / 2)
