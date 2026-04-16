// https://vitepress.dev/guide/custom-theme
import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import 'uno.css'
import './style.css'
import EffectsDemo from './EffectsDemo.vue'
import TwoDemo from './TwoDemo.vue'
import TwoDrawDemo from './TwoDrawDemo.vue'
import StepsDemo from './StepsDemo.vue'
import FromToDemo from './FromToDemo.vue'
import MorphDemo from './MorphDemo.vue'
import IntroDemo from './IntroDemo.vue'
import TextEffectsDemo from './TextEffectsDemo.vue'

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      // https://vitepress.dev/guide/extending-default-theme#layout-slots
    })
  },
  enhanceApp({ app }) {
    // Interactive demo components usable in any .md page.
    app.component('EffectsDemo', EffectsDemo)
    app.component('TwoDemo', TwoDemo)
    app.component('TwoDrawDemo', TwoDrawDemo)
    app.component('StepsDemo', StepsDemo)
    app.component('FromToDemo', FromToDemo)
    app.component('MorphDemo', MorphDemo)
    app.component('IntroDemo', IntroDemo)
    app.component('TextEffectsDemo', TextEffectsDemo)
  }
} satisfies Theme
