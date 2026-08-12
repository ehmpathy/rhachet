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
| commit quota (`rhx git.commit.uses`) | human |
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

## .the test

> "is there a command i could run right now that would move this stone?"

- yes → run it
- no → then, and only then, surface — and name the exact command the human must run

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
