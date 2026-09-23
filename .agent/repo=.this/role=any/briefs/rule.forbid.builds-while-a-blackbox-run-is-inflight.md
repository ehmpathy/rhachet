# rule.forbid.builds-while-a-blackbox-run-is-inflight

> **never run `npm run build` while a blackbox suite is in flight. the build DELETES `dist/`, and
> every blackbox test loads from `dist/`.**

the two facts, both checkable in `package.json`:

- `build:clean:tsc` is `rm -rf dist/`, and `build:clean:bun` is `rm -f ./bin/*.bc`
- `jest.acceptance.env.ts` loads `dist/contract/sdk.*.js`, and `invokeRhachetCliBinary` runs `bin/run`

⇒ so a build opens with a delete of the two artifacts an in-flight run depends on. the run does not
pause and does not retry — every suite that had yet to load its module dies where it stands.

## .why it is worth a rule — the failure BLAMES THE WRONG PARTY

the damage is loud, and its **attribution** is silent:

```
● Test suite failed to run
  ENOENT: no such file or directory, open '.../dist/contract/sdk.keyrack.js'
```

that message names an absent file. it does not name *the build that deleted it*, so a reader's first
read is *"the build is broken"* or *"the harness is flaky"* — both wrong, and both expensive to chase.

🔴 **and the summary UNDERSTATES it.** measured 2026-09-16 on this repo: a rebuild ~45 minutes into a
thorough acceptance run produced

```
suites: 134 files
tests: 2739 passed, 13 failed, 8 skipped
```

~60 suites never loaded. their tests are **in no count at all** — not passed, not failed, not
skipped. against the same suite's clean baseline of 3588, **849 tests silently vanished**, and the
headline reports `13 failed`.

⇒ a reader who trusts that line investigates 13 assertions and never learns that 45% of the suite did
not run. ⚠️ **the run reports a verdict it cannot justify** — so a contaminated run is worse than a
crashed one, because it looks like a result.

| when… | then… |
|---|---|
| a blackbox run is in flight | 🔴 **run no build.** wait, or kill the run deliberately |
| you must pick up a source change mid-run | kill the run first, build, re-run. a contaminated run proves less than no run |
| a run reports many `Test suite failed to run` with `ENOENT .../dist/...` | 🔴 the strongest cue. check whether *you* rebuilt, before you doubt the harness |
| a run's passed-count is far below its own baseline | the tell. a regression moves the **failed** count; a contamination moves the **passed** count |
| 🔴 a run is **faster** than its baseline and you read that as a win | the two classes have OPPOSITE time signatures — see below. read the **count**, never the clock |
| you would cite a run whose `dist/` was rebuilt under it | do not. mark it contaminated and re-run clean |
| you want the suite's progress while you work | there is no safe concurrent build. the two are exclusive |

## 🔴 .the two classes have OPPOSITE time signatures, so TIME alone diagnoses neither

the instinct is *"a contaminated run runs long."* half wrong, and the wrong half is the loud one:

| the contamination | what it does to the clock | why |
|---|---|---|
| a **build** — `dist/` deleted | 🔴 **faster, or unchanged** | a suite that fails to LOAD costs ~0s. the deleted work is time *not* spent |
| a **state mutation** — enroll, unlock, prune | **slower** | the suites still run; they contend for the daemon, the roster, the cpu |

🟡 **measured on this repo, 2026-09-16 — the two runs are 4 seconds apart:**

| run | wall time | passed |
|---|---|---|
| contaminated by a build | **2737s** | 2739 |
| clean | **2741s** | **3588** |

⇒ **849 more tests for 4 more seconds.** the build contamination bought back, in suites that never
loaded, almost exactly what its own failures cost. so a reader who compared wall times would have
found the two runs indistinguishable, and a reader who compared *passed counts* found a 24% hole.

