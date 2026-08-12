# domain.term.choice.reason: directive

## .etymology

the word is **not coined here**. it is already this repo's own name for the
`forbid` / `avoid` / `prefer` / `require` axis, published at
`define.directives.terms=forbid_avoid_prefer_require` and used by **every rule filename** in the
mechanic role (`rule.forbid.*`, `rule.require.*`, …).

so when a repo manifest gained a way to say *"this key needs this reach, and here is how badly"*,
the category already had a name. to invent a second one would be a synonym in the strictest
sense — a new word for a concept the repo had already named and published.

## .the half-conformance that produced it — 2026-08-02e

this term exists because of a mistake worth a permanent record.

when the reach-directive syntax was designed, the **values** were conformed correctly:
`recommend` was retired for **`prefer`**, precisely so a manifest and a review rule would speak
one severity language. and then the **category** was named `KeyrackKeyReachGrade` — a word that
taxonomy does not use, and that keyrack had **already spent** on
`KeyrackKeyGrade = { protection, duration }`.

> adopt a vocabulary's words and you inherit its **shape** too. to take the values and invent
> the category name is to half-join a language — it reads fluent, and it collides in silence.

that is the lesson, and it generalizes past this term: **a half-conformance is its own hazard.**
a fully foreign vocabulary announces itself; a half-adopted one does not.

## .disputes

### dispute: grade  —  raised 2026-08-02  —  status: RESOLVED (adopt `directive`)
- raised.by  = the learner's per-term sweep (not prose review — see below)
- claim      = "grade" reads naturally for a two-value severity axis, and was already written
               throughout the vision as *"the grade pair"*
- counter    = keyrack **already declares** `KeyrackKeyGrade` with a different sense, derived by
               `inferKeyGrade({ vault, mech })`. one word, two concepts, one subsystem. and the
               senses are opposed on the sharpest possible axis: a grade describes what a key
               **actually is**, a directive requests what **should exist**. a reader who met
               both would reasonably expect an `inferKeyReachGrade` that cannot exist
- resolution = adopt `directive`, the taxonomy's own category word. `grade` recorded as a
               forbidden synonym of `directive`, and `severity` recorded as a forbidden synonym
               too — severity is precisely the axis a directive must not absorb

### dispute: severity  —  raised 2026-08-02  —  status: RESOLVED (keep `directive`)
- claim      = the mechanic taxonomy maps each directive to a **severity** (blocker / nitpick),
               so "severity" names the same axis
- counter    = severity is the **consequence** a directive carries, not the directive itself.
               `require` and `forbid` share one severity (blocker) and are different directives;
               so the two words are not interchangeable, and to merge them would lose the
               distinction between *what is asked* and *what happens when it is unmet*
- resolution = keep `directive` for the ask; `severity` stays the consequence and is a forbidden
               synonym here

## .evidence

**the extant taxonomy** — `define.directives.terms=forbid_avoid_prefer_require`:

```
forbid  : must not do   → blocker
require : must do       → blocker
avoid   : discouraged   → nitpick
prefer  : encouraged    → nitpick
```

the reach directives take the two positive words at matched severity: `require` (fail) and
`prefer` (warn). the pair was **already half-conformed** before the dispute — `require` was
correct from the start, and only the soft half had drifted to `recommend`.

**the collision, in code** — the two senses, side by side:

```ts
// derived — what a key IS
KeyrackKeyGrade  = { protection: 'encrypted' | …, duration: 'ephemeral' | … }
inferKeyGrade({ vault, mech })

// declared — what a human ASKS FOR
KeyrackKeyReachDirective = { directive: 'require' | 'prefer', reach: KeyrackKeyReach }
```

**how it was caught, which matters as much as what it caught:** the collision passed through a
full vision rewrite and four self-reviews **unremarked**. it surfaced only when the terms were
listed and each checked against `src/` — the exact procedure
`rule.require.domain-term-itemization` prescribes. prose review reads for sense, and "the grade
pair" made perfect sense. only a per-term check against the extant glossary sees the fracture.

## .invariants

- a directive is **declared**, never derived. no `infer*` operation may produce one
- a directive never appears on a `KeyrackKeyGrant` — a grant is a key that exists, and a
  directive is a statement about a key that should
- the directive words are a closed set, declared once at
  `KEYRACK_KEY_REACH_DIRECTIVES = ['require', 'prefer'] as const`, so the type derives from the
  array and a stale word fails the compiler
- one reach carries at most one directive per key — a label declared twice is refused at the
  manifest parse, because two strengths for one need name no strength at all
