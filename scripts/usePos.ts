import { onUnmounted, onMounted } from "vue";
import { useSlide } from "./useSlide";
import { Vector } from "two.js/src/vector";
import { gsap } from "gsap";
// import { onSlideEnter, onSlideLeave } from "@slidev/client";
import { onSlideEnter, onSlideLeave } from "./util";
import { resolveVec } from "./TwoJS/util";
import { registerPositionResolver, parsePositionRef } from "./positionRegistry";
import { slideWidth, slideHeight } from "@slidev/client";

type VecLike = { x: number; y: number };

/** A lazily-evaluated, chainable vector. Call it to snapshot a `Vector`. */
export type VecGetter = (() => Vector) & {
  add(...args: any[]): VecGetter;
  sub(...args: any[]): VecGetter;
  mul(...args: any[]): VecGetter;
  div(...args: any[]): VecGetter;
  H(...args: any[]): VecGetter;
  V(...args: any[]): VecGetter;
  x: number;
  y: number;
};

/** One `VecGetter` per matched element. Math ops broadcast over all entries. */
export type VecGetterArray = VecGetter[] & {
  add(...args: any[]): VecGetterArray;
  sub(...args: any[]): VecGetterArray;
  mul(...args: any[]): VecGetterArray;
  div(...args: any[]): VecGetterArray;
  H(...args: any[]): VecGetterArray;
  V(...args: any[]): VecGetterArray;
  x: number[];
  y: number[];
};

// Raw anchor coordinates for a single element, updated in place each tick.
type RawAnchors = {
  center: Vector; c: Vector;
  // Axis-aligned (bounding-box) anchors: corners/edges of the enclosing
  // up-right rectangle. These do NOT rotate with the element.
  top: Vector; t: Vector;
  bottom: Vector; b: Vector;
  left: Vector; l: Vector;
  right: Vector; r: Vector;
  topright: Vector; tr: Vector;
  bottomright: Vector; br: Vector;
  topleft: Vector; tl: Vector;
  bottomleft: Vector; bl: Vector;
  // Rotation-aware compass anchors: each follows the box as it rotates, so e.g.
  // `ne` always marks the same physical corner of the element.
  north: Vector; n: Vector;
  south: Vector; s: Vector;
  east: Vector; e: Vector;
  west: Vector; w: Vector;
  northeast: Vector; ne: Vector;
  northwest: Vector; nw: Vector;
  southeast: Vector; se: Vector;
  southwest: Vector; sw: Vector;
};

const ANCHOR_KEYS = [
  "center", "c",
  "top", "t",
  "bottom", "b",
  "left", "l",
  "right", "r",
  "topright", "tr",
  "bottomright", "br",
  "topleft", "tl",
  "bottomleft", "bl",
  "north", "n",
  "south", "s",
  "east", "e",
  "west", "w",
  "northeast", "ne",
  "northwest", "nw",
  "southeast", "se",
  "southwest", "sw",
] as const;

type AnchorKey = (typeof ANCHOR_KEYS)[number];

function emptyRawAnchor(): RawAnchors {
  return {
    center: new Vector(0, 0), c: new Vector(0, 0),
    top: new Vector(0, 0), t: new Vector(0, 0),
    bottom: new Vector(0, 0), b: new Vector(0, 0),
    left: new Vector(0, 0), l: new Vector(0, 0),
    right: new Vector(0, 0), r: new Vector(0, 0),
    topright: new Vector(0, 0), tr: new Vector(0, 0),
    bottomright: new Vector(0, 0), br: new Vector(0, 0),
    topleft: new Vector(0, 0), tl: new Vector(0, 0),
    bottomleft: new Vector(0, 0), bl: new Vector(0, 0),
    north: new Vector(0, 0), n: new Vector(0, 0),
    south: new Vector(0, 0), s: new Vector(0, 0),
    east: new Vector(0, 0), e: new Vector(0, 0),
    west: new Vector(0, 0), w: new Vector(0, 0),
    northeast: new Vector(0, 0), ne: new Vector(0, 0),
    northwest: new Vector(0, 0), nw: new Vector(0, 0),
    southeast: new Vector(0, 0), se: new Vector(0, 0),
    southwest: new Vector(0, 0), sw: new Vector(0, 0),
  };
}

