import Two from "two.js"
import { Vector } from "two.js/src/vector";
import type { Shape } from "two.js/src/shape";
import type { Path as PathT } from "two.js/src/path";
import type { Anchor as AnchorT } from "two.js/src/anchor";

const { Group, Anchor, Commands } = Two

import {
  resolveVec,
  TwoLike,
  AnchorLike,
  requireTwoInstance,
  expandPositions,
  applyDashPattern,
} from "./util";
import {
  resolvePathHead,
} from "./heads";
import { PathLabel, normalizeLabel, type LabelInput } from "./label";

// How many path vertices a single command contributes. Most commands map to a
// single vertex; the orthogonal-routing commands insert intermediate corners:
// HV/VH bend once (corner + endpoint), HVH/VHV bend twice (2 corners + endpoint).
function opVertexCount(cmd: string): number {
  const l = cmd.toLowerCase();
  if (l === "hv" || l === "vh") return 2;
  if (l === "hvh" || l === "vhv") return 3;
  return 1;
}

const clampRatio = (v?: number) => {
  const r = typeof v === "number" ? v : 0.5;
  return Math.max(0, Math.min(1, r));
};

/**
 * @name Path
 * @class
 */
export class Path extends Group {
  _shaft: PathT;
  _end = 1; /* basically a better version of _ending */
  _start = 0;
  _radius = 0;
  _headShape: Shape | null = null;
  _label: PathLabel | null = null;
  _ops: Array<{ cmd: string; args: any[]; ratio?: number }> = [];
  _dashes: number[] | null = null;
  _dashed = false;
  _dashOffset = 0;

  constructor() {
    super();

    const vertices = [
      new Anchor(0, 0, undefined, undefined, undefined, undefined, Commands.move),
    ];
    let shaft = new Two.Path(vertices, false, false, true)

    this.noFill();
    shaft.noFill();
    this._shaft = shaft;
    this.add(shaft);
    this.cap = 'round';
    this.join = 'round';

    this._update();
  }

  static Properties = ['radius', 'head', 'text', 'dashed', 'dashes', 'dashOffset'];

  get shaft() { return this._shaft; }

  // Text label riding along the shaft. Accepts a string or LabelOptions.
  get text() { return this._label?.text ?? null; }
  set text(v: LabelInput) {
    if (this._label) {
      this.remove(this._label);
      this._label = null;
    }
    const opts = normalizeLabel(v);
    if (!opts) return;
    this._label = new PathLabel(opts);
    this.add(this._label);
  }
  // `label` is an alias for `text`.
  get label() { return this.text; }
  set label(v: LabelInput) { this.text = v; }

  get end() { return this._end; }
  set end(v : number) { this._shaft.ending = v; this._end = v; }
  get start() { return this._start; }
  set start(v : number) { this._shaft.beginning = v; this._start = v; }
  get radius() { return this._radius; }
  set radius(v: number) { this._radius = Math.max(0, v); }

  // Dashed stroke. `dashed = true` derives a linewidth-scaled pattern; pass an
  // explicit `dashes` array of [on, off, …] px lengths for full control.
  // `dashOffset` shifts the pattern (animate it for marching ants).
  get dashed() { return this._dashed || !!this._dashes; }
  set dashed(v: boolean) {
    this._dashed = !!v;
    if (!v) this._dashes = null;
  }
  get dashes() { return this._dashes; }
  set dashes(v: number[] | null) {
    this._dashes = v && v.length ? v.slice() : null;
  }
  get dashOffset() { return this._dashOffset; }
  set dashOffset(v: number) { this._dashOffset = v; }
  get head() { return this._headShape; }
  set head(v: string | Shape | boolean | null | undefined) {
    if (this._headShape) {
      this.remove(this._headShape);
      this._headShape = null;
    }

    const resolved = resolvePathHead(v);
    if (!resolved) return;

    this._headShape = resolved;
    this.add(resolved);
  }

  _totalVertexCount() {
    let n = 0;
    for (const op of this._ops) n += opVertexCount(op.cmd);
    return n;
  }

  _ensureVertices() {
    const need = this._totalVertexCount();
    while (this._shaft.vertices.length < need) {
      this._shaft.vertices.push(new Anchor(0, 0, undefined, undefined, undefined, undefined, Commands.line));
    }
    while (this._shaft.vertices.length > need) {
      this._shaft.vertices.pop();
    }
  }

