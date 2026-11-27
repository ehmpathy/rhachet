# fulcrum F1: two arrows via `.home/`, not one direct arrow

## .the fork
- **A** `keybindings.json -> .home/.claude/keybindings.json -> ~/.claude/keybindings.json` (two arrows)
- **B** `keybindings.json -> ~/.claude/keybindings.json` (one arrow)

## .taken
A. the layout holds one invariant: only `.home/` names this box (#779). `.home/.claude/` then mirrors
`~/.claude/`, and every top-level arrow is relative. B would be the first top-level arrow with an
absolute home path.

## .rework
clean — one constant and one `setArrow` call differ. no caller depends on the shape.

## .confidence
75%. B is fewer arrows, and git ignores both names either way, so the invariant buys legibility,
not safety.

## .where
`setBrainDirSettingsLayout.ts`, `CLAUDE_SETTINGS_FILENAMES` (or a peer constant).

## .verdict
A, confirmed by the director, 2026-11-27, at the 1.vision approval
