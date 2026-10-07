# F3 — the flag name: `--manifest` is FORBIDDEN bare, by our own glossary

**rework: clean · status: 🔴 SETTLED — the fork was a FALSE BINARY · confidence: 100%**
(95% → 55% after the glossary read → 88% at `review.self r4` → settled at `r5 / i007`
(`--manifest`, via dispute) → 🔴 **re-settled at `i013`: `--what` primary, `--manifest` alias —
neither arm this file poses**)

🔴 **read `.the verdict, THIRD and final` at the foot first.** the two verdicts above it are the
record of a fork with one real answer that was not on the menu.

🔴 the wish's proposed flag name violates a declared term rule. I took **adhere**
(`--boot-manifest`) at ~88% and swept all 8 sites to it; **the wisher reversed the take and the
flag is `--manifest`.**

⇒ the reversal is **inside** the rule, never around it: `rule.forbid.domain-term-synonyms` offers
adhere **or** dispute, and the wisher chose dispute. so the outcome is a sanctioned exception with a
record owed, rather than a synonym that drifted in.

### ✅ the record is DELIVERED — `5.1.execution`, 2026-09-19

`term=manifest._.choice.reason.md` now carries the dated entry under `## .disputes`, status
`RESOLVED (a bare manifest stands, bounded)`.

🔴 **it came due one stone earlier than this file predicted.** the clause above set the trigger at
*"before any code names the flag"* and then named **the criteria stage** as its terminus — and the
two do not agree, because the flag ships in the **execution** stone. ⇒ **the trigger was right and
the terminus was wrong**, and the trigger is the half that binds. a debt keyed to an EVENT must be
paid when the event happens, never at the stage a plan filed it under.

🔴 **and the entry carries a BOUND this fulcrum had not anticipated.** the exception is not *"the
flag"* alone — it reaches a second site, and the second rides the first:

| site | why it is inside the bound |
|---|---|
| `--manifest <path>` on `roles boot` | the wisher's word |
| the **discriminant key** `from: PickOne<{ role; manifest; registryRole }>` (`getOneBootSource.ts:78-82`) | a discriminant that diverges from the flag it decodes re-introduces the decode the flag removed |

⇒ **verified by grep over `src/domain.operations/boot/`**: every other bare `manifest` there is
prose in a comment or the flag token itself. no other contract field spells it bare — the shared
domain noun is **`bootSpec`**. so the exception is one flag plus its mirror, and the claim is
checkable rather than asserted.

🔴 **the lesson is about the DEFAULT I reached for, never the outcome.** both moves were legitimate,
and I took adherence because it *"needs no permission"* — the procedurally cheaper one. the wisher's
word sat in the wish four times and I discounted it on that basis. ⇒ **when a rule offers a cheap
move and a recorded move, the wisher's stated word outranks the procedural convenience.**

---

## .what I found

`term=manifest._.choice._.md:5` declares, verbatim:

```
term.qualifier = REQUIRED — `hostManifest` | `repoManifest`; a bare `manifest` is forbidden in a contract
```

and the reason, at line 26-31:

> ⚠️ **the qualifier is part of the term, never a decoration.** five objects share the word; each
> answers a different question and is read at a different moment. an unqualified `manifest` in a
> contract names whichever one its author held in mind, and the reader must go find out which.
>
> ⇒ so the term's rule is not *"use the word `manifest`"* — the word is already universal here.
> **the rule is that it never stands alone in a contract.**

**this repo already declares five manifests:** `KeyrackHostManifest`, `KeyrackRepoManifest`,
`RoleManifest`, `RoleRegistryManifest`, `BrainCliEnrollmentManifest`.

⇒ a boot spec would be the **sixth**. and a cli flag is the most public contract there is — the
wish's own requirement 1 calls the published interfaces the place where drift is most expensive.

---

## 🔴 .so the wish's own word is forbidden by the repo's own rule

| the wish says | the glossary says |
|---|---|
| `--manifest <path>`, four times | a bare `manifest` in a contract = **blocker** |

**this is not a nitpick about taste.** `rule.forbid.domain-term-synonyms` gives exactly two moves:
**adhere, or dispute.** it does not permit a quiet third path.

---

## .the fork, stated fairly