  _syncGeometrySharp(origin: Vector) {
    this._ensureVertices();

    const cursor = new Vector(0, 0);
    const verts = this._shaft.vertices;
    let vi = 0;

    // Emit one vertex and advance the drawing cursor to it.
    const emit = (command: any, x: number, y: number) => {
      const v = verts[vi++];
      v.command = command;
      v.x = x;
      v.y = y;
      cursor.x = x;
      cursor.y = y;
    };

    for (let i = 0; i < this._ops.length; i++) {
      const op = this._ops[i];
      const cmd = op.cmd;
      const lower = cmd.toLowerCase();

      // The first command anchors the path: its vertex sits at the local
      // origin (0,0) while the translation carries the absolute position.
      if (i === 0) {
        emit(Commands.move, 0, 0);
        continue;
      }

      if (lower === "z") {
        const first = verts[0];
        emit(Commands.close, first.x, first.y);
        continue;
      }

      const abs = cmd === cmd.toUpperCase();
      const p = resolveVec(...op.args);
      if (!p) {
        // Keep vertex/op alignment even when a reference fails to resolve.
        vi += opVertexCount(cmd);
        continue;
      }

      // Target endpoint in local coordinates (absolute commands are relative to
      // the origin; lowercase commands are relative to the current cursor).
      const tx = abs ? p.x - origin.x : cursor.x + p.x;
      const ty = abs ? p.y - origin.y : cursor.y + p.y;
      const sx = cursor.x;
      const sy = cursor.y;

      switch (lower) {
        case "m":
          emit(Commands.move, tx, ty);
          break;
        case "l":
          emit(Commands.line, tx, ty);
          break;
        case "h":
          emit(Commands.line, tx, sy);
          break;
        case "v":
          emit(Commands.line, sx, ty);
          break;
        case "hv": // horizontal first, then vertical (one 90° corner)
          emit(Commands.line, tx, sy);
          emit(Commands.line, tx, ty);
          break;
        case "vh": // vertical first, then horizontal
          emit(Commands.line, sx, ty);
          emit(Commands.line, tx, ty);
          break;
        case "hvh": { // horizontal, vertical, horizontal — split the x-distance
          const midX = sx + (tx - sx) * clampRatio(op.ratio);
          emit(Commands.line, midX, sy);
          emit(Commands.line, midX, ty);
          emit(Commands.line, tx, ty);
          break;
        }
        case "vhv": { // vertical, horizontal, vertical — split the y-distance
          const midY = sy + (ty - sy) * clampRatio(op.ratio);
          emit(Commands.line, sx, midY);
          emit(Commands.line, tx, midY);
          emit(Commands.line, tx, ty);
          break;
        }
      }
    }
  }

