# F11 — the byhand skill imports blackbox test infra

## .the fork

`claude.cli.tui.measure` spawns real claude in a pty and reads its screen with the same reads the
shared session's [t4]–[t6] assert on. no skill under `.agent/repo=.this/role=any/skills/` imports
`blackbox/.test/infra/` today; each imports node and published packages only.

| option | what it does | the cost |
|---|---|---|
| A. the skill imports `blackbox/.test/infra/`: the reach, `enrollRealClaudeAndWaitReach`, and the `screen/` reads | one copy of each read; the skill and the smoketests read the screen the same way | a first: a skill now depends on test infra, so a move in that infra can break a skill |
| B. the skill carries its own copy of the reads | no new dependency direction | two copies of the dim and queue reads, which drift; the skill then measures with reads the tests no longer use |

## .taken

A. the skill exists to re-measure what the smoketests assume. if its reads fork from theirs, a
measure stops to say aught about the suites it is meant to inform. the import list is named exactly
in the blueprint, so the dependency is bounded and visible, and the skill's integration test runs
it, so a move that breaks it goes red in the same tier.

## .rework

clean — B is a copy of the named files into the skill's dir.

## .confidence

75%. no precedent either way; the bound is a reviewer's call on dependency direction.

## .where

`3.3.1.blueprint.product.yield.md` — `.codepath tree`, the byhand skill.

## .verdict

best-guessed.