| candidate | qualified? | the case for | the case against |
|---|---|---|---|
| `--manifest` | 🔴 **no** | the wish's word; shortest to type | violates the declared qualifier rule; ambiguous against 5 extant manifests |
| **`--boot-manifest`** | ✅ yes | conforms; reads unambiguously; `BootManifest` becomes the 6th glossary row | longer; mildly redundant on a `boot` subcommand |
| `--spec` | n/a | dodges the overload entirely | a **new** word for a concept the glossary already names → `rule.forbid.domain-term-inconsistency` |
| `--boot-spec` | n/a | unambiguous | coins `spec` as a peer of `manifest`; same inconsistency hazard |

---

## .the guess taken, and why

**take `--boot-manifest`, and add `BootManifest` as the sixth row of the glossary's table.**

| the argument | |
|---|---|
| it **adheres** rather than disputes | the cheaper of the two sanctioned moves, and it needs no wisher round-trip to proceed |
| the qualifier is genuinely load-earning here | `rhachet roles boot --boot-manifest x` is redundant-sounding, but `rhachet roles link --manifest x` would be *genuinely* ambiguous — and the flag will spread |
| it makes the glossary row honest | six manifests, six qualified names, one table |

🟡 **and the redundancy objection is weaker than it sounds.** the flag's audience is not only the
`roles boot` caller — it is the two dispatched consumers that will embed it in generated commands,
where the surrounding `boot` context is absent from the reader's view.

---

## 🔴 .who decides — settled at `review.self r4`

this fulcrum sat at **55% and `needs the wisher`** for two rounds. the escalation was unwarranted,
and **two independent warrants say so:**

| the warrant | what it grants |
|---|---|
| 🔴 the wish delegates the flag name **by name** | `0.wish.md:115-120`: *"the flag's exact name, where the budget check sits in the render path, the counter you pick, and the halt's rendered shape are **yours**"* |
| 🔴 **adherence is the unilateral move** | `rule.forbid.domain-term-synonyms` grants adhere-or-dispute. **only the DISPUTE path owes a record.** to conform to a declared rule needs nobody's permission |

⇒ **the fulcrum had already found the move it was permitted to make, and escalated instead.** the
guess below was never a proposal held for approval; it was a decision held for the read of one
paragraph.

### .the confidence — 88%, and what the 12% is about

the 55% priced *"will the wisher accept my word choice?"* — a question about somebody else's
preference. once the decision is mine, the live question is narrower: **is adherence to a declared
term rule correct here?**

| confident | not confident |
|---|---|
| the glossary rule exists and says what it says | whether a qualifier is owed on a **flag**, vs only on a type/field name |
| a bare `manifest` really is ambiguous against 5 extant uses | whether a later reader prefers the **dispute** below |
| `--boot-manifest` conforms, and conformance needs no permission | — |

🟡 **the dispute stays drafted as the REVERSAL PATH, never as a live question.** if the council
prefers `--manifest`, the text below is ready and the rename is a `sedreplace` plus a resnap.

---

## 🟡 .the reversal path — dispute the term rule

`howto.domain-term-disputes` sanctions this. it is the drafted alternative, ready if the council
prefers the wish's original word:

> **the claim:** a cli flag is scoped by its subcommand, so `roles boot --manifest` is already
> qualified by position. the qualifier rule was written for **type and field names**, which carry
> no positional scope, and to extend it to flags adds ceremony with no ambiguity removed.
>
> **the counter:** the glossary says *"in a contract"*, and a published cli flag is the most
> contract-like surface we have. positional scope evaporates the moment the flag is quoted in a
> doc, a generated command, or a consumer's hardcoded string.

⇒ if the council prefers `--manifest`, **the dispute must be filed in
`term=manifest._.choice.reason.md` under `## .disputes`** — not simply decided here. that is the
sanctioned record, and it keeps the next traveler from re-litigating it.

---

## .the rework cost — why clean

a flag rename touches: the option declaration, the help text, the acceptance test args, the
snapshots. **no stored state, no persisted value.** a `sedreplace` plus a resnap.

🟡 it dirties the moment a consumer lands — `rhachet-roles-bhrain#510` and
`rhachet-roles-bhuild#392` will hardcode whichever name ships. **so this is the fulcrum with the
shortest clean window**, and it argues for settling it in this round rather than at the council.

---

## .where

- `src/contract/cli/invokeRolesBoot.ts:16-25` — the option declarations
- `.agent/repo=.this/role=any/briefs/domain.terms/term=manifest._.choice._.md:5, 26-31` — the rule
- `rule.forbid.domain-term-synonyms` — adhere or dispute, no third path
- `howto.domain-term-disputes` — the dispute shape, if that is the call
- 🔴 `0.wish.md:115-120` — *"the HOW is yours"*: the flag name is delegated verbatim
- `review/self/for.1.vision._.r4.has-questioned-questions.md` — where the escalation was found
  unwarranted

