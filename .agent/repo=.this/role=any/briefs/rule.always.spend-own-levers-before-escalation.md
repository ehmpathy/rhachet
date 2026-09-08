# rule.always.spend-own-levers-before-escalation

## .what

when a route stone halts, the guard prints every remedy that *could* unblock it. that list names
**what would work**, never **who owns each lever**. before you surface anything to a human, sort
the list by owner and spend every lever that is yours.

the split, for the driver role:

| lever | owner |
|-------|-------|
| `rhx route.guard.budget --for review --add N --stone <stone>` | **driver** |
| a diagnosed reviewer malfunction (absent credential, bad glob, stale supply) | **driver** |
| `--as approved` | human |
| `--as overruled` | human |
| commit quota (`rhx git.commit.uses`) | 🔴 **nobody, until the drive closes** — see below |
| release authorization | human |

## .why

escalation to a human is the last resort, and their attention is the scarcest resource in the
loop. to hand a human a top-up you could have run yourself spends that resource for no gain —
and worse, it reads as a wall when it was a step.

**the specific trap:** the guard renders its two remedies as adjacent branches —

```
├─ increase budget
│  └─ rhx route.guard.budget --for review --add N --stone <stone>
└─ approve as-is
   └─ rhx route.stone.set --stone <stone> --as approved
```

adjacency invites the read *"two human remedies"*. only the second is. the first is the driver's,
and it is the one that lets the road continue.

## .the rule

| the stone halted on... | you must... |
|------------------------|-------------|
| peer reviewer budget exhausted | **add budget yourself**, re-arrive, drive on |
| a reviewer malfunction | **diagnose it** (`rule.always.diagnose-reviewer-malfunctions`); fix what is yours |
| a genuine human-only gate | surface it — with the exact command, never a bare symptom |

a halt is **a diagnosis to make, not a message to relay**. read the block reason, sort it by
owner, act on your half.

## .budget is not scarce, and to treat it as scarce is the error

`--add N` extends **every** reviewer on the stone at once (3 → 5 across all 11, in one call).
budget exists so the contemplation loop can run to convergence — to hoard it is to end the
conversation early, which is the exact coast `rule.always.converge-to-terminal` forbids.

⚠️ **and exhaustion is often not what it looks like.** a reviewer spends a round to *raise* a
blocker and has none left to *confirm* the fix — so a reviewer whose findings you fixed in that
same round shows `exhausted 🌙` with its blockers still listed, though every one is closed. that
is precisely the case more budget settles, and precisely the case a human cannot settle at all.

## 🚨 .a FAILED attempt measures one moment — it does not classify the lever

the test below is answered at an instant. so a lever you ran once, and which failed, is **not
thereby a human lever** — you have measured a moment, and a classification is a claim about every
moment after it.

⚠️ **and the trap is that the failure often NAMES a human.** measured 2026-09-03: a
`rhx keyrack unlock` returned

```
aws sso login timed out: human did not respond to browser sso prompt
```

which reads as proof of human ownership — the error says so in words. it was not. the credential
daemon simply was not up; a retry authenticated with no browser prompt at all. that error had been
carried up as a human gate for several ticks, and it was on the pre-approved list the whole time.

⇒ 🔴 **an error's stated cause is a claim like any other.** a confident error can be wrong about its
own cause — that is the whole subject of the wish this was measured on. to escalate on one read of
one error message is to trust a stranger's diagnosis over a retry that costs seconds.

| the failure looked like | before you classify it human, ask |
|---|---|
| a credential / auth wall | is the agent or daemon that serves it **up**? is this the FIRST attempt, or a warm one? |
| a permission block | is the block **global**, or per-tree? a global one is human; a per-tree one may be mine |
| a timeout | is the cause the subject, or the transport? a retry parts them for free |
| an error that names a human in its own text | ⚠️ **that sentence is evidence, never a verdict.** it is a guess by the party that failed |

**the cheap discipline:** where the lever is idempotent and costs seconds, **retry once before you
classify**. one retry is far cheaper than a human's attention, and cheaper still than the several
ticks a wrong classification survives once it is written into an escalation.

⚠️ this compounds badly, because an escalation is **inherited**. once *"this is human"* is written
into a blocker file, every later round reads it as settled and re-relays it. the check has to happen
at the moment of the claim; nobody downstream re-derives it.

## 🚨 .a third owner exists — WITHHELD BY DESIGN — and it is not "human"

sort-by-owner has **three** buckets, never two. the third is the one that produces an unbounded loop,
because it looks exactly like the human bucket and is not:

| bucket | what a surfaced ask does |
|---|---|
| **mine** | i run it. the road continues |
| **a human's** | they can grant it now. the ask is legitimate |
| 🔴 **withheld by design** | **no one can grant it before passage.** the ask is a request to break the framework's own sequence |

**the measured case — the commit quota.** the wisher stated it outright (2026-09-03):

> *"stage ability is only granted at the very end"*
> *"so it will never be allowed before then"*

⇒ so `rhx git.commit.uses allow --global` is **not** a lever that happens to be down. the grant
follows a closed drive, so throughout the whole review phase of **every** behavior there is no moment
at which it could be up. i surfaced it as a human remedy for **three consecutive rounds** (i047, i048,
i049) on `v2026_08_25.fix-node-pty-install`, and it could not have been honored on any of them.

⚠️ **and the item it was offered for was self-cancelling.** the blocker was *"the git index would
re-commit two fixed defects"* — but `git.commit.set` stages **from the worktree** at commit time, so
the exact act feared is the act that overwrites the state feared. a correct worktree needs no lever.

**the test that parts bucket 3 from bucket 2:**

> **"could a human grant this RIGHT NOW, at this point in the drive — or only after it closes?"**

- now → a real escalation. name the exact command
- only after → 🔴 **not an escalation at all.** it is a property of the sequence. say so, and drive on

| the tell | what it means |
|---|---|
| the same ask survives three rounds unchanged | 🔴 no act within the drive can change it. that is bucket 3's signature |
| the grant would arrive after the work it gates | circular. a blocker's contract is *clear this before passage* |
| the condition is overwritten by the act that would trigger it | self-cancelling. it was never a condition |

## .the test

> "is there a command i could run right now that would move this stone?"

- yes → run it
- **it failed once** → 🔴 not an answer yet. retry it, or name why a retry cannot change the result
- no, and a retry would not change it → then, and only then, surface — and name the exact command

## .see also

- `rule.always.converge-to-terminal` — work every reviewer to terminal before a human is pulled
- `rule.always.diagnose-reviewer-malfunctions` — the same sort-by-owner move, for a broken reviewer
- `rule.always.drive-autonomously` — relay the route's gates; never invent your own

## .citations

> "review budget is YOUR lever — `rhx route.guard.budget --for review --add N` — never a human
> gate. only `--as approved`, `--as overruled`, the commit quota, and release auth belong to the
> human."
>
> — the wisher, 2026-08-04, on the `v2026_07_31.feat-keyrack-unlock-scope` drive, after i had
> surfaced a budget halt as though it were a human decision
