import { watch, onMounted, onBeforeMount, onUnmounted, shallowRef, nextTick } from "vue"
import { useNav, useSlideContext } from "@slidev/client"

import { gsap } from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { Flip } from "gsap/Flip";
import { GSDevTools } from "gsap/GSDevTools";

import { createRefProxy } from "./proxxyref"
import { toGsapTargets } from "./TwoJS/util";
import { useSlide } from "./useSlide";

import { makeId, untrack, onSlideEnter, onSlideLeave, useIsSlideActive } from "./util";
import { attachEffects, type TimelineEffects } from "./effects";


gsap.registerPlugin(DrawSVGPlugin);
gsap.registerPlugin(Flip);
gsap.registerPlugin(GSDevTools);

type MorphTarget = string | Element | Element[] | null | undefined;

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
  } & Record<string, any>
  anims: gsap.core.Animation[];
};

type StepTimeline = gsap.core.Timeline & TimelineEffects & {
  step(): StepTimeline
  click(): StepTimeline
  /**
   * Morph element `a` so it fits onto element `b`'s position and size, as a
   * step in the timeline (plays on the current click, seekable/reversible).
   * Selectors are resolved within this slide. Defaults to a cross-fade so A
   * visually turns into B.
   */
  morph(a: MorphTarget, b: MorphTarget, opts?: {}): StepTimeline
}

type TimelineMethodName = "from" | "to" | "fromTo";

function scopeTargetsToSlide(targets: any, root: HTMLElement | null): any {
  if (typeof targets === "string") {
    if (!root) return [];
    return Array.from(root.querySelectorAll(targets));
  }
  if (Array.isArray(targets)) {
    return targets.map((t) => scopeTargetsToSlide(t, root));
  }
  return targets;
}

function patchGsapTargetMethods(tl: gsap.core.Timeline, getRoot: () => HTMLElement | null) {
  const methods: TimelineMethodName[] = ["from", "to", "fromTo"];
  for (const name of methods) {
    const original = (tl as any)[name];
    if (typeof original !== "function") continue;
    (tl as any)[name] = function (...args: any[]) {
      if (args.length > 0) {
        const root = getRoot();
        args[0] = toGsapTargets(scopeTargetsToSlide(args[0], root));
      }
      return original.apply(this, args);
    };
  }
}

