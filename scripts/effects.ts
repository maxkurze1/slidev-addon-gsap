import { gsap } from "gsap";
import { TextPlugin } from "gsap/TextPlugin";
import { SplitText } from "gsap/SplitText";
import { buildGlitch } from "./glitch";

// Self-register the plugins the presets rely on, so `attachEffects` works on ANY
// GSAP timeline — the library's `useTl`, but equally the docs demos — with no
// extra setup. This is what lets effects be defined once and reused everywhere.
gsap.registerPlugin(TextPlugin, SplitText);

// Chainable, good-default animation presets attached onto the useTl timeline.
// "In" presets use `.from` (element ends at its natural state, hidden until its
// step), "Out" presets use `.to`, and emphasis presets self-reset in place.
// Every preset forwards to the timeline's own `from`/`to`, so it inherits the
// slide-scoping of selectors and returns the timeline for chaining.
//
// The text presets rely on GSAP's TextPlugin (`type*`) and SplitText (`split*`);
// both are registered by `useTl` (TextPlugin) / here-via-useTl (SplitText).

type Dir = "left" | "right" | "top" | "bottom";
/** Granularity for the SplitText reveal presets. */
type SplitBy = "chars" | "words" | "lines";

/** Tween vars plus directional options used by the slide/fly presets. */
export type EffectVars = gsap.TweenVars & {
  /**
   * Direction for the directional presets. For slideIn/flyIn it's the side the
   * element enters FROM; for wipe/rise it's the edge the reveal starts at; for
   * skew it's the side the element arrives from. The paired "out" presets
   * (wipeOut/riseOut/skewOut) continue in that same direction, so reuse the same
   * `from` value. Defaults: "left" (slide/wipe/skew), "bottom" (fly/rise).
   */
  from?: Dir;
  /** Side an element exits TO (slideOut/flyOut). Default "left" / "bottom". */
  to?: Dir;
  /** Travel distance in px for the slide/fly/skew presets. */
  distance?: number;
  /** Split granularity for textSplitIn/textSplitOut. Default "chars". */
  by?: SplitBy;
};

type Pos = gsap.Position;

