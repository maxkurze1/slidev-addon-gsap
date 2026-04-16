import { onUnmounted, onMounted, shallowRef } from "vue";
// import { onSlideEnter, onSlideLeave } from "@slidev/client";
import { useSlide } from "./useSlide";
import { gsap } from "gsap";
import Two from "two.js";
import { createRefProxy } from "./proxxyref";
import { makeArrow } from "./TwoJS/Arrow";
import { makePath } from "./TwoJS/Path";
import { maxCircle } from "./TwoJS/Circle";
import { onSlideEnter, onSlideLeave } from "./util";
import { slideWidth, slideHeight, configs } from "@slidev/client";

type Tail<T extends any[]> = T extends [any, ...infer R] ? R : never;
type LayerName = "front" | "back";

type LayerApi = {
  mkArrow: (...args: Tail<Parameters<typeof makeArrow>>) => ReturnType<typeof makeArrow>;
  mkPath: (...args: Tail<Parameters<typeof makePath>>) => ReturnType<typeof makePath>;
  mkCircle: (...args: Tail<Parameters<typeof maxCircle>>) => ReturnType<typeof maxCircle>;
};

type TwoWithLayers = LayerApi & {
  front: LayerApi;
  back: LayerApi;
  layer: (name: LayerName) => LayerApi;
  frontTwo: Two;
  backTwo: Two;
  update: () => void;
  pause: () => void;
};

function styleLayer(el: HTMLElement, w: number, h: number, z: string) {
  el.style.position = "absolute";
  el.style.inset = "0";
  el.style.width = "100%";
  el.style.height = "100%";
  el.style.pointerEvents = "none";
  el.style.zIndex = z;
  // The drawing layer uses the configured slide coordinate space (matching
  // usePos). A viewBox + 100% size maps that space onto the actual rendered
  // slide regardless of zoom/scale; preserveAspectRatio="none" mirrors usePos,
  // which normalizes x and y independently.
  el.setAttribute("viewBox", `0 0 ${w} ${h}`);
  el.setAttribute("preserveAspectRatio", "none");
}

type ShapeProps = Record<string, any>;

/**
 * Default props for shapes created via `useTwo`. `defaults` applies to every
 * shape; `path`/`arrow`/`circle` add per-type defaults. Precedence (low → high):
 * deck headmatter `twojs:` < the `useTwo(config)` passed in a slide < per-type <
 * the props passed at the call site.
 */
export type TwoConfig = {
  defaults?: ShapeProps;
  path?: ShapeProps;
  arrow?: ShapeProps;
  circle?: ShapeProps;
};

function mergeProps(...layers: (ShapeProps | undefined)[]): ShapeProps {
  return Object.assign({}, ...layers);
}

// Combine two configs bucket-by-bucket (b overrides a per key).
function mergeConfig(a: TwoConfig = {}, b: TwoConfig = {}): TwoConfig {
  return {
    defaults: { ...a.defaults, ...b.defaults },
    path: { ...a.path, ...b.path },
    arrow: { ...a.arrow, ...b.arrow },
    circle: { ...a.circle, ...b.circle },
  };
}

// Deck-wide defaults from the headmatter, e.g.
//   ---
//   twojs:
//     defaults: { linewidth: 2, stroke: "#695FAB" }
//     path: { head: triangle, radius: 10 }
//   ---
function deckConfig(): TwoConfig {
  return ((configs as any)?.twojs ?? {}) as TwoConfig;
}

function createLayerApi(two: Two, config: TwoConfig): LayerApi {
  const base = config.defaults;
  return {
    mkArrow: (from, to, props) =>
      makeArrow(two, from, to, mergeProps(base, config.arrow, props)),
    mkPath: (props) =>
      makePath(two, mergeProps(base, config.path, props)),
    mkCircle: (center, radius, props) =>
      maxCircle(two, center, radius, mergeProps(base, config.circle, props)),
  };
}

export function useTwo(config: TwoConfig = {}) {
  // Deck-wide headmatter defaults, overridden by this slide's config.
  const merged = mergeConfig(deckConfig(), config);
  const two = shallowRef<TwoWithLayers | null>(null);
  const slide = useSlide();
  const tickUpdate = () => {
    two.value?.update();
  };

  onMounted(() => {
    if (!slide.value) return;

    const root = slide.value;
    if (getComputedStyle(root).position === "static") {
      root.style.position = "relative";
    }

    const w = slideWidth.value || 980;
    const h = slideHeight.value || Math.ceil(w / (16 / 9));

    const backTwo = new Two({ width: w, height: h }).appendTo(root);
    const frontTwo = new Two({ width: w, height: h }).appendTo(root);

    const backEl = backTwo.renderer.domElement as HTMLElement;
    const frontEl = frontTwo.renderer.domElement as HTMLElement;
    styleLayer(backEl, w, h, "-10");
    styleLayer(frontEl, w, h, "10");
    frontEl.style.zIndex = "10";

    // Keep back layer behind slide content and front layer above it.
    root.prepend(backEl);
    root.append(frontEl);

    const front = createLayerApi(frontTwo, merged);
    const back = createLayerApi(backTwo, merged);

    two.value = {
      ...front,
      front,
      back,
      layer: (name: LayerName) => (name === "back" ? back : front),
      frontTwo,
      backTwo,
      update: () => {
        backTwo.update();
        frontTwo.update();
      },
      pause: () => {
        backTwo.pause();
        frontTwo.pause();
      },
    };
  });

  onSlideEnter(() => {
    tickUpdate()
    gsap.ticker.add(tickUpdate);
  });

  onSlideLeave(() => {
    tickUpdate()
    gsap.ticker.remove(tickUpdate);
  });

  onUnmounted(() => {
    gsap.ticker.remove(tickUpdate);
    if (two.value) {
      two.value.pause();
      (two.value.backTwo.renderer.domElement as HTMLElement).remove();
      (two.value.frontTwo.renderer.domElement as HTMLElement).remove();
      two.value = null;
    }
  });

  return createRefProxy(two, "Two.js layers");
}
