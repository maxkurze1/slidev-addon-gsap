# `useSlide`

`useSlide()` returns a Vue `ref` to the **current slide's root element**.

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useSlide } from 'slidev-addon-gsap'

const slide = useSlide()
onMounted(() => {
  console.log(slide.value)        // the slide's root HTMLElement
})
</script>
```

You rarely need it directly — the other composables use it internally:

- [`useTl`](./use-tl) scopes its selectors to this element.
- [`usePos`](./use-pos) queries anchors within it.
- [`useTwo`](./use-two) appends its drawing layers to it.

Reach for it when you need to run your own DOM queries or measurements scoped to
just the current slide (so class names don't collide with other mounted slides).

See the [API reference](/api/#useslide).
