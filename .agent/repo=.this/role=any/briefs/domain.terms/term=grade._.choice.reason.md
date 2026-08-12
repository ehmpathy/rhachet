# domain.term.choice.reason: grade

## .etymology

`grade` predates this round — an extant dobj (`KeyrackKeyGrade`) with its own dop
(`inferKeyGrade`) and its own directory (`src/domain.operations/keyrack/grades/`). itemized now
because the `--reach` round **overloaded it**, and the overload had to be caught and undone.

the word is apt in the school/ore sense: a grade *characterizes what a subject is*, on a scale
someone else's rules define. it is a verdict about the key, not a wish about it — which is
exactly the property the overload violated.

## .disputes

### dispute: `grade` used for `require`/`prefer` — raised 2026-08-02 — status: RESOLVED (undone; the word is `directive`)

- raised.by  = me, against myself, at the `learn.domain.terms` sweep
- what happened = while the repo-manifest reach syntax was designed, i wrote *"the grade pair"*
  and named the dobj `KeyrackKeyReachGrade` for the `require` / `prefer` choice. that put **one
  word on two concepts** in one subsystem:

  | | extant `grade` | my usage |
  |---|---|---|
  | answers | how safe is this key? | how badly is this needed? |
  | shape | `{ protection, duration }` | one of `require` \| `prefer` |
  | origin | **derived** by `inferKeyGrade` from vault + mech | **declared** by a human in yaml |
  | about | a key that **exists** | a key that **should exist** |

  the last row is the sharpest: a grade describes the actual, a directive requests the desired.
  to share a word across that line invites a reader to expect `inferKeyReachGrade` to exist, or
  to expect `require` to appear on a `KeyrackKeyGrant`. neither is true.

- resolution = **the word is `directive`.** `require` / `prefer` come from the repo's extant
  directive taxonomy (`define.directives.terms=forbid_avoid_prefer_require`), which already
  names the axis they sit on. so the fix was not to coin a word — it was to *use the one the
  taxonomy already had*. `KeyrackKeyReachGrade` → `KeyrackKeyReachDirective`.

  ⚠️ **the irony, put on the record:** i had already conformed the *value* (`recommend` →
  `prefer`, to match that taxonomy) and then named its *category* with a word the taxonomy does
  not use, and which keyrack had already spent. a half-conformance is its own hazard: adopt a
  vocabulary's words and you inherit its shape too.

## .evidence

- **discovery: the sweep, not the review.** `grade` passed through four self-reviews and a full
  vision rewrite without objection. it surfaced only when this round's terms were listed and
  each was checked against `src/` — the exact procedure `rule.require.domain-term-itemization`
  prescribes, and the second time in two rounds it caught a collision that prose review missed
  (the first was `recommend` vs `prefer`).
- **the extant sense, verified** at
  [`inferKeyGrade.ts`](../../../../../src/domain.operations/keyrack/grades/inferKeyGrade.ts):
  protection is derived from the **vault**, duration from the **mech**, with `os.daemon`
  special-cased to `transient`. every use is a derivation; no call site declares one.
- **invariants** (as a dobj, `KeyrackKeyGrade`):
  - always derived, never declared or accepted as input
  - both facets are always present — there is no partial grade
  - it characterizes a **granted** key, so it is undefined before a grant exists

## .see also

- `term=prefer._.choice._.md` — the directive this was wrongly called a grade
- `rule.forbid.domain-term-synonyms` — the rule this dispute was opened under
- `define.vault-mech-adapters` — the two inputs a grade is derived from
