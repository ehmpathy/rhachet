# F49 — prove the two `op` lanes against the real binary, or skip them

- **rework** = `clean`
- **status** = 🔴 **RULED 2026-09-25 by the wisher — skip them.** *"anyway, you can skip the op ones"*
- **confidence** = **95%** (the verdict is the wisher's; what is mine is the record of why the
  earlier instrument was wrong)
- **raised at** = `5.3.verification`, review round i005

---

## .the fork, stated fairly

two peer concerns, one subject:

| lane | concern | what it asks |
|---|---|---|
| `mech-external-contracts` | blocker.1 | a tier that reaches the **real** `op` binary, per `rule.require.external-contract-integration-tests` |
| `ergo-acceptance-journey-coverage` | blocker.2 | the same, from the acceptance seat |

both are **correct**. no tier in this repo reaches the real `op`: the acceptance suite drives
`mock-op-cli`, and `vaultAdapter1Password.integration.test.ts` drives the same mock one tier down.

| option | what it does |
|---|---|
| **A — close them** | stand up a real-`op` tier: `op` on the CI runner, plus a service-account credential |
| **B — skip them** | dispute both, record the scope call, leave the gap to a round that owns keyrack |

## .taken, and why

🔴 **taken: B — and the wisher took it, not me.**

the fact that settles it is one this behavior never had the right to weigh: **keyrack is not in
this behavior's scope at all.** *"you dont have anything to do with keyrack bub."*

⇒ the CLEAN half of `rule.always.fix-forward-under-scouts-honor` fails outright.

🔴 **the call site IS in this diff — state it exactly.** the `op` ARGUMENTS are byte-identical to
`main` (`['whoami']`, `op read`, `op item edit`). what changed is the harness around them, and every
change exists to make the mock-driven suites gradeable:

| change | file | why |
|---|---|---|
| `{ env: process.env }` passed explicitly | `vaultAdapter1Password.ts`, `isOpCliInstalled.ts` | a jest sandbox hands the test a copy of `process.env`; without the pass, no suite can steer which `op` resolves |
| `asErrorMessage` in place of `instanceof Error` | `vaultAdapter1Password.ts` | the `child_process` rejection is minted in another realm, so `instanceof` is false and each allowlist rethrew what it was written to swallow |
| rethrow unless the error carries a numeric exit `code` | both files | a spawn fault (`ENOENT`, `EACCES`) is not an absent cli nor a store failure |

none of these changes the contract with 1password — what is sent to `op`, or how its output is
read. they change how rhachet's caller code treats an `op` failure, which is exactly what the
mock-driven tiers grade, and they grade it with no host dependence.

🟡 **so the real-`op` gap predates the branch and is unchanged by it.** a real-binary tier needs a
1password account credential that this repo has never held — a grant only a human can make, for a
subsystem the wisher ruled out of this behavior.

## 🔴 .the lesson — I reached for the wrong INSTRUMENT, twice over

both concerns were first disposed `conceded`, and a `conceded` commits me to the fix. that
commitment then produced a halt (`blocker/5.3.verification.md`, v3) which asked a human to add
`uses: 1password/install-cli-action@v1` to CI.

**the wisher struck it in one sentence:** *"why would you need 1pasword if it was never
nessesasry in the past"*.

| what I did | what the case called for |
|---|---|
| `conceded` ⇒ I owe the fix ⇒ halt for a grant | 🔴 **`disputed` ⇒ out of scope ⇒ shed from the tally** |

⇒ **a `conceded` is not the humble disposition; it is the one that grows scope.** to concede a
concern outside the round's subject is to adopt a debt the round never owed, and the halt that
follows asks a human to pay for it.

🔴 **and it was the THIRD instance of a shape the wisher had already ruled twice** — `F44` (*"keep
them skipped if thats how they are on main"*) and `F45` (*"deferral is fine, you didnt touch
that"*). both rulings say the same claim: **a defect this branch did not introduce is not this
branch's to close.** I had both rulings in hand and still conceded.

⇒ the corrective is a question asked **before** the disposition rather than after the halt:

> **did this branch change the mechanism the concern is about?** no → `disputed`, with this
> fulcrum as `--why`. yes → `conceded`.

## 🔴 .what the `op` install exposed, and why it is kept

the human installed `op` at `/usr/bin/op` mid-round. the suite immediately went **36 passed / 3
failed** — and the three failures were in code **this branch authored**.

`[case6]` constructed its "op-free PATH" as a literal:

```ts
PATH: `${dirname(process.execPath)}:/usr/bin:/bin`
```

🔴 **`/usr/bin` is the exact directory a package manager installs `op` into.** so the case's
precondition was a fact about the **machine**, never about the case —
`rule.require.hermetic-tests` exactly, on a file whose own docblock claimed compliance with it and
asserted *"no `op` lives beside it."*

⇒ repaired by a mirror of the real PATH minus `op`:

```ts
const genOnePathWithoutOp = (): string => {
  const dir = genTempDir({ slug: 'op-absent-path' });
  const seen = new Set<string>(['op']);
  for (const dirReal of (process.env.PATH ?? '').split(':').filter(Boolean)) {
    …symlink every entry except `op`
  }
  return dir;
};
```

a curated tool list was weighed and refused: **a list short by one is the same defect class**, one
tool later.

result: **39 passed, 0 failed, 0 skipped.**

🟡 **this repair is kept and is NOT part of the deferral.** it is a defect in this branch's own
code, found by a verification that was never possible before. the deferral covers the **coverage
gap** (no tier reaches real `op`); it does not cover a hermeticity defect I wrote.

## 🔴 .what the install did to the halt's central measurement

`blocker/5.3.verification.md` v3 rests on *"`which op` resolves to naught on this machine and in
ci."* the first clause is now **false** — `op` is at `/usr/bin/op`.

⇒ the halt is retired rather than answered. its measurement is stale, its ask is struck, and its
subject is out of scope. **all three independently.**

## .rework, and why

**clean.** no part of this behavior's diff depends on the deferral. to reverse it is to add a real
`op` tier in a round that owns keyrack — one new file plus a CI step, and it disturbs no caller
here.

## .confidence, and why it is not 100%

**95%.** the verdict is the wisher's, stated plainly, so it is not in question. what holds it short
is the record I owe: the two `.taken` files still read `[CONCEDED]`, and a reader who opens them
without this fulcrum would find a debt the round no longer carries.

⇒ that is a **documentation** residual rather than a verdict one, and it is closed by the citation
this fulcrum supplies to both dispute records.

## .where

- `.behavior/…/.reviews/peer/…r003._.taken.by_self.mech-external-contracts.md` — blocker.1
- `.behavior/…/.reviews/peer/…r004._.taken.by_self.ergo-acceptance-journey-coverage.md` — blocker.2
- `.behavior/…/blocker/5.3.verification.md` — halt v3, retired
- `blackbox/cli/keyrack.vault.1password.acceptance.test.ts` — the hermeticity repair, kept
- `.dream/2026_09_25.the-op-absent-refusal-exits-2-entirely-on-stdout.md` — the stream defect r004 found
- `F44`, `F45` — the two prior rulings of this same shape