// Component-wise binary operations, shared by VecGetter and VecGetterArray.
type BinOp = (a: VecLike, b: VecLike) => VecLike;
const OPS: Record<string, BinOp> = {
  add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y }),
  sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y }),
  mul: (a, b) => ({ x: a.x * b.x, y: a.y * b.y }),
  div: (a, b) => ({ x: a.x / b.x, y: a.y / b.y }),
  H: (a, b) => ({ x: b.x, y: a.y }), // take x from rhs, keep y
  V: (a, b) => ({ x: a.x, y: b.y }), // take y from rhs, keep x
};
const OP_NAMES = Object.keys(OPS);

function resolveOperand(args: any[]): VecLike {
  return resolveVec(...args) ?? { x: 0, y: 0 };
}

function createVecGetter(read: () => VecLike): VecGetter {
  const getter = (() => {
    const v = read();
    return new Vector(v.x, v.y);
  }) as VecGetter;

  Object.defineProperty(getter, "x", { enumerable: true, get: () => read().x });
  Object.defineProperty(getter, "y", { enumerable: true, get: () => read().y });

  for (const name of OP_NAMES) {
    (getter as any)[name] = (...args: any[]) =>
      createVecGetter(() => OPS[name](read(), resolveOperand(args)));
  }

  return getter;
}

// Broadcast helper: a single operand applies to every element; an array operand
// is matched element-wise (falling back to its last entry).
function pickArgsForIndex(args: any[], i: number): any[] {
  if (args.length !== 1 || !Array.isArray(args[0])) return args;
  const arr = args[0];
  if (arr.length === 0) return [0, 0];
  return [arr[i] ?? arr[arr.length - 1]];
}

