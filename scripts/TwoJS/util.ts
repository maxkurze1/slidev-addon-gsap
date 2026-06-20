
import Two from "two.js";
import { Vector } from "two.js/src/vector";
import { resolvePositionRef, resolvePositionRefAll } from "../positionRegistry";

export type XY = { x: number; y: number };
export type AnchorLike =
  | XY
  | { center: XY }
  | string
  | (() => XY | { center: XY } | string);
export type TwoLike = Two | { frontTwo?: Two; backTwo?: Two };

function log_warning(v, ...args){
  console.warn("WARNING:", args);
  return v
}

export function resolveVec(...args: any[]): Vector | null {
  if (args.length == 0) return log_warning(null, "too few arguments (resolvePoint)");
  if (args.length == 1) {
    let input = args[0]
    if (typeof input === "function") {
      return resolveVec(input());
    }
    if (Array.isArray(input)) {
      return resolveVec(...input)
    }

    if (typeof input === "number") {
      return new Vector(input,input)
    }
    if (typeof input === "string") {
      const v = resolvePositionRef(input);
      if (v) return new Vector(v.x, v.y);
      return log_warning(null, `could not resolve position reference "${input}" (resolvePoint)`);
    }
    if (!input) return log_warning(null, "invalid single arguments (resolvePoint)");

    // direct {x, y}
    if (typeof input.x === "number" && typeof input.y === "number") {
      if (input instanceof Vector) {
        return input;
      }
      return new Vector(input.x,input.y)
    }

    // { center: {x, y} }
    if (
      input.center &&
      typeof input.center.x === "number" &&
      typeof input.center.y === "number"
    ) {
      if (input.center instanceof Vector) {
        return input.center;
      }
      return new Vector(input.center.x,input.center.y)
    }
    return log_warning(null, "invalid single arguments (resolvePoint)");
  }
  if (args.length > 2) return log_warning(null, "too many arguments (resolvePoint)");
  if (args.length == 2) {
    const a = args[0];
    const b = args[1];

    if (typeof a === "number" && typeof b === "number") {
      return new Vector(a,b)
    }
    return log_warning(null, "invalid two arguments (resolvePoint)");
  }
  return log_warning(null, "invalid arguments (resolvePoint)");;
}

/**
 * Expand a position argument for the mk* factories. A string reference fans
 * out to one entry per matching element (so `mkPath("#id@tr")` behaves exactly
 * like `mkPath(pos("#id@tr"))`); string entries inside an explicit array are
 * expanded in place. Anything else passes through untouched.
 *
 * Returns the items plus whether the original argument was "plural" — used by
 * the factories to decide between returning a single shape or an array.
 */
export function expandPositions(
  value: AnchorLike | AnchorLike[],
): { items: AnchorLike[]; isArray: boolean } {
  const expandOne = (v: AnchorLike): AnchorLike[] => {
    if (typeof v !== "string") return [v];
    const all = resolvePositionRefAll(v);
    // No resolver available: keep the string so `resolveVec` can warn/resolve it.
    return all ? (all as AnchorLike[]) : [v];
  };

  if (typeof value === "string") {
    const all = resolvePositionRefAll(value);
    if (all) return { items: all as AnchorLike[], isArray: true };
    return { items: [value], isArray: false };
  }
  if (Array.isArray(value)) {
    return { items: value.flatMap(expandOne), isArray: true };
  }
  return { items: [value], isArray: false };
}

/**
 * Apply a dash pattern to a stroked shaft.
 *
 * - an explicit `dashes` array (px on/off lengths) wins;
 * - `dashed === true` derives a pattern that scales with the current linewidth
 *   (so thicker lines get proportionally larger dashes);
 * - otherwise the shaft is drawn solid (empty pattern).
 *
 * `offset` shifts the pattern along the path — animate it (e.g. with GSAP) for a
 * marching-ants effect. It is reapplied every frame, so it stays live.
 */
export function applyDashPattern(
  shaft: { linewidth?: number; dashes?: any } | null | undefined,
  dashes: number[] | null,
  dashed: boolean,
  offset = 0,
): void {
  if (!shaft) return;
  let arr: number[] = [];
  if (dashes && dashes.length) arr = dashes.slice();
  else if (dashed) {
    const lw = Math.max((shaft.linewidth as number) || 1, 1);
    arr = [lw * 2.5, lw * 2.5];
  }
  (arr as any).offset = offset;
  shaft.dashes = arr;
}

export function resolveTwoInstance(two: TwoLike): Two | null {
  const anyTwo = two as any;
  if (anyTwo?.scene?.add) return anyTwo as Two;
  if (anyTwo?.frontTwo?.scene?.add) return anyTwo.frontTwo as Two;
  if (anyTwo?.backTwo?.scene?.add) return anyTwo.backTwo as Two;
  return null;
}

export function requireTwoInstance(two: TwoLike, fnName: string): Two {
  const resolved = resolveTwoInstance(two);
  if (resolved) return resolved;
  throw new Error(
    `${fnName} expected a Two instance (or layered useTwo object with frontTwo/backTwo).`,
  );
}

const _gsapTargetWrappers = new WeakMap<object, object>();

function isTwoDrawableObject(value: any): value is object {
  return !!value && typeof value === "object" && "_renderer" in value;
}

function wrapForGsap<T extends object>(target: T): T {
  const cached = _gsapTargetWrappers.get(target);
  if (cached) return cached as T;

  const proxy = new Proxy({} as T, {
    get(_obj, key) {
      // Prevent GSAP from treating wrapped Two.js objects as array-like.
      if (key === "length") return undefined;
      return (target as any)[key];
    },
    set(_obj, key, value) {
      (target as any)[key] = value;
      return true;
    },
    has(_obj, key) {
      if (key === "length") return false;
      return key in (target as any);
    },
    ownKeys() {
      return Reflect.ownKeys(target as any).filter((k) => k !== "length");
    },
    getOwnPropertyDescriptor(_obj, key) {
      if (key === "length") return undefined;
      return Object.getOwnPropertyDescriptor(target as any, key);
    },
  });

  _gsapTargetWrappers.set(target, proxy);
  return proxy;
}

/**
 * Normalize targets before passing them to GSAP.
 * Wrap Two.js objects in proxies so GSAP doesn't misclassify them as array-like
 * via their `length` property.
 */
export function toGsapTargets<T = any>(targets: T): T {
  if (Array.isArray(targets)) {
    return targets.map((t) => toGsapTargets(t)) as T;
  }
  if (isTwoDrawableObject(targets)) {
    return wrapForGsap(targets) as T;
  }
  return targets;
}
