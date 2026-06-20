<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import Two from 'two.js'
import { makePath } from '../../../scripts/TwoJS/Path'
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

      makePath(two, { stroke, linewidth: 3, head: tip.name })
        .M(16, H / 2)
        .L(endX, H / 2)
      two.update()
    }
  }
})

onUnmounted(() => {
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
          class="border border-divider rounded-lg bg-bgsoft px-2 pt-1 pb-2 text-center"
        >
          <div :ref="setHost(tip.name)" />
          <div class="flex flex-wrap justify-center gap-1 text-xs">
            <code v-for="n in [tip.name, ...tip.aliases]" :key="n">{{ n }}</code>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<!-- Only the runtime-injected <svg> needs a rule a utility class can't reach. -->
<style scoped>
:deep(svg) { max-width: 100%; height: auto; }
</style>
