"""Polygon primitives used to draw the Sans Ukuran glyphs.

Every shape is a skia-pathops Path built from straight line segments only.
Coordinates are font units with the y axis pointing up and the baseline at 0.
"""

import math

import pathops

# Thickness value that pushes a side of a frame far outside the shape,
# which leaves that side of the counter open.
OPEN = -5000.0

_BIG = 1.0e5


def polygon(points):
    """Return a closed path through the given (x, y) points."""
    path = pathops.Path()
    path.moveTo(*points[0])
    for point in points[1:]:
        path.lineTo(*point)
    path.close()
    return path


def union(*paths):
    result = pathops.Path()
    for path in paths:
        result = pathops.op(result, path, pathops.PathOp.UNION)
    return result


def difference(base, *cutters):
    result = base
    for cutter in cutters:
        result = pathops.op(result, cutter, pathops.PathOp.DIFFERENCE)
    return result


def intersection(base, clip):
    return pathops.op(base, clip, pathops.PathOp.INTERSECTION)


def rect(x0, y0, x1, y1):
    return polygon([(x0, y0), (x1, y0), (x1, y1), (x0, y1)])


def transformed(path, xx=1, xy=0, yx=0, yy=1, dx=0, dy=0):
    """Return a copy of the path under an affine transform."""
    return path.transform(xx, xy, yx, yy, dx, dy)


def mirrored(path, axis_x):
    """Mirror a path horizontally around the vertical line x = axis_x."""
    return transformed(path, xx=-1, dx=2 * axis_x)


def rotated_half_turn(path, center_x, center_y):
    """Rotate a path by 180 degrees around the given centre."""
    return transformed(path, xx=-1, yy=-1, dx=2 * center_x, dy=2 * center_y)


def signed_area(points):
    area = 0.0
    for (x0, y0), (x1, y1) in zip(points, points[1:] + points[:1]):
        area += x0 * y1 - x1 * y0
    return area / 2


def counter_clockwise(points):
    return points if signed_area(points) > 0 else points[::-1]


def _clip_half_plane(points, origin, normal):
    """Keep the part of a convex polygon where (p - origin) . normal >= 0."""

    def side(p):
        return (p[0] - origin[0]) * normal[0] + (p[1] - origin[1]) * normal[1]

    kept = []
    for current, following in zip(points, points[1:] + points[:1]):
        a, b = side(current), side(following)
        if a >= 0:
            kept.append(current)
        if (a >= 0) != (b >= 0):
            t = a / (a - b)
            kept.append((
                current[0] + t * (following[0] - current[0]),
                current[1] + t * (following[1] - current[1]),
            ))
    return kept


def inset(points, thicknesses):
    """Offset each edge of a convex polygon inwards by its own thickness.

    The polygon must be counter clockwise. Edge i runs from points[i] to
    points[i + 1]. The result is the intersection of the offset half planes,
    so edges that collapse simply disappear instead of folding over.
    """
    region = [(-_BIG, -_BIG), (_BIG, -_BIG), (_BIG, _BIG), (-_BIG, _BIG)]
    for (x0, y0), (x1, y1), thickness in zip(points, points[1:] + points[:1], thicknesses):
        length = math.hypot(x1 - x0, y1 - y0)
        normal = (-(y1 - y0) / length, (x1 - x0) / length)
        origin = (x0 + normal[0] * thickness, y0 + normal[1] * thickness)
        region = _clip_half_plane(region, origin, normal)
        if not region:
            break
    return region


def ring(points, thicknesses):
    """A convex outline minus its inset counter."""
    if signed_area(points) < 0:
        points = points[::-1]
        thicknesses = thicknesses[-2::-1] + thicknesses[-1:]
    counter = inset(points, thicknesses)
    shape = polygon(points)
    if len(counter) >= 3:
        shape = difference(shape, polygon(counter))
    return shape


def _chamfer_size(value):
    if isinstance(value, (tuple, list)):
        return value
    return (value, value)


def chamfered_box(x0, y0, x1, y1, tl=0, tr=0, br=0, bl=0):
    """Corner points and edge kinds of a box with diagonally cut corners.

    A chamfer is either one number for a 45 degree cut or a pair giving the
    horizontal and vertical extent of the cut.
    Returns (points, kinds) in counter clockwise order. Kinds are the side
    names "bottom", "right", "top", "left" or the corner names for cuts.
    """
    points, kinds = [], []
    blx, bly = _chamfer_size(bl)
    brx, bry = _chamfer_size(br)
    trx, try_ = _chamfer_size(tr)
    tlx, tly = _chamfer_size(tl)
    corners = [
        ("bl", (blx, bly), (x0, y0 + bly), (x0 + blx, y0), (x0, y0)),
        ("br", (brx, bry), (x1 - brx, y0), (x1, y0 + bry), (x1, y0)),
        ("tr", (trx, try_), (x1, y1 - try_), (x1 - trx, y1), (x1, y1)),
        ("tl", (tlx, tly), (x0 + tlx, y1), (x0, y1 - tly), (x0, y1)),
    ]
    sides = ["bottom", "right", "top", "left"]
    for (name, size, before, after, sharp), side in zip(corners, sides):
        if size[0] > 0 and size[1] > 0:
            # The cut edge runs from `before` to `after`, then the side follows.
            points.extend([before, after])
            kinds.extend([name, side])
        else:
            points.append(sharp)
            kinds.append(side)
    return points, kinds


