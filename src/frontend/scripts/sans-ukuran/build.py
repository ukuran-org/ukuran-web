"""Build the Sans Ukuran display font from the polygon glyph definitions.

Run from any directory:

    python build.py

Writes SansUkuran-Bold.ttf and SansUkuran-Bold.woff2 to assets/fonts at the
repository root.
"""

import argparse
from pathlib import Path

import pathops
from fontTools.agl import UV2AGL
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
from fontTools.fontBuilder import FontBuilder
from fontTools.misc.timeTools import timestampFromString
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import newTable
from fontTools.ttLib.tables.O_S_2f_2 import Panose
from fontTools.ttLib.tables.ttProgram import Program

import figures  # noqa: F401  registers the figures
import lowercase  # noqa: F401  registers the lowercase letters
import punctuation  # noqa: F401  registers punctuation and symbols
import uppercase  # noqa: F401  registers the capitals
from geometry import difference, rect
from kerning import kerning_feature
from metrics import (
    ASCENDER, CAP_HEIGHT, DESCENDER, GLYPHS, LINE_ASCENT, LINE_DESCENT,
    LINE_GAP, SPACE_WIDTH, UNITS_PER_EM, X_HEIGHT,
)

REPOSITORY = Path(__file__).resolve().parents[4]
OUTPUT_DIRECTORY = REPOSITORY / "assets" / "fonts"

FAMILY = "Sans Ukuran"
STYLE = "Bold"
POSTSCRIPT_NAME = "SansUkuran-Bold"
VERSION = "1.000"
COPYRIGHT = "Copyright 2026 Ukuran. All rights reserved."
LICENSE = (
    "Copyright 2026 Ukuran. All rights reserved. No permission is granted to "
    "use, copy, modify or distribute this font outside Ukuran products "
    "without written consent from Ukuran."
)
# Fixed timestamp so repeated builds produce identical files.
BUILD_TIME = timestampFromString("Thu Nov 19 00:00:00 2026")

PRINTABLE_ASCII = [chr(code) for code in range(0x20, 0x7F)]


def glyph_name(char):
    return UV2AGL[ord(char)]


def contours(path):
    """Return the outline as a list of point lists, rounded to whole units."""
    recording = RecordingPen()
    path.draw(recording)
    result, current = [], []
    for operator, operands in recording.value:
        if operator == "moveTo":
            current = [operands[0]]
        elif operator == "lineTo":
            current.append(operands[0])
        elif operator in ("closePath", "endPath"):
            points = [(round(x), round(y)) for x, y in current]
            # Drop repeated points that rounding can create.
            cleaned = [p for i, p in enumerate(points) if p != points[i - 1]]
            if len(cleaned) >= 3:
                result.append(cleaned)
            current = []
        else:
            raise ValueError(f"Unexpected curve segment {operator}")
    return result


def place(spec):
    """Draw a glyph, clean its outline and apply side bearings.

    Returns the contours in final position and the advance width.
    """
    outline = spec.draw()
    # Remove overlaps and use clockwise outer contours as TrueType expects.
    outline = pathops.simplify(outline, clockwise=True)
    if not list(outline.contours):
        return [], SPACE_WIDTH
    x_min, _, x_max, _ = outline.bounds
    if spec.advance is not None:
        shift = (spec.advance - (x_max - x_min)) / 2 - x_min
        advance = spec.advance
    else:
        shift = spec.left - x_min
        advance = round(spec.left + (x_max - x_min) + spec.right)
    outline = outline.transform(1, 0, 0, 1, round(shift), 0)
    return contours(outline), advance


def notdef():
    outer = rect(0, 0, 500, CAP_HEIGHT)
    return contours(pathops.simplify(
        difference(outer, rect(70, 70, 430, CAP_HEIGHT - 70)), clockwise=True))


def tt_glyph(glyph_contours):
    pen = TTGlyphPen(None)
    for points in glyph_contours:
        pen.moveTo(points[0])
        for point in points[1:]:
            pen.lineTo(point)
        pen.closePath()
    return pen.glyph()


