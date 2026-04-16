# Features Overview

A tour of everything the addon provides. Each links to its full guide.

## Click-driven timelines — [`useTl`](./use-tl)

A paused GSAP timeline split into **steps**. Each click plays from one `step()`
to the next; the click count is inferred from the number of steps.

```ts
tl.step()
  .from('.a', { opacity: 0, y: 20 })
  .step()
  .to('.a', { x: 100 })
  .step()
```

All of GSAP is available, and selectors are auto-scoped to the slide. Reverse on
click-back and refresh-to-position are handled for you.

## Preset effects — [`effects`](./effects)

Chainable one-liners with good defaults for common reveals:

```ts
tl.step()
  .popIn('.a')
  .step()
  .slideIn('.b', { from: 'left' })
  .step()
  .pulse('.b')
```

Entrances, exits and emphasis — 17 presets, each overridable with any GSAP var.

## Reactive anchors — [`usePos`](./use-pos)

Live points on DOM elements: `pos('.card@tr')`. Re-measured every frame, with
axis-aligned and rotation-aware anchors and vector math.

## Drawing — [`useTwo`](./use-two)

Two.js layers above/below the slide for arrows, paths and circles whose endpoints
are bound to elements:

```ts
two.back.mkArrow('.a@r', '.b@l', { stroke: '#0ea5e9', text: 'flows to' })
two.back.mkPath({ head: 'triangle', radius: 14 }).M('.a@r').h(28).VH('.b@l')
two.front.mkCircle('.c@center', 40, { fill: '#34d399' })
```

## Morph / magic-move

- [**Within a slide**](./morph): `tl.morph('.a', '.b')` makes A fit and cross-fade
  into B, as a timeline step.
- [**Across slides**](./cross-slide-morph): give elements on adjacent slides the
  same `data-morph="key"` and they morph during the transition — automatic, any
  transition.
