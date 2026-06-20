import Two from "two.js";

const { Anchor, Commands } = Two;

// ---------------------------------------------------------------------------
// Geometry primitives shared by the tip specs.
//
// All tips are authored in a local frame where the very point of the arrow sits
// at the origin (0,0) and the arrow points toward +x; the body therefore
// extends into -x. `Path._syncHead` positions the head at the shaft tip and
// rotates it to the shaft direction, so this single convention orients every
// tip correctly.
//
// Dimensions are expressed in terms of a `unit` derived from the stroke width
// (see `PathHead._update`). That makes tips grow with the line width, matching
// how TikZ scales its arrow tips.
// ---------------------------------------------------------------------------

export type Pt = [number, number];

/** Path command for a head vertex. */
export type HeadCmd = "move" | "line" | "curve";

/**
 * A rich path vertex carrying optional cubic Bézier control handles. The handles
 * are offsets *relative to the vertex* — exactly two.js's `Anchor.controls`
 * convention: `right` is the outgoing handle (toward the next vertex) and `left`
 * the incoming handle (from the previous vertex). The segment A→B is therefore
 * the cubic (A, A+A.right, B+B.left, B).
 */
export interface HeadVert {
  x: number;
  y: number;
  command: HeadCmd;
  left?: Pt;
  right?: Pt;
}

/**
 * A vertex: a bare point (drawn with `line`, or `move` if first), a tuple tagged
 * to start a new sub-path, or a {@link HeadVert} carrying real Bézier handles.
 * The curve/arc helpers below emit `HeadVert`s so curved tips ride genuine
 * Bézier/arc segments instead of dense point samples.
 */
export type HeadPoint = Pt | [number, number, "move" | "line"] | HeadVert;

const isVert = (p: HeadPoint): p is HeadVert => !Array.isArray(p);

export const pointX = (p: HeadPoint): number => (isVert(p) ? p.x : p[0]);
export const pointY = (p: HeadPoint): number => (isVert(p) ? p.y : p[1]);
export const pointCmd = (p: HeadPoint): HeadCmd | undefined =>
  isVert(p) ? p.command : (p[2] as HeadCmd | undefined);
export const pointLeft = (p: HeadPoint): Pt | undefined => (isVert(p) ? p.left : undefined);
export const pointRight = (p: HeadPoint): Pt | undefined => (isVert(p) ? p.right : undefined);

/** Reflect a vertex across the y-axis — negate every x, positions and handles. */
export function mirrorXPoint(p: HeadPoint): HeadPoint {
  if (isVert(p)) {
    return {
      ...p,
      x: -p.x,
      left: p.left ? [-p.left[0], p.left[1]] : undefined,
      right: p.right ? [-p.right[0], p.right[1]] : undefined,
    };
  }
  return [-p[0], p[1], p[2]] as HeadPoint;
}

/** Nominal length / half-width for a tip at a given stroke unit. */
export function dims(u: number): { L: number; w: number } {
  return { L: 2 * u + 4, w: 1.3 * u + 2.5 };
}

// Control point of the quadratic through `mid` at its midpoint, from p0 to p1.
const quadControl = (p0: Pt, mid: Pt, p1: Pt): Pt => [
  2 * mid[0] - (p0[0] + p1[0]) / 2,
  2 * mid[1] - (p0[1] + p1[1]) / 2,
];

// Cubic handle (relative to `anchor`) reproducing a quadratic control point: the
// equivalent cubic control sits two-thirds of the way from anchor toward `ctrl`.
const quadHandle = (anchor: Pt, ctrl: Pt): Pt => [
  (2 / 3) * (ctrl[0] - anchor[0]),
  (2 / 3) * (ctrl[1] - anchor[1]),
];

/**
 * A tiny path builder for tips with curved outlines. It accumulates
 * {@link HeadVert}s and lifts each `curveThrough` / `closeThrough` (a quadratic
 * through a midpoint) to a real cubic Bézier, wiring the handles onto the
 * adjacent vertices the way two.js's renderer reads them.
 */
