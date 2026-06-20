import type { Shape } from "two.js/src/shape";
import { PathHead, type HeadSpec } from "./PathHead";
import { HEAD_SPECS, HEAD_GROUPS } from "./shapes";

// Registry of arrow-tip factories, keyed by a normalized name so that
// `"Straight Barb"`, `"straight-barb"` and `"straight_barb"` all resolve to the
// same tip. Tips are ported from the TikZ `arrows.meta` library.
const headRegistry = new Map<string, HeadSpec>();

/** Extra names that resolve to a tip, keyed by canonical name (for docs). */
export const HEAD_ALIASES: Record<string, string[]> = {};

// Normalize a user-supplied name: lower-case, trim, and collapse any run of
// spaces / hyphens / underscores to a single space.
function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/[\s_-]+/g, " ");
}

function register(spec: HeadSpec, ...aliases: string[]) {
  headRegistry.set(normalizeName(spec.name), spec);
  for (const alias of aliases) headRegistry.set(normalizeName(alias), spec);
  if (aliases.length) {
    HEAD_ALIASES[spec.name] = [...(HEAD_ALIASES[spec.name] ?? []), ...aliases];
  }
}

const byName = (name: string) =>
  HEAD_SPECS.find((s) => s.name === name) as HeadSpec;

for (const spec of HEAD_SPECS) register(spec);

// Convenience aliases (short names, single-glyph names, and the legacy key
// `"line"` kept for backwards compatibility).
register(byName("straight"), "line", ">");
register(byName("bar"), "|");
register(byName("bracket"), "right bracket", "rbracket", "]");
register(byName("left bracket"), "lbracket", "[");
register(byName("parenthesis"), "right parenthesis", "rparenthesis", ")");
register(byName("left parenthesis"), "lparenthesis", "(");
register(byName("classical"), "to");
register(byName("turned square"), "diamond square");

/** A list of every registered canonical tip name (for docs / discovery). */
export const HEAD_NAMES: string[] = HEAD_SPECS.map((s) => s.name);

export { HEAD_GROUPS };

export function createPathHeadByName(name: string): Shape | null {
  // Optional numeric argument in trailing brackets, e.g. `"rays[5]"`.
  let base = name.trim();
  let arg: number | undefined;
  const m = /^(.*?)\s*\[\s*(\d+(?:\.\d+)?)\s*\]$/.exec(base);
  if (m) {
    base = m[1];
    arg = parseFloat(m[2]);
  }
  const spec = headRegistry.get(normalizeName(base));
  return spec ? (new PathHead(spec, arg) as unknown as Shape) : null;
}

export function resolvePathHead(input: string | Shape | boolean | null | undefined): Shape | null {
  if (!input) return null;
  if (input === true) return createPathHeadByName("line");
  if (typeof input === "string") return createPathHeadByName(input);
  if (typeof input === "object") return input as Shape;
  return null;
}

export { PathHead };
export type { HeadSpec };
