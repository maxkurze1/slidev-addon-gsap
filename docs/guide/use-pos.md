# `usePos` — reactive element anchors

`pos('selector@anchor')` returns a **live point** on a DOM element, re-measured
every frame so it tracks layout, GSAP moves and resizes. Use it for vector math
or feed it straight into [`useTwo`](./use-two).

```vue
<script setup lang="ts">
import { usePos } from 'slidev-addon-gsap'
const pos = usePos()
</script>
```

```ts
pos('.card')          // center (default)
pos('.card@tr')       // top-right (axis-aligned)
pos('.card@ne')       // north-east corner — rotates WITH the element
pos('.item@center')   // fan-out: one point per matching element → [p0, p1, …]
```

## Anchors

| Kind | Names | Behaviour |
|------|-------|-----------|
| **Axis-aligned** | `c` `t` `b` `l` `r` `tl` `tr` `bl` `br` | Corners/edges of the upright bounding box. Do **not** rotate. |
| **Rotation-aware** | `n` `s` `e` `w` `ne` `nw` `se` `sw` | Follow the element's rotation — `ne` is always the same physical corner. |

When an element is not rotated, `ne == tr`, `n == t`, and so on.

## Reading values & vector math

A `pos(...)` result is an array-like of live points (one per matched element).
Index it with `[i]`, read `.x` / `.y`, and chain component-wise ops:

```ts
const p = pos('.card@r')[0]
p.x                      // current x (number)
p.y                      // current y

pos('.card@r')[0].add(20, 0)   // right edge + 20px
pos('.card@tl')[0].H(other)    // take x from `other`, keep own y
pos('.card@tl')[0].V(other)    // take y from `other`, keep own x
```

Available ops: `add` · `sub` · `mul` · `div` · `H` · `V`. Each returns a new live
point, so the math stays reactive.

## Fan-out

A selector that matches several elements yields one point per match; math ops
broadcast over all of them:

```ts
pos('.item@center')        // [p0, p1, p2, …]
pos('.item@center').add(0, -10)   // all shifted up 10px
```

## Coordinate space

Points are normalized into Slidev's **configured slide coordinate space**
(`slideWidth` × `slideHeight`), the same space [`useTwo`](./use-two) draws in — so
an anchor and a shape line up exactly.

See the [API reference](/api/#usepos).
