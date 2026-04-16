<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import Two from 'two.js'
import { gsap } from 'gsap'

// Interactive "draw-on" preview: a routed path + arrowhead + circle animate in,
// the way `tl.from(shape, { end: 0 })` reveals shapes in a deck. Two.js + GSAP
// run directly here; the real useTwo binds the endpoints to slide elements.

const host = ref<HTMLElement | null>(null)
let two: any = null
let path: any, head: any, circle: any, label: any

function build() {
  const stroke = getComputedStyle(document.documentElement)
    .getPropertyValue('--vp-c-brand-1').trim() || '#646cff'

  two = new Two({ width: 460, height: 220 }).appendTo(host.value)

  // routed elbow path (like mkPath().M().V().H())
  path = two.makePath(60, 40, 60, 150, 250, 150, false)
  path.noFill(); path.stroke = stroke; path.linewidth = 3
  path.cap = 'round'; path.join = 'round'; path.curved = false

  // arrowhead at the end
  head = two.makePath(242, 144, 256, 150, 242, 156, true)
  head.fill = stroke; head.noStroke()

  // circle that pops in
  circle = two.makeCircle(372, 96, 46)
  circle.stroke = stroke; circle.linewidth = 3
  circle.fill = 'color-mix(in srgb, ' + stroke + ' 14%, transparent)'

  label = two.makeText('draw-on', 150, 182)
  label.size = 13; label.fill = stroke

  play()
}

function play() {
  if (!gsap || !two) return
  gsap.killTweensOf([path, head, circle, label])
  path.ending = 0
  head.opacity = 0
  circle.scale = 0
  label.opacity = 0
  two.update()
  gsap.timeline({ onUpdate: () => two.update() })
    .to(path, { ending: 1, duration: 1, ease: 'power1.inOut' })
    .to(head, { opacity: 1, duration: 0.2 }, '-=0.05')
    .to(circle, { scale: 1, duration: 0.5, ease: 'back.out(1.7)' }, 0.35)
    .to(label, { opacity: 1, duration: 0.3 }, 0.2)
}

onMounted(build)
onUnmounted(() => {
  gsap?.killTweensOf?.([path, head, circle, label])
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
