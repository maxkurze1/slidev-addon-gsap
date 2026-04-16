import Two from "two.js";
import { Vector } from "two.js/src/vector";
import { AnchorLike, resolveVec, TwoLike, requireTwoInstance, expandPositions } from "./util";
import { PathLabel, normalizeLabel, type LabelInput } from "./label";

const { Group, Anchor, Path, Commands } = Two;

/**
 * Arrow with reactive endpoints.
 * Endpoints are resolved on every `_update()` so derived geometry stays live
 * when underlying positions are mutated (e.g. by GSAP + usePos).
 */
export class Arrow extends Group {
  _headlen = 10;
  _angle = 0.0;
  _tip_angle = 35 / 180;
  _head: Two.Path | null = null;
  _shaft: Two.Path | null = null;
  _end = 1;
  _start = 0;
  _from: AnchorLike;
  _to: AnchorLike;
  _label: PathLabel | null = null;

  constructor(from: AnchorLike, to: AnchorLike) {
    super();

    this._from = from;
    this._to = to;

    const shaftVertices = [
      new Anchor(0, 0, undefined, undefined, undefined, undefined, Commands.move),
      new Anchor(0, 0, undefined, undefined, undefined, undefined, Commands.line),
    ];
    const shaft = new Path(shaftVertices, false, false, true);

    const headVertices = [
      new Anchor(0, 0, undefined, undefined, undefined, undefined, Commands.move),
      new Anchor(0, 0, undefined, undefined, undefined, undefined, Commands.line),
      new Anchor(0, 0, undefined, undefined, undefined, undefined, Commands.move),
      new Anchor(0, 0, undefined, undefined, undefined, undefined, Commands.line),
    ];
    const head = new Path(headVertices, false, false, true);

    this._head = head;
    this._shaft = shaft;
    this.add(shaft, head);
    this.noFill();

    this.cap = "round";
    this.join = "round";

    this._update();
  }

  static Properties = ["headlen", "text"];

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

  get headlen() {
    return this._headlen;
  }
  set headlen(v: number) {
    this._headlen = v;
  }

  get head() { return this._head; }
  get shaft() { return this._shaft; }

  get end() { return this._end; }
  set end(v: number) {
    this._end = v;
    if (this._shaft) {
      this._shaft.ending = v;
    }
  }

  get start() { return this._start; }
  set start(v: number) {
    this._start = v;
    if (this._shaft) {
      this._shaft.beginning = v;
    }
  }

  _syncEndpoints() {
    const p1 = resolveVec(this._from);
    const p2 = resolveVec(this._to);
    const shaft = this._shaft;
    if (!p1 || !p2 || !shaft) return;

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    this.translation.x = p1.x;
    this.translation.y = p1.y;
    const tip = shaft.vertices[1];
    tip.x = dx;
    tip.y = dy;

    this._angle = Math.atan2(dy, dx);
  }

  /**
   * Keep shaft and arrow head in sync with current endpoints.
   */
  _update() {
    this._syncEndpoints();
    super._update();

    const shaft = this._shaft;
    const head = this._head;
    if (!shaft || !head) return this;

    const p = shaft.getPointAt(this._end) ?? shaft.vertices[1];
    if (!p) return this;

    const headlen = Math.min(this._end * shaft.length, this._headlen);
    const v1 = head.vertices[0];
    const v2 = head.vertices[1];
    const v3 = head.vertices[2];
    const v4 = head.vertices[3];

    v1.x = p.x;
    v1.y = p.y;
    v3.x = p.x;
    v3.y = p.y;

    v2.x = p.x - headlen * Math.cos(this._angle - Math.PI * this._tip_angle);
    v2.y = p.y - headlen * Math.sin(this._angle - Math.PI * this._tip_angle);
    v4.x = p.x - headlen * Math.cos(this._angle + Math.PI * this._tip_angle);
    v4.y = p.y - headlen * Math.sin(this._angle + Math.PI * this._tip_angle);

    this._label?.update(shaft, this._start, this._end, shaft.stroke as string);

    return this;
  }

  static fromObject(obj: Arrow) {
    const arrow = new Arrow(new Vector(0, 0), new Vector(0, 0));
    arrow.copy(obj);
    if ("id" in obj) arrow.id = obj.id;
    return arrow;
  }

  copy(arrow: Arrow) {
    super.copy(arrow);
    if ("headlen" in arrow) this.headlen = arrow.headlen;
    return this;
  }
}

export function makeArrow(
  two: TwoLike,
  from: AnchorLike | AnchorLike[],
  to: AnchorLike | AnchorLike[],
  props: Record<string, any> = {},
): Arrow | Arrow[] | null {
  const instance = requireTwoInstance(two, "makeArrow");

  const { items: fromArr, isArray: fromIsArray } = expandPositions(from);
  const { items: toArr, isArray: toIsArray } = expandPositions(to);

  const arrows: Arrow[] = [];

  for (const f of fromArr) {
    for (const t of toArr) {
      const arrow = new Arrow(f, t);
      instance.scene.add(arrow);
      Object.assign(arrow, props);
      arrows.push(arrow);
    }
  }

  if ((!fromIsArray && !toIsArray) || arrows.length <= 1) {
    return arrows[0] ?? null;
  }

  return arrows;
}
