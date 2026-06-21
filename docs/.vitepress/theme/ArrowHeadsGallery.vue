<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import Two from 'two.js'
import { makePath, type Path } from '../../../scripts/TwoJS/Path'
import { HEAD_GROUPS, HEAD_ALIASES } from '../../../scripts/TwoJS/heads'

// Live gallery of every arrow tip, drawn with the project's real `makePath`
// pipeline (`head: '<name>'`) — exactly what a slide would produce. Grouped by
// the same categories as the TikZ arrows.meta library it ports.

const groups = HEAD_GROUPS.map((g) => ({
  title: g.title,
  tips: g.specs.map((s) => ({
    name: s.name,
    aliases: HEAD_ALIASES[s.name] ?? [],
  })),
}))

const hosts = ref<Record<string, HTMLElement | null>>({})
const setHost = (name: string) => (el: any) => { hosts.value[name] = el as HTMLElement | null }
const instances: Two[] = []

// Per-card live handles, so the hover animation can move the target element and
// re-route the arrow to follow it. `off` is the current horizontal offset that
// gsap tweens; both the rectangle and the arrow endpoint are derived from it.
type Card = {
  two: Two
  target: any
  path: Path
  baseCenterX: number
  baseEndX: number
  y: number
  off: number
}
const cards = new Map<string, Card>()

// How far the target element slides left on hover.
const SHIFT = 50

function applyOffset(c: Card) {
  c.target.position.x = c.baseCenterX + c.off
  // The arrow's endpoint is its last command; re-point it at the element's
  // (now-moved) left edge and let the path's _update re-route + re-seat the head.
  c.path._ops[c.path._ops.length - 1].args = [c.baseEndX + c.off, c.y]
  c.two.update()
}

// Name of the card that was just copied, for the transient "Copied!" hint.
const copied = ref<string | null>(null)
let copiedTimer: ReturnType<typeof setTimeout> | undefined

async function copyName(name: string) {
  try {
    await navigator.clipboard.writeText(name)
  } catch {
    return // clipboard blocked (e.g. insecure context) — skip the hint
  }
  copied.value = name
  clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => { copied.value = null }, 600)
}

function hover(name: string, enter: boolean) {
  const c = cards.get(name)
  if (!c) return
  gsap.to(c, {
    off: enter ? -SHIFT : 0,
    duration: 0.45,
    ease: enter ? 'power3.out' : 'power2.inOut',
    overwrite: true,
    onUpdate: () => applyOffset(c),
  })
}

onMounted(() => {
  const stroke = getComputedStyle(document.documentElement)
    .getPropertyValue('--vp-c-brand-1').trim() || '#646cff'

  for (const g of groups) {
    for (const tip of g.tips) {
      const host = hosts.value[tip.name]
      if (!host) continue
      const W = 168, H = 60
      const endX = W - 34 // where the arrow connects — the target element's edge
      const two = new Two({ width: W, height: H }).appendTo(host)
      instances.push(two)

      // A stand-in for the element the arrow points at: just a dashed outline,
      // with its left edge at the arrow's endpoint so the connection is visible.
      const target = two.makeRectangle(endX + 13, H / 2, 26, 26)
      target.noFill()
      target.stroke = '#9ca3af'
      target.linewidth = 1
      target.dashes = [3, 3]

      const path = makePath(two, { stroke, linewidth: 3, head: tip.name })
        .M(16, H / 2)
        .L(endX, H / 2)
      two.update()

      cards.set(tip.name, {
        two, target, path,
        baseCenterX: endX + 13,
        baseEndX: endX,
        y: H / 2,
        off: 0,
      })
    }
  }
})

onUnmounted(() => {
  clearTimeout(copiedTimer)
  for (const c of cards.values()) gsap.killTweensOf(c)
  cards.clear()
  for (const two of instances) {
    two.pause?.()
    const el = (two as any).renderer?.domElement as HTMLElement | undefined
    el?.remove()
  }
})
</script>

<template>
  <div class="my-4">
    <template v-for="g in groups" :key="g.title">
      <div class="mt-5 mb-2 text-[0.8rem] font-semibold uppercase tracking-wider text-fg2">
        {{ g.title }}
      </div>
      <div class="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2">
        <div
          v-for="tip in g.tips"
          :key="tip.name"
          class="relative border border-divider rounded-lg bg-bgsoft px-2 pt-1 pb-2 text-center cursor-pointer transition-colors hover:border-brand"
          @mouseenter="hover(tip.name, true)"
          @mouseleave="hover(tip.name, false)"
          @click="copyName(tip.name)"
        >
          <div :ref="setHost(tip.name)" />
          <div class="flex flex-wrap justify-center gap-1 text-xs">
            <code v-for="n in [tip.name, ...tip.aliases]" :key="n">{{ n }}</code>
          </div>
          <span
            v-if="copied === tip.name"
            class="absolute inset-0 flex items-center justify-center rounded-lg bg-bgsoft/90 text-xs font-semibold text-brand"
          >
            Copied!
          </span>
        </div>
      </div>
    </template>
  </div>
</template>

<!-- Only the runtime-injected <svg> needs a rule a utility class can't reach. -->
<style scoped>
:deep(svg) { max-width: 100%; height: auto; }
</style>
