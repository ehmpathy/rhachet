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
  2. else, the json decision of highest rank on stdout (deny > ask > allow; the first on a tie)
  3. else, a crash's code
  4. else, every rule's stdout, in manifest order

## .see what ran

- the sync prints what moved:

  ```
  🪝 hook dispatchers set
     └─ anthropic/claude/code
        ├─ 12 rules → 4 dispatchers, one per event
        │  ├─ SessionStart = 3 rules
        │  ├─ PreToolUse = 7 rules
        │  ├─ UserPromptSubmit = 1 rule
        │  └─ Stop = 1 rule
        ├─ 16 role hooks moved from the settings into the manifest
        └─ manifest = .claude/hooks.dispatch.manifest
  ```

- each manifest row has a label line above it: `# <event> · <matcher> · <N>s · <author> · <command>`
- `RHACHET_HOOKS_DISPATCH_TRACE=<file>` appends one line per rule (skipped and why, or ran with its exit) and one verdict line per event, each opened by `hooks.dispatch[<pid>]` so seats that share one file stay apart. it never touches what claude reads
- the readme has a section: "role hooks — one dispatcher per event"

## .the per-call read

`rhx hooks.dispatch.cost`, one Bash tool call on the shared box, 7 runs per side, measured the same way twice:

| per Bash tool call | before (one process per rule) | after (one dispatcher) |
|---|---|---|
| hook processes claude starts | 10 | **1** |
| processes forked | 213 | **124** (−42%) |
| execs | 217 | **57** (−74%) |
| cpu | 2980 ms | **1260 ms** (−58%) |
| peak rss of the largest one process (not a sum) | 56 MB | 46 MB |

a live blocker writes byte-equal stderr and exits 2 on both sides. the wish's 207 → 52 MB summed
every process's rss; this read reports the largest single process, so the two do not compare.

a re-read on 2026-11-18, after the last fixes, with the same 11 rules on both sides (the before
shape built from the manifest, one hook per rule), at load ~59, 3 runs per side: forks 247 → 130,
execs 268 → 56, cpu 4080 → 2110 ms (−48%), peak rss of one process 65 → 65 MB. the largest process
on both sides is one rule's own `node`, so the rss row shows no change, not a win; the cut is in
processes and cpu.

cpu falls by 58%, short of the 69% the vision estimated (2185 → ~680 ms at load ~48); this read's
before was taken at load ~34. of the 57 execs, the dispatcher's own watchdog is one `sleep`; the
rest is the rules' own work.

a Write call with a 1 MB payload (`--payload-bytes 1048576`): cpu 6080 → 4800 ms. the dispatcher reads
the payload with `cat` in one pass; bash's `read` takes a pipe one byte per syscall, 930 → 200 ms at
1 MB (`rhx hooks.dispatch.read.probe`).

