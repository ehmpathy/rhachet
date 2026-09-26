# F7 — the actor's corpus is reached by a symlink, not an import

## .fork

a config dir loads `<configDir>/CLAUDE.md` and no user-scope `AGENTS.md`. how does the actor's
`CLAUDE.md` reach `AGENTS.md`?

| # | route | hops | verdict |
|---|---|---|---|
| **ii** | **`<brainDir>/CLAUDE.md` → `AGENTS.md`, a relative symlink** | zero | ✅ **taken** |
| i′ | `<brainDir>/CLAUDE.md` holds `@AGENTS.md` | one import | ❌ a second authored file |
| i | a repo anchor imports `@~/.claude/AGENTS.md` | three, each fallible | ❌ an external `@` import inside `AGENTS.md` is left out unless approved, and the approval dialog is raised for `CLAUDE.md` imports alone |

## .verdict — RULED by the wisher, 2026-09-23

> *"didnt we symlink CLAUDE.md to AGENTS.md ?"*

## .grounds

- the link carries no content: the one authored file stays `AGENTS.md`, per S2.
- the mod dedupes a `CLAUDE.md` that *"is a link to"* an `AGENTS.md` — `mods/agents-md/README.md`.
- proven empirically by #398's two-scope test, 2026-04-17.
- the link sits inside the actor's brain dir, so it is per-actor by construction. a repo-scope link
  to one actor would be the per-repo grain failure `CLAUDE_CONFIG_DIR` was chosen to close.
- `symlinkFile` (relative, findsert) already exists.

## .where

- blueprint D7, `setBrainDirBoot` scope `user` · vision `.the shape` · criteria usecase.1
- brief `define.brain-dir-repo-vs-actor` · seed S2
