# rule.always.rerun-dark-review-lanes-scoped

## .what

when a bhrain peer-review lane returns `constraint` / `malfunction` because its prompt exceeds the
context window, that is **not** a wall — it is a scope problem in the guard's own configuration.
re-run the same rubric by hand, scoped, before you report the overflow upward.

⚠️ **read the lane's own error first.** the overflow is one cause of a dark lane, and this cure fits
only that one — see `## 🚨 .READ THE ERROR` below.

## 🚨 .reach for `--focus pull` FIRST — it keeps the whole scope

the overflow is a property of **how** the rubric is sent, never of how much the guard asked for.
push mode inlines every file's CONTENTS; pull mode sends the PATHS and lets the brain read what it
needs. so the first cure keeps the guard's scope **exactly** and simply stops inlining it:

```sh
rhx review --rules '<the lane rubric path>' \
           --diffs since-main \
           --focus pull --brain anthropic/claude/code \
           --output '.review/<iter>.<lane>.scoped.md' \
           --goal exhaustive
```

⚠️ **`--focus pull` REQUIRES a BrainRepl** — a tool-use brain. omit `--brain` and it fails at
validation in under a second (see `## 🚨 .READ THE ERROR`). that flag is the whole price.

**measured 2026-09-07, `fix-node-pty-install`, the `5.3.verification` lanes — same rubric, same
`--diffs since-main`, same 308 files:**

| mode | tokens | context |
|---|---|---|
| **push** (what the guard ran) | 1,025.5k | ⛔ **107.6%** — dark |
| **pull** + BrainRepl | 42,867 | ✅ **21.4%** |

⇒ **a fifth of the budget, and it drops no file at all.**

### 🔴 why this beats the narrowed re-run below

a narrowed run buys headroom by **excluding files**, and that exclusion is a judgment nobody can
check afterward — it is the whole reason the two traps below exist (a scope wider than the lane,
and an absence claim the scope could not refute). **`--focus pull` buys the headroom without an
exclusion, so neither trap can arise.**

⚠️ **and a pull-mode reviewer reads the file ON DISK, where a push-mode one reads an inlined
diff.** measured the same day: three push-mode findings quoted the `-` side of the branch's own
diff as though it were live code — a class of false positive that pull mode cannot produce.

⇒ **narrow only when pull mode is unavailable** (no BrainRepl to hand), and when you do, the two
sections below bind.

## .the narrowed fallback, when pull mode is unavailable

the guard runs its reviewers with `--diffs since-main`. the `rhx review` skill is not so bound, so
the identical rubric runs under a narrowed invocation:

```sh
rhx review --rules '<the lane's rubric path>' \
           --diffs since-main \
           --paths-with 'src/<subsystem>/**/*.ts' \
           --paths-wout '**/*.test.ts' \
           --output '.review/<iter>.<lane>.scoped.<slug>.md' \
           --goal exhaustive
```

## 🚨 .KEEP `--diffs since-main`, or the scoped run is WIDER than the lane it replaces

⚠️ **this is the rule's own trap, and it produced a false report on the drive that wrote it.**

`rhx review` resolves its target set as an **intersect**: `diffs ∩ paths`. the guard's own output
says so in words — `diffs: since-main → files: 175 · paths: (none) · joined via intersect → 156`.

so `--paths-with` **narrows a dimension the diff already bounded**; it does not replace the bound.
drop `--diffs` and the paths become the whole scope:

| invocation | what it reviews |
|---|---|
| `--diffs since-main --paths-with 'src/x/**'` | ✅ **the branch's own changes**, under `src/x` |
| `--paths-with 'src/x/**'` alone | 🔴 **every file** under `src/x`, changed or not |

⇒ 🚨 **the word "scoped" makes the second look narrower than the lane. it is wider on the axis that
decides ownership**, so the run reports findings on code the branch never touched — and each reads
as a real defect, because it IS one; it is simply somebody else's.

**measured 2026-09-03, `fix-node-pty-install`, lane r009.** a scoped re-run with no `--diffs`
returned **2 blockers + 3 nitpicks**, every one in `invokeAct.ts` and `invokeKeyrack.ts`. both files
return **empty** from `git diff origin/main...HEAD` — untouched by the branch.

⚠️ **and the attribution check below would NOT have caught it.** that section is written for a
since-main artifact on a branch that trails main; this defect arrives on a lane that **never ran
since-main at all**. the check is per-file and correct, and a driver who trusts the word "scoped"
has no reason to reach for it. ⇒ **the bound belongs in the command, not in a downstream audit.**

## 🚨 .a scoped lane may raise a PRESENCE claim — never an ABSENCE one

⚠️ **the second trap the same drive produced, and `--diffs` does not cure it.** the section
above keeps the run from growing too WIDE. this one keeps its VERDICTS from being read past what
a narrow scope can support.