## 🔴 .the verdict, THIRD and final — `--what` primary, `--manifest` alias

**settled 2026-09-23 at `5.1.execution`: `S12`.** the fork this file poses is a **false binary**,
and the wisher took neither arm.

| the arm | what it costs |
|---|---|
| **adhere** — `--boot-manifest` | 🔴 refused outright: *"never ever --boot-manifest though"* |
| **dispute** — `--manifest` alone | a dispute record, forever, for a word the flag need not say |
| 🔴 **the third move** — `--what` primary, `--manifest` alias | 🔴 **no dispute owed, no invocation broken** |

⇒ **the rule offers two arms, so two arms is what the drive reached for.** a rule's prescribed
repairs are the moves it KNOWS, never the moves that EXIST — and the one the wisher found
dominates both: the primary name says no bare term (so the rule is satisfied), and the alias keeps
every extant invocation live (so the reversal costs naught).

🟡 **and the domain is untouched.** the dobj is a `BootManifest` — qualified, which is exactly what
`term=manifest._.choice._.md:5` requires — and `from.manifest` stays. the drive read *"the flag is
`--what`"* as a verdict on the concept and began a domain rename; two corrections stopped it.
⇒ **a verdict that names a SURFACE is bounded to that surface.**

**mechanically:** one commander option, two flag names (`'--manifest, --what <path>'`). commander
reads the last as the long form, so `opts.what` is the key and the rendered coordinate normalizes
to `--what` whichever name the caller typed. the alias clamp is
`invokeRolesBoot.manifest.integration.test.ts` `[case0]` — one `then` per flag, so a rename of
either reddens exactly one case.

🔴 **the double sweep this file already records became a TRIPLE**, and the third was the cheapest —
`--manifest` stayed live throughout, so no invocation broke at any point. **an alias is what a
rename costs when you refuse to pay for it.**

---

## .the SECOND verdict, superseded

**🔴 `--manifest`. ANSWERED — by the WISHER, via the dispute path.**

⇒ the wish delegated the flag name and I took adherence (`--boot-manifest`) on two warrants. **the
wisher exercised the second move the term rule offers** — dispute — and the wish's own word stands.
*"the council may still reverse it via the drafted dispute above"* was written as a hedge; **it is
what happened.**

🟡 **it is still the fulcrum with the shortest CLEAN window.** it dirties the moment a dispatched
consumer hardcodes the flag, so a reversal wants to arrive in this round rather than after.

### 🔴 .the sites, swept TWICE in one round — `review.self r5 / i007`

**sweep 1 — to `--boot-manifest`.** the adhere verdict was recorded at i004 and **three of its four
invocation sites kept `--manifest` for three more rounds.** a peer lane named the cost exactly:
*"A builder … would implement `--manifest` in three places and `--boot-manifest` in one."* ⇒ 8 sites
across 4 files: `case=3` (2) · `case=4` (4) · 🔴 `dimensions.md` axis-A's own definition of
`custom-manifest` (1) · `1.vision.yield.md` (1).

**sweep 2 — back to `--manifest`.** the wisher reversed the take in the same round. 9 sites across 5
files (the four above, plus `case=7`, which had carried `--boot-manifest` from the start). verified
after: **0 residual** `--boot-manifest` in any invocation.

🔴 **the first sweep's lesson holds regardless of which name won: a fulcrum's verdict is a claim
about the ARTIFACT SET, never about the fulcrum file.** a rename graded `[answered]` while its sites
disagree is a contract that contradicts itself — the one defect class in this cycle a builder would
have implemented rather than merely re-derived.

🟡 **two homes keep both words deliberately:** `0.wish.md`, where `--manifest` is the wisher's record
(`rule.always.archive-the-wishers-words-verbatim`), and **this file**, which must name what it
considered and rejected. ⇒ **an instance of a name is a contract; a citation of it is the record of
why**, which is what let each `sedreplace` be safe — the pattern `boot --manifest` matches
invocations and misses prose.

🟡 **and the double sweep is the cheap version of a real cost.** `F3` was graded the fulcrum with the
*shortest clean window* — it dirties the moment a dispatched consumer hardcodes the flag. **the
reversal arrived while it was still clean**, at the price of one `sedreplace`, which is precisely
what itemizing it early bought.