export interface TimelineEffects {
  // — entrances (animate in to the natural state) —
  fadeIn(target: gsap.TweenTarget, vars?: EffectVars, position?: Pos): this;
  popIn(target: gsap.TweenTarget, vars?: EffectVars, position?: Pos): this;
  scaleIn(target: gsap.TweenTarget, vars?: EffectVars, position?: Pos): this;
  blurIn(target: gsap.TweenTarget, vars?: EffectVars, position?: Pos): this;
  dropIn(target: gsap.TweenTarget, vars?: EffectVars, position?: Pos): this;
  slideIn(target: gsap.TweenTarget, vars?: EffectVars, position?: Pos): this;
  flyIn(target: gsap.TweenTarget, vars?: EffectVars, position?: Pos): this;
  /** Wipe in with a clip-path; `vars.from` sets the start edge (default "left"). */
  wipeIn(target: gsap.TweenTarget, vars?: EffectVars, position?: Pos): this;
  /** Fill in with a clip-path; `vars.from` sets the start edge (default "bottom"). */
  riseIn(target: gsap.TweenTarget, vars?: EffectVars, position?: Pos): this;
  /** Slide + un-skew into place; `vars.from` sets the arrival side (default "left"). */
  skewIn(target: gsap.TweenTarget, vars?: EffectVars, position?: Pos): this;
  /** Materialize from glitch fragments: cyberpunk RGB-split + scan-line tears. */
  glitchIn(target: gsap.TweenTarget, vars?: EffectVars, position?: Pos): this;
  // — exits (animate away) —
  fadeOut(target: gsap.TweenTarget, vars?: EffectVars, position?: Pos): this;
  popOut(target: gsap.TweenTarget, vars?: EffectVars, position?: Pos): this;
  scaleOut(target: gsap.TweenTarget, vars?: EffectVars, position?: Pos): this;
  blurOut(target: gsap.TweenTarget, vars?: EffectVars, position?: Pos): this;
  slideOut(target: gsap.TweenTarget, vars?: EffectVars, position?: Pos): this;
  flyOut(target: gsap.TweenTarget, vars?: EffectVars, position?: Pos): this;
  /** Wipe away with a clip-path, continuing `wipeIn`'s `vars.from` direction. */
  wipeOut(target: gsap.TweenTarget, vars?: EffectVars, position?: Pos): this;
  /** Wipe away with a clip-path, continuing `riseIn`'s `vars.from` direction. */
  riseOut(target: gsap.TweenTarget, vars?: EffectVars, position?: Pos): this;
  /** Slide + skew out, continuing `skewIn`'s `vars.from` direction. */
  skewOut(target: gsap.TweenTarget, vars?: EffectVars, position?: Pos): this;
  /** Dissolve into glitch fragments: cyberpunk RGB-split + scan-line tears. */
  glitchOut(target: gsap.TweenTarget, vars?: EffectVars, position?: Pos): this;
  // — emphasis (in place, self-resetting) —
  pulse(target: gsap.TweenTarget, vars?: EffectVars, position?: Pos): this;
  shake(target: gsap.TweenTarget, vars?: EffectVars, position?: Pos): this;
  wiggle(target: gsap.TweenTarget, vars?: EffectVars, position?: Pos): this;
  flash(target: gsap.TweenTarget, vars?: EffectVars, position?: Pos): this;
  bounce(target: gsap.TweenTarget, vars?: EffectVars, position?: Pos): this;
  /** Cyberpunk glitch in place: RGB chromatic split + horizontal scan-line tears. */
  glitch(target: gsap.TweenTarget, vars?: EffectVars, position?: Pos): this;
  // — text entrances (reveal text in) —
  /** Type the target's text in from empty (typewriter). */
  textTypeIn(target: gsap.TweenTarget, vars?: EffectVars, position?: Pos): this;
  /** Reveal the target's chars/words/lines with a stagger (`vars.by`). */
  textSplitIn(target: gsap.TweenTarget, vars?: EffectVars, position?: Pos): this;
  /** Chars converge from scattered positions, as if magnetically pulled together. */
  textGatherIn(target: gsap.TweenTarget, vars?: EffectVars, position?: Pos): this;
  /** Chars flip down into place like a split-flap board (3D rotateX). */
  textFlipIn(target: gsap.TweenTarget, vars?: EffectVars, position?: Pos): this;
  /** Grow an underline under each word, left → right. */
  textUnderlineIn(target: gsap.TweenTarget, vars?: EffectVars, position?: Pos): this;
  // — text exits (animate text away) —
  /** Delete the target's text to empty (typewriter). */
  textTypeOut(target: gsap.TweenTarget, vars?: EffectVars, position?: Pos): this;
  /** Hide the target's chars/words/lines with a stagger (`vars.by`). */
  textSplitOut(target: gsap.TweenTarget, vars?: EffectVars, position?: Pos): this;
  /** Chars scatter away to random positions. */
  textGatherOut(target: gsap.TweenTarget, vars?: EffectVars, position?: Pos): this;
  /** Chars flip away like a split-flap board (3D rotateX). */
  textFlipOut(target: gsap.TweenTarget, vars?: EffectVars, position?: Pos): this;
  /** Wipe the underline under each word away left → right (continues `textUnderlineIn`). */
  textUnderlineOut(target: gsap.TweenTarget, vars?: EffectVars, position?: Pos): this;
  // — text emphasis (in place) —
  /** Switch the target's text to `next` (TextPlugin diffs old → new). */
  textSwap(target: gsap.TweenTarget, next: string, vars?: EffectVars, position?: Pos): this;
}

