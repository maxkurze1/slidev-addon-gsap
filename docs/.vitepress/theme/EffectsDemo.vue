<script setup lang="ts">
import { ref } from 'vue'
import { gsap } from 'gsap'
import { attachEffects } from '../../../scripts/effects'

// Live playground for the preset effects. It calls the SAME `attachEffects` the
// library uses (scripts/effects.ts) on a throwaway timeline, so there's a single
// source of truth — no effect is re-implemented here just to demo it.

const box = ref<HTMLElement | null>(null)
const active = ref<string>('')
let current: any = null

const groups = [
  { title: 'Entrances', names: ['fadeIn', 'popIn', 'scaleIn', 'blurIn', 'dropIn', 'slideIn', 'flyIn', 'wipeIn', 'riseIn', 'skewIn', 'glitchIn'] },
  { title: 'Exits', names: ['fadeOut', 'popOut', 'scaleOut', 'blurOut', 'slideOut', 'flyOut', 'wipeOut', 'riseOut', 'skewOut', 'glitchOut'] },
  { title: 'Emphasis', names: ['pulse', 'shake', 'wiggle', 'flash', 'bounce', 'glitch'] },
]

function play(name: string) {
  const el = box.value
  if (!el) return
  active.value = name
  current?.kill()
  // Drop any overlay slices a prior `glitch` left behind, then reset styles.
  document.querySelectorAll('[data-glitch-layer]').forEach((n) => n.remove())
  gsap.set(el, { clearProps: 'all' })
  // A fresh auto-playing timeline with the real preset methods attached.
  current = attachEffects(gsap.timeline()) as any
  current[name](el)
}
</script>

<template>
  <div class="my-4 overflow-hidden border border-divider rounded-xl">
    <div class="flex h-45 items-center justify-center bg-bgsoft">
      <div ref="box" class="flex h-17.5 w-30 items-center justify-center border-2 border-brand rounded-xl bg-brand-12 text-3.25 font-semibold">{{ active || 'box' }}</div>
    </div>
    <div class="flex flex-col gap-2 p-3">
      <div v-for="g in groups" :key="g.title" class="flex items-baseline gap-1.5">
        <div class="min-w-18 text-xs op-60">{{ g.title }}</div>
        <div class="flex flex-wrap items-center gap-1.5 grow-1">
          <button
            v-for="name in g.names"
            :key="name"
            class="cursor-pointer border rounded-md bg-bg px-2.25 py-0.75 text-xs font-mono"
            :class="active === name ? 'border-brand text-brand' : 'border-divider hover:border-brand'"
            @click="play(name)"
          >{{ name }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
