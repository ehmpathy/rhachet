# domain.term: grade

term.chosen   = grade
term.kind     = noun
term.synonyms.forbidden:
- level
- tier
- rating
- strength
- severity        # ⚠️ NOT a synonym — severity is the `directive` axis. see .reason

## .what
**how well a key is protected, and how long it lives** — the security characterization of a
credential, derived from its vault and its mech:

```ts
KeyrackKeyGrade = {
  protection: 'plaintext' | 'encrypted' | 'reference',   // from the VAULT
  duration:   'permanent' | 'ephemeral' | 'transient',   // from the MECH
}
```

a grade is **derived, never declared** — `inferKeyGrade({ vault, mech })` computes it, and no
human writes one. it describes a key that exists; it never asks for one.

## ⚠️ .what a grade is NOT
a grade is **not a severity, and not a directive.** `require` / `prefer` grade no key — they
are **directives** on a declared need (`term=prefer._.choice._.md`), and they live on the
`forbid`/`avoid`/`prefer`/`require` axis.

| axis | word | answers | declared or derived? |
|------|------|---------|----------------------|
| **grade** | `{ protection, duration }` | how safe is this key? | **derived** from vault + mech |
| **directive** | `require` / `prefer` | how badly is this needed? | **declared** by a human |

to call a directive a "grade" is one word for two concepts — the overload
`rule.forbid.ambiguous-labels` forbids. see `.reason`: it happened, and was caught.

## .refs
- `KeyrackKeyGrade`                       # the domain object
- `inferKeyGrade`                         # the dop that derives it
- `KeyrackKeyGrant.key.grade`             # where it lands
- `src/domain.operations/keyrack/grades/` # the noun's own directory

## .reason
see the ref-level cluster beside this choice:
- `term=grade._.choice.reason.md` — etymology, the directive overload (caught), evidence
