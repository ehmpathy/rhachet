# F1 — the dispatcher is bash, not an rhx boot

## .the fork
- (a) `rhx hooks.dispatch --event X` — a node/bun process that loads every rule and runs it in-process (the issue's sketch)
- (b) one bash process that runs each rule in its own subshell, rule paths resolved at `rhx init`

## .taken
(b).

## .why
- every live rule is a `.sh` — the mechanic's `pretooluse.*.sh`, and the bhrain `rhx` rules too
  (`route.mutate.guard.sh` is bash that calls `jq`, `git`, `find`, `grep`). a node process cannot run
  bash in-process; (a) would still fork bash per rule, plus its own boot
- the issue's own floor: one rhx boot = 280 ms cpu, 52 MB; one bash hook with no work = 40–50 ms, 7 MB.
  (b) pays the bash floor once and skips every rhx boot
- (b) leaves room for #765: its `sh -c 'grep -qE … || exit 0; …'` pre-check is the same language

## .rework
clean. the manifest, the sync, the merge rule and the tests hold under either runner; only the
runner swaps.

## .confidence — 85%, why not higher
the issue names `rhx hooks.dispatch` by word; the wisher may want the name kept. a thin
`rhx hooks.dispatch` alias that execs the bash runner keeps the name at the cost of one boot, and
is the fallback if asked.

## .where
`1.vision.yield.md` § the solution; `## pushback footnote`.

## .verdict
open — for the wisher.
