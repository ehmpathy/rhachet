# seed S1 — replace the local file; always-allow lands in the repo's settings

## .said (2026-10-15)
> why was this not included in the original rollout of settings.of.repo.json ? and yeah, replace
> settings.local.json completely; and yes, settings.of.repo.json is exactly where we want 'always allows'
> to land

## .settled
- a real `settings.local.json` in a brain dir is replaced by the arrow, completely: no merge, no copy
- ~~a session's "always allow" belongs in `settings.of.repo.json`; it is the repo's grant~~ —
  superseded by S4: an "always allow" never reaches the repo's settings unless the launch opts in
  (`CLAUDE_CONFIG_DIR=<repo>/.claude`); see F3
- the question asks why the arrow was absent at first; the answer is the premise that every reader is an
  enrolled clone, which a plain `claude` breaks

## .landed
- `.fulcrums/inventory.of=fulcrums.case=F2-…` verdict
- `.fulcrums/inventory.of=fulcrums.case=F3-…` verdict
