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

## .evidence

- discovery: census by `grepsafe` over `src`, 2026-08-06, plus a direct read of
  `formatKeyrackGetOneOutput.ts:42,53`
- precedent: `directive` vs `grade` — the extant case of two words held apart because each
  carries a genuinely distinct sense (declared ask vs derived fact). `fix`/`tip`/`hint` is the
  **opposite** case: three words, one sense, which is why it is a dispute rather than a split
- precedent: `reachless` — a high-frequency word settled as a prose companion on the strength of
  a **zero-identifier** count. that test fails here, so that verdict is unavailable
- ⚠️ anti-precedent: the word spelled `territor`+`y` held that same verdict and **lost it**
  (2026-08-10). so the zero-identifier test is necessary, never sufficient — the prose/contract
  line itself is porous, which argues the dispute below should settle on one word rather than
  admit a third companion