function dirOffset(dir: Dir, dist: number): gsap.TweenVars {
  switch (dir) {
    case "left": return { x: -dist };
    case "right": return { x: dist };
    case "top": return { y: -dist };
    case "bottom": return { y: dist };
  }
}

const opposite: Record<Dir, Dir> = { left: "right", right: "left", top: "bottom", bottom: "top" };

// clip-path that collapses the box to a single edge (zero size on the opposite
// axis). Used by the wipe/rise family: animating away from this reveals the
// element starting at `dir`; animating to it hides toward `dir`.
function collapseInset(dir: Dir): string {
  switch (dir) {
    case "left": return "inset(0 100% 0 0)";
    case "right": return "inset(0 0 0 100%)";
    case "top": return "inset(0 0 100% 0)";
    case "bottom": return "inset(100% 0 0 0)";
  }
}

// Travel offset + matching lean for the skew presets. The skew tilts opposite to
// the offset (e.g. enter from the left → positive skewX), and the axis follows
// the direction (left/right → skewX, top/bottom → skewY).
function skewOffset(dir: Dir, dist: number, skew: number): gsap.TweenVars {
  switch (dir) {
    case "left": return { x: -dist, skewX: skew };
    case "right": return { x: dist, skewX: -skew };
    case "top": return { y: -dist, skewY: skew };
    case "bottom": return { y: dist, skewY: -skew };
  }
}

// Strip preset-only keys so they don't leak into a plain tween's vars.
function plain(vars: EffectVars): gsap.TweenVars {
  const { from: _f, to: _t, distance: _d, by: _b, ...rest } = vars;
  return rest;
}

type AnyTl = gsap.core.Timeline & Record<string, any>;

/**
 * Attach the preset effect methods onto a timeline (mutates it). Designed to be
 * called from `useTl`'s `attachStepFn`, after `from`/`to` are slide-scoped.
 */
/* These effects do not use GSAP's effects API (https://gsap.com/docs/v3/GSAP/gsap.effects/)
 * for a couple of reasons:
 * - `registerEffect` would pollute all GSAP timelines in the app and need double-registration guards
 *   (while this library is in control of all timelines it hands out anyhow)
 * - `from` and `to` are adapted s.t. their selectors are scoped to the current slide. This
 *   behavior should also apply to effects
 */