🔴 **and it poisons the baseline.** cite `2737s` as "the suite's own time" and every later run looks
bloated — a clean 3120s reads as 1.14x when against the true `2741s` it is 1.14x for a suite that
actually ran. **a contaminated run must not become the number the next run is judged by.**

⇒ so the time heuristic holds only for the **state** class, and only against a baseline known clean.
the count heuristic holds for both.

## 🔴 .the build is one INSTANCE. the class is CONCURRENT MUTATION OF SHARED STATE

a build is the loudest member of a wider family, and the family is what actually binds:

> **while a blackbox run is in flight, mutate not one thing the run reads.**

`dist/` is one such thing. it is not the only one, and the others fail **quietly** where the build
fails with an `ENOENT`:

| the shared state | what mutates it | which suites read it |
|---|---|---|
| `dist/` · `bin/*.bc` | `npm run build` | every blackbox suite |
| the **keyrack daemon + unlocked creds** | `rhx keyrack unlock` · **`rhx enroll`** (it unlocks for the clone) | `keyrack.daemon.*`, `keyrack.*.journey`, anything the runner unlocks for |
| the **clone roster + their sockets** | `rhx enroll` · `rhx clone say` · `rhx clone prune` | `clone.*.acceptance`, `enroll.*.acceptance` |
| the machine's **CPU** | any long command | every suite with a timeout — a 2x slowdown turns a pass into a flake |

⇒ **a live dogfood is a mutation.** it feels like an observation, which is exactly why it slips past:
`rhx clone say` reads, but `rhx enroll` **writes** — it spawns a daemon and unlocks credentials, and
both are state a keyrack or clone suite asserts against.

🟡 **measured 2026-09-16, and the second contamination of this same verification.** the keyrack chunk
(64 files) passed **2850s** — longer than the whole 134-file suite's own 2737s — while I ran an
`rhx enroll` and five `clone say` calls against the same machine. whatever that chunk reports is
**suspect and owes a clean re-run**, exactly as the built-under run did.

⇒ the tell differs from the build's, and is worse: a build announces itself with `ENOENT`. this
announces itself only as **time** — a run that takes 2x its own baseline, with no failure that names
a cause.

## .the discipline the hook already encodes

`pretooluse.forbid-test-background` refuses `run_in_background` on `git.repo.test`, with a stated
reason about token cost. ⇒ it has a **second** effect the reason does not name: a foreground run
occupies the shell, so no build can be typed beside it. **the token argument is the stated why; the
exclusion is the one that carries the weight.**

🟡 so the hazard reaches you only when a run lands in the background by another route — an
auto-background on a long timeout, or a run started before the guard was in place.

## 🟡 .the test fires at COMMAND time. a daemon you left running keeps charging

the rule as stated asks *"should I run this command now?"* — and a process spawned an hour ago is
past that question. it keeps spending cpu for the whole run regardless.

⇒ so a **second** question is owed, and it fires **before** you start a run rather than during it:

> **what did I leave running?**

a dogfood clone is the sharp case here: each `rhx enroll` leaves a real brain-cli holding a pty, and
it does not exit when the say that used it returns. four dogfood clones are four resident processes.

🟡 **stated as a hypothesis, not a measurement.** observed 2026-09-16: a clean full acceptance run
reached **1.22x** its own clean baseline with four dogfood clones resident and no concurrent command
of any kind. that is consistent with the contention, and it is **not proof** — the run was not
repeated with the clones pruned, so the confound stands.

⇒ the cheap discipline that needs no measurement: **`rhx clone prune` before a long run, never during
one.** during, it mutates the roster a `clone.*.acceptance` suite reads.

## 🔴 .the SECOND acceptance run IS a build — so two test commands destroy each other

every cue above names a build you **type**. there is one you do not, and it is the one a driver
reaches for most:

```json
"test:acceptance": "npm run build && jest -c ./jest.acceptance.config.ts …"
```

⇒ **`rhx git.repo.test --what acceptance` opens with `npm run build`, which opens with `rm -rf
dist/`.** so a second acceptance command — however narrowly scoped — deletes `dist/` out from under
the first one, and **neither command looks like a build to the driver who typed it.**

