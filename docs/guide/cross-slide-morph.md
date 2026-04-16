# Cross-slide Morph

Give an element on one slide and an element on an adjacent slide the **same
`data-morph="key"`**, and the one on the next slide animates from where the first
was — a magic-move *across the slide transition*.

**No import, no composable, no per-slide setup** — enabling the addon wires this
globally.

```md
---
transition: slide-left
morph: { duration: 0.4 }
# the LEAVING slide controls the effect
# (similar to transitions)
---
<div data-morph="hero" class="w-32 h-20 ...">🚀</div>

---
transition: slide-left
---
<div data-morph="hero" class="w-72 h-48 ...">🚀</div>
```

Navigate forward and the `hero` element flies and resizes from its first spot to
its second; navigate back and it reverses.

## How it works

On navigation the addon snapshots the leaving slide's `[data-morph]` elements
(before the DOM changes), then animates the entering slide's matching elements
from that geometry — concurrently with the slide transition, using GSAP Flip.
It runs in a global router guard mounted by the addon, so it works for **any**
transition (fade, slide, zoom…).

## Configuration (frontmatter)

Options come from config, not code. Precedence: \
built-in defaults < deck headmatter `morph:` < the **lower-indexed** slide's `morph:`.

```md
---
# deck headmatter — defaults for the whole deck
morph:
  ease: power2.inOut
---
```

```md
---
# any slide — the effect for the morph pair it owns (its index and the next)
transition: slide-left
morph: { duration: 1.1 }
---
```

| Option | Default | Notes |
|--------|---------|-------|
| `enabled` | `true` | turn cross-slide morphing on/off — **deck-headmatter only** |
| `duration` | `0.6` | seconds |
| `ease` | `'power1.inOut'` | |
| `fade` | `true` | cross-fade entering/leaving elements during the flip |
| `attribute` | `'data-morph'` | the pairing attribute — **deck-headmatter only** (must match between slides) |

### Disabling it

Cross-slide morphing is on by default. Turn it off for the whole deck from the
headmatter — either with the `morph: false` shorthand or `enabled: false`:

```md
---
# deck headmatter
morph: false
---
```

```md
---
# deck headmatter — disable morphing but keep other defaults around
morph:
  enabled: false
  duration: 1
---
```

`enabled` is **deck-headmatter only**; setting it on an individual slide's
`morph:` has no effect.

## Rules of thumb

- Keys must be **unique within a slide**.
- The effect is owned by the **lower-indexed** slide of the pair, so navigation
  direction doesn't change the options: for slides 3 and 4, both 3→4 and 4→3 use
  slide 3's `morph:`.
- Works alongside [`useTl`](./use-tl) on the same slides without conflict.

See the [API reference](/api/#cross-slide-morph-config).
