# domain.term.choice.reason: scope

## .etymology

latin *scopus*, a mark or target — by way of the optical sense (*telescope*, *microscope*): **the
field a viewer can see from where they stand.** that is exactly the concept: an ask stands at a
cwd, and the scope is how much repo it can see from there.

the word was already the domain's own. long before the operation existed, this codebase spoke of
a key as **repo-scoped** or **machine-wide**, and the cli help said *"a repo-scoped verb"*. the
noun was implied by an adjective in daily use; the operation only gave it a home
(`howto.domain-discovery` — listen to how folks talk, then adopt the word, do not translate it).

## .the rejected synonyms, and why each fails

### `context` — REJECTED, the strongest candidate and the most dangerous

it reads naturally and it is already **overloaded twice** in this repo, both for a different
sense:

| extant use | what it means there |
|---|---|
| `ContextCli`, `genContextKeyrack` | the injected DEPENDENCIES an operation needs (`rule.require.dependency-injection`) |
| `genContextKeyrackGrantGet` | the same — a bag of daos, log, config |

a context is **what the operation is given to work with**; a scope is **what the ask can see**. to
call the pair a "context" would make `genContextKeyrackGrantGet` take a context to build a
context, and a reader could not tell which sense either meant
(`rule.forbid.term.addition.ambiguous`).

### `reach` — REJECTED, and RESERVED

