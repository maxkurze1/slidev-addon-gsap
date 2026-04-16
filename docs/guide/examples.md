# Examples

Copy-paste recipes for common slides. Each is a complete slide (`<script setup>` + markup).

::: tip See them live
The addon's own `example.md` is a runnable deck showcasing every feature —
clone the [repo](https://github.com/maxkurze1/slidev-addon-gsap)
and run `pnpm dev`. The [Preset Effects](./effects) and [useTwo](./use-two) pages
have live in-browser previews.
:::

## Staggered reveal

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useTl } from 'slidev-addon-gsap'
const tl = useTl()
onMounted(() => {
  tl.step()
    .from('.item', { opacity: 0, y: 16, stagger: 0.12 })
    .step()
})
</script>

<ul>
  <li class="item">First</li>
  <li class="item">Second</li>
  <li class="item">Third</li>
</ul>
```

## Reveal cards one by one with presets

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useTl } from 'slidev-addon-gsap'
const tl = useTl()
onMounted(() => {
  tl.step()
    .popIn('.card-1')
    .step().popIn('.card-2')
    .step().popIn('.card-3')
    .step()
})
</script>

<div class="card-1">A</div>
<div class="card-2">B</div>
<div class="card-3">C</div>
```

## Arrow between two boxes that follows a move

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useTl, useTwo } from 'slidev-addon-gsap'
const tl = useTl()
const two = useTwo()
onMounted(() => {
  const arrow = two.back.mkArrow('.a@r', '.b@l', { stroke: '#0ea5e9', linewidth: 3 })
  tl.step()
    .from(arrow, { end: 0, duration: 0.5 })   // draw the arrow on
    .step()
    .to('.b', { x: 130 })                      // move the target — arrow follows live
    .step()
})
</script>

<div class="a">A</div>
<div class="b">B</div>
```

## Routed path with an arrowhead and a label

```ts
two.back.mkPath({ stroke: '#6366f1', head: 'triangle', radius: 14, text: 'route' })
  .M('.from@r')
  .h(28)
  .VH('.to@l')
```

## Magic-move within a slide

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useTl } from 'slidev-addon-gsap'
const tl = useTl()
onMounted(() => {
  tl.step()
    .morph('.box-a', '.box-b')
    .step()
})
</script>

<div class="box-a absolute top-12 left-4 w-24 h-16 ...">A</div>
<div class="box-b absolute bottom-14 right-6 w-44 h-28 ...">B</div>
```

## Magic-move across slides

```md
---
transition: slide-left
morph: { duration: 0.5 }
---
<div data-morph="logo" class="w-32 h-20 ...">🚀</div>

---
transition: slide-left
---
<div data-morph="logo" class="w-72 h-48 ...">🚀</div>
```
