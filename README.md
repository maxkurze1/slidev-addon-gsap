# GSAP Addon for Slidev

A [GSAP](https://gsap.com/) + [Two.js](https://two.js.org/) addon for
[Slidev](https://github.com/slidevjs/slidev). It gives you click-driven
animation timelines, reactive element anchors, arrows/paths/circles drawn over
your slides, and magic-move morphs both within and across slides.


Docs: [maxkurze1.github.io/slidev-addon-gsap/docs](https://maxkurze1.github.io/slidev-addon-gsap/docs/)

Live demo deck: [maxkurze1.github.io/slidev-addon-gsap/demo](https://maxkurze1.github.io/slidev-addon-gsap/demo/)

## Install

```bash
$ pnpm install git+https://github.com/maxkurze1/slidev-addon-gsap.git
```

Enable it in your deck headmatter (the first `---` block). Slidev automatically
prepends the `slidev-addon-` prefix
([docs](https://sli.dev/guide/theme-addon#use-addon)):

```md
---
addons:
  - gsap
---
```

Then import the composables inside a slide's `<script setup>`:

```ts
import { useTl, usePos, useTwo, useSlide } from 'slidev-addon-gsap'
```

See [`example.md`](./example.md) for a full, runnable showcase of every feature.

## Features at a glance

### `useTl` — click-driven timelines

A paused GSAP timeline split into **steps**; each click plays to the next step.
The click count is **inferred from the number of `step()` calls** — no `clicks:`
frontmatter needed.

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useTl } from 'slidev-addon-gsap'

const tl = useTl()
onMounted(() => {
  tl.step()
    .from('.title', { opacity: 0, y: 20 })
    .step()
    .to('.title', { x: 100 })
    .step()
})
</script>
```

All of GSAP is available (`from`/`to`/`fromTo`, stagger, easing, labels), and CSS
selectors are scoped to the current slide. `tl.morph('.a', '.b')` adds a
**within-slide magic-move** (A morphs into B's box) as a timeline step.

Chainable **preset effects** cover the common cases with good defaults:

```ts
tl.step().popIn('.a')
  .step().slideIn('.b', { from: 'left' })
  .step().pulse('.b')
```

Entrances `fadeIn popIn scaleIn slideIn flyIn blurIn dropIn`, exits
`fadeOut popOut scaleOut slideOut flyOut`, emphasis `pulse shake wiggle flash
bounce` — each takes optional GSAP vars to override.

### `usePos` — reactive element anchors

`pos('selector@anchor')` is a live point on a DOM element, re-measured every
frame so it tracks layout, GSAP moves and resizes.

```ts
const pos = usePos()
pos('.card@tr')   // top-right (axis-aligned)
pos('.card@ne')   // north-east corner — rotates *with* the element
pos('.item')      // fan-out: one point per matching element
```

Axis-aligned anchors: `c t b l r tl tr bl br`. Rotation-aware: `n s e w ne nw se sw`.

### `useTwo` — arrows, paths & circles

Two.js drawing layers (`two.back` behind the slide, `two.front` above it). Pass
anchor strings directly; endpoints stay reactive.

```ts
const two = useTwo()
onMounted(() => {
  two.back.mkArrow('.a@r', '.b@l', { stroke: '#0ea5e9', linewidth: 3, text: 'flows to' })
  two.back.mkPath({ head: 'triangle', radius: 14 }).M('.a@r').h(28).VH('.b@l')
  two.front.mkCircle('.c@center', 40, { fill: '#34d399' })
})
```

Animate shapes on with `tl.from(shape, { end: 0 })`. Deck-wide defaults can be set
via a `twojs:` headmatter block.

### Cross-slide morph (magic-move between slides)

Give elements on adjacent slides the **same `data-morph="key"`** and the one on
the next slide flies/resizes from where the first was — during the slide
transition, for any transition. **No setup needed**; it's wired globally.

```md
---
transition: slide-left
morph: { duration: 0.4 }   # the lower-indexed slide of the pair owns the effect
---
<div data-morph="hero" class="...">🚀</div>
```

## Composables

| Composable  | Purpose |
|-------------|---------|
| `useTl`     | Paused, click-driven GSAP timeline (`step`, `from/to/fromTo`, `morph`) |
| `usePos`    | Reactive `selector@anchor` points on DOM elements |
| `useTwo`    | Two.js front/back layers with `mkArrow` / `mkPath` / `mkCircle` |
| `useSlide`  | Ref to the current slide's root element |

## AI assistant skill

This package ships an [Agent Skill](./skills/slidev-gsap/SKILL.md) so AI coding
assistants (e.g. Claude Code) know the full API and conventions when helping you
author decks that use this addon.

### Load it into a repo that uses this library

After installing the addon, copy (or symlink) the skill into your presentation
repo's `.claude/skills/` directory, which Claude Code auto-discovers:

```bash
# copy — a static snapshot
mkdir -p .claude/skills
cp -r node_modules/slidev-addon-gsap/skills/slidev-gsap .claude/skills/

# …or symlink — stays in sync when you update the addon
ln -s ../../node_modules/slidev-addon-gsap/skills/slidev-gsap .claude/skills/slidev-gsap
```

For all your projects at once, copy it into the global skills dir instead:

```bash
cp -r node_modules/slidev-addon-gsap/skills/slidev-gsap ~/.claude/skills/
```

The assistant then picks up the skill whenever you ask it to create or edit
slides for a deck using this addon. Other agent tools that support a skills /
rules directory can point at the same [`SKILL.md`](./skills/slidev-gsap/SKILL.md).

## Contributing
<!-- https://sli.dev/guide/write-theme.html --->

- `pnpm install`
- `pnpm run dev` to start the preview of `example.md`
- Edit `example.md` and the `scripts/` composables to see changes
- The skill in [`skills/slidev-gsap/SKILL.md`](./skills/slidev-gsap/SKILL.md) is
  the canonical API reference — keep it in sync when the API changes.
