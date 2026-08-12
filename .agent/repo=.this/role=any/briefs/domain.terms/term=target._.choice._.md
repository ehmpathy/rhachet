# domain.term: target

term.chosen   = target
term.kind     = noun
term.synonyms.forbidden:
- job
- unit
- item
- entry
- slot
- variant
- combo

## .what
**one credential `fill` must make present** — a single (key × reach) pair.

before the reach axis, `fill` walked one loop: key × owner. a key was one credential to
provision, so it needed no word of its own. reach split that: one key now yields **N** credentials
to provision — the reachless one, plus one per declared reach. the inner loop gained a subject,
and `target` is its name.

```
key     : what a manifest declares         — `EHMPATH_BEAVER_GITHUB_TOKEN`
target  : one reach OF that key        — the reachless one, or `github://org=ehmpathy`
```

a target carries the reach it names and the **directive** that governs it (`require` / `prefer`),
or `null` for the reachless one — which is why the reachless target always **leads** the list: a
key is cut reachless whether or not any reach is declared.

## .refs
- `src/domain.operations/keyrack/fill/getAllKeyrackFillTargets.ts`      # the dobj + its derivation
- `src/domain.operations/keyrack/fill/getOneKeyrackFillTargetCount.ts`  # the progress denominator
- `src/domain.operations/keyrack/cli/asKeyrackFillTargetBranch.ts` # the per-target render
- `src/domain.operations/keyrack/fill/fillKeyrackKeys.ts`               # the loop it names

## .why a word was needed at all
the count and the loop had **no shared noun**, so each described the same set in its own
arithmetic (`1 + reaches.length` beside a `[{...}, ...reaches.map(...)]` literal). two
expressions of one truth, with no compiler link — and the drift renders as a wrong `(n/total)`
that never throws. once the set had a name, the count could **read from the derivation** instead
of re-derive it, and the drift became impossible rather than merely unlikely.

a term earned by a defect it closes, not by a taxonomy it fits.

## .reason
see the ref-level cluster beside this choice:
- `term=target._.choice.reason.md` — etymology, rejected synonyms, evidence
