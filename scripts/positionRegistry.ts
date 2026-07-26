// Slide-scoped registry that lets string position references such as
// "#boxA" or "#boxA@tr" be resolved to live coordinates from anywhere a
// vector is expected (e.g. inside `resolveVec`, or directly in mkPath/mkArrow).
//
// Kept as a standalone module so both `usePos` (which registers resolvers)
// and `TwoJS/util` (which consumes them) can import it without an import cycle.

export type VecLike = { x: number; y: number };

// A lazily-evaluated point. Re-read every frame so it stays reactive.
export type LazyVec = () => VecLike;

// A resolver maps a CSS selector + anchor name to one lazy getter per matching
// element (the live array), or returns null if it cannot satisfy the reference
// (e.g. unknown anchor name).
export type PositionResolver = (selector: string, anchor: string) => readonly LazyVec[] | null;

// Each resolver remembers the slide root it belongs to. In print/export "with
// clicks" the SAME slide is mounted once per click step at the same time, so
// several resolvers can match the same selector — each against a DOM subtree
// frozen at a different click. Without scoping, `resolvePositionRefAll` would
// return whichever registered first, so every step's shapes would read the wrong
// step's element positions. `preferredRoot` lets the owning slide be consulted
// first (see `setPreferredResolverRoot`).
type ResolverEntry = { resolver: PositionResolver; root: HTMLElement | null };

const resolvers = new Set<ResolverEntry>();

// While set, resolution prefers the resolver registered for this exact slide
// root. `useTwo` sets it around shape creation and around each render tick, so a
// reference resolves against the slide that actually owns the shape.
let preferredRoot: HTMLElement | null = null;

/** Scope the next resolutions to a slide root (null clears). */
export function setPreferredResolverRoot(root: HTMLElement | null): void {
  preferredRoot = root;
}

/** Run `fn` with resolution scoped to `root`, restoring the previous scope after. */
export function withResolverRoot<T>(root: HTMLElement | null, fn: () => T): T {
  const prev = preferredRoot;
  preferredRoot = root;
  try {
    return fn();
  } finally {
    preferredRoot = prev;
  }
}

/** Register a resolver for a slide root. Returns an unregister callback. */
export function registerPositionResolver(
  resolver: PositionResolver,
  root: HTMLElement | null = null,
): () => void {
  const entry: ResolverEntry = { resolver, root };
  resolvers.add(entry);
  return () => {
    resolvers.delete(entry);
  };
}

/**
 * Split a reference string into its selector and anchor parts.
 *
 *   "#boxA"      -> { selector: "#boxA", anchor: "center" }
 *   "#boxA@tr"   -> { selector: "#boxA", anchor: "tr" }
 *   ".item @top" -> { selector: ".item", anchor: "top" }
 *
 * The anchor is everything after the last `@`; the default is "center".
 */
export function parsePositionRef(ref: string): { selector: string; anchor: string } {
  const at = ref.lastIndexOf("@");
  if (at === -1) return { selector: ref.trim(), anchor: "center" };
  return {
    selector: ref.slice(0, at).trim(),
    anchor: ref.slice(at + 1).trim() || "center",
  };
}

/**
 * Resolve a reference string to one lazy getter per matching element, or null
 * if no registered resolver currently matches it. Several slides may be mounted
 * at once (each registers a resolver), so we skip resolvers that return no
 * matches and return the first non-empty result. Used for fan-out.
 */
export function resolvePositionRefAll(ref: string): readonly LazyVec[] | null {
  const { selector, anchor } = parsePositionRef(ref);
  // Prefer the resolver of the slide that owns the current shape, so duplicate
  // slide instances (print/export "with clicks") each read their own DOM.
  if (preferredRoot) {
    for (const entry of resolvers) {
      if (entry.root !== preferredRoot) continue;
      const got = entry.resolver(selector, anchor);
      if (got && got.length > 0) return got;
    }
  }
  for (const entry of resolvers) {
    const got = entry.resolver(selector, anchor);
    if (got && got.length > 0) return got;
  }
  return null;
}

/**
 * Resolve a reference string to the first matching element's coordinates, or
 * null. Used by `resolveVec` for scalar contexts (a single vertex/endpoint).
 */
export function resolvePositionRef(ref: string): VecLike | null {
  const all = resolvePositionRefAll(ref);
  return all && all.length > 0 ? all[0]() : null;
}