  // Round every corner of the sharp geometry by inserting a circular-arc fillet
  // between each pair of adjacent straight segments.
  //
  // The sharp geometry only ever contains `move`, `line` and `close` anchors
  // (the user never enters curves), so it is just a list of polylines. We split
  // it into those polylines ("subpaths"), round each interior corner, and
  // rebuild a fresh vertex list.
  //
  // Returns the rounded vertices, or null when nothing could be rounded — in
  // which case the caller keeps the sharp geometry as-is.
  _buildRoundedCurveVertices(): AnchorT[] | null {
    if (this._radius <= 0) return null;

    const source = this._shaft.vertices;
    if (source.length < 3) return null;

    const EPS = 1e-6;
    const ANGLE_EPS = 1e-3;

    type Point = { x: number; y: number };

    // Group the flat anchor list into polylines. A `move` opens a new subpath; a
    // `close` marks the current one as closed (its last point wraps back to the
    // first). The `close` anchor sits on the first point, so it adds no vertex.
    const subpaths: Array<{ points: Point[]; closed: boolean }> = [];
    for (const a of source) {
      if (a.command === Commands.move || subpaths.length === 0) {
        subpaths.push({ points: [{ x: a.x, y: a.y }], closed: false });
      } else if (a.command === Commands.close) {
        subpaths[subpaths.length - 1].closed = true;
      } else {
        subpaths[subpaths.length - 1].points.push({ x: a.x, y: a.y });
      }
    }

    // Direction-and-angle data for a single corner, independent of how far the
    // fillet is eventually trimmed back. `desired` is the trim length that gives
    // the full requested radius; `inLen`/`outLen` are the adjacent segment
    // lengths. Null for degenerate corners (zero-length segment, straight line
    // or full reversal), which stay sharp.
    type Corner = {
      ix: number; iy: number; ox: number; oy: number;
      tanHalf: number; sweepFlag: number;
      desired: number; inLen: number; outLen: number;
    };

    const cornerGeom = (prev: Point, curr: Point, next: Point): Corner | null => {
      const inX = curr.x - prev.x, inY = curr.y - prev.y;
      const outX = next.x - curr.x, outY = next.y - curr.y;
      const inLen = Math.hypot(inX, inY);
      const outLen = Math.hypot(outX, outY);
      if (inLen <= EPS || outLen <= EPS) return null;

      const ix = inX / inLen, iy = inY / inLen;
      const ox = outX / outLen, oy = outY / outLen;

      // Angle between the two segment directions (0 = straight, π = reversal).
      const turn = Math.acos(Math.max(-1, Math.min(1, ix * ox + iy * oy)));
      if (turn <= ANGLE_EPS || Math.PI - turn <= ANGLE_EPS) return null;

      const tanHalf = Math.tan(turn / 2);
      return {
        ix, iy, ox, oy, tanHalf,
        sweepFlag: ix * oy - iy * ox > 0 ? 1 : 0,
        desired: this._radius * tanHalf,
        inLen, outLen,
      };
    };

    type Fillet = { entry: Point; exit: Point; radius: number; sweepFlag: number };

    // Realise a corner as a fillet, trimmed back by `trim` from the corner. The
    // arc radius scales down with the trim so it stays tangent to both segments.
    const buildFillet = (c: Corner, curr: Point, trim: number): Fillet | null => {
      if (trim <= EPS) return null;
      return {
        entry: { x: curr.x - c.ix * trim, y: curr.y - c.iy * trim },
        exit: { x: curr.x + c.ox * trim, y: curr.y + c.oy * trim },
        radius: trim / c.tanHalf,
        sweepFlag: c.sweepFlag,
      };
    };

    const out: AnchorT[] = [];
    let changed = false;

    const push = (cmd: any, x: number, y: number) =>
      out.push(new Anchor(x, y, undefined, undefined, undefined, undefined, cmd));

    // A rounded corner: a straight run up to the entry tangent, then the arc.
    const pushFillet = (f: Fillet) => {
      changed = true;
      push(Commands.line, f.entry.x, f.entry.y);
      const arc = new Anchor(f.exit.x, f.exit.y, undefined, undefined, undefined, undefined, Commands.arc);
      arc.rx = arc.ry = f.radius;
      arc.xAxisRotation = 0;
      arc.largeArcFlag = 0;
      arc.sweepFlag = f.sweepFlag;
      out.push(arc);
    };

    for (const { points, closed } of subpaths) {
      const n = points.length;
      if (n === 0) continue;

      const isClosed = closed && n >= 3;
      const wrap = (i: number) => (i % n + n) % n;
      // Only interior points are corners; the two endpoints of an open subpath
      // are not rounded.
      const isCorner = (i: number) => isClosed || (i >= 1 && i <= n - 2);

      const corners = points.map((_, i) =>
        isCorner(i) ? cornerGeom(points[wrap(i - 1)], points[i], points[wrap(i + 1)]) : null,
      );

      // Trim length per corner. Start at the full requested radius, but never
      // longer than either adjacent segment.
      const trims = corners.map((c) => (c ? Math.min(c.desired, c.inLen, c.outLen) : 0));

      // Two corners share the segment between them. If their trims together
      // exceed its length they would overlap, so shrink both proportionally
      // until they exactly meet — the two arcs then connect with no straight
      // bit in between. A closed subpath also shares its wrap-around segment.
      const segmentCount = isClosed ? n : n - 1;
      for (let k = 0; k < segmentCount; k++) {
        const a = k, b = wrap(k + 1);
        if (!corners[a] || !corners[b]) continue;
        const segLen = Math.hypot(points[b].x - points[a].x, points[b].y - points[a].y);
        const total = trims[a] + trims[b];
        if (total > segLen && total > EPS) {
          const scale = segLen / total;
          trims[a] *= scale;
          trims[b] *= scale;
        }
      }

      const filletAt = (i: number) =>
        corners[i] ? buildFillet(corners[i]!, points[i], trims[i]) : null;

      if (isClosed) {
        // Closing the loop rounds the start corner too, so the path no longer
        // starts at points[0] but at that corner's exit tangent.
        const start = filletAt(0);
        const head = start ? start.exit : points[0];
        push(Commands.move, head.x, head.y);

        for (let i = 1; i < n; i++) {
          const f = filletAt(i);
          if (f) pushFillet(f);
          else push(Commands.line, points[i].x, points[i].y);
        }

        // Wrap around the start corner to rejoin the head point.
        if (start) pushFillet(start);
        else push(Commands.line, points[0].x, points[0].y);
      } else {
        push(Commands.move, points[0].x, points[0].y);
        for (let i = 1; i < n; i++) {
          const f = filletAt(i);
          if (f) pushFillet(f);
          else push(Commands.line, points[i].x, points[i].y);
        }
      }
    }

    return changed ? out : null;
  }

