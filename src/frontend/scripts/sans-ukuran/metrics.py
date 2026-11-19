"""Vertical metrics, stroke weights and the glyph registry for Sans Ukuran."""

UNITS_PER_EM = 1000

CAP_HEIGHT = 700
X_HEIGHT = 520
ASCENDER = 740
DESCENDER = -200

# Line metrics shared by hhea and OS/2 so every platform lays out lines alike.
LINE_ASCENT = 920
LINE_DESCENT = -260
LINE_GAP = 0

# How far pointed apexes reach past the baseline or cap height so they look
# as tall as flat edges.
OVERSHOOT = 14

# Capital strokes.
STEM = 150
BAR = 128
DIAGONAL = 150
CORNER = 190

# Lowercase strokes.
LOWER_STEM = 136
LOWER_BAR = 116
LOWER_DIAGONAL = 136
LOWER_CORNER = 150

# Default side bearings for straight, angled and pointed sides.
STRAIGHT_SIDE = 52
ANGLED_SIDE = 40
POINTED_SIDE = 16

SPACE_WIDTH = 260
FIGURE_WIDTH = 620


class GlyphSpec:
    def __init__(self, char, draw, left, right, advance):
        self.char = char
        self.draw = draw
        self.left = left
        self.right = right
        self.advance = advance


GLYPHS = {}


def glyph(chars, left=STRAIGHT_SIDE, right=STRAIGHT_SIDE, advance=None):
    """Register a drawing function for one or more characters.

    The function returns a path whose ink starts near x = 0. The builder
    shifts it by the left side bearing and adds the right one. With a fixed
    advance the ink is centred instead.
    """

    def register(draw):
        for char in chars:
            GLYPHS[char] = GlyphSpec(char, draw, left, right, advance)
        return draw

    return register
