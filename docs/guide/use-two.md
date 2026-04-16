# `useTwo` — arrows, paths & circles

`useTwo()` gives you two [Two.js](https://two.js.org/) drawing layers per slide:
`two.back` renders **behind** the slide's HTML, `two.front` **on top**. Pass
[`usePos`](./use-pos) anchor strings directly — endpoints stay reactive.

<TwoDemo />

<small>Illustrative — the real shapes are bound to slide elements and animate.</small>

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useTwo } from 'slidev-addon-gsap'
const two = useTwo()

onMounted(() => {
  two.back.mkArrow('.a@r', '.b@l', { stroke: '#0ea5e9', linewidth: 3, text: 'flows to' })
  two.back.mkPath({ stroke: '#6366f1', head: 'triangle', radius: 14 })
    .M('.from@r').h(28).VH('.to@l')
  two.front.mkCircle('.c@center', 40, { fill: '#34d399' })
})
</script>
```

`two.mkArrow` / `two.mkPath` / `two.mkCircle` are shortcuts for the **front**
layer; use `two.back.*` for the back layer (or `two.layer('back')`).

## Arrows — `mkArrow(from, to, props?)`

Endpoints are resolved every frame. A selector matching multiple elements
**fans out** to one arrow per element.

```ts
two.back.mkArrow('.a@r', '.b@l', {
  stroke: '#0ea5e9', linewidth: 3,
  headlen: 14,            // arrowhead size
  text: 'flows to',       // label riding the shaft (string or options object)
})
```

## Paths — `mkPath(props?).M(start)…`

Config-first: set props, then chain SVG-style commands starting with `.M()`.
Uppercase = absolute, lowercase = relative to the current point.

```ts
two.back.mkPath({ stroke: '#6366f1', head: 'triangle', radius: 14, text: 'route' })
  .M('.from@r')   // moveto (start)
  .h(28)          // relative horizontal line
  .VH('.to@l')    // orthogonal routing into the target
```

Commands:

| Command | Meaning |
|---------|---------|
| `M L H V Z` | Standard SVG-style (move / line / h-line / v-line / close) |
| `HV` `VH` | One 90° corner (horizontal-then-vertical / vertical-then-horizontal) |
| `HVH` `VHV` | Two corners; optional trailing ratio `0..1` (default `0.5`) sets the split, e.g. `.VHV('.b@c', 0.3)` |

- `radius` rounds **all** corners; `head` (e.g. `'triangle'`) adds an arrowhead.
- `text` / `label` draws a label that rides the shaft.

## Circles — `mkCircle(center, radius, props?)`

```ts
two.front.mkCircle('.c@center', 40, { fill: '#34d399', stroke: '#10b981', linewidth: 3 })
```

## Labels

The `text` (alias `label`) prop on arrows and paths accepts a string or an
options object:

```ts
text: { text: 'step 1', at: 0.5, offset: 8, rotate: true, background: '#fff' }
```

`at` (0–1 along the visible shaft), `offset` (perpendicular px or `[dx, dy]`),
`rotate`, `fill`, `size`, `family`, `weight`, `background`, `padding`.

## Draw-on animation

Shapes expose `start` / `end` (0–1). Animate them with [`useTl`](./use-tl):

```ts
const path = two.back.mkPath({ head: 'triangle' }).M('.a@r').L('.b@l')
tl.step().from(path, { end: 0, duration: 0.8 }).step()   // draws it on
```

<TwoDrawDemo />

<small>Replay to watch a routed path draw on, the arrowhead appear, and a circle
pop in — the same primitives `mkPath` / `mkArrow` / `mkCircle` produce.</small>

## Deck-wide defaults

Set defaults once in the deck headmatter under `twojs:`:

```md
---
twojs:
  defaults: { linewidth: 2, stroke: "#695FAB" }
  path:     { head: triangle, radius: 10 }
  arrow:    { headlen: 14 }
  circle:   { fill: none }
---
```

Precedence (low → high): `twojs:` headmatter → `useTwo(config)` per slide →
per-type bucket → per-call props.

See the [API reference](/api/#usetwo).
