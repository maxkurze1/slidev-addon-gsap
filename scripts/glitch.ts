import { gsap } from "gsap";
import type { EffectVars } from "./effects";

// Cyberpunk glitch family, applicable to ANY element: `glitch` (emphasis, in place,
// self-resetting), `glitchIn` (entrance — materializes from the tears) and
// `glitchOut` (exit — dissolves into them). All share the machinery below and play
// as a flipbook of short "tear" frames over the duration:
//  • each tear is a horizontal band that is masked OUT of the element (so it's
//    genuinely cut, not doubled) and simultaneously shown by a tinted clone slice
//    that's clipped to that band and slid sideways + nudged in y — the cut piece
//    appears displaced from where it left a gap;
//  • bands vary in height and offset frame-to-frame for a chaotic feel;
//  • the element also flashes a chromatic magenta / cyan drop-shadow throughout.
// The mask masks descendants too, so the slices live in the element's (relatively
// positioned) parent, overlaid by offset — not as children. Slices rest at opacity
// 0 and the mask heals to none between frames, so it reverses / replays cleanly.

type AnyTl = gsap.core.Timeline & Record<string, any>;
type Pos = gsap.Position;

/** How the mask is driven over the burst — the only thing that differs per preset. */
export type GlitchMode = "hold" | "in" | "out";

const G_MAGENTA = "#ff003c";
const G_CYAN = "#00fff9";
const transparent = "rgba(0,0,0,0)";
const chroma = (m: number, c: number, glow = "") =>
  `drop-shadow(${m}px 0 ${G_MAGENTA}) drop-shadow(${c}px 0 ${G_CYAN})${glow}`;

// An alpha mask that keeps the element opaque except for the given horizontal
// bands (in %), which become transparent — i.e. cut out. "" → no mask.
const cutMask = (bands: { top: number; h: number }[]): string => {
  if (!bands.length) return "none";
  const sorted = [...bands].sort((a, b) => a.top - b.top);
  const stops: string[] = [];
  let cursor = 0;
  for (const b of sorted) {
    const bot = b.top + b.h;
    stops.push(`#000 ${cursor}%`, `#000 ${b.top}%`, `#0000 ${b.top}%`, `#0000 ${bot}%`);
    cursor = bot;
  }
  stops.push(`#000 ${cursor}%`, `#000 100%`);
  return `linear-gradient(to bottom, ${stops.join(", ")})`;
};

type Band = { top: number; h: number; x: number; y: number; tint: string };

// Tear frames: normalized start/hold (× duration) + the bands torn that frame.
// Heights deliberately vary; x is the sideways displacement, y the small nudge.
const TEARS: { at: number; hold: number; bands: Band[] }[] = [
  { at: 0.04, hold: 0.12, bands: [{ top: 8, h: 13, x: -28, y: -3, tint: G_MAGENTA }] },
  { at: 0.20, hold: 0.08, bands: [{ top: 46, h: 5, x: 22, y: 3, tint: G_CYAN }, { top: 69, h: 17, x: 30, y: -2, tint: G_MAGENTA }] },
  { at: 0.32, hold: 0.06, bands: [{ top: 26, h: 4, x: -17, y: 4, tint: G_CYAN }] },
  { at: 0.42, hold: 0.10, bands: [{ top: 79, h: 9, x: 24, y: -4, tint: G_MAGENTA }, { top: 13, h: 7, x: -15, y: 2, tint: G_CYAN }] },
  { at: 0.56, hold: 0.11, bands: [{ top: 50, h: 14, x: -26, y: 3, tint: G_MAGENTA }] },
];
const SLICES = Math.max(...TEARS.map((f) => f.bands.length));

// Bands that TILE the element 0→100% (so cutting them all = fully gone), listed in
// a scrambled order — the order pieces vanish (glitchOut) / appear (glitchIn).
const PIECES: Band[] = [
  { top: 36, h: 7, x: -26, y: -3, tint: G_MAGENTA },
  { top: 0, h: 12, x: 22, y: 2, tint: G_CYAN },
  { top: 67, h: 16, x: 28, y: -2, tint: G_MAGENTA },
  { top: 20, h: 16, x: -18, y: 3, tint: G_CYAN },
  { top: 83, h: 17, x: 24, y: -3, tint: G_MAGENTA },
  { top: 43, h: 14, x: -24, y: 2, tint: G_CYAN },
  { top: 12, h: 8, x: 18, y: 3, tint: G_MAGENTA },
  { top: 57, h: 10, x: -20, y: -2, tint: G_CYAN },
];

/**
 * Build a glitch onto the timeline `self` at `position`. `resolveTargets` is the
 * caller's (slide-scoped) target resolver — same contract as the patched from/to.
 * `mode` chooses how the mask is driven:
 *  • "hold" (emphasis) — tears cut bands that HEAL back, element whole at the end;
 *  • "out" (exit) — cuts ACCUMULATE, pieces vanish one by one until nothing's left;
 *  • "in" (entrance) — element starts fully cut (hidden), pieces are revealed one by
 *    one until whole. No opacity fade: appearing / disappearing is all clip-path.
 */
