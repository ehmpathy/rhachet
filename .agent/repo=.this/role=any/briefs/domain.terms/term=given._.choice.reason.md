# domain.term.choice.reason: given

## .etymology

why `given`: it is the word BDD already spends on exactly this sense — `given` names the
**precondition the world handed you**, before any `when` acts on it. a refusal's echo field is
that same role at one-field scale: the state as supplied, prior to judgment.

it also reads as a past participle, so it attaches to a noun with no glue: `envGiven`,
`vaultGiven`, `mechGiven`. and it satisfies `rule.require.order.noun_adj` — the noun leads, so
every variant of one field groups under one autocomplete prefix (`env`, `envGiven`).

the rejected words each carry a claim the concept does not make:

| rejected | why |
|---|---|
| `passed` | overloaded to exhaustion — a test passes, a check passes, an arg is passed. three senses on one surface |
| `supplied` / `provided` | both true of a value the message ACCEPTS, so neither marks the rejection that earns the suffix |
| `input` | already the repo's name for the first argument of every operation (`rule.require.input-context-pattern`). to reuse it as a field suffix would overload a term that carries load |
| `actual` | implies a paired `expected`, which a refusal does not carry — the valid SET is in the message, never as a peer field |
| `received` | the transport's word (a request is received). it names the wire, not the caller's intent |
| `raw` | claims the value is un-parsed. often it IS parsed and merely invalid — `--env stage` parses fine |

## .disputes

### dispute: bare (no suffix at all) — raised 2026-09-05 — status: RESOLVED (suffix required in refusals)

- raised.by = the code itself — two refusals in this diff's own new hunks shipped bare `env:` and
  `into:`, directly beneath a comment that claimed they already conformed
- claim = the suffix is noise; a reader beneath `invalid --env` obviously knows `env: stage` is
  what they typed
- counter = the render puts the two lines **adjacent**, and a report's own invariant is that every
  leaf states a fact (`term=report`). a bare `env: stage` beside *"must be one of test, prep,
  prod"* is a leaf that asserts a **falsehood** — the env is not `stage`; that is precisely why the
  command refused. the reader must hold the message in mind to reinterpret the leaf, which is the
  decode-friction the suffix removes for one word's cost
- resolution = **keep the suffix, scoped to refusals.** the boundary is stated in the say file:
  `*Given` where the message rejects the value, bare where the field carries a fact. `owner` at
  `:1397` stays bare and is the clamp on the near side of the line

⚠️ the dispute's most useful evidence is that it was raised by a **comment that was wrong about
its own code**. the convention was already the majority (8 sites) and already documented — and the
two new sites still shipped bare. a convention a reviewer must re-derive per site is a convention
that drifts.

## .evidence

### the discovery move — the review that caught it

`enroll-verif-snapshot-blemishes` (r10, i017) read the render, not the source, and asked a plain
question: *does this line agree with the line above it?* the answer was no, twice.

that lane had been **dark** for rounds — it produced no readable verdict, so its blocks converged
naught. re-run against the repaired tree, it returned lit and caught this in its first pass. the
suffix defect was therefore invisible to every reviewer that read the source (where `env:` looks
unremarkable) and obvious to the one that read the output.

⇒ **a render convention is caught by a render reviewer.** see
`rule.always.rerun-dark-review-lanes-scoped`.

### the census

| shape | sites | verdict |
|---|---|---|
| `*Given` in a refusal | 10 | ✅ conform |
| bare in a refusal | 0 (was 2, both in this diff's new code) | repaired |
| bare that carries a fact | 1 (`owner` at `:1397`) | ✅ correctly bare |

the majority already held before this round. what the round added was the **stated boundary** —
the majority was a habit; a habit cannot be checked, and the two new sites are what a habit costs.

### the citation trail

- dan north, on bdd's given/when/then — `given` names the precondition state, the world as handed
  to the scenario. the field-scale sense here is the same word at smaller grain
- nielsen heuristic 9 (*help users recognize, diagnose, and recover from errors*) — an error must
  let the reader **diagnose**; a leaf that contradicts the message beside it defeats diagnosis
- `rule.require.errors-name-the-fix` — the anatomy is what / why / fix. `envGiven` is the **why**
  line's evidence; a bare `env` misfiles itself as a **what**

## .invariants

- a metadata field whose value the same message REJECTS MUST carry `*Given`. clamped at
  `getKeyrackBlockedReport.test.ts` `[case7]` / `[case9]` (`mechGiven`) and at the
  `keyrack.blocked-render-consistency` acceptance snapshot, whose whole purpose is to prove that
  every refusal renders alike
- a metadata field that carries a fact MUST NOT take the suffix — it would assert a rejection the
  message never made. the source counterexample is `invokeKeyrack.ts:1397`'s bare `owner`; bare
  `owner:` leaves are pinned across the success renders (`keyrack.source.reach`,
  `keyrack.status.env-filter`, `keyrack.relock`, `keyrack.machine-wide-skips-manifest`)

  ⚠️ the :1397 refusal itself is **not** snapshot-pinned — `keyrack.validation.snap:16` renders
  that message with only a `ran:` leaf, from a different call path. so the bare side of the
  boundary rests on source + the success renders, never on a refusal snapshot. a clamp that pins
  it would close the gap
- the suffix is **per-field**, never per-error. one refusal may legitimately carry both shapes:
  `{ envGiven, owner }` is correct when the env was rejected and the owner is context