the two kinds of verdict do not survive a narrowed scope alike:

| the verdict claims | survives a narrowed scope? |
|---|---|
| **presence** — *"this line is a defect"* | ✅ yes. the line is in the scope; the reviewer read it |
| **absence** — *"this ships zero tests / no snapshot / no handler"* | 🔴 **no.** the evidence that would refute it may sit in a dir the scope excluded |

⇒ **a reviewer cannot part *"no such artifact exists"* from *"no such artifact is in my scope."***
it reports the second and phrases it as the first, because from inside the scope they are one
observation.

**measured 2026-09-03, `fix-node-pty-install`, lane r009.** a scoped run over
`--paths-with 'src/contract/cli/**/*.ts'` returned a blocker: *"new/changed error-render paths
shipped with no acceptance tests or snapshots"*, and required four named cases. **all four already
existed** — three glyph-and-frame snapshots in `blackbox/cli/enroll.reach.acceptance.test.ts` and
one in `blackbox/cli/upgrade.acceptance.test.ts`, 400 insertions, added by that same branch.

🔴 **the scope named `src/`, and every acceptance test lives in `blackbox/`.** the reviewer could
not reach its own refutation, and its phrase carried none of that doubt.

### what you must do

before you accept an absence claim from ANY scoped lane:

```sh
# search the WHOLE tree for the artifact it says is absent — never only the reviewed scope
rhx grepsafe --pattern '<the symbol or frame it says is untested>' --path blackbox
rhx globsafe --pattern 'blackbox/**/*.acceptance.test.ts'
```

- **found** → the claim is a scope artifact. refute it, and **name the excluded dir** — the
  reviewer is not defective, its scope was
- **absent** → the claim holds, and now it holds on evidence rather than on a scope

⚠️ **do NOT answer it by a widened re-run.** to widen the paths re-opens the ownership hole the
section above closes. the cure is a targeted grep of the named dir, which costs one command and
keeps the lane's bound intact.

## 🚨 .a PULL lane may raise a false PRESENCE claim — the MIRROR of the trap above

⚠️ **the cure this rule recommends first carries a hazard of its own, and it is the exact inverse of
the one above.** stated here so a driver does not read `--focus pull` as free.

the mechanism is the property that makes pull mode good: **it hands the brain PATHS and lets it read
what it needs.** a brain handed a path list can open **any** file in the tree — even one the
`--diffs` scope never named.

| run mode | what it hands the brain | the hazard |
|---|---|---|
| **push**, narrowed | the file CONTENTS of a subset | a false **absence** claim — it cannot see its own refutation |
| **pull**, unnarrowed | a list of PATHS | a false **presence** claim — it can read past its own scope |

**measured 2026-09-07, `fix-node-pty-install`, lane r003 (`mech-external-contracts`).** a
`--focus pull --diffs since-main` re-run returned **3 blockers**, each a real mock in a real
integration test — and all three under `src/domain.operations/keyrack/`, which the branch never
touched:

```sh
$ git diff --name-only origin/main...HEAD -- src/domain.operations/keyrack/
(no output)
```

⇒ 🚨 **each item was TRUE about the file it named and FALSE about this branch.** that is what makes
it dangerous: the item survives every check but the ownership one, so a driver who repairs it does
correct work on somebody else's code inside a bounded wish.

### what you must do

**before you accept a presence claim from a pull lane, check its citation against the diff:**

```sh
git diff --name-only origin/main...HEAD -- <the flagged path>
```

- **empty** → a scope leak. refute it, cite the empty diff, and record it as a follow-on
  (`rule.forbid.scope-leaks`)
- **listed** → the file is in scope, and the claim is answered on its merits

⚠️ this is the same per-file check `## ⚠️ .then check attribution per file` prescribes, and the
point of this section is **when it fires**: that one is written for a branch that trails main, while
this hazard needs no such branch at all — pull mode alone produces it.

## .why

a dark lane reads exactly like a reviewed one on the ladder — both are terminal, both unlock the
next level — so an overflow that is merely *reported* silently removes a lens from the drive. the
longer it stays dark, the larger the unreviewed surface, and the record shows only that someone
noticed.

on the keyrack `--reach` drive, lanes r008/r009 were dark for ~30 rounds and each round filed the
overflow as an accepted constraint. one scoped run produced real verdicts in ~2 minutes — **0
blockers / 0 nitpicks** on one rubric, **3 items** on the other — which converted a 30-round
process complaint into evidence, and evidence is what a merge decision actually needs.

## .the rule

