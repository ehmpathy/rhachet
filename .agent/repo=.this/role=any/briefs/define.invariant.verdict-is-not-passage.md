# define.invariant.verdict-is-not-passage

## .what

a reviewer's **verdict** (what it concluded) and its **passage** (how its process exited) are two
orthogonal axes. neither may be read off the other.

## .the invariant

```
verdict  ∈ { 0 blockers / N nitpicks, M blockers / N nitpicks }   ← what the reviewer CONCLUDED
passage  ∈ { approved, constraint, malfunction, exhausted }        ← how its PROCESS exited

verdict ⊥ passage
```

⇒ a `constraint` passage does **not** entail a defect report, and an `approved` passage does
**not** entail a clean verdict. the only source of a verdict is the reviewer's own tallied
`N blockers / N nitpicks` (`contract.reviewer-output`).

## .why

**a reviewer can conclude cleanly and still exit non-zero.** the two most common shapes:

| shape | verdict | passage | the truth |
|---|---|---|---|
| the reviewer never ran (context overflow, bad glob, absent supply) | **none** | `constraint` | unknown — read it as neither clean nor as a defect |
| the reviewer ran, concluded clean, then its harness exited badly | **0/0** | `constraint` | **converged** — the exit is an artifact |

to collapse the two axes into one produces a false report in **both** directions:

- read `constraint` as "a blocker was raised" ⇒ you report the ladder unconverged when it converged
- read `constraint` as "clean, carry on" ⇒ you claim an approval that was never earned
  (`rule.forbid.failhide`)

## .the incident (2026-09-06, `v2026_08_25.fix-keyrack-all-skips-manifest`)

at stone `5.3.verification`, iteration i025, reviewer `r11 enroll-verif-test-intent` was stamped:

```
r11: enroll-verif-test-intent (l3, 9/16)
    ├─ constraint ✋
```

on that stamp alone I reported *"l3 has not converged."* the reviewer's own artifact said:

```
└─ tallied
   ├─ 0 blockers
   └─ 0 nitpicks
```

> ## Verdict: no test-intent violations found — clean
> … No blocker to raise here.

it had independently re-derived a deleted test's coverage and confirmed it migrated with stricter
assertions. its stderr held the actual cause of the non-zero exit — the enroll clone's
`no stdin data received in 3s`. **l3 was converged 3-of-3 with zero blockers, and I reported the
opposite from a passage glyph.**

a second witness sat in the same stamp: the judge

```
j1: ... --allow-blockers 0 --allow-nitpicks 7
    └─ finished 0.5s ✓
```

**passed.** a judge reads verdicts, so it had already answered the question I got wrong.

## .how to apply

when a reviewer shows a non-`approved` passage, **open its artifact before you characterize it**:

1. read the `tallied` block — is there an `N blockers / N nitpicks` pair at all?
   - **absent** ⇒ a true `💥 malfunction`; the verdict is unknown and blocks
     (`contract.reviewer-output`)
   - **present** ⇒ that pair IS the verdict, whatever the passage says
2. read stderr for the exit's own cause — a harness artifact is not a review defect
3. check the judge; it reads verdicts, so it is the faster authoritative answer on blockers

## .the general form

this instantiates `rule.forbid.mechanism-inferred-from-outcome`: the passage is an **outcome**,
the verdict a **conclusion**, and one may not be inferred from the other. it is also why
`rule.always.diagnose-reviewer-malfunctions` demands a diagnosis rather than an escalation — that
diagnosis is exactly the artifact read above.

## .enforcement

- a claim that a reviewer raised a defect, sourced from its passage rather than its tally = **blocker**
- a claim that a level converged or failed to converge, without a read of each reviewer's tally = **blocker**
- a non-`approved` passage treated as clean without a present `N blockers / N nitpicks` pair =
  **blocker** (`rule.forbid.failhide`)

## .see also

- `contract.reviewer-output` (bhrain) — the tally that IS the verdict
- `rule.forbid.mechanism-inferred-from-outcome` — the general law this instantiates
- `rule.always.diagnose-reviewer-malfunctions` (bhrain) — diagnose the exit, never relay it
- `term=inert._.choice._.md` — the kin failure, where an exit code agrees and the effect is absent
