# seed S4 — the brain config criteria: auth, grove, repo

## .said (2026-10-15)
> wheres the criteria for brain config

> the criteria is (1) auth pulls from global, (2) machine global = symlinked via settings.of.grove.json,
> (3) repo = sourced at settings.of.repo.json, symlinked from either settings.local.json or settings.json

> is that clear ?

> that way grove vs repo settings are clearly demarked

> further, when an actor tries to change the settings, it should not impact global

> further, when an actor does allow all, it should probably not impact repo either. repo impact should
> be explicit optin. should be rare and unnecessary

## .settled
- an actor's "always allow" never reaches the repo's settings either. a repo change is an explicit
  opt-in, rare and unnecessary. this supersedes S1's ask that always-allows land in `settings.of.repo.json`
- auth comes from the machine-global login, never a per-brain-dir copy
- the machine-global settings reach a brain dir only via the `settings.of.grove.json` arrow
- the repo's settings live in `settings.of.repo.json`, reached by an arrow from a claude settings name
- grove and repo settings each have exactly one source file, so the two never blur
- an actor's settings change never reaches the machine-global settings

## .landed
- `2.1.criteria.blackbox.yield.md` (this route)
- `.agent/repo=.this/role=any/briefs/define.invariant.brain-config-grove-vs-repo.md`
