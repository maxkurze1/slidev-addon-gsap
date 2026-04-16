<template>
</template>
<script setup lang="ts">
import { useNav, configs } from '@slidev/client'

import { captureSlide, applyMorph, type SlideMorphOptions, DEFAULT_ATTR } from "./scripts/morph"

// Cross-slide magic-move, wired here once for the whole app (this component is always
// mounted). Pair elements on adjacent slides with the same `data-morph="key"` are morphed
// (during the slide transition)
//
// Options come from config, not code:
//   • deck headmatter `morph:` — defaults for the whole deck
//   • the lower-indexed slide's frontmatter `morph:` — the effect for a single
//     morph. The pair is owned by the slide with the smaller index, so both
//     directions look the same: 3→4 and 4→3 both use slide 3's `morph:`.
//     ---
//     morph: { duration: 1, ease: "power2.inOut" }
//     ---
//     (check SlideMorphOptions for all options)
//
// Disable cross-slide morphing deck-wide from the headmatter with either
// `morph: false` or `morph: { enabled: false }`.
const nav = useNav()

// Raw headmatter value: an options object, `false` to disable, or undefined.
const deckMorphRaw = (): SlideMorphOptions | false | undefined => (configs as any)?.morph

const deckMorph = (): SlideMorphOptions => {
  const m = deckMorphRaw()
  return m && typeof m === "object" ? m : {}
}

const morphEnabled = (): boolean => {
  const m = deckMorphRaw()
  if (m === false) return false
  return (m as SlideMorphOptions | undefined)?.enabled !== false
}

// Slidev uses a dynamic `/:no` route, so the per-slide frontmatter lives on the
// matching entry of the slides array — not on the guard's route.meta. The `:no`
// param is either a slide number or a routeAlias.
type Slide = (typeof nav.slides.value)[number]
const slideForNo = (no: string | undefined): Slide | undefined => {
  if (no == null) return undefined
  return nav.slides.value.find(
    (s) => s.no === Number(no) || (s.meta?.slide?.frontmatter as any)?.routeAlias === no,
  )
}

const slideMorph = (slide: Slide | undefined): SlideMorphOptions =>
  (((slide?.meta?.slide as any)?.frontmatter?.morph) ?? {}) as SlideMorphOptions

// Of two slides, the one with the smaller index — it owns the morph pair, so the
// config is the same in both navigation directions.
const lowerSlide = (a: Slide | undefined, b: Slide | undefined): Slide | undefined =>
  [a, b].filter(Boolean).sort((x, y) => (x!.no ?? 0) - (y!.no ?? 0))[0]

// The pairing attribute must match between capture and apply, so it's deck-wide
// only (per-slide overrides of it are ignored).
const attribute = () => deckMorph().attribute ?? DEFAULT_ATTR

// Before the route changes the leaving slide is still rendered at rest, so this
// is the moment to snapshot the source geometry.
nav.router.beforeEach((_to, from) => {
  if (!morphEnabled()) return true
  captureSlide(from?.params?.no as string | undefined, attribute())
  return true
})

// After the route resolves, morph the entering slide's matching elements.
// Resolve options: deck headmatter < the lower-indexed slide's `morph:`. The
// pair is owned by the slide with the smaller index, so 3→4 and 4→3 morph
// identically (the geometry direction still follows the actual navigation).
nav.router.afterEach((to, from) => {
  if (!morphEnabled()) return
  const owner = lowerSlide(
    slideForNo(from?.params?.no as string | undefined),
    slideForNo(to?.params?.no as string | undefined),
  )
  applyMorph(to?.params?.no as string | undefined, {
    ...deckMorph(),
    ...slideMorph(owner),
    attribute: attribute(),
  })
})
</script>
