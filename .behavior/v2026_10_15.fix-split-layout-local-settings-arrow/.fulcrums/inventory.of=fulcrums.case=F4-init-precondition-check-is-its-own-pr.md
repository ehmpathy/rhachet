# F4 — the loud check for "rhx init is mandatory" ships as its own pr, not in this one

## .the fork
- A: build the check here — a line in every actor's `AGENTS.md`, or a SessionStart hook in every repo
- B: a dedicated pr, with a title and a bounded diff, queued now; this pr names the precondition
  (`define.invariant.rendered-boot-stays-out-of-git`) and ships no check

## .taken = B, and why
the precondition is not new here. `boot.md` and the `.agent/repo=*` role links were already absent in
a checkout before its first install; this pr writes the fact down. each check A could ship is a
contract change for every consumer repo, at a surface that is the wisher's to rule:

| candidate | what it changes beyond this route |
|---|---|
| a SessionStart hook rhachet writes into every repo's settings | a framework-authored hook — `rule.forbid.framework-owned-hooks` forbids it outright |
| a line beside `@boot.md` in `AGENTS.md` | the door file of every actor, in every consumer repo: each one's next `rhx upgrade` reports an AGENTS.md reset, and every session pays the line's tokens |

so it clears the one bar `rule.forbid.deferrals-short-of-a-dedicated-pr` names — a contract change
that ripples across every consumer and warrants its own review — and per that rule it is a planned pr,
never a `.dream/`.

## .the measurement, taken now
static, from this repo's tracked `settings.of.repo.json`: of its 23 hook commands, 8 call
`./node_modules/.bin/*`, 1 imports a `node_modules` package via `node -e`, and 14 run a
`.agent/repo=*` file — every one absent before the first install. so an uninstalled checkout's plain
`claude` meets hook errors that name an absent path, never the cause (`rhx init`). loud, but
misnamed. the screen a human sees is the dedicated pr's first stone.

## .rework = clean
this pr adds no check, so the dedicated pr starts from the same surface it would have met.

## .confidence = 80%, low because
a reviewer graded the absence a blocker under the repo's own new rule, and a wisher may prefer the
`AGENTS.md` line now, at the cost of the one-time reset report in every repo.

## .where
`define.invariant.rendered-boot-stays-out-of-git` · the radio task "feat(init): a checkout before its
first install says rhx init is owed"

## .verdict
owed — for the wisher at the close.
