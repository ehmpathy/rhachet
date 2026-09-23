# F08 — the socket's `kind` discriminator mixes a verb (`say`) and a noun (`probe`)

**rework** clean · **status** OPEN · **confidence** 85%

## .the fork, stated fairly

the read verb is `probe`. `term=probe._.choice._.md` lists **`peek` as a forbidden synonym** of the
declared `probe`, and `rule.forbid.domain-term-synonyms` blocks a synonym in a published interface —
so the word is settled.

⇒ **what is NOT settled is the shape.** the same term file adds a constraint:

> *"the act is spelled by the operation that performs it (`fill` probes), so `probe` never leads a dop
> name. it appears as a **noun in the middle** — `isKeyrackFill**Probe**Miss`"*

and the extant discriminator holds a **verb**:

```ts
{ kind: 'say', message }      // a verb
{ kind: 'probe', needle }     // a noun
```

| option | cost |
|---|---|
| **A** — wire literal is the canonical noun `probe`; the dop that serves it puts probe in the middle (`getCloneScreenProbe`) | one enum holds a verb and a noun, so the discriminator reads inconsistently |
| **B** — coin a verb for the wire and keep `probe` internal | a second word for one concept on the very surface the rename just cleaned |
| **C** — rename `say` too, so both slots are nouns | touches the one wire literal every extant clone already speaks |

## .taken, and why at the time

**A.** the glossary offers exactly one in-bounds word for this read, and `rule.forbid.domain-term-synonyms`
forecloses a coinage beside it — so B trades a blocker for a cosmetic win. C is the tidy answer and it
breaks every live peer to satisfy a preference no rule states.

the term's shape rule is satisfied where it actually binds: the **dop** puts `probe` in the middle
(`getCloneScreenProbe`, `isCloneProbeMiss`), and a `kind` value is not a dop name.

## .rework, and why

**clean.** one wire literal, consumed in the server's dispatch switch and in the new client call, and
rendered to no human.

## .confidence 85%, and why not higher

the 15% is that I am the party who benefits from the narrow read. *"a `kind` value is not a dop name"*
is true and it is also convenient — and the term file never says a `kind` slot is exempt, so an
architect may hold that a discriminator is a contract shape and the constraint binds there too. under
that read C becomes correct and the cost I dismissed is the cost you actually pay.

## 🔴 .this entry has NO SUBJECT under F05 = B — read the lever first

the fork is *what shape the second wire verb takes*. under F05 = B (the progress-extended transcript
wait) there is no second verb, so the `kind` enum keeps its one extant value and mixes no grammar at
all.

⇒ **and the collapse is total, unlike F01's.** F01 survives a B verdict on its `delivered` half, since
that collision is already live on disk; F08's subject arrives **with** the read channel and leaves with
it. so this is an entry to rule **last**, and a wisher who rules F05 = B never opens it.

🟡 the `peek` → `probe` **rename** is settled by the glossary and is not part of this fork, so it does
not fall with the lever — it simply has no surface left to apply to.

## .where

- `.agent/repo=.this/role=any/briefs/domain.terms/term=probe._.choice._.md` — the term, and the shape rule
- `…case=F05….md` — the lever that deletes this entry's subject
- `src/domain.operations/clone/socket/genCloneSocketServer.ts:162` — the dispatch switch the value enters
- `1.vision.yield.md`, `.the read channel`

### 🔴 .the demos that RENDER this call

| demo | what it renders | marked unruled? |
|---|---|---|
| `case=4` t0 | `{ kind: 'probe', needle }` — the literal, verbatim | ✅ yes |

⇒ **one demo, and it is the only place in the whole vision where the wire literal appears as a
value.** the criteria stage seeds bdd from the demos, so an unmarked render would have carried
option A into the assertions with no verdict from the wisher — which is how a reserved call gets
settled by side effect (`rule.always.raise-a-blocker-a-taken-cannot-close`).

## .the verdict

unruled. 🟡 lower stakes than F01–F04 — the **word** is settled by the glossary; only its **slot shape**
is a judgment.
