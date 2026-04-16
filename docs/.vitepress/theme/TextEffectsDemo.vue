<script setup lang="ts">
import { ref } from 'vue'
import { gsap } from 'gsap'
import { attachEffects } from '../../../scripts/effects'

// Live playground for the text presets. It calls the SAME `attachEffects` the
// library uses (scripts/effects.ts) on a throwaway timeline, so there's a single
// source of truth — no effect is re-implemented here just to demo it.

const TEXT = 'Reveal this text'

const box = ref<HTMLElement | null>(null)
const active = ref<string>('')
let current: any = null

const groups = [
  { title: 'Entrances', names: ['textTypeIn', 'textSplitIn', 'textGatherIn', 'textFlipIn', 'textUnderlineIn'] },
  { title: 'Exits', names: ['textTypeOut', 'textSplitOut', 'textGatherOut', 'textFlipOut', 'textUnderlineOut'] },
  { title: 'Emphasis', names: ['textSwap'] },
]

function play(name: string) {
  const el = box.value
  if (!el) return
  active.value = name
  current?.kill()
  // Restore clean markup (drops any SplitText wrappers from a prior run) + styles.
  el.innerHTML = TEXT
  gsap.set(el, { clearProps: 'all' })
  // A fresh auto-playing timeline with the real preset methods attached.
  current = attachEffects(gsap.timeline()) as any
  if (name === 'textSwap') current.textSwap(el, 'Swapped text!')
  else current[name](el)
}
</script>

<template>
  <div class="my-4 overflow-hidden border border-divider rounded-xl">
    <div class="flex h-45 items-center justify-center overflow-hidden bg-bgsoft">
      <div ref="box" class="text-2xl font-bold text-brand">Reveal this text</div>
    </div>
    <div class="flex flex-col gap-2 p-3">
      <div v-for="g in groups" :key="g.title" class="flex items-center gap-1.5">
        <div class="min-w-18 text-xs op-60">{{ g.title }}</div>
        <!-- <span class="w-21 text-xs op-60">{{ g.title }}</span> -->
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
