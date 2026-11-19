"""Punctuation and symbols of printable ASCII.

Dots are squares, quotes and the exclamation mark taper like the logo's
inverted triangle, and brackets bend at hard angles.
"""

import pathops

from geometry import (
    OPEN, band, difference, mirrored, polygon, rect, ring, rotated_bar,
    slanted_width, union, zigzag,
)
from metrics import (
    ASCENDER, BAR, CAP_HEIGHT as CAP, DESCENDER, DIAGONAL, LOWER_BAR, STEM,
    X_HEIGHT as XH, glyph,
)
from uppercase import bowl, capital_s

DOT = 150
MATH_AXIS = 300  # vertical centre of operators such as + - = < >
MATH_BAR = 110
MATH_WIDTH = 600  # shared advance of + < = > ~
BRACKET_TOP = 800
BRACKET_BOTTOM = -140


def wedge(x, top, bottom, top_width=STEM + 10, bottom_width=60):
    """A downward tapering stroke, a slice of the logo's triangle."""
    inset = (top_width - bottom_width) / 2
    return polygon([
        (x, top), (x + top_width, top),
        (x + top_width - inset, bottom), (x + inset, bottom),
    ])


def comma_shape(x=0, top=DOT):
    return polygon([
        (x, top), (x + DOT, top), (x + DOT, 10),
        (x + 70, DESCENDER + 60), (x + 10, DESCENDER + 60), (x + 30, 0), (x, 0),
    ])


@glyph(" ")
def space():
    return pathops.Path()


@glyph("!")
def exclamation():
    return union(wedge(0, CAP, 230), rect(5, 0, 5 + DOT, DOT))


@glyph('"', left=60, right=60)
def double_quote():
    return union(wedge(0, CAP, 430), wedge(220, CAP, 430))


@glyph("'", left=60, right=60)
def quote():
    return wedge(0, CAP, 430)


@glyph("#", left=30, right=30)
def number_sign():
    width = 620
    stroke = slanted_width(80, CAP - 40, 120)
    return union(
        band(110, 0, 190, CAP - 40, stroke),
        band(width - 190 - stroke, 0, width - 110 - stroke, CAP - 40, stroke),
        rect(0, 430, width, 430 + MATH_BAR),
        rect(0, 160, width, 160 + MATH_BAR),
    )


@glyph("$", left=40, right=40)
def dollar():
    letter = capital_s()
    middle = 290
    stem = rect(middle - 45, -110, middle + 45, CAP + 110)
    return union(letter, stem)


@glyph("%", left=30, right=30)
def percent():
    small = dict(tl=60, tr=60, br=60, bl=60, bottom=90, right=100, top=90, left=100)
    upper = bowl(0, 380, 280, CAP, **small)
    lower = bowl(500, 0, 780, 320, **small)
    stroke = slanted_width(560, CAP, 120)
    slash = band(110, 0, 670 - stroke, CAP, stroke)
    return union(upper, lower, slash)


@glyph("&", left=40, right=10)
def ampersand():
    loop = bowl(70, 390, 400, CAP, tl=100, tr=100, br=90, bl=90,
                bottom=110, right=120, top=110, left=120)
    base = bowl(0, 0, 470, 430, tl=120, bl=150, br=0, right=OPEN, top=OPEN,
                bottom=BAR, left=STEM)
    leg_width = slanted_width(400, 500, DIAGONAL)
    leg = band(660 - leg_width, 0, 250, 500, leg_width)
    arm = rect(430, 250, 640, 250 + BAR)
    return union(loop, base, leg, arm)


@glyph("(", left=50, right=20)
def left_paren():
    width = 270
    return union(
        band(0, XH - 120, width - STEM, BRACKET_TOP, STEM),
        rect(0, 120, STEM, XH - 120 + 1),
        band(width - STEM, BRACKET_BOTTOM, 0, 120 - 1, STEM),
    )


@glyph(")", left=20, right=50)
def right_paren():
    width = 270
    return union(
        band(width - STEM, XH - 120, 0, BRACKET_TOP, STEM),
        rect(width - STEM, 120, width, XH - 120 + 1),
        band(0, BRACKET_BOTTOM, width - STEM, 120 - 1, STEM),
    )


@glyph("*", left=30, right=30)
def asterisk():
    cx, cy, length, thickness = 210, 540, 420, 100
    return union(*(rotated_bar(cx, cy, length, thickness, a) for a in (90, 30, 150)))


@glyph("+", advance=MATH_WIDTH)
def plus():
    size = 500
    return union(
        rect(0, MATH_AXIS - MATH_BAR / 2, size, MATH_AXIS + MATH_BAR / 2),
        rect((size - 120) / 2, MATH_AXIS - size / 2, (size + 120) / 2, MATH_AXIS + size / 2),
    )


@glyph(",", left=40, right=40)
def comma():
    return comma_shape()


@glyph("-", left=40, right=40)
def hyphen():
    return rect(0, 230, 300, 230 + BAR)


@glyph(".", left=40, right=40)
def period():
    return rect(0, 0, DOT, DOT)


