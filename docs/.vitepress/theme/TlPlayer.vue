<script setup lang="ts">
import { computed, ref } from 'vue'

// Presentational shell for a "mini presentation": a build-time-highlighted code
// block (passed via the #code slot, so Shiki runs at compile time — no runtime
// highlighting cost) and a live stage (default slot), with a click bar that
// drives the step. The GSAP timeline lives in the demo component using this.
const props = defineProps<{ clicks?: number; stack?: boolean }>()
const step = defineModel<number>('step', { default: 0 })
const total = computed(() => props.clicks ?? 0)
const dots = computed(() => Array.from({ length: total.value + 1 }, (_, i) => i))

const root = ref<HTMLElement | null>(null)
const focused = ref(false)

function go(to: number) {
  step.value = Math.min(total.value, Math.max(0, to))
}

// Once the player has focus, drive the step like a Slidev deck: ← / → (and the
// usual presenter aliases) move between clicks. We only intercept the keys we
// handle, so Tab still moves focus away normally.
function onKey(e: KeyboardEvent) {
  switch (e.key) {
    case 'ArrowRight':
    case 'ArrowDown':
    case 'PageDown':
    case ' ':
      go(step.value + 1); break
    case 'ArrowLeft':
    case 'ArrowUp':
    case 'PageUp':
      go(step.value - 1); break
    case 'Home':
      go(0); break
    case 'End':
      go(total.value); break
    default:
      return
  }
  e.preventDefault()
}
</script>

<template>
  <div
    ref="root"
    tabindex="0"
    role="group"
    aria-label="Slide preview — focus and use the arrow keys to step"
    class="tlp-root my-5 overflow-hidden border border-divider rounded-xl outline-none transition-shadow"
    :class="focused ? 'tlp-focused' : ''"
    @focusin="focused = true"
    @focusout="focused = false"
    @keydown="onKey"
    @mousedown="root?.focus()"
  >
    <div class="flex items-stretch" :class="stack ? 'flex-col' : 'flex-col sm:flex-row'">
      <div
        class="tlp-code overflow-auto border-divider"
        :class="stack ? 'border-b' : 'border-b sm:border-b-0 sm:border-r'"
      ><slot name="code" /></div>
      <div
        class="relative flex items-center justify-center overflow-hidden bg-bgsoft grow-1"
      ><slot /></div>
    </div>
    <div class="flex h-10 items-stretch border-t border-divider px-3">
      <button
        class="flex w-7 shrink-0 cursor-pointer items-center justify-center text-lg leading-none text-fg2 transition-colors hover:text-brand disabled:pointer-events-none disabled:opacity-30"
        :disabled="step <= 0"
        @click="step = Math.max(0, step - 1)"
      >‹</button>
      <button
        v-for="i in dots"
        :key="i"
        class="flex min-w-7 cursor-pointer items-center justify-center px-1 text-xs font-mono transition-colors"
        :class="step === i ? 'bg-brand-15 text-brand font-semibold' : 'text-fg2 hover:text-brand'"
        @click="step = i"
      >{{ i }}</button>
      <button
        class="flex w-7 shrink-0 cursor-pointer items-center justify-center text-lg leading-none text-fg2 transition-colors hover:text-brand disabled:pointer-events-none disabled:opacity-30"
        :disabled="step >= total"
        @click="step = Math.min(total, step + 1)"
      >›</button>
      <span class="ml-auto flex items-center text-3 op-50">{{ focused ? 'use ← → keys' : 'click to focus, then ← →' }}</span>
    </div>
  </div>
</template>

<style scoped>
/* slotted VitePress code block (build-time highlighted) — flush fill */
.tlp-code :deep(div[class*='language-']) { margin: 0; border-radius: 0; height: 100%; }
.tlp-code :deep(div[class*='language-'] pre) { margin: 0; }

/* Focus cue: a brand ring once the player captures keyboard control. */
.tlp-focused { border-color: var(--vp-c-brand-1); box-shadow: 0 0 0 2px var(--vp-c-brand-soft); }
</style>
