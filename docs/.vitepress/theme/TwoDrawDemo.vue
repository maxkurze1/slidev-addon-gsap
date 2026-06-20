<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import Two from 'two.js'
import { gsap } from 'gsap'
import { makePath } from '../../../scripts/TwoJS/Path'
import { makeCircle } from '../../../scripts/TwoJS/Circle'
import { toGsapTargets } from '../../../scripts/TwoJS/util'

// Interactive "draw-on" preview. This builds the SAME shapes a slide would via
// `useTwo`: a routed `mkPath` (rounded elbow + triangle head + riding label) and
// an `mkCircle`. The only thing the real composable adds on top is binding the
// endpoints to live slide elements — here we hand the factories a plain Two
// instance and literal coordinates so it can run inside the docs.

const host = ref<HTMLElement | null>(null)
let two: Two | null = null
let path: any, circle: any

function build() {
  const stroke = getComputedStyle(document.documentElement)
    .getPropertyValue('--vp-c-brand-1').trim() || '#646cff'

  two = new Two({ width: 460, height: 220 }).appendTo(host.value!)

  // Routed elbow path with a rounded corner, an arrow head, and a label that
  // rides along the drawn-on portion — all built-in to the project's Path.
  path = makePath(two, {
    stroke,
    linewidth: 3,
    radius: 16,
    head: 'triangle',
  })
    .M(60, 40)
    .V(60, 150)
    .H(250, 150)

  // Reactive circle that pops in.
  circle = makeCircle(two, { x: 372, y: 96 }, 46, {
    stroke,
    linewidth: 3,
    fill: 'color-mix(in srgb, ' + stroke + ' 14%, transparent)',
  })

  play()
}

function play() {
  if (!gsap || !two) return
  const targets = toGsapTargets([path, circle])
  gsap.killTweensOf(targets)

  // `path.end` reveals the shaft; the head and label follow it automatically.
  path.end = 0
  circle.scale = 0
  two.update()

  gsap.timeline({ onUpdate: () => two!.update() })
    .to(toGsapTargets(path), { end: 1, duration: 1, ease: 'power1.inOut' })
    .to(toGsapTargets(circle), { scale: 1, duration: 0.5, ease: 'back.out(1.7)' }, 0.35)
}

onMounted(build)
onUnmounted(() => {
  gsap?.killTweensOf?.(toGsapTargets([path, circle]))
  two?.pause?.()
  if (host.value) host.value.innerHTML = ''
})
</script>

<template>
  <div class="my-4 flex flex-col items-center gap-2 border border-divider rounded-xl bg-bgsoft p-3">
    <div ref="host" class="two-host" />
    <button
      class="cursor-pointer border border-divider rounded-md bg-bg px-3 py-0.75 text-xs hover:border-brand hover:text-brand"
      @click="play"
    >↻ replay</button>
  </div>
</template>

<style scoped>
.two-host :deep(svg) { max-width: 100%; height: auto; }
</style>
