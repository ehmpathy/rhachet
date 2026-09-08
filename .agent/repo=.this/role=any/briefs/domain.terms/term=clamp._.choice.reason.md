# domain.term.choice.reason: clamp

## .etymology

a **clamp** is a physical tool that holds one joint shut under load. it is chosen for three
properties the metaphor carries exactly:

- it acts on **one** joint — a clamp names one defect, never a general area
- it holds under **load** — it goes red precisely when pressure returns
- you can **feel** whether it grips — the dogfood revert is that feel, made mechanical

the word was in use in this repo's test comments and rule names long before it was itemized —
`rule.require.clamp-edge-cases` is named for it. this file records the choice that was already
made in practice, which is the itemization this glossary exists to force
(`rule.require.domain-term-itemization`).

## .the rejected synonyms, and why each fails

### `guard` — REJECTED, and the rejection is load-bearing

`guard` already names a **runtime** refusal in this domain: the strict-gitroot guard, the `--org`
guard, the repo-scoped guard whose refusal the machine-wide fix must not soften. those guards ship;
they run for every human on every invocation.

a clamp never ships. it runs in ci and its whole audience is the next author.

to overload `guard` across both would be the worst available overload here, because the two appear
in the SAME sentence constantly — "the clamp on the guard" is a real and common phrase, and under
an overload it reads as a tautology. the two words must stay distinct for that sentence to carry
meaning.

### `coverage` — REJECTED

coverage is a ratio over lines; a clamp is a proposition about a defect. a suite at 100% coverage
can hold zero clamps. the words answer different questions, and to conflate them lets a team
report the easy number in place of the hard one.

### `check` / `assertion` — REJECTED as too weak

every `expect(...)` is an assertion. the term exists precisely to mark the subset that has teeth.
were `assertion` the word, the concept would have no name, and the discipline it carries — the
dogfood revert — would have no place to live.

### `safety net` — REJECTED as too vague

a net catches what falls, unspecified. a clamp names what it holds. the difference is the whole
demand: a clamp must be able to say WHICH defect, and a net cannot.

## .disputes

none open.

## .evidence

### the defect that proves the `teeth` half is not ceremony

this round produced a test that read as a clamp and gripped none of its defect: a proposed fixture
where a repo's local `main` already equalled the fork point. it passed under both the defect and
the fix, so it exercised the drift not at all. it LOOKED like a clamp and guarded nought. only the
revert step exposed it.

that is why the definition puts the demonstration inside the term rather than beside it: a clamp
whose teeth were never seen is indistinguishable, on the page, from one that grips.

### the shape that gives a clamp teeth on a BRANCH

a branch needs a clamp on each SIDE, or a collapse in either direction goes unseen:

| clamp | goes red when |
|---|---|
| `[case9][t2]` — a base `Error` renders bare | the name is spelled always |
| `[case9][t3]` — a NAMED class keeps its name | the name is dropped always |

one row alone pins a value; the pair pins the CONDITION. the same pattern recurs in
`getAllKeyrackStatusKeysForFilter.test.ts`, where only a row whose stored org DISAGREES with its
slug can read which field the filter consults — against rows where the two agree, a stored-field
read and a slug read are indistinguishable.

## .see also

- `rule.require.clamp-edge-cases` — the rule this term names
- `term=grade._.choice._.md` — a review's verdict; a clamp is what the verdict asks for
