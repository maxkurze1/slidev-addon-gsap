import { watch, onMounted, onBeforeMount, onUnmounted, shallowRef, nextTick } from "vue"
import { useNav, useSlideContext } from "@slidev/client"
import { gsap } from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { Flip } from "gsap/Flip";
// import { GSDevTools } from "gsap/GSDevTools";

import { createRefProxy } from "./proxyref"
import { toGsapTargets, scopeTargetsToSlide } from "./TwoJS/util";
import { useSlide } from "./useSlide";

import { makeId, untrack, onSlideEnter, onSlideLeave, useIsSlideActive } from "./util";
import { attachEffects, type TimelineEffects } from "./effects";


gsap.registerPlugin(DrawSVGPlugin);
gsap.registerPlugin(Flip);
// gsap.registerPlugin(GSDevTools);

const CLICKS_MAX = 999999;

type MorphTarget = string | Element | Element[] | null | undefined;

type MorphOptions = {
  /** Morph duration in seconds. Default 0.8. */
  duration?: number;
  ease?: string;
  /** `true` scales via transform, `false` animates width/height. Default true. */
  scale?: boolean;
  /**
   * Leave `a` in place and visible — `b` still emerges from `a`'s box, so it
   * reads as `a` spawning a copy. Default false (i.e. `a` becomes `b`).
   */
  keep?: boolean;
} & Record<string, any>;

// A recorded morph, so its Flip geometry can be (re)built on slide-enter when
// the elements are actually laid out (at mount they may be display:none).
type MorphSpec = {
  elA: Element;
  elB: Element;
  at: number;
  opts: {
    duration: number;
    ease: string;
    scale: boolean;
    keep: boolean;
  } & Record<string, any>
};

type StepTimeline = gsap.core.Timeline & TimelineEffects & {
  /**
   * Mark a click step with an optional `delay` (in seconds)
   */
  step(delay?: number): StepTimeline
  click(delay?: number): StepTimeline
  /**
   * Morph element `a` onto element `b`'s position and size.
   */
  morph(a: MorphTarget, b: MorphTarget, opts?: MorphOptions): StepTimeline
}

type TimelineMethodName = "from" | "to" | "fromTo";

// Resolve a morph target to a single element, scoping selectors to the slide.
const firstTarget = (t: MorphTarget, root: HTMLElement | null): Element | null => {
  const scoped = scopeTargetsToSlide(t, root);
  if (Array.isArray(scoped)) return (scoped[0] as Element) ?? null;
  return (scoped as Element) ?? null;
};

