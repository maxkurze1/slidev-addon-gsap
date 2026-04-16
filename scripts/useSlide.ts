import { ref, onMounted, getCurrentInstance } from "vue"
export function useSlide() {
  const slide = ref<HTMLElement | null>(null)

  onMounted(() => {
    slide.value = getCurrentInstance()?.proxy?.$el
  })

  return slide
}