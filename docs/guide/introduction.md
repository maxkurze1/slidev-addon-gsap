# What is slidev-addon-gsap?

`slidev-addon-gsap` brings [GSAP](https://gsap.com/) timelines and
[Two.js](https://two.js.org/) drawing into [Slidev](https://sli.dev/) decks,
with an ergonomic, **click-driven** authoring model.

Instead of hand-wiring `v-click` directives and CSS transitions, you build a
paused GSAP timeline and split it into steps — each click plays to the next.
You get the full power of GSAP, plus helpers for the things slides actually need:

- **`useTl`** — a click-driven GSAP timeline. The click count is *inferred* from
  the number of steps; reverse and refresh "just work".
- **`usePos`** — live `selector@anchor` points on DOM elements, re-measured every
  frame so arrows and labels track layout, moves and resizes.
- **`useTwo`** — Two.js layers above and below the slide for arrows, paths,
  circles, etc. whose endpoints stay bound to elements.
- **Preset effects** — `popIn`, `slideIn`, `pulse`, … one-liners with good defaults.
- **Morph / magic-move** — within a slide (`tl.morph`) and automatically across
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

Slidev's built-in clicks are great for reveals, but coordinating multiple
elements, drawing connectors between them, or doing Keynote-style magic-move gets
verbose fast. This addon keeps all of that in one place — a single timeline per
slide — while staying "just GSAP" underneath, so anything GSAP can do, you can do.

Continue to [Getting Started](./getting-started) to install it, or jump to the
[Features Overview](./features).