@glyph("/", left=10, right=10)
def slash():
    width = 420
    stroke = slanted_width(width - 160, BRACKET_TOP - BRACKET_BOTTOM, 120)
    return band(0, BRACKET_BOTTOM, width - stroke, BRACKET_TOP, stroke)


@glyph(":", left=40, right=40)
def colon():
    return union(rect(0, 0, DOT, DOT), rect(0, XH - DOT, DOT, XH))


@glyph(";", left=40, right=40)
def semicolon():
    return union(comma_shape(), rect(0, XH - DOT, DOT, XH))


def angle_bracket(pointing_left):
    width, half = 470, 250
    tip_x = 0 if pointing_left else width
    back_x = width if pointing_left else 0
    points = [(tip_x, MATH_AXIS), (back_x, MATH_AXIS - half), (back_x, MATH_AXIS + half)]
    return ring(points, [120, OPEN, 120])


@glyph("<", advance=MATH_WIDTH)
def less():
    return angle_bracket(True)


@glyph("=", advance=MATH_WIDTH)
def equals():
    return union(
        rect(0, MATH_AXIS + 40, 500, MATH_AXIS + 40 + MATH_BAR),
        rect(0, MATH_AXIS - 40 - MATH_BAR, 500, MATH_AXIS - 40),
    )


@glyph(">", advance=MATH_WIDTH)
def greater():
    return angle_bracket(False)


@glyph("?", left=30, right=36)
def question():
    width = 500
    hook_bottom = 330
    stem_left = 170
    hook = bowl(0, hook_bottom, width, CAP, tl=150, tr=150, br=120, left=OPEN)
    hook = difference(hook, rect(-10, hook_bottom - 1, stem_left, CAP - BAR))
    return union(
        hook,
        rect(stem_left, 230, stem_left + STEM, hook_bottom + BAR),
        rect(stem_left, 0, stem_left + DOT, DOT),
    )


@glyph("@", left=40, right=40)
def at_sign():
    width, bottom, top = 880, -150, CAP
    outer = bowl(0, bottom, width, top, tl=230, tr=230, br=230, bl=230,
                 bottom=110, right=120, top=110, left=120, diagonal=115)
    outer = difference(outer, rect(560, bottom - 10, width + 10, 160))
    inner_left, inner_right = 230, 640
    inner = bowl(inner_left, 70, inner_right, 520, tl=130, bl=130,
                 bottom=110, right=130, top=110, left=130, diagonal=120)
    foot = rect(inner_right - 130, bottom, inner_right, 120)
    return union(outer, inner, foot)


@glyph("[", left=60, right=20)
def left_bracket():
    width = 270
    return union(
        rect(0, BRACKET_BOTTOM, STEM, BRACKET_TOP),
        rect(0, BRACKET_TOP - BAR, width, BRACKET_TOP),
        rect(0, BRACKET_BOTTOM, width, BRACKET_BOTTOM + BAR),
    )


@glyph("\\", left=10, right=10)
def backslash():
    width = 420
    stroke = slanted_width(width - 160, BRACKET_TOP - BRACKET_BOTTOM, 120)
    return band(width - stroke, BRACKET_BOTTOM, 0, BRACKET_TOP, stroke)


@glyph("]", left=20, right=60)
def right_bracket():
    width = 270
    return union(
        rect(width - STEM, BRACKET_BOTTOM, width, BRACKET_TOP),
        rect(0, BRACKET_TOP - BAR, width, BRACKET_TOP),
        rect(0, BRACKET_BOTTOM, width, BRACKET_BOTTOM + BAR),
    )


@glyph("^", left=30, right=30)
def circumflex():
    width = 480
    return ring([(0, 380), (width, 380), (width / 2, CAP + 10)], [OPEN, 120, 120])


@glyph("_", left=0, right=0)
def underscore():
    return rect(0, DESCENDER + 40, 560, DESCENDER + 40 + BAR)


@glyph("`", left=60, right=60)
def grave():
    return polygon([(0, ASCENDER + 40), (150, ASCENDER + 40), (230, 600), (110, 600)])


def brace(pointing_left):
    width, stem_left, middle = 320, 110, 330
    shape = union(
        rect(stem_left, middle + 60, stem_left + 130, BRACKET_TOP),
        rect(stem_left, BRACKET_TOP - BAR, width, BRACKET_TOP),
        rect(stem_left, BRACKET_BOTTOM, stem_left + 130, middle - 60),
        rect(stem_left, BRACKET_BOTTOM, width, BRACKET_BOTTOM + BAR),
        polygon([
            (0, middle), (stem_left + 1, middle - 150),
            (stem_left + 130, middle - 150), (stem_left + 130, middle + 150),
            (stem_left + 1, middle + 150),
        ]),
    )
    if pointing_left:
        return shape
    return mirrored(shape, width / 2)


@glyph("{", left=30, right=30)
def left_brace():
    return brace(True)


@glyph("|", left=80, right=80)
def vertical_bar():
    return rect(0, DESCENDER, 120, BRACKET_TOP)


@glyph("}", left=30, right=30)
def right_brace():
    return brace(False)


@glyph("~", advance=MATH_WIDTH)
def tilde():
    return zigzag([(0, 260), (160, 380), (340, 240), (500, 360)], LOWER_BAR)