| the lane returned | you must |
|-------------------|----------|
| context overflow | re-run the rubric scoped, then report the verdict — never the overflow alone |
| absent supply / bad glob | driver-fixable; correct the path and re-arrive (`rule.always.diagnose-reviewer-malfunctions`) |
| 🚨 **a config its own brain cannot execute** | **a scoped re-run cannot help.** name the cure and escalate — see below |
| a real verdict | answer it through the contemplation loop as usual |

treat *"the lane is dark"* as a task, never as a verdict.

## 🚨 .READ THE ERROR before you apply this rule's cure

⚠️ **this rule's cure fits ONE cause, and the darkness of a lane does not tell you which cause it
has.** a lane can also go dark because its configured focus and its configured brain are
incompatible, and no scope on earth repairs that:

```
✋ BadRequestError: focus 'pull' requires a brain with tool use (BrainRepl).
   brain 'fireworks/deepseek/v4-flash' is a BrainAtom without tool use.
   use focus 'push' instead, or choose a BrainRepl.
```

| the lane's mode | what a smaller scope buys |
|---|---|
| **push** (the default) — sends file CONTENTS | ✅ a real cure, though `--focus pull` is the better one |
| **pull** (`--focus pull`) — sends PATHS | ❌ naught. it fails at VALIDATION, before any scope is read |

⇒ 🚨 **a pull-mode lane would fail on a two-file diff.** so to file its darkness as an overflow, or
to answer it with a narrowed re-run, is a cure aimed at the wrong defect — and it will read as
diligence every round it is repeated.

⚠️ **do not read that ❌ as *"pull mode is useless."*** it says a smaller SCOPE cannot repair a
lane already configured for pull with a brain that cannot serve it. **pull mode is itself the
best cure for the OTHER cause** — see `## 🚨 .reach for --focus pull FIRST`. the cure for a
config-dark lane is to supply the missing `--brain`, never to abandon the mode.

### ⚠️ the trap that makes this hard to see

**the overflow message ends with the hint `reduce scope or use --focus pull`.** that HINT names the
very flag whose ERROR is the other cause — so a reader who skims two lanes' output attributes one
lane's suggestion to the other lane's failure, and concludes both are the same defect.

⇒ measured on the `fix-node-pty-install` drive: one driver and one peer reviewer both merged the two
causes, in opposite directions, across 17 rounds. **the fix is mechanical: grep each lane's own
`.given` for its own verbatim error before you classify it.**

### what a config-dark lane owes instead

a scoped re-run is not the deliverable, so the diagnosis is:

1. **the cause** — quote the lane's verbatim error, per lane, never a merged summary
2. **the exact cure** — the error names them: drop `--focus pull` (then this rule's scope cure
   applies), or name a `BrainRepl`
3. **the owner** — 🚨 **split it. the two halves have DIFFERENT owners, and this rule used to
   hand both to a human.** see below

#### 🔴 the VERDICT is yours; only the PERMANENT guard fix is the human's

⚠️ **an earlier form of this section read *"both cures are edits to the guard, and
`route.mutate.guard` seals it"* — and that is false of the half that matters most.** the guard is
sealed; **your own `rhx review` invocation is not.** a config-dark lane names a flag you can pass:

```sh
rhx review --rules '<the lane rubric>' --diffs since-main \
           --focus pull --brain anthropic/claude/code \
           --output '.review/<iter>.<lane>.scoped.md' --goal exhaustive
```

| the half | owner | how |
|---|---|---|
| **get the lane's verdict, this round** | ✅ **the driver** | add `--brain <a BrainRepl>` to your manual re-run |
| **keep the guard from a dark lane next round** | the human | `rhx route.mutate grant allow`, then edit the lane |

⇒ 🚨 **to escalate the first half is to leave a lens off the drive for a round that did not need
it.** `rule.always.spend-own-levers-before-escalation`'s test applies verbatim: *"is there a
command i could run right now that would move this stone?"* — for a config-dark lane there is,
and it is one flag.

**measured 2026-09-07, `fix-node-pty-install`, the five `5.3.verification` lanes.** the prior
iteration filed *"add `--brain anthropic/claude/code` to the pull lanes"* as a wisher item and
carried it across rounds. it was a driver lever the whole time; once passed, all five lanes ran,
and one returned **four real blockers** that had been dark since the stone opened.

## .what `--diffs since-main` actually selects

read this before you diagnose an overflow, because two plausible-sounding theories about it are
both **false**, and each one talks a driver out of the scoped re-run.

from `rhachet-roles-bhrain/dist/domain.operations/review/getAllFileDiffsFromRange.js`:

| step | what it does | line |
|---|---|---|
| pick the main ref | **prefers `origin/main`**, then `origin/master`, then local `main`/`master` | `:29-37` |
| pick the base | `git merge-base <thatRef> HEAD` | `:50-53` |
| select tracked | `git diff <base> --name-status -M` — base vs the **working tree** | `:137` |
| select untracked | **unions `git ls-files --others --exclude-standard`** for `since-main` / `since-commit` | `:167-178` |