export function useTl() {
  const slide = useSlide()
  const { currentPage, clicksContext, isPrintMode, queryClicksRaw } = useNav()
  const { $clicks, $page, $slidev, $frontmatter, $renderContext } = useSlideContext()
  const { $clicksContext: clicks } = useSlideContext()
  const active = useIsSlideActive()
  const id = makeId()

  // Click index of the URL, captured during setup — before it is clamped on mount.
  let tl = shallowRef<StepTimeline | null>(null)
  // let dev: GSDevTools | null = null;
  let tween: gsap.core.Tween | null = null
  let step_idx = 0
  /* morphs to (re)build once the slide is visible — see refreshMorphs() */
  const morphSpecs: MorphSpec[] = []

  function patchTl(tl: gsap.core.Timeline) : StepTimeline {
    // scope from/to/fromTo selectors to the current slide
    for (const name of ["from", "to", "fromTo"]) {
      const original = (tl as any)[name];
      if (typeof original !== "function") continue;
      (tl as any)[name] = function (...args: any[]) {
        if (args.length > 0) {
          args[0] = toGsapTargets(scopeTargetsToSlide(args[0], slide.value));
        }
        return original.apply(this, args);
      };
    }
    tl.step = function (delay?: number) {
      this.addLabel("step-" + String(step_idx))
      // write maxMap directly to avoid the clicks.register() post-mount warning
      // The maxMap returns a reactive clicks map
      clicks?.maxMap?.set(id, step_idx++)
      if (delay && delay > 0) this.to({}, { duration: delay })
      return this
    }
    tl.click = tl.step;

    tl.morph = function (this: StepTimeline, a: MorphTarget, b: MorphTarget, opts?: MorphOptions) {
      const elA = firstTarget(a, slide.value);
      const elB = firstTarget(b, slide.value);
      if (!elA || !elB) {
        console.warn("useTl.morph: could not resolve", !elA ? a : b);
        return this;
      }

      const optsd = { duration: 0.8, ease: "power1.inOut", scale: true, keep: false, ...opts }
      // Append at the current end so the morph occupies this click's interval.
      const at = this.duration();

      // Reserve the "slot" with layout-independent tweens
      // the actual fit is built in refreshMorphs() on slide-enter
      // here `display` might be `none`
      // With `keep`, A neither moves nor fades — only B travels out of its box.
      if (!optsd.keep)
        this.to(elA, { autoAlpha: 0, duration: optsd.duration, ease: optsd.ease }, at);
      this.from(elB, { autoAlpha: 0, duration: optsd.duration, ease: optsd.ease }, at);

      morphSpecs.push({ elA, elB, at, opts: optsd });
      return this;
    } as StepTimeline["morph"];

    // preset effects (popIn, slideIn, pulse, …).
    // Note: add after `from`/ `to` are slide-scoped s.t. they inherit scoping
    attachEffects(tl, (target) => scopeTargetsToSlide(target, slide.value));

    return tl as StepTimeline
  }

  // tween to label with adjusted speedup
  // i.e. nervously clicking multiple times accelerates scrubbing
  function playToLabelNum(new_c: number){
    tween?.kill()
    if (!tl.value) return

    const currentTime = tl.value.time();
    const targetTime = tl.value.labels["step-" + String(new_c)];
    if (targetTime == null) {
      console.debug(`Step index "${new_c}" does not exist - ignoring it`);
      return;
    }
    let backwards = targetTime < currentTime

    /* difference between the current step-index and the user desired index */
    const diff = Object.entries(tl.value.labels)
      .filter(([name, time]) => /^step-\d+$/.test(name) &&
        time > Math.min(currentTime, targetTime) &&
        time < Math.max(currentTime, targetTime)).length
      + (backwards ? 1 : 0) /* additional speedup for going backwards */;
    tl.value.timeScale(Math.pow(1.8, diff))

    tween = tl.value.tweenTo("step-" + String(new_c), {
      onComplete: () => {
        tween = null
        tl.value?.timeScale(1)
      }
    })
  }

  // (Re)build each morph's Flip geometry against the *current* layout. Called on
  // slide-enter, when the slide is visible —
  // unlike onMounted, where display might be none
  function refreshMorphs() {
    const t = tl.value;
    if (!t) return;
    // Specs are recorded in timeline order. Process them in order so that a
    // morph measures the effect of any earlier morph that's already rebuilt.
    // Each spec is removed once built, so a repeat call is a no-op.
    let s: MorphSpec | undefined;
    while ((s = morphSpecs.shift())) {
      // render all ealier tweens to the DOM
      t.seek(s.at, true);

      const { keep, ...fitOpts } = s.opts;
      // `keep` leaves A alone — B alone emerging from A's box already reads as A
      // spawning a copy, so no stand-in element is needed.
      const fitA = keep ? null : Flip.fit(s.elA, s.elB, fitOpts);
      // B travels the same box→box path as A: snap it onto A's current box,
      // then animate back to its own, so the two stay overlapped and cross-fade.
      const natural = Flip.getState(s.elB);
      Flip.fit(s.elB, s.elA, { scale: s.opts.scale });
      const fitB = Flip.to(natural, fitOpts);

      if (fitA) t.add(fitA as gsap.core.Tween, s.at);
      if (fitB) t.add(fitB, s.at);
    }
  }

  watch($clicks, (new_c, old_c) => {
    /* if we are already on another slide
     * dont animate anymore - else it
     * looks a bit laggy during slide
     * transition  */
    if (!active.value) return;
    playToLabelNum(new_c)
  })

  onBeforeMount(() => {
    // Reserve the URL's click count before the it is clamped on mount
    const urlclicks = Math.max(0, Math.floor(+(queryClicksRaw?.value ?? 0)) || 0)

    if (active.value && urlclicks > 0)
      clicks?.maxMap?.set(id, urlclicks)

    // workaround for export mode (delay click total inference)
    if (isPrintMode.value)
      clicks?.maxMap?.set(id, CLICKS_MAX)
  })

  onMounted(async () => {
    tl.value = patchTl(gsap.timeline({ paused: true, id: `slide-${$page.value}` }))
    step_idx = 0

  })

  onSlideEnter(async (to_n, from_n) => {
    // TODO only call once
    // if ($frontmatter.gsap_debug)
    // if (!isPrintMode.value)
    //   dev = GSDevTools.create({animation: tl.value as any, persist: false, keyboard: false, hideGlobalTimeline: true, id: `slide-${$page.value}`});

    // Now the click count is known. Clamp over-large persisted click
    // (a stale/hand-edited URL, or a slide that lost steps) down to it.
    const total = clicks?.total ?? 0
    if (+(queryClicksRaw?.value ?? 0) > total) clicks.current = total

    // onBeforeMount reserved CLICKS_MAX release again if no steps were added
    if (isPrintMode.value && step_idx === 0)
      clicks?.maxMap?.delete(id)

    // Build/refresh morphs now that the slide is on-screen and laid out
    await nextTick()
    refreshMorphs()

    // instantly jump to the correct index
    let c = untrack($clicks)
    if (c == 0) {
      tl.value?.seek(0) // reset to 0s
      playToLabelNum(0) // animate to "step-0"
    } else {
      tl.value?.seek("step-" + String(c)) // reset to "step-{c}"
    }
  })

  onSlideLeave(() => {
    // GSDevTools.getById(`slide-${$page.value}`)?.kill()
    // dev?.kill()
    tween?.kill()
    tween = null
  })

  onUnmounted(() => {
    clicks.unregister(id)

    tween?.kill()
    tween = null
    tl.value?.kill()
    tl.value = null
    // tl?.revert() no need to revert state if unmounted anyway
  })

  return createRefProxy(tl, "Timeline")
}
