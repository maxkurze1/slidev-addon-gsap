import { LineHead } from "./LineHead";
import { TriangleHead } from "./TriangleHead";
import type { Shape } from "two.js/src/shape";

const headRegistry = new Map<string, () => Shape>();

export function createPathHeadByName(name: string): Shape | null {
  const factory = headRegistry.get(name);
  return factory ? factory() : null;
}

export function resolvePathHead(input: string | Shape | boolean | null | undefined): Shape | null {
  if (!input) return null;
  if (input === true) return createPathHeadByName("line");
  if (typeof input === "string") return createPathHeadByName(input);
  if (typeof input === "object") return input as Shape;
  return null;
}

export { LineHead, TriangleHead };

headRegistry.set("line", () => new LineHead());
headRegistry.set("triangle", () => new TriangleHead());
