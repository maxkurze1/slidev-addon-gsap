import Two from "two.js";
import { Vector } from "two.js/src/vector";
import { AnchorLike, resolveVec, TwoLike, requireTwoInstance, expandPositions } from "./util";

const { Path, Anchor, Commands } = Two;

/**
 * Reactive circle that keeps its center synced to a live point source.
 */
export class Circle extends Path {
  _flagRadius = false;
  _radius = 0;
  _radiusSource: number | (() => number);
  _center: AnchorLike;

  constructor(center: AnchorLike, radius: number | (() => number) = 0, resolution = 24) {
    const amount = Math.max(resolution, 4);
    const points: Two.Anchor[] = [];
    for (let i = 0; i < amount; i++) {
      points.push(new Anchor(0, 0, 0, 0, 0, 0));
    }

    super(points, true, true, true);

    this._center = center;
    this._radiusSource = radius;
    this.radius = typeof radius === "function" ? radius() : radius;
    this._update();
  }

  static Properties = ["radius"];

  get radius() {
    return this._radius;
  }
  set radius(v: number) {
    this._radiusSource = v;
    this._radius = Math.max(0, v);
    this._flagRadius = true;
  }

  _syncCenter() {
    const c = resolveVec(this._center);
    if (!c) return;
    this.translation.x = c.x;
    this.translation.y = c.y;
  }

  _syncRadius() {
    const raw = typeof this._radiusSource === "function"
      ? this._radiusSource()
      : this._radiusSource;
    if (typeof raw !== "number" || Number.isNaN(raw)) return;
    const next = Math.max(0, raw);
    if (next !== this._radius) {
      this._radius = next;
      this._flagRadius = true;
    }
  }

  _update() {
    this._syncCenter();
    this._syncRadius();

    if (this._flagVertices || this._flagRadius) {
      let length = this.vertices.length;
      if (!this.closed && length > 2) {
        length -= 1;
      }

      const c = (4 / 3) * Math.tan(Math.PI / (length * 2));
      const radius = this._radius;
      const rc = radius * c;

      for (let i = 0; i < this.vertices.length; i++) {
        const pct = i / length;
        const theta = pct * Math.PI * 2;

        const x = radius * Math.cos(theta);
        const y = radius * Math.sin(theta);

        const lx = rc * Math.cos(theta - Math.PI / 2);
        const ly = rc * Math.sin(theta - Math.PI / 2);

        const rx = rc * Math.cos(theta + Math.PI / 2);
        const ry = rc * Math.sin(theta + Math.PI / 2);

        const v = this.vertices[i];
        v.command = i === 0 ? Commands.move : Commands.curve;
        v.set(x, y);
        v.controls.left.set(lx, ly);
        v.controls.right.set(rx, ry);
      }

      this._flagRadius = false;
    }

    super._update();
    return this;
  }

  static fromObject(obj: Circle) {
    const circle = new Circle(new Vector(0, 0), 0).copy(obj);
    if ("id" in obj) {
      circle.id = obj.id;
    }
    return circle;
  }

  copy(circle: Circle) {
    super.copy(circle);
    if ("radius" in circle && typeof circle.radius === "number") {
      this.radius = circle.radius;
    }
    return this;
  }
}

export function makeCircle(
  two: TwoLike,
  center: AnchorLike | AnchorLike[],
  radius: number | (() => number),
  props: Record<string, any> = {},
): Circle | Circle[] | null {
  const instance = requireTwoInstance(two, "makeCircle");

  const { items: centers, isArray: centerIsArray } = expandPositions(center);
  const circles: Circle[] = [];

  for (const c of centers) {
    const circle = new Circle(c, radius);
    instance.scene.add(circle);
    Object.assign(circle, props);
    circles.push(circle);
  }

  if (!centerIsArray || circles.length <= 1) {
    return circles[0] ?? null;
  }

  return circles;
}