export class HeadPath {
  private _verts: HeadVert[] = [];

  moveTo(x: number, y: number): this {
    this._verts.push({ x, y, command: "move" });
    return this;
  }

  lineTo(x: number, y: number): this {
    this._verts.push({ x, y, command: "line" });
    return this;
  }

  /** Quadratic Bézier from the current point, through `mid`, to (x, y). */
  curveThrough(mid: Pt, x: number, y: number): this {
    const prev = this._verts[this._verts.length - 1];
    const p0: Pt = [prev.x, prev.y];
    const c = quadControl(p0, mid, [x, y]);
    prev.right = quadHandle(p0, c);
    this._verts.push({ x, y, command: "curve", left: quadHandle([x, y], c) });
    return this;
  }

  /**
   * Curve back to the first vertex (for closed, filled tips) through `mid`.
   * Appends a curve vertex coincident with the start so the closing segment is a
   * genuine Bézier (two.js only beziers the wrap-around when the last vertex is a
   * curve); the implicit `closePath` then collapses to zero length.
   */
  closeThrough(mid: Pt): this {
    const prev = this._verts[this._verts.length - 1];
    const first = this._verts[0];
    const p0: Pt = [prev.x, prev.y];
    const p1: Pt = [first.x, first.y];
    const c = quadControl(p0, mid, p1);
    prev.right = quadHandle(p0, c);
    this._verts.push({ x: p1[0], y: p1[1], command: "curve", left: quadHandle(p1, c) });
    return this;
  }

  build(): HeadVert[] {
    return this._verts;
  }
}

/**
 * A circular arc from angle `a0` to `a1` (center cx,cy, radius r), built from
 * real cubic Bézier segments — one per ≤90° span, using the standard
 * `4/3·tan(Δ/4)` handle length. The free ends carry no outer handle, so a
 * *closed* arc closes with a straight chord rather than an extra Bézier.
 */
export function arcVerts(cx: number, cy: number, r: number, a0: number, a1: number): HeadVert[] {
  const span = a1 - a0;
  const n = Math.max(1, Math.ceil(Math.abs(span) / (Math.PI / 2)));
  const da = span / n;
  const h = r * (4 / 3) * Math.tan(da / 4); // signed handle length
  const out: HeadVert[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + da * i;
    const cosA = Math.cos(a), sinA = Math.sin(a);
    // Unit tangent in the direction of increasing angle.
    const tx = -sinA, ty = cosA;
    out.push({
      x: cx + r * cosA,
      y: cy + r * sinA,
      command: i === 0 ? "move" : "curve",
      left: i === 0 ? undefined : [-h * tx, -h * ty],
      right: i === n ? undefined : [h * tx, h * ty],
    });
  }
  return out;
}

/**
 * A full ellipse (closed loop) centered at (cx, cy), built from `n` cubic Bézier
 * quadrants — the same construction two.js's own `Ellipse` uses (handle factor
 * `4/3·tan(π/2n)`). Every vertex carries both handles, including the opening
 * `move`, whose `left` drives the wrap-around segment.
 */
export function ellipseVerts(cx: number, cy: number, rx: number, ry: number, n = 4): HeadVert[] {
  const c = (4 / 3) * Math.tan(Math.PI / (n * 2));
  const out: HeadVert[] = [];
  for (let i = 0; i < n; i++) {
    const theta = (i / n) * Math.PI * 2;
    const cosT = Math.cos(theta), sinT = Math.sin(theta);
    out.push({
      x: cx + rx * cosT,
      y: cy + ry * sinT,
      command: i === 0 ? "move" : "curve",
      left: [rx * c * sinT, -ry * c * cosT],
      right: [-rx * c * sinT, ry * c * cosT],
    });
  }
  return out;
}

