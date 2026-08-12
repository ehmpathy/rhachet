# domain.term: fill

term.chosen   = fill
term.kind     = verb
term.synonyms.forbidden:
- provision
- populate
- seed
- bootstrap
- sync

## .what
to drive a **whole rack** to its declared state — walk every key the repo manifest names, across
every owner, and make each one present.

fill is **plural and manifest-driven**, and that is what earns it a word of its own. `set` acts
on one key a human names; `fill` acts on **every key a manifest declares**, for every owner, and
verifies each by roundtrip (`set` → `unlock` → `get`).

```
set   : one key,  named by a human,   made present
fill  : all keys, named by a manifest, made present + verified
```

what a manifest declares may grow — and `fill`'s sense absorbs the growth without a rewrite.
a repo manifest now declares each key's needed **reaches** too, each under a **directive**
(`require` / `prefer`), so `fill` provisions those as well: `require` fails when unmet,
`prefer` warns and carries on.

⚠️ this line read `recommend` until 2026-08-03. that word was retired for `prefer` in round `d`,
and the retirement was never carried here — a stale glossary entry, repaired on re-read. see
`term=prefer._.choice.reason.md`.

it is idempotent by construction — an already-vaulted key is skipped, so a re-run converges.

## .refs
- `src/domain.operations/keyrack/fill/fillKeyrackKeys.ts`   # the declared dop
- `keyrack fill`                                       # the cli surface

## .why not `gen` — settled 2026-08-02
`fill` is **not** one of `get` / `set` / `gen` / `del`, and that is deliberate: it is a
**domain verb of the keyrack domain**, which is the carve-out
[`rule.require.get-set-gen-verbs`](../../../../repo=ehmpathy/role=mechanic/briefs/practices/code.prod/evolvable.domain.operations/rule.require.get-set-gen-verbs.md.min)
grants for *"domain-specific verbs for imperative commands not matched to pattern."*

`fill` is not a bulk `gen`. `gen` findserts **one** resource a caller names; `fill` takes no
resource argument — it walks a **manifest** and provisions the whole rack, with verification.
different act, different word. **dispute RESOLVED** — see `.reason`.

## .reason
see the ref-level cluster beside this choice:
- `term=fill._.choice.reason.md` — etymology, the sanctioned-verb question, evidence
