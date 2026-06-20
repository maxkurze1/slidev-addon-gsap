import { dims, HeadPath, ellipseVerts, arcVerts, symArc, mirrorXPoint, type HeadSpec, type HeadPoint } from "./PathHead";

// ---------------------------------------------------------------------------
// Arrow tips, inspired by the TikZ `arrows.meta` library and grouped by the
// same categories: https://tikz.dev/tikz-arrows#sec-16.5
//
// Each entry is a HeadSpec; the actual geometry lives in `build(u)`, which
// receives a stroke-derived unit so tips scale with line width. See PathHead.ts
// for the local frame convention (tip at origin, pointing +x).
// ---------------------------------------------------------------------------

// === Barbed arrow tips =====================================================

// `>` — two straight barbs meeting at the tip.
const straightBarb: HeadSpec = {
  name: "straight",
  build(u) {
    const { L, w } = dims(u);
    return [[-L, -w], [0, 0], [-L, w]];
  },
};

// Two barbs that sweep as a single circular arc through the tip.
const arcBarb: HeadSpec = {
  name: "arc",
  build(u) {
    const { L, w } = dims(u);
    return symArc([0, 0], [-L, w]);
  },
};

// `|` — a short bar perpendicular to the line at the tip.
const bar: HeadSpec = {
  name: "bar",
  build(u) {
    const { w } = dims(u);
    return [[0, -1.15 * w], [0, 1.15 * w]];
  },
};

// Mirror a tip across the y-axis (negate x) to produce its opposite-facing
// twin, e.g. `]` → `[` or `)` → `(`.
function mirrorX(spec: HeadSpec, name: string): HeadSpec {
  return {
    name,
    closed: spec.closed,
    fill: spec.fill,
    build: (u, arg) => spec.build(u, arg).map(mirrorXPoint),
  };
}

// `]` — a square bracket with feet pointing back along the line.
const bracket: HeadSpec = {
  name: "bracket",
  build(u) {
    const { w } = dims(u);
    const d = 0.6 * w;
    return [[-d, -w], [0, -w], [0, w], [-d, w]];
  },
};

// `[` — the mirrored bracket; its feet reach forward to embrace the target.
const leftBracket = mirrorX(bracket, "left bracket");

// A stroke-only (hollow) twin of a filled tip: identical outline, no fill. Used
// to derive the "open" geometric tips from their solid counterparts.
function outline(spec: HeadSpec, name: string): HeadSpec {
  return { name, closed: spec.closed, fill: false, build: spec.build };
}

// `)` — a rounded (parenthesis) bracket. Its forward bulge meets the shaft tip.
const parenthesis: HeadSpec = {
  name: "parenthesis",
  build(u) {
    const { w } = dims(u);
    return symArc([0, 0], [-0.7 * w, 1.5 * w]);
  },
};

// `(` — the mirrored parenthesis, opening toward the target.
const leftParenthesis = mirrorX(parenthesis, "left parenthesis");

// Two fish-hook shaped barbs that both start at the tip and curl outward.
const hooks: HeadSpec = {
  name: "hooks",
  build(u) {
    const { w } = dims(u);
    const r = 0.7 * w;
    const sweep = 1.15 * Math.PI; // a little over a half-circle — a hook, not a loop
    // Each arc already opens with a `move`, so the two hooks form two sub-paths.
    const upper = arcVerts(0, -r, r, Math.PI / 2, Math.PI / 2 + sweep);
    const lower = arcVerts(0, r, r, -Math.PI / 2, -Math.PI / 2 - sweep);
    // Mirror across the y-axis so the hooks open the right way.
    return [...upper, ...lower].map(mirrorXPoint);
  },
};

// An I-beam: a bar through the tip with a shorter bar across each of its ends.
const teeBarb: HeadSpec = {
  name: "tee",
  build(u) {
    const { w } = dims(u);
    const H = 1.15 * w; // half-height of the upright bar
    const t = 0.5 * w;  // half-length of each cross bar
    return [
      [0, -H], [0, H],            // upright bar through the tip
      [-t, -H, "move"], [t, -H],  // top cross bar
      [-t, H, "move"], [t, H],    // bottom cross bar
    ];
  },
};

// === Mathematical barbed arrow tips ========================================

// The classic TeX `\to` head: two gently swept barbs meeting at the tip.
const classicalRightarrow: HeadSpec = {
  name: "classical",
  build(u) {
    const { L, w } = dims(u);
    return new HeadPath()
      .moveTo(0, 0).curveThrough([-0.55 * L, -0.3 * w], -L, -w)
      .moveTo(0, 0).curveThrough([-0.55 * L, 0.3 * w], -L, w)
      .build();
  },
};

// Computer Modern's filled arrowhead: concave swept barbs around a back notch
// (the connection point); the corners flare behind it and the point leads.
const cmRightarrow: HeadSpec = {
  name: "cm",
  closed: true,
  fill: true,
  build(u) {
    const { L, w } = dims(u);
    return new HeadPath()
      .moveTo(0.62 * L, 0)                                  // tip
      .curveThrough([0.12 * L, -0.28 * w], -0.38 * L, -w)   // → upper corner
      .curveThrough([-0.16 * L, -0.5 * w], 0, 0)            // → back notch
      .curveThrough([-0.16 * L, 0.5 * w], -0.38 * L, w)     // → lower corner
      .closeThrough([0.12 * L, 0.28 * w])                   // → back to tip
      .build();
  },
};

