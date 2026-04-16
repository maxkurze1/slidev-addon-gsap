# Getting Started

## Install

```bash
pnpm install git+https://github.com/maxkurze1/slidev-addon-gsap.git
```

## Enable the addon

Add it to your deck's *headmatter* (the very first `---` block of your entry
markdown). Slidev automatically prepends the `slidev-addon-` prefix, so `gsap`
resolves to this package
([docs](https://sli.dev/guide/theme-addon#use-addon)):

```md
---
addons:
  - gsap
---
```

::: tip Note
Enabling the addon also wires up [cross-slide morph](./cross-slide-morph)
globally.
:::

## Use the composables

Import inside a slide's `<script setup>` and build your timeline in `onMounted`:

```vue
---
<script setup lang="ts">
import { onMounted } from 'vue'
import { useTl, usePos, useTwo } from 'slidev-addon-gsap'

const tl = useTl()
const two = useTwo()

onMounted(() => {
  tl.step()
    .popIn('h1')
    .step()
    .popIn('p')
    .step()
})
</script>

# My Title

This slide is going to be animated!

---
```

## Conventions

- Call `useTl()` / `usePos()` / `useTwo()` once, at the top of `<script setup>`.
- Build timelines and create shapes inside `onMounted(() => { … })`.
- **Don't** set `clicks:` in frontmatter for `useTl` slides — the count is
  inferred from `step()` calls.
- Prefer anchor strings (`'.box@tr'`) over hard-coded coordinates so things stay
  reactive.
- CSS selectors in `useTl`/`useTwo` are scoped to the current slide, so simple
  class names won't collide across slides.
- Prefer MDC `::div{.cls}` / `:span[**md**]{.cls}` over raw `<div>` — their slot
  content is parsed as markdown without the blank-line requirement of raw HTML
  blocks.

## Editor & AI tooling

Install the recommended VSCode extensions and snippets, and load the bundled AI
skill — see [Editor & AI Setup](./tooling).

Next: the [Features Overview](./features), or dive into
[useTl](./use-tl).
