import Two from "two.js"
import { Vector } from "two.js/src/vector";
import type { Shape } from "two.js/src/shape";
import type { Path as PathT } from "two.js/src/path";
import type { Anchor as AnchorT } from "two.js/src/anchor";

const { Group, Anchor, Commands } = Two

import { resolveVec, TwoLike, requireTwoInstance } from "./util";
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

  static Properties = ['radius', 'head', 'text'];

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

  _buildRoundedCurveVertices(): AnchorT[] | null {
    if (this._radius <= 0) return null;

    const EPS = 1e-6;
    const source = this._shaft.vertices;
    if (source.length < 3) return null;

    const rounded: AnchorT[] = [new Anchor().copy(source[0])];
    let changed = false;

    type Fillet = {
      entry: Vector;
      exit: Vector;
      r: number;
      sweepFlag: number;
    };

    const buildFillet = (prev: Vector, curr: Vector, next: Vector): Fillet | null => {
      const inDir = new Vector(curr.x - prev.x, curr.y - prev.y);
      const outDir = new Vector(next.x - curr.x, next.y - curr.y);
      const len1 = Math.hypot(inDir.x, inDir.y);
      const len2 = Math.hypot(outDir.x, outDir.y);

      if (len1 <= EPS || len2 <= EPS) return null;

      inDir.x /= len1;
      inDir.y /= len1;
      outDir.x /= len2;
      outDir.y /= len2;

      const dot = Math.max(-1, Math.min(1, inDir.x * outDir.x + inDir.y * outDir.y));
      const turn = Math.acos(dot);
      if (turn <= 1e-3 || Math.abs(Math.PI - turn) <= 1e-3) return null;

      const tanHalf = Math.tan(turn / 2);
      if (Math.abs(tanHalf) <= EPS) return null;

      const desiredRadius = Math.max(0, this._radius);
      // For this `turn` definition (angle between tangents), trim distance is:
      // d = r * tan(turn / 2)
      let d = desiredRadius * tanHalf;
      d = Math.min(d, len1, len2);
      if (d <= EPS) return null;

      // If segments are too short, this is the maximal tangent-continuous radius.
      const r = d / tanHalf;
      if (r <= EPS) return null;

      const entry = new Vector(curr.x - inDir.x * d, curr.y - inDir.y * d);
      const exit = new Vector(curr.x + outDir.x * d, curr.y + outDir.y * d);
      const cross = inDir.x * outDir.y - inDir.y * outDir.x;
      const sweepFlag = cross > 0 ? 1 : 0;

      return { entry, exit, r, sweepFlag };
    };

    const pushLineTo = (p: Vector) => {
      rounded.push(new Anchor(p.x, p.y, undefined, undefined, undefined, undefined, Commands.line));
    };

    const pushArcTo = (f: Fillet) => {
      const arc = new Anchor(f.exit.x, f.exit.y, undefined, undefined, undefined, undefined, Commands.arc);
      arc.rx = f.r;
      arc.ry = f.r;
      arc.xAxisRotation = 0;
      arc.largeArcFlag = 0;
      arc.sweepFlag = f.sweepFlag;
      rounded.push(arc);
    };

    const pushFillet = (f: Fillet) => {
      changed = true;
      pushLineTo(f.entry);
      pushArcTo(f);
    };

    const computeCornerFillets = (runPoints: Vector[], isClosed: boolean): Array<Fillet | null> => {
      const cornerFillets: Array<Fillet | null> = new Array(runPoints.length).fill(null);
      if (isClosed && runPoints.length >= 3) {
        for (let i = 0; i < runPoints.length; i++) {
          const prev = runPoints[(i - 1 + runPoints.length) % runPoints.length];
          const curr = runPoints[i];
          const next = runPoints[(i + 1) % runPoints.length];
          cornerFillets[i] = buildFillet(prev, curr, next);
        }
        return cornerFillets;
      }

      for (let i = 1; i < runPoints.length - 1; i++) {
        cornerFillets[i] = buildFillet(runPoints[i - 1], runPoints[i], runPoints[i + 1]);
      }
      return cornerFillets;
    };

    const pushRoundedRun = (runPoints: Vector[], isClosed = false, startAnchorIndex = -1) => {
      if (runPoints.length < 2) return;

      const cornerFillets = computeCornerFillets(runPoints, isClosed);

      if (isClosed) {
        const startFillet = cornerFillets[0];
        if (startAnchorIndex >= 0) {
          const startAnchor = rounded[startAnchorIndex];
          const p = startFillet ? startFillet.exit : runPoints[0];
          startAnchor.x = p.x;
          startAnchor.y = p.y;
        }

        for (let i = 1; i < runPoints.length; i++) {
          const f = cornerFillets[i];
          if (!f) {
            pushLineTo(runPoints[i]);
            continue;
          }
          pushFillet(f);
        }

        if (startFillet) {
          pushFillet(startFillet);
        } else {
          pushLineTo(runPoints[0]);
        }
        return;
      }

      for (let i = 1; i < runPoints.length; i++) {
        const f = i < runPoints.length - 1 ? cornerFillets[i] : null;
        if (!f) {
          pushLineTo(runPoints[i]);
          continue;
        }
        pushFillet(f);
      }
    };

    let lineRun: Vector[] = [];
    let lineRunStartAnchorIndex = -1;
    for (let i = 1; i < source.length; i++) {
      const current = source[i];
      const previous = source[i - 1];

      if (current.command === Commands.line) {
        if (lineRun.length === 0) {
          lineRunStartAnchorIndex = rounded.length - 1;
          lineRun.push(new Vector(previous.x, previous.y));
        }
        lineRun.push(new Vector(current.x, current.y));
        continue;
      }

      if (lineRun.length > 0) {
        pushRoundedRun(lineRun, current.command === Commands.close, lineRunStartAnchorIndex);
        lineRun = [];
        lineRunStartAnchorIndex = -1;
      }
      rounded.push(new Anchor().copy(current));
    }

    if (lineRun.length > 0) {
      pushRoundedRun(lineRun, false, lineRunStartAnchorIndex);
    }

    return changed ? rounded : null;
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
    if (!head) return;

    const shaft = this._shaft;
    const visibleLength = Math.max(0, (this._end - this._start) * (shaft as any).length);

    if (visibleLength <= 1e-6) {
      head.visible = false; return;
    }

    const t = Math.max(0, Math.min(1, this._end));
    const dt = 1e-3;
    const ta = Math.max(0, Math.min(1, t - dt));
    const tb = Math.max(0, Math.min(1, t + dt));
    const p1 = shaft.getPointAt(ta);
    const p2 = shaft.getPointAt(tb);
    const p = shaft.getPointAt(t);
    if (!p1 || !p2 || !p) {
      head.visible = false; return;
    }

    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    head.rotation = angle;
    head.position = p;

    (head as any).stroke = shaft.stroke;
    (head as any).linewidth = shaft.linewidth;
    (head as any).cap = shaft.cap;
    (head as any).join = shaft.join;
    (head as any).opacity = shaft.opacity;
    (head as any).fill = shaft.stroke;

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
   * @name Two.Arrow#_update
   * @function
   * @private
   * @description Overrides Path._update to update the arrow head automatically
   */
  _update() {
    this._syncGeometry();
    this._syncHead();
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