// === Geometric arrow tips ==================================================
// Filled tips connect at their *rear* (the shaft truncates to meet it at (0,0))
// and extend forward in +x to their point.

const triangle: HeadSpec = {
  name: "triangle",
  closed: true,
  fill: true,
  build(u) {
    const { L, w } = dims(u);
    return [[0, -w], [L, 0], [0, w]];
  },
};

// A slender dart with a concave (swallow-tail) back — TikZ's default `->`.
// The shaft meets the back notch; the tail corners flare behind it.
const stealth: HeadSpec = {
  name: "stealth",
  closed: true,
  fill: true,
  build(u) {
    const { L, w } = dims(u);
    const Ls = 1.4 * L, ws = 1.05 * w;
    return [[0.4 * Ls, 0], [-0.6 * Ls, -ws], [0, 0], [-0.6 * Ls, ws]];
  },
};

// A triangle with gently concave sides, like the LaTeX arrowhead.
const latex: HeadSpec = {
  name: "latex",
  closed: true,
  fill: true,
  build(u) {
    const { L, w } = dims(u);
    const Ll = 1.2 * L, wl = w;
    return new HeadPath()
      .moveTo(Ll, 0)                                  // tip
      .curveThrough([0.5 * Ll, -0.34 * wl], 0, -wl)   // → upper left
      .lineTo(0, wl)                                  // → lower left
      .closeThrough([0.5 * Ll, 0.34 * wl])            // → back to tip
      .build();
  },
};

// A pointed quadrilateral, widest ahead of its rear point.
const kite: HeadSpec = {
  name: "kite",
  closed: true,
  fill: true,
  build(u) {
    const { L, w } = dims(u);
    const Lk = 1.5 * L;
    // Widest point sits well back so the front spike is long and the rear taper
    // is short and steep.
    return [[Lk, 0], [0.34 * Lk, -w], [0, 0], [0.34 * Lk, w]];
  },
};

// An elongated rhombus, widest at center (longer than the turned square).
const diamond: HeadSpec = {
  name: "diamond",
  closed: true,
  fill: true,
  build(u) {
    const { L, w } = dims(u);
    const Ld = 2 * L;
    return [[Ld, 0], [0.5 * Ld, -w], [0, 0], [0.5 * Ld, w]];
  },
};

// A square standing on one corner, rear corner at the connection.
const turnedSquare: HeadSpec = {
  name: "turned square",
  closed: true,
  fill: true,
  build(u) {
    const { w } = dims(u);
    const s = w;
    return [[2 * s, 0], [s, -s], [0, 0], [s, s]];
  },
};

// An axis-aligned square; its rear edge sits at the connection.
const square: HeadSpec = {
  name: "square",
  closed: true,
  fill: true,
  build(u) {
    const { w } = dims(u);
    return [[2 * w, -w], [2 * w, w], [0, w], [0, -w]];
  },
};

// An axis-aligned landscape rectangle; its rear edge sits at the connection.
const rectangle: HeadSpec = {
  name: "rectangle",
  closed: true,
  fill: true,
  build(u) {
    const { w } = dims(u);
    const h = 0.6 * w, len = 2.4 * w;
    return [[len, -h], [len, h], [0, h], [0, -h]];
  },
};

const ellipse: HeadSpec = {
  name: "ellipse",
  closed: true,
  fill: true,
  build(u) {
    const { w } = dims(u);
    const ry = w, rx = 2 * w; // 2:1 ratio, same height as the circle
    return ellipseVerts(rx, 0, rx, ry);
  },
};

const circle: HeadSpec = {
  name: "circle",
  closed: true,
  fill: true,
  build(u) {
    const { w } = dims(u);
    return ellipseVerts(w, 0, w, w);
  },
};

// === Special arrow tips ====================================================

// Short rays radiating evenly in every direction around the tip. The ray count
// is configurable via the head argument, e.g. `rays[3]` or `rays[5]`.
const rays: HeadSpec = {
  name: "rays",
  build(u, arg) {
    const { L } = dims(u);
    const Lr = 0.95 * L;
    const n = Math.max(1, Math.round(arg ?? 6));
    const out: HeadPoint[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      out.push([0, 0, "move"]);
      out.push([Lr * Math.cos(a), Lr * Math.sin(a)]);
    }
    return out;
  },
};

// The solid geometric tips, and their hollow (stroke-only) twins named
// `open <name>` — e.g. `triangle` → `open triangle`, `circle` → `open circle`.
const geometric = [triangle, stealth, latex, kite, diamond, turnedSquare, square, rectangle, ellipse, circle];
const geometricOpen = geometric.map((spec) => outline(spec, `open ${spec.name}`));

/** Tips grouped by the TikZ `arrows.meta` categories (the source of truth for
 *  both the registry and the docs gallery). */
export const HEAD_GROUPS: Array<{ title: string; specs: HeadSpec[] }> = [
  { title: "Barbed", specs: [straightBarb, arcBarb, bar, teeBarb, bracket, leftBracket, parenthesis, leftParenthesis, hooks] },
  { title: "Mathematical barbed", specs: [classicalRightarrow, cmRightarrow] },
  { title: "Geometric", specs: geometric },
  { title: "Geometric (open)", specs: geometricOpen },
  { title: "Special", specs: [rays] },
];

/** Every ported tip, in TikZ-reference order. */
export const HEAD_SPECS: HeadSpec[] = HEAD_GROUPS.flatMap((g) => g.specs);
