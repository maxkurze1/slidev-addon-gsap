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
};
let pending: Pending | null = null;

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
  const fromRoot = document.querySelector(`.slidev-page-${fromNo}`);
  if (!fromRoot) return;
  const els = Array.from(fromRoot.querySelectorAll<HTMLElement>(`[${attribute}]`));
  if (els.length === 0) return;

  const ids = new Set<string>();
  for (const el of els) {
    const id = el.getAttribute(attribute) || "";
    el.setAttribute("data-flip-id", id);
    ids.add(id);
  }
  pending = { state: Flip.getState(els), ids, fromNo: String(fromNo) };
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
    const toRoot = document.querySelector(`.slidev-page-${toNo}`);
    if (!toRoot) return;
    const targets = Array.from(toRoot.querySelectorAll<HTMLElement>(`[${attribute}]`))
      .filter((el) => handoff.ids.has(el.getAttribute(attribute) || ""));
    if (targets.length === 0) return;
    for (const el of targets) el.setAttribute("data-flip-id", el.getAttribute(attribute) || "");

    Flip.from(handoff.state, { targets, duration, ease, fade });
  });
}
