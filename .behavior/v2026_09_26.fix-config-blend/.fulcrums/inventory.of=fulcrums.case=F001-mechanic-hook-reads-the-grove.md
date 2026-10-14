# F001 — the mechanic permission hook reads the grove

## .the concern

`enroll-impl-behavior-intent` (i021 r019 blocker.1): after this behavior, claude's `settings.json` in
every brain dir is the grove (`~/.claude/settings.json`). mechanic's `pretooluse.check-permissions.sh`
still reads its allowlist from `$CLAUDE_DIR/settings.json`, so it sees no repo allows and blocks each
Bash call once.

## .the stance — true, and not this diff's to fix

- the defect lives in `rhachet-roles-ehmpathy`, whose hooks ship read-only; an in-repo `pnpm patch`
  failed to apply (yield §I row 8)
- no fix in this repo keeps the behavior whole. to put the repo's allows back into `settings.json`, or
  to add a `settings.local.json`, is the blend this behavior removes
  (`rule.forbid.brain-dir-layout-divergence`, `define.brain-dir-layout-is-one-for-every-actor`)
- filed 2026-10-07: `ehmpathy/rhachet-roles-ehmpathy#895` (the hooks read `settings.repo.json`, find
  the brain dir from `$CLAUDE_CONFIG_DIR`) and `ehmpathy/rhachet-roles-bhrain#600` (the driver and
  achiever inits)

## .what the council rules

the release order: the mechanic fix ships before or with this rhachet release, or every consumer clone
meets the one-time block. that is a merge-time gate for the human, not a change to this diff.
