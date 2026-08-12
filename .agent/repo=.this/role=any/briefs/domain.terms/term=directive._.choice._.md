# domain.term: directive

term.chosen   = directive
term.kind     = noun
term.status   = RETIRED for the reach slot — 2026-08-05
term.synonyms.forbidden:
- grade
- severity
- level
- priority
- strength
- policy

## ⚠️ .status — the slot this word named is gone

`KeyrackKeyReachDirective` was deleted 2026-08-05: a manifest's `reaches:` is now a flat list
of labels, and every declared reach is unconditional (`term=prefer._.choice._.md` carries the
full reversal and the reasons).

**this file is kept, and the line it draws is the reason.** the `directive` / `grade`
distinction — a **declared ask** vs a **derived fact** — is not about reach at all. it is
about keyrack's vocabulary, and it holds unchanged whether or not any reach carries a
strength. the next author who wants to name a declared want in this subsystem needs this
line, and needs to know `grade` is spent.

## .what
**what a human asks for**, and how strongly — a declared want, never a derived fact.

a directive is the category word for the `require` / `prefer` axis. it names the *ask*; the
words under it name the *strength*:

```
directive : require   → the repo does not work without it   (fail)
directive : prefer    → useful, but not essential           (warn, carry on)
```

## .the line it draws — declared vs derived

this is the whole reason the word exists, and it is the line `grade` must not cross:

| | `directive` | `grade` |
|---|---|---|
| answers | how badly is this **wanted**? | how safe is this **key**? |
| origin | **declared** by a human, in yaml | **derived** by `inferKeyGrade({ vault, mech })` |
| about | a key that **should exist** | a key that **does exist** |
| tense | desired | actual |

a word shared across that line invites a reader to expect `inferKeyReachDirective`, or to expect
`require` to appear on a live `KeyrackKeyGrant`. neither exists, nor should.

## .refs
- `.agent/repo=ehmpathy/role=mechanic/briefs/practices/lang.terms/define.directives.terms=forbid_avoid_prefer_require.md`  # where the word comes from
- `term=grade._.choice._.md`   # the derived twin, and why the two must stay apart

the code ref is deleted, named here so the trail survives it:
- `src/domain.objects/keyrack/KeyrackKeyReachDirective.ts`   # the declared dobj — DELETED 2026-08-05

## .why not `grade`
`grade` is already spent — keyrack derives `KeyrackKeyGrade = { protection, duration }` from
`{ vault, mech }`. to reuse it for a declared ask would be one word over two concepts inside one
subsystem, which `rule.forbid.term.addition.ambiguous` calls a **blocker**. recorded in full at
`term=grade._.choice.reason.md`.

## .reason
see the ref-level cluster beside this choice:
- `term=directive._.choice.reason.md` — etymology, the half-conformance lesson, evidence
