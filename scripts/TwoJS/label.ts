import Two from "two.js";
import type { Path as PathT } from "two.js/src/path";

const { Group, Text, RoundedRectangle } = Two;

export interface LabelOptions {
  /** The text to display. */
  text: string;
  /** Position along the (visible) shaft, 0..1. Default 0.5 (midpoint). */
  at?: number;
  /**
   * Offset from the point on the shaft. A number offsets perpendicular to the
   * shaft (negative = one side, positive = the other); [dx, dy] offsets in
   * absolute slide units.
   */
  offset?: number | [number, number];
  /** Rotate the text to follow the shaft direction. Default false. */
  rotate?: boolean;
  fill?: string;
  size?: number;
  family?: string;
  weight?: number | string;
  /** Draw a filled pill behind the text for readability (a CSS color). */
  background?: string;
  /** Padding around the text inside the background pill. Default 4. */
  padding?: number;
}

// What `text`/`label` props accept on Path/Arrow.
export type LabelInput = string | LabelOptions | null | undefined | false;

export function normalizeLabel(input: LabelInput): LabelOptions | null {
  if (input == null || input === false) return null;
  if (typeof input === "string") return input ? { text: input } : null;
  if (typeof input === "object" && typeof input.text === "string" && input.text) {
    return { ...input };
  }
  return null;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * A text label that rides along a Two.js path/arrow shaft. Lives as a child of
 * the Path/Arrow group; `update()` repositions it every frame so it tracks the
 * (reactive) geometry and the drawn-on portion.
 */
export class PathLabel extends Group {
  opts: LabelOptions;
  _text: any;
  _bg: any = null;

  constructor(opts: LabelOptions) {
    super();
    this.opts = opts;

    if (opts.background) {
      const bg = new RoundedRectangle(0, 0, 1, 1, 6);
      bg.fill = opts.background;
      bg.noStroke();
      this._bg = bg;
      this.add(bg);
    }

    const text = new Text(opts.text, 0, 0);
    text.size = opts.size ?? 16;
    if (opts.family) text.family = opts.family;
    if (opts.weight != null) text.weight = opts.weight;
    text.alignment = "center";
    text.baseline = "middle";
    text.noStroke();
    this._text = text;
    this.add(text);
  }

  get text(): string { return this._text.value; }
  set text(v: string) { this._text.value = v; this.opts.text = v; }

  /**
   * Reposition along `shaft`, restricted to the currently drawn portion
   * [start, end] so the label reveals together with a draw-on animation.
   * `defaultFill` is used when the label has no explicit `fill`.
   */
  update(shaft: PathT, start: number, end: number, defaultFill: string) {
    const visible = end - start;
    if (visible <= 1e-4) { this.visible = false; return; }

    const t = clamp01(start + clamp01(this.opts.at ?? 0.5) * visible);
    const p = shaft.getPointAt(t);
    if (!p) { this.visible = false; return; }
    this.visible = true;

    const dt = 1e-3;
    const a = shaft.getPointAt(clamp01(t - dt));
    const b = shaft.getPointAt(clamp01(t + dt));
    const angle = a && b ? Math.atan2(b.y - a.y, b.x - a.x) : 0;

    let x = p.x, y = p.y;
    const off = this.opts.offset;
    if (typeof off === "number") {
      x += Math.cos(angle - Math.PI / 2) * off;
      y += Math.sin(angle - Math.PI / 2) * off;
    } else if (Array.isArray(off)) {
      x += off[0];
      y += off[1];
    }
    this.translation.set(x, y);
    this.rotation = this.opts.rotate ? angle : 0;

    this._text.fill = this.opts.fill ?? defaultFill;

    if (this._bg) {
      const pad = this.opts.padding ?? 4;
      const r = this._text.getBoundingClientRect?.(true);
      const size = this.opts.size ?? 16;
      const w = r && r.width ? r.width : this._text.value.length * size * 0.6;
      const h = r && r.height ? r.height : size * 1.2;
      this._bg.width = w + pad * 2;
      this._bg.height = h + pad * 2;
    }
  }
}
