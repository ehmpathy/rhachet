# domain.term.choice.reason: fix

## .etymology

why `fix`: the repo's own ergonomist canon already names the concept, in the title of the rule
that mandates it — `rule.require.errors-name-the-fix`. its anatomy section spells the three
beats of a helpful failure:

1. **what** — what went wrong, in the human's words
2. **why** — the context that caused it
3. **fix** — the concrete next move: the flag to add, the command to run, the value to change

so `fix` was not chosen here; it was **found already chosen**, in the rule that governs every
error surface in the repo. this cluster only records the verdict the canon implies.

`remedy` / `suggestion` / `advice` / `guidance` / `recommendation` are forbidden on two counts:
each is vaguer than `fix` (a *suggestion* may be declined; a *fix* is the move that works), and
each is a word no rule in this repo uses, so each would be a fourth name for a concept that
already has three too many.

## ⚠️ .the three-way collision — one concept, three live contract words

this is what motivated the cluster, and it is verified by eye, not inferred:

```ts
// src/domain.operations/keyrack/cli/formatKeyrackGetOneOutput.ts:42,53
tip: attempt.fix ?? null,
```

**one value, renamed mid-assignment.** the same remedial string is `fix` on the right and `tip`
on the left. that single line is `rule.forbid.domain-term-synonyms` in its purest form.

the full census, taken 2026-08-06:

| word | where it lives | kind of surface | extent |
|------|----------------|-----------------|--------|
| `fix` | `KeyrackGrantAttempt.fix?` | **domain object** field | 3 declarations (one per not-granted variant) |
| `tip` | `emitKeyrackKeyBranch` render union, `formatKeyrackGetOneOutput` | **cli render** label | 29 lines in `src` |
| `hint` | `ConstraintError` / `MalfunctionError` metadata | **error** carrier | 184 lines in `src/domain.operations/keyrack` alone |

all three are **contracts**, not comments. so this is not the sanctioned prose-companion case
that `reachless` was settled as — that one has **zero** identifiers. this one is three
identifiers for one concept.

> ⚠️ this sentence named a second precedent until 2026-08-10 — the word spelled `territor`+`y`,
> which had been sanctioned as a prose companion to `reach`. **that sanction was retracted**,
> because the prose carve-out proved unsafe: help text and error text read as prose yet ARE
> contract, and the word had leaked into both. only `reachless` survives as a precedent, and the
> retraction is itself evidence for the dispute below — a companion that costs a later sweep is a
> companion that was never free.

## .disputes

### dispute: hint / tip vs fix — raised 2026-08-06 — status: **OPEN**

- raised.by  = the driver, at `5.1.execution.from_vision`
- claim      = `fix` is canonical. the repo's own rule names it, and `tip: attempt.fix ?? null`
               proves `tip` is a pure rename of `fix` with no distinct sense. a reader who meets
               all three cannot tell whether they name one concept or three
- counter    = neither synonym is free to rename **today**, and the reasons are not stylistic:
               - `hint` is the metadata key convention of the `helpful-errors` package, used
                 repo-wide well beyond keyrack. to rename it here would put this repo out of step
                 with a dependency's contract, which is a larger argument than a glossary entry
               - `tip` is **rendered stdout**, covered by ~39 keyrack acceptance snapshots. a
                 rename is a user-visible cli change, which is a published-contract break
                 (the same class of argument that kept `--reach` a uri over a bare `--org`)
- resolution = **deferred, deliberately.** the term is itemized so the collision is on record
               and cannot read as "never considered". no rename is made in this tree: the wish's
               scope is `keyrack --reach`, and a three-surface vocabulary migration is neither
               in it nor a clean rework. **for the wisher.**

## ⚠️ .2026-08-10 — the dispute got its sharpest evidence, and the driver manufactured it

`getKeyrackBlockedReport` was repaired this round: it `redact(['metadata'])`s the message and
re-emits fields by name, and it named only `slug` / `stderr` / `hint`. so **every throw site that
carried its remedy under `fix` rendered as a bare symptom** — 82 `fix`/`note`/`hint` fields across
40 keyrack files, a third of the error surface, `rule.require.errors-name-the-fix` violated by
omission.

the repair makes the renderer read **both** words:

```ts
const hint =
  typeof metadata.hint === 'string' ? metadata.hint
  : typeof metadata.fix === 'string' ? metadata.fix
  : null;
```

**that line is the dispute, compiled.** a renderer that must try two keys for one concept is the
cost of the unresolved synonym, now paid in code rather than merely observed in a census. it is
the strongest available argument that the migration is owed — and the driver wrote it.

### the half-conform, on adjacent lines of one tree

the same repair added the second beat, and the two beats now disagree with each other:

```
🐚 keyrack unlock
   └─ ✋ blocked: key not found in manifest: SOME_KEY      ← beat 1 (what)
      ├─ why: key 'SOME_KEY' is not declared in keyrack.yml  ← beat 2, canon word ✅
      └─ hint: rhx keyrack set --key SOME_KEY --env test     ← beat 3, disputed word ⚠️
```

