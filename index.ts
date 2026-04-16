// Public entry point for the addon's composables.
//
//   import { useTl, usePos, useTwo, useSlide } from 'slidev-addon-gsap'
//
// Lower-level helpers and types remain available under their subpaths
// (e.g. 'slidev-addon-gsap/scripts/util'), which the package's "./*" export
// keeps resolvable.
export { useTl } from './scripts/useTl'
export { usePos, type VecGetter, type VecGetterArray } from './scripts/usePos'
export { useTwo, type TwoConfig } from './scripts/useTwo'
export { useSlide } from './scripts/useSlide'
