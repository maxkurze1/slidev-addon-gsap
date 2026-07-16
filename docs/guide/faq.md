# FAQ & Troubleshooting

Common issues and how to diagnose them quickly.

## Two.js shapes are invisible (arrows / paths / circles don't paint)

**Symptom.** A shape created with [`mkArrow` / `mkPath` / `mkCircle`](./use-two)
is present in the DOM at the right coordinates — you can find its `<svg>` and
`<g>` in the inspector — but it doesn't paint, or is barely visible. Other slide
content renders fine.

**Cause.** Two.js's SVG renderer writes each group's opacity to an
`opacity="…"` **attribute** on the `<g>` (not to a CSS property). SVG
presentation attributes sit *below* every stylesheet rule in the cascade, so any
host-deck rule that happens to select that attribute overrides it.

The usual culprit is **UnoCSS attributify** (enabled by default in Slidev). If a
literal `opacity="1"` appears anywhere in your deck source — often a Vue prop
like `:opacity="1"`, or a plain `opacity="1"` attribute — attributify reads it as
the `opacity-1` utility and emits a **global** rule:

```css
[opacity~="1"] { opacity: 0.01 }   /* opacity-1 = 1/100 in UnoCSS */
```

That rule then matches every two.js group (they all carry `opacity="1"` at
rest). Because the groups nest (scene → shape → arrowhead), the 1% compounds to
roughly `0.01³ ≈ 0.000001`, and the shape effectively disappears.

**Confirm it.** In devtools, select a two.js `<g>`:

- its `opacity` **attribute** reads `1`, but
- its **computed** `opacity` reads `0.01`.

Then search the page's stylesheets for a rule like `[opacity~="1"]`.

**Fix.** The addon already ships the fix for the most common case — the
`opacity="1"` value — as a global rule (in the addon's `styles/index.css`, which
Slidev auto-loads for any deck that includes the addon):

```css
svg [opacity~="1"] { opacity: 1 }
```

So the resting-state disappearance described above is handled out of the box; you
shouldn't need to do anything for it. The rule targets only elements carrying the
`opacity="1"` attribute, so it clamps the resting value back to `1` without
pinning anything — opacity **animations** still work (mid-tween the attribute is
e.g. `0.5`, which the rule doesn't match, so the animated value applies).

::: tip Prefer to avoid the trigger entirely
The rule only exists because attributify saw a literal `opacity="1"` in your
source. Use the class utility `opacity-100` (which is `opacity: 1`) or an inline
`style="opacity:1"` instead of a bare `opacity="1"` attribute, and attributify
never emits the offending rule.
:::

**Other opacity values.** The shipped rule only covers `opacity="1"`. If a rule
targets a different value — e.g. a literal `opacity="0.5"` in source produces
`[opacity~="0.5"]{opacity:.005}` — you still need to mirror the workaround for
that value deck-side. Add a CSS file and import it from your deck's
`styles/index.ts`:

```css
/* styles/gsap-fix.css */
svg [opacity~="0.5"] { opacity: .5 }
```

```ts
// styles/index.ts
import './gsap-fix.css'
```