`rule.require.errors-name-the-fix`'s own worked example renders **`why:`** and **`fix:`**. so beat 2
conforms to the canon and beat 3 does not — in one tree, two lines apart, rendered by one operation.

**why beat 2 took `why` and not the metadata key `note`.** the rule this cluster records says new
code conforms to *the word of the contract it feeds*. the contract beat 2 feeds is **the human who
reads stdout**, whose canon is `why:`. to label it `note:` would leak a metadata key name onto a
human surface — the `tip: attempt.fix` failure, reproduced. `note` stays the key; `why` is the label.

**why beat 3 did NOT take `fix`.** ~39 keyrack acceptance snapshots lock the literal `hint:` label.
to change it is a user-visible cli break — precisely the published-contract argument that deferred
this dispute in the first place. to break it here, inside a wish scoped to `keyrack --reach`, would
smuggle the deferred migration in under an unrelated fix.

so the inconsistency is **deliberate and recorded**, not overlooked. it is also the cheapest
possible demonstration of the cost: a reader of one error tree now meets both vocabularies at once.

⚠️ **when the migration runs, `hint:` → `fix:` in the render is a one-line change plus a resnap.**
the renderer already funnels both keys into one variable, so the label is the last thing left to
move. that is the whole residual cost, measured — recorded here so the wisher can price it.

## .what this round conformed to, and why it is not drift

this round added a `hints` field to `assertKeyrackExportNamesDistinct`'s input contract — it
took `hint` over the canonical `fix`. that is a **deliberate conform, not a drift**:

the field's only consumer is `ConstraintError`'s `hint` metadata key. to name the input `fix`
and assign it to `hint` would have manufactured a **second** `tip: attempt.fix` — a fresh
rename-in-flight, in new code, in the exact shape this dispute exists to stop.

> when a concept has an unresolved synonym set, new code conforms to the word of **the contract
> it feeds** — never to a fourth word, and never to the canonical word if that manufactures a new
> rename boundary. the migration is settled once, wholesale, or not at all.

## 🚨 .2026-09-03 — the node-pty round grew the footprint AND strengthened the case

a second, unrelated wish (`v2026_08_25.fix-node-pty-install`) reached the same word from the
`upgrade` and `clone` surfaces, and left two facts on the record.

**1. the footprint grew, outside keyrack.** the dispute's census was keyrack-scoped; `hint` is now
a load-carrier in two more subsystems:

| new site | what it carries |
|---|---|
| `upgrade/asNpmInstallFailureError.ts` | beat 3, on four failure kinds |
| `clone/asCloneSocketOmissionReasonError.ts` | beat 3, on both the malfunction and the constraint branch |
| `clone/genCloneOndisk.ts` | beat 3, on the pty-spawn `ConstraintError` |

so the migration this dispute defers gets dearer each round it is deferred, and it no longer prices
as a keyrack change.

**2. the opposite of the two-key read — and it argues the same verdict.** where
`getKeyrackBlockedReport` had to try `hint` **then** `fix`, this round deliberately made
`metadata.hint` the **single** owner of beat 3, and gave it two renderers that read it **by name**:
`asCliErrorFrame` and `asUpgradeFailureMessage`. the inline copy of the fix inside the sentence was
removed, so there is exactly one home for the value.

⇒ 🚨 **that is the same argument, one level up.** *"one home for the fix, so a renderer never guesses
which field holds it"* is the claim this round proved worth the work. *"one WORD for the fix, so a
reader never guesses which name holds it"* is the identical claim about the vocabulary. a repo that
took the first and declines the second holds two standards for one reason.

**3. and the reason it still did not conform.** every new site above feeds `helpful-errors`'
metadata key, so per this file's own rule — *new code conforms to the word of the contract it
feeds* — `hint` was correct at each one. to have written `fix` would have manufactured three fresh
`tip: attempt.fix` boundaries in new code. **the deferral is honored, and its price is now
measured across three subsystems rather than one.**

## ⚠️ .2026-09-04 — `note` vs `hint` is a SPLIT, not a synonym pair, and the confusion cost a defect

the census above lists `hint` as a synonym of `fix` (beat 3). it does **not** list `note`, and this
round proves why that omission is correct rather than an oversight: **`note` is beat 2.** the two
metadata keys carry different beats of the same failure, and `getKeyrackBlockedReport` routes them
to different places on purpose:

| key | renders as | beat | position |
|---|---|---|---|
| `note` | `why: …` (`:58-59`) | 2 — the **cause** | a mid-branch leaf |
| `hint` / `fix` | `hint: …` (`:129-134`) | 3 — the **remedy** | the leaf that ends the branch |

so `note` and `hint` are **not** interchangeable, and a throw site that picks the wrong one does
not merely choose an off-word — it **misfiles its content under the wrong beat**.