export function useTl() {
  const slide = useSlide()
  const { currentPage, clicksContext, isPrintMode, queryClicksRaw } = useNav()
  const { $clicks, $page, $slidev, $frontmatter, $renderContext } = useSlideContext()
  const { $clicksContext: clicks } = useSlideContext()
  const active = useIsSlideActive()
  const id = makeId()

  // Click index the URL asks for on load, captured during setup — before the
  // clicks context clamps it on mount.
  let tl = shallowRef<StepTimeline | null>(null)
  let dev: GSDevTools | null = null;
  let tween: gsap.core.Tween | null = null
  let step_idx = 0
  /* the label that is being animated to / paused at */
  /* morphs to (re)build once the slide is visible — see refreshMorphs() */
  const morphSpecs: MorphSpec[] = []

  function attachStepFn(tl: gsap.core.Timeline) : StepTimeline {
    patchGsapTargetMethods(tl, () => slide.value)
    tl.step = function () {
      this.addLabel("step-" + String(step_idx))
      // We write maxMap directly instead of calling clicks.register(): steps are
      // typically added in the user's onMounted (after the clicks context has
      // already mounted), and register() warns about post-mount registration.
      // The maxMap getter returns the live (reactive, once mounted) map, so this
      // keeps Slidev's `total` in sync. An explicit `clicks:` frontmatter still
      // wins, because `total` uses it as an override ahead of maxMap.
      clicks?.maxMap?.set(id, step_idx++)
      return this
    }
    tl.click = tl.step;

    // Resolve a morph target to a single element
    const firstEl = (t: MorphTarget): Element | null => {
      const root = slide.value;
      if (t == null) return null;
      if (typeof t === "string") return root?.querySelector(t) ?? null;
      if (Array.isArray(t)) return (t[0] as Element) ?? null;
      return t as Element;
    };

    tl.morph = function (this: StepTimeline, a: MorphTarget, b: MorphTarget, opts: {}) {
      const elA = firstEl(a);
      const elB = firstEl(b);
      if (!elA || !elB) {
        console.warn("useTl.morph: could not resolve", !elA ? a : b);
        return this;
      }

      const optsd = { duration: 0.8, ease: "power1.inOut", scale: true, ...opts }
      // Append at the current end so the morph occupies this click's interval.
      const at = this.duration();

      // Reserve the time slot and visibility with layout-independent tweens, so
      // the timeline structure (labels, inferred click count) is correct even
      // though the Flip geometry can't be measured yet. The actual fit is built
      // in refreshMorphs() on slide-enter — measuring here would read a
      // display:none box when the slide is preloaded behind another one.
      // hold the slot
      this.to(elA, { autoAlpha: 0, duration: optsd.duration, ease: optsd.ease }, at);
      this.from(elB, { autoAlpha: 0, duration: optsd.duration, ease: optsd.ease }, at);

      morphSpecs.push({ elA, elB, at, opts: optsd, anims: [] });
      return this;
    } as StepTimeline["morph"];

    // Chainable preset effects (popIn, slideIn, pulse, …). Added after `from`/
    // `to` are slide-scoped so the presets inherit that scoping. The slide root
    // is passed so the SplitText presets can resolve selectors within the slide.
    attachEffects(tl, () => slide.value);

    return tl as StepTimeline
  }

  // tween to label with adjusted speedup
  // i.e. nervously clicking multiple times accelerates scrubbing
  function playToLabelNum(new_c: number, backwards: boolean, delay = 0){
    tween?.kill()
    if (!tl.value) return

    const currentTime = tl.value.time();
    const targetTime = tl.value.labels["step-" + String(new_c)];
    if (targetTime == null) {
      console.debug(`Step index "${new_c}" does not exist - ignoring it`);
      return;
    }

    const min = Math.min(currentTime, targetTime);
    const max = Math.max(currentTime, targetTime);

    /* difference between the current step-index and the user desired index */
    const diff = Object.entries(tl.value.labels)
      .filter(([name, time]) => /^step-\d+$/.test(name) && time > min && time < max).length
      + (backwards ? 1 : 0) /* additional speedup for going backwards */;
    if (!dev) tl.value.timeScale(Math.pow(1.8, diff))

    tween = tl.value.tweenTo("step-" + String(new_c), {
      delay,
      onComplete: () => {
        tween = null
        if (!dev) tl.value?.timeScale(1)
      }
    })
  }

  // (Re)build each morph's Flip geometry against the *current* layout. Called on
  // slide-enter, when the elements are on-screen — unlike onMounted, where a
  // slide reached from elsewhere is still display:none and measures as zero.
  function refreshMorphs() {
    const t = tl.value;
    if (!t) return;
    // Specs are recorded in timeline order. Process them in order so that a
    // morph measures the effect of any earlier morph that's already rebuilt.
    for (const s of morphSpecs) {
      /* only build morph once */
      if (s.anims && s.anims.length) continue;

      const ra = s.elA.getBoundingClientRect();
      const rb = s.elB.getBoundingClientRect();
      // Not laid out yet (e.g. preloaded slide) — leave it for the next enter.
      if ((ra.width === 0 && ra.height === 0) || (rb.width === 0 && rb.height === 0)) continue;

      // Drop the previous fit and clear its leftover geometry, then bring the
      // timeline to the morph's start so every *earlier* tween (e.g. an earlier
      // `.to(".a", { x: 100 })`) is applied to the DOM. Flip then measures A and
      // B exactly as they'll be when the morph begins — not their CSS layout box.
      //
      // We replay *through* time 0 rather than seeking straight to s.at: on a
      // return visit the playhead sits past the morph, and a direct backward
      // seek won't re-render an earlier tween it's already "past" — so after the
      // clearProps above, A would be measured at its original box. Going via 0
      // forces every earlier tween to re-render onto the freshly-cleared DOM.

      /* TODO clear this stuff once i am certain morphs should only ever be computed once
         also remove the "anims" field in that case */
      //gsap.set([s.elA, s.elB], { clearProps: "transform,transformOrigin,width,height" });
      //t.seek(0, true);
      t.seek(s.at, true);
      // s.anims.forEach((a) => a.kill());
      s.anims = [];

      // Create all Flip animations against the seeked state. They aren't added
      // to the timeline yet, so nothing has moved off that state during measuring.
      const fitA = Flip.fit(s.elA, s.elB, s.opts);
      // B travels the same box→box path as A: snap it onto A's current box,
      // then animate back to its own, so the two stay overlapped and cross-fade.
      const natural = Flip.getState(s.elB);
      Flip.fit(s.elB, s.elA, { scale: s.opts.scale });
      const fitB = Flip.to(natural, s.opts);

      if (fitA) { t.add(fitA as gsap.core.Tween, s.at); s.anims.push(fitA as gsap.core.Tween); }
      if (fitB) { t.add(fitB, s.at); s.anims.push(fitB); }
    }
  }

  watch($clicks, (new_c, old_c) => {
    /* if we are already on another slide
     * dont animate anymore - else it
     * looks a bit laggy during slide
     * transition  */
    if (!active.value) return;
    playToLabelNum(new_c, new_c < old_c)
  })

  onBeforeMount(() => {
    // Reserve the URL's click count before the clicks context clamps it on
    // mount. Otherwise a page refresh resets the position, because the
    // real total isn't known until the timeline is built onMounted (step()
    // then replaces this provisional value with the actual step count).
    const urlclicks = Math.max(0, Math.floor(+(queryClicksRaw?.value ?? 0)) || 0)

    if (active.value && urlclicks > 0)
      clicks?.maxMap?.set(id, urlclicks)
  })

  onMounted(async () => {
    tl.value = attachStepFn(gsap.timeline({ paused: true, id: `slide-${$page.value}` }))
    step_idx = 0
  })

  onSlideEnter(async (to_n, from_n) => {
    // TODO only call once
    // if ($frontmatter.gsap_debug)
    //   dev = GSDevTools.create({animation: tl.value as any, persist: false, keyboard: false, hideGlobalTimeline: true, id: `slide-${$page.value}`});

    // Now the click count is known. Clamp over-large persisted click
    // (a stale/hand-edited URL, or a slide that lost steps) down to it.
    const total = clicks?.total ?? 0
    if (+(queryClicksRaw?.value ?? 0) > total) clicks.current = total

    // Build/refresh morphs now that the slide is on-screen and laid out
    await nextTick()
    refreshMorphs()

    // instantly jump to the correct index
    let c = untrack($clicks)
    if (c == 0) {
      tl.value?.seek(0) // reset to 0s
      playToLabelNum(0, false) // animate to "step-0"
    } else {
      tl.value?.seek("step-" + String(c)) // reset to "step-{c}"
    }
  })

  onSlideLeave(() => {
    GSDevTools.getById(`slide-${$page.value}`)?.kill()
    dev?.kill()
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
