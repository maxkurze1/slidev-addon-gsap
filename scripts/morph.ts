import { nextTick } from "vue";
import { gsap } from "gsap";
import { Flip } from "gsap/Flip";

gsap.registerPlugin(Flip);

export type SlideMorphOptions = {
  /**
   * Turn cross-slide morphing on/off. Deck-headmatter only. Default true.
   * Shorthand: `morph: false` in the headmatter disables it for the whole deck.
   */
  enabled?: boolean;
  /** Morph duration in seconds. Default 0.6. */
  duration?: number;
  ease?: string;
  /** Fade unmatched elements in/out during the flip. Default true. */
  fade?: boolean;
  /** Attribute used to pair elements across slides. Default "data-morph". */
  attribute?: string;
};

export const DEFAULT_ATTR = "data-morph";

// Geometry handed off from the leaving slide (capture) to the entering one (apply).
type Pending = {
  state: ReturnType<typeof Flip.getState>;
  ids: Set<string>;
  fromNo: string;
  /**
   * Where the leaving slide sat on screen when the geometry was recorded. Flip
   * records viewport coordinates, so this is the origin they are relative to —
   * `rebaseState` needs it to move them onto the entering slide.
   */
  root: DOMRect;
};
let pending: Pending | null = null;

const slideRoot = (no: number | string) =>
  document.querySelector<HTMLElement>(`.slidev-page-${no}`);

/**
 * Snapshot the leaving slide's morph elements while it's still at rest. Call
 * from a router `beforeEach` guard — it runs before the DOM swaps, so the source
 * geometry is captured before any transition moves it. Flip pairs source↔target
 * by `data-flip-id`, which we set from the shared morph key.
 */
export function captureSlide(
  fromNo: number | string | undefined | null,
  attribute: string = DEFAULT_ATTR,
) {
  pending = null;
  if (fromNo == null) return;
  const fromRoot = slideRoot(fromNo);
  if (!fromRoot) return;
  const els = Array.from(fromRoot.querySelectorAll<HTMLElement>(`[${attribute}]`));
  if (els.length === 0) return;

  const root = fromRoot.getBoundingClientRect();
  if (!root.width || !root.height) return;

  const ids = new Set<string>();
  for (const el of els) {
    const id = el.getAttribute(attribute) || "";
    el.setAttribute("data-flip-id", id);
    ids.add(id);
  }
  pending = { state: Flip.getState(els), ids, fromNo: String(fromNo), root };
}

/**
 * Move the recorded viewport geometry from the leaving slide's box onto the
 * entering one's, so the flip plays out inside the entering slide's own
 * coordinate space.
 *
 * Both slides occupy the same box once they are at rest, but the entering one
 * is mid-transition when the flip starts: `slide-left` & co. have it translated
 * by up to a full slide width. Without rebasing, the flip's start geometry
 * lands that far *outside* the entering slide — and everything that lives in
 * slide coordinates goes with it. `usePos` anchors then report positions off
 * the slide, and the Two.js layers drawn from them are clipped to the slide, so
 * an arrow anchored to a morphing element is drawn off-canvas for the whole
 * transition instead of following it.
 *
 * Rebasing makes the morph a pure in-slide move: identical geometry under every
 * transition (rather than depending on where the incoming slide happened to be
 * on the frame the flip was built), and anchors that stay valid from the first
 * frame of the morph to the last.
 *
 * Only Flip's own recorded boxes are touched (`bounds`, plus the `e`/`f`
 * translation of the global matrix); if a future GSAP changes that shape, the
 * state is left alone and the morph falls back to the previous geometry.
 */
function rebaseState(handoff: Pending, toRoot: HTMLElement): void {
  const to = toRoot.getBoundingClientRect();
  if (!to.width || !to.height) return;

  const dx = to.left - handoff.root.left;
  const dy = to.top - handoff.root.top;
  if (!dx && !dy) return;

  const states = (handoff.state as any)?.elementStates;
  if (!Array.isArray(states)) return;

  for (const elState of states) {
    const b = elState?.bounds;
    if (b) elState.bounds = new DOMRect(b.x + dx, b.y + dy, b.width, b.height);
    const m = elState?.matrix;
    // The global matrix carries the element's absolute translation in e/f.
    if (m && typeof m.e === "number" && typeof m.f === "number") {
      m.e += dx;
      m.f += dy;
    }
  }
}

/**
 * Morph the entering slide's matching elements out of the captured geometry.
 * Call from a router `afterEach` guard, passing the options resolved from
 * frontmatter. Runs after the entering slide renders, concurrently with the
 * slide transition — so the element morphs *during* it, for any transition.
 */
export function applyMorph(
  toNo: number | string | undefined | null,
  options: SlideMorphOptions = {},
) {
  const handoff = pending;
  pending = null;
  if (!handoff || toNo == null || handoff.fromNo === String(toNo)) return;

  const attribute = options.attribute ?? DEFAULT_ATTR;
  const duration = options.duration ?? 0.6;
  const ease = options.ease ?? "power1.inOut";
  const fade = options.fade ?? true;

  nextTick(() => {
    const toRoot = slideRoot(toNo);
    if (!toRoot) return;
    const targets = Array.from(toRoot.querySelectorAll<HTMLElement>(`[${attribute}]`))
      .filter((el) => handoff.ids.has(el.getAttribute(attribute) || ""));
    if (targets.length === 0) return;
    for (const el of targets) el.setAttribute("data-flip-id", el.getAttribute(attribute) || "");

    rebaseState(handoff, toRoot);

    Flip.from(handoff.state, { targets, duration, ease, fade });
  });
}
