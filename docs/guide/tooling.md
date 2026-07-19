# Editor & AI Setup

## VSCode extensions

The repo recommends two extensions (`.vscode/extensions.json`):

- **Slidev** (`antfu.slidev`) — deck preview, slide navigation, folding.
- **MDC** (`Nuxt.mdc`) — syntax highlighting for MDC `::block` / `:inline` /
  `{attr}` markup, including the markdown *inside* `::div … ::` slots.

## AI assistant skill

The package ships an Agent Skill (`skills/slidev-addon-gsap/SKILL.md`) so
assistants like Claude Code know the full API when helping you author decks.
Load it into your deck repo:

```bash
# easiest — the skills CLI, straight from the repo
npx skills add maxkurze1/slidev-addon-gsap

# …or copy (snapshot) from the installed package
mkdir -p .claude/skills
cp -r node_modules/slidev-addon-gsap/skills/slidev-addon-gsap .claude/skills/

# …or symlink (stays in sync with the addon)
ln -s ../../node_modules/slidev-addon-gsap/skills/slidev-addon-gsap .claude/skills/slidev-addon-gsap

# …or globally for all projects
cp -r node_modules/slidev-addon-gsap/skills/slidev-addon-gsap ~/.claude/skills/
```

Claude Code auto-discovers `.claude/skills/`, so the assistant picks it up
whenever you work on a deck using the addon.