`term=reach._.choice._.md` already names a distinct concept (a clone's reachability). the word is
taken; to overload it would create the exact ambiguity the glossary exists to prevent.

### `extent` / `bounds` — REJECTED, they name a limit, not a thing

both describe *how far* something goes. a scope is not a boundary — it is a **pair of fetched
artifacts**, with a value, that later code reads. a name that reads as a measurement invites a
reader to expect a number.

### `artifacts` — REJECTED, too generic to earn a place

it says the shape (two things) and none of the meaning (which two, chosen by what rule). a term
that would fit a hundred pairs equally well names none of them.

### `surroundings` — REJECTED, gerund-adjacent and vague

no domain expert says it, and it implies proximity rather than visibility.

## .disputes

no dispute is open on this term.

⚠️ **the operation is a `fetch`, never a settle-verb.** the blocklist flags that verb as a
conflation of derive / infer / extract / expand / lookup / compute — and none of those name what
happens here. the operation performs two **i/o reads**: a `git rev-parse` and a manifest load.
`fetch` is the one word that says so; every settle-verb implies a value computed from what the
caller already holds, which would misreport two round-trips to disk as free.

## .evidence

### the discovery move: dimensional decomposition

the term was found by a walk of the product of two orthogonal axes — the move
`howto.dimensional-decomposition` prescribes. before the walk, five verbs each spelled the pair
inline and each had answered only some of it:

| verb | manifest owed? | no repo means? |
|---|---|---|
| `set` | asked | asked |
| `del` | asked | asked |
| `unlock` | asked | **never asked** — it needed `tolerate` and had `refuse` |
| `fill` | never asked | never asked |
| `firewall` | never asked | never asked |

the empty cells are the defects. the axes are orthogonal — a machine-wide ask from a non-repo cwd
sits at (no manifest owed, tolerate), and a repo sweep from a broken clone at (manifest owed,
tolerate) — so the product has four legal cells and every one occurs in practice. an object with
two independent axes and four live cells is a domain object, not a local variable, and it wanted
a name.

### the forbidden combination, as an invariant

| combination | verdict |
|---|---|
| `onNoRepo: 'refuse'` + a machine-wide ask | **must NOT refuse** — the ask consults no repo, so an absent one is irrelevant |
| `onNoRepo: 'tolerate'` + a gitroot present + a repo ask | **must still throw** — tolerance softens the ABSENT-gitroot case only |

both are clamped (`getOneKeyrackRepoScopeForAsk.integration.test.ts`, `[case1][t2]` and
`[case2][t3]`), and the first was dogfooded: loosen the guard to `!gitroot && onNoRepo ===
'refuse'` and `[case1][t2]` goes red.

### the citation that settled the arity axis

the wisher, 2026-08-25: *"all keyrack verbs serve `--org @all` identically."* the scope is what
makes "identically" true by construction rather than by five careful edits — one operation reads
the ask, and every verb inherits the same answer.

## .the two axes — settled 2026-09-05, in the REVIEW domain

the sections above settle `scope` for a keyrack ask. the word carries a second, older use in this
repo — the scope of a **review lane** — and there it resolves TWO independent questions:

| axis | flag | answers |
|---|---|---|
| **breadth** | `--paths-with` / `--paths-wout` | **WHAT** to grade |
| **provenance** | `--diffs since-main` | **WHOSE work** to grade |

they are orthogonal, and each carries weight alone. narrow only the breadth and the lane survives
its context window but grades the whole corpus; keep only the provenance and the lane dies of
overflow. the etymology holds on both: a viewer's field is fixed by where they point AND by how
far they can see.

### the evidence — one defect, in both of its failure modes

- **the LOUD mode:** five l1 lanes died at *"prompt exceeds 75% of context window"* — 199 files,
  781.6k tokens. a breadth defect announces itself.
- **the QUIET mode:** those same lanes, re-run with `--paths-with` alone, returned real items —
  and `--paths-with` **clears the `--diffs` default**. lane `r2` then reported **14 blockers**
  where its twin `r9` reported **0** on the same rubric. the twin graded this branch; the re-run
  graded the entire keyrack acceptance corpus.

⚠️ **the quiet mode is the dangerous one, because it SUCCEEDS.** an over-wide scope does not error;
it returns a longer, well-argued, *true* review. every one of those 14 items is a correct statement
about the corpus. only the attribution is wrong, and no output says so.

⇒ the same asymmetry `define.invariant.empty-render-names-its-cause` draws for the `@all`
predicate: understatement costs one wasted load; **overstatement disables the guard**. an
over-narrow review scope wastes a run; an over-wide one silently adopts a corpus's debt as this
branch's.

### the precondition the provenance axis rests on

`--diffs since-main` computes a merge-base. on a branch with **zero commits** the fork point IS
head, so the diff is the entire uncommitted tree and the provenance axis is **degenerate** — the
intersect filters not one file, and a correction that restores the flag is inert.

⇒ the axis is only meaningful once the work is committed. a review scope is therefore a fact about
the **repo state**, not only about the flags; to reason about one without the other is what made
this defect survive its own written caveat.

### the third fact — a scope flag can be INERT (settled 2026-09-06)

the two entries above each explain a scope that was **wrong**. this one names a scope that was
never **applied at all** — a distinct failure, and the one that cost the most.

`--paths-wout` was supplied seven times and excluded not one file. the cause was neither axis: the
review cli's arg parser carried repeat-collect branches for `--refs` and `--optional` and a generic
`options[key] = value` for every other flag, so the seven globs collapsed to the seventh. the
downstream step already accepted an array; the flags never reached it.

⚠️ **the same defect hit `--paths-with`**, and there the consequence was larger: two lanes supply
it twice (`'**/*.test.ts'` + `'**/*.snap'`), so both had been graded against **snapshots alone,
never a test file**. their prior green verdicts were on the wrong corpus, and re-run correctly one
of them found a real blocker at once.

⇒ so a scope has a **third** way to be wrong, orthogonal to breadth and provenance:

| the scope is… | the flags ask for… | the run does… |
|---|---|---|
| wrong (breadth) | an effect | that effect, over the wrong set |
| wrong (provenance) | an effect | that effect, on the wrong branch's work |
| **inert** | an effect | as though the flag were never typed |

the first two are readable from the flags. the third is readable **only from the realized effect**,
because the scope header echoes the supplied value back — see `term=inert._.choice._.md` for why
that echo is what makes it indetectable.

⇒ a scope change is confirmed by a **measurement** (file count, token total, a tree that vanished),
never by a clean exit. an inert exclusion is worse than an absent one, because it looks solved.

## .see also

- `term=ask._.choice._.md` — the input a scope is fetched for
- `term=keyed._.choice._.md`, `term=sweep._.choice._.md` — the arity that fixes `onNoRepo`
- `term=machine-wide._.choice._.md` — the ask kind that owes no scope
- `term=inert._.choice._.md` — the third failure mode, born from this cluster's own text
- `term=dark._.choice._.md` — the lane state an inert scope flag produces
- the blocklist brief for the forbidden settle-verb