export function attachEffects<T extends gsap.core.Timeline>(
  tl: T,
  getRoot?: () => HTMLElement | null,
): T & TimelineEffects {
  const t = tl as AnyTl;

  // Resolve a target to the element(s) to split. String selectors are scoped to
  // the slide root (same contract as the patched from/to); elements/arrays pass
  // through. Falls back to global resolution when no root is available.
  const resolveTargets = (target: any): any => {
    if (typeof target !== "string") return target;
    const root = getRoot?.() ?? null;
    return root ? Array.from(root.querySelectorAll(target)) : target;
  };

  const FROM = (base: gsap.TweenVars) =>
    function (this: AnyTl, target: any, vars: EffectVars = {}, position?: Pos) {
      this.from(target, { ...base, ...plain(vars) }, position);
      return this;
    };
  const TO = (base: gsap.TweenVars) =>
    function (this: AnyTl, target: any, vars: EffectVars = {}, position?: Pos) {
      this.to(target, { ...base, ...plain(vars) }, position);
      return this;
    };

  t.fadeIn = FROM({ autoAlpha: 0, duration: 0.5, ease: "power2.out" });
  t.popIn = FROM({ autoAlpha: 0, scale: 0.6, transformOrigin: "50% 50%", duration: 0.5, ease: "back.out(1.7)" });
  t.scaleIn = FROM({ autoAlpha: 0, scale: 0, transformOrigin: "50% 50%", duration: 0.5, ease: "back.out(1.4)" });
  t.blurIn = FROM({ autoAlpha: 0, filter: "blur(12px)", duration: 0.6, ease: "power2.out" });
  t.dropIn = FROM({ autoAlpha: 0, y: -60, duration: 0.7, ease: "bounce.out" });

  t.fadeOut = TO({ autoAlpha: 0, duration: 0.4, ease: "power2.in" });
  t.popOut = TO({ autoAlpha: 0, scale: 0.6, transformOrigin: "50% 50%", duration: 0.4, ease: "back.in(1.7)" });
  t.scaleOut = TO({ autoAlpha: 0, scale: 0, transformOrigin: "50% 50%", duration: 0.4, ease: "back.in(1.4)" });
  t.blurOut = TO({ autoAlpha: 0, filter: "blur(12px)", duration: 0.4, ease: "power2.in" });

  t.slideIn = function (this: AnyTl, target: any, vars: EffectVars = {}, position?: Pos) {
    const { from = "left", distance = 60 } = vars;
    this.from(target, { autoAlpha: 0, ...dirOffset(from, distance), duration: 0.6, ease: "power3.out", ...plain(vars) }, position);
    return this;
  };
  t.flyIn = function (this: AnyTl, target: any, vars: EffectVars = {}, position?: Pos) {
    const { from = "bottom", distance = 120 } = vars;
    this.from(target, { autoAlpha: 0, scale: 0.8, transformOrigin: "50% 50%", ...dirOffset(from, distance), duration: 0.7, ease: "power3.out", ...plain(vars) }, position);
    return this;
  };
  t.slideOut = function (this: AnyTl, target: any, vars: EffectVars = {}, position?: Pos) {
    const { to = "left", distance = 60 } = vars;
    this.to(target, { autoAlpha: 0, ...dirOffset(to, distance), duration: 0.5, ease: "power3.in", ...plain(vars) }, position);
    return this;
  };
  t.flyOut = function (this: AnyTl, target: any, vars: EffectVars = {}, position?: Pos) {
    const { to = "bottom", distance = 120 } = vars;
    this.to(target, { autoAlpha: 0, scale: 0.8, transformOrigin: "50% 50%", ...dirOffset(to, distance), duration: 0.6, ease: "power3.in", ...plain(vars) }, position);
    return this;
  };

  // Whole-element clip-path wipe / fill. `vars.from` is the edge the reveal
  // starts FROM (default "left" for wipe, "bottom" for rise); the wipe travels
  // toward the opposite edge. The "out" CONTINUES in that same travel direction
  // rather than reversing it — wipeIn reveals `from`→opposite, wipeOut keeps
  // clipping across to the opposite edge. Pair an in/out with the same `from`.
  t.wipeIn = function (this: AnyTl, target: any, vars: EffectVars = {}, position?: Pos) {
    const { from = "left" } = vars;
    this.from(target, { clipPath: collapseInset(from), duration: 1.2, ease: "power3.inOut", ...plain(vars) }, position);
    return this;
  };
  t.wipeOut = function (this: AnyTl, target: any, vars: EffectVars = {}, position?: Pos) {
    const { from = "left" } = vars;
    this.to(target, { clipPath: collapseInset(opposite[from]), duration: 1.0, ease: "power3.inOut", ...plain(vars) }, position);
    return this;
  };
  t.riseIn = function (this: AnyTl, target: any, vars: EffectVars = {}, position?: Pos) {
    const { from = "bottom" } = vars;
    this.from(target, { clipPath: collapseInset(from), duration: 1.5, ease: "power2.out", ...plain(vars) }, position);
    return this;
  };
  t.riseOut = function (this: AnyTl, target: any, vars: EffectVars = {}, position?: Pos) {
    const { from = "bottom" } = vars;
    this.to(target, { clipPath: collapseInset(opposite[from]), duration: 1.0, ease: "power2.in", ...plain(vars) }, position);
    return this;
  };

  // Slide + skew: `vars.from` is the side the element arrives FROM (default
  // "left"); the out continues past, exiting the opposite side. Same `from`
  // pairs an in/out.
  t.skewIn = function (this: AnyTl, target: any, vars: EffectVars = {}, position?: Pos) {
    const { from = "left", distance = 100 } = vars;
    this.from(target, { autoAlpha: 0, ...skewOffset(from, distance, 30), duration: 1, ease: "power3.out", ...plain(vars) }, position);
    return this;
  };
  t.skewOut = function (this: AnyTl, target: any, vars: EffectVars = {}, position?: Pos) {
    const { from = "left", distance = 100 } = vars;
    this.to(target, { autoAlpha: 0, ...skewOffset(opposite[from], distance, 30), duration: 0.8, ease: "power3.in", ...plain(vars) }, position);
    return this;
  };

  t.pulse = TO({ scale: 1.12, transformOrigin: "50% 50%", duration: 0.18, yoyo: true, repeat: 1, ease: "power1.inOut" });
  t.shake = TO({ keyframes: { x: [0, -8, 8, -6, 6, -3, 0] }, duration: 0.5, ease: "power1.inOut" });
  t.wiggle = TO({ keyframes: { rotation: [0, -6, 6, -4, 4, -2, 0] }, transformOrigin: "50% 50%", duration: 0.6, ease: "power1.inOut" });
  t.flash = TO({ keyframes: { opacity: [1, 0, 1, 0, 1] }, duration: 0.6, ease: "power1.inOut" });
  t.bounce = TO({ keyframes: { y: [0, -20, 0, -8, 0] }, transformOrigin: "50% 50%", duration: 0.7, ease: "power1.out" });

  // Cyberpunk glitch family (emphasis / entrance / exit). The implementation lives in
  // ./glitch; each preset just forwards to `buildGlitch` with its mode, passing the
  // slide-scoped `resolveTargets` so the cut-out slices resolve like any other target.
  t.glitch = function (this: AnyTl, target: any, vars: EffectVars = {}, position?: Pos) {
    return buildGlitch(this, target, vars, position, "hold", resolveTargets);
  };
  t.glitchIn = function (this: AnyTl, target: any, vars: EffectVars = {}, position?: Pos) {
    return buildGlitch(this, target, vars, position, "in", resolveTargets);
  };
  t.glitchOut = function (this: AnyTl, target: any, vars: EffectVars = {}, position?: Pos) {
    return buildGlitch(this, target, vars, position, "out", resolveTargets);
  };

  // Split the target into chars/words/lines (scoped to the slide) and return the
  // pieces. They're real elements, so the patched from/to leaves them untouched.
  const splitPieces = (target: any, by: SplitBy): Element[] => {
    const split = new SplitText(resolveTargets(target), { type: by });
    return ((split as any)[by] as Element[]) ?? [];
  };

  // ——— text entrances/exits (paired). Each builds a `from` (in) or `to` (out)
  // tween; the "out" mirrors the "in" so they read as reverses of each other.
  // Sources: TextPlugin (typewriter), SplitText (per-piece), clip-path (whole).

  // Typewriter via TextPlugin: `from`/`to` an element's `text` to/from "".
  t.textTypeIn = FROM({ text: "", duration: 0.8, ease: "none" });
  t.textTypeOut = TO({ text: "", duration: 0.6, ease: "none" });

  // Split reveal: stagger each chars/words/lines piece in/out.
  const splitReveal = (mode: "in" | "out") =>
    function (this: AnyTl, target: any, vars: EffectVars = {}, position?: Pos) {
      const pieces = splitPieces(target, vars.by ?? "chars");
      if (!pieces.length) return this;
      if (mode === "in")
        this.from(pieces, { autoAlpha: 0, y: 12, duration: 0.5, ease: "power2.out", stagger: 0.03, ...plain(vars) }, position);
      else
        this.to(pieces, { autoAlpha: 0, y: -12, duration: 0.45, ease: "power2.in", stagger: 0.02, ...plain(vars) }, position);
      return this;
    };
  t.textSplitIn = splitReveal("in");
  t.textSplitOut = splitReveal("out");

  // ——— showcase text effects (inspired by gsapify.com/gsap-text-animations) ———

  // Per-char: converge from / scatter to random offsets. GSAP resolves each
  // "random(...)" string to a different value per char.
  const scatter = { x: "random(-200, 200)", y: "random(-200, 200)", rotation: "random(-90, 90)" };
  const gather = (mode: "in" | "out") =>
    function (this: AnyTl, target: any, vars: EffectVars = {}, position?: Pos) {
      const pieces = splitPieces(target, vars.by ?? "chars");
      if (!pieces.length) return this;
      if (mode === "in")
        this.from(pieces, { autoAlpha: 0, ...scatter, duration: 1, ease: "power3.out", stagger: 0.02, ...plain(vars) }, position);
      else
        this.to(pieces, { autoAlpha: 0, ...scatter, duration: 0.8, ease: "power3.in", stagger: 0.02, ...plain(vars) }, position);
      return this;
    };
  t.textGatherIn = gather("in");
  t.textGatherOut = gather("out");

  // Per-char: flip in/out around the top/bottom edge (3D rotateX).
  const flip = (mode: "in" | "out") =>
    function (this: AnyTl, target: any, vars: EffectVars = {}, position?: Pos) {
      const pieces = splitPieces(target, vars.by ?? "chars");
      if (!pieces.length) return this;
      const base = { transformPerspective: 400, stagger: { each: 0.06, from: "start" as const } };
      if (mode === "in")
        this.from(pieces, { autoAlpha: 0, rotationX: -90, transformOrigin: "50% 0%", duration: 0.4, ease: "power2.out", ...base, ...plain(vars) }, position);
      else
        this.to(pieces, { autoAlpha: 0, rotationX: 90, transformOrigin: "50% 100%", duration: 0.35, ease: "power2.in", ...base, ...plain(vars) }, position);
      return this;
    };
  t.textFlipIn = flip("in");
  t.textFlipOut = flip("out");

  // Per-word: a bottom underline (a CSS gradient set on each word) grows from /
  // shrinks to zero width, word by word. Only its width animates; anchoring the
  // gradient left (in) vs right (out) makes both run L→R — the underline draws on
  // left→right, then later empties from the left edge rightward.
  const underline = (mode: "in" | "out") =>
    function (this: AnyTl, target: any, vars: EffectVars = {}, position?: Pos) {
      const pieces = splitPieces(target, vars.by ?? "words");
      if (!pieces.length) return this;
      for (const el of pieces) {
        const s = (el as HTMLElement).style;
        s.backgroundImage = "linear-gradient(currentColor, currentColor)";
        s.backgroundRepeat = "no-repeat";
        s.backgroundPosition = mode === "in" ? "0 100%" : "100% 100%";
        s.backgroundSize = "100% 2px";
        s.paddingBottom = "0.08em";
      }
      if (mode === "in")
        this.from(pieces, { backgroundSize: "0% 2px", duration: 0.25, ease: "none", stagger: 0.05, ...plain(vars) }, position);
      else
        this.to(pieces, { backgroundSize: "0% 2px", duration: 0.2, ease: "none", stagger: 0.05, ...plain(vars) }, position);
      return this;
    };
  t.textUnderlineIn = underline("in");
  t.textUnderlineOut = underline("out");

  // ——— text emphasis (in place) ———

  // Switch the element's text to a new string (TextPlugin diffs old → new).
  t.textSwap = function (this: AnyTl, target: any, next: string, vars: EffectVars = {}, position?: Pos) {
    this.to(target, { text: next, duration: 0.8, ease: "none", ...plain(vars) }, position);
    return this;
  };

  return t as T & TimelineEffects;
}
