---
outline: deep
---
# API Reference

All composables can be imported form the top-level:

```ts
import { useTl, usePos, useTwo, useSlide } from 'slidev-addon-gsap'
```

## useTl

```ts
function useTl(): StepTimeline
```

Returns a paused, click-driven GSAP timeline (a proxied `gsap.core.Timeline`).

### Timeline methods

| Method | Description |
|--------|-------------|
| `step()` / `click()` | Mark a click boundary. Returns the timeline. Click count is inferred from the number of calls. |
| `from(target, vars, position?)` | GSAP `from` tween. Selectors are scoped to the slide. |
| `to(target, vars, position?)` | GSAP `to` tween (slide-scoped). |
| `fromTo(target, fromVars, toVars, position?)` | GSAP `fromTo` (slide-scoped). |
| `morph(a, b, opts?)` | [Within-slide magic-move](#tl-morph). |
| *preset effects* | [`popIn`, `slideIn`, `pulse`, …](#preset-effects) |
| *(all native timeline methods)* | `add`, `to`, `set`, `tweenTo`, `seek`, … |

Targets are CSS selectors (scoped to the current slide), elements, or Two.js
shapes returned by [`useTwo`](#usetwo).

### tl.morph

```ts
tl.morph(a: string | Element, b: string | Element, opts?: {
  duration?: number   // default 0.8
  ease?: string       // default 'power1.inOut'
  scale?: boolean     // default true (transform scaling) | false (width/height)
}): StepTimeline
```

Transforms `a` to fit `b`'s position and size and cross-fades into it, as one
timeline step. See the [Morph guide](/guide/morph).

---

## Preset effects

Chainable timeline methods: `effect(target, vars?, position?) → StepTimeline`.
`vars` is merged over the preset defaults (any GSAP tween var); `position` is an
optional GSAP position.

```ts
type EffectVars = gsap.TweenVars & {
  from?: 'left' | 'right' | 'top' | 'bottom'   // slideIn / flyIn
  to?:   'left' | 'right' | 'top' | 'bottom'   // slideOut / flyOut
  distance?: number                            // slide / fly travel (px)
  by?: 'chars' | 'words' | 'lines'             // textSplitIn / textSplitOut
}
```

| Group | Presets |
|-------|---------|
| **Entrances** | `fadeIn` `popIn` `scaleIn` `blurIn` `dropIn` `slideIn` `flyIn` `wipeIn` `riseIn` `skewIn` `glitchIn` |
| **Exits** | `fadeOut` `popOut` `scaleOut` `blurOut` `slideOut` `flyOut` `wipeOut` `riseOut` `skewOut` `glitchOut` |
| **Emphasis** | `pulse` `shake` `wiggle` `flash` `bounce` `glitch` |
| **Text entrances** | `textTypeIn` `textSplitIn` `textGatherIn` `textFlipIn` `textUnderlineIn` |
| **Text exits** | `textTypeOut` `textSplitOut` `textGatherOut` `textFlipOut` `textUnderlineOut` |
| **Text emphasis** | `textSwap` |

Directional presets take `{ from, distance }` (entrances) or `{ to, distance }`
(exits); split presets (`textSplit*`/`textGather*`/`textFlip*`/`textUnderline*`)
take `{ by }`. Each text entrance has a matching `…Out` exit. `textSwap` has the
signature `textSwap(target, next, vars?, position?)`. Text presets use GSAP's
TextPlugin and SplitText. See the [Effects guide](/guide/effects) for the
per-preset feel.

---

## usePos

```ts
function usePos(): (ref: string) => VecGetterArray
```

`pos('selector@anchor')` returns a live, array-like collection of points (one per
matched element), re-measured each frame.

### Anchors

- Axis-aligned (don't rotate): `c` `t` `b` `l` `r` `tl` `tr` `bl` `br`
- Rotation-aware (follow rotation): `n` `s` `e` `w` `ne` `nw` `se` `sw`

Omitting `@anchor` defaults to center.

### Point API

```ts
const p = pos('.card@r')[0]
p.x; p.y                       // live numbers
p()                            // snapshot a Two.js Vector
p.add(dx, dy); p.sub(...); p.mul(...); p.div(...)
p.H(other); p.V(other)         // take x / y from `other`, keep the other axis
```

Ops also broadcast over the whole array: \
`pos('.item').add(0, -10)` \
 (will add `-10` to all elements within the array).

## useTwo

```ts
function useTwo(config?: TwoConfig): TwoLayers
```

```ts
type TwoConfig = {
  defaults?: ShapeProps     // applied to every shape
  path?: ShapeProps
  arrow?: ShapeProps
  circle?: ShapeProps
}
```

Returns an object with two drawing layers and front-layer shortcuts:

| Member | Description |
|--------|-------------|
| `front`, `back` | the two layer APIs (`mkArrow`/`mkPath`/`mkCircle`) |
| `layer(name)` | `'front'` or `'back'` |
| `mkArrow` / `mkPath` / `mkCircle` | shortcuts for `front` |
| `frontTwo`, `backTwo` | the raw `Two` instances |

### mkArrow

```ts
two.back.mkArrow(from, to, props?) → Path | Path[] | null
```

Shorthand for `mkPath({ head: true, …props }).M(from).L(to)`, so it accepts
every `mkPath` prop. `from`/`to` are anchor strings (`'.a@r'`), elements,
points, or arrays (fan-out). The arrowhead scales with `linewidth`; pass
`head` for a different tip or `head: false` for a plain line.

### mkPath

```ts
two.back.mkPath(props?)        // config-first
  .M(start)                    // then chain commands
  .L(p) .H(p) .V(p) .Z()
  .HV(p) .VH(p)                // one 90° corner
  .HVH(p, ratio?) .VHV(p, ratio?)  // two corners (ratio 0..1, default 0.5)
```

Uppercase = absolute, lowercase = relative. Props: `stroke`, `linewidth`,
`radius` (rounds corners), `head` (a TikZ-style arrow-tip name — see the
[gallery of tips](/guide/use-two#arrow-heads)), `text` / `label`,
`dashed` / `dashes` / `dashOffset` (see [Dashed strokes](/guide/use-two#dashed-strokes)),
`start`/`end`.

### mkCircle

```ts
two.front.mkCircle(center, radius, props?) → Circle | Circle[] | null
```

Props: `fill`, `stroke`, `linewidth`, `radius`.

### Label options

`text` / `label` accept a string or:

```ts
{
  text: string
  at?: number                 // 0..1 along the visible shaft (default 0.5)
  offset?: number | [number, number]  // perpendicular px, or [dx, dy]
  rotate?: boolean
  fill?: string; size?: number; family?: string; weight?: number | string
  background?: string; padding?: number
}
```

### Deck-wide config (`twojs:` headmatter)

```md
---
twojs:
  defaults: { linewidth: 2, stroke: "#695FAB" }
  path:     { head: triangle, radius: 10 }
  arrow:    { head: stealth }
  circle:   { fill: none }
---
```

Precedence: headmatter `twojs:` < `useTwo(config)` < per-type bucket < per-call props.

---

## useSlide

```ts
function useSlide(): Ref<HTMLElement | null>
```

A ref to the current slide's root element. Used internally for slide-scoping;
reach for it for your own scoped DOM queries. See the
[useSlide guide](/guide/use-slide).

---

## Cross-slide morph config

Enabled globally by the addon — no API to call (using a `global-bottom.vue`).
Configured via frontmatter.
Precedence: defaults < deck headmatter `morph:` < the **lower-indexed** slide's `morph:`.

```ts
type SlideMorphOptions = {
  enabled?: boolean    // default true (deck-headmatter only)
  duration?: number    // default 0.6
  ease?: string        // default 'power1.inOut'
  fade?: boolean       // default true
  attribute?: string   // default 'data-morph' (deck-headmatter only)
}
```

Pair elements across adjacent slides with the same `data-morph="key"`. Disable
morphing deck-wide from the headmatter with `morph: false` (or `morph: { enabled:
false }`). See the [Cross-slide Morph guide](/guide/cross-slide-morph).
