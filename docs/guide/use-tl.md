# `useTl` — click-driven timelines

`useTl()` returns a **paused GSAP timeline** split into steps. Each click on the
slide plays from one `step()` to the next.

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useTl } from 'slidev-addon-gsap'

const tl = useTl()
onMounted(() => {
  tl.step()                                 // step 0 = initial state
    .from('.title', { opacity: 0, y: 20 })  // plays on click 1
    .step()
    .to('.title', { x: 100, duration: 0.6 })// plays on click 2
    .step()
})
</script>

<h1 class="title">Hello</h1>
```

::: tip How is this implemented?
Each `step()` creates a new [label](https://gsap.com/docs/v3/GSAP/Timeline/addLabel()/)
on the timeline named `"step-{n}"`. Then a watcher is used to
intercept every click and to [`seek`](https://gsap.com/docs/v3/GSAP/Tween/seek()/)
to the corresponding label.
:::

## Steps & inferred clicks

`step()` (alias `click()`) marks a click boundary. Everything chained between two
`step()` calls plays as one click. **The slide's click count is automatically
inferred from the number of `step()` calls**.

```ts
tl.step() // initial
  .from('.a', { opacity: 0 })
  .step() // click 1 → .a fades in
  .from('.b', { opacity: 0 })
  .step() // click 2 → .b fades in
```

Refreshing the page stays at the current click (which is particularly
important during development when file changes trigger hot-reloads).
Likewise, click-back reverses, and an over-large click counts in the URL
are clamped down.

Use the click buttons to step through this mini-presentation:

<StepsDemo>

```ts
const tl = useTl()

tl.step() // 0
  .from('.c1', { opacity: 0, y: 16 })
  .step() // 1
  .from('.c2', { opacity: 0, y: 16 })
  .step() // 2
  .from('.c3', { opacity: 0, y: 16 })
  .step() // 3
```

</StepsDemo>

## It's just GSAP

`from`, `to`, `fromTo`, stagger, easing, labels, relative time (`'-=0.3'`) — the
full GSAP tween API is available, and **CSS selectors are scoped to the current
slide**, so `'.box'` only matches inside this slide.

```ts
tl.step()
  .from('.item', { opacity: 0, y: 16, stagger: 0.1 })
  .step()
  .to('.box', { x: 150, rotate: 12, ease: 'power2.out' })
  .fromTo('.box',
    { borderColor: '#666' },
    { borderColor: '#34d399' })
  .step()
```

The returned object is a real `gsap.core.Timeline` (proxied), so every native
timeline method works too.

<FromToDemo>

```ts
const tl = useTl()

tl.step() // 0
  .from('.box', { opacity: 0, y: 24 })
  .step() // 1 — animate TO
  .to('.box', { x: 130, rotate: 12 })
  .step() // 2 — recolor
  .to('.box', { borderColor: '#34d399' })
  .step() // 3
```

</FromToDemo>

## Animating Two.js shapes

Shapes from [`useTwo`](./use-two) expose `start`/`end` (0 - 1) for drawing them:

```ts
const arrow = two.back.mkArrow('.a@r', '.b@l')
// draw the arrow
tl.step()
  .from(arrow, { end: 0, duration: 0.6 })
  .step()
```

## Preset effects

For common reveals, prefer the chainable [preset effects](./effects) over
hand-written tweens:

```ts
tl.step()
  .popIn('.a')
  .step()
  .slideIn('.b', { from: 'left' })
  .step()
```

## Magic-move

`tl.morph('.a', '.b')` adds a [within-slide morph](./morph) as a timeline step.
