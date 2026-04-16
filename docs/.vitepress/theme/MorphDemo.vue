<script setup lang="ts">
import { ref, shallowRef, watch, onMounted } from 'vue'
import TlPlayer from './TlPlayer.vue'
import { gsap } from "gsap";

const step = ref(0)
const stage = ref<HTMLElement | null>(null)
const tl = shallowRef<any>(null)
let seek: any = null

// Three layouts the box morphs through (illustrative — the real morph()
// cross-fades two elements; here one box travels between the slots). The stage
// is full-width (stack layout) so there's room to travel.
const A = { left: 28, top: 28, width: 110, height: 60 }
const B = { left: 140, top: 132, width: 70, height: 70 }
const C = { left: 28, top: 152, width: 60, height: 100 }

onMounted(async () => {
  const box = stage.value!.querySelector('.morpher')
  const elemB = stage.value!.querySelector('.elem-b')
  gsap.set(box, A)
  const t = gsap.timeline({ paused: true })
    .addLabel('step-0')
    .to(box, { ...B, duration: 0.6, ease: 'power2.inOut' })
    .addLabel('step-1')
    .to(elemB, { y: 50, duration: 0.6, ease: 'power2.inOut' })
    .to(box, { ...B, top: B.top+50, duration: 0.6, ease: 'power2.inOut' }, "<")
    .addLabel('step-2')
    .to(box, { ...C, duration: 0.6, ease: 'power2.inOut' })
    .addLabel('step-3')
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
    <div ref="stage" class="relative h-70 w-60">
      <div class="elem-a absolute flex items-center justify-center border border-dashed rounded-2.5 text-2.75 op-50" :style="{ left: A.left + 'px', top: A.top + 'px', width: A.width + 'px', height: A.height + 'px' }">A</div>
      <div class="elem-b absolute flex items-center justify-center border border-dashed rounded-2.5 text-2.75 op-50" :style="{ left: B.left + 'px', top: B.top + 'px', width: B.width + 'px', height: B.height + 'px' }">B</div>
      <div class="elem-c absolute flex items-center justify-center border border-dashed rounded-2.5 text-2.75 op-50" :style="{ left: C.left + 'px', top: C.top + 'px', width: C.width + 'px', height: C.height + 'px' }">C</div>
      <div class="morpher absolute border-2 border-brand rounded-2.5 bg-brand-16"></div>
    </div>
  </TlPlayer>
</template>