// An array-like, live view over `count()` elements. Each entry reads its
// coordinates lazily via `cellRead(i)`, so values and length stay current.
function createVecGetterArray(
  count: () => number,
  cellRead: (i: number) => VecLike,
): VecGetterArray {
  const cells: VecGetter[] = [];

  const sync = () => {
    const n = count();
    for (let i = cells.length; i < n; i++) {
      const idx = i;
      cells.push(createVecGetter(() => cellRead(idx)));
    }
    cells.length = n;
    return cells;
  };

  return new Proxy(cells as VecGetterArray, {
    get(target, prop) {
      sync();

      if (prop === "x") return target.map((v) => v.x);
      if (prop === "y") return target.map((v) => v.y);

      if (typeof prop === "string" && OP_NAMES.includes(prop)) {
        return (...args: any[]) =>
          createVecGetterArray(count, (i) =>
            OPS[prop](cellRead(i), resolveOperand(pickArgsForIndex(args, i))));
      }

      const value = (target as any)[prop];
      // Numeric index → return the VecGetter cell untouched; binding it would
      // strip its attached .x/.y/.add helpers.
      if (typeof prop === "string" && /^\d+$/.test(prop)) return value;
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

// Normalize an anchor name from an "@anchor" reference to a canonical key.
// Accepts long/short forms and ignores separators, so "top-right", "topRight"
// and "tr" all map to the same anchor.
function anchorKey(name: string): AnchorKey | null {
  const k = name.toLowerCase().replace(/[-_\s]/g, "");
  return (ANCHOR_KEYS as readonly string[]).includes(k) ? (k as AnchorKey) : null;
}

export function usePos() {
  const slide = useSlide();

  type Tracked = {
    selector: string;
    raw: RawAnchors[];
  };

  const tracked = new Set<Tracked>();
  const trackedBySelector = new Map<string, Tracked>();
  let hasDirtyWork = true;
  let staleFrames = 0;

  function markDirty() {
    hasDirtyWork = true;
  }

  function hasActiveGsapAnimations() {
    // `gsap.globalTimeline.isActive()` is always true for the root timeline itself.
    // We need to inspect child animations instead.
    return gsap.globalTimeline
      .getChildren(true, true, true)
      .some((child) => child.isActive());
  }

  function updateRawFromRect(
    dest: RawAnchors,
    root: HTMLElement,
    slideRect: DOMRect,
    el: Element,
  ) {
    if (!slideRect.width || !slideRect.height) return;

    const rect = el.getBoundingClientRect();

    // Normalize DOM positions into the configured slide coordinate space so
    // they line up with the Two.js drawing layers (which use the same dims).
    const W = slideWidth.value || 980;
    const H = slideHeight.value || Math.ceil(W / (16 / 9));

    const centerX = ((rect.left - slideRect.left + rect.width / 2) / slideRect.width) * W;
    const centerY = ((rect.top - slideRect.top + rect.height / 2) / slideRect.height) * H;
    const leftX = ((rect.left - slideRect.left) / slideRect.width) * W;
    const rightX = ((rect.left - slideRect.left + rect.width) / slideRect.width) * W;
    const topY = ((rect.top - slideRect.top) / slideRect.height) * H;
    const bottomY = ((rect.top - slideRect.top + rect.height) / slideRect.height) * H;

    // --- Axis-aligned (bounding-box) anchors ---
    dest.center.x = centerX; dest.center.y = centerY;
    dest.c.x = centerX; dest.c.y = centerY;
    dest.top.x = centerX; dest.top.y = topY;
    dest.t.x = centerX; dest.t.y = topY;
    dest.bottom.x = centerX; dest.bottom.y = bottomY;
    dest.b.x = centerX; dest.b.y = bottomY;
    dest.left.x = leftX; dest.left.y = centerY;
    dest.l.x = leftX; dest.l.y = centerY;
    dest.right.x = rightX; dest.right.y = centerY;
    dest.r.x = rightX; dest.r.y = centerY;
    dest.topright.x = rightX; dest.topright.y = topY;
    dest.tr.x = rightX; dest.tr.y = topY;
    dest.bottomright.x = rightX; dest.bottomright.y = bottomY;
    dest.br.x = rightX; dest.br.y = bottomY;
    dest.topleft.x = leftX; dest.topleft.y = topY;
    dest.tl.x = leftX; dest.tl.y = topY;
    dest.bottomleft.x = leftX; dest.bottomleft.y = bottomY;
    dest.bl.x = leftX; dest.bl.y = bottomY;

    // --- Rotation-aware compass anchors ---
    // The bounding-rect center is the element's geometric center for
    // center-origin transforms (GSAP's default). The element's own transform
    // matrix gives its local width (east) and height (south) axes including
    // rotation and scale; we turn the half-extents along those axes into slide
    // units and offset from the center, so e.g. `ne` tracks the same physical
    // corner as the box rotates. (Assumes the element itself carries the
    // rotation — the usual case — and no intervening rotated ancestor.)
    const htmlEl = el as HTMLElement;
    const cs = getComputedStyle(htmlEl);
    const m = cs.transform && cs.transform !== "none"
      ? new DOMMatrix(cs.transform)
      : new DOMMatrix();

    // slide-coordinate units per (untransformed) local CSS pixel
    const unitX = W / (root.offsetWidth || W);
    const unitY = H / (root.offsetHeight || H);
    const hw = htmlEl.offsetWidth / 2;
    const hh = htmlEl.offsetHeight / 2;

    // half-extent vectors along the box's local +x (east) and +y (south) axes
    const eX = m.a * hw * unitX, eY = m.b * hw * unitY;
    const sX = m.c * hh * unitX, sY = m.d * hh * unitY;

    const set = (k1: AnchorKey, k2: AnchorKey, x: number, y: number) => {
      dest[k1].x = x; dest[k1].y = y;
      dest[k2].x = x; dest[k2].y = y;
    };
    set("east", "e", centerX + eX, centerY + eY);
    set("west", "w", centerX - eX, centerY - eY);
    set("south", "s", centerX + sX, centerY + sY);
    set("north", "n", centerX - sX, centerY - sY);
    set("northeast", "ne", centerX + eX - sX, centerY + eY - sY);
    set("northwest", "nw", centerX - eX - sX, centerY - eY - sY);
    set("southeast", "se", centerX + eX + sX, centerY + eY + sY);
    set("southwest", "sw", centerX - eX + sX, centerY - eY + sY);
  }

  function updateAll() {
    const root = slide.value;
    if (!root || tracked.size === 0) return;

    const animating = hasActiveGsapAnimations();
    staleFrames = animating ? 0 : staleFrames + 1;

    // "staleFrames > num" ensures that num frames are rendered after animation stopped
    if (!hasDirtyWork && !animating && (staleFrames > 1)) return;
    const slideRect = root.getBoundingClientRect();
    hasDirtyWork = Boolean(!slideRect.width || !slideRect.height);

    // If the slide is still hidden (`display:none`) its layout is unresolved.
    // Keep trying on following ticks until dimensions are available.

    for (const entry of tracked) {
      // TODO consider using gsap.utils.toArray instead
      const els = Array.from(root.querySelectorAll(entry.selector));
      if (entry.raw.length !== els.length) {
        hasDirtyWork = true;
      }

      for (let i = 0; i < els.length; i++) {
        if (!entry.raw[i]) {
          entry.raw[i] = emptyRawAnchor();
        }
        updateRawFromRect(entry.raw[i], root, slideRect, els[i]);
      }

      entry.raw.splice(els.length);
    }
  }

  function ensureTracked(selector: string): Tracked {
    const existing = trackedBySelector.get(selector);
    if (existing) return existing;

    const entry: Tracked = { selector, raw: [] };
    tracked.add(entry);
    trackedBySelector.set(selector, entry);
    markDirty();
    updateAll();

    return entry;
  }

  // A live, array-like view of one anchor across every element of a selector.
  function anchorArray(selector: string, key: AnchorKey): VecGetterArray {
    const entry = ensureTracked(selector);
    return createVecGetterArray(
      () => entry.raw.length,
      (i) => entry.raw[i]?.[key] ?? { x: 0, y: 0 },
    );
  }

  // Resolver for string references like "#boxA@tr", shared by `resolveVec`
  // (scalar/first match) and the mk* factories (fan-out over all matches).
  function resolveRef(selector: string, anchorName: string): VecGetterArray | null {
    const key = anchorKey(anchorName);
    if (!key) return null;
    return anchorArray(selector, key);
  }

  // The resolver is registered for the whole time the slide is mounted (not
  // just while it's on screen) so that string references like "#a@tr" passed
  // straight to mkArrow/mkPath/mkCircle resolve even when the shapes are
  // created in onMounted — before the slide is entered. `resolvePositionRefAll`
  // skips resolvers that don't match, so other mounted slides don't interfere.
  let unregisterResolver: (() => void) | null = null;

  onMounted(() => {
    unregisterResolver ??= registerPositionResolver(resolveRef);
    window.addEventListener("resize", markDirty, { passive: true });
    window.addEventListener("scroll", markDirty, { passive: true });
    markDirty();
  });

  onSlideEnter(() => {
    gsap.ticker.add(updateAll);
    markDirty();
  });

  onSlideLeave(() => {
    gsap.ticker.remove(updateAll);
  });

  onUnmounted(() => {
    gsap.ticker.remove(updateAll);
    unregisterResolver?.();
    unregisterResolver = null;
    window.removeEventListener("resize", markDirty);
    window.removeEventListener("scroll", markDirty);
    tracked.clear();
    trackedBySelector.clear();
  });

  // pos("#items")      -> center of every match (array-like, broadcasts ops)
  // pos("#items@tr")   -> top-right of every match
  // pos("#items@tr")[0]-> single VecGetter for the first match
  return (ref: string): VecGetterArray => {
    const { selector, anchor } = parsePositionRef(ref);
    const key = anchorKey(anchor);
    if (!key) {
      console.warn(`unknown anchor "${anchor}" in position reference "${ref}" (usePos)`);
      return createVecGetterArray(() => 0, () => ({ x: 0, y: 0 }));
    }
    return anchorArray(selector, key);
  };
}