_ADJACENT = {
    "bl": ("left", "bottom"),
    "br": ("bottom", "right"),
    "tr": ("right", "top"),
    "tl": ("top", "left"),
}


def frame(x0, y0, x1, y1, *, bottom, right, top, left, diagonal,
          tl=0, tr=0, br=0, bl=0):
    """A box outline with chamfered corners minus its counter.

    Each side gets its own stroke thickness. Pass OPEN to leave a side of the
    counter open. A corner cut next to an open side is opened as well, so the
    stroke ends in the angled cut of the outline.
    """
    points, kinds = chamfered_box(x0, y0, x1, y1, tl=tl, tr=tr, br=br, bl=bl)
    widths = {"bottom": bottom, "right": right, "top": top, "left": left}
    thicknesses = []
    for kind in kinds:
        if kind in widths:
            thicknesses.append(widths[kind])
        elif any(widths[side] == OPEN for side in _ADJACENT[kind]):
            thicknesses.append(OPEN)
        else:
            thicknesses.append(diagonal)
    # chamfered_box lists each edge starting at the point it is stored with,
    # so thickness i belongs to the edge from points[i] to points[i + 1].
    return ring(points, thicknesses)


def slanted_width(dx, dy, thickness):
    """Horizontal width that gives a slanted stroke the wanted thickness."""
    return thickness * math.hypot(dx, dy) / abs(dy)


def band(x_bottom, y_bottom, x_top, y_top, width):
    """A slanted stroke with flat horizontal ends.

    The left edge runs from (x_bottom, y_bottom) to (x_top, y_top) and the
    stroke is `width` units wide when measured horizontally.
    """
    return polygon([
        (x_bottom, y_bottom),
        (x_bottom + width, y_bottom),
        (x_top + width, y_top),
        (x_top, y_top),
    ])


def stroke_between(x_bottom, y_bottom, x_top, y_top, thickness):
    """A slanted stroke centred on the given line with flat horizontal ends."""
    width = slanted_width(x_top - x_bottom, y_top - y_bottom, thickness)
    return band(x_bottom - width / 2, y_bottom, x_top - width / 2, y_top, width)


def arm_and_leg(stem, width, height, junction, thickness, leg_start):
    """The arm and leg of K and k.

    The arm rises from the right edge of the stem at `junction` to the top
    right corner, with its lower end hidden inside the stem. The leg leaves
    the arm `leg_start` units above the junction and runs to the bottom
    right corner.
    """
    rise = height - junction
    arm_width = slanted_width(width - stem, rise, thickness)
    arm = band(stem - arm_width, junction, width - arm_width, height, arm_width)
    arm = intersection(arm, rect(0, 0, width, height))

    top = junction + leg_start
    arm_left = stem - arm_width + (width - stem) * leg_start / rise
    leg_left = arm_left + 12
    leg_width = slanted_width(width - leg_left, top, thickness)
    leg_width = min(leg_width, arm_width - 24)
    leg = band(width - leg_width, 0, leg_left, top, leg_width)
    return union(arm, leg)


def rotated_bar(cx, cy, length, thickness, degrees):
    """A rectangle centred on (cx, cy) and rotated by the given angle."""
    angle = math.radians(degrees)
    ux, uy = math.cos(angle) * length / 2, math.sin(angle) * length / 2
    vx, vy = -math.sin(angle) * thickness / 2, math.cos(angle) * thickness / 2
    return polygon([
        (cx - ux - vx, cy - uy - vy),
        (cx + ux - vx, cy + uy - vy),
        (cx + ux + vx, cy + uy + vy),
        (cx - ux + vx, cy - uy + vy),
    ])


def zigzag(points, thickness):
    """Join segments of a polyline, each drawn with a vertical thickness."""
    pieces = []
    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        pieces.append(polygon([
            (x0, y0 - thickness / 2),
            (x1, y1 - thickness / 2),
            (x1, y1 + thickness / 2),
            (x0, y0 + thickness / 2),
        ]))
    return union(*pieces)
