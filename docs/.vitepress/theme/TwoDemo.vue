<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import Two from 'two.js'

// Illustrative preview of the kind of shapes `useTwo` draws (arrow, rounded
// path, circle). Uses Two.js directly; the real `mkArrow` / `mkPath` /
// `mkCircle` build the same primitives but with reactive, anchor-bound endpoints
// inside a Slidev slide.

const host = ref<HTMLElement | null>(null)
let two: any = null

onMounted(() => {
  const W = 460, H = 220
  two = new Two({ width: W, height: H }).appendTo(host.value)
  const stroke = getComputedStyle(document.documentElement).getPropertyValue('--vp-c-brand-1').trim() || '#646cff'

  // arrow (shaft + head)
  const shaft = two.makeLine(40, 50, 240, 50)
  shaft.stroke = stroke; shaft.linewidth = 3; shaft.cap = 'round'
  const head = two.makePath(232, 44, 244, 50, 232, 56, true)
  head.fill = stroke; head.noStroke()
  const t1 = two.makeText('mkArrow', 140, 34); t1.size = 13; t1.fill = stroke

  // rounded elbow path
  const path = two.makePath(40, 110, 40, 170, 200, 170, false)
  path.noFill(); path.stroke = stroke; path.linewidth = 3; path.cap = 'round'; path.join = 'round'; path.curved = false
  const t2 = two.makeText('mkPath (radius)', 130, 196); t2.size = 13; t2.fill = stroke

  // circle
  const c = two.makeCircle(360, 110, 48)
  c.stroke = stroke; c.linewidth = 3
  c.fill = 'color-mix(in srgb, ' + stroke + ' 14%, transparent)'
  const t3 = two.makeText('mkCircle', 360, 178); t3.size = 13; t3.fill = stroke

  two.update()
})

onUnmounted(() => {
  two?.pause?.()
  if (host.value) host.value.innerHTML = ''
})
</script>

<template>
  <div class="my-4 flex justify-center border border-divider rounded-xl bg-bgsoft p-3">
    <div ref="host" class="two-host" />
  </div>
</template>

<style scoped>
.two-host :deep(svg) { max-width: 100%; height: auto; }
</style>