on a real bash 3.2 (`rhx hooks.dispatch.bash32.probe`, `bash:3.2` 3.2.57 against the host's 5.2.21),
an allow, a block, an ask and a hang exit 0/2/0/124 on both and print byte-equal output.

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
  - a Stop an rhx skill holds, a UserPromptSubmit with two context rules, and a PermissionRequest `behavior` decision
  - a rule whose EXIT or TERM trap turns the watchdog's kill into exit 2: it reads as timed out (124, no block), as claude reads its own timeout
  - one seat session end to end (vision case=9): boot, all-allow, many-block, ask json, prompt, held stop
- `init.hooks`, `init.hooks.boot-guard` and `init.focus` now read role rules from the manifest and one dispatcher per event from the settings. their snapshots change only by the new `🪝 hook dispatchers set` row
- the first sync after upgrade seeds the manifest from the role hooks the settings still hold, so its report reads true: a dropped rule reports as deleted, and a kept one as unchanged
- a short-form timeout (`10s`) reads as a duration, so a re-sync is idempotent
- 🔴 the clone isolation invariant (`inventory.of=requirements.case=9`) holds through the dispatcher: the enroll guard reads each manifest a dispatcher names and refuses a rule from an unenrolled role. clamp: `enroll.acceptance` [case2e] [t2]
- each actor's manifest is narrowed to its roles, and its dispatcher names that manifest; a re-sync drops a role the actor lacks (`setActorSettingsDerived` [case3])
- the manifest is tracked beside `settings.of.repo.json` (the brain dir `.gitignore` allows it), and this repo's own actor dir ships its manifest, `.gitignore` and settings in one commit; enroll refuses settings that name a dispatcher whose manifest is absent (`enroll` [case2e] [t4])
- the first sync after upgrade moves the role hooks into the manifest in an explicit migrate step; the dispatchers land before the role hooks leave, so a seat that spawns mid-sync is never unguarded
- the manifest's ten fields, its version and the kill grace are one TS const each, held equal to the bash file by a parity test; a row with an extra field is refused
- the manifest lands whole before the settings name the dispatcher (`syncRoleHooksIntoTarget` integration test, red with the order swapped)
- each sync derives every rule's file and kind again, so a moved skill or a changed shebang reaches its row
- the dispatcher fails closed on a manifest version or row it cannot read, and names a silent crash or an invalid regex
- a matcher that bash would read otherwise than claude (`\d`, `(?…)`, a lazy quantifier) is refused at sync
- the payload and output files are private (`umask 077`), named by pid plus a random part, created under noclobber so a planted symlink is never written through, and removed on any exit, a kill included; if three names cannot be created, the dispatcher refuses rather than run a rule unread
- a role hook whose fields would break a manifest row, or a repo path the shell would split in the dispatcher command, is refused at sync, with the fix named
- many fast calls at once never read a false refusal: the watchdog stops on a signal the dispatcher does not trap, and only the dispatcher removes its per-call files (`[t27]`, 240 parallel calls, red with the fix reverted)
- a merge conflict left in the tracked manifest fails closed, with the fix named (`[t21b]`)
- role hooks leave the settings through one predicate in every writer, so a faulted sync never leaves a clone that runs a rule twice
- core's event placement and timeout unit equal the published `rhachet-brains-anthropic` adapter's (parity test)

## .known differences

- a rule times out at the same declared limit as before (`PT30S` → 30s, as the published claude adapter writes it), but the dispatcher's watchdog kills it, not claude: it reads as a crash (exit 124 plus a `hook rule timed out` notice, no block)
- with no repo manifest yet (upgraded, `init --hooks` not re-run), an enrolled actor keeps the per-rule hooks until the next `init --hooks`. once the settings name a dispatcher, an absent manifest is refused, never passed through
- claude's `[command]` label names the dispatcher, not the rule; a blocked call ends with one `🪝 hooks.dispatch <Event> blocked by <rule path>` line per blocker, so the human still sees which guard refused
- when one rule crashes beside stdout claude reads, the dispatcher exits 0 so the decision lands, and carries the crash as the json `systemMessage` (plain SessionStart / UserPromptSubmit context is wrapped as `additionalContext` to carry it); where the rule's json already holds a `systemMessage`, that message is kept and the crash goes to stderr only (no live rule emits one)
- when a rule crashes beside a block, the dispatcher exits 2 and writes the crash's stderr after the blockers', so a guard that did not finish is never hidden
- a rule whose file reads `$$` runs as `bash <path>`, its own process. the scan reads the rule's own file only: a lib it sources sees the dispatcher's pid
- the dispatcher's own refusal (absent manifest, unknown version, bad row, per-call files) exits 2, except on UserPromptSubmit (1, so the human's prompt survives) and on a Stop claude already held once (1, so a seat that cannot run the fix can still stop)
- where one rule prints json and another plain context, the json is kept whole and the plain text dropped (pinned by a test); no live rule does this
- a timed-out rule gets TERM, then KILL two seconds later, by its own pid; a child it forked runs on, as under claude (no `pkill`, per `rule.forbid.unscoped-process-kills`). so a rule that traps TERM cannot hold the dispatcher past claude's timeout; bash's job notice for the kill never reaches stderr (`[t12]`)

## .stacked next

#765, an `onTool` regex filter per rule: a manifest row is a record per rule, so the filter is one more column, checked before the rule runs.

## pushback footnote

- a node/bun `rhx hooks.dispatch` that runs rules in-process — #764 § .shape — overturned by the read that every live rule is bash (`route.mutate.guard.sh` and all 11 `pretooluse.*.sh`, so node would still fork bash per rule) and that the bash dispatcher measures 1260 ms cpu per Bash call, within ~5% of the ~1200 ms estimated for node

🤖 Generated with [Claude Code](https://claude.com/claude-code)
