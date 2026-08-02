# Morph (within a slide)

`tl.morph(a, b, opts?)` transforms element **A** so it fits **B**'s position and
size, cross-fading A into B — so A visually *becomes* B. It's a timeline step, so
it reverses on click-back and seeks correctly on refresh.

```ts
tl.step()
  .morph('.a', '.b')                 // A → B's box, cross-fade
  .step()
  .morph('.b', '.c', { duration: 1, ease: 'power2.inOut' })
  .step()
```

Step through it (the box travels between the three slots — the real `morph()`
cross-fades two separate elements, i.e. the dashed boxes only exist for presentation purposes):

<MorphDemo>

```ts
const tl = useTl()

tl.step()
  .morph('.a', '.b')
  .step() // A → B's box
  .to('.b', { y: 50 })
  .step() // move B
  .morph('.b', '.c')
  .step() // B → C's box
```

</MorphDemo>

## How it behaves

- A is transformed onto B's box (position **and** size) using GSAP Flip.
- B is **auto-hidden** until the morph reveals it, so it doesn't show early.
- Both travel the same path, so they overlap and genuinely cross-fade rather than
  B popping into place.
- It's seekable and reversible like any timeline step. If an earlier step already
  moved A, the morph starts from A's *current* (transformed) position, not its
  original layout spot.

## Options

| Option | Default | Meaning |
|--------|---------|---------|
| `duration` | `0.8` | seconds |
| `ease` | `'power1.inOut'` | GSAP ease |
| `scale` | `true` | `true` uses cheap transform scaling (may stretch contents if A and B have different aspect ratios); `false` animates width/height instead (no distortion, reflows children) |
| `keep` | `false` | `true` leaves A in place and visible — B still flies out of A's box, so it reads as A being **duplicated** |

```ts
tl.morph('.a', '.b', { scale: false })   // resize instead of stretch
```

### Keeping the source in place

By default A travels to B's box and fades out, so it *becomes* B. With
`keep: true` A neither moves nor fades — it stays exactly where it is, while B
still emerges from A's box and flies to its own:

```ts
tl.step().morph('.a', '.b', { keep: true })   // A stays, B splits off from it
```

Since both start out overlapping A's spot, it reads as A being duplicated and
the copy moving away. Useful for "one of these spawns another" moments — a list
item picked out into a box, a value flowing onward while its origin stays on
screen.

Nothing is cloned: the thing that travels *is* B, so it looks like B from the
start rather than cross-fading out of A's appearance. If A and B look alike (the
usual case for a duplication) the two are indistinguishable.

## Within-slide vs cross-slide

`tl.morph` is for two elements **on the same slide**, driven by clicks. To morph
an element into one on the **next slide**, see
[Cross-slide Morph](./cross-slide-morph) — that's automatic via `data-morph` and
needs no timeline.

See the [API reference](/api/#tl-morph).
