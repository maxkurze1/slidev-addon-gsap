<script setup lang="ts">
import { ref, shallowRef, watch, onMounted } from 'vue'
import { gsap } from 'gsap'
import TlPlayer from './TlPlayer.vue'

const step = ref(0)
const stage = ref<HTMLElement | null>(null)
const tl = shallowRef<any>(null)
let seek: any = null

onMounted(() => {
  const box = stage.value!.querySelector('.demo-box')
  const t = gsap.timeline({ paused: true })
  t.addLabel('step-0')
  t.from(box, { opacity: 0, y: 24, duration: 0.4 })
  t.addLabel('step-1')
  t.to(box, { x: 130, rotate: 12, duration: 0.5, ease: 'power2.out' })
  t.addLabel('step-2')
  t.to(box, { borderColor: '#34d399', duration: 0.4 })
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
  <TlPlayer :clicks="3" v-model:step="step">
    <template #code><slot /></template>
    <div ref="stage" class="flex pr-35 items-center justify-start py-8">
      <div class="demo-box flex h-21 w-21 items-center justify-center border-2 border-fg2 rounded-3.5 text-3.25 font-semibold">.box</div>
    </div>
  </TlPlayer>
</template>
