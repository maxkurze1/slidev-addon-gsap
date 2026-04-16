<script setup lang="ts">
import { ref, shallowRef, watch, onMounted } from 'vue'
import { gsap } from 'gsap'
import TlPlayer from './TlPlayer.vue'
import { attachEffects } from '../../../scripts/effects'

// Mirrors the `useTl` intro snippet — and builds it with the SAME presets the
// library uses (attachEffects), so the running demo can't drift from the code
// shown alongside it. The Slidev `useTl` runtime isn't available in the docs, so
// we attach the presets onto a plain paused GSAP timeline and seek it ourselves.
const step = ref(0)
const stage = ref<HTMLElement | null>(null)
const tl = shallowRef<any>(null)
let seek: any = null

onMounted(() => {
  const root = stage.value!
  const t: any = attachEffects(gsap.timeline({ paused: true }))
  t.addLabel('step-0')
  t.textSplitIn(root.querySelector('.hello'))
  t.addLabel('step-1')
  t.popIn(root.querySelector('.title'))
  t.addLabel('step-2')
  t.slideIn(root.querySelector('.subtitle'), { from: 'left' })
  t.addLabel('step-3')
  t.seek('step-0')
  tl.value = t
})

watch(step, (s) => {
  if (!tl.value) return
  seek?.kill()
  seek = tl.value.tweenTo('step-' + s)
})
</script>

<template>
  <TlPlayer :clicks="3" stack v-model:step="step">
    <template #code><slot /></template>
    <div ref="stage" class="flex flex-col items-center justify-center gap-3 py-10 px-1 text-center">
      <div class="text-4xl font-bold"><span class="hello">Hello</span> <span class="title text-brand inline-block">GSAP</span></div>
      <div class="subtitle text-lg op-70">click-driven animations for Slidev</div>
    </div>
  </TlPlayer>
</template>
