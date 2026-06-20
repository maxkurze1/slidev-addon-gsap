# What is slidev-addon-gsap?

`slidev-addon-gsap` brings [GSAP](https://gsap.com/) timelines and
[Two.js](https://two.js.org/) drawing into [Slidev](https://sli.dev/) decks,
with an ergonomic, **timeline-based** authoring model.

Instead of hand-wiring `v-click` directives and CSS transitions, you build a
paused GSAP timeline and split it into steps — each click plays to the next.
You get the full power of GSAP, plus helpers for the things slides actually need:

- **`useTl`** — a click-driven GSAP timeline. The click count is *inferred* from
  the number of steps; reverse and refresh work out of the box.
- **`usePos`** — live `selector@anchor` points on DOM elements, re-measured every
  frame (60/s) so arrows and labels track layout, moves and resizes.
- **`useTwo`** — two layers one above and one below the slide for drawing arrows, paths,
  circles, etc. whose endpoints stay bound to elements (using Two.js).
- **Preset effects** — `popIn`, `slideIn`, `pulse`, … one-liners with reasonable defaults.
- **Morph / magic-move** — within a slide (`tl.morph`) and across
  slides (`data-morph`).




<IntroDemo>

```mdc
---
comark: true
---

<script setup lang="ts">
import { onMounted } from 'vue'
import { useTl } from 'slidev-addon-gsap'

const tl = useTl()
onMounted(() => {
  tl.step().textSplitIn('.hello')
    .step().popIn('.title')
    .step().slideIn('.subtitle', { from: 'left' })
    .step()
})
</script>

# [Hello]{.hello} [GSAP]{.title}

::div{.subtitle}
click-driven animations for Slidev
::
```

</IntroDemo>

## Why?

Slidev's built-in clicks are fine for simple reveals, but coordinating multiple
elements/animations by spreading explicit indices over the whole slide, becomes
unmaintainable quite fast. This addon keeps all animations in one place — a single
timeline per slide — while exposing the full animation capabilities of GSAP.

Continue to [Getting Started](./getting-started) to install it, or jump to the
[Features Overview](./features).