  _syncGeometry() {
    if (this._ops.length === 0) return;
    const origin = resolveVec(...this._ops[0].args);
    if (!origin) return;

    this.translation.x = origin.x;
    this.translation.y = origin.y;

    this._syncGeometrySharp(origin);
    if (this._radius <= 0) return;

    const roundedCurveVertices = this._buildRoundedCurveVertices();
    if (!roundedCurveVertices) return;

    this._shaft.vertices.splice(0, this._shaft.vertices.length, ...roundedCurveVertices);
  }

  _syncHead() {
    const head = this._headShape;
    const shaft = this._shaft;
    // No head: the shaft is drawn to its logical end.
    if (!head) { shaft.ending = this._end; return; }

    const total = (shaft as any).length || 0;
    const visibleLength = Math.max(0, (this._end - this._start) * total);

    // How far the tip reaches forward of its (0,0) connection. The shaft is
    // truncated by this much so the head fits *before* the path's end and the
    // shaft visually terminates at the connection point.
    const advance = typeof (head as any).advanceFor === "function"
      ? (head as any).advanceFor(Math.max((shaft.linewidth as number) || 1, 1))
      : 0;

    // Not enough drawn shaft to host the head yet (e.g. mid draw-on): keep the
    // shaft whole and hide the head until there is room.
    if (visibleLength <= 1e-6 || visibleLength <= advance) {
      shaft.ending = this._end;
      head.visible = false;
      return;
    }

    // Find the fraction where the head attaches: the point that is `advance`
    // (straight-line distance) back from the path end. We can't derive it
    // arithmetically because Two's getPointAt eases within each segment rather
    // than mapping arc length linearly — so binary-search the monotonic curve.
    // Using getPointAt for both the head position and `ending` keeps the
    // truncated shaft and the head connected at exactly the same point.
    const endP = shaft.getPointAt(this._end);
    if (!endP) { head.visible = false; return; }
    let lo = this._start, hi = this._end, tHead = this._end;
    for (let i = 0; i < 28; i++) {
      const mid = (lo + hi) / 2;
      const pm = shaft.getPointAt(mid);
      const dist = pm ? Math.hypot(pm.x - endP.x, pm.y - endP.y) : 0;
      if (dist > advance) lo = mid; else hi = mid; // too far back → move forward
      tHead = mid;
    }
    shaft.ending = tHead;

    const dt = 1e-3;
    const p = shaft.getPointAt(tHead);
    const pa = shaft.getPointAt(Math.max(0, tHead - dt));
    const pb = shaft.getPointAt(Math.min(1, tHead + dt));
    if (!p || !pa || !pb) {
      head.visible = false; return;
    }

    const angle = Math.atan2(pb.y - pa.y, pb.x - pa.x);
    head.rotation = angle;
    head.position = p;

    (head as any).stroke = shaft.stroke;
    (head as any).linewidth = shaft.linewidth;
    (head as any).cap = shaft.cap;
    (head as any).join = shaft.join;
    (head as any).opacity = shaft.opacity;
    // Filled tips (triangle, stealth, …) paint their interior with the stroke
    // color; stroke-only tips (barbs, brackets, caps) stay unfilled.
    if ((head as any).__pathHeadFilled) (head as any).fill = shaft.stroke;
    else (head as any).noFill();

    head.visible = true;
  }