export function buildGlitch(
  self: AnyTl,
  target: any,
  vars: EffectVars,
  position: Pos | undefined,
  mode: GlitchMode,
  resolveTargets: (target: any) => any,
): AnyTl {
  const resolved = resolveTargets(target);
  const els: HTMLElement[] =
    typeof resolved === "string" ? Array.from(document.querySelectorAll(resolved))
      : resolved instanceof Element ? [resolved as HTMLElement]
        : resolved && typeof resolved.length === "number" ? Array.from(resolved as any)
          : [];
  if (!els.length) return self;
  const duration = (vars.duration as number) ?? 0.6;

  for (const el of els) {
    const host = el.parentElement;
    if (!host || getComputedStyle(el).position === "fixed") continue;
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    // Drop slices from a prior glitch on this element (keeps replays idempotent).
    (el as any).__glitch?.forEach((n: HTMLElement) => n.remove());
    // Start from a clean mask so the slice clones (taken next) are never pre-masked.
    el.style.maskImage = ""; el.style.webkitMaskImage = "";

    // Tinted, hidden clone of the element, overlaid exactly inside the host. Not a
    // child of `el`, so `el`'s cut-out mask doesn't also mask the slice.
    const makeSlice = (): HTMLElement => {
      const s = el.cloneNode(true) as HTMLElement;
      s.removeAttribute("id");
      s.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
      s.setAttribute("data-glitch-layer", "");
      s.setAttribute("aria-hidden", "true");
      Object.assign(s.style, {
        position: "absolute",
        left: `${el.offsetLeft}px`, top: `${el.offsetTop}px`,
        width: `${el.offsetWidth}px`, height: `${el.offsetHeight}px`,
        margin: "0", pointerEvents: "none", opacity: "0",
      } as Partial<CSSStyleDeclaration>);
      host.appendChild(s);
      return s;
    };
    const slices = Array.from({ length: SLICES }, makeSlice);
    (el as any).__glitch = slices;

    // Build the glitch as a self-contained nested timeline, then drop it onto the
    // step timeline at `position` — keeps the tear scheduling in local 0..duration.
    const g = gsap.timeline();

    // The element: chromatic shadow flicker for the whole burst (no transform, so
    // the unskewed slices stay aligned with the gaps they're cut from).
    g.to(el, {
      keyframes: {
        filter: [
          `drop-shadow(0 0 0 ${transparent})`, chroma(-2, 2), chroma(3, -3),
          chroma(-4, 4, " drop-shadow(0 0 5px rgba(0,255,249,.45))"), chroma(2, -2),
          chroma(-3, 3, " drop-shadow(0 0 5px rgba(255,0,60,.4))"), chroma(2, -2),
          `drop-shadow(0 0 0 ${transparent})`,
        ],
        ease: "none",
      },
      duration, ease: "none",
    }, 0);

    // Flash a displaced, tinted copy of band `b` on slice `s` at time `at`.
    const flashSlice = (s: HTMLElement, b: Band, at: number) => {
      const edge = b.tint === G_MAGENTA ? -3 : 3;
      g.set(s, {
        clipPath: `inset(${b.top}% 0 ${100 - b.top - b.h}% 0)`,
        filter: `drop-shadow(${edge}px 0 ${b.tint}) drop-shadow(0 0 3px ${b.tint})`,
        x: b.x, y: b.y, opacity: 1,
      }, at);
    };
    const setMask = (m: string, at: number) => g.set(el, { webkitMaskImage: m, maskImage: m }, at);

    if (mode === "hold") {
      // Emphasis: each tear cuts a band, then heals — element whole at the end.
      for (const tear of TEARS) {
        const at = tear.at * duration;
        const heal = at + tear.hold * duration;
        setMask(cutMask(tear.bands), at);
        tear.bands.forEach((b, j) => flashSlice(slices[j], b, at));
        for (let j = tear.bands.length; j < slices.length; j++) g.set(slices[j], { opacity: 0 }, at);
        setMask("none", heal);
        slices.forEach((s) => g.set(s, { opacity: 0 }, heal));
      }
    } else {
      // Entrance / exit: cuts ACCUMULATE and never heal, so the element appears /
      // disappears piece by piece via clip-path — no opacity fade.
      const N = PIECES.length;
      const holdT = 0.06 * duration;
      // "in" starts fully cut (hidden until this step) — apply it now (so it's hidden
      // before the step plays) AND at g's start (so it stays hidden on reverse).
      if (mode === "in") {
        const all = cutMask(PIECES);
        el.style.maskImage = all; el.style.webkitMaskImage = all;
        setMask(all, 0);
      }
      PIECES.forEach((b, k) => {
        const at = (0.05 + 0.8 * (k / (N - 1))) * duration;
        const s = slices[k % slices.length];
        if (mode === "out") {
          // Cut this piece out (and keep it cut), flashing it as it tears away.
          setMask(cutMask(PIECES.slice(0, k + 1)), at);
          flashSlice(s, b, at);
          g.set(s, { opacity: 0 }, at + holdT);
        } else {
          // Flash the piece displaced, then snap it in by un-cutting it from the mask.
          flashSlice(s, b, at);
          setMask(cutMask(PIECES.slice(k + 1)), at + holdT);
          g.set(s, { opacity: 0 }, at + holdT);
        }
      });
    }

    self.add(g, position);
  }
  return self;
}
