# seed S3 — pass the always-allow through, or refuse it; the grove matters more

## .said (2026-10-15)
> yeah, do a real acceptance test to prove the behavior. and why would the grove link store absolute
> path instead of $HOME ?

> yeah and see if we can find a way to make claude pass through into the settings.of.repo.json for
> 'always allow' scenarios. if not, we can just refuse those; the global of grove settings is probbly
> more important though.

## .settled
- the write path is proven by a real claude, not inferred from source
- ~~a "don't ask again" grant either reaches `settings.of.repo.json` or is refused; no third home~~
- ~~the grove (the box-wide `~/.claude/settings.json`) outranks the repo as a home for a grant~~
- both superseded by S4: a plain session's grant lands in no file — neither the repo nor the grove —
  and holds for the session only; the repo takes one through the `CLAUDE_CONFIG_DIR` opt-in alone
  (`appendix/research.claude-local-settings-write-path.md`, F3)

## .landed
- `blackbox/cli/claude.local-settings-write.realbrain.acceptance.test.ts`
- `appendix/research.claude-local-settings-write-path.md` (measured section)
