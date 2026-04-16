---
name: slidev-addon-gsap
description: >-
  Author and edit Slidev presentations that use the `slidev-addon-gsap` library.
  Covers click-driven GSAP timelines (useTl), reactive DOM-element anchors
  (usePos), Two.js arrows/paths/circles drawn over slides (useTwo), within-slide
  morph / magic-move, automatic cross-slide morph via `data-morph`, and
  coordinating Slidev's code magic-move with the timeline. Use this whenever you
  write or modify Slidev slide markdown (.md) for a deck that lists `gsap` in its
  `addons:`, or when the user asks for slide animations, reveals, arrows/diagrams
  pointing at elements, or magic-move effects.
---

# slidev-addon-gsap

A Slidev addon that brings GSAP timelines + Two.js drawing into slides, with
ergonomic click-driven authoring. This skill is the reference for using it.

## Setup (per deck)

1. The addon must be enabled in the deck **headmatter** (first `---` block):
   ```md
   ---
   addons:
     - gsap        # Slidev expands this to the `slidev-addon-gsap` package
   ---
   ```
2. Import composables inside a slide's `<script setup>`:
   ```ts
   import { useTl, usePos, useTwo, useSlide } from 'slidev-addon-gsap'
   ```
   (Inside this addon's own repo / `example.md`, the import is the relative
   `'./scripts/util.ts'` instead.)
3. Call composables at the top of `setup`, and build timelines in `onMounted`.

Cross-slide morph needs **no import** — it's wired globally by the addon.

---

## useTl — click-driven GSAP timeline

A paused GSAP timeline split into **steps**. Each click advances from one
`step()` to the next. The slide's click count is **inferred from the number of
`step()` calls** — never add `clicks:` to frontmatter for these.

```ts
<script setup lang="ts">
import { onMounted } from 'vue'
import { useTl } from 'slidev-addon-gsap/scripts/util'

const tl = useTl()
onMounted(() => {
  tl.step()                                   // step 0 = initial state
    .from('.title', { opacity: 0, y: 20 })    // plays on click 1
    .step()
    .to('.title', { x: 100, duration: 0.6 })  // plays on click 2
    .step()
})
</script>
```

- `step()` (alias `click()`) — marks a click boundary; returns the timeline for chaining.
- `.from` / `.to` / `.fromTo` — plain GSAP tweens. **CSS selectors are auto-scoped
  to the current slide**, so `'.box'` only matches inside this slide.
- Everything between two `step()` calls plays as one click.
- Standard GSAP applies: `stagger`, `ease`, `duration`, relative time `'-=0.3'`, labels.
- Reverses on click-back and seeks to the right place on page refresh automatically.
- All native `gsap.core.Timeline` methods are also available on the returned object.

### `tl.morph(a, b, opts?)` — within-slide magic-move

Transforms element **A** so it fits **B**'s position and size, cross-fading A
into B. It's a timeline step, so it reverses/seeks like any other.

```ts
tl.step()
  .morph('.a', '.b')                 // A → B's box, cross-fade
  .step()
  .morph('.b', '.c', { duration: 1, ease: 'power2.inOut', scale: false })
  .step()
```
Options: `duration` (default `0.8`), `ease`, `scale` (default `true` = cheap
transform scaling, may stretch contents; `false` = animate width/height instead).

### Preset effects — chainable one-liners with good defaults

Prefer these over hand-writing common `.from`/`.to` tweens. Each is a chainable
timeline method `effect(target, vars?, position?)` that returns the timeline.
Entrances hide the target until their step; emphasis effects self-reset in place.
Override any default via `vars` (any GSAP tween var).

```ts
tl.step().popIn('.a')
  .step().slideIn('.b', { from: 'left' })     // from: left | right | top | bottom
  .step().dropIn('.c')
  .step().pulse('.d')
  .step().popOut('.a', { duration: 0.3 })     // override a default
```

- **Entrances** (animate in to the natural state): `fadeIn` · `popIn` · `scaleIn`
  · `blurIn` · `dropIn` · `slideIn` · `flyIn` · `wipeIn` (clip wipe L→R) · `riseIn`
  (clip fill bottom→top) · `skewIn` (slide + un-skew) · `glitchIn` (materialize from
  cyberpunk glitch fragments)
- **Exits** (animate away; clip/skew exits *continue* the entrance direction rather
  than reversing it): `fadeOut` · `popOut` · `scaleOut` · `blurOut` · `slideOut` ·
  `flyOut` · `wipeOut` (wipe L→R) · `riseOut` (wipe bottom→top) · `skewOut` (exit right)
  · `glitchOut` (dissolve into glitch fragments)
- **Emphasis** (in place): `pulse` · `shake` · `wiggle` · `flash` · `bounce` ·
  `glitch` (cyberpunk RGB-split + horizontal scan-line tears; any element)
- **Text entrances** (TextPlugin + SplitText): `textTypeIn` (typewriter) ·
  `textSplitIn` (chars/words/lines stagger) · `textGatherIn` (chars converge from
  scattered) · `textFlipIn` (split-flap rotateX) · `textUnderlineIn` (underline grows
  per word)
- **Text exits** (pair with their `…In`; the underline exit *continues* the entrance
  direction rather than reversing it): `textTypeOut` · `textSplitOut` ·
  `textGatherOut` · `textFlipOut` · `textUnderlineOut` (wipe L→R)
- **Text emphasis** (in place): `textSwap(target, next, vars?, pos?)` (retype to a
  new string)

