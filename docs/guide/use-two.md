# `useTwo` — arrows, paths & circles

<TwoDemo class="my-5" />

<!-- <small>Illustrative — the real shapes are bound to slide elements and animate.</small> -->

`useTwo()` gives you two [Two.js](https://two.js.org/) drawing layers per slide:
`two.back` renders **behind** the slide's HTML, `two.front` **on top**. Pass
[`usePos`](./use-pos) anchor strings directly — endpoints stay reactive.


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

`mkArrow(from, to, props)` is shorthand for a straight [path](#paths-mkpath-props-m-start)
with an arrowhead — `mkPath({ head: true, …props }).M(from).L(to)`. So it takes
every path prop (`head`, `radius`, `dashed`, `text`, `start`/`end`, …).
Endpoints are resolved every frame, and a selector matching multiple elements
**fans out** to one arrow per element.

```ts
two.back.mkArrow('.a@r', '.b@l', {
  stroke: '#0ea5e9', linewidth: 3,
  head: 'stealth',        // any tip name (default true = a straight barb)
  dashed: true,           // dashed shaft (see "Dashed strokes" below)
  text: 'flows to',       // label riding the shaft (string or options object)
})
```

The arrowhead **scales with `linewidth`** like every other path head (there is
no separate `headlen`); pass `head: false` for a plain line.

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

## Arrow heads

`head` accepts a **tip name** (string), `true` (the default `straight`),
or `false` / omitted for none. The tip is drawn at the end of the shaft, points
along the path direction, inherits the shaft's `stroke`, and **scales with
`linewidth`** — thicker lines get proportionally larger tips.

```ts
two.back.mkPath({ stroke: '#6366f1', head: 'stealth', linewidth: 3 }).M('.a@r').L('.b@l')
```

The set is inspired by the [TikZ `arrows.meta` library](https://tikz.dev/tikz-arrows#sec-16.5)
and grouped the same way. Names are matched case-insensitively and
space/hyphen/underscore-insensitively, so `'Turned Square'`, `'turned square'`
and `'turned-square'` are equivalent. Filled tips (the geometric shapes) paint
their interior with the stroke color; barbs, brackets and the like are
stroke-only.
Every geometric tip also has a hollow, stroke-only twin named `open …` (e.g.
`'open triangle'`, `'open circle'`) — the same outline with no fill.

<ArrowHeadsGallery />

The `rays` tip takes a configurable ray count in trailing brackets — e.g.
`'rays[3]'` or `'rays[5]'` (default `'rays[6]'`).

You can also pass a custom Two.js `Shape` as `head` — it's placed at the tip and
rotated to the path direction (author it pointing toward **+x** with its point
at the origin).

## Dashed strokes

Both arrows and paths accept dash props. The arrowhead/path-head always stays
solid — only the shaft is dashed.

```ts
two.back.mkArrow('.a@r', '.b@l', { dashed: true })                 // linewidth-scaled dashes
two.back.mkPath({ stroke: '#6366f1', dashes: [12, 6] }).M('.a@r').L('.b@l')  // explicit [on, off] px
```

- `dashed: true` — derive a pattern that scales with `linewidth` (thicker lines
  get larger dashes). `false` / omitted draws solid.
- `dashes: [on, off, …]` — explicit dash/gap lengths in px (overrides `dashed`).
- `dashOffset` — shift the pattern along the path. Animate it with
  [`useTl`](./use-tl) for a marching-ants effect:

```ts
const p = two.back.mkPath({ dashes: [10, 8] }).M('.a@r').L('.b@l')
tl.step().to(p, { dashOffset: -18, duration: 1, repeat: -1, ease: 'none' })
```

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
  arrow:    { head: stealth }
  circle:   { fill: none }
---
```

Precedence (low → high): `twojs:` headmatter → `useTwo(config)` per slide →
per-type bucket → per-call props.

See the [API reference](/api/#usetwo).