### the defect that proved it

`unlock`'s sudo guard carried its remedy under `note`, at both of its twin sites:

```ts
// invokeKeyrack.ts:1921  AND  getAllKeyrackSlugsForUnlock.ts:58
throw new ConstraintError('sudo credentials require --key flag', {
  note: 'run: rhx keyrack unlock --env sudo --key X',   // ⚠️ an imperative, under the CAUSE key
});
```

which rendered as `why: run: rhx keyrack unlock …` — **a command labelled as a rationale.** every
other `why:` in that render explains a cause. its twin one verb over, `source`, already rode `hint`
and rendered correctly, so one rule produced two renders (`rule.forbid.ambiguous-labels`).

⇒ both sites moved to `hint`, and each now carries a `.why.hint` comment that names the two-beat
split, so the next author does not re-pick `note` for a remedy.

### what this settles, and what it does NOT

- **settled:** `note` is not a fourth synonym in the `fix`/`tip`/`hint` set. it is the carrier of a
  **different beat**, and the census's three-word count stands
- **settled:** the beat, not the taste, decides the key. a remedy takes `hint`/`fix`; a cause takes
  `note`. this is checkable at every throw site
- **unchanged:** the open dispute above. this round moved a site from the wrong beat to the right
  one — it did **not** touch which of `hint`/`fix` wins beat 3. the migration is still owed, still
  wholesale, still for the wisher

⚠️ the same conform rule applies as in the section above: the sites took `hint` rather than the
canonical `fix` because the contract they feed is the renderer's `hint`-first branch. to write `fix`
here would be correct-by-glossary and would have manufactured a fresh rename boundary inside a wish
scoped to *when a repo manifest loads*.

## the CONTENT test — settled 2026-09-05

the prior sections settle which **key** carries beat 3. this one settles what may go **in** it.

> a `fix` names a **runnable command**. an artifact the human must hand-author is not a fix.

**the evidence is a divergence the glossary caught.** two throw sites carried the identical
remedy — *"this repo has no keyrack.yml; make one"* — and spelled it two ways:

| site | text | verdict |
|---|---|---|
| `asKeyrackFilterOrg.ts:54` | `run: rhx keyrack init --org <your-org> (or filter by --org @all for machine-wide keys)` | ✅ a command |
| `getAllKeyrackGrantsByRepo.ts:47` | `create keyrack.yml in repo root with env and key definitions` | ⛔ a file, plus a schema to guess |

both are grammatical fixes; only the first is **actionable**. the second restates the goal in the
imperative and leaves the human to author a schema it never shows — so it fails the etymology's
own beat-3 test above (*"the flag to add, the command to run, the value to change"*) while it
passes every label check. ⇒ conformed to the first.

### the corollary — a divergence with a stated cause is not fragmentation

the two texts do NOT converge to one string, and that is correct. the sweep site appends
`(or filter by --org @all for machine-wide keys)`; the repo-scoped site does not, because a
repo-scoped ask has no `--org @all` re-scope available. **to append it there would name a fix that
does not fix** — worse than the divergence it would cure.

⇒ the unit of convergence is the **remedy**, never the sentence. two sites converge when they
offer the same runnable move; they may still differ where the moves available to their callers
differ, so long as the difference is stated at the site.

⚠️ this cuts against a naive read of `rule.forbid.domain-term-synonyms` — that rule governs the
**word chosen for a concept**, not the tail of a sentence. a `fix` is a contract in its *shape*
(a command) and in its *label* (`fix`/`hint`), never in its exact bytes.

## .evidence

- discovery (2026-09-05): the two-site divergence above, found by a `grep` for the remedy text
  across `src` after peer `r6` flagged the fix text as fragmented across ~4 phrases in one
  snapshot file. the census is what showed the fragmentation was **two** real spellings plus two
  justified variants, never four equals
- discovery: census by `grepsafe` over `src`, 2026-08-06, plus a direct read of
  `formatKeyrackGetOneOutput.ts:42,53`
- discovery (2026-09-04): the `note`/`hint` split, read directly from `getKeyrackBlockedReport.ts`
  `:58-59` vs `:129-134`, and confirmed by the render diff on two acceptance snapshots
- precedent: `directive` vs `grade` — the extant case of two words held apart because each
  carries a genuinely distinct sense (declared ask vs derived fact). `fix`/`tip`/`hint` is the
  **opposite** case: three words, one sense, which is why it is a dispute rather than a split
- precedent: `reachless` — a high-frequency word settled as a prose companion on the strength of
  a **zero-identifier** count. that test fails here, so that verdict is unavailable
- ⚠️ anti-precedent: the word spelled `territor`+`y` held that same verdict and **lost it**
  (2026-08-10). so the zero-identifier test is necessary, never sufficient — the prose/contract
  line itself is porous, which argues the dispute below should settle on one word rather than
  admit a third companion
