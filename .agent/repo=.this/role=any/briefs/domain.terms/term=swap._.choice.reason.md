# domain.term.choice.reason: swap

## .etymology

why `swap`: it names the ACT precisely — one item is exchanged for another **at a seam that already
exists**. an sdk that reads an endpoint from config was built to have its far end exchanged; a swap
uses that seam rather than cuts a new one.

the rejected words each carry a claim the concept does not make:

| rejected | why |
|---|---|
| `stand-in` | names the OBJECT (the local server) rather than the ARRANGEMENT. and it is the word most often reached for while `mock` is meant, which is exactly the ambiguity this term exists to end |
| `emulator` | claims fidelity to the real service's BEHAVIOR. a swap makes no such claim — it may return canned bytes; what it preserves is the CLIENT path, never the server's semantics |
| `local backend` | two words, and `backend` is already overloaded (a vault backend, a storage backend) |
| `test double` | the xunit umbrella term, which spans mock / stub / fake / spy / dummy. its whole purpose is to blur the members, and the distinction is the entire value here |

⚠️ `emulator` is the sharpest near-miss, and this repo already carries it in a filename —
`getOneKeyrackAwsParam.emulator.integration.test.ts`. that file is correctly named: it clamps the
SEAM, and it is the one place the fidelity claim is actually tested. so `emulator` is forbidden as a
name for the ARRANGEMENT, and left alone where it names that specific suite.

## .disputes

### dispute: mock — raised 2026-09-05 — status: RESOLVED (distinct concepts, never synonyms)

- raised.by = `mech-test-scope-purity` peer lane (r8), i018
- claim = a local http server that replaces AWS SSM in an acceptance test is a mock, and
  `rule.forbid.acceptance.mocks` forbids it. the lane graded it a blocker, and gave the same grade
  to a suite that stubs the `gh` binary — both filed as one violation.
- counter = the two substitutions are not the same act. with the SSM endpoint override, the real
  `@aws-sdk/client-ssm` serializes, SigV4-signs and POSTs — a real parameter-shape change or a
  reworded IAM refusal is caught by the four suites one tier down that dial real SSM
  (`.gap.bound`). with the `gh` stub, no github client code executes at all, and no tier offsets
  it. the first preserves the client stack; the second deletes it.
- resolution = **keep both words, for both concepts.** `swap` names the service-side exchange;
  `mock` keeps its sense (the client / tool / module replaced). the lane **dropped the aws.params
  blocker** on this evidence and held the github.secrets one — which is the correct outcome under
  the distinction, and the strongest evidence that the boundary is real rather than convenient.

⚠️ the resolution is notable for what it does NOT do: it does not widen `mock` to cover both, and it
does not widen `swap` to excuse the github case. **a term that excused both would have been a term
invented to win an argument.**

## .evidence

### the discovery move — dimensional decomposition

two orthogonal axes surfaced the cell that needed a name:

| | **client code runs** | **client code deleted** |
|---|---|---|
| **remote replaced** | ← the unnamed cell → `swap` | `mock` |
| **remote real** | a real integration test | (incoherent) |

the top-left cell had no word, so every writer reached for `mock` or `stand-in` — and a reviewer who
read either word applied the mock rule. **the absent word was itself the defect.**

### the citation trail

the distinction is not invented here; it is the xunit family's, sharpened:

- gerard meszaros, *xUnit Test Patterns* — `mock`, `stub`, `fake`, `spy`, `dummy` are all **test
  doubles**, all substitutions of a COLLABORATOR the code under test calls directly
- a swap is not in that taxonomy at all, because the collaborator (the sdk) is **not** replaced —
  only its remote peer is. testcontainers, localstack, and an in-memory postgres are the same shape

⇒ so `swap` names a category the classic taxonomy has no word for, which is why the repo kept
reach for the nearest one and inherited its rule.

### the invariant a reviewer can check

> **after the substitution, does any of the real client stack still execute?**
> yes → swap, and `rule.forbid.acceptance.mocks` does not reach it.
> no → mock, and the rule's exception clause applies in full.

### the cost of the ambiguity, measured

before the term: one peer lane graded a swap and a mock alike, blocked the stone on both, and
proposed the same rework for each. the aws.params half took **two rounds** to converge — one to
cite `.gap.bound`, one for the lane to re-read. the github half is correctly still open.

⇒ **a word absent from the glossary cost two review rounds and nearly a wrong repair** (the proposed
rework was a rename that would have misclassified a correctly-classified file).

### the drift already on disk — 68 sites, and why they are NOT swept

`stand-in` appears **68 times across 12 files** (the aws.params acceptance + emulator tiers, and
the two `genFakeSsmServer*` fixtures). every one is a **comment**, so
`rule.forbid.domain-term-synonyms` permits them — the forbid governs contracts, never prose.

⚠️ two of those comments already carry BOTH words —
`keyrack.vault.awsParams.acceptance.test.ts:12` reads *"a real local SSM stand-in (a backend swap,
not a mock)"*. that the author reached for `stand-in` **and** then had to disambiguate it in the
same sentence is the evidence that the noun does not carry the claim on its own.

they are left in place deliberately:

- a 68-site sweep across 12 files is a diff a wish scoped to *when a repo manifest loads* has no
  mandate to open (`rule.forbid.scope-leaks`)
- the rule's own guidance is that a synonym in prose *"may be left in place until disturbed"*
- **the contracts are already clean** — no operation, type, file, or flag is named `stand-in`, so
  the ubiqlang surface a consumer reads never carries the word

⇒ the sweep is a follow-on, not a debt this wish owes. what the term buys today is that the NEXT
author has a word that states the claim, so the count stops where it stands.

## .invariants

- a swap MUST clamp its own seam. if an sdk bump drops the override, the swap silently dials the
  real service — every snapshot beneath it becomes a lie, and the suite may hang rather than fail.
  clamped at `getOneKeyrackAwsParam.emulator.integration.test.ts`
- a swap MUST be honored only under a sanctioned test signal (`NODE_ENV=test`), so a prod process
  cannot be redirected by an env var. clamped at `keyrack.vault.awsParams` c50
- a swap does NOT discharge the wire-hop obligation. a tier that dials the real service must exist,
  and the swap's own header must name it — the `.real` pointer `rule.forbid.acceptance.mocks` asks
  for is satisfied by that tier, never by the swap itself