  // All these commands mirror the svg path commands
  // lower-case letters are relative and upper-case letters absolute
  M(...args) {
    this._ops.push({ cmd: "M", args });
    return this;
  }
  m(...args) {
    this._ops.push({ cmd: "m", args });
    return this;
  }
  L(...args) {
    this._ops.push({ cmd: "L", args });
    return this;
  }
  l(...args) {
    this._ops.push({ cmd: "l", args });
    return this;
  }
  V(...args) {
    this._ops.push({ cmd: "V", args });
    return this;
  }
  v(...args) {
    this._ops.push({ cmd: "v", args });
    return this;
  }
  H(...args) {
    this._ops.push({ cmd: "H", args });
    return this;
  }
  h(...args) {
    this._ops.push({ cmd: "h", args });
    return this;
  }

  // Orthogonal routing to a target point: connect the current point with a
  // sequence of axis-aligned segments instead of a straight line.
  //   HV/VH  — a single 90° corner (horizontal-then-vertical / vertical-then-h).
  //   HVH/VHV — two corners; an optional trailing ratio (0..1, default 0.5)
  //             sets where the perpendicular middle segment crosses, e.g.
  //             `.VHV("#b@c", 0.3)` goes 30% down, across, then the rest.
  // As with the other commands, uppercase = absolute, lowercase = relative.
  HV(...args: any[]) { return this._pushRoute("HV", args); }
  hv(...args: any[]) { return this._pushRoute("hv", args); }
  VH(...args: any[]) { return this._pushRoute("VH", args); }
  vh(...args: any[]) { return this._pushRoute("vh", args); }
  HVH(...args: any[]) { return this._pushRoute("HVH", args); }
  hvh(...args: any[]) { return this._pushRoute("hvh", args); }
  VHV(...args: any[]) { return this._pushRoute("VHV", args); }
  vhv(...args: any[]) { return this._pushRoute("vhv", args); }

  // Split a trailing numeric `ratio` from the point args. The point may be a
  // reference (`VHV("#id@c", 0.3)`) or explicit coords (`VHV(100, 200, 0.3)`).
  _pushRoute(cmd: string, args: any[]) {
    let ratio: number | undefined;
    let pointArgs = args;
    if (typeof args[0] === "number" && typeof args[1] === "number") {
      if (typeof args[2] === "number") ratio = args[2];
      pointArgs = [args[0], args[1]];
    } else if (typeof args[1] === "number") {
      ratio = args[1];
      pointArgs = [args[0]];
    }
    this._ops.push({ cmd, args: pointArgs, ratio });
    return this;
  }

  Z() {
    this._ops.push({ cmd: "Z", args: [] });
    return this;
  }
  z() {
    this._ops.push({ cmd: "z", args: [] });
    return this;
  }

  /**
   * @name Two.Path#_update
   * @function
   * @private
   * @description Re-resolve geometry, head, dashes and label every frame so the
   * path stays live as its referenced positions move.
   */
  _update() {
    this._syncGeometry();
    this._syncHead();
    applyDashPattern(this._shaft, this._dashes, this._dashed, this._dashOffset);
    this._label?.update(this._shaft, this._start, this._end, this._shaft.stroke as string);

    super._update();
    return this;
  }
}

// The start point is given as the first command (`.M(...)`), so the geometry
// reads uniformly: mkPath({ stroke }).M(p1).L(p2).Z()
export function makePath(
  two: TwoLike,
  props: Record<string, any> = {},
): Path {
  const instance = requireTwoInstance(two, "makePath");

  const path = new Path();
  instance.scene.add(path);
  Object.assign(path, props);

  return path;
}

// An arrow is just a straight path with an arrowhead. `mkArrow(from, to)` is
// shorthand for `mkPath({ head: true }).M(from).L(to)`; the tip scales with
// `linewidth` like every other path head (pass `head` to pick a different tip,
// or `head: false` for none). A selector matching multiple elements fans out to
// one arrow per element, mirroring `mkPath`.
export function makeArrow(
  two: TwoLike,
  from: AnchorLike | AnchorLike[],
  to: AnchorLike | AnchorLike[],
  props: Record<string, any> = {},
): Path | Path[] | null {
  const instance = requireTwoInstance(two, "makeArrow");

  const { items: fromArr, isArray: fromIsArray } = expandPositions(from);
  const { items: toArr, isArray: toIsArray } = expandPositions(to);

  const paths: Path[] = [];
  for (const f of fromArr) {
    for (const t of toArr) {
      paths.push(makePath(instance, { head: true, ...props }).M(f).L(t));
    }
  }

  if ((!fromIsArray && !toIsArray) || paths.length <= 1) {
    return paths[0] ?? null;
  }

  return paths;
}