Directional presets (`slideIn`/`flyIn`) take `{ from, distance }`; their exits
(`slideOut`/`flyOut`) take `{ to, distance }`. Split presets (`textSplit*`/
`textGather*`/`textFlip*`/`textUnderline*`) take
`{ by: 'chars' | 'words' | 'lines' }` (default `'chars'`, except `textUnderline*`
defaults `'words'`). `textTypeIn`/`textTypeOut` type/erase the text.

---

## usePos — reactive element anchors

`pos('selector@anchor')` returns a **live** point (re-measured every frame, so it
tracks layout, GSAP moves and resizes). Used for math or fed straight into `useTwo`.

```ts
const pos = usePos()

pos('.card')          // center (default)
pos('.card@tr')       // top-right
pos('.card@ne')       // north-east corner — ROTATES WITH the element
pos('.item@center')   // fan-out: one point per matching element -> [p0, p1, …]

pos('.card@r')[0].add(20, 0)   // vector math; [i] selects one; .x / .y read values
pos('.card@tl')[0].H(other)    // .H = take x from other, keep own y; .V = vice-versa
// ops: .add .sub .mul .div .H .V
```

Anchor names:
- **Axis-aligned** (corners/edges of the upright bounding box, do NOT rotate):
  `c t b l r tl tr bl br`
- **Rotation-aware** (follow the element's rotation, so `ne` is always the same
  physical corner): `n s e w ne nw se sw`

---

## useTwo — Two.js arrows, paths, circles over the slide

Two drawing layers per slide: `two.back` renders **behind** slide HTML,
`two.front` **on top**. (`two.mkArrow` etc. are shortcuts for `two.front`.)
Pass `usePos` anchor strings **directly** — no `pos()` wrapper needed; endpoints
stay reactive.

```ts
const two = useTwo()
onMounted(() => {
  // arrow(from, to, props) — fan-out if a selector matches multiple elements
  two.back.mkArrow('.a@r', '.b@l', { stroke: '#0ea5e9', linewidth: 3, text: 'flows to' })

  // path: config-first, then SVG-style commands starting with .M()
  two.back.mkPath({ stroke: '#6366f1', head: 'triangle', radius: 14, text: 'route' })
    .M('.from@r')   // moveto = start
    .h(28)          // relative horizontal line
    .VH('.to@l')    // orthogonal routing into the target

  // circle(center, radius, props)
  two.front.mkCircle('.c@center', 40, { fill: '#34d399' })
})
```

Path commands (uppercase = absolute, lowercase = relative to current point):
- `M L H V Z` — standard SVG-style.
- `HV VH` — one 90° corner (horizontal-then-vertical / vertical-then-horizontal).
- `HVH VHV` — two corners; optional trailing ratio `0..1` (default `0.5`) sets the
  split, e.g. `.VHV('.b@c', 0.3)`.
- `radius` on the path rounds all corners; `head` (`'triangle'` etc.) adds an arrowhead.

Other notes:
- `text` / `label` prop on arrows & paths draws a label that rides the shaft
  (string, or `{ text, at, offset, rotate, background, fill, size }`).
- **Draw-on animation:** shapes expose `start`/`end` (0..1). Animate with
  `tl.from(shape, { end: 0, duration: 0.6 })` to draw them on at a step.
- Coordinates use Slidev's configured slide size, so they line up with `usePos`.
- **Deck-wide defaults** via headmatter:
  ```md
  ---
  twojs:
    defaults: { linewidth: 2, stroke: "#695FAB" }
    path:     { head: triangle, radius: 10 }
    arrow:    { headlen: 14 }
    circle:   { fill: none }
  ---
  ```
  Precedence: `twojs:` headmatter < `useTwo(config)` per slide < per-type bucket < per-call props.

## useSlide

`const slide = useSlide()` → a ref to the current slide's root element (rarely
needed directly; the other composables use it internally).

---

## Cross-slide morph (magic-move between slides) — automatic

Give an element on one slide and an element on an adjacent slide the **same
`data-morph="key"`**, and the second animates from where the first was, during
the slide transition. **No import or setup** — the addon wires it globally.

```md
---
transition: slide-left
morph: { duration: 0.4 }    # the LOWER-INDEXED slide of the pair owns the effect
---
<div data-morph="hero" class="w-32 h-20 ...">🚀</div>

---
transition: slide-left
---
<div data-morph="hero" class="w-72 h-48 ...">🚀</div>
```

- Works with **any** transition (fade, slide, zoom…).
- Keys must be **unique within a slide**.
- Options come from frontmatter: deck headmatter `morph:` for defaults, then the
  **lower-indexed** slide of the pair's `morph:` (`duration`, `ease`, `fade`) —
  so both navigation directions use the same config. `attribute` (default
  `data-morph`) is deck-headmatter-only.

---

## Coordinating Slidev's code magic-move with the timeline

Slidev's built-in `magic-move` code block and `useTl` share the **same click
axis**, so they stay in lockstep with no glue code. Position the block with an
**absolute** `{at: N}` matching your timeline step (relative `+1` won't see
useTl's steps).

````md
````md magic-move {at:1}
```js
const x = 1
```
```js
const x = 2
const y = 1
```
````
````

With a `useTl` whose `.from()`s sit at clicks 1 and 2, the code morph and the
GSAP animations advance together.

---

## Conventions for writing these slides

- One `useTl()` / `usePos()` / `useTwo()` per slide, called at the top of `<script setup>`.
- Build timelines and create shapes inside `onMounted(() => { … })`.
- Do **not** set `clicks:` in frontmatter for `useTl` slides — it's inferred.
- Prefer anchor strings (`'.box@tr'`) over manual coordinates so things stay reactive.
- Selectors in `useTl`/`useTwo` are slide-scoped; reuse simple class names freely.