/**
 * A true circular arc, symmetric about the x-axis, running from the mirror of
 * `end` through `apex` (which lies on the x-axis) to `end`. A genuine partial
 * circle (built from {@link arcVerts}), so it never looks oval. Falls back to
 * straight segments if the three points are collinear.
 */
export function symArc(apex: Pt, end: Pt): HeadPoint[] {
  const ax = apex[0];
  const ex = end[0], ey = end[1];
  const denom = 2 * (ex - ax);
  if (Math.abs(denom) < 1e-6 || Math.abs(ey) < 1e-6) {
    return [[ex, -ey], apex, [ex, ey]];
  }
  // Circle through (ax,0), (ex,±ey) has its center on the x-axis.
  const cx = (ex * ex + ey * ey - ax * ax) / denom;
  const r = Math.abs(ax - cx);
  const aApex = ax >= cx ? 0 : Math.PI;
  let d = Math.atan2(ey, ex - cx) - aApex;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return arcVerts(cx, 0, r, aApex - d, aApex + d);
}

export interface HeadSpec {
  /** Canonical tip name, e.g. `"stealth"`. */
  name: string;
  /** Closed path (filled / outlined shapes) vs. open polyline (barbs, caps). */
  closed?: boolean;
  /** Paint the interior with the stroke color. */
  fill?: boolean;
  /**
   * Produce the tip outline for a given stroke `unit`. Some tips accept an
   * optional numeric argument (e.g. `rays[5]` passes `arg = 5`).
   */
  build(u: number, arg?: number): HeadPoint[];
}

/**
 * A spec-driven arrow tip. One class realises every TikZ-style tip; the shape
 * lives entirely in its {@link HeadSpec}. Geometry is rebuilt every frame from
 * the current stroke width so tips stay proportional as the line scales.
 */
export class PathHead extends Two.Path {
  _spec: HeadSpec;
  _arg?: number;

  constructor(spec: HeadSpec, arg?: number) {
    super([], spec.closed ?? false, false, true);
    this._spec = spec;
    this._arg = arg;
    if (!spec.fill) this.noFill();
    // Identity + fill hint consumed by Path._syncHead.
    (this as any).__pathHeadType = spec.name;
    (this as any).__pathHeadFilled = !!spec.fill;
  }

  /**
   * How much room (in +x, the path direction) the tip needs beyond its (0,0)
   * connection point — i.e. how far its forward extent reaches past where it
   * attaches to the shaft. The owning Path truncates the shaft by this amount so
   * the tip fits before the path's end instead of overshooting it.
   */
  advanceFor(u: number): number {
    let maxX = 0;
    for (const p of this._spec.build(u, this._arg)) {
      const x = pointX(p);
      if (x > maxX) maxX = x;
    }
    return maxX;
  }

  _update() {
    const u = Math.max((this.linewidth as number) || 1, 1);
    const pts = this._spec.build(u, this._arg);

    const verts = this.vertices;
    while (verts.length < pts.length) {
      verts.push(new Anchor(0, 0, undefined, undefined, undefined, undefined, Commands.line));
    }
    while (verts.length > pts.length) verts.pop();

    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const v = verts[i];
      v.x = pointX(p);
      v.y = pointY(p);

      // The first vertex always opens the path; later vertices line to the
      // previous point unless tagged to start a new sub-path or carry a curve.
      const cmd = pointCmd(p);
      v.command =
        i === 0 || cmd === "move"
          ? Commands.move
          : cmd === "curve"
            ? Commands.curve
            : Commands.line;

      // Bézier handles (relative offsets, two.js convention). Clearing keeps
      // stale handles from a prior frame's geometry out of line segments.
      const left = pointLeft(p);
      const right = pointRight(p);
      if (left) v.controls.left.set(left[0], left[1]);
      else v.controls.left.clear();
      if (right) v.controls.right.set(right[0], right[1]);
      else v.controls.right.clear();
    }

    return super._update();
  }
}
