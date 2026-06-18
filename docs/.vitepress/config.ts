import { defineConfig } from 'vitepress'
import UnoCSS from 'unocss/vite'
import { presetWind3 } from 'unocss'

// The docs are deployed under a `/docs` sub-path of the Pages site (see
// .github/workflows/deploy.yml). CI passes the full base (e.g.
// `/slidev-addon-gsap/docs/`) via DOCS_BASE; locally it falls back to root so
// `pnpm docs:dev` just works.
const base = process.env.DOCS_BASE || '/'
// The Slidev deck is published as a sibling `/demo`. CI passes its full URL via
// DEMO_URL (an absolute http URL, so VitePress treats it as external and does
// NOT prefix it with the docs `base`). Locally it falls back to `/demo/`.
const demoLink = process.env.DEMO_URL || '/demo/'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base,
  title: 'slidev-addon-gsap',
  description: 'GSAP × Two.js animations and illustrations for Slidev',

  // Atomic CSS (UnoCSS, Tailwind-compatible preset) for the interactive demo
  // components. Theme colors are mapped to VitePress's own CSS variables so the
  // utilities follow light/dark automatically.
  vite: {
    plugins: [
      UnoCSS({
        presets: [presetWind3()],
        // presetWind3 (unlike Tailwind) ships no global border reset, so a bare
        // `border` utility sets only width — border-style stays `none` and the
        // border is invisible. Re-add Tailwind's reset, scoped to the doc
        // content so VitePress's own chrome is untouched.
        preflights: [
          {
            getCSS: () =>
              '.vp-doc :where(*,::before,::after){border-width:0;border-style:solid;border-color:currentColor}',
          },
        ],
        theme: {
          colors: {
            brand: 'var(--vp-c-brand-1)',
            divider: 'var(--vp-c-divider)',
            bg: 'var(--vp-c-bg)',
            bgsoft: 'var(--vp-c-bg-soft)',
            bgalt: 'var(--vp-c-bg-alt)',
            fg2: 'var(--vp-c-text-2)',
          },
        },
        // brand color tinted with transparency, e.g. `bg-brand-12`
        rules: [
          [/^bg-brand-(\d+)$/, ([, n]) => ({
            'background-color': `color-mix(in srgb, var(--vp-c-brand-1) ${n}%, transparent)`,
          })],
        ],
      }),
    ],
  },

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/' },
      { text: 'Examples', link: '/guide/examples' },
      // Absolute path (not a VitePress route) so it isn't prefixed with the
      // docs `base` — the deck lives outside the docs site, under `/demo`.
      { text: 'Demo', link: demoLink, target: '_blank' },
    ],

    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'What?', link: '/guide/introduction' },
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Features Overview', link: '/guide/features' },
        ],
      },
      {
        text: 'Composables',
        items: [
          { text: 'useTl — Timelines', link: '/guide/use-tl' },
          { text: 'usePos — Anchors', link: '/guide/use-pos' },
          { text: 'useTwo — Drawing', link: '/guide/use-two' },
          { text: 'useSlide', link: '/guide/use-slide' },
        ],
      },
      {
        text: 'Animations',
        items: [
          { text: 'Preset Effects', link: '/guide/effects' },
          { text: 'Morph (within slide)', link: '/guide/morph' },
          { text: 'Cross-slide Morph', link: '/guide/cross-slide-morph' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'API Reference', link: '/api/' },
          { text: 'Examples', link: '/guide/examples' },
          { text: 'Editor & AI Setup', link: '/guide/tooling' },
        ],
      },
    ],

    search: { provider: 'local' },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/maxkurze1/slidev-addon-gsap' },
    ],
  },
})
