closes #764

## .what

claude now starts **one hook process per event**, and that process runs every enrolled role rule.

`rhx init --hooks` writes two artifacts into each actor's brain dir:

- **`hooks.dispatch.manifest`**: one row per role rule, with its event, matcher, timeout, author, kind, the path it runs, its rhx frame, its args and the command as declared
- **one dispatcher hook per event** in `settings.of.repo.json`: `bash ./node_modules/rhachet/bin/hooks.dispatch.sh <manifest> <Event>`
  - its matcher is the union of its rules' matchers
  - its timeout is the slowest rule's timeout + 5s
  - role hooks leave the settings; hand-added hooks stay

`bin/hooks.dispatch.sh` is one bash process:

- it reads stdin once
- it picks the rows whose matcher fits the tool, by claude's own grammar
- it runs each rule in its own subshell, all at once. a bash rule is sourced; any other rule is exec'd
- it prints the `🪨 run solid skill …` / `💪 init role …` frame that `rhx` used to print, so the rule pays no rhx boot
- it merges the verdicts the way claude merges separate hooks:
  1. every blocker's stderr, then exit 2
  2. else, one json decision on stdout
  3. else, a crash's code
  4. else, every rule's stdout, in manifest order

## .the per-call read

`rhx hooks.dispatch.cost`, one Bash tool call on the shared box, 7 runs per side, measured the same way twice:

| per Bash tool call | before (one process per rule) | after (one dispatcher) |
|---|---|---|
| hook processes claude starts | 10 | **1** |
| processes forked | 213 | **124** (−42%) |
| execs | 217 | **57** (−74%) |
| cpu | 2980 ms | **1260 ms** (−58%) |
| peak rss | 56 MB | **46 MB** |

a live blocker writes byte-equal stderr and exits 2 on both sides.

## .every rule decides as before

- `blackbox/cli/hooks.dispatch.acceptance.test.ts` runs each rule standalone and through the dispatcher, and diffs exit code, stdout and stderr. it covers:
  - a blocker
  - a json decision
  - a crash
  - a timeout
  - a matcher miss
  - `FORCE_COLOR`
  - bash < 5
  - an absent manifest, which fails closed with `✋ ConstraintError` and names `rhx init --hooks`
  - a crash beside a json decision: the decision holds, and the crash reaches the human as the json `systemMessage`
- `init.hooks`, `init.hooks.boot-guard` and `init.focus` now read role rules from the manifest and one dispatcher per event from the settings. their snapshots are unchanged
- the first sync after upgrade seeds the manifest from the role hooks the settings still hold, so its report reads true: a dropped rule reports as deleted, and a kept one as unchanged
- a short-form timeout (`10s`) reads as a duration, so a re-sync is idempotent
- 🔴 the clone isolation invariant (`inventory.of=requirements.case=9`) holds through the dispatcher: the enroll guard reads each manifest a dispatcher names and refuses a rule from an unenrolled role. clamp: `enroll.acceptance` [case2e] [t2]
- each actor's manifest is narrowed to its roles, and its dispatcher names that manifest

## .known differences

- 🟡 a rule now times out at the timeout its role declares (`PT30S` → 30s), killed as a crash (exit 124, no block). before, the claude adapter wrote the timeout in milliseconds where claude reads seconds, so the limit never bit. no live rule nears it; the adapter's unit is a separate defect
- with no repo manifest yet (upgraded, `init --hooks` not re-run), an enrolled actor keeps the per-rule hooks until the next `init --hooks`
- claude's `[command]` label names the dispatcher, not the rule
- when one rule crashes beside stdout claude reads, the dispatcher exits 0 so the decision lands, and carries the crash as the json `systemMessage` (plain SessionStart / UserPromptSubmit context is wrapped as `additionalContext` to carry it)
- a rule whose file reads `$$` runs as `bash <path>`, its own process; a timed-out rule's direct children are killed with it

## .stacked next

#765, an `onTool` regex filter per rule: a manifest row is a record per rule, so the filter is one more column, checked before the rule runs.

## pushback footnote

- `rhx hooks.dispatch`, a node/bun dispatcher that runs rules in-process (#764 § .shape), is overturned on two counts:
  - every live rule is bash (`route.mutate.guard.sh` and all 11 `pretooluse.*.sh`), so a node process would still fork bash per rule
  - a bash dispatcher measures 1260 ms of cpu per Bash call, at or below the ~1200 ms estimated for a node one, with no node boot

🤖 Generated with [Claude Code](https://claude.com/claude-code)