🔴 that is why the rule as stated can be obeyed to the letter and still tripped: its test asks *"would
this command MUTATE state it reads?"*, and a **test** command reads as an observation. it is not one.

**measured 2026-09-18, on this repo.** a full acceptance tier was in flight (~1800s) when a scoped
one-file acceptance run was started. both died, and each died with a DIFFERENT symptom, so neither
named the cause:

| the run | what it reported | why |
|---|---|---|
| the scoped run (the second one) | `Cannot find module '@src/domain.objects/ActorInmem'` | its own `rm -rf dist/` had run, and `tsc` had emitted only part of the tree — so `dist/` held pre-alias output |
| the full tier (the first one) | 🔴 **no failure at all — inflight, past 1800s** | every `bin/run` spawn crashed against the deleted `dist/`, and a crashed spawn is not a jest failure |

⚠️ **the `@src/…` message is the sharp one, because it accuses the build.** an unresolved `@src`
alias looks exactly like a broken `tsc-alias` step, and the honest read is the opposite: the build is
fine, and a **half-finished** one was observed mid-flight. a driver who chases the alias config
chases a defect that does not exist.

🟡 **and the first run's silence is worse than the second's error.** it reported no failure, so a
30-minute wall clock reads as a slow suite rather than a dead one — the `inflight` ticks keep
landing, which is the one signal a reader trusts.

| when… | then… |
|---|---|
| an acceptance run is in flight and you want a scoped one | 🔴 **the strongest cue. it is a build.** kill the first, or wait |
| you would run two `git.repo.test --what acceptance` commands at once | forbidden — the second's clean deletes the first's `dist/` |
| a run reports an unresolved `@src/…` alias | check for a concurrent acceptance run BEFORE you doubt `tsc-alias` |
| a run sits `inflight` far past its baseline with no failure | a crashed spawn is not a jest failure. check whether a build ran under it |
| you scope an acceptance run to one file to make it cheap | the scope narrows **jest**, never the build. the `rm -rf` is full-size regardless |

⇒ **the cure is the same one this rule already prescribes** — the two are exclusive — and what this
section adds is that the second party to the collision need not have typed `build` at all.

## .the test

> **is a blackbox run in flight — and would this command MUTATE state it reads?**

🔴 **and `--what acceptance` answers YES**, because it builds. the question is not *"is this a
build?"* but *"does this command RUN one?"*

no run in flight → act freely · a run is in flight, and the command only reads → act · **a run is in
flight and the command writes — a build, an enroll, an unlock, a prune — → it waits.**

⇒ the narrow form of the same test, for the build alone: *does any process read `dist/` or
`bin/*.bc` right now?*

blocker: 🔴 **two `git.repo.test --what acceptance` commands in flight at once** (the second's implicit
`npm run build` deletes the first's `dist/`) · an unresolved `@src/…` alias diagnosed as a `tsc-alias`
defect with no check for a concurrent acceptance run · a build run while a blackbox suite is in flight · a **state-mutating command** — `rhx
enroll`, `rhx keyrack unlock`, `rhx clone prune` — run while a suite that reads that state is in
flight · a contaminated run cited as evidence for any claim · an `ENOENT .../dist/...` suite failure
diagnosed as a harness defect with no check of whether a build ran under it · a run that took ~2x its
own baseline, cited without a clean re-run.
false positive: a build run while only **unit** tests are in flight — they import from `src/` through
`ts-jest` and never read `dist/` · a read-only command (`git status`, a `Read`, a `Grep`) run beside
any suite.

⇒ see also: `howto.test-local-rhachet` (the `link:.` self-link that makes `dist/` the live code) ·
`rule.require.trust-but-verify` · `rule.forbid.mechanism-inferred-from-outcome` (the `ENOENT` is an
outcome; the build is the mechanism, and only a check of the clock connects them).
