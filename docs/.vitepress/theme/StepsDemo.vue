<script setup lang="ts">
import { ref, shallowRef, watch, onMounted } from 'vue';
import TlPlayer from './TlPlayer.vue';
import { gsap } from "gsap";

const step = ref(0)
const stage = ref<HTMLElement | null>(null)
const tl = shallowRef<any>(null)
let seek: any = null

onMounted(async () => {
  const root = stage.value!
  const t = gsap.timeline({ paused: true })
  t.addLabel('step-0')
  root.querySelectorAll('.demo-card').forEach((c: Element, i: number) => {
    t.from(c, { opacity: 0, y: 16, duration: 0.4 })
    t.addLabel('step-' + (i + 1))
  })
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
  <TlPlayer :clicks="3" v-model:step="step">
    <template #code><slot /></template>
    <div ref="stage" class="flex flex-col gap-2.5 py-8">
      <div class="demo-card w-40 border-2 border-brand rounded-lg bg-brand-10 px-3.5 py-2 text-center text-3.25 font-semibold">First</div>
      <div class="demo-card w-40 border-2 border-brand rounded-lg bg-brand-10 px-3.5 py-2 text-center text-3.25 font-semibold">Second</div>
      <div class="demo-card w-40 border-2 border-brand rounded-lg bg-brand-10 px-3.5 py-2 text-center text-3.25 font-semibold">Third</div>
    </div>
  </TlPlayer>
</template>
