<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import Two from 'two.js'
import { makeArrow } from '../../../scripts/TwoJS/Arrow'
import { makePath } from '../../../scripts/TwoJS/Path'
import { makeCircle } from '../../../scripts/TwoJS/Circle'

// Illustrative preview of the kind of shapes `useTwo` draws. These are the
// project's actual primitives (`mkArrow` / `mkPath` / `mkCircle`) handed a plain
// Two instance and literal coordinates; in a slide the same factories bind their
// endpoints to live, anchor-bound element positions instead.

const host = ref<HTMLElement | null>(null)
let two: Two | null = null

onMounted(() => {
  const W = 460, H = 220
  two = new Two({ width: W, height: H }).appendTo(host.value!)
  const stroke = getComputedStyle(document.documentElement).getPropertyValue('--vp-c-brand-1').trim() || '#646cff'

  // arrow (shaft + head built in)
  makeArrow(two, { x: 40, y: 50 }, { x: 240, y: 50 }, { stroke, linewidth: 3 })
  const t1 = two.makeText('mkArrow', 140, 34); t1.size = 13; t1.fill = stroke

  // rounded elbow path
  makePath(two, { stroke: "lightgray", linewidth: 3, head: 'triangle' })
    .M(40, 110)
    .v(60)
    .h(100)
    .l(-60,-60)
    .h(50)
    .l(60,60)
  makePath(two, { stroke, linewidth: 3, radius: 20, head: 'triangle' })
    .M(40, 110)
    .v(60)
    .h(100)
    .l(-60,-60)
    .h(50)
    .l(60,60)
  const t2 = two.makeText('mkPath (radius)', 130, 196); t2.size = 13; t2.fill = stroke

  // circle
  makeCircle(two, { x: 360, y: 110 }, 48, {
    stroke,
    linewidth: 3,
    fill: 'color-mix(in srgb, ' + stroke + ' 14%, transparent)',
  })
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