def build(output_directory):
    order = [".notdef"]
    cmap = {}
    outlines = {".notdef": notdef()}
    advances = {".notdef": 600}
    for char in PRINTABLE_ASCII:
        name = glyph_name(char)
        outlines[name], advances[name] = place(GLYPHS[char])
        order.append(name)
        cmap[ord(char)] = name
    # The no-break space shares the space glyph.
    cmap[0x00A0] = glyph_name(" ")

    builder = FontBuilder(UNITS_PER_EM, isTTF=True)
    builder.setupGlyphOrder(order)
    builder.setupCharacterMap(cmap)
    glyphs = {name: tt_glyph(outlines[name]) for name in order}
    builder.setupGlyf(glyphs)
    glyf = builder.font["glyf"]
    metrics = {}
    for name in order:
        glyph = glyf[name]
        glyph.recalcBounds(glyf)
        left = glyph.xMin if glyph.numberOfContours else 0
        metrics[name] = (advances[name], left)
    builder.setupHorizontalMetrics(metrics)
    builder.setupHorizontalHeader(ascent=LINE_ASCENT, descent=LINE_DESCENT, lineGap=LINE_GAP)
    builder.setupNameTable({
        "copyright": COPYRIGHT,
        "familyName": FAMILY,
        "styleName": STYLE,
        "uniqueFontIdentifier": f"{VERSION};UKRN;{POSTSCRIPT_NAME}",
        "fullName": f"{FAMILY} {STYLE}",
        "version": f"Version {VERSION}",
        "psName": POSTSCRIPT_NAME,
        "manufacturer": "Ukuran",
        "designer": "Ukuran",
        "licenseDescription": LICENSE,
    }, mac=False)
    builder.setupOS2(
        version=4,
        achVendID="UKRN",
        usWeightClass=700,
        usWidthClass=5,
        fsType=0,
        # Bold style bit plus USE_TYPO_METRICS.
        fsSelection=(1 << 5) | (1 << 7),
        sTypoAscender=LINE_ASCENT,
        sTypoDescender=LINE_DESCENT,
        sTypoLineGap=LINE_GAP,
        usWinAscent=LINE_ASCENT,
        usWinDescent=-LINE_DESCENT,
        sxHeight=X_HEIGHT,
        sCapHeight=CAP_HEIGHT,
        usDefaultChar=0,
        usBreakChar=32,
        usMaxContext=2,
        ulUnicodeRange1=1,  # Basic Latin
        ulCodePageRange1=1,  # Latin 1
        panose=_bold_panose(),
    )
    builder.setupPost(underlinePosition=-120, underlineThickness=90)
    gasp = newTable("gasp")
    gasp.version = 1
    # Smooth rendering with grid fitting at every size.
    gasp.gaspRange = {0xFFFF: 0x000F}
    builder.font["gasp"] = gasp
    prep = newTable("prep")
    # Smart dropout control keeps thin diagonal joins from vanishing at small sizes.
    prep.program = Program()
    prep.program.fromAssembly(["PUSHW[ ]", "511", "SCANCTRL[ ]", "PUSHB[ ]", "4", "SCANTYPE[ ]"])
    builder.font["prep"] = prep
    builder.updateHead(
        fontRevision=float(VERSION),
        macStyle=1,  # bold
        created=BUILD_TIME,
        modified=BUILD_TIME,
    )
    font = builder.font
    font["OS/2"].recalcAvgCharWidth(font)
    addOpenTypeFeaturesFromString(font, kerning_feature(outlines, advances, glyph_name))

    _check_metrics(font)
    output_directory.mkdir(parents=True, exist_ok=True)
    font.recalcTimestamp = False
    ttf_path = output_directory / f"{POSTSCRIPT_NAME}.ttf"
    font.save(ttf_path)
    font.flavor = "woff2"
    font.save(output_directory / f"{POSTSCRIPT_NAME}.woff2")
    return ttf_path


def _bold_panose():
    panose = Panose()
    panose.bFamilyType = 2  # Latin text
    panose.bSerifStyle = 11  # normal sans
    panose.bWeight = 8  # bold
    panose.bProportion = 3  # modern
    return panose


def _check_metrics(font):
    glyf = font["glyf"]
    y_max = max(glyf[name].yMax for name in font.getGlyphOrder() if glyf[name].numberOfContours)
    y_min = min(glyf[name].yMin for name in font.getGlyphOrder() if glyf[name].numberOfContours)
    if y_max > LINE_ASCENT or y_min < LINE_DESCENT:
        raise SystemExit(f"Ink from {y_min} to {y_max} exceeds the line metrics")
    if ASCENDER > LINE_ASCENT or DESCENDER < LINE_DESCENT:
        raise SystemExit("Ascender or descender exceeds the line metrics")


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--output", type=Path, default=OUTPUT_DIRECTORY,
        help="directory for the TTF and WOFF2 files (default: assets/fonts)",
    )
    args = parser.parse_args()
    path = build(args.output)
    print(f"Wrote {path} and its WOFF2 sibling")


if __name__ == "__main__":
    main()
