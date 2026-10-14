# F005 — repo-local dev skills are not product journeys

## .the concern

`ergo-acceptance-journey-coverage-rest` (5.3 i003 r008 blocker.1): five new skills under
`.agent/repo=.this/role=any/skills/` — `cli.load.profile`, `test.file.split`, `test.file.unused.imports`,
`test.log.slowest`, `test.snap.compare` — ship with no acceptance test, so
`rule.require.acceptance-journey-coverage` is held to be unmet.

## .the stance — disputed

- **they are not part of the shipped contract.** `package.json` `files` is `/bin`, `/bin/*.bc`, `/dist`,
  `readme.md`. nothing under `.agent/repo=.this/` reaches a consumer; no user of rhachet can run them
- **they are this repo's own maintainer tools**, minted by `rule.always.enskill-the-tactics-you-discover`
  while this branch sped up its test suites: a profile of module loads, a split of a huge test file, a
  slowest-test rank. each guards its own args and exits 2 on misuse, by its header contract
- **the rule's subject is a user journey of the product** — its own example is a new product command
  (`behavior init`). a repo-local helper skill has no user journey to cover
- **precedent**: the other `repo=.this` skills (`perf.test.sh`, `show.bun.deps.sh`,
  `show.claude.task.output.sh`, `aws.whoami.sh`, `claude.cli.probe.sh`) carry no acceptance test either

## .what the council rules

whether repo-local maintainer skills fall under the product's acceptance-journey rule. if they do, that
is a repo-wide policy change for every `repo=.this` skill, its own PR, not this behavior's scope.