⇒ the selected set is **your whole uncommitted working tree**: tracked modifications ∪ untracked
files.

### ⛔ two theories that are wrong

- **"a stale local `main` inflates the diff."** it cannot. `origin/main` is preferred, so the local
  ref is never consulted when a remote one exists. a `git fetch origin main:main` buys **naught**.
- **"untracked files are absent from every `--diffs` scope."** false for `since-main` and
  `since-commit` — both union them explicitly (`:167`). it is true only of `since-staged`.

verify rather than assume, with two commands whose sum you can check against the lane's own count:

```sh
git diff HEAD --name-status -M | wc -l          # tracked modifications
git ls-files --others --exclude-standard | wc -l  # untracked, unioned in
```

on the keyrack `@all` drive these read 89 and 123 — and the lane reported **212**. so the overflow
was **scope**, never staleness, and a rebase would have cured none of it.

## ⚠️ `--paths-with` takes ONE glob, and a list fails SILENTLY

a comma-joined list does not parse. it matches zero files and the run dies with *"combined scope
resolves to zero files"* — or, worse under `--join union`, yields a scope you did not intend:

| invocation | targets |
|---|---|
| `--paths-with 'a/**/*.ts,b/**/*.ts'` | ⛔ `paths: (none)` — the whole string is one failed glob |
| `--paths-with 'src/domain.operations/keyrack/**/*.ts'` | ✅ the keyrack subsystem |

⚠️ **`--paths-with` also clears the `--diffs` default.** pass `--diffs since-main --join intersect`
explicitly, or you review the entire subsystem rather than your change — and every item you get
back will be pre-existing debt you must then attribute by hand.

## ⚠️ .then check attribution per file

an item may cite a file the branch never touched — that is the ordinary failure mode of a
path-scoped run with the intersect dropped. confirm each before you accept or fix it:

```sh
git diff HEAD --stat -- <the flagged file>   # empty  => the file is untouched here
git diff HEAD -- <the flagged file>          # inspect => is the flagged line in a `+` hunk?
```

`HEAD` is the right base to check against, because it **is** the merge-base whenever the branch
carries no commits of its own.

an item whose line sits outside every `+` hunk is **not yours**. record it as a follow-on that
predates the branch (`rule.forbid.scope-leaks`) rather than fix it inside a bounded wish. an item
whose line IS a `+` hunk is yours, and the scoped run just handed you a defect the guard could not
reach.

## .audit the scope before you trust a clean verdict

a lane that received no code has no item it could report, so a vacuous run renders as
`✨ all clear`. read `tokens.expected.md` in the run's log dir — it lists every target by path —
and confirm the subsystem you changed is actually in the tree before you believe a `0 / 0`.

## .enforcement

- an **overflowed** lane reported as a constraint without a scoped re-run attempt = **blocker**
- a dark lane classified without a quote of **its own** verbatim error = **blocker**
- a **config-dark** lane escalated without the exact cure and its owner = **blocker**
- an item from a since-main lane accepted or fixed without a per-file diff check = **blocker**
- 🚨 a scoped re-run that **omits `--diffs since-main`** = **blocker** (it is wider than the lane it
  replaces, and its findings carry no ownership)
- 🚨 an **absence** claim from a scoped lane, accepted or actioned with no whole-tree check of the
  dir its scope excluded = **blocker** (the lane could not see its own refutation)
- 🚨 a **presence** claim from a **pull** lane, accepted or actioned with no per-file diff check =
  **blocker** (pull mode reads past its own scope, so the claim may be true of the file and false
  of the branch)
- a scoped re-run offered as the cure for a config-dark lane = **false positive** (the scope was
  never the limit)
- 🚨 a **config-dark** lane escalated to a human for its VERDICT, where `--brain <BrainRepl>` on a
  manual re-run would have produced one = **blocker** (a driver lever, filed under another owner)
- 🚨 an overflowed lane answered by a **narrowed** re-run where `--focus pull` was available =
  **nitpick** (it drops files, and the exclusion is a judgment no later reader can check)
- a diff-scoped verdict trusted while untracked files sit in the wish's surface = **blocker**

## .see also

- `rule.always.diagnose-reviewer-malfunctions` (bhrain/driver) — the diagnose-before-escalate twin
- `rule.always.spend-own-levers-before-escalation` (bhrain/driver) — why the escalation is a command
- `rule.always.converge-to-terminal` (bhrain/driver) — why a dark lane must not be coasted past
- `rule.forbid.scope-leaks` (bhuild/behaver) — why a pre-branch item stays a follow-on
