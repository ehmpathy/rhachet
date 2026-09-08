# domain.term: mask

term.chosen   = mask
term.kind     = noun
term.boundary = snapshot
term.synonyms.forbidden:
- redact
- scrub
- sanitize

## .what

**a stable placeholder put in the place of a volatile span, so a WHOLE screen can be snapped
rather than sampled token by token.**

```
   └─ .claude/settings.<an iso instant, fresh per run>.bak.json   ← the raw span, volatile
   └─ .claude/settings.$TIMESTAMP.bak.json                        ← the masked span, stable
```

⚠️ the raw span above is DESCRIBED rather than written out, and that is this term at work
on its own brief: a literal instant here would be an unmasked stamp in a tracked file, which
the pre-commit gate refuses on sight — it cannot tell a doc's illustration from a snapshot.

⇒ the placeholder is **load-bearing, never a deletion**: it holds the span's position, its
delimiters, and its neighbors, so a drift in any of the three still reddens the row.

## 🚨 .the boundary — a mask keeps a PLACE; a redact removes a FIELD

this is the distinction the term exists to hold, and both words are live in this repo:

| | **mask** | **redact** |
|---|---|---|
| acts on | a **span** inside rendered text | a **field** in a structured payload |
| leaves behind | a **placeholder** — position and shape preserved | naught — the key is gone |
| the reason | the value is **volatile**, so it cannot be pinned | the value is **noise or a secret**, so it must not be carried |
| its owner | ours, in test infra and render clamps | `helpful-errors` — `HelpfulError.redact(['metadata'])` |

⇒ **`redact` is not ours to reuse.** it is a third-party api verb — `helpful-errors` declares
`HelpfulError.redact(fields)` — so its sense is settled by a package we do not own. a second sense
on the same word is the overload `rule.forbid.domain-term-ambiguity` forbids.

## ⚠️ .the rubric already chose this word

`rule.require.contract-snapshot-exhaustiveness` states the act in its own words:

> *"non-deterministic outputs are MASKED, then snapped live — never carved out."*

⇒ so `mask` is **adopted, never coined**. the word arrived with the rule that governs the act;
what was absent is a cluster that says which word wins where the two are used side by side.

## ⚠️ .the near-neighbors, and why each stays distinct

| word | its own concept | may it name a contract? |
|---|---|---|
| **mask** | a placeholder over a volatile span, for a snapshot | ✅ — this term |
| **redact** | a field stripped from an error payload | ✅ — but only in that sense |
| **`::add-mask::`** | github's own workflow command, which hides a secret in a ci log | ⚠️ github's word, inherited verbatim (`maskInGithubLogs`) |
| *"masked"*, as **concealed** | a defect swallowed — *"never masked"* in `rule.forbid.failhide` prose | 🔴 **no.** prose only |

⚠️ the fourth row is the one to watch. **a contract named `mask*` that means *conceal* is the
violation** — every extant `mask*` name in this repo means the placeholder sense, and it must stay
that way. the prose sense survives only in negative constructions (*"never masked"*), where its
reading is unambiguous.

## ⚠️ .the sanctioned operation prefix is `as*`, never `mask*`

a mask is a pure transformer — one shape in, one shape out — so `rule.require.get-set-gen-verbs`
puts it under `as$Noun`, which names the masked artifact rather than the act:

```
👍  asAbsoluteInitScreen({ stdout, dir })   # the masked screen is the return
👍  asSnapshotSafe(stdout)
👎  maskAbsoluteInitScreen(...)             # verb-first, and `mask` is no sanctioned prefix
```

⇒ **the term is the CONCEPT; `as*` is its operation shape.** the extant `mask*`-prefixed operations
(`maskKeyrackGrantVolatiles`, `maskArmorBody`, `maskBodyKeepPrefix`) predate this note and are left
in place until disturbed — a bulk rename is forbidden by `rule.forbid.domain-term-synonyms`' own
no-mass-rewrite clause.

## .refs
- `blackbox/.test/infra/invokeRhachetCliBinary.ts`      # `asSnapshotSafe` + the mask set every cli screen passes through
- `blackbox/.test/infra/asSnapshotSafe.test.ts`         # the clamp on that path mask
- `blackbox/.test/infra/maskKeyrackGrantVolatiles.ts`   # a mask*-prefixed extant, left until disturbed
- `blackbox/cli/init.incremental.acceptance.test.ts`    # `asAbsoluteInitScreen` — the as* shape
- `src/domain.operations/keyrack/adapters/ageRecipientCrypto.test.ts`  # `<masked-body>` placeholders

## .reason
see the ref-level cluster beside this choice:
- `term=snapshot.mask._.choice.reason.md` — etymology, the two-word-one-sentence evidence, the
  guessed-pattern incident that proves a mask needs its own read
