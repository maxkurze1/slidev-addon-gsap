# Preset Effects

Chainable one-liners with good defaults for the common entrances, exits and
emphasis. Each is a timeline method `effect(target, vars?, position?)` that
returns the timeline, so it chains like `step()`.

Click a preset to preview it:

<EffectsDemo />

:::tip Text Animations
The effects `wipe`, `rise`, and `skew` are particularly well suited for
text animation, while they may look a bit dull on other elements.
:::

```ts
tl.step().popIn('.a')
  .step().slideIn('.b', { from: 'left' })   // from: left | right | top | bottom
  .step().dropIn('.c')
  .step().pulse('.d')
  .step().popOut('.a', { duration: 0.3 })   // override any default
```

## The presets

**Entrances** — animate *in* to the natural state (the target is hidden until its step):

| Preset | Feel |
|--------|------|
| `fadeIn` | opacity in |
| `popIn` | scale 0.6 → 1 with a slight overshoot (`back.out`) |
| `scaleIn` | scale 0 → 1 |
| `blurIn` | unblur + fade |
| `dropIn` | drops from above with a `bounce.out` |
| `slideIn` | slides in from a side — `{ from, distance }` |
| `flyIn` | bigger slide + scale — `{ from, distance }` |
| `wipeIn` | clip-path wipe in, left → right |
| `riseIn` | clip-path fill in, bottom → top |
| `skewIn` | slides in skewed, then straightens |
| `glitchIn` | materializes out of cyberpunk glitch fragments |

**Exits** — animate *away*:

`fadeOut` · `popOut` · `scaleOut` · `blurOut` · `slideOut` (`{ to, distance }`) ·
`flyOut` (`{ to, distance }`) · `wipeOut` (wipe L→R) · `riseOut` (wipe bottom→top) ·
`skewOut` (out to the right) · `glitchOut` (dissolves into glitch fragments). The
clip / skew exits **continue** their entrance's direction rather than reversing it.

**Emphasis** — in place, self-resetting:

`pulse` · `shake` · `wiggle` · `flash` · `bounce` · `glitch` (cyberpunk RGB-split +
scan-line tears)

**Text** — reveal / hide / switch text (powered by GSAP's
[TextPlugin](https://gsap.com/docs/v3/Plugins/TextPlugin/) and
[SplitText](https://gsap.com/docs/v3/Plugins/SplitText/)). Click a preset to
preview it:

<TextEffectsDemo />

Each entrance has a matching exit (`…In` / `…Out`), grouped just like the regular
presets:

_Entrances_ — reveal text in (hidden until their step):

| Preset | Feel |
|--------|------|
| `textTypeIn` | typewriter — types the text in from empty |
| `textSplitIn` | splits into chars/words/lines, then staggers them in — `{ by }` |
| `textGatherIn` | chars converge from scattered positions — `{ by }` |
| `textFlipIn` | chars flip down into place, split-flap style — `{ by }` |
| `textUnderlineIn` | grows an underline under each word — `{ by }` |

_Exits_ — animate text away (each pairs with its `…In`):

`textTypeOut` · `textSplitOut` · `textGatherOut` · `textFlipOut` ·
`textUnderlineOut` (wipe L→R). The underline exit **continues** its entrance's
direction rather than reversing it.

_Emphasis_ — in place:

| Preset | Feel |
|--------|------|
| `textSwap(target, next, …)` | retypes the text into a new string |

```ts
tl.step().textTypeIn('.headline')
  .step().textSplitIn('.tagline', { by: 'words' })   // by: chars | words | lines
  .step().textSwap('.headline', 'New title!')
  .step().textFlipIn('.board')                       // split-flap reveal
  .step().textGatherOut('.scatter')                  // chars scatter away
```

The split presets (`textSplitIn`/`Out`, `textGatherIn`/`Out`, `textFlipIn`/`Out`)
default to `by: 'chars'`; `textUnderlineIn`/`Out` to `by: 'words'`. Splitting into
`'lines'` depends on the element being laid out, so prefer `'chars'` / `'words'`
for text that may animate while its slide is off-screen.

## Overriding defaults

The second argument is merged over the preset's defaults — pass any GSAP tween
var:

```ts
tl.popIn('.a', { duration: 1, ease: 'elastic.out(1, 0.4)' })
tl.slideIn('.b', { from: 'right', distance: 120 })
tl.shake('.c', { duration: 0.8 })
```

A third argument is the GSAP position (e.g. `'<'`, `'+=0.2'`) if you want the
effect to overlap the previous tween instead of running after it.

::: tip Emphasis baseline
`shake` / `wiggle` / `bounce` animate from a `0` baseline for their axis. For an
element that already carries an `x`/`y`/`rotation` offset from a prior tween,
they snap to that baseline first. For in-place elements (the normal case) this is
exactly right.
:::

See the [API reference](/api/#preset-effects) for the full list and signatures.
