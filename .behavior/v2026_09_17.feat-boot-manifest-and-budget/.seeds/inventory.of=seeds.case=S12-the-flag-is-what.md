# S12 — the flag is `--what`, and `--boot-manifest` is refused outright

- **raised** = 2026-09-23, at `5.1.execution.from_vision`, on the blocker's row 11
- **kind** = contract — it settles the flag every caller types

---

## .said

> how about `rhx boot --what $path/to/boot.yml`

and then, unprompted, a second message:

> never ever --boot-manifest though

then, on the build, three corrections in quick succession:

> interanlly call it a manifest still

> the dobj is still a BootManifest

> nah keep --manifest too

---

## .settled

**the flag is `--what <path>`, with `--manifest` kept as a live alias. the DOMAIN is untouched:
the object is a `BootManifest`, and the internal key stays `manifest`.**

🔴 **three separate scopes, and the drive collapsed them into one.** that `--what` *replaces*
`--manifest` was never said — it was inferred from the first message and carried into the domain
layer, where a rename of `from.manifest` → `from.spec` was already underway when the wisher
stopped it.

| the scope | the verdict | what the drive assumed |
|---|---|---|
| the **flag a caller types** | `--what` primary, `--manifest` alias | ✅ a new primary — correct |
| the **internal key** (`from.manifest`) | 🔴 **unchanged** | ❌ rename it too |
| the **domain object** (`BootManifest`) | 🔴 **unchanged** | ❌ it must go |

⇒ **a new name on a surface is not a verdict on the concept beneath it.** the flag names the
QUESTION a caller answers; the dobj names the THING. they are free to differ, and here they do.

🟡 **and the term rule is satisfied by the qualifier, never by the absence of the word.**
`term=manifest._.choice._.md:5` forbids a **bare** `manifest` in a contract and requires a
qualifier. `BootManifest` carries one. so the drive's *"drop the term entirely"* read solved a
problem the glossary had already solved — and `--what` stands on its own merit (it names the
question) rather than as a rule-compliance move.

🔴 **`--manifest` stays because a flag is not a place to make a point.** the alias costs one
commander string and spares every extant invocation, doc, and muscle-memory. the two names are ONE
option, so neither can drift from the other — the header normalizes to `--what` whichever the
caller typed.

⇒ **the `F3` dispute is WITHDRAWN rather than upheld.** a dispute defends a term's use in a
contract, and the contract's PRIMARY name no longer says the word.

🔴 **the emphatic half is the durable one.** `--boot-manifest` was the term rule's own sanctioned
repair — the `adhere` arm of `rule.forbid.domain-term-synonyms` — and it is refused outright.

⇒ **a rule's prescribed repair is not automatically the right one.** the drive read the rule's two
arms as an exhaustive pair (adhere, or dispute) and never asked whether a third move existed: drop
the term. the rule offers no such arm, so no arm is what the drive reached for.

🟡 **and `--what` reads better than either.** the flag answers *"boot WHAT?"* with a path, which is
the question a caller actually holds.

---

## .landed

- 🟡 **`S1` NARROWED, never reversed** — the first seed settled `--manifest`, and `--manifest`
  still works. what changed is which of the two names is primary
- `F3` — verdict reversed from `dispute` to `withdrawn`
- `term=manifest._.choice.reason.md` — the dated dispute entry retired; the contract's primary
  name says no bare term, and the dobj carries the required qualifier
- `invokeRolesBoot.ts` + `invokeRolesCost.ts` — one `.option('--manifest, --what <path>')` each
- ~50 invocation sites · the halt render · the acceptance + integration snapshots
- `invokeRolesBoot.manifest.integration.test.ts` `[case0]` — the ALIAS clamp: one `then` per
  flag, so a rename of either name reddens exactly one case
- the yield's `F3` section, its triage row, and awkward #5 — each rewritten

## 🔴 .the lesson

> **a surface rename asks THREE questions, and a drive that hears one answer answers all three.**

the wisher named a flag. the drive heard a verdict on the concept, and reached for the domain
layer — where a rename is far more expensive and was never asked for. two corrections in a row
were needed to bound it, and a third to restore the alias the drive had silently deleted.

⇒ **when a ruling names a SURFACE, its scope is that surface until a second ruling widens it.**
the cue is the word the ruling used: *"the flag"* is a flag, not a term.
