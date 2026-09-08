# domain.term.choice.reason: test.tier

## .etymology

`tier` names a **rank in an ordered stack**, and that is exactly the concept: the six values of
`--what` are not a flat set of labels — they are a gate order. `types` and `format` run in seconds
and gate the rest; `unit` runs without a remote boundary; `integration` opens one; `acceptance`
drives the built binary. a failure at a lower tier makes a higher one meaningless.

`type` was the first reach and it is **forbidden** here for two reasons that stack:

1. `rule.prefer.kind-over-type` already discourages `type` for a domain axis, because typescript
   owns the word.
2. `type` carries no order. *"which test type?"* invites a flat enum; *"which tier?"* keeps the
   stack the gate actually depends on.

`stage` was rejected because the route already owns it — a route's stones are its stages, and a
tier is not one of them. `level` was rejected because the review ladder owns `l1`/`l2`/`l3`.

## ⚠️ .the near-collision with `grade` — and why it holds

`term=grade._.choice._.md` lists `tier` among `term.synonyms.forbidden`. read flat, that reads as a
hard bar on this term.

it is not, and the test is `rule.require.boundary-qualified-terms`'s own: **"$word, of WHAT?"**

| the word | of what? | boundary | concept |
|---|---|---|---|
| `grade` | of a **keyrack key** | `keyrack.key` | how well it is protected, and how long it lives |
| `tier` | of the **test gate** | `test` | a named scope with its own rules and its own place in the order |

two boundaries, two concepts, no overload. `grade`'s forbid holds where `grade` holds.

🚨 **but the collision LOOKS real, and that is a find about `grade`, not about `tier`.**
`term=grade._.choice._.md` declares **no `term.boundary` field**, so its forbidden-synonym list
reads as repo-wide when every one of its `.refs` is under
`src/domain.operations/keyrack/grades/`. a flat term's forbid-list silently claims the whole
namespace.

⇒ **left in place until disturbed** — `rule.require.boundary-qualified-terms` forbids a bulk
rename, and `grade`'s own cluster is the right place to repair it. recorded here so the next
traveler who greps `tier` and lands on `grade` finds the argument already had.

## .the drift measured, 2026-09-07

`type` is live for this concept in two places:

| site | text |
|---|---|
| `rule.require.shared-test-fixtures.md:16` | `| test type | fixture location |` |
| `git.repo.test.sh` header | *"run all test types"* |

both predate this term. per `rule.forbid.domain-term-synonyms` they may be **left in place until
disturbed** — no mass rewrite. they are recorded so the drift is visible rather than re-derived.

`tier` is already the majority usage: `howto.run-jest-tiers-locally.[lesson].md` carries it in its
own filename, and `term=clone.address._.choice.reason.md` uses it in a proof table.

## .evidence

**the discovery move: a scenario timeline.** the `5.3.verification` gate demanded a verbatim proof
block per scope, which forced the concept to be named ~40 times across two self-reviews and a dream.
that repetition is what surfaced the question — a word said once is prose; a word said forty times
in a contract-adjacent artifact is a term.

**the invariant that makes it one concept rather than six:** every value of `--what` selects a set
of suites AND a rule set that applies to exactly that set. those two travel together, and that is
the concept. a name that covers only the selection (`suite`, `scope`) drops the rules; a name that
covers only the rules (`policy`) drops the selection.

**the sub-gate case, which the term must accommodate:** `RUN_PERF_TEST` gates 8 rows *inside* the
acceptance tier. so a tier is not the finest grain of test selection — it is the grain the **runner
and the gate** report on. a declared boolean below it is a sub-gate, never a seventh tier.
