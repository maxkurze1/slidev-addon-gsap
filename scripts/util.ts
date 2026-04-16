
/* ================================ */
/*        export composables        */
/* ================================ */

export * from './useSlide'
export * from './useTl'
export * from './usePos'
export * from './useTwo'

import { pauseTracking, resetTracking } from '@vue/reactivity'
import { toValue } from "vue"

export function untrack(x) {
  try {
    pauseTracking()
    return toValue(x)
  }
  finally {
    resetTracking()
  }
}

export function formatDate(date) {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const day = date.getDate();
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();

  const getOrdinalSuffix = (n) => {
    if (n >= 11 && n <= 13) return n + "th";
    switch (n % 10) {
      case 1: return n + "st";
      case 2: return n + "nd";
      case 3: return n + "rd";
      default: return n + "th";
    }
  };

  return `${month} ${getOrdinalSuffix(day)}, ${year}`;
}

export function formatString(template, values) {
  return template.replace(/{(\w+)}/g, (_, key) => values[key] ?? `{${key}}`);
}


export function makeId(length = 5) {
  const result: string[] = []
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
  const charactersLength = characters.length
  for (let i = 0; i < length; i++)
    result.push(characters.charAt(Math.floor(Math.random() * charactersLength)))
  return result.join('')
}


import { computed, watch, ref, onMounted, onUnmounted} from "vue"
import { useSlideContext } from "@slidev/client";

export function useIsSlideActive() {
  const { $page, $nav } = useSlideContext()
  // Use `$nav.value.currentSlideNo` rather than `useNav().currentSlideNo`
  // to make it work in print/export mode. See https://github.com/slidevjs/slidev/issues/2310.
  return computed(() => $page.value === $nav.value.currentSlideNo)
}

export function useIsMounted() {
  const ismounted = ref<boolean>(false)
  onMounted(() => { ismounted.value = true })
  onUnmounted(() => { ismounted.value = false })
  return ismounted
}

export function onSlideEnter(cb: (to: number, from: number|undefined) => any) {
  const ismounted = useIsMounted()
  const { $page, $nav } = useSlideContext()

  watch(() => [$nav.value.currentSlideNo, ismounted.value], ([to, mounted], from) =>
    $page.value === to && mounted && cb(to, from ? from[0] as number : undefined),
    { immediate: true, flush: 'post' }
  )
}

export function onSlideLeave(cb: (to: number, from: number|undefined) => any) {
  const { $page, $nav } = useSlideContext()
  watch(() => $nav.value.currentSlideNo, (to, from) =>
    $page.value === from && cb(to, from)
  )
}