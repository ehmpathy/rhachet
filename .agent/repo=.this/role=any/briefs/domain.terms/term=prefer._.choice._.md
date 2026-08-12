# domain.term: prefer

term.chosen   = prefer
term.kind     = verb
term.synonyms.forbidden:
- recommend      # the word first coined for this slot; dropped to conform (see .reason)
- suggest
- optional
- advise
- nice-to-have

## ⚠️ .status = RETIRED for the reach slot — 2026-08-05

**this term never entered keyrack's shipped vocabulary.** it was coined for one slot — a
strength tier on a reach declared in a repo manifest — and that slot was cut before the
feature landed. `KeyrackKeyReachDirective` is gone; a manifest's `reaches:` is now a flat
list of labels, and every declared reach is unconditional.

what remains true: `require` / `prefer` **is** this repo's canonical directive pair
(`define.directives.terms=forbid_avoid_prefer_require`), and it stays canonical for rules and
practices. this file records only that the pair was **considered and declined** for the reach
slot — so the next author who reaches for a strength tier there finds the argument already
had, rather than re-derives it.

## .what it was to be

the soft half of two directives a repo manifest could put on a declared reach:

| directive | `fill` behavior when it cannot provision |
|-----------|------------------------------------------|
| `require` | **fail** — the repo does not work without it |
| `prefer` | **warn and continue** — useful, not critical |

```yaml
# the shape that was cut
env.prep:
  - EHMPATH_BEAVER_GITHUB_TOKEN:
      reaches:
        require:
          - github://org=ahbode
        prefer:
          - github://org=ehmpathy
```

```yaml
# the shape that shipped
env.prep:
  - EHMPATH_BEAVER_GITHUB_TOKEN:
      reaches:
        - github://org=ahbode
        - github://org=ehmpathy
```

## .why it was declined

> "seems like overkill for today" · "yagni" · "keep it simple" — the wisher, 2026-08-05

the pair was justified by `fill`: without it, a repo could not say *"this reach is nice
to have"*, so a machine that could not provision one would halt on a checkout that was
otherwise usable. that case holds — and it describes a need no repo has yet expressed.

the cost of the tier was not the enum. it was all the soft arm dragged behind it: a catch
around the whole per-target body, an error allowlist to keep that catch from a failhide
(`isKeyrackFillSkippable`), a skip-reason renderer, a third result status, a fourth summary
bucket, and a paired acceptance A/B to prove the two arms differed. six parts to express one
word that no manifest said yet.

and the soft arm carried the worse failure. a `prefer` skip exits **0** and prints a yellow
line — so a human whose eye slid past it reads a partly-provisioned checkout as complete. an
unconditional halt cannot be misread. when the only tier is "required", the render is the
exit code, and there is no line to miss.

**the reversal is recorded, not erased.** the pair was the right call while `fill` was the
justification, and it may be right again the day a repo genuinely wants an optional
reach. the note that matters for that day: reinstate the tier at the **manifest** layer,
and keep `fill`'s halt unconditional at the operation layer, so a soft arm cannot re-open the
failhide the allowlist existed to close.

## .refs
- `.behavior/v2026_07_31.feat-keyrack-unlock-scope/1.vision.yield.md`  # coined here (q8/q10)
- `define.directives.terms=forbid_avoid_prefer_require`   # the extant taxonomy, still canonical
- a repo's `.agent/keyrack.yml`          # the manifest surface, now a flat list

the code refs are deleted, and named here so the trail survives them:
- `src/domain.objects/keyrack/KeyrackKeyReachDirective.ts`   # the dobj — DELETED 2026-08-05
- `src/domain.operations/keyrack/isKeyrackFillSkippable.ts`  # the soft-arm allowlist — DELETED
- `src/domain.operations/keyrack/cli/asKeyrackFillSkipReason.ts`  # the skip render — DELETED

## .reason
see the ref-level cluster beside this choice:
- `term=prefer._.choice.reason.md` — the `recommend` dispute (RESOLVED), etymology, evidence
