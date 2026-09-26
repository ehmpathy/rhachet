# F1 — the transport for the role corpus

## .fork

| option | grain | survives `--resume` | verdict |
|---|---|---|---|
| **a brain dir: `AGENTS.md` → `@boot.md`, reached via `CLAUDE_CONFIG_DIR`** | per actor | ✅ a file, re-read from disk | ✅ **taken** |
| `--append-system-prompt[-file]` | per launch | ❌ system-prompt flags are ignored | ❌ reversed |
| repo `CLAUDE.md` · `.claude/rules/` | per repo | ✅ | ❌ one file for every actor |

## .verdict — RULED (S12, via S2)

the corpus is `boot.md` in a brain dir, reached through `AGENTS.md`. an enrolled clone reads its
actor's brain dir via `CLAUDE_CONFIG_DIR`; that dir also holds `CLAUDE.md` → `AGENTS.md`, a
symlink, since a config dir offers no user-scope `AGENTS.md` (F7).

## .grounds

- S6 took `--append-system-prompt`, and four of its five reasons were false on a citation check:
  `CLAUDE_CONFIG_DIR` is documented, it gives a per-actor grain, the relocated credential store is
  intended (per-actor auth), and `.agent/.actors/` is gitignored — `/docs/en/claude-directory`.
- a layer-2 file is re-read at compaction; a system-prompt flag is recorded once and lost on
  `--resume`.
- `AGENTS.md` is the cross-tool name; `CLAUDE.md` appears only where the cli leaves no other door.

## .where

- blueprint D4, D7 · vision `.how the corpus reaches the model` · brief `define.brain-dir-repo-vs-actor`
- seeds S2 (current), S6 (reversed), S12
